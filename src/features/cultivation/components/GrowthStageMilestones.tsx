import { Tooltip } from 'antd'
import { tokens } from '../../../app/theme/tokens'
import { GROWTH_STAGE_META } from '../types/cultivation.types'

/** Reference markers only; the existing progress calculation is unchanged. */
const stages = ['SPAWN_RESTING', 'READY_FOR_CULTIVATION', 'CULTIVATING', 'COMPLETED'] as const

/**
 * Vị trí tham chiếu (%) của từng mốc giai đoạn.
 *
 * ⚠ Đây chỉ là MỐC THAM CHIẾU trên thanh tiến độ — KHÔNG phải tỷ lệ tiến
 *   độ thật. Tỷ lệ thật do `calculateSessionProgress()` tính theo thời gian
 *   thực (xem `src/shared/utils/date.ts`).
 */
const STAGE_REFERENCE_PERCENT: Record<(typeof stages)[number], number> = {
  SPAWN_RESTING: 15,
  READY_FOR_CULTIVATION: 35,
  CULTIVATING: 65,
  COMPLETED: 100,
}

export function GrowthStageMilestones() {
  return <div role="group" aria-label="Mốc giai đoạn tham chiếu" style={{ position: 'relative', height: tokens.targetSize.min }}>
    {stages.map(stage => {
      const meta = GROWTH_STAGE_META[stage]
      const referencePercent = STAGE_REFERENCE_PERCENT[stage]
      const label = `${meta.label} · mốc tham chiếu ${referencePercent}%`
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
