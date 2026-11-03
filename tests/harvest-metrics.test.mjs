import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateHarvestMetrics } from '../src/features/harvest/api/harvest-metrics.ts'
const row = (overrides = {}) => ({ total_weight_kg: null, usable_weight_kg: null, quality_grade: null, status: 'PLANNED', harvest_request_status: 'PENDING', ...overrides })
test('uses decimal strings from PostgreSQL and weights grade A/B by mass', () => {
  const result = calculateHarvestMetrics([
    row({ total_weight_kg: '10.5', usable_weight_kg: '9', quality_grade: 'A' }),
    row({ total_weight_kg: '9.5', usable_weight_kg: '8', quality_grade: 'B' }),
    row({ total_weight_kg: '5', usable_weight_kg: '4', quality_grade: 'C' }),
  ])
  assert.equal(result.totalWeightKg, 25)
  assert.equal(result.gradeABPercent, 68)
})
test('missing yield is unknown, zero yield has no percentage', () => {
  assert.equal(calculateHarvestMetrics([row()]).totalWeightKg, null)
  assert.equal(calculateHarvestMetrics([row({ total_weight_kg: '0' })]).gradeABPercent, null)
  assert.equal(calculateHarvestMetrics([]).totalWeightKg, 0)
})
test('pending handover requires completed harvest and an open receiving request', () => {
  const result = calculateHarvestMetrics([
    row({ status: 'COMPLETED', harvest_request_status: 'PENDING' }),
    row({ status: 'COMPLETED', harvest_request_status: 'CONFIRMED' }),
    row({ status: 'COMPLETED', harvest_request_status: 'SCHEDULED' }),
    row({ status: 'COMPLETED', harvest_request_status: 'COMPLETED' }),
    row({ status: 'COMPLETED', harvest_request_status: null }),
    row({ status: 'COMPLETED', harvest_request_status: 'CANCELLED' }),
    row({ status: 'IN_PROGRESS', harvest_request_status: 'CONFIRMED' }),
  ])
  assert.equal(result.pendingHandover, 3)
})
