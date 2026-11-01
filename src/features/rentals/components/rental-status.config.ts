import type { SemanticTone } from '../../../app/theme/tokens'
import type { CultivationStage, RentalStatus } from '../types/rental.types'

/** Nhãn + màu cho RentalStatus — khớp 5 giá trị BE thực sự trả về. */
export const RENTAL_STATUS_CONFIG: Record<
  RentalStatus,
  { color: string; label: string; badge: string; tone: SemanticTone }
> = {
  CONFIRMED: {
    tone: 'warning',
    color: 'warning',
    label: 'Chờ duyệt',
    badge: 'warning',
  },
  PREPARING: {
    tone: 'info',
    color: 'processing',
    label: 'Đang chuẩn bị',
    badge: 'processing',
  },
  ACTIVE: {
    tone: 'ok',
    color: 'success',
    label: 'Đang canh tác',
    badge: 'processing',
  },
  COMPLETED: {
    tone: 'neutral',
    color: 'default',
    label: 'Hoàn thành',
    badge: 'default',
  },
  CANCELLED: {
    tone: 'danger',
    color: 'error',
    label: 'Đã hủy',
    badge: 'error',
  },
}

/** Nhãn cho CultivationStage — thứ tự là chu kỳ sinh trưởng. */
export const CULTIVATION_STAGE_CONFIG: Record<
  CultivationStage,
  { color: string; label: string }
> = {
  PREPARATION: { color: 'default', label: 'Chuẩn bị' },
  INCUBATION: { color: 'cyan', label: 'Ủi nấm' },
  PINNING: { color: 'geekblue', label: 'Ra nấm rơi' },
  FRUITING: { color: 'purple', label: 'Đơm nấm' },
  HARVEST: { color: 'gold', label: 'Thu hoạch' },
}

/** Màu badge thanh toán. */
export const PAYMENT_STATUS_CONFIG: Record<string, { color: string; label: string; tone: SemanticTone }> = {
  PAID: { tone: 'ok', color: 'success', label: 'Đã thanh toán' },
  PENDING: { tone: 'warning', color: 'warning', label: 'Chờ thanh toán' },
  REFUNDED: { tone: 'neutral', color: 'default', label: 'Đã hoàn tiền' },
}
