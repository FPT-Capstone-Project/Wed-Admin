import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeEnvironmentHistory,
  toChartFloors,
  toLatestEnvironment,
  DEFAULT_BUCKET_MS,
  DEFAULT_REFRESH_AFTER_MS,
} from '../src/features/dashboard/utils/environment-history.utils.ts'

const base = 1767225600000
const bucket = DEFAULT_BUCKET_MS

test('normalizes a full payload and keeps null for missing metrics', () => {
  const result = normalizeEnvironmentHistory({
    from: base,
    to: base + 24 * 60 * 60_000,
    bucketMs: bucket,
    refreshAfterMs: 300000,
    floors: [{
      floorId: 1, floorName: 'Tầng 1', floorNumber: 1, roomId: 1,
      masterDbId: 3, masterId: '9f2c', nodeId: 1,
      thresholds: { temperature_min: 20, temperature_max: 28, humidity_min: 80, humidity_max: 92 },
      points: [
        { timestamp: base, temperature: 25.3, humidity: 85.1 },
        { timestamp: base + bucket, temperature: null, humidity: 84 },
      ],
    }],
  })
  assert.equal(result.bucketMs, bucket)
  assert.equal(result.refreshAfterMs, 300000)
  assert.equal(result.floors.length, 1)
  assert.equal(result.floors[0].floorName, 'Tầng 1')
  assert.equal(result.floors[0].points[0].temperature, 25.3)
  assert.equal(result.floors[0].points[1].temperature, null)
  assert.equal(result.floors[0].points[1].humidity, 84)
  assert.equal(result.floors[0].thresholds.humidity_max, 92)
})

test('missing floors and window fall back to safe defaults', () => {
  const result = normalizeEnvironmentHistory({})
  assert.deepEqual(result.floors, [])
  assert.equal(result.from, 0)
  assert.equal(result.to, 0)
  assert.equal(result.bucketMs, DEFAULT_BUCKET_MS)
  assert.equal(result.refreshAfterMs, DEFAULT_REFRESH_AFTER_MS)
})

test('numeric strings are accepted; non-finite values become missing data', () => {
  const result = normalizeEnvironmentHistory({
    from: '1767225600000',
    floors: [{ floorId: '2', points: [{ timestamp: base, temperature: '25.5', humidity: 'NaN' }] }],
  })
  assert.equal(result.from, 1767225600000)
  assert.equal(result.floors[0].floorId, 2)
  assert.equal(result.floors[0].points[0].temperature, 25.5)
  assert.equal(result.floors[0].points[0].humidity, null)
})

test('absent thresholds become null rather than an all-null object', () => {
  const absent = normalizeEnvironmentHistory({ floors: [{ floorId: 1, thresholds: {} }] })
  assert.equal(absent.floors[0].thresholds, null)
  const allNull = normalizeEnvironmentHistory({
    floors: [{ floorId: 1, thresholds: { temperature_min: null, humidity_max: null } }],
  })
  assert.equal(allNull.floors[0].thresholds, null)
  const partial = normalizeEnvironmentHistory({
    floors: [{ floorId: 1, thresholds: { temperature_max: 28 } }],
  })
  assert.deepEqual(partial.floors[0].thresholds, {
    temperature_min: null, temperature_max: 28, humidity_min: null, humidity_max: null,
  })
})

test('chart floors drop floors without points and map thresholds to domain shape', () => {
  const data = normalizeEnvironmentHistory({
    floors: [
      { floorId: 1, floorName: 'Tầng 1', thresholds: { temperature_min: 20, temperature_max: 28 },
        points: [{ timestamp: base, temperature: 25, humidity: 85 }] },
      { floorId: 2, floorName: 'Tầng 2', points: [] },
    ],
  })
  const floors = toChartFloors(data)
  assert.equal(floors.length, 1)
  assert.equal(floors[0].floorName, 'Tầng 1')
  assert.deepEqual(floors[0].thresholds, {
    tempMin: 20, tempMax: 28, humidityMin: null, humidityMax: null,
  })
})

test('latest environment uses the newest non-null reading, not the last bucket', () => {
  const data = normalizeEnvironmentHistory({
    floors: [{
      floorId: 1, floorName: 'Tầng 1',
      points: [
        { timestamp: base, temperature: 25, humidity: 85 },
        { timestamp: base + bucket, temperature: 26, humidity: 86 },
        { timestamp: base + 2 * bucket, temperature: null, humidity: null },
      ],
    }],
  })
  const latest = toLatestEnvironment(toChartFloors(data))
  assert.equal(latest[0].temperature, 26)
  assert.equal(latest[0].humidity, 86)
})

test('latest environment reports missing data when every reading is empty', () => {
  const data = normalizeEnvironmentHistory({
    floors: [{ floorId: 1, floorName: 'Tầng 1', points: [{ timestamp: base, temperature: null, humidity: null }] }],
  })
  const latest = toLatestEnvironment(toChartFloors(data))
  assert.equal(latest[0].temperature, null)
  assert.equal(latest[0].humidity, null)
})
