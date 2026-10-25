import { CloudOutlined, FireOutlined } from '@ant-design/icons'
import { Flex, Tooltip, Typography } from 'antd'
import type { Tier, Tray } from '../../../types/room.types'
import { tokens } from '../../../app/theme/tokens'

interface RackViewProps {
  tiers: Tier[]
  selectedTrayId: string | null
  onSelectTray: (tray: Tray) => void
}

// ── Status visual config dùng tokens ────────────────────────────────────────
interface TrayVisualConfig {
  label: string
  hint: string
  borderColor: string
  bgColor: string
  textColor: string
  badgeBg: string
  badgeText: string
  badgeBorder: string
  progressColor: string
  borderStyle: 'dashed' | 'solid'
}

const TRAY_VISUAL: Record<Tray['status'], TrayVisualConfig> = {
  empty: {
    label: 'Trống',
    hint: 'Sẵn sàng vào vụ',
    borderColor: tokens.color.border,
    bgColor: tokens.color.surface,
    textColor: tokens.color.textDisabled,
    badgeBg: tokens.color.surfaceDisabled,
    badgeText: tokens.color.textMuted,
    badgeBorder: tokens.color.border,
    progressColor: tokens.color.border,
    borderStyle: 'dashed',
  },
  rented: {
    label: 'Đang thuê',
    hint: '',
    borderColor: tokens.tone.ok.border,
    bgColor: tokens.tone.ok.bg,
    textColor: tokens.tone.ok.text,
    badgeBg: tokens.tone.ok.bg,
    badgeText: tokens.tone.ok.text,
    badgeBorder: tokens.tone.ok.border,
    progressColor: tokens.tone.ok.solid,
    borderStyle: 'solid',
  },
  harvesting: {
    label: 'Chờ thu hoạch',
    hint: '',
    borderColor: tokens.tone.warning.border,
    bgColor: tokens.tone.warning.bg,
    textColor: tokens.tone.warning.text,
    badgeBg: tokens.tone.warning.bg,
    badgeText: tokens.tone.warning.text,
    badgeBorder: tokens.tone.warning.border,
    progressColor: tokens.tone.warning.solid,
    borderStyle: 'solid',
  },
  maintenance: {
    label: 'Nhiễm bệnh / Cách ly',
    hint: '',
    borderColor: tokens.tone.danger.border,
    bgColor: tokens.tone.danger.bg,
    textColor: tokens.tone.danger.text,
    badgeBg: tokens.tone.danger.bg,
    badgeText: tokens.tone.danger.text,
    badgeBorder: tokens.tone.danger.border,
    progressColor: tokens.tone.danger.solid,
    borderStyle: 'solid',
  },
}

// ── Tính tiến độ sinh trưởng ─────────────────────────────────────────────
function growthProgressPercent(tray: Tray): number | null {
  if (!tray.rental) return null
  const start = new Date(tray.rental.startDate).getTime()
  const end = new Date(tray.rental.expectedHarvestDate).getTime()
  const now = Date.now()
  if (end <= start) return null
  return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
}

function growthDayLabel(tray: Tray): string | null {
  if (!tray.rental) return null
  const start = new Date(tray.rental.startDate).getTime()
  const total = tray.rental.weeks * 7
  const day = Math.max(1, Math.ceil((Date.now() - start) / 86_400_000))
  return `Ngày ${Math.min(day, total)}/${total}`
}

// ── Tray Card ────────────────────────────────────────────────────────────────
interface TrayCardProps {
  tray: Tray
  isSelected: boolean
  onClick: () => void
}

function TrayCard({ tray, isSelected, onClick }: TrayCardProps) {
  const vis = TRAY_VISUAL[tray.status]
  const pct = growthProgressPercent(tray)
  const dayLabel = growthDayLabel(tray)
  const isEmpty = tray.status === 'empty'

  const baseShadow = isSelected
    ? `0 0 0 2px ${vis.borderColor}, ${tokens.shadow.sm}`
    : tokens.shadow.xs

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Mở chi tiết ${tray.code}`}
      aria-pressed={isSelected}
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
        minHeight: 80,
        outline: 'none',
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
          {tray.code}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '1px 6px',
            borderRadius: tokens.radius.pill,
            backgroundColor: vis.badgeBg,
            color: vis.badgeText,
            border: `1px solid ${vis.badgeBorder}`,
            whiteSpace: 'nowrap',
            lineHeight: '16px',
            flexShrink: 0,
          }}
        >
          {vis.label}
        </span>
      </Flex>

      {/* ── Nội dung theo trạng thái ── */}
      {isEmpty ? (
        <span style={{ fontSize: 11, color: vis.textColor, fontStyle: 'italic' }}>
          {vis.hint}
        </span>
      ) : (
        <>
          {tray.rental?.mushroomType && (
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
              {tray.rental.mushroomType}
            </span>
          )}
          {tray.rental?.tenantName && (
            <span
              style={{
                fontSize: 11,
                color: vis.textColor,
                opacity: 0.8,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {tray.rental.tenantName}
            </span>
          )}
          {pct !== null && (
            <div style={{ marginTop: 2 }}>
              <Flex align="center" justify="space-between" gap={4}>
                <span style={{ fontSize: 10, color: vis.textColor, opacity: 0.7 }}>
                  {dayLabel}
                </span>
                <span style={{ fontSize: 10, color: vis.textColor, opacity: 0.7 }}>
                  {Math.round(pct)}%
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
                    width: `${pct}%`,
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
        </>
      )}
    </button>
  )
}

// ── RackView ─────────────────────────────────────────────────────────────────
export function RackView({ tiers, selectedTrayId, onSelectTray }: RackViewProps) {
  const orderedTiers = [...tiers].sort((a, b) => b.tierId - a.tierId)

  return (
    <div
      aria-label="Kệ nấm"
      style={{ display: 'flex', flexDirection: 'column', gap: tokens.space['5'] }}
    >
      {orderedTiers.map((tier) => (
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
            <Typography.Title
              id={`tier-${tier.tierId}-title`}
              level={5}
              style={{ margin: 0, color: tokens.color.text }}
            >
              {tier.name}
            </Typography.Title>

            <Flex gap={8} wrap align="center">
              <Tooltip title="Nhiệt độ không khí">
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    fontWeight: tokens.typography.weightSemibold,
                    color: tokens.color.coral,
                    backgroundColor: tokens.color.coralSoft,
                    border: `1px solid ${tokens.tone.danger.border}`,
                    borderRadius: tokens.radius.pill,
                    padding: '2px 10px',
                    fontFamily: tokens.typography.fontNumeric,
                  }}
                >
                  <FireOutlined aria-hidden="true" />
                  {Number(tier.telemetry.temperature).toFixed(1)}°C
                </span>
              </Tooltip>

              <Tooltip title="Độ ẩm không khí">
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    fontWeight: tokens.typography.weightSemibold,
                    color: tokens.color.teal,
                    backgroundColor: tokens.color.tealSoft,
                    border: `1px solid ${tokens.tone.info.border}`,
                    borderRadius: tokens.radius.pill,
                    padding: '2px 10px',
                    fontFamily: tokens.typography.fontNumeric,
                  }}
                >
                  <CloudOutlined aria-hidden="true" />
                  {Number(tier.telemetry.humidity).toFixed(1)}% RH
                </span>
              </Tooltip>

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
            {tier.trays.map((tray) => (
              <TrayCard
                key={tray.id}
                tray={tray}
                isSelected={selectedTrayId === tray.id}
                onClick={() => onSelectTray(tray)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
