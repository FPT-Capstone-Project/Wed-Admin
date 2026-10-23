import { useEffect } from 'react'
import { App, Form, Input, Modal, Select } from 'antd'
import {
  useCreateCultivationTray,
  useUpdateCultivationTray,
} from '../hooks/useCultivation'
import type {
  CreateCultivationTrayRequest,
  CultivationRoom,
  CultivationTray,
  UpdateCultivationTrayRequest,
} from '../../../types/cultivation'
import type { BeTrayStatus } from '../../../types/cultivation-status'

const TRAY_STATUS_OPTIONS: Array<{ value: BeTrayStatus; label: string }> = [
  { value: 'AVAILABLE', label: 'Trống — sẵn sàng cho thuê' },
  { value: 'OCCUPIED', label: 'Đang sử dụng' },
  { value: 'MAINTENANCE', label: 'Bảo trì / cách ly' },
]

interface TrayFormValues {
  roomId: number
  trayCode: string
  trayName?: string
  status: BeTrayStatus
}

interface TrayFormModalProps {
  open: boolean
  /** Khi có tray → chế độ sửa; khi null → chế độ tạo mới. */
  tray: CultivationTray | null
  /** Danh sách phòng để chọn (dùng cho cả tạo mới lẫn đổi phòng). */
  rooms: CultivationRoom[]
  onCancel: () => void
  onSuccess?: (tray: CultivationTray) => void
}

/**
 * Form tạo / sửa khay — gắn trực tiếp API
 * `POST /api/cultivation-trays` và `PUT /api/cultivation-trays/{id}`.
 */
export function TrayFormModal({
  open,
  tray,
  rooms,
  onCancel,
  onSuccess,
}: TrayFormModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<TrayFormValues>()
  const isEdit = Boolean(tray)

  const createMutation = useCreateCultivationTray({
    onSuccess: (created) => {
      message.success(`Đã tạo khay "${created.tray_code}".`)
      form.resetFields()
      onCancel()
      onSuccess?.(created)
    },
    onError: (err) => message.error(err.message),
  })

  const updateMutation = useUpdateCultivationTray({
    onSuccess: (updated) => {
      message.success(`Đã cập nhật khay "${updated.tray_code}".`)
      form.resetFields()
      onCancel()
      onSuccess?.(updated)
    },
    onError: (err) => message.error(err.message),
  })

  // Sync form values khi mở modal / đổi khay đang sửa
  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      roomId: tray?.room_id ?? rooms[0]?.room_id,
      trayCode: tray?.tray_code ?? '',
      trayName: tray?.tray_name ?? '',
      status: tray?.status ?? 'AVAILABLE',
    })
  }, [form, open, rooms, tray])

  const handleSubmit = (values: TrayFormValues) => {
    if (tray) {
      const payload: UpdateCultivationTrayRequest = {
        roomId: values.roomId,
        trayCode: values.trayCode,
        trayName: values.trayName?.trim() ? values.trayName : null,
        status: values.status,
      }
      updateMutation.mutate({ id: tray.tray_id, payload })
      return
    }

    const payload: CreateCultivationTrayRequest = {
      roomId: values.roomId,
      trayCode: values.trayCode,
      trayName: values.trayName?.trim() ? values.trayName : undefined,
      status: values.status,
    }
    createMutation.mutate(payload)
  }

  return (
    <Modal
      title={isEdit ? `Sửa khay ${tray?.tray_code}` : 'Thêm khay'}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText={isEdit ? 'Lưu thay đổi' : 'Tạo khay'}
      cancelText="Hủy"
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      destroyOnHidden
      afterClose={() => form.resetFields()}
      width={520}
    >
      <Form<TrayFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={handleSubmit}
      >
        <Form.Item
          label="Phòng nuôi"
          name="roomId"
          rules={[{ required: true, message: 'Chọn phòng nuôi.' }]}
        >
          <Select
            placeholder="— Chọn phòng —"
            options={rooms.map((room) => ({
              value: room.room_id,
              label: `${room.room_name} (${room.room_code})`,
            }))}
          />
        </Form.Item>

        <Form.Item
          label="Mã khay"
          name="trayCode"
          rules={[
            { required: true, message: 'Nhập mã khay.' },
            { max: 50, message: 'Tối đa 50 ký tự.' },
          ]}
        >
          <Input placeholder="VD: T1-K01" autoComplete="off" />
        </Form.Item>

        <Form.Item
          label="Tên khay"
          name="trayName"
          rules={[{ max: 120, message: 'Tối đa 120 ký tự.' }]}
        >
          <Input placeholder="VD: Khay nấm Búp vàng số 1" autoComplete="off" />
        </Form.Item>

        <Form.Item
          label="Trạng thái"
          name="status"
          rules={[{ required: true, message: 'Chọn trạng thái.' }]}
        >
          <Select options={TRAY_STATUS_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
