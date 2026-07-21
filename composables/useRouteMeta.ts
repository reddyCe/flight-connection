export interface RouteMeta {
  km: number | null
  min: number | null
  carriers: string[]
}

type RouteMetaIndex = Record<string, Record<string, RouteMeta>>

export function useRouteMeta() {
  // Client-only + lazy: 3.8MB secondary payload, must not block first paint
  const { data: routeMeta } = useFetch<RouteMetaIndex>('/routes_meta.json', {
    key: 'route-meta',
    server: false,
    lazy: true
  })

  function getRoute(from?: string | null, to?: string | null): RouteMeta | null {
    if (!routeMeta.value || !from || !to) return null
    return routeMeta.value[from]?.[to] ?? routeMeta.value[to]?.[from] ?? null
  }

  return { routeMeta, getRoute }
}

export function formatDistance(km?: number | null): string | null {
  if (km == null) return null
  return `${km.toLocaleString('en-US')} km`
}

export function formatDuration(min?: number | null): string | null {
  if (min == null) return null
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}m`
}

export function formatCarriers(carriers?: string[], max = 2): string | null {
  if (!carriers?.length) return null
  const shown = carriers.slice(0, max).join(', ')
  const extra = carriers.length - max
  return extra > 0 ? `${shown} +${extra}` : shown
}
