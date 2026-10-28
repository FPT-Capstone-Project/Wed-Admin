import { useMemo, useState } from 'react'
import {
  ApiOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  ControlOutlined,
  ExperimentOutlined,
  EyeOutlined,
  NodeIndexOutlined,
  SyncOutlined,
  ThunderboltOutlined,
  WifiOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Flex,
  Segmented,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { ActionButton, StatCard } from '../../../shared/ui'
import { formatSensorLabel } from '../../../shared/i18n/terms'
import {
  useAutoControlConfigList,
  useFloorList,
  useMasterList,
  useMasterSensors,
  useResolvedFloorEnvironment,
  TELEMETRY_POLL_INTERVAL_MS,
} from '../../../features/devices/hooks/useIoT'
import type {
  CultivationFloorMapping,
  FloorStatus,
  IotSensor,
  MasterStatus,
} from '../../../types/iot'
import { AutoControlDetailModal } from './AutoControlDetailModal'
import { SensorHistoryPanel } from './SensorHistoryPanel'
import {
  formatDurationMs,
  formatProfileName,
  formatTriggerCondition,
} from '../utils/auto-control.utils'

const MASTER_STATUS_CONFIG: Record<
  MasterStatus,
  { color: string; label: string }
> = {
  online: { color: 'success', label: 'Trực tuyến' },
  offline: { color: 'default', label: 'Mất kết nối' },
}

/** Tab của card "Cảm biến môi trường". */
type SensorTab = 'realtime' | 'history'

function formatTimestamp(timestamp: string | number | null) {
  if (!timestamp) return '—'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('vi-VN')
}

/**
 * Panel giám sát thiết bị IoT — **CHỈ ĐỌC**.
 *
 * ⚠ Admin web chỉ được XEM. Mọi thao tác cấu hình (đặt ngưỡng, bật/tắt
 * tưới tự động, tạo/sửa tầng, gán khay, duyệt profile) do **nhân viên
 * (staff)** thực hiện trên mobile app — xem `features/auth/permissions.ts`
 * (`iot.automation.manage`).
 *
 * Vì vậy panel này cố tình **không** render:
 *   - nút "Thêm cấu hình tầng"
 *   - nút "Cấu hình" / "Chỉnh sửa" / "Lưu" / "Cập nhật" / "Xóa"
 *   - toggle bật/tắt tưới thủ công
 *   - các modal cấu hình (assign tray, auto-thresholds, floor form)
 *
 * Cột "Hành động" của bảng cấu hình chỉ có **một** nút: `Xem chi tiết`,
 * mở modal chỉ đọc (`AutoControlDetailModal`) với 2 tab:
 *   1. Cấu hình tự động hiện tại (Descriptions — không dùng Form/Input)
 *   2. Nhật ký kích hoạt (bảng log của hệ thống)
 *
 * API gắn trực tiếp (chỉ đọc):
 *  - GET /api/iot/masters
 *  - GET /api/iot/masters/{id}/sensors
 *  - GET /api/iot/floors
 *  - GET /api/iot/floors/{id}/environment
 *  - GET /api/iot/floors/{id}/auto-control
 *  - GET /api/iot/floors/{id}/auto-control/logs
 */
export function DeviceControlPanel() {
  const navigate = useNavigate()

  /**
   * Tab đang xem trong card "Cảm biến môi trường".
   *
   * ⚠ `realtime` → polling 3s (bảng số liệu live).
   * `history`   → **tắt polling** (chỉ tra cứu lịch sử, không cần live).
   */
  const [sensorTab, setSensorTab] = useState<SensorTab>('realtime')
  const isRealtimeTab = sensorTab === 'realtime'

  // ── Data from APIs (read-only) ───────────────────────────────────────
  const { data: masters = [] } = useMasterList({ staleTime: 30_000 })
  const { data: floors = [], isLoading: floorsLoading } = useFloorList()

  /**
   * Telemetry cảm biến — polling 3s khi đang ở tab "Thời gian thực".
   *
   * ⚠ `refetchInterval: false` khi chuyển sang tab "Lịch sử" ⇒ TanStack Query
   * **xoá timer** ⇒ không còn gọi `GET /api/iot/masters/{id}/sensors` mỗi 3s.
   */
  const { data: sensorsResponse, isLoading: sensorsLoading, isFetching: sensorsFetching } =
    useMasterSensors(masters[0]?.masterId ?? null, {
      refetchInterval: isRealtimeTab ? TELEMETRY_POLL_INTERVAL_MS : false,
    })
  const sensors = sensorsResponse?.sensors ?? []

  // ── Detail drawers (chỉ xem) ─────────────────────────────────────────
  const [selectedFloor, setSelectedFloor] =
    useState<CultivationFloorMapping | null>(null)
  const [selectedSensor, setSelectedSensor] = useState<IotSensor | null>(null)

  // Tầng đang mở modal "Xem chi tiết" — CHỈ ĐỌC (xem cấu hình + nhật ký).
  const [autoControlFloor, setAutoControlFloor] =
    useState<CultivationFloorMapping | null>(null)

  // Cấu hình tự động của từng tầng — để bảng hiển thị tóm tắt ngưỡng.
  const floorIds = useMemo(
    () => floors.map((floor) => floor.floor_id).filter((id) => id > 0),
    [floors],
  )
  const { configByFloorId, isLoading: configsLoading } =
    useAutoControlConfigList(floorIds)

  // Master của tầng đang xem — `master_id` là số, API cần `masterId` string.
  const selectedFloorMasterId =
    masters.find((m) => m.id === selectedFloor?.master_id)?.masterId ?? null

  // Môi trường tầng — tự fallback sang telemetry Master khi API environment
  // rỗng (BE chưa map tray → node_id/sensor_id).
  //
  // ⚠ `floorId` = `floor_id` của BE, **không** phải `room_id` (nhiều tầng
  // có thể cùng room). Xem `CultivationFloorMapping.floor_id`.
  //
  // ⚠ Chỉ polling khi đang ở tab "Thời gian thực" — tab "Lịch sử" thì tắt
  // để không gọi API vô ích.
  const floorEnv = useResolvedFloorEnvironment(
    selectedFloor?.floor_id ?? null,
    selectedFloorMasterId,
    selectedFloor?.node_address ?? null,
    {
      refetchInterval: isRealtimeTab
        ? TELEMETRY_POLL_INTERVAL_MS
        : false,
    },
  )

  // ── Tables ──────────────────────────────────────────────────────────
  const sensorColumns: ColumnsType<IotSensor> = [
    {
      title: 'Cụm cảm biến',
      key: 'nodeId',
      width: 150,
      render: (_, row) => (
        <Flex align="center" gap={6}>
          <NodeIndexOutlined style={{ color: 'var(--ant-color-primary)' }} />
          <Typography.Text strong>
            Cụm cảm biến Tầng {row.nodeId}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Cảm biến',
      key: 'sensorId',
      width: 110,
      render: (_, row) => (
        <Tag color="blue">Cảm biến #{row.sensorId}</Tag>
      ),
    },
    {
      title: 'Nhiệt độ (°C)',
      key: 'temp',
      width: 130,
      align: 'right',
      render: (_, row) =>
        row.temperature == null ? (
          <Typography.Text type="secondary">—</Typography.Text>
        ) : (
          <Flex align="baseline" gap={4} justify="flex-end">
            <Typography.Text
              strong
              style={{
                fontSize: 18,
                color:
                  row.temperature > 30
                    ? 'var(--ant-color-error)'
                    : row.temperature < 18
                      ? 'var(--ant-color-info)'
                      : 'var(--ant-color-success)',
              }}
            >
              {row.temperature.toFixed(1)}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>°C</Typography.Text>
          </Flex>
        ),
    },
    {
      title: 'Độ ẩm (%)',
      key: 'hum',
      width: 120,
      align: 'right',
      render: (_, row) =>
        row.humidity == null ? (
          <Typography.Text type="secondary">—</Typography.Text>
        ) : (
          <Flex align="baseline" gap={4} justify="flex-end">
            <Typography.Text
              strong
              style={{
                fontSize: 18,
                color:
                  row.humidity < 70
                    ? 'var(--ant-color-warning)'
                    : 'var(--ant-color-success)',
              }}
            >
              {row.humidity.toFixed(0)}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>%</Typography.Text>
          </Flex>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'ok',
      key: 'ok',
      width: 110,
      align: 'center',
      render: (ok: boolean) =>
        ok ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Ổn định
          </Tag>
        ) : (
          <Tag icon={<ApiOutlined />} color="warning">
            Sai số
          </Tag>
        ),
    },
    {
      title: 'Cập nhật cuối',
      key: 'lastReceived',
      width: 170,
      render: (_, row) => (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {formatTimestamp(row.lastReceivedAt)}
        </Typography.Text>
      ),
    },
    {
      title: 'Chi tiết',
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <ActionButton
          icon={<BulbOutlined />}
          label="Xem chi tiết cảm biến"
          description="Mở bảng thông số đầy đủ của cảm biến này"
          hideLabel
          onClick={() => setSelectedSensor(record)}
        />
      ),
    },
  ]

  const floorColumns: ColumnsType<CultivationFloorMapping> = [
    {
      title: 'Tầng',
      key: 'floor',
      width: 110,
      align: 'center',
      render: (_, record) => (
        <Tooltip title="Xem môi trường thực tế của tầng">
          <Button
            type="link"
            size="small"
            style={{ padding: 0, height: 'auto' }}
            onClick={() => setSelectedFloor(record)}
          >
            <Tag color="cyan" style={{ fontSize: 13, padding: '2px 8px' }}>
              Tầng {record.floor_number}
            </Tag>
          </Button>
        </Tooltip>
      ),
    },
    {
      title: 'Tên tầng',
      dataIndex: 'floor_name',
      key: 'floor_name',
      width: 180,
    },
    {
      title: 'Bộ điều khiển',
      key: 'master',
      width: 160,
      render: (_, record) => {
        const master = masters.find((m) => m.id === record.master_id)
        if (!master) return <Typography.Text type="secondary">—</Typography.Text>
        const status = master.reportedStatus ?? 'offline'
        return (
          <Flex vertical gap={2}>
            <Flex align="center" gap={4}>
              <ControlOutlined style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)' }} />
              <Typography.Text code style={{ fontSize: 12 }}>
                {master.masterId}
              </Typography.Text>
            </Flex>
            <Tag color={MASTER_STATUS_CONFIG[status].color} style={{ fontSize: 11, width: 'fit-content' }}>
              {MASTER_STATUS_CONFIG[status].label}
            </Tag>
          </Flex>
        )
      },
    },
    {
      title: 'Cụm cảm biến',
      dataIndex: 'node_address',
      key: 'node_address',
      width: 120,
      align: 'center',
      render: (addr: number) => (
        <Tag color="geekblue">Cụm {addr}</Tag>
      ),
    },
    {
      title: 'Kênh rơ-le',
      dataIndex: 'misting_ssr_channel',
      key: 'misting_ssr_channel',
      width: 130,
      align: 'center',
      render: (ch: number) => (
        <Tag color="volcano" style={{ fontSize: 12 }}>
          <ThunderboltOutlined /> Kênh {ch}
        </Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      align: 'center',
      render: (status: FloorStatus) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'default'}>
          {status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng'}
        </Tag>
      ),
    },
    {
      title: 'Chế độ / Điều kiện kích hoạt',
      key: 'triggerCondition',
      width: 220,
      render: (_, record) => {
        const config = configByFloorId.get(record.floor_id)
        const condition = formatTriggerCondition(config)
        if (!condition) {
          return (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Chưa có cấu hình
            </Typography.Text>
          )
        }
        const profileName = formatProfileName(config)
        return (
          <Flex vertical gap={2}>
            <Tag color="cyan" style={{ fontSize: 12, width: 'fit-content' }}>
              {condition}
            </Tag>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {profileName ?? 'Tự động theo độ ẩm'}
            </Typography.Text>
          </Flex>
        )
      },
    },
    {
      title: 'Thời lượng phun',
      key: 'pulseDuration',
      width: 140,
      align: 'right',
      render: (_, record) => {
        const config = configByFloorId.get(record.floor_id)
        const duration = formatDurationMs(config?.misting_pulse_ms)
        if (!duration) {
          return (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              —
            </Typography.Text>
          )
        }
        return (
          <Typography.Text strong style={{ fontSize: 13 }}>
            {duration}
          </Typography.Text>
        )
      },
    },
    {
      // ⚠ Cột hành động CHỈ có nút xem — không có Edit / Setting / Xóa /
      // bật-tắt thủ công (quyền này thuộc staff trên mobile app).
      title: 'Hành động',
      key: 'actions',
      width: 150,
      align: 'center',
      render: (_, record) => (
        <ActionButton
          icon={<EyeOutlined />}
          label="Xem chi tiết"
          description="Xem cấu hình tự động và nhật ký kích hoạt của tầng này"
          onClick={() => setAutoControlFloor(record)}
        />
      ),
    },
  ]

  return (
    <>
      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
        <StatCard
          title="Bộ điều khiển trung tâm"
          value={masters.length}
          icon={<ControlOutlined />}
          description="Master đã đăng ký"
          style={{ flex: '1 1 200px' }}
        />
        <StatCard
          title="Số tầng đã cấu hình"
          value={floors.length}
          icon={<ExperimentOutlined />}
          description="Tầng trong nhà trồng"
          style={{ flex: '1 1 200px' }}
        />
        <StatCard
          title="Cảm biến môi trường"
          value={sensors.length}
          icon={<WifiOutlined />}
          description="Cảm biến nhiệt độ & độ ẩm"
          style={{ flex: '1 1 200px' }}
        />
        <StatCard
          title="Bộ điều khiển trực tuyến"
          value={masters.filter((m) => m.reportedStatus === 'online').length}
          suffix={`/ ${masters.length}`}
          icon={<WifiOutlined />}
          tone="ok"
          highlightValue
          description="Đang kết nối bình thường"
          style={{ flex: '1 1 200px' }}
        />
      </Flex>

      {/* ── Floor Configuration (read-only) ────────────────────────────── */}
      <Card
        title={
          <Flex align="center" gap={8}>
            <ThunderboltOutlined aria-hidden="true" />
            <span>Cấu hình tưới phun sương tự động</span>
          </Flex>
        }
        extra={
          <Tag icon={<ApiOutlined />} color="default">
            Chỉ xem
          </Tag>
        }
        style={{ marginBottom: 16 }}
        styles={{ body: { padding: 12 } }}
      >
        <Table<CultivationFloorMapping>
          rowKey="floor_id"
          columns={floorColumns}
          dataSource={floors}
          loading={floorsLoading || configsLoading}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 1400 }}
          locale={{
            emptyText: (
              <Empty description="Chưa cấu hình tầng nào. Nhân viên có thể thiết lập trên mobile app." />
            ),
          }}
        />
      </Card>

      {/* ── Sensor Master Snapshot ──────────────────────────────────────── */}
      <Card
        title={
          <Flex align="center" gap={8}>
            <WifiOutlined aria-hidden="true" />
            <span>
              Cảm biến môi trường — Bộ điều khiển {masters[0]?.masterId ?? '—'}
            </span>
            {isRealtimeTab && sensorsFetching && !sensorsLoading && (
              <Tag color="processing" style={{ fontSize: 11 }}>
                <SyncOutlined spin /> Đang cập nhật
              </Tag>
            )}
          </Flex>
        }
        extra={
          <Flex align="center" gap={12}>
            {isRealtimeTab && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Tự cập nhật mỗi {TELEMETRY_POLL_INTERVAL_MS / 1000}s
              </Typography.Text>
            )}
            <Segmented<SensorTab>
              value={sensorTab}
              options={[
                { label: 'Thời gian thực', value: 'realtime' },
                { label: 'Lịch sử', value: 'history' },
              ]}
              onChange={setSensorTab}
            />
          </Flex>
        }
        styles={{ body: { padding: 12 } }}
      >
        {isRealtimeTab ? (
          <Table<IotSensor>
            rowKey={(row) => `${row.nodeId}-${row.sensorId}`}
            columns={sensorColumns}
            dataSource={sensors}
            loading={masters.length === 0}
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 800 }}
            locale={{
              emptyText: (
                <Empty description="Chưa nhận dữ liệu từ cảm biến nào." />
              ),
            }}
          />
        ) : (
          /*
            Tab "Lịch sử" — polling đã TẮT (refetchInterval: false) nên không
            tốn request nào cho bảng live.
          */
          <SensorHistoryPanel
            masterId={masters[0]?.masterId ?? null}
            onOpenFullHistory={() => navigate('/devices/history')}
          />
        )}
      </Card>

      {/* ── Floor Environment Drawer (read-only) ───────────────────────── */}
      <Drawer
        title={
          selectedFloor ? (
            <Space>
              <ExperimentOutlined />
              <span>Môi trường {selectedFloor.floor_name}</span>
            </Space>
          ) : (
            'Môi trường tầng'
          )
        }
        open={Boolean(selectedFloor)}
        onClose={() => setSelectedFloor(null)}
        width={520}
        destroyOnHidden
      >
        {selectedFloor && (
          <Flex vertical gap={16}>
            <Descriptions
              column={1}
              bordered
              size="small"
              items={[
                {
                  key: 'room_id',
                  label: 'Room ID',
                  children: selectedFloor.room_id,
                },
                {
                  key: 'floor_number',
                  label: 'Số tầng',
                  children: selectedFloor.floor_number,
                },
                {
                  key: 'avgTemperature',
                  label: 'Nhiệt độ trung bình',
                  children:
                    floorEnv.data.avgTemperature != null
                      ? `${floorEnv.data.avgTemperature.toFixed(1)}°C`
                      : '—',
                },
                {
                  key: 'avgHumidity',
                  label: 'Độ ẩm trung bình',
                  children:
                    floorEnv.data.avgHumidity != null
                      ? `${floorEnv.data.avgHumidity.toFixed(1)}%RH`
                      : '—',
                },
                {
                  key: 'validSensors',
                  label: 'Sensor hợp lệ',
                  children: floorEnv.isFallback
                    ? `${floorEnv.data.sensors.length} sensor(s) (từ Node ${selectedFloor.node_address})`
                    : `${floorEnv.data.sensors.length} sensor(s)`,
                },
                {
                  key: 'channel',
                  label: 'Kênh SSR',
                  children: `Kênh ${selectedFloor.misting_ssr_channel}`,
                },
              ]}
            />

            {floorEnv.isFallback && (
              <Alert
                type="warning"
                showIcon
                message="Đã kết nối dữ liệu từ Node RS485 của tầng. Khay chưa được cấu hình sensor_id trong DB."
                description={`Nhiệt độ / độ ẩm dưới đây là số đo thật từ Node ${
                  selectedFloor.node_address
                }, không phải từ bản ghi khay.`}
              />
            )}

            <Typography.Title level={5} style={{ marginTop: 0 }}>
              Cảm biến tầng
            </Typography.Title>

            {floorEnv.data.sensors.length > 0 ? (
              <Flex vertical gap={8}>
                {floorEnv.data.sensors.map((sensor) => (
                  <Card key={`${sensor.nodeId}-${sensor.sensorId}`} size="small">
                    <Flex justify="space-between" align="center">
                      <Flex vertical gap={2}>
                        <Typography.Text strong>
                          {formatSensorLabel(sensor.nodeId, sensor.sensorId)}
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          Cập nhật: {formatTimestamp(sensor.lastReceivedAt)}
                        </Typography.Text>
                      </Flex>
                      <Flex gap={12} align="baseline">
                        <Flex align="baseline" gap={2}>
                          <Typography.Text
                            strong
                            style={{
                              fontSize: 20,
                              color:
                                sensor.temperature != null && sensor.temperature > 30
                                  ? 'var(--ant-color-error)'
                                  : 'var(--ant-color-text)',
                            }}
                          >
                            {sensor.temperature != null ? sensor.temperature.toFixed(1) : '—'}
                          </Typography.Text>
                          <Typography.Text type="secondary" style={{ fontSize: 11 }}>°C</Typography.Text>
                        </Flex>
                        <Flex align="baseline" gap={2}>
                          <Typography.Text
                            strong
                            style={{
                              fontSize: 20,
                              color:
                                sensor.humidity != null && sensor.humidity < 70
                                  ? 'var(--ant-color-warning)'
                                  : 'var(--ant-color-success)',
                            }}
                          >
                            {sensor.humidity != null ? sensor.humidity.toFixed(0) : '—'}
                          </Typography.Text>
                          <Typography.Text type="secondary" style={{ fontSize: 11 }}>%</Typography.Text>
                        </Flex>
                      </Flex>
                    </Flex>
                  </Card>
                ))}
              </Flex>
            ) : (
              <Empty description="Chưa có dữ liệu sensor cho tầng này." />
            )}
          </Flex>
        )}
      </Drawer>

      {/* ── Sensor Detail Drawer ────────────────────────────────────────── */}
      <Drawer
        title="Chi tiết cảm biến"
        open={Boolean(selectedSensor)}
        onClose={() => setSelectedSensor(null)}
        size={460}
        destroyOnHidden
      >
        {selectedSensor && (
          <Descriptions
            column={1}
            bordered
            size="small"
            items={[
              {
                key: 'master',
                label: 'Bộ điều khiển',
                children: selectedSensor.masterId,
              },
              {
                key: 'node',
                label: 'Cụm cảm biến',
                children: `Cụm cảm biến Tầng ${selectedSensor.nodeId}`,
              },
              {
                key: 'sensor',
                label: 'Cảm biến',
                children: `Cảm biến #${selectedSensor.sensorId}`,
              },
              {
                key: 'temperature',
                label: 'Nhiệt độ',
                children:
                  selectedSensor.temperature != null
                    ? `${selectedSensor.temperature.toFixed(2)} °C`
                    : '—',
              },
              {
                key: 'humidity',
                label: 'Độ ẩm',
                children:
                  selectedSensor.humidity != null
                    ? `${selectedSensor.humidity.toFixed(2)} %RH`
                    : '—',
              },
              {
                key: 'ok',
                label: 'Trạng thái',
                children: selectedSensor.ok ? (
                  <Tag color="success">OK</Tag>
                ) : (
                  <Tag color="error">Lỗi</Tag>
                ),
              },
              {
                key: 'measuredAt',
                label: 'Đo lúc',
                children: formatTimestamp(selectedSensor.measuredAt),
              },
              {
                key: 'lastValid',
                label: 'Hợp lệ cuối',
                children: formatTimestamp(selectedSensor.lastValidAt),
              },
            ]}
          />
        )}
      </Drawer>

      {/* ── Auto Control Detail Modal (READ-ONLY) ─────────────────────── */}
      {/*
        Modal chỉ hiển thị: cấu hình tự động + nhật ký kích hoạt.
        Không có form, không có nút lưu / sửa / xóa / bật-tắt.
      */}
      <AutoControlDetailModal
        floor={autoControlFloor}
        open={autoControlFloor !== null}
        onClose={() => setAutoControlFloor(null)}
      />
    </>
  )
}
