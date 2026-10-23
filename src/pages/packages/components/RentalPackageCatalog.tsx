import { useMemo, useState } from 'react'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Empty,
  Flex,
  Input,
  Popconfirm,
  Segmented,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type {
  RentalPackage,
  RentalPackageStatus,
} from '../../../types/rental-package'
import {
  useDeleteRentalPackage,
  useRentalPackages,
  useUpdateRentalPackage,
} from '../../../features/packages/hooks/useRentalPackages'
import { translatePackageName } from '../../../shared/i18n/translate'
import { RentalPackageFormModal } from './RentalPackageFormModal'

const VND = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

type FilterStatus = 'ALL' | RentalPackageStatus

interface RentalPackageCatalogProps {
  canManage: boolean
}

export function RentalPackageCatalog({
  canManage,
}: RentalPackageCatalogProps) {
  const { message: messageApi } = App.useApp()

  const {
    data: packages = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useRentalPackages()

  const updateMutation = useUpdateRentalPackage({
    onSuccess: (updated) => {
      messageApi.success(
        updated.status === 'ACTIVE'
          ? `Đã mở gói "${updated.package_name}".`
          : `Đã tạm ẩn gói "${updated.package_name}".`,
      )
    },
    onError: (err) => messageApi.error(err.message),
  })

  const deleteMutation = useDeleteRentalPackage({
    onSuccess: () => messageApi.success('Đã xóa gói thuê.'),
    onError: (err) => messageApi.error(err.message),
  })

  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPackage, setEditingPackage] =
    useState<RentalPackage | null>(null)

  const filteredPackages = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return packages.filter((pkg) => {
      const matchesSearch = q
        ? pkg.package_name.toLowerCase().includes(q) ||
          (pkg.description ?? '').toLowerCase().includes(q)
        : true
      const matchesStatus =
        statusFilter === 'ALL' || pkg.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [statusFilter, searchText, packages])

  const handleOpenCreate = () => {
    setEditingPackage(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (pkg: RentalPackage) => {
    setEditingPackage(pkg)
    setModalOpen(true)
  }

  const handleDelete = (pkg: RentalPackage) => {
    deleteMutation.mutate(pkg.package_id)
  }

  const handleToggleStatus = (pkg: RentalPackage) => {
    const nextStatus: RentalPackageStatus =
      pkg.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    updateMutation.mutate({
      id: pkg.package_id,
      payload: { status: nextStatus },
    })
  }

  const isToggling = (recordId: number) =>
    updateMutation.isPending &&
    updateMutation.variables?.id === recordId

  const columns: ColumnsType<RentalPackage> = [
    {
      title: 'Tên gói thuê',
      key: 'name',
      width: 320,
      render: (_, record) => (
        <Flex vertical gap={2}>
          <Typography.Text strong>{translatePackageName(record.package_name)}</Typography.Text>
          {record.description && (
            <Typography.Text
              type="secondary"
              style={{ fontSize: 12, maxWidth: 260 }}
              ellipsis={{ tooltip: record.description }}
            >
              {record.description}
            </Typography.Text>
          )}
        </Flex>
      ),
    },
    {
      title: 'Thời lượng',
      key: 'duration_days',
      width: 130,
      render: (_, record) => (
        <Tag color="geekblue" style={{ fontWeight: 500, fontSize: 13 }}>
          {record.duration_days} ngày
        </Tag>
      ),
    },
    {
      title: 'Đơn giá gói',
      key: 'price',
      width: 180,
      align: 'right',
      render: (_, record) => (
        <Tooltip title={`Đơn giá gói = ${VND.format(record.price)}`}>
          <Typography.Text strong style={{ fontSize: 15 }}>
            {VND.format(record.price)}
          </Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 160,
      render: (_, record) => {
        const isActive = record.status === 'ACTIVE'
        return canManage ? (
          <Button
            type="link"
            size="small"
            loading={isToggling(record.package_id)}
            onClick={() => handleToggleStatus(record)}
            style={{
              padding: 0,
              color: isActive ? '#16a34a' : '#9ca3af',
              fontWeight: 500,
            }}
          >
            {isActive ? '● Đang mở bán' : '○ Tạm ẩn'}
          </Button>
        ) : isActive ? (
          <Typography.Text style={{ color: '#16a34a', fontWeight: 500 }}>
            ● Đang mở bán
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">○ Tạm ẩn</Typography.Text>
        )
      },
    },
    ...(canManage
      ? [
          {
            title: 'Hành động',
            key: 'actions',
            width: 160,
            fixed: 'right' as const,
            render: (_: unknown, record: RentalPackage) => (
              <Space size={6}>
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<EditOutlined />}
                  onClick={() => handleOpenEdit(record)}
                >
                  Sửa
                </Button>

                <Popconfirm
                  title="Xóa gói thuê?"
                  description="Thao tác này không thể hoàn tác."
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleDelete(record)}
                >
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label="Xóa gói thuê"
                  />
                </Popconfirm>
              </Space>
            ),
          } as ColumnsType<RentalPackage>[number],
        ]
      : []),
  ]

  return (
    <div>
      <Flex
        align="center"
        justify="space-between"
        gap={16}
        wrap
        style={{ marginBottom: 16 }}
      >
        <Typography.Title level={5} style={{ margin: 0 }}>
          Danh sách gói thuê
        </Typography.Title>

        {canManage && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreate}
          >
            Thêm gói thuê mới
          </Button>
        )}
      </Flex>

      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tìm theo tên gói hoặc mô tả"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 320, maxWidth: '100%' }}
        />
        <Segmented<FilterStatus>
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: 'Tất cả', value: 'ALL' },
            { label: 'Đang mở bán', value: 'ACTIVE' },
            { label: 'Tạm ẩn', value: 'INACTIVE' },
          ]}
        />
        <Button
          size="small"
          onClick={() => {
            void refetch()
          }}
          loading={isLoading}
        >
          Tải lại
        </Button>
      </Flex>

      {isError ? (
        <Empty
          description={
            <Flex vertical align="center" gap={4}>
              <Typography.Text type="danger">
                Không tải được danh sách gói thuê.
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {error?.message ?? 'Lỗi không xác định.'}
              </Typography.Text>
            </Flex>
          }
        />
      ) : filteredPackages.length === 0 && !isLoading ? (
        <Empty description="Chưa có gói thuê nào" />
      ) : (
        <Table<RentalPackage>
          dataSource={filteredPackages}
          columns={columns}
          rowKey="package_id"
          loading={isLoading}
          pagination={false}
          scroll={{ x: 900 }}
          size="middle"
        />
      )}

      <RentalPackageFormModal
        open={modalOpen}
        initialValues={editingPackage}
        onCancel={() => {
          setModalOpen(false)
          setEditingPackage(null)
        }}
      />
    </div>
  )
}
