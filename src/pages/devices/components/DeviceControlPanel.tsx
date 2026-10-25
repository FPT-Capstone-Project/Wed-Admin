import { useMemo, useState } from 'react'
import {
  ApiOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  ControlOutlined,
  EditOutlined,
  ExperimentOutlined,
  NodeIndexOutlined,
  PoweroffOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  WifiOutlined,
} from '@ant-design/icons'
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ActionButton, StatCard } from '../../../shared/ui'
import { formatSensorLabel } from '../../../shared/i18n/terms'
import {
  useCommandStatus,
  useCreateFloor,
  useFloorEnvironment,
  useFloorList,
  useMasterList,
  useMasterSensors,
  useResolvedFloorEnvironment,
  useUpdateFloor,
} from '../../../features/devices/hooks/useIoT'
import { ACTIVE_NODE_IDS } from '../../../features/devices/utils/iot-node-scope'
import { AssignTrayModal } from './AssignTrayModal'
import { AutoThresholdsConfigModal } from './AutoThresholdsConfigModal'
import { FloorAutomationDrawer } from './FloorAutomationDrawer'
import type {
  CultivationFloorMapping,
  CultivationFloorMappingInput,
  FloorStatus,
  IotCommand,
  IotSensor,
  IotSsrChannelState,
  MasterStatus,
} from '../../../types/iot'

const MASTER_STATUS_CONFIG: Record<
  MasterStatus,
  { color: string; label: string }
> = {
  online: { color: 'success', label: 'Trực tuyến' },
  offline: { color: 'default', label: 'Mất kết nối' },
}

const FLOOR_STATUS_OPTIONS: Array<{ value: FloorStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'INACTIVE', label: 'Ngừng' },
]

function formatTimestamp(timestamp: string | number | null) {
  if (!timestamp) return '—'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('vi-VN')
}

interface FloorFormValues {
  room_id: number
  floor_number: number
  floor_name: string
  master_id: number
  node_address: number
  misting_ssr_channel: number
  status: FloorStatus
}

/**
 * Panel điều khiển thiết bị IoT toàn diện.
 *
 * Gắn trực tiếp các API:
 *  - GET    /api/iot/masters
 *  - GET    /api/iot/masters/{id}/sensors
 *  - GET    /api/iot/commands/{commandId}
 *  - GET    /api/iot/floors
 *  - POST   /api/iot/floors
 *  - PUT    /api/iot/floors/{id}
 *  - PUT    /api/iot/floors/{id}/trays/{trayId}
 *  - GET    /api/iot/floors/{id}/environment
 *  - PUT    /api/iot/floors/{id}/auto-control
 */
export function DeviceControlPanel() {
  const { message } = App.useApp()

  // ── Data from APIs ──────────────────────────────────────────────────
  const { data: masters = [] } = useMasterList({ staleTime: 30_000 })
  const { data: floors = [], isLoading: floorsLoading } = useFloorList()
  const { data: sensorsResponse } = useMasterSensors(
    masters[0]?.masterId ?? null,
  )
  const sensors = sensorsResponse?.sensors ?? []

  // ── Floor CRUD ──────────────────────────────────────────────────────
  const [floorModalOpen, setFloorModalOpen] = useState(false)
  const [editingFloor, setEditingFloor] = useState<CultivationFloorMapping | null>(
    null,
  )
  const [floorForm] = Form.useForm<FloorFormValues>()

  const createFloor = useCreateFloor({
    onSuccess: () => {
      message.success('Đã tạo cấu hình tầng.')
      setFloorModalOpen(false)
      floorForm.resetFields()
    },
    onError: (err) => message.error(err.message),
  })

  const updateFloor = useUpdateFloor({
    onSuccess: () => {
      message.success('Đã cập nhật cấu hình tầng.')
      setFloorModalOpen(false)
      floorForm.resetFields()
      setEditingFloor(null)
    },
    onError: (err) => message.error(err.message),
  })

  // ── Modal hành động trên tầng ────────────────────────────────────────
  const [assignTrayFloor, setAssignTrayFloor] =
    useState<CultivationFloorMapping | null>(null)
  const [thresholdFloor, setThresholdFloor] =
    useState<CultivationFloorMapping | null>(null)
  const [automationFloor, setAutomationFloor] =
    useState<CultivationFloorMapping | null>(null)

  // ── Detail drawers ──────────────────────────────────────────────────
  const [selectedFloor, setSelectedFloor] =
    useState<CultivationFloorMapping | null>(null)
  const [selectedCommandId, setSelectedCommandId] = useState<string | null>(null)
  const [selectedSensor, setSelectedSensor] = useState<IotSensor | null>(null)

  const { data: commandData } = useCommandStatus(selectedCommandId)

  // Master của tầng đang xem — `master_id` là số, API cần `masterId` string.
  const selectedFloorMasterId =
    masters.find((m) => m.id === selectedFloor?.master_id)?.masterId ?? null

  // Môi trường tầng — tự fallback sang telemetry Master khi API environment
  // rỗng (BE chưa map tray → node_id/sensor_id).
  //
  // ⚠ `floorId` = `floor_id` của BE, **không** phải `room_id` (nhiều tầng
  // có thể cùng room). Xem `CultivationFloorMapping.floor_id`.
  const floorEnv = useResolvedFloorEnvironment(
    selectedFloor?.floor_id ?? null,
    selectedFloorMasterId,
    selectedFloor?.node_address ?? null,
  )

  // Env riêng cho modal ngưỡng — modal có thể mở từ nút trong bảng mà
  // drawer môi trường đang đóng, nên không dùng chung `floorEnv`.
  const { data: thresholdEnv } = useFloorEnvironment(
    thresholdFloor?.floor_id ?? null,
  )

  // Sync form values khi mở modal floor
  useMemo(() => {
    if (!floorModalOpen) return
    floorForm.setFieldsValue({
      room_id: editingFloor?.room_id ?? (masters[0]?.cultivationRoomId ?? 1),
      floor_number: editingFloor?.floor_number ?? 1,
      floor_name:
        editingFloor?.floor_name ?? `Tầng ${editingFloor?.floor_number ?? 1}`,
      master_id: editingFloor?.master_id ?? (masters[0]?.id ?? 1),
      node_address: editingFloor?.node_address ?? 1,
      misting_ssr_channel: editingFloor?.misting_ssr_channel ?? 1,
      status: editingFloor?.status ?? 'ACTIVE',
    })
  }, [
    editingFloor,
    floorForm,
    floorModalOpen,
    masters,
  ])

  const handleOpenCreate = () => {
    setEditingFloor(null)
    setFloorModalOpen(true)
  }
  const handleOpenEdit = (floor: CultivationFloorMapping) => {
    setEditingFloor(floor)
    setFloorModalOpen(true)
  }

  const handleSubmitFloor = (values: FloorFormValues) => {
    const payload: CultivationFloorMappingInput = { ...values }
    if (editingFloor) {
      // BE PUT /api/iot/floors/{floorId} — floorId = `floor_id`, không phải room_id
      updateFloor.mutate({
        floorId: editingFloor.floor_id,
        payload,
      })
      return
    }
    createFloor.mutate(payload)
  }

  // Gán khay và lưu ngưỡng đã tách sang modal riêng — xem AssignTrayModal
  // và AutoThresholdsConfigModal. Ở đây chỉ mở modal tương ứng.

  const handleOpenAssignTray = (floor: CultivationFloorMapping) => {
    setAssignTrayFloor(floor)
  }

  const handleOpenThresholds = (floor: CultivationFloorMapping) => {
    setThresholdFloor(floor)
  }

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
      width: 90,
      align: 'center',
      render: (_, record) => (
        <Tag color="cyan" style={{ fontSize: 13, padding: '2px 8px' }}>
          Tầng {record.floor_number}
        </Tag>
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
      title: 'Kênh rơ-le máy bơm',
      dataIndex: 'misting_ssr_channel',
      key: 'misting_ssr_channel',
      width: 140,
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
      title: 'Hành động',
      key: 'actions',
      width: 300,
      align: 'right',
      render: (_, record) => (
        <Space size={4} wrap>
          {/* Nút chính: hiện label rõ ràng */}
          <ActionButton
            icon={<ThunderboltOutlined />}
            label="Điều khiển tưới"
            description="Bật/tắt tưới tự động và xem nhật ký điều khiển"
            variant="primary"
            onClick={() => setAutomationFloor(record)}
          />
          {/* Nút phụ: icon + tooltip tiếng Việt */}
          <ActionButton
            icon={<ExperimentOutlined />}
            label="Xem môi trường"
            description="Xem nhiệt độ và độ ẩm thực tế của tầng"
            hideLabel
            onClick={() => setSelectedFloor(record)}
          />
          <ActionButton
            icon={<SettingOutlined />}
            label="Cấu hình ngưỡng tự động"
            description="Đặt ngưỡng độ ẩm để hệ thống tự tưới"
            hideLabel
            onClick={() => handleOpenThresholds(record)}
          />
          <ActionButton
            icon={<EditOutlined />}
            label="Sửa cấu hình tầng"
            description="Chỉnh sửa thông số của tầng: tên, bộ điều khiển, kênh rơ-le"
            hideLabel
            variant="text"
            onClick={() => handleOpenEdit(record)}
          />
          <ActionButton
            icon={<NodeIndexOutlined />}
            label="Gán khay cho tầng"
            description="Liên kết khay nấm với tầng này để theo dõi môi trường"
            hideLabel
            variant="text"
            onClick={() => handleOpenAssignTray(record)}
          />
        </Space>
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
          tone="success"
          highlightValue
          description="Đang kết nối bình thường"
          style={{ flex: '1 1 200px' }}
        />
      </Flex>

      {/* ── Floor Configuration ─────────────────────────────────────────── */}
      <Card
        title={
          <Flex align="center" gap={8}>
            <ThunderboltOutlined aria-hidden="true" />
            <span>Cấu hình tưới phun sương tự động</span>
          </Flex>
        }
        extra={
          <Button
            type="primary"
            icon={<PoweroffOutlined />}
            onClick={handleOpenCreate}
          >
            Thêm cấu hình tầng
          </Button>
        }
        style={{ marginBottom: 16 }}
        styles={{ body: { padding: 12 } }}
      >
        <Table<CultivationFloorMapping>
          rowKey="floor_id"
          columns={floorColumns}
          dataSource={floors}
          loading={floorsLoading}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 900 }}
          locale={{
            emptyText: (
              <Empty description="Chưa cấu hình tầng nào — bấm 'Thêm cấu hình tầng'." />
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
          </Flex>
        }
        extra={
          <Segmented
            value="realtime"
            options={[
              { label: 'Thời gian thực', value: 'realtime' },
              { label: 'Lịch sử', value: 'history' },
            ]}
            onChange={(value) => {
              if (value === 'history') {
                message.info('Lịch sử cảm biến mở tại tab Lịch sử Telemetry.')
              }
            }}
          />
        }
        styles={{ body: { padding: 12 } }}
      >
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
      </Card>

      {/* ── Floor Environment Drawer ────────────────────────────────────── */}
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
                description={`Độ ẩm/ nhiệt độ dưới đây là số đo thật từ Node ${
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

            <Flex vertical gap={10}>
              <Button
                type="primary"
                icon={<PoweroffOutlined />}
                onClick={() => handleOpenThresholds(selectedFloor)}
              >
                Cấu hình ngưỡng Auto-misting
              </Button>
              <Button
                icon={<ApiOutlined />}
                onClick={() => handleOpenAssignTray(selectedFloor)}
              >
                Gán khay cho tầng này
              </Button>
            </Flex>

            {/* Cho phép lưu ngưỡng kể cả khi tầng chưa có sensor — xem
                AutoThresholdsConfigModal. Chỉ bật AUTO mới cần sensor. */}
            {floorEnv.data.sensors.length === 0 && (
              <Alert
                type="info"
                showIcon
                message="Tầng chưa có sensor. Bạn vẫn có thể lưu ngưỡng trước; nút 'Bắt đầu AUTO' sẽ báo lỗi cho tới khi có sensor."
              />
            )}
          </Flex>
        )}
      </Drawer>

      {/* ── Floor Automation Drawer (AUTO control + profile + logs) ───── */}
      {automationFloor && (
        <FloorAutomationDrawer
          floorId={automationFloor.floor_id}
          floorName={automationFloor.floor_name}
          open
          onClose={() => setAutomationFloor(null)}
        />
      )}

      {/* ── Assign Tray Modal (thay window.prompt) ─────────────────────── */}
      {assignTrayFloor && (
        <AssignTrayModal
          floorId={assignTrayFloor.floor_id}
          floorName={assignTrayFloor.floor_name}
          floorNumber={assignTrayFloor.floor_number}
          roomId={assignTrayFloor.room_id}
          open
          onClose={() => setAssignTrayFloor(null)}
        />
      )}

      {/* ── Auto Thresholds Config Modal ────────────────────────────────── */}
      {thresholdFloor && (
        <AutoThresholdsConfigModal
          floorId={thresholdFloor.floor_id}
          floorName={thresholdFloor.floor_name}
          open
          validSensorCount={thresholdEnv?.sensors.length ?? 0}
          onClose={() => setThresholdFloor(null)}
        />
      )}

      {/* ── Sensor Detail Drawer ────────────────────────────────────────── */}
      <Drawer
        title="Chi tiết cảm biến"
        open={Boolean(selectedSensor)}
        onClose={() => setSelectedSensor(null)}
        width={460}
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

      {/* ── Command Status Drawer ───────────────────────────────────────── */}
      <Drawer
        title="Trạng thái lệnh SSR"
        open={Boolean(selectedCommandId)}
        onClose={() => setSelectedCommandId(null)}
        width={460}
        destroyOnHidden
        extra={
          <Typography.Text code style={{ fontSize: 12 }}>
            {selectedCommandId ?? ''}
          </Typography.Text>
        }
      >
        {commandData ? (
          <CommandStatusPanel command={commandData} />
        ) : (
          <Empty description="Không tìm thấy trạng thái lệnh." />
        )}
      </Drawer>

      {/* ── Floor Form Modal ────────────────────────────────────────────── */}
      <Modal
        title={editingFloor ? 'Sửa cấu hình tầng' : 'Tạo cấu hình tầng'}
        open={floorModalOpen}
        onCancel={() => {
          setFloorModalOpen(false)
          setEditingFloor(null)
          floorForm.resetFields()
        }}
        onOk={() => floorForm.submit()}
        confirmLoading={
          createFloor.isPending || updateFloor.isPending
        }
        okText={editingFloor ? 'Lưu thay đổi' : 'Tạo'}
        cancelText="Hủy"
        destroyOnHidden
        width={520}
      >
        <Form<FloorFormValues>
          form={floorForm}
          layout="vertical"
          requiredMark={false}
          onFinish={handleSubmitFloor}
        >
          <Form.Item
            label="Room ID (Backend key)"
            name="room_id"
            rules={[{ required: true, message: 'Nhập room_id.' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Số tầng (1..4)"
            name="floor_number"
            rules={[{ required: true, message: 'Nhập số tầng.' }]}
          >
            <InputNumber min={1} max={4} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Tên tầng"
            name="floor_name"
            rules={[{ required: true, message: 'Nhập tên tầng.' }]}
          >
            <Input placeholder="VD: Tầng 1 — Pha ủ" />
          </Form.Item>

          <Form.Item
            label="Bộ điều khiển trung tâm"
            name="master_id"
            rules={[{ required: true, message: 'Vui lòng chọn bộ điều khiển.' }]}
          >
            <Select
              placeholder="— Chọn bộ điều khiển —"
              options={masters.map((m) => ({
                value: m.id,
                label: `Bộ điều khiển ${m.masterId} (khu ${m.cultivationRoomId ?? '—'})`,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Cụm cảm biến (địa chỉ node)"
            name="node_address"
            rules={[{ required: true, message: 'Vui lòng chọn cụm cảm biến.' }]}
          >
            <Select
              placeholder="— Chọn cụm cảm biến —"
              options={ACTIVE_NODE_IDS.map((id) => ({
                value: id,
                label: `Cụm cảm biến Tầng ${id}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Kênh rơ-le máy bơm (1..8)"
            name="misting_ssr_channel"
            rules={[{ required: true, message: 'Vui lòng nhập kênh rơ-le.' }]}
          >
            <InputNumber min={1} max={8} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Trạng thái"
            name="status"
            rules={[{ required: true, message: 'Chọn trạng thái.' }]}
          >
            <Select options={FLOOR_STATUS_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

function CommandStatusPanel({ command }: { command: IotCommand }) {
  return (
    <Descriptions
      column={1}
      bordered
      size="small"
      items={[
        {
          key: 'action',
          label: 'Hành động',
          children: (
            <Tag color={command.action === 'ON' ? 'success' : 'default'}>
              {command.action}
            </Tag>
          ),
        },
        {
          key: 'channel',
          label: 'Kênh',
          children: command.channel,
        },
        {
          key: 'status',
          label: 'Trạng thái',
          children: <Tag color="processing">{command.status}</Tag>,
        },
        {
          key: 'requestedAt',
          label: 'Yêu cầu lúc',
          children: formatTimestamp(command.requestedAt),
        },
        {
          key: 'expiresAt',
          label: 'Hết hạn lúc',
          children: formatTimestamp(command.expiresAt),
        },
        {
          key: 'publishedAt',
          label: 'Publish lúc',
          children: formatTimestamp(command.publishedAt),
        },
        {
          key: 'completedAt',
          label: 'Hoàn tất lúc',
          children: formatTimestamp(command.completedAt),
        },
        {
          key: 'errorMessage',
          label: 'Lỗi',
          children: command.errorMessage ?? '—',
        },
      ]}
    />
  )
}

/**
 * SSR Channel Switchboard — tái sử dụng useSsrChannels để gắn
 * endpoint GET /api/iot/masters/{id}/ssr.
 */
export function SsrChannelSwitchboard({
  masterId,
  channels,
  onCommandId,
}: {
  masterId: string | null
  channels: IotSsrChannelState[]
  onCommandId: (id: string) => void
}) {
  return (
    <Card
      title={
        <Flex align="center" gap={8}>
          <PoweroffOutlined />
          <span>SSR Channels — Master {masterId ?? '—'}</span>
        </Flex>
      }
    >
      <Flex gap={8} wrap>
        {channels.length === 0 ? (
          <Typography.Text type="secondary">
            Chưa có channel nào.
          </Typography.Text>
        ) : (
          channels.map((channel) => {
            const label =
              channel.channel <= 3
                ? `Van K${channel.channel}`
                : channel.channel === 4
                  ? 'Quạt'
                  : `K${channel.channel}`
            return (
              <Tooltip
                key={channel.channel}
                title={`Kênh ${channel.channel} · ${label} · mong đợi=${channel.desiredState ?? '—'} · thực tế=${channel.reportedState ?? '—'}`}
              >
                <Button
                  size="small"
                  type={channel.desiredState === 'ON' ? 'primary' : 'default'}
                  onClick={() => {
                    void fetch(`/api/iot/commands/watch-${channel.channel}`)
                      .then(() => undefined)
                      .catch(() => undefined)
                    onCommandId(`watch-${channel.channel}`)
                  }}
                >
                  {label} · {channel.desiredState ?? '?'}
                </Button>
              </Tooltip>
            )
          })
        )}
      </Flex>
    </Card>
  )
}
