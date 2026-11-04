import type { Tray } from '../../../types/room.types'

export interface PositionedTray { tray: Tray; row: number; column: number }
export interface TrayGrid { floorId: number; label: string; columns: number; cells: PositionedTray[] }

/** Backend-generated code: ROOM{id}-F{floorId}-R{row}-C{column}. Never guess missing positions. */
export function buildTrayLayout(trays: readonly Tray[]): { grids: TrayGrid[]; unplaced: Tray[] } {
  const groups = new Map<number, TrayGrid>()
  const unplaced: Tray[] = []
  for (const tray of trays) {
    const match = tray.code.match(/(?:^|-)F(\d+)-R(\d+)-C(\d+)$/i)
    const numbers = match?.slice(1).map(Number)
    if (!numbers || numbers.some(value => !Number.isSafeInteger(value) || value < 1)) {
      unplaced.push(tray); continue
    }
    const [floorId, row, column] = numbers
    if (tray.floorId != null && tray.floorId !== floorId) { unplaced.push(tray); continue }
    const group = groups.get(floorId) ?? {
      floorId, label: tray.floorName || `Tầng ${tray.floorNumber ?? floorId}`, columns: 0, cells: [],
    }
    group.columns = Math.max(group.columns, column)
    group.cells.push({ tray, row, column })
    groups.set(floorId, group)
  }
  const grids: TrayGrid[] = []
  for (const group of groups.values()) {
    const positions = new Set(group.cells.map(cell => `${cell.row}:${cell.column}`))
    if (positions.size !== group.cells.length) unplaced.push(...group.cells.map(cell => cell.tray))
    else grids.push({ ...group, cells: [...group.cells].sort((a, b) => a.row - b.row || a.column - b.column) })
  }
  return { grids, unplaced }
}
