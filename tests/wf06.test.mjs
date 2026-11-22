import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as normalizers from '../src/features/disease-management/api/issues.normalizers.ts'
import * as lists from '../src/shared/api/list-response.ts'

function service(client) {
  const source = readFileSync(new URL('../src/features/disease-management/api/issues.api.ts', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText
  const exports = {}
  runInNewContext(code, { exports, require: name => {
    if (name.endsWith('/client')) return { apiClient: client }
    if (name.endsWith('/list-response')) return lists
    if (name === './issues.normalizers') return normalizers
    throw Error(name)
  } })
  return exports.issuesApi
}

test('WF06 preserves current progress, missing fields and saved history separately', () => {
  const issue = normalizers.normalizeIssue(normalizers.unwrapEntity({ data: { issueId: 12, consultationId: 7, sessionStatus: 'ACTIVE', floorId: 2, growthProgress: 0, progress: [
    { stage: 'OLDER', updatedAt: '2026-11-01' }, { stage: 'LATEST', updatedAt: '2026-11-20' },
  ] } }))
  assert.equal(issue.issue_id, 12)
  assert.equal(issue.floor_id, 2)
  assert.deepEqual(issue.consultation_ids, [7])
  assert.equal(issue.growth_stage, 'LATEST')
  assert.equal(issue.reported_growth_stage, null)
  assert.equal(issue.environment_snapshot, null)
  assert.doesNotThrow(() => normalizers.normalizeIssue(null))
})

test('WF06 keeps old text, all expert replies and photos in chronological order', () => {
  const c = normalizers.normalizeConsultation({ question: JSON.stringify({ original_question: 'Câu hỏi gốc', messages: [
    { id: 2, senderName: 'Chuyên gia', createdAt: '2026-11-22', diagnosis: 'Chẩn đoán cũ', solution: 'Giải pháp cũ' },
    { id: 1, sender_name: 'Nhân viên', created_at: '2026-11-21', media_url: '/photo.png' },
  ] }), diagnosis: 'Chẩn đoán mới' })
  assert.equal(c.question, 'Câu hỏi gốc')
  assert.equal(c.messages[0].media_url, '/photo.png')
  assert.equal(c.messages[1].diagnosis, 'Chẩn đoán cũ')
  assert.equal(c.diagnosis, 'Chẩn đoán mới')
  assert.equal(normalizers.normalizeConsultation({ question: 'Câu hỏi cũ' }).question, 'Câu hỏi cũ')
  assert.deepEqual(normalizers.normalizeConsultation({ messages: null }).messages, [])
})

test('WF06 suppresses only the duplicate initial question after trimming', () => {
  const c = raw => normalizers.normalizeConsultation({ question: ' Câu hỏi gốc ', ...raw })
  assert.equal(normalizers.hasInitialQuestion(c({ messages: [{ message: 'Câu hỏi gốc  ' }] })), false)
  assert.equal(normalizers.hasInitialQuestion(c({ messages: [] })), true)
  assert.equal(normalizers.hasInitialQuestion(c({ messages: [{ message: 'Khác' }] })), true)
  assert.equal(normalizers.hasInitialQuestion(c({ messages: [{ media_url: '/photo.png' }] })), true)
})

test('WF06 resolves expert name variants without confusing the expert with the sender', () => {
  for (const raw of [{ expert_name: 'An' }, { expertName: 'An' }, { expert: { full_name: 'An' } }, { expert: { fullName: 'An' } }, { expert: { username: 'An' } }]) {
    assert.equal(normalizers.normalizeConsultation({ status: 'CLOSED', ...raw }).expert_name, 'An')
  }
  const c = normalizers.normalizeConsultation({ expertId: 7, messages: [{ sender_name: 'Nhân viên khác' }] })
  assert.equal(c.expert_id, 7)
  assert.equal(c.expert_name, null)
  assert.equal(normalizers.normalizeConsultation({ expert: { user_id: 8 } }).expert_id, 8)
  assert.equal(normalizers.normalizeConsultation({ expert_name: 'Tên chính', expert: { username: 'Tên phụ' } }).expert_name, 'Tên chính')
})

test('WF06 preserves treatment media stages and review history', () => {
  const log = normalizers.normalizeTreatment({ treatmentLogId: 5, media: [
    { media_url: '/before.png', media_stage: 'BEFORE' }, { mediaUrl: '/during.mp4', mediaStage: 'DURING', mediaType: 'VIDEO' }, { media_url: '/after.png', media_stage: 'AFTER' },
  ], reviews: [{ reviewResult: 'APPROVED', reviewedByName: 'An', reviewedAt: '2026-11-22' }] })
  assert.equal(log.treatment_log_id, 5)
  assert.deepEqual(log.media.map(m => m.media_stage), ['BEFORE', 'DURING', 'AFTER'])
  assert.equal(log.media[1].media_type, 'VIDEO')
  assert.equal(log.reviews[0].review_result, 'APPROVED')
  assert.equal(log.reviews[0].reviewed_by_name, 'An')
  assert.deepEqual(normalizers.normalizeTreatment({ media: null }).media, [])
})

test('WF06 uses issue links without scans and bounds legacy discovery to five pages', async () => {
  let calls = 0
  const api = service({ get: async () => { calls++; return { data: { data: Array.from({ length: 20 }, (_, id) => ({ issue_id: 99, consultation_id: id + 1 })), pagination: { page: calls, total: 2000, totalPages: 100, pageSize: 20 } } } } })
  const direct = await api.consultations(normalizers.normalizeIssue({ issue_id: 1, consultation_id: 7 }))
  assert.equal(calls, 0)
  assert.equal(direct.items[0].consultation_id, 7)
  const fallback = await api.consultations(normalizers.normalizeIssue({ issue_id: 1 }))
  assert.equal(calls, 5)
  assert.equal(fallback.truncated, true)
})

test('WF06 exposes only read services and reads wrapped/direct entities safely', async () => {
  const calls = []
  const api = service({ get: async url => {
    calls.push(url)
    if (url === '/api/issues/1') return { data: { data: { issue_id: 1, status: 'RESOLVED' } } }
    if (url === '/api/consultations/7') return { data: { consultationId: 7, issueId: 1, expert: { fullName: 'An' } } }
    if (url.endsWith('/treatments')) return { data: { data: [{ treatment_log_id: 3 }] } }
    return { data: { data: [], pagination: { total: 0 } } }
  } })
  assert.deepEqual(Object.keys(api).sort(), ['consultation', 'consultations', 'detail', 'list', 'treatments'])
  assert.equal((await api.detail(1)).status, 'RESOLVED')
  assert.equal((await api.consultation(7)).expert_name, 'An')
  assert.equal((await api.treatments(7))[0].treatment_log_id, 3)
  assert.equal((await api.consultations(normalizers.normalizeIssue({ issue_id: 1 }))).items.length, 0)
  assert.equal(calls.length, 4)
})

test('WF06 discovery deduplicates repeated consultation records before choosing a dropdown', async () => {
  const api = service({ get: async () => ({ data: { data: Array.from({ length: 20 }, () => ({ issue_id: 1, consultation_id: 7 })), pagination: { totalPages: 2, total: 40 } } }) })
  const found = await api.consultations(normalizers.normalizeIssue({ issue_id: 1 }))
  assert.equal(found.items.length, 1)
  assert.equal(found.items[0].consultation_id, 7)
  assert.equal(found.truncated, false)
})
