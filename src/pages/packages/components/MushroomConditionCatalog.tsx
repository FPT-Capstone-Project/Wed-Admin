import '../../../styles/catalog-industrial.css'
import { useMemo, useState } from 'react'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { App, Button, Empty, Flex, Input, Popconfirm, Space, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { MushroomCondition } from '../../../types/mushroom-condition'
import {
  useDeleteMushroomCondition,
  useMushroomConditions,
} from '../../../features/packages/hooks/useMushroomConditions'
import { useMushroomTypes } from '../../../features/packages/hooks/useMushroomTypes'
import { ActionButton, DataTable, MetadataBadge } from '../../../shared/ui'
import { MushroomConditionFormModal } from './MushroomConditionFormModal'

interface MushroomConditionCatalogProps {
  canManage: boolean
}

/** Định dạng một dải min–max. */
function formatRange(
  min: number | null | undefined,
  max: number | null | undefined,
  unit: string,
): string {
  const hasMin = typeof min === 'number' && Number.isFinite(min)
  const hasMax = typeof max === 'number' && Number.isFinite(max)
  if (!hasMin && !hasMax) return '—'
  if (hasMin && !hasMax) return `≥ ${min}${unit}`
  if (!hasMin && hasMax) return `≤ ${max}${unit}`
  return `${min}–${max}${unit}`
}

/**
 * Danh mục **Điều kiện sinh trưởng** (`/api/mushroom-conditions`).
 *
 * ⚠ Giai đoạn 0: chỉ còn 2 chỉ số — **nhiệt độ** và **độ ẩm**.
 *   CO₂ và độ ẩm giá thể đã bị gỡ khỏi BE / DB.
 *
 * CRUD đầy đủ (Thêm / Sửa / Xoá) — Admin dùng để quản lý danh mục và
 * giá trị ngưỡng của từng giống nấm.
 */
export function MushroomConditionCatalog({
  canManage,
}: MushroomConditionCatalogProps) {
  const { message: messageApi } = App.useApp()

  const { data: conditions = [], isLoading, isError, error, refetch } =
    useMushroomConditions()
  const { data: mushroomTypes = [] } = useMushroomTypes()

  const [searchText, setSearchText] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCondition, setEditingCondition] =
    useState<MushroomCondition | null>(null)

  const deleteMutation = useDeleteMushroomCondition({
    onSuccess: () => messageApi.success('Đã xoá điều kiện sinh trưởng.'),
    onError: (err) => messageApi.error(err.message),
  })

  const mushroomNameById = useMemo(() => {
    const map = new Map<number, string>()
    mushroomTypes.forEach((type) => map.set(type.mushroom_type_id, type.name))
    return map
  }, [mushroomTypes])

  /** `mushroom_type_id` đã có condition → BE chỉ cho 1 condition / giống. */
  const typeIdWithCondition = useMemo(() => {
    const ids = new Set<number>()
    conditions.forEach((condition) => ids.add(condition.mushroom_type_id))
    return ids
  }, [conditions])

  const filteredConditions = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return conditions
    return conditions.filter((condition) => {
      const name = mushroomNameById.get(condition.mushroom_type_id) ?? ''
      return (
        name.toLowerCase().includes(q) ||
        String(condition.condition_id).includes(q)
      )
    })
  }, [conditions, mushroomNameById, searchText])

  /** Giống nấm được phép chọn khi tạo mới (loại trừ giống đã có condition). */
  const selectableMushroomTypes = useMemo(
    () =>
      mushroomTypes.filter(
        (type) =>
          !typeIdWithCondition.has(type.mushroom_type_id) ||
          type.mushroom_type_id === editingCondition?.mushroom_type_id,
      ),
    [editingCondition, mushroomTypes, typeIdWithCondition],
  )

  const handleOpenCreate = () => {
    setEditingCondition(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (condition: MushroomCondition) => {
    setEditingCondition(condition)
    setModalOpen(true)
  }

  const handleDelete = (condition: MushroomCondition) => {
    deleteMutation.mutate(condition.condition_id)
  }

  const columns: ColumnsType<MushroomCondition> = [
    {
      title: 'Giống nấm',
      key: 'mushroomType',
      width: 260,
      render: (_, record) => {
        const name = mushroomNameById.get(record.mushroom_type_id)
        return (
          <Flex vertical gap={2}>
            <Typography.Text strong>
              {name ?? `Loại nấm #${record.mushroom_type_id}`}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Condition #{record.condition_id}
            </Typography.Text>
          </Flex>
        )
      },
    },
    {
      title: 'Nhiệt độ (°C)',
      key: 'temperature',
      width: 170,
      render: (_, record) => (
        <MetadataBadge
          label={formatRange(record.temperature_min, record.temperature_max, '°C')}
        />
      ),
    },
    {
      title: 'Độ ẩm (%RH)',
      key: 'humidity',
      width: 170,
      render: (_, record) => (
        <MetadataBadge
          label={formatRange(record.humidity_min, record.humidity_max, '%RH')}
        />
      ),
    },
    {
      title: 'Cập nhật',
      key: 'updated_at',
      width: 140,
      render: (_, record) => (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {record.updated_at
            ? new Date(record.updated_at).toLocaleDateString('vi-VN')
            : '—'}
        </Typography.Text>
      ),
    },
    ...(canManage
      ? [
          {
            title: 'Hành động',
            key: 'actions',
            width: 140,
            fixed: 'right' as const,
            render: (_: unknown, record: MushroomCondition) => (
              <Space size={6}>
                <ActionButton
                  icon={<EditOutlined />}
                  label="Sửa"
                  description="Sửa điều kiện sinh trưởng"
                  onClick={() => handleOpenEdit(record)}
                />
                <Popconfirm
                  title="Xóa điều kiện sinh trưởng?"
                  description="Thao tác này không thể hoàn tác."
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleDelete(record)}
                >
                  <ActionButton
                    icon={<DeleteOutlined />}
                    label="Xóa"
                    description="Xóa điều kiện sinh trưởng"
                    variant="danger"
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
          Điều kiện sinh trưởng
        </Typography.Title>

        {canManage && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={selectableMushroomTypes.length === 0}
            onClick={handleOpenCreate}
          >
            Thêm điều kiện
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
                Không tải được danh sách điều kiện sinh trưởng.
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {error?.message ?? 'Lỗi không xác định.'}
              </Typography.Text>
            </Flex>
          }
        />
      ) : filteredConditions.length === 0 && !isLoading ? (
        <Empty description="Chưa có điều kiện sinh trưởng nào" />
      ) : (
        <DataTable<MushroomCondition>
          dataSource={filteredConditions}
          columns={columns}
          rowKey="condition_id"
          loading={isLoading}
          pagination={false}
          scrollX={900}
          size="small"
        />
      )}

      <MushroomConditionFormModal
        open={modalOpen}
        initialValues={editingCondition}
        mushroomTypes={selectableMushroomTypes}
        onCancel={() => {
          setModalOpen(false)
          setEditingCondition(null)
        }}
      />
    </div>
  )
}
