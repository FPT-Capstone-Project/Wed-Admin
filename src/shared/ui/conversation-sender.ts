interface SenderIdentity {
  senderId?: number | null
  roleId?: number | null
  role?: string | null
  senderName?: string | null
  externalId?: number | null
  externalName?: string | null
}

/** Explicit roles take priority; IDs distinguish participants when chat omits roles. */
export function conversationSide(identity: SenderIdentity): 'left' | 'right' {
  const role = identity.role?.toUpperCase() ?? ''
  if (identity.roleId === 3 || /EXPERT|CUSTOMER/.test(role)) return 'left'
  if (identity.roleId === 1 || identity.roleId === 2 || /ADMIN|STAFF|OPERATOR|FARM_MANAGER/.test(role)) return 'right'
  if (identity.senderId != null && identity.externalId != null) return identity.senderId === identity.externalId ? 'left' : 'right'
  if (identity.senderName && identity.externalName) return identity.senderName.trim().toLocaleLowerCase() === identity.externalName.trim().toLocaleLowerCase() ? 'left' : 'right'
  return 'left'
}
