/**
 * DashboardPage — Trang tổng quan trang trại MCMS.
 *
 * Bố cục (theo thứ tự ưu tiên):
 *   1. PageHeader   — tiêu đề + ngày hôm nay (shared/ui)
 *   2. KPI Row      — 4 thẻ thống kê nhanh (QuickSummaryStats)
 *   3. Môi trường   — 3 thẻ chỉ số + biểu đồ 24h
 *   4. Cảnh báo     — danh sách 3 cảnh báo gần nhất
 *
 * Logic lấy dữ liệu giữ nguyên — chỉ thay đổi phần render/bố cục.
 */
import {
  CalendarOutlined,
  CheckCircleFilled,
  CloudOutlined,
  CloudServerOutlined,
  FireOutlined,
} from '@ant-design/icons'
import { Col, Row, Typography } from 'antd'
import { useMemo } from 'react'
import { useAlertStore } from '../../../stores/alert.store'
import { getAllTrays, useRoomStore } from '../../../stores/room.store'
import { PageHeader } from '../../../shared/ui'
import { EnvironmentChart } from '../components/EnvironmentChart'
import { EnvironmentMetricCard } from '../components/EnvironmentMetricCard'
import { QuickSummaryStats } from '../components/QuickSummaryStats'
import { RecentAlertsTable } from '../components/RecentAlertsTable'

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
    <div
      className="dashboard-date"
      aria-label={`Hôm nay, ${today}`}
    >
      <CalendarOutlined aria-hidden="true" />
      <span>
        <small>Hôm nay</small>
        <strong>{today}</strong>
      </span>
    </div>
  )
}

export function DashboardPage() {
  const tiers = useRoomStore((state) => state.tiers)
  const alerts = useAlertStore((state) => state.alerts)

  const summary = useMemo(() => {
    const trays = getAllTrays(tiers)
    const tierCount = tiers.length
    const activeInUseTrays = trays.filter(
      (tray) => tray.status === 'rented' || tray.status === 'harvesting',
    ).length
    const activeAlerts = alerts.filter(
      (alert) => !alert.isAcknowledged,
    ).length

    return {
      totalTrays: trays.length,
      activeInUseTrays,
      availableTrays: trays.filter((tray) => tray.status === 'empty').length,
      maintenanceTrays: trays.filter(
        (tray) => tray.status === 'maintenance',
      ).length,
      activeAlerts,
      averageTemperature:
        tierCount > 0
          ? tiers.reduce(
              (total, tier) => total + tier.telemetry.temperature,
              0,
            ) / tierCount
          : 0,
      averageHumidity:
        tierCount > 0
          ? Math.round(
              tiers.reduce(
                (total, tier) => total + tier.telemetry.humidity,
                0,
              ) / tierCount,
            )
          : 0,
      averageCo2:
        tierCount > 0
          ? Math.round(
              tiers
                .map((tier) => tier.telemetry.co2)
                .filter((value): value is number => value != null)
                .reduce((total, value) => total + value, 0) /
                Math.max(
                  tiers.filter(
                    (tier) => tier.telemetry.co2 != null,
                  ).length,
                  1,
                ),
            )
          : 0,
    }
  }, [alerts, tiers])

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
        totalTrays={summary.totalTrays}
        activeInUseTrays={summary.activeInUseTrays}
        availableTrays={summary.availableTrays}
        maintenanceTrays={summary.maintenanceTrays}
        activeAlerts={summary.activeAlerts}
      />

      {/* ── Điều kiện môi trường ──────────────────────────────────────── */}
      <section className="dashboard-section" aria-labelledby="environment-heading">
        <div className="section-heading-row">
          <div>
            <Typography.Title id="environment-heading" level={4}>
              Điều kiện môi trường
            </Typography.Title>
            <Typography.Text type="secondary">
              Giá trị trung bình từ {tiers.length} tầng nuôi nấm
            </Typography.Text>
          </div>
          <span className="healthy-indicator">
            <CheckCircleFilled aria-hidden="true" />
            Trong ngưỡng vận hành
          </span>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} xl={8}>
            <EnvironmentMetricCard
              title="Nhiệt độ trung bình"
              value={summary.averageTemperature}
              unit="°C"
              precision={1}
              icon={<FireOutlined />}
              tone="coral"
              status="Ổn định"
              target="Mục tiêu 23–28°C"
            />
          </Col>

          <Col xs={24} sm={12} xl={8}>
            <EnvironmentMetricCard
              title="Độ ẩm trung bình"
              value={summary.averageHumidity}
              unit="%"
              icon={<CloudOutlined />}
              tone="teal"
              status="Tối ưu"
              target="Mục tiêu 80–92%"
            />
          </Col>

          <Col xs={24} sm={12} xl={8}>
            <EnvironmentMetricCard
              title="CO₂ trung bình"
              value={summary.averageCo2}
              unit=" ppm"
              icon={<CloudServerOutlined />}
              tone="amber"
              status="An toàn"
              target="Ngưỡng dưới 1.000 ppm"
            />
          </Col>
        </Row>

        <div className="dashboard-chart-wrap">
          <EnvironmentChart />
        </div>
      </section>

      {/* ── Cảnh báo gần đây ─────────────────────────────────────────── */}
      <RecentAlertsTable />
    </div>
  )
}
