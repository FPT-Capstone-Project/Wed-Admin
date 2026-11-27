import { useMasterList } from '../../features/devices/hooks/useIoT'
import { PageHeader } from '../../shared/ui/PageHeader'
import { DeviceControlPanel } from './components/DeviceControlPanel'
import './device-industrial.css'

/**
 * Trang "Thiết bị IoT" — **CHỈ GIÁM SÁT** trên web admin.
 *
 * ⚠ Mọi thao tác cấu hình (đặt ngưỡng, bật/tắt tưới tự động, tạo/sửa tầng,
 * gán khay) do **nhân viên (staff)** thực hiện trên mobile app — xem
 * `features/auth/permissions.ts` (`iot.automation.manage`).
 */
export function DeviceManagementPage() {

  // ── IoT Masters (real) ────────────────────────────────────────────
  const {
    data: masters = [],
  } = useMasterList({ staleTime: 30_000 })

  return (
    <div className="mcms-iot-view">
      <PageHeader title="Giám sát thiết bị IoT" description={masters.length > 0 ? `${masters.length} bộ điều khiển trung tâm đã đăng ký` : 'Đang tải dữ liệu thiết bị IoT...'} />

      <DeviceControlPanel />
    </div>
  )
}
