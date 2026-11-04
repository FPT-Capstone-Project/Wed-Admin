import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { formatDate } from '../src/shared/utils/date.ts'
import { cleanQueryParams, unwrapListResponse } from '../src/shared/api/list-response.ts'
import { normalizeOrder } from '../src/features/orders/api/order-normalizer.ts'
import { mergeOrderSources } from '../src/features/orders/utils/merge-order-sources.ts'

test('dates reject missing, invalid and epoch values, including strings', () => {
  for (const value of [undefined, null, 0, '0', '', '  ', ' 0 ', 'invalid', new Date(NaN), new Date(0), '1969-12-31', '1970-12-31']) {
    assert.equal(formatDate(value), '—', String(value))
  }
  assert.equal(formatDate(new Date(2026, 10, 3, 14, 25)), '14:25 03/11/2026')
  assert.equal(formatDate('2026-11-03', 'DD/MM/YYYY'), '03/11/2026')
})
test('orders normalize nested package/mushroom/payment and numeric PostgreSQL money', () => {
  const order = normalizeOrder({ orderId: 7, createdAt: '2026-11-03T08:00:00Z', package: { name: 'Gói 30 ngày' }, mushroom_type: { name: 'Nấm sò' }, payment: { status: 'paid' }, total_price: '1250000.50' })
  assert.equal(order.package_name, 'Gói 30 ngày')
  assert.equal(order.mushroom_name, 'Nấm sò')
  assert.equal(order.payment_status, 'PAID')
  assert.equal(order.total_amount, 1250000.5)
  assert.equal(order.created_at, '2026-11-03T08:00:00.000Z')
})
test('orders accept all specified aliases and preserve real zero amounts', () => {
  for (const key of ['total_price', 'totalAmount', 'total_amount', 'amount', 'total']) assert.equal(normalizeOrder({ [key]: '120' }).total_amount, 120)
  assert.equal(normalizeOrder({ total_price: 0, totalAmount: 120 }).total_amount, 0)
  const itemOrder = normalizeOrder({ order_id: 2, order_date: '2026-11-03', order_items: [{ package_name: 'Gói A', mushroom_type_name: 'Nấm B' }] })
  assert.equal(itemOrder.package_name, 'Gói A')
  assert.equal(itemOrder.mushroom_name, 'Nấm B')
  assert.notEqual(itemOrder.created_at, null)
  for (const key of ['package_name', 'packageName']) assert.equal(normalizeOrder({ [key]: 'Gói' }).package_name, 'Gói')
  assert.equal(normalizeOrder({ package: { package_name: 'Gói' } }).package_name, 'Gói')
  assert.equal(normalizeOrder({ paymentStatus: 'REFUNDED' }).payment_status, 'REFUNDED')
  assert.equal(normalizeOrder({ total_amount: 'not a number', created_at: 0 }).created_at, null)
})
test('merged orders retain primary creation time and names; unknown dates remain null', () => {
  const order = normalizeOrder({ order_id: 1, created_at: '2026-10-01', total_amount: '200', package_name: 'Đã mua' })
  const session = { order_id: 1, session_id: 8, status: 'CULTIVATING', created_at: '2026-11-01', package_name: 'Tên từ phiên' }
  const rows = mergeOrderSources([order], [session], [])
  assert.equal(rows[0].createdAt, order.created_at)
  assert.equal(rows[0].packageName, 'Đã mua')
  assert.equal(rows[0].totalAmount, 200)
  assert.equal(mergeOrderSources([], [session], [])[0].createdAt, null)
})
test('empty issue filters are removed while meaningful false and zero survive', () => {
  assert.deepEqual(cleanQueryParams({ status: '', severity: undefined, sessionId: null, q: ' ', page: 1, isRead: false, count: 0 }), { page: 1, isRead: false, count: 0 })
})
test('issue list supports direct, nested data and items envelopes without losing pagination', () => {
  const items = [{ issue_id: 1 }]
  const pagination = { page: 2, pageSize: 10, total: 22, totalPages: 3 }
  for (const raw of [{ data: items, pagination }, { data: { data: items, pagination } }, { data: { items, pagination } }]) {
    assert.deepEqual(unwrapListResponse(raw), { data: items, pagination })
  }
  assert.deepEqual(unwrapListResponse(items).data, items)
  assert.deepEqual(unwrapListResponse({ data: { data: [] } }).data, [])
  assert.throws(() => unwrapListResponse({ message: 'Unavailable' }), /không đúng định dạng/)
})

// Load API functions with an injected transport; no real server data is written.
const require = createRequire(import.meta.url)
function loadApi(relativePath, dependencies) {
  const filename = new URL(relativePath, import.meta.url)
  const source = readFileSync(filename, 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  runInNewContext(code, { exports, require: id => Object.hasOwn(dependencies, id) ? dependencies[id] : require(id), console, Map, Set, Date, URL })
  return exports
}
const notFound = Object.assign(new Error('Not found'), { response: { status: 404 } })
const reject404 = () => Promise.reject(notFound)
test('session list propagates the original HTTP 404 to React Query', async () => {
  const { sessionApi } = loadApi('../src/features/sessions/api/session.api.ts', {
    '../../../shared/api/client': { apiClient: { get: reject404 } },
    '../../../shared/api/list-response': { unwrapListResponse, cleanQueryParams },
    '../../../shared/api/response-normalizer': {},
    './session-normalizer': { normalizeSession: value => value },
  })
  await assert.rejects(sessionApi.list(), error => error === notFound)
})
test('cultivation aggregator does not swallow failed session requests', async () => {
  const progress = loadApi('../src/features/sessions/utils/session-progress.utils.ts', {
    '../../../shared/utils/date': loadApi('../src/shared/utils/date.ts', {}),
  })
  const { fetchCultivationBatches } = loadApi('../src/features/cultivation/api/cultivation.api.ts', {
    '../../sessions/utils/session-progress.utils': progress,
    '../../farm/api/farm.api': { farmApi: { list: async () => [] } },
    '../../sessions/api/session.api': { sessionApi: { list: reject404 } },
    '../types/cultivation.types': { GROWTH_STAGE_META: {} },
  })
  await assert.rejects(fetchCultivationBatches(), error => error === notFound)
})
test('reports analytics aggregator survives a session 404 without publishing zero KPIs', async () => {
  const list = async () => []
  const { fetchReportsAnalytics } = loadApi('../src/features/analytics/api/analytics.api.ts', {
    '../../rooms/api/cultivation-room.api': { cultivationRoomApi: { list } },
    '../../rooms/api/cultivation-tray.api': { cultivationTrayApi: { list } },
    '../../devices/api/iot.api': { autoMistingApi: { listFloors: list }, iotApi: { listMasters: list } },
    '../../sessions/api/session.api': { sessionApi: { list: reject404 } },
    '../../packages/api/rental-package.api': { rentalPackageApi: { list } },
    '../../harvest/api/harvest.api': { harvestApi: { list: async () => ({ data: [] }) } },
    '../../dashboard/api/dashboard.api': {
      fetchDashboardMetrics: async () => ({
        revenue: { value: 128500000, currency: 'VND' },
        trays_used: 36,
        harvest_quality: { usable_rate: 93, waste_rate: 7 },
      }),
    },
  })
  const analytics = await fetchReportsAnalytics()
  // Phiên lỗi chỉ làm mất dữ liệu phiên — không cascade làm hỏng cả trang.
  assert.equal(analytics.totalSessions, 0)
  assert.equal(analytics.totalRevenue, 128500000)
  assert.equal(analytics.traysUsed, 36)
  assert.equal(analytics.usableRate, 93)
  assert.equal(analytics.wasteRate, 7)
})
test('dashboard metrics endpoint is fetched through the shared axios client', async () => {
  const calls = []
  const { fetchDashboardMetrics } = loadApi('../src/features/dashboard/api/dashboard.api.ts', {
    '../../../shared/api/client': {
      apiClient: {
        get: async (url) => {
          calls.push(url)
          return {
            data: {
              data: {
                revenue: { value: 128500000, currency: 'VND' },
                trays_used: 36,
                harvest_quality: { usable_rate: 93, waste_rate: 7 },
              },
            },
          }
        },
      },
    },
    '../../../shared/api/response-normalizer': {
      ensureObject: (value) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null
        if (value.data && typeof value.data === 'object') return value.data
        return value
      },
    },
  })
  const metrics = await fetchDashboardMetrics()
  assert.deepEqual(calls, ['/api/analytics/dashboard'])
  assert.equal(metrics.revenue.value, 128500000)
  assert.equal(metrics.trays_used, 36)
  assert.equal(metrics.harvest_quality.usable_rate, 93)
  assert.equal(metrics.harvest_quality.waste_rate, 7)
})
test('issues API sends clean params and returns the normalized nested collection', async () => {
  let sent
  const { issuesApi } = loadApi('../src/features/disease-management/api/issues.api.ts', {
    '../../../shared/api/client': { apiClient: { get: async (url, options) => { sent = { url, ...options }; return { data: { data: { items: [{ issue_id: 1 }], pagination: { total: 1 } } } } } } },
    '../../../shared/api/list-response': { unwrapListResponse, cleanQueryParams },
    '../../users/api/user.api': { userApi: {} },
  })
  const result = await issuesApi.list({ status: '', severity: '', page: 1 })
  assert.deepEqual(sent, { url: '/api/issues', params: { page: 1 } })
  assert.equal(result.data[0].issue_id, 1)
  assert.equal(result.pagination.total, 1)
})

const { normalizeSession } = loadApi('../src/features/sessions/api/session-normalizer.ts', {
  '../../../shared/api/response-normalizer': {
    ensureObject: value => value && typeof value === 'object' ? value : null,
    ensureArray: value => Array.isArray(value) ? value : [],
  },
})
const farmFixture = [6, 9, 17, 18].map((id, index) => ({
  session_id: id, status: index === 0 ? 'PENDING' : 'CULTIVATING', harvest_status: 'NOT_READY',
  start_at: '2026-11-03T00:26:16.097Z', harvest_date: '2026-11-17T17:00:00.000Z',
  order_item_id: index + 6, tray_quantity: [1, 2, 4, 6][index], spawn_quantity: [3, 6, 12, 18][index],
  mushroom_name: 'Nấm sò trắng', order_id: [7, 13, 16, 17][index], customer_name: 'Nguyen Van A', last_inspected_at: null,
}))
function loadSessionApi(get) {
  return loadApi('../src/features/sessions/api/session.api.ts', {
    '../../../shared/api/client': { apiClient: { get } },
    '../../../shared/api/list-response': { unwrapListResponse },
    '../../../shared/api/response-normalizer': { ensureObject: body => body.data ?? body },
    './session-normalizer': { normalizeSession },
  }).sessionApi
}
test('farm response maps actual timestamps, quantities and harvest state without fabricated fields', () => {
  const row = normalizeSession(farmFixture[3])
  assert.equal(row.start_date, farmFixture[3].start_at)
  assert.equal(row.expected_harvest_date, farmFixture[3].harvest_date)
  assert.equal(row.tray_count, 6)
  assert.equal(row.spawn_quantity, 18)
  assert.equal(row.harvest_status, 'NOT_READY')
  assert.equal(row.created_at, null)
  assert.equal(row.package_name, null)
  assert.equal(row.last_inspected_at, null)
  assert.equal(row.trays.length, 0)
})
test('farm list sends only supported status and paginates locally', async () => {
  const calls = []
  const api = loadSessionApi(async (url, options) => { calls.push({ url, params: options?.params }); return { data: { data: farmFixture } } })
  const result = await api.list({ status: 'CULTIVATING', page: 2, pageSize: 2 })
  assert.equal(calls[0].url, '/api/farm/sessions')
  assert.equal(Object.keys(calls[0].params).join(','), 'status')
  assert.equal(result.pagination.total, 3)
  assert.equal(result.pagination.totalPages, 2)
  assert.equal(result.items.length, 1)
  assert.equal(result.items[0].session_id, 18)
})
test('unpaged aggregation retains more than 100 farm sessions', async () => {
  const records = Array.from({ length: 125 }, (_, i) => ({ ...farmFixture[0], session_id: i + 1 }))
  const api = loadSessionApi(async () => ({ data: { data: records } }))
  assert.equal((await api.list()).items.length, 125)
})
test('tray filter joins explicit assignments and never treats tray quantity as an ID', async () => {
  const calls = []
  const api = loadSessionApi(async (url, options) => {
    calls.push({ url, params: options?.params })
    if (url === '/api/farm/sessions') return { data: { data: farmFixture } }
    const id = Number(url.split('/')[4])
    const session = farmFixture.find(row => row.order_id === id)
    return { data: { data: { sessions: [{ session_id: session.session_id, assigned_trays: [{ tray_id: session.session_id === 17 ? 42 : 99, session_tray_id: session.session_id, status: 'ACTIVE' }] }] } } }
  })
  const result = await api.list({ trayId: 42 })
  assert.equal(result.items.length, 1)
  assert.equal(result.items[0].session_id, 17)
  assert.equal(calls[0].params, undefined)
  assert.equal(calls.filter(call => call.url.startsWith('/api/customer/orders/')).length, 4)
})
test('session detail uses the farm detail route', async () => {
  let called
  const api = loadSessionApi(async url => { called = url; return { data: { data: farmFixture[0] } } })
  assert.equal((await api.getById(6)).session_id, 6)
  assert.equal(called, '/api/farm/sessions/6')
})

// ─── Phân quyền route & menu ────────────────────────────────────────────────
const accessPolicy = loadApi('../src/routes/access-policy.ts', {})
test('role normalization maps backend role_id and role strings to UI roles', () => {
  const { normalizeRole, resolveUserRole, isRoleAllowed, ADMIN_ONLY, ADMIN_AND_OPERATOR } = accessPolicy
  // role_id (nguồn sự thật của BE): 1 = Admin, 2 = Farm Operator, 3 = Customer.
  assert.equal(normalizeRole(null, 1), 'ADMIN')
  assert.equal(normalizeRole(null, 2), 'OPERATOR')
  assert.equal(normalizeRole(null, 3), 'CUSTOMER')
  // Role string (alias từ các endpoint cũ).
  assert.equal(normalizeRole('admin'), 'ADMIN')
  assert.equal(normalizeRole('FARM_MANAGER'), 'OPERATOR')
  assert.equal(normalizeRole('FARM_OPERATOR'), 'OPERATOR')
  assert.equal(normalizeRole('customer'), 'CUSTOMER')
  // Role lạ → fallback về roleId.
  assert.equal(normalizeRole('WEIRD_ROLE', 2), 'OPERATOR')
  assert.equal(normalizeRole(undefined, undefined), null)
  assert.equal(resolveUserRole(null), null)
  assert.equal(resolveUserRole({ role: 'OPERATOR', roleId: 2 }), 'OPERATOR')
})
test('admin area allows both ADMIN and OPERATOR, but not CUSTOMER', () => {
  const { isRoleAllowed, ADMIN_ONLY, ADMIN_AND_OPERATOR } = accessPolicy
  assert.equal(isRoleAllowed(ADMIN_AND_OPERATOR, 'ADMIN'), true)
  assert.equal(isRoleAllowed(ADMIN_AND_OPERATOR, 'OPERATOR'), true)
  assert.equal(isRoleAllowed(ADMIN_AND_OPERATOR, 'CUSTOMER'), false)
  assert.equal(isRoleAllowed(ADMIN_ONLY, 'ADMIN'), true)
  assert.equal(isRoleAllowed(ADMIN_ONLY, 'OPERATOR'), false)
  assert.equal(isRoleAllowed(ADMIN_ONLY, null), false)
})
test('sidebar hides ADMIN-only menu items for OPERATOR but keeps shared pages', () => {
  const { filterMenuGroups, MENU_GROUPS } = loadApi('../src/app/layouts/navigation-items.ts', {})
  const keysOf = (groups) => groups.flatMap((group) => group.items.map((item) => item.key))
  const adminKeys = keysOf(filterMenuGroups(MENU_GROUPS, true))
  const operatorKeys = keysOf(filterMenuGroups(MENU_GROUPS, false))

  // ADMIN thấy toàn bộ.
  assert.ok(adminKeys.includes('/users'))
  assert.ok(adminKeys.includes('/settings'))
  assert.ok(adminKeys.includes('/camera'))
  assert.ok(adminKeys.includes('/issues'))
  assert.ok(adminKeys.includes('/harvests'))
  // OPERATOR không thấy các mục ADMIN-only.
  assert.equal(operatorKeys.includes('/users'), false)
  assert.equal(operatorKeys.includes('/settings'), false)
  assert.equal(operatorKeys.includes('/camera'), false)
  assert.equal(operatorKeys.includes('/issues'), false)
  assert.equal(operatorKeys.includes('/harvests'), false)
  // OPERATOR vẫn thấy các trang dùng chung.
  for (const key of ['/', '/rooms', '/devices', '/sessions', '/cultivation', '/alerts', '/reports', '/orders', '/packages']) {
    assert.ok(operatorKeys.includes(key), `OPERATOR phải thấy ${key}`)
  }
  // Nhóm menu rỗng phải bị ẩn.
  for (const group of filterMenuGroups(MENU_GROUPS, false)) {
    assert.ok(group.items.length > 0, `nhóm "${group.label}" không được rỗng`)
  }
})

// ─── Cấu hình API base URL ───────────────────────────────────────────────────
const apiConfig = loadApi('../src/shared/api/api-config.ts', {})
test('base URL is normalized to origin so endpoints never become /api/api/...', () => {
  const { normalizeApiBaseUrl } = apiConfig
  assert.equal(normalizeApiBaseUrl('https://be.example.com'), 'https://be.example.com')
  assert.equal(normalizeApiBaseUrl('https://be.example.com/'), 'https://be.example.com')
  assert.equal(normalizeApiBaseUrl('https://be.example.com/api'), 'https://be.example.com')
  assert.equal(normalizeApiBaseUrl('https://be.example.com/api/'), 'https://be.example.com')
  assert.equal(normalizeApiBaseUrl('https://be.example.com/API'), 'https://be.example.com')
  assert.equal(normalizeApiBaseUrl('  https://be.example.com/api  '), 'https://be.example.com')
  // Không đụng vào /api nằm giữa path.
  assert.equal(normalizeApiBaseUrl('https://be.example.com/api/v1'), 'https://be.example.com/api/v1')
  assert.equal(normalizeApiBaseUrl(''), '')
})
test('development always uses same-origin so requests go through the Vite proxy', () => {
  const { resolveApiConfig } = apiConfig
  // Có env → vẫn baseURL = '' (dev dùng proxy, không gọi thẳng → né CORS).
  const withEnv = resolveApiConfig({ DEV: true, MODE: 'development', VITE_API_BASE_URL: 'https://be.example.com/api' })
  assert.equal(withEnv.baseUrl, '')
  assert.equal(withEnv.isValid, true)
  assert.equal(withEnv.mode, 'development')
  // Không env → vẫn hợp lệ (dev không bắt buộc).
  const withoutEnv = resolveApiConfig({ DEV: true, MODE: 'development' })
  assert.equal(withoutEnv.baseUrl, '')
  assert.equal(withoutEnv.isValid, true)
})
test('production requires a valid absolute VITE_API_BASE_URL', () => {
  const { resolveApiConfig } = apiConfig
  // Thiếu env → không hợp lệ + có thông báo rõ ràng.
  const missing = resolveApiConfig({ DEV: false, MODE: 'production' })
  assert.equal(missing.isValid, false)
  assert.equal(missing.mode, 'production')
  assert.match(missing.error, /VITE_API_BASE_URL/)
  assert.ok(missing.hint && missing.hint.length > 0, 'phải có hướng dẫn cách sửa')
  // URL tương đối → không hợp lệ.
  const relative = resolveApiConfig({ DEV: false, MODE: 'production', VITE_API_BASE_URL: '/api' })
  assert.equal(relative.isValid, false)
  assert.match(relative.error, /tuyệt đối/)
  // Không có scheme → không hợp lệ.
  const noScheme = resolveApiConfig({ DEV: false, MODE: 'production', VITE_API_BASE_URL: 'be.example.com/api' })
  assert.equal(noScheme.isValid, false)
  assert.match(noScheme.error, /http/)
  // Hợp lệ → baseURL = origin.
  const ok = resolveApiConfig({ DEV: false, MODE: 'production', VITE_API_BASE_URL: 'https://be.example.com/api' })
  assert.equal(ok.isValid, true)
  assert.equal(ok.baseUrl, 'https://be.example.com')
  assert.equal(ok.error, null)
  // Placeholder chưa sửa (copy nguyên từ .env.example) → phải báo rõ.
  const placeholder = resolveApiConfig({ DEV: false, MODE: 'production', VITE_API_BASE_URL: 'https://<your-backend-domain>/api' })
  assert.equal(placeholder.isValid, false)
  assert.match(placeholder.error, /placeholder/)
})
test('env sample files document the required production variable', () => {
  for (const file of ['../.env.example', '../.env.production.sample']) {
    const content = readFileSync(new URL(file, import.meta.url), 'utf8')
    assert.match(content, /VITE_API_BASE_URL=https:\/\/<your-backend-domain>\/api/, `${file} phải mô tả VITE_API_BASE_URL`)
  }
})
test('router parent guard opens the admin area for OPERATOR and blocks CUSTOMER inline', () => {
  const source = readFileSync(new URL('../src/app/router/index.tsx', import.meta.url), 'utf8')
  // Route cha phải cho phép ADMIN + OPERATOR (không còn chặn ở cổng vào).
  assert.ok(/<RoleGuard\s+allowedRoles=\{ADMIN_AND_OPERATOR\}/.test(source), 'route cha phải dùng ADMIN_AND_OPERATOR')
  // Route cha dùng inline 403 → không có vòng lặp redirect vô hạn.
  assert.ok(/unauthorizedBehavior="inline"/.test(source), 'route cha phải chặn inline')
  // Route ADMIN-only phải được bọc RoleGuard ADMIN_ONLY.
  for (const path of ['users', 'settings', 'camera', 'issues', 'harvests']) {
    const pattern = new RegExp(`path: '${path}'[\\s\\S]{0,200}?allowedRoles=\\{ADMIN_ONLY\\}`)
    assert.ok(pattern.test(source), `route "${path}" phải giới hạn ADMIN_ONLY`)
  }
  // Route ADMIN + OPERATOR.
  for (const path of ['devices', 'devices/history', 'sessions']) {
    const pattern = new RegExp(`path: '${path}'[\\s\\S]{0,200}?allowedRoles=\\{ADMIN_AND_OPERATOR\\}`)
    assert.ok(pattern.test(source), `route "${path}" phải cho phép ADMIN_AND_OPERATOR`)
  }
})
