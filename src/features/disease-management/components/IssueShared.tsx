import { Card, Descriptions, Flex, Image, Typography } from 'antd'
import { StatusBadge } from '../../../shared/ui'
import { statusLabel, presentStatus } from '../../../shared/i18n/status/registry'
import { MEDIA_STAGE_DICTIONARY, TRAY_CONDITION_DICTIONARY } from '../../../shared/i18n/status/issue'
import { SESSION_STATUS_DICTIONARY, SESSION_PROGRESS_STAGE_DICTIONARY, SPAWN_CONDITION_DICTIONARY } from '../../../shared/i18n/status/session'
import type { Evidence, Issue } from '../api/issues.api'
import { dateText, missing, show } from './issue-display'
import { number } from '../api/issues.normalizers'
export function EvidenceGallery({ media }: { media: Evidence[] }) {
  return <Image.PreviewGroup><Flex gap={12} wrap>{media.map((item, i) => <div key={`${item.media_id}-${i}`} style={{ maxWidth: '100%' }}>
    {item.media_stage && <StatusBadge {...presentStatus(MEDIA_STAGE_DICTIONARY, item.media_stage, missing)} />}
    <div>{item.media_type === 'VIDEO' ? <video src={item.media_url} controls preload="none" style={{ width: 220, maxWidth: '100%' }} aria-label={item.caption ?? 'Video điều trị'} /> : <Image width={140} src={item.media_url} alt={item.caption ?? 'Ảnh bằng chứng'} />}</div>
    {item.caption && <Typography.Paragraph style={{ overflowWrap: 'anywhere' }}>{item.caption}</Typography.Paragraph>}
  </div>)}</Flex></Image.PreviewGroup>
}
export function SessionInformation({ issue }: { issue: Issue }) {
  const label = (dictionary: Parameters<typeof statusLabel>[0], value: string | null) => statusLabel(dictionary, value, missing)
  const rows = [
    ['Loại nấm', show(issue.mushroom_name)], ['Trạng thái phiên', label(SESSION_STATUS_DICTIONARY, issue.session_status)],
    ['Khay / Tầng', `${show(issue.tray_code)} / ${show(issue.floor_id)}`], ['Bắt đầu', dateText(issue.session_start_at)],
    ['Dự kiến thu hoạch', dateText(issue.expected_harvest_date)], ['Giai đoạn hiện tại', label(SESSION_PROGRESS_STAGE_DICTIONARY, issue.growth_stage)],
    ['Tiến độ', issue.growth_progress == null ? missing : `${issue.growth_progress}%`], ['Tình trạng sinh trưởng', label(TRAY_CONDITION_DICTIONARY, issue.growth_condition)],
    ['Cập nhật tiến độ', dateText(issue.growth_updated_at)], ['Tình trạng khay', label(TRAY_CONDITION_DICTIONARY, issue.tray_condition)],
    ['Tình trạng nấm', label(TRAY_CONDITION_DICTIONARY, issue.mushroom_condition)], ['Tình trạng phôi', label(SPAWN_CONDITION_DICTIONARY, issue.spawn_condition)],
    ['Ghi chú kiểm tra nguồn', show(issue.inspection_notes)], ['Thời điểm kiểm tra', dateText(issue.inspection_at)],
  ]
  if (issue.reported_growth_stage) rows.push(['Giai đoạn lúc báo sự cố', label(SESSION_PROGRESS_STAGE_DICTIONARY, issue.reported_growth_stage)])
  const snapshotLabels: Record<string, string> = { temperature: 'Nhiệt độ', humidity: 'Độ ẩm', co2: 'Nồng độ khí CO₂', light: 'Ánh sáng', recorded_at: 'Thời điểm ghi nhận' }
  return <Flex vertical gap={12}><Descriptions column={1} bordered size="small" items={rows.map(([label, children]) => ({ key: label, label, children }))} />
    {issue.environment_snapshot && <Card size="small" title="Môi trường lúc báo sự cố"><Descriptions column={1} items={Object.entries(snapshotLabels).filter(([key]) => issue.environment_snapshot![key] != null).map(([key, label]) => {
      const value = issue.environment_snapshot![key]
      return { key, label, children: key === 'recorded_at' ? dateText(typeof value === 'string' ? value : null) : number(value)?.toLocaleString('vi-VN') ?? missing }
    })} /></Card>}
  </Flex>
}
