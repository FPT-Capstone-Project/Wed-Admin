import {
  ApiOutlined,
  LoadingOutlined,
  UserOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import {
  App as AntdApp,
  Drawer,
  Empty,
  Flex,
  Tag,
  Spin,
  Typography,
  Descriptions,
} from 'antd'
import { useMemo, useState } from 'react'
import type { Tier } from '../../../types/room.types'
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
import { useTenantStore } from '../../tenants/store/tenant.store'

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

/** Tìm tray trong mock tiers (fallback khi API chưa trả). */
function findTrayDetail(tiers: Tier[], trayId: string | null) {
  if (!trayId) return null
  for (const tier of tiers) {
    const tray = tier.trays.find((item) => item.id === trayId)
    if (tray) return { tier, tray }
  }
  return null
}

/** Format ngày giờ ISO sang tiếng Việt. */
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

/** Badge màu cho RentalStatus */
const RENTAL_STATUS_MAP: Record<string, { color: string; label: string }> = {
  CONFIRMED: { color: 'default', label: 'Chờ xác nhận' },
  PREPARING: { color: 'processing', label: 'Đang chuẩn bị' },
  ACTIVE: { color: 'success', label: 'Đang canh tác' },
  COMPLETED: { color: 'cyan', label: 'Đã hoàn tất' },
  CANCELLED: { color: 'error', label: 'Đã huỷ' },
}

export function TrayDetailDrawer({
  trayId,
  onClose,
  currentDate,
}: TrayDetailDrawerProps) {
  const { message } = AntdApp.useApp()
  const [dialogAction, setDialogAction] =
    useState<ClosureDialogAction | null>(null)
  const [invoiceRequest, setInvoiceRequest] =
    useState<InvoiceRequest | null>(null)

  // ── Mock store (giữ lại cho fallback / action vận hành cũ) ───────────
  const tiers = useRoomStore((state) => state.tiers)
  const closeTraySession = useRoomStore((state) => state.closeTraySession)
  const confirmTrayCustomerContact = useRoomStore(
    (state) => state.confirmTrayCustomerContact,
  )
  const addTrayCareLog = useRoomStore((state) => state.addTrayCareLog)
  const tenants = useTenantStore((state) => state.tenants)

  // ── Lookup tray từ API list ──────────────────────────────────────────
  const { data: apiTrays = [], isLoading: traysLoading } = useAllUiTrays()

  const apiTray = useMemo(
    () => (trayId ? apiTrays.find((t) => t.id === trayId) : undefined),
    [apiTrays, trayId],
  )

  // tray_id numeric cần thiết cho API rental
  // apiTray.id là string (vd "3") — parse sang number
  const trayNumericId = useMemo(() => {
    const parsed = Number(trayId)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }, [trayId])

  // ── Fetch rental thật từ BE theo tray_id ────────────────────────────
  const {
    data: beRental,
    isLoading: rentalLoading,
    isError: rentalError,
  } = useRentalByTray(trayNumericId, {
    enabled: trayNumericId !== null,
  })

  // ── Tính TrayRental + lifecycle từ dữ liệu BE ───────────────────────
  const effectiveCurrentDate = currentDate ?? new Date()

  const trayRental = useMemo(
    () => (beRental ? rentalToTrayRental(beRental) : null),
    [beRental],
  )

  const lifecycle = useMemo(
    () =>
      trayRental ? calculateRentalLifecycle(trayRental, effectiveCurrentDate) : null,
    [trayRental, effectiveCurrentDate],
  )

  // ── Fallback mock (chỉ khi API không trả rental) ────────────────────
  const mockDetail = findTrayDetail(tiers, trayId)
  const mockRental = mockDetail?.tray.rental ?? null
  const mockLifecycle = mockRental
    ? calculateRentalLifecycle(mockRental, effectiveCurrentDate)
    : null
  // tenants available cho future: tìm khách theo customerId
  void tenants

  // ── Drawer title ────────────────────────────────────────────────────
  const drawerTitle = useMemo(() => {
    if (apiTray)
      return `${apiTray.code} · Tầng ${apiTray.tierId}`
    if (mockDetail)
      return `${mockDetail.tray.code} · ${mockDetail.tier.name}`
    return 'Thông tin vận hành'
  }, [apiTray, mockDetail])

  const isOpen = Boolean(trayId && (apiTray || mockDetail))

  // ── Handlers (vẫn dùng mock store cho vận hành cũ) ──────────────────
  const handleClose = () => {
    setDialogAction(null)
    setInvoiceRequest(null)
    onClose()
  }

  const handleReasonConfirmation = async (values: {
    reason: string
    note: string
  }) => {
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

  // ── Nội dung chính của drawer ────────────────────────────────────────
  const renderContent = () => {
    // Ưu tiên: mock detail có rental → flow cũ giữ nguyên
    if (mockDetail && mockRental && mockLifecycle) {
      return (
        <div className="tray-detail-content">
          <div className="tray-context-bar">
            <Flex align="center" gap={8} wrap>
              <TrayStatusTag status={mockDetail.tray.status} />
              {mockDetail.tray.batchId && (
                <Tag color="processing">{mockDetail.tray.batchId}</Tag>
              )}
            </Flex>
            <div className="tray-context-meta">
              <span>
                <small>Tầng vận hành</small>
                <strong>{mockDetail.tier.name}</strong>
              </span>
              <span>
                <small>Node phụ trách</small>
                <strong>
                  <ApiOutlined aria-hidden="true" /> {mockDetail.tier.nodeId}
                </strong>
              </span>
            </div>
          </div>

          <RentalLifecycleSection
            batchId={mockDetail.tray.batchId}
            rental={mockRental}
            lifecycle={mockLifecycle}
          />
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
        </div>
      )
    }

    // Trường hợp API tray có rental từ BE
    if (apiTray) {
      const isLoadingAny = traysLoading || rentalLoading

      if (isLoadingAny) {
        return (
          <div className="tray-detail-content">
            <div className="tray-context-bar">
              <Flex align="center" gap={8}>
                <TrayStatusTag status={apiTray.status} />
              </Flex>
              <div className="tray-context-meta">
                <span>
                  <small>Tầng</small>
                  <strong>Tầng {apiTray.tierId}</strong>
                </span>
                <span>
                  <small>Mã khay</small>
                  <strong>{apiTray.code}</strong>
                </span>
              </div>
            </div>
            <section className="tray-detail-section tray-empty-rental">
              <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} />} tip="Đang tải thông tin vụ thuê..." />
            </section>
          </div>
        )
      }

      if (rentalError) {
        return (
          <div className="tray-detail-content">
            <div className="tray-context-bar">
              <Flex align="center" gap={8}>
                <TrayStatusTag status={apiTray.status} />
              </Flex>
            </div>
            <section className="tray-detail-section tray-empty-rental">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Không thể tải thông tin vụ thuê từ máy chủ."
              />
            </section>
          </div>
        )
      }

      // Có rental từ BE → hiển thị đầy đủ
      if (beRental && trayRental && lifecycle) {
        const statusCfg = RENTAL_STATUS_MAP[beRental.status] ?? {
          color: 'default',
          label: beRental.status,
        }

        return (
          <div className="tray-detail-content">
            {/* Context bar */}
            <div className="tray-context-bar">
              <Flex align="center" gap={8} wrap>
                <TrayStatusTag status={apiTray.status} />
                <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
              </Flex>
              <div className="tray-context-meta">
                <span>
                  <small>Tầng</small>
                  <strong>Tầng {apiTray.tierId}</strong>
                </span>
                <span>
                  <small>Mã khay</small>
                  <strong>{apiTray.code}</strong>
                </span>
              </div>
            </div>

            {/* Thông tin vụ thuê từ BE */}
            <RentalLifecycleSection
              batchId={`Vụ #${beRental.rental_id}`}
              rental={trayRental}
              lifecycle={lifecycle}
            />

            {/* Chi tiết bổ sung từ BE */}
            <section className="tray-detail-section" style={{ padding: '16px 20px' }}>
              <div className="tray-section-heading" style={{ marginBottom: 12 }}>
                <span className="tray-section-icon" aria-hidden="true">
                  <InfoCircleOutlined />
                </span>
                <div>
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    Chi tiết vụ thuê #{beRental.rental_id}
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    Dữ liệu đồng bộ từ hệ thống quản lý
                  </Typography.Text>
                </div>
              </div>

              <Descriptions
                size="small"
                column={{ xs: 1, sm: 2 }}
                styles={{ label: { fontWeight: 500 } }}
              >
                <Descriptions.Item
                  label={<><UserOutlined /> Khách thuê</>}
                  span={2}
                >
                  <strong>{beRental.customer_name}</strong>
                  {beRental.customer_phone && (
                    <span style={{ marginLeft: 8, color: '#888' }}>
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
                  ({Math.ceil(beRental.duration_days / 7)} tuần)
                </Descriptions.Item>

                <Descriptions.Item
                  label={<><CalendarOutlined /> Bắt đầu</>}
                >
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

                <Descriptions.Item label="Trạng thái thanh toán">
                  <Tag color={beRental.payment_status === 'PAID' ? 'success' : 'warning'}>
                    {beRental.payment_status === 'PAID' ? 'Đã thanh toán' : beRental.payment_status}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </section>

            {/* Workflow vận hành — dùng trayRental đã map từ BE */}
            <TrayStaffActionWorkflow
              rental={trayRental}
              lifecycle={lifecycle}
              contactConfirmed={false}
              latestCareLog={undefined}
              onContactConfirmed={() =>
                message.info('Tính năng xác nhận liên hệ đang tích hợp với BE.')
              }
              onEarlyHarvest={() =>
                message.info('Tính năng thu hoạch sớm đang tích hợp với BE.')
              }
              onHarvest={() =>
                message.info('Tính năng thu hoạch đang tích hợp với BE.')
              }
              onDestroy={() =>
                message.info('Tính năng tiêu hủy đang tích hợp với BE.')
              }
              onSaveLog={() =>
                message.info('Tính năng nhật ký đang tích hợp với BE.')
              }
            />
          </div>
        )
      }

      // Tray OCCUPIED nhưng không tìm thấy rental active
      return (
        <div className="tray-detail-content">
          <div className="tray-context-bar">
            <Flex align="center" gap={8} wrap>
              <TrayStatusTag status={apiTray.status} />
            </Flex>
            <div className="tray-context-meta">
              <span>
                <small>Tầng</small>
                <strong>Tầng {apiTray.tierId}</strong>
              </span>
              <span>
                <small>Mã khay</small>
                <strong>{apiTray.code}</strong>
              </span>
            </div>
          </div>
          <section className="tray-detail-section tray-empty-rental">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                apiTray.status === 'rented'
                  ? 'Khay đang sử dụng nhưng chưa tìm thấy vụ thuê đang hoạt động.'
                  : 'Khay chưa có vụ thuê nào đang chạy.'
              }
            />
          </section>
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
          <div className="tray-drawer-title">
            <strong>Chi tiết khay nấm</strong>
            <span>{drawerTitle}</span>
          </div>
        }
        size={680}
        open={isOpen}
        onClose={handleClose}
        destroyOnHidden
        styles={{ body: { padding: 0 } }}
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