import {
  ApiOutlined,
  CheckCircleOutlined,
  InboxOutlined,
  SettingOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Button, Card, Col, Empty, Flex, Row, Statistic, Tag, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { TrayStatus } from '../../../types/room.types'
import { RackView } from '../components/RackView'
import { TrayDetailDrawer } from '../components/TrayDetailDrawer'
import { TRAY_STATUS_CONFIG } from '../components/tray-status.config'
import { RoomsTraysAdminPanel } from '../components/RoomsTraysAdminPanel'
import { useTiersWithEnvironment } from '../hooks/useTiersWithEnvironment'

const STATUS_ORDER = [
  'empty',
  'rented',
  'harvesting',
  'maintenance',
] as const satisfies TrayStatus[]

export function RoomListPage() {
  const navigate = useNavigate()
  const { id = null } = useParams<{ id: string }>()
  const [showAdminPanel, setShowAdminPanel] = useState(false)

  // ── Data from API (rooms + trays + IoT floors/environment) ───────────
  const {
    tiersWithEnv,
    isLoading,
    refetch,
  } = useTiersWithEnvironment()

  // Sau khi wire telemetry, `tiersWithEnv` luôn có data, fallback `[]` chỉ
  // trong trường hợp vẫn đang loading.
  const tiers = useMemo(
    () => tiersWithEnv.map((t) => t.tier),
    [tiersWithEnv],
  )
  const liveCount = useMemo(
    () => tiersWithEnv.filter((t) => t.source === 'real').length,
    [tiersWithEnv],
  )
  const tiersError = false
  const tiersErrorMessage: string | null = null

  // ── Local stats ────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const trays = tiers.flatMap((t) => t.trays)
    return {
      total: trays.length,
      empty: trays.filter((t) => t.status === 'empty').length,
      occupied: trays.filter(
        (t) => t.status === 'rented' || t.status === 'harvesting',
      ).length,
      attention: trays.filter((t) => t.status === 'maintenance').length,
    }
  }, [tiers])

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
          <Flex align="center" gap={8} wrap>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Khu nuôi nấm · {tiers.length} tầng
            </Typography.Title>
            {tiersWithEnv.length > 0 && (
              <Tag
                color={liveCount === tiersWithEnv.length ? 'success' : 'warning'}
                style={{ marginInlineStart: 0 }}
              >
                {liveCount === tiersWithEnv.length
                  ? `Telemetry real-time · ${liveCount}/${liveCount}`
                  : `Telemetry thật ${liveCount}/${tiersWithEnv.length} tầng · còn lại mock`}
              </Tag>
            )}
          </Flex>
          <Typography.Text type="secondary">
            Tổng {summary.total} khay · {summary.empty} trống ·{' '}
            {summary.occupied} đang vận hành · {summary.attention} cần chú ý
          </Typography.Text>
        </div>

        <Flex gap={6} wrap>
          {STATUS_ORDER.map((status) => (
            <Tag key={status} color={TRAY_STATUS_CONFIG[status].color}>
              {TRAY_STATUS_CONFIG[status].label}
            </Tag>
          ))}
          <Button
            size="small"
            icon={<SettingOutlined />}
            type={showAdminPanel ? 'primary' : 'default'}
            onClick={() => setShowAdminPanel((prev) => !prev)}
          >
            {showAdminPanel ? 'Ẩn quản trị' : 'Quản trị phòng & khay'}
          </Button>
        </Flex>
      </Flex>

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Tổng khay"
              value={summary.total}
              prefix={<ApiOutlined />}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Còn trống"
              value={summary.empty}
              prefix={<InboxOutlined />}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Đang vận hành"
              value={summary.occupied}
              prefix={<CheckCircleOutlined />}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Cần chú ý"
              value={summary.attention}
              prefix={<WarningOutlined />}
              loading={isLoading}
            />
          </Card>
        </Col>
      </Row>

      {tiersError ? (
        <Empty
          description={
            <Flex vertical align="center" gap={8}>
              <Typography.Text type="danger">
                Không tải được dữ liệu kệ nấm từ máy chủ.
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {tiersErrorMessage ?? 'Lỗi không xác định.'}
              </Typography.Text>
              <Typography.Text
                type="secondary"
                style={{ fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => void refetch()}
              >
                Nhấn để thử lại
              </Typography.Text>
            </Flex>
          }
        />
      ) : (
        <RackView
          tiers={tiers}
          selectedTrayId={id}
          onSelectTray={(tray) => navigate(`/rooms/${tray.id}`)}
        />
      )}

      {showAdminPanel && (
        <Card style={{ marginTop: 20 }} styles={{ body: { padding: 20 } }}>
          <RoomsTraysAdminPanel
            onChanged={() => {
              void refetch()
            }}
          />
        </Card>
      )}

      <TrayDetailDrawer
        trayId={id}
        onClose={() => navigate('/rooms', { replace: true })}
      />
    </div>
  )
}