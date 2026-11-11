import { Descriptions, Drawer } from 'antd'
import type { ReactNode } from 'react'
import { useHarvest } from '../api/harvest.queries'
import { QueryFeedback } from '../../../shared/ui/QueryFeedback'
import { auditDate, auditWeight } from '../../../shared/ui/audit-format'
import { cleanText } from '../../../shared/utils/text'
import {
  HARVEST_METHOD_DICTIONARY,
  HARVEST_QUALITY_DICTIONARY,
  HARVEST_REQUEST_STATUS_DICTIONARY,
  HARVEST_STATUS_DICTIONARY,
} from '../../../shared/i18n/status/harvest'
import {
  SESSION_HARVEST_STATUS_DICTIONARY,
  SESSION_STATUS_DICTIONARY,
} from '../../../shared/i18n/status/session'
import { presentStatus } from '../../../shared/i18n/status/registry'
import { StatusBadge } from '../../../shared/ui'

export function HarvestDetailDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const query = useHarvest(id)
  const h = query.data

  /**
   * ⚠ Mọi trường trạng thái đều tra qua từ điển trung tâm
   *   (`presentStatus` / `statusLabel`) ⇒ **không bao giờ** lộ chuỗi
   *   tiếng Anh của BE (vd `IN_PROGRESS`, `PICKUP`, `SCHEDULED`).
   */
  const harvestStatus = presentStatus(HARVEST_STATUS_DICTIONARY, h?.status)
  const sessionStatus = presentStatus(SESSION_STATUS_DICTIONARY, h?.cultivation_status)
  const harvestReadiness = presentStatus(SESSION_HARVEST_STATUS_DICTIONARY, h?.harvest_status)
  const quality = presentStatus(HARVEST_QUALITY_DICTIONARY, h?.quality_grade, 'Chưa ghi nhận')
  const method = presentStatus(HARVEST_METHOD_DICTIONARY, h?.harvest_method, 'Chưa chọn')
  const requestStatus = presentStatus(HARVEST_REQUEST_STATUS_DICTIONARY, h?.harvest_request_status, 'Chưa có yêu cầu')

  const rows: Array<{ key: string; label: string; children: ReactNode }> = h ? [
    { key: 'id', label: 'Mã đợt', children: h.harvest_id },
    { key: 'session', label: 'Phiên canh tác', children: h.session_id },
    { key: 'order', label: 'Đơn hàng', children: h.order_code },
    { key: 'customer', label: 'Khách hàng', children: h.customer_name },
    { key: 'mushroom', label: 'Loại nấm', children: h.mushroom_type },
    {
      key: 'harvest-status',
      label: 'Trạng thái thu hoạch',
      children: <StatusBadge {...harvestStatus} title="Trạng thái vụ thu hoạch" />,
    },
    {
      key: 'session-status',
      label: 'Trạng thái phiên',
      children: <StatusBadge {...sessionStatus} title="Trạng thái phiên canh tác" />,
    },
    {
      key: 'harvest-readiness',
      label: 'Độ sẵn sàng thu hoạch',
      children: <StatusBadge {...harvestReadiness} title="Trạng thái sẵn sàng thu hoạch của phiên" />,
    },
    { key: 'harvest-date', label: 'Ngày thu hoạch', children: auditDate(h.harvest_date) },
    { key: 'total', label: 'Tổng khối lượng (kg)', children: auditWeight(h.total_weight_kg) },
    { key: 'usable', label: 'Thương phẩm (kg)', children: auditWeight(h.usable_weight_kg) },
    { key: 'rejected', label: 'Loại bỏ (kg)', children: auditWeight(h.rejected_weight_kg) },
    {
      key: 'quality',
      label: 'Phẩm cấp',
      children: <StatusBadge {...quality} title={quality.description} />,
    },
    {
      key: 'method',
      label: 'Hình thức nhận',
      children: <StatusBadge {...method} title="Hình thức nhận hàng" />,
    },
    { key: 'scheduled-at', label: 'Lịch hẹn nhận', children: auditDate(h.scheduled_at) },
    { key: 'customer-note', label: 'Ghi chú khách hàng', children: cleanText(h.customer_note) },
    {
      key: 'request-status',
      label: 'Trạng thái bàn giao',
      children: <StatusBadge {...requestStatus} title="Trạng thái bàn giao (yêu cầu thu hoạch)" />,
    },
    { key: 'confirmed-by', label: 'Người xác nhận', children: h.confirmed_by == null ? '—' : `#${h.confirmed_by}` },
    { key: 'confirmed-at', label: 'Thời điểm xác nhận', children: auditDate(h.confirmed_at) },
    { key: 'completed-at', label: 'Hoàn tất bàn giao', children: auditDate(h.completed_at) },
    { key: 'harvested-by', label: 'Người thu hoạch (ID)', children: h.harvested_by },
    { key: 'request-id', label: 'Yêu cầu thu hoạch', children: h.harvest_request_id },
    { key: 'session-tray', label: 'Khay phiên', children: h.session_tray_id },
    { key: 'notes', label: 'Ghi chú đối soát', children: cleanText(h.notes) },
    { key: 'created-at', label: 'Tạo lúc', children: auditDate(h.created_at) },
    { key: 'updated-at', label: 'Cập nhật lúc', children: auditDate(h.updated_at) },
  ] : []

  return (
    <Drawer open title={`Chi tiết thu hoạch #${id} · Chỉ xem`} onClose={onClose} size={720}>
      <QueryFeedback query={query} />
      {!query.isError && h && (
        <Descriptions
          column={1}
          bordered
          size="small"
          items={rows.map(item => ({
            key: item.key,
            label: item.label,
            children: item.children ?? '—',
          }))}
        />
      )}
    </Drawer>
  )
}
