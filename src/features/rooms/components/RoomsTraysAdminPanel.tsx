import { useMemo, useState } from 'react'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Empty,
  Flex,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  useCultivationRooms,
  useCultivationTrays,
  useDeleteCultivationRoom,
  useDeleteCultivationTray,
} from '../hooks/useCultivation'
import type {
  CultivationRoom,
  CultivationTray,
} from '../../../types/cultivation'
import type { BeTrayStatus } from '../../../types/cultivation-status'
import { RoomFormModal } from './RoomFormModal'
import { TrayFormModal } from './TrayFormModal'

const ROOM_STATUS_CONFIG: Record<
  CultivationRoom['status'],
  { color: string; label: string }
> = {
  ACTIVE: { color: 'success', label: 'Hoạt động' },
  INACTIVE: { color: 'default', label: 'Ngừng hoạt động' },
  MAINTENANCE: { color: 'warning', label: 'Bảo trì' },
}

/** BE có thể trả status dạng số (vd. 5) hoặc string không khớp enum —
 *  fallback an toàn để UI không crash và hiển thị chuỗi gốc kèm nhãn rõ ràng. */
function resolveRoomStatusBadge(
  raw: unknown,
): { color: string; label: string } {
  if (raw == null) {
    return { color: 'default', label: '—' }
  }
  const stringified = String(raw)
  const upper = stringified.toUpperCase() as CultivationRoom['status']
  const matched = ROOM_STATUS_CONFIG[upper]
  if (matched) return matched
  if (typeof raw === 'number') {
    return {
      color: 'gold',
      label: `Trạng thái #${stringified}`,
    }
  }
  return {
    color: 'gold',
    label: `Trạng thái lạ: ${stringified}`,
  }
}

const TRAY_STATUS_CONFIG: Record<
  BeTrayStatus,
  { color: string; label: string }
> = {
  AVAILABLE: { color: 'success', label: 'Trống' },
  OCCUPIED: { color: 'processing', label: 'Đang dùng' },
  MAINTENANCE: { color: 'warning', label: 'Bảo trì' },
  INACTIVE: { color: 'default', label: 'Ngừng' },
}

function resolveTrayStatusBadge(
  raw: unknown,
): { color: string; label: string } {
  if (raw == null) {
    return { color: 'default', label: '—' }
  }
  const stringified = String(raw)
  const upper = stringified.toUpperCase() as BeTrayStatus
  const matched = TRAY_STATUS_CONFIG[upper]
  if (matched) return matched
  if (typeof raw === 'number') {
    return {
      color: 'gold',
      label: `Trạng thái #${stringified}`,
    }
  }
  return {
    color: 'gold',
    label: `Trạng thái lạ: ${stringified}`,
  }
}

const DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

interface RoomsTraysAdminPanelProps {
  onChanged?: () => void
}

/**
 * Bảng quản trị tầng nuôi + khay.
 *
 * Gắn trực tiếp REST endpoints của resource `cultivation-rooms`
 * và `cultivation-trays` (CRUD đầy đủ).
 */
export function RoomsTraysAdminPanel({ onChanged }: RoomsTraysAdminPanelProps) {
  const { message } = App.useApp()

  const {
    data: rooms = [],
    isLoading: roomsLoading,
    isError: roomsError,
    refetch: refetchRooms,
  } = useCultivationRooms()

  const {
    data: trays = [],
    isLoading: traysLoading,
    isError: traysError,
    refetch: refetchTrays,
  } = useCultivationTrays()

  const deleteRoom = useDeleteCultivationRoom({
    onSuccess: () => {
      message.success('Đã xoá phòng.')
      void refetchRooms()
      void refetchTrays()
      onChanged?.()
    },
    onError: (err) => message.error(err.message),
  })

  const deleteTray = useDeleteCultivationTray({
    onSuccess: () => {
      message.success('Đã xoá khay.')
      void refetchTrays()
      onChanged?.()
    },
    onError: (err) => message.error(err.message),
  })

  const [roomModalOpen, setRoomModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<CultivationRoom | null>(null)
  const [trayModalOpen, setTrayModalOpen] = useState(false)
  const [editingTray, setEditingTray] = useState<CultivationTray | null>(null)

  const roomNameById = useMemo(() => {
    const map = new Map<number, string>()
    rooms.forEach((room) => map.set(room.room_id, room.room_name))
    return map
  }, [rooms])

  const roomColumns: ColumnsType<CultivationRoom> = [
    {
      title: 'Mã',
      dataIndex: 'room_code',
      key: 'room_code',
      width: 120,
      render: (code: string) => (
        <Typography.Text code style={{ fontSize: 12 }}>
          {code}
        </Typography.Text>
      ),
    },
    {
      title: 'Tên phòng',
      dataIndex: 'room_name',
      key: 'room_name',
      width: 200,
    },
    {
      title: 'Sức chứa',
      dataIndex: 'capacity',
      key: 'capacity',
      width: 100,
      align: 'center',
    },
    {
      title: 'Số khay',
      key: 'trayCount',
      width: 90,
      align: 'center',
      render: (_, record) =>
        trays.filter((t) => t.room_id === record.room_id).length,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      render: (status: unknown) => {
        const config = resolveRoomStatusBadge(status)
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: 'Cập nhật',
      key: 'updated_at',
      width: 120,
      render: (_, record) => (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {DATE_FORMATTER.format(new Date(record.updated_at))}
        </Typography.Text>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 110,
      align: 'right',
      render: (_, record) => (
        <Space size={2}>
          <Button
            type="text"
            icon={<EditOutlined />}
            aria-label={`Sửa phòng ${record.room_code}`}
            onClick={() => {
              setEditingRoom(record)
              setRoomModalOpen(true)
            }}
          />
          <Popconfirm
            title="Xoá phòng này?"
            description={
              trays.some((t) => t.room_id === record.room_id)
                ? `Phòng còn ${trays.filter((t) => t.room_id === record.room_id).length} khay — cần xoá/xử lý khay trước.`
                : 'Thao tác này không thể hoàn tác.'
            }
            okText="Xoá"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteRoom.mutate(record.room_id)}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              aria-label={`Xoá phòng ${record.room_code}`}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const trayColumns: ColumnsType<CultivationTray> = [
    {
      title: 'Mã khay',
      dataIndex: 'tray_code',
      key: 'tray_code',
      width: 130,
      render: (code: string) => (
        <Typography.Text code style={{ fontSize: 12 }}>
          {code}
        </Typography.Text>
      ),
    },
    {
      title: 'Tên khay',
      dataIndex: 'tray_name',
      key: 'tray_name',
      width: 200,
      render: (name: string | null) =>
        name ? (
          name
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: 'Phòng',
      key: 'room',
      width: 180,
      render: (_, record) =>
        roomNameById.get(record.room_id) ?? (
          <Typography.Text type="secondary">
            Phòng #{record.room_id}
          </Typography.Text>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: unknown) => {
        const config = resolveTrayStatusBadge(status)
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: 'Cập nhật',
      key: 'updated_at',
      width: 120,
      render: (_, record) => (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {DATE_FORMATTER.format(new Date(record.updated_at))}
        </Typography.Text>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 110,
      align: 'right',
      render: (_, record) => (
        <Space size={2}>
          <Button
            type="text"
            icon={<EditOutlined />}
            aria-label={`Sửa khay ${record.tray_code}`}
            onClick={() => {
              setEditingTray(record)
              setTrayModalOpen(true)
            }}
          />
          <Popconfirm
            title="Xoá khay này?"
            description="Thao tác này không thể hoàn tác."
            okText="Xoá"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteTray.mutate(record.tray_id)}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              aria-label={`Xoá khay ${record.tray_code}`}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Flex vertical gap={16}>
      {/* ── Tầng nuôi ───────────────────────────────────────────────────── */}
      <section className="admin-panel-section" aria-label="Quản lý tầng nuôi">
        <Flex align="center" justify="space-between" gap={12} wrap>
          <div>
            <Typography.Title level={5} style={{ margin: 0 }}>
              Tầng nuôi
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {rooms.length} tầng
            </Typography.Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingRoom(null)
              setRoomModalOpen(true)
            }}
          >
            Thêm phòng
          </Button>
        </Flex>

        <Table<CultivationRoom>
          rowKey="room_id"
          columns={roomColumns}
          dataSource={rooms}
          loading={roomsLoading}
          size="small"
          pagination={false}
          scroll={{ x: 800 }}
          style={{ marginTop: 12 }}
          locale={{
            emptyText: roomsError ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Flex vertical align="center" gap={6}>
                    <Typography.Text type="danger">
                      Không tải được danh sách phòng.
                    </Typography.Text>
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => void refetchRooms()}
                    >
                      Nhấn để thử lại
                    </Typography.Text>
                  </Flex>
                }
              />
            ) : (
              <Empty description="Chưa có tầng nuôi nào" />
            ),
          }}
        />
      </section>

      {/* ── Khay ──────────────────────────────────────────────────────── */}
      <section className="admin-panel-section" aria-label="Quản lý khay">
        <Flex align="center" justify="space-between" gap={12} wrap>
          <div>
            <Typography.Title level={5} style={{ margin: 0 }}>
              Khay
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {trays.length} khay
            </Typography.Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={rooms.length === 0}
            onClick={() => {
              setEditingTray(null)
              setTrayModalOpen(true)
            }}
          >
            Thêm khay
          </Button>
        </Flex>

        <Table<CultivationTray>
          rowKey="tray_id"
          columns={trayColumns}
          dataSource={trays}
          loading={traysLoading}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 800 }}
          style={{ marginTop: 12 }}
          locale={{
            emptyText: traysError ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Flex vertical align="center" gap={6}>
                    <Typography.Text type="danger">
                      Không tải được danh sách khay.
                    </Typography.Text>
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => void refetchTrays()}
                    >
                      Nhấn để thử lại
                    </Typography.Text>
                  </Flex>
                }
              />
            ) : (
              <Empty description="Chưa có khay nào" />
            ),
          }}
        />
      </section>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      <RoomFormModal
        open={roomModalOpen}
        room={editingRoom}
        onCancel={() => {
          setRoomModalOpen(false)
          setEditingRoom(null)
        }}
        onSuccess={() => {
          void refetchRooms()
          void refetchTrays()
          onChanged?.()
        }}
      />

      <TrayFormModal
        open={trayModalOpen}
        tray={editingTray}
        rooms={rooms}
        onCancel={() => {
          setTrayModalOpen(false)
          setEditingTray(null)
        }}
        onSuccess={() => {
          void refetchTrays()
          onChanged?.()
        }}
      />
    </Flex>
  )
}
