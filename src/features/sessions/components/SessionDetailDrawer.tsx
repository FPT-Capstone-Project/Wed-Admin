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
import { useAdminCultivationSession } from '../hooks/useAdminCultivationSessions'
import { toCultivationSession } from '../api/admin-session-mapper'
import {
  SESSION_DEFAULT_PROGRESS,
  SESSION_STATUS_CONFIG,
} from './session-status.config'
import { resolveSessionProgress } from '../utils/session-progress.utils'
import { SessionStatusTag } from './SessionStatusTag'
import { useFarmSession, useSpawnInspections } from '../../farm/hooks/useFarm'
import { SpawnInspectionList } from '../../farm/components/SpawnInspectionList'
import { SessionIoTHistoryTab } from './SessionIoTHistoryTab'
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
  // ⚠ Nguồn CHÍNH: endpoint quản trị — đã join sẵn khách / gói / nấm /
  //   tiến độ / khay được gán.
  const {
    data: adminSession,
    isLoading: adminLoading,
    isError: adminError,
  } = useAdminCultivationSession(sessionId)

  // Nguồn bổ sung (luồng farm) — chỉ dùng cho các trường endpoint quản trị
  // không trả: SĐT khách, trạng thái thanh toán, số phôi đã cấp.
  const { data: farmSession } = useFarmSession(sessionId)

  const session = useMemo<CultivationSession | null>(() => {
    if (!adminSession) return null
    const base = toCultivationSession(adminSession)
    return {
      ...base,
      customer_phone: farmSession?.customer_phone ?? base.customer_phone,
      payment_status: farmSession?.payment_status ?? base.payment_status,
    }
  }, [adminSession, farmSession])

  const isLoading = adminLoading
  const isError = adminError

  const progressPercent = useMemo(() => {
    if (!session) return 0
    // ⚠ Cùng công thức chuẩn với các trang khác — xem
    //   `utils/session-progress.utils.ts`.
    return resolveSessionProgress(
      session.progress_percent,
      session.status,
      SESSION_DEFAULT_PROGRESS[session.status] ?? 0,
      {
        startDate: session.start_date,
        endDate: session.expected_harvest_date ?? session.end_date,
        durationDays: session.duration_days,
      },
    )
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
      /*
       * ⚠ `size="large"` (736px) thay vì 760px cố định — tab "Lịch sử IoT"
       *   có biểu đồ 2 trục Y + bảng rộng (cảm biến / lệnh thiết bị).
       */
      size="large"
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
        /*
         * ⚠ `key={session.session_id}` ⇒ remount toàn bộ nội dung khi đổi
         *   phiên ⇒ `activeTab` reset về `'overview'` (pattern "reset state
         *   bằng key" của React) ⇒ mở phiên mới **không** kế thừa tab "Lịch sử
         *   IoT" của phiên cũ ⇒ không kéo request nặng ngầm.
         */
        <SessionDetailContent
          key={session.session_id}
          session={session}
          progressPercent={progressPercent}
          spawnIssued={farmSession?.spawn_issued ?? null}
        />
      )}
    </Drawer>
  )
}

interface SessionDetailContentProps {
  session: CultivationSession
  progressPercent: number
  spawnIssued: number | null
}

function SessionDetailContent({
  session,
  progressPercent,
  spawnIssued,
}: SessionDetailContentProps) {
  const statusConfig = SESSION_STATUS_CONFIG[session.status]

  /**
   * Tab đang active.
   *
   * ⚠ **Nguồn sự thật duy nhất** cho việc lazy-load: chỉ tab IoT được mount
   *   (⇒ chỉ khi đó mới gọi 2 API lịch sử IoT) và tab "Kiểm tra phôi" chỉ
   *   gọi API khi được chọn.
   */
  const [activeTab, setActiveTab] = useState('overview')

  /*
   * ⚠ **Lazy loading**: lịch sử kiểm tra phôi chỉ tải khi user thực sự mở
   *   tab "Kiểm tra phôi" ⇒ mở Drawer không bị chặn bởi request này.
   */
  const { data: inspections, isLoading: inspectionsLoading } =
    useSpawnInspections(session.session_id, {
      enabled: activeTab === 'inspections',
    })

  /**
   * Tầng của các khay được gán — fallback cho ngưỡng canh tác khi BE chưa
   * trả danh sách tầng đã map trong `/iot-history`.
   */
  const floorIds = useMemo(
    () =>
      [
        ...new Set(
          session.trays
            .map((tray) => tray.floor_id)
            .filter((id): id is number => typeof id === 'number'),
        ),
      ],
    [session.trays],
  )

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
        onChange={setActiveTab}
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
              <SpawnInspectionList
                inspections={inspections?.inspections ?? []}
              />
            ),
          },
          {
            /*
             * ⚠ Tab "Lịch sử IoT" — dùng 2 endpoint read-only:
             *   - `GET .../iot-history/sensors` → biểu đồ nhiệt độ / độ ẩm.
             *   - `GET .../iot-history`         → nhật ký lệnh thiết bị.
             *
             * ⚠ Chỉ render khi tab đang active ⇒ không gọi API khi user mới
             *   mở drawer (2 request thừa cho mọi lần xem chi tiết phiên).
             */
            key: 'iot-history',
            label: 'Lịch sử IoT',
            children:
              activeTab === 'iot-history' ? (
                <SessionIoTHistoryTab
                  sessionId={session.session_id}
                  fallbackFloorIds={floorIds}
                />
              ) : (
                <Skeleton active paragraph={{ rows: 4 }} />
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
