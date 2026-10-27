import { useMemo } from 'react'
import { EyeOutlined } from '@ant-design/icons'
import {
  Alert,
  Empty,
  Flex,
  Table,
  Tooltip,
  Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { useSettingStore } from '../../../stores/setting.store'
import type { MushroomThresholdProfile } from '../../../types/setting.types'
import type { SemanticTone } from '../../../app/theme/tokens'
import { StatusBadge } from '../../../shared/ui'

interface ThresholdProfileTabProps {
  visibleMushroomTypes?: string[]
}

/**
 * Ô hiển thị một dải min–max chuẩn hoá bằng StatusBadge.
 *
 * `null` ở cả hai đầu → giống nấm **không đặt ngưỡng** cho chỉ số này
 * (không phải thiếu dữ liệu) → hiện "—".
 */
function RangeCell({
  min,
  max,
  unit,
  tone,
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
    <StatusBadge
      tone={tone}
      label={`${min ?? '—'} – ${max ?? '—'} ${unit}`}
    />
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
 */
export function ThresholdProfileTab({
  visibleMushroomTypes,
}: ThresholdProfileTabProps) {
  const profiles = useSettingStore((state) => state.thresholdProfiles)

  const visibleProfiles = useMemo(
    () =>
      visibleMushroomTypes
        ? profiles.filter((profile) =>
            visibleMushroomTypes.includes(profile.mushroomType),
          )
        : profiles,
    [profiles, visibleMushroomTypes],
  )

  const columns: TableColumnsType<MushroomThresholdProfile> = [
    {
      title: 'Tên giống nấm',
      dataIndex: 'mushroomType',
      key: 'mushroomType',
      width: 220,
      render: (value: string, profile) => (
        <Flex vertical gap={4}>
          <Typography.Text strong>{value}</Typography.Text>
          <Flex gap={4} wrap>
            {profile.isDefault && <StatusBadge tone="warning" label="Mặc định" />}
            <StatusBadge tone="info" label={`Gói ${profile.cycleWeeks ?? 1} tuần`} />
          </Flex>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {profile.name}
          </Typography.Text>
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
      title: 'Ẩm giá thể (%)',
      key: 'soilMoisture',
      width: 160,
      render: (_, profile) => (
        <RangeCell
          min={profile.soilMoistureMin}
          max={profile.soilMoistureMax}
          unit="%"
          tone="ok"
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
        style={{ marginBottom: 16, borderRadius: 10 }}
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
            Dải nhiệt độ, độ ẩm và ẩm giá thể áp dụng cho relay AUTO và
            cảnh báo cảm biến
          </Typography.Text>
        </div>

        <StatusBadge
          tone="neutral"
          label="Chỉ xem — nhân viên thiết lập trên mobile app"
        />
      </Flex>

      <Table<MushroomThresholdProfile>
        rowKey="id"
        columns={columns}
        dataSource={visibleProfiles}
        pagination={false}
        scroll={{ x: 1140 }}
        locale={{
          emptyText: <Empty description="Không có hồ sơ phù hợp" />,
        }}
      />
    </div>
  )
}
