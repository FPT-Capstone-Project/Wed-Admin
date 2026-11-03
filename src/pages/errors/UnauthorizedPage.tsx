import { RollbackOutlined } from '@ant-design/icons'
import { Button, Result, Space } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../features/auth/store/auth.store'
import { ROLE_LABELS, resolveUserRole } from '../../routes/access-policy'
import type { UserRole } from '../../types/user.types'

interface UnauthorizedLocationState {
  /** URL user đã cố truy cập. */
  from?: string
  /** Role cần có để vào được. */
  requiredRoles?: readonly UserRole[]
  /** Role thực tế của user hiện tại. */
  currentRole?: UserRole | null
}

/**
 * Trang 403 — hiển thị khi user đã đăng nhập nhưng **không đủ quyền**.
 *
 * ⚠ Không dùng `<Result status="403">` trực tiếp trong `RoleGuard` nữa:
 *   render tại chỗ giữ nguyên URL bị chặn ⇒ user tưởng web bị lỗi, và
 *   nếu reload là lặp lại vòng chặn. Chuyển hướng tới trang này giúp:
 *   - URL rõ ràng (`/unauthorized`),
 *   - có nút quay lại trang mặc định (dashboard),
 *   - nói rõ role cần có vs role hiện tại.
 */
export function UnauthorizedPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const authUser = useAuthStore((state) => state.user)

  const state = (location.state ?? {}) as UnauthorizedLocationState
  const currentRole: UserRole | null =
    state.currentRole ?? resolveUserRole(authUser)
  const requiredRoles = state.requiredRoles ?? []

  const requiredLabel = requiredRoles
    .map((role) => ROLE_LABELS[role] ?? role)
    .join(' hoặc ')
  const currentLabel = currentRole
    ? (ROLE_LABELS[currentRole] ?? currentRole)
    : 'Chưa xác định'

  return (
    <div className="admin-content-inner">
      <Result
        status="403"
        title="403 — Không có quyền truy cập"
        subTitle={
          <span>
            Trang này chỉ dành cho <strong>{requiredLabel || 'Quản trị viên'}</strong>.
            Tài khoản hiện tại đang đăng nhập với vai trò{' '}
            <strong>{currentLabel}</strong>.
            {state.from ? (
              <>
                {' '}Bạn không thể mở <code>{state.from}</code>.
              </>
            ) : null}
          </span>
        }
        extra={
          <Space size={8} wrap>
            <Button
              type="primary"
              icon={<RollbackOutlined />}
              onClick={() => navigate('/', { replace: true })}
            >
              Về trang tổng quan
            </Button>
            <Button onClick={() => navigate(-1)}>Quay lại trang trước</Button>
          </Space>
        }
      />
    </div>
  )
}
