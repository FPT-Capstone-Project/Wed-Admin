import '../../../styles/catalog-industrial.css'
import {
  CheckOutlined,
  EditOutlined,
  StarFilled,
  StarOutlined,
  StopOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Flex,
  Space,
  Typography,
} from 'antd'
import type { RentalPackage } from '../../../types/package.types'
import {
  BILLING_CYCLE_DICTIONARY,
  PACKAGE_STATUS_DICTIONARY,
} from '../../../shared/i18n/status/package'
import { presentStatus, statusLabel } from '../../../shared/i18n/status/registry'
import { ActionButton, ConfirmActionButton, StatusBadge, MetadataBadge } from '../../../shared/ui'

interface PackageCardProps {
  rentalPackage: RentalPackage
  canManage: boolean
  onEdit: (rentalPackage: RentalPackage) => void
  onDelete: (rentalPackage: RentalPackage) => void
  onToggleStatus: (rentalPackage: RentalPackage) => void
  onTogglePopular: (rentalPackage: RentalPackage) => void
  onSelect: (rentalPackage: RentalPackage) => void
}

const VND_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
})

export function PackageCard({
  rentalPackage,
  canManage,
  onEdit,
  onDelete,
  onToggleStatus,
  onTogglePopular,
  onSelect,
}: PackageCardProps) {
  const statusConfig = presentStatus(
    PACKAGE_STATUS_DICTIONARY,
    rentalPackage.status,
  )
  const isAvailable = rentalPackage.status !== 'INACTIVE'

  return (

      <Card className="mcms-package-card"
        style={{ height: '100%', borderRadius: 6 }}
        styles={{ body: { padding: 20, height: '100%' } }}
      >
        <Flex vertical style={{ height: '100%' }}>
          <Flex align="flex-start" justify="space-between" gap={12}>
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {rentalPackage.name}
              </Typography.Title>
              <Typography.Text type="secondary">{rentalPackage.code}</Typography.Text>
            </div>
            <StatusBadge
              tone={statusConfig.tone}
              label={statusConfig.label}
            />
          </Flex>

          <Flex gap={6} wrap style={{ marginTop: 8 }}>
            {rentalPackage.isPopular && <MetadataBadge label="Phổ biến nhất" />}
            {rentalPackage.status === 'PROMOTION' && <MetadataBadge label="Ưu đãi" />}
          </Flex>
          <dl className="mcms-package-specs">
            <dt>Giá cước</dt><dd>{VND_FORMATTER.format(rentalPackage.price)}</dd>
            <dt>Chu kỳ</dt><dd>{statusLabel(BILLING_CYCLE_DICTIONARY, rentalPackage.billingCycle)}</dd>
            <dt>Thời hạn</dt><dd>{rentalPackage.durationDays} ngày</dd>
            <dt>Số khay tối đa</dt><dd>{rentalPackage.maxTrays}</dd>
            <dt>Khách đăng ký</dt><dd>{rentalPackage.totalSubscribers}</dd>
          </dl>

          <Typography.Text strong style={{ display: 'block', marginTop: 18 }}>
            Giống nấm hỗ trợ
          </Typography.Text>
          <Flex gap={6} wrap style={{ marginTop: 8 }}>
            {rentalPackage.supportedMushrooms.map((mushroom) => (
              <MetadataBadge key={mushroom} label={mushroom} />
            ))}
          </Flex>

          <Typography.Text strong style={{ display: 'block', marginTop: 18 }}>
            Dịch vụ đi kèm
          </Typography.Text>
          <Space direction="vertical" size={6} style={{ marginTop: 8 }}>
            {rentalPackage.features.length > 0 ? (
              rentalPackage.features.map((feature) => (
                <Flex key={feature} align="flex-start" gap={8}>
                  <CheckOutlined
                  style={{ color: 'var(--mcms-text-muted)', marginTop: 4 }}
                />
                  <Typography.Text>{feature}</Typography.Text>
                </Flex>
              ))
            ) : (
              <Flex align="flex-start" gap={8}>
                <StopOutlined
                  style={{ color: 'var(--mcms-text-muted)', marginTop: 4 }}
                />
                <Typography.Text type="secondary">Không có tiện ích bổ sung</Typography.Text>
              </Flex>
            )}
          </Space>

          {rentalPackage.deliveryPolicy && (
            <>
              <Typography.Text strong style={{ display: 'block', marginTop: 18 }}>
                Chính sách giao nhận
              </Typography.Text>
              <Typography.Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 13 }}>
                {rentalPackage.deliveryPolicy}
              </Typography.Text>
            </>
          )}

          <Flex gap={8} wrap style={{ marginTop: 'auto', paddingTop: 20 }}>
            {canManage ? (
              <>
                <ActionButton
                  icon={<EditOutlined />}
                  label="Sửa"
                  description={`Sửa gói ${rentalPackage.name}`}
                  size="middle"
                  onClick={() => onEdit(rentalPackage)}
                />
                <ConfirmActionButton
                  icon={<StopOutlined />}
                  label={
                    rentalPackage.status === 'INACTIVE'
                      ? 'Kích hoạt'
                      : 'Tạm ngưng'
                  }
                  description="Thay đổi trạng thái gói cước"
                  size="middle"
                  title={
                    rentalPackage.status === 'INACTIVE'
                      ? 'Kích hoạt gói cước?'
                      : 'Tạm ngưng gói cước?'
                  }
                  content="Thay đổi trạng thái sẽ ảnh hưởng khả năng đăng ký mới."
                  okText="Xác nhận"
                  cancelText="Hủy"
                  onConfirm={() => onToggleStatus(rentalPackage)}
                />
                <ActionButton
                  icon={
                    rentalPackage.isPopular ? <StarFilled /> : <StarOutlined />
                  }
                  label={
                    rentalPackage.isPopular ? 'Gỡ nổi bật' : 'Đánh dấu nổi bật'
                  }
                  size="middle"
                  hideLabel
                  onClick={() => onTogglePopular(rentalPackage)}
                />
                <ConfirmActionButton
                  icon={<DeleteOutlined />}
                  label="Xóa gói cước"
                  variant="danger"
                  size="middle"
                  hideLabel
                  title="Xóa gói cước?"
                  content={`Thao tác này không thể hoàn tác. Bạn có chắc muốn xóa gói "${rentalPackage.name}"?`}
                  okText="Xóa"
                  cancelText="Hủy"
                  onConfirm={() => onDelete(rentalPackage)}
                />
              </>
            ) : (
              <Button
                type="primary"
                block
                disabled={!isAvailable}
                onClick={() => onSelect(rentalPackage)}
              >
                {isAvailable ? 'Chọn gói này' : 'Tạm ngưng đăng ký'}
              </Button>
            )}
          </Flex>
        </Flex>
      </Card>

  )
}
