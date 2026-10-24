import { useMemo, useState } from 'react'
import {
  BulbOutlined,
  ExperimentOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { Card, Flex, Space, Tag, Typography, message } from 'antd'
import { useAuthStore } from '../../features/auth/store/auth.store'
import { useTenantStore } from '../../features/tenants/store/tenant.store'
import { useCultivationStore } from '../../stores/cultivation.store'
import { useSettingStore } from '../../stores/setting.store'
import { ThresholdProfileModal } from './components/ThresholdProfileModal'
import { ThresholdProfileTab } from './components/ThresholdProfileTab'
import type {
  MushroomThresholdProfile,
  ThresholdProfileInput,
} from '../../types/setting.types'

function normalizeRole(role: string | undefined) {
  const normalizedRole = role?.toUpperCase()
  return normalizedRole === 'FARM_MANAGER' ? 'OPERATOR' : normalizedRole
}

export function SettingsPage() {
  const authUser = useAuthStore((state) => state.user)
  const tenants = useTenantStore((state) => state.tenants)
  const batches = useCultivationStore((state) => state.batches)
  const addProfile = useSettingStore((state) => state.addThresholdProfile)
  const updateProfile = useSettingStore(
    (state) => state.updateThresholdProfile,
  )

  const role = normalizeRole(authUser?.role)
  const isAdmin = role === 'ADMIN'
  const canEditThresholds = isAdmin || role === 'OPERATOR'

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [editingProfile, setEditingProfile] =
    useState<MushroomThresholdProfile | null>(null)

  const visibleMushroomTypes = useMemo(() => {
    if (!authUser || role !== 'CUSTOMER') {
      return undefined
    }

    const assignedTrayIds = tenants
      .filter((tenant) => tenant.name === authUser.fullName)
      .map((tenant) => tenant.assignedTrayId)

    return [
      ...new Set(
        batches
          .filter((batch) => assignedTrayIds.includes(batch.trayId))
          .map((batch) => batch.mushroomType),
      ),
    ]
  }, [authUser, batches, role, tenants])

  const handleAddProfile = () => {
    setEditingProfile(null)
    setIsProfileModalOpen(true)
  }

  const handleEditProfile = (profile: MushroomThresholdProfile) => {
    setEditingProfile(profile)
    setIsProfileModalOpen(true)
  }

  const handleProfileSubmit = async (values: ThresholdProfileInput) => {
    await new Promise((resolve) => window.setTimeout(resolve, 300))

    if (editingProfile) {
      updateProfile(editingProfile.id, values)
      message.success('Đã cập nhật profile ngưỡng vi khí hậu.')
    } else {
      addProfile(values)
      message.success('Đã thêm profile giống nấm.')
    }

    setIsProfileModalOpen(false)
    setEditingProfile(null)
  }

  return (
    <div>
      <Flex
        align="center"
        justify="space-between"
        gap={16}
        wrap
        style={{ marginBottom: 20 }}
      >
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            <ExperimentOutlined /> Hồ sơ Vi khí hậu &amp; Ngưỡng AUTO
          </Typography.Title>
          <Typography.Text type="secondary">
            Thiết lập dải thông số nhiệt độ, độ ẩm, CO₂ và ẩm giá thể chuẩn
            cho từng giống nấm để áp dụng tự động cho các tầng nuôi trồng.
          </Typography.Text>
        </div>

        <Space wrap>
          <Tag
            icon={<SafetyCertificateOutlined />}
            color={isAdmin ? 'success' : 'default'}
          >
            {isAdmin
              ? 'ADMIN · Toàn quyền'
              : role === 'OPERATOR'
                ? 'OPERATOR · Chỉnh ngưỡng'
                : 'CUSTOMER · Chỉ xem'}
          </Tag>
          <Tag icon={<BulbOutlined />} color="processing">
            Chế độ AUTO
          </Tag>
        </Space>
      </Flex>

      <Card
        style={{
          borderRadius: 12,
          borderColor: '#e5e7eb',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)',
        }}
        styles={{ body: { padding: 20 } }}
      >
        <ThresholdProfileTab
          canEdit={canEditThresholds}
          visibleMushroomTypes={visibleMushroomTypes}
          onAdd={handleAddProfile}
          onEdit={handleEditProfile}
        />
      </Card>

      {canEditThresholds && (
        <ThresholdProfileModal
          open={isProfileModalOpen}
          initialValues={editingProfile ?? undefined}
          onCancel={() => {
            setIsProfileModalOpen(false)
            setEditingProfile(null)
          }}
          onSubmit={handleProfileSubmit}
        />
      )}
    </div>
  )
}
