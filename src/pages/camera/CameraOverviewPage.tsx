import { useCallback, useMemo, useState } from 'react'
import {
  CameraOutlined,
  DeleteOutlined,
  DisconnectOutlined,
  EditOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { App, Flex, Popconfirm, Space, Typography } from 'antd'
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
import {
  ActionButton,
  DataTable,
  PageHeader,
  StatCard,
  StatusBadge,
} from '../../shared/ui'
import type { SemanticTone } from '../../app/theme/tokens'

const STATUS_META: Record<
  CameraStatus,
  { tone: SemanticTone; label: string }
> = {
  ACTIVE: { tone: 'ok', label: 'Hoạt động' },
  INACTIVE: { tone: 'muted', label: 'Ngừng' },
  OFFLINE: { tone: 'danger', label: 'Mất kết nối' },
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
        render: (name: string) => name || '—',
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
          const meta = STATUS_META[status] ?? { tone: 'neutral' as const, label: status }

          return <StatusBadge tone={meta.tone} label={meta.label} />
        },
      },
      {
        title: 'Hành động',
        key: 'actions',
        width: 200,
        align: 'right',
        render: (_: unknown, camera: Camera) => (          <Space size={0}>
            <ActionButton
              icon={<PlayCircleOutlined />}
              label="Xem live stream"
              description={`Xem trực tiếp ${camera.cameraName || camera.cameraCode}`}
              variant="text"
              onClick={() => setStreamingCamera(camera)}
            />
            <ActionButton
              icon={<EditOutlined />}
              label="Chỉnh sửa camera"
              description={`Chỉnh sửa ${camera.cameraName || camera.cameraCode}`}
              variant="text"
              onClick={() => openEditModal(camera)}
            />
            <ActionButton
              icon={<DisconnectOutlined />}
              label="Dừng live stream"
              description={`Dừng phiên live của ${camera.cameraName || camera.cameraCode}`}
              variant="text"
              loading={
                stopLiveStream.isPending &&
                stopLiveStream.variables === camera.id
              }
              onClick={() => stopLiveStream.mutate(camera.id)}
            />
            <Popconfirm
              title="Bạn có chắc chắn muốn xóa camera này?"
              description={`${camera.cameraName || camera.cameraCode} — hành động này không thể hoàn tác.`}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => deleteCamera.mutate(camera.id)}
            >
              <ActionButton
                icon={<DeleteOutlined />}
                label="Xóa camera"
                description={`Xóa ${camera.cameraName || camera.cameraCode}`}
                variant="dangerText"
                loading={
                  deleteCamera.isPending &&
                  deleteCamera.variables === camera.id
                }
              />
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

  const statusCounts = useMemo(() => {
    const counts: Record<CameraStatus, number> = {
      ACTIVE: 0,
      INACTIVE: 0,
      OFFLINE: 0,
    }
    cameras.forEach((camera) => {
      if (counts[camera.status] !== undefined) {
        counts[camera.status] += 1
      }
    })
    return counts
  }, [cameras])

  return (
    <div>
      <PageHeader
        title="Camera toàn cảnh"
        description="Góc nhìn chính diện bao quát toàn bộ bốn tầng kệ"
        actions={
          <Space size={8} wrap>
            <ActionButton
              icon={<ReloadOutlined />}
              label="Tải lại"
              description="Tải lại danh sách camera từ máy chủ."
              variant="default"
              size="middle"
              loading={isFetching && !isLoading}
              onClick={() => void refetch()}
            />
            <ActionButton
              icon={<PlusOutlined />}
              label="Thêm camera mới"
              description="Đăng ký một camera Imou mới."
              variant="primary"
              size="middle"
              onClick={openCreateModal}
            />
          </Space>
        }
      />

      <Flex gap={12} wrap style={{ marginBottom: 'var(--mcms-space-5)' }}>
        <StatCard
          title="Tổng camera"
          value={cameras.length}
          tone="neutral"
          icon={<CameraOutlined />}
          description="Camera đã đăng ký trong hệ thống"
        />
        <StatCard
          title="Hoạt động"
          value={statusCounts.ACTIVE}
          tone="ok"
          highlightValue
          description="Camera đang phát luồng bình thường"
        />
        <StatCard
          title="Ngừng"
          value={statusCounts.INACTIVE}
          tone="muted"
          description="Camera tạm ngưng sử dụng"
        />
        <StatCard
          title="Mất kết nối"
          value={statusCounts.OFFLINE}
          tone="danger"
          highlightValue
          description="Camera không phản hồi từ Imou cloud"
        />
      </Flex>

      <Flex gap={8} wrap style={{ marginBottom: 'var(--mcms-space-4)' }}>
        <ActionButton
          icon={<CameraOutlined />}
          label="Tất cả"
          variant={statusFilter === undefined ? 'primary' : 'default'}
          size="middle"
          onClick={() => setStatusFilter(undefined)}
        />
        {CAMERA_STATUSES.map((status) => (
          <ActionButton
            key={status}
            icon={<CameraOutlined />}
            label={STATUS_META[status].label}
            variant={statusFilter === status ? 'primary' : 'default'}
            size="middle"
            onClick={() => setStatusFilter(status)}
          />
        ))}
      </Flex>

      <DataTable<Camera>
        rowKey={(record, index) =>
          `cam-${record.id || record.cameraCode || `idx-${index}`}`
        }
        columns={columns}
        dataSource={cameras}
        loading={isLoading || isFetching}
        error={
          isError
            ? {
                message:
                  error?.message ??
                  'Đã xảy ra lỗi không xác định khi tải danh sách camera.',
              }
            : null
        }
        onRetry={() => void refetch()}
        scrollX={1100}
        emptyTitle={
          statusFilter
            ? `Không có camera ${STATUS_META[statusFilter].label.toLowerCase()}`
            : 'Chưa đăng ký camera nào'
        }
        emptyDescription={
          statusFilter
            ? 'Thử chọn trạng thái khác hoặc tải lại danh sách camera.'
            : 'Đăng ký camera Imou để theo dõi toàn cảnh nhà trồng.'
        }
        emptyAction={
          <ActionButton
            icon={<PlusOutlined />}
            label="Thêm camera mới"
            variant="primary"
            onClick={openCreateModal}
          />
        }
      />

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
