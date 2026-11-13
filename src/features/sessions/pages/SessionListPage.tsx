import { formatDate } from '../../../shared/utils/date'
import { Popover, Button } from 'antd'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { LoadErrorAlert } from '../../../shared/ui/LoadErrorAlert'
import '../sessions-industrial.css'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Card,
  Col,
  Flex,
  Input,
  Progress,
  Row,
  Segmented,
  Select,
  Skeleton,
  Space,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { Suspense, useMemo, useState } from 'react'
import { ActionButton, DataTable, StatCard, StatusBadge } from '../../../shared/ui'
import { useAllAdminCultivationSessions } from '../hooks/useAdminCultivationSessions'
import type {
  AdminCultivationSessionDto,
  SessionGrowthStage,
} from '../types/admin-session.types'
import {
  ACTIVE_SESSION_STATUSES,
  CULTIVATION_SESSION_STATUSES,
  type CultivationSessionStatus,
} from '../types/session.types'
import { SessionStatusTag } from '../components/SessionStatusTag'
import {
  MUSHROOM_GROWTH_PHASE_DICTIONARY,
  SESSION_STATUS_DICTIONARY,
  resolveGrowthPhase,
  resolveSessionHarvestStatus,
} from '../../../shared/i18n/status/session'
import { selectOptions } from '../../../shared/i18n/status/registry'
import { resolveSessionProgress } from '../utils/session-progress.utils'
import { SessionDetailDrawer } from '../../../app/router/lazy-modals'

/**
 * Trang danh sách phiên canh tác — **100% READ-ONLY**.
 *
 * ⚠ Nguồn dữ liệu: `GET /api/cultivation-sessions/admin` — danh sách phiên của
 *   **toàn bộ khách hàng** (roles 1 = Admin, 2 = Farm Operator), có phân trang
 *   server-side và trả kèm khay / giai đoạn sinh trưởng / tiến độ / trạng
 *   thái thu hoạch.
 *
 * Không có nút tạo / sửa / xoá / chuyển giai đoạn. Mọi thao tác ghi do
 * nhân viên (staff) thực hiện trên app.
 */

const STATUS_OPTIONS = selectOptions(
  SESSION_STATUS_DICTIONARY,
  CULTIVATION_SESSION_STATUSES,
)

/**
 * Nhóm bộ lọc nhanh ở đầu bảng.
 *
 * ⚠ Gom theo **nhóm nghiệp vụ** thay vì từng trạng thái (8 trạng thái quá
 *   nhiều cho 1 thanh filter) — giúp người dùng không bị "đan xen rối mắt"
 *   giữa phiên đang canh tác và phiên chờ xử lý.
 */
type SessionGroupFilter = 'ALL' | 'CULTIVATING' | 'PENDING' | 'FINISHED'

const GROUP_FILTER_OPTIONS: Array<{ value: SessionGroupFilter; label: string }> =
  [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'CULTIVATING', label: 'Đang canh tác' },
    { value: 'PENDING', label: 'Chờ xử lý' },
    { value: 'FINISHED', label: 'Đã hoàn tất' },
  ]

/** Phiên "đang canh tác" — đã gán khay & đang trong chu kỳ sinh trưởng. */
const CULTIVATING_STATUSES: ReadonlySet<CultivationSessionStatus> = new Set([
  'SPAWN_RESTING',
  'MYCELIAL_DEVELOPMENT',
  'READY_FOR_CULTIVATION',
  'CULTIVATING',
  'HARVEST_READY',
  'HARVESTING',
])

/** Phiên "chờ xử lý" — chờ cấp phôi / gán khay. */
const PENDING_STATUSES: ReadonlySet<CultivationSessionStatus> = new Set([
  'PENDING',
])

/** Phiên đã kết thúc — đã thu hoạch hoặc đã huỷ. */
const FINISHED_STATUSES: ReadonlySet<CultivationSessionStatus> = new Set([
  'COMPLETED',
  'CANCELLED',
])

function matchesGroup(
  status: CultivationSessionStatus,
  group: SessionGroupFilter,
): boolean {
  switch (group) {
    case 'CULTIVATING':
      return CULTIVATING_STATUSES.has(status)
    case 'PENDING':
      return PENDING_STATUSES.has(status)
    case 'FINISHED':
      return FINISHED_STATUSES.has(status)
    default:
      return true
  }
}

/**
 * Tiến độ sinh trưởng — **chỉ lấy từ Phiên canh tác**.
 *
 * ⚠ Không tính nhẩm theo số ngày trôi qua (`start_at` / `harvest_date`) và
 *   không lấy từ báo cáo khay — giá trị `%` là `progress_percent` mà Farm OP
 *   cập nhật qua API của phiên.
 */
function resolveProgress(session: AdminCultivationSessionDto): number {
  return resolveSessionProgress(session.progress_percent, session.status)
}


/**
 * Sắp xếp mặc định: **Đang canh tác** lên trước → **Chờ xử lý** → **Đã kết
 * thúc**; trong mỗi nhóm, mốc thời gian **mới nhất trước**.
 *
 * ⚠ Mốc thời gian ưu tiên `created_at` (ngày tạo phiên). Phiên "chờ xử lý"
 *   chưa có `start_at` ⇒ dùng `created_at` là mốc duy nhất hợp lệ.
 *   Phiên đã bắt đầu thì `start_at` là mốc thực tế của chu kỳ ⇒ ưu tiên.
 *   Khi không có mốc nào ⇒ xếp cuối nhóm, fallback `session_id` DESC.
 */
function compareSessions(
  left: AdminCultivationSessionDto,
  right: AdminCultivationSessionDto,
): number {
  const groupRank = (status: CultivationSessionStatus) => {
    if (CULTIVATING_STATUSES.has(status)) return 0
    if (PENDING_STATUSES.has(status)) return 1
    if (FINISHED_STATUSES.has(status)) return 2
    return 3
  }

  const groupDiff = groupRank(left.status) - groupRank(right.status)
  if (groupDiff !== 0) return groupDiff

  // Mốc thời gian: `start_at` (đã bắt đầu) → `created_at` (chờ xử lý).
  const timeOf = (session: AdminCultivationSessionDto): number => {
    const start = session.start_at ? Date.parse(session.start_at) : Number.NaN
    if (Number.isFinite(start)) return start
    const created = session.created_at ? Date.parse(session.created_at) : Number.NaN
    return created
  }

  const leftTime = timeOf(left)
  const rightTime = timeOf(right)
  const leftValid = Number.isFinite(leftTime)
  const rightValid = Number.isFinite(rightTime)

  // Phiên chưa có mốc thời gian → đẩy xuống cuối nhóm.
  if (leftValid !== rightValid) return leftValid ? -1 : 1
  if (leftValid && rightTime !== leftTime) {
    return rightTime - leftTime
  }

  // Fallback: `session_id` DESC (ID tăng dần theo thời gian).
  return right.session_id - left.session_id
}

export function SessionListPage() {
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    CultivationSessionStatus | undefined
  >()
  const [groupFilter, setGroupFilter] = useState<SessionGroupFilter>('ALL')
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null,
  )

  // ⚠ BE hỗ trợ lọc theo `status` (server-side) nhưng **không** hỗ trợ tìm
  //   kiếm theo từ khóa ⇒ kéo toàn bộ trang để lọc client.
  const { data, isLoading, isFetching, isError, error, refetch } =
    useAllAdminCultivationSessions(statusFilter)

  const items = useMemo(() => data ?? [], [data])

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    const matched = items.filter((session) => {
      if (!matchesGroup(session.status, groupFilter)) return false
      if (!keyword) return true

      return [
        session.customer_name,
        session.customer_email,
        session.order_id ? String(session.order_id) : '',
        session.package_name,
        session.mushroom_name,
        ...session.trays.map((tray) => tray.tray_code ?? ''),
      ].some((field) => field?.toLowerCase().includes(keyword))
    })

    // ⚠ Sắp xếp mặc định — gom nhóm "Đang canh tác" lên trước để bảng
    //   không bị đan xen các trạng thái.
    return [...matched].sort(compareSessions)
  }, [groupFilter, items, searchText])

  const summary = useMemo(
    () => ({
      total: items.length,
      active: items.filter((s) => ACTIVE_SESSION_STATUSES.has(s.status)).length,
      waiting: items.filter((s) => PENDING_STATUSES.has(s.status)).length,
      cancelled: items.filter((s) => s.status === 'CANCELLED').length,
    }),
    [items],
  )

  const columns: ColumnsType<AdminCultivationSessionDto> = useMemo(
    () => [
      {
        title: 'Mã phiên',
        dataIndex: 'session_id',
        key: 'session_id',
        className: 'mcms-session-mono',
        width: 72,
        render: (value: number) => (
          <Typography.Text strong>#{value}</Typography.Text>
        ),
      },
      {
        title: 'Khách hàng',
        key: 'customer',
        width: 124,
        render: (_, session) => (
          <Flex vertical style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
            <Typography.Text strong ellipsis={{ tooltip: true }} style={{ width: '100%' }}>
              {session.customer_name ?? '—'}
            </Typography.Text>
            <Typography.Text type="secondary" ellipsis={{ tooltip: true }} style={{ fontSize: 12, width: '100%' }}>
              {session.customer_email ?? '—'}
            </Typography.Text>
          </Flex>
        ),
      },
      {
        title: 'Gói / Giống nấm',
        key: 'package',
        width: 120,
        render: (_, session) => (
          <Flex vertical style={{ minWidth: 0 }}>
            <Typography.Text ellipsis={{ tooltip: true }}>
              {session.package_name ?? '—'}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }} ellipsis={{ tooltip: true }}>
              {session.mushroom_name ?? '—'}
              {session.order_id ? ` · Đơn #${session.order_id}` : ''}
            </Typography.Text>
          </Flex>
        ),
      },
      {
        title: 'Khay / Tầng',
        key: 'trays',
        width: 104,
        render: (_, session) => {
          if (session.trays.length === 0) {
            return (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Xem trong chi tiết
              </Typography.Text>
            )
          }
          const codes = session.trays
            .map((tray) => tray.tray_code)
            .filter(Boolean)
            .join(', ')
          const floors = [
            ...new Set(
              session.trays
                .map((tray) => tray.floor_name)
                .filter((value): value is string => Boolean(value)),
            ),
          ]
          return (
            <Popover trigger={['click']} title="Danh sách khay / tầng" content={
              <div style={{ maxWidth: '80vw', overflowWrap: 'anywhere' }}>
                {session.trays.map((tray, index) => <div key={tray.tray_id ?? index}>
                  {tray.tray_code ?? 'Chưa có mã'} · {tray.floor_name ?? (tray.floor_number != null ? `Tầng ${tray.floor_number}` : 'Chưa rõ tầng')}
                </div>)}
              </div>
            }>
              <Button type="link" aria-label={`Xem ${session.trays.length} khay: ${codes}`} style={{ maxWidth: '100%', whiteSpace: 'normal', height: 'auto' }}>
                {session.trays.length} khay{floors.length > 0 ? ` · ${floors.length === 1 ? floors[0] : `${floors.length} tầng`}` : ''}
              </Button>
            </Popover>
          )
        },
      },
      {
        /*
         * ⚠ Gộp "Số khay" + "Số phôi yêu cầu" thành **1 cột gọn**
         *   ("Khay / Phôi") ⇒ bảng vừa 1 màn hình desktop, không cần cuộn ngang.
         */
        title: 'Khay / Phôi',
        key: 'tray_spawn',
        width: 100,
        render: (_, session) => {
          const trays = session.tray_quantity
          const spawns = session.spawn_quantity
          if (trays == null && spawns == null) {
            return (
              <Typography.Text type="secondary">—</Typography.Text>
            )
          }
          return (
            <Typography.Text style={{ whiteSpace: 'nowrap' }}>
              {trays ?? '—'} khay
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {' · '}
                {spawns ?? '—'} phôi
              </Typography.Text>
            </Typography.Text>
          )
        },
      },
      {
        title: 'Giai đoạn sinh trưởng',
        key: 'growth_stage',
        width: 160,
        render: (_, session) => {
          const stage: SessionGrowthStage | null =
            session.current_stage ?? session.growth_status
          const percent = resolveProgress(session)
          if (session.status === 'CANCELLED') {
            return (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Đã hủy
              </Typography.Text>
            )
          }
          /*
           * ⚠ Giai đoạn hiển thị luôn thuộc **1 trong 4 giai đoạn trồng nấm**
           *   ("Ủ tơ" → "Kéo tơ" → "Nấm đang phát triển" → "Sẵn sàng thu hoạch"),
           *   gộp từ cả `current_stage` (WF-03) lẫn `status` (vòng đời phiên).
           *
           * ⚠ Phiên `CULTIVATING` mặc định là **"Kéo tơ"** — chỉ khi Farm OP
           *   ghi nhận giai đoạn ra quả (`current_stage` ∈ `FRUITING_INITIATION` /
           *   `PINNING` / `YOUNG_FRUITING` / `FRUITING`) thì mới nhảy sang
           *   "Nấm đang phát triển".
           *
           * ⚠ Phiên đã `COMPLETED` ⇒ "Hoàn thành" (tiến độ 100 %), KHÔNG
           *   phải "Sẵn sàng thu hoạch" — `resolveGrowthPhase` đã ưu tiên
           *   trạng thái kết thúc.
           */
          const phase = resolveGrowthPhase(stage, session.status)
          return (
            <Flex vertical gap={2} style={{ width: '100%', maxWidth: 160 }}>
              <Flex justify="space-between" align="center" gap={8}>
                <Typography.Text
                  style={{ fontSize: 12, fontWeight: 600, minWidth: 0 }}
                  ellipsis={{ tooltip: true }}
                >
                  {phase
                    ? MUSHROOM_GROWTH_PHASE_DICTIONARY[phase].label
                    : (SESSION_STATUS_DICTIONARY[session.status]?.shortLabel ??
                      session.status)}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {percent}%
                </Typography.Text>
              </Flex>
              <Progress
                percent={percent}
                size="small"
                strokeColor="var(--mcms-primary)"
                showInfo={false}
              />
            </Flex>
          )
        },
      },
      {
        title: 'Thu hoạch',
        key: 'harvest',
        width: 128,
        render: (_, session) => {
          /*
           * ⚠ Phiên đã `COMPLETED` ⇒ hiển thị **"Đã thu hoạch"** (xanh lá),
           *   KHÔNG phải badge cam "Sẵn sàng thu hoạch" — BE vẫn giữ
           *   `harvest_status = 'HARVEST_READY'` sau khi phiên kết thúc.
           */
          const harvestConfig = resolveSessionHarvestStatus(
            session.status,
            session.harvest_status,
          )
          return (
            <Flex vertical gap={2}>
              {harvestConfig ? (
                <StatusBadge
                  tone={harvestConfig.tone}
                  label={harvestConfig.label}
                />
              ) : (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  —
                </Typography.Text>
              )}
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                {formatDate(session.harvest_date)}
              </Typography.Text>
            </Flex>
          )
        },
      },
      {
        title: 'Bắt đầu',
        dataIndex: 'start_at',
        key: 'start_at',
        className: 'mcms-session-mono',
        width: 92,
        render: (value: string | null) => (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatDate(value)}
          </Typography.Text>
        ),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 124,
        render: (status: CultivationSessionStatus) => (
          <SessionStatusTag status={status} />
        ),
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 68,
        align: 'center',
        render: (_, session) => (
          <ActionButton
            icon={<EyeOutlined />}
            label="Chi tiết"
            description={`Xem chi tiết phiên canh tác #${session.session_id}`}
            variant="text"
            size="small"
            hideLabel
            onClick={() => setSelectedSessionId(session.session_id)}
          />
        ),
      },
    ],
    [],
  )

  const handleStatusChange = (value: CultivationSessionStatus | undefined) => {
    setStatusFilter(value)
  }

  if (isError)
    return (
      <LoadErrorAlert
        error={error}
        resource="danh sách phiên canh tác"
        onRetry={refetch}
      />
    )

  // ⚠ Skeleton chỉ hiện lần **đầu** (chưa có dữ liệu). Các lần đổi trang /
  //   đổi bộ lọc sau giữ bảng + spinner của antd để không nhảy layout.
  if (isLoading && items.length === 0) {
    return <Skeleton active paragraph={{ rows: 10 }} />
  }

  return (
    <div>
      {/*
       * ⚠ Markup lấy từ nhánh **main** (Updated upstream): dùng `PageHeader`
       *   chuẩn (h1 + mô tả + actions) thay vì `Typography.Title` thủ công.
       *   Nội dung bên trong `actions` giữ nguyên bộ lọc của nhánh stash.
       */}
      <PageHeader
        title="Quản lý phiên canh tác"
        description="Theo dõi toàn bộ phiên canh tác của mọi khách hàng — khay đã gán, giai đoạn sinh trưởng, tiến độ và trạng thái thu hoạch. Chỉ đọc."
        actions={
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Tìm khách, mã đơn, gói, mã khay..."
              style={{ width: 280 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Select
              allowClear
              placeholder="Tất cả trạng thái"
              style={{ width: 200 }}
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={handleStatusChange}
            />
          </Space>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} lg={6}>
          <StatCard
            title="Tổng phiên"
            value={summary.total}
            tone="neutral"
            icon={<FileTextOutlined />}
            description="Tất cả phiên canh tác trong hệ thống"
          />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard
            title="Đang chạy"
            value={summary.active}
            tone="ok"
            highlightValue
            icon={<CheckCircleOutlined />}
            description="Phiên chưa kết thúc / chưa hủy"
          />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard
            title="Chờ xử lý"
            value={summary.waiting}
            tone="warning"
            highlightValue
            icon={<ClockCircleOutlined />}
            description="Phiên chờ cấp phôi / gán khay"
          />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard
            title="Đã hủy"
            value={summary.cancelled}
            tone="danger"
            highlightValue
            icon={<CloseCircleOutlined />}
            description="Phiên đã bị hủy"
          />
        </Col>
      </Row>

      <Card styles={{ body: { padding: 0 } }}>
        {/* ── Bộ lọc nhóm ở đầu bảng ─────────────────────────────── */}
        <Flex
          align="center"
          justify="space-between"
          gap={12}
          wrap
          style={{ padding: 16, paddingBottom: 0 }}
        >
          <Segmented<SessionGroupFilter>
            value={groupFilter}
            onChange={setGroupFilter}
            options={GROUP_FILTER_OPTIONS}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Đang hiển thị {filteredItems.length} / {items.length} phiên
          </Typography.Text>
        </Flex>

        <DataTable<AdminCultivationSessionDto>
          rowKey="session_id"
          columns={columns}
          dataSource={filteredItems}
          loading={isLoading}
          isFetching={isFetching}
          /*
           * ⚠ `scrollX` = **tổng bề rộng các cột** (1092px).
           *   - Màn hình desktop 1440px (vùng nội dung ≈ 1112px) ⇒ bảng
           *     được `min-width: 100%` co giãn vừa khít ⇒ **KHÔNG** thanh
           *     cuộn ngang.
           *   - Màn hình hẹp hơn ⇒ bảng giữ bề rộng cố định và cuộn ngang
           *     (không bẻ cột làm khó đọc).
           */
          scrollX={1092}
          tableLayout="fixed"
          className="mcms-session-table"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `Tổng ${total} phiên`,
          }}
          emptyTitle="Chưa có phiên canh tác nào"
          emptyDescription="Phiên sẽ xuất hiện khi khách đặt gói và hệ thống khởi tạo."
        />
      </Card>

      <Suspense fallback={null}>
        <SessionDetailDrawer
          sessionId={selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
        />
      </Suspense>
    </div>
  )
}
