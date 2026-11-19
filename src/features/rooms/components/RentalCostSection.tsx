import { Typography } from 'antd'
import type { TrayRental } from '../../../types/room.types'
import { formatVnd } from '../utils/tray-rental.utils'

interface RentalCostSectionProps {
  rental: TrayRental
}

export function RentalCostSection({
  rental,
}: RentalCostSectionProps) {
  return (
    <section
      className="tray-detail-section rental-cost-section"
      aria-labelledby="rental-cost-heading"
    >
      <div className="tray-section-heading">

        <div>
          <Typography.Title id="rental-cost-heading" level={4}>
            Giá gói thuê
          </Typography.Title>
          <Typography.Text type="secondary">
            Giá gói thuê đã đăng ký
          </Typography.Text>
        </div>
      </div>

      <dl className="rental-cost-breakdown">
        <div>
          <dt>Giá thuê gói ban đầu</dt>
          <dd>{formatVnd(rental.basePrice)}</dd>
        </div>

      </dl>
    </section>
  )
}
