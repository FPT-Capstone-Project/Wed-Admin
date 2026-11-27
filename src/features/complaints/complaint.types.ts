import type { paths } from '../../types/api-schema'

export type ComplaintQuery = NonNullable<paths['/api/complaints']['get']['parameters']['query']>
export type ComplaintStatus = NonNullable<ComplaintQuery['status']>
export type AssignPayload = paths['/api/complaints/{id}/assign']['patch']['requestBody']['content']['application/json']
export type StatusPayload = paths['/api/complaints/{id}/status']['patch']['requestBody']['content']['application/json']

// GET response fields verified read-only against complaint.model.js/controller.js;
// Azure OpenAPI currently omits the 200 response bodies.
export interface Complaint {
  complaint_id: number
  order_id: number
  customer_id: number
  complaint_type: string
  description: string
  image_urls: string[]
  status: ComplaintStatus
  assigned_to: number | null
  resolution: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}
export interface ComplaintReply {
  image_urls?: string[]
  media_url?: string | null
  sender_role?: string | null
  reply_id: number
  complaint_id: number
  sender_id: number
  sender_name: string
  sender_role_id: number
  message: string
  created_at: string
}
export interface ComplaintDetail extends Complaint {
  assigned_staff: { user_id: number; full_name: string; role_id: number } | null
  replies: ComplaintReply[]
}
export interface ComplaintList {
  data: Complaint[]
  total: number
  page: number
  pageSize: number
}
