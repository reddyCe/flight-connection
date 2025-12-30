<script setup lang="ts">
import { useAirportSystem } from '@/composables/useAirportSystem'
import { useFlightPlanning } from '@/composables/useFlightPlanning'
import { useSavedRoutes } from '@/composables/useSavedRoutes'
import MapHeader from '@/components/map/MapHeader.vue'
import MapInfoPanel from '@/components/map/MapInfoPanel.vue'
import MapContainer from '@/components/map/MapContainer.vue'
import type { Airport } from '@/composables/useAirportSystem'
import { toast } from 'vue-sonner'

// --- State Management ---
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
const isSatellite = ref(false)

// Map container ref for calling methods
const mapContainerRef = ref<InstanceType<typeof MapContainer> | null>(null)

// Panel minimized state
const isPanelMinimized = ref(false)

function toggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

function toggleMapStyle() {
  isSatellite.value = !isSatellite.value
}

// 1. Airport Data System
const { 
  activeAirports, 
  airportsByIata, 
  totalAirports, 
  totalDestinations 
} = useAirportSystem()

// 2. Saved Routes System
const { 
  savedRoutes, 
  saveRoute: persistRoute, 
  deleteRoute 
} = useSavedRoutes()

// 3. Flight Planning System
const {
  selectedAirport,
  sequence,
  isRouteFinalized,
  startDateValue,
  startDate,
  kiwiLink,
  resetSequence,
  finalizeRoute,
  addToSequence,
  loadRoute: loadSavedRoute
} = useFlightPlanning(airportsByIata)

// --- Interaction Handlers ---

// Wrapper to save the CURRENT sequence
function handleSaveRoute() {
  const codes = sequence.value.map(a => a.iata_code).filter(Boolean) as string[]
  if (codes.length < 2) {
    toast.error('Route must have at least 2 stops to save.')
    return
  }
  
  const saved = persistRoute(codes)
  if (saved) {
    toast.success('Route saved successfully!')
  } else {
    toast.info('This route is already in your saved list.')
  }
}

// Handle loading a saved route and centering the map on it
function handleLoadRoute(route: Parameters<typeof loadSavedRoute>[0]) {
  loadSavedRoute(route)
  // Center map on the loaded route after a tick for state to update
  nextTick(() => {
    mapContainerRef.value?.fitToSequence()
  })
}

// Handle finalizing route and centering the map on it
function handleFinalizeRoute() {
  finalizeRoute()
  // Center map on the finalized route after a tick for state to update
  nextTick(() => {
    mapContainerRef.value?.fitToSequence()
  })
}

// Handle marker click logic (similar to original but using composable actions)
function onMarkerClick(airport: Airport) {
  if (isRouteFinalized.value) return

  // If sequence is empty, start it
  if (sequence.value.length === 0) {
    addToSequence(airport)
    return
  }

  // If sequence exists, check if this is a valid next step
  const lastAirport = sequence.value[sequence.value.length - 1]
  const isDestination = lastAirport.destinations.includes(airport.iata_code || '')
  
  if (isDestination) {
    addToSequence(airport)
  } else if (airport.iata_code === lastAirport.iata_code) {
    // Clicked the current one again, select it
    selectedAirport.value = airport
  } else {
    // If it's already in the sequence, just select it
    if (sequence.value.some(a => a.iata_code === airport.iata_code)) {
      selectedAirport.value = airport
    }
  }
}
</script>

<template>
  <div class="relative w-full h-full bg-background">
    
    <!-- Top Bar -->
    <MapHeader
      :total-airports="totalAirports"
      :total-destinations="totalDestinations"
      :is-dark="isDark"
      :is-satellite="isSatellite"
      :saved-routes="savedRoutes"
      @toggle-color-mode="toggleColorMode"
      @toggle-map-style="toggleMapStyle"
      @load-route="handleLoadRoute"
      @delete-route="deleteRoute"
    />

    <!-- Map Container -->
    <MapContainer
      ref="mapContainerRef"
      :active-airports="activeAirports"
      :airports-by-iata="airportsByIata"
      :sequence="sequence"
      :is-route-finalized="isRouteFinalized"
      :is-dark="isDark"
      :is-satellite="isSatellite"
      @airport-click="onMarkerClick"
    />

    <!-- Info Panel -->
    <MapInfoPanel
      :selected-airport="selectedAirport"
      :sequence="sequence"
      :is-route-finalized="isRouteFinalized"
      :is-minimized="isPanelMinimized"
      :start-date="startDate"
      :kiwi-link="kiwiLink"
      :airports-by-iata="airportsByIata"
      @minimize-panel="isPanelMinimized = true"
      @expand-panel="isPanelMinimized = false"
      @reset-sequence="resetSequence(); isPanelMinimized = false"
      @edit-route="isRouteFinalized = false"
      @save-route="handleSaveRoute"
      @add-to-sequence="addToSequence"
      @finalize-route="handleFinalizeRoute"
      @update:start-date="startDateValue = $event"
    />

  </div>
</template>