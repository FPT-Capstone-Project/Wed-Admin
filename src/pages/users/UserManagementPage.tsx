import { useMemo, useState } from 'react'
import {
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  LockOutlined,
  PlusOutlined,
  SearchOutlined,
  UnlockOutlined,
} from '@ant-design/icons'
import {
  Button,
  Empty,
  Flex,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { ResetPasswordModal } from './components/ResetPasswordModal'
import { UserFormModal } from './components/UserFormModal'
import { useUserStore } from '../../stores/user.store'
import type {
  User,
  UserFormValues,
  UserRole,
  UserStatus,
} from '../../types/user.types'

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Quản trị viên' },
  { value: 'OPERATOR', label: 'Vận hành trang trại' },
  { value: 'CUSTOMER', label: 'Khách thuê khay' },
] satisfies Array<{ value: UserRole; label: string }>

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'LOCKED', label: 'Tạm khóa' },
  { value: 'PENDING', label: 'Chờ kích hoạt' },
] satisfies Array<{ value: UserStatus; label: string }>

const STATUS_CONFIG: Record<
  UserStatus,
  { color: string; label: string }
> = {
  ACTIVE: { color: 'success', label: 'Hoạt động' },
  LOCKED: { color: 'error', label: 'Tạm khóa' },
  PENDING: { color: 'warning', label: 'Chờ kích hoạt' },
}

const PAGE_SIZE = 10

function toUserFormValues(user: User): UserFormValues {
  return {
    username: user.username,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
  }
}

export function UserManagementPage() {
  const users = useUserStore((state) => state.users)
  const addUser = useUserStore((state) => state.addUser)
  const updateUser = useUserStore((state) => state.updateUser)
  const deleteUser = useUserStore((state) => state.deleteUser)
  const toggleUserStatus = useUserStore((state) => state.toggleUserStatus)
  const resetPassword = useUserStore((state) => state.resetPassword)

  const [searchText, setSearchText] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>()
  const [statusFilter, setStatusFilter] = useState<UserStatus | undefined>()
  const [currentPage, setCurrentPage] = useState(1)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [resettingUser, setResettingUser] = useState<User | null>(null)

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase()

    return users.filter((user) => {
      const matchesSearch = normalizedSearch
        ? [user.name, user.username, user.email, user.phone].some((value) =>
            value.toLowerCase().includes(normalizedSearch),
          )
        : true
      const matchesRole = roleFilter ? user.role === roleFilter : true
      const matchesStatus = statusFilter ? user.status === statusFilter : true

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [roleFilter, searchText, statusFilter, users])

  const maxPage = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const visiblePage = Math.min(currentPage, maxPage)

  const handleAddUser = () => {
    setEditingUser(null)
    setIsFormOpen(true)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setIsFormOpen(true)
  }

  const handleSubmit = async (values: UserFormValues) => {
    await new Promise((resolve) => window.setTimeout(resolve, 300))

    if (editingUser) {
      updateUser(editingUser.id, values)
    } else {
      addUser(values)
    }

    setIsFormOpen(false)
    setEditingUser(null)
  }

  const handleResetPassword = async (userId: string) => {
    await new Promise((resolve) => window.setTimeout(resolve, 300))

    return resetPassword(userId)
  }

  const columns = useMemo<TableColumnsType<User>>(
    () => [
      {
        title: 'Mã người dùng',
        dataIndex: 'id',
        key: 'id',
        width: 140,
      },
      {
        title: 'Họ tên',
        dataIndex: 'name',
        key: 'name',
        width: 180,
      },
      {
        title: 'Username',
        dataIndex: 'username',
        key: 'username',
        width: 160,
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
        width: 220,
      },
      {
        title: 'Số điện thoại',
        dataIndex: 'phone',
        key: 'phone',
        width: 140,
      },
      {
        title: 'Vai trò',
        dataIndex: 'role',
        key: 'role',
        width: 190,
        render: (role: UserRole, user) => (
          <Select<UserRole>
            size="small"
            value={role}
            options={ROLE_OPTIONS}
            onChange={(nextRole) =>
              updateUser(user.id, { ...toUserFormValues(user), role: nextRole })
            }
            style={{ minWidth: 165 }}
            aria-label={`Vai trò của ${user.username}`}
          />
        ),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 150,
        render: (status: UserStatus) => {
          const config = STATUS_CONFIG[status]

          return <Tag color={config.color}>{config.label}</Tag>
        },
      },
      {
        title: 'Hành động',
        key: 'actions',
        width: 190,
        align: 'right',
        render: (_, user) => {
          const isActive = user.status === 'ACTIVE'
          const statusActionLabel =
            user.status === 'PENDING'
              ? 'Kích hoạt tài khoản'
              : isActive
                ? 'Khóa tài khoản'
                : 'Mở khóa tài khoản'

          return (
            <Space size={2}>
              <Tooltip title="Sửa tài khoản">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => handleEditUser(user)}
                  aria-label={`Sửa ${user.username}`}
                />
              </Tooltip>

              <Popconfirm
                title={`${statusActionLabel}?`}
                description={`Bạn có chắc muốn ${statusActionLabel.toLowerCase()} ${user.username}?`}
                okText="Xác nhận"
                cancelText="Hủy"
                onConfirm={() => toggleUserStatus(user.id)}
              >
                <Tooltip title={statusActionLabel}>
                  <Button
                    type="text"
                    icon={
                      user.status === 'ACTIVE' ? (
                        <LockOutlined />
                      ) : (
                        <UnlockOutlined />
                      )
                    }
                    aria-label={`${statusActionLabel} ${user.username}`}
                  />
                </Tooltip>
              </Popconfirm>

              <Tooltip title="Đặt lại mật khẩu">
                <Button
                  type="text"
                  icon={<KeyOutlined />}
                  onClick={() => setResettingUser(user)}
                  aria-label={`Đặt lại mật khẩu cho ${user.username}`}
                />
              </Tooltip>

              <Popconfirm
                title="Xóa tài khoản?"
                description={`Bạn có chắc muốn xóa ${user.username}? Thao tác này không thể hoàn tác.`}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
                onConfirm={() => deleteUser(user.id)}
              >
                <Tooltip title="Xóa tài khoản">
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label={`Xóa ${user.username}`}
                  />
                </Tooltip>
              </Popconfirm>
            </Space>
          )
        },
      },
    ],
    [deleteUser, toggleUserStatus, updateUser],
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

        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddUser}>
          Thêm người dùng
        </Button>
      </Flex>

      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tìm tên, username, email, SĐT"
          value={searchText}
          onChange={(event) => {
            setSearchText(event.target.value)
            setCurrentPage(1)
          }}
          style={{ width: 320, maxWidth: '100%' }}
        />

        <Select<UserRole>
          allowClear
          placeholder="Lọc theo vai trò"
          options={ROLE_OPTIONS}
          value={roleFilter}
          onChange={(value) => {
            setRoleFilter(value)
            setCurrentPage(1)
          }}
          style={{ width: 190 }}
          aria-label="Lọc theo vai trò"
        />

        <Select<UserStatus>
          allowClear
          placeholder="Lọc theo trạng thái"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value)
            setCurrentPage(1)
          }}
          style={{ width: 190 }}
          aria-label="Lọc theo trạng thái"
        />
      </Flex>

      <Table<User>
        rowKey="id"
        columns={columns}
        dataSource={filteredUsers}
        locale={{ emptyText: <Empty description="Không có tài khoản phù hợp" /> }}
        pagination={{
          current: visiblePage,
          pageSize: PAGE_SIZE,
          total: filteredUsers.length,
          showSizeChanger: false,
          showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
          onChange: setCurrentPage,
        }}
        scroll={{ x: 1300 }}
      />

      <UserFormModal
        open={isFormOpen}
        initialValues={editingUser ? toUserFormValues(editingUser) : undefined}
        onCancel={() => {
          setIsFormOpen(false)
          setEditingUser(null)
        }}
        onSubmit={handleSubmit}
      />

      <ResetPasswordModal
        open={Boolean(resettingUser)}
        user={resettingUser}
        onCancel={() => setResettingUser(null)}
        onReset={handleResetPassword}
      />
    </div>
  )
}
