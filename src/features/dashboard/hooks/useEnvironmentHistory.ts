import { useEffect } from 'react'
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { fetchEnvironmentHistory } from '../api/environment-history.api'
import { dashboardKeys } from './useDashboardMetrics'
import { retryApiErrors } from '../../../shared/api/retry-policy'
import {
  DEFAULT_REFRESH_AFTER_MS,
  describeEnvironmentWindow,
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
 * - `refetchOnWindowFocus: true` — **khác** mặc định toàn app. Đây là biểu
 *   đồ giám sát trực tiếp: quay lại tab phải thấy data mới ngay, không
 *   phải chờ tới chu kỳ poll kế tiếp (5 phút). TanStack chỉ refetch khi dữ
 *   liệu đã stale (> `staleTime` = 1 phút) ⇒ không spam request.
 *
 * ⚠ **Vì sao `staleTime` KHÔNG làm chết `refetchInterval`?**
 *   TanStack Query v5: `refetchInterval` gọi thẳng `Query.fetch()` — **không**
 *   qua kiểm tra `staleTime` ⇒ poll vẫn chạy đều đặn dù cache còn "fresh".
 *   (`staleTime` chỉ chi phối refetch khi mount / focus / invalidate.)
 *
 * ⚠ **Vì sao poll có thể bị "đứng"?**
 *   Timer của `refetchInterval` **chỉ refetch khi tab đang focus**
 *   (`focusManager.isFocused()`) trừ khi bật `refetchIntervalInBackground`.
 *   ⇒ Khi user chuyển sang tab khác, poll tạm dừng; quay lại tab thì
 *   `refetchOnWindowFocus: true` bắn ngay 1 request ⇒ chart tự kéo dài.
 */
export function useEnvironmentHistory(
  options?: Partial<UseQueryOptions<EnvironmentHistoryData, Error>>,
) {
  const query = useQuery<EnvironmentHistoryData, Error>({
    queryKey: dashboardKeys.environmentHistory(),
    queryFn: () => fetchEnvironmentHistory(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: retryApiErrors,
    /*
     * ⚠ `refetchOnWindowFocus: true` — **khác** mặc định toàn app (`false`).
     *
     *   Đây là biểu đồ **giám sát trực tiếp**: user thường mở Dashboard,
     *   đi qua tab khác (đọc tin nhắn, đơn hàng…), rồi quay lại. Với
     *   `false`, chart sẽ hiện dữ liệu **cũ** tới 5 phút ⇒ trông như "đứng
     *   hình" dù BE đã có data mới.
     *
     *   ⇒ Cho phép refetch ngay khi tab được focus. TanStack chỉ refetch khi
     *     dữ liệu đã **stale** (> `staleTime` = 1 phút) ⇒ không spam request.
     */
    refetchOnWindowFocus: true,
    // Nhịp làm mới do BE quyết định (`refreshAfterMs`, mặc định 5 phút).
    refetchInterval: query =>
      query.state.data?.refreshAfterMs ?? DEFAULT_REFRESH_AFTER_MS,
    ...options,
  })

  useEnvironmentHistoryDiagnostics(query.data)

  return query
}

/**
 * Log chẩn đoán cửa sổ dữ liệu ra console (chỉ ở chế độ dev).
 *
 * ⚠ Mục đích: kiểm tra nhanh xem **BE dừng ở mốc nào** và **dữ liệu thực tế
 *   mới nhất là mấy giờ** — để phân biệt "BE không có data mới" với "FE
 *   không kéo dài chart".
 *
 * ⚠ Chỉ log khi payload **đổi** (so với lần log trước) ⇒ không spam console
 *   mỗi lần re-render.
 */
function useEnvironmentHistoryDiagnostics(
  data: EnvironmentHistoryData | undefined,
) {
  const signature =
    data == null
      ? null
      : `${data.from}|${data.to}|${data.floors.length}|${describeEnvironmentWindow(data)?.latestPointAt ?? 'none'}`

  useEffect(() => {
    if (!import.meta.env.DEV) return
    if (data == null) return

    const diagnostics = describeEnvironmentWindow(data)
    if (!diagnostics) return

    const formatTime = (value: number | null) =>
      value == null
        ? '—'
        : new Date(value).toLocaleString('vi-VN', { hour12: false })

    console.info(
      `[environment-history] cửa sổ BE ${formatTime(diagnostics.from)} → ${formatTime(diagnostics.to)}` +
        ` · bucket ${diagnostics.bucketMs / 60_000} phút` +
        ` · nhịp làm mới ${diagnostics.refreshAfterMs / 1000}s` +
        ` · điểm dữ liệu mới nhất ${formatTime(diagnostics.latestPointAt)}` +
        ` · ${diagnostics.floorsWithData}/${diagnostics.floorCount} tầng có số đo`,
      diagnostics.floors,
    )
    // `signature` đảm bảo chỉ log khi payload thực sự đổi.
  }, [signature, data])
}

export { toChartFloors, toLatestEnvironment }
export type { EnvironmentChartFloor, FloorLatestEnvironment }
