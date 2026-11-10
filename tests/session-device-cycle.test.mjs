import test from 'node:test'
import assert from 'node:assert/strict'
import {
  aggregateDeviceCycles,
  formatCycleDuration,
} from '../src/features/sessions/utils/session-device-cycle.utils.ts'

/**
 * Gom nhật ký thiết bị (auto-control log) thành chu kỳ bật/tắt.
 *
 * ⚠ Nguồn: `iot_auto_control_logs` của BE (đọc qua
 *   `GET /api/iot/floors/{floorId}/auto-control/logs`).
 */

function event(id, type, floorId, createdAt, extra = {}) {
  return {
    event_id: id,
    floor_id: floorId,
    event_type: type,
    reason: null,
    created_at: createdAt,
    command_id: null,
    average_temperature: null,
    average_humidity: null,
    ...extra,
  }
}

test('an ON then OFF pair becomes one cycle with the run duration', () => {
  const cycles = aggregateDeviceCycles([
    event(1, 'ON_REQUESTED', 1, '2026-11-07T10:00:00Z'),
    event(2, 'OFF_REQUESTED', 1, '2026-11-07T10:05:00Z'),
  ])

  assert.equal(cycles.length, 1)
  assert.equal(cycles[0].isActive, false)
  assert.equal(cycles[0].durationMs, 5 * 60_000)
  assert.equal(cycles[0].floorId, 1)
  assert.equal(cycles[0].floorLabel, 'Tầng 1')
})

test('an ON without a matching OFF stays an active cycle', () => {
  const cycles = aggregateDeviceCycles([
    event(1, 'ON_REQUESTED', 1, '2026-11-07T10:00:00Z'),
  ])

  assert.equal(cycles.length, 1)
  assert.equal(cycles[0].isActive, true)
  assert.equal(cycles[0].durationMs, null)
})

test('repeated OFF events (the BE failsafe loop) are discarded', () => {
  const cycles = aggregateDeviceCycles([
    event(1, 'ON_REQUESTED', 1, '2026-11-07T10:00:00Z'),
    event(2, 'OFF_REQUESTED', 1, '2026-11-07T10:05:00Z'),
    event(3, 'OFF_REQUESTED', 1, '2026-11-07T10:05:10Z'),
    event(4, 'OFF_CONFIRMED', 1, '2026-11-07T10:05:20Z'),
  ])

  assert.equal(cycles.length, 1, 'only one cycle — the extra OFFs are noise')
  assert.equal(cycles[0].endedAt, Date.parse('2026-11-07T10:05:00Z'))
})

test('cycles of different floors never close each other', () => {
  const cycles = aggregateDeviceCycles([
    event(1, 'ON_REQUESTED', 1, '2026-11-07T10:00:00Z'),
    event(2, 'ON_REQUESTED', 2, '2026-11-07T10:01:00Z'),
    event(3, 'OFF_REQUESTED', 2, '2026-11-07T10:06:00Z'),
  ])

  assert.equal(cycles.length, 2)
  const floor1 = cycles.find((cycle) => cycle.floorId === 1)
  const floor2 = cycles.find((cycle) => cycle.floorId === 2)
  assert.equal(floor1.isActive, true)
  assert.equal(floor2.isActive, false)
})

test('a FAULT event marks the cycle as errored', () => {
  const cycles = aggregateDeviceCycles([
    event(1, 'ON_REQUESTED', 1, '2026-11-07T10:00:00Z'),
    event(2, 'OFF_REQUESTED', 1, '2026-11-07T10:05:00Z', {
      event_type: 'FAULT',
    }),
  ])

  assert.equal(cycles.length, 1)
  assert.equal(cycles[0].hasError, true)
})

test('cycles are returned newest first', () => {
  const cycles = aggregateDeviceCycles([
    event(1, 'ON_REQUESTED', 1, '2026-11-07T10:00:00Z'),
    event(2, 'OFF_REQUESTED', 1, '2026-11-07T10:01:00Z'),
    event(3, 'ON_REQUESTED', 1, '2026-11-07T11:00:00Z'),
    event(4, 'OFF_REQUESTED', 1, '2026-11-07T11:01:00Z'),
  ])

  assert.equal(cycles.length, 2)
  assert.equal(cycles[0].startedAt, Date.parse('2026-11-07T11:00:00Z'))
  assert.equal(cycles[1].startedAt, Date.parse('2026-11-07T10:00:00Z'))
})

test('floor labels are resolved from the floor id map', () => {
  const labels = new Map([[3, 'Tầng 3']])
  const cycles = aggregateDeviceCycles(
    [event(1, 'ON_REQUESTED', 3, '2026-11-07T10:00:00Z')],
    labels,
  )
  assert.equal(cycles[0].floorLabel, 'Tầng 3')
})

test('cycle duration is formatted for humans', () => {
  assert.equal(formatCycleDuration(30_000), '30 giây')
  assert.equal(formatCycleDuration(90_000), '1 phút 30 giây')
  assert.equal(formatCycleDuration(3_600_000), '1 giờ')
  assert.equal(formatCycleDuration(null), null)
  assert.equal(formatCycleDuration(-1), null)
})
