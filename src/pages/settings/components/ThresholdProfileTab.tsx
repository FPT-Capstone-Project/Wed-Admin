import { useMemo } from 'react'
import {
  BulbOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Empty,
  Flex,
  Popconfirm,
  Space,
  Table,
  Tooltip,
  Typography,
  message,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { useSettingStore } from '../../../stores/setting.store'
import type { MushroomThresholdProfile } from '../../../types/setting.types'
import type { SemanticTone } from '../../../app/theme/tokens'
import { ActionButton, StatusBadge } from '../../../shared/ui'

interface ThresholdProfileTabProps {
  canEdit: boolean
  visibleMushroomTypes?: string[]
  onAdd: () => void
  onEdit: (profile: MushroomThresholdProfile) => void
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

export function ThresholdProfileTab({
  canEdit,
  visibleMushroomTypes,
  onAdd,
  onEdit,
}: ThresholdProfileTabProps) {
  const profiles = useSettingStore((state) => state.thresholdProfiles)
  const setDefaultProfile = useSettingStore(
    (state) => state.setDefaultThresholdProfile,
  )
  const deleteProfile = useSettingStore(
    (state) => state.deleteThresholdProfile,
  )

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
      title: 'CO₂ (ppm)',
      key: 'co2',
      width: 170,
      render: (_, profile) => (
        <RangeCell
          min={profile.co2Min}
          max={profile.co2Max}
          unit="ppm"
          tone="neutral"
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
    ...(canEdit
      ? [
          {
            title: 'Hành động',
            key: 'actions',
            width: 220,
            align: 'right' as const,
            fixed: 'right' as const,
            render: (_: unknown, profile: MushroomThresholdProfile) => (
              <Space size={6}>
                <ActionButton
                  icon={<EditOutlined />}
                  label="Sửa"
                  description={`Sửa hồ sơ ${profile.name}`}
                  onClick={() => onEdit(profile)}
                />

                <ActionButton
                  icon={profile.isDefault ? <StarFilled /> : <StarOutlined />}
                  label={profile.isDefault ? 'Mặc định' : 'Đặt mặc định'}
                  description={
                    profile.isDefault
                      ? 'Đang là hồ sơ mặc định'
                      : 'Đặt làm hồ sơ mặc định'
                  }
                  variant={profile.isDefault ? 'primary' : 'default'}
                  disabled={profile.isDefault}
                  onClick={() => {
                    setDefaultProfile(profile.id)
                    message.success('Đã đặt hồ sơ làm mặc định.')
                  }}
                />

                <Popconfirm
                  title="Xóa hồ sơ vi khí hậu?"
                  description={
                    profile.isDefault
                      ? 'Hồ sơ mặc định không thể xóa.'
                      : 'Thao tác này không thể hoàn tác.'
                  }
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true, disabled: profile.isDefault }}
                  onConfirm={() => {
                    deleteProfile(profile.id)
                    message.success('Đã xóa hồ sơ.')
                  }}
                >
                  <ActionButton
                    icon={<DeleteOutlined />}
                    label="Xóa"
                    description={`Xóa hồ sơ ${profile.name}`}
                    variant="danger"
                    disabled={profile.isDefault}
                  />
                </Popconfirm>
              </Space>
            ),
          } as const,
        ]
      : []),
  ]

  return (
    <div>
      <Alert
        type="info"
        showIcon
        icon={<BulbOutlined />}
        message={
          <Typography.Text style={{ fontSize: 13 }}>
            <strong>Mẹo vận hành:</strong> Các tầng đang bật chế độ{' '}
            <StatusBadge tone="ok" label="AUTO" style={{ margin: '0 4px' }} />
            sẽ tự động đồng bộ theo ngưỡng của giống nấm được gán trên khay.
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
            Dải nhiệt độ, độ ẩm, CO₂ và ẩm giá thể áp dụng cho relay AUTO và
            cảnh báo cảm biến
          </Typography.Text>
        </div>

        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
            Thêm giống nấm
          </Button>
        )}
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
