import dayjs from 'dayjs'
import { useState } from 'react'
import {
  CalendarOutlined,
  ExperimentOutlined,
  PictureOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Badge,
  Card,
  Flex,
  Progress,
  Tooltip,
  Typography,
} from 'antd'
import type { CultivationBatch } from '../../../types/cultivation.types'
import type { GallerySnapshot } from '../../../types/cultivation.types'
import { StatusBadge } from '../../../shared/ui'
import { GrowthSnapshotThumbnail } from './GrowthSnapshotThumbnail'

interface CultivationBatchCardProps {
  batch: CultivationBatch
  onDailyPhotos: (batch: CultivationBatch) => void
}

interface DayCell {
  dayIndex: number
  date: dayjs.Dayjs
  snapshot: GallerySnapshot | null
  stageLabel: string
}

const STAGE_BY_DAY: Array<{ maxDay: number; label: string }> = [
  { maxDay: 2, label: 'Ủ tơ / Nuôi sợi' },
  { maxDay: 4, label: 'Kích nụ / Ra ghim' },
  { maxDay: 6, label: 'Phát triển thể quả' },
  { maxDay: 7, label: 'Sẵn sàng thu hoạch' },
]

const TOTAL_DAYS = 7

function stageLabelForDay(dayIndex: number) {
  return (
    STAGE_BY_DAY.find((s) => dayIndex <= s.maxDay) ?? STAGE_BY_DAY.at(-1)!
  ).label
}

function buildDayCells(batch: CultivationBatch): DayCell[] {
  const start = dayjs(batch.startDate).startOf('day')
  const now = dayjs()

  // Lấy snapshot trong ngày (08:00 ± vài giờ)
  const snapshotByDay = new Map<number, GallerySnapshot>()
  for (const snap of batch.gallerySnapshots) {
    const snapDay = dayjs(snap.timestamp)
    if (!snapDay.isAfter(now)) {
      const idx = snapDay.diff(start, 'day') + 1
      if (idx >= 1 && idx <= TOTAL_DAYS && !snapshotByDay.has(idx)) {
        snapshotByDay.set(idx, snap)
      }
    }
  }

  return Array.from({ length: TOTAL_DAYS }, (_, i) => {
    const dayIndex = i + 1
    const date = start.add(dayIndex - 1, 'day')
    const snapshot = snapshotByDay.get(dayIndex) ?? null
    return {
      dayIndex,
      date,
      snapshot,
      stageLabel: stageLabelForDay(dayIndex),
    }
  })
}

export function CultivationBatchCard({
  batch,
  onDailyPhotos,
}: CultivationBatchCardProps) {
  const days = buildDayCells(batch)
  // Mặc định chọn ngày gần nhất ĐÃ chụp
  const initialDay = [...days].reverse().find((d) => d.snapshot)?.dayIndex ?? 1
  const [activeDay, setActiveDay] = useState(initialDay)

  const activeCell = days.find((d) => d.dayIndex === activeDay) ?? days[0]
  const takenCount = days.filter((d) => d.snapshot).length

  // SSOT: cycleDay & progressPercent đều dẫn xuất từ batch.progressPercent
  // Công thức: progressPercent = round(currentDay/totalDays * 100), ngược lại cycleDay = round(progress * 7 / 100)
  const cycleDay = Math.min(
    TOTAL_DAYS,
    Math.max(1, Math.round((batch.progressPercent * TOTAL_DAYS) / 100)),
  )
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((cycleDay / TOTAL_DAYS) * 100)),
  )
  const cycleLabel = `Ngày ${cycleDay}/${TOTAL_DAYS}`

  const isContaminated = batch.healthStatus === 'WARNING_CONTAMINATED'

  return (
    <Badge.Ribbon
      text="Cảnh báo"
      color="#dc2626"
      style={{ display: isContaminated ? undefined : 'none' }}
    >
      <Card
        className="cultivation-batch-card"
        styles={{ body: { padding: 0 } }}
      >
        <Flex
          gap={0}
          wrap="wrap"
          align="stretch"
          className="cultivation-batch-card-layout"
        >
          {/* ── CỘT TRÁI: Ảnh mới nhất ───────────────────────── */}
          <div className="cultivation-batch-card-media">
            <GrowthSnapshotThumbnail
              src={activeCell.snapshot?.imageUrl ?? ''}
              alt={`Ảnh ngày ${activeCell.dayIndex} · ${activeCell.stageLabel}`}
              loading="eager"
              className="cultivation-batch-card-image"
            />

            <div className="cultivation-batch-card-media-tag">
              <StatusBadge
                tone="info"
                label={`Ảnh ngày ${activeCell.dayIndex} · 08:00`}
              />
            </div>

            <button
              type="button"
              className="cultivation-batch-card-media-overlay"
              onClick={() => onDailyPhotos(batch)}
              aria-label="Phóng to & Xem cả quá trình"
            >
              <SearchOutlined aria-hidden="true" />
              <span>Phóng to &amp; Xem cả quá trình</span>
            </button>
          </div>

          {/* ── CỘT PHẢI: Thông tin + 7-day strip ─────────────── */}
          <Flex
            vertical
            gap={14}
            className="cultivation-batch-card-info"
            justify="space-between"
          >
            {/* Header info */}
            <Flex vertical gap={6}>
              <Flex align="center" gap={8} wrap>
                <Typography.Title
                  level={4}
                  style={{ margin: 0, fontSize: 18 }}
                >
                  {batch.batchCode}
                </Typography.Title>
                <StatusBadge tone="neutral" label={batch.trayName} />
                {isContaminated && (
                  <StatusBadge
                    tone="danger"
                    label="Cần xử lý sâu bệnh/mốc"
                  />
                )}
              </Flex>

              <Typography.Text>
                <ExperimentOutlined aria-hidden="true" /> {batch.mushroomType}
              </Typography.Text>

              <Typography.Text type="secondary">
                Khách thuê: <strong>{batch.tenantName}</strong>
                {' · '}Phụ trách: <strong>{batch.operatorInCharge}</strong>
              </Typography.Text>

              <Typography.Text type="secondary">
                <CalendarOutlined aria-hidden="true" /> Dự kiến hái:{' '}
                <strong>
                  {dayjs(batch.estimatedHarvestDate).format('DD/MM/YYYY')}
                </strong>
                {' · '}
                Sản lượng:{' '}
                <strong>
                  {batch.actualYieldKg ?? batch.expectedYieldKg} kg
                </strong>
                {batch.actualYieldKg === null ? ' dự kiến' : ' thực thu'}
              </Typography.Text>
            </Flex>

            {/* Progress — tính % theo currentDay/totalDays (SSOT) */}
            <div>
              <Flex align="center" justify="space-between" style={{ marginBottom: 4 }}>
                <Typography.Text strong>{cycleLabel}</Typography.Text>
                <Typography.Text type="secondary">
                  {progressPercent}% hoàn thành
                </Typography.Text>
              </Flex>
              <Progress
                percent={progressPercent}
                showInfo={false}
                status={isContaminated ? 'exception' : 'active'}
                strokeColor={isContaminated ? undefined : '#16a34a'}
              />
            </div>

            {/* 7-Day Photo Strip */}
            <div>
              <Typography.Text
                type="secondary"
                style={{ fontSize: 12, textTransform: 'uppercase' }}
              >
                Dải 7 ngày chụp tự động
              </Typography.Text>
              <Flex gap={8} style={{ marginTop: 8 }}>
                {days.map((day) => {
                  const isActive = day.dayIndex === activeDay
                  const hasPhoto = Boolean(day.snapshot)
                  const tooltipTitle = hasPhoto
                    ? `Ngày ${day.dayIndex} · ${day.date.format('DD/MM')} · ${day.stageLabel}`
                    : `Ngày ${day.dayIndex} · ${day.date.format('DD/MM')} · Chưa chụp`

                  const cellClass = [
                    'day-strip-cell',
                    isActive ? 'is-active' : '',
                    hasPhoto ? 'is-taken' : 'is-pending',
                  ]
                    .filter(Boolean)
                    .join(' ')

                  return (
                      <Tooltip key={day.dayIndex} title={tooltipTitle}>
                        <button
                          type="button"
                          className={cellClass}
                          onClick={() => setActiveDay(day.dayIndex)}
                          aria-label={`Xem ảnh ngày ${day.dayIndex}`}
                          aria-pressed={isActive}
                        >
                          <GrowthSnapshotThumbnail
                            src={day.snapshot?.imageUrl ?? ''}
                            alt={`Ảnh ngày ${day.dayIndex}`}
                          />
                        </button>
                      </Tooltip>
                  )
                })}
              </Flex>
            </div>

            {/* Footer action */}
            <Flex align="center" justify="space-between" wrap="wrap" gap={8}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Đã chụp {takenCount}/{TOTAL_DAYS} ngày · Ảnh chụp tự động 08:00
                sáng mỗi ngày
              </Typography.Text>
              <button
                type="button"
                className="cultivation-batch-card-cta"
                onClick={() => onDailyPhotos(batch)}
              >
                <PictureOutlined aria-hidden="true" />
                <span>Mở thư viện 7 ảnh</span>
              </button>
            </Flex>
          </Flex>
        </Flex>
      </Card>
    </Badge.Ribbon>
  )
}
