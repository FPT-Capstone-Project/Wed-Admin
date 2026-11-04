import type { ClimateReading } from './tray-climate.utils'

export type ClimateMetric = 'temperature' | 'humidity'
export type ClimateTone = 'ok' | 'danger' | 'muted'
export type ClimateDirection = 'high' | 'low' | 'within' | 'unknown'

export function getClimateDirection(reading: ClimateReading): ClimateDirection {
  if (reading.level === 'neutral' || reading.value == null) return 'unknown'
  if (reading.max != null && reading.value > reading.max) return 'high'
  if (reading.min != null && reading.value < reading.min) return 'low'
  return 'within'
}

export function getClimateTone(metric: ClimateMetric, direction: ClimateDirection): ClimateTone {
  if (direction === 'unknown') return 'muted'
  return (metric === 'temperature' && direction === 'high') ||
    (metric === 'humidity' && direction === 'low') ? 'danger' : 'ok'
}
