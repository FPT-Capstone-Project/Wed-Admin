import { Descriptions, Drawer } from 'antd'
import { useHarvest } from '../api/harvest.queries'
import { QueryFeedback } from '../../../shared/ui/QueryFeedback'
import { auditDate, auditWeight } from '../../../shared/ui/audit-format'
export function HarvestDetailDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const query = useHarvest(id)
  const h = query.data
  const rows: [string, string | number | null][] = h ? [
    ['Mã đợt', h.harvest_id], ['Phiên canh tác', h.session_id], ['Đơn hàng', h.order_code], ['Khách hàng', h.customer_name], ['Loại nấm', h.mushroom_type],
    ['Trạng thái thu hoạch', h.status], ['Trạng thái phiên', h.cultivation_status], ['Độ sẵn sàng thu hoạch', h.harvest_status], ['Ngày thu hoạch', auditDate(h.harvest_date)],
    ['Tổng khối lượng (kg)', auditWeight(h.total_weight_kg)], ['Thương phẩm (kg)', auditWeight(h.usable_weight_kg)], ['Loại bỏ (kg)', auditWeight(h.rejected_weight_kg)], ['Phẩm cấp', h.quality_grade],
    ['Hình thức nhận', h.harvest_method], ['Lịch hẹn nhận', auditDate(h.scheduled_at)], ['Ghi chú khách hàng', h.customer_note], ['Trạng thái bàn giao', h.harvest_request_status],
    ['Người xác nhận (ID)', h.confirmed_by], ['Thời điểm xác nhận', auditDate(h.confirmed_at)], ['Hoàn tất bàn giao', auditDate(h.completed_at)], ['Người thu hoạch (ID)', h.harvested_by],
    ['Yêu cầu thu hoạch', h.harvest_request_id], ['Khay phiên', h.session_tray_id], ['Ghi chú đối soát', h.notes], ['Tạo lúc', auditDate(h.created_at)], ['Cập nhật lúc', auditDate(h.updated_at)],
  ] : []
  return <Drawer open title={`Chi tiết thu hoạch #${id} · Chỉ xem`} onClose={onClose} size={720}><QueryFeedback query={query} />{!query.isError && h && <Descriptions column={1} bordered size="small" items={rows.map(([label, value]) => ({ key: label, label, children: value ?? '—' }))} />}</Drawer>
}
