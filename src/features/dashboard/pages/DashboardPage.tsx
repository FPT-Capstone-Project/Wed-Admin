import { summarizeFarmClimate } from '../../rooms/utils/farm-climate.utils'
/**
 * DashboardPage — Trang tổng quan trang trại MCMS.
 *
 * ⚠ 100% READ-ONLY — mọi số liệu đến từ API GET thật.
 *
 * ## Nguồn số liệu (đã refactor)
 *
 * **KPI tổng quan** — `GET /api/analytics/dashboard` (một request duy nhất):
 *   - `revenue` → doanh thu
 *   - `trays_used` → số khay đã sử dụng
 *   - `harvest_quality.usable_rate` / `waste_rate` → tỷ lệ đạt / hao hụt
 *
 * **Cơ cấu trang trại** — 4 endpoint danh sách, gọi song song, **không** có
 *   vòng lặp N+1 (xem `useFarmStructure`):
 *   - `/api/cultivation-rooms`, `/api/cultivation-trays`
 *   - `/api/iot/floors`, `/api/iot/masters`
 *
 * **Môi trường theo tầng** — `/api/iot/floors/{id}/environment` cho từng tầng,
 *   nhưng mỗi tầng là một query độc lập (`useQueries`) ⇒ một tầng lỗi **không**
 *   làm hỏng cả trang (không còn cascade failure như `Promise.all` cũ).
 *
 * → KHÔNG dùng `useRoomStore` / `useAlertStore` / `useOrderStore` (mock).
 */
import { CalendarOutlined, CloudOutlined, FireOutlined } from '@ant-design/icons'
import { Col, Row, Skeleton, Typography } from 'antd'
import { useMemo } from 'react'
import { PageHeader, StatusBadge } from '../../../shared/ui'
import { getApiErrorMessage } from '../../../shared/api/error'
import { useDashboardMetrics } from '../hooks/useDashboardMetrics'
import { useFarmStructure } from '../hooks/useFarmStructure'
import { useFloorEnvironmentOverview } from '../hooks/useFloorEnvironmentOverview'
import { useOperationalAlerts } from '../../alerts/hooks/useOperationalAlerts'
import { EnvironmentChart } from '../components/EnvironmentChart'
import { EnvironmentMetricCard } from '../components/EnvironmentMetricCard'
import { QuickSummaryStats } from '../components/QuickSummaryStats'
import { RecentAlertsTable } from '../components/RecentAlertsTable'
import type { DashboardAnalyticsData } from '../../../types/dashboard'
import '../dashboard.css'

function getFormattedToday() {
  const formattedDate = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)
}

/** Chip ngày — hiển thị ở góc phải PageHeader. */
function TodayChip() {
  const today = getFormattedToday()
  return (
    <div className="dashboard-date" aria-label={`Hôm nay, ${today}`}>
      <CalendarOutlined aria-hidden="true" />
      <span>
        <small>Hôm nay</small>
        <strong>{today}</strong>
      </span>
    </div>
  )
}

/** Fallback khi query chưa có dữ liệu (không bao giờ render `NaN`). */
const EMPTY_METRICS: DashboardAnalyticsData = {
  revenue: { value: 0, currency: 'VND' },
  trays_used: 0,
  harvest_quality: { usable_rate: 0, waste_rate: 0 },
}

export function DashboardPage() {
  // ── KPI tổng quan: một request duy nhất ──────────────────────────────
  const metricsQuery = useDashboardMetrics()
  const metrics = metricsQuery.data

  // ── Cơ cấu trang trại: 4 request song song, không N+1 ─────────────────
  const structureQuery = useFarmStructure()
  const structure = structureQuery.structure

  // ── Môi trường theo tầng: query độc lập, lỗi cục bộ ─────────────────
  const environmentQuery = useFloorEnvironmentOverview()

  // ── Cảnh báo vận hành (dùng chung query key với RecentAlertsTable) ────
  const alertsQuery = useOperationalAlerts()

  const summary = useMemo(
    () => ({
      totalTrays: structure.trays.total,
      activeInUseTrays: structure.trays.occupied,
      availableTrays: structure.trays.available,
      maintenanceTrays: structure.trays.maintenance,
      totalRooms: structure.totalRooms,
      totalFloors: structure.totalFloors,
      occupancyRate: structure.trays.occupancyRate,
    }),
    [structure],
  )

  /**
   * Nhiệt độ / độ ẩm trung bình toàn trang trại — tính từ các tầng có
   * dữ liệu cảm biến hợp lệ.
   */
  const temperatureSummary = summarizeFarmClimate(environmentQuery.points, 'temperature')
  const humiditySummary = summarizeFarmClimate(environmentQuery.points, 'humidity')

  /**
   * Giữ tầng thiếu số đo để biểu đồ không che giấu khoảng trống dữ liệu.
   */

  // ── Trạng thái tải: chờ KPI + cơ cấu trang trại ───────────────────────
  const isInitialLoading =
    metricsQuery.isLoading || structureQuery.isLoading

  // ── Trạng thái lỗi: KPI là nguồn chính → lỗi ở đây chặn cả trang ─────
  const isBlockingError = metricsQuery.isError

  if (isInitialLoading) {
    return (
      <div className="dashboard-page">
        <PageHeader
          title="Tổng quan trang trại"
          description="Đang tải số liệu thực tế từ hệ thống…"
          actions={<TodayChip />}
        />
        <Skeleton active paragraph={{ rows: 12 }} />
      </div>
    )
  }

  if (isBlockingError) {
    return (
      <div className="dashboard-page">
        <PageHeader
          title="Tổng quan trang trại"
          description="Không tải được số liệu từ hệ thống."
          actions={<TodayChip />}
        />
        <Typography.Paragraph type="danger">
          {getApiErrorMessage(metricsQuery.error)}
        </Typography.Paragraph>
        <Typography.Link onClick={() => void metricsQuery.refetch()}>
          Thử lại
        </Typography.Link>
      </div>
    )
  }

  // Lỗi cơ cấu trang trại (không chặn KPI) → hiển thị chú thích, không vỡ trang.
  const structureErrorMessage = structureQuery.isError
    ? getApiErrorMessage(structureQuery.error)
    : null

  return (
    <div className="dashboard-page">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <PageHeader
        title="Tổng quan trang trại"
        description="Theo dõi công suất khay và điều kiện vi khí hậu trong một màn hình."
        actions={<TodayChip />}
      />

      {/* ── KPI Row ─────────────────────────────────────────────────────── */}
      <QuickSummaryStats
        metrics={metrics ?? EMPTY_METRICS}
        totalTrays={summary.totalTrays}
        activeInUseTrays={summary.activeInUseTrays}
        maintenanceTrays={summary.maintenanceTrays}
        activeAlerts={alertsQuery.data?.counts.total ?? 0}
      />

      {/* ── Cơ cấu trang trại ───────────────────────────────────────────── */}
      <section className="dashboard-section" aria-labelledby="structure-heading">
        <div className="section-heading-row">
          <div>
            <Typography.Title
              id="structure-heading"
              level={2}
              style={{ fontSize: 15 }}
            >
              Cơ cấu trang trại
            </Typography.Title>
            <Typography.Text type="secondary">
              {summary.totalRooms} phòng · {summary.totalFloors} tầng ·{' '}
              {summary.totalTrays} khay
            </Typography.Text>
          </div>
          <StatusBadge
            tone={structure.devices.offline > 0 ? 'warning' : 'ok'}
            label={
              structure.devices.total > 0
                ? `${structure.devices.online}/${structure.devices.total} Master online`
                : 'Chưa có dữ liệu thiết bị'
            }
          />
        </div>

        {structureErrorMessage && (
          <Typography.Paragraph type="warning">
            Không tải được cơ cấu trang trại: {structureErrorMessage}
          </Typography.Paragraph>
        )}

        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} xl={8}>
            <EnvironmentMetricCard
              title="Nhiệt độ trung bình"
              value={temperatureSummary.value}
              unit="°C"
              precision={1}
              icon={<FireOutlined />}
              tone="coral"
              statusTone={temperatureSummary.tone}
              status={temperatureSummary.label}
              details={temperatureSummary.details}
              target={temperatureSummary.coverageNote}
            />
          </Col>

          <Col xs={24} sm={12} xl={8}>
            <EnvironmentMetricCard
              title="Độ ẩm trung bình"
              value={humiditySummary.value}
              unit="%"
              precision={1}
              icon={<CloudOutlined />}
              tone="teal"
              statusTone={humiditySummary.tone}
              status={humiditySummary.label}
              details={humiditySummary.details}
              target={humiditySummary.coverageNote}
            />
          </Col>

          <Col xs={24} xl={8}>
            <EnvironmentMetricCard
              title="Tỷ lệ lấp đầy khay"
              value={summary.occupancyRate}
              unit="%"
              precision={1}
              icon={<FireOutlined />}
              tone="coral"
              statusTone="ok"
              status={
                summary.occupancyRate >= 50
                  ? 'Đang khai thác'
                  : 'Còn dư công suất'
              }
              target={`${summary.activeInUseTrays}/${summary.totalTrays} khay đang thuê`}
            />
          </Col>
        </Row>

        <div className="dashboard-chart-wrap">
          <EnvironmentChart
            data={environmentQuery.points}
          />
        </div>
      </section>

      {/* ── Cảnh báo gần đây ──────────────────────────────────────────── */}
      <RecentAlertsTable />
    </div>
  )
}
