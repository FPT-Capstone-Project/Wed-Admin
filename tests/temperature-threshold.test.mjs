import test from 'node:test'
import assert from 'node:assert/strict'
import {
  extractTemperatureBounds,
} from '../src/features/dashboard/utils/temperature-threshold.utils.ts'
import {
  normalizeEnvironmentHistory,
  toChartFloors,
} from '../src/features/dashboard/utils/environment-history.utils.ts'

const base = 1767225600000

test('floor suggestion common range wins over other sources', () => {
  const bounds = extractTemperatureBounds({
    floorSuggestion: {
      common: { temperature_min: 24, temperature_max: 28 },
      config: { temperature_min: 10, temperature_max: 40 },
      sourceProfiles: [],
      issues: [],
      warnings: [],
      config: null,
    },
  })
  assert.deepEqual(bounds, { tempMin: 24, tempMax: 28 })
})

test('suggested config is used when no common range exists', () => {
  const bounds = extractTemperatureBounds({
    floorSuggestion: {
      common: null,
      sourceProfiles: [],
      issues: [],
      warnings: [],
      config: { temperature_min: 20, temperature_max: 26 },
    },
  })
  assert.deepEqual(bounds, { tempMin: 20, tempMax: 26 })
})

test('source profiles are intersected so the range fits every crop', () => {
  const bounds = extractTemperatureBounds({
    floorSuggestion: {
      common: null,
      config: null,
      issues: [],
      warnings: [],
      sourceProfiles: [
        { temperature_min: 24, temperature_max: 28 },
        { temperature_min: 25, temperature_max: 30 },
      ],
    },
  })
  assert.deepEqual(bounds, { tempMin: 25, tempMax: 28 })
})

test('cultivation profiles are used when floor suggestion is absent', () => {
  const bounds = extractTemperatureBounds({
    cultivation: {
      profiles: [{ temperature_min: 18, temperature_max: 24 }],
    },
  })
  assert.deepEqual(bounds, { tempMin: 18, tempMax: 24 })
})

test('legacy suggestions row is the last resort', () => {
  const bounds = extractTemperatureBounds({
    suggestions: { temperature_min: 15, temperature_max: 22 },
  })
  assert.deepEqual(bounds, { tempMin: 15, tempMax: 22 })
})

test('invalid or missing ranges never produce bounds', () => {
  assert.equal(extractTemperatureBounds(null), null)
  assert.equal(extractTemperatureBounds({}), null)
  assert.equal(
    extractTemperatureBounds({
      floorSuggestion: {
        common: { temperature_min: 28, temperature_max: 24 },
        config: null, sourceProfiles: [], issues: [], warnings: [],
      },
    }),
    null,
  )
  assert.equal(
    extractTemperatureBounds({
      floorSuggestion: {
        common: { temperature_min: null, temperature_max: 24 },
        config: null, sourceProfiles: [], issues: [], warnings: [],
      },
    }),
    null,
  )
})

test('chart floors gain the fallback temperature range when the backend has none', () => {
  const data = normalizeEnvironmentHistory({
    floors: [{
      floorId: 1, floorName: 'Tầng 1',
      thresholds: { temperature_min: null, temperature_max: null, humidity_min: 75, humidity_max: 90 },
      points: [{ timestamp: base, temperature: 30, humidity: 85 }],
    }],
  })
  const floors = toChartFloors(
    data,
    new Map([[1, { tempMin: 20, tempMax: 28 }]]),
  )
  assert.deepEqual(floors[0].thresholds, {
    tempMin: 20, tempMax: 28, humidityMin: 75, humidityMax: 90,
  })
})

test('backend thresholds always win over the fallback range', () => {
  const data = normalizeEnvironmentHistory({
    floors: [{
      floorId: 1, floorName: 'Tầng 1',
      thresholds: { temperature_min: 22, temperature_max: 26, humidity_min: 75, humidity_max: 90 },
      points: [{ timestamp: base, temperature: 30, humidity: 85 }],
    }],
  })
  const floors = toChartFloors(
    data,
    new Map([[1, { tempMin: 20, tempMax: 28 }]]),
  )
  assert.equal(floors[0].thresholds?.tempMin, 22)
  assert.equal(floors[0].thresholds?.tempMax, 26)
})
