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
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { useSettingStore } from '../../../stores/setting.store'
import type { MushroomThresholdProfile } from '../../../types/setting.types'

interface ThresholdProfileTabProps {
  canEdit: boolean
  visibleMushroomTypes?: string[]
  onAdd: () => void
  onEdit: (profile: MushroomThresholdProfile) => void
}

/**
 * Ô hiển thị một dải min–max.
 *
 * `null` ở cả hai đầu → giống nấm **không đặt ngưỡng** cho chỉ số này
 * (không phải thiếu dữ liệu) → hiện "—".
 */
function RangeCell({
  min,
  max,
  unit,
  color,
}: {
  min: number | null
  max: number | null
  unit: string
  color: string
}) {
  if (min == null && max == null) {
    return <Typography.Text type="secondary">—</Typography.Text>
  }

  return (
    <Tag color={color} style={{ fontWeight: 500 }}>
      {min ?? '—'} – {max ?? '—'} {unit}
    </Tag>
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
            {profile.isDefault && <Tag color="gold">Mặc định</Tag>}
            <Tag color="cyan">Gói {profile.cycleWeeks ?? 1} tuần</Tag>
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
      width: 150,
      render: (_, profile) => (
        <RangeCell
          min={profile.tempMin}
          max={profile.tempMax}
          unit="°C"
          color="red"
        />
      ),
    },
    {
      title: 'Độ ẩm (%)',
      key: 'humidity',
      width: 140,
      render: (_, profile) => (
        <RangeCell
          min={profile.humidityMin}
          max={profile.humidityMax}
          unit="%"
          color="blue"
        />
      ),
    },
    {
      title: 'CO₂ (ppm)',
      key: 'co2',
      width: 160,
      render: (_, profile) => (
        <RangeCell
          min={profile.co2Min}
          max={profile.co2Max}
          unit="ppm"
          color="gold"
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
          color="green"
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
            width: 190,
            align: 'right' as const,
            render: (_: unknown, profile: MushroomThresholdProfile) => (
              <Space size={4}>
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<EditOutlined />}
                  onClick={() => onEdit(profile)}
                >
                  Sửa
                </Button>
                <Tooltip
                  title={
                    profile.isDefault
                      ? 'Đang là hồ sơ mặc định'
                      : 'Đặt làm mặc định'
                  }
                >
                  <Button
                    size="small"
                    type="text"
                    icon={
                      profile.isDefault ? (
                        <StarFilled style={{ color: '#d97706' }} />
                      ) : (
                        <StarOutlined />
                      )
                    }
                    disabled={profile.isDefault}
                    onClick={() => {
                      setDefaultProfile(profile.id)
                      message.success('Đã đặt hồ sơ làm mặc định.')
                    }}
                  />
                </Tooltip>
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
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={profile.isDefault}
                    aria-label="Xóa hồ sơ vi khí hậu"
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
            <Tag color="success" style={{ margin: '0 4px' }}>
              AUTO
            </Tag>
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
