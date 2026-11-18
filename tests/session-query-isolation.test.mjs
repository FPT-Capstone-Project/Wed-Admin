import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { QueryClient, QueryObserver, keepPreviousData } from '@tanstack/react-query'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(relativePath, dependencies) {
  const cache = new Map()
  function moduleAt(filename) {
    if (cache.has(filename)) return cache.get(filename)
    const exports = {}
    cache.set(filename, exports)
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    runInNewContext(code, {
      exports, console, Date, Map, Set, Promise,
      require: id => Object.hasOwn(dependencies, id) ? dependencies[id]
        : id.startsWith('.') ? moduleAt(resolve(dirname(filename), `${id}.ts`)) : require(id),
    })
    return exports
  }
  return moduleAt(fileURLToPath(new URL(relativePath, import.meta.url)))
}

test('admin list and detail use only their primary endpoint even when history APIs would fail', async () => {
  const calls = []
  const row = { session_id: 22, status: 'COMPLETED', current_stage: 'MATURATION', progress_percent: 20 }
  const api = load('../src/features/sessions/api/admin-session.api.ts', {
    '../../../shared/api/client': { apiClient: { get: async url => {
      calls.push(url)
      if (url === '/api/cultivation-sessions/admin') return {
        data: { data: [row], pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 } },
      }
      if (url === '/api/cultivation-sessions/admin/22') return { data: { data: row } }
      throw new Error('History API unavailable')
    } } },
  })
  const list = await api.fetchAdminCultivationSessions()
  const detail = await api.fetchAdminCultivationSession(22)
  assert.equal(list.items.length, 1)
  assert.equal(list.items[0].progress_percent, 20)
  assert.equal(detail.session_id, 22)
  assert.deepEqual(calls, ['/api/cultivation-sessions/admin', '/api/cultivation-sessions/admin/22'])
})

test('floor metadata reselects cached IoT records without refetching either network scope', async () => {
  const calls = { newest: 0, chart: 0 }
  const records = [{ floor_id: 1, floor_number: 1, period_start: '2026-11-16T03:00:00Z' }]
  const hooks = load('../src/features/sessions/hooks/useSessionEnvironmentHistory.ts', {
    '@tanstack/react-query': { useQuery: options => options, keepPreviousData },
    '../api/session-environment-history.api': {
      fetchNewestSessionEnvironmentRecords: async () => { calls.newest++; return { records } },
      fetchAllSessionEnvironmentRecords: async () => { calls.chart++; return records },
    },
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  for (const kind of ['newest', 'chart']) {
    const optionsFor = (floorId, label) => {
      const scope = { floorIds: new Set([floorId]), floorNumberByFloorId: new Map([[floorId, 1]]) }
      return kind === 'newest' ? hooks.useNewestSessionEnvironmentRecords(22, scope)
        : hooks.useSessionEnvironmentChart(22, '1h', new Map([[floorId, label]]), null, scope)
    }
    const observer = new QueryObserver(client, optionsFor(1, 'Tầng 1'))
    const unsubscribe = observer.subscribe(() => {})
    await observer.refetch()
    assert.equal(calls[kind], 1)
    const key = observer.options.queryKey
    observer.setOptions(optionsFor(2, 'Tầng khác'))
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(observer.options.queryKey, key)
    assert.equal(calls[kind], 1)
    assert.equal(observer.getCurrentResult().data.length, 0)
    unsubscribe()
    observer.destroy()
  }
  assert.equal(hooks.useNewestSessionEnvironmentRecords(null).enabled, false)
  assert.equal(hooks.useSessionEnvironmentChart(null).enabled, false)
  assert.equal(hooks.useNewestSessionEnvironmentRecords(22, undefined, { enabled: false }).enabled, false)
  client.clear()
})
