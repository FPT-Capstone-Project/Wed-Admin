import type { Tray } from '../../../types/room.types'
import type { CultivationFloorMapping } from '../../../types/iot'

export type FloorLayout = Pick<CultivationFloorMapping, 'floor_id' | 'room_id' | 'floor_name' | 'floor_number' | 'total_rows' | 'total_columns'>
export interface PositionedTray { tray: Tray; row: number; column: number }
export interface TrayGrid {
  floorId: number
  floorNumber: number | null
  label: string
  rows: number
  columns: number
  cells: PositionedTray[]
  conflicts: Array<{ row: number; column: number }>
}
export interface UnplacedTrayGroup { floorId: number | null; label: string; trays: Tray[] }

function positive(value: number | null | undefined): value is number {
  return value != null && Number.isSafeInteger(value) && value > 0
}

/** API coordinates are authoritative. R/C is a legacy fallback; F is never a floor ID. */
function coordinates(tray: Tray): { row: number; column: number } | null {
  if (tray.positionId === null) return null
  if (positive(tray.rowNumber) && positive(tray.columnNumber)) {
    return { row: tray.rowNumber, column: tray.columnNumber }
  }
  // Invalid/partial API coordinates must not be silently overwritten by a code.
  if (tray.rowNumber != null || tray.columnNumber != null) return null
  const match = tray.code.match(/(?:^|[-_])R(\d+)[-_]C(\d+)$/i)
  if (!match) return null
  const row = Number(match[1])
  const column = Number(match[2])
  return positive(row) && positive(column) ? { row, column } : null
}

export function buildTrayLayout(trays: readonly Tray[], floors: readonly FloorLayout[] = []): {
  grids: TrayGrid[]; unplaced: Tray[]; unplacedGroups: UnplacedTrayGroup[]
} {
  const groups = new Map<number, TrayGrid>()
  const metadata = new Map(floors.map(floor => [floor.floor_id, floor]))
  const unplaced: Tray[] = []
  function groupFor(floorId: number, tray?: Tray): TrayGrid {
    const existing = groups.get(floorId)
    if (existing) return existing
    const floor = metadata.get(floorId)
    const floorNumber = floor?.floor_number ?? tray?.floorNumber ?? null
    const group: TrayGrid = {
      floorId, floorNumber,
      label: floor?.floor_name?.trim() || tray?.floorName?.trim() ||
        (floorNumber != null ? `Tầng ${floorNumber}` : `Tầng ID ${floorId}`),
      rows: positive(floor?.total_rows) ? floor.total_rows : 0,
      columns: positive(floor?.total_columns) ? floor.total_columns : 0,
      cells: [], conflicts: [],
    }
    groups.set(floorId, group)
    return group
  }
  for (const floor of floors) if (positive(floor.floor_id)) groupFor(floor.floor_id)
  for (const tray of trays) {
    if (!positive(tray.floorId)) { unplaced.push(tray); continue }
    const group = groupFor(tray.floorId, tray)
    const position = coordinates(tray)
    if (!position) { unplaced.push(tray); continue }
    // Preserve a valid API position even if floor dimensions are stale.
    group.rows = Math.max(group.rows, position.row)
    group.columns = Math.max(group.columns, position.column)
    group.cells.push({ tray, ...position })
  }
  const grids = [...groups.values()].map(group => {
    const counts = new Map<string, number>()
    for (const cell of group.cells) {
      const key = `${cell.row}:${cell.column}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const conflicts = group.cells.filter(cell => (counts.get(`${cell.row}:${cell.column}`) ?? 0) > 1)
      .map(({ row, column }) => ({ row, column }))
    const cells = group.cells.filter(cell => {
      if (counts.get(`${cell.row}:${cell.column}`) === 1) return true
      unplaced.push(cell.tray)
      return false
    }).sort((a, b) => a.row - b.row || a.column - b.column)
    return { ...group, cells, conflicts }
  }).sort((a, b) => (a.floorNumber ?? Infinity) - (b.floorNumber ?? Infinity) || a.floorId - b.floorId)
  const unplacedGroups = new Map<number | null, UnplacedTrayGroup>()
  for (const tray of unplaced) {
    const floorId = positive(tray.floorId) ? tray.floorId : null
    const label = floorId == null ? 'Chưa gán tầng' : groups.get(floorId)!.label
    const group = unplacedGroups.get(floorId) ?? { floorId, label, trays: [] }
    group.trays.push(tray)
    unplacedGroups.set(floorId, group)
  }
  return { grids, unplaced, unplacedGroups: [...unplacedGroups.values()].sort((a, b) =>
    (groups.get(a.floorId!)?.floorNumber ?? Infinity) - (groups.get(b.floorId!)?.floorNumber ?? Infinity) ||
    (a.floorId ?? Infinity) - (b.floorId ?? Infinity)) }
}
