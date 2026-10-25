import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons'
import {
  Button,
  Flex,
  Popconfirm,
  Space,
  Table,
  Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import type {
  BillingCycle,
  PackageStatus,
  RentalPackage,
} from '../../../types/package.types'
import type { SemanticTone } from '../../../app/theme/tokens'
import { ActionButton, StatusBadge } from '../../../shared/ui'

interface PackageComparisonTableProps {
  packages: RentalPackage[]
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

export function PackageComparisonTable({
  packages,
  canManage,
  onEdit,
  onDelete,
  onToggleStatus,
  onTogglePopular,
  onSelect,
}: PackageComparisonTableProps) {
  const columns: TableColumnsType<RentalPackage> = [
    {
      title: 'Gói cước',
      key: 'package',
      fixed: 'left',
      width: 220,
      render: (_, rentalPackage) => (
        <Flex vertical gap={2}>
          <Typography.Text strong>{rentalPackage.name}</Typography.Text>
          <Typography.Text type="secondary">{rentalPackage.code}</Typography.Text>
          {rentalPackage.isPopular && (
            <StatusBadge tone="warning" label="Phổ biến nhất" />
          )}
        </Flex>
      ),
    },
    {
      title: 'Giá cước',
      dataIndex: 'price',
      key: 'price',
      width: 150,
      render: (price: number) => (
        <Typography.Text strong>{VND_FORMATTER.format(price)}</Typography.Text>
      ),
    },
    {
      title: 'Chu kỳ',
      dataIndex: 'billingCycle',
      key: 'billingCycle',
      width: 130,
      render: (cycle: BillingCycle) => BILLING_CYCLE_LABELS[cycle],
    },
    {
      title: 'Thời hạn',
      dataIndex: 'durationDays',
      key: 'durationDays',
      width: 120,
      render: (duration: number) => (
        <StatusBadge
          tone="info"
          label={`${duration} ngày`}
          title="Thời lượng gói thuê"
        />
      ),
    },
    {
      title: 'Số khay tối đa',
      dataIndex: 'maxTrays',
      key: 'maxTrays',
      width: 120,
      render: (maxTrays: number) => `${maxTrays} khay`,
    },
    {
      title: 'Giống nấm hỗ trợ',
      dataIndex: 'supportedMushrooms',
      key: 'supportedMushrooms',
      width: 250,
      render: (mushrooms: string[]) => (
        <Flex gap={4} wrap>
          {mushrooms.length > 0 ? (
            mushrooms.map((mushroom) => (
              <StatusBadge key={mushroom} tone="neutral" label={mushroom} />
            ))
          ) : (
            <Flex align="center" gap={4}>
              <CloseCircleOutlined style={{ color: 'var(--mcms-text-muted)' }} />
              <Typography.Text type="secondary">Không hỗ trợ</Typography.Text>
            </Flex>
          )}
        </Flex>
      ),
    },
    {
      title: 'Dịch vụ đi kèm',
      dataIndex: 'features',
      key: 'features',
      width: 280,
      render: (features: string[]) => (
        <Space direction="vertical" size={4}>
          {features.length > 0 ? (
            features.map((feature) => (
              <Flex key={feature} align="flex-start" gap={6}>
                <CheckCircleOutlined
                  style={{ color: 'var(--mcms-primary)', marginTop: 3 }}
                />
                <Typography.Text>{feature}</Typography.Text>
              </Flex>
            ))
          ) : (
            <Flex align="center" gap={6}>
              <CloseCircleOutlined
                style={{ color: 'var(--mcms-text-muted)' }}
              />
              <Typography.Text type="secondary">Không có</Typography.Text>
            </Flex>
          )}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: PackageStatus) => {
        const config = STATUS_CONFIG[status]

        return <StatusBadge tone={config.tone} label={config.label} />
      },
    },
    {
      title: 'Đăng ký',
      dataIndex: 'totalSubscribers',
      key: 'totalSubscribers',
      width: 100,
      render: (total: number) => `${total} khách`,
    },
    {
      title: 'Hành động',
      key: 'actions',
      fixed: 'right',
      width: canManage ? 190 : 130,
      align: 'right',
      render: (_, rentalPackage) =>
        canManage ? (
          <Space size={2}>
            <ActionButton
              icon={<EditOutlined />}
              label={`Sửa ${rentalPackage.name}`}
              variant="text"
              hideLabel
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
                icon={
                  rentalPackage.status === 'INACTIVE' ? (
                    <PlayCircleOutlined />
                  ) : (
                    <PauseCircleOutlined />
                  )
                }
                label={
                  rentalPackage.status === 'INACTIVE'
                    ? 'Kích hoạt'
                    : 'Tạm ngưng'
                }
                description="Thay đổi trạng thái gói cước"
                variant="text"
                hideLabel
              />
            </Popconfirm>

            <ActionButton
              icon={
                rentalPackage.isPopular ? <StarFilled /> : <StarOutlined />
              }
              label={
                rentalPackage.isPopular ? 'Gỡ nổi bật' : 'Đánh dấu nổi bật'
              }
              variant="text"
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
                label={`Xóa ${rentalPackage.name}`}
                variant="text"
                hideLabel
              />
            </Popconfirm>
          </Space>
        ) : (
          <Button
            type="primary"
            size="small"
            disabled={rentalPackage.status === 'INACTIVE'}
            onClick={() => onSelect(rentalPackage)}
          >
            Chọn gói
          </Button>
        ),
    },
  ]

  return (
    <Table<RentalPackage>
      rowKey="id"
      columns={columns}
      dataSource={packages}
      pagination={false}
      scroll={{ x: 1700 }}
    />
  )
}
