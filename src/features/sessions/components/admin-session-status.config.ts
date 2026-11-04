import type { SemanticTone } from '../../../app/theme/tokens'

/**
 * Nhãn + màu cho **4 giai đoạn sinh trưởng** (WF-03).
 *
 * ⚠ Thứ tự khớp với vòng đời thật:
 *   FRUITING_INITIATION → PINNING → YOUNG_FRUITING → MATURATION
 */
export const SESSION_GROWTH_STAGE_CONFIG = {
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
    label: 'Chín kho',
    shortLabel: 'Chín kho',
  },
} satisfies Record<string, { tone: SemanticTone; label: string; shortLabel: string }>

/**
 * Nhãn + màu cho trạng thái thu hoạch.
 *
 * ⚠ BE chỉ dùng 2 giá trị: `NOT_READY` và `HARVEST_READY`.
 */
export const SESSION_HARVEST_STATUS_CONFIG = {
  NOT_READY: { tone: 'muted', label: 'Chưa sẵn sàng' },
  HARVEST_READY: { tone: 'warning', label: 'Sẵn sàng thu hoạch' },
} satisfies Record<string, { tone: SemanticTone; label: string }>
