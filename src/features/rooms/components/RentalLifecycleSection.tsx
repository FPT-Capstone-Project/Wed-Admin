import {
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  ShopOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Tag, Typography } from 'antd'
import type { ReactNode } from 'react'
import type { TrayRental } from '../../../types/room.types'
import type { RentalLifecycleMetrics } from '../utils/tray-rental.utils'
import { formatRentalDate } from '../utils/tray-rental.utils'

interface RentalLifecycleSectionProps {
  batchId: string | null
  rental: TrayRental
  lifecycle: RentalLifecycleMetrics
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
          'Gói thuê đã hết hạn, phí chăm sóc bổ sung đang được tính.',
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
}: RentalLifecycleSectionProps) {
  const status = getStatusPresentation(lifecycle)

  return (
    <section
      className={`tray-detail-section lifecycle-section lifecycle-section--${status.className}`}
      aria-labelledby="rental-lifecycle-heading"
    >
      <div className="tray-section-heading">
        <span className="tray-section-icon" aria-hidden="true">
          <ClockCircleOutlined />
        </span>
        <div>
          <Typography.Title id="rental-lifecycle-heading" level={4}>
            Thông tin mẻ & khách hàng
          </Typography.Title>
          <Typography.Text type="secondary">
            Chu kỳ mẻ trồng {batchId ?? 'chưa định danh'}
          </Typography.Text>
        </div>
      </div>

      <div className="lifecycle-status-banner" role="status" aria-atomic="true">
        <Tag color={status.color} icon={status.icon}>
          {status.label}
        </Tag>
        <span>{status.supportingText}</span>
      </div>

      <div className="tenant-detail-block">
        <span className="tenant-avatar" aria-hidden="true">
          <UserOutlined />
        </span>
        <div className="tenant-detail-copy">
          <span className="tray-detail-label">Khách thuê</span>
          <strong>{rental.tenantName}</strong>
          <span className="tenant-contact-line">
            <PhoneOutlined aria-hidden="true" />
            {rental.tenantPhone}
          </span>
          <span className="tenant-contact-line">
            <EnvironmentOutlined aria-hidden="true" />
            {rental.tenantAddress}
          </span>
        </div>
      </div>

      <div className="lifecycle-progress-block">
        <div className="lifecycle-progress-copy">
          <span>Tiến độ chu kỳ</span>
          <strong>
            Ngày {lifecycle.growthDay}/{lifecycle.expectedHarvestDay}
          </strong>
        </div>
        <div
          className="lifecycle-track"
          role="progressbar"
          aria-label="Tiến độ chu kỳ thuê"
          aria-valuemin={1}
          aria-valuemax={lifecycle.expectedHarvestDay}
          aria-valuenow={Math.min(
            lifecycle.growthDay,
            lifecycle.expectedHarvestDay,
          )}
        >
          <span
            className="lifecycle-track-fill"
            style={{ width: `${lifecycle.progressPercent}%` }}
          />
          <span
            className="lifecycle-harvest-marker"
            style={{ left: `${lifecycle.harvestMarkerPercent}%` }}
            aria-hidden="true"
          />
        </div>
        <div className="lifecycle-track-labels" aria-hidden="true">
          <span>
            <small>Bắt đầu</small>
            {formatRentalDate(rental.startDate)}
          </span>
          <span>
            <small>Chín tiêu chuẩn</small>
            {formatRentalDate(rental.expectedHarvestDate)}
          </span>
        </div>
      </div>

      <dl className="rental-detail-grid">
        <div>
          <dt>Loại nấm trồng</dt>
          <dd>
            <strong>{rental.mushroomType}</strong>
            <span>{rental.mushroomVariety}</span>
          </dd>
        </div>
        <div>
          <dt>Thời gian thuê</dt>
          <dd>
            <strong>
              {lifecycle.packageDurationDays} ngày (
              {formatRentalDate(rental.startDate)} -{' '}
              {formatRentalDate(rental.expectedHarvestDate)})
            </strong>
            <span>
              {rental.packageName && rental.packageName !== '—'
                ? `Gói: ${rental.packageName}`
                : '—'}
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
