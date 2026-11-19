import test from 'node:test'
import assert from 'node:assert/strict'
import { formatDecimal } from '../src/shared/utils/number-format.ts'
import { formatVND, formatCompactVND } from '../src/shared/utils/currency.ts'
import { formatDashboardPercent } from '../src/features/dashboard/utils/dashboard-format.ts'
import { auditDate, auditWeight } from '../src/shared/ui/audit-format.ts'
import { formatQuantity } from '../src/features/inventory/utils/inventory.utils.ts'

test('measurements and percentages use decimal points, with existing precision', () => {
  assert.equal(formatDecimal(35.6), '35.6')
  assert.equal(formatDecimal(40), '40.0')
  assert.equal(formatDecimal(11.1), '11.1')
  assert.equal(formatDashboardPercent(97.1), '97.1%')
  assert.equal(formatDashboardPercent(2.9), '2.9%')
  assert.equal(auditWeight('1.5'), '1.5')
  assert.equal(formatDecimal(1234.56, 2), '1234.56')
  assert.equal(formatDecimal(null), '—')
  assert.equal(formatDecimal(NaN), '—')
})
test('integer VND grouping remains Vietnamese and compact VND decimals use points', () => {
  assert.equal(formatVND(6770000).replace(/\s/g, ' '), '6.770.000 ₫')
  assert.match(formatCompactVND(1400000), /1\.4/)
  assert.equal(formatCompactVND(null), '—')
})
test('stock decimal strings retain all digits, including beyond number precision', () => {
  assert.equal(formatQuantity('1234.567890123456789'), '1234.567890123456789')
  assert.equal(formatQuantity('1234'), '1.234')
  assert.equal(formatQuantity('0.00'), '0.00')
})
test('Vietnam dates are not reformatted as numbers', () => {
  assert.ok(auditDate('2026-11-18T18:00:00Z').includes('19/11/2026'))
})
