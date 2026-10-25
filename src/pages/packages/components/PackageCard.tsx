import {
  CheckOutlined,
  EditOutlined,
  StarFilled,
  StarOutlined,
  StopOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import {
  Badge,
  Button,
  Card,
  Divider,
  Flex,
  Popconfirm,
  Space,
  Typography,
} from 'antd'
import type { BillingCycle, PackageStatus, RentalPackage } from '../../../types/package.types'
import type { SemanticTone } from '../../../app/theme/tokens'
import { ActionButton, StatusBadge } from '../../../shared/ui'

interface PackageCardProps {
  rentalPackage: RentalPackage
  canManage: boolean
  onEdit: (rentalPackage: RentalPackage) => void
  onDelete: (rentalPackage: RentalPackage) => void
  onToggleStatus: (rentalPackage: RentalPackage) => void
  onTogglePopular: (rentalPackage: RentalPackage) => void
  onSelect: (rentalPackage: RentalPackage) => void
}

const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  WEEKLY: 'Theo tuần',
  BIWEEKLY: 'Theo 2 tuần',
  MONTHLY: 'Theo tháng',
  CROP_CYCLE: 'Theo vụ mùa',
  QUARTERLY: 'Theo quý',
  YEARLY: 'Theo năm',
}

const STATUS_CONFIG: Record<
  PackageStatus,
  { tone: SemanticTone; label: string }
> = {
  ACTIVE: { tone: 'ok', label: 'Đang nhận đơn' },
  INACTIVE: { tone: 'muted', label: 'Tạm ngưng' },
  PROMOTION: { tone: 'info', label: 'Gói ưu đãi' },
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
  const statusConfig = STATUS_CONFIG[rentalPackage.status]
  const isAvailable = rentalPackage.status !== 'INACTIVE'

  return (
    <Badge.Ribbon
      text={rentalPackage.isPopular ? 'Phổ biến nhất' : rentalPackage.status === 'PROMOTION' ? 'Ưu đãi' : undefined}
      color={rentalPackage.isPopular ? 'var(--mcms-amber)' : 'var(--mcms-blue)'}
      style={{ display: rentalPackage.isPopular || rentalPackage.status === 'PROMOTION' ? undefined : 'none' }}
    >
      <Card
        style={{ height: '100%', borderRadius: 8 }}
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

          <Typography.Title level={2} style={{ margin: '20px 0 4px' }}>
            {VND_FORMATTER.format(rentalPackage.price)}
          </Typography.Title>
          <Typography.Text type="secondary">
            {BILLING_CYCLE_LABELS[rentalPackage.billingCycle]} · {rentalPackage.durationDays} ngày
          </Typography.Text>

          <Divider style={{ margin: '18px 0' }} />

          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Typography.Text>
              Tối đa <strong>{rentalPackage.maxTrays} khay</strong>
            </Typography.Text>
            <Typography.Text type="secondary">
              {rentalPackage.totalSubscribers} khách đang đăng ký
            </Typography.Text>
          </Space>

          <Typography.Text strong style={{ display: 'block', marginTop: 18 }}>
            Giống nấm hỗ trợ
          </Typography.Text>
          <Flex gap={6} wrap style={{ marginTop: 8 }}>
            {rentalPackage.supportedMushrooms.map((mushroom) => (
              <StatusBadge key={mushroom} tone="neutral" label={mushroom} />
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
                  style={{ color: 'var(--mcms-primary)', marginTop: 4 }}
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
                <Popconfirm
                  title={
                    rentalPackage.status === 'INACTIVE'
                      ? 'Kích hoạt gói cước?'
                      : 'Tạm ngưng gói cước?'
                  }
                  description="Thay đổi trạng thái sẽ ảnh hưởng khả năng đăng ký mới."
                  okText="Xác nhận"
                  cancelText="Hủy"
                  onConfirm={() => onToggleStatus(rentalPackage)}
                >
                  <ActionButton
                    icon={<StopOutlined />}
                    label={
                      rentalPackage.status === 'INACTIVE'
                        ? 'Kích hoạt'
                        : 'Tạm ngưng'
                    }
                    description="Thay đổi trạng thái gói cước"
                    size="middle"
                  />
                </Popconfirm>
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
                <Popconfirm
                  title="Xóa gói cước?"
                  description="Thao tác này không thể hoàn tác."
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onDelete(rentalPackage)}
                >
                  <ActionButton
                    icon={<DeleteOutlined />}
                    label="Xóa gói cước"
                    variant="danger"
                    size="middle"
                    hideLabel
                  />
                </Popconfirm>
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
    </Badge.Ribbon>
  )
}
