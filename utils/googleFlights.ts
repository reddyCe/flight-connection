/**
 * Google Flights deep links.
 *
 * Google Flights encodes the whole search in the `tfs` query parameter: a
 * base64-encoded protobuf message. The schema below is reverse-engineered
 * (same one used by fast-flights and flyr) and has been stable for years:
 *
 *   message Airport     { string airport = 2; }
 *   message FlightData  { string date = 2; Airport from = 13; Airport to = 14; }
 *   message Info        { repeated FlightData data = 3;
 *                         repeated Passenger passengers = 8;  // packed enum
 *                         Seat seat = 9; Trip trip = 19; }
 *
 * We hand-roll the ~3 wire-format primitives instead of pulling in a protobuf
 * dependency for one URL.
 */

export interface FlightLeg {
  date: string // YYYY-MM-DD
  from: string // IATA
  to: string   // IATA
}

const TRIP_MULTI_CITY = 3
const SEAT_ECONOMY = 1
const PASSENGER_ADULT = 1

function varint(n: number): number[] {
  const out: number[] = []
  do {
    let byte = n & 0x7f
    n >>>= 7
    if (n > 0) byte |= 0x80
    out.push(byte)
  } while (n > 0)
  return out
}

// Length-delimited field (wire type 2): strings and nested messages
function lenField(fieldNumber: number, payload: number[]): number[] {
  return [...varint((fieldNumber << 3) | 2), ...varint(payload.length), ...payload]
}

// Varint field (wire type 0): enums and ints
function intField(fieldNumber: number, value: number): number[] {
  return [...varint(fieldNumber << 3), ...varint(value)]
}

function stringBytes(s: string): number[] {
  return Array.from(new TextEncoder().encode(s))
}

function airport(fieldNumber: number, iata: string): number[] {
  return lenField(fieldNumber, lenField(2, stringBytes(iata)))
}

export function googleFlightsUrl(legs: FlightLeg[]): string {
  const info: number[] = []

  for (const leg of legs) {
    info.push(...lenField(3, [
      ...lenField(2, stringBytes(leg.date)),
      ...airport(13, leg.from),
      ...airport(14, leg.to)
    ]))
  }
  info.push(...lenField(8, varint(PASSENGER_ADULT))) // packed repeated enum
  info.push(...intField(9, SEAT_ECONOMY))
  info.push(...intField(19, TRIP_MULTI_CITY))

  const tfs = btoa(String.fromCharCode(...info))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `https://www.google.com/travel/flights?tfs=${tfs}`
}
