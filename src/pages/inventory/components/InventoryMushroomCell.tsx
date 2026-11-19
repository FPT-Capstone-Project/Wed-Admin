import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Flex, Typography } from 'antd'

export function InventoryMushroomThumbnail({ name, imageUrl, size = 40 }: {
  name: string; imageUrl?: string | null; size?: number
}) {
  const src = imageUrl?.trim() ?? ''
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const style: CSSProperties = {
    width: size, height: size, minWidth: size, flexShrink: 0, borderRadius: 6,
    border: '1px solid var(--mcms-border)', background: 'var(--mcms-background)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', color: 'var(--mcms-primary)', fontWeight: 600,
  }
  return src && failedUrl !== src
    ? <img src={src} alt={name} loading="lazy" decoding="async" onError={() => setFailedUrl(src)} style={{ ...style, objectFit: 'cover' }} />
    : <span role="img" aria-label={name} style={style}>{Array.from(name.trim())[0]?.toLocaleUpperCase('vi-VN') || '?'}</span>
}

export function InventoryMushroomCell({ id, name, imageUrl, sessionId }: {
  id: number; name: string; imageUrl?: string | null; sessionId?: number | null
}) {
  return <Flex align="center" gap={12}>
    <InventoryMushroomThumbnail name={name} imageUrl={imageUrl} />
    <div style={{ minWidth: 0 }}>
      <Typography.Text strong>{name}</Typography.Text>
      <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>Mã giống #{id}{sessionId ? ` · Phiên #${sessionId}` : ''}</Typography.Text></div>
    </div>
  </Flex>
}
