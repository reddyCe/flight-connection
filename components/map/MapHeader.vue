<script setup lang="ts">
import {
  Plane,
  Sun,
  Moon,
  ChevronDown,
  Trash,
  Globe,
  Map
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import type { SavedRoute } from '~/composables/useSavedRoutes'

const props = defineProps<{
  totalAirports: number
  totalDestinations: number
  isDark: boolean
  isSatellite: boolean
  savedRoutes: SavedRoute[]
}>()

const emit = defineEmits<{
  (e: 'toggleColorMode'): void
  (e: 'toggleMapStyle'): void
  (e: 'loadRoute', route: SavedRoute): void
  (e: 'deleteRoute', id: string): void
}>()

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
