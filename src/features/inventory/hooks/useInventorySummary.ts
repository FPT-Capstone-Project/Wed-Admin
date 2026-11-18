import { useQuery } from '@tanstack/react-query'
import { inventoryApi } from '../api/inventory.api'
import type { ExportQuery } from '../types/inventory.types'
import { collectSummaryPages, stockLevel, sumQuantities, SUMMARY_PAGE_SIZE } from '../utils/inventory.utils'
import { inventoryKeys } from './useInventory'

export function useInventorySummary(filters: Pick<ExportQuery, 'mushroomTypeId' | 'fromDate' | 'toDate'>) {
  const stock = useQuery({
    queryKey: [...inventoryKeys.all, 'summary', 'stock'], retry: false,
    queryFn: async ({ signal }) => {
      const rows = await collectSummaryPages(page => inventoryApi.list({ page, limit: SUMMARY_PAGE_SIZE }, signal))
      if (new Set(rows.map(row => row.inventory_id)).size !== rows.length) throw new Error('Dữ liệu tồn kho bị trùng giữa các trang.')
      return { quantity: sumQuantities(rows.map(row => row.quantity)), varieties: new Set(rows.map(row => row.mushroom_type_id)).size, low: rows.filter(row => stockLevel(row.quantity).tone === 'warning').length, empty: rows.filter(row => stockLevel(row.quantity).tone === 'danger').length }
    },
  })
  const exports = useQuery({
    queryKey: [...inventoryKeys.all, 'summary', 'exports', filters], retry: false,
    queryFn: async ({ signal }) => {
      const rows = await collectSummaryPages(page => inventoryApi.exports({ ...filters, page, limit: SUMMARY_PAGE_SIZE }, signal))
      if (new Set(rows.map(row => row.transaction_id)).size !== rows.length) throw new Error('Giao dịch xuất kho bị trùng giữa các trang.')
      return sumQuantities(rows.map(row => row.quantity))
    },
  })
  return { stock, exports }
}
