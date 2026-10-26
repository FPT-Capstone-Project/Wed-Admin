import type { TrayStatus } from '../../../types/room.types'
import type { SemanticTone } from '../../../app/theme/tokens'

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
export const TRAY_STATUS_CONFIG = {
  empty: { tone: 'muted', label: 'Khay trống', shortLabel: 'Trống' },
  rented: { tone: 'ok', label: 'Đang thuê', shortLabel: 'Đang thuê' },
  harvesting: {
    tone: 'warning',
    label: 'Chờ thu hoạch',
    shortLabel: 'Chờ thu hoạch',
  },
  maintenance: {
    tone: 'danger',
    label: 'Nhiễm bệnh / Cách ly',
    shortLabel: 'Nhiễm bệnh',
  },
} as const satisfies Record<
  TrayStatus,
  { tone: SemanticTone; label: string; shortLabel: string }
>
