import { CloudOutlined, FireOutlined } from '@ant-design/icons'
import { Flex, Tag, Typography } from 'antd'
import type { Tier, Tray } from '../../../types/room.types'
import { TrayStatusTag } from './TrayStatusTag'

interface RackViewProps {
  tiers: Tier[]
  selectedTrayId: string | null
  onSelectTray: (tray: Tray) => void
}

export function RackView({ tiers, selectedTrayId, onSelectTray }: RackViewProps) {
  const orderedTiers = [...tiers].sort((left, right) => right.tierId - left.tierId)

  return (
    <div className="rack-shell" aria-label="Kệ nấm gồm bốn tầng">
      {orderedTiers.map((tier) => (
        <section
          key={tier.tierId}
          className="rack-tier"
          aria-labelledby={`tier-${tier.tierId}-title`}
        >
          <Flex className="rack-tier-header" align="center" justify="space-between" gap={12} wrap>
            <Typography.Title
              id={`tier-${tier.tierId}-title`}
              level={5}
              style={{ margin: 0 }}
            >
              {tier.name}
            </Typography.Title>

            <Flex gap={8} wrap>
              <Tag icon={<FireOutlined />} color="volcano">
                {tier.telemetry.temperature.toFixed(1)}°C
              </Tag>
              <Tag icon={<CloudOutlined />} color="cyan">
                {tier.telemetry.humidity}%RH
              </Tag>
              <Tag color="default" aria-label="CO2 sensor chưa được IoT BE expose">
                CO₂ — ppm
              </Tag>
            </Flex>
          </Flex>

          <div className="rack-tray-grid">
            {tier.trays.map((tray) => (
              <button
                key={tray.id}
                type="button"
                className={`rack-tray rack-tray--${tray.status}`}
                data-selected={selectedTrayId === tray.id}
                onClick={() => onSelectTray(tray)}
                aria-label={`Mở chi tiết ${tray.code}`}
              >
                <Flex align="center" justify="space-between" gap={8} wrap>
                  <span className="rack-tray-code">{tray.code}</span>
                  <TrayStatusTag status={tray.status} />
                </Flex>
                <span className="rack-tray-meta">
                  {tray.rental
                    ? `${tray.batchId ?? 'Mẻ đang chạy'} · ${tray.rental.tenantName} · ${tray.rental.mushroomType}`
                    : tray.customerId
                      ? `Khách: ${tray.customerId}`
                    : tray.batchId
                      ? `Mẻ: ${tray.batchId}`
                      : 'Sẵn sàng tiếp nhận'}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
