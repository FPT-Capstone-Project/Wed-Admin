import { App as AntdApp, ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { mcmsTheme } from './app/theme/theme'
import { QueryProvider } from './app/providers/QueryProvider'
import './App.css'
import './styles/design-system.css'

function App() {
  return (
    <ConfigProvider locale={viVN} theme={mcmsTheme}>
      <AntdApp>
        <QueryProvider>
          <RouterProvider router={router} />
        </QueryProvider>
      </AntdApp>
    </ConfigProvider>
  )
}

export default App