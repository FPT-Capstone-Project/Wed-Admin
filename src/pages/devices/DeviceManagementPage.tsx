import {
  HistoryOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Flex,
  Typography,
} from 'antd'
import { useNavigate } from 'react-router-dom'
import { useMasterList } from '../../features/devices/hooks/useIoT'
import { DeviceControlPanel } from './components/DeviceControlPanel'

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
            Gateway &amp; mạng RS485
          </Typography.Title>
          <Typography.Text type="secondary">
            {masters.length > 0
              ? `${masters.length} master(s) đã đăng ký`
              : 'Đang tải dữ liệu thiết bị IoT...'}
          </Typography.Text>
        </div>

        <Flex align="center" gap={16} wrap>
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
