/**
 * Legend trạng thái khay — dạng chú thích nhỏ, KHÔNG giống nút bấm.
 *
 * Vấn đề giải quyết: legend cũ dùng `StatusBadge` (có nền + viền + bo góc)
 * nên nhìn như button → người dùng nghĩ có thể bấm vào.
 *
 * Giải pháp: chấm màu + chữ muted, không nền, không viền, không bo góc —
 * trông như chú thích biểu đồ (chart legend) theo chuẩn MD.
 *
 * Màu KHÔNG bao giờ là tín hiệu duy nhất: luôn kèm nhãn chữ.
 */
import { Flex,Tooltip,Typography } from 'antd'
import { tones } from '../../../app/theme/tokens'
import type { TrayStatus } from '../../../types/room.types'
import { TRAY_STATUS_CONFIG } from './tray-status.config'

interface LegendEntry {
  status: TrayStatus
  /** Mô tả ngắn khi hover — giải thích trạng thái bằng lời. */
  hint: string
}

const TRAY_LEGEND_ENTRIES: readonly LegendEntry[] = [
  {
    status: 'maintenance',
    hint: 'Khay đang vệ sinh sau khi thu hoạch — cần khử trùng trước khi gán khách.',
  },
  {
    status: 'harvesting',
    hint: 'Đã tới mốc thu hoạch — cần báo khách và nhận sản phẩm.',
  },
  {
    status: 'rented',
    hint: 'Khay đang có vụ thuê chạy bình thường.',
  },
  {
    status: 'empty',
    hint: 'Khay trống, sẵn sàng gán cho vụ thuê mới.',
  },
]

export function TrayStatusLegend() {
  return (
    <Flex
      align="center"
      gap={12}
      wrap
      role="list"
      aria-label="Chú thích trạng thái khay"
      style={{ fontSize: 'var(--mcms-font-small)' }}
    >
      {TRAY_LEGEND_ENTRIES.map((entry) => {
        // Nhãn + tone lấy từ config chung → legend và ô khay luôn khớp.
        const config = TRAY_STATUS_CONFIG[entry.status]
        const palette = entry.status === 'maintenance'
          ? { text: '#0c4a6e', solid: '#0284c7' }
          : tones[config.tone]

        return (
          <Tooltip key={entry.status} title={entry.hint}>
            <Flex
              role="listitem"
              align="center"
              gap={5}
              style={{ cursor: 'help' }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  color: palette.text,
                  fontSize: 'var(--mcms-font-small)',
                }}
              >

                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: palette.solid,
                  }}
                />
              </span>
              <Typography.Text
                type="secondary"
                style={{ fontSize: 'var(--mcms-font-small)', lineHeight: 1.4 }}
              >
                {config.label}
              </Typography.Text>
            </Flex>
          </Tooltip>
        )
      })}
    </Flex>
  )
}
