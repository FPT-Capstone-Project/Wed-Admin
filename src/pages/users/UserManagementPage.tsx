import { useCallback, useMemo, useState } from 'react'
import {
  EyeOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UnlockOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Empty,
  Flex,
  Input,
  Popconfirm,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
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
import { UserDetailDrawer } from './components/UserDetailDrawer'
import { UserFormModal } from './components/UserFormModal'

const PAGE_SIZE = 20

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
  // useMemo giữ object identity ổn định, nếu không queryKey đổi mỗi render
  // → refetch vô hạn (xem `useRentals`).
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
        width: 200,
        render: (value: string, user) => (
          <Flex vertical gap={0}>
            <Typography.Text strong>{value}</Typography.Text>
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
        ),
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
        render: (roleId: number, user) => (
          <Space direction="vertical" size={2}>
            <Tag color="geekblue">{getRoleLabel(roleId, user.role_name)}</Tag>
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
        ),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 130,
        render: (status: UserStatus) => {
          const config = USER_STATUS_CONFIG[status]

          return (
            <Tag color={config?.color ?? 'default'}>
              {config?.label ?? status}
            </Tag>
          )
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
        width: 120,
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
            <Space size={2}>
              <Tooltip title="Xem chi tiết">
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  onClick={() => setSelectedUserId(user.user_id)}
                  aria-label={`Xem chi tiết ${user.full_name}`}
                />
              </Tooltip>

              {isSelf ? (
                <Tooltip title="Không thể tự khoá tài khoản đang đăng nhập">
                  <Button
                    type="text"
                    icon={<LockOutlined />}
                    disabled
                    aria-label="Không thể tự khoá"
                  />
                </Tooltip>
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
                  <Tooltip title={actionLabel}>
                    <Button
                      type="text"
                      danger={isActive}
                      loading={isToggling}
                      icon={isActive ? <LockOutlined /> : <UnlockOutlined />}
                      aria-label={`${actionLabel} ${user.full_name}`}
                    />
                  </Tooltip>
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

      <Flex gap={24} wrap style={{ marginBottom: 20 }}>
        <Statistic title="Tổng tài khoản" value={stats.total} />
        <Statistic
          title="Đang hoạt động"
          value={stats.active}
          valueStyle={{ color: '#16a34a' }}
        />
        <Statistic
          title="Đã khoá"
          value={stats.blocked}
          valueStyle={{ color: '#dc2626' }}
        />
      </Flex>

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