<script setup lang="ts">
import {
  Plane,
  MapPin,
  ExternalLink,
  Save,
  ArrowRight,
  CloudSun,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Calendar as CalendarIcon,
  ArrowUpDown
} from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import type { Airport } from '~/composables/useAirportSystem'
import ClimateDialog from './ClimateDialog.vue'

const climateDialogOpen = ref(false)
const climateAirport = ref<Airport | null>(null)

function openClimateDialog(airport: Airport) {
  climateAirport.value = airport
  climateDialogOpen.value = true
}

type SortOption = 'default' | 'country' | 'city'
const sortBy = ref<SortOption>('default')

function cycleSortOption() {
  const options: SortOption[] = ['default', 'country', 'city']
  const currentIndex = options.indexOf(sortBy.value)
  sortBy.value = options[(currentIndex + 1) % options.length]
}

const sortLabel = computed(() => {
  switch (sortBy.value) {
    case 'country': return 'Country'
    case 'city': return 'City'
    default: return 'Default'
  }
})

const props = defineProps<{
  selectedAirport: Airport | null
  sequence: Airport[]
  isRouteFinalized: boolean
  isMinimized: boolean
  startDate: string
  kiwiLink: string
  airportsByIata: Map<string, Airport>
}>()

const emit = defineEmits<{
  (e: 'minimizePanel'): void
  (e: 'expandPanel'): void
  (e: 'resetSequence'): void
  (e: 'editRoute'): void
  (e: 'saveRoute'): void
  (e: 'addToSequence', airport: Airport): void
  (e: 'finalizeRoute'): void
  (e: 'update:startDate', val: any): void
}>()

const sortedDestinations = computed(() => {
  if (!props.selectedAirport?.destinations) return []

  const dests = [...props.selectedAirport.destinations]

  switch (sortBy.value) {
    case 'country':
      return dests.sort((a, b) => {
        const countryA = props.airportsByIata.get(a)?.iso_country || 'ZZZ'
        const countryB = props.airportsByIata.get(b)?.iso_country || 'ZZZ'
        if (countryA !== countryB) return countryA.localeCompare(countryB)
        // Secondary sort by city within same country
        const cityA = props.airportsByIata.get(a)?.municipality || ''
        const cityB = props.airportsByIata.get(b)?.municipality || ''
        return cityA.localeCompare(cityB)
      })
    case 'city':
      return dests.sort((a, b) => {
        const cityA = props.airportsByIata.get(a)?.municipality || props.airportsByIata.get(a)?.name || ''
        const cityB = props.airportsByIata.get(b)?.municipality || props.airportsByIata.get(b)?.name || ''
        return cityA.localeCompare(cityB)
      })
    default:
      return dests
  }
})

</script>

<template>
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-y-10 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-10 opacity-0"
    >
      <div
        v-if="selectedAirport || isRouteFinalized"
        class="absolute bottom-0 left-0 right-0 md:bottom-6 md:left-6 md:right-auto z-[1000] w-full md:w-80 md:max-w-[calc(100vw-3rem)] pointer-events-auto"
      >
        <div class="map-card flex flex-col rounded-t-xl md:rounded-lg">
          
          <!-- TRIP SUMMARY VIEW -->
          <div v-if="isRouteFinalized && !isMinimized" class="flex flex-col max-h-[50vh] md:max-h-[60vh] overflow-hidden">
            <div class="p-4 bg-muted/30 border-b border-border flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Plane class="w-4 h-4 text-primary" />
                <h3 class="font-heading font-black text-lg leading-tight uppercase">Trip Summary</h3>
              </div>
              <Button variant="ghost" size="icon" class="h-6 w-6 -mr-2 -mt-2" title="Minimize" @click="emit('minimizePanel')">
                <ChevronDown class="w-3 h-3" />
              </Button>
            </div>

            <div class="flex-1 overflow-y-auto p-2 space-y-1">
              <div 
                v-for="(stop, idx) in sequence" 
                :key="stop.iata_code"
                class="group flex items-center gap-3 p-2 rounded border border-border/50 bg-background/50 transition-colors"
              >
                <div class="shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-black border border-border">
                  {{ idx + 1 }}
                </div>
                <div class="flex items-center gap-2.5 overflow-hidden flex-1">
                  <div v-if="stop.iso_country" class="shrink-0 w-6 h-4 rounded-[1px] overflow-hidden shadow-sm relative">
                    <img
                       :src="`https://flagcdn.com/w20/${stop.iso_country.toLowerCase()}.png`"
                       class="w-full h-full object-cover"
                       :alt="stop.iso_country"
                    />
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-sm font-bold leading-none truncate text-foreground">
                      {{ stop.municipality || stop.name }}
                    </span>
                    <span class="text-[10px] text-muted-foreground leading-tight truncate">
                       {{ stop.name }}
                    </span>
                  </div>
                </div>
                
                <div class="flex items-center gap-2 shrink-0">
                  <button
                    v-if="stop.latitude_deg && stop.longitude_deg"
                    class="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1.5 hover:bg-background/80 rounded-full text-muted-foreground hover:text-amber-500"
                    @click.stop="openClimateDialog(stop)"
                    title="View Climate"
                  >
                    <CloudSun class="w-3.5 h-3.5" />
                  </button>
                  <Badge variant="outline" class="font-mono text-[10px] font-bold px-1.5 py-0 h-5">
                    {{ stop.iata_code }}
                  </Badge>
                </div>
              </div>
            </div>

            <div class="p-3 border-t border-border bg-muted/10 flex flex-col gap-2">
               <div class="grid grid-cols-3 gap-2">
                 <Button
                    variant="outline"
                    size="sm"
                    class="w-full text-xs"
                    @click="emit('editRoute')"
                  >
                    Edit Route
                 </Button>
                 <Button
                    variant="outline"
                    size="sm"
                    class="w-full text-xs gap-1"
                    @click="emit('saveRoute')"
                  >
                    <Save class="w-3 h-3" />
                    Save
                 </Button>
                 <Button
                    variant="destructive"
                    size="sm"
                    class="w-full text-xs gap-1"
                    @click="emit('resetSequence')"
                  >
                    <RotateCcw class="w-3 h-3" />
                    Reset
                 </Button>
               </div>

               <!-- Date Picker + Search -->
               <div class="flex items-center gap-2">
                 <Popover>
                   <PopoverTrigger as-child>
                     <button class="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md border border-border/50 hover:bg-muted transition-colors text-xs font-medium">
                       <CalendarIcon class="w-3.5 h-3.5 text-muted-foreground" />
                       <span class="font-mono">{{ startDate }}</span>
                     </button>
                   </PopoverTrigger>
                   <PopoverContent class="w-auto p-0" align="start">
                     <Calendar
                       :model-value="undefined"
                       @update:model-value="emit('update:startDate', $event)"
                     />
                   </PopoverContent>
                 </Popover>

                 <Button
                    variant="default"
                    size="sm"
                    class="flex-1 text-xs gap-2 bg-[#00a991] hover:bg-[#008f7a] text-white border-0"
                    as-child
                  >
                    <a :href="kiwiLink" target="_blank" rel="noopener noreferrer">
                      <img
                        src="https://play-lh.googleusercontent.com/SlMA_aZk2-2Q_c9K1NU1ZRvIXUFvs5fe2EDTuntNK4D8qPHRLNbncRh0jJGCAmCdMQ"
                        class="w-4 h-4 rounded-full bg-white p-0.5"
                        alt="Kiwi"
                      />
                      Search Flights
                    </a>
                 </Button>
               </div>
            </div>
          </div>

          <!-- STANDARD AIRPORT INFO VIEW -->
          <div v-else-if="selectedAirport && !isMinimized" class="flex flex-col max-h-[50vh] md:max-h-[60vh] overflow-hidden">
            <div class="p-4 bg-muted/30 border-b border-border flex items-start justify-between">
              <div>
                 <div class="flex items-center gap-2 mb-1">
                   <Badge variant="outline" class="bg-background">{{ selectedAirport.iata_code }}</Badge>
                   <span class="text-[10px] uppercase font-bold text-muted-foreground">{{ selectedAirport.type.replace('_', ' ') }}</span>
                 </div>
                 <h3 class="font-heading font-black text-lg leading-tight">{{ selectedAirport.name }}</h3>
                 <div class="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                   <MapPin class="w-3 h-3" />
                   <img
                     v-if="selectedAirport.iso_country"
                     :src="`https://flagcdn.com/w20/${selectedAirport.iso_country.toLowerCase()}.png`"
                     class="w-3 h-2.5 object-cover rounded-[1px] shadow-sm"
                     :alt="selectedAirport.iso_country"
                   />
                   {{ selectedAirport.municipality }}, {{ selectedAirport.iso_country }}
                 </div>
              </div>
              <div class="flex items-center gap-1 -mr-2 -mt-2">
                <button
                  v-if="selectedAirport.latitude_deg && selectedAirport.longitude_deg"
                  class="p-1.5 hover:bg-background/80 rounded-full text-muted-foreground hover:text-amber-500 transition-colors"
                  @click="openClimateDialog(selectedAirport)"
                  title="View Climate"
                >
                  <CloudSun class="w-4 h-4" />
                </button>
                <Button variant="ghost" size="icon" class="h-6 w-6" title="Minimize" @click="emit('minimizePanel')">
                  <ChevronDown class="w-3 h-3" />
                </Button>
              </div>
            </div>

            <!-- Destinations List -->
            <div class="flex-1 overflow-hidden flex flex-col">
              <div class="px-4 py-2 bg-background/50 border-b border-border flex items-center justify-between">
                <span class="text-xs font-bold uppercase">Direct Connections</span>
                <div class="flex items-center gap-2">
                  <button
                    class="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
                    @click="cycleSortOption"
                    title="Change sort order"
                  >
                    <ArrowUpDown class="w-3 h-3" />
                    {{ sortLabel }}
                  </button>
                  <Badge variant="secondary" class="text-[10px]">{{ selectedAirport.destination_count }}</Badge>
                </div>
              </div>
              
              <div class="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
                <div
                  v-for="dest in sortedDestinations" 
                  :key="dest"
                  class="group flex items-center justify-between p-2 rounded hover:bg-accent/50 transition-colors cursor-pointer border border-transparent hover:border-border/50"
                  @click="airportsByIata.get(dest) && emit('addToSequence', airportsByIata.get(dest)!)"
                >
                  <!-- Left: City + Flag -->
                  <div class="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
                    <div class="shrink-0 w-5 h-3.5 rounded-[1px] overflow-hidden shadow-sm relative">
                      <img
                         v-if="airportsByIata.get(dest)?.iso_country"
                         :src="`https://flagcdn.com/w20/${airportsByIata.get(dest)!.iso_country.toLowerCase()}.png`"
                         class="w-full h-full object-cover"
                         alt="flag"
                      />
                      <div v-else class="w-full h-full bg-muted"></div>
                    </div>
                    
                    <div class="flex flex-col min-w-0">
                      <span class="text-sm font-bold leading-none truncate text-foreground">
                        {{ airportsByIata.get(dest)?.municipality || airportsByIata.get(dest)?.name || 'Unknown' }}
                      </span>
                      <span v-if="!airportsByIata.has(dest)" class="text-[9px] text-destructive leading-tight">
                        Data unavailable
                      </span>
                      <span v-else class="text-[10px] text-muted-foreground leading-tight truncate">
                         {{ airportsByIata.get(dest)?.name }}
                      </span>
                    </div>
                  </div>

                  <!-- Right: Weather + IATA Code -->
                  <div class="flex items-center gap-2 shrink-0">
                    <button
                      v-if="airportsByIata.get(dest)?.latitude_deg && airportsByIata.get(dest)?.longitude_deg"
                      class="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1.5 hover:bg-background/80 rounded-full text-muted-foreground hover:text-amber-500"
                      @click.stop="openClimateDialog(airportsByIata.get(dest)!)"
                      title="View Climate"
                    >
                      <CloudSun class="w-3.5 h-3.5" />
                    </button>
                    
                    <Badge variant="outline" class="font-mono text-[10px] font-bold px-1.5 py-0 h-5 bg-background text-muted-foreground group-hover:text-primary group-hover:border-primary/30 transition-colors">
                      {{ dest }}
                    </Badge>
                    <ArrowRight v-if="airportsByIata.has(dest)" class="w-3 h-3 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Footer Actions -->
            <div class="p-3 border-t border-border bg-muted/10 flex flex-col gap-2">
               <div class="grid grid-cols-2 gap-2">
                 <Button v-if="selectedAirport.wikipedia_link" variant="outline" size="sm" class="w-full gap-2 text-xs" as-child>
                   <a :href="selectedAirport.wikipedia_link" target="_blank">
                     <ExternalLink class="w-3 h-3" />
                     Wiki
                   </a>
                 </Button>
                 <Button
                    v-if="sequence.length > 0 && sequence[sequence.length-1].iata_code === selectedAirport.iata_code"
                    size="sm"
                    class="w-full text-xs bg-amber-500 hover:bg-amber-600 text-white"
                    @click="emit('finalizeRoute')"
                  >
                    End Route
                 </Button>
                 <Button
                    v-else
                    variant="default"
                    size="sm"
                    class="w-full text-xs"
                    @click="emit('addToSequence', selectedAirport)"
                  >
                    Start Here
                 </Button>
               </div>
               <Button
                  v-if="sequence.length > 0"
                  variant="destructive"
                  size="sm"
                  class="w-full text-xs gap-1"
                  @click="emit('resetSequence')"
                >
                  <RotateCcw class="w-3 h-3" />
                  Reset Route
               </Button>
            </div>
          </div>

          <!-- MINIMIZED VIEW -->
          <div
            v-else-if="isMinimized && (selectedAirport || isRouteFinalized)"
            class="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/20 transition-colors"
            @click="emit('expandPanel')"
          >
            <div class="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
              <Plane class="w-4 h-4 text-primary shrink-0" />
              <div class="flex items-center gap-1.5 min-w-0 overflow-hidden">
                <span v-if="isRouteFinalized" class="text-sm font-bold truncate">
                  {{ sequence.length }} stops
                </span>
                <span v-else-if="selectedAirport" class="text-sm font-bold truncate">
                  {{ selectedAirport.municipality || selectedAirport.name }}
                </span>
                <span class="text-xs text-muted-foreground">
                  {{ sequence.map(s => s.iata_code).join(' → ') }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" class="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground" title="Reset route" @click.stop="emit('resetSequence')">
                <RotateCcw class="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" class="h-6 w-6" title="Expand" @click.stop="emit('expandPanel')">
                <ChevronUp class="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <ClimateDialog
      :airport="climateAirport"
      v-model:open="climateDialogOpen"
    />
</template>

<style scoped>
.map-card {
  @apply bg-card text-card-foreground border border-border shadow-lg backdrop-blur-sm;
}
</style>