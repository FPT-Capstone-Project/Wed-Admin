import { Tooltip } from 'antd'
import { tokens } from '../../../app/theme/tokens'
import { GROWTH_STAGE_META } from '../types/cultivation.types'

/** Reference markers only; the existing progress calculation is unchanged. */
const stages = ['SPAWN_RESTING', 'READY_FOR_CULTIVATION', 'CULTIVATING', 'COMPLETED'] as const

export function GrowthStageMilestones() {
  return <div role="group" aria-label="Mốc giai đoạn tham chiếu" style={{ position: 'relative', height: tokens.targetSize.min }}>
    {stages.map(stage => {
      const meta = GROWTH_STAGE_META[stage]
      const label = `${meta.label} · mốc tham chiếu ${meta.defaultProgress}%`
      return <Tooltip key={stage} title={label} trigger={['hover', 'focus']}>
        <span tabIndex={0} role="img" aria-label={label} style={{
          position: 'absolute', left: `clamp(0px, calc(${meta.defaultProgress}% - ${tokens.targetSize.min} / 2), calc(100% - ${tokens.targetSize.min}))`,
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
