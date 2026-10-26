/**
 * Dải cảnh báo "khay cần xử lý" — đặt TRÊN các StatCard.
 *
 * Vấn đề giải quyết: "Cần chú ý" nằm ngang hàng với 3 thẻ số khác nên
 * không nổi bật; người dùng lướt qua không thấy khay nào đang cần xử lý.
 *
 * Quy tắc:
 *   - Có khay cần xử lý → hiện dải nổi bật (tone danger) + danh sách mã khay
 *     bấm được để mở đúng khay.
 *   - Bằng 0 → thu gọn thành MỘT dòng muted "Không có khay nào cần chú ý"
 *     (không chiếm chỗ, không gây lo lắng).
 */
import { Button, Flex, Tooltip, Typography } from 'antd'
import {
  BugOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { tokens } from '../../../app/theme/tokens'

/** Một khay cần người dùng xử lý. */
export interface AttentionTray {
  /** `tray.id` — dùng để điều hướng tới drawer chi tiết. */
  id: string
  /** Mã khay đã chuẩn hoá (vd: "KH-007"). */
  code: string
  /** `maintenance` = nhiễm bệnh, `harvesting` = chờ thu hoạch. */
  kind: 'maintenance' | 'harvesting'
  /** Tên khách thuê (chỉ có với khay đang thuê) — giúp biết cần báo ai. */
  customerName?: string | null
  /** Ngày thu hoạch dự kiến (ISO) — cho khay chờ thu hoạch. */
  expectedHarvestDate?: string | null
}

interface TrayAttentionBannerProps {
  trays: AttentionTray[]
  onSelectTray: (trayId: string) => void
}

/** Định dạng ngày ngắn — "25/10". */
const SHORT_DATE_FMT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
})

function formatShortDate(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return SHORT_DATE_FMT.format(date)
}

export function TrayAttentionBanner({
  trays,
  onSelectTray,
}: TrayAttentionBannerProps) {
  // ── Không có khay nào cần xử lý → 1 dòng gọn ──────────────────────────
  if (trays.length === 0) {
    return (
      <Flex
        align="center"
        gap={6}
        role="status"
        style={{
          padding: `${tokens.space['2']} ${tokens.space['3']}`,
          borderRadius: tokens.radius.md,
          backgroundColor: tokens.color.surfaceMuted,
          border: `1px solid ${tokens.color.borderSoft}`,
        }}
      >
        <CheckCircleOutlined
          aria-hidden="true"
          style={{ color: tokens.tone.ok.text, fontSize: 13 }}
        />
        <Typography.Text
          type="secondary"
          style={{ fontSize: 12 }}
        >
          Không có khay nào cần chú ý
        </Typography.Text>
      </Flex>
    )
  }

  const sickCount = trays.filter((t) => t.kind === 'maintenance').length
  const harvestCount = trays.length - sickCount

  return (
    <div
      role="alert"
      aria-label="Danh sách khay cần xử lý"
      style={{
        padding: `${tokens.space['3']} ${tokens.space['4']}`,
        borderRadius: tokens.radius.lg,
        backgroundColor: tokens.tone.danger.bg,
        border: `1px solid ${tokens.tone.danger.border}`,
        borderLeft: `4px solid ${tokens.tone.danger.solid}`,
        boxShadow: tokens.shadow.xs,
      }}
    >
      <Flex align="center" justify="space-between" gap={12} wrap>
        <Flex align="center" gap={8} wrap>
          <BugOutlined
            aria-hidden="true"
            style={{ color: tokens.tone.danger.text, fontSize: 15 }}
          />
          <Typography.Text
            strong
            style={{ fontSize: 14, color: tokens.tone.danger.text }}
          >
            {trays.length} khay cần xử lý
          </Typography.Text>

          {sickCount > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                color: tokens.tone.danger.text,
              }}
            >
              <BugOutlined aria-hidden="true" />
              {sickCount} nhiễm bệnh
            </span>
          )}

          {harvestCount > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                color: tokens.tone.warning.text,
              }}
            >
              <ClockCircleOutlined aria-hidden="true" />
              {harvestCount} chờ thu hoạch
            </span>
          )}
        </Flex>

        {/* Danh sách mã khay — bấm để mở đúng khay cần xử lý. */}
        <Flex gap={6} wrap align="center">
          {trays.map((tray) => {
            const dueDate = formatShortDate(tray.expectedHarvestDate)
            const context = [
              tray.kind === 'maintenance'
                ? 'Khay nhiễm bệnh / đang cách ly'
                : 'Khay chờ thu hoạch',
              tray.customerName ? `Khách: ${tray.customerName}` : null,
              dueDate ? `Thu hoạch dự kiến: ${dueDate}` : null,
            ]
              .filter(Boolean)
              .join(' · ')

            return (
              <Tooltip key={tray.id} title={`${context} — bấm để mở chi tiết`}>
                <Button
                  size="small"
                  onClick={() => onSelectTray(tray.id)}
                  style={{
                    fontFamily: tokens.typography.fontNumeric,
                    fontWeight: tokens.typography.weightSemibold,
                    color: tokens.tone.danger.text,
                    borderColor: tokens.tone.danger.border,
                    backgroundColor: tokens.color.surface,
                  }}
                >
                  {tray.code}
                </Button>
              </Tooltip>
            )
          })}
        </Flex>
      </Flex>
    </div>
  )
}
