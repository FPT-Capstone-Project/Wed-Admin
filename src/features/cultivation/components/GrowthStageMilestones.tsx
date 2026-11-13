import { Tooltip } from 'antd'
import { tokens } from '../../../app/theme/tokens'

/**
 * ⚠ Reference markers only; the actual progress comes from the session.
 *
 * 4 giai đoạn trồng nấm: "Ủ tơ" → "Kéo tơ" → "Nấm đang phát triển" →
 * "Sẵn sàng thu hoạch".
 */
const stages = [
  'SPAWNING',
  'RUNNING',
  'FRUITING',
  'HARVESTING',
] as const

/** Nhãn của 4 giai đoạn trồng nấm. */
const STAGE_LABELS: Record<(typeof stages)[number], string> = {
  SPAWNING: 'Ủ tơ',
  RUNNING: 'Kéo tơ',
  FRUITING: 'Nấm đang phát triển',
  HARVESTING: 'Sẵn sàng thu hoạch',
}

/**
 * Vị trí tham chiếu (%) của từng mốc giai đoạn.
 *
 * ⚠ Đây chỉ là MỐC THAM CHIẾU trên thanh tiến độ — KHÔNG phải tỷ lệ tiến
 *   độ thật. Tỷ lệ thật lấy từ `progress_percent` của **Phiên canh tác**
 *   (Farm OP cập nhật) — xem `features/sessions/utils/session-progress.utils.ts`.
 */
const STAGE_REFERENCE_PERCENT: Record<(typeof stages)[number], number> = {
  SPAWNING: 15,
  RUNNING: 35,
  FRUITING: 65,
  HARVESTING: 100,
}

export function GrowthStageMilestones() {
  return <div role="group" aria-label="Mốc giai đoạn tham chiếu" style={{ position: 'relative', height: tokens.targetSize.min }}>
    {stages.map(stage => {
      const referencePercent = STAGE_REFERENCE_PERCENT[stage]
      const label = `${STAGE_LABELS[stage]} · mốc tham chiếu ${referencePercent}%`
      return <Tooltip key={stage} title={label} trigger={['hover', 'focus']}>
        <span tabIndex={0} role="img" aria-label={label} style={{
          position: 'absolute', left: `clamp(0px, calc(${referencePercent}% - ${tokens.targetSize.min} / 2), calc(100% - ${tokens.targetSize.min}))`,
          width: tokens.targetSize.min, height: tokens.targetSize.min, display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', borderRadius: tokens.radius.sm,
        }}>
          <span aria-hidden="true" style={{ width: tokens.components.badge.dotSize,
            height: tokens.components.badge.dotSize, borderRadius: tokens.radius.sm,
            background: tokens.tone.info.bg, border: `${tokens.components.kpi.borderWidth}px solid ${tokens.tone.info.border}` }} />
        </span>
      </Tooltip>
    })}
  </div>
}
