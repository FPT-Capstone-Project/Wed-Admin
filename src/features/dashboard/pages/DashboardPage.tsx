/**
 * DashboardPage — Trang tổng quan trang trại MCMS.
 *
 * ⚠ 100% READ-ONLY — mọi số liệu đến từ API GET thật qua `useFarmAnalytics`:
 *   - `/api/cultivation-rooms` — tổng số phòng
 *   - `/api/iot/floors` — tổng số tầng
 *   - `/api/cultivation-trays` — tỷ lệ lấp đầy khay
 *   - `/api/cultivation-sessions/admin` — phiên canh tác theo giai đoạn
 *   - `/api/rental-packages` — giá gói thuê (doanh thu ước tính)
 *   - `/api/iot/masters` + `/api/iot/floors/{id}/environment` — sức khoẻ IoT
 *   - `/api/notifications` — thông báo chưa đọc
 *
 * → KHÔNG dùng `useRoomStore` / `useAlertStore` / `useOrderStore` (mock).
 */
import { CalendarOutlined, CloudOutlined, FireOutlined } from '@ant-design/icons'
import { Col, Row, Skeleton, Typography } from 'antd'
import { useMemo } from 'react'
import { PageHeader, StatusBadge } from '../../../shared/ui'
import { useFarmAnalytics } from '../../analytics/hooks/useFarmAnalytics'
import { EnvironmentChart } from '../components/EnvironmentChart'
import { EnvironmentMetricCard } from '../components/EnvironmentMetricCard'
import { QuickSummaryStats } from '../components/QuickSummaryStats'
import { RecentAlertsTable } from '../components/RecentAlertsTable'
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

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useFarmAnalytics()

  const summary = useMemo(() => {
    const trays = data?.trays
    const devices = data?.devices

    return {
      totalTrays: trays?.total ?? 0,
      activeInUseTrays: trays?.occupied ?? 0,
      availableTrays: trays?.available ?? 0,
      maintenanceTrays: trays?.maintenance ?? 0,
      activeAlerts: data?.activeAlerts ?? 0,
      totalRooms: data?.totalRooms ?? 0,
      totalFloors: data?.totalFloors ?? 0,
      averageTemperature: devices?.averageTemperature ?? 0,
      averageHumidity: devices?.averageHumidity ?? 0,
      floorsWithData: devices?.floorsWithData ?? 0,
    }
  }, [data])

  /**
   * Dữ liệu biểu đồ môi trường — từ `GET /api/iot/floors/{id}/environment`.
   * Chỉ lấy tầng có đủ nhiệt độ + độ ẩm.
   */
  const environmentChartData = useMemo(
    () =>
      (data?.floorEnvironments ?? [])
        .filter(
          (env): env is typeof env & { temperature: number; humidity: number } =>
            typeof env.temperature === 'number' && typeof env.humidity === 'number',
        )
        .map((env) => ({
          time: env.floorName,
          temperature: env.temperature,
          humidity: env.humidity,
        })),
    [data],
  )

  if (isLoading) {
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

  if (isError) {
    return (
      <div className="dashboard-page">
        <PageHeader
          title="Tổng quan trang trại"
          description="Không tải được số liệu từ hệ thống."
          actions={<TodayChip />}
        />
        <Typography.Paragraph type="danger">
          {error?.message ?? 'Đã xảy ra lỗi không xác định.'}
        </Typography.Paragraph>
        <Typography.Link onClick={() => void refetch()}>Thử lại</Typography.Link>
      </div>
    )
  }

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
            tone={data?.devices && data.devices.offline > 0 ? 'warning' : 'ok'}
            label={
              data?.devices
                ? `${data.devices.online}/${data.devices.total} Master online`
                : 'Chưa có dữ liệu thiết bị'
            }
          />
        </div>

        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} xl={8}>
            <EnvironmentMetricCard
              title="Nhiệt độ trung bình"
              value={summary.averageTemperature}
              unit="°C"
              precision={1}
              icon={<FireOutlined />}
              tone="coral"
              statusTone="ok"
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
              statusTone="ok"
              status="Tối ưu"
              target="Mục tiêu 80–92%"
            />
          </Col>

          <Col xs={24} xl={8}>
            <EnvironmentMetricCard
              title="Tỷ lệ lấp đầy khay"
              value={data?.trays.occupancyRate ?? 0}
              unit="%"
              precision={1}
              icon={<FireOutlined />}
              tone="coral"
              statusTone="ok"
              status={
                (data?.trays.occupancyRate ?? 0) >= 50 ? 'Đang khai thác' : 'Còn dư công suất'
              }
              target={`${data?.trays.occupied ?? 0}/${data?.trays.total ?? 0} khay đang thuê`}
            />
          </Col>
        </Row>

        <div className="dashboard-chart-wrap">
          <EnvironmentChart
            data={environmentChartData}
            floorsWithData={environmentChartData.length}
          />
        </div>
      </section>

      {/* ── Cảnh báo gần đây ──────────────────────────────────────────── */}
      <RecentAlertsTable />
    </div>
  )
}
