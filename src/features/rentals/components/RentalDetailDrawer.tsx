import '../rentals-industrial.css'
import { StatusBadge, ActionButton, MetadataBadge } from '../../../shared/ui'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExperimentOutlined,
  MessageOutlined,
  PlayCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import {
  Descriptions,
  Drawer,
  Flex,
  Skeleton,
  Space,
  Typography,
} from 'antd'
import { useState } from 'react'
import { RENTAL_CANCEL, RENTAL_MANAGE } from '../../auth/permissions'
import { useHasPermission } from '../../auth/hooks/usePermission'
import { useRental } from '../hooks/useRentals'
import type { Rental } from '../types/rental.types'
import { ApproveRentalModal } from './ApproveRentalModal'
import { CancelRentalModal } from './CancelRentalModal'
import { CompleteRentalModal } from './CompleteRentalModal'
import { RecordHarvestModal } from './RecordHarvestModal'
import { RecordProgressModal } from './RecordProgressModal'
import { RentalStatusTag } from './RentalStatusTag'
import { PAYMENT_STATUS_CONFIG } from './rental-status.config'
import { SendNotificationModal } from './SendNotificationModal'
import { StartSessionModal } from './StartSessionModal'

interface RentalDetailDrawerProps {
  rentalId: number | null
  onClose: () => void
}

type ModalKind =
  | 'approve'
  | 'start'
  | 'progress'
  | 'harvest'
  | 'complete'
  | 'cancel'
  | 'notify'
  | null

/**
 * Drawer chi tiết vụ thuê + các hành động vận hành.
 *
 * Phân quyền — đối chiếu với BE (`/api/rentals/admin/*`):
 *   - `rental.manage` (Admin + Farm Operator): các hành động vận hành.
 *   - `rental.cancel` (chỉ Admin): huỷ vụ thuê — Farm Operator nhận 403.
 *   → `canCancel` chặn ở UI để không gọi vào chỗ chắc chắn bị 403.
 *
 * Lưu ý về trạng thái: BE chỉ cho gọi những hành động nhất định ở từng
 * trạng thái (trả 409 nếu sai), nên UI cũng ẩn nút cho khỏi báo lỗi vô ích:
 *   - `approve`     → CONFIRMED (PATCH chỉ hỗ trợ CONFIRMED → PREPARING)
 *   - `start`       → CONFIRMED | PREPARING
 *   - `progress`    → ACTIVE
 *   - `harvest`     → ACTIVE (và đổi giai đoạn sang HARVEST trước)
 *   - `complete`    → ACTIVE
 *   - `cancel`      → chưa COMPLETED / CANCELLED
 */
export function RentalDetailDrawer({
  rentalId,
  onClose,
}: RentalDetailDrawerProps) {
  const hasCancelPermission = useHasPermission(RENTAL_CANCEL)
  const canManage = useHasPermission(RENTAL_MANAGE)
  const canCancel = hasCancelPermission

  const [activeModal, setActiveModal] = useState<ModalKind>(null)
  const { data: rental, isLoading, isError } = useRental(rentalId)

  const handleClose = () => {
    setActiveModal(null)
    onClose()
  }

  const status = rental?.status
  const canApprove = status === 'CONFIRMED'
  const canStart = status === 'CONFIRMED' || status === 'PREPARING'
  const isActive = status === 'ACTIVE'
  const isClosed = status === 'COMPLETED' || status === 'CANCELLED'
  const canCancelNow = canCancel && rental !== undefined && !isClosed
  /**
   * BE trả 409 `Rental cannot receive notifications` cho rental đã đóng,
   * hoặc khi tài khoản khách không ACTIVE. Chỉ mở nút ở 3 trạng thái này.
   */
  const canNotify = canManage && !isClosed && status !== undefined

  return (
    <>
      <Drawer rootClassName="mcms-rental-drawer"
        title={
          <div>
            <Typography.Text strong>Vụ thuê #{rentalId ?? '—'}</Typography.Text>
            {rental && (
              <div>
                <Space size={4} wrap style={{ marginTop: 4 }}>
                  <RentalStatusTag status={rental.status} />
                  <StatusBadge tone={PAYMENT_STATUS_CONFIG[rental.payment_status]?.tone ?? 'neutral'} label={<>
                    {PAYMENT_STATUS_CONFIG[rental.payment_status]?.label ??
                      rental.payment_status}
                  </>} />
                </Space>
              </div>
            )}
          </div>
        }
        size={720}
        open={rentalId !== null}
        onClose={handleClose}
        destroyOnHidden
      >
        {isLoading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : isError || !rental ? (
          <Flex vertical align="center" gap={12} style={{ padding: 32 }}>
            <Typography.Text type="danger">
              Không tải được chi tiết vụ thuê.
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Có thể vụ thuê không tồn tại hoặc bạn không có quyền xem.
            </Typography.Text>
          </Flex>
        ) : (
          <Flex vertical gap={20}>
            <RentalSummary rental={rental} />
            <RentalTimeline rental={rental} />

            <div>
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                Thao tác
              </Typography.Title>
              <Flex gap={8} wrap>
                {canApprove && (
                  <ActionButton variant="primary" size="middle" label="Duyệt vụ thuê" icon={<SafetyCertificateOutlined />} onClick={() => setActiveModal('approve')} />
                )}
                {canStart && (
                  <ActionButton variant="text" size="middle" label="Bắt đầu vụ" icon={<PlayCircleOutlined />} onClick={() => setActiveModal('start')} />
                )}
                {isActive && (
                  <ActionButton variant="text" size="middle" label="Ghi nhận tiến độ" icon={<ExperimentOutlined />} onClick={() => setActiveModal('progress')} />
                )}
                {isActive && (
                  <ActionButton variant="text" size="middle" label="Ghi nhận thu hoạch" icon={<CalendarOutlined />} onClick={() => setActiveModal('harvest')} />
                )}
                {isActive && (
                  <ActionButton variant="text" size="middle" label="Hoàn thành" icon={<CheckCircleOutlined />} onClick={() => setActiveModal('complete')} />
                )}
                {canNotify && (
                  <ActionButton variant="text" size="middle" label="Gửi thông báo" icon={<MessageOutlined />} onClick={() => setActiveModal('notify')} />
                )}
                {canCancelNow && (
                  <ActionButton variant="dangerText" size="middle" label="Huỷ vụ thuê" icon={<CloseCircleOutlined />} onClick={() => setActiveModal('cancel')} />
                )}
                {isClosed && (
                  <Typography.Text type="secondary">
                    Vụ thuê đã đóng, không còn thao tác vận hành.
                  </Typography.Text>
                )}
              </Flex>

              {!canCancel && !isClosed && (
                <Typography.Text
                  type="secondary"
                  style={{ display: 'block', marginTop: 8, fontSize: 12 }}
                >
                  Huỷ vụ thuê chỉ dành cho Quản trị viên.
                </Typography.Text>
              )}
            </div>
          </Flex>
        )}
      </Drawer>

      {rentalId !== null && rental && activeModal === 'approve' && canApprove && (
        <ApproveRentalModal
          rental={rental}
          open
          onClose={() => setActiveModal(null)}
        />
      )}
      {rentalId !== null && activeModal === 'start' && (
        <StartSessionModal
          rentalId={rentalId}
          open
          onClose={() => setActiveModal(null)}
        />
      )}
      {rentalId !== null && activeModal === 'progress' && (
        <RecordProgressModal
          rentalId={rentalId}
          open
          onClose={() => setActiveModal(null)}
        />
      )}
      {rentalId !== null && activeModal === 'harvest' && (
        <RecordHarvestModal
          rentalId={rentalId}
          open
          onClose={() => setActiveModal(null)}
        />
      )}
      {rentalId !== null && activeModal === 'complete' && (
        <CompleteRentalModal
          rentalId={rentalId}
          open
          onClose={() => setActiveModal(null)}
        />
      )}
      {rentalId !== null && activeModal === 'cancel' && canCancel && (
        <CancelRentalModal
          rentalId={rentalId}
          open
          onClose={() => setActiveModal(null)}
        />
      )}
      {rentalId !== null && rental && activeModal === 'notify' && (
        <SendNotificationModal
          rentalId={rentalId}
          customerName={rental.customer_name}
          open
          onClose={() => setActiveModal(null)}
        />
      )}
    </>
  )
}

// ─── Sub-sections ────────────────────────────────────────────────────────

function RentalSummary({ rental }: { rental: Rental }) {
  return (
    <Flex vertical gap={16}>
    <Descriptions title="Khách hàng" column={{ xs: 1, sm: 2 }} size="small" bordered>
      <Descriptions.Item label="Khách hàng">
        {rental.customer_name}
      </Descriptions.Item>
      <Descriptions.Item label="Email">
        {rental.customer_email}
      </Descriptions.Item>
      <Descriptions.Item label="SĐT">
        {rental.customer_phone ?? '—'}
      </Descriptions.Item>
      <Descriptions.Item label="Mã đơn"><MetadataBadge className="mcms-rental-mono" label={`#${rental.order_id}`} /></Descriptions.Item>
    </Descriptions>
    <Descriptions title="Vụ nấm" column={{ xs: 1, sm: 2 }} size="small" bordered>
      <Descriptions.Item label="Gói thuê">{rental.package_name}</Descriptions.Item>
      <Descriptions.Item label="Loại nấm">
        {rental.mushroom_name}
      </Descriptions.Item>
      <Descriptions.Item label="Thời hạn">
        <MetadataBadge label={`${rental.duration_days} ngày`} />
      </Descriptions.Item>
    </Descriptions>
    <Descriptions title="Khay gán" column={{ xs: 1, sm: 2 }} size="small" bordered>
      <Descriptions.Item label="Khay">
        <MetadataBadge className="mcms-rental-mono" label={rental.tray_code
          ? `${rental.tray_code}${rental.tray_name ? ` · ${rental.tray_name}` : ''}`
          : 'Chưa gán khay'} />
      </Descriptions.Item>
      <Descriptions.Item label="Phòng">
        {rental.room_code ? `${rental.room_name}` : '—'}
      </Descriptions.Item>
      <Descriptions.Item label="Tầng">
        {rental.floor_name ? `${rental.floor_name}` : '—'}
      </Descriptions.Item>
    </Descriptions>
    <Descriptions title="Chi phí / thanh toán" column={1} size="small" bordered>
      <Descriptions.Item label="Thanh toán">
        <StatusBadge
          tone={PAYMENT_STATUS_CONFIG[rental.payment_status]?.tone ?? 'neutral'}
          label={PAYMENT_STATUS_CONFIG[rental.payment_status]?.label ?? rental.payment_status}
        />
      </Descriptions.Item>
      <Descriptions.Item label="Chi phí">
        <Typography.Text type="secondary">
          Xem số tiền tại đơn hàng #{rental.order_id}.
        </Typography.Text>
      </Descriptions.Item>
    </Descriptions>
    </Flex>
  )
}

function RentalTimeline({ rental }: { rental: Rental }) {
  const formatDate = (value: string | null) =>
    value
      ? new Date(value).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '—'

  return (
    <Descriptions title="Mốc thời gian" column={{ xs: 1, sm: 3 }} size="small">
      <Descriptions.Item label="Ngày bắt đầu">
        <MetadataBadge className="mcms-rental-mono" label={formatDate(rental.start_date)} />
      </Descriptions.Item>
      <Descriptions.Item label="Ngày kết thúc">
        <MetadataBadge className="mcms-rental-mono" label={formatDate(rental.end_date)} />
      </Descriptions.Item>
      <Descriptions.Item label="Ngày tạo">
        <MetadataBadge className="mcms-rental-mono" label={formatDate(rental.created_at)} />
      </Descriptions.Item>
    </Descriptions>
  )
}
