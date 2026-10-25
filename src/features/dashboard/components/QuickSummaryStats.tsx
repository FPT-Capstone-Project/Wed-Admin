/**
 * QuickSummaryStats — 4 thẻ KPI hàng đầu của Dashboard.
 *
 * Dùng `StatCard` từ shared/ui (phân cấp thị giác chuẩn) và `StatusBadge`
 * cho badge phụ khay bảo trì — đảm bảo WCAG AA contrast.
 *
 * ⚠ KHÔNG dùng màu raw hay antd Tag color="red" (fail WCAG 4.5:1).
 */
import {
  AlertOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
  InboxOutlined,
} from '@ant-design/icons'
import { Col, Flex, Row } from 'antd'
import { StatCard, StatusBadge } from '../../../shared/ui'

interface QuickSummaryStatsProps {
  totalTrays: number
  activeInUseTrays: number
  availableTrays: number
  /** Khay đang cách ly / nhiễm bệnh / maintenance — hiển thị badge phụ */
  maintenanceTrays: number
  activeAlerts: number
}

function getPercentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

export function QuickSummaryStats({
  totalTrays,
  activeInUseTrays,
  availableTrays,
  maintenanceTrays,
  activeAlerts,
}: QuickSummaryStatsProps) {
  const occupancyPct = getPercentage(activeInUseTrays, totalTrays)
  const availablePct = getPercentage(availableTrays, totalTrays)

  return (
    <Row gutter={[16, 16]} aria-label="Thống kê nhanh trang trại">
      {/* KPI 1 — Tổng số khay */}
      <Col xs={24} sm={12} xl={6}>
        <StatCard
          title="Tổng số khay nuôi"
          value={totalTrays}
          suffix="khay"
          icon={<AppstoreOutlined />}
          tone="ok"
          description="Công suất toàn trang trại"
        />
      </Col>

      {/* KPI 2 — Đang vận hành */}
      <Col xs={24} sm={12} xl={6}>
        <StatCard
          title="Đang vận hành"
          value={activeInUseTrays}
          suffix="khay"
          icon={<CheckCircleOutlined />}
          tone="info"
          description={`${occupancyPct}% tổng công suất`}
        />
      </Col>

      {/* KPI 3 — Sẵn sàng cho thuê */}
      <Col xs={24} sm={12} xl={6}>
        <StatCard
          title="Sẵn sàng cho thuê"
          value={availableTrays}
          suffix="khay"
          icon={<InboxOutlined />}
          tone="warning"
          description={
            <Flex align="center" gap={6} wrap>
              <span>{availablePct}% còn trống</span>
              {maintenanceTrays > 0 && (
                <StatusBadge
                  tone="danger"
                  label={`${maintenanceTrays} khay đang xử lý bệnh`}
                  icon={<ExperimentOutlined aria-hidden="true" />}
                />
              )}
            </Flex>
          }
        />
      </Col>

      {/* KPI 4 — Cảnh báo chờ xử lý */}
      <Col xs={24} sm={12} xl={6}>
        <StatCard
          title="Cảnh báo chờ xử lý"
          value={activeAlerts}
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
