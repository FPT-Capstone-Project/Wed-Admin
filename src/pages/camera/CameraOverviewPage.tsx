import '../../styles/media-industrial.css'
import { CameraRegistrationButton, CameraRowActions, LiveSessionManager } from '../../features/cameras/components/CameraAdministration'
import { Suspense, useMemo, useState } from 'react'
import {
  CameraOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { Flex, Skeleton, Space, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { CameraStreamModal } from '../../app/router/lazy-modals'
import { useCameras } from '../../features/cameras/hooks/useCameras'
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
import { CAMERA_STATUS_DICTIONARY } from '../../shared/i18n/status/camera'
import { presentStatus, statusLabel } from '../../shared/i18n/status/registry'



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
        render: (status: CameraStatus) => (
          <StatusBadge {...presentStatus(CAMERA_STATUS_DICTIONARY, status)} />
        ),
      },
      {
        title: 'Hành động',
        key: 'actions',
        width: 150,
        align: 'right',
        render: (_: unknown, camera: Camera) => (
          <Space size={8} wrap>
            <CameraRowActions camera={camera} />
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
            <CameraRegistrationButton /><LiveSessionManager />
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
            label={statusLabel(CAMERA_STATUS_DICTIONARY, status)}
            variant={statusFilter === status ? 'primary' : 'default'}
            size="middle"
            onClick={() => setStatusFilter(status)}
          />
        ))}
      </Flex>

      {isLoading && !camerasQuery.data ? <Skeleton active paragraph={{ rows: 8 }} /> : <DataTable<Camera>
        rowKey={(record) =>
          `cam-${record.id || record.cameraCode || 'unknown'}`
        }
        columns={columns}
        dataSource={cameras}
        loading={isLoading}
        isFetching={isFetching}
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
            ? `Không có camera ${statusLabel(CAMERA_STATUS_DICTIONARY, statusFilter).toLowerCase()}`
            : 'Chưa đăng ký camera nào'
        }
        emptyDescription={
          statusFilter
            ? 'Thử chọn trạng thái khác hoặc tải lại danh sách camera.'
            : 'Đăng ký camera Imou để theo dõi toàn cảnh nhà trồng.'
        }
      />}

      {/*
        ⚠ `CameraStreamModal` được lazy-load (xem `app/router/lazy-modals.ts`)
        ⇒ code modal + ImouPlayer SDK chỉ nạp khi modal mở lần đầu.
        `Suspense` bọc quanh vì component là `React.lazy`.
      */}
      <Suspense fallback={null}>
        <CameraStreamModal
          open={streamingCamera !== null}
          camera={streamingCamera}
          onClose={() => setStreamingCamera(null)}
        />
      </Suspense>
    </div>
  )
}
