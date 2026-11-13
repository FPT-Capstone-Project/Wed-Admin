import { formatDate } from '../../../shared/utils/date'
import '../sessions-industrial.css'
import { ExperimentOutlined, PictureOutlined, ShopOutlined } from '@ant-design/icons'
import {
  Button,
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
import { LoadErrorAlert } from '../../../shared/ui/LoadErrorAlert'
import { useAdminCultivationSession } from '../hooks/useAdminCultivationSessions'
import { toCultivationSession } from '../api/admin-session-mapper'
import {
  MUSHROOM_GROWTH_PHASE_DICTIONARY,
  SESSION_STATUS_DICTIONARY,
  resolveGrowthPhase,
  resolveSessionHarvestStatus,
} from '../../../shared/i18n/status/session'
import { PAYMENT_STATUS_DICTIONARY } from '../../../shared/i18n/status/order'
import { presentStatus } from '../../../shared/i18n/status/registry'
import { resolveSessionProgress } from '../utils/session-progress.utils'
import { SessionStatusTag } from './SessionStatusTag'
import { useFarmSession, useSpawnInspections } from '../../farm/hooks/useFarm'
import { SpawnInspectionList } from '../../farm/components/SpawnInspectionList'
import { useSessionGallery } from '../hooks/useSessionGallery'
import { DailyInspectionList } from './DailyInspectionList'
import { GalleryPhotoGrid } from './GalleryPhotoGrid'
import { SessionGalleryModal } from './SessionGalleryModal'
import { SessionIoTHistoryTab } from './SessionIoTHistoryTab'
import { toSessionFloorKey } from '../utils/session-floor-matching.utils'
import type { CultivationSession } from '../types/session.types'

interface SessionDetailDrawerProps {
  sessionId: number | null
  onClose: () => void
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
    // ⚠ Tiến độ **chỉ** lấy từ Phiên canh tác (`progress_percent` do Farm OP
    //   cập nhật) — không suy ra từ ngày bắt đầu / ngày thu hoạch.
    //   Xem `utils/session-progress.utils.ts`.
    return resolveSessionProgress(session.progress_percent, session.status)
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
                    {...presentStatus(
                      PAYMENT_STATUS_DICTIONARY,
                      session.payment_status,
                    )}
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
  // ⚠ `presentStatus` ⇒ không bao giờ lộ enum lạ của BE.
  const statusConfig = presentStatus(SESSION_STATUS_DICTIONARY, session.status)

  /**
   * ⚠ Giai đoạn hiển thị thuộc **1 trong 4 giai đoạn trồng nấm**
   *   ("Ủ tơ" → "Kéo tơ" → "Nấm đang phát triển" → "Sẵn sàng thu hoạch").
   *
   * ⚠ Phiên `CULTIVATING` mặc định là **"Kéo tơ"** (phôi đã lên khay, chưa
   *   có ghi nhận ra quả của Farm OP) — chỉ khi `current_stage` ∈
   *   `FRUITING_INITIATION` / `PINNING` / `YOUNG_FRUITING` / `FRUITING` thì
   *   mới hiển thị "Nấm đang phát triển".
   *
   * ⚠ Phiên đã `COMPLETED` ⇒ "Hoàn thành" (tiến độ 100 %), KHÔNG phải
   *   "Sẵn sàng thu hoạch" — `resolveGrowthPhase` ưu tiên trạng thái kết thúc.
   */
  const growthPhase = resolveGrowthPhase(
    session.current_stage ?? session.growth_status,
    session.status,
  )
  const growthPhaseLabel = growthPhase
    ? MUSHROOM_GROWTH_PHASE_DICTIONARY[growthPhase].label
    : statusConfig.label

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

  /*
   * ⚠ **Lazy loading**: kiểm tra khay (giai đoạn 2) + thư viện ảnh tổng hợp
   *   chỉ tải khi user mở 1 trong 2 tab liên quan ⇒ không tải 2 endpoint ảnh
   *   khi user mới mở drawer.
   *
   * ⚠ Dùng **chung 1 hook** (`useSessionGallery`) cho cả "Kiểm tra khay" lẫn
   *   "Thư viện ảnh" ⇒ không tạo 2 observer trên cùng 1 query key (TanStack
   *   Query sẽ chạy 1 request cho mỗi key, nhưng 2 observer vẫn là 2 sub).
   */
  const gallery = useSessionGallery(
    session.session_id,
    activeTab === 'tray-inspections' || activeTab === 'gallery',
  )

  /** Mở modal thư viện ảnh — chỉ khi bấm nút (không tự mở). */
  const [galleryOpen, setGalleryOpen] = useState(false)

  /**
   * Tầng của các khay được gán — nguồn chuẩn cho các tầng thuộc phiên.
   *
   * ⚠ Dùng cho cả biểu đồ môi trường (lọc tầng của phiên) lẫn nhật ký thiết
   *   bị (gộp log theo tầng).
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

  /**
   * Khoá tầng của phiên — dùng để **khớp** với danh sách tầng của BE.
   *
   * ⚠ **Vì sao cần nhiều thông tin hơn `floor_id`?**
   *   Schema Swagger của `GET /api/iot/floors` **không** khai báo cột
   *   `floor_id` ⇒ ở runtime cột này có thể thiếu ⇒ ta khớp theo thứ tự:
   *   `floor_id` → `room_id` + `floor_number` → `master_id` + `node_address` →
   *   `floor_name`.
   *
   *   Xem `utils/session-floor-matching.utils.ts`.
   */
  const floorKeys = useMemo(
    () =>
      session.trays.map((tray) =>
        toSessionFloorKey({
          floor_id: tray.floor_id,
          room_id: tray.room_id,
          floor_number: tray.floor_number,
          floor_name: tray.floor_name,
        }),
      ),
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
            {growthPhaseLabel} · {progressPercent}%
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
                          label={formatDate(session.start_date)}
                        />
                      ),
                    },
                    {
                      key: 'end',
                      label: 'Ngày kết thúc',
                      children: (
                        <MetadataBadge
                          className="mcms-session-mono"
                          label={formatDate(
                            session.expected_harvest_date ?? session.end_date,
                          )}
                        />
                      ),
                    },
                    { key: 'spawnRequested', label: 'Số phôi yêu cầu', children: session.spawn_quantity ?? '—' },
                    {
                      key: 'harvestStatus',
                      label: 'Trạng thái thu hoạch',
                      /*
                       * ⚠ Phiên đã `COMPLETED` ⇒ **"Đã thu hoạch"** (xanh lá),
                       *   KHÔNG phải badge cam "Sẵn sàng thu hoạch" (BE vẫn giữ
                       *   `harvest_status = 'HARVEST_READY'` sau khi kết thúc).
                       */
                      children: resolveSessionHarvestStatus(
                        session.status,
                        session.harvest_status,
                      )?.label ?? '—',
                    },
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
             * ⚠ Tab "Kiểm tra khay" — **giai đoạn 2** của vòng đời.
             *
             *   Nguồn: `GET /api/cultivation-sessions/{sessionId}/daily-inspections`
             *   (đã gộp mọi trang) ⇒ gồm ảnh của từng lần kiểm tra.
             *
             * ⚠ Chỉ render khi tab đang active ⇒ không gọi API khi user mới
             *   mở drawer.
             */
            key: 'tray-inspections',
            label: 'Kiểm tra khay',
            children:
              activeTab === 'tray-inspections' ? (
                gallery.isLoading ? (
                  <Skeleton active paragraph={{ rows: 4 }} />
                ) : gallery.isError ? (
                  <LoadErrorAlert
                    error={gallery.error}
                    resource="lịch sử kiểm tra khay"
                    onRetry={gallery.refetch}
                  />
                ) : (
                  <DailyInspectionList
                    inspections={gallery.dailyInspections}
                    showTrayLabel
                  />
                )
              ) : (
                <Skeleton active paragraph={{ rows: 4 }} />
              ),
          },
          {
            /*
             * ⚠ Tab "Thư viện ảnh" — thư viện ảnh **tổng hợp** xuyên suốt
             *   vòng đời: giai đoạn 1 (ủ phôi) + giai đoạn 2 (trên khay).
             *
             * ⚠ BE chưa có endpoint gộp ⇒ FE gọi 2 endpoint rồi ghép — xem
             *   `features/sessions/hooks/useSessionGallery.ts`.
             */
            key: 'gallery',
            label: 'Thư viện ảnh',
            children:
              activeTab === 'gallery' ? (
                <Flex vertical gap={12}>
                  <Flex justify="space-between" align="center" gap={8} wrap>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {gallery.stats.total} ảnh từ {gallery.stats.inspectionCount}{' '}
                      lần kiểm tra (ủ phôi: {gallery.stats.spawnCount} · trên
                      khay: {gallery.stats.trayCount})
                    </Typography.Text>
                    <Button
                      type="primary"
                      icon={<PictureOutlined />}
                      disabled={gallery.stats.total === 0}
                      onClick={() => setGalleryOpen(true)}
                    >
                      Xem thư viện ảnh
                    </Button>
                  </Flex>
                  {gallery.isError ? (
                    <LoadErrorAlert
                      error={gallery.error}
                      resource="thư viện ảnh phiên"
                      onRetry={gallery.refetch}
                    />
                  ) : gallery.isLoading ? (
                    <Skeleton active paragraph={{ rows: 3 }} />
                  ) : gallery.photos.length === 0 ? (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Chưa có ảnh kiểm tra nào trong vòng đời phiên này.
                    </Typography.Text>
                  ) : (
                    <GalleryPhotoGrid
                      photos={gallery.photos}
                      onSelect={() => setGalleryOpen(true)}
                    />
                  )}
                </Flex>
              ) : (
                <Skeleton active paragraph={{ rows: 4 }} />
              ),
          },
          {
            /*
             * ⚠ Tab "Lịch sử IoT" — dùng 2 nhóm endpoint read-only:
             *   - `GET /api/environment-history/sessions/{sessionId}`
             *     → lịch sử môi trường (biểu đồ + bảng cảm biến chi tiết).
             *   - `GET /api/iot/floors/{floorId}/auto-control/logs`
             *     → nhật ký chu kỳ bật/tắt thiết bị.
             *
             * ⚠ Chỉ render khi tab đang active ⇒ không gọi API khi user mới
             *   mở drawer (request thừa cho mọi lần xem chi tiết phiên).
             */
            key: 'iot-history',
            label: 'Lịch sử IoT',
            children:
              activeTab === 'iot-history' ? (
                <SessionIoTHistoryTab
                  sessionId={session.session_id}
                  fallbackFloorIds={floorIds}
                  floorKeys={floorKeys}
                  sessionStart={session.start_date}
                  sessionEnd={session.end_date}
                  sessionStatus={session.status}
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

      <SessionGalleryModal
        open={galleryOpen}
        onCancel={() => setGalleryOpen(false)}
        photos={gallery.photos}
        stats={gallery.stats}
        isLoading={gallery.isLoading}
        error={gallery.error}
        onRetry={gallery.refetch}
        contextLabel={`Phiên #${session.session_id}`}
      />
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
