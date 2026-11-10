import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

/**
 * Test API layer của nhóm **Environment History**.
 *
 * ⚠ Module `session-environment-history.api.ts` có import runtime
 *   (`apiClient`, `axios`) ⇒ không import trực tiếp bằng Node (ESM cần đuôi
 *   file) ⇒ dùng cùng pattern `loadApi` như `refresh-interceptor.test.mjs`:
 *   transpile sang CommonJS rồi nạp trong `vm` với dependency **tiêm vào**
 *   (axios client giả).
 */

const require = createRequire(import.meta.url)

function loadApi(relativePath, dependencies) {
  const filename = new URL(relativePath, import.meta.url)
  const source = readFileSync(filename, 'utf8')
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
    },
    target: ts.ScriptTarget.ES2022,
  }).outputText
  const exports = {}
  runInNewContext(code, {
    exports,
    require: (id) =>
      Object.hasOwn(dependencies, id) ? dependencies[id] : require(id),
    console,
    Map,
    Set,
    Date,
    URL,
    Promise,
  })
  return exports
}

/** Tạo `apiClient` giả trả về payload đã cấu hình. */
function createFakeClient(responder) {
  const calls = []
  return {
    calls,
    get: async (url, config) => {
      calls.push({ url, params: config?.params })
      const result = await responder(url, config)
      if (result instanceof Error) throw result
      return { data: result }
    },
  }
}

/** Lỗi HTTP giả có `response.status` (để `isNotFoundError` bắt được). */
function httpError(status) {
  const error = new Error(`HTTP ${status}`)
  error.response = { status }
  error.status = status
  return error
}

function loadEnvironmentApi(responder) {
  const apiClient = createFakeClient(responder)
  const api = loadApi(
    '../src/features/sessions/api/session-environment-history.api.ts',
    {
      '../../../shared/api/client': { apiClient },
      '../../../shared/api/list-response': {
        cleanQueryParams: (params) =>
          Object.fromEntries(
            Object.entries(params).filter(
              ([, value]) =>
                value !== undefined &&
                value !== null &&
                (typeof value !== 'string' || value.trim() !== ''),
            ),
          ),
      },
      '../../../shared/api/response-normalizer': {
        ensureObject: (value) =>
          value !== null &&
          typeof value === 'object' &&
          !Array.isArray(value)
            ? value
            : null,
      },
      '../../../shared/api/safe-fetch': {
        isNotFoundError: (error) => error?.response?.status === 404,
      },
    },
  )
  return { api, apiClient }
}

const PAGE = {
  page: 1,
  pageSize: 20,
  total: 2,
  totalPages: 1,
}

test('session history reads records from the `data` array and normalizes pagination', async () => {
  const { api, apiClient } = loadEnvironmentApi(async () => ({
    data: [
      {
        session_id: 1,
        floor_id: 2,
        period_start: '2026-01-01T10:00:00Z',
        period_end: '2026-01-01T10:10:00Z',
        growth_stage: 'PINNING',
        temperature_avg: 25,
        humidity_avg: 82,
      },
    ],
    pagination: PAGE,
  }))

  const result = await api.fetchSessionEnvironmentHistory(7, {
    page: 1,
    pageSize: 20,
  })

  assert.equal(apiClient.calls[0].url, '/api/environment-history/sessions/7')
  assert.deepEqual(apiClient.calls[0].params, { page: 1, pageSize: 20 })
  assert.equal(result.records.length, 1)
  assert.equal(result.records[0].floor_id, 2)
  assert.equal(result.records[0].period_start, '2026-01-01T10:00:00Z')
  assert.equal(result.records[0].temperature_avg, 25)
  assert.equal(result.records[0].humidity_avg, 82)
  assert.equal(result.records[0].growth_stage, 'PINNING')
  assert.equal(result.pagination.total, 2)
  assert.equal(result.pagination.totalPages, 1)
})

test('session history forwards the from/to range as ISO timestamps', async () => {
  const { api, apiClient } = loadEnvironmentApi(async () => ({
    data: [],
    pagination: PAGE,
  }))

  const from = Date.parse('2026-01-01T10:00:00Z')
  const to = Date.parse('2026-01-01T11:00:00Z')
  await api.fetchSessionEnvironmentHistory(3, {
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
  })

  assert.equal(apiClient.calls[0].params.from, '2026-01-01T10:00:00.000Z')
  assert.equal(apiClient.calls[0].params.to, '2026-01-01T11:00:00.000Z')
})

test('session history keeps a missing metric as null instead of 0', async () => {
  const { api } = loadEnvironmentApi(async () => ({
    data: [
      {
        session_id: 1,
        floor_id: 1,
        period_start: '2026-01-01T10:00:00Z',
        period_end: '2026-01-01T10:10:00Z',
        growth_stage: 'UNKNOWN',
        temperature_avg: null,
        humidity_avg: 80,
      },
    ],
    pagination: PAGE,
  }))

  const result = await api.fetchSessionEnvironmentHistory(1)
  assert.equal(result.records[0].temperature_avg, null)
  assert.equal(result.records[0].humidity_avg, 80)
})

test('session history returns null on 404 so the UI shows an empty state', async () => {
  const { api } = loadEnvironmentApi(async () => httpError(404))
  assert.equal(await api.fetchSessionEnvironmentHistory(999), null)
})

test('latest reading unwraps the `data` object', async () => {
  const { api, apiClient } = loadEnvironmentApi(async () => ({
    data: {
      session_id: 1,
      floor_id: 1,
      period_start: '2026-01-01T10:00:00Z',
      period_end: '2026-01-01T10:10:00Z',
      growth_stage: 'MATURATION',
      temperature_avg: 25,
      humidity_avg: 82,
    },
  }))

  const result = await api.fetchLatestSessionEnvironment(4)
  assert.equal(
    apiClient.calls[0].url,
    '/api/environment-history/sessions/4/latest',
  )
  assert.equal(result.temperature_avg, 25)
  assert.equal(result.growth_stage, 'MATURATION')
})

test('latest reading returns null when no bucket has been saved', async () => {
  const { api } = loadEnvironmentApi(async () => ({ data: null }))
  assert.equal(await api.fetchLatestSessionEnvironment(4), null)
})

test('latest reading returns null on 404', async () => {
  const { api } = loadEnvironmentApi(async () => httpError(404))
  assert.equal(await api.fetchLatestSessionEnvironment(999), null)
})

test('unknown growth stages are rejected instead of being forced into a known one', () => {
  const { api } = loadEnvironmentApi(async () => ({ data: [] }))
  const record = api.normalizeEnvironmentRecord({
    session_id: 1,
    floor_id: 1,
    period_start: '2026-01-01T10:00:00Z',
    period_end: '2026-01-01T10:10:00Z',
    growth_stage: 'SOMETHING_NEW',
    temperature_avg: 25,
    humidity_avg: 82,
  })
  assert.equal(record.growth_stage, null)
})
