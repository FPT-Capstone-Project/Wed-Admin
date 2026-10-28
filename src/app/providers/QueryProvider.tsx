import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { retryApiErrors } from '../../shared/api/retry-policy'

/**
 * Singleton QueryClient — cấu hình chung cho toàn app.
 *
 * - defaultError → message tiếng Việt qua `getApiErrorMessage` để component
 *   có thể hiển thị trực tiếp qua `useQuery({ ... select: (data) => data })`
 *   mà không phải xử lý lại ở UI.
 * - `retry` ở scope default → request bị timeout (backend Render đang
 *   "thức dậy") sẽ được thử lại **1 lần**; lần thứ 2 thường nhanh vì
 *   backend đã khởi động xong. Xem `retryApiErrors` + `retryDelay`.
 *
 * ⚠ Không `export` ở file này: rule `react-refresh/only-export-components`
 *   yêu cầu file chỉ export component để Fast Refresh (HMR) hoạt động đúng.
 *   Ai cần query client dùng hook `useQueryClient()` của TanStack Query.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /**
       * Thử lại **1 lần** khi request thất bại tạm thời (timeout, mạng, 5xx).
       *
       * ⚠ Mặc định của TanStack Query v5 là `retry: 3` với backoff
       * `min(1000 * 2^n, 30_000)` → tổng thời gian chờ có thể lên tới ~7s
       * cộng thêm 3 lần timeout 60s ⇒ người dùng bị treo gần 3 phút.
       *
       * → `retryApiErrors` chỉ retry nhóm lỗi **an toàn để thử lại**:
       * timeout / lỗi mạng / 5xx / 429. Lỗi 4xx (401, 403, 404, 409…) thì
       * không retry vì thử lại cũng không thành công.
       */
      retry: retryApiErrors,
      /**
       * Chờ 1.5s trước khi thử lại.
       *
       * Cho backend (Render free tier) đủ thời gian hoàn tất lần khởi
       * động lạnh đang dở, thay vì lập tức bắn request thứ 2 vào instance
       * vẫn đang khởi động.
       */
      retryDelay: 1_500,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      throwOnError: false,
    },
    mutations: {
      /**
       * ⚠ Mutation mặc định **không** retry.
       *
       * Lý do: mutation là thao tác ghi (tạo/sửa/xoá, gửi OTP, thanh toán).
       * Retry tự động có thể tạo trùng lặp — vd bấm "Đặt lại mật khẩu" 2 lần
       * sẽ gửi 2 OTP, hoặc tạo trùng bản ghi. Nên để caller tự quyết định
       * (xem `useMutation({ retry: ... })` tại từng chỗ).
       */
      retry: 0,
      throwOnError: false,
    },
  },
})

interface QueryProviderProps {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
