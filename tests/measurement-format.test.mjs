import test from 'node:test'
import assert from 'node:assert/strict'
import { formatMeasurement, formatMeasurementDetails } from '../src/shared/utils/measurement-format.ts'

test('measurement formatting distinguishes missing values from zero and rounds to one decimal', () => {
  for (const value of [null, undefined, NaN, Infinity]) assert.equal(formatMeasurement(value), '—')
  assert.equal(formatMeasurement(0), '0.0')
  assert.equal(formatMeasurement(31.433333333333326), '31.4')
  assert.equal(formatMeasurement(-2.36), '-2.4')
})
test('tooltip formatting rounds measurements without rewriting floor names or counts', () => {
  assert.equal(formatMeasurementDetails('Tầng 2: 31.433333333333326°C > 31°C; 1/2 tầng'), 'Tầng 2: 31.4°C > 31.0°C; 1/2 tầng')
})
