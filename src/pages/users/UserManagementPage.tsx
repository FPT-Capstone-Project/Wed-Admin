import { useCallback, useMemo, useState } from 'react'
import {
  CheckCircleOutlined,
  EyeOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UnlockOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  App,
  Avatar,
  Button,
  Col,
  Empty,
  Flex,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ROLE_OPTIONS,
  USER_STATUS_CONFIG,
  USER_STATUS_OPTIONS,
  getRoleLabel,
  nextToggleStatus,
} from '../../features/users/user-status.config'
import {
  useUpdateUserStatus,
  useUsers,
} from '../../features/users/hooks/useUsers'
import { useAuthStore } from '../../features/auth/store/auth.store'
import { getApiErrorMessage } from '../../shared/api/error'
import type {
  UserListQuery,
  UserStatus,
  UserWithRole,
} from '../../types/user.types'
import type { SemanticTone } from '../../app/theme/tokens'
import { ActionButton, StatCard, StatusBadge } from '../../shared/ui'
import { UserDetailDrawer } from './components/UserDetailDrawer'
import { UserFormModal } from './components/UserFormModal'

const PAGE_SIZE = 20

const ROLE_BADGE_CONFIG: Record<number, { tone: SemanticTone; label: string }> = {
  1: { tone: 'info', label: 'Quản trị viên' },
  2: { tone: 'ok', label: 'Vận hành trang trại' },
  3: { tone: 'neutral', label: 'Khách thuê khay' },
}

const USER_STATUS_BADGE_CONFIG: Record<UserStatus, { tone: SemanticTone; label: string }> = {
  ACTIVE: { tone: 'ok', label: 'Hoạt động' },
  BLOCKED: { tone: 'danger', label: 'Đã khoá' },
  INACTIVE: { tone: 'muted', label: 'Tạm ngưng' },
}

export function UserManagementPage() {
  const { message: messageApi } = App.useApp()
  const currentUserId = useAuthStore((state) => state.user?.id)

  const [searchText, setSearchText] = useState('')
  const [roleFilter, setRoleFilter] = useState<number | undefined>()
  const [statusFilter, setStatusFilter] = useState<UserStatus | undefined>()
  const [currentPage, setCurrentPage] = useState(1)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  // ── Query params ───────────────────────────────────────────────────────
  const listQuery = useMemo<UserListQuery>(
    () => ({ roleId: roleFilter }),
    [roleFilter],
  )

  const {
    data: users = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useUsers(listQuery)

  const statusMutation = useUpdateUserStatus({
    onSuccess: (updated) =>
      messageApi.success(
        `Đã chuyển "${updated.full_name}" sang trạng thái "${
          USER_STATUS_CONFIG[updated.status]?.label ?? updated.status
        }".`,
      ),
    onError: (err) => messageApi.error(getApiErrorMessage(err)),
  })

  // BE chỉ hỗ trợ lọc theo roleId → tìm kiếm + lọc status làm phía client.
  const filteredUsers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return users.filter((user) => {
      const matchesSearch = keyword
        ? [user.full_name, user.email, user.phone ?? '', user.address ?? ''].some(
            (value) => value.toLowerCase().includes(keyword),
          )
        : true
      const matchesStatus = statusFilter ? user.status === statusFilter : true

      return matchesSearch && matchesStatus
    })
  }, [searchText, statusFilter, users])

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.status === 'ACTIVE').length,
      blocked: users.filter((u) => u.status === 'BLOCKED').length,
    }),
    [users],
  )

  const selectedUser = useMemo(
    () => users.find((user) => user.user_id === selectedUserId) ?? null,
    [selectedUserId, users],
  )

  const maxPage = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const visiblePage = Math.min(currentPage, maxPage)

  const handleToggleStatus = useCallback(
    (user: UserWithRole) => {
      statusMutation.mutate({
        userId: user.user_id,
        payload: { status: nextToggleStatus(user.status) },
      })
    },
    [statusMutation],
  )

  const columns = useMemo<ColumnsType<UserWithRole>>(
    () => [
      {
        title: 'Mã',
        dataIndex: 'user_id',
        key: 'user_id',
        width: 80,
        render: (value: number) => (
          <Typography.Text strong>#{value}</Typography.Text>
        ),
      },
      {
        title: 'Họ và tên',
        dataIndex: 'full_name',
        key: 'full_name',
        width: 240,
        render: (value: string, user) => {
          const trimmed = value?.trim() ?? ''
          const initial = trimmed ? trimmed.charAt(0).toUpperCase() : 'U'
          return (
            <Flex align="center" gap={12}>
              <Avatar
                size={38}
                style={{
                  backgroundColor: 'var(--mcms-primary-soft)',
                  color: 'var(--mcms-primary)',
                  border: '1px solid var(--mcms-border-strong)',
                  fontWeight: 650,
                  fontSize: 15,
                  flexShrink: 0,
                }}
              >
                {initial}
              </Avatar>
              <Flex vertical gap={1} style={{ minWidth: 0 }}>
                <Typography.Text strong ellipsis={{ tooltip: value }}>
                  {value}
                </Typography.Text>
                {user.address && (
                  <Typography.Text
                    type="secondary"
                    style={{ fontSize: 12 }}
                    ellipsis={{ tooltip: user.address }}
                  >
                    {user.address}
                  </Typography.Text>
                )}
              </Flex>
            </Flex>
          )
        },
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
        width: 240,
      },
      {
        title: 'Số điện thoại',
        dataIndex: 'phone',
        key: 'phone',
        width: 150,
        render: (value: string | null) =>
          value ?? <Typography.Text type="secondary">—</Typography.Text>,
      },
      {
        title: 'Vai trò',
        dataIndex: 'role_id',
        key: 'role_id',
        width: 200,
        render: (roleId: number, user) => {
          const config = ROLE_BADGE_CONFIG[roleId] ?? {
            tone: 'neutral',
            label: getRoleLabel(roleId, user.role_name),
          }
          return (
            <Space direction="vertical" size={2}>
              <StatusBadge tone={config.tone} label={config.label} />
              {user.role_description && (
                <Typography.Text
                  type="secondary"
                  style={{ fontSize: 12 }}
                  ellipsis={{ tooltip: user.role_description }}
                >
                  {user.role_description}
                </Typography.Text>
              )}
            </Space>
          )
        },
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 140,
        render: (status: UserStatus) => {
          const config = USER_STATUS_BADGE_CONFIG[status] ?? {
            tone: 'neutral',
            label: status,
          }
          return <StatusBadge tone={config.tone} label={config.label} />
        },
      },
      {
        title: 'Ngày tạo',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 160,
        render: (value: string) => {
          const date = new Date(value)

          return Number.isNaN(date.getTime()) ? (
            value
          ) : (
            new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(
              date,
            )
          )
        },
      },
      {
        title: 'Hành động',
        key: 'actions',
        width: 110,
        align: 'right',
        fixed: 'right',
        render: (_, user) => {
          const isSelf = currentUserId === user.user_id
          const isActive = user.status === 'ACTIVE'
          const actionLabel = isActive
            ? 'Khoá tài khoản'
            : 'Kích hoạt lại tài khoản'
          const isToggling =
            statusMutation.isPending &&
            statusMutation.variables?.userId === user.user_id

          return (
            <Space size={4}>
              <ActionButton
                icon={<EyeOutlined />}
                label="Xem"
                description={`Xem chi tiết ${user.full_name}`}
                variant="text"
                hideLabel
                onClick={() => setSelectedUserId(user.user_id)}
              />

              {isSelf ? (
                <ActionButton
                  icon={<LockOutlined />}
                  label="Khoá"
                  description="Không thể tự khoá tài khoản đang đăng nhập"
                  variant="text"
                  disabled
                  hideLabel
                />
              ) : (
                <Popconfirm
                  title={`${actionLabel}?`}
                  description={
                    isActive
                      ? `${user.full_name} sẽ không đăng nhập được tới khi được mở khoá.`
                      : `${user.full_name} sẽ đăng nhập lại được ngay.`
                  }
                  okText="Xác nhận"
                  cancelText="Hủy"
                  okButtonProps={{ danger: isActive }}
                  onConfirm={() => handleToggleStatus(user)}
                >
                  <ActionButton
                    icon={isActive ? <LockOutlined /> : <UnlockOutlined />}
                    label={isActive ? 'Khoá' : 'Mở khoá'}
                    description={`${actionLabel} ${user.full_name}`}
                    variant={isActive ? 'dangerText' : 'text'}
                    loading={isToggling}
                    hideLabel
                  />
                </Popconfirm>
              )}
            </Space>
          )
        },
      },
    ],
    [currentUserId, handleToggleStatus, statusMutation],
  )

  return (
    <div>
      <Flex
        align="center"
        justify="space-between"
        gap={16}
        wrap
        style={{ marginBottom: 20 }}
      >
        <Typography.Title level={3} style={{ margin: 0 }}>
          Quản lý tài khoản
        </Typography.Title>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsFormOpen(true)}
        >
          Thêm người dùng
        </Button>
      </Flex>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <StatCard
            title="Tổng tài khoản"
            value={stats.total}
            tone="info"
            icon={<UserOutlined />}
            description="Tất cả tài khoản trong hệ thống"
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            title="Đang hoạt động"
            value={stats.active}
            tone="ok"
            highlightValue
            icon={<CheckCircleOutlined />}
            description="Tài khoản đang được phép đăng nhập"
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            title="Đã khoá"
            value={stats.blocked}
            tone="danger"
            highlightValue
            icon={<LockOutlined />}
            description="Tài khoản bị tạm khoá hoặc đình chỉ"
          />
        </Col>
      </Row>

      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tìm tên, email, SĐT, địa chỉ"
          value={searchText}
          onChange={(event) => {
            setSearchText(event.target.value)
            setCurrentPage(1)
          }}
          style={{ width: 320, maxWidth: '100%' }}
          aria-label="Tìm tài khoản"
        />

        <Select
          allowClear
          placeholder="Lọc theo vai trò"
          value={roleFilter}
          onChange={(value) => {
            setRoleFilter(value)
            setCurrentPage(1)
          }}
          options={ROLE_OPTIONS.map((option) => ({
            value: option.roleId,
            label: option.label,
          }))}
          style={{ width: 200 }}
          aria-label="Lọc theo vai trò"
        />

        <Select
          allowClear
          placeholder="Lọc theo trạng thái"
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value)
            setCurrentPage(1)
          }}
          options={USER_STATUS_OPTIONS}
          style={{ width: 190 }}
          aria-label="Lọc theo trạng thái"
        />

        <Button
          icon={<ReloadOutlined />}
          onClick={() => void refetch()}
          loading={isFetching}
        >
          Tải lại
        </Button>
      </Flex>

      {isError ? (
        <Empty
          description={
            <Flex vertical align="center" gap={4}>
              <Typography.Text type="danger">
                Không tải được danh sách tài khoản.
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {error?.message ?? 'Lỗi không xác định.'}
              </Typography.Text>
            </Flex>
          }
        />
      ) : filteredUsers.length === 0 && !isLoading ? (
        <Empty description="Chưa có tài khoản phù hợp" />
      ) : (
        <Table<UserWithRole>
          rowKey="user_id"
          columns={columns}
          dataSource={filteredUsers}
          loading={isLoading}
          locale={{
            emptyText: <Empty description="Không có tài khoản phù hợp" />,
          }}
          pagination={{
            current: visiblePage,
            pageSize: PAGE_SIZE,
            total: filteredUsers.length,
            showSizeChanger: false,
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
            onChange: setCurrentPage,
          }}
          scroll={{ x: 1280 }}
        />
      )}

      <UserFormModal
        open={isFormOpen}
        onCancel={() => setIsFormOpen(false)}
      />

      <UserDetailDrawer
        userId={selectedUserId}
        user={selectedUser}
        onClose={() => setSelectedUserId(null)}
      />
    </div>
  )
}
