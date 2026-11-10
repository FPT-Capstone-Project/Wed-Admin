import test from 'node:test'
import assert from 'node:assert/strict'
import {
  deriveOrderStatus,
  deriveSessionStatus,
  pickRepresentativeSession,
} from '../src/features/orders/utils/derive-order-status.ts'

/** Tạo 1 phiên rút gọn (chỉ cần các field mà util dùng). */
const session = (sessionId, orderId, status) => ({
  session_id: sessionId,
  order_item_id: null,
  order_id: orderId,
  user_id: 1,
  customer_name: 'Khách',
  customer_email: 'khach@example.com',
  mushroom_type_id: null,
  mushroom_name: 'Nấm',
  package_id: null,
  package_name: 'Gói',
  tray_quantity: 1,
  spawn_quantity: 3,
  start_at: null,
  end_at: null,
  duration_days: null,
  created_at: null,
  updated_at: null,
  harvest_date: null,
  status,
})

test('an order stuck in PROCESSING becomes COMPLETED when all sessions are done', () => {
  const sessions = [session(1, 10, 'COMPLETED'), session(2, 10, 'COMPLETED')]

  const result = deriveOrderStatus('PROCESSING', sessions, true)

  assert.equal(result, 'COMPLETED')
})

test('an order stays PROCESSING while one session is still running', () => {
  const sessions = [session(1, 10, 'COMPLETED'), session(2, 10, 'CULTIVATING')]

  const result = deriveOrderStatus('PROCESSING', sessions, true)

  assert.equal(result, 'PROCESSING')
})

test('a terminal backend status always wins', () => {
  const sessions = [session(1, 10, 'COMPLETED')]

  assert.equal(deriveOrderStatus('COMPLETED', sessions, true), 'COMPLETED')
  assert.equal(deriveOrderStatus('CANCELLED', sessions, true), 'CANCELLED')
})

test('no conclusion is drawn when the session list may be incomplete', () => {
  const sessions = [session(1, 10, 'COMPLETED')]

  // `sessionsComplete = false` ⇒ có thể còn phiên chưa tải ⇒ giữ trạng thái BE.
  const result = deriveOrderStatus('PROCESSING', sessions, false)

  assert.equal(result, 'PROCESSING')
})

test('an order without sessions keeps the backend status', () => {
  assert.equal(deriveOrderStatus('PROCESSING', [], true), 'PROCESSING')
  assert.equal(deriveOrderStatus('PENDING', [], true), 'PENDING')
})

test('an order whose sessions are all cancelled becomes CANCELLED', () => {
  const sessions = [session(1, 10, 'CANCELLED'), session(2, 10, 'CANCELLED')]

  const result = deriveOrderStatus('PROCESSING', sessions, true)

  assert.equal(result, 'CANCELLED')
})

test('the representative session is the furthest-progress running one', () => {
  const sessions = [
    session(1, 10, 'SPAWN_RESTING'),
    session(2, 10, 'HARVESTING'),
    session(3, 10, 'CULTIVATING'),
  ]

  const representative = pickRepresentativeSession(sessions)

  assert.equal(representative?.session_id, 2)
  assert.equal(deriveSessionStatus(sessions), 'HARVESTING')
})

test('a completed session is preferred once every session is closed', () => {
  const sessions = [session(1, 10, 'CANCELLED'), session(2, 10, 'COMPLETED')]

  const representative = pickRepresentativeSession(sessions)

  assert.equal(representative?.session_id, 2)
  assert.equal(deriveSessionStatus(sessions), 'COMPLETED')
})

test('no representative session for an order without sessions', () => {
  assert.equal(pickRepresentativeSession([]), null)
  assert.equal(deriveSessionStatus([]), null)
})
