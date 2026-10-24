import { useMemo, useState } from 'react'
import { ReloadOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Empty,
  Flex,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  useFloorAutoControlLogs,
} from '../../../features/devices/hooks/useIoT'
import type { AutoControlLogEntry } from '../../../types/iot'

interface AutoControlLogsTableProps {
  floorId: number | null
}

const DATE_TIME = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'medium',
})

/**
 * Nhãn + màu cho `event_type`.
 *
 * Giá trị lấy từ các lệnh ghi log trong `autoMisting.service.js`:
 * DECISION, PULSE_RESERVED, OFF_CONFIRMED, RETRY_WAIT, FAULT, …
 *
 * Danh sách dưới đây khớp với `event_type` thực tế BE trả về (đã đối chiếu
 * `GET /api/iot/floors/{floorId}/auto-control/logs`):
 * DECISION, START, STOP, ON_REQUESTED, OFF_REQUESTED, PULSE_RESERVED,
 * OFF_CONFIRMED, RETRY_WAIT, CONFIG_SAVED, FAULT.
 */
const EVENT_CONFIG: Record<
  string,
  { color: string; label: string }
> = {
  DECISION: { color: 'blue', label: 'Quyết định' },
  PULSE_RESERVED: { color: 'processing', label: 'Bật xung tưới' },
  OFF_CONFIRMED: { color: 'success', label: 'Đã tắt' },
  RETRY_WAIT: { color: 'warning', label: 'Chờ thử lại' },
  FAULT: { color: 'error', label: 'Lỗi / Cổng an toàn' },
  START: { color: 'green', label: 'Khởi động' },
  STOP: { color: 'default', label: 'Dừng' },
  ON_REQUESTED: { color: 'processing', label: 'Yêu cầu bật' },
  OFF_REQUESTED: { color: 'default', label: 'Yêu cầu tắt' },
  CONFIG_SAVED: { color: 'cyan', label: 'Đã lưu cấu hình' },
}

function eventConfig(type: string) {
  return (
    EVENT_CONFIG[type] ?? {
      color: 'default',
      label: type || '—',
    }
  )
}

/** Cột "trạng thái xung" — suy ra từ event, vì BE không có cột riêng. */
function pulseState(entry: AutoControlLogEntry): {
  color: string
  label: string
} {
  switch (entry.event_type) {
    case 'ON_REQUESTED':
    case 'PULSE_RESERVED':
      return { color: 'processing', label: 'Đang tưới' }
    case 'OFF_REQUESTED':
    case 'OFF_CONFIRMED':
      return { color: 'default', label: 'Đã tắt' }
    case 'FAULT':
      return { color: 'error', label: 'Bị chặn' }
    case 'RETRY_WAIT':
      return { color: 'warning', label: 'Tạm dừng' }
    default:
      return { color: 'default', label: '—' }
  }
}

function formatTime(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : DATE_TIME.format(date)
}

/**
 * Bảng nhật ký quyết định của hệ thống tưới tự động.
 *
 * Nguồn: `GET /api/iot/floors/{floorId}/auto-control/logs`
 * (BE đọc `SELECT *` từ `iot_auto_control_logs`, sắp `id DESC`).
 *
 * Cột `safety_blocked_reason` không có trong DB — BE ghi lý do chặn vào
 * `reason` khi event là FAULT, nên UI hiển thị chung một cột "Lý do".
 */
export function AutoControlLogsTable({ floorId }: AutoControlLogsTableProps) {
  const [limit, setLimit] = useState(50)

  const query = useMemo(() => ({ limit }), [limit])
  const {
    data: logs = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useFloorAutoControlLogs(floorId, query, {
    enabled: floorId !== null && floorId > 0,
  })

  const columns: ColumnsType<AutoControlLogEntry> = useMemo(
    () => [
      {
        title: 'Thời gian',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 180,
        render: (value?: string) => formatTime(value),
      },
      {
        title: 'Loại sự kiện',
        dataIndex: 'event_type',
        key: 'event_type',
        width: 190,
        render: (type: string) => {
          const config = eventConfig(type)
          return <Tag color={config.color}>{config.label}</Tag>
        },
      },
      {
        title: 'Trạng thái xung',
        key: 'pulse',
        width: 150,
        render: (_, entry) => {
          const state = pulseState(entry)

          return (
            <Tag color={state.color} style={{ marginInlineEnd: 0 }}>
              {state.label}
            </Tag>
          )
        },
      },
      {
        title: 'Độ ẩm TB',
        dataIndex: 'average_humidity',
        key: 'average_humidity',
        width: 120,
        align: 'right',
        render: (value?: number | null) =>
          typeof value === 'number' && Number.isFinite(value) ? (
            <Typography.Text>{value.toFixed(1)}%</Typography.Text>
          ) : (
            <Typography.Text type="secondary">—</Typography.Text>
          ),
      },
      {
        title: 'Lý do',
        dataIndex: 'reason',
        key: 'reason',
        render: (reason: string | null, entry) => (
          <Flex vertical gap={2}>
            <Typography.Text
              style={{
                fontSize: 13,
                whiteSpace: 'normal',
                wordBreak: 'break-word',
              }}
            >
              {reason || '—'}
            </Typography.Text>
            {entry.event_type === 'FAULT' && (
              <Typography.Text
                type="warning"
                style={{ fontSize: 11 }}
              >
                ⚠ Cổng an toàn đã chặn lệnh — kiểm tra phần cứng / MQTT.
              </Typography.Text>
            )}
          </Flex>
        ),
      },
    ],
    [],
  )

  if (isError) {
    return (
      <Alert
        type="error"
        showIcon
        message="Không tải được nhật ký tự động hóa."
        description={error?.message ?? 'Lỗi không xác định.'}
        action={
          <Button size="small" onClick={() => void refetch()}>
            Thử lại
          </Button>
        }
      />
    )
  }

  return (
    <Flex vertical gap={12}>
      <Flex align="center" justify="space-between" gap={12} wrap>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {logs.length > 0
            ? `Hiển thị ${logs.length} sự kiện gần nhất`
            : 'Chưa có sự kiện nào được ghi nhận'}
        </Typography.Text>

        <Flex gap={8}>
          <Button
            size="small"
            onClick={() =>
              setLimit((prev) => (prev >= 200 ? 50 : prev + 50))
            }
            disabled={logs.length < limit}
          >
            Xem thêm
          </Button>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            loading={isFetching}
            onClick={() => void refetch()}
          >
            Tải lại
          </Button>
        </Flex>
      </Flex>

      {logs.length === 0 && !isLoading ? (
        <Empty description="Chưa có nhật ký tự động hóa" />
      ) : (
        <Table<AutoControlLogEntry>
          rowKey={(entry, index) => entry.id ?? `${entry.event_type}-${index}`}
          columns={columns}
          dataSource={logs}
          loading={isLoading}
          size="small"
          pagination={false}
          scroll={{ x: 900 }}
        />
      )}
    </Flex>
  )
}