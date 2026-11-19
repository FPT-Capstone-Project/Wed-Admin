import {
EditOutlined,
PlusOutlined,
SearchOutlined
} from '@ant-design/icons'
import {
App,
Button,
Card,
Empty,
Flex,
Input,
Segmented,
Skeleton,
Tooltip,
Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo,useState } from 'react'
import { useRentalPackageOrderCounts } from '../../../features/packages/hooks/useRentalPackageOrderCounts'
import {
useRentalPackages,
useUpdateRentalPackage,
} from '../../../features/packages/hooks/useRentalPackages'
import {
resolveApiErrorMessage,
showApiError,
} from '../../../shared/api/error-mapper'
import { CATALOG_STATUS_DICTIONARY,type CatalogStatusKey } from '../../../shared/i18n/status/package'
import { presentStatus,statusLabel } from '../../../shared/i18n/status/registry'
import { isVietnameseDescription } from '../../../shared/i18n/vietnamese-text'
import {
ActionButton,
DataTable,
MetadataBadge,
StatusBadge,
} from '../../../shared/ui'
import '../../../styles/catalog-industrial.css'
import type {
RentalPackage,
RentalPackageStatus,
} from '../../../types/rental-package'
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

/**
 * ⚠ Nhãn + tone lấy từ **module trung tâm**
 *   (`src/shared/i18n/status/package.ts`) ⇒ 1 nguồn sự thật.
 *
 * ⚠ Bộ lọc trạng thái cũng lấy nhãn từ đó ⇒ nhãn ở bộ lọc, cột "Trạng
 *   thái" và modal **luôn khớp nhau** (ACTIVE → "Đang áp dụng",
 *   INACTIVE → "Ngừng áp dụng").
 */
const STATUS_FILTER_OPTIONS: Array<{ label: string; value: FilterStatus }> = [
  { label: 'Tất cả', value: 'ALL' },
  ...(Object.keys(CATALOG_STATUS_DICTIONARY) as CatalogStatusKey[]).map(
    (value) => ({
      label: statusLabel(CATALOG_STATUS_DICTIONARY, value),
      value: value as FilterStatus,
    }),
  ),
]

export function RentalPackageCatalog({
  canManage,
}: RentalPackageCatalogProps) {
  const { message: messageApi } = App.useApp()

  const {
    data: packages = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useRentalPackages()

  /**
   * ⚠ **Số đơn hàng thực tế theo gói** — tự đếm từ `GET /api/orders/admin`.
   *
   *   Lý do: `GET /api/rental-packages` **không** trả `order_count` (BE chỉ
   *   SELECT `package_id, package_name, description, duration_days, price,
   *   status`) ⇒ cột "Đơn hàng" luôn hiện 0 và nút Xóa không bị disable ⇒
   *   user bấm xoá ⇒ BE ném lỗi khoá ngoại.
   */
  const {
    counts: orderCounts,
    isLoading: countsLoading,
    isError: countsFailed,
  } = useRentalPackageOrderCounts(packages)

  const updateMutation = useUpdateRentalPackage({
    onSuccess: (updated) => {
      messageApi.success(
        updated.status === 'ACTIVE'
          ? `Đã kích hoạt gói thuê "${updated.package_name}".`
          : `Đã ngừng áp dụng gói thuê "${updated.package_name}".`,
      )
    },
    onError: (err) =>
      showApiError(err, 'cập nhật gói thuê', (text) => messageApi.error(text)),
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
      width: 250,
      render: (_, record) => {
        // Hiển thị nguyên bản tên gói thuê từ DB (`rental_packages.package_name`).
        const name = record.package_name
        /*
         * ⚠ CHỈ hiện mô tả khi là **tiếng Việt**.
         *
         *   Lý do: `rental_packages.description` còn nhiều mô tả **tiếng Anh**
         *   từ seed data cũ (vd "Premium package", "Basic oyster mushroom
         *   cultivation package") ⇒ hiện ra UI làm giao diện lệch ngôn ngữ.
         *
         *   ⇒ Mô tả không phải tiếng Việt ⇒ **ẩn** (không render dòng phụ).
         */
        const description = record.description?.trim() ?? ''
        const showDescription = isVietnameseDescription(description)
        return (
          <Flex vertical gap={2} style={{ minWidth: 0 }}>
            <Typography.Text strong ellipsis={{ tooltip: name }}>
              {name}
            </Typography.Text>
            {showDescription && (
              <Typography.Text
                type="secondary"
                style={{ fontSize: 12, maxWidth: 260 }}
                ellipsis={{ tooltip: description }}
              >
                {description}
              </Typography.Text>
            )}
          </Flex>
        )
      },
    },
    {
      title: 'Thời lượng',
      key: 'duration_days',
      width: 100,
      render: (_, record) => (
        <MetadataBadge label={`${record.duration_days} ngày`} title="Thời lượng gói thuê tính bằng ngày." />
      ),
    },
    {
      title: 'Đơn hàng',
      key: 'order_count',
      width: 100,
      render: (_, record) => {
        /*
         * ⚠ **Số đơn thực tế** — tự đếm từ `GET /api/orders/admin` (BE không
         *   trả `order_count` trong danh sách gói thuê).
         */
        const count = orderCounts.get(record.package_id) ?? 0
        return (
          <Tooltip
            title={
              countsFailed
                ? 'Không tải được số liệu đơn hàng — có thể gói đã có đơn mà chưa hiển thị.'
                : count > 0
                  ? `Gói này đã có ${count} đơn hàng sử dụng ⇒ không thể xoá, chỉ chuyển trạng thái sang Ngừng áp dụng.`
                  : 'Gói chưa phát sinh đơn hàng nào.'
            }
          >
            <MetadataBadge
              label={countsLoading ? '…' : `${count} đơn`}
            />
          </Tooltip>
        )
      },
    },
    {
      title: 'Đơn giá gói',
      key: 'price',
      width: 150,
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
      width: 140,
      render: (_, record) => {
        const isActive = record.status === 'ACTIVE'
        const badge = (
          <StatusBadge
            {...presentStatus(CATALOG_STATUS_DICTIONARY, record.status)}

          />
        )

        if (!canManage) return badge

        // Có quyền quản lý → badge đóng vai nút bật/tắt trạng thái.
        return (
          <button
            type="button"
            onClick={() => handleToggleStatus(record)}
            disabled={isToggling(record.package_id)}
            aria-label={`${isActive ? 'Ngừng áp dụng' : 'Kích hoạt'} gói thuê ${record.package_name}`}
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
            width: 100,
            fixed: 'right' as const,
            render: (_: unknown, record: RentalPackage) => (
              <ActionButton
                icon={<EditOutlined />}
                label="Sửa"
                description={`Sửa gói ${record.package_name}`}
                onClick={() => handleOpenEdit(record)}
              />
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
          options={STATUS_FILTER_OPTIONS}
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

      {isLoading && packages.length === 0 ? (
        <Flex gap={16} wrap aria-label="Đang tải danh sách gói thuê" aria-busy="true">
          {[0, 1, 2].map((key) => (
            <Card key={key} style={{ flex: '1 1 240px', minWidth: 0 }}>
              <Skeleton active paragraph={{ rows: 4 }} />
            </Card>
          ))}
        </Flex>
      ) : isError ? (
        <Empty
          description={
            <Flex vertical align="center" gap={4}>
              <Typography.Text type="danger">
                Không tải được danh sách gói thuê.
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {resolveApiErrorMessage(error, 'tải danh sách gói thuê')}
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
          isFetching={isFetching}
          pagination={false}
          scrollX={960}
          size="small"
          tableLayout="fixed"
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
