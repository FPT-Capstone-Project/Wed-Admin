/**
 * Utility gộp ảnh 2 giai đoạn của 1 phiên — thuần (không side-effect).
 *
 * ⚠ Tách khỏi `types/session-gallery.types.ts` để file type chỉ chứa
 *   **shape** ⇒ dễ đọc, dễ import, không kéo theo logic.
 *
 * ⚠ Xem `types/session-gallery.types.ts` để hiểu vì sao cần gộp 2 nguồn.
 */
import type { SpawnInspection } from '../../farm/types/farm.types'
import type {
  SessionGalleryPhase,
  SessionGalleryPhoto,
  SessionGalleryStats,
} from '../types/session-gallery.types'
import type { DailyInspection } from '../types/session-inspection.types'

/**
 * Gộp 2 nguồn ảnh thành 1 danh sách **sắp xếp theo thời gian tăng dần**.
 *
 * ⚠ Sắp xếp **tăng dần** (cũ → mới) vì thư viện ảnh là **dòng thời gian**
 *   của cả vòng đời ⇒ người dùng lướt từ lúc nhận phôi tới lúc thu hoạch.
 *
 * ⚠ Ảnh không có mốc thời gian ⇒ đặt cuối danh sách thay vì đầu, để không
 *   làm lệch phần đầu timeline (giai đoạn 1 luôn có mốc thời gian).
 */
export function buildSessionGallery(
  spawnInspections: readonly SpawnInspection[] = [],
  dailyInspections: readonly DailyInspection[] = [],
): SessionGalleryPhoto[] {
  const photos: SessionGalleryPhoto[] = []

  for (const inspection of spawnInspections) {
    const takenAt = inspection.checked_at ?? inspection.created_at ?? null
    for (const image of inspection.images ?? []) {
      const url = image.secure_url ?? image.url
      if (!url) continue
      photos.push({
        sourceUrl: `spawn:${inspection.inspection_id}:${image.image_id ?? url}`,
        url,
        caption: image.caption ?? null,
        takenAt,
        phase: 'SPAWN',
        inspectionId: inspection.inspection_id ?? null,
        trayLabel: null,
      })
    }
  }

  for (const inspection of dailyInspections) {
    const trayLabel = inspection.tray_code ?? inspection.tray_name ?? null
    for (const image of inspection.images ?? []) {
      const url = image.image_url
      if (!url) continue
      photos.push({
        sourceUrl: `tray:${inspection.inspection_id}:${image.image_id ?? url}`,
        url,
        caption: image.caption ?? null,
        takenAt: inspection.inspection_date ?? null,
        phase: 'TRAY',
        inspectionId: inspection.inspection_id ?? null,
        trayLabel,
      })
    }
  }

  return photos.sort((a, b) => compareTakenAt(a.takenAt, b.takenAt))
}

/**
 * So sánh 2 mốc thời gian — ảnh **không có** mốc luôn nằm cuối.
 *
 * ⚠ Không dùng `Date.parse` trực tiếp vì chuỗi không hợp lệ cho `NaN` ⇒
 *   so sánh `NaN` luôn cho `false` ⇒ thứ tự không ổn định giữa các lần render.
 */
function compareTakenAt(a: string | null, b: string | null): number {
  const aTime = parseTimestamp(a)
  const bTime = parseTimestamp(b)
  if (aTime === null && bTime === null) return 0
  if (aTime === null) return 1
  if (bTime === null) return -1
  return aTime - bTime
}

/** Parse ISO → epoch ms; `null` nếu không hợp lệ. */
function parseTimestamp(value: string | null): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Tính thống kê thư viện ảnh (dùng cho header của modal). */
export function summarizeSessionGallery(
  photos: readonly SessionGalleryPhoto[],
  spawnInspectionCount: number,
  dailyInspectionCount: number,
): SessionGalleryStats {
  let spawnCount = 0
  let trayCount = 0
  for (const photo of photos) {
    if (photo.phase === 'SPAWN') spawnCount += 1
    else trayCount += 1
  }

  return {
    total: photos.length,
    spawnCount,
    trayCount,
    inspectionCount: spawnInspectionCount + dailyInspectionCount,
  }
}

/** Lọc ảnh theo giai đoạn — `null` = không lọc. */
export function filterGalleryByPhase(
  photos: readonly SessionGalleryPhoto[],
  phase: SessionGalleryPhase | 'ALL',
): SessionGalleryPhoto[] {
  if (phase === 'ALL') return [...photos]
  return photos.filter((photo) => photo.phase === phase)
}
