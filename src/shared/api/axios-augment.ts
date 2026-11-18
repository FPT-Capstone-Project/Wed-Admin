import 'axios'

declare module 'axios' {
  interface AxiosRequestConfig {
    /** UI đã tự hiển thị lỗi; bỏ qua toast toàn cục. */
    skipGlobalErrorToast?: boolean
  }
}
