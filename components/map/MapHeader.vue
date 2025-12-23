<script setup lang="ts">
import {
  Plane,
  RotateCcw,
  ArrowRight,
  Calendar as CalendarIcon,
  Sun,
  Moon,
  History,
  Trash,
  Globe,
  Map
} from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import type { Airport } from '~/composables/useAirportSystem'
import type { SavedRoute } from '~/composables/useSavedRoutes'

const props = defineProps<{
  totalAirports: number
  totalDestinations: number
  sequence: Airport[]
  startDate: string
  isDark: boolean
  isSatellite: boolean
  savedRoutes: SavedRoute[]
}>()

const emit = defineEmits<{
  (e: 'toggleColorMode'): void
  (e: 'toggleMapStyle'): void
  (e: 'resetSequence'): void
  (e: 'update:startDateValue', val: any): void
  (e: 'loadRoute', route: SavedRoute): void
  (e: 'deleteRoute', id: string): void
}>()

// Use v-model for date
const dateModel = computed({
  get: () => undefined, // We don't need to read it back here as prop is string
  set: (val) => emit('update:startDateValue', val)
})

</script>

<template>
  <div class="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none">
      <div class="flex flex-col gap-4 pointer-events-auto">
        
        <!-- Header / Control Row -->
        <div class="flex items-start justify-between gap-4">
          
          <!-- Branding / Main Stats -->
          <div v-if="sequence.length === 0" class="map-card px-4 py-3 flex items-center gap-4">
            <div class="flex items-center gap-2">
              <div class="p-2 bg-primary/10 rounded-full">
                <Plane class="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 class="text-lg font-heading font-black uppercase tracking-tight leading-none">Global Routes</h1>
                <p class="text-[10px] text-muted-foreground font-medium mt-0.5">Select an airport to plan a trip</p>
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
            
            <!-- Saved Routes (Empty State) -->
             <Popover>
              <PopoverTrigger as-child>
                 <Button 
                  variant="ghost" 
                  size="xs" 
                  class="h-7 text-[10px] font-bold uppercase hover:text-primary gap-1 px-2"
                >
                  <History class="w-3 h-3" />
                  Saved
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

          <!-- Sequence Active Header -->
          <div v-else class="map-card p-2 w-auto max-w-[90vw] overflow-hidden flex flex-col gap-2 transition-all duration-300 ease-in-out">
             <div class="flex items-center justify-between px-2 pt-1 gap-6">
                <div class="flex items-center gap-4">
                  <span class="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5 tracking-widest">
                    <Plane class="w-3.5 h-3.5 text-primary" />
                    Flight Plan
                  </span>
                  
                  <Popover>
                    <PopoverTrigger as-child>
                      <button class="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-md border border-border/50 hover:bg-muted transition-colors outline-none focus:ring-2 focus:ring-primary/20">
                        <CalendarIcon class="w-3 h-3 text-muted-foreground" />
                        <span class="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Start</span>
                        <span class="text-[10px] font-bold font-mono">{{ startDate }}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent class="w-auto p-0" align="start">
                      <Calendar 
                        :model-value="undefined" 
                        @update:model-value="emit('update:startDateValue', $event)" 
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div class="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger as-child>
                       <Button 
                        variant="ghost" 
                        size="xs" 
                        class="h-7 text-[10px] font-bold uppercase hover:text-primary gap-1 px-2"
                      >
                        <History class="w-3 h-3" />
                        Saved
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

                  <Button 
                    variant="ghost" 
                    size="xs" 
                    class="h-7 text-[10px] font-bold uppercase hover:text-destructive gap-1 px-2" 
                    @click="emit('resetSequence')"
                  >
                    <RotateCcw class="w-3 h-3" />
                    Reset
                  </Button>
                </div>
             </div>
             
             <!-- Breadcrumbs -->
             <div class="flex items-center gap-2 overflow-x-auto pb-2 px-2 mask-linear">
                <div v-for="(stop, idx) in sequence" :key="stop.iata_code" class="flex items-center shrink-0">
                   <Badge 
                      :variant="idx === sequence.length - 1 ? 'default' : 'secondary'"
                      class="font-mono text-xs px-2 py-1 gap-2"
                   >
                      {{ stop.iata_code }}
                      <span v-if="idx === 0" class="w-1.5 h-1.5 rounded-full bg-green-400 ml-1"></span>
                      <span v-if="idx === sequence.length - 1 && idx > 0" class="w-1.5 h-1.5 rounded-full bg-amber-400 ml-1"></span>
                   </Badge>
                   <ArrowRight v-if="idx < sequence.length - 1" class="w-3 h-3 text-muted-foreground mx-1" />
                </div>
                <!-- Prompt for next -->
                <div class="flex items-center shrink-0 opacity-50 animate-pulse">
                   <ArrowRight class="w-3 h-3 text-muted-foreground mx-1" />
                   <div class="border border-dashed border-muted-foreground/50 rounded px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground">
                      Select Destination
                   </div>
                </div>
             </div>
          </div>

          <!-- Map Style & Dark Mode Toggles -->
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              class="map-card h-12 w-12 shrink-0 rounded-lg hover:bg-accent"
              :title="isSatellite ? 'Switch to vector map' : 'Switch to satellite'"
              @click="emit('toggleMapStyle')"
            >
              <Map v-if="isSatellite" class="w-5 h-5" />
              <Globe v-else class="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              class="map-card h-12 w-12 shrink-0 rounded-lg hover:bg-accent"
              @click="emit('toggleColorMode')"
            >
              <Sun v-if="isDark" class="w-5 h-5" />
              <Moon v-else class="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
</template>

<style scoped>
.map-card {
  @apply bg-card text-card-foreground border border-border shadow-lg backdrop-blur-sm;
}
.mask-linear {
  mask-image: linear-gradient(to right, black 85%, transparent 100%);
}
</style>
