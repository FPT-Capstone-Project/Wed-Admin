import { Component, type ErrorInfo, type ReactNode } from 'react'
import { HomeOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons'
import { Flex, Result } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import { ActionButton } from './ActionButton'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface PageErrorBoundaryProps extends AppErrorBoundaryProps {
  onDashboard: () => void
}

interface PageErrorBoundaryState {
  hasError: boolean
}

class PageErrorBoundary extends Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  override state: PageErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): PageErrorBoundaryState {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[AppErrorBoundary]', error, info.componentStack)
    }
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div role="alert">
          <Result
            status="warning"
            icon={<WarningOutlined aria-hidden="true" />}
            title="Trang này đang gặp sự cố hiển thị"
            subTitle="Bạn có thể tải lại trang hoặc quay về bảng điều khiển để tiếp tục."
            extra={
              <Flex justify="center" gap={12} wrap>
                <ActionButton
                  icon={<ReloadOutlined />}
                  label="Tải lại trang"
                  variant="primary"
                  size="middle"
                  onClick={() => window.location.reload()}
                />
                <ActionButton
                  icon={<HomeOutlined />}
                  label="Về bảng điều khiển"
                  size="middle"
                  onClick={this.props.onDashboard}
                />
              </Flex>
            }
          />
        </div>
      )
    }
    return this.props.children
  }
}

export function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  const location = useLocation()
  const navigate = useNavigate()

  // Reset the failed subtree when navigating, including between room IDs.
  return (
    <PageErrorBoundary key={location.key} onDashboard={() => navigate('/dashboard')}>
      {children}
    </PageErrorBoundary>
  )
}
