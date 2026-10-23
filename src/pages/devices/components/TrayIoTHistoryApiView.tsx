import { useMemo, useState } from 'react'
import {
  CloudOutlined,
  CloudServerOutlined,
  ExperimentOutlined,
  FireOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Flex,
  InputNumber,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  useMasterList,
  useSensorHistory,
  useMasterSensors,
} from '../../../features/devices/hooks/useIoT'
import type { IotHistoryReading } from '../../../types/iot'
import {
  ACTIVE_NODE_IDS,
  SENSORS_PER_NODE,
} from '../../../features/devices/utils/iot-node-scope'

type HistoryScope = 'realtime' | 'last24h' | 'last7d'

const SCOPE_OPTIONS: Array<{
  value: HistoryScope
  label: string
  /** Giờ lookback từ bây giờ → dùng cho Số lượng readings cần lấy. */
  hours: number
}> = [
  { value: 'realtime', label: 'Realtime (50 readings gần nhất)', hours: 1 },
  { value: 'last24h', label: '24 giờ qua (200 readings)', hours: 24 },
  { value: 'last7d', label: '7 ngày qua (500 readings)', hours: 24 * 7 },
]

function formatTimestamp(timestamp: string | null | undefined) {
  if (!timestamp) return '—'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('vi-VN')
}

/**
 * Tab mới — lấy dữ liệu telemetry từ BE thật (IoT API) thay vì mock.
 *
 * API: GET /api/iot/masters/{masterId}/nodes/{nodeId}/sensors/{sensorId}/history
 *
 * Tier ↔ nodeId mapping: tầng 1..4 → node_address 1..247 (giả định 4
 * node đầu master chính, có thể thay đổi nếu BE khác).
 *
 * Lưu ý: Khi BE chưa trả readings → fallback `readings: []` an toàn.
 */
export function TrayIoTHistoryApiView() {
  const { message } = App.useApp()
  const [scope, setScope] = useState<HistoryScope>('realtime')
  const [nodeId, setNodeId] = useState<number>(1)
  const [sensorId, setSensorId] = useState<number>(1)
  const [limit, setLimit] = useState<number>(50)

  const { data: masters = [], isLoading: mastersLoading } = useMasterList({
    staleTime: 60_000,
  })

  const primaryMaster = useMemo(
    () => masters.find((m) => m.masterId === 'master01') ?? masters[0] ?? null,
    [masters],
  )

  // Lấy sensors để biết phạm vi node/sensor hợp lệ
  const { data: sensorsResp } = useMasterSensors(
    primaryMaster?.masterId ?? null,
  )
  const availableSensors = sensorsResp?.sensors ?? []

  const effectiveLimit = scope === 'realtime' ? Math.min(limit, 50) : limit

  const {
    data: history,
    isLoading: historyLoading,
    isError: historyError,
    error,
    refetch,
  } = useSensorHistory(
    primaryMaster?.masterId ?? null,
    nodeId,
    sensorId,
    { limit: effectiveLimit },
    { enabled: Boolean(primaryMaster?.masterId) },
  )

  const readings = history?.readings ?? []

  const summary = useMemo(() => {
    if (readings.length === 0) {
      return {
        count: 0,
        avgTemp: 0,
        avgHumidity: 0,
        validRatio: 0,
        latestAt: null as string | null,
      }
    }
    const validReadings = readings.filter(
      (r) => r.temperature != null && r.humidity != null,
    )
    const sumTemp = validReadings.reduce(
      (acc, r) => acc + (r.temperature ?? 0),
      0,
    )
    const sumHum = validReadings.reduce(
      (acc, r) => acc + (r.humidity ?? 0),
      0,
    )
    return {
      count: readings.length,
      avgTemp:
        validReadings.length > 0
          ? Number((sumTemp / validReadings.length).toFixed(1))
          : 0,
      avgHumidity:
        validReadings.length > 0
          ? Math.round(sumHum / validReadings.length)
          : 0,
      validRatio: validReadings.length / readings.length,
      latestAt: readings[0]?.receivedAt ?? null,
    }
  }, [readings])

  const columns: ColumnsType<IotHistoryReading> = [
    {
      title: 'Thời điểm',
      key: 'measured',
      width: 180,
      render: (_, row) => (
        <Typography.Text style={{ fontSize: 12 }}>
          {formatTimestamp(row.measuredAt ?? row.receivedAt)}
        </Typography.Text>
      ),
    },
    {
      title: 'Nhiệt độ',
      key: 'temperature',
      width: 110,
      align: 'right',
      render: (_, row) =>
        row.temperature == null ? (
          <Typography.Text type="secondary">—</Typography.Text>
        ) : (
          <Typography.Text strong>{row.temperature.toFixed(1)}°C</Typography.Text>
        ),
    },
    {
      title: 'Độ ẩm',
      key: 'humidity',
      width: 100,
      align: 'right',
      render: (_, row) =>
        row.humidity == null ? (
          <Typography.Text type="secondary">—</Typography.Text>
        ) : (
          <Typography.Text strong>{row.humidity.toFixed(0)}%</Typography.Text>
        ),
    },
    {
      title: 'Trạng thái',
      key: 'ok',
      width: 110,
      align: 'center',
      render: (_, row) =>
        row.ok ? (
          <Tag color="success">OK</Tag>
        ) : (
          <Tag color="warning">Sai số</Tag>
        ),
    },
    {
      title: 'Retained',
      key: 'retained',
      width: 100,
      align: 'center',
      render: (_, row) =>
        row.retained ? (
          <Tag color="processing">giữ lại</Tag>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
  ]

  return (
    <Flex vertical gap={16}>
      <Card
        title={
          <Flex align="center" gap={8}>
            <ExperimentOutlined aria-hidden="true" />
            <span>Lịch sử Telemetry — IoT API</span>
          </Flex>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              void refetch()
              message.info('Đang tải lại dữ liệu từ máy chủ.')
            }}
            loading={historyLoading}
          >
            Tải lại
          </Button>
        }
        styles={{ body: { padding: 16 } }}
      >
        <Flex gap={12} wrap style={{ marginBottom: 16 }}>
          <div className="iot-api-field">
            <label className="iot-api-label" htmlFor="iot-api-master">
              Master
            </label>
            <Select
              id="iot-api-master"
              style={{ minWidth: 180 }}
              value={primaryMaster?.masterId}
              loading={mastersLoading}
              disabled
              options={[
                {
                  value: primaryMaster?.masterId ?? '',
                  label:
                    primaryMaster?.masterId ?? 'Đang tải danh sách master…',
                },
              ]}
            />
          </div>

          <div className="iot-api-field">
            <label className="iot-api-label" htmlFor="iot-api-node">
              Node ID
            </label>
            <Select
              id="iot-api-node"
              style={{ minWidth: 140 }}
              value={nodeId}
              options={ACTIVE_NODE_IDS.map((id) => ({
                value: id,
                label: `Node ${id}`,
              }))}
              onChange={(value) => setNodeId(value)}
            />
          </div>

          <div className="iot-api-field">
            <label className="iot-api-label" htmlFor="iot-api-sensor">
              Sensor ID (1..{SENSORS_PER_NODE})
            </label>
            <InputNumber
              id="iot-api-sensor"
              value={sensorId}
              min={1}
              max={SENSORS_PER_NODE}
              onChange={(value) => setSensorId(Number(value ?? 1))}
            />
          </div>

          <div className="iot-api-field">
            <label className="iot-api-label" htmlFor="iot-api-limit">
              Số readings
            </label>
            <InputNumber
              id="iot-api-limit"
              value={limit}
              min={1}
              max={1000}
              step={50}
              onChange={(value) => setLimit(Number(value ?? 50))}
            />
          </div>

          <div className="iot-api-field">
            <label className="iot-api-label">Phạm vi</label>
            <Segmented
              value={scope}
              onChange={(v) => setScope(v as HistoryScope)}
              options={SCOPE_OPTIONS.map((opt) => ({
                label: opt.label,
                value: opt.value,
              }))}
            />
          </div>
        </Flex>

        <Flex gap={12} wrap style={{ marginBottom: 12 }}>
          <Card size="small" style={{ flex: '1 1 180px' }}>
            <Statistic
              title="Số readings"
              value={summary.count}
              prefix={<ExperimentOutlined />}
              valueStyle={{ fontSize: 20 }}
            />
          </Card>
          <Card size="small" style={{ flex: '1 1 180px' }}>
            <Statistic
              title="Nhiệt độ TB"
              value={summary.avgTemp || '—'}
              precision={1}
              suffix="°C"
              prefix={<FireOutlined />}
              valueStyle={{ fontSize: 20 }}
            />
          </Card>
          <Card size="small" style={{ flex: '1 1 180px' }}>
            <Statistic
              title="Độ ẩm TB"
              value={summary.avgHumidity || '—'}
              suffix="%RH"
              prefix={<CloudOutlined />}
              valueStyle={{ fontSize: 20 }}
            />
          </Card>
          <Card size="small" style={{ flex: '1 1 180px' }}>
            <Statistic
              title="Điểm hợp lệ"
              value={(summary.validRatio * 100).toFixed(0)}
              suffix="%"
              prefix={<CloudServerOutlined />}
              valueStyle={{ fontSize: 20 }}
            />
          </Card>
        </Flex>

        <Alert
          type="info"
          showIcon
          message={`Master ${primaryMaster?.masterId ?? '—'} · Node ${nodeId} · Sensor ${sensorId} · ${effectiveLimit} readings gần nhất`}
        />
      </Card>

      {historyError ? (
        <Empty
          description={
            <Flex vertical align="center" gap={6}>
              <Typography.Text type="danger">
                Không tải được lịch sử telemetry.
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {error?.message ?? 'Lỗi không xác định.'}
              </Typography.Text>
              <Typography.Text
                type="secondary"
                style={{
                  fontSize: 12,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
                onClick={() => void refetch()}
              >
                Nhấn để thử lại
              </Typography.Text>
            </Flex>
          }
        />
      ) : readings.length === 0 ? (
        <Empty description="Chưa có dữ liệu lịch sử từ BE cho cảm biến này." />
      ) : (
        <Table<IotHistoryReading>
          rowKey={(row) => row.id}
          columns={columns}
          dataSource={readings}
          loading={historyLoading}
          size="small"
          pagination={{ pageSize: 25, showSizeChanger: false }}
          scroll={{ x: 700 }}
        />
      )}

      {availableSensors.length > 0 && (
        <Card size="small" title="Cảm biến khả dụng (từ Master)">
          <Space wrap>
            {availableSensors.map((sensor) => (
              <Tag
                key={`${sensor.nodeId}-${sensor.sensorId}`}
                color={
                  sensor.nodeId === nodeId && sensor.sensorId === sensorId
                    ? 'success'
                    : 'default'
                }
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setNodeId(sensor.nodeId)
                  setSensorId(sensor.sensorId)
                }}
              >
                Node {sensor.nodeId} · Sensor {sensor.sensorId} ·{' '}
                {sensor.temperature != null
                  ? `${sensor.temperature.toFixed(1)}°C`
                  : '—'}
              </Tag>
            ))}
          </Space>
        </Card>
      )}
    </Flex>
  )
}
