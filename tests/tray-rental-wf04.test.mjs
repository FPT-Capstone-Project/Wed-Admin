import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { resolveSessionProgress } from '../src/features/sessions/utils/session-progress.utils.ts'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../src/features/rooms/utils/tray-rental.utils.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const exports = {}
runInNewContext(code, { exports, require: id => id.includes('session-progress') ? { resolveSessionProgress } : {}, Date, Intl })
const { calculateRentalLifecycle, rentalDayLabel, differenceInCalendarDays, formatRentalDate, OVERDUE_HARVEST_GUIDANCE } = exports
const rental = {
  durationDays: 5, startDate: '2026-11-01', packageEndDate: '2026-11-06',
  expectedHarvestDate: '2026-11-06', basePrice: 100000, harvestStatus: 'GROWING', progressPercent: 42,
}

test('five-day rental uses consistent denominators and caps the displayed day', () => {
  const lifecycle = calculateRentalLifecycle(rental, new Date('2026-11-06T00:00:00+07:00'))
  assert.equal(lifecycle.packageDurationDays, 5)
  assert.equal(lifecycle.expectedHarvestDay, 5)
  assert.equal(rentalDayLabel(lifecycle), 'Ngày 5/5')
  assert.equal(lifecycle.effectiveHarvestStatus, 'READY_TO_HARVEST')
  assert.equal(lifecycle.progressPercent, 42)
})
test('overdue rental shows explicit elapsed overdue days rather than an overflowing fraction', () => {
  const lifecycle = calculateRentalLifecycle(rental, new Date('2026-11-07T00:00:00+07:00'))
  assert.equal(rentalDayLabel(lifecycle), 'Đã quá hạn 1 ngày')
  assert.equal(lifecycle.effectiveHarvestStatus, 'OVERDUE')
  assert.equal(Object.keys(lifecycle).some(key => /fee|amount/i.test(key)), false)
  assert.ok(OVERDUE_HARVEST_GUIDANCE.includes('Farm OP chủ động thu hoạch theo quy định và giải phóng khay.'))
})
test('harvest deadline and rental package end are independent calendar dates', () => {
  const lifecycle = calculateRentalLifecycle({ ...rental, expectedHarvestDate: '2026-11-04' }, new Date('2026-11-05T00:00:00+07:00'))
  assert.equal(lifecycle.overdueDays, 1)
  assert.equal(lifecycle.packageOverdueDays, 0)
  assert.equal(rentalDayLabel(lifecycle), 'Ngày 5/5')
})
test('Vietnam midnight date calculations are independent of the execution host timezone', () => {
  assert.equal(differenceInCalendarDays('2026-11-06T17:00:00Z', '2026-11-01'), 6)
  assert.equal(formatRentalDate('2026-11-06T17:00:00Z'), '07/11/2026')
})
test('already harvested sessions do not return to an active overdue status', () => {
  const lifecycle = calculateRentalLifecycle({ ...rental, harvestStatus: 'AUTO_HARVESTED' }, new Date('2026-11-20'))
  assert.equal(lifecycle.effectiveHarvestStatus, 'AUTO_HARVESTED')
  assert.equal(lifecycle.isHarvestReady, false)
})
