// Standalone browser check; fixture data exists only in this test.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
const require = createRequire(import.meta.url)
let playwright
try { playwright = require('playwright') } catch {
  playwright = require('C:/Users/Dell/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright')
}
await mkdir('reports-check', { recursive: true })
const fixture = {
  revenueIncomplete: false, totalRooms: 2, activeRooms: 2, totalFloors: 4,
  trays: { total: 18, occupied: 2, available: 16, maintenance: 0, occupancyRate: 11.1 },
  devices: { total: 2, online: 2, offline: 0, onlineRate: 100 },
  totalSessions: 2, sessionsByStage: { CULTIVATING: 2 },
  speciesBreakdown: [{ species: 'Nấm sò (fixture)', sessionCount: 1, estimatedRevenue: 1300000 }, { species: 'Nấm mỡ (fixture)', sessionCount: 1, estimatedRevenue: 300000 }],
  monthlyRevenue: [], revenueEvents: [{ date: '2026-10-19T03:00:00Z', amount: 1300000 }, { date: '2026-11-02T03:00:00Z', amount: 300000 }],
  totalRevenue: 6770000, totalHarvestWeightKg: 40, usableHarvestWeightKg: 38.1,
  rejectedHarvestWeightKg: 1.9, usableRate: 95.3, wasteRate: 3.3, traysUsed: 36,
}
const browser = await playwright.chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } })
  const errors = []
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message) })
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.startsWith('/api/')) {
      assert.equal(route.request().method(), 'GET', 'Read-only API requests only')
      const pagination = { page: 1, pageSize: 100, total: 2, totalPages: 1 }
      const responses = {
        '/api/users/me': { user: { user_id: 1, role_id: 1, full_name: 'Người kiểm thử PDF', email: 'report-test@example.test', status: 'ACTIVE' } },
        '/api/analytics/dashboard': { data: { revenue: { value: 6770000, currency: 'VND' }, trays_used: 36, harvest_quality: { usable_rate: 95.3, waste_rate: 3.3 } } },
        '/api/farm/sessions': { data: fixture.revenueEvents.map((event, i) => ({ session_id: i + 1, package_id: i + 1, mushroom_name: fixture.speciesBreakdown[i].species, status: 'CULTIVATING', start_date: event.date })), pagination },
        '/api/rental-packages': { data: fixture.speciesBreakdown.map((row, i) => ({ package_id: i + 1, package_name: `Gói ${i + 1}`, price: String(row.estimatedRevenue), duration_days: 30 })) },
        '/api/orders/admin': { data: [], pagination },
        '/api/cultivation-rooms': { data: [] },
        '/api/cultivation-trays': { data: Array.from({ length: 18 }, (_, i) => ({ tray_id: i + 1, status: i < 2 ? 'OCCUPIED' : 'AVAILABLE' })) },
        '/api/iot/floors': { data: [] }, '/api/iot/masters': { data: [] },
        '/api/harvests/admin': { data: [{ status: 'COMPLETED', total_weight_kg: '40', usable_weight_kg: '38.1', rejected_weight_kg: '1.9' }] },
      }
      return route.fulfill({ json: responses[url.pathname] ?? { data: [], pagination, unread_count: 0 } })
    }
    return route.continue()
  })
  await page.addInitScript(() => {
    localStorage.setItem('mcms-access-token', 'pdf-test-only-not-a-real-token')
    localStorage.setItem('mcms-user-cache', JSON.stringify({ id: 1, roleId: 1, role: 'ADMIN', fullName: 'Người kiểm thử PDF', permissions: [] }))
  })
  await page.goto('http://localhost:5173/reports')
  await page.locator('.reports-page').waitFor()
  assert.equal(await page.locator('.mcms-header').isVisible(), true)
  assert.equal(await page.locator('.mcms-sider').isVisible(), true)
  await page.screenshot({ path: 'reports-check/full-layout-screen.png', fullPage: true })
  await page.getByText('Tuần', { exact: true }).click()
  await page.waitForTimeout(800)
  await page.emulateMedia({ media: 'print' })
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')))
  await page.waitForTimeout(800)
  assert.equal(await page.locator('.reports-print-heading').isVisible(), true)
  assert.equal(await page.locator('.reports-operations').isVisible(), false)
  assert.equal(await page.locator('.mcms-stat-card:visible').count(), 4)
  assert.equal(await page.locator('.reports-export-actions').isVisible(), false)
  assert.equal(await page.locator('.mcms-header').isVisible(), false)
  assert.equal(await page.locator('.mcms-sider').isVisible(), false)
  assert.equal(await page.locator('.recharts-xAxis .recharts-cartesian-axis-tick').count(), 5)
  await page.pdf({ path: 'reports-check/fixture-report.pdf', format: 'A4', landscape: true, printBackground: true, preferCSSPageSize: true })
  await page.screenshot({ path: 'reports-check/fixture-print.png', fullPage: true })
  assert.deepEqual(errors, [])
  const { PDFDocument } = require('../../../reports-check/pdf-tools-node/node_modules/pdf-lib')
  const pdfDocument = await PDFDocument.load(await readFile('reports-check/fixture-report.pdf'))
  assert.ok(pdfDocument.getPageCount() <= 2, `Too many pages: ${pdfDocument.getPageCount()}`)
  const pdfCheck = execFileSync('python', ['-c', `
import sys
sys.path.insert(0, 'reports-check/pdf-tools')
import pymupdf
pdf = pymupdf.open('reports-check/fixture-report.pdf')
assert len(pdf) <= 2, f'Expected at most 2 pages, got {len(pdf)}'
first = pdf[0].get_text()
assert '6.770.000' in first and '1.600.000' in first
assert '\\u0042\\u00e1o c\\u00e1o \\u0111i\\u1ec1u h\\u00e0nh MCMS' in first
assert 'T10/' not in first
assert '43/2026' in first and '47/2026' in first
assert '6.770.000' in first and '11.1%' in first and '38.1 kg' in first and '3.3%' in first
assert 'PDF' in first
assert all(len(page.get_text().strip()) > 50 for page in pdf)
for i, page in enumerate(pdf):
    page.get_pixmap(matrix=pymupdf.Matrix(1.2, 1.2)).save(f'reports-check/fixture-page-{i+1}.png')
print(f'PASS: PDF has {len(pdf)} nonblank pages; heading, KPI and revenue on page 1')
`], { encoding: 'utf8' })
  console.log(pdfCheck.trim())
  console.log('PASS: actual /reports app layout, API network fixtures only, four print KPIs; PDF exported')
} finally { await browser.close() }
