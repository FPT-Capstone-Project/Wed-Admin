import type { CSSProperties, ReactNode } from 'react'
import { Button, Empty } from 'antd'
import { tokens } from '../../../app/theme/tokens'
import { chartTooltipStyle } from './chart-styles'

export function ChartFrame({ children, label, empty, height, className }: {
  children: ReactNode; label: string; empty: boolean; height?: CSSProperties['height']; className?: string
}) {
  return <div className={className} role="img" aria-label={empty ? `${label}: Chưa có dữ liệu` : label}
    style={{ minWidth: 0, width: '100%', height: height ?? (className ? undefined : tokens.components.chart.height),
      fontFamily: tokens.typography.fontFamily, fontSize: tokens.typography.sizeSmall }}>
    {empty ? <Empty description="Chưa có dữ liệu" /> : children}
  </div>
}

export function ChartTooltipSurface({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className} style={chartTooltipStyle}>{children}</div>
}

export interface ChartLegendItem {
  key: string; label: ReactNode; color: string; dashed?: boolean; visible?: boolean
}
export function ChartLegend({ items, onToggle }: { items: ChartLegendItem[]; onToggle?: (key: string) => void }) {
  return <div aria-label="Chú thích biểu đồ" style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.space['2'],
    paddingBlock: tokens.space['2'], color: tokens.color.textMuted, fontSize: tokens.typography.sizeSmall }}>
    {items.map(item => {
      const content = <><span aria-hidden="true" style={{ display: 'inline-block', width: tokens.space['4'],
        marginInlineEnd: tokens.space['2'], borderTop: `${tokens.components.chart.lineWidth}px ${item.dashed ? 'dashed' : 'solid'} ${item.color}` }} />{item.label}</>
      return onToggle
        ? <Button key={item.key} type="text" size="small" aria-pressed={item.visible !== false}
          onClick={() => onToggle(item.key)} style={{ color: tokens.color.textMuted,
            textDecoration: item.visible === false ? 'line-through' : undefined }}>{content}</Button>
        : <span key={item.key}>{content}</span>
    })}
  </div>
}
