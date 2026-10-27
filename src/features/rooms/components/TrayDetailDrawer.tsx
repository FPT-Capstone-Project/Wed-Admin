import {
  ApiOutlined,
  BookOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  ScissorOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  App as AntdApp,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Flex,
  Spin,
  Tag,
  Typography,
} from 'antd'
import { useMemo, useState } from 'react'
import type { Tier } from '../../../types/room.types'
import { tokens } from '../../../app/theme/tokens'
import { StatusBadge } from '../../../shared/ui/StatusBadge'
import { useAllUiTrays } from '../hooks/useCultivation'
import { useRentalByTray } from '../../rentals/hooks/useRentals'
import { calculateRentalLifecycle, rentalToTrayRental } from '../utils/tray-rental.utils'
import { RentalLifecycleSection } from './RentalLifecycleSection'
import type { ClosureDialogAction } from './TrayClosureReasonModal'
import { TrayClosureReasonModal } from './TrayClosureReasonModal'
import type { InvoiceMode } from './TrayInvoiceModal'
import { TrayInvoiceModal } from './TrayInvoiceModal'
import { TrayStaffActionWorkflow } from './TrayStaffActionWorkflow'
import { TrayStatusTag } from './TrayStatusTag'
import { useRoomStore } from '../../../stores/room.store'

interface TrayDetailDrawerProps {
  trayId: string | null
  onClose: () => void
  currentDate?: Date
}

interface InvoiceRequest {
  mode: InvoiceMode
  reason: string
}

function joinReason(reason: string, note: string) {
  return note ? `${reason}: ${note}` : reason
}

function findTrayDetail(tiers: Tier[], trayId: string | null) {
  if (!trayId) return null
  for (const tier of tiers) {
    const tray = tier.trays.find((item) => item.id === trayId)
    if (tray) return { tier, tray }
  }
  return null
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

const RENTAL_STATUS_MAP: Record<string, { tone: 'ok' | 'info' | 'warning' | 'danger' | 'muted' | 'neutral'; label: string }> = {
  CONFIRMED: { tone: 'neutral', label: 'Chờ xác nhận' },
  PREPARING: { tone: 'info',    label: 'Đang chuẩn bị' },
  ACTIVE:    { tone: 'ok',      label: 'Đang canh tác' },
  COMPLETED: { tone: 'muted',   label: 'Đã hoàn tất' },
  CANCELLED: { tone: 'danger',  label: 'Đã huỷ' },
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
            <Typography.Text style={{ fontSize: 11, color: tokens.color.textMuted }}>
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

// ── Drawer Footer (sticky action bar) ────────────────────────────────────────
interface DrawerFooterProps {
  onLogNote: () => void
  onEarlyHarvest: () => void
  disabled?: boolean
}
function DrawerFooter({ onLogNote, onEarlyHarvest, disabled }: DrawerFooterProps) {
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 10,
        backgroundColor: tokens.color.surface,
        borderTop: `1px solid ${tokens.color.border}`,
        padding: `${tokens.space['3']} ${tokens.space['4']}`,
        boxShadow: `0 -4px 16px rgb(24 73 42 / 6%)`,
      }}
    >
      <Typography.Text
        style={{
          display: 'block',
          fontSize: 11,
          color: tokens.color.textMuted,
          marginBottom: tokens.space['2'],
          fontWeight: tokens.typography.weightMedium,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        Thao tác vận hành
      </Typography.Text>
      <Flex gap={8} wrap>
        <Button
          id="btn-log-note"
          icon={<BookOutlined />}
          onClick={onLogNote}
          disabled={disabled}
          style={{
            minHeight: tokens.targetSize.comfortable,
            flex: 1,
            fontWeight: tokens.typography.weightSemibold,
          }}
        >
          Ghi chú nhật ký
        </Button>
        <Button
          id="btn-early-harvest"
          icon={<ScissorOutlined />}
          onClick={onEarlyHarvest}
          disabled={disabled}
          style={{
            minHeight: tokens.targetSize.comfortable,
            flex: 1,
            fontWeight: tokens.typography.weightSemibold,
            color: tokens.tone.warning.text,
            borderColor: tokens.tone.warning.border,
            backgroundColor: tokens.tone.warning.bg,
          }}
        >
          Thu hoạch sớm
        </Button>
      </Flex>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export function TrayDetailDrawer({
  trayId,
  onClose,
  currentDate,
}: TrayDetailDrawerProps) {
  const { message } = AntdApp.useApp()
  const [dialogAction, setDialogAction] = useState<ClosureDialogAction | null>(null)
  const [invoiceRequest, setInvoiceRequest] = useState<InvoiceRequest | null>(null)

  // Mock store fallback
  const tiers = useRoomStore((state) => state.tiers)
  const closeTraySession = useRoomStore((state) => state.closeTraySession)
  const confirmTrayCustomerContact = useRoomStore((state) => state.confirmTrayCustomerContact)
  const addTrayCareLog = useRoomStore((state) => state.addTrayCareLog)

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

  const { data: beRental, isLoading: rentalLoading, isError: rentalError } =
    useRentalByTray(trayNumericId, { enabled: trayNumericId !== null })

  /**
   * Ngày dùng để tính vòng đời rental.
   *
   * Bọc trong `useMemo` để identity ổn định giữa các render — nếu không,
   * `useMemo` bên dưới sẽ tính lại mỗi lần render (cảnh báo
   * `react-hooks/exhaustive-deps`).
   */
  const effectiveCurrentDate = useMemo(
    () => currentDate ?? new Date(),
    [currentDate],
  )

  const trayRental = useMemo(() => (beRental ? rentalToTrayRental(beRental) : null), [beRental])
  const lifecycle = useMemo(
    () => (trayRental ? calculateRentalLifecycle(trayRental, effectiveCurrentDate) : null),
    [trayRental, effectiveCurrentDate],
  )

  const mockDetail = findTrayDetail(tiers, trayId)
  const mockRental = mockDetail?.tray.rental ?? null
  const mockLifecycle = mockRental
    ? calculateRentalLifecycle(mockRental, effectiveCurrentDate)
    : null

  const drawerTitle = useMemo(() => {
    if (apiTray) return `${apiTray.code} · Tầng ${apiTray.tierId}`
    if (mockDetail) return `${mockDetail.tray.code} · ${mockDetail.tier.name}`
    return 'Thông tin vận hành'
  }, [apiTray, mockDetail])

  const isOpen = Boolean(trayId && (apiTray || mockDetail))

  const handleClose = () => {
    setDialogAction(null)
    setInvoiceRequest(null)
    onClose()
  }

  const handleReasonConfirmation = async (values: { reason: string; note: string }) => {
    if (!mockDetail || !mockRental || !mockLifecycle || !dialogAction) return
    await new Promise((resolve) => window.setTimeout(resolve, 350))
    const reason = joinReason(values.reason, values.note)
    if (dialogAction === 'EARLY_HARVEST') {
      setDialogAction(null)
      setInvoiceRequest({ mode: 'EARLY_HARVEST', reason })
      message.success('Đã ghi nhận yêu cầu thu hoạch sớm. Hãy nhập cân nặng thực tế.')
      return
    }
    closeTraySession({ trayId: mockDetail.tray.id, outcome: 'FORCED_CANCEL', reason })
    setDialogAction(null)
    onClose()
    message.success('Đã đóng mẻ, ghi nhận tiêu hủy và giải phóng khay.')
  }

  const handleOpenInvoice = (mode: InvoiceMode, reason: string) => {
    setInvoiceRequest({ mode, reason })
  }

  const handleCompleteInvoice = async (actualHarvestWeightKg: number) => {
    if (!mockDetail || !mockRental || !invoiceRequest) return
    await new Promise((resolve) => window.setTimeout(resolve, 450))
    closeTraySession({
      trayId: mockDetail.tray.id,
      outcome: invoiceRequest.mode,
      reason: invoiceRequest.reason,
      actualHarvestWeightKg,
    })
    setInvoiceRequest(null)
    onClose()
    message.success(`Đã ghi nhận ${actualHarvestWeightKg} kg, hoàn tất bàn giao và giải phóng khay.`)
  }

  // ── Render content ──────────────────────────────────────────────────────
  const renderContent = () => {
    // ── Mock với rental đầy đủ ──────────────────────────────────────────
    if (mockDetail && mockRental && mockLifecycle) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space['4'], padding: tokens.space['4'] }}>
          {/* Context card */}
          <InfoCard
            icon={<ApiOutlined />}
            title="Thông tin khay"
            subtitle={`Tầng: ${mockDetail.tier.name}`}
          >
            <Flex align="center" gap={8} wrap>
              <TrayStatusTag status={mockDetail.tray.status} />
              {mockDetail.tray.batchId && (
                <Tag color="processing">{mockDetail.tray.batchId}</Tag>
              )}
              <Typography.Text style={{ fontSize: 12, color: tokens.color.textMuted }}>
                Node: {mockDetail.tier.nodeId}
              </Typography.Text>
            </Flex>
          </InfoCard>

          {/* Lifecycle */}
          <InfoCard
            icon={<CalendarOutlined />}
            title="Thông tin mẻ & khách hàng"
            subtitle={`Chu kỳ mẻ trồng ${mockDetail.tray.batchId ?? 'chưa định danh'}`}
          >
            <RentalLifecycleSection
              batchId={mockDetail.tray.batchId}
              rental={mockRental}
              lifecycle={mockLifecycle}
            />
          </InfoCard>

          {/* Workflow (thao tác nâng cao — không phải footer) */}
          <TrayStaffActionWorkflow
            rental={mockRental}
            lifecycle={mockLifecycle}
            contactConfirmed={mockRental.customerContactStatus === 'DELIVERY_CONFIRMED'}
            latestCareLog={mockRental.careLogs[0]}
            onContactConfirmed={() => {
              confirmTrayCustomerContact(mockDetail.tray.id)
              message.success('Đã xác nhận hẹn ngày 7 giao với khách hàng.')
            }}
            onEarlyHarvest={() => setDialogAction('EARLY_HARVEST')}
            onHarvest={() => handleOpenInvoice('ON_TIME_HARVEST', 'Thu hoạch đúng hạn theo lịch của mẻ trồng.')}
            onDestroy={() => setDialogAction('FORCED_CANCEL')}
            onSaveLog={(note) => {
              addTrayCareLog(mockDetail.tray.id, note)
              message.success('Đã lưu ghi chú vào nhật ký chăm sóc của mẻ.')
            }}
          />

          {/* Footer CTA */}
          <DrawerFooter
            onLogNote={() => message.info('Dùng nút Ghi chú trong khung Thao tác vận hành.')}
            onEarlyHarvest={() => setDialogAction('EARLY_HARVEST')}
          />
        </div>
      )
    }

    // ── API tray ────────────────────────────────────────────────────────
    if (apiTray) {
      const isLoadingAny = traysLoading || rentalLoading

      if (isLoadingAny) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space['4'], padding: tokens.space['4'] }}>
            <InfoCard icon={<ApiOutlined />} title="Thông tin khay" subtitle={`Tầng ${apiTray.tierId} · ${apiTray.code}`}>
              <Flex align="center" gap={8}>
                <TrayStatusTag status={apiTray.status} />
              </Flex>
            </InfoCard>
            <div style={{ display: 'flex', justifyContent: 'center', padding: tokens.space['7'] }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} />} tip="Đang tải thông tin vụ thuê..." />
            </div>
          </div>
        )
      }

      if (rentalError) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space['4'], padding: tokens.space['4'] }}>
            <InfoCard icon={<ApiOutlined />} title="Thông tin khay" subtitle={`Tầng ${apiTray.tierId} · ${apiTray.code}`}>
              <Flex align="center" gap={8}>
                <TrayStatusTag status={apiTray.status} />
              </Flex>
            </InfoCard>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không thể tải thông tin vụ thuê từ máy chủ." />
          </div>
        )
      }

      // ── Có rental từ BE ─────────────────────────────────────────────
      if (beRental && trayRental && lifecycle) {
        const statusCfg = RENTAL_STATUS_MAP[beRental.status] ?? { tone: 'neutral' as const, label: beRental.status }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space['4'], padding: tokens.space['4'] }}>

            {/* Khay + trạng thái */}
            <InfoCard
              icon={<ApiOutlined />}
              title="Thông tin khay"
              subtitle={`Tầng ${apiTray.tierId} · ${apiTray.code}`}
            >
              <Flex align="center" gap={8} wrap>
                <TrayStatusTag status={apiTray.status} />
                <StatusBadge tone={statusCfg.tone} label={statusCfg.label} />
              </Flex>
            </InfoCard>

            {/* Lifecycle */}
            <InfoCard
              icon={<CalendarOutlined />}
              title="Thông tin mẻ & khách hàng"
              subtitle={`Vụ #${beRental.rental_id}`}
            >
              <RentalLifecycleSection
                batchId={`Vụ #${beRental.rental_id}`}
                rental={trayRental}
                lifecycle={lifecycle}
              />
            </InfoCard>

            {/* Chi tiết vụ thuê từ BE */}
            <InfoCard
              icon={<InfoCircleOutlined />}
              title={`Chi tiết vụ thuê #${beRental.rental_id}`}
              subtitle="Dữ liệu đồng bộ từ hệ thống quản lý"
            >
              <Descriptions
                size="small"
                column={{ xs: 1, sm: 2 }}
                styles={{ label: { fontWeight: 500, color: tokens.color.textMuted } }}
              >
                <Descriptions.Item
                  label={<><UserOutlined /> Khách thuê</>}
                  span={2}
                >
                  <strong>{beRental.customer_name}</strong>
                  {beRental.customer_phone && (
                    <span style={{ marginLeft: 8, color: tokens.color.textMuted }}>
                      · {beRental.customer_phone}
                    </span>
                  )}
                </Descriptions.Item>

                <Descriptions.Item label="Email">
                  {beRental.customer_email}
                </Descriptions.Item>

                <Descriptions.Item label="Loại nấm">
                  <strong>{beRental.mushroom_name}</strong>
                </Descriptions.Item>

                <Descriptions.Item label="Gói thuê">
                  {beRental.package_name}
                </Descriptions.Item>

                <Descriptions.Item label="Thời hạn">
                  {beRental.duration_days} ngày
                  &nbsp;({Math.ceil(beRental.duration_days / 7)} tuần)
                </Descriptions.Item>

                <Descriptions.Item label={<><CalendarOutlined /> Bắt đầu</>}>
                  {fmtDate(beRental.start_date)}
                </Descriptions.Item>

                <Descriptions.Item label="Kết thúc">
                  {fmtDate(beRental.end_date)}
                </Descriptions.Item>

                {beRental.room_name && (
                  <Descriptions.Item label="Phòng" span={2}>
                    {beRental.room_name}
                    {beRental.floor_name && ` · ${beRental.floor_name}`}
                  </Descriptions.Item>
                )}

                <Descriptions.Item label="Thanh toán">
                  <StatusBadge
                    tone={beRental.payment_status === 'PAID' ? 'ok' : 'warning'}
                    label={beRental.payment_status === 'PAID' ? 'Đã thanh toán' : beRental.payment_status}
                  />
                </Descriptions.Item>
              </Descriptions>
            </InfoCard>

            {/* Workflow */}
            <TrayStaffActionWorkflow
              rental={trayRental}
              lifecycle={lifecycle}
              contactConfirmed={false}
              latestCareLog={undefined}
              onContactConfirmed={() => message.info('Tính năng xác nhận liên hệ đang tích hợp với BE.')}
              onEarlyHarvest={() => message.info('Tính năng thu hoạch sớm đang tích hợp với BE.')}
              onHarvest={() => message.info('Tính năng thu hoạch đang tích hợp với BE.')}
              onDestroy={() => message.info('Tính năng tiêu hủy đang tích hợp với BE.')}
              onSaveLog={() => message.info('Tính năng nhật ký đang tích hợp với BE.')}
            />

            {/* Fixed footer */}
            <DrawerFooter
              onLogNote={() => message.info('Tính năng nhật ký đang tích hợp với BE.')}
              onEarlyHarvest={() => message.info('Tính năng thu hoạch sớm đang tích hợp với BE.')}
            />
          </div>
        )
      }

      // ── Không có rental ─────────────────────────────────────────────
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space['4'], padding: tokens.space['4'] }}>
          <InfoCard
            icon={<ApiOutlined />}
            title="Thông tin khay"
            subtitle={`Tầng ${apiTray.tierId} · ${apiTray.code}`}
          >
            <Flex align="center" gap={8}>
              <TrayStatusTag status={apiTray.status} />
            </Flex>
          </InfoCard>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              apiTray.status === 'rented'
                ? 'Khay đang sử dụng nhưng chưa tìm thấy vụ thuê đang hoạt động.'
                : 'Khay chưa có vụ thuê nào đang chạy.'
            }
          />
        </div>
      )
    }

    return null
  }

  return (
    <>
      <Drawer
        rootClassName="tray-detail-drawer"
        title={
          <Flex align="center" gap={8}>
            <span style={{ fontWeight: tokens.typography.weightBold, color: tokens.color.text }}>
              Chi tiết khay nấm
            </span>
            <span
              style={{
                fontSize: 12,
                color: tokens.color.textMuted,
                fontWeight: tokens.typography.weightMedium,
                backgroundColor: tokens.color.surfaceMuted,
                border: `1px solid ${tokens.color.border}`,
                borderRadius: tokens.radius.pill,
                padding: '1px 8px',
              }}
            >
              {drawerTitle}
            </span>
          </Flex>
        }
        size={680}
        open={isOpen}
        onClose={handleClose}
        destroyOnHidden
        styles={{
          body: { padding: 0, backgroundColor: tokens.color.bg },
          header: {
            borderBottom: `1px solid ${tokens.color.border}`,
            backgroundColor: tokens.color.surface,
          },
        }}
      >
        {renderContent()}
      </Drawer>

      {dialogAction && mockDetail && (
        <TrayClosureReasonModal
          key={dialogAction}
          action={dialogAction}
          batchLabel={`${mockDetail.tray.batchId ?? mockDetail.tray.code} · ${mockDetail.tray.code}`}
          onCancel={() => setDialogAction(null)}
          onConfirm={handleReasonConfirmation}
        />
      )}

      {invoiceRequest && mockDetail && mockRental && mockLifecycle && (
        <TrayInvoiceModal
          key={invoiceRequest.mode}
          batchId={mockDetail.tray.batchId ?? mockDetail.tray.code}
          trayId={mockDetail.tray.code}
          rental={mockRental}
          harvestDate={effectiveCurrentDate}
          mode={invoiceRequest.mode}
          reason={invoiceRequest.reason}
          onCancel={() => setInvoiceRequest(null)}
          onComplete={handleCompleteInvoice}
        />
      )}
    </>
  )
}