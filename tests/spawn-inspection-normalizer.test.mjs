import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeFarmSession,
  normalizeInspection,
  normalizeInspectionHistory,
  normalizeImage,
} from '../src/features/farm/api/farm-normalizer.ts'

test('spawn inspection maps inspected_at to checked_at', () => {
  const inspection = normalizeInspection({
    inspection_id: 12,
    session_id: 4,
    stage: 'RESTING',
    total_checked: 9,
    condition: 'NORMAL',
    inspected_at: '2026-11-01T08:00:00Z',
    inspected_by_name: 'Nhân viên A',
    images: [
      {
        image_id: 100,
        image_url: 'https://cdn/spawn-1.jpg',
        caption: 'Phôi ngày 1',
        created_at: '2026-11-01T08:01:00Z',
      },
    ],
  })

  assert.equal(inspection.checked_at, '2026-11-01T08:00:00Z')
  assert.equal(inspection.inspected_by_name, 'Nhân viên A')
  assert.equal(inspection.stage, 'RESTING')
  assert.equal(inspection.total_checked, 9)
  assert.equal(inspection.images.length, 1)
  assert.equal(inspection.images[0].url, 'https://cdn/spawn-1.jpg')
  // `secure_url` phải fallback về `image_url` để ảnh hiển thị được.
  assert.equal(inspection.images[0].secure_url, 'https://cdn/spawn-1.jpg')
})

test('checked_at wins over inspected_at when both are present', () => {
  const inspection = normalizeInspection({
    inspection_id: 1,
    checked_at: '2026-11-02T08:00:00Z',
    inspected_at: '2026-11-01T08:00:00Z',
  })

  assert.equal(inspection.checked_at, '2026-11-02T08:00:00Z')
})

test('image normalizer accepts a plain string url', () => {
  const image = normalizeImage('https://cdn/plain.jpg')

  assert.equal(image.url, 'https://cdn/plain.jpg')
  assert.equal(image.secure_url, 'https://cdn/plain.jpg')
})

test('image normalizer keeps secure_url when the API provides it', () => {
  const image = normalizeImage({
    image_id: 5,
    url: 'http://cdn/a.jpg',
    secure_url: 'https://cdn/a.jpg',
  })

  assert.equal(image.url, 'http://cdn/a.jpg')
  assert.equal(image.secure_url, 'https://cdn/a.jpg')
})

test('inspection history normalizes the aggregate totals', () => {
  const history = normalizeInspectionHistory({
    session_id: 4,
    inspections: [{ inspection_id: 1, inspected_at: '2026-11-01T08:00:00Z' }],
    totalChecked: 9,
    normalQuantity: 8,
    warningQuantity: 1,
    abnormalQuantity: 0,
    replacementQuantity: 0,
  })

  assert.equal(history.session_id, 4)
  assert.equal(history.total_checked, 9)
  assert.equal(history.normal_quantity, 8)
  assert.equal(history.warning_quantity, 1)
  assert.equal(history.inspections.length, 1)
})

test('farm session normalizes harvest date aliases', () => {
  const session = normalizeFarmSession({
    session_id: 4,
    status: 'CULTIVATING',
    harvest_date: '2026-11-20T00:00:00Z',
    spawn_issued: 9,
    last_inspected_at: '2026-11-01T08:00:00Z',
  })

  assert.equal(session.session_id, 4)
  assert.equal(session.status, 'CULTIVATING')
  assert.equal(session.expected_harvest_date, '2026-11-20T00:00:00Z')
  assert.equal(session.spawn_issued, 9)
  assert.equal(session.last_inspected_at, '2026-11-01T08:00:00Z')
})
