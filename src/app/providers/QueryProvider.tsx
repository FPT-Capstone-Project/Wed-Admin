import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getApiErrorMessage } from '../../shared/api/error'
import { type ReactNode } from 'react'

/**
 * Singleton QueryClient — cấu hình chung cho toàn app.
 *
 * - defaultError → message tiếng Việt qua `getApiErrorMessage` để component
 *   có thể hiển thị trực tiếp qua `useQuery({ ... select: (data) => data })`
 *   mà không phải xử lý lại ở UI.
 * - retry: false ở scope default; các query có thể override nếu cần.
 */
export const queryClient = new QueryClient({
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

/**
 * Chuẩn hoá error từ TanStack Query mutation/query error → string tiếng Việt.
 * Hữu ích khi UI muốn hiển thị message.error trong onError callback của useMutation.
 */
export function toFriendlyError(error: unknown): string {
  return getApiErrorMessage(error)
}