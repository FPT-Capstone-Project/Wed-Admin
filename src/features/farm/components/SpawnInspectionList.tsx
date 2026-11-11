import { Flex, Image, Tooltip, Typography } from 'antd'
import type { ReactNode } from 'react'
import { MetadataBadge, StatusBadge } from '../../../shared/ui'
import type { SpawnInspection } from '../types/farm.types'
import { SPAWN_CONDITION_DICTIONARY } from '../../../shared/i18n/status/session'
import { presentStatus } from '../../../shared/i18n/status/registry'

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

interface SpawnInspectionCardProps {
  inspection: SpawnInspection
}

/**
 * Thẻ hiển thị 1 lần kiểm tra phôi — **read-only**.
 *
 * Hiển thị: tổng số đơn vị đã kiểm tra, phân bổ bình thường / cảnh báo /
 * bất thường, tình trạng, số phôi thay thế, ghi chú, mốc kiểm tra tiếp theo
 * và các ảnh Cloudinary kèm theo.
 */
export function SpawnInspectionCard({ inspection }: SpawnInspectionCardProps) {
  // ⚠ `presentStatus` ⇒ không bao giờ lộ enum lạ của BE.
  const conditionConfig = inspection.condition
    ? presentStatus(SPAWN_CONDITION_DICTIONARY, inspection.condition)
    : null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        borderRadius: 12,
        border: '1px solid var(--mcms-border-soft)',
        background: 'var(--mcms-surface)',
      }}
    >
      <Flex justify="space-between" align="center" gap={8} wrap>
        <Flex align="center" gap={8} wrap>
          <Typography.Text strong style={{ fontSize: 13 }}>
            Kiểm tra {fmtDate(inspection.checked_at ?? inspection.created_at)}
          </Typography.Text>
          {conditionConfig && (
            <StatusBadge {...conditionConfig} />
          )}
        </Flex>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Đã kiểm tra {inspection.total_checked ?? 0} đơn vị
        </Typography.Text>
      </Flex>

      <Flex gap={6} wrap>
        <MetadataBadge label={`Bình thường: ${inspection.normal_quantity ?? 0}`} />
        <MetadataBadge label={`Cảnh báo: ${inspection.warning_quantity ?? 0}`} />
        <MetadataBadge label={`Bất thường: ${inspection.abnormal_quantity ?? 0}`} />
        {(inspection.replacement_quantity ?? 0) > 0 && (
          <MetadataBadge label={`Thay thế: ${inspection.replacement_quantity}`} />
        )}
      </Flex>

      {inspection.notes && (
        <Typography.Text style={{ fontSize: 12 }}>{inspection.notes}</Typography.Text>
      )}

      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Kiểm tra tiếp theo: {fmtDate(inspection.next_check_at)}
      </Typography.Text>

      {inspection.images && inspection.images.length > 0 && (
        <Flex gap={8} wrap>
          {inspection.images.map((image, index) => {
            const url = image.secure_url ?? image.url
            if (!url) return null
            const alt = image.caption ?? `Ảnh kiểm tra phôi #${index + 1}`
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

interface SpawnInspectionListProps {
  inspections: SpawnInspection[]
  emptyDescription?: ReactNode
}

/** Danh sách lần kiểm tra phôi — read-only, không có nút thao tác. */
export function SpawnInspectionList({
  inspections,
  emptyDescription = 'Chưa có lần kiểm tra phôi nào được ghi nhận.',
}: SpawnInspectionListProps) {
  if (inspections.length === 0) {
    return (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {emptyDescription}
      </Typography.Text>
    )
  }

  return (
    <Flex vertical gap={10}>
      {inspections.map((inspection) => (
        <SpawnInspectionCard
          key={inspection.inspection_id}
          inspection={inspection}
        />
      ))}
    </Flex>
  )
}
