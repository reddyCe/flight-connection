import { ref, computed, watch } from 'vue'

export interface Airport {
  id: number
  ident: string
  type: string
  name: string
  latitude_deg: number | null
  longitude_deg: number | null
  elevation_ft: number | null
  continent: string
  iso_country: string
  iso_region: string
  municipality: string
  scheduled_service: string
  gps_code: string
  iata_code: string | null
  local_code: string | null
  home_link: string | null
  wikipedia_link: string | null
  keywords: string | null
  destinations: string[]
  destination_count: number
}

export function useAirportSystem() {
  // Load airport data
  const { data: airports } = useFetch<Airport[]>('/airports_data.json')

  // Build lookup map for airports by IATA code (active airports only)
  const airportsByIata = ref<Map<string, Airport>>(new Map())

  // Build lookup map for ALL airports (for search)
  const allAirportsByIata = ref<Map<string, Airport>>(new Map())

  // Filter active airports (only those with destinations)
  const activeAirports = computed(() => airports.value?.filter(a => a.destination_count > 0) ?? [])

  // Computed stats
  const totalAirports = computed(() => activeAirports.value.length)
  const totalDestinations = computed(() => {
    return activeAirports.value.reduce((sum, a) => sum + a.destination_count, 0)
  })

  // Watch to rebuild lookup when data changes
  watch(activeAirports, (data) => {
    if (data) {
      const newMap = new Map<string, Airport>()
      data.forEach(airport => {
        if (airport.iata_code) {
          newMap.set(airport.iata_code, airport)
        }
      })
      airportsByIata.value = newMap
    }
  }, { immediate: true })

  // Watch to build ALL airports lookup (for search)
  watch(airports, (data) => {
    if (data) {
      const newMap = new Map<string, Airport>()
      data.forEach(airport => {
        if (airport.iata_code) {
          newMap.set(airport.iata_code, airport)
        }
      })
      allAirportsByIata.value = newMap
    }
  }, { immediate: true })

  return {
    airports,
    activeAirports,
    airportsByIata,
    allAirportsByIata,
    totalAirports,
    totalDestinations
  }
}
