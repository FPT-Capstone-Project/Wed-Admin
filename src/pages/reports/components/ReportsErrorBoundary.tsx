import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Result } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { ActionButton } from '../../../shared/ui'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Tên module dùng cho thông báo lỗi (vd: "Reports Analytics") */
  moduleName?: string
  /** Fallback custom — nếu không truyền sẽ dùng Antd Result */
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Bọc ErrorBoundary cho module Reports để tránh lỗi runtime
 * `Component is not a function` (hoặc bất kỳ lỗi render nào)
 * phá vỡ toàn bộ SPA — chỉ cô lập phần Reports.
 */
export class ReportsErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log nhẹ cho dev console — không spam production
    if (import.meta.env.DEV) {
      console.error(
        `[ReportsErrorBoundary] ${this.props.moduleName ?? 'Reports'} lỗi:`,
        error,
        info.componentStack,
      )
    }
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null })
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      const moduleLabel = this.props.moduleName ?? 'Báo cáo & Phân tích'
      return (
        <Result
          status="error"
          title={`${moduleLabel} tạm thời không khả dụng`}
          subTitle={
            this.state.error?.message ??
            'Đã xảy ra lỗi khi render trang báo cáo. Báo dev để kiểm tra console.'
          }
          extra={
            <ActionButton
              icon={<ReloadOutlined />}
              label="Thử lại"
              description="Tải lại lần nữa lần."
              variant="primary"
              size="middle"
              onClick={this.handleReload}
            />
          }
        />
      )
    }
    return this.props.children
  }
}
