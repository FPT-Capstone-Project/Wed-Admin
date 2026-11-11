/**
 * Nhãn + tone ngữ nghĩa cho 4 trạng thái khay — **re-export từ module trung tâm**.
 *
 * ⚠ File này **giữ nguyên API cũ** (mọi import hiện tại trong codebase vẫn
 *   chạy đúng) nhưng **nguồn sự thật duy nhất** đã chuyển sang
 *   `src/shared/i18n/status/room.ts`.
 */

import type { SemanticTone } from '../../../app/theme/tokens'
import type { TrayStatus } from '../../../types/room.types'
import { TRAY_UI_STATUS_DICTIONARY } from '../../../shared/i18n/status/room'

/**
 * Nhãn + tone ngữ nghĩa cho 4 trạng thái khay.
 *
 * ⚠ `tone` là tone của design system trong `tokens.ts` — KHÔNG dùng màu
 * preset của antd (`success`/`warning`/`error`) vì chúng FAIL WCAG AA.
 * Component hiển thị là `StatusBadge` trong `src/shared/ui/`.
 *
 * `label` = nhãn đầy đủ (drawer chi tiết, bảng quản trị, legend).
 * `shortLabel` = nhãn rút gọn cho ô khay nhỏ trong lưới kệ — badge ở đó
 * chỉ rộng ~158px nên "Nhiễm bệnh / Cách ly" bị tràn/wrapping.
 */
export const TRAY_STATUS_CONFIG = TRAY_UI_STATUS_DICTIONARY satisfies Record<
  TrayStatus,
  { tone: SemanticTone; label: string; shortLabel: string }
>
