#!/usr/bin/env python3
"""
Connection builder v1 - No scraping required

Instead of scraping ~3,200 Wikipedia pages (1+ hour, fragile URL matching),
this merges two maintained public datasets in a few seconds:

1. Jonty/airline-route-data (github.com/Jonty/airline-route-data)
   - Every passenger airport and its outbound routes, indexed by IATA
   - Derived from flightsfrom.com schedule data, auto-updated weekly
   - Includes carriers, distance (km) and duration (min) per route
2. OurAirports CSV (metadata: ident, type, region, municipality, wiki link...)

Steps:
  download both -> join on IATA -> symmetrize edges -> emit app schema

Output is a drop-in replacement for public/airports_data.json.
"""

import json
import logging
from pathlib import Path
from io import StringIO
from typing import Optional

import requests
import pandas as pd

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

ROUTES_URL = "https://raw.githubusercontent.com/Jonty/airline-route-data/main/airline_routes.json"
OURAIRPORTS_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv"

REPO_ROOT = Path(__file__).parent
DEFAULT_OUTPUT = REPO_ROOT / "public" / "airports_data.json"
DEFAULT_META_OUTPUT = REPO_ROOT / "public" / "routes_meta.json"


def download_routes(session: requests.Session) -> dict:
    logger.info("Downloading airline route data (Jonty/airline-route-data)...")
    resp = session.get(ROUTES_URL, timeout=120)
    resp.raise_for_status()
    data = resp.json()
    logger.info(f"Loaded {len(data)} airports with route data")
    return data


def download_ourairports(session: requests.Session) -> pd.DataFrame:
    logger.info("Downloading OurAirports CSV...")
    resp = session.get(OURAIRPORTS_URL, timeout=120)
    resp.raise_for_status()
    df = pd.read_csv(StringIO(resp.text), low_memory=False)
    logger.info(f"Loaded {len(df)} OurAirports rows")
    return df


def build_metadata_index(df: pd.DataFrame) -> dict:
    """IATA -> OurAirports row dict. On duplicate IATA, prefer the bigger airport
    with scheduled service (the CSV contains closed/duplicate entries)."""
    type_rank = {'large_airport': 0, 'medium_airport': 1, 'small_airport': 2}

    def rank(row):
        return (
            0 if row.get('scheduled_service') == 'yes' else 1,
            type_rank.get(row.get('type'), 3),
        )

    index = {}
    df = df.where(pd.notna(df), None)
    for row in df.to_dict('records'):
        iata = row.get('iata_code')
        if not iata or not isinstance(iata, str) or len(iata.strip()) != 3:
            continue
        iata = iata.strip().upper()
        if iata in index and rank(index[iata]) <= rank(row):
            continue
        index[iata] = row
    logger.info(f"Indexed {len(index)} airports by IATA")
    return index


def symmetrize(dest_map: dict) -> int:
    """If A lists B, make sure B lists A. Returns number of edges added."""
    added = 0
    for iata, dests in list(dest_map.items()):
        for dest in dests:
            if dest in dest_map and iata not in dest_map[dest]:
                dest_map[dest].add(iata)
                added += 1
    return added


def _num(value, cast) -> Optional[float]:
    try:
        return cast(value) if value is not None else None
    except (ValueError, TypeError):
        return None


def filter_unplottable(routes: dict, meta_index: dict) -> dict:
    """Drop airports the map cannot plot (no coordinates in either source)."""

    def has_coords(iata: str) -> bool:
        meta = meta_index.get(iata, {})
        ap = routes[iata]
        return (_num(meta.get('latitude_deg'), float) or _num(ap.get('latitude'), float)) is not None \
            and (_num(meta.get('longitude_deg'), float) or _num(ap.get('longitude'), float)) is not None

    unplottable = {iata for iata in routes if not has_coords(iata)}
    if unplottable:
        logger.info(f"Dropping {len(unplottable)} airports without coordinates: {sorted(unplottable)}")
        routes = {k: v for k, v in routes.items() if k not in unplottable}
    return routes


def merge(routes: dict, meta_index: dict) -> list:
    """Produce records in the schema the app expects (see useAirportSystem.ts)."""
    dest_map = {iata: {r['iata'] for r in ap.get('routes', []) if r.get('iata')} & routes.keys()
                for iata, ap in routes.items()}
    for iata, dests in dest_map.items():
        dests.discard(iata)

    added = symmetrize(dest_map)
    logger.info(f"Symmetrized: added {added} missing reverse edges")

    records = []
    missing_meta = 0
    for iata, ap in routes.items():
        meta = meta_index.get(iata)
        if meta is None:
            missing_meta += 1
            meta = {}

        destinations = sorted(dest_map[iata])
        records.append({
            'id': _num(meta.get('id'), int),
            'ident': meta.get('ident') or ap.get('icao'),
            'type': meta.get('type'),
            'name': meta.get('name') or ap.get('name'),
            'latitude_deg': _num(meta.get('latitude_deg'), float) or _num(ap.get('latitude'), float),
            'longitude_deg': _num(meta.get('longitude_deg'), float) or _num(ap.get('longitude'), float),
            'elevation_ft': _num(meta.get('elevation_ft'), float) or _num(ap.get('elevation'), float),
            'continent': meta.get('continent') or ap.get('continent'),
            'iso_country': meta.get('iso_country') or ap.get('country_code'),
            'iso_region': meta.get('iso_region'),
            'municipality': meta.get('municipality') or ap.get('city_name'),
            'scheduled_service': meta.get('scheduled_service'),
            'gps_code': meta.get('gps_code') or ap.get('icao'),
            'iata_code': iata,
            'local_code': meta.get('local_code'),
            'home_link': meta.get('home_link'),
            'wikipedia_link': meta.get('wikipedia_link'),
            'keywords': meta.get('keywords'),
            'destinations': destinations,
            'destination_count': len(destinations),
        })

    if missing_meta:
        logger.info(f"{missing_meta} airports had no OurAirports metadata (kept with route-data fields)")

    records.sort(key=lambda r: r['iata_code'])
    return records


def build_route_meta(routes: dict) -> dict:
    """{origin: {dest: {km, min, carriers: [names]}}} for the UI.
    Edges that only exist via symmetrization get the reverse direction's data
    (same distance, ~same duration, same carriers)."""
    meta: dict = {}
    for iata, ap in routes.items():
        for r in ap.get('routes', []):
            dest = r.get('iata')
            if not dest or dest == iata or dest not in routes:
                continue
            meta.setdefault(iata, {})[dest] = {
                'km': r.get('km'),
                'min': r.get('min'),
                'carriers': [c['name'] for c in r.get('carriers', []) if c.get('name')],
            }

    mirrored = 0
    for a in list(meta):
        for b, m in meta[a].items():
            if b not in meta or a not in meta[b]:
                meta.setdefault(b, {})[a] = m
                mirrored += 1
    logger.info(f"Route meta: mirrored {mirrored} reverse edges")
    return meta


def print_stats(records: list):
    total = len(records)
    with_dest = sum(1 for r in records if r['destination_count'] > 0)
    edges = sum(r['destination_count'] for r in records)
    logger.info("=" * 50)
    logger.info(f"Total airports: {total}")
    logger.info(f"With destinations: {with_dest} ({100 * with_dest / total:.1f}%)")
    logger.info(f"Total destination links: {edges}")
    logger.info(f"Avg destinations per airport: {edges / total:.1f}")


def main():
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', default=str(DEFAULT_OUTPUT),
                        help=f'Output JSON path (default: {DEFAULT_OUTPUT})')
    parser.add_argument('--meta-output', default=str(DEFAULT_META_OUTPUT),
                        help=f'Route metadata (km/min/carriers) path (default: {DEFAULT_META_OUTPUT})')
    args = parser.parse_args()

    session = requests.Session()
    session.headers['User-Agent'] = 'airports-connection-builder/1.0'

    routes = download_routes(session)
    meta_index = build_metadata_index(download_ourairports(session))
    routes = filter_unplottable(routes, meta_index)
    records = merge(routes, meta_index)

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False)
    logger.info(f"Saved: {out}")

    meta_out = Path(args.meta_output)
    meta_out.parent.mkdir(parents=True, exist_ok=True)
    with open(meta_out, 'w', encoding='utf-8') as f:
        json.dump(build_route_meta(routes), f, ensure_ascii=False, separators=(',', ':'))
    logger.info(f"Saved: {meta_out}")

    print_stats(records)


if __name__ == "__main__":
    main()
