import { Alert, App, Form, Modal, Select, Tag } from 'antd'
import { useAssignFloorToTray } from '../../../features/devices/hooks/useIoT'
import { useCultivationTrays } from '../../../features/rooms/hooks/useCultivation'
import type { BeTrayStatus } from '../../../types/cultivation-status'

interface AssignTrayModalProps {
  /**
   * Định danh tầng của BE = `cultivation_floors.floor_id`.
   *
   * ⚠ Không phải `room_id` — nhiều tầng có thể cùng room.
   */
  floorId: number | null
  floorName: string
  /** Số tầng (1..4) — dùng để lọc khay theo mã `T{n}-K{x}`. */
  floorNumber: number
  /** `room_id` của phòng chứa tầng — lọc theo phòng. */
  roomId: number
  open: boolean
  onClose: () => void
}

interface AssignTrayFormValues {
  trayId: number
}

const TRAY_STATUS_CONFIG: Record<BeTrayStatus, { color: string; label: string }> =
  {
    AVAILABLE: { color: 'success', label: 'Trống' },
    OCCUPIED: { color: 'processing', label: 'Đang thuê' },
    MAINTENANCE: { color: 'warning', label: 'Bảo trì' },
    INACTIVE: { color: 'default', label: 'Ngừng' },
  }

/**
 * Gán khay cho tầng — `PUT /api/iot/floors/{floorId}/trays/{trayId}`.
 *
 * Trước đây dùng `window.prompt()` để admin gõ tay `tray_id` — dễ sai số và
 * không thấy khay đó đã gán cho tầng nào. Ở đây dùng Select có nhãn rõ
 * mã + trạng thái, và **chỉ liệt kê khay đúng thuộc phòng/tầng** đang chọn.
 *
 * ⚠ Về ý nghĩa `floorId`:
 * - BE định danh tầng bằng `floor_id` (`cultivation_floors.floor_id`) →
 *   `floorId` truyền vào chính là `floor_id` — dùng để gọi API.
 * - Phần *hiển thị* lọc theo `roomId` + `floorNumber` vì mã khay có
 *   dạng `T{tầng}-K{vị trí}` (vd: tầng 1 → `T1-K1`, `T1-K2`, `T1-K3`).
 */
export function AssignTrayModal({
  floorId,
  floorName,
  floorNumber,
  roomId,
  open,
  onClose,
}: AssignTrayModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<AssignTrayFormValues>()

  // Gọi server-side filter theo roomId nếu BE hỗ trợ; nếu không thì vẫn
  // lọc client-side bên dưới (phòng hợp khi BE bỏ qua tham số).
  const { data: trays = [], isLoading } = useCultivationTrays(
    { roomId },
    { enabled: open },
  )

  const assignFloor = useAssignFloorToTray({
    onSuccess: () => {
      message.success(`Đã gán khay cho ${floorName}.`)
      form.resetFields()
      onClose()
    },
    onError: (err) => {
      message.error(err.message || 'Không thể gán khay cho tầng.')
    },
  })

  const handleOk = async () => {
    const values = await form.validateFields()
    await assignFloor.mutateAsync({
      floorId: floorId as number,
      trayId: values.trayId,
    })
  }

  const handleCancel = () => {
    form.resetFields()
    onClose()
  }

  const floorPrefix = `T${floorNumber}-`

  // Chỉ giữ khay đúng tầng: mã dạng `T{n}-K{x}`.
  const floorTrays = trays.filter((tray) =>
    tray.tray_code.startsWith(floorPrefix),
  )

  // Nếu BE bỏ qua `roomId` và trả về mọi phòng, lọc bổ sung theo phòng.
  const scopedTrays =
    floorTrays.length > 0
      ? floorTrays
      : trays.filter((tray) => tray.room_id === roomId)

  return (
    <Modal
      title={`Gán khay cho ${floorName}`}
      open={open}
      onCancel={handleCancel}
      onOk={() => void handleOk()}
      okText="Gán khay"
      cancelText="Hủy"
      confirmLoading={assignFloor.isPending}
      loading={isLoading}
      centered
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={`Chỉ hiển thị khay thuộc tầng ${floorNumber} (mã bắt đầu bằng "${floorPrefix}").`}
        description="Gán khay sẽ gắn cảm biến của khay đó vào tầng để hệ thống tự động tưới."
      />

      <Form<AssignTrayFormValues> form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="trayId"
          label="Khay"
          rules={[{ required: true, message: 'Vui lòng chọn khay.' }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={`Chọn khay tầng ${floorNumber}...`}
            notFoundContent={
              isLoading ? (
                'Đang tải danh sách khay...'
              ) : (
                <span>
                  Không có khay nào thuộc tầng {floorNumber}. Kiểm tra lại cấu
                  hình tầng hoặc tạo khay mới.
                </span>
              )
            }
            options={scopedTrays.map((tray) => ({
              value: tray.tray_id,
              label: `${tray.tray_code}${
                tray.tray_name ? ` · ${tray.tray_name}` : ''
              }`,
            }))}
            optionRender={(option) => {
              const tray = scopedTrays.find((t) => t.tray_id === option.value)
              if (!tray) return option.label
              const cfg = TRAY_STATUS_CONFIG[tray.status]
              return (
                <span>
                  <Tag color={cfg.color} style={{ marginInlineEnd: 6 }}>
                    {cfg.label}
                  </Tag>
                  {option.label}
                </span>
              )
            }}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}