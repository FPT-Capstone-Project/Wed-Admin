/**
 * Trang **"Yêu cầu nhận nấm"** (WF-04) — danh sách yêu cầu nhận/bàn giao nấm
 * mà khách hàng gửi lên từ app.
 *
 * ## Nguồn dữ liệu
 *   - `GET /api/harvest-requests/admin` (roles 1 = Admin, 2 = Farm Operator)
 *     → `{ total, data: [...] }` — **không** có phân trang server-side ⇒ FE
 *       lọc client-side.
 *   - `GET /api/users` (chỉ Admin) → map `confirmed_by` (ID) → tên nhân viên.
 *
 * ## Vì sao 1 trang riêng (không gộp vào "Quản lý Thu hoạch")?
 *   - Endpoint cho phép **cả Admin lẫn Farm Operator**, còn trang
 *     `/harvests` chỉ dành cho Admin ⇒ gộp vào sẽ khóa Operator khỏi dữ liệu
 *     mà họ cần (lịch hẹn khách đến nhận).
 *   - Yêu cầu nhận nấm có thể tồn tại **trước khi** có đợt thu hoạch ⇒ tách
 *     khỏi bảng "đợt thu hoạch" (vốn chỉ có dòng khi đã ghi nhận thu hoạch).
 *
 * ⚠ **Chỉ đọc** — mọi thao tác ghi (chọn hình thức nhận, xác nhận bàn giao)
 *   do khách hàng hoặc nhân viên thực hiện trên app; BE kiểm tra server-side.
 */
import { useMemo, useState } from 'react'
import { Flex, Input, Select, Typography } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { DataTable } from '../../../shared/ui/DataTable'
import { PageHeader, StatCard, StatGrid, StatusBadge } from '../../../shared/ui'
import { LoadErrorAlert } from '../../../shared/ui/LoadErrorAlert'
import {
  HARVEST_METHOD_DICTIONARY,
  HARVEST_REQUEST_STATUS_DICTIONARY,
} from '../../../shared/i18n/status/harvest'
import { SESSION_STATUS_DICTIONARY } from '../../../shared/i18n/status/session'
import { presentStatus, selectOptions } from '../../../shared/i18n/status/registry'
import { useAdminHarvestRequests } from '../hooks/useAdminHarvestRequests'
import {
  resolveStaffName,
  useStaffNames,
} from '../../users/hooks/useStaffNames'
import {
  formatVietnamDateTime,
} from '../utils/harvest-request-format.utils'
import type { HarvestRequestRow } from '../types/harvest-request.types'

/** Bộ lọc trạng thái yêu cầu — theo đúng vòng đời WF-04. */
const REQUEST_STATUS_VALUES = [
  'PENDING',
  'SCHEDULED',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
] as const

/** Bộ lọc hình thức nhận. */
const METHOD_VALUES = ['PICKUP', 'DELIVERY'] as const

/**
 * Tổng hợp nhanh — 4 nhóm KPI tách bạch, không cộng trùng.
 */
function summarizeRequests(rows: readonly HarvestRequestRow[]) {
  let pending = 0
  let scheduled = 0
  let completed = 0
  for (const row of rows) {
    const key = String(row.status ?? '').trim().toUpperCase()
    if (key === 'PENDING') pending += 1
    else if (key === 'SCHEDULED') scheduled += 1
    else if (key === 'COMPLETED') completed += 1
  }
  return {
    total: rows.length,
    pending,
    scheduled,
    completed,
  }
}

export function HarvestRequestManagementPage() {
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [methodFilter, setMethodFilter] = useState<string | undefined>()

  const query = useAdminHarvestRequests()
  const rows = useMemo(() => query.data?.items ?? [], [query.data])

  /**
   * ⚠ BE chỉ trả **ID** cho `confirmed_by` ⇒ tra cứu tên nhân viên qua
   *   `GET /api/users` (chỉ Admin gọi được — Farm Operator sẽ thấy
   *   fallback `Nhân viên #<id>`).
   */
  const staffIds = useMemo(
    () => rows.map((row) => row.confirmed_by),
    [rows],
  )
  const staffNames = useStaffNames(staffIds)

  const filteredRows = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return rows.filter((row) => {
      if (statusFilter && String(row.status).toUpperCase() !== statusFilter) {
        return false
      }
      if (methodFilter && row.harvest_method !== methodFilter) return false
      if (!keyword) return true

      return [
        row.order_code,
        row.customer_name,
        row.customer_phone,
        row.customer_email,
        row.delivery_address,
        row.customer_note,
        row.harvest_request_id ? String(row.harvest_request_id) : '',
        row.session_id ? String(row.session_id) : '',
      ]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(keyword))
    })
  }, [methodFilter, rows, searchText, statusFilter])

  const summary = useMemo(() => summarizeRequests(rows), [rows])

  return (
    <div style={{ fontVariantNumeric: 'tabular-nums' }}>
      <PageHeader
        title="Yêu cầu nhận nấm"
        description="Theo dõi hình thức nhận (tự đến trang trại / giao tận nơi), lịch hẹn và trạng thái bàn giao của khách hàng."
      />

      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          aria-label="Tìm yêu cầu nhận nấm"
          prefix={<SearchOutlined />}
          placeholder="Tìm mã đơn, khách hàng, SĐT, email..."
          style={{ width: 300, maxWidth: '100%' }}
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        <Select
          allowClear
          aria-label="Lọc theo trạng thái yêu cầu"
          placeholder="Trạng thái"
          style={{ width: 190 }}
          value={statusFilter}
          options={selectOptions(
            HARVEST_REQUEST_STATUS_DICTIONARY,
            REQUEST_STATUS_VALUES,
          )}
          onChange={(value) => setStatusFilter(value)}
        />
        <Select
          allowClear
          aria-label="Lọc theo hình thức nhận"
          placeholder="Hình thức nhận"
          style={{ width: 180 }}
          value={methodFilter}
          options={selectOptions(HARVEST_METHOD_DICTIONARY, METHOD_VALUES)}
          onChange={(value) => setMethodFilter(value)}
        />
      </Flex>

      {query.isError ? (
        <LoadErrorAlert
          error={query.error}
          resource="danh sách yêu cầu nhận nấm"
          onRetry={query.refetch}
        />
      ) : (
        <>
          <StatGrid columns={4} style={{ marginBottom: 16 }}>
            <StatCard
              loading={query.isLoading}
              title="Tổng yêu cầu"
              value={summary.total}
              description="Tất cả yêu cầu trên hệ thống"
            />
            <StatCard
              loading={query.isLoading}
              title="Chờ xử lý"
              value={summary.pending}
              tone="warning"
              highlightValue={summary.pending > 0}
              description="Khách chưa chốt hình thức nhận"
            />
            <StatCard
              loading={query.isLoading}
              title="Đã lên lịch nhận"
              value={summary.scheduled}
              tone="info"
              description="Đã có lịch hẹn đến trang trại"
            />
            <StatCard
              loading={query.isLoading}
              title="Đã bàn giao"
              value={summary.completed}
              tone="ok"
              description="Hoàn tất nhận / giao nấm"
            />
          </StatGrid>

          <DataTable<HarvestRequestRow>
            size="small"
            rowKey="harvest_request_id"
            dataSource={filteredRows}
            loading={query.isLoading}
            isFetching={query.isFetching}
            /*
             * ⚠ `scrollX` = **tổng bề rộng các cột** (140 + 150 + 200 + 170 +
             *   160 + 150 = 970px) ⇒ trên màn hình 1550px (vùng nội dung
             *   ≈ 1220px) bảng **vừa khít**, không cuộn ngang. Màn hình hẹp
             *   hơn ⇒ bảng giữ bề rộng & cuộn ngang (không bẻ cột).
             */
            scrollX={970}
            tableLayout="fixed"
            pagination={{
              hideOnSinglePage: false,
              pageSize: 20,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: (total) => `Tổng ${total} yêu cầu`,
            }}
            emptyTitle="Chưa có yêu cầu nhận nấm nào"
            emptyDescription="Yêu cầu sẽ xuất hiện khi khách chọn hình thức nhận nấm trên ứng dụng."
            expandable={{
              expandedRowRender: (row) => (
                <div style={{ display: 'grid', gap: 8 }}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    <strong>Địa chỉ giao:</strong>{' '}
                    {row.delivery_address || '— Không có (khách tự đến nhận)'}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    <strong>Ghi chú khách:</strong>{' '}
                    {row.customer_note || '— Không có'}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    <strong>Nhân viên xác nhận:</strong>{' '}
                    {row.confirmed_by == null
                      ? '— Chưa xác nhận'
                      : resolveStaffName(staffNames, row.confirmed_by)}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    <strong>Thời điểm xác nhận:</strong>{' '}
                    {formatVietnamDateTime(row.confirmed_at)}
                    {' · '}
                    <strong>Hoàn tất:</strong>{' '}
                    {formatVietnamDateTime(row.completed_at)}
                  </Typography.Text>
                  {/*
                   * ⚠ `session_status` chỉ hiển thị **ở đây** (chi tiết mở
                   *   rộng) — không đưa vào cột "Trạng thái" của bảng chính.
                   */}
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    <strong>Trạng thái phiên canh tác:</strong>{' '}
                    {presentStatus(
                      SESSION_STATUS_DICTIONARY,
                      row.session_status,
                      'Chưa xác định',
                    ).label}
                    {` (Phiên #${row.session_id})`}
                  </Typography.Text>
                </div>
              ),
            }}
            columns={[
              {
                title: 'Yêu cầu / Phiên',
                key: 'ids',
                width: 140,
                render: (_, row) => (
                  <Flex vertical gap={2} style={{ minWidth: 0 }}>
                    <Typography.Text strong style={{ whiteSpace: 'nowrap' }}>
                      {`#${row.harvest_request_id}`}
                    </Typography.Text>
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: 12, whiteSpace: 'nowrap' }}
                    >
                      {`Phiên #${row.session_id}`}
                    </Typography.Text>
                  </Flex>
                ),
              },
              {
                title: 'Đơn hàng',
                key: 'order',
                width: 150,
                render: (_, row) => (
                  <Flex vertical gap={2} style={{ minWidth: 0 }}>
                    <Typography.Text
                      ellipsis={{ tooltip: true }}
                      style={{ width: '100%' }}
                    >
                      {row.order_code || '—'}
                    </Typography.Text>
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: 12 }}
                      ellipsis={{ tooltip: true }}
                    >
                      {row.order_id ? `Đơn #${row.order_id}` : '—'}
                    </Typography.Text>
                  </Flex>
                ),
              },
              {
                title: 'Khách hàng',
                key: 'customer',
                width: 200,
                render: (_, row) => (
                  <Flex vertical gap={2} style={{ minWidth: 0 }}>
                    <Typography.Text
                      strong
                      ellipsis={{ tooltip: true }}
                      style={{ width: '100%' }}
                    >
                      {row.customer_name || '—'}
                    </Typography.Text>
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: 12, width: '100%' }}
                      ellipsis={{ tooltip: true }}
                    >
                      {row.customer_phone || row.customer_email || '—'}
                    </Typography.Text>
                  </Flex>
                ),
              },
              {
                title: 'Hình thức / Lịch hẹn',
                key: 'method',
                width: 170,
                render: (_, row) => (
                  <Flex vertical gap={4} style={{ minWidth: 0 }}>
                    <StatusBadge
                      {...presentStatus(
                        HARVEST_METHOD_DICTIONARY,
                        row.harvest_method,
                        'Chưa chọn',
                      )}
                      title="Hình thức nhận nấm do khách chọn"
                      style={{ whiteSpace: 'nowrap' }}
                    />
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: 12, whiteSpace: 'nowrap' }}
                    >
                      {row.harvest_method === 'PICKUP'
                        ? formatVietnamDateTime(row.scheduled_at)
                        : 'Giao tận nơi'}
                    </Typography.Text>
                  </Flex>
                ),
              },
              {
                /*
                 * ⚠ Cột này **chỉ** hiển thị trạng thái của yêu cầu nhận nấm
                 *   (`status` từ `GET /api/harvest-requests/admin`).
                 *
                 * ⚠ `session_status` **KHÔNG** hiển thị ở đây (tránh 2 dòng
                 *   chữ gây rối) ⇒ chuyển sang phần mở rộng chi tiết dòng.
                 */
                title: 'Trạng thái',
                key: 'status',
                width: 160,
                render: (_, row) => (
                  <StatusBadge
                    {...presentStatus(
                      HARVEST_REQUEST_STATUS_DICTIONARY,
                      row.status,
                      'Chưa xác định',
                    )}
                    title="Trạng thái yêu cầu nhận nấm"
                    style={{ whiteSpace: 'nowrap' }}
                  />
                ),
              },
              {
                title: 'Bàn giao',
                key: 'handover',
                width: 150,
                render: (_, row) => (
                  <Flex vertical gap={2} style={{ minWidth: 0 }}>
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: 12, whiteSpace: 'nowrap' }}
                    >
                      {formatVietnamDateTime(row.confirmed_at)}
                    </Typography.Text>
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: 12, whiteSpace: 'nowrap' }}
                    >
                      {row.completed_at
                        ? `Xong ${formatVietnamDateTime(row.completed_at)}`
                        : 'Chưa hoàn tất'}
                    </Typography.Text>
                  </Flex>
                ),
              },
            ]}
          />
        </>
      )}
    </div>
  )
}
