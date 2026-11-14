import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const cache = new Map()
async function load(file) {
  const path = resolve(file)
  if (cache.has(path)) return cache.get(path)
  let source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
  for (const match of [...source.matchAll(/from ['"](\.[^'"]+)['"]/g)]) {
    const url = await load(resolve(dirname(path), `${match[1]}.ts`))
    source = source.replace(match[0], `from '${url}'`)
  }
  const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  cache.set(path, url)
  return url
}
const root = new URL('../src/features/sessions/', import.meta.url)
const { normalizeAdminSession } = await import(await load(new URL('api/admin-session-normalizer.ts', root).pathname.replace(/^\/(\w:)/, '$1')))
const { normalizeSession } = await import(await load(new URL('api/session-normalizer.ts', root).pathname.replace(/^\/(\w:)/, '$1')))
const { resolveSessionProgress, formatSessionProgress } = await import(await load(new URL('utils/session-progress.utils.ts', root).pathname.replace(/^\/(\w:)/, '$1')))
const { summarizeSessions, resolveSessionPhase } = await import(await load(new URL('utils/session-state.utils.ts', root).pathname.replace(/^\/(\w:)/, '$1')))

test('both normalizers preserve operational activity and biological stages', () => {
  for (const normalize of [normalizeAdminSession, normalizeSession]) {
    for (const status of ['ACTIVE', 'IN_PROGRESS', 'SPAWN_RESTING', 'MYCELIAL_DEVELOPMENT']) {
      const result = normalize({ status, stage: 'RUNNING', progressPercent: 0 })
      assert.equal(result.status, 'CULTIVATING')
      assert.equal(result.current_stage, 'RUNNING')
      assert.equal(resolveSessionProgress(result.progress_percent, result.status, result.current_stage), 0)
    }
  }
})
test('latest tray stage overrides an older session stage without choosing by biological rank', () => {
  const result = normalizeAdminSession({ status: 'ACTIVE', stage: 'MATURATION', updated_at: '2026-11-01',
    trays: [{ stage: 'SPAWN_RESTING', updated_at: '2026-11-02' }] })
  assert.equal(result.current_stage, 'SPAWNING')
  assert.equal(result.growth_status, 'SPAWNING')
})
test('progress never infers percentages from stage or lifecycle status', () => {
  for (const status of ['PENDING', 'CULTIVATING', 'COMPLETED', 'CANCELLED']) {
    for (const stage of ['SPAWNING', 'RUNNING', 'PINNING', 'MATURATION']) {
      assert.equal(resolveSessionProgress(0, status, stage), 0)
      assert.equal(resolveSessionProgress(38, status, stage), 38)
    }
  }
  assert.equal(resolveSessionPhase(null, 'CULTIVATING'), null)
})
test('KPI categories are disjoint and cover all sessions including completed', () => {
  const summary = summarizeSessions(['PENDING', 'CULTIVATING', 'CANCELLED', 'COMPLETED'].map(status => ({ status })))
  assert.deepEqual(summary, { total: 4, active: 1, waiting: 1, cancelled: 1, completed: 1 })
  assert.equal(summary.active + summary.waiting + summary.cancelled + summary.completed, summary.total)
})

const { resolveFarmGrowth } = await import(await load(new URL('utils/farm-growth.utils.ts', root).pathname.replace(/^\/(\w:)/, '$1')))
test('new spawn inspections update stage without resetting cultivation progress', () => {
  const progressHistory = [{ current_stage: 'PINNING', progress_percent: '50', updated_at: '2026-11-12T10:00:00Z' }]
  const observations = [{ stage: 'MYCELIAL_DEVELOPMENT', checked_at: '2026-11-13T10:00:00Z', progress_percent: 0 }]
  assert.deepEqual(resolveFarmGrowth({ progressHistory, observations }), {
    stage: 'RUNNING', progress: 50, updatedAt: '2026-11-13T10:00:00Z',
  })
})

test('only cultivation_progress supplies percentage, never tray or spawn observations', () => {
  assert.equal(resolveFarmGrowth({
    progressHistory: [],
    observations: [{ stage: 'RESTING', progress_percent: 90, growth_progress: 90 }],
  }).progress, null)
})

test('latest cultivation record with a real percentage wins independently of stage and input order', () => {
  const progressHistory = [
    { current_stage: 'PINNING', progress_percent: 75, updated_at: '2026-11-12' },
    { current_stage: 'MYCELIAL_DEVELOPMENT', progress_percent: 0, updated_at: '2026-11-13' },
    { current_stage: 'MATURATION', updated_at: '2026-11-14' },
  ]
  for (const records of [progressHistory, [...progressHistory].reverse()]) {
    const result = resolveFarmGrowth({ progressHistory: records })
    assert.equal(result.stage, 'MATURATION')
    assert.equal(result.progress, 0)
  }
})

test('actual zero percentages survive pre-assignment stages and initialization', () => {
  for (const stage of ['SPAWN_RESTING', 'MYCELIAL_DEVELOPMENT']) {
    assert.equal(resolveFarmGrowth({ progressHistory: [{ current_stage: stage, progress_percent: 0 }] }).progress, 0)
  }
  assert.deepEqual(resolveFarmGrowth({ progressHistory: [{
    current_stage: 'FRUITING_INITIATION', progress_percent: 0,
    description: 'Cultivation started after tray assignment',
  }] }), { stage: null, progress: 0, updatedAt: null })
})

test('missing percentages remain unknown instead of zero, and format as an em dash', () => {
  for (const value of [null, undefined, '', '  ', 'invalid', NaN, Infinity]) {
    assert.equal(resolveSessionProgress(value), null)
    assert.equal(formatSessionProgress(value), '\u2014')
  }
  assert.equal(formatSessionProgress(0), '0%')
  assert.equal(formatSessionProgress('37.5'), '37.5%')
  assert.deepEqual(resolveFarmGrowth({ progressHistory: [] }), { stage: null, progress: null, updatedAt: null })
})

test('a percentage does not require a recognized biological stage', () => {
  assert.equal(resolveFarmGrowth({ progressHistory: [{ current_stage: 'UNKNOWN', progress_percent: '37.5' }] }).progress, 37.5)
})

test('session status can provide a stage without fabricating a percentage', () => {
  assert.deepEqual(resolveFarmGrowth({ progressHistory: [], sessionStatus: 'MYCELIAL_DEVELOPMENT' }), {
    stage: 'RUNNING', progress: null, updatedAt: null,
  })
})
