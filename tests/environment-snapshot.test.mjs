import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ENVIRONMENT_SNAPSHOT_KEY, clearEnvironmentSnapshot, environmentSessionRevision,
  readEnvironmentSnapshot, saveEnvironmentSnapshot,
} from '../src/features/dashboard/utils/environment-history-snapshot.ts'

const store = new Map()
globalThis.localStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
  removeItem: key => store.delete(key),
}
const now = Date.now()
const data = { from: now - 86400000, to: now, bucketMs: 900000, refreshAfterMs: 300000, floors: [{ floorId: 1, floorName: 'Tầng 1', thresholds: null, points: [{ timestamp: now - 900000, temperature: 25, humidity: 85 }] }] }

test('restores the last valid drawing and its original update timestamp, including stale snapshots', () => {
  saveEnvironmentSnapshot(data, environmentSessionRevision(), now - 600000)
  assert.deepEqual(readEnvironmentSnapshot(now), { savedAt: now - 600000, data })
  assert.equal(readEnvironmentSnapshot(now + 6 * 3600000), undefined)
})

test('rejects corrupt, future, expired and invalid chart snapshots', () => {
  for (const raw of ['invalid JSON', 'null', JSON.stringify({ savedAt: now + 1, data }), JSON.stringify({ savedAt: now - 6 * 3600000, data }), JSON.stringify({ savedAt: now, data: { ...data, floors: [{}] } })]) {
    store.set(ENVIRONMENT_SNAPSHOT_KEY, raw)
    assert.equal(readEnvironmentSnapshot(now), undefined)
  }
})

test('logout removes the saved drawing and prevents a late response from saving it again', () => {
  const revision = environmentSessionRevision()
  saveEnvironmentSnapshot(data, revision, now)
  clearEnvironmentSnapshot()
  assert.equal(store.has(ENVIRONMENT_SNAPSHOT_KEY), false)
  saveEnvironmentSnapshot(data, revision, now)
  assert.equal(store.has(ENVIRONMENT_SNAPSHOT_KEY), false)
  saveEnvironmentSnapshot(data, environmentSessionRevision(), now)
  assert.deepEqual(readEnvironmentSnapshot(now)?.data, data)
})

test('storage errors never interrupt query rendering or logout', () => {
  const storage = globalThis.localStorage
  globalThis.localStorage = { getItem() { throw Error('blocked') }, setItem() { throw Error('quota') }, removeItem() { throw Error('blocked') } }
  try {
    assert.equal(readEnvironmentSnapshot(), undefined)
    assert.doesNotThrow(() => saveEnvironmentSnapshot(data, environmentSessionRevision()))
    assert.doesNotThrow(() => clearEnvironmentSnapshot())
  } finally { globalThis.localStorage = storage }
})
