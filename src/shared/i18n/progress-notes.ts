import { SESSION_PROGRESS_STAGE_DICTIONARY } from './status/session.ts'

const SYSTEM_NOTES: Record<string, string> = {
  'Cultivation started after tray assignment': 'Bắt đầu trồng sau khi gán khay',
  'Spawn allocated after payment; awaiting farm acceptance': 'Đã cấp phôi sau thanh toán, chờ nông trại tiếp nhận',
  'Spawn has been placed on the assigned trays and fruiting initiation has started.': 'Phôi đã được đặt lên khay được gán và bắt đầu kích thích ra quả thể.',
  'Initial mushroom pins are appearing normally.': 'Mầm nấm ban đầu đang hình thành bình thường.',
  'Young fruiting bodies are developing normally.': 'Quả thể non đang phát triển bình thường.',
  'Mushrooms are approaching the expected mature condition and should be evaluated for harvest readiness.': 'Nấm đang đạt độ trưởng thành dự kiến, cần đánh giá điều kiện thu hoạch.',
  'Harvest readiness confirmed': 'Đã xác nhận đủ điều kiện thu hoạch',
  'Not ready for harvest': 'Chưa đủ điều kiện thu hoạch',
  'Awaiting sanitation after harvest handover': 'Chờ vệ sinh sau khi bàn giao thu hoạch',
}
/** Translate known system messages only; preserve operator-authored notes verbatim. */
export function translateProgressNote(value: string | null | undefined): string | null {
  const text = value?.trim()
  if (!text || text === '—') return null
  const match = /^Spawn stage changed to\s+([A-Z_]+)\.?$/i.exec(text)
  if (match) {
    const stage = SESSION_PROGRESS_STAGE_DICTIONARY[match[1].toUpperCase()]
    return stage ? `Chuyển trạng thái phôi sang ${stage.label}` : 'Đã cập nhật trạng thái phôi'
  }
  return SYSTEM_NOTES[text] ?? text
}
