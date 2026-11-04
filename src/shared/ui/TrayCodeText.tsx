import { Tooltip } from 'antd'
import { tokens } from '../../app/theme/tokens'
import { shortTrayCode } from './tray-code.utils'

export function TrayCodeText({ code, focusable = true, prefix }: { code: string; focusable?: boolean; prefix?: string }) {
  return <Tooltip title={code} trigger={['hover', 'focus']}>
    <span tabIndex={focusable ? 0 : undefined} title={code} aria-label={code}
      style={{ display: 'inline-block', minWidth: 0, maxWidth: '100%', overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'bottom',
        fontFamily: tokens.typography.fontMono, fontSize: tokens.typography.sizeSmall }}>
      {prefix ? `${prefix} · ` : ''}{shortTrayCode(code)}
    </span>
  </Tooltip>
}
