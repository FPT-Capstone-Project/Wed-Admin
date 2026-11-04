import test from 'node:test'
import assert from 'node:assert/strict'
import { climateAxis } from '../src/features/dashboard/utils/climate-axis.utils.ts'

test('axis ticks are integers and enclose fractional measurements', () => {
  for (const values of [[24.9, 37.3], [82.1, 94.1], [-3.4, 2.7], [28.2666666667], [0], [null, NaN]]) {
    const { domain, ticks } = climateAxis(values)
    assert.ok(domain[1] > domain[0])
    assert.ok(ticks.every(Number.isInteger))
    for (const value of values.filter(value => value != null && Number.isFinite(value))) {
      assert.ok(domain[0] <= value && domain[1] >= value)
    }
  }
})
