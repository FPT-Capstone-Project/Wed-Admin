import { useCallback, useMemo, useState } from 'react'
import {
  CameraOutlined,
  DeleteOutlined,
  DisconnectOutlined,
  EditOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Flex,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { CameraFormModal } from '../../features/cameras/components/CameraFormModal'
import { CameraStreamModal } from '../../features/cameras/components/CameraStreamModal'
import {
  useCameras,
  useDeleteCamera,
  useStopLiveStream,
} from '../../features/cameras/hooks/useCameras'
import { extractApiError, getApiErrorMessage } from '../../shared/api/error'
import {
  CAMERA_STATUSES,
  type Camera,
  type CameraStatus,
} from '../../types/camera.types'
import { useRoomStore } from '../../stores/room.store'

const STATUS_META: Record<CameraStatus, { color: string; label: string }> = {
  ACTIVE: { color: 'success', label: 'Hoạt động' },
  INACTIVE: { color: 'default', label: 'Ngừng' },
  OFFLINE: { color: 'error', label: 'Mất kết nối' },
}

/**
 * Camera toàn cảnh — dữ liệu thật từ `GET /api/cameras`.
 *
 * Luồng live stream Imou được điều khiển qua các hook riêng trong
 * `features/cameras/hooks/useCameras.ts`. Trang này chỉ hiển thị danh sách
 * và cho phép dừng phiên live đang chạy.
 */
export function CameraOverviewPage() {
  const { message } = App.useApp()
  const tiers = useRoomStore((state) => state.tiers)

  const [statusFilter, setStatusFilter] = useState<CameraStatus | undefined>()
  const [isModalOpen, setModalOpen] = useState(false)
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null)
  const [streamingCamera, setStreamingCamera] = useState<Camera | null>(null)

  const openCreateModal = useCallback(() => {
    setEditingCamera(null)
    setModalOpen(true)
  }, [])

  const openEditModal = useCallback((camera: Camera) => {
    setEditingCamera(camera)
    setModalOpen(true)
  }, [])

  const camerasQuery = useCameras(
    statusFilter ? { status: statusFilter } : {},
  )
  const stopLiveStream = useStopLiveStream({
    onSuccess: () => message.success('Đã dừng phiên live stream.'),
    onError: (error) => message.error(getApiErrorMessage(error)),
  })

  const deleteCamera = useDeleteCamera({
    onSuccess: () => message.success('Đã xoá camera.'),
    onError: (error) => {
      // 409 = camera đang được tham chiếu → giải thích rõ thay vì báo lỗi chung.
      const status = extractApiError(error).status
      message.error(
        status === 409
          ? 'Không thể xoá: camera đang được tham chiếu ở nơi khác.'
          : getApiErrorMessage(error),
      )
    },
  })

  const { data: cameras = [], isLoading, isFetching, isError, error, refetch } =
    camerasQuery

  const columns = useMemo<TableColumnsType<Camera>>(
    () => [
      {
        title: 'Mã camera',
        dataIndex: 'id',
        key: 'id',
        width: 110,
      },
      {
        title: 'Tên camera',
        dataIndex: 'cameraName',
        key: 'cameraName',
        width: 200,
        render: (name: string) => name || <Typography.Text type="secondary">—</Typography.Text>,
      },
      {
        title: 'Imou device ID',
        dataIndex: 'cameraCode',
        key: 'cameraCode',
        width: 180,
        render: (code: string) => (
          <Typography.Text code style={{ fontSize: 12 }}>
            {code || '—'}
          </Typography.Text>
        ),
      },
      {
        title: 'Phòng',
        dataIndex: 'roomId',
        key: 'roomId',
        width: 90,
        render: (roomId: number | null) =>
          roomId ?? <Typography.Text type="secondary">—</Typography.Text>,
      },
      {
        title: 'Stream URL',
        dataIndex: 'streamUrl',
        key: 'streamUrl',
        ellipsis: true,
        render: (url: string | null) =>
          url ? (
            <Typography.Text ellipsis style={{ maxWidth: 260, fontSize: 12 }}>
              {url}
            </Typography.Text>
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Chưa cấu hình
            </Typography.Text>
          ),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 130,
        render: (status: CameraStatus) => {
          const meta = STATUS_META[status] ?? {
            color: 'default',
            label: status,
          }

          return <Tag color={meta.color}>{meta.label}</Tag>
        },
      },
      {
        title: 'Hành động',
        key: 'actions',
        width: 130,
        align: 'right',
        render: (_, camera) => (
          <Space size={0}>
            <Tooltip title="Xem live stream">
              <Button
                type="text"
                icon={<PlayCircleOutlined />}
                onClick={() => setStreamingCamera(camera)}
                aria-label={`Xem live stream ${camera.cameraName || camera.id}`}
              />
            </Tooltip>
            <Tooltip title="Chỉnh sửa camera">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => openEditModal(camera)}
                aria-label={`Chỉnh sửa camera ${camera.cameraName || camera.id}`}
              />
            </Tooltip>
            <Tooltip title="Dừng phiên live stream của camera">
              <Button
                type="text"
                danger
                icon={<DisconnectOutlined />}
                loading={
                  stopLiveStream.isPending &&
                  stopLiveStream.variables === camera.id
                }
                onClick={() => stopLiveStream.mutate(camera.id)}
                aria-label={`Dừng live stream ${camera.cameraName || camera.id}`}
              />
            </Tooltip>
            <Popconfirm
              title="Bạn có chắc chắc muốn xóa camera này?"
              description={`${camera.cameraName || camera.cameraCode} — hành động này không thể hoàn tác.`}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => deleteCamera.mutate(camera.id)}
            >
              <Tooltip title="Xóa camera">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  loading={
                    deleteCamera.isPending &&
                    deleteCamera.variables === camera.id
                  }
                  aria-label={`Xóa camera ${camera.cameraName || camera.id}`}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [
      deleteCamera,
      openEditModal,
      stopLiveStream,
    ],
  )

  const hasCameras = cameras.length > 0

  return (
    <div>
      <Flex
        align="flex-start"
        justify="space-between"
        gap={16}
        wrap
        style={{ marginBottom: 20 }}
      >
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Camera toàn cảnh
          </Typography.Title>
          <Typography.Text type="secondary">
            Góc nhìn chính diện bao quát toàn bộ bốn tầng kệ
          </Typography.Text>
        </div>

        <Space size={8} wrap>
          <Tag icon={<CameraOutlined />} color="default">
            {hasCameras ? `${cameras.length} camera` : 'Chưa có camera'}
          </Tag>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void refetch()}
            loading={isFetching && !isLoading}
          >
            Tải lại
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Thêm Camera mới
          </Button>
        </Space>
      </Flex>

      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
        <Space.Compact>
          <Button
            type={statusFilter === undefined ? 'primary' : 'default'}
            onClick={() => setStatusFilter(undefined)}
          >
            Tất cả
          </Button>
          {CAMERA_STATUSES.map((status) => (
            <Button
              key={status}
              type={statusFilter === status ? 'primary' : 'default'}
              onClick={() => setStatusFilter(status)}
            >
              {STATUS_META[status].label}
            </Button>
          ))}
        </Space.Compact>
      </Flex>

      {isError ? (
        <Alert
          type="error"
          showIcon
          message="Không tải được danh sách camera."
          description={error?.message ?? 'Lỗi không xác định.'}
          action={
            <Button size="small" onClick={() => void refetch()}>
              Thử lại
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      ) : (
        <Card styles={{ body: { padding: 0 } }}>
          <Table<Camera>
            rowKey={(record, index) =>
              `cam-${record.id || record.cameraCode || `idx-${index}`}`
            }
            columns={columns}
            dataSource={cameras}
            loading={isLoading || isFetching}
            scroll={{ x: 1100 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    statusFilter
                      ? `Không có camera ${STATUS_META[statusFilter].label.toLowerCase()}`
                      : 'Chưa đăng ký camera nào'
                  }
                >
                  <EyeOutlined style={{ fontSize: 24, color: '#bfbfbf' }} />
                </Empty>
              ),
            }}
            pagination={false}
          />
        </Card>
      )}

      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Số tầng đang theo dõi: {tiers.length}
      </Typography.Text>

      <CameraFormModal
        open={isModalOpen}
        camera={editingCamera}
        onCancel={() => setModalOpen(false)}
      />

      <CameraStreamModal
        open={streamingCamera !== null}
        camera={streamingCamera}
        onClose={() => setStreamingCamera(null)}
      />
    </div>
  )
}