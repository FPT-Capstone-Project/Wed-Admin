import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExperimentOutlined,
  PlayCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import {
  Button,
  Descriptions,
  Drawer,
  Flex,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd'
import { useState } from 'react'
import { useAuthStore } from '../../auth/store/auth.store'
import { useRental } from '../hooks/useRentals'
import type { Rental } from '../types/rental.types'
import { ApproveRentalModal } from './ApproveRentalModal'
import { CancelRentalModal } from './CancelRentalModal'
import { CompleteRentalModal } from './CompleteRentalModal'
import { RecordHarvestModal } from './RecordHarvestModal'
import { RecordProgressModal } from './RecordProgressModal'
import { RentalStatusTag } from './RentalStatusTag'
import { PAYMENT_STATUS_CONFIG } from './rental-status.config'
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
  | null

/**
 * Drawer chi tiết vụ thuê + các hành động vận hành.
 *
 * Phân quyền — đối chiếu với BE (`/api/rentals/admin/*`):
 *   - Admin (role_id 1): đủ 8 hành động, gồm cả Huỷ.
 *   - Farm Operator (role_id 2): trừ Huỷ (BE trả 403).
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
  const role = useAuthStore((state) => state.user?.role)
  const canCancel = role === 'ADMIN'

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

  return (
    <>
      <Drawer
        title={
          <div>
            <Typography.Text strong>Vụ thuê #{rentalId ?? '—'}</Typography.Text>
            {rental && (
              <div>
                <Space size={4} wrap style={{ marginTop: 4 }}>
                  <RentalStatusTag status={rental.status} />
                  <Tag color={PAYMENT_STATUS_CONFIG[rental.payment_status]?.color}>
                    {PAYMENT_STATUS_CONFIG[rental.payment_status]?.label ??
                      rental.payment_status}
                  </Tag>
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
                  <Button
                    type="primary"
                    icon={<SafetyCertificateOutlined />}
                    onClick={() => setActiveModal('approve')}
                  >
                    Duyệt vụ thuê
                  </Button>
                )}
                {canStart && (
                  <Button
                    icon={<PlayCircleOutlined />}
                    onClick={() => setActiveModal('start')}
                  >
                    Bắt đầu vụ
                  </Button>
                )}
                {isActive && (
                  <Button
                    icon={<ExperimentOutlined />}
                    onClick={() => setActiveModal('progress')}
                  >
                    Ghi nhận tiến độ
                  </Button>
                )}
                {isActive && (
                  <Button
                    icon={<CalendarOutlined />}
                    onClick={() => setActiveModal('harvest')}
                  >
                    Ghi nhận thu hoạch
                  </Button>
                )}
                {isActive && (
                  <Button
                    icon={<CheckCircleOutlined />}
                    onClick={() => setActiveModal('complete')}
                  >
                    Hoàn thành
                  </Button>
                )}
                {canCancelNow && (
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => setActiveModal('cancel')}
                  >
                    Huỷ vụ thuê
                  </Button>
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
    </>
  )
}

// ─── Sub-sections ────────────────────────────────────────────────────────

function RentalSummary({ rental }: { rental: Rental }) {
  return (
    <Descriptions column={2} size="small" bordered>
      <Descriptions.Item label="Khách hàng">
        {rental.customer_name}
      </Descriptions.Item>
      <Descriptions.Item label="Email">
        {rental.customer_email}
      </Descriptions.Item>
      <Descriptions.Item label="SĐT">
        {rental.customer_phone ?? '—'}
      </Descriptions.Item>
      <Descriptions.Item label="Mã đơn">#{rental.order_id}</Descriptions.Item>

      <Descriptions.Item label="Gói thuê">{rental.package_name}</Descriptions.Item>
      <Descriptions.Item label="Loại nấm">
        {rental.mushroom_name}
      </Descriptions.Item>
      <Descriptions.Item label="Thời hạn">
        {rental.duration_days} ngày
      </Descriptions.Item>
      <Descriptions.Item label="Khay">
        {rental.tray_code
          ? `${rental.tray_code}${rental.tray_name ? ` · ${rental.tray_name}` : ''}`
          : 'Chưa gán khay'}
      </Descriptions.Item>
      <Descriptions.Item label="Phòng">
        {rental.room_code ? `${rental.room_name}` : '—'}
      </Descriptions.Item>
      <Descriptions.Item label="Tầng">
        {rental.floor_name ? `${rental.floor_name}` : '—'}
      </Descriptions.Item>
    </Descriptions>
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
    <Descriptions column={3} size="small">
      <Descriptions.Item label="Ngày bắt đầu">
        {formatDate(rental.start_date)}
      </Descriptions.Item>
      <Descriptions.Item label="Ngày kết thúc">
        {formatDate(rental.end_date)}
      </Descriptions.Item>
      <Descriptions.Item label="Ngày tạo">
        {formatDate(rental.created_at)}
      </Descriptions.Item>
    </Descriptions>
  )
}