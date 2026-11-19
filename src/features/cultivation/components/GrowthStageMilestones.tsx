import { Tooltip } from 'antd'
import { tokens } from '../../../app/theme/tokens'
import { GROWTH_STAGE_LABELS } from '../../../shared/i18n/status/session'

/**
 * ⚠ Reference markers only; the actual progress comes from the session.
 *
 * 4 giai đoạn trồng nấm: "Ủ tơ" → "Kéo tơ" → "Nấm đang phát triển" →
 * "Sẵn sàng thu hoạch".
 */
const stages = [
  'FRUITING_INITIATION',
  'PINNING',
  'YOUNG_FRUITING',
  'MATURATION',
] as const

/** Nhãn của 4 giai đoạn trồng nấm. */
const STAGE_LABELS = GROWTH_STAGE_LABELS

/**
 * Vị trí tham chiếu (%) của từng mốc giai đoạn.
 *
 * ⚠ Đây chỉ là MỐC THAM CHIẾU trên thanh tiến độ — KHÔNG phải tỷ lệ tiến
 *   độ thật. Tỷ lệ thật lấy từ `progress_percent` của **Phiên canh tác**
 *   (Farm OP cập nhật) — xem `features/sessions/utils/session-progress.utils.ts`.
 */
const STAGE_REFERENCE_PERCENT: Record<(typeof stages)[number], number> = {
  FRUITING_INITIATION: 15,
  PINNING: 35,
  YOUNG_FRUITING: 65,
  MATURATION: 100,
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
