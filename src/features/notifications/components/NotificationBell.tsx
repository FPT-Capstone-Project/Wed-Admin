import { Alert, Badge, Button, Empty, Flex, Popover, Spin, Typography } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications, useNotificationActions, useUnreadNotificationCount } from '../hooks/useNotifications'
export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const query = useNotifications({ page: 1, pageSize: 8 }, { enabled: open })
  const count = useUnreadNotificationCount()
  const { read, readAll, pending } = useNotificationActions()
  return <Popover open={open} onOpenChange={setOpen} trigger="click" placement="bottomRight" title="Thông báo" content={<Flex vertical gap={8} style={{ width: 340, maxWidth: '80vw' }}>
    <Button loading={readAll.isPending} disabled={pending || !count.data} onClick={() => readAll.mutate()}>Đánh dấu tất cả đã đọc</Button>
    {query.isLoading ? <Spin /> : query.isError ? <Alert type="error" title="Không tải được thông báo" action={<Button onClick={() => void query.refetch()}>Thử lại</Button>} /> : query.data?.items.length ? query.data.items.map(item => <Button key={item.notification_id} type="text" disabled={pending} onClick={() => { if (!item.is_read) read.mutate(item.notification_id) }} style={{ height: 'auto', textAlign: 'left', whiteSpace: 'normal' }}><Flex vertical><Typography.Text strong={!item.is_read}>{item.title}</Typography.Text><Typography.Text type="secondary">{item.message}</Typography.Text></Flex></Button>) : <Empty description="Chưa có thông báo" />}
    <Button type="link" onClick={() => { setOpen(false); navigate('/notifications') }}>Xem tất cả thông báo</Button>
  </Flex>}><Badge count={count.data ?? 0} size="small"><Button type="text" icon={<BellOutlined />} aria-label="Mở thông báo" /></Badge></Popover>
}
