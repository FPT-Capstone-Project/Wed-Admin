import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTrayLayout } from '../src/features/rooms/utils/tray-layout.utils.ts'
import { toUiTray } from '../src/types/cultivation.ts'

const apiTray = (overrides = {}) => ({
  tray_id: 1, room_id: 1, tray_code: 'ROOM1-F1-R1-C1', status: 'AVAILABLE',
  floor_id: 5, floor_number: 1, floor_name: 'Tầng test 1', position_id: 10,
  row_number: 1, column_number: 1, ...overrides,
})
const tray = overrides => toUiTray(apiTray(overrides))
const floor = (id, number, totalRows = null, totalColumns = null) => ({
  floor_id: id, room_id: 1, floor_number: number, floor_name: `Tầng test ${number}`,
  total_rows: totalRows, total_columns: totalColumns,
})

test('mapper retains API identity, position and nullable coordinates', () => {
  const mapped = tray({ position_id: 42, row_number: 2, column_number: 3 })
  assert.deepEqual([mapped.floorId, mapped.floorNumber, mapped.floorName, mapped.positionId, mapped.rowNumber, mapped.columnNumber],
    [5, 1, 'Tầng test 1', 42, 2, 3])
  const missing = tray({ floor_id: null, floor_number: null, floor_name: null, position_id: null, row_number: null, column_number: null })
  assert.deepEqual([missing.floorId, missing.floorNumber, missing.floorName, missing.positionId, missing.rowNumber, missing.columnNumber],
    [null, null, null, null, null, null])
})

test('floor_id is independent of F and floor_number; API coordinates override the code', () => {
  const result = buildTrayLayout([tray({ tray_code: 'ROOM1-F999-R9-C9', row_number: 2, column_number: 3 })])
  assert.equal(result.grids[0].floorId, 5)
  assert.equal(result.grids[0].floorNumber, 1)
  assert.equal(result.grids[0].label, 'Tầng test 1')
  assert.deepEqual(result.grids[0].cells.map(c => [c.row, c.column]), [[2, 3]])
  assert.equal(result.unplaced.length, 0)
})

test('two floors sharing R/C produce separate grids ordered by floor_number', () => {
  const input = [tray({ floor_id: 2, floor_number: 2, floor_name: 'Tầng test 2', tray_id: 2 }),
    tray({ floor_id: 5, floor_number: 1, tray_id: 1 })]
  const copy = structuredClone(input)
  const result = buildTrayLayout(input)
  assert.deepEqual(result.grids.map(g => g.floorId), [5, 2])
  assert.ok(result.grids.every(g => g.cells.length === 1))
  assert.deepEqual(input, copy)
})

test('only genuine duplicate positions within the same floor are unplaced', () => {
  const result = buildTrayLayout([tray({ tray_id: 1 }), tray({ tray_id: 2 }),
    tray({ tray_id: 3, row_number: 2 }), tray({ tray_id: 4, floor_id: 8, floor_number: 2 })])
  assert.deepEqual(result.unplaced.map(t => t.id), ['1', '2'])
  assert.deepEqual(result.grids.find(g => g.floorId === 5).cells.map(c => c.tray.id), ['3'])
  assert.ok(result.grids.find(g => g.floorId === 5).conflicts.some(c => c.row === 1 && c.column === 1))
  assert.equal(result.grids.find(g => g.floorId === 8).cells.length, 1)
})

test('explicitly null position or floor stays unplaced even with a parseable code', () => {
  const result = buildTrayLayout([tray({ tray_id: 1, position_id: null }),
    tray({ tray_id: 2, floor_id: null }), tray({ tray_id: 3, row_number: null, column_number: null, tray_code: 'CUSTOM' })])
  assert.equal(result.unplaced.length, 3)
  assert.equal(result.grids.reduce((n, g) => n + g.cells.length, 0), 0)
  assert.equal(result.unplacedGroups.find(g => g.floorId == null).label, 'Chưa gán tầng')
})

test('legacy R/C fallback never infers floor_id from F and never overwrites partial API coordinates', () => {
  const result = buildTrayLayout([
    tray({ tray_id: 1, position_id: undefined, row_number: null, column_number: null, tray_code: 'ROOM1-F77-R2-C3' }),
    tray({ tray_id: 2, floor_id: null, position_id: undefined, row_number: null, column_number: null }),
    tray({ tray_id: 3, row_number: 4, column_number: null }),
  ])
  assert.equal(result.grids[0].floorId, 5)
  assert.deepEqual(result.grids[0].cells.map(c => [c.row, c.column]), [[2, 3]])
  assert.deepEqual(result.unplaced.map(t => t.id), ['2', '3'])
})

test('custom codes with API coordinates are placed normally', () => {
  const result = buildTrayLayout([tray({ tray_code: 'CUSTOM-CODE', row_number: 3, column_number: 2 })])
  assert.equal(result.unplaced.length, 0)
  assert.deepEqual(result.grids[0].cells.map(c => [c.row, c.column]), [[3, 2]])
})

test('floor metadata supplies full dimensions, labels and empty floors without new requests', () => {
  const result = buildTrayLayout([tray()], [floor(5, 1, 3, 4), floor(8, 2, 2, 4)])
  assert.deepEqual(result.grids.map(g => [g.floorId, g.rows, g.columns, g.label]),
    [[5, 3, 4, 'Tầng test 1'], [8, 2, 4, 'Tầng test 2']])
  assert.equal(result.grids[1].cells.length, 0)
  const stale = buildTrayLayout([tray({ row_number: 4 })], [floor(5, 1, 2, 3)])
  assert.equal(stale.grids[0].rows, 4)
})
