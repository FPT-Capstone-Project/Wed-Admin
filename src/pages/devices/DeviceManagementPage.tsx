import { HistoryOutlined, EyeOutlined } from '@ant-design/icons'
import { App, Button, Flex, Tag, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useMasterList } from '../../features/devices/hooks/useIoT'
import { DeviceControlPanel } from './components/DeviceControlPanel'

/**
 * Trang "Thiết bị IoT" — **CHỈ GIÁM SÁT** trên web admin.
 *
 * ⚠ Mọi thao tác cấu hình (đặt ngưỡng, bật/tắt tưới tự động, tạo/sửa tầng,
 * gán khay) do **nhân viên (staff)** thực hiện trên mobile app — xem
 * `features/auth/permissions.ts` (`iot.automation.manage`).
 */
export function DeviceManagementPage() {
  App.useApp()
  const navigate = useNavigate()

  // ── IoT Masters (real) ────────────────────────────────────────────
  const {
    data: masters = [],
  } = useMasterList({ staleTime: 30_000 })

  return (
    <div>
      <Flex
        align="flex-start"
        justify="space-between"
        gap={16}
        wrap
        style={{ marginBottom: 20 }}
      >
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Giám sát thiết bị IoT
          </Typography.Title>
          <Typography.Text type="secondary">
            {masters.length > 0
              ? `${masters.length} bộ điều khiển trung tâm đã đăng ký`
              : 'Đang tải dữ liệu thiết bị IoT...'}
          </Typography.Text>
        </div>

        <Flex align="center" gap={16} wrap>
          <Tag icon={<EyeOutlined />} color="default">
            Chỉ giám sát
          </Tag>
          <Button
            icon={<HistoryOutlined />}
            onClick={() => navigate('/devices/history')}
          >
            Lịch sử Telemetry
          </Button>
        </Flex>
      </Flex>

      <DeviceControlPanel />
    </div>
  )
}
