import { useState } from 'react'
import { MailOutlined } from '@ant-design/icons'
import { Alert, App, Button, Modal, Typography } from 'antd'
import { authApi } from '../../../features/auth/api/auth.api'
import { getApiErrorMessage } from '../../../shared/api/error'
import type { UserWithRole } from '../../../types/user.types'

interface SendResetOtpModalProps {
  open: boolean
  user: UserWithRole | null
  onCancel: () => void
}

/**
 * Gửi OTP đặt lại mật khẩu cho tài khoản.
 *
 * ⚠ BE KHÔNG có endpoint admin reset-password (`POST /api/users/{id}/reset-password`
 * chỉ tồn tại trong tài liệu nội bộ, không có trong Swagger). Endpoint thật là
 * `POST /api/auth/forgot-password` — BE gửi OTP về email đăng ký của user,
 * user tự nhập OTP + mật khẩu mới ở luồng `/api/auth/reset-password-otp`.
 *
 * Vì vậy modal này KHÔNG hiển thị mật khẩu tạm nữa (trước đây sinh random ở
 * client — không có tác dụng gì vì BE không đổi mật khẩu).
 */
export function SendResetOtpModal({
  open,
  user,
  onCancel,
}: SendResetOtpModalProps) {
  const { message: messageApi } = App.useApp()
  const [isSending, setIsSending] = useState(false)

  const handleSend = async () => {
    if (!user) return

    setIsSending(true)
    try {
      await authApi.forgotPassword({ email: user.email })
      messageApi.success(`Đã gửi mã đặt lại mật khẩu tới ${user.email}.`)
      onCancel()
    } catch (error) {
      messageApi.error(getApiErrorMessage(error))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Modal
      title="Gửi mã đặt lại mật khẩu"
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={isSending}>
          Hủy
        </Button>,
        <Button
          key="send"
          type="primary"
          icon={<MailOutlined />}
          loading={isSending}
          onClick={() => void handleSend()}
        >
          Gửi mã
        </Button>,
      ]}
      closable={!isSending}
      maskClosable={!isSending}
      keyboard={!isSending}
      destroyOnHidden
    >
      {user && (
        <>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Mã OTP sẽ được gửi tới email đăng ký"
            description={
              <Typography.Text type="secondary">
                Người dùng nhận mã sẽ tự đặt mật khẩu mới tại màn hình đăng nhập.
              </Typography.Text>
            }
          />
          <Typography.Paragraph>
            Gửi mã đặt lại mật khẩu tới tài khoản <strong>{user.email}</strong> (
            {user.full_name})?
          </Typography.Paragraph>
        </>
      )}
    </Modal>
  )
}