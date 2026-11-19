import test from 'node:test'
import assert from 'node:assert/strict'
import { GROWTH_STAGE_LABELS, SESSION_WORKFLOW_LABELS, SESSION_PROGRESS_STAGE_DICTIONARY, SESSION_GROWTH_STAGE_DICTIONARY, SESSION_STATUS_DICTIONARY, MUSHROOM_GROWTH_PHASE_DICTIONARY, resolveGrowthPhase } from '../src/shared/i18n/status/session.ts'
import { translateProgressNote } from '../src/shared/i18n/progress-notes.ts'

test('four growth stages retain distinct exact labels in all shared dictionaries', () => {
  assert.deepEqual(GROWTH_STAGE_LABELS, {
    FRUITING_INITIATION: 'Kích thích ra quả thể', PINNING: 'Hình thành mầm nấm', YOUNG_FRUITING: 'Quả thể non', MATURATION: 'Trưởng thành',
  })
  for (const [key, label] of Object.entries(GROWTH_STAGE_LABELS)) {
    for (const dictionary of [SESSION_PROGRESS_STAGE_DICTIONARY, SESSION_GROWTH_STAGE_DICTIONARY, MUSHROOM_GROWTH_PHASE_DICTIONARY]) assert.equal(dictionary[key].label, label)
    assert.equal(resolveGrowthPhase(key, 'CULTIVATING'), key)
  }
})
test('spawn and session lifecycle labels match the supplied workflow vocabulary', () => {
  const expected = { PENDING: 'Chưa ủ tơ', RECEIVED: 'Phôi đã được tiếp nhận', SPAWN_RESTING: 'Đang ủ tơ', RESTING: 'Đang ủ tơ', MYCELIAL_DEVELOPMENT: 'Phát triển tơ', DEVELOPING: 'Phát triển tơ', INCUBATING: 'Ủ tơ', READY_FOR_CULTIVATION: 'Chờ gán khay', CULTIVATING: 'Đang trồng', HARVEST_READY: 'Sẵn sàng thu hoạch', HARVESTING: 'Đang thu hoạch', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy' }
  assert.deepEqual(SESSION_WORKFLOW_LABELS, expected)
  for (const [key, label] of Object.entries(expected)) {
    assert.equal(SESSION_STATUS_DICTIONARY[key].label, label)
    assert.equal(SESSION_PROGRESS_STAGE_DICTIONARY[key].label, label)
  }
})
test('maturation never implies harvest readiness; explicit lifecycle/flag takes precedence', () => {
  assert.equal(resolveGrowthPhase('MATURATION', 'CULTIVATING'), 'MATURATION')
  assert.equal(resolveGrowthPhase('MATURATION', 'CULTIVATING', true), 'HARVEST_READY')
  assert.equal(resolveGrowthPhase('MATURATION', 'HARVEST_READY'), 'HARVEST_READY')
  assert.equal(resolveGrowthPhase('MATURATION', 'HARVESTING'), 'HARVESTING')
  assert.equal(resolveGrowthPhase('MATURATION', 'COMPLETED', true), 'COMPLETED')
  assert.equal(resolveGrowthPhase('MATURATION', 'CANCELLED', true), 'CANCELLED')
  assert.equal(resolveGrowthPhase('RUNNING', 'READY_FOR_CULTIVATION'), 'READY_FOR_CULTIVATION')
})
test('system progress notes translate lifecycle aliases and all backend default messages', () => {
  for (const stage of ['SPAWN_RESTING', 'MYCELIAL_DEVELOPMENT', 'READY_FOR_CULTIVATION', 'RESTING', 'DEVELOPING']) assert.equal(translateProgressNote(`Spawn stage changed to ${stage}`), `Chuyển trạng thái phôi sang ${SESSION_WORKFLOW_LABELS[stage]}`)
  const messages = [
    ['Cultivation started after tray assignment', 'Bắt đầu trồng sau khi gán khay'],
    ['Spawn allocated after payment; awaiting farm acceptance', 'Đã cấp phôi sau thanh toán, chờ nông trại tiếp nhận'],
    ['Spawn has been placed on the assigned trays and fruiting initiation has started.', 'Phôi đã được đặt lên khay được gán và bắt đầu kích thích ra quả thể.'],
    ['Initial mushroom pins are appearing normally.', 'Mầm nấm ban đầu đang hình thành bình thường.'],
    ['Young fruiting bodies are developing normally.', 'Quả thể non đang phát triển bình thường.'],
    ['Mushrooms are approaching the expected mature condition and should be evaluated for harvest readiness.', 'Nấm đang đạt độ trưởng thành dự kiến, cần đánh giá điều kiện thu hoạch.'],
    ['Harvest readiness confirmed', 'Đã xác nhận đủ điều kiện thu hoạch'],
    ['Not ready for harvest', 'Chưa đủ điều kiện thu hoạch'],
    ['Awaiting sanitation after harvest handover', 'Chờ vệ sinh sau khi bàn giao thu hoạch'],
  ]
  for (const [source, target] of messages) assert.equal(translateProgressNote(source), target)
  assert.equal(translateProgressNote('Ghi chú của nhân viên'), 'Ghi chú của nhân viên')
  assert.equal(translateProgressNote(null), null)
})
