import { useLocalStorage } from '@vueuse/core'

export interface SavedRoute {
  id: string
  name: string
  codes: string[]
  date: string
}

export function useSavedRoutes() {
  const savedRoutes = useLocalStorage<SavedRoute[]>('airport-map-saved-routes', [])

  function saveRoute(codes: string[]): boolean {
    if (codes.length < 2) return false
    
    // Check for duplicates
    const isDuplicate = savedRoutes.value.some(route => {
      if (route.codes.length !== codes.length) return false
      return route.codes.every((code, index) => code === codes[index])
    })

    if (isDuplicate) return false

    const name = `${codes[0]} → ${codes[codes.length - 1]}`
    
    savedRoutes.value.push({
      id: crypto.randomUUID(),
      name,
      codes,
      date: new Date().toISOString()
    })

    return true
  }

  function deleteRoute(id: string) {
    savedRoutes.value = savedRoutes.value.filter(r => r.id !== id)
  }

  return {
    savedRoutes,
    saveRoute,
    deleteRoute
  }
}
