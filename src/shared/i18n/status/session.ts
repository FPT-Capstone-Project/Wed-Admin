/**
 * Từ điển trạng thái — **phiên canh tác** (cultivation session).
 *
 * ⚠ Nguồn sự thật duy nhất cho:
 *   - 9 trạng thái vòng đời phiên (`cultivation_sessions.status`).
 *   - 4 giai đoạn sinh trưởng (WF-03 — `growthStatus.enum`).
 *   - Trạng thái thu hoạch của phiên (`harvest_status`).
 *   - Tình trạng sức khoẻ phôi khi kiểm tra (`condition`).
 *
 * Feature layer (`features/sessions/components/*.config.ts`) chỉ **re-export**
 * từ đây ⇒ không có 2 nguồn sự thật, mà import cũ vẫn chạy nguyên.
 */

import type { StatusDictionary, StatusPresentation } from './types'

/** 9 trạng thái vòng đời phiên canh tác (giá trị gốc của BE). */
export type SessionStatusKey =
  | 'PENDING'
  | 'SPAWN_RESTING'
  | 'MYCELIAL_DEVELOPMENT'
  | 'READY_FOR_CULTIVATION'
  | 'CULTIVATING'
  | 'HARVEST_READY'
  | 'HARVESTING'
  | 'COMPLETED'
  | 'CANCELLED'

/** Nhóm trạng thái dùng cho bộ lọc rút gọn. */
export type SessionStatusGroupKey = 'CULTIVATING' | 'PENDING' | 'FINISHED'

/** Giai đoạn chuẩn bị và 4 giai đoạn sinh trưởng (WF-03). */
export type SessionGrowthStageKey =
  | 'PREPARATION'
  | 'FRUITING_INITIATION'
  | 'PINNING'
  | 'YOUNG_FRUITING'
  | 'MATURATION'

/** Trạng thái thu hoạch của phiên (`cultivation_sessions.harvest_status`). */
export type SessionHarvestStatusKey = 'NOT_READY' | 'HARVEST_READY'

/** Tình trạng sức khoẻ phôi khi kiểm tra (`condition`). */
export type SpawnConditionKey = 'NORMAL' | 'WARNING' | 'ABNORMAL'

/**
 * Trạng thái **gán khay** trong phiên (`cultivation_session_trays.status`).
 *
 * ⚠ Khác với `cultivation_trays.status` (trạng thái vật lý của khay — nằm ở
 *   `room.ts`): đây là trạng thái **quan hệ gán** khay ↔ phiên canh tác ⇒
 *   thuộc phạm vi **phiên** nên khai báo ở đây.
 */
export type SessionTrayAssignmentStatusKey = 'ACTIVE' | 'RELEASED'

/**
 * Presentation của trạng thái phiên.
 *
 * ⚠ `step` là **bước trong vòng đời** (1..7) — dùng để suy ra tiến độ mặc
 * định khi BE chưa trả `progress_percent`. `CANCELLED` có `step = 0` vì
 * phiên bị huỷ nên không có tiến độ.
 */
export interface SessionStatusPresentation extends StatusPresentation {
  readonly shortLabel: string
  readonly step: number
}

/**
 * Nhãn + màu cho 9 trạng thái phiên canh tác.
 *
 * ⚠ Thứ tự khớp với vòng đời thật:
 *   PENDING → SPAWN_RESTING → MYCELIAL_DEVELOPMENT → READY_FOR_CULTIVATION
 *   → CULTIVATING → HARVESTING → COMPLETED | CANCELLED
 */
export const SESSION_STATUS_DICTIONARY: Record<
  SessionStatusKey,
  SessionStatusPresentation
> = {
  PENDING: {
    tone: 'warning',
    label: 'Chờ xử lý',
    shortLabel: 'Chờ xử lý',
    step: 1,
  },
  SPAWN_RESTING: {
    tone: 'info',
    label: 'Phôi đang nảy mầm',
    shortLabel: 'Nảy mầm',
    step: 2,
  },
  MYCELIAL_DEVELOPMENT: {
    tone: 'info',
    label: 'Phát triển mycelium',
    shortLabel: 'Mycelium',
    step: 3,
  },
  READY_FOR_CULTIVATION: {
    tone: 'info',
    label: 'Sẵn sàng canh tác',
    shortLabel: 'Sẵn sàng canh tác',
    step: 4,
  },
  CULTIVATING: {
    tone: 'ok',
    label: 'Đang canh tác',
    shortLabel: 'Đang canh tác',
    step: 5,
  },
  HARVEST_READY: {
    tone: 'warning',
    label: 'Sẵn sàng thu hoạch',
    shortLabel: 'Sẵn sàng thu hoạch',
    step: 6,
  },
  HARVESTING: {
    tone: 'warning',
    label: 'Đang thu hoạch',
    shortLabel: 'Thu hoạch',
    step: 6,
  },
  COMPLETED: {
    // ⚠ Tone `success` (**xanh dương**) — KHÔNG dùng `muted` (xám) để phân
    //   biệt rõ "đã hoàn tất" (xanh dương) với "đã huỷ" (đỏ) / "đang chạy"
    //   (xanh lá) trong cùng 1 bảng.
    tone: 'success',
    label: 'Đã hoàn tất',
    shortLabel: 'Hoàn tất',
    step: 7,
  },
  CANCELLED: {
    tone: 'danger',
    label: 'Đã huỷ',
    shortLabel: 'Đã huỷ',
    step: 0,
  },
}

/**
 * Badge theo **nhóm trạng thái** — dùng cho bộ lọc & cột trạng thái rút gọn.
 *
 * ⚠ Yêu cầu hiển thị:
 *   - Đang canh tác → **xanh lá cây** (`ok`).
 *   - Chờ xử lý    → **vàng cam** (`warning`).
 *   - Hoàn tất      → **xanh dương** (`success`).
 *   - Đã huỷ       → đỏ (`danger`).
 */
export const SESSION_GROUP_DICTIONARY: Record<
  SessionStatusGroupKey,
  StatusPresentation
> = {
  CULTIVATING: { tone: 'ok', label: 'Đang canh tác' },
  PENDING: { tone: 'warning', label: 'Chờ xử lý' },
  FINISHED: { tone: 'success', label: 'Đã thu hoạch' },
}

/** Nhóm trạng thái của 1 phiên canh tác. */
export function resolveSessionGroup(
  status: SessionStatusKey,
): SessionStatusGroupKey {
  if (status === 'CANCELLED') return 'FINISHED'
  if (status === 'COMPLETED') return 'FINISHED'
  if (status === 'PENDING') return 'PENDING'
  return 'CULTIVATING'
}

/**
 * Nhãn tiến độ mặc định theo trạng thái — dùng khi BE chưa trả
 * `progress_percent` (suy ra từ bước trong vòng đời).
 */
export const SESSION_DEFAULT_PROGRESS: Record<SessionStatusKey, number> = {
  PENDING: 0,
  SPAWN_RESTING: 15,
  MYCELIAL_DEVELOPMENT: 30,
  READY_FOR_CULTIVATION: 45,
  CULTIVATING: 65,
  HARVEST_READY: 85,
  HARVESTING: 90,
  COMPLETED: 100,
  CANCELLED: 0,
}

/**
 * Nhãn cho giai đoạn chuẩn bị và sinh trưởng.
 *
 * ⚠ Thứ tự khớp với vòng đời thật:
 *   FRUITING_INITIATION → PINNING → YOUNG_FRUITING → MATURATION
 */
export const SESSION_GROWTH_STAGE_DICTIONARY: Record<
  SessionGrowthStageKey,
  StatusPresentation & { readonly shortLabel: string }
> = {
  PREPARATION: {
    tone: 'info',
    label: 'Chuẩn bị cơ chất / phôi',
    shortLabel: 'Chuẩn bị',
  },
  FRUITING_INITIATION: {
    tone: 'info',
    label: 'Khởi động ra hoa',
    shortLabel: 'Ra hoa',
  },
  PINNING: {
    tone: 'info',
    label: 'Đang hình thành nụ',
    shortLabel: 'Hình thành nụ',
  },
  YOUNG_FRUITING: {
    tone: 'ok',
    label: 'Nấm non đang lớn',
    shortLabel: 'Nấm non',
  },
  MATURATION: {
    tone: 'warning',
    label: 'Chín rộ',
    shortLabel: 'Chín rộ',
  },
}

/**
 * Nhãn cho trạng thái thu hoạch của phiên.
 *
 * ⚠ BE chỉ dùng 2 giá trị: `NOT_READY` và `HARVEST_READY`.
 */
export const SESSION_HARVEST_STATUS_DICTIONARY: Record<
  SessionHarvestStatusKey,
  StatusPresentation
> = {
  NOT_READY: { tone: 'muted', label: 'Chưa sẵn sàng' },
  HARVEST_READY: { tone: 'warning', label: 'Sẵn sàng thu hoạch' },
}

/** Nhãn cho tình trạng sức khoẻ phôi khi kiểm tra. */
export const SPAWN_CONDITION_DICTIONARY: StatusDictionary = {
  NORMAL: { tone: 'ok', label: 'Bình thường' },
  WARNING: { tone: 'warning', label: 'Cảnh báo' },
  ABNORMAL: { tone: 'danger', label: 'Bất thường' },
}

/**
 * Trạng thái gán khay trong phiên canh tác.
 *
 * ⚠ `ACTIVE` = khay đang được dùng cho phiên; `RELEASED` = đã thu hồi.
 */
export const SESSION_TRAY_ASSIGNMENT_DICTIONARY: Record<
  SessionTrayAssignmentStatusKey,
  StatusPresentation
> = {
  ACTIVE: { tone: 'ok', label: 'Đang sử dụng' },
  RELEASED: { tone: 'muted', label: 'Đã thu hồi' },
}

/**
 * Giai đoạn của **mốc tiến độ** (`cultivation_progress.current_stage`).
 *
 * ⚠ Cột này trộn **2 enum khác nhau**:
 *   - 4 giai đoạn sinh trưởng (WF-03): `FRUITING_INITIATION`…
 *   - trạng thái phiên khi phôi vừa được cấp: `SPAWN_PENDING`,
 *     `PENDING`, `SPAWN_RESTING`, `MYCELIAL_DEVELOPMENT`,
 *     `READY_FOR_CULTIVATION`.
 *
 *   ⇒ Gom vào 1 từ điển để timeline không bao giờ lộ chuỗi tiếng Anh.
 */
export const SESSION_PROGRESS_STAGE_DICTIONARY: StatusDictionary = {
  ...SESSION_GROWTH_STAGE_DICTIONARY,
  SPAWN_PENDING: { tone: 'warning', label: 'Chờ xử lý phôi' },
  PENDING: { tone: 'warning', label: 'Chờ xử lý' },
  SPAWN_RESTING: { tone: 'info', label: 'Phôi đang nảy mầm' },
  MYCELIAL_DEVELOPMENT: { tone: 'info', label: 'Phát triển mycelium' },
  READY_FOR_CULTIVATION: { tone: 'info', label: 'Sẵn sàng canh tác' },
  UNKNOWN: { tone: 'muted', label: 'Chưa xác định' },
}
