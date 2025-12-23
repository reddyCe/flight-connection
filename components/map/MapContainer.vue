<script setup lang="ts">
import type { Map, CircleMarker, Polyline, TileLayer } from 'leaflet'
import 'leaflet.geodesic'
import type { Airport } from '~/composables/useAirportSystem'

const props = defineProps<{
  activeAirports: Airport[]
  airportsByIata: Map<string, Airport>
  sequence: Airport[]
  isRouteFinalized: boolean
  isDark: boolean
  isSatellite: boolean
}>()

const emit = defineEmits<{
  (e: 'airportClick', airport: Airport): void
}>()

// Expose methods for parent component
defineExpose({
  fitToSequence
})

const { $L } = useNuxtApp()

const mapContainer = ref<HTMLElement | null>(null)
const map = ref<Map | null>(null)
const tileLayer = ref<TileLayer | null>(null)

// Data & State
const airportMarkers = ref<Map<string, CircleMarker[]>>(new Map()) // All markers created once (array for world copies)
const visibleMarkers = ref<Set<string>>(new Set()) // Track what's currently on map to optimize diffs

// Visual Elements
const activeArcs = ref<any[]>([]) // Potential destination arcs (L.geodesic returns a specialized layer)
const sequenceLines = ref<any[]>([]) // Confirmed route lines

// Tile URLs
const darkTileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const lightTileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

// Get the appropriate tile URL based on current settings
function getTileUrl() {
  if (props.isSatellite) return satelliteUrl
  return props.isDark ? darkTileUrl : lightTileUrl
}


// --- Map Logic ---

// Helper to draw geodesic arc with world copies for seamless multi-world display
function drawGeodesicWithWorldCopies(
  startLat: number, startLng: number,
  endLat: number, endLng: number,
  options: { weight: number; opacity: number; color: string; steps: number }
): any[] {
  if (!map.value) return []

  const lines: any[] = []

  // Draw on primary world and ±1 world copies
  for (const offset of [-360, 0, 360]) {
    const line = ($L as any).geodesic(
      [[startLat, startLng + offset], [endLat, endLng + offset]],
      { ...options, wrap: false }
    ).addTo(map.value)
    lines.push(line)
  }

  return lines
}

// Clear all lines
function clearLines() {
  activeArcs.value.forEach(l => l.remove())
  activeArcs.value = []
  sequenceLines.value.forEach(l => l.remove())
  sequenceLines.value = []
}

// Fit map view to show the current sequence
function fitToSequence(animate = true) {
  if (!map.value || !$L || props.sequence.length === 0) return

  const coords = props.sequence
    .filter(a => a.latitude_deg && a.longitude_deg)
    .map(a => [a.latitude_deg!, a.longitude_deg!] as [number, number])

  if (coords.length === 0) return

  if (coords.length === 1) {
    // Single airport - center and zoom in
    map.value.setView(coords[0], 6, { animate })
  } else {
    // Multiple airports - fit bounds with padding
    const bounds = $L.latLngBounds(coords)
    map.value.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 8,
      animate
    })
  }
}

// Core function to update map visualization based on state
function updateMapState() {
  if (!map.value || !($L as any).geodesic) return

  clearLines()

  // 1. Determine which markers should be visible
  const targetIatas = new Set<string>()

  if (props.sequence.length === 0) {
    // Show ALL if no sequence active
    props.activeAirports.forEach(a => {
      if (a.iata_code) targetIatas.add(a.iata_code)
    })
  } else {
    // Show only:
    // 1. Airports already in sequence
    props.sequence.forEach(a => {
      if (a.iata_code) targetIatas.add(a.iata_code)
    })
    
    // 2. Destinations of the LAST airport in sequence (ONLY if route not finalized)
    if (!props.isRouteFinalized) {
      const last = props.sequence[props.sequence.length - 1]
      last.destinations.forEach(destIata => {
        // Only if we have data for it
        if (props.airportsByIata.has(destIata)) {
          targetIatas.add(destIata)
        }
      })
    }
  }

  // 2. Efficiently sync markers
  for (const iata of visibleMarkers.value) {
    if (!targetIatas.has(iata)) {
      const markers = airportMarkers.value.get(iata)
      if (markers) markers.forEach(m => m.remove())
      visibleMarkers.value.delete(iata)
    }
  }

  for (const iata of targetIatas) {
    const markers = airportMarkers.value.get(iata)
    if (markers && !visibleMarkers.value.has(iata)) {
      markers.forEach(m => m.addTo(map.value!))
      visibleMarkers.value.add(iata)
    }
  }

  // 3. Draw Sequence Lines (The path so far)
  if (props.sequence.length > 1) {
    for (let i = 0; i < props.sequence.length - 1; i++) {
      const start = props.sequence[i]
      const end = props.sequence[i+1]
      if (start.latitude_deg && start.longitude_deg && end.latitude_deg && end.longitude_deg) {
        const lines = drawGeodesicWithWorldCopies(
          start.latitude_deg, start.longitude_deg,
          end.latitude_deg, end.longitude_deg,
          { weight: 3, opacity: 1, color: '#3b82f6', steps: 50 }
        )
        sequenceLines.value.push(...lines)
      }
    }
  }

  // 4. Draw Potential Connections (Arcs from current to next options)
  if (props.sequence.length > 0 && !props.isRouteFinalized) {
    const current = props.sequence[props.sequence.length - 1]
    if (current.latitude_deg && current.longitude_deg) {
      current.destinations.forEach(destIata => {
        const dest = props.airportsByIata.get(destIata)
        if (dest && dest.latitude_deg && dest.longitude_deg) {
          const arcs = drawGeodesicWithWorldCopies(
            current.latitude_deg!, current.longitude_deg!,
            dest.latitude_deg, dest.longitude_deg,
            { weight: 1, opacity: 0.4, color: '#f59e0b', steps: 50 }
          )
          activeArcs.value.push(...arcs)
        }
      })
    }
  }
}

// Watchers
watch([() => props.isDark, () => props.isSatellite], () => {
  if (tileLayer.value && map.value) {
    tileLayer.value.setUrl(getTileUrl())
  }
})

watch([() => props.sequence, () => props.isRouteFinalized, () => props.activeAirports], () => {
  updateMapState()
}, { deep: true })

onMounted(() => {
  if (!mapContainer.value || !$L) return

  map.value = $L.map(mapContainer.value, {
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
    maxZoom: 18,
    worldCopyJump: true,
    zoomControl: false,
    attributionControl: false // Custom position
  })

  $L.control.attribution({ position: 'bottomright' }).addTo(map.value)
  $L.control.zoom({ position: 'bottomright' }).addTo(map.value)

  tileLayer.value = $L.tileLayer(getTileUrl(), {
    attribution: props.isSatellite ? '&copy; Esri' : '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map.value)

  // Initial setup
  initMarkers()
  updateMapState()

  // Fit to sequence if one exists (e.g., loaded from localStorage on refresh)
  if (props.sequence.length > 0) {
    nextTick(() => fitToSequence(false))
  }
})

function initMarkers() {
  if (!map.value || !$L) return

  // Clear existing
  airportMarkers.value.forEach(markers => markers.forEach(m => m.remove()))
  airportMarkers.value.clear()
  visibleMarkers.value.clear()

  // Create new markers
  props.activeAirports.forEach(airport => {
    if (airport.latitude_deg && airport.longitude_deg && airport.iata_code) {

      // Dynamic styling based on size
      let radius = 3
      let color = '#93c5fd'
      let fillColor = '#bfdbfe'

      if (airport.destination_count >= 50) { radius=6; color='#1e40af'; fillColor='#1d4ed8'; }
      else if (airport.destination_count >= 20) { radius=5; color='#2563eb'; fillColor='#3b82f6'; }
      else if (airport.destination_count >= 10) { radius=4; color='#3b82f6'; fillColor='#60a5fa'; }

      const markers: CircleMarker[] = []

      // Create markers for primary world and ±1 world copies
      for (const offset of [-360, 0, 360]) {
        const marker = $L.circleMarker([airport.latitude_deg, airport.longitude_deg + offset], {
          radius,
          fillColor,
          color,
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8,
        })

        marker.bindTooltip(`${airport.name} (${airport.iata_code})`, {
          direction: 'top',
          offset: [0, -5],
          className: 'airport-tooltip'
        })

        marker.on('click', () => emit('airportClick', airport))

        // Hover effects - sync all copies
        marker.on('mouseover', () => {
          markers.forEach(m => m.setStyle({ radius: radius + 3, fillOpacity: 1 }))
        })
        marker.on('mouseout', () => {
          markers.forEach(m => m.setStyle({ radius: radius, fillOpacity: 0.8 }))
        })

        markers.push(marker)
      }

      airportMarkers.value.set(airport.iata_code, markers)
    }
  })
}

// Watch for activeAirports changes
watch(() => props.activeAirports, () => {
  initMarkers()
  updateMapState()
}, { deep: true })

onUnmounted(() => {
  clearLines()
  airportMarkers.value.forEach(markers => markers.forEach(m => m.remove()))
  airportMarkers.value.clear()
  if (map.value) {
    map.value.remove()
    map.value = null
  }
})
</script>

<template>
  <div ref="mapContainer" class="w-full h-full z-0" />
</template>

<style>
.airport-tooltip {
  @apply bg-popover text-popover-foreground border border-border px-2 py-1 text-xs font-bold rounded shadow-md;
}

.leaflet-tooltip-top:before {
  border-top-color: hsl(var(--border));
}

.leaflet-bar {
  border: none !important;
}
.leaflet-bar a {
  background-color: hsl(var(--card)) !important;
  color: hsl(var(--foreground)) !important;
  border-bottom: 1px solid hsl(var(--border)) !important;
}
.leaflet-bar a:hover {
  background-color: hsl(var(--accent)) !important;
}

/* Hide leaflet branding if desired or style it */
.leaflet-control-attribution {
  background: transparent !important;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  color: rgba(255,255,255,0.7) !important;
}
.leaflet-control-attribution a {
  color: inherit !important;
}
</style>
