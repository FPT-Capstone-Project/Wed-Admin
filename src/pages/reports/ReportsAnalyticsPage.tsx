import { useMemo, useState } from 'react'
import {
  BarChartOutlined,
  DatabaseOutlined,
  DollarOutlined,
  DownloadOutlined,
  ExperimentOutlined,
  HomeOutlined,
  PercentageOutlined,
} from '@ant-design/icons'
import {
  Card,
  Col,
  Flex,
  Row,
  Segmented,
  Select,
  Space,
  Typography,
  message,
} from 'antd'
import dayjs from 'dayjs'
import { useAuthStore } from '../../features/auth/store/auth.store'
import {
  MOCK_ENVIRONMENT_HISTORY,
  MOCK_REVENUE_SUMMARIES,
  MOCK_YIELD_SUMMARIES,
} from '../../stores/alert.store'
import { useRoomStore, getAllTrays } from '../../stores/room.store'
import {
  buildQuarterComparison,
  buildVarietyPerformance,
  buildYearlyComparison,
  computeExecutiveKpis,
  type QuarterRevenuePoint,
  type YearlyRevenuePoint,
} from './utils/executive-report.utils'
import { KpiVarianceCard } from './components/KpiVarianceCard'
import { ComparativeRevenueChart } from './components/ComparativeRevenueChart'
import { VarietyPerformanceTable } from './components/VarietyPerformanceTable'
import { ExportReportModal } from './components/ExportReportModal'
import {
  ActionButton,
  PageHeader,
  StatCard,
  StatusBadge,
} from '../../shared/ui'
import { tones } from '../../app/theme/tokens'

type ComparisonMode = 'YoY' | 'MoM' | 'QoQ'
type ScopeFilter = 'ALL' | 'T1' | 'T2' | 'T3' | 'T4'

const COMPARISON_LABELS: Record<ComparisonMode, { label: string; subtitle: string }> = {
  YoY: {
    label: 'Cùng kỳ năm trước (YoY: 2026 vs 2025)',
    subtitle: 'So sánh năm 2026 với năm 2025',
  },
  MoM: {
    label: 'Tháng trước (MoM: T09/2026 vs T08/2026)',
    subtitle: 'So sánh tháng 9/2026 với tháng 8/2026',
  },
  QoQ: {
    label: 'Theo quý (QoQ: Q3 vs Q2)',
    subtitle: 'So sánh quý 3 với quý 2',
  },
}

function canManageReports(role: string | undefined) {
  const normalizedRole = role?.toUpperCase()
  return (
    normalizedRole === 'ADMIN' ||
    normalizedRole === 'OPERATOR' ||
    normalizedRole === 'FARM_MANAGER'
  )
}

export function ReportsAnalyticsPage() {
  const authRole = useAuthStore((state) => state.user?.role)
  const canManage = canManageReports(authRole)

  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('YoY')
  const [scope, setScope] = useState<ScopeFilter>('ALL')
  const [exportOpen, setExportOpen] = useState(false)

  const yearlyData = useMemo<YearlyRevenuePoint[]>(
    () => buildYearlyComparison(MOCK_REVENUE_SUMMARIES),
    [],
  )

  const quarterlyData = useMemo<QuarterRevenuePoint[]>(
    () => buildQuarterComparison(MOCK_REVENUE_SUMMARIES),
    [],
  )

  // ── Selector trả về mảng tiers trực tiếp (tham chiếu ổn định từ Zustand)
  //    tránh tạo object literal mới mỗi render gây re-render loop.
  const tiers = useRoomStore((s) => s.tiers)

  // ── Tính occupancy tỪ dữ liệu room.store thực tế (H2 fix) ────────
  const activeTrayCount = useMemo(() => {
    const trays = getAllTrays(tiers)
    return trays.filter(
      (t) => t.status === 'rented' || t.status === 'harvesting',
    ).length
  }, [tiers])

  const kpis = useMemo(
    () =>
      computeExecutiveKpis(
        MOCK_REVENUE_SUMMARIES,
        MOCK_YIELD_SUMMARIES,
        activeTrayCount,
      ),
    [activeTrayCount],
  )

  const varietyPerformance = useMemo(
    () => buildVarietyPerformance(MOCK_YIELD_SUMMARIES),
    [],
  )

  const revenueDelta =
    kpis.previousTotalRevenue > 0
      ? ((kpis.totalRevenue - kpis.previousTotalRevenue) /
          kpis.previousTotalRevenue) *
        100
      : 0

  const occupancyDelta = kpis.occupancyRate - kpis.previousOccupancyRate

  const yieldDelta =
    kpis.previousHarvestedGradeAKg > 0
      ? ((kpis.harvestedGradeAKg - kpis.previousHarvestedGradeAKg) /
          kpis.previousHarvestedGradeAKg) *
        100
      : 0

  const spoilageDelta = kpis.spoilageRate - kpis.previousSpoilageRate

  /**
   * Memoize dataset cho ComparativeRevenueChart.
   *
   * QUAN TRỌNG: Tính trực tiếp trong render sẽ tạo array literal mới mỗi lần
   * → Recharts nhận diện data thay đổi → re-mount BarChart → setState nội bộ
   * → setState kích hoạt re-render parent → loop vô tận.
   *
   * useMemo đảm bảo tham chiếu array ổn định khi comparisonMode
   * chưa đổi → chart nhận cùng data → không re-mount.
   */
  const chartData = useMemo<
    Array<{ month: string; current: number; previous: number }>
  >(() => {
    if (comparisonMode === 'QoQ') {
      return quarterlyData.map((q) => ({
        month: q.quarter,
        current: Math.round(q.current),
        previous: Math.round(q.previous),
      }))
    }
    return yearlyData.map((y) => ({
      month: y.month,
      current: y.currentYearRevenue,
      previous: y.previousYearRevenue,
    }))
  }, [comparisonMode, yearlyData, quarterlyData])

  const currentLabel =
    comparisonMode === 'YoY'
      ? 'Năm 2026'
      : comparisonMode === 'MoM'
        ? 'Tháng 9/2026'
        : 'Q3/2026'

  const previousLabel =
    comparisonMode === 'YoY'
      ? 'Năm 2025'
      : comparisonMode === 'MoM'
        ? 'Tháng 8/2026'
        : 'Q2/2026'

  const handleExportCsv = () => {
    const lines: string[][] = [
      ['BÁO CÁO EXECUTIVE - MCMS'],
      [`Chế độ so sánh: ${comparisonMode}`],
      [`Phạm vi: ${scope}`],
      [`Xuất lúc: ${dayjs().format('DD/MM/YYYY HH:mm')}`],
      [],
      ['KPI'],
      ['Chỉ số', 'Kỳ này', 'Kỳ trước', 'Chênh lệch %'],
      ['Doanh thu', String(kpis.totalRevenue), String(kpis.previousTotalRevenue), revenueDelta.toFixed(2)],
      ['Occupancy', `${kpis.occupancyRate.toFixed(1)}%`, `${kpis.previousOccupancyRate.toFixed(1)}%`, occupancyDelta.toFixed(2)],
      ['Sản lượng Grade A (kg)', String(kpis.harvestedGradeAKg), String(kpis.previousHarvestedGradeAKg), yieldDelta.toFixed(2)],
      ['Hao hụt (%)', kpis.spoilageRate.toFixed(2), kpis.previousSpoilageRate.toFixed(2), spoilageDelta.toFixed(2)],
      [],
      ['HIỆU SUẤT THEO GIỐNG NẤM'],
      ['Giống', 'Số khay', 'Success %', 'Doanh thu kỳ này', 'Cùng kỳ', 'Tăng trưởng %'],
      ...varietyPerformance.map((v) => [
        v.varietyName,
        String(v.traysRented),
        v.successRate.toFixed(1),
        String(v.currentRevenue),
        String(v.previousRevenue),
        v.growthPercent.toFixed(2),
      ]),
    ]

    const csv = `\uFEFF${lines
      .map((line) => line.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n')}`

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `mcms-executive-${comparisonMode.toLowerCase()}-${dayjs().format('YYYYMMDD-HHmm')}.csv`
    link.click()
    URL.revokeObjectURL(url)
    message.success('Đã xuất báo cáo Executive CSV.')
  }

  const handleQuickExport = () => {
    if (canManage) {
      setExportOpen(true)
    } else {
      handleExportCsv()
    }
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
        description="Dashboard Executive — so sánh chu kỳ, đo lường hiệu suất vận hành và tăng trưởng kinh doanh."
        actions={
          <Space wrap>
            <StatusBadge
              tone={canManage ? 'ok' : 'muted'}
              label={canManage ? 'Toàn hệ thống' : 'Khay đang thuê'}
            />
            <StatusBadge
              tone="info"
              label={`${MOCK_ENVIRONMENT_HISTORY.length} điểm dữ liệu IoT`}
            />
            <ActionButton
              icon={<DownloadOutlined />}
              label="Xuất báo cáo Executive"
              description="Tải báo cáo Executive dưới dạng CSV hoặc PDF."
              variant="primary"
              size="middle"
              onClick={handleQuickExport}
            />
          </Space>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--mcms-space-5)' }}>
        <Col xs={12} lg={6}>
          <StatCard
            title="Doanh thu cho thuê khay"
            value={formatCompactVND(kpis.totalRevenue)}
            tone="ok"
            highlightValue
            icon={<DollarOutlined />}
            description="Tổng doanh thu các đơn hoàn tất"
            extra={
              <StatusBadge
                tone={revenueDelta >= 0 ? 'ok' : 'danger'}
                label={`${revenueDelta >= 0 ? '+' : ''}${revenueDelta.toFixed(1)}% so với kỳ trước`}
              />
            }
          />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard
            title="Tỷ lệ lấp đầy khay"
            value={`${kpis.occupancyRate.toFixed(1)}%`}
            tone="info"
            highlightValue
            icon={<HomeOutlined />}
            description={`${kpis.rentedTrays}/${kpis.totalTrays} khay đang thuê`}
            extra={
              <StatusBadge
                tone={occupancyDelta >= 0 ? 'ok' : 'danger'}
                label={`${occupancyDelta >= 0 ? '+' : ''}${occupancyDelta.toFixed(1)} điểm % so với kỳ trước`}
              />
            }
          />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard
            title="Tổng sản lượng thu hoạch"
            value={`${kpis.harvestedGradeAKg.toFixed(0)} kg`}
            tone="warning"
            highlightValue
            icon={<ExperimentOutlined />}
            description="Grade A (đạt chuẩn xuất khẩu)"
            extra={
              <StatusBadge
                tone={yieldDelta >= 0 ? 'ok' : 'danger'}
                label={`${yieldDelta >= 0 ? '+' : ''}${yieldDelta.toFixed(1)}% so với kỳ trước`}
              />
            }
          />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard
            title="Tỷ lệ hao hụt / Mẻ hỏng"
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
        </Col>
      </Row>

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
              Chế độ so sánh:
            </Typography.Text>
            <Segmented<ComparisonMode>
              value={comparisonMode}
              onChange={setComparisonMode}
              options={[
                { label: 'YoY', value: 'YoY' },
                { label: 'MoM', value: 'MoM' },
                { label: 'QoQ', value: 'QoQ' },
              ]}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {COMPARISON_LABELS[comparisonMode].subtitle}
            </Typography.Text>
          </Flex>

          <Space wrap>
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                Phạm vi
              </Typography.Text>
              <Select<ScopeFilter>
                value={scope}
                onChange={setScope}
                style={{ width: 200 }}
                options={[
                  {
                    value: 'ALL',
                    label: (
                      <Space>
                        <DatabaseOutlined /> Toàn bộ trang trại
                      </Space>
                    ),
                  },
                  {
                    value: 'T1',
                    label: (
                      <Space>
                        <HomeOutlined /> Tầng 1
                      </Space>
                    ),
                  },
                  {
                    value: 'T2',
                    label: (
                      <Space>
                        <HomeOutlined /> Tầng 2
                      </Space>
                    ),
                  },
                  {
                    value: 'T3',
                    label: (
                      <Space>
                        <HomeOutlined /> Tầng 3
                      </Space>
                    ),
                  },
                  {
                    value: 'T4',
                    label: (
                      <Space>
                        <HomeOutlined /> Tầng 4
                      </Space>
                    ),
                  },
                ]}
              />
            </div>
          </Space>
        </Flex>
      </Card>

      {/* KPI VARIANCE CARDS */}
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--mcms-space-5)' }}>
        <Col xs={24} md={12} xl={6}>
          <KpiVarianceCard
            icon={<DollarOutlined />}
            iconBg={tones.ok.bg}
            iconColor={tones.ok.solid}
            title="Doanh thu cho thuê khay"
            currentLabel="Kỳ này"
            currentValue={formatCompactVND(kpis.totalRevenue)}
            previousLabel="Kỳ trước"
            previousValue={formatCompactVND(kpis.previousTotalRevenue)}
            deltaPercent={revenueDelta}
            higherIsBetter
            subtitle="Tổng doanh thu các đơn hoàn tất"
          />
        </Col>

        <Col xs={24} md={12} xl={6}>
          <KpiVarianceCard
            icon={<HomeOutlined />}
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
        </Col>

        <Col xs={24} md={12} xl={6}>
          <KpiVarianceCard
            icon={<ExperimentOutlined />}
            iconBg={tones.warning.bg}
            iconColor={tones.warning.solid}
            title="Tổng sản lượng thu hoạch"
            currentLabel="Kỳ này"
            currentValue={`${kpis.harvestedGradeAKg.toFixed(0)} kg`}
            previousLabel="Kỳ trước"
            previousValue={`${kpis.previousHarvestedGradeAKg.toFixed(0)} kg`}
            deltaPercent={yieldDelta}
            higherIsBetter
            subtitle="Grade A (đạt chuẩn xuất khẩu)"
          />
        </Col>

        <Col xs={24} md={12} xl={6}>
          <KpiVarianceCard
            icon={<PercentageOutlined />}
            iconBg={tones.danger.bg}
            iconColor={tones.danger.solid}
            title="Tỷ lệ hao hụt / Mẻ hỏng"
            currentLabel="Kỳ này"
            currentValue={`${kpis.spoilageRate.toFixed(1)}%`}
            previousLabel="Kỳ trước"
            previousValue={`${kpis.previousSpoilageRate.toFixed(2)}%`}
            deltaPercent={spoilageDelta}
            higherIsBetter={false}
            subtitle="Giảm = cải thiện tốt"
          />
        </Col>
      </Row>

      {/* REVENUE COMPARATIVE CHART */}
      <Card
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
              Biểu đồ cột đôi — Doanh thu {comparisonMode}
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {comparisonMode === 'YoY'
                ? 'Doanh thu từng tháng của năm 2026 so với năm 2025'
                : comparisonMode === 'MoM'
                  ? 'Doanh thu tháng 9/2026 vs tháng 8/2026'
                  : 'Doanh thu theo quý Q3 vs Q2'}
            </Typography.Text>
          </div>
          <Space size={8} wrap>
            <LegendChip color={tones.ok.solid} label={currentLabel} />
            <LegendChip color="var(--mcms-border-strong)" label={previousLabel} />
          </Space>
        </Flex>

        <ComparativeRevenueChart
          data={chartData}
          currentLabel={currentLabel}
          previousLabel={previousLabel}
          height={340}
        />
      </Card>

      {/* VARIETY PERFORMANCE TABLE */}
      <Card
        style={{
          borderRadius: 'var(--mcms-radius-xl)',
          borderColor: 'var(--mcms-border)',
        }}
        styles={{ body: { padding: 20 } }}
      >
        <Flex align="center" justify="space-between" wrap gap={12} style={{ marginBottom: 12 }}>
          <div>
            <Typography.Title level={5} style={{ margin: 0 }}>
              Bảng phân tích hiệu suất theo giống nấm
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Đánh giá đóng góp doanh thu và mức tăng trưởng so với cùng kỳ.
            </Typography.Text>
          </div>
        </Flex>

        <VarietyPerformanceTable data={varietyPerformance} />
      </Card>

      <ExportReportModal
        open={exportOpen}
        onCancel={() => setExportOpen(false)}
        reportTitle={`Báo cáo Executive ${comparisonMode} (${COMPARISON_LABELS[comparisonMode].label})`}
      />
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
