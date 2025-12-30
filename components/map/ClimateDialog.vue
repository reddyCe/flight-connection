<script setup lang="ts">
import { Loader2, CloudSun, RefreshCw, Thermometer, Droplets } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Airport } from '~/composables/useAirportSystem'
import { useClimateData, type MonthlyClimate } from '~/composables/useClimateData'

const props = defineProps<{
  airport: Airport | null
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const localOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val)
})

const { fetchClimateData, isLoading, error } = useClimateData()
const climateData = ref<MonthlyClimate[] | null>(null)

// Fetch when dialog opens
watch(() => props.open, async (isOpen) => {
  if (isOpen && props.airport?.latitude_deg && props.airport?.longitude_deg) {
    climateData.value = null
    const data = await fetchClimateData(
      props.airport.latitude_deg,
      props.airport.longitude_deg
    )
    climateData.value = data
  }
})

async function retry() {
  if (props.airport?.latitude_deg && props.airport?.longitude_deg) {
    climateData.value = null
    const data = await fetchClimateData(
      props.airport.latitude_deg,
      props.airport.longitude_deg
    )
    climateData.value = data
  }
}

const locationName = computed(() => {
  if (!props.airport) return ''
  return props.airport.municipality || props.airport.name
})

// Compute temperature color based on value (-20 to 45 range)
function getTempColor(temp: number): string {
  if (temp <= 0) return 'rgb(59, 130, 246)' // blue-500
  if (temp <= 10) return 'rgb(34, 197, 94)' // green-500
  if (temp <= 20) return 'rgb(234, 179, 8)'  // yellow-500
  if (temp <= 30) return 'rgb(249, 115, 22)' // orange-500
  return 'rgb(239, 68, 68)' // red-500
}

// Get temperature gradient for the bar
function getTempGradient(low: number, high: number): string {
  return `linear-gradient(to right, ${getTempColor(low)}, ${getTempColor(high)})`
}

// Normalize temperature to percentage for bar width (range: -20 to 45)
function tempToPercent(temp: number): number {
  const min = -20
  const max = 45
  return Math.max(0, Math.min(100, ((temp - min) / (max - min)) * 100))
}

// Get rainfall bar width (max ~300mm for scale)
function rainToPercent(rain: number): number {
  return Math.min(100, (rain / 300) * 100)
}

// Compute stats
const stats = computed(() => {
  if (!climateData.value) return null
  const highs = climateData.value.map(m => m.avgHigh)
  const lows = climateData.value.map(m => m.avgLow)
  const rains = climateData.value.map(m => m.rainfall)

  return {
    maxHigh: Math.max(...highs),
    minLow: Math.min(...lows),
    totalRain: Math.round(rains.reduce((a, b) => a + b, 0)),
    avgTemp: Math.round((highs.reduce((a, b) => a + b, 0) / 12 + lows.reduce((a, b) => a + b, 0) / 12) / 2)
  }
})
</script>

<template>
  <Dialog v-model:open="localOpen">
    <DialogContent class="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0 z-[2000]">
      <DialogHeader class="p-4 pb-2 border-b border-border bg-muted/30">
        <DialogTitle class="flex items-center gap-2">
          <CloudSun class="w-5 h-5 text-amber-500" />
          {{ locationName }}
        </DialogTitle>
        <DialogDescription>
          Monthly climate averages (5-year historical data)
        </DialogDescription>
      </DialogHeader>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-16">
        <Loader2 class="w-8 h-8 animate-spin text-muted-foreground" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex flex-col items-center justify-center py-12 gap-4">
        <p class="text-destructive text-sm text-center">{{ error }}</p>
        <Button variant="outline" size="sm" @click="retry">
          <RefreshCw class="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>

      <!-- Climate Data -->
      <div v-else-if="climateData && stats" class="flex flex-col overflow-hidden">
        <!-- Summary Stats -->
        <div class="grid grid-cols-3 gap-2 p-4 bg-background border-b border-border">
          <div class="flex flex-col items-center p-2 rounded-lg bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
            <span class="text-[10px] uppercase text-muted-foreground font-bold">Warmest</span>
            <span class="text-xl font-black text-orange-500">{{ stats.maxHigh }}&deg;</span>
          </div>
          <div class="flex flex-col items-center p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
            <span class="text-[10px] uppercase text-muted-foreground font-bold">Coldest</span>
            <span class="text-xl font-black text-blue-500">{{ stats.minLow }}&deg;</span>
          </div>
          <div class="flex flex-col items-center p-2 rounded-lg bg-gradient-to-br from-sky-500/10 to-indigo-500/10 border border-sky-500/20">
            <span class="text-[10px] uppercase text-muted-foreground font-bold">Yearly Rain</span>
            <span class="text-xl font-black text-sky-500">{{ stats.totalRain }}<span class="text-xs">mm</span></span>
          </div>
        </div>

        <!-- Side by Side Layout -->
        <div class="flex-1 overflow-y-auto p-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Temperature Section -->
            <div>
              <div class="flex items-center gap-2 mb-3">
                <Thermometer class="w-4 h-4 text-orange-500" />
                <span class="text-xs font-bold uppercase text-muted-foreground">Temperature Range</span>
              </div>
              <div class="space-y-2">
                <div
                  v-for="month in climateData"
                  :key="month.month + '-temp'"
                  class="flex items-center gap-2"
                >
                  <span class="w-8 text-[10px] font-bold text-muted-foreground shrink-0">
                    {{ month.month.slice(0, 3).toUpperCase() }}
                  </span>
                  <div class="flex-1 h-6 bg-muted/50 rounded-full overflow-hidden relative">
                    <div
                      class="absolute h-full rounded-full transition-all"
                      :style="{
                        left: tempToPercent(month.avgLow) + '%',
                        width: Math.max(8, tempToPercent(month.avgHigh) - tempToPercent(month.avgLow)) + '%',
                        background: getTempGradient(month.avgLow, month.avgHigh)
                      }"
                    />
                  </div>
                  <div class="flex items-center gap-1 shrink-0 w-20 justify-end">
                    <span class="text-xs font-mono text-blue-500">{{ month.avgLow }}&deg;</span>
                    <span class="text-xs text-muted-foreground">/</span>
                    <span class="text-xs font-mono text-orange-500">{{ month.avgHigh }}&deg;</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Rainfall Section -->
            <div>
              <div class="flex items-center gap-2 mb-3">
                <Droplets class="w-4 h-4 text-sky-500" />
                <span class="text-xs font-bold uppercase text-muted-foreground">Monthly Rainfall</span>
              </div>
              <div class="space-y-2">
                <div
                  v-for="month in climateData"
                  :key="month.month + '-rain'"
                  class="flex items-center gap-2"
                >
                  <span class="w-8 text-[10px] font-bold text-muted-foreground shrink-0">
                    {{ month.month.slice(0, 3).toUpperCase() }}
                  </span>
                  <div class="flex-1 h-6 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all"
                      :style="{ width: Math.max(2, rainToPercent(month.rainfall)) + '%' }"
                    />
                  </div>
                  <span class="text-xs font-mono text-sky-500 w-14 text-right shrink-0">
                    {{ month.rainfall }}mm
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Legend -->
        <div class="p-3 border-t border-border bg-muted/20">
          <div class="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 rounded-full bg-blue-500" />
              <span>&le;0&deg;C</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 rounded-full bg-green-500" />
              <span>10&deg;C</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 rounded-full bg-yellow-500" />
              <span>20&deg;C</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 rounded-full bg-orange-500" />
              <span>30&deg;C</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 rounded-full bg-red-500" />
              <span>&ge;40&deg;C</span>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
