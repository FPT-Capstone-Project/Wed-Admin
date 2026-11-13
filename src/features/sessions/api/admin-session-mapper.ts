import type {
  AdminCultivationSessionDto,
  AdminSessionTray,
} from '../types/admin-session.types'
import type { CultivationSession, SessionTray } from '../types/session.types'

/**
 * Chuyển DTO của endpoint quản trị sang shape `CultivationSession` mà các
 * component hiện có đang dùng.
 *
 * ⚠ Mục đích: `SessionDetailDrawer` hiển thị cả trường mà luồng farm có
 *   (`customer_phone`, `payment_status`) mà endpoint quản trị **không** trả.
 *   → Ánh xạ sang shape chung, rồi bù các trường thiếu từ nguồn farm.
 */
export function toCultivationSession(
  dto: AdminCultivationSessionDto,
): CultivationSession {
  return {
    session_id: dto.session_id,
    order_id: dto.order_id,
    order_item_id: dto.order_item_id,
    user_id: dto.user_id,
    customer_name: dto.customer_name,
    customer_email: dto.customer_email,
    customer_phone: null,
    package_id: dto.package_id,
    package_name: dto.package_name,
    mushroom_type_id: dto.mushroom_type_id,
    mushroom_name: dto.mushroom_name,
    status: dto.status,
    harvest_status: dto.harvest_status,
    progress_percent: dto.progress_percent,
    current_stage: dto.current_stage,
    growth_status: dto.growth_status,
    start_date: dto.start_at,
    end_date: dto.end_at,
    duration_days: dto.duration_days,
    expected_harvest_date: dto.harvest_date,
    tray_count: dto.tray_quantity,
    spawn_quantity: dto.spawn_quantity,
    trays: dto.trays.map(toSessionTray),
    payment_status: null,
    created_at: dto.created_at ?? dto.start_at,
    updated_at: dto.updated_at ?? dto.progress_updated_at,
  }
}

/** Ánh xạ khay của endpoint quản trị sang `SessionTray` của app. */
function toSessionTray(tray: AdminSessionTray): SessionTray {
  return {
    session_tray_id: tray.session_tray_id,
    tray_id: tray.tray_id,
    tray_code: tray.tray_code,
    tray_name: tray.tray_name,
    room_id: tray.room_id,
    room_name: tray.room_name,
    floor_id: tray.floor_id,
    floor_number: tray.floor_number,
    floor_name: tray.floor_name,
    status: tray.assignment_status,
  }
}
