export interface SensorSample {
  sensorId: number
  receivedAt: string | null
  temperature: number | null
  humidity: number | null
}
export interface FloorHistoryPoint {
  timestamp: number
  temperature: number | null
  humidity: number | null
}
export const HISTORY_BUCKET_MS = 15 * 60_000

/** Equal weight per sensor, independently for each metric, in [from, to). */
export function aggregateFloorHistory(samples: readonly SensorSample[], from: number, to: number): FloorHistoryPoint[] {
  const buckets = Array.from({ length: Math.ceil((to - from) / HISTORY_BUCKET_MS) }, (_, index) => ({
    timestamp: from + index * HISTORY_BUCKET_MS,
    sensors: new Map<number, { temperature: number[]; humidity: number[] }>(),
  }))
  for (const sample of samples) {
    const time = sample.receivedAt == null ? NaN : Date.parse(sample.receivedAt)
    if (!Number.isFinite(time) || time < from || time >= to) continue
    const bucket = buckets[Math.floor((time - from) / HISTORY_BUCKET_MS)]
    const values = bucket.sensors.get(sample.sensorId) ?? { temperature: [], humidity: [] }
    for (const metric of ['temperature', 'humidity'] as const) {
      const value = sample[metric]
      if (value != null && Number.isFinite(value)) values[metric].push(value)
    }
    bucket.sensors.set(sample.sensorId, values)
  }
  const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
  return buckets.map(bucket => {
    const metricMean = (metric: 'temperature' | 'humidity') => mean([...bucket.sensors.values()]
      .flatMap(values => { const value = mean(values[metric]); return value == null ? [] : [value] }))
    return { timestamp: bucket.timestamp, temperature: metricMean('temperature'), humidity: metricMean('humidity') }
  })
}
