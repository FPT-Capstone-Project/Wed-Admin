import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTrayLayout } from '../src/features/rooms/utils/tray-layout.utils.ts'
const tray = (id, code, floorId = null) => ({ id, code, floorId })
test('physical rows and columns come from backend code, with separate floors', () => {
  const input = [tray('a', 'ROOM1-F7-R2-C4', 7), tray('b', 'ROOM1-F7-R1-C1', 7), tray('c', 'ROOM1-F8-R1-C1', 8)]
  const copy = structuredClone(input)
  const result = buildTrayLayout(input)
  assert.equal(result.grids.length, 2)
  assert.equal(result.grids[0].columns, 4)
  assert.deepEqual(result.grids[0].cells.map(c => [c.tray.id, c.row, c.column]), [['b', 1, 1], ['a', 2, 4]])
  assert.deepEqual(input, copy)
})
test('missing, conflicting and duplicate locations remain unplaced, not overlaid', () => {
  const input = [tray('a', 'CUSTOM'), tray('b', 'ROOM1-F7-R1-C1', 8), tray('c', 'ROOM1-F9-R1-C1'), tray('d', 'ROOM1-F9-R1-C1')]
  const result = buildTrayLayout(input)
  assert.equal(result.grids.length, 0)
  assert.equal(result.unplaced.length, 4)
})
