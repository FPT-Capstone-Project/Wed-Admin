import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeDailyInspection,
  normalizeDailyInspectionImage,
  normalizeDailyInspectionSession,
  normalizeDailyInspectionTray,
} from '../src/features/sessions/api/session-inspection-normalizer.ts'

test('normalizes a daily inspection with camelCase fields from BE', () => {
  const result = normalizeDailyInspection({
    inspectionId: 12,
    sessionTrayId: 31,
    trayId: 21,
    trayCode: 'F2-TRAY-01',
    assignmentStatus: 'ACTIVE',
    inspectionDate: '2026-11-05T09:00:00Z',
    growthStage: 'PINNING',
    growthProgress: 40,
    trayCondition: 'GOOD',
    mushroomCondition: 'NORMAL',
    notes: 'Nấm đều',
    inspectedBy: 7,
    inspectedByName: 'Nhân viên',
    images: [
      {
        imageId: 200,
        imageUrl: 'https://cdn/tray-1.jpg',
        caption: 'Khay ngày 5',
        uploadedAt: '2026-11-05T09:01:00Z',
      },
    ],
  })

  assert.equal(result.inspection_id, 12)
  assert.equal(result.session_tray_id, 31)
  assert.equal(result.tray_id, 21)
  assert.equal(result.tray_code, 'F2-TRAY-01')
  assert.equal(result.growth_stage, 'PINNING')
  assert.equal(result.growth_progress, 40)
  assert.equal(result.inspected_by_name, 'Nhân viên')
  assert.equal(result.images.length, 1)
  assert.equal(result.images[0].image_url, 'https://cdn/tray-1.jpg')
  assert.equal(result.images[0].caption, 'Khay ngày 5')
})

test('normalizes snake_case fields as fallback', () => {
  const result = normalizeDailyInspection({
    inspection_id: 5,
    session_tray_id: 31,
    inspection_date: '2026-11-05T09:00:00Z',
    growth_progress: 55,
    images: [],
  })

  assert.equal(result.inspection_id, 5)
  assert.equal(result.session_tray_id, 31)
  assert.equal(result.growth_progress, 55)
  assert.deepEqual(result.images, [])
})

test('coerces numeric strings to numbers', () => {
  const result = normalizeDailyInspection({
    inspection_id: '9',
    growth_progress: '65',
  })

  assert.equal(result.inspection_id, 9)
  assert.equal(result.growth_progress, 65)
})

test('returns empty image list when the inspection has no images', () => {
  const result = normalizeDailyInspection({ inspection_id: 1 })
  assert.deepEqual(result.images, [])
})

test('normalizes an image that only carries url', () => {
  const image = normalizeDailyInspectionImage({
    image_id: 3,
    url: 'https://cdn/plain.jpg',
  })

  assert.equal(image.image_id, 3)
  assert.equal(image.image_url, 'https://cdn/plain.jpg')
})

test('normalizes session context', () => {
  const session = normalizeDailyInspectionSession({
    session_id: 4,
    start_at: '2026-11-01T00:00:00Z',
    end_at: '2026-11-20T00:00:00Z',
    status: 'CULTIVATING',
  })

  assert.equal(session?.session_id, 4)
  assert.equal(session?.status, 'CULTIVATING')
})

test('normalizes tray context', () => {
  const tray = normalizeDailyInspectionTray({
    session_tray_id: 31,
    session_id: 4,
    tray_id: 21,
    assignment_status: 'ACTIVE',
    tray_code: 'F2-TRAY-01',
  })

  assert.equal(tray?.session_tray_id, 31)
  assert.equal(tray?.tray_id, 21)
  assert.equal(tray?.tray_code, 'F2-TRAY-01')
})

test('returns null context when the payload is missing', () => {
  assert.equal(normalizeDailyInspectionSession(undefined), null)
  assert.equal(normalizeDailyInspectionTray(null), null)
})
