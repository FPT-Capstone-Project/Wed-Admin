import { LoadErrorAlert } from '../../../shared/ui/LoadErrorAlert'
import '../rooms-industrial.css'
import { MetadataBadge } from '../../../shared/ui'
import {
  ApiOutlined,
  CalendarOutlined,
  ExperimentOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Descriptions,
  Drawer,
  Empty,
  Flex,
  Spin,
  Typography,
} from 'antd'
import { useMemo } from 'react'
import { tokens } from '../../../app/theme/tokens'
import { StatusBadge } from '../../../shared/ui/StatusBadge'
import { useAllUiTrays } from '../hooks/useCultivation'
import { useSessions } from '../../sessions/hooks/useSessions'
import {
  calculateRentalLifecycle,
  sessionToTrayRental,
} from '../utils/tray-rental.utils'
import { RentalLifecycleSection } from './RentalLifecycleSection'
import { SessionStatusTag } from '../../sessions/components/SessionStatusTag'
import { SpawnInspectionList } from '../../farm/components/SpawnInspectionList'
import { useSpawnInspections } from '../../farm/hooks/useFarm'
import { DailyInspectionList } from '../../sessions/components/DailyInspectionList'
import { useTrayDailyInspections } from '../../sessions/hooks/useSessionInspections'
import { ACTIVE_SESSION_STATUSES } from '../../sessions/types/session.types'
import { TrayStatusTag } from './TrayStatusTag'

interface TrayDetailDrawerProps {
  trayId: string | null
  onClose: () => void
  currentDate?: Date
}

const DATE_FMT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
function fmtDate(v: string | null | undefined) {
  if (!v) return '—'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? v : DATE_FMT.format(d)
}

// ── Info Card helper ─────────────────────────────────────────────────────────
interface InfoCardProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  children: React.ReactNode
}
function InfoCard({ icon, title, subtitle, children }: InfoCardProps) {
  return (
    <div
      style={{
        backgroundColor: tokens.color.surface,
        border: `1px solid ${tokens.color.borderSoft}`,
        borderRadius: tokens.radius.xl,
        overflow: 'hidden',
        boxShadow: tokens.shadow.xs,
      }}
    >
      {/* Card header */}
      <Flex
        align="center"
        gap={10}
        style={{
          padding: `${tokens.space['3']} ${tokens.space['4']}`,
          borderBottom: `1px solid ${tokens.color.borderSoft}`,
          backgroundColor: tokens.color.surfaceMuted,
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: tokens.radius.md,
            backgroundColor: tokens.color.primarySoft,
            color: tokens.color.primary,
            fontSize: 14,
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div>
          <Typography.Title level={5} style={{ margin: 0, fontSize: 13, color: tokens.color.text }}>
            {title}
          </Typography.Title>
          {subtitle && (
            <Typography.Text style={{ fontSize: 'var(--mcms-font-small)', color: tokens.color.textMuted }}>
              {subtitle}
            </Typography.Text>
          )}
        </div>
      </Flex>
      {/* Card body */}
      <div style={{ padding: `${tokens.space['3']} ${tokens.space['4']}` }}>
        {children}
      </div>
    </div>
  )
}

/**
 * Drawer chi tiết khay — **100% READ-ONLY**.
 *
 * ⚠ Giai đoạn 1: chuyển từ nguồn `/api/rentals/admin` (module `features/rentals`
 *   đã bị gỡ) sang `GET /api/farm/sessions`.
 *
 * ⚠ KHÔNG có thao tác ghi: ghi nhật nhật ký chăm sóc, thu hoạch sớm, tiêu hủy
 *   mẻ, xuất hóa đơn… đều do **nhân viên (staff)** thực hiện trên app.
 */
export function TrayDetailDrawer({
  trayId,
  onClose,
  currentDate,
}: TrayDetailDrawerProps) {
  // API lookup
  const { data: apiTrays = [], isLoading: traysLoading } = useAllUiTrays()
  const apiTray = useMemo(
    () => (trayId ? apiTrays.find((t) => t.id === trayId) : undefined),
    [apiTrays, trayId],
  )

  const trayNumericId = useMemo(() => {
    const parsed = Number(trayId)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }, [trayId])

  // Phiên canh tác đang gán cho khay — nguồn duy nhất.
  const { data: sessionsData, isLoading: sessionsLoading, isError: sessionsError, error: sessionError, refetch: refetchSessions } = useSessions(
    { trayId: trayNumericId ?? undefined, pageSize: 10 },
    { enabled: trayNumericId !== null, placeholderData: undefined },
  )

  const session = useMemo(() => {
    if (sessionsError) return null
    const items = sessionsData?.items ?? []
    return (
      items.find((s) => ACTIVE_SESSION_STATUSES.has(s.status)) ?? (apiTray?.status === 'rented' ? null : items[0] ?? null)
    )
  }, [sessionsData, sessionsError, apiTray?.status])

  const { data: inspections, isLoading: inspectionsLoading, isError: inspectionsError, error: inspectionError, refetch: refetchInspections } =
    useSpawnInspections(session?.session_id ?? null)

  /**
   * `session_tray_id` của khay này trong phiên.
   *
   * ⚠ **Khoá khác nhau**:
   *   - `tray_id` → `cultivation_trays.tray_id` (khay **vật lý**).
   *   - `session_tray_id` → `cultivation_session_trays.session_tray_id`
   *     (lần **gán khay vào phiên**).
   *
   *   Endpoint kiểm tra khay dùng `session_tray_id` ⇒ phải tra theo `tray_id`
   *   trong `session.trays[]` để lấy khoá đúng.
   */
  const sessionTrayId = useMemo(() => {
    if (!session) return null
    const match = session.trays.find((tray) => tray.tray_id === trayNumericId)
    return match?.session_tray_id ?? null
  }, [session, trayNumericId])

  /**
   * Lịch sử kiểm tra **chỉ của khay này** (giai đoạn 2) + ảnh.
   *
   * ⚠ Nguồn:
   *   `GET /api/cultivation-sessions/{sessionId}/trays/{sessionTrayId}/daily-inspections`
   *
   * ⚠ Nghiệp vụ chỉ quan tâm ảnh **từ lúc phôi được gán lên khay** ⇒ BE
   *   đã lọc theo `session_tray_id` nên mọi lần kiểm tra trả về đều nằm
   *   trong khoảng thời gian phôi nằm trên khay này.
   */
  const {
    data: dailyInspections,
    isLoading: dailyInspectionsLoading,
    isError: dailyInspectionsError,
    error: dailyInspectionsErrorDetail,
    refetch: refetchDailyInspections,
  } = useTrayDailyInspections(session?.session_id ?? null, sessionTrayId)

  /**
   * Ngày dùng để tính vòng đời canh tác.
   *
   * Bọc trong `useMemo` để identity ổn định giữa các render — nếu không,
   * `useMemo` bên dưới sẽ tính lại mỗi lần render (cảnh báo
   * `react-hooks/exhaustive-deps`).
   */
  const effectiveCurrentDate = useMemo(
    () => currentDate ?? new Date(),
    [currentDate],
  )

  const trayRental = useMemo(
    () => (session ? sessionToTrayRental(session) : null),
    [session],
  )
  const lifecycle = useMemo(
    () =>
      trayRental
        ? calculateRentalLifecycle(trayRental, effectiveCurrentDate)
        : null,
    [trayRental, effectiveCurrentDate],
  )

  const drawerTitle = useMemo(() => {
    if (apiTray) return `${apiTray.code} · Tầng ${apiTray.tierId}`
    if (trayId) return `Khay ${trayId}`
    return 'Thông tin vận hành'
  }, [apiTray, trayId])

  const isOpen = Boolean(trayId && apiTray)

  // ── Render content ──────────────────────────────────────────────────────
  const renderContent = () => {
    if (!apiTray) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Không tìm thấy thông tin khay."
        />
      )
    }

    const occupiedNotice = <Alert type="info" showIcon message="Khay đang trong chu kỳ nuôi trồng" description="Hệ thống đã ghi nhận khay được phân bổ. Dữ liệu tiến độ phiên canh tác chi tiết đang được cập nhật từ máy chủ." />
    const isLoadingAny = traysLoading || sessionsLoading

    if (isLoadingAny) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.space['4'],
            padding: tokens.space['4'],
          }}
        >
          <InfoCard
            icon={<ApiOutlined />}
            title="Thông tin khay"
            subtitle={`Tầng ${apiTray.tierId} · ${apiTray.code}`}
          >
            <Flex align="center" gap={8}>
              <TrayStatusTag status={apiTray.status} />
            </Flex>
          </InfoCard>
          {apiTray.status === 'rented' && !session && occupiedNotice}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: tokens.space['7'],
            }}
          >
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 32 }} />}
              tip="Đang tải thông tin phiên canh tác..."
            />
          </div>
        </div>
      )
    }

    // ── Có phiên canh tác ─────────────────────────────────────────────
    if (session && trayRental && lifecycle) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.space['4'],
            padding: tokens.space['4'],
          }}
        >
          {/* Khay + trạng thái */}
          <InfoCard
            icon={<ApiOutlined />}
            title="Thông tin khay"
            subtitle={`Tầng ${apiTray.tierId} · ${apiTray.code}`}
          >
            <Flex align="center" gap={8} wrap>
              <TrayStatusTag status={apiTray.status} />
              <SessionStatusTag status={session.status} />
              {session.payment_status && (
                <StatusBadge
                  tone={session.payment_status === 'PAID' ? 'ok' : 'warning'}
                  label={session.payment_status}
                />
              )}
            </Flex>
          </InfoCard>

          {/* Vòng đời canh tác */}
          <InfoCard
            icon={<CalendarOutlined />}
            title="Thông tin mẻ & khách hàng"
            subtitle={`Phiên canh tác #${session.session_id}`}
          >
            <RentalLifecycleSection
              batchId={`Phiên #${session.session_id}`}
              rental={trayRental}
              lifecycle={lifecycle}
            />
          </InfoCard>

          {/* Chi tiết phiên từ BE */}
          <InfoCard
            icon={<InfoCircleOutlined />}
            title={`Chi tiết phiên canh tác #${session.session_id}`}
            subtitle="Dữ liệu đồng bộ từ hệ thống quản lý"
          >
            <Descriptions
              size="small"
              column={{ xs: 1, sm: 2 }}
              styles={{ label: { fontWeight: 500, color: tokens.color.textMuted } }}
            >
              <Descriptions.Item
                label={
                  <>
                    <UserOutlined /> Khách thuê
                  </>
                }
                span={2}
              >
                <strong>{session.customer_name ?? '—'}</strong>
                {session.customer_phone && (
                  <span style={{ marginLeft: 8, color: tokens.color.textMuted }}>
                    · {session.customer_phone}
                  </span>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Email">
                {session.customer_email ?? '—'}
              </Descriptions.Item>

              <Descriptions.Item label="Loại nấm">
                <strong>{session.mushroom_name ?? '—'}</strong>
              </Descriptions.Item>

              <Descriptions.Item label="Gói thuê">
                {session.package_name ?? '—'}
              </Descriptions.Item>

              <Descriptions.Item label={<><ExperimentOutlined /> Phôi đã cấp</>}>
                {session.trays.some((t) => (t.spawn_quantity ?? 0) > 0)
                  ? `${session.trays.reduce((sum, t) => sum + (t.spawn_quantity ?? 0), 0)} đơn vị`
                  : '—'}
              </Descriptions.Item>

              <Descriptions.Item label={<><CalendarOutlined /> Bắt đầu</>}>
                {fmtDate(session.start_date)}
              </Descriptions.Item>

              <Descriptions.Item label="Kết thúc">
                {fmtDate(session.expected_harvest_date ?? session.end_date)}
              </Descriptions.Item>

              <Descriptions.Item label="Phòng / Tầng" span={2}>
                {session.trays[0]?.room_name ?? session.trays[0]?.room_code ?? '—'}
                {session.trays[0]?.floor_name &&
                  ` · ${session.trays[0].floor_name}`}
              </Descriptions.Item>

              <Descriptions.Item label="Mã đơn" span={2}>
                {session.order_id ? (
                  <MetadataBadge
                    className="mcms-rental-mono"
                    label={`#${session.order_id}`}
                  />
                ) : (
                  '—'
                )}
              </Descriptions.Item>
            </Descriptions>
          </InfoCard>

          {/* Lịch sử kiểm tra phôi */}
          <InfoCard
            icon={<ExperimentOutlined />}
            title="Lịch sử kiểm tra phôi"
            subtitle="Chỉ xem — ghi nhận do nhân viên thực hiện trên app"
          >
            {inspectionsLoading ? (
              <Spin tip="Đang tải lịch sử kiểm tra phôi..." />
            ) : inspectionsError ? (
              <LoadErrorAlert error={inspectionError} resource="lịch sử kiểm tra phôi" onRetry={refetchInspections} />
            ) : (
              <SpawnInspectionList inspections={inspections?.inspections ?? []} />
            )}
          </InfoCard>

          {/*
            * ⚠ Lịch sử kiểm tra **trên khay này** (giai đoạn 2) + ảnh.
            *
            *   Nguồn: `GET /api/cultivation-sessions/{sessionId}/trays/{sessionTrayId}/daily-inspections`
            *
            * ⚠ Chỉ hiện khi tra được `session_tray_id` (khoá gán khay trong
            *   phiên) — `useSessions` (luồng farm) **không** trả khoá này nên
            *   nếu thiếu thì bỏ qua card thay vì gọi sai endpoint.
            */}
          {sessionTrayId !== null && (
            <InfoCard
              icon={<ExperimentOutlined />}
              title="Lịch sử kiểm tra trên khay"
              subtitle={`Chỉ ảnh kiểm tra phát sinh từ khi phôi được gán lên khay này · ${
                dailyInspections?.pagination.total ?? 0
              } lần kiểm tra`}
            >
              {dailyInspectionsLoading ? (
                <Spin tip="Đang tải lịch sử kiểm tra khay..." />
              ) : dailyInspectionsError ? (
                <LoadErrorAlert
                  error={dailyInspectionsErrorDetail}
                  resource="lịch sử kiểm tra khay"
                  onRetry={refetchDailyInspections}
                />
              ) : (
                <DailyInspectionList
                  inspections={dailyInspections?.inspections ?? []}
                  emptyDescription="Chưa có lần kiểm tra nào trên khay này."
                />
              )}
            </InfoCard>
          )}
        </div>
      )
    }

    // ── Không có phiên ─────────────────────────────────────────────
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.space['4'],
          padding: tokens.space['4'],
        }}
      >
        <InfoCard
          icon={<ApiOutlined />}
          title="Thông tin khay"
          subtitle={`Tầng ${apiTray.tierId} · ${apiTray.code}`}
        >
          <Flex align="center" gap={8}>
            <TrayStatusTag status={apiTray.status} />
          </Flex>
        </InfoCard>
        {apiTray.status === 'rented' ? occupiedNotice : !sessionsError && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Khay chưa có phiên canh tác nào đang chạy." />}
        {sessionsError && <LoadErrorAlert error={sessionError} resource="dữ liệu phiên của khay" onRetry={refetchSessions} />}
      </div>
    )
  }

  return (
    <Drawer
      rootClassName="tray-detail-drawer"
      title={
        <Flex align="center" gap={8}>
          <span
            style={{
              fontWeight: tokens.typography.weightBold,
              color: tokens.color.text,
            }}
          >
            Chi tiết khay nấm
          </span>
          <span
            style={{
              fontSize: 'var(--mcms-font-small)',
              color: tokens.color.textMuted,
              fontWeight: tokens.typography.weightMedium,
              backgroundColor: tokens.color.surfaceMuted,
              border: `1px solid ${tokens.color.border}`,
              borderRadius: tokens.radius.md,
              padding: '1px 8px',
            }}
          >
            {drawerTitle}
          </span>
        </Flex>
      }
      size={680}
      open={isOpen}
      onClose={onClose}
      destroyOnHidden
      styles={{
        body: { padding: 0, backgroundColor: tokens.color.surface },
        header: {
          borderBottom: `1px solid ${tokens.color.border}`,
          backgroundColor: tokens.color.surface,
        },
      }}
    >
      {renderContent()}
    </Drawer>
  )
}
