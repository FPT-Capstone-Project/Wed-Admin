import test from 'node:test'
import assert from 'node:assert/strict'
import { aggregateFloorHistory, HISTORY_BUCKET_MS as bucket } from '../src/features/dashboard/utils/floor-history.utils.ts'
const start = Date.parse('2026-11-01T00:00:00Z')
const sample = (sensorId, offset, temperature, humidity) => ({ sensorId, receivedAt: new Date(start + offset).toISOString(), temperature, humidity })
test('per-sensor means have equal weight regardless of sampling frequency', () => {
  const result = aggregateFloorHistory([sample(1, 1, 20, 80), sample(1, 2, 24, 84), sample(2, 3, 30, 90)], start, start + bucket)
  assert.equal(result[0].temperature, 26)
  assert.equal(result[0].humidity, 86)
})
test('missing sensors and individual metrics are independent; empty windows stay null', () => {
  const result = aggregateFloorHistory([sample(1, 1, 0, null), sample(2, bucket, null, 85)], start, start + 3 * bucket)
  assert.deepEqual(result.map(({ temperature, humidity }) => [temperature, humidity]), [[0, null], [null, 85], [null, null]])
})
test('window boundaries, invalid values, and input immutability', () => {
  const samples = [sample(1, -1, 99, 99), sample(1, 0, 25, 85), sample(2, bucket, 99, 99), sample(3, 1, NaN, Infinity)]
  const copy = structuredClone(samples)
  assert.equal(aggregateFloorHistory(samples, start, start + bucket)[0].temperature, 25)
  assert.deepEqual(samples, copy)
  assert.equal(aggregateFloorHistory([], start, start + 24 * 60 * 60_000).length, 96)
})
