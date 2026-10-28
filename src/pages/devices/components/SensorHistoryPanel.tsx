import { useMemo, useState } from 'react'
import { HistoryOutlined, RightOutlined } from '@ant-design/icons'
import {
  Button,
  Empty,
  Flex,
  InputNumber,
  Select,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useSensorHistory } from '../../../features/devices/hooks/useIoT'
import type { IotHistoryReading } from '../../../types/iot'
import {
  ACTIVE_NODE_IDS,
  SENSORS_PER_NODE,
} from '../../../features/devices/utils/iot-node-scope'

interface SensorHistoryPanelProps {
  /** Master đang xem (`null` → chưa có master ⇒ không tải). */
  masterId: string | null
  /** Mở trang lịch sử đầy đủ (`/devices/history`). */
  onOpenFullHistory: () => void
}

function formatTimestamp(timestamp: string | null | undefined) {
  if (!timestamp) return '—'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('vi-VN')
}

/**
 * Panel lịch sử telemetry — nằm trong tab "Lịch sử" của card "Cảm biến môi
 * trường".
 *
 * ## Vì sao không polling?
 *
 * Lịch sử là dữ liệu **tĩnh** (đã ghi vào DB). Polling 3s ở tab này chỉ tốn
 * request mà không đổi được gì. Vì vậy hook `useSensorHistory` **không** đặt
 * `refetchInterval` ⇒ chỉ tải 1 lần khi vào tab, và tải lại khi người dùng
 * bấm nút hoặc đổi bộ lọc.
 *
 * (Bảng "Thời gian thực" ở tab cạnh kia vẫn polling 3s — xem
 * `DeviceControlPanel`.)
 */
export function SensorHistoryPanel({
  masterId,
  onOpenFullHistory,
}: SensorHistoryPanelProps) {
  const [nodeId, setNodeId] = useState<number>(ACTIVE_NODE_IDS[0] ?? 1)
  const [sensorId, setSensorId] = useState<number>(1)
  const [limit, setLimit] = useState<number>(50)

  const { data: history, isLoading, isError, refetch } = useSensorHistory(
    masterId,
    nodeId,
    sensorId,
    { limit },
    { enabled: Boolean(masterId) },
  )

  const readings = useMemo(() => history?.readings ?? [], [history])

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
          <Typography.Text strong>
            {row.temperature.toFixed(1)}°C
          </Typography.Text>
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
      width: 100,
      align: 'center',
      render: (_, row) =>
        row.ok ? (
          <Tag color="success">OK</Tag>
        ) : (
          <Tag color="warning">Sai số</Tag>
        ),
    },
  ]

  return (
    <Flex vertical gap={12}>
      <Flex gap={12} wrap align="center">
        <Flex gap={6} align="center">
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Node
          </Typography.Text>
          <Select
            value={nodeId}
            style={{ minWidth: 110 }}
            onChange={setNodeId}
            options={ACTIVE_NODE_IDS.map((id) => ({
              value: id,
              label: `Node ${id}`,
            }))}
          />
        </Flex>

        <RightOutlined className="cascade-separator" aria-hidden="true" />

        <Flex gap={6} align="center">
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Cảm biến
          </Typography.Text>
          <InputNumber
            value={sensorId}
            min={1}
            max={SENSORS_PER_NODE}
            style={{ width: 70 }}
            onChange={(value) => setSensorId(Number(value ?? 1))}
          />
        </Flex>

        <Flex gap={6} align="center">
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Số readings
          </Typography.Text>
          <InputNumber
            value={limit}
            min={1}
            max={1000}
            step={50}
            style={{ width: 100 }}
            onChange={(value) => setLimit(Number(value ?? 50))}
          />
        </Flex>

        <Button onClick={() => void refetch()} loading={isLoading}>
          Tải lại
        </Button>

        <Button
          type="link"
          icon={<HistoryOutlined />}
          onClick={onOpenFullHistory}
        >
          Xem lịch sử đầy đủ
        </Button>
      </Flex>

      <Table<IotHistoryReading>
        rowKey={(row) => row.id}
        columns={columns}
        dataSource={readings}
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: 600 }}
        locale={{
          emptyText: (
            <Empty
              description={
                isError
                  ? 'Không tải được lịch sử telemetry.'
                  : 'Chưa có dữ liệu lịch sử cho cảm biến này.'
              }
            />
          ),
        }}
      />
    </Flex>
  )
}
