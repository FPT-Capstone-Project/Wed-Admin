import '../../../styles/catalog-industrial.css'
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
  Space,
  Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import type {
  BillingCycle,
  PackageStatus,
  RentalPackage,
} from '../../../types/package.types'
import {
  BILLING_CYCLE_DICTIONARY,
  PACKAGE_STATUS_DICTIONARY,
} from '../../../shared/i18n/status/package'
import { presentStatus, statusLabel } from '../../../shared/i18n/status/registry'
import {
  ActionButton,
  ConfirmActionButton,
  StatusBadge,
  MetadataBadge,
  DataTable,
} from '../../../shared/ui'

interface PackageComparisonTableProps {
  packages: RentalPackage[]
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
      width: 150,
      render: (_, rentalPackage) => (
        <Flex vertical gap={2} style={{ minWidth: 0 }}>
          <Typography.Text strong ellipsis={{ tooltip: rentalPackage.name }}>
            {rentalPackage.name}
          </Typography.Text>
          <Typography.Text type="secondary" ellipsis={{ tooltip: rentalPackage.code }}>
            {rentalPackage.code}
          </Typography.Text>
          {rentalPackage.isPopular && (
            <MetadataBadge label="Phổ biến nhất" />
          )}
        </Flex>
      ),
    },
    {
      title: 'Giá cước',
      dataIndex: 'price',
      key: 'price',
      width: 115,
      render: (price: number) => (
        <Typography.Text strong>{VND_FORMATTER.format(price)}</Typography.Text>
      ),
    },
    {
      title: 'Chu kỳ',
      dataIndex: 'billingCycle',
      key: 'billingCycle',
      width: 90,
      render: (cycle: BillingCycle) =>
        statusLabel(BILLING_CYCLE_DICTIONARY, cycle),
    },
    {
      title: 'Thời hạn',
      dataIndex: 'durationDays',
      key: 'durationDays',
      width: 90,
      render: (duration: number) => (
        <MetadataBadge label={`${duration} ngày`} title="Thời lượng gói thuê" />
      ),
    },
    {
      title: 'Số khay tối đa',
      dataIndex: 'maxTrays',
      key: 'maxTrays',
      width: 95,
      render: (maxTrays: number) => `${maxTrays} khay`,
    },
    {
      title: 'Giống nấm hỗ trợ',
      dataIndex: 'supportedMushrooms',
      key: 'supportedMushrooms',
      width: 105,
      render: (mushrooms: string[]) => (
        <Flex gap={4} wrap style={{ maxHeight: 44, overflow: 'hidden' }}>
          {mushrooms.length > 0 ? (
            mushrooms.map((mushroom) => (
              <MetadataBadge key={mushroom} label={mushroom} />
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
      width: 115,
      render: (features: string[]) => (
        <Space direction="vertical" size={4} style={{ maxHeight: 44, overflow: 'hidden' }}>
          {features.length > 0 ? (
            features.map((feature) => (
              <Flex key={feature} align="flex-start" gap={6}>
                <CheckCircleOutlined
                  style={{ color: 'var(--mcms-text-muted)', marginTop: 3 }}
                />
                <Typography.Text ellipsis>{feature}</Typography.Text>
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
      width: 120,
      render: (status: PackageStatus) => (
        <StatusBadge
          {...presentStatus(PACKAGE_STATUS_DICTIONARY, status)}
          style={{ whiteSpace: 'nowrap' }}
        />
      ),
    },
    {
      title: 'Đăng ký',
      dataIndex: 'totalSubscribers',
      key: 'totalSubscribers',
      width: 85,
      render: (total: number) => `${total} khách`,
    },
    {
      title: 'Hành động',
      key: 'actions',
      fixed: 'right',
      width: canManage ? 130 : 80,
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

            <ConfirmActionButton
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
              variant="text"
              hideLabel
              onClick={() => onTogglePopular(rentalPackage)}
            />

            <ConfirmActionButton
              icon={<DeleteOutlined />}
              label={`Xóa ${rentalPackage.name}`}
              variant="text"
              hideLabel
              title="Xóa gói cước?"
              content={`Thao tác này không thể hoàn tác. Bạn có chắc muốn xóa gói "${rentalPackage.name}"?`}
              okText="Xóa"
              cancelText="Hủy"
              onConfirm={() => onDelete(rentalPackage)}
            />
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
    <DataTable<RentalPackage>
      rowKey="id"
      columns={columns}
      dataSource={packages}
      pagination={false}
      scrollX={1085}
      tableLayout="fixed"
    />
  )
}
