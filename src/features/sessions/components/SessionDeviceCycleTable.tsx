import { DataTable } from '../../../shared/ui/DataTable'
import { WarningOutlined } from '@ant-design/icons'
import { Flex, Select, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import {
  formatCycleDuration,
  type SessionDeviceCycle,
} from '../utils/session-device-cycle.utils'
import { AUTO_CONTROL_EVENT_DICTIONARY } from '../../../shared/i18n/status/iot'
import { statusLabel } from '../../../shared/i18n/status/registry'

/**
 * Bảng nhật ký **chu kỳ hoạt động** của thiết bị IoT trong một phiên canh tác.
 *
 * ⚠ Nguồn dữ liệu: `GET /api/iot/floors/{floorId}/auto-control/logs`
 *   (xem `hooks/useSessionDeviceActivity.ts`).
 *
 * ## Vì sao hiển thị **chu kỳ** chứ không phải sự kiện thô?
 *
 * ⚠ Cơ chế lặp an toàn của BE ghi nhiều sự kiện tắt liên tiếp (Bật → Tắt →
 *   Tắt → Tắt…) ⇒ log thô rác và khó đọc.
 *
 *   → Ta gom mỗi cặp **Bật → Tắt đầu tiên** thành 1 chu kỳ (xem
 *     `utils/session-device-cycle.utils.ts`); sự kiện Tắt thừa bị bỏ qua;
 *     chu kỳ chưa có Tắt ⇒ đánh dấu **"Đang bật"**.
 *
 * ## Phân trang & lọc
 *
 * ⚠ Toàn bộ nhật ký của các tầng thuộc phiên được gom về FE **một lần** ⇒ lọc
 *   và phân trang **client-side** ⇒ bộ lọc áp dụng cho **100%** chu kỳ của
 *   phiên, không chỉ 20 dòng của trang hiện tại.
 */

/** Trạng thái chu kỳ — dùng cho bộ lọc nhanh. */
type CycleStatusFilter = 'ACTIVE' | 'COMPLETED' | 'ERROR' | 'ALL'

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

/** Số chu kỳ hiển thị mỗi trang. */
const PAGE_SIZE = 20

export interface SessionDeviceCycleTableProps {
  cycles: SessionDeviceCycle[]
  loading?: boolean
}

export function SessionDeviceCycleTable({
  cycles,
  loading = false,
}: SessionDeviceCycleTableProps) {
  const [statusFilter, setStatusFilter] = useState<CycleStatusFilter>('ALL')
  const [page, setPage] = useState(1)

  /**
   * Lọc client-side trên **toàn bộ** chu kỳ của phiên.
   */
  const filteredCycles = useMemo(
    () =>
      cycles.filter((cycle) => {
        if (statusFilter === 'ALL') return true
        if (statusFilter === 'ACTIVE') return cycle.isActive
        if (statusFilter === 'ERROR') return cycle.hasError
        return !cycle.isActive && !cycle.hasError
      }),
    [cycles, statusFilter],
  )

  const pagedCycles = useMemo(
    () => filteredCycles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredCycles, page],
  )

  const columns: ColumnsType<SessionDeviceCycle> = [
    {
      title: 'Tầng',
      key: 'floor',
      width: 180,
      render: (_, cycle) => (
        <Flex vertical gap={2}>
          <Typography.Text style={{ fontSize: 12 }}>
            {cycle.floorLabel}
          </Typography.Text>
          <Typography.Text
            className="mcms-session-mono"
            type="secondary"
            style={{ fontSize: 11 }}
          >
            {statusLabel(
              AUTO_CONTROL_EVENT_DICTIONARY,
              cycle.onEvent.event_type,
              '—',
            )}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Thời điểm Bật',
      key: 'startedAt',
      width: 175,
      render: (_, cycle) => (
        <Typography.Text className="mcms-session-mono" style={{ fontSize: 12 }}>
          {fmtDateTime(cycle.onEvent.created_at)}
        </Typography.Text>
      ),
    },
    {
      title: 'Thời điểm Tắt',
      key: 'endedAt',
      width: 175,
      render: (_, cycle) => {
        if (cycle.isActive) {
          return <Tag color="processing">Đang bật</Tag>
        }
        /*
         * ⚠ Chu kỳ bị đóng bởi `FAULT` (lỗi thiết bị) ⇒ không có mốc "Tắt"
         *   thật ⇒ hiển thị nhãn lỗi thay vì thời điểm.
         */
        if (cycle.offEvent?.event_type === 'FAULT') {
          return <Tag color="error">Lỗi thiết bị</Tag>
        }
        return (
          <Typography.Text className="mcms-session-mono" style={{ fontSize: 12 }}>
            {fmtDateTime(cycle.offEvent?.created_at)}
          </Typography.Text>
        )
      },
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
      title: 'Nhiệt độ / Độ ẩm',
      key: 'climate',
      width: 160,
      align: 'right',
      render: (_, cycle) => (
        <Flex vertical gap={0} align="flex-end">
          <Typography.Text className="mcms-session-mono" style={{ fontSize: 12 }}>
            {cycle.averageTemperature != null
              ? `${cycle.averageTemperature.toFixed(1)}°C`
              : '—'}
            {' / '}
            {cycle.averageHumidity != null
              ? `${cycle.averageHumidity.toFixed(1)}%RH`
              : '—'}
          </Typography.Text>
          {/*
            ⚠ Nguồn giá trị — giúp Admin biết số liệu lấy từ đâu:
              - `aggregate`: cột `average_*` của BE (đã gộp sẵn).
              - `snapshot`: tính lại từ `sensor_values_json` (cột nhiệt độ của
                BE chỉ có từ migration 012 ⇒ dòng cũ thiếu).
          */}
          {cycle.climateSource !== 'none' && (
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {cycle.climateSource === 'aggregate'
                ? 'Gộp sẵn của BE'
                : 'Tính từ snapshot cảm biến'}
            </Typography.Text>
          )}
        </Flex>
      ),
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
          return <Tag color="error">Lỗi</Tag>
        }
        return <Tag color="success">Thành công</Tag>
      },
    },
    {
      title: 'Chi tiết',
      key: 'detail',
      /*
       * ⚠ **Cột này phải được co rộng tối thiểu + xuống dòng tự nhiên.**
       *
       *   Nếu không, chữ của `reason` (câu tiếng Việt dài, có dấu cách) bị
       *   ép về 1 từ mỗi dòng ⇒ cột cao lêu mà đọc rất khó.
       *
       *   ⚠ `min-width` **không có tác dụng** với `<td>` (table layout bỏ qua
       *   nó) ⇒ dùng class cho ô + `min-width` cho khối bên trong.
       */
      className: 'mcms-session-device-cycle-detail-cell',
      width: 260,
      render: (_, cycle) => (
        <Flex
          vertical
          gap={2}
          className="mcms-session-device-cycle-detail"
          style={{ minWidth: 200, whiteSpace: 'normal' }}
        >
          {cycle.reason && (
            <Typography.Text style={{ fontSize: 12, whiteSpace: 'normal' }}>
              {cycle.reason}
            </Typography.Text>
          )}
          {cycle.hasError && (
            <Typography.Text
              type="danger"
              style={{ fontSize: 12, whiteSpace: 'normal' }}
            >
              <WarningOutlined aria-hidden="true" /> Chu kỳ ghi nhận lỗi.
            </Typography.Text>
          )}
        </Flex>
      ),
    },
  ]

  const hasActiveFilter = statusFilter !== 'ALL'

  return (
    <DataTable<SessionDeviceCycle>
      rowKey={(row) => row.id}
      title="Nhật ký chu kỳ hoạt động thiết bị"
      description="Mỗi dòng là 1 chu kỳ Bật → Tắt của thiết bị tưới phun tự động trong phiên. Các sự kiện Tắt lặp thừa do cơ chế an toàn đã được gom bỏ."
      toolbar={
        <>
          <Select<CycleStatusFilter>
            size="small"
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value)
              setPage(1)
            }}
            style={{ minWidth: 200 }}
            aria-label="Lọc theo trạng thái chu kỳ"
            options={[
              { value: 'ALL', label: 'Trạng thái: Tất cả' },
              { value: 'ACTIVE', label: 'Trạng thái: Đang hoạt động' },
              { value: 'COMPLETED', label: 'Trạng thái: Đã hoàn tất' },
              { value: 'ERROR', label: 'Trạng thái: Lỗi' },
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
      /*
       * ⚠ `scroll.x` phải **≥ tổng width các cột** (1230) ⇒ nếu nhỏ hơn,
       *   antd nén các cột cuối ⇒ cột "Chi tiết" bị co lại ⇒ chữ lại xuống
       *   dòng từng từ một.
       */
      scroll={{ x: 1240 }}
      emptyTitle={
        hasActiveFilter
          ? 'Không có chu kỳ nào khớp bộ lọc'
          : 'Chưa có chu kỳ hoạt động nào'
      }
      emptyDescription={
        hasActiveFilter
          ? 'Thử bỏ bớt điều kiện lọc để xem toàn bộ chu kỳ của phiên.'
          : 'Phiên này chưa ghi nhận chu kỳ bật/tắt thiết bị tưới phun tự động.'
      }
    />
  )
}
