import test from 'node:test'
import assert from 'node:assert/strict'
import {
  describeEnvironmentWindow,
  latestMeasuredPointAt,
  resolveEnvironmentDomain,
  DEFAULT_BUCKET_MS,
  DEFAULT_REFRESH_AFTER_MS,
} from '../src/features/dashboard/utils/environment-history.utils.ts'

const base = 1767225600000
const bucket = DEFAULT_BUCKET_MS

test('domain keeps the BE window but extends past the last measured bucket', () => {
  const from = base
  const to = base + 24 * 60 * 60_000
  const points = [
    { timestamp: base, temperature: 25, humidity: 85 },
    { timestamp: base + bucket, temperature: null, humidity: null },
  ]

  const [start, end] = resolveEnvironmentDomain(from, to, bucket, points)

  assert.equal(start, base)
  // `to` lớn hơn điểm cuối + 1 bucket ⇒ giữ nguyên cửa sổ BE.
  assert.equal(end, to)
})

test('domain extends beyond the BE window when a point is newer than `to`', () => {
  const from = base
  const to = base + 2 * bucket
  // BE trả điểm MỚI HƠN mốc `to` (đọc trễ / lệch đồng hồ server).
  const points = [
    { timestamp: base, temperature: 25, humidity: 85 },
    { timestamp: to + 3 * bucket, temperature: 26, humidity: 86 },
  ]

  const [start, end] = resolveEnvironmentDomain(from, to, bucket, points)

  assert.equal(start, base)
  // Điểm mới không được cắt ra ngoài trục ⇒ cuối domain ≥ điểm + 1 bucket.
  assert.equal(end, to + 4 * bucket)
})

test('domain falls back to the data when the BE window is missing', () => {
  const points = [
    { timestamp: base, temperature: 25, humidity: 85 },
    { timestamp: base + bucket, temperature: 26, humidity: 86 },
  ]

  const [start, end] = resolveEnvironmentDomain(undefined, undefined, bucket, points)

  assert.equal(start, base)
  assert.equal(end, base + 2 * bucket)
})

test('domain never collapses for an empty point list', () => {
  const [start, end] = resolveEnvironmentDomain(base, base + bucket, bucket, [])

  assert.equal(start, base)
  assert.ok(end > start)
})

test('latest measured point skips trailing empty buckets', () => {
  const points = [
    { timestamp: base, temperature: 25, humidity: 85 },
    { timestamp: base + bucket, temperature: 26, humidity: 86 },
    { timestamp: base + 2 * bucket, temperature: null, humidity: null },
  ]

  assert.equal(latestMeasuredPointAt(points), base + bucket)
  assert.equal(
    latestMeasuredPointAt([{ timestamp: base, temperature: null, humidity: null }]),
    null,
  )
})

test('window diagnostics report the BE anchor and the newest real reading', () => {
  const diagnostics = describeEnvironmentWindow({
    from: base,
    to: base + 24 * 60 * 60_000,
    bucketMs: bucket,
    refreshAfterMs: 300_000,
    floors: [
      {
        floorId: 1,
        floorName: 'Tầng 1',
        floorNumber: 1,
        roomId: 1,
        masterDbId: 3,
        masterId: '9f2c',
        nodeId: 1,
        thresholds: null,
        points: [
          { timestamp: base, temperature: 25, humidity: 85 },
          { timestamp: base + bucket, temperature: null, humidity: null },
        ],
      },
    ],
  })

  assert.ok(diagnostics)
  assert.equal(diagnostics.floorCount, 1)
  assert.equal(diagnostics.floorsWithData, 1)
  // Điểm mới nhất **có số đo** = 13:00 (không phải bucket rỗng 13:15).
  assert.equal(diagnostics.latestPointAt, base)
  assert.equal(diagnostics.floors[0].filledPointCount, 1)
  assert.equal(diagnostics.floors[0].pointCount, 2)
})

test('window diagnostics return null without data', () => {
  assert.equal(describeEnvironmentWindow(undefined), null)
  assert.equal(DEFAULT_REFRESH_AFTER_MS, 300_000)
})
