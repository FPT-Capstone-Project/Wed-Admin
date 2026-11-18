import type { paths } from '../../../types/api-schema'

type StockOperation = paths['/api/inventory/admin']
type ExportOperation = paths['/api/inventory/admin/exports']['get']
export type InventoryQuery = NonNullable<StockOperation['get']['parameters']['query']>
export type ExportQuery = NonNullable<ExportOperation['parameters']['query']>
export type CreateInventory = StockOperation['post']['requestBody']['content']['application/json']
export type AdjustInventory = paths['/api/inventory/admin/{inventoryId}']['patch']['requestBody']['content']['application/json']
export interface Inventory {
  inventory_id: number
  mushroom_type_id: number
  mushroom_name: string
  quantity: string
  updated_at: string | null
}
export interface ExportTransaction {
  transaction_id: number
  inventory_id: number
  mushroom_type_id: number
  mushroom_name: string
  quantity: string
  quantity_before: string
  quantity_after: string
  session_id: number | null
  notes: string | null
  created_at: string | null
}
