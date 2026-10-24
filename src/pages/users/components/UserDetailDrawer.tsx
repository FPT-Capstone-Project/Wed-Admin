import {
  CloseCircleOutlined,
  ExperimentOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  ShoppingCartOutlined,
  UnlockOutlined,
} from '@ant-design/icons'
import {
  Alert,
  App,
  Button,
  Descriptions,
  Drawer,
  Flex,
  Popconfirm,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd'
import { useState } from 'react'
import { useAuthStore } from '../../../features/auth/store/auth.store'
import {
  useUser,
  useUpdateUserStatus,
} from '../../../features/users/hooks/useUsers'
import {
  getRoleLabel,
  nextToggleStatus,
  USER_STATUS_CONFIG,
} from '../../../features/users/user-status.config'
import { getApiErrorMessage } from '../../../shared/api/error'
import type { UserWithRole } from '../../../types/user.types'
import { SendResetOtpModal } from './SendResetOtpModal'

interface UserDetailDrawerProps {
  userId: number | null
  /** Row đang mở trong bảng — hiển thị ngay trong lúc chờ detail fetch. */
  user: UserWithRole | null
  onClose: () => void
}

const DATE_FORMAT = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : DATE_FORMAT.format(date)
}

/**
 * Drawer chi tiết tài khoản.
 *
 * Nạp `GET /api/users/{userId}` để có `order_count` / `rental_count` — hai số
 * này chỉ có ở schema `UserAccountDetail`, endpoint list không trả về.
 */
export function UserDetailDrawer({
  userId,
  user,
  onClose,
}: UserDetailDrawerProps) {
  const { message: messageApi } = App.useApp()
  const currentUserId = useAuthStore((state) => state.user?.id)
  const { data: detail, isLoading, isError } = useUser(userId)
  const [isResetOtpOpen, setIsResetOtpOpen] = useState(false)

  const statusMutation = useUpdateUserStatus({
    onSuccess: () => messageApi.success('Đã cập nhật trạng thái tài khoản.'),
    onError: (error) => messageApi.error(getApiErrorMessage(error)),
  })

  // Ưu tiên detail (đầy đủ hơn), fallback về row của bảng để UI không nháy trắng.
  const profile = detail ?? user
  const status = profile?.status
  const isSelf = currentUserId !== undefined && currentUserId === profile?.user_id
  const isActive = status === 'ACTIVE'
  const targetStatus = status ? nextToggleStatus(status) : null

  const isToggling =
    statusMutation.isPending &&
    statusMutation.variables?.userId === profile?.user_id

  const handleToggleStatus = () => {
    if (!profile || !targetStatus) return

    statusMutation.mutate({
      userId: profile.user_id,
      payload: { status: targetStatus },
    })
  }

  return (
    <>
      <Drawer
        title={
          <Flex vertical align="flex-start" gap={2}>
            <Typography.Text strong>
              {profile?.full_name ?? `Tài khoản #${userId ?? '—'}`}
            </Typography.Text>
            {status && (
              <Tag
                color={USER_STATUS_CONFIG[status]?.color ?? 'default'}
                style={{ width: 'fit-content', marginTop: 4 }}
              >
                {USER_STATUS_CONFIG[status]?.label ?? status}
              </Tag>
            )}
          </Flex>
        }
        size={560}
        open={userId !== null}
        onClose={onClose}
        destroyOnHidden
        extra={
          profile && targetStatus && !isSelf ? (
            <Popconfirm
              title={isActive ? 'Khoá tài khoản?' : 'Kích hoạt lại tài khoản?'}
              description={
                isActive
                  ? `${profile.full_name} sẽ không đăng nhập được tới khi được mở khoá.`
                  : `${profile.full_name} sẽ đăng nhập lại được ngay.`
              }
              okText="Xác nhận"
              cancelText="Hủy"
              okButtonProps={{ danger: isActive }}
              onConfirm={handleToggleStatus}
            >
              <Button
                danger={isActive}
                icon={isActive ? <LockOutlined /> : <UnlockOutlined />}
                loading={isToggling}
              >
                {isActive ? 'Khoá' : 'Mở khoá'}
              </Button>
            </Popconfirm>
          ) : null
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
                title="Số vụ thuê"
                value={detail?.rental_count ?? 0}
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
                      <Tag color="geekblue">
                        {getRoleLabel(profile.role_id, profile.role_name)}
                      </Tag>
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
                  children: formatDateTime(profile.created_at),
                },
                {
                  key: 'updatedAt',
                  label: 'Cập nhật lần cuối',
                  children: formatDateTime(profile.updated_at),
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