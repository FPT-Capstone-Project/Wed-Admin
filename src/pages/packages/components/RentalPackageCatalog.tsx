import '../../../styles/catalog-industrial.css'
import { useMemo, useState } from 'react'
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PauseCircleOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Empty,
  Flex,
  Input,
  Segmented,
  Space,
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
import {
  ActionButton,
  StatusBadge,
  MetadataBadge,
  DataTable,
  ConfirmActionButton,
} from '../../../shared/ui'
import { RentalPackageFormModal } from './RentalPackageFormModal'
import {
  isRentalPackageInUseError,
  RENTAL_PACKAGE_IN_USE_MESSAGE,
} from '../../../features/packages/hooks/useRentalPackages'

const VND = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

type FilterStatus = 'ALL' | RentalPackageStatus

interface RentalPackageCatalogProps {
  canManage: boolean
}

/** Trạng thái gói → tone ngữ nghĩa chuẩn (dùng StatusBadge, không dùng Tag). */
const STATUS_TONE: Record<RentalPackageStatus, 'ok' | 'muted'> = {
  ACTIVE: 'ok',
  INACTIVE: 'muted',
}

const STATUS_LABEL: Record<RentalPackageStatus, string> = {
  ACTIVE: 'Đang nhận đơn',
  INACTIVE: 'Tạm ngưng',
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
          ? `Đã mở nhận đơn cho gói "${updated.package_name}".`
          : `Đã tạm ngưng nhận đơn cho gói "${updated.package_name}".`,
      )
    },
    onError: (err) => messageApi.error(err.message),
  })

  const deleteMutation = useDeleteRentalPackage({
    onSuccess: () => messageApi.success('Đã xóa gói thuê.'),
    onError: (err) => {
      // ⚠ 409 — gói đã có đơn hàng: hiện message tiếng Việt có hướng dẫn
      //   hành động thay thế (chuyển sang Tạm ngưng) thay vì message kỹ thuật.
      if (isRentalPackageInUseError(err)) {
        messageApi.warning(RENTAL_PACKAGE_IN_USE_MESSAGE)
        return
      }
      messageApi.error(err.message)
    },
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
      render: (_, record) => {
        // Hiển thị nguyên bản tên gói thuê từ DB (`rental_packages.package_name`).
        const name = record.package_name
        return (
          <Flex vertical gap={2} style={{ minWidth: 0 }}>
            <Typography.Text strong ellipsis={{ tooltip: name }}>
              {name}
            </Typography.Text>
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
        )
      },
    },
    {
      title: 'Thời lượng',
      key: 'duration_days',
      width: 140,
      render: (_, record) => (
        <MetadataBadge label={`${record.duration_days} ngày`} title="Thời lượng gói thuê tính bằng ngày." />
      ),
    },
    {
      title: 'Đơn hàng',
      key: 'order_count',
      width: 130,
      render: (_, record) => {
        const count = record.order_count ?? 0
        return (
          <Tooltip
            title={
              count > 0
                ? `Gói này đã có ${count} đơn hàng sử dụng ⇒ không thể xoá, chỉ chuyển trạng thái sang Tạm ngưng.`
                : 'Gói chưa phát sinh đơn hàng nào.'
            }
          >
            <MetadataBadge
              label={`${count} đơn`}
            />
          </Tooltip>
        )
      },
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
      width: 170,
      render: (_, record) => {
        const isActive = record.status === 'ACTIVE'
        const badge = (
          <StatusBadge
            tone={STATUS_TONE[record.status]}
            label={STATUS_LABEL[record.status]}
            icon={
              isActive ? (
                <CheckCircleOutlined aria-hidden="true" />
              ) : (
                <PauseCircleOutlined aria-hidden="true" />
              )
            }
          />
        )

        if (!canManage) return badge

        // Có quyền quản lý → badge đóng vai nút bật/tắt trạng thái.
        return (
          <button
            type="button"
            onClick={() => handleToggleStatus(record)}
            disabled={isToggling(record.package_id)}
            aria-label={`${isActive ? 'Tạm ngưng' : 'Mở nhận đơn'} gói ${record.package_name}`}
            style={{
              padding: 0,
              border: 0,
              background: 'transparent',
              cursor: isToggling(record.package_id) ? 'wait' : 'pointer',
              lineHeight: 1,
            }}
          >
            {badge}
          </button>
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
            render: (_: unknown, record: RentalPackage) => {
              /**
               * ⚠ Gom 2 trường hợp gói **không thể xoá**:
               *   1. Đã phát sinh đơn hàng → BE trả 409 ⇒ hướng dẫn chuyển
               *      trạng thái sang "Tạm ngưng" thay vì xoá.
               *   2. Đang ở trạng thái "Tạm ngưng" → không cần xoá, chỉ cần
               *      bật/tắt trạng thái.
               *
               * → Làm mờ nút + kèm Tooltip giải thích rõ lý do.
               */
              const orderCount = record.order_count ?? 0
              const isInactive = record.status === 'INACTIVE'
              const deleteDisabledReason = orderCount
                ? RENTAL_PACKAGE_IN_USE_MESSAGE
                : isInactive
                  ? 'Gói đang tạm ngưng — không cần xóa. Dùng nút trạng thái để mở lại nhận đơn.'
                  : null

              const deleteButton = (
                <ConfirmActionButton
                  icon={<DeleteOutlined />}
                  label="Xóa"
                  description={`Xóa gói ${record.package_name}`}
                  variant="danger"
                  title="Xóa gói thuê?"
                  content={`Thao tác này không thể hoàn tác. Bạn có chắc muốn xóa gói "${record.package_name}"?`}
                  okText="Xóa"
                  cancelText="Hủy"
                  onConfirm={() => handleDelete(record)}
                  disabled={deleteDisabledReason !== null}
                />
              )

              return (
                <Space size={6}>
                  <ActionButton
                    icon={<EditOutlined />}
                    label="Sửa"
                    description={`Sửa gói ${record.package_name}`}
                    onClick={() => handleOpenEdit(record)}
                  />

                  {deleteDisabledReason ? (
                    <Tooltip title={deleteDisabledReason}>
                      {/* span bọc để tooltip bám được cả khi button bị disabled */}
                      <span className="mcms-action-button-tooltip">
                        {deleteButton}
                      </span>
                    </Tooltip>
                  ) : (
                    deleteButton
                  )}
                </Space>
              )
            },
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
            { label: 'Đang nhận đơn', value: 'ACTIVE' },
            { label: 'Tạm ngưng', value: 'INACTIVE' },
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
        <DataTable<RentalPackage>
          dataSource={filteredPackages}
          columns={columns}
          rowKey="package_id"
          loading={isLoading}
          pagination={false}
          scrollX={1000}
          size="small"
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
