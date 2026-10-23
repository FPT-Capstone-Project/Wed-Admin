import { useMemo, useState } from 'react'
import {
  HistoryOutlined,
  SettingOutlined,
  WifiOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Empty,
  Flex,
  Skeleton,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd'
import { useNavigate } from 'react-router-dom'
import { useMasterList, useSsrChannels, useSsrCommand } from '../../features/devices/hooks/useIoT'
import { getSsrChannelLabel } from '../../features/devices/utils/ssr-channel-labels'
import type { MasterStatus } from '../../types/iot'
import type { TierId, Tier } from '../../types/room.types'
import type { FloorClimateConfig } from '../../types/device.types'
import { useTiersWithEnvironment } from '../../features/rooms/hooks/useTiersWithEnvironment'
import { DeviceMetricsGrid } from './components/DeviceMetricsGrid'
import { FloorClimateConfigModal } from './components/FloorClimateConfigModal'
import { DeviceControlPanel } from './components/DeviceControlPanel'
import { useFloorThresholdsFromApi } from './hooks/useFloorThresholdsFromApi'
import { calculateFloorTargetThresholds } from './utils/floor-climate.utils'

const STATUS_CONFIG: Record<
  MasterStatus,
  { color: string; label: string }
> = {
  online: { color: 'success', label: 'Trực tuyến' },
  offline: { color: 'default', label: 'Mất kết nối' },
}

/**
 * Hint cho các tín hiệu mà backend chưa expose.
 * Xem `docs/backend-mock-gap-report.md` để biết các endpoint cần bổ sung:
 *  - GET /api/iot/gateway
 *  - GET /api/iot/masters/{id}/nodes
 *  - POST /api/iot/masters/{id}/nodes/{nodeId}/ping|restart
 *  - GET /api/iot/cameras
 */
const NO_BACKEND_HINT = 'BE chưa expose — xem docs/backend-mock-gap-report.md'

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString('vi-VN')
}

export function DeviceManagementPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()

  // ── IoT Masters (real) ────────────────────────────────────────────
  const {
    data: masters = [],
    isLoading: mastersLoading,
    isError: mastersError,
    refetch: refetchMasters,
  } = useMasterList({ staleTime: 30_000 })

  const primaryMaster =
    masters.find((m) => m.masterId === 'master01') ?? masters[0]

  // ── SSR channels (real) ───────────────────────────────────────────
  const {
    data: ssrChannels = [],
    isLoading: ssrLoading,
  } = useSsrChannels(primaryMaster?.masterId ?? null)

  const ssrMutation = useSsrCommand({
    onSuccess: (cmd) => {
      message.success(
        `Đã gửi lệnh ${cmd.action} cho ${getSsrChannelLabel(cmd.channel)}.`,
      )
    },
    onError: (err) => {
      message.error(`Lỗi gửi lệnh SSR: ${err.message}`)
    },
  })

  // ── Per-tier telemetry (real, từ /api/iot/floors/{id}/environment)
  const { tiersWithEnv } = useTiersWithEnvironment()
  const tiers: Tier[] = useMemo(
    () => tiersWithEnv.map((item) => item.tier),
    [tiersWithEnv],
  )

  // ── Threshold profiles (real, từ /api/mushroom-conditions) ──────
  const thresholdsByTier = useFloorThresholdsFromApi(tiers)

  const [climateConfigFloor, setClimateConfigFloor] = useState<TierId | null>(
    null,
  )
  const selectedClimateTier =
    tiers.find((tier) => tier.tierId === climateConfigFloor) ?? null

  /**
   * Config cho `FloorClimateConfigModal`.
   *
   * ⚠ Trước đây truyền `config={null}` → modal đọc `config.tierId` ngay dòng
   * đầu nên **crash runtime** khi bấm "Cấu hình AUTO" (và là lỗi TS).
   * Giờ dựng config thật từ tier + thresholds đã resolve.
   *
   * Ngưỡng fallback khi tier chưa có threshold từ API: dùng profile mặc định
   * qua `calculateFloorTargetThresholds` (đã xử lý cả case không có tray).
   */
  const climateConfig = useMemo<FloorClimateConfig | null>(() => {
    if (!selectedClimateTier) return null

    const resolved = thresholdsByTier.find(
      (entry) => entry.tierId === selectedClimateTier.tierId,
    )?.thresholds
    const fallback = calculateFloorTargetThresholds(
      selectedClimateTier.trays,
    )

    const base = resolved ?? fallback

    return {
      tierId: selectedClimateTier.tierId,
      mode: 'AUTO',
      updatedAt: selectedClimateTier.telemetry.updatedAt,
      tempMin: base.tempMin,
      tempMax: base.tempMax,
      humidityMin: base.humidityMin,
      humidityMax: base.humidityMax,
      co2Max: base.co2Max,
    }
  }, [selectedClimateTier, thresholdsByTier])

  const handleSsrToggle = (
    channel: number,
    desiredState: 'ON' | 'OFF',
  ) => {
    if (!primaryMaster) return
    ssrMutation.mutate({
      masterId: primaryMaster.masterId,
      channel,
      payload: { action: desiredState },
    })
  }

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
            Gateway & mạng RS485
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

      {/* ── Gateway Master Card ──────────────────────────────────── */}
      <Card
        title={
          <Space>
            <WifiOutlined />
            <span>Gateway Master</span>
          </Space>
        }
        extra={
          mastersLoading ? (
            <Skeleton.Input size="small" active />
          ) : mastersError ? (
            <Tag color="error">Lỗi tải</Tag>
          ) : primaryMaster ? (
            <Tag
              color={
                STATUS_CONFIG[primaryMaster.reportedStatus ?? 'offline'].color
              }
            >
              {primaryMaster.reportedStatus === 'online'
                ? 'Trực tuyến'
                : 'Mất kết nối'}
            </Tag>
          ) : (
            <Tag>Không có master</Tag>
          )
        }
        style={{ marginBottom: 20 }}
      >
        <Flex gap={24} wrap justify="space-between">
          <div>
            <Typography.Text strong>
              {primaryMaster?.masterId ?? NO_BACKEND_HINT}
            </Typography.Text>
            <Typography.Paragraph
              type="secondary"
              style={{ margin: '4px 0 0' }}
            >
              {primaryMaster?.lastSeenAt
                ? `Cuối hoạt động: ${formatTimestamp(
                    primaryMaster.lastSeenAt,
                  )}`
                : `IP / MAC / firmware: ${NO_BACKEND_HINT}`}
            </Typography.Paragraph>
          </div>

          <Flex gap={12} wrap align="center">
            {mastersLoading || ssrLoading ? (
              <Skeleton.Input size="small" active />
            ) : (
              <>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Điều khiển kênh SSR (8 kênh):
                </Typography.Text>
                {ssrChannels.slice(0, 8).map((ch) => {
                  const isOn = ch.desiredState === 'ON'
                  const label = getSsrChannelLabel(ch.channel)
                  return (
                    <Flex
                      key={ch.channel}
                      vertical
                      gap={2}
                      align="center"
                    >
                      <Switch
                        size="small"
                        checked={isOn}
                        loading={ssrMutation.isPending}
                        onChange={() =>
                          handleSsrToggle(ch.channel, isOn ? 'OFF' : 'ON')
                        }
                        style={{ width: 36 }}
                      />
                      <Typography.Text style={{ fontSize: 10 }}>
                        {label}
                      </Typography.Text>
                    </Flex>
                  )
                })}
              </>
            )}
          </Flex>
        </Flex>
      </Card>

      {/* ── RS485 Topology (real — dùng IotMaster từ BE) ────────── */}
      {mastersLoading ? (
        <Skeleton
          active
          paragraph={{ rows: 2 }}
          style={{ marginBottom: 20 }}
        />
      ) : mastersError ? (
        <Card style={{ marginBottom: 20 }}>
          <Empty
            description={
              <Flex vertical align="center" gap={8}>
                <Typography.Text type="danger">
                  Không tải được danh sách master từ máy chủ.
                </Typography.Text>
                <Typography.Text
                  type="secondary"
                  style={{
                    fontSize: 12,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                  onClick={() => void refetchMasters()}
                >
                  Nhấn để thử lại
                </Typography.Text>
              </Flex>
            }
          />
        </Card>
      ) : (
        <section
          className="rs485-topology"
          aria-label="Sơ đồ kết nối RS485"
          style={{ marginBottom: 20 }}
        >
          <div className="rs485-master">
            <WifiOutlined />
            <strong>{primaryMaster?.masterId ?? '—'}</strong>
            <span>RS485 Master</span>
          </div>
          <div className="rs485-bus-line" aria-hidden="true">
            <span>RS485 BUS</span>
          </div>
          <div className="rs485-node-grid">
            {masters.map((master) => {
              const cfg = STATUS_CONFIG[master.reportedStatus ?? 'offline']
              return (
                <div key={master.masterId} className="rs485-node">
                  <Tag color={cfg.color}>{cfg.label}</Tag>
                  <strong>{master.masterId}</strong>
                  <span>Tầng {master.cultivationRoomId ?? '—'}</span>
                </div>
              )
            })}
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Trạng thái từng node RS485 chi tiết (latency / packet loss):{' '}
            {NO_BACKEND_HINT}
          </Typography.Text>
        </section>
      )}

      {/* ── Per-Tier Sections (telemetry thật + climate config) ── */}
      <Flex vertical gap={16}>
        {tiersWithEnv.map(
          ({ tier, source, liveTemperature, liveHumidity }) => {
            const thresholdsForTier =
              thresholdsByTier.find(
                (entry) => entry.tierId === tier.tierId,
              ) ?? null

            return (
              <section
                key={tier.tierId}
                className="device-tier-section"
              >
                <Flex
                  align="flex-start"
                  justify="space-between"
                  gap={16}
                  wrap
                  style={{ marginBottom: 16 }}
                >
                  <div>
                    <Flex align="center" gap={8} wrap>
                      <Typography.Title level={4} style={{ margin: 0 }}>
                        {tier.name}
                      </Typography.Title>
                      <Tag
                        color={source === 'real' ? 'success' : 'warning'}
                      >
                        Telemetry:{' '}
                        {source === 'real'
                          ? 'real-time API'
                          : `mock — ${NO_BACKEND_HINT}`}
                      </Tag>
                    </Flex>
                    <Typography.Text type="secondary">
                      Nhiệt độ:{' '}
                      {liveTemperature != null
                        ? `${liveTemperature.toFixed(1)}°C`
                        : '—'}{' '}
                      · Độ ẩm:{' '}
                      {liveHumidity != null
                        ? `${liveHumidity.toFixed(1)}%RH`
                        : '—'}{' '}
                      · CO₂: chưa có sensor ({NO_BACKEND_HINT})
                    </Typography.Text>
                  </div>

                  <Space wrap>
                    <Button
                      className="floor-climate-config-trigger"
                      icon={<SettingOutlined />}
                      onClick={() => setClimateConfigFloor(tier.tierId)}
                    >
                      Cấu hình AUTO
                    </Button>
                  </Space>
                </Flex>

                {thresholdsForTier && (
                  <DeviceMetricsGrid
                    telemetry={tier.telemetry}
                    thresholds={thresholdsForTier.thresholds}
                  />
                )}
              </section>
            )
          },
        )}
      </Flex>

      {selectedClimateTier && climateConfig && (
        <FloorClimateConfigModal
          key={selectedClimateTier.tierId}
          open
          floorName={selectedClimateTier.name}
          config={climateConfig}
          trays={selectedClimateTier.trays}
          mushroomProfiles={[]}
          onCancel={() => setClimateConfigFloor(null)}
          onSubmit={() => {
            setClimateConfigFloor(null)
          }}
        />
      )}
    </div>
  )
}
