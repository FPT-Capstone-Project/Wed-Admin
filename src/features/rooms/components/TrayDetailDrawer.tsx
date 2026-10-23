import { ApiOutlined } from '@ant-design/icons'
import { App as AntdApp, Drawer, Empty, Flex, Tag } from 'antd'
import { useState } from 'react'
import { useRoomStore } from '../../../stores/room.store'
import type { Tier } from '../../../types/room.types'
import { useTenantStore } from '../../tenants/store/tenant.store'
import { calculateRentalLifecycle } from '../utils/tray-rental.utils'
import { RentalLifecycleSection } from './RentalLifecycleSection'
import type { ClosureDialogAction } from './TrayClosureReasonModal'
import { TrayClosureReasonModal } from './TrayClosureReasonModal'
import type { InvoiceMode } from './TrayInvoiceModal'
import { TrayInvoiceModal } from './TrayInvoiceModal'
import { TrayStaffActionWorkflow } from './TrayStaffActionWorkflow'
import { TrayStatusTag } from './TrayStatusTag'
import { useAllUiTrays } from '../hooks/useCultivation'

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

  // Vẫn dùng room.store cho các action vận hành (mock cho đến khi có BE endpoints)
  const tiers = useRoomStore((state) => state.tiers)
  const closeTraySession = useRoomStore((state) => state.closeTraySession)
  const confirmTrayCustomerContact = useRoomStore(
    (state) => state.confirmTrayCustomerContact,
  )
  const addTrayCareLog = useRoomStore((state) => state.addTrayCareLog)
  const tenants = useTenantStore((state) => state.tenants)

  // Nếu có API trayId → thử lookup từ API; fallback về mock store
  const { data: apiTrays = [] } = useAllUiTrays()
  const apiTray = trayId
    ? apiTrays.find((t) => t.id === trayId)
    : undefined

  // Ưu tiên tray từ API nếu có, không thì dùng mock
  const detail = findTrayDetail(tiers, trayId)
  const rental = detail?.tray.rental ?? null
  const effectiveCurrentDate = currentDate ?? new Date()
  const lifecycle = rental
    ? calculateRentalLifecycle(rental, effectiveCurrentDate)
    : null
  const customer = detail?.tray.customerId
    ? tenants.find((tenant) => tenant.id === detail.tray.customerId)
    : undefined

  const handleClose = () => {
    setDialogAction(null)
    setInvoiceRequest(null)
    onClose()
  }

  const handleReasonConfirmation = async (values: {
    reason: string
    note: string
  }) => {
    if (!detail || !rental || !lifecycle || !dialogAction) return

    await new Promise((resolve) => window.setTimeout(resolve, 350))
    const reason = joinReason(values.reason, values.note)

    if (dialogAction === 'EARLY_HARVEST') {
      setDialogAction(null)
      setInvoiceRequest({ mode: 'EARLY_HARVEST', reason })
      message.success(
        'Đã ghi nhận yêu cầu thu hoạch sớm. Hãy nhập cân nặng thực tế.',
      )
      return
    }

    closeTraySession({
      trayId: detail.tray.id,
      outcome: 'FORCED_CANCEL',
      reason,
    })
    setDialogAction(null)
    onClose()
    message.success('Đã đóng mẻ, ghi nhận tiêu hủy và giải phóng khay.')
  }

  const handleOpenInvoice = (mode: InvoiceMode, reason: string) => {
    setInvoiceRequest({ mode, reason })
  }

  const handleCompleteInvoice = async (actualHarvestWeightKg: number) => {
    if (!detail || !rental || !invoiceRequest) return

    await new Promise((resolve) => window.setTimeout(resolve, 450))

    closeTraySession({
      trayId: detail.tray.id,
      outcome: invoiceRequest.mode,
      reason: invoiceRequest.reason,
      actualHarvestWeightKg,
    })
    setInvoiceRequest(null)
    onClose()
    message.success(
      `Đã ghi nhận ${actualHarvestWeightKg} kg, hoàn tất bàn giao và giải phóng khay.`,
    )
  }

  return (
    <>
      <Drawer
        rootClassName="tray-detail-drawer"
        title={
          <div className="tray-drawer-title">
            <strong>Chi tiết khay nấm</strong>
            <span>
              {detail
                ? `${detail.tray.code} · ${detail.tier.name}`
                : apiTray
                  ? `${apiTray.code} · Tầng ${apiTray.tierId}`
                  : 'Thông tin vận hành'}
            </span>
          </div>
        }
        size={680}
        open={Boolean(detail || (trayId && apiTray))}
        onClose={handleClose}
        destroyOnHidden
        styles={{ body: { padding: 0 } }}
      >
        {detail ? (
          <div className="tray-detail-content">
            <div className="tray-context-bar">
              <Flex align="center" gap={8} wrap>
                <TrayStatusTag status={detail.tray.status} />
                {detail.tray.batchId && (
                  <Tag color="processing">{detail.tray.batchId}</Tag>
                )}
              </Flex>
              <div className="tray-context-meta">
                <span>
                  <small>Tầng vận hành</small>
                  <strong>{detail.tier.name}</strong>
                </span>
                <span>
                  <small>Node phụ trách</small>
                  <strong>
                    <ApiOutlined aria-hidden="true" /> {detail.tier.nodeId}
                  </strong>
                </span>
              </div>
            </div>

            {rental && lifecycle ? (
              <>
                <RentalLifecycleSection
                  batchId={detail.tray.batchId}
                  rental={rental}
                  lifecycle={lifecycle}
                />
                <TrayStaffActionWorkflow
                  rental={rental}
                  lifecycle={lifecycle}
                  contactConfirmed={
                    rental.customerContactStatus === 'DELIVERY_CONFIRMED'
                  }
                  latestCareLog={rental.careLogs[0]}
                  onContactConfirmed={() => {
                    confirmTrayCustomerContact(detail.tray.id)
                    message.success(
                      'Đã xác nhận hẹn ngày 7 giao với khách hàng.',
                    )
                  }}
                  onEarlyHarvest={() => setDialogAction('EARLY_HARVEST')}
                  onHarvest={() =>
                    handleOpenInvoice(
                      'ON_TIME_HARVEST',
                      'Thu hoạch đúng hạn theo lịch của mẻ trồng.',
                    )
                  }
                  onDestroy={() => setDialogAction('FORCED_CANCEL')}
                  onSaveLog={(note) => {
                    addTrayCareLog(detail.tray.id, note)
                    message.success(
                      'Đã lưu ghi chú vào nhật ký chăm sóc của mẻ.',
                    )
                  }}
                />
              </>
            ) : (
              <section className="tray-detail-section tray-empty-rental">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    customer
                      ? `${customer.name} chưa có chu kỳ thuê / mẻ trồng được cấu hình.`
                      : 'Khay chưa có khách thuê và mẻ trồng.'
                  }
                />
              </section>
            )}
          </div>
        ) : apiTray ? (
          // Tray từ API nhưng chưa có rental trong mock → hiển thị trạng thái cơ bản
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
                description="Khay này chưa có mẻ trồng hoặc dữ liệu mẻ đang được tải từ máy chủ."
              />
            </section>
          </div>
        ) : null}
      </Drawer>

      {dialogAction && detail && (
        <TrayClosureReasonModal
          key={dialogAction}
          action={dialogAction}
          batchLabel={`${detail.tray.batchId ?? detail.tray.code} · ${detail.tray.code}`}
          onCancel={() => setDialogAction(null)}
          onConfirm={handleReasonConfirmation}
        />
      )}

      {invoiceRequest && detail && rental && lifecycle && (
        <TrayInvoiceModal
          key={invoiceRequest.mode}
          batchId={detail.tray.batchId ?? detail.tray.code}
          trayId={detail.tray.code}
          rental={rental}
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

function findTrayDetail(tiers: Tier[], trayId: string | null) {
  if (!trayId) return null
  for (const tier of tiers) {
    const tray = tier.trays.find((item) => item.id === trayId)
    if (tray) {
      return { tier, tray }
    }
  }
  return null
}