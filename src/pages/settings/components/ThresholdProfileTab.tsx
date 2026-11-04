import { useMemo } from 'react'
import { EyeOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Empty,
  Flex,
  Tooltip,
  Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { useThresholdProfiles } from '../../../features/settings/hooks/useThresholdProfiles'
import type { MushroomThresholdProfile } from '../../../types/setting.types'
import type { SemanticTone } from '../../../app/theme/tokens'
import { DataTable, MetadataBadge, StatusBadge } from '../../../shared/ui'

interface ThresholdProfileTabProps {
  /**
   * Chỉ hiển thị các hồ sơ của những giống nấm trong tập id này.
   *
   * ⚠ Lọc theo **id** (`mushroom_type_id`), KHÔNG theo tên — tên là dữ liệu
   *   người dùng tự nhập trong DB nên so khớp chuỗi rất dễ vỡ.
   *
   * `null` = không lọc (admin / operator xem toàn bộ).
   */
  visibleMushroomTypeIds?: Set<number> | null
  /** Tổng số hồ sơ trong hệ thống (dùng cho thông báo). */
  profileCount?: number
}

/**
 * Ô hiển thị một dải min–max chuẩn hoá bằng StatusBadge.
 *
 * `null` ở cả hai đầu → giống nấm **chưa đặt ngưỡng** cho chỉ số này
 * (không phải thiếu dữ liệu) → hiện "—".
 */
function RangeCell({
  min,
  max,
  unit,
}: {
  min: number | null
  max: number | null
  unit: string
  tone: SemanticTone
}) {
  if (min == null && max == null) {
    return <Typography.Text type="secondary">—</Typography.Text>
  }

  return (
    <div style={{
      display: 'grid', gap: 4, padding: '6px 8px',
      border: '1px solid var(--mcms-border)', borderRadius: 6,
      background: 'var(--mcms-surface)',
      fontFamily: 'var(--mcms-font-mono)',
      fontVariantNumeric: 'tabular-nums', fontSize: 12,
    }}>
      <span><span style={{ color: 'var(--mcms-text-muted)' }}>Min </span>{min ?? '—'} {unit}</span>
      <span><span style={{ color: 'var(--mcms-text-muted)' }}>Max </span>{max ?? '—'} {unit}</span>
    </div>
  )
}

/**
 * Bảng hồ sơ vi khí hậu — **CHỈ XEM**.
 *
 * ⚠ Admin web không được đặt / sửa / xoá ngưỡng. Việc này do nhân viên
 * (staff) thực hiện trên mobile app (`iot.automation.manage`).
 *
 * Vì vậy bảng không có cột "Hành động" và không có nút "Thêm giống nấm" —
 * chỉ hiển thị dải ngưỡng đang áp dụng để admin theo dõi.
 *
 * ⚠ Nguồn dữ liệu: **Database** (qua `useThresholdProfiles`).
 *   - Tên giống nấm → `mushroom_types.name` (nguyên bản, không dịch).
 *   - Dải ngưỡng     → `mushroom_conditions`.
 */
export function ThresholdProfileTab({
  visibleMushroomTypeIds,
  profileCount,
}: ThresholdProfileTabProps) {
  const {
    data: profiles = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useThresholdProfiles()

  const visibleProfiles = useMemo(
    () =>
      visibleMushroomTypeIds
        ? profiles.filter((profile) =>
            visibleMushroomTypeIds.has(profile.mushroomTypeId),
          )
        : profiles,
    [profiles, visibleMushroomTypeIds],
  )

  const columns: TableColumnsType<MushroomThresholdProfile> = [
    {
      title: 'Tên giống nấm',
      dataIndex: 'mushroomType',
      key: 'mushroomType',
      width: 240,
      render: (value: string, profile) => (
        <Flex vertical gap={4}>
          <Typography.Text strong>{value}</Typography.Text>
          <Flex gap={4} wrap>
            <MetadataBadge label={`Gói ${profile.cycleWeeks} tuần`} />
          </Flex>
          {profile.description && (
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {profile.description}
            </Typography.Text>
          )}
        </Flex>
      ),
    },
    {
      title: 'Nhiệt độ (°C)',
      key: 'temperature',
      width: 160,
      render: (_, profile) => (
        <RangeCell
          min={profile.tempMin}
          max={profile.tempMax}
          unit="°C"
          tone="warning"
        />
      ),
    },
    {
      // ⚠ Giai đoạn 0: đã gỡ cột CO₂ — BE / DB không còn `co2_min|max`.
      title: 'Độ ẩm (%)',
      key: 'humidity',
      width: 150,
      render: (_, profile) => (
        <RangeCell
          min={profile.humidityMin}
          max={profile.humidityMax}
          unit="%"
          tone="info"
        />
      ),
    },
    {
      title: 'Cập nhật',
      key: 'updatedAt',
      width: 120,
      render: (_, profile) => (
        <Tooltip title={profile.updatedAt}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {new Date(profile.updatedAt).toLocaleDateString('vi-VN')}
          </Typography.Text>
        </Tooltip>
      ),
    },
  ]

  return (
    <div>
      <Alert
        type="info"
        showIcon
        icon={<EyeOutlined />}
        message={
          <Typography.Text style={{ fontSize: 13 }}>
            <strong>Chế độ chỉ xem:</strong> Các tầng đang bật chế độ{' '}
            <StatusBadge tone="ok" label="AUTO" style={{ margin: '0 4px' }} />
            sẽ tự động đồng bộ theo ngưỡng của giống nấm được gán trên khay.
            Việc đặt / sửa ngưỡng do nhân viên thực hiện trên mobile app.
          </Typography.Text>
        }
        style={{ marginBottom: 16, borderRadius: 6, borderColor: 'var(--mcms-border)', background: 'var(--mcms-surface-muted)' }}
      />

      <Flex
        align="center"
        justify="space-between"
        gap={12}
        wrap
        style={{ marginBottom: 16 }}
      >
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Thông số canh tác theo giống nấm
          </Typography.Title>
          <Typography.Text type="secondary">
            Dải nhiệt độ và độ ẩm áp dụng cho relay AUTO và cảnh báo cảm biến
          </Typography.Text>
        </div>

        <Flex gap={8} align="center" wrap>
          {visibleMushroomTypeIds ? (
            <MetadataBadge
              label={`${visibleProfiles.length}/${profileCount ?? visibleProfiles.length} giống nấm bạn đang thuê`}
            />
          ) : null}
          <MetadataBadge
            label="Chỉ xem — nhân viên thiết lập trên mobile app"
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
      </Flex>

      {isError ? (
        <Empty
          description={
            <Flex vertical align="center" gap={4}>
              <Typography.Text type="danger">
                Không tải được hồ sơ vi khí hậu.
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {error?.message ?? 'Lỗi không xác định.'}
              </Typography.Text>
            </Flex>
          }
        />
      ) : (
        <DataTable<MushroomThresholdProfile>
          rowKey="mushroomTypeId"
          columns={columns}
          dataSource={visibleProfiles}
          loading={isLoading}
          pagination={false}
          scrollX={980}
          emptyTitle="Không có hồ sơ phù hợp"
        />
      )}
    </div>
  )
}
