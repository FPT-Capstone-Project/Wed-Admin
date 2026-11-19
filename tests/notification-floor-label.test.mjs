import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyFloorLabelsToNotification,
  applyFloorLabelsToResult,
  buildFloorLabelLookup,
  formatFloorLabel,
  replaceFloorIdReferences,
} from '../src/features/notifications/utils/floor-label.utils.ts'

const floors = [
  { floor_id: 3, room_id: 1, floor_number: 2, floor_name: 'Tầng 2', master_id: 1, node_address: 1, misting_ssr_channel: 1 },
  { floor_id: 5, room_id: 1, floor_number: 4, floor_name: 'Tầng 4', master_id: 1, node_address: 2, misting_ssr_channel: 2 },
]

test('floor label prefers the real floor number over the technical id', () => {
  assert.equal(formatFloorLabel(floors[0]), 'Tầng 2')
})

test('lookup maps floor_id to the real floor name', () => {
  const lookup = buildFloorLabelLookup(floors)
  assert.equal(lookup.get(3), 'Tầng 2')
  assert.equal(lookup.get(5), 'Tầng 4')
  assert.equal(lookup.has(99), false)
})

test('lookup is empty when the floors list is missing', () => {
  assert.equal(buildFloorLabelLookup(undefined).size, 0)
  assert.equal(buildFloorLabelLookup(null).size, 0)
  assert.equal(buildFloorLabelLookup([]).size, 0)
})

test('lookup ignores floors without a valid floor_id', () => {
  const lookup = buildFloorLabelLookup([
    { floor_id: 0, room_id: 1, floor_number: 1, floor_name: 'A', master_id: 1, node_address: 1, misting_ssr_channel: 1 },
    { floor_id: Number.NaN, room_id: 1, floor_number: 1, floor_name: 'A', master_id: 1, node_address: 1, misting_ssr_channel: 1 },
  ])
  assert.equal(lookup.size, 0)
})

test('floor id references are replaced by the real floor name', () => {
  const lookup = buildFloorLabelLookup(floors)
  assert.equal(
    replaceFloorIdReferences('Cảm biến X của tầng ID 3 nhiệt độ cao', lookup),
    'Cảm biến X của Tầng 2 nhiệt độ cao',
  )
  assert.equal(
    replaceFloorIdReferences('Node Y của tầng ID 5 mất kết nối', lookup),
    'Node Y của Tầng 4 mất kết nối',
  )
})

test('unknown floor ids keep the original text', () => {
  const lookup = buildFloorLabelLookup(floors)
  assert.equal(
    replaceFloorIdReferences('Cảm biến X của tầng ID 42 lỗi', lookup),
    'Cảm biến X của tầng ID 42 lỗi',
  )
})

test('text without floor references is untouched', () => {
  const lookup = buildFloorLabelLookup(floors)
  assert.equal(
    replaceFloorIdReferences('Yêu cầu chẩn đoán bệnh nấm mới', lookup),
    'Yêu cầu chẩn đoán bệnh nấm mới',
  )
})

test('an empty lookup never rewrites the text', () => {
  assert.equal(
    replaceFloorIdReferences('Cảm biến X của tầng ID 3', new Map()),
    'Cảm biến X của tầng ID 3',
  )
})

test('notification title and message are both normalized', () => {
  const lookup = buildFloorLabelLookup(floors)
  const notification = {
    notification_id: 1,
    notification_type: 'DEVICE_ISSUE',
    title: 'Cảm biến X của tầng ID 3',
    message: 'Node Y của tầng ID 5 lỗi',
    is_read: false,
    created_at: null,
    read_at: null,
    reference_type: null,
    reference_id: null,
  }
  const result = applyFloorLabelsToNotification(notification, lookup)
  assert.equal(result.title, 'Cảm biến X của Tầng 2')
  assert.equal(result.message, 'Node Y của Tầng 4 lỗi')
  // Không mutate bản ghi gốc.
  assert.equal(notification.title, 'Cảm biến X của tầng ID 3')
})

test('the whole notification list is normalized', () => {
  const lookup = buildFloorLabelLookup(floors)
  const result = applyFloorLabelsToResult(
    {
      items: [
        {
          notification_id: 1,
          notification_type: 'DEVICE_ISSUE',
          title: 'tầng ID 3',
          message: null,
          is_read: false,
          created_at: null,
          read_at: null,
          reference_type: null,
          reference_id: null,
        },
      ],
      pagination: null,
      unreadCount: 1,
    },
    lookup,
  )
  assert.equal(result.items[0].title, 'Tầng 2')
  assert.equal(result.unreadCount, 1)
})
