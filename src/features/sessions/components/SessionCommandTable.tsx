import { DataTable } from '../../../shared/ui/DataTable'
import { WarningOutlined } from '@ant-design/icons'
import { Flex, Select, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import type {
  SessionCommandStatus,
  SessionDeviceCommand,
  SessionDeviceType,
} from '../types/session-iot-history.types'
import {
  aggregateCommandCycles,
  formatCycleDuration,
  type SessionCommandCycle,
} from '../utils/session-command-cycle.utils'

/**
 * Bảng nhật ký **chu kỳ hoạt động** của thiết bị IoT trong một phiên canh tác.
 *
 * ⚠ Nguồn dữ liệu: `GET /api/cultivation-sessions/admin/{sessionId}/iot-history`
 *   (xem `hooks/useSessionIoTHistory.ts` → `useSessionAllCommands`).
 *
 * ## Vì sao hiển thị **chu kỳ** chứ không phải lệnh thô?
 *
 * ⚠ Cơ chế lặp an toàn của BE phát nhiều lệnh `Tắt` liên tiếp (Bật → Tắt →
 *   Tắt → Tắt…) ⇒ log thô rác và khó đọc.
 *
 *   → Ta gom mỗi cặp **Bật → Tắt đầu tiên** thành 1 chu kỳ (xem
 *     `utils/session-command-cycle.utils.ts`); lệnh `Tắt` thừa bị bỏ qua;
 *     chu kỳ chưa có `Tắt` ⇒ đánh dấu **"Đang bật"**.
 *
 * ## Phân trang & lọc
 *
 * ⚠ Toàn bộ lệnh của phiên được gom về FE **một lần** ⇒ lọc và phân trang
 *   **client-side** ⇒ bộ lọc áp dụng cho **100% lệnh của phiên**, không chỉ
 *   20 dòng của trang hiện tại.
 */

/** Loại thiết bị — dùng cho bộ lọc nhanh. */
type DeviceTypeFilter = SessionDeviceType | 'ALL'

/** Trạng thái — dùng cho bộ lọc nhanh. */
type StatusFilter = SessionCommandStatus | 'ALL'

const DATE_TIME_FMT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

function fmtDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return DATE_TIME_FMT.format(date)
}

/** Nhãn + màu cho trạng thái lệnh. */
const COMMAND_STATUS_CONFIG: Record<
  SessionCommandStatus,
  { color: string; label: string }
> = {
  PENDING: { color: 'processing', label: 'Đang chờ publish' },
  PUBLISHED: { color: 'success', label: 'Đã publish' },
  FAILED: { color: 'error', label: 'Thất bại' },
  TIMED_OUT: { color: 'warning', label: 'Quá hạn' },
}

/** Nhãn tiếng Việt cho loại thiết bị (BE suy ra từ kênh SSR). */
const DEVICE_TYPE_LABEL: Record<SessionDeviceType, string> = {
  MISTING: 'Tưới phun',
  LIGHT: 'Đèn',
}

/** Số chu kỳ hiển thị mỗi trang. */
const PAGE_SIZE = 20

export interface SessionCommandTableProps {
  commands: SessionDeviceCommand[]
  loading?: boolean
}

export function SessionCommandTable({
  commands,
  loading = false,
}: SessionCommandTableProps) {
  const [deviceTypeFilter, setDeviceTypeFilter] =
    useState<DeviceTypeFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState(1)

  /** Gom lệnh thô → chu kỳ hoạt động. */
  const cycles = useMemo(
    () => aggregateCommandCycles(commands),
    [commands],
  )

  /**
   * Lọc client-side trên **toàn bộ** chu kỳ của phiên.
   *
   * ⚠ Lọc theo **trạng thái cuối của chu kỳ**: nếu chu kỳ có lệnh Bật/Tắt
   *   lỗi ⇒ tính là lỗi (khớp mọi trạng thái lỗi của BE).
   */
  const filteredCycles = useMemo(
    () =>
      cycles.filter((cycle) => {
        if (deviceTypeFilter !== 'ALL' && cycle.deviceType !== deviceTypeFilter) {
          return false
        }
        if (statusFilter !== 'ALL') {
          const statuses = [
            cycle.onCommand.status,
            cycle.offCommand?.status,
          ].filter((value): value is SessionCommandStatus => value != null)

          if (statusFilter === 'PUBLISHED') {
            // Thành công = không lỗi (đã publish, không quá hạn).
            if (cycle.hasError) return false
            if (!statuses.length) return false
            if (!statuses.includes('PUBLISHED')) return false
            return true
          }
          // FAILED / TIMED_OUT ⇒ chu kỳ có ít nhất 1 lệnh ở trạng thái đó.
          if (!statuses.includes(statusFilter)) return false
        }
        return true
      }),
    [cycles, deviceTypeFilter, statusFilter],
  )

  const pagedCycles = useMemo(
    () =>
      filteredCycles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredCycles, page],
  )

  const columns: ColumnsType<SessionCommandCycle> = [
    {
      title: 'Thiết bị / Kênh',
      key: 'device',
      width: 260,
      render: (_, cycle) => (
        <Flex vertical gap={4}>
          <Typography.Text style={{ fontSize: 12 }}>
            {cycle.deviceName}
            {cycle.channel != null ? ` - Kênh ${cycle.channel}` : ''}
          </Typography.Text>
          <Typography.Text
            className="mcms-session-mono"
            type="secondary"
            style={{ fontSize: 11 }}
          >
            {cycle.masterId ?? '—'}
          </Typography.Text>
          {cycle.floors.length > 0 ? (
            <Flex gap={4} wrap>
              {cycle.floors.map((floor, index) => (
                <Tag
                  key={floor.floor_id ?? `cmd-floor-${index}`}
                  color={floor.device_type === 'MISTING' ? 'cyan' : 'gold'}
                  style={{ marginInlineEnd: 0, fontSize: 11 }}
                >
                  {/*
                    ⚠ `floor_name` của BE đã là "Tầng 1" ⇒ không thêm tiền tố
                      "Tầng" để tránh lặp ("Tầng Tầng 1").
                  */}
                  {floor.floor_name ?? `Tầng ${floor.floor_id ?? index + 1}`}
                  {floor.device_type
                    ? ` · ${DEVICE_TYPE_LABEL[floor.device_type]}`
                    : ''}
                </Tag>
              ))}
            </Flex>
          ) : null}
        </Flex>
      ),
    },
    {
      title: 'Thời điểm Bật',
      key: 'startedAt',
      width: 175,
      render: (_, cycle) => (
        <Typography.Text className="mcms-session-mono" style={{ fontSize: 12 }}>
          {fmtDateTime(cycle.onCommand.requested_at)}
        </Typography.Text>
      ),
    },
    {
      title: 'Thời điểm Tắt',
      key: 'endedAt',
      width: 175,
      render: (_, cycle) =>
        cycle.isActive ? (
          <Tag color="processing">Đang bật</Tag>
        ) : (
          <Typography.Text className="mcms-session-mono" style={{ fontSize: 12 }}>
            {fmtDateTime(cycle.offCommand?.requested_at)}
          </Typography.Text>
        ),
    },
    {
      title: 'Thời lượng chạy',
      key: 'duration',
      width: 140,
      align: 'right',
      render: (_, cycle) => {
        const duration = formatCycleDuration(cycle.durationMs)
        return (
          <Typography.Text strong style={{ fontSize: 12 }}>
            {duration ?? '—'}
          </Typography.Text>
        )
      },
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 140,
      align: 'center',
      render: (_, cycle) => {
        if (cycle.isActive) {
          return <Tag color="processing">Đang hoạt động</Tag>
        }
        if (cycle.hasError) {
          const status =
            cycle.offCommand?.status === 'TIMED_OUT' ||
            cycle.onCommand.status === 'TIMED_OUT'
              ? 'TIMED_OUT'
              : 'FAILED'
          return (
            <Tag color={COMMAND_STATUS_CONFIG[status].color}>
              {COMMAND_STATUS_CONFIG[status].label}
            </Tag>
          )
        }
        return <Tag color="success">Thành công</Tag>
      },
    },
    {
      title: 'Chi tiết',
      key: 'detail',
      render: (_, cycle) => (
        <Flex vertical gap={2}>
          <Typography.Text style={{ fontSize: 12 }}>
            {cycle.requestedBy != null
              ? `Người yêu cầu: #${cycle.requestedBy}`
              : 'Phát tự động bởi hệ thống'}
          </Typography.Text>
          {cycle.errorMessage && (
            <Typography.Text type="danger" style={{ fontSize: 12 }}>
              <WarningOutlined aria-hidden="true" /> {cycle.errorMessage}
            </Typography.Text>
          )}
        </Flex>
      ),
    },
  ]

  const hasActiveFilter =
    deviceTypeFilter !== 'ALL' || statusFilter !== 'ALL'

  return (
    <DataTable<SessionCommandCycle>
      rowKey={(row) => row.id}
      title="Nhật ký chu kỳ hoạt động thiết bị"
      description="Mỗi dòng là 1 chu kỳ Bật → Tắt của thiết bị trong phiên. Các lệnh Tắt lặp thừa do cơ chế an toàn đã được gom bỏ."
      toolbar={
        <>
          <Select<DeviceTypeFilter>
            size="small"
            value={deviceTypeFilter}
            onChange={(value) => {
              setDeviceTypeFilter(value)
              setPage(1)
            }}
            style={{ minWidth: 180 }}
            aria-label="Lọc theo loại thiết bị"
            options={[
              { value: 'ALL', label: 'Loại thiết bị: Tất cả' },
              { value: 'MISTING', label: 'Loại thiết bị: Tưới phun (MISTING)' },
              { value: 'LIGHT', label: 'Loại thiết bị: Đèn (LIGHT)' },
            ]}
          />
          <Select<StatusFilter>
            size="small"
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value)
              setPage(1)
            }}
            style={{ minWidth: 190 }}
            aria-label="Lọc theo trạng thái lệnh"
            options={[
              { value: 'ALL', label: 'Trạng thái: Tất cả' },
              { value: 'PUBLISHED', label: 'Trạng thái: PUBLISHED' },
              { value: 'FAILED', label: 'Trạng thái: FAILED' },
              { value: 'TIMED_OUT', label: 'Trạng thái: TIMED_OUT' },
            ]}
          />
          {hasActiveFilter && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Đang lọc {filteredCycles.length}/{cycles.length} chu kỳ
            </Typography.Text>
          )}
        </>
      }
      columns={columns}
      dataSource={pagedCycles}
      loading={loading}
      pagination={{
        current: page,
        pageSize: PAGE_SIZE,
        total: filteredCycles.length,
        showSizeChanger: false,
        hideOnSinglePage: false,
        showTotal: (total) => `Tổng ${total} chu kỳ`,
        onChange: (nextPage) => setPage(nextPage),
      }}
      scroll={{ x: 1060 }}
      emptyTitle={
        hasActiveFilter
          ? 'Không có chu kỳ nào khớp bộ lọc'
          : 'Chưa có chu kỳ hoạt động nào'
      }
      emptyDescription={
        hasActiveFilter
          ? 'Thử bỏ bớt điều kiện lọc để xem toàn bộ chu kỳ của phiên.'
          : 'Phiên này chưa phát lệnh ON/OFF cho thiết bị IoT.'
      }
    />
  )
}
