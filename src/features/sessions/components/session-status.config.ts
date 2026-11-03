import type { SemanticTone } from '../../../app/theme/tokens'
import type { CultivationSessionStatus } from '../types/session.types'

/**
 * Nhãn + màu cho 8 trạng thái phiên canh tác.
 *
 * ⚠ Thứ tự khớp với vòng đời thật:
 *   PENDING → SPAWN_RESTING → MYCELIAL_DEVELOPMENT → READY_FOR_CULTIVATION
 *   → CULTIVATING → HARVESTING → COMPLETED | CANCELLED
 */
export const SESSION_STATUS_CONFIG: Record<
  CultivationSessionStatus,
  { tone: SemanticTone; label: string; shortLabel: string; step: number }
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
  HARVESTING: {
    tone: 'warning',
    label: 'Đang thu hoạch',
    shortLabel: 'Thu hoạch',
    step: 6,
  },
  COMPLETED: {
    tone: 'muted',
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
 * Nhãn tiến độ mặc định theo trạng thái — dùng khi BE chưa trả
 * `progress_percent` (suy ra từ bước trong vòng đời).
 */
export const SESSION_DEFAULT_PROGRESS: Record<
  CultivationSessionStatus,
  number
> = {
  PENDING: 0,
  SPAWN_RESTING: 15,
  MYCELIAL_DEVELOPMENT: 30,
  READY_FOR_CULTIVATION: 45,
  CULTIVATING: 65,
  HARVESTING: 90,
  COMPLETED: 100,
  CANCELLED: 0,
}

/** Nhãn cho tình trạng sức khoẻ phôi khi kiểm tra. */
export const SPAWN_CONDITION_CONFIG: Record<
  string,
  { tone: SemanticTone; label: string }
> = {
  NORMAL: { tone: 'ok', label: 'Bình thường' },
  WARNING: { tone: 'warning', label: 'Cảnh báo' },
  ABNORMAL: { tone: 'danger', label: 'Bất thường' },
}
