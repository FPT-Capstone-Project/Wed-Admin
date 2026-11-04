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
import { Col, Row, Typography } from 'antd'
import { tokens } from '../../../app/theme/tokens'
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
    <Row gutter={[Number.parseInt(tokens.space['4'], 10), Number.parseInt(tokens.space['6'], 10)]} aria-label="Thống kê nhanh trang trại">
      <Col xs={24} xl={6}><Typography.Title level={2} style={{ fontSize: tokens.typography.sizeTitle, marginTop: 0, marginBottom: tokens.space['3'] }}>Doanh thu</Typography.Title>
        <StatCard
          title="Doanh thu"
          value={formatDashboardCurrency(revenue.value, revenue.currency)}
          icon={<DollarOutlined />}
          tone="info"
          highlightValue
          description="Đã thanh toán · mọi thời điểm"
        />
      </Col>
      <Col xs={24} xl={12}><Typography.Title level={2} style={{ fontSize: tokens.typography.sizeTitle, marginTop: 0, marginBottom: tokens.space['3'] }}>Khay</Typography.Title>
        <Row gutter={[Number.parseInt(tokens.space['3'], 10), Number.parseInt(tokens.space['3'], 10)]}>
          <Col xs={24} sm={8}>
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
<Col xs={24} sm={8}>
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
<Col xs={24} sm={8}>
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
        </Row>
      </Col>
      <Col xs={24} xl={6}><Typography.Title level={2} style={{ fontSize: tokens.typography.sizeTitle, marginTop: 0, marginBottom: tokens.space['3'] }}>Cảnh báo</Typography.Title>
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
