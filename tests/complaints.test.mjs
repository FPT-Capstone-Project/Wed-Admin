import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { COMPLAINT_STATUSES, complaintDate, isFinalComplaint } from '../src/features/complaints/complaint-status.ts'
const require = createRequire(import.meta.url)
const ts = require('typescript')

// Exercise component event handlers with lightweight hook/control doubles.
function drawerHarness() {
  let mode = 'assign'
  let selected
  let original
  let resets = 0
  const form = { resetFields: () => { selected = original; resets++ } }
  const Form = Object.assign('Form', { useForm: () => [form], useWatch: () => selected, Item: 'Form.Item' })
  const source = readFileSync(new URL('../src/features/complaints/components/ComplaintDetailDrawer.tsx', import.meta.url), 'utf8')
    + '\nexport { ComplaintHandling, AssignmentForm, AdminDecisionForm }'
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const exports = {}
  runInNewContext(code, { exports, require: id => {
    if (id === 'react/jsx-runtime') return require(id)
    if (id === 'react') return { useRef: () => ({ current: false }), useState: () => [mode, value => { mode = value }] }
    if (id === 'antd') return new Proxy({ Form }, { get: (target, name) => target[name] ?? name })
    if (id.endsWith('complaint-status')) return { COMPLAINT_STATUSES, isFinalComplaint }
    return {}
  } })
  return { ...exports, choose: value => { selected = value }, initialize: value => { original = value; selected = value }, resets: () => resets }
}

function nodes(element) {
  if (!element || typeof element !== 'object') return []
  return [element, ...[element.props?.children].flat(Infinity).flatMap(nodes)]
}

test('pending routes render exactly one keyed branch and default to assignment', () => {
  const h = drawerHarness()
  const props = { complaint: { status: 'PENDING', assigned_to: null }, users: [], pending: false }
  let tree = h.ComplaintHandling(props)
  assert.equal(tree.props.title, 'Hướng xử lý khiếu nại')
  assert.equal(nodes(tree).filter(node => node.type === h.AssignmentForm).length, 1)
  assert.equal(nodes(tree).filter(node => node.type === h.AdminDecisionForm).length, 0)
  nodes(tree).find(node => node.type === 'Segmented').props.onChange('decide')
  tree = h.ComplaintHandling(props)
  assert.equal(nodes(tree).filter(node => node.type === h.AssignmentForm).length, 0)
  assert.equal(nodes(tree).find(node => node.type === h.AdminDecisionForm).key, 'decide')
  nodes(tree).find(node => node.type === 'Segmented').props.onChange('assign')
  tree = h.ComplaintHandling(props)
  assert.equal(nodes(tree).find(node => node.type === h.AssignmentForm).key, 'assign')
})

for (const current of [undefined, 2]) {
  test(`assignment draft cancel restores ${current ?? 'empty'} without submitting`, () => {
    const h = drawerHarness()
    h.initialize(current)
    let writes = 0
    const props = { complaint: { status: 'PENDING', assigned_to: current ?? null }, users: [], pending: false, onAssign: () => { writes++ } }
    let tree = h.AssignmentForm(props)
    assert.equal(nodes(tree).find(node => node.type === 'Select').props.allowClear, current == null)
    assert.equal(nodes(tree).find(node => node.props.htmlType === 'submit').props.disabled, true)
    assert.equal(nodes(tree).some(node => node.props.children === 'Hủy'), false)
    h.choose(9)
    tree = h.AssignmentForm(props)
    assert.equal(nodes(tree).find(node => node.props.htmlType === 'submit').props.disabled, false)
    nodes(tree).find(node => node.props.children === 'Hủy').props.onClick()
    assert.equal(h.resets(), 1)
    tree = h.AssignmentForm(props)
    assert.equal(nodes(tree).find(node => node.props.htmlType === 'submit').props.disabled, true)
    assert.equal(nodes(tree).some(node => node.props.children === 'Hủy'), false)
    assert.equal(writes, 0)
  })
}

for (const status of ['UNDER_REVIEW', 'NEED_MORE_INFO', 'RESOLVING']) {
  test(`${status} renders monitoring and reassignment without decision form`, () => {
    const h = drawerHarness()
    const tree = h.ComplaintHandling({ complaint: { status, assigned_to: 2, assigned_staff: { full_name: 'Lan' } }, users: [] })
    assert.equal(nodes(tree).some(node => node.type === h.AdminDecisionForm), false)
    assert.equal(nodes(tree).some(node => node.type === h.AssignmentForm), true)
    assert.match(nodes(tree).find(node => node.type === 'Alert').props.title, /Lan/)
  })
}

function api(client) {
  const source = readFileSync(new URL('../src/features/complaints/complaint.api.ts', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  runInNewContext(code, { exports, require: id => {
    if (id.endsWith('/client')) return { apiClient: client }
    if (id.endsWith('/response-normalizer')) return { ensureObject: body => body?.data ?? body }
    if (id === './complaint-status') return { STATUS_OPTIONS: Object.keys(COMPLAINT_STATUSES).map(value => ({ value })) }
    throw new Error(`Unexpected dependency: ${id}`)
  } })
  return exports
}

test('complaints expose seven schema states in Vietnamese and Vietnam timestamps', () => {
  assert.equal(Object.keys(COMPLAINT_STATUSES).length, 7)
  assert.equal(COMPLAINT_STATUSES.NEED_MORE_INFO.label, 'Chờ khách hàng bổ sung thông tin')
  assert.equal(isFinalComplaint('RESOLVED'), true)
  assert.equal(isFinalComplaint('CLOSED'), true)
  assert.equal(isFinalComplaint('NEED_MORE_INFO'), false)
  assert.equal(complaintDate(null), '—')
  assert.equal(complaintDate('1970-01-01T00:00:00Z'), '—')
  assert.ok(complaintDate('2026-11-02T18:00:00Z').includes('03/11/2026'))
})

test('list keeps the verified flat pagination wrapper; detail unwraps data', async () => {
  const calls = []
  const list = { data: [], page: 2, pageSize: 20, total: 41 }
  const detail = { complaint_id: 7, replies: [] }
  const { complaintApi } = api({ get: async (url, config) => { calls.push([url, config]); return { data: url.endsWith('/7') ? { data: detail } : list } } })
  assert.equal(await complaintApi.list({ page: 2, pageSize: 20, status: 'PENDING' }), list)
  assert.equal(await complaintApi.detail(7), detail)
  assert.equal(calls[0][0], '/api/complaints')
  assert.equal(calls[0][1].params.page, 2)
  assert.equal(calls[1][0], '/api/complaints/7')
})

test('admin writes use exactly the Swagger paths and payloads', async () => {
  const calls = []
  const client = Object.fromEntries(['post', 'patch'].map(method => [method, async (url, body) => { calls.push({ method, url, body }) }]))
  const { complaintApi } = api(client)
  await complaintApi.assign(7, { assignedTo: null })
  await complaintApi.status(7, { status: 'RESOLVED', resolution: 'Đã xử lý' })
  assert.deepEqual(calls, [
    { method: 'patch', url: '/api/complaints/7/assign', body: { assignedTo: null } },
    { method: 'patch', url: '/api/complaints/7/status', body: { status: 'RESOLVED', resolution: 'Đã xử lý' } },
  ])
})

test('KPI totals come from server counts, not the visible page', async () => {
  const values = { PENDING: 11, UNDER_REVIEW: 3, NEED_MORE_INFO: 3, RESOLVING: 2, RESOLVED: 5, REJECTED: 2, CLOSED: 3 }
  const { fetchComplaintSummary } = api({ get: async (_url, { params }) => ({ data: { data: [], total: values[params.status], page: 1, pageSize: 1 } }) })
  const result = await fetchComplaintSummary()
  assert.equal(result.total, 29)
  assert.equal(result.open, 11)
  assert.equal(result.processing, 8)
  assert.equal(result.closed, 10)
})

test('search pagination has a hard cap and reports incomplete results', async () => {
  const calls = []
  const { fetchComplaintSearch } = api({ get: async (_url, { params }) => { calls.push(params.page); return { data: { data: Array(100).fill({ complaint_id: params.page }), total: 2500, page: params.page, pageSize: 100 } } } })
  const result = await fetchComplaintSearch(undefined)
  assert.equal(calls.length, 20)
  assert.equal(result.data.length, 2000)
  assert.equal(result.incomplete, true)
})

test('HTTP 409 is preserved for admin status decisions', async () => {
  const conflict = Object.assign(new Error('Complaint changed'), { response: { status: 409 } })
  const { complaintApi } = api({ patch: async () => { throw conflict } })
  await assert.rejects(complaintApi.status(7, { status: 'CLOSED', resolution: 'done' }), error => error === conflict)
})

for (const [status, assignedTo, expectedFallback] of [
  ['PENDING', 2, true], ['UNDER_REVIEW', 2, false], ['CLOSED', 2, false], ['PENDING', 9, false],
]) {
  test(`assignment checks server state ${status}/${assignedTo} before fallback`, async () => {
    const calls = []
    const { assignComplaintForReview } = api({
      patch: async (url, body) => { calls.push({ url, body }) },
      get: async () => ({ data: { complaint_id: 7, replies: [], status, assigned_to: assignedTo } }),
    })
    await assignComplaintForReview(7, { assignedTo: 2 })
    assert.equal(calls.length, expectedFallback ? 2 : 1)
    assert.equal(calls[0].url, '/api/complaints/7/assign')
    if (expectedFallback) {
      assert.equal(calls[1].url, '/api/complaints/7/status')
      assert.equal(calls[1].body.status, 'UNDER_REVIEW')
    }
  })
}

test('assignment propagates partial failure for UI error handling', async () => {
  const failure = new Error('status update failed')
  const { assignComplaintForReview } = api({
    patch: async url => { if (url.endsWith('/status')) throw failure },
    get: async () => ({ data: { complaint_id: 7, replies: [], status: 'PENDING', assigned_to: 2 } }),
  })
  await assert.rejects(assignComplaintForReview(7, { assignedTo: 2 }), error => error === failure)
})
