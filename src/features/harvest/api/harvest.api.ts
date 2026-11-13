import { apiClient } from '../../../shared/api/client'
export type HarvestStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED'
export interface HarvestQuery { status?: HarvestStatus; mushroomTypeId?: number; orderId?: number; fromDate?: string; toDate?: string }
export interface Harvest {
  harvest_id: number; session_id: number; order_id: number; order_code: string; customer_name: string; mushroom_type: string
  status: HarvestStatus; total_weight_kg: number | string | null; usable_weight_kg: number | string | null; rejected_weight_kg: number | string | null
  quality_grade: string | null; harvest_method: 'PICKUP' | 'DELIVERY' | null; scheduled_at: string | null; customer_note: string | null
  confirmed_by: number | null; confirmed_at: string | null; completed_at: string | null; harvest_request_status: string | null
  harvest_date: string | null; harvested_by: number | null; harvest_request_id: number | null; session_tray_id: number | null
  /**
   * ⚠ BE **không** trả 2 trường này (chỉ trả `confirmed_by` / `harvested_by`
   *   dạng ID — xem `Backend/src/models/harvest.model.js`).
   *   Được khai báo để tương thích nếu BE bổ sung sau; UI luôn fallback sang
   *   tra cứu `/api/users` khi thiếu.
   */
  confirmed_by_name?: string | null; harvested_by_name?: string | null
  cultivation_status: string; harvest_status: string; notes: string | null; created_at: string; updated_at: string
}
export interface HarvestListResponse { data: Harvest[]; total: number }
export const harvestApi = {
  async list(query: HarvestQuery) { return (await apiClient.get<HarvestListResponse>('/api/harvests/admin', { params: query })).data },
  async detail(id: number) { return (await apiClient.get<{ data: Harvest }>(`/api/harvests/${id}`)).data.data },
}
