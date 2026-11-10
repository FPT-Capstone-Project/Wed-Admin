import { Flex, Image, Tooltip, Typography } from 'antd'
import { useMemo } from 'react'
import { MetadataBadge, StatusBadge } from '../../../shared/ui'
import { tokens } from '../../../app/theme/tokens'
import type { DailyInspection } from '../types/session-inspection.types'

const DATE_FMT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function fmtDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return DATE_FMT.format(date)
}

/** Nhãn giai đoạn sinh trưởng (BE dùng 4 giá trị — xem `admin-session.types.ts`). */
const GROWTH_STAGE_LABELS: Record<string, string> = {
  FRUITING_INITIATION: 'Khởi tạo ra nụ',
  PINNING: 'Đang ra nụ (pinning)',
  YOUNG_FRUITING: 'Nấm non',
  MATURATION: 'Chín kho',
}

/** Nhãn tình trạng khay / nấm — BE trả string tự do ⇒ map an toàn. */
function pickConditionLabel(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const known: Record<string, string> = {
    GOOD: 'Tốt',
    NORMAL: 'Bình thường',
    OK: 'Bình thường',
    FAIR: 'Khá',
    POOR: 'Kém',
    BAD: 'Xấu',
    MOLDY: 'Mốc',
    CONTAMINATED: 'Nhiễm khuẩn',
  }
  return known[trimmed.toUpperCase()] ?? trimmed
}

interface DailyInspectionCardProps {
  inspection: DailyInspection
}

/**
 * Thẻ hiển thị 1 lần kiểm tra khay — **read-only**.
 *
 * ⚠ Giai đoạn 2 của vòng đời (trồng trên khay). Giai đoạn 1 (ủ phôi) dùng
 *   `features/farm/components/SpawnInspectionList.tsx`.
 */
export function DailyInspectionCard({ inspection }: DailyInspectionCardProps) {
  const stageLabel = inspection.growth_stage
    ? (GROWTH_STAGE_LABELS[inspection.growth_stage.toUpperCase()] ??
      inspection.growth_stage)
    : null

  const trayCondition = pickConditionLabel(inspection.tray_condition)
  const mushroomCondition = pickConditionLabel(inspection.mushroom_condition)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        borderRadius: tokens.radius.xl,
        border: '1px solid var(--mcms-border-soft)',
        background: 'var(--mcms-surface)',
      }}
    >
      <Flex justify="space-between" align="center" gap={8} wrap>
        <Flex align="center" gap={8} wrap>
          <Typography.Text strong style={{ fontSize: 13 }}>
            Kiểm tra {fmtDate(inspection.inspection_date)}
          </Typography.Text>
          {stageLabel && (
            <StatusBadge tone="ok" label={stageLabel} />
          )}
        </Flex>
        {inspection.growth_progress != null && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Tiến độ: {inspection.growth_progress}%
          </Typography.Text>
        )}
      </Flex>

      <Flex gap={6} wrap>
        {inspection.tray_code && (
          <MetadataBadge label={`Khay ${inspection.tray_code}`} />
        )}
        {trayCondition && (
          <MetadataBadge label={`Tình trạng khay: ${trayCondition}`} />
        )}
        {mushroomCondition && (
          <MetadataBadge label={`Tình trạng nấm: ${mushroomCondition}`} />
        )}
      </Flex>

      {inspection.notes && (
        <Typography.Text style={{ fontSize: 12 }}>{inspection.notes}</Typography.Text>
      )}

      {inspection.inspected_by_name && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Người kiểm tra: {inspection.inspected_by_name}
        </Typography.Text>
      )}

      {inspection.images.length > 0 && (
        <Flex gap={8} wrap>
          {inspection.images.map((image, index) => {
            const url = image.image_url
            if (!url) return null
            const alt = image.caption ?? `Ảnh kiểm tra khay #${index + 1}`
            return (
              <Tooltip key={image.image_id ?? url} title={alt}>
                <Image
                  src={url}
                  alt={alt}
                  width={72}
                  height={72}
                  style={{ objectFit: 'cover', borderRadius: 8 }}
                />
              </Tooltip>
            )
          })}
        </Flex>
      )}
    </div>
  )
}

interface DailyInspectionListProps {
  inspections: readonly DailyInspection[]
  emptyDescription?: string
  /** Chỉ hiện mã khay khi danh sách gộp nhiều khay (màn Phiên). */
  showTrayLabel?: boolean
}

/** Danh sách lần kiểm tra khay — read-only, không có nút thao tác. */
export function DailyInspectionList({
  inspections,
  emptyDescription = 'Chưa có lần kiểm tra khay nào được ghi nhận.',
  showTrayLabel = false,
}: DailyInspectionListProps) {
  /**
   * Gom theo khay khi hiển thị màn Phiên (nhiều khay trong 1 phiên).
   *
   * ⚠ Dùng `useMemo` vì danh sách dài ⇒ tránh render lại o(n) mỗi lần.
   */
  const grouped = useMemo(() => {
    if (!showTrayLabel) return null
    const map = new Map<string, DailyInspection[]>()
    for (const inspection of inspections) {
      const key = inspection.tray_code ?? inspection.tray_name ?? '—'
      const bucket = map.get(key)
      if (bucket) bucket.push(inspection)
      else map.set(key, [inspection])
    }
    return [...map.entries()]
  }, [inspections, showTrayLabel])

  if (inspections.length === 0) {
    return (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {emptyDescription}
      </Typography.Text>
    )
  }

  if (!grouped) {
    return (
      <Flex vertical gap={10}>
        {inspections.map((inspection) => (
          <DailyInspectionCard
            key={inspection.inspection_id}
            inspection={inspection}
          />
        ))}
      </Flex>
    )
  }

  return (
    <Flex vertical gap={16}>
      {grouped.map(([trayLabel, items]) => (
        <Flex key={trayLabel} vertical gap={10}>
          <Typography.Text strong style={{ fontSize: 12 }}>
            Khay {trayLabel}
          </Typography.Text>
          {items.map((inspection) => (
            <DailyInspectionCard
              key={inspection.inspection_id}
              inspection={inspection}
            />
          ))}
        </Flex>
      ))}
    </Flex>
  )
}
