import test from 'node:test'
import assert from 'node:assert/strict'
import {
  aggregateReadingsByBucket,
  buildAxisTicks,
  mergeFloorClimatePoints,
  resolveAxisDomain,
  resolveTimeRangeWindow,
  SENSOR_TIME_RANGE_BUCKET_MINUTES,
  SENSOR_TIME_RANGE_USES_SERVER_AGGREGATE,
} from '../src/features/sessions/utils/session-sensor-aggregation.utils.ts'

const NOW = new Date('2026-11-07T22:07:00+07:00')

test('time window is exactly the selected range and aligned to 15 minutes', () => {
  for (const [range, hours] of [['1h', 1], ['6h', 6], ['12h', 12], ['24h', 24]]) {
    const { start, end } = resolveTimeRangeWindow(range, NOW)
    assert.equal(end - start, hours * 60 * 60 * 1000)
    // BE rejects windows longer than 24h — align to 15m keeps it exactly 24h.
    assert.ok(end <= NOW.getTime())
    assert.equal(end % (15 * 60_000), 0)
  }
})

test('axis ticks are 5 evenly spaced marks across the whole window', () => {
  for (const range of ['1h', '6h', '12h', '24h']) {
    const ticks = buildAxisTicks(range, NOW)
    const { start, end } = resolveTimeRangeWindow(range, NOW)

    assert.equal(ticks.length, 5)
    assert.equal(ticks[0], start)
    assert.equal(ticks[4], end)

    const gaps = ticks.slice(1).map((tick, index) => tick - ticks[index])
    assert.ok(gaps.every((gap) => gap === gaps[0]), 'ticks must be evenly spaced')
  }
})

test('6h axis shows the full window instead of only the latest minutes', () => {
  const ticks = buildAxisTicks('6h', NOW)
  const labels = ticks.map((tick) => new Date(tick).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }))
  assert.deepEqual(labels, ['16:00', '17:30', '19:00', '20:30', '22:00'])
})

test('axis domain is fixed to the window regardless of the data extent', () => {
  for (const [range, hours] of [['1h', 1], ['6h', 6], ['12h', 12], ['24h', 24]]) {
    const [min, max] = resolveAxisDomain(range, NOW)
    const { start, end } = resolveTimeRangeWindow(range, NOW)

    // The window is honoured (±1 minute of padding so edge points are not cut).
    assert.equal(max - min, hours * 60 * 60 * 1000 + 2 * 60_000)
    assert.ok(min < start && max > end)

    // Never narrower than the requested window, even with no data at all.
    assert.ok(max - min >= hours * 60 * 60 * 1000)
  }
})

test('axis ticks stay inside the domain so no mark is clipped', () => {
  for (const range of ['1h', '6h', '12h', '24h']) {
    const [min, max] = resolveAxisDomain(range, NOW)
    for (const tick of buildAxisTicks(range, NOW)) {
      assert.ok(tick > min && tick < max, `tick ${tick} must sit inside the domain`)
    }
  }
})

test('bucket size grows with the range so point count stays bounded', () => {
  assert.equal(SENSOR_TIME_RANGE_BUCKET_MINUTES['1h'], 1)
  assert.equal(SENSOR_TIME_RANGE_BUCKET_MINUTES['6h'], 5)
  assert.equal(SENSOR_TIME_RANGE_BUCKET_MINUTES['12h'], 10)
  assert.equal(SENSOR_TIME_RANGE_BUCKET_MINUTES['24h'], 15)

  // Long ranges use the server-aggregated source (1 request, full window).
  assert.equal(SENSOR_TIME_RANGE_USES_SERVER_AGGREGATE['1h'], false)
  assert.equal(SENSOR_TIME_RANGE_USES_SERVER_AGGREGATE['6h'], true)
  assert.equal(SENSOR_TIME_RANGE_USES_SERVER_AGGREGATE['24h'], true)
})

test('raw readings are grouped into stable hour-aligned buckets', () => {
  const readings = [
    { reading_id: 1, received_at: '2026-11-07T21:00:10+07:00', measured_at: null, temperature: 20, humidity: 80, sensor_id: 1, node_address: 1, master_id: 'm', floor_id: 1, floor_name: 'Tầng 1', is_valid: true, retained: false },
    { reading_id: 2, received_at: '2026-11-07T21:00:40+07:00', measured_at: null, temperature: 24, humidity: null, sensor_id: 2, node_address: 1, master_id: 'm', floor_id: 1, floor_name: 'Tầng 1', is_valid: true, retained: false },
    { reading_id: 3, received_at: '2026-11-07T21:03:00+07:00', measured_at: null, temperature: null, humidity: 90, sensor_id: 3, node_address: 1, master_id: 'm', floor_id: 2, floor_name: 'Tầng 2', is_valid: true, retained: false },
  ]

  const points = aggregateReadingsByBucket(readings, 5)
  assert.equal(points.length, 1, '3 samples inside one 5-minute bucket')

  const point = points[0]
  assert.equal(point.temperature, 22, 'averaged per metric — humidity is not polluted')
  assert.equal(point.humidity, 85)
  assert.equal(point.sampleCount, 3)
  assert.equal(point.serverAggregated, false)
  assert.deepEqual(point.floorIds.sort(), [1, 2])
})

test('server-aggregated floors merge per timestamp and metric', () => {
  const series = [
    { timestamp: 1000, temperature: 20, humidity: 80, floorId: 1, floorLabel: 'Tầng 1' },
    { timestamp: 1000, temperature: 26, humidity: null, floorId: 2, floorLabel: 'Tầng 2' },
    { timestamp: 2000, temperature: null, humidity: 70, floorId: 1, floorLabel: 'Tầng 1' },
  ]

  const points = mergeFloorClimatePoints(series)
  assert.equal(points.length, 2)

  assert.equal(points[0].temperature, 23)
  assert.equal(points[0].humidity, 80, 'missing humidity on one floor does not dilute the other')
  assert.equal(points[0].serverAggregated, true)

  assert.equal(points[1].temperature, null, 'no sample ⇒ null, never 0')
  assert.equal(points[1].humidity, 70)
})
