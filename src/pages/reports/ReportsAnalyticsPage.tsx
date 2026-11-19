import {
AppstoreOutlined,
DatabaseOutlined,
DollarOutlined,
DownloadOutlined,
ExperimentOutlined,
InfoCircleOutlined,
PercentageOutlined,
TeamOutlined
} from '@ant-design/icons'
import {
Card,
Flex,
Segmented,
Skeleton,
Space,
Tooltip,
Typography,
message,
} from 'antd'
import { useEffect,useMemo,useState } from 'react'
import { flushSync } from 'react-dom'
import { tones } from '../../app/theme/tokens'
import { useReportsAnalytics } from '../../features/analytics/hooks/useFarmAnalytics'
import {
buildSessionRevenue,
buildStageDistribution,
buildVarietyPerformance,
computeExecutiveKpis,
} from '../../features/analytics/utils/executive-report.utils'
import { useAuthStore } from '../../features/auth/store/auth.store'
import {
ActionButton,
PageHeader,
StatCard,
StatGrid,
StatusBadge,
} from '../../shared/ui'
import { LoadErrorAlert } from '../../shared/ui/LoadErrorAlert'
import '../../styles/reports-users-industrial.css'
import { ComparativeRevenueChart } from './components/ComparativeRevenueChart'
import { KpiVarianceCard } from './components/KpiVarianceCard'
import { SpeciesRevenueDonut } from './components/SpeciesRevenueDonut'
import { VarietyPerformanceTable } from './components/VarietyPerformanceTable'
import { continuousRevenuePeriods,formatReportMoney,formatReportNumber,formatReportPercent,formatReportWeight,reportDateTime,reportFileDate } from './report-format'
import './reports-print.css'

type Granularity = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY'

/**
 * Trang Báo cáo & Phân tích — **100% READ-ONLY**.
 *
 * ⚠ Đã bỏ hoàn toàn `useRoomStore` / `useAlertStore` / `useOrderStore` (mock).
 *   Toàn bộ số liệu đến từ `useReportsAnalytics`:
 *   - `/api/analytics/dashboard` — doanh thu, khay đã dùng, chất lượng thu hoạch
 *   - `/api/farm/sessions` — phiên theo giai đoạn, giống nấm
 *   - `/api/rental-packages` — giá gói thuê (doanh thu ước tính)
 *   - `/api/cultivation-rooms`, `/api/cultivation-trays` — cơ cấu trang trại
 *   - `/api/iot/floors`, `/api/iot/masters` — sức khoẻ thiết bị
 *   - `/api/harvests/admin` — khối lượng thu hoạch
 *
 * ⚠ Không còn vòng lặp gọi endpoint theo từng tầng / từng phiên (N+1).
 */
export function ReportsAnalyticsPage() {
  const [granularity, setGranularity] = useState<Granularity>('MONTHLY')
  const [exportedAt, setExportedAt] = useState<Date | null>(null)
  const user = useAuthStore(state => state.user)
  useEffect(() => {
    const stamp = () => flushSync(() => setExportedAt(new Date()))
    window.addEventListener('beforeprint', stamp)
    return () => window.removeEventListener('beforeprint', stamp)
  }, [])

  const { data, isLoading, isFetching, isError, error, refetch } = useReportsAnalytics()

  const analytics = data

  const kpis = useMemo(
    () => (analytics ? computeExecutiveKpis(analytics) : null),
    [analytics],
  )

  const varietyPerformance = useMemo(
    () =>
      analytics
        ? buildVarietyPerformance(
            analytics.speciesBreakdown,
          )
        : [],
    [analytics],
  )

  const stageDistribution = useMemo(
    () => (analytics ? buildStageDistribution(analytics) : []),
    [analytics],
  )

  /**
   * Memoize dataset cho ComparativeRevenueChart.
   *
   * QUAN TRỌNG: Tính trực tiếp trong render sẽ tạo array literal mới mỗi lần
   * → Recharts nhận diện data thay đổi → re-mount BarChart → setState nội bộ
   * → setState kích hoạt re-render parent → loop vô tận.
   */
  const chartData = useMemo(() => {
    if (!analytics || analytics.revenueIncomplete) return []
    return continuousRevenuePeriods(buildSessionRevenue(analytics.revenueEvents, granularity), granularity)
  }, [analytics, granularity])

  const currentLabel =
    granularity === 'WEEKLY'
      ? 'Kỳ này (tuần)'
      : granularity === 'MONTHLY'
        ? 'Kỳ này (tháng)'
        : 'Kỳ này (quý)'

  const revenueDelta =
    kpis && kpis.previousTotalRevenue > 0
      ? ((kpis.totalRevenue - kpis.previousTotalRevenue) /
          kpis.previousTotalRevenue) *
        100
      : 0

  const occupancyDelta = kpis
    ? kpis.occupancyRate - kpis.previousOccupancyRate
    : 0

  const yieldDelta =
    kpis && kpis.previousHarvestedGradeAKg > 0
      ? ((kpis.harvestedGradeAKg - kpis.previousHarvestedGradeAKg) /
          kpis.previousHarvestedGradeAKg) *
        100
      : 0

  const spoilageDelta = kpis
    ? kpis.spoilageRate - kpis.previousSpoilageRate
    : 0

  const handleExportCsv = () => {
    if (!analytics || !kpis) return

    const lines: string[][] = [
      ['BÁO CÁO EXECUTIVE - MCMS'],
      [`Chế độ: ${granularity === 'WEEKLY' ? 'Theo tuần' : granularity === 'MONTHLY' ? 'Theo tháng' : 'Theo quý'}`],
      [`Xuất lúc: ${reportDateTime(new Date())}`],
      [],
      ['KPI'],
      ['Chỉ số', 'Giá trị'],
      ['Doanh thu đã thu (VND)', String(kpis.totalRevenue)],
      ['Occupancy (%)', kpis.occupancyRate.toFixed(2)],
      ['Số khay', String(kpis.totalTrays)],
      ['Khay đang thuê', String(kpis.rentedTrays)],
      ['Thương phẩm thu hoạch (kg)', String(kpis.harvestedGradeAKg)],
      ['Tỷ lệ hao hụt (%)', kpis.spoilageRate.toFixed(2)],
      ['Tổng phòng', String(analytics.totalRooms)],
      ['Tổng tầng', String(analytics.totalFloors)],
      ['Master online', `${analytics.devices.online}/${analytics.devices.total}`],
      ['Tổng phiên canh tác', String(analytics.totalSessions)],
      ['Lượt khay đã sử dụng', String(analytics.traysUsed)],
      [],
      ['PHÂN BỔ PHIÊN THEO GIAI ĐOẠN'],
      ['Giai đoạn', 'Số phiên'],
      ...stageDistribution.map((row) => [row.stage, String(row.count)]),
      [],
      ['HIỆU SUẤT THEO GIỐNG NẤM'],
      ['Giống nấm', 'Số phiên', 'Tỷ lệ thành công %', 'Doanh thu dự kiến'],
      ...varietyPerformance.map((v) => [
        v.varietyName,
        String(v.traysRented),
        v.successRate == null ? '—' : v.successRate.toFixed(1),
        analytics.revenueIncomplete ? '—' : String(v.currentRevenue),
      ]),
    ]

    const csv = `\uFEFF${lines
      .map((line) =>
        line.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','),
      )
      .join('\n')}`

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `bao-cao-mcms-${reportFileDate(new Date())}.csv`
    link.click()
    URL.revokeObjectURL(url)
    message.success('Đã xuất báo cáo Executive CSV.')
  }

  const handleExportPdf = async () => {
    if (isLoading || isFetching || !analytics || !kpis) {
      message.info('Đang tải dữ liệu')
      return
    }
    try {
      await document.fonts.ready
      flushSync(() => setExportedAt(new Date()))
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      window.print()
    } catch {
      message.error('Không mở được hộp thoại in. Vui lòng thử lại hoặc nhấn Ctrl+P.')
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Báo cáo & Phân tích Điều hành"
          description="Đang tải số liệu thực tế từ hệ thống…"
        />
        <Skeleton active paragraph={{ rows: 14 }} />
        <ActionButton icon={<DownloadOutlined />} label="Xuất báo cáo PDF" description="Đang tải dữ liệu" disabled />
      </div>
    )
  }

  if (isError || !analytics || !kpis) {
    return (
      <div>
        <PageHeader
          title="Báo cáo & Phân tích Điều hành"
          description="Không tải được số liệu báo cáo."
        />
        <LoadErrorAlert error={error} resource="số liệu báo cáo" onRetry={refetch} />
      </div>
    )
  }

  return (
    <div className="reports-page">
      <section className="reports-print-heading">
        <h1>Báo cáo điều hành MCMS</h1>
        <p>Ngày giờ xuất: {exportedAt ? reportDateTime(exportedAt) : '—'} (giờ Việt Nam)</p>
        <p>Người xuất: {user?.fullName || user?.email || 'Chưa xác định'}</p>
        <p>Phạm vi: {granularity === 'WEEKLY' ? 'Theo tuần' : granularity === 'MONTHLY' ? 'Theo tháng' : 'Theo quý'} · Tất cả kỳ có dữ liệu · Doanh thu dự kiến theo phiên canh tác.</p>
      </section>
      <PageHeader
        title={
          <Flex align="center" gap={8}>

            Báo cáo & Phân tích Điều hành
          </Flex>
        }
        description="Số liệu vận hành và doanh thu đã thu, tổng hợp trực tiếp từ hệ thống (chế độ chỉ đọc)."
        actions={
          <Space wrap>
            <StatusBadge tone="info" label="Chế độ chỉ đọc" />
            <StatusBadge
              tone="info"
              label={`${formatReportNumber(analytics.totalSessions)} phiên canh tác`}
            />
            <ActionButton
              icon={<DownloadOutlined />}
              label={isFetching ? 'Đang tải dữ liệu' : 'Xuất báo cáo PDF'}
              description="Mở hộp thoại in, chọn 'Lưu thành PDF'"
              disabled={isFetching}
              variant="primary"
              size="middle"
              onClick={handleExportPdf}
            />
          </Space>
        }
      />


      {/* Cơ cấu trang trại — số liệu thật */}
      <StatGrid columns={4} className="reports-operations">
        <StatCard
          title="Tổng số phòng"
          value={formatReportNumber(analytics.totalRooms)}
          tone="neutral"
          icon={<DatabaseOutlined />}
          description={`${formatReportNumber(analytics.activeRooms)} phòng đang hoạt động`}
        />
        <StatCard
          title="Tổng số tầng"
          value={formatReportNumber(analytics.totalFloors)}
          tone="neutral"
          icon={<AppstoreOutlined />}
          description="Số tầng đang vận hành"
        />
        <StatCard
          title="Master đang online"
          value={`${formatReportNumber(analytics.devices.online)}/${formatReportNumber(analytics.devices.total)}`}
          tone={analytics.devices.offline > 0 ? 'warning' : 'ok'}
          icon={<TeamOutlined />}
          description={`${formatReportNumber(analytics.devices.offline)} master đang offline`}
        />
        <StatCard
          title="Khay trống"
          value={`${formatReportNumber(analytics.trays.available)}/${formatReportNumber(analytics.trays.total)}`}
          tone="info"
          icon={<AppstoreOutlined />}
          description={`${formatReportNumber(analytics.trays.occupied)} đang thuê · ${formatReportNumber(analytics.trays.maintenance)} đang vệ sinh`}
        />
      </StatGrid>

      {/* KPI VARIANCE CARDS */}
      <StatGrid columns={4}>
        <KpiVarianceCard
          icon={<DollarOutlined />}
          iconBg={tones.ok.bg}
          iconColor={tones.ok.solid}
          title={<Space>Doanh thu đã thu<Tooltip title="Tổng giá trị các đơn hàng đã thanh toán, tính trên mọi thời điểm."><InfoCircleOutlined tabIndex={0} aria-label="Giải thích doanh thu đã thu" /></Tooltip></Space>}
          currentLabel="Kỳ này"
          currentValue={formatReportMoney(kpis.totalRevenue)}
          previousLabel="Kỳ trước"
          previousValue={formatReportMoney(kpis.previousTotalRevenue)}
          deltaPercent={revenueDelta}
          higherIsBetter
          subtitle="Tổng đơn đã thanh toán"
          hasPreviousData={false}
        />

        <KpiVarianceCard
          icon={<AppstoreOutlined />}
          iconBg={tones.info.bg}
          iconColor={tones.info.solid}
          title="Tỷ lệ lấp đầy khay"
          currentLabel="Kỳ này"
          currentValue={formatReportPercent(kpis.occupancyRate)}
          previousLabel="Kỳ trước"
          previousValue={formatReportPercent(kpis.previousOccupancyRate)}
          deltaPercent={occupancyDelta}
          higherIsBetter
          subtitle={`${formatReportNumber(kpis.rentedTrays)}/${formatReportNumber(kpis.totalTrays)} khay đang thuê`}
          hasPreviousData={false}
        />

        <KpiVarianceCard
          icon={<ExperimentOutlined />}
          iconBg={tones.warning.bg}
          iconColor={tones.warning.solid}
          title="Thương phẩm thu hoạch"
          currentLabel="Kỳ này"
          currentValue={formatReportWeight(kpis.harvestedGradeAKg)}
          previousLabel="Kỳ trước"
          previousValue={formatReportWeight(kpis.previousHarvestedGradeAKg)}
          deltaPercent={yieldDelta}
          higherIsBetter
          subtitle="Khối lượng thu hoạch đạt chuẩn"
          hasPreviousData={false}
        />

        <KpiVarianceCard
          icon={<PercentageOutlined />}
          iconBg={tones.danger.bg}
          iconColor={tones.danger.solid}
          title="Tỷ lệ hao hụt"
          currentLabel="Kỳ này"
          currentValue={formatReportPercent(kpis.spoilageRate)}
          previousLabel="Kỳ trước"
          previousValue={formatReportPercent(kpis.previousSpoilageRate)}
          deltaPercent={spoilageDelta}
          higherIsBetter={false}
          subtitle="Giảm = cải thiện tốt"
          hasPreviousData={false}
        />
      </StatGrid>

      {/* REVENUE COMPARATIVE CHART */}
      <Card
        className="reports-revenue-card"
        style={{
          borderRadius: 'var(--mcms-radius-xl)',
          marginBottom: 'var(--mcms-space-5)',
          borderColor: 'var(--mcms-border)',
        }}
        styles={{ body: { padding: 20 } }}
      >
        <Flex align="center" justify="space-between" wrap gap={12} style={{ marginBottom: 8 }}>
          <div>
            <Typography.Title level={5} style={{ margin: 0 }}>
              Doanh thu dự kiến theo phiên canh tác <Tooltip title="Ước tính số phiên × giá gói hiện tại; khác doanh thu đã thu từ đơn PAID."><InfoCircleOutlined tabIndex={0} /></Tooltip>
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Theo ngày bắt đầu phiên · Giờ Việt Nam
            </Typography.Text>
          </div>
          <Segmented<Granularity>
            value={granularity}
            onChange={setGranularity}
            options={[
              { label: 'Tuần', value: 'WEEKLY' },
              { label: 'Tháng', value: 'MONTHLY' },
              { label: 'Quý', value: 'QUARTERLY' },
            ]}
            size="small"
          />
        </Flex>

        <div className="reports-revenue-grid">
        <div>
        {chartData.length > 0 ? (
          <ComparativeRevenueChart
            data={chartData}
            currentLabel={currentLabel}
            previousLabel="Kỳ trước"
            height={320}
          />
        ) : (
          <Typography.Text type="secondary">
            <Tooltip title="Cần ngày bắt đầu hợp lệ và giá gói xác định cho từng phiên; đơn có nhiều gói chưa thể nối chính xác."><span>— Chưa đủ dữ liệu phiên và giá gói để tổng hợp.</span></Tooltip>
          </Typography.Text>
        )}
        </div>
        <SpeciesRevenueDonut data={varietyPerformance} incomplete={analytics.revenueIncomplete} />
        </div>
      </Card>

      {/* VARIETY PERFORMANCE TABLE */}
      <Card
        className="reports-species-card"
        style={{
          borderRadius: 'var(--mcms-radius-xl)',
          marginBottom: 'var(--mcms-space-5)',
          borderColor: 'var(--mcms-border)',
        }}
        styles={{ body: { padding: 20 } }}
      >
        <Flex
          align="center"
          justify="space-between"
          wrap
          gap={12}
          style={{ marginBottom: 12 }}
        >
          <div>
            <Typography.Title level={5} style={{ margin: 0 }}>
              Cơ cấu giống nấm được thuê nhiều nhất
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Số phiên theo giống; doanh thu dự kiến theo giá gói hiện tại.
            </Typography.Text>
          </div>
        </Flex>

        <VarietyPerformanceTable data={varietyPerformance} revenueIncomplete={analytics.revenueIncomplete} />
      </Card>


      {/* Nút xuất CSV nhanh — dùng dữ liệu thật */}
      <Flex justify="flex-end" className="reports-export-actions">
        <ActionButton
          icon={<DownloadOutlined />}
          label="Tải CSV từ dữ liệu hiện tại"
          description="Xuất trực tiếp các chỉ số đang hiển thị ra file CSV."
          variant="default"
          size="middle"
          onClick={handleExportCsv}
        />
      </Flex>
    </div>
  )
}
