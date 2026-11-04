import { PageHeader } from '../../shared/ui/PageHeader'
import { useMemo } from 'react'
import {
  EyeOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { Card, Space } from 'antd'
import { MetadataBadge } from '../../shared/ui'
import { useAuthStore } from '../../features/auth/store/auth.store'
import { useCustomerMushroomTypeIds } from '../../features/settings/hooks/useCustomerMushroomTypeIds'
import { useThresholdProfiles } from '../../features/settings/hooks/useThresholdProfiles'
import { ThresholdProfileTab } from './components/ThresholdProfileTab'

function normalizeRole(role: string | undefined) {
  const normalizedRole = role?.toUpperCase()
  return normalizedRole === 'FARM_MANAGER' ? 'OPERATOR' : normalizedRole
}

/**
 * Trang "Hồ sơ Vi khí hậu" — **CHỈ XEM** trên web admin.
 *
 * ⚠ Đặt / sửa / xoá ngưỡng vi khí hậu là thao tác nhạy cảm, dành cho **nhân
 * viên (staff)** thực hiện trên mobile app (permission `iot.automation.manage`
 * ở BE). Admin web chỉ theo dõi dải ngưỡng đang áp dụng.
 *
 * Vì vậy trang này:
 *   - không render modal nhập liệu (`ThresholdProfileModal`),
 *   - không có nút thêm / sửa / xoá hồ sơ.
 *
 * ⚠ Nguồn dữ liệu: **Database** (không dùng mock store).
 *   - Hồ sơ + tên giống nấm → `useThresholdProfiles` (join
 *     `mushroom_types` × `mushroom_conditions`).
 *   - Lọc theo khách hàng   → `useCustomerMushroomTypeIds` (đơn của chính
 *     khách đang đăng nhập → `items[].mushroom_type_id`).
 */
export function SettingsPage() {
  const authUser = useAuthStore((state) => state.user)

  const role = normalizeRole(authUser?.role)
  const isAdmin = role === 'ADMIN'
  const isCustomer = role === 'CUSTOMER'

  // Chỉ khách hàng mới bị giới hạn theo vụ thuê của mình.
  const customerMushroomTypeIds = useCustomerMushroomTypeIds(isCustomer)

  const { data: profiles = [] } = useThresholdProfiles()

  const visibleMushroomTypeIds = useMemo(
    () =>
      isCustomer ? new Set(customerMushroomTypeIds) : null,
    [customerMushroomTypeIds, isCustomer],
  )

  return (
    <div>
      <PageHeader title="Hồ sơ Vi khí hậu & Ngưỡng AUTO" description="Theo dõi dải thông số nhiệt độ và độ ẩm chuẩn đang áp dụng cho từng giống nấm." actions={<Space wrap>
          <MetadataBadge
            icon={<SafetyCertificateOutlined />}
            label={isAdmin
              ? 'ADMIN · Chỉ xem'
              : role === 'OPERATOR'
                ? 'OPERATOR · Chỉ xem'
                : 'CUSTOMER · Chỉ xem'}
          />
          <MetadataBadge icon={<EyeOutlined />} label="Chỉ xem" />
        </Space>} />

      <Card
        style={{
          borderRadius: 6,
          borderColor: 'var(--mcms-border)',
          background: 'var(--mcms-surface)',
        }}
        styles={{ body: { padding: 20 } }}
      >
        <ThresholdProfileTab
          visibleMushroomTypeIds={visibleMushroomTypeIds}
          profileCount={profiles.length}
        />
      </Card>
    </div>
  )
}
