import test from 'node:test'
import assert from 'node:assert/strict'
import { shortTrayCode } from '../src/shared/ui/tray-code.utils.ts'
test('short tray label uses existing location suffix, never invents coordinates', () => {
  assert.equal(shortTrayCode('ROOM-2026-FLOOR-01-R1-C1'), 'R1-C1')
  assert.equal(shortTrayCode('R12-C23'), 'R12-C23')
  assert.equal(shortTrayCode('T1-K01'), 'T1-K01')
  assert.equal(shortTrayCode('CUSTOM-LONG-TRAY'), 'CUSTOM-LONG-TRAY')
})
