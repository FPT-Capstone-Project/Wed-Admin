import { useMemo } from 'react'
import {
  ExperimentOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { Card, Flex, Space, Tag, Typography } from 'antd'
import { useAuthStore } from '../../features/auth/store/auth.store'
import { useCultivationStore } from '../../stores/cultivation.store'
import { useRoomStore } from '../../stores/room.store'
import { getCustomerTrayIds } from '../../features/rooms/utils/tray-customer.utils'
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
 */
export function SettingsPage() {
  const authUser = useAuthStore((state) => state.user)
  const tiers = useRoomStore((state) => state.tiers)
  const batches = useCultivationStore((state) => state.batches)

  const role = normalizeRole(authUser?.role)
  const isAdmin = role === 'ADMIN'

  const visibleMushroomTypes = useMemo(() => {
    if (!authUser || role !== 'CUSTOMER') {
      return undefined
    }

    const assignedTrayIds = getCustomerTrayIds(tiers, authUser.fullName)

    return [
      ...new Set(
        batches
          .filter((batch) => assignedTrayIds.includes(batch.trayId))
          .map((batch) => batch.mushroomType),
      ),
    ]
  }, [authUser, batches, role, tiers])

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
            Theo dõi dải thông số nhiệt độ, độ ẩm và ẩm giá thể chuẩn
            đang áp dụng cho từng giống nấm.
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
          <Tag icon={<EyeOutlined />} color="default">
            Chỉ xem
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
        <ThresholdProfileTab visibleMushroomTypes={visibleMushroomTypes} />
      </Card>
    </div>
  )
}
