import { formatDate } from '../../../shared/utils/date'
import '../../../styles/reports-users-industrial.css'
import { StatusBadge, MetadataBadge } from '../../../shared/ui'
import {
  CloseCircleOutlined,
  ExperimentOutlined,
  EyeOutlined,
  MailOutlined,
  PhoneOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Flex,
  Skeleton,
  Space,
  Statistic,
  Typography,
} from 'antd'
import { useState } from 'react'
import { useAuthStore } from '../../../features/auth/store/auth.store'
import { useUser } from '../../../features/users/hooks/useUsers'
import {
  getRoleLabel,
  USER_STATUS_CONFIG,
} from '../../../features/users/user-status.config'
import type { UserWithRole } from '../../../types/user.types'
import { SendResetOtpModal } from './SendResetOtpModal'

interface UserDetailDrawerProps {
  userId: number | null
  /** Row đang mở trong bảng — hiển thị ngay trong lúc chờ detail fetch. */
  user: UserWithRole | null
  onClose: () => void
}


/**
 * Drawer chi tiết tài khoản — **CHỈ XEM**.
 *
 * Nạp `GET /api/users/{userId}` để có `order_count` / `cultivation_session_count`
 * — hai số này chỉ có ở schema `UserAccountDetail`, endpoint list không trả về.
 *
 * ⚠ Chế độ chỉ xem: không có nút khoá / mở khoá tài khoản, không có nút tạo
 * mới. Mọi thao tác ghi về tài khoản do **nhân viên (staff)** thực hiện
 * trên mobile app — web admin chỉ theo dõi.
 */
export function UserDetailDrawer({
  userId,
  user,
  onClose,
}: UserDetailDrawerProps) {
  const currentUserId = useAuthStore((state) => state.user?.id)
  const { data: detail, isLoading, isError } = useUser(userId)
  const [isResetOtpOpen, setIsResetOtpOpen] = useState(false)

  // Ưu tiên detail (đầy đủ hơn), fallback về row của bảng để UI không nháy trắng.
  const profile = detail ?? user
  const status = profile?.status
  const isSelf = currentUserId !== undefined && currentUserId === profile?.user_id

  return (
    <>
      <Drawer rootClassName="mcms-user-drawer"
        title={
          <Flex vertical align="flex-start" gap={2}>
            <Typography.Text strong>
              {profile?.full_name ?? `Tài khoản #${userId ?? '—'}`}
            </Typography.Text>
            {status && (
              <StatusBadge tone={status === 'ACTIVE' ? 'ok' : status === 'BLOCKED' ? 'danger' : 'muted'} label={<>
                {USER_STATUS_CONFIG[status]?.label ?? status}
              </>} />
            )}
          </Flex>
        }
        size={560}
        open={userId !== null}
        onClose={onClose}
        destroyOnHidden
        extra={
          <MetadataBadge
            icon={<EyeOutlined />}
            label="Chỉ xem"
          />
        }
      >
        {isLoading && !detail ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : isError || !profile ? (
          <Flex vertical align="center" gap={8} style={{ padding: 32 }}>
            <Typography.Text type="danger">
              Không tải được chi tiết tài khoản.
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Có thể tài khoản không tồn tại hoặc bạn không có quyền xem.
            </Typography.Text>
          </Flex>
        ) : (
          <Flex vertical gap={20}>
            {isSelf && (
              <Alert
                type="info"
                showIcon
                message="Đây là tài khoản bạn đang đăng nhập — không thể tự khoá."
              />
            )}

            <Flex gap={24} wrap>
              <Statistic
                title="Số đơn hàng"
                value={detail?.order_count ?? 0}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ fontSize: 24 }}
              />
              <Statistic
                title="Số phiên canh tác"
                value={detail?.cultivation_session_count ?? 0}
                prefix={<ExperimentOutlined />}
                valueStyle={{ fontSize: 24 }}
              />
            </Flex>

            <Descriptions
              column={1}
              bordered
              size="small"
              items={[
                {
                  key: 'userId',
                  label: 'Mã tài khoản',
                  children: (
                    <Typography.Text code>#{profile.user_id}</Typography.Text>
                  ),
                },
                {
                  key: 'email',
                  label: 'Email',
                  children: (
                    <Typography.Text>
                      <MailOutlined /> {profile.email}
                    </Typography.Text>
                  ),
                },
                {
                  key: 'phone',
                  label: 'Số điện thoại',
                  children: profile.phone ? (
                    <Typography.Text>
                      <PhoneOutlined /> {profile.phone}
                    </Typography.Text>
                  ) : (
                    <Typography.Text type="secondary">—</Typography.Text>
                  ),
                },
                {
                  key: 'address',
                  label: 'Địa chỉ',
                  children: profile.address ? (
                    profile.address
                  ) : (
                    <Typography.Text type="secondary">—</Typography.Text>
                  ),
                },
                {
                  key: 'role',
                  label: 'Vai trò',
                  children: (
                    <Space direction="vertical" size={2}>
                      <MetadataBadge label={<>
                        {getRoleLabel(profile.role_id, profile.role_name)}
                      </>} />
                      {profile.role_description && (
                        <Typography.Text
                          type="secondary"
                          style={{ fontSize: 12 }}
                        >
                          {profile.role_description}
                        </Typography.Text>
                      )}
                    </Space>
                  ),
                },
                {
                  key: 'createdAt',
                  label: 'Ngày tạo',
                  children: formatDate(profile.created_at),
                },
                {
                  key: 'updatedAt',
                  label: 'Cập nhật lần cuối',
                  children: formatDate(profile.updated_at),
                },
              ]}
            />

            <Button
              icon={<CloseCircleOutlined />}
              onClick={() => setIsResetOtpOpen(true)}
              style={{ alignSelf: 'flex-start' }}
            >
              Gửi mã đặt lại mật khẩu
            </Button>
          </Flex>
        )}
      </Drawer>

      <SendResetOtpModal
        open={isResetOtpOpen}
        user={profile}
        onCancel={() => setIsResetOtpOpen(false)}
      />
    </>
  )
}
