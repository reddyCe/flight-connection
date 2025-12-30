<script setup lang="ts">
import {
  Plane,
  Sun,
  Moon,
  ChevronDown,
  Trash,
  Globe,
  Map,
  Search,
  X
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import type { SavedRoute } from '~/composables/useSavedRoutes'
import type { Airport } from '~/composables/useAirportSystem'

// Use globalThis.Map to avoid conflicts with other Map types
type AirportMap = globalThis.Map<string, Airport>

interface Props {
  totalAirports: number
  totalDestinations: number
  isDark: boolean
  isSatellite: boolean
  savedRoutes: SavedRoute[]
  airportsByIata?: AirportMap
}

const props = withDefaults(defineProps<Props>(), {
  airportsByIata: undefined
})

const emit = defineEmits<{
  (e: 'toggleColorMode'): void
  (e: 'toggleMapStyle'): void
  (e: 'loadRoute', route: SavedRoute): void
  (e: 'deleteRoute', id: string): void
  (e: 'selectAirport', airport: Airport): void
}>()

// Search state
const isSearchOpen = ref(false)
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)

function openSearch() {
  isSearchOpen.value = true
  nextTick(() => {
    searchInputRef.value?.focus()
  })
}

function closeSearch() {
  isSearchOpen.value = false
  searchQuery.value = ''
}

function selectAirport(airport: Airport) {
  emit('selectAirport', airport)
  closeSearch()
}

// Normalize string for search: lowercase and remove diacritics/accents
function normalizeForSearch(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
}

const searchResults = computed(() => {
  if (!searchQuery.value || searchQuery.value.length < 2 || !props.airportsByIata) return []

  const query = normalizeForSearch(searchQuery.value)
  const results: Airport[] = []
  const maxResults = 10

  for (const airport of props.airportsByIata.values()) {
    if (results.length >= maxResults) break

    const matchesIata = airport.iata_code && normalizeForSearch(airport.iata_code).includes(query)
    const matchesName = airport.name && normalizeForSearch(airport.name).includes(query)
    const matchesCity = airport.municipality && normalizeForSearch(airport.municipality).includes(query)
    const matchesCountry = airport.iso_country && normalizeForSearch(airport.iso_country).includes(query)

    if (matchesIata || matchesName || matchesCity || matchesCountry) {
      results.push(airport)
    }
  }

  // Sort: exact IATA matches first, then by destination count
  return results.sort((a, b) => {
    const aExact = a.iata_code && normalizeForSearch(a.iata_code) === query
    const bExact = b.iata_code && normalizeForSearch(b.iata_code) === query
    if (aExact && !bExact) return -1
    if (!aExact && bExact) return 1
    return (b.destination_count || 0) - (a.destination_count || 0)
  })
})

</script>

<template>
  <div class="absolute top-0 left-0 right-0 z-[1000] p-2 md:p-4 pointer-events-none">
    <div class="flex items-start justify-between gap-2 md:gap-4 pointer-events-auto">

      <!-- Branding / Main Stats -->
      <div class="map-card px-3 py-2 md:px-4 md:py-3 flex items-center gap-2 md:gap-4">
        <div class="flex items-center gap-2">
          <div class="p-1.5 md:p-2 bg-primary/10 rounded-full">
            <Plane class="w-4 h-4 md:w-5 md:h-5 text-primary" />
          </div>
          <div>
            <h1 class="text-base md:text-lg font-heading font-black uppercase tracking-tight leading-none">Global Routes</h1>
            <p class="text-[9px] md:text-[10px] text-muted-foreground font-medium mt-0.5 hidden sm:block">Select an airport to plan a trip</p>
          </div>
        </div>
        <div class="h-8 w-px bg-border mx-2 hidden sm:block"></div>
        <div class="hidden sm:flex gap-4">
          <div class="flex flex-col">
            <span class="text-[10px] uppercase text-muted-foreground font-bold">Airports</span>
            <span class="text-sm font-bold font-mono">{{ totalAirports }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-[10px] uppercase text-muted-foreground font-bold">Routes</span>
            <span class="text-sm font-bold font-mono text-primary">{{ totalDestinations }}</span>
          </div>
        </div>

        <div class="h-8 w-px bg-border mx-2 hidden sm:block"></div>

        <!-- Saved Routes -->
        <Popover>
          <PopoverTrigger as-child>
            <Button
              variant="ghost"
              size="xs"
              class="h-7 text-[10px] font-bold uppercase hover:text-primary gap-1 px-2"
            >
              Saved
              <ChevronDown class="w-3 h-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-64 p-0" align="end">
            <div class="p-2 border-b border-border bg-muted/30">
              <span class="text-xs font-bold uppercase">Saved Routes</span>
            </div>
            <div v-if="savedRoutes.length === 0" class="p-4 text-center text-xs text-muted-foreground">
              No saved routes yet.
            </div>
            <div v-else class="max-h-[300px] overflow-y-auto">
              <div
                v-for="route in savedRoutes"
                :key="route.id"
                class="group flex items-center justify-between p-2 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
              >
                <div
                  class="flex flex-col flex-1 min-w-0 cursor-pointer"
                  @click="emit('loadRoute', route)"
                >
                  <span class="text-xs font-bold truncate">{{ route.name }}</span>
                  <span class="text-[10px] text-muted-foreground font-mono">
                    {{ route.codes.length }} stops • {{ new Date(route.date).toLocaleDateString() }}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  @click.stop="emit('deleteRoute', route.id)"
                >
                  <Trash class="w-3 h-3" />
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <!-- Map Style & Dark Mode Toggles -->
      <div class="flex gap-1.5 md:gap-2">
        <!-- Search -->
        <div class="relative">
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="w-10 md:w-12 opacity-50"
            enter-to-class="w-64 opacity-100"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="w-64 opacity-100"
            leave-to-class="w-10 md:w-12 opacity-50"
          >
            <div
              v-if="isSearchOpen"
              class="map-card h-10 md:h-12 rounded-lg flex items-center gap-2 px-3 w-64"
            >
              <Search class="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                ref="searchInputRef"
                v-model="searchQuery"
                type="text"
                placeholder="Search airports..."
                class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                @keydown.escape="closeSearch"
              />
              <button
                class="p-1 hover:bg-muted rounded-full transition-colors"
                @click="closeSearch"
              >
                <X class="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </Transition>

          <Button
            v-if="!isSearchOpen"
            variant="outline"
            size="icon"
            class="map-card h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-lg hover:bg-accent"
            title="Search airports"
            @click="openSearch"
          >
            <Search class="w-4 h-4 md:w-5 md:h-5" />
          </Button>

          <!-- Search Results Dropdown -->
          <Transition
            enter-active-class="transition-all duration-150 ease-out"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-100 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-2"
          >
            <div
              v-if="isSearchOpen && searchResults.length > 0"
              class="absolute top-full right-0 mt-2 w-72 map-card rounded-lg overflow-hidden shadow-xl"
            >
              <div class="max-h-[300px] overflow-y-auto">
                <div
                  v-for="airport in searchResults"
                  :key="airport.iata_code"
                  class="flex items-center gap-3 p-2 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border/50 last:border-0"
                  @click="selectAirport(airport)"
                >
                  <div class="shrink-0 w-5 h-3.5 rounded-[1px] overflow-hidden shadow-sm">
                    <img
                      v-if="airport.iso_country"
                      :src="`https://flagcdn.com/w20/${airport.iso_country.toLowerCase()}.png`"
                      class="w-full h-full object-cover"
                      :alt="airport.iso_country"
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold font-mono text-primary">{{ airport.iata_code }}</span>
                      <span class="text-xs text-muted-foreground truncate">{{ airport.municipality }}</span>
                    </div>
                    <span class="text-[10px] text-muted-foreground truncate block">{{ airport.name }}</span>
                  </div>
                  <span class="text-[10px] text-muted-foreground shrink-0">{{ airport.destination_count }} routes</span>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <Button
          variant="outline"
          size="icon"
          class="map-card h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-lg hover:bg-accent"
          :title="isSatellite ? 'Switch to vector map' : 'Switch to satellite'"
          @click="emit('toggleMapStyle')"
        >
          <Map v-if="isSatellite" class="w-4 h-4 md:w-5 md:h-5" />
          <Globe v-else class="w-4 h-4 md:w-5 md:h-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          class="map-card h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-lg hover:bg-accent"
          @click="emit('toggleColorMode')"
        >
          <Sun v-if="isDark" class="w-4 h-4 md:w-5 md:h-5" />
          <Moon v-else class="w-4 h-4 md:w-5 md:h-5" />
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-card {
  @apply bg-card text-card-foreground border border-border shadow-lg backdrop-blur-sm;
}
</style>
