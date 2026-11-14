import { resolveSessionPhase } from '../../sessions/utils/session-state.utils'
import dayjs from 'dayjs'
import {
  CalendarOutlined,
  ExperimentOutlined,
  PictureOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { Button, Card, Flex, Popover, Progress, Tooltip, Typography } from 'antd'
import { MetadataBadge, StatusBadge } from '../../../shared/ui'
import { TrayCodeText } from '../../../shared/ui/TrayCodeText'
import { formatSessionProgress, resolveSessionProgress } from '../../sessions/utils/session-progress.utils'
import {
  type CultivationBatch,
} from '../types/cultivation.types'
import {
  MUSHROOM_GROWTH_PHASE_DICTIONARY,
} from '../../../shared/i18n/status/session'
import { GrowthSnapshotThumbnail } from './GrowthSnapshotThumbnail'
import { tokens } from '../../../app/theme/tokens'

interface CultivationBatchCardProps {
  batch: CultivationBatch
  onOpenGallery: (batch: CultivationBatch) => void
}

/** Nhãn + màu cho kết luận sức khỏe phôi. */
const HEALTH_CONFIG: Record<
  CultivationBatch['healthStatus'],
  { label: string; tone: 'ok' | 'warning' | 'danger' | 'muted' }
> = {
  NORMAL: { label: 'Phôi bình thường', tone: 'ok' },
  WARNING: { label: 'Phôi cần theo dõi', tone: 'warning' },
  ABNORMAL: { label: 'Phôi bất thường', tone: 'danger' },
  UNKNOWN: { label: 'Chưa có kiểm tra phôi', tone: 'muted' },
}

/**
 * Thẻ mẻ nấm — **read-only**.
 *
 * ⚠ Không có nút chỉnh sửa / chuyển giai đoạn / ghi nhận kiểm tra.
 *   Mọi thao tác ghi do nhân viên (staff) thực hiện trên mobile app.
 */
export function CultivationBatchCard({
  batch,
  onOpenGallery,
}: CultivationBatchCardProps) {
  const healthConfig = HEALTH_CONFIG[batch.healthStatus]

  /**
   * ⚠ Giai đoạn hiển thị thuộc **1 trong 4 giai đoạn trồng nấm**
   *   ("Ủ tơ" → "Kéo tơ" → "Nấm đang phát triển" → "Sẵn sàng thu hoạch").
   *
   * ⚠ `batch.currentStage` là **trạng thái vòng đời phiên**; `batch.growthStage`
   *   là giai đoạn WF-03 do Farm OP ghi nhận (có thể `null`).
   *
   * ⚠ Phiên `CULTIVATING` mặc định là **"Kéo tơ"** — chỉ khi Farm OP ghi nhận
   *   giai đoạn ra quả mới hiển thị "Nấm đang phát triển".
   *
   * ⚠ Phiên đã `COMPLETED` ⇒ "Hoàn thành" (tiến độ 100 %), KHÔNG phải
   *   "Sẵn sàng thu hoạch" — `resolveGrowthPhase` đã map
   *   `COMPLETED` → `COMPLETED`.
   */
  const growthPhase = resolveSessionPhase(
    batch.growthStage,
    batch.currentStage,
  )
  const growthPhaseLabel = growthPhase
    ? MUSHROOM_GROWTH_PHASE_DICTIONARY[growthPhase].label
    : 'Chưa cập nhật'

  // Ảnh thực tế từ Cloudinary — lấy từ lần kiểm tra phôi gần nhất.
  const photos = batch.inspections
    .flatMap((inspection) => inspection.images ?? [])
    .map((image) => image.secure_url ?? image.url ?? '')
    .filter((url) => url.length > 0)

  const latestPhoto = photos[0] ?? ''

  const isAbnormal = batch.healthStatus === 'ABNORMAL'
  const isCompleted = batch.currentStage === 'COMPLETED'

  /**
   * ⚠ Tiến độ lấy **trực tiếp** từ Phiên canh tác (`progress_percent`) —
   *   giá trị do Farm OP cập nhật qua API của phiên.
   *
   *   KHÔNG tính nhẩm theo số ngày trôi qua (`startDate` /
   *   `estimatedHarvestDate`) ⇒ cùng 1 phiên luôn cho cùng 1 con số với
   *   trang "Phiên canh tác" & Drawer "Chi tiết phiên".
   */
  const progressPercent = resolveSessionProgress(
    batch.progressPercent,
    batch.currentStage === 'CANCELLED' ? 'CANCELLED' : batch.currentStage,
  )

  return (
    <Card
      className="cultivation-batch-card"
      title={
        <Typography.Text className="media-mono" strong>
          {batch.batchCode}
        </Typography.Text>
      }
      extra={
        <Flex gap={8} wrap>
          <StatusBadge
            tone={
              isAbnormal ? 'danger' : isCompleted ? 'success' : 'ok'
            }
            label={growthPhaseLabel}
          />
          <StatusBadge tone={healthConfig.tone} label={healthConfig.label} />
        </Flex>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Flex
        gap={0}
        wrap="wrap"
        align="stretch"
        className="cultivation-batch-card-layout"
      >
        {/* ── CỘT TRÁI: Ảnh thực tế từ Cloudinary ─────────────── */}
        <div className="cultivation-batch-card-media">
          <GrowthSnapshotThumbnail
            src={latestPhoto}
            alt={`Ảnh kiểm tra phôi — ${batch.batchCode}`}
            loading="eager"
            className="cultivation-batch-card-image"
          />

          <div className="cultivation-batch-card-media-tag">
            <MetadataBadge
              label={
                photos.length > 0
                  ? `${photos.length} ảnh kiểm tra phôi`
                  : 'Chưa có ảnh kiểm tra phôi'
              }
            />
          </div>

          {photos.length > 0 && (
            <button
              type="button"
              className="cultivation-batch-card-media-overlay"
              onClick={() => onOpenGallery(batch)}
              aria-label="Xem toàn bộ ảnh kiểm tra phôi"
            >
              <SearchOutlined aria-hidden="true" />
              <span>Xem toàn bộ ảnh</span>
            </button>
          )}
        </div>

        {/* ── CỘT PHẢI: Thông tin + tiến độ ──────────────────── */}
        <Flex
          vertical
          gap={14}
          className="cultivation-batch-card-info"
          justify="space-between"
        >
          <Flex vertical gap={6}>
            <Flex align="center" gap={8} wrap>
              {batch.trays.length > 0 ? (
                <Popover trigger={['click']} title="Danh sách khay" content={
                  <div style={{ maxWidth: '80vw', overflowWrap: 'anywhere' }}>
                    {batch.trays.map((tray, index) => <div key={tray.trayId ?? index}>{tray.code}{tray.name ? ` · ${tray.name}` : ''}</div>)}
                  </div>
                }>
                  <Button type="link" aria-label={`Xem danh sách ${batch.trays.length} khay`}>
                    {batch.trays.length > 1 ? `${batch.trays.length} khay` : <TrayCodeText code={batch.trays[0].code} focusable={false} />}
                  </Button>
                </Popover>
              ) : (
                <MetadataBadge label="Chưa gán khay" />
              )}
              {batch.packageName !== '—' && (
                <MetadataBadge label={`Gói: ${batch.packageName}`} />
              )}
            </Flex>

            <MetadataBadge
              icon={<ExperimentOutlined />}
              label={batch.mushroomType}
            />

            <Typography.Text type="secondary">
              Khách thuê: <strong>{batch.tenantName}</strong>
              {batch.orderId ? ` · Đơn #${batch.orderId}` : ''}
            </Typography.Text>

            <Typography.Text type="secondary">
              <CalendarOutlined aria-hidden="true" /> Bắt đầu:{' '}
              <strong>
                {batch.startDate
                  ? dayjs(batch.startDate).format('DD/MM/YYYY')
                  : '—'}
              </strong>
              {' · '}
              Dự kiến hái:{' '}
              <strong>
                {batch.estimatedHarvestDate
                  ? dayjs(batch.estimatedHarvestDate).format('DD/MM/YYYY')
                  : '—'}
              </strong>
            </Typography.Text>

            <Flex gap={8} wrap style={{ fontSize: 12 }}>
              <Typography.Text type="secondary">
                Số khay: <strong>{batch.trayCount ?? batch.trays.length}</strong>
              </Typography.Text>
              {batch.spawnIssued != null && (
                <Typography.Text type="secondary">
                  · Phôi đã cấp: <strong>{batch.spawnIssued}</strong>
                  {batch.spawnRemaining != null &&
                    ` (còn ${batch.spawnRemaining} trong kho)`}
                </Typography.Text>
              )}
              <Typography.Text type="secondary">
                · Lần kiểm tra: <strong>{batch.inspectionCount}</strong>
              </Typography.Text>
            </Flex>
          </Flex>

          {/* Tiến độ */}
          <div>
            <Flex
              align="center"
              justify="space-between"
              style={{ marginBottom: 4 }}
            >
              <MetadataBadge label={growthPhaseLabel} />
              <Typography.Text type="secondary">
                {formatSessionProgress(progressPercent)} hoàn thành
              </Typography.Text>
            </Flex>
            <Progress
              percent={progressPercent ?? 0}
              showInfo={false}
              status={isAbnormal ? 'exception' : isCompleted ? 'normal' : 'active'}
              strokeColor={isAbnormal ? tokens.tone.danger.solid : tokens.tone.info.solid}
            />
          </div>

          {/* Dải ảnh kiểm tra phôi (thực tế từ Cloudinary) */}
          {photos.length > 0 && (
            <div>
              <Typography.Text
                type="secondary"
                style={{ fontSize: 12, textTransform: 'uppercase' }}
              >
                Ảnh kiểm tra phôi
              </Typography.Text>
              <Flex gap={8} wrap style={{ marginTop: 8 }}>
                {photos.slice(0, 8).map((url, index) => (
                  <Tooltip
                    key={`${url}-${index}`}
                    title={`Ảnh kiểm tra phôi #${index + 1}`}
                  >
                    <span className="day-strip-cell is-taken" style={{ width: 48 }}>
                      <GrowthSnapshotThumbnail
                        src={url}
                        alt={`Ảnh kiểm tra phôi #${index + 1}`}
                      />
                    </span>
                  </Tooltip>
                ))}
              </Flex>
            </div>
          )}

          {/* Footer — read-only, chỉ có nút xem */}
          <Flex align="center" justify="space-between" wrap="wrap" gap={8}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Chế độ chỉ đọc — dữ liệu lấy trực tiếp từ hệ thống
            </Typography.Text>
            {photos.length > 0 && (
              <button
                type="button"
                className="cultivation-batch-card-cta"
                onClick={() => onOpenGallery(batch)}
              >
                <PictureOutlined aria-hidden="true" />
                <span>Mở thư viện ảnh</span>
              </button>
            )}
          </Flex>
        </Flex>
      </Flex>
    </Card>
  )
}
