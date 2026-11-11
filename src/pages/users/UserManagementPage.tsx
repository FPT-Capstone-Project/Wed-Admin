import { formatDate } from '../../shared/utils/date'
import { PageHeader } from '../../shared/ui/PageHeader'
import '../../styles/reports-users-industrial.css'
import { Suspense, useMemo, useState } from 'react'
import {
  CheckCircleOutlined,
  EyeOutlined,
  LockOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  Avatar,
  Button,
  Col,
  Empty,
  Flex,
  Input,
  Row,
  Select,
  Skeleton,
  Space,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ROLE_OPTIONS,
  USER_STATUS_OPTIONS,
  getRoleLabel,
} from '../../features/users/user-status.config'
import { USER_STATUS_DICTIONARY } from '../../shared/i18n/status/user'
import { presentStatus } from '../../shared/i18n/status/registry'
import { useUsers } from '../../features/users/hooks/useUsers'
import type {
  UserListQuery,
  UserStatus,
  UserWithRole,
} from '../../types/user.types'
import { ActionButton, MetadataBadge, StatCard, StatusBadge, DataTable } from '../../shared/ui'
import { UserDetailDrawer } from '../../app/router/lazy-modals'

const PAGE_SIZE = 20

export function UserManagementPage() {
  const [searchText, setSearchText] = useState('')
  const [roleFilter, setRoleFilter] = useState<number | undefined>()
  const [statusFilter, setStatusFilter] = useState<UserStatus | undefined>()
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  // ── Query params ───────────────────────────────────────────────────────
  const listQuery = useMemo<UserListQuery>(
    () => ({ roleId: roleFilter }),
    [roleFilter],
  )

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useUsers(listQuery)
  const users = useMemo(() => data ?? [], [data])

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
                  backgroundColor: 'var(--mcms-surface-muted)',
                  color: 'var(--mcms-text-muted)',
                  border: '1px solid var(--mcms-border)',
                  fontWeight: 'var(--mcms-weight-semibold)',
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
          const roleLabel = getRoleLabel(roleId, user.role_name)
          return (
            <Space direction="vertical" size={2}>
              <MetadataBadge label={roleLabel} />
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
        render: (status: UserStatus) => (
          <StatusBadge {...presentStatus(USER_STATUS_DICTIONARY, status)} />
        ),
      },
      {
        title: 'Ngày tạo',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 160,
        render: (value: string | null | undefined) => formatDate(value),
      },
      {
        // ⚠ Cột hành động CHỈ có nút "Xem" — web admin ở chế độ chỉ xem:
        // không tạo tài khoản, không khoá / mở khoá (việc này thuộc staff).
        title: 'Hành động',
        key: 'actions',
        width: 110,
        align: 'right',
        fixed: 'right',
        render: (_, user) => (
          <ActionButton
            icon={<EyeOutlined />}
            label="Xem"
            description={`Xem chi tiết ${user.full_name}`}
            variant="text"
            hideLabel
            onClick={() => setSelectedUserId(user.user_id)}
          />
        ),
      },
    ],
    [],
  )

  return (
    <div>
      <PageHeader title="Quản lý tài khoản"  actions={<Flex align="center" gap={8} wrap>
          <MetadataBadge icon={<EyeOutlined />} label="Chỉ xem" />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Việc tạo / khoá tài khoản do nhân viên thực hiện trên mobile app.
          </Typography.Text>
        </Flex>} />

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

      {isLoading && !data ? <Skeleton active paragraph={{ rows: 8 }} /> : isError ? (
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
        <DataTable<UserWithRole>
          rowKey="user_id"
          columns={columns}
          dataSource={filteredUsers}
          loading={isLoading}
          isFetching={isFetching}
          emptyTitle="Không có tài khoản phù hợp"
          pagination={{
            current: visiblePage,
            pageSize: PAGE_SIZE,
            total: filteredUsers.length,
            showSizeChanger: false,
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
            onChange: setCurrentPage,
          }}
          scrollX={1280}
        />
      )}

            <Suspense fallback={null}>
              <UserDetailDrawer
              userId={selectedUserId}
              user={selectedUser}
              onClose={() => setSelectedUserId(null)}
              />
            </Suspense>
    </div>
  )
}
