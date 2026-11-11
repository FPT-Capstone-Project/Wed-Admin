/**
 * Từ điển trạng thái — **sự cố / bệnh hại** (issue & disease management).
 *
 * ⚠ Nguồn sự thật duy nhất cho:
 *   - Trạng thái ca bệnh (`issues.status`).
 *   - Mức độ nghiêm trọng (`issues.severity`).
 *   - Giai đoạn bằng chứng (`media_stage`).
 *   - Tình trạng khay/nấm khi kiểm tra (`condition`).
 */

import type { StatusDictionary, StatusPresentation } from './types'

/** Trạng thái ca bệnh. */
export type IssueStatusKey =
  | 'OPEN'
  | 'WAITING_EXPERT'
  | 'IN_PROGRESS'
  | 'MONITORING'
  | 'RESOLVED'

/** Mức độ nghiêm trọng. */
export type IssueSeverityKey = 'HIGH' | 'MEDIUM' | 'LOW'

/** Giai đoạn bằng chứng hiện trường (`media_stage`). */
export type MediaStageKey = 'BEFORE' | 'DURING' | 'AFTER'

/**
 * Trạng thái ca bệnh.
 *
 * ⚠ `OPEN` / `WAITING_EXPERT` = cần hành động (`warning`);
 *   `IN_PROGRESS` / `MONITORING` = đang xử lý (`info`);
 *   `RESOLVED` = đã xong (`success`).
 */
export const ISSUE_STATUS_DICTIONARY: Record<IssueStatusKey, StatusPresentation> =
  {
    OPEN: { label: 'Mới ghi nhận', tone: 'warning' },
    WAITING_EXPERT: { label: 'Chờ chuyên gia', tone: 'warning' },
    IN_PROGRESS: { label: 'Đang xử lý', tone: 'info' },
    MONITORING: { label: 'Đang theo dõi', tone: 'info' },
    RESOLVED: { label: 'Đã xử lý', tone: 'success' },
  }

/** Mức độ nghiêm trọng. */
export const ISSUE_SEVERITY_DICTIONARY: Record<
  IssueSeverityKey,
  StatusPresentation
> = {
  HIGH: { label: 'Cao', tone: 'danger' },
  MEDIUM: { label: 'Trung bình', tone: 'warning' },
  LOW: { label: 'Thấp', tone: 'info' },
}

/** Giai đoạn bằng chứng hiện trường. */
export const MEDIA_STAGE_DICTIONARY: Record<MediaStageKey, StatusPresentation> = {
  BEFORE: { label: 'Trước khi xử lý', tone: 'neutral' },
  DURING: { label: 'Trong khi xử lý', tone: 'info' },
  AFTER: { label: 'Sau khi xử lý', tone: 'success' },
}

/**
 * Tình trạng khay / nấm khi kiểm tra hằng ngày.
 *
 * ⚠ BE trả string tự do ⇒ tra cứu luôn an toàn qua `presentStatus()`.
 */
export const TRAY_CONDITION_DICTIONARY: StatusDictionary = {
  GOOD: { tone: 'ok', label: 'Tốt' },
  NORMAL: { tone: 'ok', label: 'Bình thường' },
  OK: { tone: 'ok', label: 'Bình thường' },
  FAIR: { tone: 'info', label: 'Khá' },
  POOR: { tone: 'warning', label: 'Kém' },
  BAD: { tone: 'danger', label: 'Xấu' },
  MOLDY: { tone: 'danger', label: 'Mốc' },
  CONTAMINATED: { tone: 'danger', label: 'Nhiễm khuẩn' },
}
