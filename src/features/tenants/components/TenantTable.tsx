import { useMemo } from 'react'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { Flex, Modal, Space, Typography, message } from 'antd'
import type { TableColumnsType } from 'antd'
import { useRoomStore } from '../../rooms/store/room.store'
import { useTenantStore } from '../store/tenant.store'
import { ActionButton, DataTable, StatusBadge, UserAvatar } from '../../../shared/ui'
import { formatTrayCode } from '../../../shared/i18n/terms'
import type { SemanticTone } from '../../../app/theme/tokens'
import type { Tenant } from '../types/tenant.types'

interface TenantTableProps {
  onEdit: (tenant: Tenant) => void
}

const STATUS_CONFIG = {
  active: { tone: 'ok', label: 'Đang thuê' },
  expired: { tone: 'muted', label: 'Hết hạn' },
} as const satisfies Record<
  Tenant['status'],
  { tone: SemanticTone; label: string }
>

export function TenantTable({ onEdit }: TenantTableProps) {
  const tenants = useTenantStore((state) => state.tenants)
  const deleteTenant = useTenantStore((state) => state.deleteTenant)
  const tiers = useRoomStore((state) => state.tiers)

  const trayById = useMemo(
    () => new Map(tiers.flatMap((tier) => tier.trays).map((tray) => [tray.id, tray])),
    [tiers],
  )

  const columns = useMemo<TableColumnsType<Tenant>>(
    () => [
      {
        title: 'Mã khách',
        dataIndex: 'id',
        key: 'id',
        width: 140,
      },
      {
        title: 'Họ tên',
        key: 'name',
        render: (_, tenant) => (
          <Flex align="center" gap={8}>
            <UserAvatar name={tenant.name} size={32} />
            <Flex vertical gap={0}>
              <Typography.Text strong>{tenant.name}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {tenant.id}
              </Typography.Text>
            </Flex>
          </Flex>
        ),
      },
      {
        title: 'SĐT',
        dataIndex: 'phone',
        key: 'phone',
        width: 140,
      },
      {
        title: 'Tầng / Khay',
        dataIndex: 'assignedTrayId',
        key: 'assignedTrayId',
        width: 170,
        render: (trayId: string) => {
          const tray = trayById.get(trayId)

          return tray
            ? `Tầng ${tray.tierId} · ${formatTrayCode(tray.code)}`
            : trayId
        },
      },
      {
        title: 'Ngày bắt đầu',
        dataIndex: 'startDate',
        key: 'startDate',
        width: 140,
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 130,
        render: (status: Tenant['status']) => {
          const config = STATUS_CONFIG[status]

          return (
            <StatusBadge tone={config.tone} label={config.label} />
          )
        },
      },
      {
        title: 'Hành động',
        key: 'actions',
        width: 120,
        align: 'right',
        render: (_, tenant) => (
          <Space size={4}>
            <ActionButton
              icon={<EditOutlined />}
              label="Sửa khách thuê"
              description={`Sửa thông tin của ${tenant.name}`}
              variant="text"
              onClick={() => onEdit(tenant)}
            />

            <ActionButton
              icon={<DeleteOutlined />}
              label="Xóa khách thuê"
              description={`Xóa ${tenant.name} và giải phóng khay`}
              variant="dangerText"
              onClick={() =>
                Modal.confirm({
                  title: 'Xóa khách thuê?',
                  content: `Khay của ${tenant.name} sẽ được giải phóng.`,
                  okText: 'Xóa',
                  cancelText: 'Hủy',
                  okButtonProps: { danger: true },
                  onOk: () => {
                    deleteTenant(tenant.id)
                    message.success('Đã xóa khách thuê và cập nhật khay.')
                  },
                })
              }
            />
          </Space>
        ),
      },
    ],
    [deleteTenant, onEdit, trayById],
  )

  return (
    <DataTable<Tenant>
      rowKey="id"
      columns={columns}
      dataSource={tenants}
      pagination={false}
      scrollX={900}
      emptyTitle="Chưa có khách thuê nào"
      emptyDescription="Thêm khách thuê để bắt đầu gán khay nấm."
    />
  )
}
