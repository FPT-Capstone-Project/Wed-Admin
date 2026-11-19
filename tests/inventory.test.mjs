import test from 'node:test'
import assert from 'node:assert/strict'
import { stockLevel, sumQuantities, mapInventory, mapExport, isEmptyStock, collectSummaryPages, formatQuantity } from '../src/features/inventory/utils/inventory.utils.ts'

test('stock thresholds include zero, negatives, exact boundary and decimal edge', () => {
  for (const [quantity, tone] of [['-1', 'danger'], ['0', 'danger'], ['0.001', 'warning'], ['20.00', 'warning'], ['20.000000000000000001', 'success']]) assert.equal(stockLevel(quantity).tone, tone)
  assert.equal(isEmptyStock('0.00'), true)
  assert.equal(isEmptyStock('-1'), false)
})
test('decimal sum remains exact beyond JS precision and across scales', () => {
  assert.equal(sumQuantities(['0.1', '0.2']), '0.3')
  assert.equal(sumQuantities(['9007199254740993.123456789', '0.000000001']), '9007199254740993.12345679')
  assert.equal(sumQuantities(['-0.5', '0.25']), '-0.25')
  assert.equal(sumQuantities([]), '0')
  assert.equal(formatQuantity('1234.56'), '1234.56')
})
test('inventory mapper preserves decimal quantity and guards missing data and epoch dates', () => {
  const row = mapInventory({ inventory_id: 1, mushroom_type_id: 2, quantity: '0.00', updated_at: '1970-01-01' })
  assert.equal(row.quantity, '0.00')
  assert.equal(row.updated_at, null)
  assert.equal(row.mushroom_name, 'Chưa có tên giống nấm')
  assert.throws(() => mapInventory({ inventory_id: 1, mushroom_type_id: 2, quantity: 'NaN' }))
  assert.throws(() => mapInventory({ quantity: '1' }))
})
test('export mapper preserves balances and nullable session and notes', () => {
  const row = mapExport({ transaction_id: 1, inventory_id: 2, mushroom_type_id: 3, quantity: '0.1', quantity_before: '0.3', quantity_after: '0.2' })
  assert.equal(row.quantity_after, '0.2')
  assert.equal(row.session_id, null)
  assert.equal(row.notes, null)
})
const page = (current, totalPages, total, data) => ({ data, pagination: { page: current, totalPages, total } })
test('summary collects every page independently of visible page', async () => {
  const calls = []
  const rows = await collectSummaryPages(async current => {
    calls.push(current)
    return page(current, 3, 3, [String(current)])
  })
  assert.deepEqual(calls, [1, 2, 3])
  assert.deepEqual(rows, ['1', '2', '3'])
})
test('summary refuses totals above page cap without fetching more pages', async () => {
  let calls = 0
  await assert.rejects(collectSummaryPages(async () => { calls++; return page(1, 11, 1100, []) }))
  assert.equal(calls, 1)
})
test('summary accepts exactly ten pages and an empty inventory', async () => {
  assert.equal((await collectSummaryPages(async current => page(current, 10, 10, [current]))).length, 10)
  assert.deepEqual(await collectSummaryPages(async () => page(1, 0, 0, [])), [])
})
test('summary rejects page errors, truncated rows and unstable pagination', async () => {
  await assert.rejects(collectSummaryPages(async current => { if (current === 2) throw new Error('network'); return page(1, 2, 2, ['1']) }))
  await assert.rejects(collectSummaryPages(async () => page(1, 1, 100, ['1'])))
  await assert.rejects(collectSummaryPages(async current => page(current, current === 1 ? 2 : 3, 2, ['1'])))
  await assert.rejects(collectSummaryPages(async () => page(1, 1, 101, Array(101).fill('1'))))
})
