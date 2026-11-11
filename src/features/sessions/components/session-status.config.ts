/**
 * Cấu hình trạng thái phiên canh tác — **re-export từ module trung tâm**.
 *
 * ⚠ File này **giữ nguyên API cũ** (mọi import hiện tại trong codebase vẫn
 *   chạy đúng) nhưng **nguồn sự thật duy nhất** đã chuyển sang
 *   `src/shared/i18n/status/session.ts`.
 *
 *   → Sửa nhãn/tone ở 1 chỗ, mọi màn hình cùng nhận.
 */

import type { CultivationSessionStatus } from '../types/session.types'
import {
  SESSION_DEFAULT_PROGRESS as SESSION_DEFAULT_PROGRESS_CENTRAL,
  SESSION_GROUP_DICTIONARY,
  SESSION_STATUS_DICTIONARY,
  SPAWN_CONDITION_DICTIONARY,
  resolveSessionGroup as resolveSessionGroupCentral,
  type SessionStatusPresentation,
} from '../../../shared/i18n/status/session'

/**
 * Nhãn + màu cho 9 trạng thái phiên canh tác.
 *
 * ⚠ Thứ tự khớp với vòng đời thật:
 *   PENDING → SPAWN_RESTING → MYCELIAL_DEVELOPMENT → READY_FOR_CULTIVATION
 *   → CULTIVATING → HARVESTING → COMPLETED | CANCELLED
 */
export const SESSION_STATUS_CONFIG: Record<
  CultivationSessionStatus,
  SessionStatusPresentation
> = SESSION_STATUS_DICTIONARY

/** Badge theo **nhóm trạng thái** — dùng cho bộ lọc & cột trạng thái rút gọn. */
export type SessionStatusGroup = 'CULTIVATING' | 'PENDING' | 'FINISHED'

export const SESSION_GROUP_CONFIG = SESSION_GROUP_DICTIONARY

/** Nhóm trạng thái của 1 phiên canh tác. */
export const resolveSessionGroup = (
  status: CultivationSessionStatus,
): SessionStatusGroup => resolveSessionGroupCentral(status)

/**
 * Nhãn tiến độ mặc định theo trạng thái — dùng khi BE chưa trả
 * `progress_percent` (suy ra từ bước trong vòng đời).
 */
export const SESSION_DEFAULT_PROGRESS: Record<
  CultivationSessionStatus,
  number
> = SESSION_DEFAULT_PROGRESS_CENTRAL

/** Nhãn cho tình trạng sức khoẻ phôi khi kiểm tra. */
export const SPAWN_CONDITION_CONFIG = SPAWN_CONDITION_DICTIONARY
