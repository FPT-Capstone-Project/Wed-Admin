/**
 * QuickSummaryStats — dải KPI hàng đầu của Dashboard.
 *
 * ⚠ Nguồn số liệu: `GET /api/analytics/dashboard` (một request duy nhất) —
 *   không còn gộp nhiều endpoint bằng `Promise.all` như trước.
 *
 *   - `revenue.value` → doanh thu (format theo `revenue.currency`).
 *   - `trays_used` → số khay đã sử dụng.
 *   - `harvest_quality.usable_rate` → tỷ lệ đạt (%).
 *   - `harvest_quality.waste_rate` → tỷ lệ hao hụt (%).
 *
 * Dùng `StatCard` từ shared/ui (phân cấp thị giác chuẩn) và `StatusBadge`
 * cho badge phụ khay bảo trì — đảm bảo WCAG AA contrast.
 *
 * ⚠ KHÔNG dùng màu raw hay antd Tag color="red" (fail WCAG 4.5:1).
 */
import {
  AlertOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  ExperimentOutlined,
  InboxOutlined,
} from '@ant-design/icons'
import { Col, Row } from 'antd'
import { StatCard, StatusBadge } from '../../../shared/ui'
import {
  formatDashboardCurrency,
  formatDashboardPercent,
} from '../utils/dashboard-format'
import type { DashboardAnalyticsData } from '../../../types/dashboard'

interface QuickSummaryStatsProps {
  /** Số liệu tổng quan từ BE (chưa format). */
  metrics: DashboardAnalyticsData
  /** Tổng số khay trong hệ thống — để hiển thị tỷ lệ lấp đầy. */
  totalTrays: number
  /** Số khay đang vận hành — để hiển thị tỷ lệ lấp đầy. */
  activeInUseTrays: number
  /** Khay đang cách ly / nhiễm bệnh / maintenance — hiển thị badge phụ. */
  maintenanceTrays: number
  /** Số cảnh báo vận hành chờ xử lý. */
  activeAlerts: number
}

function getPercentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

export function QuickSummaryStats({
  metrics,
  totalTrays,
  activeInUseTrays,
  maintenanceTrays,
  activeAlerts,
}: QuickSummaryStatsProps) {
  const occupancyPct = getPercentage(activeInUseTrays, totalTrays)

  const revenue = metrics.revenue
  const harvest = metrics.harvest_quality

  return (
    <Row
      gutter={[12, 12]}
      wrap
      aria-label="Thống kê nhanh trang trại"
    >
      {/* KPI 1 — Doanh thu */}
      <Col flex="1 1 220px">
        <StatCard
          title="Doanh thu"
          value={formatDashboardCurrency(revenue.value, revenue.currency)}
          icon={<DollarOutlined />}
          tone="ok"
          highlightValue
          description="Tổng đơn đã thanh toán (mọi thời điểm)"
        />
      </Col>

      {/* KPI 2 — Số khay hoạt động */}
      <Col flex="1 1 220px">
        <StatCard
          title="Khay đã sử dụng"
          value={metrics.trays_used.toLocaleString('vi-VN')}
          suffix="lượt"
          icon={<InboxOutlined />}
          tone="info"
          highlightValue
          description={`${occupancyPct}% công suất (${activeInUseTrays}/${totalTrays} khay)`}
        />
      </Col>

      {/* KPI 3 — Tỷ lệ đạt */}
      <Col flex="1 1 220px">
        <StatCard
          title="Tỷ lệ đạt"
          value={formatDashboardPercent(harvest.usable_rate)}
          icon={<CheckCircleOutlined />}
          tone={harvest.usable_rate >= 80 ? 'ok' : 'warning'}
          highlightValue
          description="Khối lượng thu hoạch đạt chuẩn"
          extra={
            maintenanceTrays > 0 ? (
              <StatusBadge
                tone="danger"
                label={`${maintenanceTrays} khay đang xử lý bệnh`}
                icon={<ExperimentOutlined aria-hidden="true" />}
              />
            ) : undefined
          }
        />
      </Col>

      {/* KPI 4 — Tỷ lệ hao hụt */}
      <Col flex="1 1 220px">
        <StatCard
          title="Tỷ lệ hao hụt"
          value={formatDashboardPercent(harvest.waste_rate)}
          icon={<AlertOutlined />}
          tone={harvest.waste_rate > 0 ? 'danger' : 'ok'}
          highlightValue={harvest.waste_rate > 0}
          description={
            harvest.waste_rate > 0
              ? 'Khối lượng thu hoạch bị loại'
              : 'Không có hao hụt'
          }
        />
      </Col>

      {/* KPI 5 — Cảnh báo chờ xử lý */}
      <Col flex="1 1 220px">
        <StatCard
          title="Cảnh báo chờ xử lý"
          value={activeAlerts.toLocaleString('vi-VN')}
          suffix="cảnh báo"
          icon={<AlertOutlined />}
          tone={activeAlerts > 0 ? 'danger' : 'ok'}
          highlightValue={activeAlerts > 0}
          description={
            activeAlerts > 0 ? 'Cần kiểm tra trong hôm nay' : 'Không có sự cố mới'
          }
        />
      </Col>
    </Row>
  )
}
