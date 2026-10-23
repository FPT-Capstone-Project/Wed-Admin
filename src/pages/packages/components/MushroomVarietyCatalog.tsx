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
  Image,
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
import type { MushroomType, MushroomTypeStatus } from '../../../types/mushroom-type'
import {
  useDeleteMushroomType,
  useMushroomTypes,
  useUpdateMushroomType,
} from '../../../features/packages/hooks/useMushroomTypes'
import { translateMushroomName } from '../../../shared/i18n/translate'
import { MushroomVarietyFormModal } from './MushroomVarietyFormModal'

const VND = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

type FilterStatus = 'ALL' | MushroomTypeStatus

interface MushroomVarietyCatalogProps {
  canManage: boolean
}

export function MushroomVarietyCatalog({
  canManage,
}: MushroomVarietyCatalogProps) {
  const { message: messageApi } = App.useApp()

  const {
    data: varieties = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useMushroomTypes()

  const updateMutation = useUpdateMushroomType({
    onSuccess: (updated) => {
      messageApi.success(
        updated.status === 'ACTIVE'
          ? `Đã mở nhận đơn cho "${updated.name}".`
          : `Đã tạm ngưng nhận đơn cho "${updated.name}".`,
      )
    },
    onError: (err) => messageApi.error(err.message),
  })

  const deleteMutation = useDeleteMushroomType({
    onSuccess: () => messageApi.success('Đã xóa giống nấm.'),
    onError: (err) => messageApi.error(err.message),
  })

  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingVariety, setEditingVariety] =
    useState<MushroomType | null>(null)

  const filteredVarieties = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return varieties.filter((variety) => {
      const matchesSearch = q
        ? variety.name.toLowerCase().includes(q) ||
          (variety.description ?? '').toLowerCase().includes(q)
        : true
      const matchesStatus =
        statusFilter === 'ALL' || variety.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [statusFilter, searchText, varieties])

  const handleOpenCreate = () => {
    setEditingVariety(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (variety: MushroomType) => {
    setEditingVariety(variety)
    setModalOpen(true)
  }

  const handleDelete = (variety: MushroomType) => {
    deleteMutation.mutate(variety.mushroom_type_id)
  }

  const handleToggleStatus = (variety: MushroomType) => {
    const nextStatus: MushroomTypeStatus =
      variety.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    updateMutation.mutate({
      id: variety.mushroom_type_id,
      payload: { values: { status: nextStatus } },
    })
  }

  const isToggling = (recordId: number) =>
    updateMutation.isPending &&
    updateMutation.variables?.id === recordId

  const columns: ColumnsType<MushroomType> = [
    {
      title: 'Giống nấm',
      key: 'name',
      width: 280,
      render: (_, record) => (
        <Flex gap={12} align="center">
          <Image
            src={record.image_url ?? ''}
            width={56}
            height={56}
            style={{
              borderRadius: 8,
              objectFit: 'cover',
              border: '1px solid #e5e7eb',
              flexShrink: 0,
              background: '#f8fafc',
            }}
            fallback="🍄"
            preview={false}
            alt={translateMushroomName(record.name)}
          />
          <Flex vertical gap={2} style={{ minWidth: 0 }}>
            <Typography.Text strong>{translateMushroomName(record.name)}</Typography.Text>
            {record.description && (
              <Typography.Text
                type="secondary"
                style={{ fontSize: 12, maxWidth: 200 }}
                ellipsis={{ tooltip: record.description }}
              >
                {record.description}
              </Typography.Text>
            )}
          </Flex>
        </Flex>
      ),
    },
    {
      title: 'Thời gian sinh trưởng',
      key: 'growing_days',
      width: 170,
      render: (_, record) => (
        <Tag color="geekblue" style={{ fontWeight: 500, fontSize: 13 }}>
          {record.growing_days} ngày
        </Tag>
      ),
    },
    {
      title: 'Đơn giá phôi / khay',
      key: 'price',
      width: 180,
      align: 'right',
      render: (_, record) => (
        <Tooltip title={`Đơn giá phôi giống = ${VND.format(record.price)}`}>
          <Typography.Text strong style={{ fontSize: 15 }}>
            {VND.format(record.price)}
          </Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 180,
      render: (_, record) => {
        const isActive = record.status === 'ACTIVE'
        return canManage ? (
          <Button
            type="link"
            size="small"
            loading={isToggling(record.mushroom_type_id)}
            onClick={() => handleToggleStatus(record)}
            style={{
              padding: 0,
              color: isActive ? '#16a34a' : '#9ca3af',
              fontWeight: 500,
            }}
          >
            {isActive ? '● Đang nhận đơn' : '○ Tạm ngưng'}
          </Button>
        ) : isActive ? (
          <Typography.Text style={{ color: '#16a34a', fontWeight: 500 }}>
            ● Đang nhận đơn
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">○ Tạm ngưng</Typography.Text>
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
            render: (_: unknown, record: MushroomType) => (
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
                  title="Xóa giống nấm?"
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
                    aria-label="Xóa giống nấm"
                  />
                </Popconfirm>
              </Space>
            ),
          } as ColumnsType<MushroomType>[number],
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
          Danh sách giống nấm
        </Typography.Title>

        {canManage && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreate}
          >
            Thêm giống nấm mới
          </Button>
        )}
      </Flex>

      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tìm theo tên giống hoặc mô tả"
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
                Không tải được danh sách giống nấm.
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {error?.message ?? 'Lỗi không xác định.'}
              </Typography.Text>
            </Flex>
          }
        />
      ) : filteredVarieties.length === 0 && !isLoading ? (
        <Empty description="Chưa có giống nấm nào" />
      ) : (
        <Table<MushroomType>
          dataSource={filteredVarieties}
          columns={columns}
          rowKey="mushroom_type_id"
          loading={isLoading}
          pagination={false}
          scroll={{ x: 900 }}
          size="middle"
        />
      )}

      <MushroomVarietyFormModal
        open={modalOpen}
        initialValues={editingVariety}
        onCancel={() => {
          setModalOpen(false)
          setEditingVariety(null)
        }}
      />
    </div>
  )
}
