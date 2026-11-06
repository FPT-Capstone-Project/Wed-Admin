import { apiClient } from '../../../shared/api/client'
import { ensureObject } from '../../../shared/api/response-normalizer'
import { normalizeEnvironmentHistory } from '../utils/environment-history.utils'
import type { EnvironmentHistoryData } from '../../../types/environment-history'

/**
 * Dashboard Environment History API — **100% READ-ONLY**.
 *
 * ⚠ TUYỆT ĐỐI KHÔNG thêm hàm POST/PUT/PATCH/DELETE ở đây.
 *
 * Nguồn dữ liệu **duy nhất** cho biểu đồ giám sát môi trường (nhiệt độ /
 * độ ẩm theo tầng) của trang Tổng quan:
 *   - `GET /api/analytics/dashboard/environment-history`
 *
 * ⚠ Endpoint này **thay thế** toàn bộ luồng gom dữ liệu cũ:
 *   `/api/iot/floors` + `/api/iot/masters` + `/api/iot/floors/{id}/environment`
 *   (× tầng) + `/api/iot/masters/{m}/nodes/{n}/sensors/{s}/history`
 *   (× tầng × cảm biến, có phân trang `limit/offset` tay).
 *
 * → Nay **một request** trả sẵn cửa sổ thời gian, kích thước bucket, nhịp
 *   làm mới đề xuất, ngưỡng hiện tại và chuỗi điểm đã gộp của mọi tầng.
 *
 * Phân quyền (Swagger): `403` nếu không phải Admin / Farm Operator.
 */

const ENVIRONMENT_HISTORY_URL = '/api/analytics/dashboard/environment-history'

/** Query params tuỳ chọn — BE yêu cầu `from`/`to` đi cặp. */
export interface EnvironmentHistoryQuery {
  /** Đầu cửa sổ (ISO 8601). */
  from?: string
  /** Cuối cửa sổ (ISO 8601). */
  to?: string
}

/**
 * Tải lịch sử nhiệt độ / độ ẩm của mọi tầng — **một request duy nhất**.
 *
 * Không truyền `from`/`to` ⇒ BE dùng cửa sổ mặc định 24 giờ kết thúc tại mốc
 * 5 phút gần nhất (96 bucket 15 phút) — đúng nhu cầu của biểu đồ Dashboard.
 *
 * @throws AxiosError khi request lỗi (400/401/403/5xx) → React Query xử lý.
 */
export async function fetchEnvironmentHistory(
  query: EnvironmentHistoryQuery = {},
): Promise<EnvironmentHistoryData> {
  const response = await apiClient.get<unknown>(ENVIRONMENT_HISTORY_URL, {
    params: query,
  })

  // `ensureObject` bóc 1 cấp wrapper `data`; nếu BE trả thẳng object thì trả
  // chính nó.
  const body = ensureObject<Record<string, unknown>>(response.data)

  if (!body) {
    throw new Error('Dữ liệu lịch sử môi trường không đúng định dạng.')
  }

  return normalizeEnvironmentHistory(body)
}
