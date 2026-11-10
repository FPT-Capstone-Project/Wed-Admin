import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildFloorLabelMap,
  buildFloorLabelMapFromKeys,
  collectMappedFloorIds,
  filterSessionFloorMappings,
  matchFloorMapping,
  toSessionFloorKey,
} from '../src/features/sessions/utils/session-floor-matching.utils.ts'
import {
  extractDeviceClimate,
} from '../src/features/sessions/utils/session-device-climate.utils.ts'
import {
  buildAxisTicks,
  resolveAxisDomain,
  resolveSessionChartAnchor,
  resolveTimeRangeWindow,
} from '../src/features/sessions/utils/session-sensor-aggregation.utils.ts'

/**
 * Test cho 4 thay đổi phòng thủ:
 *   1. Khớp tầng khi BE không trả `floor_id`.
 *   2. Trích nhiệt độ / độ ẩm từ `sensor_values_json`.
 *   3. (CSS — kiểm tra bằng mắt trên UI.)
 *   4. Mốc neo thời gian cho phiên đã kết thúc.
 */

// ─── 1. Khớp tầng ────────────────────────────────────────────────────────

const MAPPINGS = [
  {
    floorId: null,
    roomId: 1,
    floorNumber: 1,
    floorName: 'Tầng 1',
    masterId: 3,
    nodeAddress: 1,
    status: 'ACTIVE',
    totalRows: 4,
    totalColumns: 6,
  },
  {
    floorId: null,
    roomId: 1,
    floorNumber: 2,
    floorName: 'Tầng 2',
    masterId: 3,
    nodeAddress: 2,
    status: 'ACTIVE',
    totalRows: 4,
    totalColumns: 6,
  },
]

test('a floor without floor_id is matched by room_id + floor_number', () => {
  const mapping = matchFloorMapping(
    { floorId: null, roomId: 1, floorNumber: 2, floorName: null, masterId: null, nodeAddress: null },
    MAPPINGS,
  )
  assert.equal(mapping?.floorName, 'Tầng 2')
})

test('floor_id wins over the room + number fallback', () => {
  const mappings = [
    ...MAPPINGS,
    {
      floorId: 77,
      roomId: 9,
      floorNumber: 9,
      floorName: 'Tầng 77',
      masterId: null,
      nodeAddress: null,
      status: 'ACTIVE',
      totalRows: null,
      totalColumns: null,
    },
  ]
  const mapping = matchFloorMapping(
    { floorId: 77, roomId: 1, floorNumber: 2, floorName: 'Tầng 2', masterId: null, nodeAddress: null },
    mappings,
  )
  assert.equal(mapping?.floorId, 77)
})

test('a floor is matched by master_id + node_address when ids are missing', () => {
  const mapping = matchFloorMapping(
    { floorId: null, roomId: null, floorNumber: null, floorName: null, masterId: 3, nodeAddress: 1 },
    MAPPINGS,
  )
  assert.equal(mapping?.floorName, 'Tầng 1')
})

test('a floor is matched by exact floor name', () => {
  const mapping = matchFloorMapping(
    { floorId: null, roomId: null, floorNumber: null, floorName: 'Tầng 2', masterId: null, nodeAddress: null },
    MAPPINGS,
  )
  assert.equal(mapping?.floorNumber, 2)
})

// ─── 1b. Nhãn tầng hiển thị (floor_id ≠ floor_number) ──────────────────────

test('the floor label uses floor_number, not the database floor_id', () => {
  /*
   * ⚠ Kịch bản thật: tầng "Tầng 2" có `floor_id = 3` (SERIAL đánh số theo
   *   thứ tự tạo) ⇒ in trực tiếp `floor_id` sẽ hiện "Tầng 3" ⇒ sai.
   */
  const labels = buildFloorLabelMap([
    {
      floorId: 3,
      roomId: 1,
      floorNumber: 2,
      floorName: 'Tầng 2',
      masterId: null,
      nodeAddress: null,
      status: 'ACTIVE',
      totalRows: null,
      totalColumns: null,
    },
  ])
  assert.equal(labels.get(3), 'Tầng 2')
})

test('the floor label falls back to floor_id when floor_number is missing', () => {
  const labels = buildFloorLabelMap([
    {
      floorId: 5,
      roomId: null,
      floorNumber: null,
      floorName: null,
      masterId: null,
      nodeAddress: null,
      status: null,
      totalRows: null,
      totalColumns: null,
    },
  ])
  assert.equal(labels.get(5), 'Tầng 5')
})

test('the floor label map skips mappings without a floor_id', () => {
  const labels = buildFloorLabelMap([
    {
      floorId: null,
      roomId: 1,
      floorNumber: 2,
      floorName: 'Tầng 2',
      masterId: null,
      nodeAddress: null,
      status: null,
      totalRows: null,
      totalColumns: null,
    },
  ])
  assert.equal(labels.size, 0)
})

test('the floor label map can be rebuilt from the session tray keys', () => {
  const labels = buildFloorLabelMapFromKeys([
    { floorId: 3, roomId: 1, floorNumber: 2, floorName: null, masterId: null, nodeAddress: null },
  ])
  assert.equal(labels.get(3), 'Tầng 2')
})

test('the tray floor_number wins when the BE map has no floor_number', () => {
  /*
   * ⚠ BE map có `floor_id` nhưng thiếu `floor_number` (và tên tầng cũng lệch)
   *   ⇒ tầng của phiên (`trays[]`) bổ sung `floor_number` ⇒ nhãn đúng.
   */
  const labels = buildFloorLabelMap([
    {
      floorId: 3,
      roomId: 1,
      floorNumber: null,
      floorName: 'Tầng 3',
      masterId: null,
      nodeAddress: null,
      status: null,
      totalRows: null,
      totalColumns: null,
    },
    {
      floorId: 3,
      roomId: 1,
      floorNumber: 2,
      floorName: null,
      masterId: null,
      nodeAddress: null,
    },
  ])
  assert.equal(labels.get(3), 'Tầng 2')
})

test('the tray floor_number fills a BE map that omits floor_id entirely', () => {
  const labels = buildFloorLabelMap([
    {
      floorId: null,
      roomId: 1,
      floorNumber: 2,
      floorName: 'Tầng 2',
      masterId: null,
      nodeAddress: null,
      status: null,
      totalRows: null,
      totalColumns: null,
    },
    {
      floorId: 3,
      roomId: 1,
      floorNumber: 2,
      floorName: null,
      masterId: null,
      nodeAddress: null,
    },
  ])
  assert.equal(labels.get(3), 'Tầng 2')
})

test('a floor with neither number nor name falls back to its database id', () => {
  const labels = buildFloorLabelMap([
    {
      floorId: 9,
      roomId: null,
      floorNumber: null,
      floorName: null,
      masterId: null,
      nodeAddress: null,
    },
  ])
  assert.equal(labels.get(9), 'Tầng 9')
})

test('the floor name fallback never matches by substring', () => {
  const mappings = [
    {
      floorId: null,
      roomId: 1,
      floorNumber: 10,
      floorName: 'Tầng 10',
      masterId: null,
      nodeAddress: null,
      status: 'ACTIVE',
      totalRows: null,
      totalColumns: null,
    },
  ]
  const mapping = matchFloorMapping(
    { floorId: null, roomId: null, floorNumber: null, floorName: 'Tầng 1', masterId: null, nodeAddress: null },
    mappings,
  )
  assert.equal(mapping, null, '"Tầng 1" must not match "Tầng 10"')
})

test('filtering keeps only the session floors and preserves their order', () => {
  const keys = [
    toSessionFloorKey({ floor_id: null, room_id: 1, floor_number: 2, floor_name: 'Tầng 2' }),
    toSessionFloorKey({ floor_id: null, room_id: 1, floor_number: 1, floor_name: 'Tầng 1' }),
  ]
  const result = filterSessionFloorMappings(keys, MAPPINGS)
  assert.equal(result.length, 2)
  assert.deepEqual(result.map((item) => item.floorNumber), [2, 1])
})

test('no floor_id is collected when the BE omits the column', () => {
  assert.deepEqual(collectMappedFloorIds(MAPPINGS), [], 'room_id must never be used as floor_id')
})

test('floor ids are collected only from real floor_id values', () => {
  const ids = collectMappedFloorIds([
    { ...MAPPINGS[0], floorId: 5 },
    { ...MAPPINGS[1], floorId: 5 },
    { ...MAPPINGS[1], floorId: 8 },
  ])
  assert.deepEqual(ids, [5, 8])
})

// ─── 2. Nhiệt độ / độ ẩm từ sensor_values_json ──────────────────────────

test('aggregate columns win over the sensor snapshot', () => {
  const climate = extractDeviceClimate({
    event_id: 1,
    floor_id: 1,
    event_type: 'ON_REQUESTED',
    reason: null,
    created_at: '2026-11-07T10:00:00Z',
    command_id: null,
    average_temperature: 25,
    average_humidity: 82,
    sensor_values_json: JSON.stringify([
      { sensorId: 1, temperature: 99, humidity: 1, valid: true },
    ]),
  })
  assert.equal(climate.temperature, 25)
  assert.equal(climate.humidity, 82)
  assert.equal(climate.source, 'aggregate')
})

test('the sensor snapshot is used when the aggregate columns are missing', () => {
  const climate = extractDeviceClimate({
    event_id: 1,
    floor_id: 1,
    event_type: 'DECISION',
    reason: null,
    created_at: '2026-11-07T10:00:00Z',
    command_id: null,
    average_temperature: null,
    average_humidity: null,
    sensor_values_json: JSON.stringify([
      { sensorId: 1, temperature: 24, humidity: 80, valid: true },
      { sensorId: 2, temperature: 26, humidity: 84, valid: true },
    ]),
  })
  assert.equal(climate.temperature, 25)
  assert.equal(climate.humidity, 82)
  assert.equal(climate.source, 'snapshot')
})

test('invalid sensors are excluded from the snapshot average', () => {
  const climate = extractDeviceClimate({
    event_id: 1,
    floor_id: 1,
    event_type: 'DECISION',
    reason: null,
    created_at: '2026-11-07T10:00:00Z',
    command_id: null,
    average_temperature: null,
    average_humidity: null,
    sensor_values_json: JSON.stringify([
      { sensorId: 1, temperature: 24, humidity: 80, valid: true },
      { sensorId: 2, temperature: 90, humidity: 5, valid: false },
    ]),
  })
  assert.equal(climate.temperature, 24, 'a broken sensor must not pollute the average')
  assert.equal(climate.humidity, 80)
})

test('an already-parsed snapshot array is accepted', () => {
  const climate = extractDeviceClimate({
    event_id: 1,
    floor_id: 1,
    event_type: 'DECISION',
    reason: null,
    created_at: '2026-11-07T10:00:00Z',
    command_id: null,
    average_temperature: null,
    average_humidity: null,
    sensor_values_json: [{ sensorId: 1, temperature: 21, humidity: 70 }],
  })
  assert.equal(climate.temperature, 21)
  assert.equal(climate.humidity, 70)
  assert.equal(climate.source, 'snapshot')
})

test('a broken snapshot string does not crash and yields no data', () => {
  const climate = extractDeviceClimate({
    event_id: 1,
    floor_id: 1,
    event_type: 'DECISION',
    reason: null,
    created_at: '2026-11-07T10:00:00Z',
    command_id: null,
    average_temperature: null,
    average_humidity: null,
    sensor_values_json: '{not-json',
  })
  assert.equal(climate.temperature, null)
  assert.equal(climate.humidity, null)
  assert.equal(climate.source, 'none')
})

// ─── 4. Mốc neo cho phiên đã kết thúc ───────────────────────────────────

test('a running session keeps using the current time as anchor', () => {
  const anchor = resolveSessionChartAnchor({
    sessionEnded: false,
    sessionEnd: '2026-11-07T22:00:00Z',
    latestRecord: { period_end: '2026-11-07T20:00:00Z' },
  })
  assert.equal(anchor, null)
})

test('a finished session anchors on the latest record', () => {
  const anchor = resolveSessionChartAnchor({
    sessionEnded: true,
    sessionEnd: '2026-11-07T23:00:00Z',
    latestRecord: {
      period_end: '2026-11-07T20:10:00Z',
      period_start: '2026-11-07T20:00:00Z',
    },
  })
  assert.equal(anchor, Date.parse('2026-11-07T20:10:00Z'))
})

test('a finished session without records falls back to the session end date', () => {
  const anchor = resolveSessionChartAnchor({
    sessionEnded: true,
    sessionEnd: '2026-11-07T23:00:00Z',
    latestRecord: null,
  })
  assert.equal(anchor, Date.parse('2026-11-07T23:00:00Z'))
})

test('the window of a finished session is anchored on its end, not on now', () => {
  const now = new Date('2026-11-20T10:07:00Z')
  const anchor = Date.parse('2026-11-07T20:10:00Z')

  const anchored = resolveTimeRangeWindow('6h', now, anchor)
  const floating = resolveTimeRangeWindow('6h', now)

  assert.equal(anchored.end, Math.floor(anchor / (10 * 60_000)) * (10 * 60_000))
  assert.notEqual(anchored.end, floating.end, 'the anchor must move the window')
  assert.equal(anchored.end - anchored.start, 6 * 60 * 60 * 1000)
})

test('the axis of a finished session matches the anchored window', () => {
  const now = new Date('2026-11-20T10:07:00Z')
  const anchor = Date.parse('2026-11-07T20:10:00Z')

  const { start, end } = resolveTimeRangeWindow('6h', now, anchor)
  const ticks = buildAxisTicks('6h', now, anchor)
  const [min, max] = resolveAxisDomain('6h', now, anchor)

  assert.equal(ticks[0], start)
  assert.equal(ticks[4], end)
  assert.ok(min < start && max > end)
  for (const tick of ticks) {
    assert.ok(tick > min && tick < max)
  }
})
