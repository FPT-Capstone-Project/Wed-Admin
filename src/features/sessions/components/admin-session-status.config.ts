/**
 * Cấu hình giai đoạn sinh trưởng & trạng thái thu hoạch của phiên.
 *
 * ⚠ File này **giữ nguyên API cũ** (mọi import hiện tại trong codebase vẫn
 *   chạy đúng) nhưng **nguồn sự thật duy nhất** đã chuyển sang
 *   `src/shared/i18n/status/session.ts`.
 */

import {
  SESSION_GROWTH_STAGE_DICTIONARY,
  SESSION_HARVEST_STATUS_DICTIONARY,
} from '../../../shared/i18n/status/session'

/**
 * Nhãn + màu cho **4 giai đoạn sinh trưởng** (WF-03).
 *
 * ⚠ Thứ tự khớp với vòng đời thật:
 *   FRUITING_INITIATION → PINNING → YOUNG_FRUITING → MATURATION
 */
export const SESSION_GROWTH_STAGE_CONFIG = SESSION_GROWTH_STAGE_DICTIONARY

/**
 * Nhãn + màu cho trạng thái thu hoạch.
 *
 * ⚠ BE chỉ dùng 2 giá trị: `NOT_READY` và `HARVEST_READY`.
 */
export const SESSION_HARVEST_STATUS_CONFIG = SESSION_HARVEST_STATUS_DICTIONARY
