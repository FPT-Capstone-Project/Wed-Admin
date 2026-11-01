import '../../../styles/media-industrial.css'
import {
  ExperimentOutlined,
  FieldTimeOutlined,
  FlagOutlined,
  RiseOutlined,
} from '@ant-design/icons'
import { Steps } from 'antd'
import type {
  CultivationBatch,
  GrowthStage,
  SnapshotStage,
} from '../../../types/cultivation.types'

interface GrowthStageTimelineProps {
  batch: CultivationBatch
}

interface StageItem {
  key: SnapshotStage
  growthStage: GrowthStage
  title: string
  description: string
  icon: React.ReactNode
}

const STAGE_ITEMS: StageItem[] = [
  {
    key: 'INCUBATION',
    growthStage: 'INCUBATION',
    title: 'Ủ tơ / Nuôi sợi',
    description: 'Tối, ẩm cao',
    icon: <ExperimentOutlined />,
  },
  {
    key: 'PINNING',
    growthStage: 'PINNING',
    title: 'Kích nụ / Ra ghim',
    description: 'Tăng sáng',
    icon: <FieldTimeOutlined />,
  },
  {
    key: 'FRUITING',
    growthStage: 'FRUITING',
    title: 'Phát triển thể quả',
    description: 'Ẩm ổn định',
    icon: <RiseOutlined />,
  },
  {
    key: 'HARVEST_READY',
    growthStage: 'READY_TO_HARVEST',
    title: 'Sẵn sàng thu hoạch',
    description: 'Đạt chuẩn',
    icon: <FlagOutlined />,
  },
]

function getStageIndex(stage: GrowthStage) {
  if (stage === 'HARVESTED') {
    return STAGE_ITEMS.length
  }

  return Math.max(
    0,
    STAGE_ITEMS.findIndex((item) => item.growthStage === stage),
  )
}

export function GrowthStageTimeline({ batch }: GrowthStageTimelineProps) {
  const currentIndex = getStageIndex(batch.currentStage)

  return (
    <div
      className="growth-stage-timeline"
      aria-label="Tiến độ giai đoạn sinh trưởng"
    >
      <Steps
        size="small"
        current={Math.min(currentIndex, STAGE_ITEMS.length - 1)}
        responsive
        items={STAGE_ITEMS.map((item) => ({
          title: item.title,
          description: item.description,
          icon: item.icon,
        }))}
      />
    </div>
  )
}
