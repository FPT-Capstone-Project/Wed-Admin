import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAxisTicks,
  resolveAxisDomain,
  resolveTimeRangeWindow,
  ENVIRONMENT_HISTORY_BUCKET_MINUTES,
} from '../src/features/sessions/utils/session-sensor-aggregation.utils.ts'
import {
  environmentRecordsToClimatePoints,
  filterEnvironmentRecordsByWindow,
  mergeFloorClimatePoints,
} from '../src/features/sessions/utils/session-environment-aggregation.utils.ts'

const NOW = new Date('2026-11-07T22:07:00+07:00')

test('time window is exactly the selected range and aligned to 10 minutes', () => {
  for (const [range, hours] of [['1h', 1], ['6h', 6], ['12h', 12], ['24h', 24]]) {
    const { start, end } = resolveTimeRangeWindow(range, NOW)
    assert.equal(end - start, hours * 60 * 60 * 1000)
    assert.ok(end <= NOW.getTime())
    // BE buckets are aligned on 10-minute boundaries (date_bin '10 minutes').
    assert.equal(end % (10 * 60_000), 0)
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

test('environment history bucket size matches the 10-minute BE aggregation', () => {
  assert.equal(ENVIRONMENT_HISTORY_BUCKET_MINUTES, 10)
})

test('environment records are grouped by period_start and averaged per metric', () => {
  const points = environmentRecordsToClimatePoints([
    {
      session_id: 1,
      floor_id: 1,
      period_start: '2026-11-07T14:00:00.000Z',
      period_end: '2026-11-07T14:10:00.000Z',
      growth_stage: 'PINNING',
      temperature_avg: 20,
      humidity_avg: 80,
    },
    {
      session_id: 1,
      floor_id: 2,
      period_start: '2026-11-07T14:00:00.000Z',
      period_end: '2026-11-07T14:10:00.000Z',
      growth_stage: 'PINNING',
      temperature_avg: 24,
      humidity_avg: null,
    },
    {
      session_id: 1,
      floor_id: 1,
      period_start: '2026-11-07T14:10:00.000Z',
      period_end: '2026-11-07T14:20:00.000Z',
      growth_stage: 'PINNING',
      temperature_avg: null,
      humidity_avg: 90,
    },
  ])

  assert.equal(points.length, 2, 'two distinct 10-minute buckets')

  const first = points[0]
  assert.equal(first.temperature, 22, 'averaged per metric — humidity is not polluted')
  assert.equal(first.humidity, 80, 'a floor without humidity does not dilute the other')
  assert.equal(first.sampleCount, 2, 'two floors contributed temperature samples')
  assert.equal(first.serverAggregated, true)
  assert.deepEqual(first.floorIds.sort(), [1, 2])

  const second = points[1]
  assert.equal(second.temperature, null, 'no sample ⇒ null, never 0')
  assert.equal(second.humidity, 90)
})

test('floor labels are resolved from the floor id map', () => {
  const labels = new Map([[1, 'Tầng 1']])
  const [point] = environmentRecordsToClimatePoints(
    [
      {
        session_id: 1,
        floor_id: 1,
        period_start: '2026-11-07T14:00:00.000Z',
        period_end: '2026-11-07T14:10:00.000Z',
        growth_stage: 'PINNING',
        temperature_avg: 25,
        humidity_avg: 82,
      },
    ],
    labels,
  )
  assert.deepEqual(point.floorLabels, ['Tầng 1'])
})

test('records without a valid period_start are skipped', () => {
  const points = environmentRecordsToClimatePoints([
    {
      session_id: 1,
      floor_id: 1,
      period_start: null,
      period_end: null,
      growth_stage: null,
      temperature_avg: 25,
      humidity_avg: 82,
    },
  ])
  assert.equal(points.length, 0)
})

test('records are filtered by the [start, end] window', () => {
  const records = [
    {
      session_id: 1,
      floor_id: 1,
      period_start: '2026-11-07T13:00:00.000Z',
      period_end: '2026-11-07T13:10:00.000Z',
      growth_stage: 'PINNING',
      temperature_avg: 20,
      humidity_avg: 80,
    },
    {
      session_id: 1,
      floor_id: 1,
      period_start: '2026-11-07T14:00:00.000Z',
      period_end: '2026-11-07T14:10:00.000Z',
      growth_stage: 'PINNING',
      temperature_avg: 25,
      humidity_avg: 85,
    },
  ]

  const filtered = filterEnvironmentRecordsByWindow(
    records,
    Date.parse('2026-11-07T13:30:00.000Z'),
    Date.parse('2026-11-07T14:30:00.000Z'),
  )
  assert.equal(filtered.length, 1)
  assert.equal(filtered[0].temperature_avg, 25)
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
