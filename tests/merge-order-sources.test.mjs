import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeOrderSources } from '../src/features/orders/utils/merge-order-sources.ts'

const session = (sessionId, orderId, status) => ({
  session_id: sessionId,
  order_item_id: null,
  order_id: orderId,
  user_id: 7,
  customer_name: 'Khách A',
  customer_email: 'a@example.com',
  mushroom_type_id: null,
  mushroom_name: 'Nấm rơi',
  package_id: null,
  package_name: 'Gói 30 ngày',
  tray_quantity: 2,
  spawn_quantity: 6,
  start_at: null,
  end_at: null,
  duration_days: null,
  created_at: null,
  updated_at: null,
  harvest_date: null,
  status,
})

const order = (orderId, status) => ({
  order_id: orderId,
  customer_id: 7,
  customer_name: 'Khách A',
  customer_email: 'a@example.com',
  package_name: 'Gói 30 ngày',
  mushroom_name: 'Nấm rơi',
  quantity: 2,
  total_price: '100000',
  subtotal: '100000',
  discount: '0',
  shipping_fee: '0',
  total_amount: '100000',
  status,
  payment_status: 'PAID',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: null,
})

test('an order stuck in PROCESSING is derived as COMPLETED when all sessions are done', () => {
  const rows = mergeOrderSources(
    [order(10, 'PROCESSING')],
    [session(1, 10, 'COMPLETED'), session(2, 10, 'COMPLETED')],
    [],
    true,
  )

  assert.equal(rows.length, 1)
  assert.equal(rows[0].status, 'COMPLETED')
  assert.equal(rows[0].statusDerived, true)
})

test('a running session keeps the backend PROCESSING status', () => {
  const rows = mergeOrderSources(
    [order(10, 'PROCESSING')],
    [session(1, 10, 'COMPLETED'), session(2, 10, 'CULTIVATING')],
    [],
    true,
  )

  assert.equal(rows[0].status, 'PROCESSING')
  assert.equal(rows[0].statusDerived, false)
})

test('the representative session drives the session column', () => {
  const rows = mergeOrderSources(
    [order(10, 'PROCESSING')],
    [session(1, 10, 'SPAWN_RESTING'), session(2, 10, 'HARVESTING')],
    [],
    true,
  )

  assert.equal(rows[0].sessionId, 2)
  assert.equal(rows[0].sessionStatus, 'HARVESTING')
})

test('an incomplete session list never derives COMPLETED', () => {
  const rows = mergeOrderSources(
    [order(10, 'PROCESSING')],
    [session(1, 10, 'COMPLETED')],
    [],
    false,
  )

  assert.equal(rows[0].status, 'PROCESSING')
  assert.equal(rows[0].statusDerived, false)
})

test('orders without any session keep the backend status', () => {
  const rows = mergeOrderSources([order(10, 'CONFIRMED')], [], [], true)

  assert.equal(rows[0].status, 'CONFIRMED')
  assert.equal(rows[0].sessionStatus, null)
  assert.equal(rows[0].statusDerived, false)
})

test('orders without an order source derive their status from the session', () => {
  const rows = mergeOrderSources([], [session(9, 55, 'COMPLETED')], [], true)

  assert.equal(rows.length, 1)
  assert.equal(rows[0].status, 'COMPLETED')
  assert.equal(rows[0].sources.includes('session'), true)
})
