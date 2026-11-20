import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

async function load(file) {
  const path = resolve(file)
  let source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
  for (const match of [...source.matchAll(/from ['"](\.[^'"]+)['"]/g)]) {
    const dependency = resolve(dirname(path), match[1].endsWith('.ts') ? match[1] : `${match[1]}.ts`)
    source = source.replace(match[0], `from '${await load(dependency)}'`)
  }
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
}
const root = fileURLToPath(new URL('../src/', import.meta.url))
const { buildPaidOrderRevenue } = await import(await load(resolve(root, 'features/analytics/utils/paid-order-revenue.utils.ts')))
const { buildSpeciesPerformance } = await import(await load(resolve(root, 'features/analytics/utils/species-performance.utils.ts')))
const { buildOrderRevenue, buildVarietyPerformance, computeExecutiveKpis } = await import(await load(resolve(root, 'features/analytics/utils/executive-report.utils.ts')))
const { continuousRevenuePeriods } = await import(await load(resolve(root, 'pages/reports/report-format.ts')))
const order = (id, amount, name, date, payment_status = 'PAID') => ({
  order_id: id, total_amount: amount, mushroom_name: name, created_at: date, payment_status,
})

test('paid orders reconcile KPI, all time granularities, donut and table to 7,205,000', () => {
  const orders = [
    order(1, '1700000', 'Nấm sò', '2026-10-31T18:00:00Z'),
    order(2, '3000000', null, '2026-11-20'),
    order(3, '2500000', 'Nấm sò, Nấm mỡ', '2026-12-01'),
    order(4, '5000', 'Nấm mỡ', null),
    order(5, '9000000', 'Nấm sò', '2026-11-20', 'UNPAID'),
  ]
  const result = buildPaidOrderRevenue([...orders, orders[0]])
  assert.equal(result.total, 7205000)
  assert.equal(result.species.find(row => row.species === 'Khác').revenue, 5500000)
  const rows = buildVarietyPerformance(result.species.map(row => ({ ...row, sessionCount: 0 })))
  assert.equal(rows.reduce((sum, row) => sum + row.currentRevenue, 0), result.total)
  assert.equal(computeExecutiveKpis({ totalRevenue: result.total, trays: {} }).totalRevenue, result.total)
  for (const granularity of ['WEEKLY', 'MONTHLY', 'QUARTERLY']) {
    const points = continuousRevenuePeriods(buildOrderRevenue(result.events, granularity), granularity, new Date('2026-11-20'))
    assert.equal(points.reduce((sum, row) => sum + row.current, 0), result.total)
    assert.equal(points.find(row => row.month === 'UNKNOWN').current, 5000)
  }
  assert.equal(buildOrderRevenue(result.events, 'MONTHLY').find(row => row.month === '2026-11').current, 4700000)
})

test('missing and invalid paid amounts fail instead of silently understating revenue', () => {
  for (const amount of [null, '', 'invalid', '-1']) {
    assert.throws(() => buildPaidOrderRevenue([order(1, amount, null, null)]))
  }
  assert.deepEqual(buildPaidOrderRevenue([]), { total: 0, events: [], species: [] })
})

test('species counts include completed and active sessions; success uses only closed sessions', () => {
  const sessions = [
    { session_id: 17, mushroom_name: 'Nấm Hoàng Kim', status: 'COMPLETED' },
    { session_id: 28, mushroom_name: ' nấm hoàng kim ', status: 'CULTIVATING' },
    { session_id: 29, mushroom_name: 'Nấm Hoàng Kim', status: 'CANCELLED' },
    { session_id: 30, mushroom_name: 'Nấm Sò', status: 'CULTIVATING' },
  ]
  const rows = buildSpeciesPerformance([
    { species: 'Nấm Hoàng Kim', revenue: 340000 }, { species: 'Khác', revenue: 20000 },
  ], [...sessions, sessions[0], { session_id: 0, status: 'COMPLETED' }])
  const golden = rows.find(row => row.species === 'Nấm Hoàng Kim')
  assert.equal(golden.sessionCount, 3)
  assert.equal(golden.successRate, 50)
  assert.equal(golden.revenue, 340000)
  const performance = buildVarietyPerformance(rows)
  assert.equal(performance.find(row => row.varietyName === 'Khác').traysRented, null)
  assert.equal(performance.find(row => row.varietyName === 'Nấm Sò').successRate, null)
  assert.equal(rows.reduce((sum, row) => sum + row.sessionCount, 0), 4)
  assert.equal(rows.reduce((sum, row) => sum + row.revenue, 0), 360000)
  const completedOnly = buildSpeciesPerformance([], [sessions[0]])
  assert.equal(completedOnly[0].successRate, 100)
})
