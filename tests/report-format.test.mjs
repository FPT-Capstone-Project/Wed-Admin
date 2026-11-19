import test from 'node:test'
import assert from 'node:assert/strict'
import { formatReportMoney, formatReportPercent, formatReportWeight, formatReportMillions, formatReportPeriod, niceRevenueTicks, reportFileDate } from '../src/pages/reports/report-format.ts'

test('report decimals use points while integer VND keeps Vietnamese grouping', () => {
  assert.equal(formatReportMoney(6770000), '6.770.000 ₫')
  assert.equal(formatReportPercent(11.11), '11.1%')
  assert.equal(formatReportPercent(3.33), '3.3%')
  assert.equal(formatReportWeight(38.1), '38.1 kg')
  assert.equal(formatReportMillions(1300000), '1.3 Tr đ')
  assert.equal(formatReportMillions(300000), '0.3 Tr đ')
})
test('period labels handle ISO week year boundaries and Vietnam file dates', () => {
  assert.equal(formatReportPeriod('2026-10'), 'T10/2026')
  assert.equal(formatReportPeriod('2026-Q4'), 'Q4/2026')
  assert.equal(formatReportPeriod('2026-10-19'), 'Tuần 43/2026')
  assert.equal(formatReportPeriod('2025-12-29'), 'Tuần 1/2026')
  assert.equal(reportFileDate(new Date('2026-11-18T18:00:00Z')), '2026-11-19')
})
test('nice ticks cover the maximum with uniform intervals', () => {
  assert.deepEqual(niceRevenueTicks(1600000), [0, 400000, 800000, 1200000, 1600000])
  for (const max of [0, 1, 300000, 1300000, 6770000, 1e12]) {
    const ticks = niceRevenueTicks(max)
    assert.ok(ticks.at(-1) >= max)
    for (let i = 1; i < ticks.length; i++) assert.equal(ticks[i] - ticks[i - 1], ticks[1])
  }
})
