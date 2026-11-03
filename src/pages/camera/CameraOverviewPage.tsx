import '../../styles/media-industrial.css'
import { useMemo, useState } from 'react'
import {
  CameraOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { Flex, Space, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { CameraStreamModal } from '../../features/cameras/components/CameraStreamModal'
import { useCameras } from '../../features/cameras/hooks/useCameras'
import {
  CAMERA_STATUSES,
  type Camera,
  type CameraStatus,
} from '../../types/camera.types'
import {
  ActionButton,
  DataTable,
  MetadataBadge,
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
 * Live dùng ImouPlayer + KitToken (`GET /api/cameras/{id}/imou-player-token`).
 *
 * ⚠ **CHỈ XEM (Giai đoạn 5)**: Admin web chỉ xem danh sách camera và xem
 * live stream Imou. Đã gỡ toàn bộ nút Thêm / Sửa / Xoá camera (và modal
 * `CameraFormModal`) — việc đăng ký / cấu hình camera thuộc nhân viên (staff).
 */
export function CameraOverviewPage() {
  const [statusFilter, setStatusFilter] = useState<CameraStatus | undefined>()
  const [streamingCamera, setStreamingCamera] = useState<Camera | null>(null)

  const camerasQuery = useCameras(
    statusFilter ? { status: statusFilter } : {},
  )

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
          const meta = STATUS_META[status] ?? {
            tone: 'neutral' as const,
            label: status,
          }

          return <StatusBadge tone={meta.tone} label={meta.label} />
        },
      },
      {
        // ⚠ Cột hành động CHỈ có nút xem live stream — không có
        // Thêm / Sửa / Xoá (chế độ chỉ xem của Admin).
        title: 'Hành động',
        key: 'actions',
        width: 150,
        align: 'right',
        render: (_: unknown, camera: Camera) => (
          <Space size={0}>
            <ActionButton
              icon={<PlayCircleOutlined />}
              label="Xem live stream"
              description={`Xem trực tiếp ${camera.cameraName || camera.cameraCode}`}
              variant="text"
              onClick={() => setStreamingCamera(camera)}
            />
          </Space>
        ),
      },
    ],
    [],
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
        description="Góc nhìn chính diện bao quét toàn bộ bốn tầng kệ"
        actions={
          <Space size={8} wrap>
            <MetadataBadge icon={<EyeOutlined />} label="Chỉ xem" />
            <ActionButton
              icon={<ReloadOutlined />}
              label="Tải lại"
              description="Tải lại danh sách camera từ máy chủ."
              variant="default"
              size="small"
              loading={isFetching && !isLoading}
              onClick={() => void refetch()}
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
        rowKey={(record) =>
          `cam-${record.id || record.cameraCode || 'unknown'}`
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
            : 'Nhân viên vận hành đăng ký camera Imou để theo dõi toàn cảnh nhà trồng.'
        }
      />

      <CameraStreamModal
        open={streamingCamera !== null}
        camera={streamingCamera}
        onClose={() => setStreamingCamera(null)}
      />
    </div>
  )
}
