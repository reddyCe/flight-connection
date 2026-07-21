import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { today, getLocalTimeZone } from '@internationalized/date'
import type { Airport } from './useAirportSystem'
import type { SavedRoute } from './useSavedRoutes'
import { googleFlightsUrl } from '~/utils/googleFlights'

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

  // Nights spent at each stop, used to space the multi-city legs
  const stayNights = ref(3)

  // Leg i departs sequence[i] -> sequence[i+1] after i stays
  const legs = computed(() => {
    if (sequence.value.length < 2) return []

    const formatDate = (d: Date) => d.toISOString().split('T')[0]
    return sequence.value.slice(0, -1).map((from, i) => {
      const date = new Date(startDate.value)
      date.setDate(date.getDate() + i * stayNights.value)
      return {
        date: formatDate(date),
        from: from.iata_code!,
        to: sequence.value[i + 1].iata_code!
      }
    })
  })

  // Kayak multi-city: /flights/BER-FRA/2026-08-10/FRA-JFK/2026-08-13
  const kayakLink = computed(() => {
    if (legs.value.length === 0) return '#'
    const path = legs.value.map(l => `${l.from}-${l.to}/${l.date}`).join('/')
    return `https://www.kayak.com/flights/${path}`
  })

  const googleFlightsLink = computed(() => {
    if (legs.value.length === 0) return '#'
    return googleFlightsUrl(legs.value)
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
    stayNights,
    kayakLink,
    googleFlightsLink,
    resetSequence,
    finalizeRoute,
    addToSequence,
    loadRoute
  }
}
