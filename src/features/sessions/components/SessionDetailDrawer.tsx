import '../sessions-industrial.css'
import { ExperimentOutlined, ShopOutlined } from '@ant-design/icons'
import {
  Descriptions,
  Drawer,
  Flex,
  Progress,
  Skeleton,
  Space,
  Tabs,
  Typography,
} from 'antd'
import { useMemo, useState } from 'react'
import { MetadataBadge, StatusBadge } from '../../../shared/ui'
import { useSession } from '../hooks/useSessions'
import {
  SESSION_DEFAULT_PROGRESS,
  SESSION_STATUS_CONFIG,
} from './session-status.config'
import { SessionStatusTag } from './SessionStatusTag'
import { useFarmSession, useSpawnInspections } from '../../farm/hooks/useFarm'
import { SpawnInspectionList } from '../../farm/components/SpawnInspectionList'
import type { SpawnInspection } from '../../farm/types/farm.types'
import type { CultivationSession } from '../types/session.types'

interface SessionDetailDrawerProps {
  sessionId: number | null
  onClose: () => void
}

const DATE_FMT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function fmtDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return DATE_FMT.format(date)
}

/**
 * Drawer chi tiết phiên canh tác — **100% READ-ONLY**.
 *
 * Hiển thị: thông tin khách thuê, gói thuê, loại nấm, tiến độ %, danh sách
 * khay/tầng được gán, lịch sử kiểm tra phôi kèm hình ảnh.
 *
 * Không có nút ghi dữ liệu (tạo tiến độ / kiểm tra / thu hoạch / chuyển
 * giai đoạn / hủy / gửi thông báo) — các thao tác đó do staff thực hiện.
 */
export function SessionDetailDrawer({
  sessionId,
  onClose,
}: SessionDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const { data: session, isLoading, isError } = useSession(sessionId)

  // Lịch sử kiểm tra phôi lấy từ luồng farm (BE có `spawn-inspections`).
  const { data: inspections, isLoading: inspectionsLoading } =
    useSpawnInspections(sessionId)

  // Chi tiết luồng farm — bổ sung `spawn_issued` (số phôi đã cấp).
  const { data: farmSession } = useFarmSession(sessionId)

  const progressPercent = useMemo(() => {
    if (!session) return 0
    if (typeof session.progress_percent === 'number') {
      return Math.min(100, Math.max(0, Math.round(session.progress_percent)))
    }
    return SESSION_DEFAULT_PROGRESS[session.status] ?? 0
  }, [session])

  return (
    <Drawer
      rootClassName="mcms-session-drawer"
      title={
        <div>
          <Typography.Text strong>
            Phiên canh tác #{sessionId ?? '—'}
          </Typography.Text>
          {session && (
            <div>
              <Space size={4} wrap style={{ marginTop: 4 }}>
                <SessionStatusTag status={session.status} />
                {session.payment_status && (
                  <StatusBadge
                    tone={session.payment_status === 'PAID' ? 'ok' : 'warning'}
                    label={session.payment_status}
                  />
                )}
              </Space>
            </div>
          )}
        </div>
      }
      size={760}
      open={sessionId !== null}
      onClose={onClose}
      destroyOnHidden
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : isError || !session ? (
        <Flex vertical align="center" gap={12} style={{ padding: 32 }}>
          <Typography.Text type="danger">
            Không tải được chi tiết phiên canh tác.
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Có thể phiên không tồn tại hoặc bạn không có quyền xem.
          </Typography.Text>
        </Flex>
      ) : (
        <SessionDetailContent
          session={session}
          progressPercent={progressPercent}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          inspections={inspections?.inspections ?? []}
          inspectionsLoading={inspectionsLoading}
          spawnIssued={farmSession?.spawn_issued ?? null}
        />
      )}
    </Drawer>
  )
}

interface SessionDetailContentProps {
  session: CultivationSession
  progressPercent: number
  activeTab: string
  onTabChange: (key: string) => void
  inspections: SpawnInspection[]
  inspectionsLoading: boolean
  spawnIssued: number | null
}

function SessionDetailContent({
  session,
  progressPercent,
  activeTab,
  onTabChange,
  inspections,
  inspectionsLoading,
  spawnIssued,
}: SessionDetailContentProps) {
  const statusConfig = SESSION_STATUS_CONFIG[session.status]

  return (
    <Flex vertical gap={20}>
      {/* ── Tóm tắt ─────────────────────────────────────────────────── */}
      <Flex vertical gap={8}>
        <Flex justify="space-between" align="center" gap={12} wrap>
          <Typography.Text style={{ fontSize: 13, fontWeight: 600 }}>
            Tiến độ canh tác
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {statusConfig?.label ?? session.status} · {progressPercent}%
          </Typography.Text>
        </Flex>
        <Progress
          percent={progressPercent}
          strokeColor="var(--mcms-primary)"
          showInfo={false}
        />
      </Flex>

      <Tabs
        activeKey={activeTab}
        onChange={onTabChange}
        items={[
          {
            key: 'overview',
            label: 'Tổng quan',
            children: (
              <Flex vertical gap={16}>
                <Descriptions
                  title="Khách thuê"
                  column={{ xs: 1, sm: 2 }}
                  size="small"
                  bordered
                  items={[
                    {
                      key: 'name',
                      label: 'Khách hàng',
                      children: session.customer_name ?? '—',
                    },
                    {
                      key: 'email',
                      label: 'Email',
                      children: session.customer_email ?? '—',
                    },
                    {
                      key: 'phone',
                      label: 'SĐT',
                      children: session.customer_phone ?? '—',
                    },
                    {
                      key: 'order',
                      label: 'Mã đơn',
                      children: session.order_id ? (
                        <MetadataBadge
                          className="mcms-session-mono"
                          label={`#${session.order_id}`}
                        />
                      ) : (
                        '—'
                      ),
                    },
                  ]}
                />

                <Descriptions
                  title="Vụ nấm"
                  column={{ xs: 1, sm: 2 }}
                  size="small"
                  bordered
                  items={[
                    {
                      key: 'package',
                      label: 'Gói thuê',
                      children: session.package_name ?? '—',
                    },
                    {
                      key: 'mushroom',
                      label: 'Loại nấm',
                      children: session.mushroom_name ?? '—',
                    },
                    {
                      key: 'start',
                      label: 'Ngày bắt đầu',
                      children: (
                        <MetadataBadge
                          className="mcms-session-mono"
                          label={fmtDate(session.start_date)}
                        />
                      ),
                    },
                    {
                      key: 'end',
                      label: 'Ngày kết thúc',
                      children: (
                        <MetadataBadge
                          className="mcms-session-mono"
                          label={fmtDate(
                            session.expected_harvest_date ?? session.end_date,
                          )}
                        />
                      ),
                    },
                    { key: 'spawnRequested', label: 'Số phôi yêu cầu', children: session.spawn_quantity ?? '—' },
                    { key: 'harvestStatus', label: 'Trạng thái thu hoạch', children: session.harvest_status ?? '—' },
                    {
                      key: 'spawn',
                      label: 'Phôi đã cấp',
                      children:
                        spawnIssued != null ? (
                          <MetadataBadge
                            icon={<ExperimentOutlined />}
                            label={`${spawnIssued} đơn vị`}
                          />
                        ) : (
                          '—'
                        ),
                    },
                    {
                      key: 'trayCount',
                      label: 'Số khay',
                      children: `${session.trays.length || session.tray_count || 0}`,
                    },
                  ]}
                />

                <TrayAssignmentTable session={session} />
              </Flex>
            ),
          },
          {
            key: 'inspections',
            label: 'Kiểm tra phôi',
            children: inspectionsLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <SpawnInspectionList inspections={inspections} />
            ),
          },
        ]}
      />

      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Trang quản trị chỉ quan sát dữ liệu. Việc ghi nhận tiến độ, kiểm tra
        phôi, thu hoạch và chuyển giai đoạn được thực hiện trên ứng dụng của
        nhân viên.
      </Typography.Text>
    </Flex>
  )
}

/** Bảng khay / tầng được gán cho phiên. */
function TrayAssignmentTable({ session }: { session: CultivationSession }) {
  if (session.trays.length === 0) {
    return (
      <Descriptions
        title="Khay được gán"
        column={1}
        size="small"
        bordered
        items={[
          {
            key: 'none',
            label: 'Khay',
            children: (
              <Typography.Text type="secondary">
                Chưa gán khay cho phiên này.
              </Typography.Text>
            ),
          },
        ]}
      />
    )
  }

  return (
    <div>
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        Khay được gán
      </Typography.Title>
      <Descriptions
        column={{ xs: 1, sm: 2 }}
        size="small"
        bordered
        items={session.trays.map((tray, index) => ({
          key: `tray-${tray.session_tray_id ?? tray.tray_id ?? index}`,
          label: (
            <Space size={4}>
              <ShopOutlined aria-hidden="true" />
              <span className="mcms-session-mono">
                {tray.tray_code ?? `Khay #${tray.tray_id ?? index + 1}`}
              </span>
            </Space>
          ),
          children: (
            <Flex vertical gap={2}>
              <Typography.Text>
                {tray.room_name ?? tray.room_code ?? '—'}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                {tray.floor_name ??
                  (typeof tray.floor_number === 'number'
                    ? `Tầng ${tray.floor_number}`
                    : '—')}
              </Typography.Text>
            </Flex>
          ),
        }))}
      />
    </div>
  )
}
