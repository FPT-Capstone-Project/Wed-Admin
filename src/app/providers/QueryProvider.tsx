import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'

/**
 * Singleton QueryClient — cấu hình chung cho toàn app.
 *
 * - defaultError → message tiếng Việt qua `getApiErrorMessage` để component
 *   có thể hiển thị trực tiếp qua `useQuery({ ... select: (data) => data })`
 *   mà không phải xử lý lại ở UI.
 * - retry: false ở scope default; các query có thể override nếu cần.
 *
 * ⚠ Không `export` ở file này: rule `react-refresh/only-export-components`
 *   yêu cầu file chỉ export component để Fast Refresh (HMR) hoạt động đúng.
 *   Ai cần query client dùng hook `useQueryClient()` của TanStack Query.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      throwOnError: false,
    },
    mutations: {
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
