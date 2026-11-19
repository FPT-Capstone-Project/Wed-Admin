import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { COMPLAINT_STATUSES, complaintDate, isFinalComplaint } from '../src/features/complaints/complaint-status.ts'
const require = createRequire(import.meta.url)
const ts = require('typescript')

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

test('complaints expose five Vietnamese states and Vietnam timestamps', () => {
  assert.equal(Object.keys(COMPLAINT_STATUSES).length, 5)
  assert.equal(COMPLAINT_STATUSES.WAITING_CUSTOMER.label, 'Chờ khách hàng bổ sung thông tin')
  assert.equal(isFinalComplaint('RESOLVED'), true)
  assert.equal(isFinalComplaint('WAITING_CUSTOMER'), false)
  assert.equal(complaintDate(null), '—')
  assert.equal(complaintDate('1970-01-01T00:00:00Z'), '—')
  assert.ok(complaintDate('2026-11-02T18:00:00Z').includes('03/11/2026'))
})

test('list keeps the verified flat pagination wrapper; detail unwraps data', async () => {
  const calls = []
  const list = { data: [], page: 2, pageSize: 20, total: 41 }
  const detail = { complaint_id: 7, replies: [] }
  const { complaintApi } = api({ get: async (url, config) => { calls.push([url, config]); return { data: url.endsWith('/7') ? { data: detail } : list } } })
  assert.equal(await complaintApi.list({ page: 2, pageSize: 20, status: 'OPEN' }), list)
  assert.equal(await complaintApi.detail(7), detail)
  assert.equal(calls[0][0], '/api/complaints')
  assert.equal(calls[0][1].params.page, 2)
  assert.equal(calls[1][0], '/api/complaints/7')
})

test('all three writes use exactly the Swagger paths and payloads', async () => {
  const calls = []
  const client = Object.fromEntries(['post', 'patch'].map(method => [method, async (url, body) => { calls.push({ method, url, body }) }]))
  const { complaintApi } = api(client)
  await complaintApi.reply(7, { message: 'Phản hồi' })
  await complaintApi.assign(7, { assignedTo: null })
  await complaintApi.status(7, { status: 'RESOLVED', resolution: 'Đã xử lý' })
  assert.deepEqual(calls, [
    { method: 'post', url: '/api/complaints/7/replies', body: { message: 'Phản hồi' } },
    { method: 'patch', url: '/api/complaints/7/assign', body: { assignedTo: null } },
    { method: 'patch', url: '/api/complaints/7/status', body: { status: 'RESOLVED', resolution: 'Đã xử lý' } },
  ])
})

test('KPI totals come from server counts, not the visible page', async () => {
  const values = { OPEN: 11, IN_PROGRESS: 5, WAITING_CUSTOMER: 3, RESOLVED: 8, REJECTED: 2 }
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

test('HTTP 409 is preserved for the centralized error mapper', async () => {
  const conflict = Object.assign(new Error('Complaint is final'), { response: { status: 409 } })
  const { complaintApi } = api({ post: async () => { throw conflict } })
  await assert.rejects(complaintApi.reply(7, { message: 'Phản hồi' }), error => error === conflict)
})
