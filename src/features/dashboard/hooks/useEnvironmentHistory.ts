import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { fetchEnvironmentHistory } from '../api/environment-history.api'
import { dashboardKeys } from './useDashboardMetrics'
import { retryApiErrors } from '../../../shared/api/retry-policy'
import {
  DEFAULT_REFRESH_AFTER_MS,
  toChartFloors,
  toLatestEnvironment,
  type EnvironmentChartFloor,
  type FloorLatestEnvironment,
} from '../utils/environment-history.utils'
import type { EnvironmentHistoryData } from '../../../types/environment-history'

/**
 * Lịch sử môi trường theo tầng — **một request duy nhất**.
 *
 * ⚠ Nguồn dữ liệu **duy nhất** cho biểu đồ giám sát môi trường và cho thẻ
 *   chỉ số "Nhiệt độ / Độ ẩm trung bình" của trang Tổng quan.
 *
 * ## Vì sao thay thế luồng cũ?
 *
 * Luồng cũ gom dữ liệu **từ nhiều nơi**:
 *   - `GET /api/iot/floors` → danh sách tầng
 *   - `GET /api/iot/masters` → map master
 *   - `GET /api/iot/floors/{id}/environment` × N tầng → ngưỡng + trạng thái
 *   - `GET /api/iot/masters/{m}/nodes/{n}/sensors/{s}/history` × (N tầng × 3 cảm
 *     biến) với phân trang `limit/offset` tay → **hàng chục request**, mỗi cảm
 *     biến là một vòng lặp phân trang (mỗi 1000 bản ghi một request).
 *
 * → Nay **một request** trả sẵn cửa sổ thời gian, kích thước bucket, nhịp làm
 *   mới đề xuất, ngưỡng hiện tại và chuỗi điểm đã gộp của mọi tầng.
 *
 * ## Vì sao vẫn an toàn khi BE lỗi?
 *
 * Không dùng `Promise.all` ⇒ **không** có cascade failure. Query lỗi ⇒ biểu đồ
 * hiện thông báo + nút "Thử lại", phần KPI còn lại của trang vẫn hiển thị bình
 * thường (xem `DashboardPage` — lỗi môi trường không chặn trang).
 *
 * ## Caching & làm mới
 *
 * - `staleTime: 60_000` — dữ liệu lịch sử 15 phút, cache 1 phút là quá đủ.
 * - `refetchInterval` lấy **từ chính response** (`refreshAfterMs`, mặc định
 *   5 phút) ⇒ nhịp làm mới do BE quyết định, FE không hardcode. Nhịp cũ cũng
 *   từng do FE tự đặt (`REFRESH_MS = 5 * 60_000` trong component chart).
 * - `refetchOnWindowFocus: false` — lịch sử không cần làm mới gấp khi quay lại
 *   tab (mặc định toàn app cũng đã tắt).
 */
export function useEnvironmentHistory(
  options?: Partial<UseQueryOptions<EnvironmentHistoryData, Error>>,
) {
  return useQuery<EnvironmentHistoryData, Error>({
    queryKey: dashboardKeys.environmentHistory(),
    queryFn: () => fetchEnvironmentHistory(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: retryApiErrors,
    refetchOnWindowFocus: false,
    // Nhịp làm mới do BE quyết định (`refreshAfterMs`, mặc định 5 phút).
    refetchInterval: query =>
      query.state.data?.refreshAfterMs ?? DEFAULT_REFRESH_AFTER_MS,
    ...options,
  })
}

export { toChartFloors, toLatestEnvironment }
export type { EnvironmentChartFloor, FloorLatestEnvironment }
