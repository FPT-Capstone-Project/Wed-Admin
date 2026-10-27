/**
 * Tra cứu khay theo khách thuê.
 *
 * Nguồn dữ liệu: `useRoomStore` — mỗi `Tray` đang thuê có
 * `rental.tenantName` khớp với tên khách. Trước đây các trang Cảnh báo /
 * Hồ sơ Vi khí hậu dùng store riêng `features/tenants` (đã gỡ bỏ cùng
 * trang "Khách thuê") để suy ra khay của khách.
 */
import type { Tier } from '../../../types/room.types'

/**
 * Danh sách `tray.id` mà khách `customerName` đang thuê.
 *
 * @param tiers - Danh sách tầng (từ `useRoomStore`).
 * @param customerName - Tên đầy đủ của khách (`user.fullName`).
 * @returns Mảng `tray.id` (vd: `T1-K1`). Rỗng nếu không tìm thấy khách.
 */
export function getCustomerTrayIds(
  tiers: Tier[],
  customerName: string | null | undefined,
): string[] {
  if (!customerName) {
    return []
  }

  return tiers
    .flatMap((tier) => tier.trays)
    .filter((tray) => tray.rental?.tenantName === customerName)
    .map((tray) => tray.id)
}
