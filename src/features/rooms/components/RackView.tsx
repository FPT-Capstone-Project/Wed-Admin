import { CloudOutlined, FireOutlined } from '@ant-design/icons'
import { Flex, Tooltip, Typography } from 'antd'
import { useMemo, useState } from 'react'
import type { Tier, Tray, TrayStatus } from '../../../types/room.types'
import { tokens } from '../../../app/theme/tokens'
import { formatRoomLabel, formatTrayCode } from '../../../shared/i18n/terms'
import { StatusBadge } from '../../../shared/ui/StatusBadge'
import { TRAY_STATUS_CONFIG } from './tray-status.config'
import {
  CLIMATE_TONE,
  evaluateHumidity,
  evaluateTemperature,
  type ClimateReading,
  type ClimateThresholds,
} from '../utils/tray-climate.utils'
import type { TrayRentalSummary } from '../hooks/useTrayRentalSummaries'

interface RackViewProps {
  tiers: Tier[]
  selectedTrayId: string | null
  onSelectTray: (tray: Tray) => void
  /** Ngưỡng canh tác theo tầng — nguồn: BE `/environment` (`thresholds`). */
  thresholdsByTier?: Map<Tier['tierId'], ClimateThresholds>
  /** Tóm tắt vụ thuê theo `tray_id` (khách + ngày thu hoạch dự kiến). */
  rentalSummaries?: Map<number, TrayRentalSummary>
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
    bgColor: tokens.color.surface,
    textColor: tokens.color.text,
    progressColor: tokens.tone.ok.solid,
    borderStyle: 'solid',
  },
  empty: {
    borderColor: tokens.color.border,
    bgColor: tokens.color.surfaceMuted,
    textColor: tokens.color.textMuted,
    progressColor: tokens.color.border,
    borderStyle: 'dashed',
  },
}

// ── Tính tiến độ sinh trưởng ─────────────────────────────────────────────
/**
 * Tiến độ canh tác — dựa trên VỤ THUÊ THẬT.
 *
 * ⚠ `tray.rental` luôn là `null` khi dữ liệu đến từ BE
 * (`toUiTray` không map rental) → thanh tiến độ trước đây không bao giờ
 * hiện. Nay tính từ `TrayRentalSummary` (đọc `GET /api/rentals/admin`).
 *
 * @returns `{ percent, dayLabel }` hoặc `null` khi không có vụ thuê.
 */
function growthProgress(
  summary: TrayRentalSummary | null,
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
  const tone = CLIMATE_TONE[reading.level]
  const palette = tokens.tone[tone]

  const tooltip = [
    reading.statusLabel,
    reading.targetLabel ? `Mục tiêu ${reading.targetLabel}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const valueText =
    reading.value != null ? `${reading.value.toFixed(1)}${unit}` : `—`

  return (
    <Tooltip title={tooltip}>
      <span
        aria-label={`${ariaLabel}: ${valueText}${reading.targetLabel ? `, mục tiêu ${reading.targetLabel}` : ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 12,
          fontWeight: tokens.typography.weightSemibold,
          color: palette.text,
          backgroundColor: palette.bg,
          border: `1px solid ${palette.border}`,
          borderRadius: tokens.radius.pill,
          padding: '2px 10px',
          fontFamily: tokens.typography.fontNumeric,
          cursor: 'help',
        }}
      >
        <span aria-hidden="true">{icon}</span>
        {valueText}
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
  summary: TrayRentalSummary | null
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
  const isEmpty = tray.status === 'empty'
  const trayCode = formatTrayCode(tray.code)

  const baseShadow = isSelected
    ? `0 0 0 2px ${vis.borderColor}, ${tokens.shadow.sm}`
    : tokens.shadow.xs

  // Ô khay trống — gọn, chữ nhạt, KHÔNG lặp lại "Sẵn sàng vào vụ".
  if (isEmpty) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Mở chi tiết ${trayCode}`}
        aria-current={isSelected ? 'true' : undefined}
        className="rack-tray-btn"
        style={{
          all: 'unset',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          minHeight: 36,
          borderRadius: tokens.radius.md,
          border: `1px ${vis.borderStyle} ${vis.borderColor}`,
          backgroundColor: vis.bgColor,
          cursor: 'pointer',
          transition: `box-shadow ${tokens.motion.fast}`,
          boxShadow: baseShadow,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: tokens.typography.weightSemibold,
            color: vis.textColor,
            fontFamily: tokens.typography.fontNumeric,
          }}
        >
          {trayCode}
        </span>
        <span style={{ fontSize: 11, color: vis.textColor }}>Trống</span>
      </button>
    )
  }

  const customerName = summary?.customerName ?? tray.rental?.tenantName ?? null
  const harvestDate = formatShortDate(
    summary?.expectedHarvestDate ?? tray.rental?.expectedHarvestDate,
  )
  const mushroomName = summary?.mushroomName ?? tray.rental?.mushroomType ?? null

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Mở chi tiết ${trayCode}`}
      aria-current={isSelected ? 'true' : undefined}
      className="tray-card-btn"
      style={{
        all: 'unset',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '10px 12px',
        borderRadius: tokens.radius.lg,
        border: `1.5px ${vis.borderStyle} ${vis.borderColor}`,
        backgroundColor: vis.bgColor,
        cursor: 'pointer',
        transition: `box-shadow ${tokens.motion.fast}, transform ${tokens.motion.fast}`,
        boxShadow: baseShadow,
        minHeight: 92,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* ── Dòng 1: mã khay + badge trạng thái ── */}
      <Flex align="center" justify="space-between" gap={4}>
        <span
          style={{
            fontSize: 11,
            fontWeight: tokens.typography.weightSemibold,
            letterSpacing: '0.04em',
            color: vis.textColor,
            fontFamily: tokens.typography.fontNumeric,
          }}
        >
          {trayCode}
        </span>
        <StatusBadge
          tone={TRAY_STATUS_CONFIG[effectiveStatus].tone}
          label={TRAY_STATUS_CONFIG[effectiveStatus].shortLabel}
          title={TRAY_STATUS_CONFIG[effectiveStatus].label}
          style={{
            fontSize: 10,
            lineHeight: '16px',
            margin: 0,
          }}
        />
      </Flex>

      {/* ── Loại nấm ── */}
      {mushroomName && (
        <span
          style={{
            fontSize: 12,
            fontWeight: tokens.typography.weightSemibold,
            color: vis.textColor,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {mushroomName}
        </span>
      )}

      {/* ── Thông tin hữu ích: khách thuê + ngày thu hoạch dự kiến ── */}
      {(customerName || harvestDate) && (
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
            fontSize: 11,
            color: vis.textColor,
            opacity: 0.85,
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {customerName ?? ''}
          </span>
          {harvestDate && (
            <span
              style={{
                flexShrink: 0,
                fontFamily: tokens.typography.fontNumeric,
              }}
            >
              {harvestDate}
            </span>
          )}
        </span>
      )}

      {progress !== null && (
        <div style={{ marginTop: 2 }}>
          <Flex align="center" justify="space-between" gap={4}>
            <span style={{ fontSize: 10, color: vis.textColor, opacity: 0.7 }}>
              {progress.dayLabel}
            </span>
            <span style={{ fontSize: 10, color: vis.textColor, opacity: 0.7 }}>
              {Math.round(progress.percent)}%
            </span>
          </Flex>
          <div
            style={{
              height: 4,
              borderRadius: tokens.radius.pill,
              backgroundColor: `${vis.progressColor}28`,
              overflow: 'hidden',
              marginTop: 2,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress.percent}%`,
                borderRadius: tokens.radius.pill,
                backgroundColor: vis.progressColor,
                transition: `width ${tokens.motion.slow}`,
              }}
            />
          </div>
        </div>
      )}

      {!tray.rental && tray.batchId && (
        <span style={{ fontSize: 11, color: vis.textColor, opacity: 0.7 }}>
          Mẻ: {tray.batchId}
        </span>
      )}
    </button>
  )
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
          all: 'unset',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          minHeight: 36,
          padding: '6px 12px',
          borderRadius: tokens.radius.md,
          border: `1px dashed ${tokens.color.border}`,
          backgroundColor: tokens.color.surfaceMuted,
          color: tokens.color.textMuted,
          fontSize: 12,
          fontFamily: tokens.typography.fontNumeric,
          cursor: 'pointer',
          transition: `background-color ${tokens.motion.fast}`,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span aria-hidden="true">▸</span>
        {trays.length} khay trống
        <span style={{ fontSize: 11, opacity: 0.8 }}>· bấm để xem</span>
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
          all: 'unset',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          minHeight: 36,
          padding: '6px 12px',
          borderRadius: tokens.radius.md,
          border: `1px solid ${tokens.color.border}`,
          backgroundColor: tokens.color.surfaceMuted,
          color: tokens.color.textMuted,
          fontSize: 12,
          fontFamily: tokens.typography.fontNumeric,
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
  rentalSummaries,
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
      style={{ display: 'flex', flexDirection: 'column', gap: tokens.space['5'] }}
    >
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
            rentalSummaries?.get(Number(tray.id))?.harvestDue
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
              boxShadow: tokens.shadow.xs,
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
                  level={5}
                  style={{ margin: 0, color: tokens.color.text }}
                >
                  {formatRoomLabel(tier.name, tier.roomCode, tier.tierId)}
                </Typography.Title>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
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

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: 12,
                    color: tokens.color.textMuted,
                    backgroundColor: tokens.color.surfaceDisabled,
                    border: `1px solid ${tokens.color.border}`,
                    borderRadius: tokens.radius.pill,
                    padding: '2px 10px',
                  }}
                  aria-label="CO2 chưa được cảm biến đo"
                >
                  CO₂ —&nbsp;ppm
                </span>
              </Flex>
            </Flex>

            {/* ── Tray grid ── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))',
                gap: tokens.space['3'],
                padding: tokens.space['4'],
              }}
            >
              {activeTrays.map((tray) => (
                <TrayCard
                  key={tray.id}
                  tray={tray}
                  isSelected={selectedTrayId === tray.id}
                  onClick={() => onSelectTray(tray)}
                  summary={rentalSummaries?.get(Number(tray.id)) ?? null}
                />
              ))}

              {emptyTrays.length > 0 && (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    display: 'flex',
                    alignItems: 'flex-start',
                  }}
                >
                  <EmptyTrayGroup
                    trays={emptyTrays}
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
