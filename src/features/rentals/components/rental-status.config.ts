import type { CultivationStage, RentalStatus } from '../types/rental.types'

/** Nhãn + màu cho RentalStatus — khớp 5 giá trị BE thực sự trả về. */
export const RENTAL_STATUS_CONFIG: Record<
  RentalStatus,
  { color: string; label: string; badge: string }
> = {
  CONFIRMED: {
    color: 'warning',
    label: 'Chờ duyệt',
    badge: 'warning',
  },
  PREPARING: {
    color: 'processing',
    label: 'Đang chuẩn bị',
    badge: 'processing',
  },
  ACTIVE: {
    color: 'success',
    label: 'Đang canh tác',
    badge: 'processing',
  },
  COMPLETED: {
    color: 'default',
    label: 'Hoàn thành',
    badge: 'default',
  },
  CANCELLED: {
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
export const PAYMENT_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  PAID: { color: 'success', label: 'Đã thanh toán' },
  PENDING: { color: 'warning', label: 'Chờ thanh toán' },
  REFUNDED: { color: 'default', label: 'Đã hoàn tiền' },
}