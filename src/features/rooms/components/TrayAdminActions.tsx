import '../rooms-industrial.css'
import { ActionButton } from '../../../shared/ui'
import {
  CheckCircleOutlined,
  DeleteOutlined,
  FileDoneOutlined,
  ScissorOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Alert, Typography } from 'antd'
import type { HarvestStatus } from '../../../types/room.types'
import { OVERDUE_HARVEST_GUIDANCE } from '../utils/tray-rental.utils'

interface TrayAdminActionsProps {
  status: HarvestStatus
  overdueDays: number
  onEarlyHarvest: () => void
  onOnTimeHarvest: () => void
  onForceCancel: () => void
  onLateHarvest: () => void
  onDestroyOverdue: () => void
}

export function TrayAdminActions({
  status,
  overdueDays,
  onEarlyHarvest,
  onOnTimeHarvest,
  onForceCancel,
  onLateHarvest,
  onDestroyOverdue,
}: TrayAdminActionsProps) {
  const isOverdue = status === 'OVERDUE'
  const isAutoHarvested = status === 'AUTO_HARVESTED'

  return (
    <section
      className="tray-detail-section tray-admin-section"
      aria-labelledby="tray-admin-actions-heading"
    >
      <div className="tray-section-heading">

        <div>
          <Typography.Title id="tray-admin-actions-heading" level={4}>
            Thao tác quản trị viên
          </Typography.Title>
          <Typography.Text type="secondary">
            Kết thúc mẻ và giải phóng khay theo quy định
          </Typography.Text>
        </div>
      </div>

      {isOverdue ? (
        <>
          <Alert
            type="error"
            showIcon
            title={`Mẻ đã quá hạn ${overdueDays} ngày`}
            description={OVERDUE_HARVEST_GUIDANCE}
            className="tray-admin-alert"
          />
          <div className="tray-admin-actions tray-admin-actions--crisis">
            <ActionButton variant="primary" size="middle" className="tray-action-button"
icon={<FileDoneOutlined />}
onClick={onLateHarvest} label="Thu hoạch theo quy định" />
            <ActionButton variant="dangerText" size="middle" className="tray-action-button"
icon={<DeleteOutlined />}
onClick={onDestroyOverdue} label="Cưỡng chế hủy & Tiêu hủy nấm" />
          </div>
        </>
      ) : isAutoHarvested ? (
        <>
          <div className="tray-action-note tray-action-note--success">
            <CheckCircleOutlined aria-hidden="true" />
            Nấm đã được thu hộ và lưu kho. Hoàn tất hóa đơn để bàn giao và giải
            phóng khay.
          </div>
          <div className="tray-admin-actions tray-admin-actions--single">
            <ActionButton variant="primary" size="middle" className="tray-action-button"
icon={<FileDoneOutlined />}
onClick={onOnTimeHarvest} label="Xuất hóa đơn & Giải phóng khay" />
          </div>
        </>
      ) : (
        <div className="tray-admin-actions tray-admin-actions--standard">
          <ActionButton variant="text" size="middle" className="tray-action-button"
icon={<ScissorOutlined />}
onClick={onEarlyHarvest} label="Thu hoạch sớm (Yêu cầu của khách)" />
          <ActionButton variant="primary" size="middle" className="tray-action-button"
icon={<FileDoneOutlined />}
onClick={onOnTimeHarvest} label="Thu hoạch đúng hạn & Xuất hóa đơn" />
          <ActionButton variant="dangerText" size="middle" className="tray-action-button"
icon={<WarningOutlined />}
onClick={onForceCancel} label="Cưỡng chế hủy mẻ" />
        </div>
      )}
    </section>
  )
}
