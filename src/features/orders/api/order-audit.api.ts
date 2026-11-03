import { apiClient } from '../../../shared/api/client'
import type { Harvest } from '../../harvest/api/harvest.api'
export interface OrderCultivationSession {
  session_id: number; status: string; harvest_status: string; mushroom_name: string; spawn_quantity: number
  current_stage: string | null; progress_percent: number | string | null; expected_harvest_date: string | null
  assigned_trays: { session_tray_id: number; tray_id: number; status: string }[]
}
export interface OrderCultivationResponse { orderId: number; sessions: OrderCultivationSession[] }
export interface OrderHarvestEntry { session_id: number; mushroom_type: { id: number; name: string }; harvest: Pick<Harvest, 'harvest_id' | 'status' | 'harvest_date' | 'total_weight_kg' | 'usable_weight_kg' | 'rejected_weight_kg' | 'quality_grade' | 'harvest_method'> | null }
export interface OrderHarvestResponse { order_id: number; order_code: string; harvests: OrderHarvestEntry[] }
export const orderAuditApi = {
  async cultivation(id: number) { return (await apiClient.get<{ data: OrderCultivationResponse }>(`/api/customer/orders/${id}/cultivation-status`)).data.data },
  async harvests(id: number) { return (await apiClient.get<{ data: OrderHarvestResponse }>(`/api/orders/${id}/harvest-history`)).data.data },
}
