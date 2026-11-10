import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSessionGallery,
  filterGalleryByPhase,
  summarizeSessionGallery,
} from '../src/features/sessions/utils/session-gallery.utils.ts'

/** Tạo 1 lần kiểm tra phôi (giai đoạn 1) rút gọn. */
const spawnInspection = (inspectionId, checkedAt, images) => ({
  inspection_id: inspectionId,
  session_id: 1,
  total_checked: 10,
  normal_quantity: 10,
  warning_quantity: 0,
  abnormal_quantity: 0,
  condition: 'NORMAL',
  replacement_quantity: 0,
  notes: null,
  next_check_at: null,
  images,
  checked_at: checkedAt,
  created_at: checkedAt,
})

/** Tạo 1 lần kiểm tra khay (giai đoạn 2) rút gọn. */
const dailyInspection = (inspectionId, inspectionDate, images, trayCode = 'F2-TRAY-01') => ({
  inspection_id: inspectionId,
  session_tray_id: 31,
  tray_id: 21,
  tray_code: trayCode,
  tray_name: null,
  assignment_status: 'ACTIVE',
  inspection_date: inspectionDate,
  growth_stage: 'PINNING',
  growth_progress: 40,
  tray_condition: 'GOOD',
  mushroom_condition: 'NORMAL',
  notes: null,
  inspected_by: 7,
  inspected_by_name: 'Nhân viên',
  images,
})

test('gallery merges both phases and sorts ascending by time', () => {
  const photos = buildSessionGallery(
    [spawnInspection(1, '2026-11-01T08:00:00Z', [{ image_id: 100, url: 'https://cdn/spawn-1.jpg', caption: 'Phôi ngày 1' }])],
    [dailyInspection(2, '2026-11-05T09:00:00Z', [{ image_id: 200, image_url: 'https://cdn/tray-1.jpg', caption: 'Khay ngày 5' }])],
  )

  assert.equal(photos.length, 2)
  assert.equal(photos[0].phase, 'SPAWN')
  assert.equal(photos[0].url, 'https://cdn/spawn-1.jpg')
  assert.equal(photos[1].phase, 'TRAY')
  assert.equal(photos[1].url, 'https://cdn/tray-1.jpg')
  assert.equal(photos[1].trayLabel, 'F2-TRAY-01')
})

test('gallery skips images without a usable url', () => {
  const photos = buildSessionGallery(
    [spawnInspection(1, '2026-11-01T08:00:00Z', [{ image_id: 100, url: null }, { image_id: 101, url: 'https://cdn/ok.jpg' }])],
    [],
  )

  assert.equal(photos.length, 1)
  assert.equal(photos[0].url, 'https://cdn/ok.jpg')
})

test('gallery puts photos without a timestamp last', () => {
  const photos = buildSessionGallery(
    [spawnInspection(1, null, [{ image_id: 100, url: 'https://cdn/no-time.jpg' }])],
    [dailyInspection(2, '2026-11-05T09:00:00Z', [{ image_id: 200, image_url: 'https://cdn/tray-1.jpg' }])],
  )

  assert.equal(photos.length, 2)
  assert.equal(photos[0].phase, 'TRAY')
  assert.equal(photos[1].phase, 'SPAWN')
})

test('gallery sourceUrl is unique across phases even for identical urls', () => {
  const photos = buildSessionGallery(
    [spawnInspection(1, '2026-11-01T08:00:00Z', [{ image_id: 100, url: 'https://cdn/same.jpg' }])],
    [dailyInspection(2, '2026-11-05T09:00:00Z', [{ image_id: 100, image_url: 'https://cdn/same.jpg' }])],
  )

  assert.equal(photos.length, 2)
  assert.notEqual(photos[0].sourceUrl, photos[1].sourceUrl)
})

test('stats count photos and inspections per phase', () => {
  const photos = buildSessionGallery(
    [spawnInspection(1, '2026-11-01T08:00:00Z', [{ image_id: 100, url: 'https://cdn/a.jpg' }, { image_id: 101, url: 'https://cdn/b.jpg' }])],
    [dailyInspection(2, '2026-11-05T09:00:00Z', [{ image_id: 200, image_url: 'https://cdn/c.jpg' }])],
  )

  const stats = summarizeSessionGallery(photos, 1, 1)

  assert.equal(stats.total, 3)
  assert.equal(stats.spawnCount, 2)
  assert.equal(stats.trayCount, 1)
  assert.equal(stats.inspectionCount, 2)
})

test('filter by phase returns only matching photos', () => {
  const photos = buildSessionGallery(
    [spawnInspection(1, '2026-11-01T08:00:00Z', [{ image_id: 100, url: 'https://cdn/a.jpg' }])],
    [dailyInspection(2, '2026-11-05T09:00:00Z', [{ image_id: 200, image_url: 'https://cdn/c.jpg' }])],
  )

  assert.equal(filterGalleryByPhase(photos, 'SPAWN').length, 1)
  assert.equal(filterGalleryByPhase(photos, 'TRAY').length, 1)
  assert.equal(filterGalleryByPhase(photos, 'ALL').length, 2)
})

test('gallery handles empty inputs', () => {
  assert.deepEqual(buildSessionGallery(), [])
  assert.deepEqual(buildSessionGallery([], []), [])

  const stats = summarizeSessionGallery([], 0, 0)
  assert.equal(stats.total, 0)
  assert.equal(stats.inspectionCount, 0)
})
