import type { CSSProperties } from 'react'
import { tokens } from '../../../app/theme/tokens'

export const chartTooltipStyle: CSSProperties = {
  background: tokens.color.surface,
  color: tokens.color.text,
  border: `${tokens.components.chart.borderWidth}px solid ${tokens.color.border}`,
  borderRadius: tokens.radius.md,
  padding: tokens.space['3'],
  fontFamily: tokens.typography.fontFamily,
  fontSize: tokens.typography.sizeSmall,
  lineHeight: tokens.typography.lineHeight,
  boxShadow: tokens.shadow.sm,
  maxWidth: '80vw',
  overflowWrap: 'anywhere',
}
export const chartTickStyle = { fill: tokens.color.textMuted, fontSize: tokens.typography.sizeSmall }
