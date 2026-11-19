import {
CalendarOutlined,
ClockCircleOutlined,
PhoneOutlined,
ShopOutlined,
WarningOutlined
} from '@ant-design/icons'
import { Progress,Tag,Typography } from 'antd'
import type { ReactNode } from 'react'
import { MUSHROOM_GROWTH_PHASE_DICTIONARY } from '../../../shared/i18n/status/session'
import type { TrayRental } from '../../../types/room.types'
import { formatSessionProgress } from '../../sessions/utils/session-progress.utils'
import { resolveSessionPhase } from '../../sessions/utils/session-state.utils'
import type { RentalLifecycleMetrics } from '../utils/tray-rental.utils'
import { formatRentalDate,OVERDUE_HARVEST_GUIDANCE,rentalDayLabel } from '../utils/tray-rental.utils'

interface RentalLifecycleSectionProps {
  batchId: string | null
  rental: TrayRental
  lifecycle: RentalLifecycleMetrics
  growthStage?: string | null
  growthProgress?: number | null
  sessionStatus?: string
  harvestReady?: boolean
  hideHeading?: boolean
}

interface LifecycleStatusPresentation {
  className: string
  color: string
  icon: ReactNode
  label: string
  supportingText: string
}

function getStatusPresentation(
  lifecycle: RentalLifecycleMetrics,
): LifecycleStatusPresentation {
  const dayProgress = `Ngày ${Math.min(
    lifecycle.growthDay,
    lifecycle.expectedHarvestDay,
  )}/${lifecycle.expectedHarvestDay}`

  switch (lifecycle.effectiveHarvestStatus) {
    case 'READY_TO_HARVEST':
      return {
        className: 'ready',
        color: 'orange',
        icon: <CalendarOutlined />,
        label: 'Đến độ thu hoạch (Chờ xác nhận)',
        supportingText: 'Mẻ nấm đang ở thời điểm thu hoạch tối ưu.',
      }
    case 'OVERDUE':
      return {
        className: 'overdue',
        color: 'error',
        icon: <WarningOutlined />,
        label: `Quá hạn ${lifecycle.overdueDays} ngày`,
        supportingText:
          OVERDUE_HARVEST_GUIDANCE,
      }
    case 'AUTO_HARVESTED':
      return {
        className: 'harvested',
        color: 'success',
        icon: <ShopOutlined />,
        label: 'Đã thu hộ & lưu kho',
        supportingText: 'Nông trại đã thu hoạch hộ và chuyển sang khâu đóng gói.',
      }
    case 'GROWING':
    default:
      if (lifecycle.daysRemainingToHarvest <= 2) {
        return {
          className: 'contact',
          color: 'gold',
          icon: <PhoneOutlined />,
          label: `Sắp đến ngày thu hoạch (${dayProgress})`,
          supportingText: 'Cần liên hệ khách để chốt phương thức giao nấm.',
        }
      }

      return {
        className: 'growing',
        color: 'green',
        icon: <ClockCircleOutlined />,
        label: 'Đang chăm sóc bình thường',
        supportingText: `${dayProgress} · Còn ${lifecycle.daysRemainingToHarvest} ngày đến thời điểm thu hoạch.`,
      }
  }
}

export function RentalLifecycleSection({
  batchId,
  rental,
  lifecycle,
  growthStage,
  growthProgress,
  sessionStatus,
  harvestReady = false,
  hideHeading = false,
}: RentalLifecycleSectionProps) {
  const status = getStatusPresentation(lifecycle)
  const phase = resolveSessionPhase(growthStage, sessionStatus, harvestReady)
  const label = phase ? MUSHROOM_GROWTH_PHASE_DICTIONARY[phase].label : 'Chưa cập nhật'
  const percent = growthProgress ?? null
  const contactText = (value: string | null | undefined) => {
    const text = value?.trim()
    return text && text !== '—' && text !== '-' ? text : null
  }
  const phone = contactText(rental.tenantPhone)
  const address = contactText(rental.tenantAddress)
  const variety = contactText(rental.mushroomVariety)

  return (
    <section
      className={`tray-detail-section lifecycle-section lifecycle-section--${status.className}`}
      aria-labelledby={hideHeading ? undefined : 'rental-lifecycle-heading'}
    >
      {!hideHeading && <div className="tray-section-heading">

        <div>
          <Typography.Title id="rental-lifecycle-heading" level={4}>
            Thông tin mẻ & khách hàng
          </Typography.Title>
          <Typography.Text type="secondary">
            Chu kỳ mẻ trồng {batchId ?? 'chưa định danh'}
          </Typography.Text>
        </div>
      </div>}

      <div className="lifecycle-status-banner" role="status" aria-atomic="true">
        <Tag color={status.color} icon={status.icon}>
          {status.label}
        </Tag>
        <span>{status.supportingText}</span>
      </div>

      <div className="tenant-detail-block">

        <div className="tenant-detail-copy">
          <span className="tray-detail-label">Khách thuê</span>
          <strong>{rental.tenantName}</strong>
          {phone && <span className="tenant-contact-line">{phone}</span>}
          {address && <span className="tenant-contact-line">{address}</span>}
          {!phone && !address && <Typography.Text type="secondary">Chưa cập nhật thông tin liên hệ</Typography.Text>}
        </div>
      </div>

      <div className="lifecycle-progress-block">
        <div className="lifecycle-progress-copy">
          <span>Giai đoạn sinh trưởng từ Farm OP</span>
          <strong>{label}{percent != null ? ` · ${formatSessionProgress(percent)}` : ''}</strong>
        </div>
        <Progress percent={percent ?? 0} showInfo={false} aria-label={`${label}: ${formatSessionProgress(percent)}`} />
      </div>

      <dl className="rental-detail-grid">
        <div>
          <dt>Loại nấm trồng</dt>
          <dd>
            <strong>{rental.mushroomType}</strong>
            {variety && <span>{variety}</span>}
          </dd>
        </div>
        <div>
          <dt>Thời gian thuê</dt>
          <dd>
            <strong>
              {lifecycle.packageDurationDays} ngày (
              {formatRentalDate(rental.startDate)} -{' '}
              {formatRentalDate(rental.packageEndDate)})
            </strong>
            <span>
              {rentalDayLabel(lifecycle)}
              {rental.packageName && rental.packageName !== '—'
                ? ` · Gói: ${rental.packageName}`
                : ''}
            </span>
          </dd>
        </div>
        <div>
          <dt>Dự kiến thu hoạch</dt>
          <dd>
            <strong>{formatRentalDate(rental.expectedHarvestDate)}</strong>
            <span>
              {lifecycle.isHarvestReady
                ? 'Đã đến thời điểm thu hoạch'
                : `Còn ${lifecycle.daysRemainingToHarvest} ngày`}
            </span>
          </dd>
        </div>
      </dl>
    </section>
  )
}
