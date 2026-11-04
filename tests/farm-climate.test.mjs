import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeFarmClimate, climateThresholdsFromConfig } from '../src/features/rooms/utils/farm-climate.utils.ts'

const thresholds = { tempMin: 23, tempMax: 28, humidityMin: 80, humidityMax: 92 }
const floor = (temperature = 25, humidity = 85, limits = thresholds, floorName = 'Tầng 1') =>
  ({ temperature, humidity, thresholds: limits, floorName })

for (const metric of ['temperature', 'humidity']) {
  const point = value => metric === 'temperature' ? floor(value) : floor(25, value)
  const normal = metric === 'temperature' ? 25 : 85
  const warning = metric === 'temperature' ? 29 : 94
  const danger = metric === 'temperature' ? 35 : 99
  test(`${metric}: all within each floor's own thresholds`, () => {
    const result = summarizeFarmClimate([point(normal), floor(35, 60, { tempMin: 30, tempMax: 40, humidityMin: 50, humidityMax: 70 }, 'Tầng 2')], metric)
    assert.equal(result.tone, 'ok')
    assert.equal(result.label, metric === 'temperature' ? 'Ổn định' : 'Tối ưu')
    assert.equal(result.missingCount, 0)
  })
  test(`${metric}: warning`, () => {
    const result = summarizeFarmClimate([point(normal), point(warning)], metric)
    assert.equal(result.tone, 'warning')
    assert.equal(result.label, 'Có tầng lệch ngưỡng')
    assert.equal(result.details.length, 1)
  })
  test(`${metric}: danger outranks warning and average`, () => {
    const result = summarizeFarmClimate([point(normal), point(warning), point(danger)], metric)
    assert.equal(result.tone, 'danger')
    assert.equal(result.details.length, 1)
    assert.match(result.details[0], />/)
  })
  test(`${metric}: danger plus missing data`, () => {
    const result = summarizeFarmClimate([point(danger), point(null)], metric)
    assert.equal(result.tone, 'danger')
    assert.equal(result.value, danger)
    assert.match(result.coverageNote, /1\/2/)
  })
  test(`${metric}: all null and empty`, () => {
    for (const points of [[], [point(null), point(null)]]) {
      const result = summarizeFarmClimate(points, metric)
      assert.equal(result.tone, 'muted')
      assert.equal(result.value, null)
      assert.equal(result.label, 'Chưa đủ thông tin')
      assert.deepEqual(result.details, [])
    }
  })
  test(`${metric}: missing thresholds do not imply healthy`, () => {
    const result = summarizeFarmClimate([floor(25, 85, null)], metric)
    assert.equal(result.tone, 'muted')
    assert.equal(result.value, null)
    assert.equal(result.missingCount, 1)
  })
  test(`${metric}: partial data retains healthy badge with coverage note`, () => {
    const result = summarizeFarmClimate([point(normal), point(null)], metric)
    assert.equal(result.tone, 'ok')
    assert.equal(result.value, normal)
    assert.match(result.coverageNote, /1\/2/)
  })
  test(`${metric}: finite zero is data; NaN is missing`, () => {
    const result = summarizeFarmClimate([point(0), point(NaN)], metric)
    assert.equal(result.value, 0)
    assert.equal(result.tone, 'danger')
    assert.equal(result.missingCount, 1)
    assert.match(result.details[0], /</)
  })
}

test('adapter preserves existing one-sided bounds and rejects non-finite bounds', () => {
  assert.deepEqual(climateThresholdsFromConfig({ temperature_max: 28, humidity_min: NaN }), {
    tempMin: null, tempMax: 28, humidityMin: null, humidityMax: null,
  })
})

test('average includes finite readings lacking bounds when other floors can be assessed; input is unchanged', () => {
  const points = [floor(), floor(35, 95, null, 'Tầng 2')]
  const before = structuredClone(points)
  const result = summarizeFarmClimate(points, 'temperature')
  assert.equal(result.value, 30)
  assert.equal(result.tone, 'ok')
  assert.equal(result.missingCount, 1)
  assert.deepEqual(points, before)
})
