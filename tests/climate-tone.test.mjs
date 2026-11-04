import test from 'node:test'
import assert from 'node:assert/strict'
import { getClimateTone, getClimateDirection } from '../src/features/rooms/utils/climate-tone.utils.ts'
import { evaluateTemperature, evaluateHumidity } from '../src/features/rooms/utils/tray-climate.utils.ts'
import { summarizeFarmClimate } from '../src/features/rooms/utils/farm-climate.utils.ts'
const thresholds = { tempMin: 25, tempMax: 31, humidityMin: 82, humidityMax: 87 }
for (const [metric, value, expected] of [
  ['temperature', 32.3, 'danger'], ['temperature', 28, 'ok'], ['temperature', 20, 'ok'],
  ['humidity', 94.1, 'ok'], ['humidity', 85, 'ok'], ['humidity', 80.1, 'danger'],
  ['temperature', null, 'muted'], ['humidity', null, 'muted'],
]) test(`${metric} ${value}: ${expected}`, () => {
  const evaluate = metric === 'temperature' ? evaluateTemperature : evaluateHumidity
  assert.equal(getClimateTone(metric, getClimateDirection(evaluate(value, thresholds))), expected)
  assert.equal(getClimateTone(metric, getClimateDirection(evaluate(value, null))), 'muted')
})
test('aggregate mushroom rule: red wins over green and missing; high humidity alone stays green', () => {
  const point = (temperature, humidity, floorName) => ({ temperature, humidity, floorName, thresholds })
  const points = [point(20, 94.1, 'A'), point(32.3, 80.1, 'B'), point(null, null, 'C')]
  for (const metric of ['temperature', 'humidity']) {
    const result = summarizeFarmClimate(points, metric)
    assert.equal(result.tone, 'danger')
    assert.equal(result.label, 'Có tầng vượt ngưỡng')
    assert.equal(result.missingCount, 1)
  }
  assert.equal(summarizeFarmClimate([points[0]], 'humidity').tone, 'ok')
  assert.equal(summarizeFarmClimate([points[0]], 'temperature').tone, 'ok')
})
