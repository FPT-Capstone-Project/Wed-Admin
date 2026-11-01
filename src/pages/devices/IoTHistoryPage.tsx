import './device-industrial.css'
import { MetadataBadge } from '../../shared/ui'
import { ArrowLeftOutlined, DatabaseOutlined } from '@ant-design/icons'
import { Button, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { TrayIoTHistoryView } from './components/TrayIoTHistoryView'

export function IoTHistoryPage() {
  const navigate = useNavigate()

  return (
    <div className="iot-history-page mcms-iot-view">
      <header className="iot-history-page-header">
        <div>
          <Button
            type="text"
            className="iot-history-back-button"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/devices')}
          >
            Thiết bị thời gian thực
          </Button>
          <Typography.Title level={1} style={{ fontSize: 18 }}>
            Lịch sử Telemetry theo Khay
          </Typography.Title>
          <Typography.Paragraph>
            Phân tích dữ liệu cảm biến theo từng khách thuê, mẻ trồng và xu hướng
            vi khí hậu dài hạn.
          </Typography.Paragraph>
        </div>
        <MetadataBadge icon={<DatabaseOutlined />} label={<>
          Dữ liệu 2025 – 2026
        </>} />
      </header>

      <TrayIoTHistoryView />
    </div>
  )
}
