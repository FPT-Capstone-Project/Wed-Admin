import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const code = ts.transpileModule(readFileSync(new URL('../src/shared/ui/charts/useChartMotion.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
test('chart motion follows media preference and releases its change listener', () => {
  let listener
  let reduced = true
  let cleanup
  const media = { get matches() { return reduced },
    addEventListener: (_, callback) => { listener = callback },
    removeEventListener: (_, callback) => { assert.equal(callback, listener); listener = undefined },
  }
  const exports = {}
  runInNewContext(code, { exports, window: { matchMedia: () => media }, require: () => ({
    useSyncExternalStore: (subscribe, snapshot) => { cleanup = subscribe(() => {}); return snapshot() },
  }) })
  assert.equal(exports.useChartMotion(), false)
  assert.equal(typeof listener, 'function')
  cleanup()
  assert.equal(listener, undefined)
  reduced = false
  assert.equal(exports.useChartMotion(), true)
  cleanup()
})
