import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { today, getLocalTimeZone } from '@internationalized/date'
import type { Airport } from './useAirportSystem'
import type { SavedRoute } from './useSavedRoutes'

export function useFlightPlanning(airportsByIata: Ref<Map<string, Airport>>) {
  const router = useRouter()
  const route = useRoute()

  // Selection State
  const selectedAirport = ref<Airport | null>(null)
  const sequence = ref<Airport[]>([])
  const isRouteFinalized = ref(false)
  
  // Date State
  const startDateValue = ref(today(getLocalTimeZone()))
  const startDate = computed(() => startDateValue.value.toString())

  // Kiwi Link Generation
  const kiwiLink = computed(() => {
    if (sequence.value.length < 2) return '#'
    
    const getSlug = (a: Airport) => a.iata_code
    const originSlug = getSlug(sequence.value[0])

    const start = new Date(startDate.value)
    const end = new Date(start)
    end.setDate(start.getDate() + 30)
    
    const formatDate = (d: Date) => d.toISOString().split('T')[0]
    const dateRange = `${formatDate(start)}_${formatDate(end)}`

    let url = `https://www.kiwi.com/en/nomad/results/${originSlug}~${dateRange}~--`
    url += `/${originSlug}~--~7-20`
    
    for (let i = 1; i < sequence.value.length; i++) {
      const destSlug = getSlug(sequence.value[i])
      url += `/${destSlug}~--~7-20`
    }

    return url + '/'
  })

  // Actions
  function resetSequence() {
    sequence.value = []
    selectedAirport.value = null
    isRouteFinalized.value = false
  }

  function finalizeRoute() {
    if (sequence.value.length < 2) return
    isRouteFinalized.value = true
  }

  function addToSequence(airport: Airport) {
    if (isRouteFinalized.value) return
    sequence.value.push(airport)
    selectedAirport.value = airport
  }

  function loadRoute(saved: SavedRoute) {
    const newSequence: Airport[] = []
    for (const code of saved.codes) {
      const airport = airportsByIata.value.get(code)
      if (airport) newSequence.push(airport)
    }
    
    if (newSequence.length > 0) {
      sequence.value = newSequence
      selectedAirport.value = newSequence[newSequence.length - 1]
      isRouteFinalized.value = true
    }
  }

  // URL Sync
  watch(sequence, (newSeq) => {
    const codes = newSeq.map(a => a.iata_code).join(',')
    router.replace({ query: { ...route.query, route: codes || undefined } })
  }, { deep: true })

  // Init from URL
  watch(airportsByIata, (lookup) => {
    if (lookup.size > 0 && route.query.route && sequence.value.length === 0) {
      const codes = (route.query.route as string).split(',')
      const newSequence: Airport[] = []
      
      for (const code of codes) {
        const airport = lookup.get(code)
        if (airport) newSequence.push(airport)
      }

      if (newSequence.length > 0) {
        sequence.value = newSequence
        selectedAirport.value = newSequence[newSequence.length - 1]
        // If it's a multi-stop route from URL, assume "done" mode (finalized)
        if (newSequence.length >= 2) {
          isRouteFinalized.value = true
        }
      }
    }
  }, { immediate: true })

  return {
    selectedAirport,
    sequence,
    isRouteFinalized,
    startDateValue,
    startDate,
    kiwiLink,
    resetSequence,
    finalizeRoute,
    addToSequence,
    loadRoute
  }
}
