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
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { MushroomCondition } from '../../../types/mushroom-condition'
import {
  useDeleteMushroomCondition,
  useMushroomConditions,
} from '../../../features/packages/hooks/useMushroomConditions'
import { translateMushroomNameOnly } from '../../../shared/i18n/translate'
import { useMushroomTypes } from '../../../features/packages/hooks/useMushroomTypes'
import { MushroomConditionFormModal } from './MushroomConditionFormModal'

interface MushroomConditionCatalogProps {
  canManage: boolean
}

function Range({ min, max, unit, color }: { min: number | null; max: number | null; unit: string; color: string }) {
  if (min == null && max == null) return <Typography.Text type="secondary">—</Typography.Text>
  return (
    <Typography.Text>
      <Tag color={color} style={{ fontWeight: 500 }}>
        {min ?? '—'} – {max ?? '—'} {unit}
      </Tag>
    </Typography.Text>
  )
}

export function MushroomConditionCatalog({
  canManage,
}: MushroomConditionCatalogProps) {
  const { message: messageApi } = App.useApp()

  const {
    data: conditions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useMushroomConditions()

  const { data: varieties = [] } = useMushroomTypes()
  // Map: mushroom_type_id → tên VI (translate từ name gốc)
  const varietyNameById = useMemo(() => {
    const map = new Map<number, string>()
    varieties.forEach((v) =>
      map.set(v.mushroom_type_id, translateMushroomNameOnly(v.name)),
    )
    return map
  }, [varieties])

  const deleteMutation = useDeleteMushroomCondition({
    onSuccess: () => messageApi.success('Đã xóa thông số canh tác.'),
    onError: (err) => messageApi.error(err.message),
  })

  const [searchText, setSearchText] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCondition, setEditingCondition] =
    useState<MushroomCondition | null>(null)

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return conditions.filter((c) => {
      const name = varietyNameById.get(c.mushroom_type_id) ?? ''
      return q
        ? name.toLowerCase().includes(q) ||
          String(c.mushroom_type_id).includes(q)
        : true
    })
  }, [conditions, searchText, varietyNameById])

  const handleOpenCreate = () => {
    setEditingCondition(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (record: MushroomCondition) => {
    setEditingCondition(record)
    setModalOpen(true)
  }

  const handleDelete = (record: MushroomCondition) => {
    deleteMutation.mutate(record.condition_id)
  }

  const columns: ColumnsType<MushroomCondition> = [
    {
      title: 'Giống nấm',
      key: 'mushroom_type_id',
      width: 200,
      render: (_, record) => (
        <Flex vertical gap={2}>
          <Typography.Text strong>
            {varietyNameById.get(record.mushroom_type_id) ?? `ID #${record.mushroom_type_id}`}
          </Typography.Text>
          {varietyNameById.get(record.mushroom_type_id) == null && (
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              Giống nấm đã bị xóa
            </Typography.Text>
          )}
        </Flex>
      ),
    },
    {
      title: 'Nhiệt độ (℃)',
      key: 'temperature',
      width: 150,
      render: (_, r) => (
        <Range min={r.temperature_min} max={r.temperature_max} unit="℃" color="red" />
      ),
    },
    {
      title: 'Độ ẩm (%)',
      key: 'humidity',
      width: 130,
      render: (_, r) => (
        <Range min={r.humidity_min} max={r.humidity_max} unit="%" color="blue" />
      ),
    },
    {
      title: 'CO₂ (ppm)',
      key: 'co2',
      width: 140,
      render: (_, r) => (
        <Range min={r.co2_min} max={r.co2_max} unit="ppm" color="gold" />
      ),
    },
    {
      title: 'Ẩm giá thể (%)',
      key: 'substrate_moisture',
      width: 150,
      render: (_, r) => (
        <Range
          min={r.substrate_moisture_min}
          max={r.substrate_moisture_max}
          unit="%"
          color="green"
        />
      ),
    },
    {
      title: 'Cập nhật',
      key: 'updated_at',
      width: 140,
      render: (_, r) => (
        <Tooltip title={r.updated_at}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {new Date(r.updated_at).toLocaleDateString('vi-VN')}
          </Typography.Text>
        </Tooltip>
      ),
    },
    ...(canManage
      ? [
          {
            title: 'Hành động',
            key: 'actions',
            width: 160,
            fixed: 'right' as const,
            render: (_: unknown, record: MushroomCondition) => (
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
                  title="Xóa thông số canh tác?"
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
                    aria-label="Xóa thông số canh tác"
                  />
                </Popconfirm>
              </Space>
            ),
          } as ColumnsType<MushroomCondition>[number],
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
          Thông số canh tác theo giống nấm
        </Typography.Title>

        {canManage && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreate}
          >
            Thêm thông số canh tác
          </Button>
        )}
      </Flex>

      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tìm theo tên giống nấm"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 320, maxWidth: '100%' }}
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
                Không tải được thông số canh tác.
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {error?.message ?? 'Lỗi không xác định.'}
              </Typography.Text>
            </Flex>
          }
        />
      ) : filtered.length === 0 && !isLoading ? (
        <Empty description="Chưa có thông số canh tác nào" />
      ) : (
        <Table<MushroomCondition>
          dataSource={filtered}
          columns={columns}
          rowKey="condition_id"
          loading={isLoading}
          pagination={false}
          scroll={{ x: 1000 }}
          size="middle"
        />
      )}

      <MushroomConditionFormModal
        open={modalOpen}
        initialValues={editingCondition}
        onCancel={() => {
          setModalOpen(false)
          setEditingCondition(null)
        }}
      />
    </div>
  )
}
