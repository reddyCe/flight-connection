export interface MonthlyClimate {
  month: string
  avgHigh: number
  avgLow: number
  rainfall: number
}

interface OpenMeteoResponse {
  daily: {
    time: string[]
    temperature_2m_max: (number | null)[]
    temperature_2m_min: (number | null)[]
    precipitation_sum: (number | null)[]
  }
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// In-memory cache keyed by rounded coordinates
const climateCache = new Map<string, MonthlyClimate[]>()

function getCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)}_${lng.toFixed(2)}`
}

function computeMonthlyAverages(data: OpenMeteoResponse): MonthlyClimate[] {
  const monthlyData: { highs: number[]; lows: number[]; rain: number[] }[] =
    Array.from({ length: 12 }, () => ({ highs: [], lows: [], rain: [] }))

  const { time, temperature_2m_max, temperature_2m_min, precipitation_sum } = data.daily

  for (let i = 0; i < time.length; i++) {
    const month = new Date(time[i]).getMonth()

    if (temperature_2m_max[i] !== null) {
      monthlyData[month].highs.push(temperature_2m_max[i]!)
    }
    if (temperature_2m_min[i] !== null) {
      monthlyData[month].lows.push(temperature_2m_min[i]!)
    }
    if (precipitation_sum[i] !== null) {
      monthlyData[month].rain.push(precipitation_sum[i]!)
    }
  }

  return monthlyData.map((data, idx) => {
    const avgHigh = data.highs.length > 0
      ? data.highs.reduce((a, b) => a + b, 0) / data.highs.length
      : 0
    const avgLow = data.lows.length > 0
      ? data.lows.reduce((a, b) => a + b, 0) / data.lows.length
      : 0
    const avgRainfall = data.rain.length > 0
      ? (data.rain.reduce((a, b) => a + b, 0) / data.rain.length) * 30 // Avg daily * 30 for monthly
      : 0

    return {
      month: MONTH_NAMES[idx],
      avgHigh: Math.round(avgHigh * 10) / 10,
      avgLow: Math.round(avgLow * 10) / 10,
      rainfall: Math.round(avgRainfall)
    }
  })
}

export function useClimateData() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchClimateData(lat: number, lng: number): Promise<MonthlyClimate[] | null> {
    const cacheKey = getCacheKey(lat, lng)

    // Check cache first
    if (climateCache.has(cacheKey)) {
      return climateCache.get(cacheKey)!
    }

    isLoading.value = true
    error.value = null

    try {
      // Fetch 5 years of historical data
      const endYear = new Date().getFullYear() - 1
      const startYear = endYear - 4

      const url = new URL('https://archive-api.open-meteo.com/v1/archive')
      url.searchParams.set('latitude', lat.toString())
      url.searchParams.set('longitude', lng.toString())
      url.searchParams.set('start_date', `${startYear}-01-01`)
      url.searchParams.set('end_date', `${endYear}-12-31`)
      url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum')
      url.searchParams.set('timezone', 'auto')

      const response = await $fetch<OpenMeteoResponse>(url.toString())

      if (!response.daily || !response.daily.time) {
        throw new Error('Invalid response from weather API')
      }

      const monthlyData = computeMonthlyAverages(response)

      // Cache the result
      climateCache.set(cacheKey, monthlyData)

      return monthlyData
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch climate data'
      return null
    } finally {
      isLoading.value = false
    }
  }

  function clearCache() {
    climateCache.clear()
  }

  return {
    fetchClimateData,
    isLoading,
    error,
    clearCache
  }
}
