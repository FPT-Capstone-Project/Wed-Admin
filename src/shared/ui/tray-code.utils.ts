/** Preserve identity; only shorten a row/column suffix explicitly present in the code. */
export function shortTrayCode(code: string): string {
  const value = code.trim()
  const location = value.match(/(?:^|[-_])R(\d+)[-_]C(\d+)$/i)
  return location ? `R${location[1]}-C${location[2]}` : value
}

/** Visible context for trays outside the physical grid; do not confuse floor IDs with floor numbers. */
export function trayFloorLabel(tray: { floorName?: string | null; floorNumber?: number | null; floorId?: number | null; code: string }): string {
  if (tray.floorName?.trim()) return tray.floorName.trim()
  if (tray.floorNumber != null) return `T${tray.floorNumber}`
  if (tray.floorId != null) return `Tầng ID ${tray.floorId}`
  return 'Chưa rõ tầng'
}
