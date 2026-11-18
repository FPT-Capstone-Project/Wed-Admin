import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '../api/inventory.api'
import type { AdjustInventory, CreateInventory, ExportQuery, InventoryQuery } from '../types/inventory.types'

export const inventoryKeys = { all: ['inventory'] as const }
export function useInventory(query: InventoryQuery) {
  return useQuery({ queryKey: [...inventoryKeys.all, 'stock', query], queryFn: ({ signal }) => inventoryApi.list(query, signal), placeholderData: keepPreviousData })
}
export function useInventoryExports(query: ExportQuery) {
  return useQuery({ queryKey: [...inventoryKeys.all, 'exports', query], queryFn: ({ signal }) => inventoryApi.exports(query, signal), placeholderData: keepPreviousData })
}
type InventoryChange = { kind: 'create'; payload: CreateInventory } | { kind: 'adjust'; id: number; payload: AdjustInventory } | { kind: 'delete'; id: number }
export function useInventoryMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (change: InventoryChange) => change.kind === 'create' ? inventoryApi.create(change.payload) : change.kind === 'adjust' ? inventoryApi.adjust(change.id, change.payload) : inventoryApi.remove(change.id),
    onSuccess: () => client.invalidateQueries({ queryKey: inventoryKeys.all }),
  })
}
