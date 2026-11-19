import { formatSessionProgress } from '../../sessions/utils/session-progress.utils'
import { buildTrayLayout, type FloorLayout, type TrayGrid } from '../utils/tray-layout.utils'
import { getClimateTone, getClimateDirection } from '../utils/climate-tone.utils'
import { TrayCodeText } from '../../../shared/ui/TrayCodeText'
import { trayFloorLabel } from '../../../shared/ui/tray-code.utils'
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
import { useMushroomTypes } from '../../packages/hooks/useMushroomTypes'
import { useAllAdminCultivationSessions } from '../../sessions/hooks/useAdminCultivationSessions'
import { useHasPermission } from '../../auth/hooks/usePermission'
import { SESSION_MANAGE } from '../../auth/permissions'
import { TrayStatusLegend } from './TrayStatusLegend'

interface RackViewProps {
  tiers: Tier[]
  floorLayouts?: FloorLayout[]
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
  // Cleaning uses blue, distinct from amber trays awaiting harvest.
  maintenance: {
    borderColor: '#0284c7',
    bgColor: '#f0f9ff',
    textColor: '#0c4a6e',
    progressColor: '#0284c7',
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
    borderStyle: 'solid',
  },
}

/** Calendar time to harvest, independent of the recorded Farm OP growth percentage. */
function harvestTiming(start: string | Date | null | undefined, end: string | Date | null | undefined) {
  const finish = end ? new Date(end).getTime() : NaN
  if (!Number.isFinite(finish) || new Date(finish).getUTCFullYear() <= 1970) return null
  const begin = start ? new Date(start).getTime() : NaN
  const vietnamDay = (time: number) => Math.floor((time + 7 * 3600000) / 86400000)
  const today = vietnamDay(Date.now())
  const days = vietnamDay(finish) - today
  const totalDays = Number.isFinite(begin) && new Date(begin).getUTCFullYear() > 1970
    ? vietnamDay(finish) - vietnamDay(begin) : null
  const elapsedDays = totalDays != null && totalDays > 0 ? Math.max(0, today - vietnamDay(begin)) : null
  const percent = elapsedDays != null && totalDays != null
    ? Math.min(100, elapsedDays / totalDays * 100) : null
  return { days, percent, totalDays, elapsedDays }
}

function MushroomThumbnail({ src, name, empty = false }: { src?: string | null; name: string; empty?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null)
  const url = src?.trim()
  return !empty && url && failed !== url
    ? <img className="mcms-tray-thumbnail" src={url} alt={name} loading="lazy" onError={() => setFailed(url)} />
    : <span className="mcms-tray-thumbnail mcms-tray-thumbnail-placeholder" role="img" aria-label={name}>{empty
      ? <svg aria-hidden="true" width={22} height={22} viewBox="0 0 24 24"><path d="M3 13a9 9 0 0 1 18 0H3Zm6 0v7h6v-7" fill="none" stroke="currentColor" strokeWidth={1.5} /></svg>
      : Array.from(name.trim())[0] || '?'}</span>
}

/** Định dạng ngày thu hoạch dự kiến — "25/10". */
const SHORT_DATE_FMT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
})
const FULL_DATE_FMT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh',
})

function formatShortDate(value: string | Date | null | undefined, full = false): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() <= 1970) return null
  return (full ? FULL_DATE_FMT : SHORT_DATE_FMT).format(date)
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
  const thresholdExplanation = direction === 'low' && reading.min != null
    ? `Dưới ngưỡng tối thiểu ${formatMeasurement(reading.min)} ${unit}`
    : direction === 'high' && reading.max != null
      ? `Trên ngưỡng tối đa ${formatMeasurement(reading.max)} ${unit}`
      : tone === 'danger' ? 'Ngoài khoảng khuyến nghị' : null

  const tooltip = [
    thresholdExplanation,
    reading.statusLabel,
    reading.targetLabel ? `Mục tiêu ${reading.targetLabel}` : null,
  ]
    .filter(Boolean)
    .map(text => formatMeasurementDetails(text!))
    .join(' · ')

  const valueText =
    tone !== 'muted' ? `${formatMeasurement(reading.value)} ${unit}` : '—'

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

// ── Nhãn tầng theo chiều không gian vật lý ──────────────────────────────────
/**
 * Tầng trên hiển thị trước (trên) → "Tầng 2 (Tầng trên)".
 * Tầng dưới hiển thị sau (dưới)   → "Tầng 1 (Tầng dưới)".
 *
 * Giàn chỉ có 1 tầng → không gắn nhãn vị trí (tránh nhập nhằng).
 */
function shelfDisplayLabel(
  grid: TrayGrid,
  options: { isTopShelf: boolean; isSingleShelf: boolean },
): string {
  const label = grid.label.trim()
  const floorNumber = grid.floorNumber
  /** Label đã chứa số tầng (vd "Tầng 2", "Phòng A - Tầng 2") → không nối thêm. */
  const hasFloorNumber = /\bTầng\s*\d+\b/i.test(label)

  let base = label
  if (!label) {
    base = floorNumber != null ? `Tầng ${floorNumber}` : `Tầng ID ${grid.floorId}`
  } else if (floorNumber != null && !hasFloorNumber) {
    base = `${label} (Tầng ${floorNumber})`
  }

  if (options.isSingleShelf) return base
  return options.isTopShelf ? `${base} (Tầng trên)` : `${base} (Tầng dưới)`
}

// ── Tray Card ────────────────────────────────────────────────────────────────
interface TrayCardProps {
  imageUrl?: string | null
  floorLabel?: string
  tray: Tray
  isSelected: boolean
  onClick: () => void
  /** Tóm tắt vụ thuê (khách + ngày thu hoạch) — null nếu không có. */
  summary: TraySessionSummary | null
}

function TrayCard({ tray, isSelected, onClick, summary, floorLabel, imageUrl }: TrayCardProps) {
  /**
   * Khay "đã tới hạn thu hoạch" nhận nhãn + màu "Chờ thu hoạch" dù BE vẫn
   * trả status `OCCUPIED` — người dùng phải thấy được việc cần xử lý.
   */
  const effectiveStatus: TrayStatus =
    tray.status === 'rented' && summary?.harvestDue ? 'harvesting' : tray.status

  const vis = TRAY_VISUAL[effectiveStatus]
  const timing = harvestTiming(summary?.startDate ?? tray.rental?.startDate, summary?.expectedHarvestDate ?? tray.rental?.expectedHarvestDate)
  const trayCode = formatTrayCode(tray.code)
  const customerName = summary?.customerName ?? tray.rental?.tenantName ?? 'Chưa có khách'
  const harvestDate = formatShortDate(summary?.expectedHarvestDate ?? tray.rental?.expectedHarvestDate)
  const startDate = formatShortDate(summary?.startDate ?? tray.rental?.startDate)
  const mushroomName = summary?.mushroomName ?? tray.rental?.mushroomType ?? 'Chưa rõ loại nấm'
  const detail = [
    floorLabel ?? trayFloorLabel(tray), tray.code, TRAY_STATUS_CONFIG[effectiveStatus].label,
    ...(tray.status === 'empty' ? [] : [mushroomName, customerName]),
    summary ? `Phiên #${summary.sessionId}` : null,
    startDate ? `Bắt đầu ${formatShortDate(summary?.startDate ?? tray.rental?.startDate, true)}` : null,
    harvestDate ? `Dự kiến thu hoạch ${formatShortDate(summary?.expectedHarvestDate ?? tray.rental?.expectedHarvestDate, true)}` : null,
    timing?.percent != null ? `Đã nuôi ${timing.elapsedDays}/${timing.totalDays} ngày` : null,
    summary ? `Tiến độ Farm OP: ${formatSessionProgress(summary.progressPercent)}` : null,
  ].filter(Boolean).join(' · ')

  return <Tooltip title={detail} trigger={['hover', 'focus']}>
    <button type="button" onClick={onClick} aria-label={`Mở chi tiết ${trayCode}: ${detail}`}
      aria-current={isSelected ? 'true' : undefined} className={`tray-card-btn ${tray.status === 'empty' ? 'mcms-tray-empty' : 'mcms-tray-active'}`}
      style={{
        appearance: 'none', font: 'inherit', width: '100%', minWidth: 0,
        textAlign: 'left', borderRadius: 10, cursor: 'pointer',
        border: `1px ${vis.borderStyle} ${isSelected ? tokens.color.text : vis.borderColor}`,
        borderLeft: tray.status === 'empty'
          ? `1px solid ${isSelected ? tokens.color.text : vis.borderColor}`
          : `3px solid ${vis.progressColor}`,
        color: vis.textColor, background: tray.status === 'empty' ? tokens.color.surfaceMuted : vis.bgColor,
      }}>
      <span className="mcms-tray-code-row">
        <TrayCodeText code={tray.code} wrap={false} focusable={false} />
      </span>
      <span className="mcms-tray-content">
      <span className="mcms-tray-crop"><MushroomThumbnail src={imageUrl} name={tray.status === 'empty' ? 'Khay trống' : mushroomName} empty={tray.status === 'empty'} /><strong className="mcms-tray-variety">{tray.status === 'empty' ? 'Trống' : mushroomName}</strong></span>
      <span className="mcms-tray-status" data-status={effectiveStatus} aria-hidden={tray.status === 'empty'} style={{ color: vis.textColor, background: `color-mix(in srgb, ${vis.progressColor} 10%, ${tokens.color.surface})`, visibility: tray.status === 'empty' ? 'hidden' : 'visible' }}>{TRAY_STATUS_CONFIG[effectiveStatus].shortLabel}</span>
      <span className="mcms-tray-harvest-row" aria-hidden={tray.status === 'empty'} style={{ visibility: tray.status === 'empty' ? 'hidden' : 'visible' }}>
        <span className="mcms-tray-date" style={{ visibility: harvestDate || startDate ? undefined : 'hidden' }}>{harvestDate
          ? timing && timing.days <= 0
            ? `Đến hạn ${harvestDate}`
            : `Hạn ${harvestDate}${timing ? ` · còn ${timing.days.toLocaleString('vi-VN')} ngày` : ''}`
          : startDate ? `Từ ${startDate}` : '\u00a0'}</span>
      {timing?.percent != null ? <Tooltip title={`Đã nuôi ${timing.elapsedDays?.toLocaleString('vi-VN')}/${timing.totalDays?.toLocaleString('vi-VN')} ngày`} trigger={['hover', 'focus']}>
      <span className="mcms-tray-progress-track" role="progressbar" aria-label={`Đã nuôi ${timing.elapsedDays}/${timing.totalDays} ngày`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(timing.percent)}>
        <span className="mcms-tray-progress-fill" style={{ transform: `scaleX(${timing.percent / 100})`, background: vis.progressColor }} />
      </span></Tooltip> : <span className="mcms-tray-progress-placeholder" aria-hidden="true" />}
      </span>
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
          transition: `transform ${tokens.motion.fast}, opacity ${tokens.motion.fast}`,
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
  floorLayouts = [],
  selectedTrayId,
  onSelectTray,
  thresholdsByTier,
  sessionSummaries,
  liveReadings,
}: RackViewProps) {
  const canViewSessions = useHasPermission(SESSION_MANAGE)
  const sessions = useAllAdminCultivationSessions(undefined, { enabled: canViewSessions, staleTime: 60_000 })
  const mushrooms = useMushroomTypes()
  const imageBySession = useMemo(() => {
    const images = new Map(mushrooms.data?.map(type => [type.mushroom_type_id, type.image_url]))
    return new Map(sessions.data?.map(session => [session.session_id, session.mushroom_type_id == null ? null : images.get(session.mushroom_type_id)]))
  }, [sessions.data, mushrooms.data])
  const floorCount = new Set([
    ...floorLayouts.map(floor => floor.floor_id),
    ...tiers.flatMap(tier => tier.trays.map(tray => tray.floorId)),
  ].filter((id): id is number => id != null && Number.isSafeInteger(id) && id > 0)).size
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
        Kệ nuôi · {floorCount} tầng
      </Typography.Title>
      <TrayStatusLegend />
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
        const layout = buildTrayLayout(tier.trays, floorLayouts.filter(floor => floor.room_id === tier.tierId))

        const temperature = evaluateTemperature(
          liveReadings?.get(tier.tierId)?.temperature ?? null,
          thresholds,
        )
        const humidity = evaluateHumidity(
          liveReadings?.get(tier.tierId)?.humidity ?? null,
          thresholds,
        )

        // ⚠ Chiều không gian vật lý: Tầng 2 nằm TRÊN, Tầng 1 nằm DƯỚI.
        // `buildTrayLayout` trả grid theo `floor_number` tăng dần ⇒ đảo ngược
        // để tầng cao hơn render trước (trên) đúng như giàn kệ thực tế.
        const orderedGrids = [...layout.grids].sort(
          (a, b) =>
            (b.floorNumber ?? -Infinity) - (a.floorNumber ?? -Infinity) ||
            b.floorId - a.floorId,
        )

        return (
          <section
            key={tier.tierId}
            aria-labelledby={`tier-${tier.tierId}-title`}
            className="mcms-rack"
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

            {/* ── Giàn kệ công nghiệp: các tầng xếp chồng ── */}
            {orderedGrids.length > 0 && (
              <div className={`mcms-rack-shell${orderedGrids.length === 1 ? ' mcms-rack-shell-single' : ''}`}>
                {orderedGrids.map((grid, gridIndex) => {
                  const cells = new Map(grid.cells.map(cell => [`${cell.row}:${cell.column}`, cell.tray]))
                  const conflicts = new Set(grid.conflicts.map(cell => `${cell.row}:${cell.column}`))
                  const isTopShelf = gridIndex === 0
                  const shelfLabel = shelfDisplayLabel(grid, {
                    isTopShelf,
                    isSingleShelf: orderedGrids.length === 1,
                  })
                  const occupied = grid.cells.filter(cell => cell.tray.status !== 'empty').length
                  const total = grid.cells.length
                  return (
                    <div key={grid.floorId} style={{ minWidth: 0 }}>
                      {/* ── Tầng trên (kệ) ── */}
                      <section className="mcms-rack-shelf" aria-label={shelfLabel}>
                        <div className="mcms-rack-shelf-header">
                          <Typography.Title
                            level={4}
                            style={{
                              fontSize: tokens.typography.sizeTitle,
                              margin: 0,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {shelfLabel}
                          </Typography.Title>
                          <Tooltip title={`${grid.rows} × ${grid.columns} vị trí · ${occupied}/${total} khay đang dùng`}>
                            <span className="mcms-shelf-occupancy"><span>{occupied}/{total} đang dùng</span><span className="mcms-shelf-occupancy-track"><span style={{ width: '100%', transform: `scaleX(${total ? occupied / total : 0})`, transformOrigin: 'left' }} /></span></span>
                          </Tooltip>
                        </div>
                        {grid.rows > 0 && grid.columns > 0 ? (
                          <div className="mcms-rack-tray-scroll">
                            <div
                              style={{
                                display: 'grid',
                                gridAutoRows: 'var(--tray-h)',
                                gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))`,
                                gap: 12,
                                minWidth: grid.columns > 6 ? grid.columns * 120 + (grid.columns - 1) * 12 : 0,
                                width: '100%', marginInline: 'auto',
                              }}
                            >
                              {Array.from({ length: grid.rows * grid.columns }, (_, index) => {
                                const row = Math.floor(index / grid.columns) + 1
                                const column = (index % grid.columns) + 1
                                const tray = cells.get(`${row}:${column}`)
                                const vacancyLabel = conflicts.has(`${row}:${column}`)
                                  ? 'Trùng vị trí khay'
                                  : 'Vị trí chưa có khay'
                                return (
                                  <div key={`${row}:${column}`} style={{ gridRow: row, gridColumn: column, minWidth: 0 }}>
                                    {tray ? (
                                      <TrayCard
                                        floorLabel={shelfLabel}
                                        tray={tray}
                                        isSelected={selectedTrayId === tray.id}
                                        onClick={() => onSelectTray(tray)}
                                        summary={sessionSummaries?.get(Number(tray.id)) ?? null}
                                        imageUrl={imageBySession.get(sessionSummaries?.get(Number(tray.id))?.sessionId ?? -1)}
                                      />
                                    ) : (
                                      <span
                                        role="img"
                                        aria-label={`${grid.label}, R${row}-C${column}: ${vacancyLabel}`}
                                        title={`${shelfLabel} · R${row}-C${column}: ${vacancyLabel}`}
                                        style={{
                                          display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'var(--tray-h)',
                                          border: `1px solid ${tokens.tone.muted.border}`,
                                          borderRadius: 10, background: tokens.color.surfaceMuted, color: tokens.tone.muted.text,
                                          fontSize: tokens.typography.sizeSmall,
                                        }}
                                      >
                                        R{row}-C{column}{conflicts.has(`${row}:${column}`) ? ' !' : ''}
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ) : (
                          <Typography.Text type="secondary">Chưa có vị trí khay</Typography.Text>
                        )}
                      </section>

                    </div>
                  )
                })}

              </div>
            )}
            {layout.unplacedGroups.length > 0 && <section style={{ padding: tokens.space['4'] }} aria-label="Khay chưa xác định vị trí">
              <Typography.Title level={4} style={{ fontSize: tokens.typography.sizeTitle, marginTop: 0 }}>Khay chưa xác định vị trí</Typography.Title>
              {layout.unplacedGroups.map(group => <section key={group.floorId ?? 'unassigned'} aria-label={group.label}>
                <Typography.Title level={5} style={{ overflowWrap: 'anywhere' }}>{group.label}</Typography.Title>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${tokens.components.tray.fallbackWidth}px, 1fr))`, gap: tokens.space['3'], marginBottom: tokens.space['4'] }}>
                  {group.trays.filter(tray => tray.status !== 'empty').map(tray => <TrayCard key={tray.id} tray={tray}
                    isSelected={selectedTrayId === tray.id} onClick={() => onSelectTray(tray)} summary={sessionSummaries?.get(Number(tray.id)) ?? null}
                    imageUrl={imageBySession.get(sessionSummaries?.get(Number(tray.id))?.sessionId ?? -1)} />)}
                  {group.trays.some(tray => tray.status === 'empty') && <div style={{ gridColumn: '1 / -1' }}>
                    <EmptyTrayGroup trays={group.trays.filter(tray => tray.status === 'empty')} selectedTrayId={selectedTrayId}
                      onSelectTray={onSelectTray} onToggle={() => toggleEmptyTier(tier.tierId)} expanded={isEmptyExpanded} />
                  </div>}
                </div>
              </section>)}
            </section>}
          </section>
        )
      })}
    </div>
  )
}
