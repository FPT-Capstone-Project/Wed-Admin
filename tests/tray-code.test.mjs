import test from 'node:test'
import assert from 'node:assert/strict'
import { shortTrayCode, trayFloorLabel } from '../src/shared/ui/tray-code.utils.ts'
test('short tray label uses existing location suffix, never invents coordinates', () => {
  assert.equal(shortTrayCode('ROOM-2026-FLOOR-01-R1-C1'), 'R1-C1')
  assert.equal(shortTrayCode('R12-C23'), 'R12-C23')
  assert.equal(shortTrayCode('T1-K01'), 'T1-K01')
  assert.equal(shortTrayCode('CUSTOM-LONG-TRAY'), 'CUSTOM-LONG-TRAY')
})

test('unplaced tray labels preserve floor context without guessing floor numbers', () => {
  assert.equal(trayFloorLabel({ code: 'ROOM1-F7-R1-C1', floorName: 'Tầng test 2', floorNumber: 2 }), 'Tầng test 2')
  assert.equal(trayFloorLabel({ code: 'R1-C1', floorNumber: 2 }), 'T2')
  assert.equal(trayFloorLabel({ code: 'ROOM1-F7-R1-C1', floorId: 8 }), 'Tầng ID 8')
  assert.equal(trayFloorLabel({ code: 'ROOM1-F7-R1-C1' }), 'Chưa rõ tầng')
  assert.equal(trayFloorLabel({ code: 'CUSTOM' }), 'Chưa rõ tầng')
})
