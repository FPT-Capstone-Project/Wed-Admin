import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
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


const missing = { response: { status: 404, data: { message: 'Paid cultivation session not found' } } }
const serverError = { response: { status: 500 } }
const optional = load('../src/shared/api/safe-fetch.ts', {
  './error': { extractApiError: error => ({ status: error.response?.status }) },
})
test('optional records absorb only 404; server and network failures propagate', async () => {
  assert.equal(await optional.fetchOptionalRecord(async () => { throw missing }), null)
  for (const error of [serverError, new Error('network')]) {
    await assert.rejects(optional.fetchOptionalRecord(async () => { throw error }), actual => actual === error)
  }
})
test('farm detail and inspections tolerate unpaid sessions while list errors propagate', async () => {
  let failure = missing
  const { farmApi } = load('../src/features/farm/api/farm.api.ts', {
    '../../../shared/api/client': { apiClient: { get: async () => { throw failure } } },
    '../../../shared/api/safe-fetch': optional,
  })
  assert.equal(await farmApi.getById(33), null)
  assert.equal(await farmApi.getSpawnInspections(33), null)
  failure = serverError
  await assert.rejects(farmApi.getSpawnInspections(33), error => error === serverError)
  await assert.rejects(farmApi.list(), error => error === serverError)
})
test('missing inspections preserve other sessions; primary list errors still propagate', async () => {
  let failure = null
  const { fetchCultivationBatches } = load('../src/features/cultivation/api/cultivation.api.ts', {
    '../../../shared/api/safe-fetch': optional,
    '../../farm/api/farm.api': { farmApi: { getSpawnInspections: async id => {
      if (id === 33) throw missing
      return { inspections: [{ inspection_id: 1 }] }
    } } },
    '../../sessions/api/admin-session.api': { fetchAllAdminCultivationSessionsDetailed: async () => {
      if (failure) throw failure
      return { complete: true, items: [{ session_id: 22 }, { session_id: 33 }] }
    } },
    '../../sessions/api/admin-session-mapper': { toCultivationSession: row => row },
    '../utils/cultivation-batches.utils': { buildCultivationBatches: input => input },
  })
  const result = await fetchCultivationBatches()
  assert.equal(result.sessions.length, 2)
  assert.equal(result.inspectionsBySessionId.get(22).length, 1)
  assert.equal(result.inspectionsBySessionId.has(33), false)
  failure = serverError
  await assert.rejects(fetchCultivationBatches(), error => error === serverError)
})
