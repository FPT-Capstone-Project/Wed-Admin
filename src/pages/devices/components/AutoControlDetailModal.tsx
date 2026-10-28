import {
  CloseCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import {
  Button,
  Descriptions,
  Empty,
  Flex,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo } from 'react'
import { StatusBadge } from '../../../shared/ui'
import {
  useAutoControlConfiguration,
  useAutoControlLogs,
} from '../../../features/devices/hooks/useIoT'
import { useConfiguratorNames } from '../../../features/devices/hooks/useConfigurators'
import type {
  AutoControlConfigRecord,
  AutoControlLogEntry,
  CultivationFloorMapping,
} from '../../../types/iot'
import {
  formatControlRule,
  formatDateTime,
  formatDurationMs,
  formatEventType,
  formatHumidityRange,
  formatLogDateTime,
  formatLogMeasurements,
  formatLogSensors,
  formatProfileName,
  formatStopCondition,
  formatTriggerCondition,
  resolveLogStatus,
} from '../utils/auto-control.utils'

interface AutoControlDetailModalProps {
  /** Tầng đang xem — `null` đóng modal. */
  floor: CultivationFloorMapping | null
  open: boolean
  onClose: () => void
}

/**
 * Modal **CHỈ ĐỌC** — chi tiết cấu hình tưới phun sương tự động.
 *
 * ⚠ Admin web KHÔNG được thiết lập / chỉnh sửa ngưỡng. Quyền đó thuộc
 * **nhân viên (staff)** thực hiện trên mobile app — xem
 * `features/auth/permissions.ts` (`iot.automation.manage`).
 *
 * Vì vậy modal này:
 *   - dùng `Descriptions` (nhãn + giá trị), KHÔNG dùng `Form`/`Input`,
 *   - không có nút Lưu / Cập nhật / Xóa / bật-tắt thủ công,
 *   - footer chỉ có duy nhất nút "Đóng".
 */
export function AutoControlDetailModal({
  floor,
  open,
  onClose,
}: AutoControlDetailModalProps) {
  const floorId = floor?.floor_id ?? null

  const {
    data: configuration,
    isLoading: configLoading,
  } = useAutoControlConfiguration(floorId)

  const {
    data: logsData,
    isLoading: logsLoading,
  } = useAutoControlLogs(floorId, { limit: 100 })

  /**
   * Bản ghi cấu hình của tầng đang xem.
   *
   * ⚠ Phải đọc được cả 2 shape để không bao giờ rơi vào empty state sai:
   *   - `{ config: {...}, mode }` → response đầy đủ (shape chuẩn),
   *   - `{ ...record }`            → BE trả thẳng bản ghi cấu hình.
   * Nếu chỉ đọc `configuration?.config` mà cache đang giữ bản ghi thuần
   * thì `config` = `undefined` ⇒ hiển thị nhầm "Tầng chưa có cấu hình".
   */
  /**
   * Bản ghi cấu hình của tầng đang xem.
   *
   * ⚠ Phải đọc được cả 2 shape để không bao giờ rơi vào empty state sai:
   *   - `{ config: {...}, mode }` → response đầy đủ (shape chuẩn),
   *   - `{ ...record }`            → BE trả thẳng bản ghi cấu hình.
   * Nếu chỉ đọc `configuration?.config` mà cache đang giữ bản ghi thuần
   * thì `config` = `undefined` ⇒ hiển thị nhầm "Tầng chưa có cấu hình".
   */
  const config = useMemo(() => {
    if (!configuration) return null
    if (configuration.config) return configuration.config
    // Shape bản ghi thuần → coi toàn bộ object là bản ghi cấu hình.
    const record = configuration as unknown as AutoControlConfigRecord
    return Object.keys(record).length > 0 ? record : null
  }, [configuration])

  const logs = useMemo(() => logsData?.logs ?? [], [logsData?.logs])
  const configuratorNames = useConfiguratorNames(config?.configured_by ?? null)

  const configuratorLabel =
    config?.configured_by == null
      ? '—'
      : (configuratorNames.get(config.configured_by) ??
        `Nhân viên #${config.configured_by}`)

  const logColumns: ColumnsType<AutoControlLogEntry> = [
    {
      title: 'Thời gian chạy',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      // Ghim cột đầu để ngày giờ luôn nhìn thấy khi cuộn ngang.
      fixed: 'left',
      render: (value?: string) => (
        <Typography.Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
          {formatLogDateTime(value)}
        </Typography.Text>
      ),
    },
    {
      title: 'Sự kiện',
      dataIndex: 'event_type',
      key: 'event_type',
      width: 140,
      render: (eventType: string) => (
        <Tag color="blue" style={{ fontSize: 12 }}>
          {formatEventType(eventType)}
        </Tag>
      ),
    },
    {
      title: 'Cụm cảm biến kích hoạt',
      key: 'sensors',
      width: 130,
      render: (_, row) => (
        <Typography.Text style={{ fontSize: 12, overflowWrap: 'break-word' }}>
          {formatLogSensors(row, floor?.node_address)}
        </Typography.Text>
      ),
    },
    {
      title: 'Giá trị đo lúc kích hoạt',
      key: 'measurements',
      width: 180,
      render: (_, row) => (
        <Typography.Text style={{ fontSize: 12, overflowWrap: 'break-word' }}>
          {formatLogMeasurements(row)}
        </Typography.Text>
      ),
    },
    {
      title: 'Kênh rơ-le',
      key: 'channel',
      width: 110,
      align: 'center',
      render: () => (
        <Tag color="volcano" style={{ fontSize: 12 }}>
          <ThunderboltOutlined /> Kênh {floor?.misting_ssr_channel ?? '—'}
        </Tag>
      ),
    },
    {
      // ⚠ `reserved_on_ms` chỉ có giá trị > 0 cho sự kiện `PULSE_RESERVED`
      // (BE ghi tổng thời gian phun đã giữ trong giờ). Với sự kiện khác,
      // hiển thị thời lượng phun đã cấu hình của tầng cho dễ đọc.
      title: 'Thời lượng chạy',
      key: 'duration',
      width: 120,
      align: 'right',
      render: (_, row) => {
        const duration =
          formatDurationMs(row.reserved_on_ms) ??
          formatDurationMs(config?.misting_pulse_ms)
        return (
          <Typography.Text strong={Boolean(duration)} style={{ fontSize: 12 }}>
            {duration ?? '—'}
          </Typography.Text>
        )
      },
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 120,
      align: 'center',
      render: (_, row) => {
        const status = resolveLogStatus(row.event_type)
        return status === 'success' ? (
          <StatusBadge tone="ok" label="Thành công" />
        ) : (
          <StatusBadge tone="danger" label="Thất bại" />
        )
      },
    },
    {
      title: 'Lý do / Ghi chú',
      dataIndex: 'reason',
      key: 'reason',
      // ⚠ Cột text dài → cần `width` cố định + `ellipsis` để KHÔNG bị ép
      // vỡ theo từng ký tự khi bảng bị bóp hẹp.
      // ⚠ Bắt buộc phải có `width` (không chỉ `minWidth`): khi có cột
      // `fixed` + cuộn ngang, rc-table ép `table-layout: fixed` và chỉ đọc
      // `width` trong `<colgroup>` — `minWidth` bị bỏ qua.
      width: 200,
      minWidth: 200,
      ellipsis: true,
      render: (reason: string | null) =>
        reason ? (
          <Tooltip title={reason} placement="topLeft">
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {reason}
            </Typography.Text>
          </Tooltip>
        ) : (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            —
          </Typography.Text>
        ),
    },
  ]

  const configTab = (
    <Flex vertical gap={16}>
      {config ? (
        <Descriptions
          column={{ xs: 1, sm: 1, md: 2 }}
          bordered
          size="small"
          items={[
            {
              key: 'rule',
              label: 'Quy tắc điều khiển',
              children: (
                <Flex vertical gap={2}>
                  <Typography.Text strong>
                    {formatControlRule(config)}
                  </Typography.Text>
                  {formatProfileName(config) && (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Bộ ngưỡng: {formatProfileName(config)}
                    </Typography.Text>
                  )}
                </Flex>
              ),
            },
            {
              key: 'mode',
              label: 'Chế độ hiện tại',
              children:
                configuration?.mode === 'AUTO' ? (
                  <StatusBadge tone="ok" label="Đang tự động" />
                ) : (
                  <StatusBadge tone="muted" label="Thủ công" />
                ),
            },
            {
              key: 'trigger',
              label: 'Ngưỡng kích hoạt',
              children: (
                <Typography.Text strong>
                  {formatTriggerCondition(config) ?? '—'}
                </Typography.Text>
              ),
            },
            {
              key: 'stop',
              label: 'Ngưỡng ngắt',
              children: (
                <Typography.Text strong>
                  {formatStopCondition(config) ?? '—'}
                </Typography.Text>
              ),
            },
            {
              key: 'humidityRange',
              label: 'Khoảng độ ẩm cho phép',
              children: formatHumidityRange(config) ?? '—',
            },
            {
              key: 'pulse',
              label: 'Thời lượng phun',
              children: (
                <Typography.Text strong>
                  {formatDurationMs(config.misting_pulse_ms) ?? '—'}
                </Typography.Text>
              ),
            },
            {
              key: 'cooldown',
              label: 'Thời gian nghỉ tối thiểu giữa 2 lần phun',
              children: (
                <Typography.Text strong>
                  {formatDurationMs(config.cooldown_ms) ?? '—'}
                </Typography.Text>
              ),
            },
            {
              key: 'interval',
              label: 'Chu kỳ đánh giá',
              children: formatDurationMs(config.evaluation_interval_ms) ?? '—',
            },
            {
              key: 'budget',
              label: 'Giới hạn kích hoạt mỗi giờ',
              children: `${config.max_activations_per_hour ?? '—'} lần`,
            },
            {
              key: 'cumulative',
              label: 'Tổng thời gian phun tối đa mỗi giờ',
              children:
                formatDurationMs(config.max_cumulative_on_ms_per_hour) ?? '—',
            },
            {
              key: 'cooling',
              label: 'Điều khiển làm mát',
              children: config.cooling_enabled ? (
                <Flex vertical gap={2}>
                  <StatusBadge tone="info" label="Đang bật" />
                  {typeof config.temperature_start_threshold === 'number' && (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Kích hoạt khi nhiệt độ ≥{' '}
                      {config.temperature_start_threshold.toFixed(1)}°C
                    </Typography.Text>
                  )}
                </Flex>
              ) : (
                <StatusBadge tone="muted" label="Không dùng" />
              ),
            },
            {
              key: 'sensors',
              label: 'Cảm biến bắt buộc',
              children: `${config.required_valid_sensors ?? '—'} / 3 cảm biến hợp lệ`,
            },
            {
              key: 'configurator',
              label: 'Nhân viên cấu hình gần nhất',
              children: configuratorLabel,
            },
            {
              key: 'updatedAt',
              label: 'Thời gian cập nhật gần nhất',
              children: formatDateTime(config.updated_at),
            },
          ]}
        />
      ) : (
        <Empty
          description={
            <Space direction="vertical" size={4}>
              <Typography.Text strong>
                Tầng chưa có cấu hình tưới tự động
              </Typography.Text>
              <Typography.Text type="secondary">
                Nhân viên vận hành thiết lập cấu hình trên ứng dụng mobile.
              </Typography.Text>
            </Space>
          }
        />
      )}
    </Flex>
  )

  const logsTab = (
    <Table<AutoControlLogEntry>
      rowKey={(row) => String(row.id ?? row.created_at ?? row.event_type)}
      columns={logColumns}
      dataSource={logs}
      loading={logsLoading}
      size="small"
      pagination={{ pageSize: 10, showSizeChanger: false }}
      scroll={{ x: 1000 }}
      locale={{
        emptyText: (
          <Empty description="Chưa có lần kích hoạt tự động nào được ghi nhận." />
        ),
      }}
    />
  )

  return (
    <Modal
      title={
        <Flex align="center" gap={8}>
          <ThunderboltOutlined aria-hidden="true" />
          <span>
            Chi tiết cấu hình tưới phun sương tự động
            {floor ? ` — Tầng ${floor.floor_number}` : ''}
          </span>
        </Flex>
      }
      open={open}
      onCancel={onClose}
      width={960}
      centered
      destroyOnHidden
      // ⚠ Footer chỉ có nút "Đóng" — KHÔNG có Save / Submit / Xóa.
      footer={[
        <Button key="close" icon={<CloseCircleOutlined />} onClick={onClose}>
          Đóng
        </Button>,
      ]}
    >
      <Tabs
        items={[
          {
            key: 'config',
            label: (
              <Space size={6}>
                <EyeOutlined />
                <span>Cấu hình tự động hiện tại</span>
              </Space>
            ),
            children: configLoading ? (
              <Flex justify="center" style={{ padding: 32 }}>
                <Typography.Text type="secondary">
                  Đang tải cấu hình…
                </Typography.Text>
              </Flex>
            ) : (
              configTab
            ),
          },
          {
            key: 'logs',
            label: (
              <Space size={6}>
                <FileTextOutlined />
                <span>Nhật ký kích hoạt</span>
              </Space>
            ),
            children: logsTab,
          },
        ]}
      />
    </Modal>
  )
}
