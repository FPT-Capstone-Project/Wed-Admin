import { LoadErrorAlert } from '../../shared/ui/LoadErrorAlert'
import '../../styles/reports-users-industrial.css'
import { Suspense, useMemo, useState } from 'react'
import {
  AppstoreOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  DollarOutlined,
  DownloadOutlined,
  ExperimentOutlined,
  PercentageOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import {
  Card,
  Flex,
  Segmented,
  Skeleton,
  Space,
  Typography,
  message,
} from 'antd'
import dayjs from 'dayjs'
import { useReportsAnalytics } from '../../features/analytics/hooks/useFarmAnalytics'
import {
  buildMonthlyComparison,
  buildQuarterlyRevenue,
  buildStageDistribution,
  buildVarietyPerformance,
  computeExecutiveKpis,
} from '../../features/analytics/utils/executive-report.utils'
import { KpiVarianceCard } from './components/KpiVarianceCard'
import { ComparativeRevenueChart } from './components/ComparativeRevenueChart'
import { VarietyPerformanceTable } from './components/VarietyPerformanceTable'
import { ExportReportModal } from '../../app/router/lazy-modals'
import {
  ActionButton,
  MetadataBadge,
  PageHeader,
  StatCard,
  StatGrid,
  StatusBadge,
} from '../../shared/ui'
import { tones } from '../../app/theme/tokens'

type ComparisonMode = 'MONTHLY' | 'QUARTERLY'

const COMPARISON_LABELS: Record<ComparisonMode, { label: string; subtitle: string }> = {
  MONTHLY: {
    label: 'Theo tháng',
    subtitle: 'Doanh thu ước tính từng tháng trong năm',
  },
  QUARTERLY: {
    label: 'Theo quý',
    subtitle: 'Doanh thu ước tính theo từng quý',
  },
}

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
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('MONTHLY')
  const [exportOpen, setExportOpen] = useState(false)

  const { data, isLoading, isError, error, refetch } = useReportsAnalytics()

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
            analytics.usableRate,
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
    if (!analytics) return []
    return comparisonMode === 'QUARTERLY'
      ? buildQuarterlyRevenue(analytics.monthlyRevenue)
      : buildMonthlyComparison(analytics.monthlyRevenue)
  }, [analytics, comparisonMode])

  const currentLabel =
    comparisonMode === 'MONTHLY' ? 'Kỳ này' : 'Kỳ này (theo quý)'

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
      [`Chế độ: ${COMPARISON_LABELS[comparisonMode].label}`],
      [`Xuất lúc: ${dayjs().format('DD/MM/YYYY HH:mm')}`],
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
      ['Giống nấm', 'Số phiên', 'Tỷ lệ đạt chuẩn %', 'Doanh thu ước tính'],
      ...varietyPerformance.map((v) => [
        v.varietyName,
        String(v.traysRented),
        v.successRate.toFixed(1),
        String(v.currentRevenue),
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
    link.download = `mcms-executive-${dayjs().format('YYYYMMDD-HHmm')}.csv`
    link.click()
    URL.revokeObjectURL(url)
    message.success('Đã xuất báo cáo Executive CSV.')
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Báo cáo & Phân tích Điều hành"
          description="Đang tải số liệu thực tế từ hệ thống…"
        />
        <Skeleton active paragraph={{ rows: 14 }} />
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
    <div>
      <PageHeader
        title={
          <Flex align="center" gap={8}>
            <BarChartOutlined />
            Báo cáo & Phân tích Điều hành
          </Flex>
        }
        description="Số liệu vận hành và doanh thu ước tính, tổng hợp trực tiếp từ hệ thống (chế độ chỉ đọc)."
        actions={
          <Space wrap>
            <StatusBadge tone="info" label="Chế độ chỉ đọc" />
            <StatusBadge
              tone="info"
              label={`${analytics.totalSessions} phiên canh tác`}
            />
            <ActionButton
              icon={<DownloadOutlined />}
              label="Xuất báo cáo Executive"
              description="Tải báo cáo Executive dưới dạng CSV hoặc PDF."
              variant="primary"
              size="middle"
              onClick={() => setExportOpen(true)}
            />
          </Space>
        }
      />

      <StatGrid columns={4}>
        <StatCard
          title="Doanh thu đã thu"
          value={formatCompactVND(kpis.totalRevenue)}
          tone="ok"
          highlightValue
          icon={<DollarOutlined />}
          description="Tổng đơn đã thanh toán (mọi thời điểm)"
          extra={
            <StatusBadge
              tone={revenueDelta >= 0 ? 'ok' : 'danger'}
              label={`${revenueDelta >= 0 ? '+' : ''}${revenueDelta.toFixed(1)}% so với kỳ trước`}
            />
          }
        />
        <StatCard
          title="Tỷ lệ lấp đầy khay"
          value={`${kpis.occupancyRate.toFixed(1)}%`}
          tone="info"
          highlightValue
          icon={<AppstoreOutlined />}
          description={`${kpis.rentedTrays}/${kpis.totalTrays} khay đang thuê`}
          extra={
            <StatusBadge
              tone={occupancyDelta >= 0 ? 'ok' : 'danger'}
              label={`${occupancyDelta >= 0 ? '+' : ''}${occupancyDelta.toFixed(1)} điểm % so với kỳ trước`}
            />
          }
        />
        <StatCard
          title="Thương phẩm thu hoạch"
          value={`${kpis.harvestedGradeAKg.toLocaleString('vi-VN')} kg`}
          tone="warning"
          highlightValue
          icon={<ExperimentOutlined />}
          description="Khối lượng thu hoạch đạt chuẩn"
          extra={
            <StatusBadge
              tone={yieldDelta >= 0 ? 'ok' : 'danger'}
              label={`${yieldDelta >= 0 ? '+' : ''}${yieldDelta.toFixed(1)}% so với kỳ trước`}
            />
          }
        />
        <StatCard
          title="Tỷ lệ hao hụt"
          value={`${kpis.spoilageRate.toFixed(1)}%`}
          tone="danger"
          highlightValue
          icon={<PercentageOutlined />}
          description="Giảm = cải thiện tốt"
          extra={
            <StatusBadge
              tone={spoilageDelta <= 0 ? 'ok' : 'danger'}
              label={`${spoilageDelta >= 0 ? '+' : ''}${spoilageDelta.toFixed(1)} điểm % so với kỳ trước`}
            />
          }
        />
      </StatGrid>

      {/* Cơ cấu trang trại — số liệu thật */}
      <StatGrid columns={4}>
        <StatCard
          title="Tổng số phòng"
          value={analytics.totalRooms}
          tone="neutral"
          icon={<DatabaseOutlined />}
          description={`${analytics.activeRooms} phòng đang hoạt động`}
        />
        <StatCard
          title="Tổng số tầng"
          value={analytics.totalFloors}
          tone="neutral"
          icon={<AppstoreOutlined />}
          description="Từ /api/iot/floors"
        />
        <StatCard
          title="Master đang online"
          value={`${analytics.devices.online}/${analytics.devices.total}`}
          tone={analytics.devices.offline > 0 ? 'warning' : 'ok'}
          icon={<TeamOutlined />}
          description={`${analytics.devices.offline} master đang offline`}
        />
        <StatCard
          title="Khay theo trạng thái"
          value={`${analytics.trays.available}/${analytics.trays.total}`}
          tone="info"
          icon={<AppstoreOutlined />}
          description={`${analytics.trays.occupied} đang thuê · ${analytics.trays.maintenance} bảo trì`}
        />
      </StatGrid>

      {/* COMPARATIVE FILTER BAR */}
      <Card
        style={{
          borderRadius: 'var(--mcms-radius-xl)',
          marginBottom: 'var(--mcms-space-5)',
          borderColor: 'var(--mcms-border)',
          background: 'var(--mcms-surface-muted)',
        }}
        styles={{ body: { padding: 18 } }}
      >
        <Flex align="center" justify="space-between" gap={16} wrap>
          <Flex align="center" gap={12} wrap>
            <Typography.Text strong style={{ fontSize: 13 }}>
              Cách trình bày:
            </Typography.Text>
            <Segmented<ComparisonMode>
              value={comparisonMode}
              onChange={setComparisonMode}
              options={[
                { label: 'Theo tháng', value: 'MONTHLY' },
                { label: 'Theo quý', value: 'QUARTERLY' },
              ]}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {COMPARISON_LABELS[comparisonMode].subtitle}
            </Typography.Text>
          </Flex>

          <Space wrap>
            <MetadataBadge
              label={`${analytics.traysUsed} lượt khay đã sử dụng`}
            />
          </Space>
        </Flex>
      </Card>

      {/* KPI VARIANCE CARDS */}
      <StatGrid columns={4}>
        <KpiVarianceCard
          icon={<DollarOutlined />}
          iconBg={tones.ok.bg}
          iconColor={tones.ok.solid}
          title="Doanh thu đã thu"
          currentLabel="Kỳ này"
          currentValue={formatCompactVND(kpis.totalRevenue)}
          previousLabel="Kỳ trước"
          previousValue={formatCompactVND(kpis.previousTotalRevenue)}
          deltaPercent={revenueDelta}
          higherIsBetter
          subtitle="Tổng đơn đã thanh toán"
        />

        <KpiVarianceCard
          icon={<AppstoreOutlined />}
          iconBg={tones.info.bg}
          iconColor={tones.info.solid}
          title="Tỷ lệ lấp đầy khay"
          currentLabel="Kỳ này"
          currentValue={`${kpis.occupancyRate.toFixed(1)}%`}
          previousLabel="Kỳ trước"
          previousValue={`${kpis.previousOccupancyRate.toFixed(1)}%`}
          deltaPercent={occupancyDelta}
          higherIsBetter
          subtitle={`${kpis.rentedTrays}/${kpis.totalTrays} khay đang thuê`}
        />

        <KpiVarianceCard
          icon={<ExperimentOutlined />}
          iconBg={tones.warning.bg}
          iconColor={tones.warning.solid}
          title="Thương phẩm thu hoạch"
          currentLabel="Kỳ này"
          currentValue={`${kpis.harvestedGradeAKg.toLocaleString('vi-VN')} kg`}
          previousLabel="Kỳ trước"
          previousValue={`${kpis.previousHarvestedGradeAKg.toLocaleString('vi-VN')} kg`}
          deltaPercent={yieldDelta}
          higherIsBetter
          subtitle="Khối lượng thu hoạch đạt chuẩn"
        />

        <KpiVarianceCard
          icon={<PercentageOutlined />}
          iconBg={tones.danger.bg}
          iconColor={tones.danger.solid}
          title="Tỷ lệ phôi bất thường"
          currentLabel="Kỳ này"
          currentValue={`${kpis.spoilageRate.toFixed(2)}%`}
          previousLabel="Kỳ trước"
          previousValue={`${kpis.previousSpoilageRate.toFixed(2)}%`}
          deltaPercent={spoilageDelta}
          higherIsBetter={false}
          subtitle="Giảm = cải thiện tốt"
        />
      </StatGrid>

      {/* REVENUE COMPARATIVE CHART */}
      <Card
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
          style={{ marginBottom: 8 }}
        >
          <div>
            <Typography.Title level={5} style={{ margin: 0 }}>
              Biểu đồ doanh thu ước tính
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {comparisonMode === 'MONTHLY'
                ? 'Doanh thu ước tính từng tháng (giá gói thuê × số phiên bắt đầu trong tháng)'
                : 'Doanh thu ước tính theo quý'}
            </Typography.Text>
          </div>
          <Space size={8} wrap>
            <LegendChip color={tones.ok.solid} label={currentLabel} />
          </Space>
        </Flex>

        {chartData.length > 0 ? (
          <ComparativeRevenueChart
            data={chartData}
            currentLabel={currentLabel}
            previousLabel="Kỳ trước"
            height={340}
          />
        ) : (
          <Typography.Text type="secondary">
            Chưa có phiên canh tác nào để tính doanh thu ước tính.
          </Typography.Text>
        )}
      </Card>

      {/* VARIETY PERFORMANCE TABLE */}
      <Card
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
              Số phiên canh tác và doanh thu ước tính theo từng giống nấm.
            </Typography.Text>
          </div>
        </Flex>

        <VarietyPerformanceTable data={varietyPerformance} />
      </Card>

            <Suspense fallback={null}>
              <ExportReportModal
              open={exportOpen}
              onCancel={() => setExportOpen(false)}
              reportTitle={`Báo cáo Executive (${COMPARISON_LABELS[comparisonMode].label})`}
              />
            </Suspense>

      {/* Nút xuất CSV nhanh — dùng dữ liệu thật */}
      <Flex justify="flex-end">
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

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        color: 'var(--mcms-text-muted)',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 12,
          height: 12,
          borderRadius: 3,
          background: color,
        }}
      />
      {label}
    </span>
  )
}

/**
 * Format VND dạng rút gọn (1.5Tr, 42.5M, ...) với fallback an toàn — không bao giờ in NaN.
 */
function formatCompactVND(value: unknown): string {
  const safe = typeof value === 'number' && Number.isFinite(value) ? value : 0
  if (safe === 0) return '0 đ'
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(safe)
  } catch {
    return `${safe} đ`
  }
}
