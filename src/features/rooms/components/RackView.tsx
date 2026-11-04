import { buildTrayLayout } from '../utils/tray-layout.utils'
import { getClimateTone, getClimateDirection } from '../utils/climate-tone.utils'
import { TrayCodeText } from '../../../shared/ui/TrayCodeText'
import { formatMeasurement, formatMeasurementDetails } from '../../../shared/utils/measurement-format'
import '../rooms-industrial.css'
import { CloudOutlined, FireOutlined } from '@ant-design/icons'
import { Flex, Tooltip, Typography } from 'antd'
import { useMemo, useState } from 'react'
import type { Tier, Tray, TrayStatus } from '../../../types/room.types'
import { tokens } from '../../../app/theme/tokens'
import { formatRoomLabel, formatTrayCode } from '../../../shared/i18n/terms'
import { TRAY_STATUS_CONFIG } from './tray-status.config'
import {
  evaluateHumidity,
  evaluateTemperature,
  type ClimateReading,
  type ClimateThresholds,
} from '../utils/tray-climate.utils'
import type { TraySessionSummary } from '../hooks/useTraySessionSummaries'

interface RackViewProps {
  tiers: Tier[]
  selectedTrayId: string | null
  onSelectTray: (tray: Tray) => void
  /** Ngưỡng canh tác theo tầng — nguồn: BE `/environment` (`thresholds`). */
  thresholdsByTier?: Map<Tier['tierId'], ClimateThresholds>
  /** Tóm tắt vụ thuê theo `tray_id` (khách + ngày thu hoạch dự kiến). */
  sessionSummaries?: Map<number, TraySessionSummary>
  /**
   * Số đo môi trường THẬT theo tầng.
   *
   * ⚠ Không dùng `tier.telemetry` ở đây: giá trị đó fallback về
   * `DEFAULT_TELEMETRY` (24.5°C / 85%RH — số giả) khi BE chưa có dữ liệu.
   * Hiển thị số giả kèm màu cảnh báo làm người dùng tưởng tầng đang
   * vượt ngưỡng. Ở đây chỉ hiện số đo thật, còn thiếu thì hiện "—".
   */
  liveReadings?: Map<
    Tier['tierId'],
    { temperature: number | null; humidity: number | null }
  >
}

// ── Status visual config dùng tokens ────────────────────────────────────────
/**
 * Hình dạng + màu của ô khay theo trạng thái.
 *
 * ⚠ Nhãn hiển thị KHÔNG nằm ở đây — lấy từ `TRAY_STATUS_CONFIG` để
 * legend, badge trong ô khay và drawer chi tiết luôn dùng CHUNG một
 * nhãn (trước đây ô khay ghi "Nhiễm bệnh" còn legend ghi "Nhiễm bệnh /
 * Cách ly" → cùng một trạng thái mà hai chữ khác nhau).
 */
interface TrayVisualConfig {
  borderColor: string
  bgColor: string
  textColor: string
  progressColor: string
  borderStyle: 'dashed' | 'solid'
}

const TRAY_VISUAL: Record<TrayStatus, TrayVisualConfig> = {
  maintenance: {
    borderColor: tokens.tone.danger.border,
    bgColor: tokens.tone.danger.bg,
    textColor: tokens.tone.danger.text,
    progressColor: tokens.tone.danger.solid,
    borderStyle: 'solid',
  },
  harvesting: {
    borderColor: tokens.tone.warning.border,
    bgColor: tokens.tone.warning.bg,
    textColor: tokens.tone.warning.text,
    progressColor: tokens.tone.warning.solid,
    borderStyle: 'solid',
  },
  rented: {
    borderColor: tokens.tone.ok.border,
    bgColor: tokens.tone.ok.bg,
    textColor: tokens.tone.ok.text,
    progressColor: tokens.tone.ok.solid,
    borderStyle: 'solid',
  },
  empty: {
    borderColor: tokens.tone.muted.border,
    bgColor: tokens.tone.muted.bg,
    textColor: tokens.tone.muted.text,
    progressColor: tokens.tone.muted.solid,
    borderStyle: 'dashed',
  },
}

// ── Tính tiến độ sinh trưởng ─────────────────────────────────────────────
/**
 * Tiến độ canh tác — dựa trên VỤ THUÊ THẬT.
 *
 * ⚠ `tray.rental` luôn là `null` khi dữ liệu đến từ BE
 * (`toUiTray` không map rental) → thanh tiến độ trước đây không bao giờ
 * hiện. Nay tính từ `TraySessionSummary` (đọc `GET /api/rentals/admin`).
 *
 * @returns `{ percent, dayLabel }` hoặc `null` khi không có vụ thuê.
 */
function growthProgress(
  summary: TraySessionSummary | null,
): { percent: number; dayLabel: string } | null {
  if (!summary?.startDate || !summary.expectedHarvestDate) return null

  const start = new Date(summary.startDate).getTime()
  const end = new Date(summary.expectedHarvestDate).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null

  const now = Date.now()
  const totalDays = Math.max(1, Math.round((end - start) / 86_400_000))
  const elapsedDays = Math.max(
    0,
    Math.round((now - start) / 86_400_000),
  )
  const day = Math.min(elapsedDays + 1, totalDays)

  return {
    percent: Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)),
    dayLabel: `Ngày ${day}/${totalDays}`,
  }
}

/** Định dạng ngày thu hoạch dự kiến — "25/10". */
const SHORT_DATE_FMT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
})

function formatShortDate(value: string | Date | null | undefined): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return SHORT_DATE_FMT.format(date)
}

// ── Climate chip (nhiệt độ / độ ẩm) ───────────────────────────────────────
interface ClimateChipProps {
  icon: React.ReactNode
  reading: ClimateReading
  unit: string
  ariaLabel: string
}

function ClimateChip({ icon, reading, unit, ariaLabel }: ClimateChipProps) {
  const direction = getClimateDirection(reading)
  const tone = getClimateTone(unit === '°C' ? 'temperature' : 'humidity', direction)
  const palette = tokens.tone[tone]

  const tooltip = [
    reading.statusLabel,
    reading.targetLabel ? `Mục tiêu ${reading.targetLabel}` : null,
  ]
    .filter(Boolean)
    .map(text => formatMeasurementDetails(text!))
    .join(' · ')

  const valueText =
    tone !== 'muted' ? `${formatMeasurement(reading.value)}${unit}` : '—'

  return (
    <Tooltip title={`${ariaLabel}: ${valueText}, ${tooltip}`} trigger={['hover', 'focus']}>
      <span
        tabIndex={0}
        aria-label={`${ariaLabel}: ${valueText}, ${tooltip}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 'var(--mcms-font-small)',
          fontWeight: tokens.typography.weightSemibold,
          color: palette.text,
          backgroundColor: palette.bg,
          border: `1px solid ${palette.border}`,
          borderRadius: tokens.radius.md,
          padding: '2px 10px',
          fontFamily: 'var(--mcms-font-mono)',
          cursor: 'help',
        }}
      >
        <span aria-hidden="true">{icon}</span>
        {valueText}
        {direction === 'high' || direction === 'low' ? <span aria-hidden="true">{direction === 'high' ? '▲' : '▼'}</span> : null}
      </span>
    </Tooltip>
  )
}

// ── Tray Card ────────────────────────────────────────────────────────────────
interface TrayCardProps {
  tray: Tray
  isSelected: boolean
  onClick: () => void
  /** Tóm tắt vụ thuê (khách + ngày thu hoạch) — null nếu không có. */
  summary: TraySessionSummary | null
}

function TrayCard({ tray, isSelected, onClick, summary }: TrayCardProps) {
  /**
   * Khay "đã tới hạn thu hoạch" nhận nhãn + màu "Chờ thu hoạch" dù BE vẫn
   * trả status `OCCUPIED` — người dùng phải thấy được việc cần xử lý.
   */
  const effectiveStatus: TrayStatus =
    tray.status === 'rented' && summary?.harvestDue ? 'harvesting' : tray.status

  const vis = TRAY_VISUAL[effectiveStatus]
  const progress = growthProgress(summary)
  const trayCode = formatTrayCode(tray.code)
  const customerName = summary?.customerName ?? tray.rental?.tenantName ?? 'Chưa có khách'
  const harvestDate = formatShortDate(summary?.expectedHarvestDate ?? tray.rental?.expectedHarvestDate)
  const mushroomName = summary?.mushroomName ?? tray.rental?.mushroomType ?? 'Chưa rõ loại nấm'
  const detail = [
    tray.code, TRAY_STATUS_CONFIG[effectiveStatus].label, mushroomName, customerName,
    harvestDate ? `Dự kiến thu hoạch ${harvestDate}` : null,
    progress ? `${progress.dayLabel}, ${Math.round(progress.percent)}%` : null,
  ].filter(Boolean).join(' · ')

  return <Tooltip title={detail} trigger={['hover', 'focus']}>
    <button type="button" onClick={onClick} aria-label={`Mở chi tiết ${trayCode}: ${detail}`}
      aria-current={isSelected ? 'true' : undefined} className="tray-card-btn"
      style={{
        appearance: 'none', font: 'inherit', width: '100%', height: '100%', minWidth: 0,
        minHeight: tokens.components.tray.minHeight, padding: tokens.space['3'],
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: tokens.space['2'],
        textAlign: 'left', borderRadius: tokens.radius.md, cursor: 'pointer',
        border: `${isSelected ? tokens.components.tray.selectedBorderWidth : tokens.components.tray.borderWidth}px ${vis.borderStyle} ${isSelected ? tokens.color.text : vis.borderColor}`,
        color: vis.textColor, background: vis.bgColor, boxShadow: tokens.shadow.xs,
      }}>
      <span style={{ display: 'flex', gap: tokens.space['2'], alignItems: 'center', minWidth: 0 }}>
        <TrayCodeText code={tray.code} focusable={false} />
        {tray.status !== 'empty' && <svg aria-hidden="true" width={tokens.components.tray.iconSize} height={tokens.components.tray.iconSize} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
          <path d="M3 13a9 9 0 0 1 18 0H3Zm6 0v7h6v-7" fill="none" stroke="currentColor" strokeWidth={tokens.components.tray.borderWidth} />
        </svg>}
      </span>
      <span aria-hidden="true" style={{ display: 'block', height: tokens.components.tray.progressHeight,
        width: '100%', borderRadius: tokens.radius.sm, background: tokens.color.surface }}>
        {progress && <span style={{ display: 'block', height: '100%', width: `${progress.percent}%`,
          borderRadius: tokens.radius.sm, background: vis.progressColor }} />}
      </span>
    </button>
  </Tooltip>
}

// ── Nút gộp khay trống ──────────────────────────────────────────────────────
interface EmptyTrayGroupProps {
  trays: Tray[]
  selectedTrayId: string | null
  onSelectTray: (tray: Tray) => void
  onToggle: () => void
  expanded: boolean
}

function EmptyTrayGroup({
  trays,
  selectedTrayId,
  onSelectTray,
  onToggle,
  expanded,
}: EmptyTrayGroupProps) {
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={false}
        className="rack-tray-btn"
        style={{
          appearance: 'none',
          textAlign: 'left',
          font: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          minHeight: 36,
          padding: '6px 12px',
          borderRadius: tokens.radius.md,
          border: `1px dashed ${tokens.color.border}`,
          backgroundColor: tokens.color.surfaceMuted,
          color: tokens.color.textMuted,
          fontSize: 'var(--mcms-font-small)',
          fontFamily: 'var(--mcms-font-mono)',
          cursor: 'pointer',
          transition: `background-color ${tokens.motion.fast}`,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span aria-hidden="true">▸</span>
        {trays.length} khay trống
        <span style={{ fontSize: 'var(--mcms-font-small)', opacity: 1 }}>· bấm để xem</span>
      </button>
    )
  }

  return (
    <Flex gap={tokens.space['2']} wrap align="center">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={true}
        className="rack-tray-btn"
        style={{
          appearance: 'none',
          textAlign: 'left',
          font: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          minHeight: 36,
          padding: '6px 12px',
          borderRadius: tokens.radius.md,
          border: `1px solid ${tokens.color.border}`,
          backgroundColor: tokens.color.surfaceMuted,
          color: tokens.color.textMuted,
          fontSize: 'var(--mcms-font-small)',
          fontFamily: 'var(--mcms-font-mono)',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span aria-hidden="true">▾</span>
        Thu gọn {trays.length} khay trống
      </button>

      {trays.map((tray) => (
        <TrayCard
          key={tray.id}
          tray={tray}
          isSelected={selectedTrayId === tray.id}
          onClick={() => onSelectTray(tray)}
          summary={null}
        />
      ))}
    </Flex>
  )
}

// ── RackView ─────────────────────────────────────────────────────────────────
export function RackView({
  tiers,
  selectedTrayId,
  onSelectTray,
  thresholdsByTier,
  sessionSummaries,
  liveReadings,
}: RackViewProps) {
  const orderedTiers = useMemo(
    () => [...tiers].sort((a, b) => b.tierId - a.tierId),
    [tiers],
  )

  /** Mở rộng nhóm khay trống theo tầng (key = tierId). */
  const [expandedEmptyTiers, setExpandedEmptyTiers] = useState<Set<number>>(
    () => new Set(),
  )

  const toggleEmptyTier = (tierId: number) => {
    setExpandedEmptyTiers((prev) => {
      const next = new Set(prev)
      if (next.has(tierId)) next.delete(tierId)
      else next.add(tierId)
      return next
    })
  }

  return (
    <div
      aria-label="Kệ nấm"
      className="mcms-room-rack"
      style={{ display: 'flex', flexDirection: 'column', gap: tokens.space['5'] }}
    >
      <Typography.Title level={2} style={{ margin: 0, fontSize: 16 }}>
        Kệ nuôi · {tiers.length} tầng
      </Typography.Title>
      {orderedTiers.map((tier) => {
        const thresholds = thresholdsByTier?.get(tier.tierId) ?? null

        // Ưu tiên hiển thị: khay cần xử lý → đang thuê → trống (gộp lại).
        // Khay "đã tới hạn thu hoạch" (suy ra từ vụ thuê) được ưu tiên như
        // "chờ thu hoạch" dù BE vẫn trả status `OCCUPIED`.
        const priorityOf = (tray: Tray) => {
          if (tray.status === 'maintenance') return 0
          if (tray.status === 'harvesting') return 1
          if (
            tray.status === 'rented' &&
            sessionSummaries?.get(Number(tray.id))?.harvestDue
          ) {
            return 1
          }
          if (tray.status === 'rented') return 2
          return 3
        }

        const sortedTrays = [...tier.trays].sort(
          (a, b) => priorityOf(a) - priorityOf(b),
        )
        const activeTrays = sortedTrays.filter((t) => t.status !== 'empty')
        const emptyTrays = sortedTrays.filter((t) => t.status === 'empty')
        const isEmptyExpanded = expandedEmptyTiers.has(tier.tierId)
        const layout = buildTrayLayout(tier.trays)
        const unplacedIds = new Set(layout.unplaced.map(tray => tray.id))

        const temperature = evaluateTemperature(
          liveReadings?.get(tier.tierId)?.temperature ?? null,
          thresholds,
        )
        const humidity = evaluateHumidity(
          liveReadings?.get(tier.tierId)?.humidity ?? null,
          thresholds,
        )

        return (
          <section
            key={tier.tierId}
            aria-labelledby={`tier-${tier.tierId}-title`}
            style={{
              backgroundColor: tokens.color.surface,
              border: `1px solid ${tokens.color.border}`,
              borderRadius: tokens.radius.xl,
              overflow: 'hidden',
              boxShadow: 'none',
            }}
          >
            {/* ── Tier header ── */}
            <Flex
              align="center"
              justify="space-between"
              gap={12}
              wrap
              style={{
                padding: `${tokens.space['3']} ${tokens.space['4']}`,
                borderBottom: `1px solid ${tokens.color.borderSoft}`,
                backgroundColor: tokens.color.surfaceMuted,
              }}
            >
              <Flex align="center" gap={8} wrap>
                <Typography.Title
                  id={`tier-${tier.tierId}-title`}
                  level={3}
                  style={{ margin: 0, fontSize: 14, color: tokens.color.text }}
                >
                  {formatRoomLabel(tier.name, tier.roomCode, tier.tierId)}
                </Typography.Title>
                <Typography.Text type="secondary" style={{ fontSize: 'var(--mcms-font-small)' }}>
                  {activeTrays.length} khay đang dùng · {emptyTrays.length} khay
                  trống
                </Typography.Text>
              </Flex>

              <Flex gap={8} wrap align="center">
                <ClimateChip
                  icon={<FireOutlined aria-hidden="true" />}
                  reading={temperature}
                  unit="°C"
                  ariaLabel="Nhiệt độ"
                />
                <ClimateChip
                  icon={<CloudOutlined aria-hidden="true" />}
                  reading={humidity}
                  unit="%RH"
                  ariaLabel="Độ ẩm"
                />
              </Flex>
            </Flex>

            {layout.grids.map(grid => (
              <section key={grid.floorId} aria-label={grid.label} style={{ padding: tokens.space['4'] }}>
                <Typography.Title level={4} style={{ fontSize: tokens.typography.sizeTitle, marginTop: 0, marginBottom: tokens.space['3'] }}>{grid.label}</Typography.Title>
                <div style={{ overflowX: 'auto', padding: tokens.space['1'] }}>
                  <div style={{ display: 'grid', gridAutoRows: tokens.components.tray.minHeight, gridTemplateColumns: `repeat(${grid.columns}, minmax(${tokens.components.tray.minWidth}px, 1fr))`, gap: tokens.space['2'] }}>
                    {grid.cells.map(({ tray, row, column }) => <div key={tray.id} style={{ gridRow: row, gridColumn: column, minWidth: 0 }}>
                      <TrayCard tray={tray} isSelected={selectedTrayId === tray.id} onClick={() => onSelectTray(tray)} summary={sessionSummaries?.get(Number(tray.id)) ?? null} />
                    </div>)}
                  </div>
                </div>
              </section>
            ))}
            {layout.unplaced.length > 0 && <Typography.Text type="secondary" style={{ paddingInline: tokens.space['4'] }}>Khay chưa xác định vị trí</Typography.Text>}
            {/* ── Tray grid ── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fill, minmax(${tokens.components.tray.fallbackWidth}px, 1fr))`,
                gap: tokens.space['3'],
                padding: tokens.space['4'],
              }}
            >
              {activeTrays.filter(tray => unplacedIds.has(tray.id)).map((tray) => (
                <TrayCard
                  key={tray.id}
                  tray={tray}
                  isSelected={selectedTrayId === tray.id}
                  onClick={() => onSelectTray(tray)}
                  summary={sessionSummaries?.get(Number(tray.id)) ?? null}
                />
              ))}

              {emptyTrays.some(tray => unplacedIds.has(tray.id)) && (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    display: 'flex',
                    alignItems: 'flex-start',
                  }}
                >
                  <EmptyTrayGroup
                    trays={emptyTrays.filter(tray => unplacedIds.has(tray.id))}
                    selectedTrayId={selectedTrayId}
                    onSelectTray={onSelectTray}
                    onToggle={() => toggleEmptyTier(tier.tierId)}
                    expanded={isEmptyExpanded}
                  />
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
