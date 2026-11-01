import '../rooms-industrial.css'
import { StatusBadge, ActionButton } from '../../../shared/ui'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  FileDoneOutlined,
  PhoneOutlined,
  ScissorOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import {
  Alert,
  App as AntdApp,
  Button,
  Form,
  Input,
  Modal,
  Typography,
} from 'antd'
import { useState } from 'react'
import type { TrayCareLog, TrayRental } from '../../../types/room.types'
import type { RentalLifecycleMetrics } from '../utils/tray-rental.utils'
import { formatRentalDate } from '../utils/tray-rental.utils'

/** Ba giai đoạn workflow vận hành */
type StaffLifecycleStage = 'CARING' | 'WARN_48H' | 'HARVEST'

interface LogNoteValues {
  note: string
}

interface TrayStaffActionWorkflowProps {
  rental: TrayRental
  lifecycle: RentalLifecycleMetrics
  contactConfirmed: boolean
  latestCareLog?: TrayCareLog
  onContactConfirmed: () => void
  onEarlyHarvest: () => void
  onHarvest: () => void
  onDestroy: () => void
  onSaveLog: (note: string) => void
}

/**
 * Xác định giai đoạn workflow:
 * - HARVEST: đã đến ngày thu hoạch hoặc quá hạn
 * - WARN_48H: ngày 5–6 (còn 2 ngày hoặc ít hơn)
 * - CARING: ngày 1–4
 */
function resolveLifecycleStage(
  lifecycle: RentalLifecycleMetrics,
): StaffLifecycleStage {
  if (lifecycle.isHarvestReady) return 'HARVEST'
  if (lifecycle.daysRemainingToHarvest <= 2) return 'WARN_48H'
  return 'CARING'
}

export function TrayStaffActionWorkflow({
  rental,
  lifecycle,
  contactConfirmed,
  latestCareLog,
  onContactConfirmed,
  onEarlyHarvest,
  onHarvest,
  onDestroy,
  onSaveLog,
}: TrayStaffActionWorkflowProps) {
  const { message } = AntdApp.useApp()
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [form] = Form.useForm<LogNoteValues>()

  const stage = resolveLifecycleStage(lifecycle)
  const { growthDay, expectedHarvestDay } = lifecycle

  const handleCopyPhone = async () => {
    if (!navigator.clipboard) {
      message.error('Trình duyệt không hỗ trợ sao chép số điện thoại.')
      return
    }
    try {
      await navigator.clipboard.writeText(rental.tenantPhone)
      message.success('Đã sao chép số điện thoại khách hàng.')
    } catch {
      message.error('Không thể sao chép. Hãy chọn và sao chép thủ công.')
    }
  }

  const handleSaveLog = ({ note }: LogNoteValues) => {
    const trimmed = note.trim()
    onSaveLog(trimmed)
    form.resetFields()
    setIsLogModalOpen(false)
    message.success('Đã lưu ghi chú vào nhật ký chăm sóc của mẻ.')
  }

  return (
    <>
      <section
        className={`tray-detail-section tray-staff-workflow tray-staff-workflow--${stage.toLowerCase()}`}
        aria-labelledby="tray-staff-workflow-heading"
      >
        {/* ── Section Header ───────────────────────────────────────── */}
        <div className="tray-section-heading">
          <span className="tray-section-icon" aria-hidden="true">
            <CalendarOutlined />
          </span>
          <div>
            <Typography.Title id="tray-staff-workflow-heading" level={4}>
              Thao tác vận hành
            </Typography.Title>
            <Typography.Text type="secondary">
              Giai đoạn {growthDay}/{expectedHarvestDay} ·{' '}
              {stage === 'CARING'
                ? 'Đang nuôi'
                : stage === 'WARN_48H'
                  ? 'Cảnh báo trước 48h'
                  : 'Chốt thu hoạch'}
            </Typography.Text>
          </div>
        </div>

        {/* ── Giai đoạn CARING (Ngày 1–4) ─────────────────────────── */}
        {stage === 'CARING' && (
          <>
            <div
              className="staff-stage-badge staff-stage-badge--care"
              role="status"
            >
              <StatusBadge tone="ok" icon={<CheckCircleOutlined />} label={<>
                Đang chăm sóc bình thường
              </>} />
              <span>
                Tiếp tục theo dõi vi khí hậu và ghi nhận nhật ký hằng ngày.
              </span>
            </div>

            <div className="tray-staff-actions tray-staff-actions--care">
              <ActionButton variant="text" size="middle" icon={<PhoneOutlined />}
onClick={() => setIsLogModalOpen(true)} label="Ghi chú nhật ký" />
              <ActionButton variant="text" size="middle" className="tray-staff-action-button"
icon={<ScissorOutlined />}
onClick={onEarlyHarvest} label="Thu hoạch sớm theo yêu cầu khách" />
            </div>

            {latestCareLog && (
              <div className="staff-latest-log" role="status">
                <strong>Nhật ký gần nhất</strong>
                <span>{latestCareLog.note}</span>
              </div>
            )}
          </>
        )}

        {/* ── Giai đoạn WARN_48H (Ngày 5–6) ───────────────────────── */}
        {stage === 'WARN_48H' && (
          <>
            <Alert
              className="staff-stage-alert staff-stage-alert--warn"
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              title={`Dự kiến thu hoạch vào Ngày ${expectedHarvestDay} (${formatRentalDate(
                rental.expectedHarvestDate,
              )}).`}
              description={
                contactConfirmed
                  ? `Đã xác nhận với khách. Mẻ sẽ được chốt thu hoạch khi đến hạn.`
                  : 'Kỹ thuật viên cần liên hệ trước với khách để chốt phương thức giao/nhận nấm.'
              }
            />

            <div className="staff-contact-panel">
              <div className="staff-contact-copy">
                <span className="tray-detail-label">Liên hệ khách hàng</span>
                <strong>{rental.tenantName}</strong>
                <span className="staff-contact-phone">
                  <PhoneOutlined aria-hidden="true" />
                  {rental.tenantPhone}
                </span>
                {rental.tenantAddress && (
                  <span className="staff-contact-address">
                    <EnvironmentOutlined aria-hidden="true" />
                    {rental.tenantAddress}
                  </span>
                )}
              </div>
              <div className="staff-contact-actions">
                <Button
                  type="primary"
                  className="staff-contact-call-btn"
                  icon={<PhoneOutlined />}
                  href={`tel:${rental.tenantPhone}`}
                >
                  Gọi khách
                </Button>
                <ActionButton variant="text" size="middle" icon={<CopyOutlined />}
onClick={() => void handleCopyPhone()} label="Sao chép" />
              </div>
            </div>

            <ActionButton variant={contactConfirmed ? 'text' : 'primary'} size="middle" className={`staff-contact-confirm-btn ${
                contactConfirmed
                  ? 'staff-contact-confirm-btn--confirmed'
                  : ''
              }`}
icon={
                contactConfirmed ? (
                  <CheckCircleOutlined />
                ) : (
                  <CalendarOutlined />
                )
              }
onClick={onContactConfirmed}
disabled={contactConfirmed} label={contactConfirmed
                ? 'Đã xác nhận hẹn ngày giao với khách'
                : 'Đã gọi xác nhận với khách'} />
          </>
        )}

        {/* ── Giai đoạn HARVEST (Ngày 7+) ─────────────────────────── */}
        {stage === 'HARVEST' && (
          <>
            <Alert
              className="staff-stage-alert staff-stage-alert--harvest"
              type="info"
              showIcon
              icon={<CalendarOutlined />}
              title="Hôm nay là hạn chốt thu hoạch của mẻ này."
              description="Vui lòng chốt phương án giao nấm hoặc tiêu hủy mẻ để giải phóng khay trong ngày."
            />

            <div className="tray-staff-actions tray-staff-actions--harvest">
              <ActionButton variant="primary" size="middle" className="tray-staff-action-button"
icon={<FileDoneOutlined />}
onClick={onHarvest} label="Thu hoạch & Xuất hóa đơn" />
              <ActionButton variant="dangerText" size="middle" className="tray-staff-action-button"
icon={<DeleteOutlined />}
onClick={onDestroy} label="Tiêu hủy mẻ (Khách từ chối nhận)" />
            </div>

            <div className="tray-staff-actions-note">
              <WarningOutlined aria-hidden="true" />
              <span>
                Tiêu hủy: dành cho khách không nhận hoặc không liên lạc được
                sau 3 cuộc gọi theo chính sách ngày 7.
              </span>
            </div>
          </>
        )}
      </section>

      {/* ── Modal ghi chú nhật ký chăm sóc ────────────────────── */}
      <Modal
        className="tray-log-note-modal"
        title={
          <span className="tray-dialog-title">
            <PhoneOutlined aria-hidden="true" />
            Ghi chú nhật ký chăm sóc
          </span>
        }
        open={isLogModalOpen}
        onCancel={() => setIsLogModalOpen(false)}
        onOk={() => void form.submit()}
        okText="Lưu ghi chú"
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form<LogNoteValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={handleSaveLog}
        >
          <Form.Item
            name="note"
            label="Nội dung nhật ký"
            rules={[
              { required: true, message: 'Vui lòng nhập nội dung nhật ký.' },
              { whitespace: true, message: 'Ghi chú không được để trống.' },
              { min: 4, message: 'Ghi chú cần ít nhất 4 ký tự.' },
            ]}
          >
            <Input.TextArea
              rows={4}
              maxLength={500}
              showCount
              placeholder="Ví dụ: Đã phun ẩm nhẹ, kiểm tra nấm lên đều..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
