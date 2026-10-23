import { useEffect } from 'react'
import { App, Form, Input, InputNumber, Modal, Select } from 'antd'
import {
  useCreateCultivationRoom,
  useUpdateCultivationRoom,
} from '../hooks/useCultivation'
import type {
  CreateCultivationRoomRequest,
  CultivationRoom,
  UpdateCultivationRoomRequest,
} from '../../../types/cultivation'

const ROOM_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'INACTIVE', label: 'Ngừng hoạt động' },
  { value: 'MAINTENANCE', label: 'Bảo trì' },
] as const

interface RoomFormValues {
  roomCode: string
  roomName: string
  description?: string
  capacity?: number
  status: CreateCultivationRoomRequest['status']
}

interface RoomFormModalProps {
  open: boolean
  /** Khi có room → chế độ sửa; khi null → chế độ tạo mới. */
  room: CultivationRoom | null
  onCancel: () => void
  onSuccess?: (room: CultivationRoom) => void
}

/**
 * Form tạo / sửa phòng nuôi trồng — gắn trực tiếp API
 * `POST /api/cultivation-rooms` và `PUT /api/cultivation-rooms/{id}`.
 */
export function RoomFormModal({
  open,
  room,
  onCancel,
  onSuccess,
}: RoomFormModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<RoomFormValues>()
  const isEdit = Boolean(room)

  const createMutation = useCreateCultivationRoom({
    onSuccess: (created) => {
      message.success(`Đã tạo phòng "${created.room_name}".`)
      form.resetFields()
      onCancel()
      onSuccess?.(created)
    },
    onError: (err) => message.error(err.message),
  })

  const updateMutation = useUpdateCultivationRoom({
    onSuccess: (updated) => {
      message.success(`Đã cập nhật phòng "${updated.room_name}".`)
      form.resetFields()
      onCancel()
      onSuccess?.(updated)
    },
    onError: (err) => message.error(err.message),
  })

  // Sync form values khi mở modal / đổi phòng đang sửa
  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      roomCode: room?.room_code ?? '',
      roomName: room?.room_name ?? '',
      description: room?.description ?? '',
      capacity: room?.capacity ?? 12,
      status: room?.status ?? 'ACTIVE',
    })
  }, [form, open, room])

  const handleSubmit = (values: RoomFormValues) => {
    if (room) {
      const payload: UpdateCultivationRoomRequest = {
        roomCode: values.roomCode,
        roomName: values.roomName,
        description: values.description?.trim() ? values.description : null,
        capacity: values.capacity,
        status: values.status,
      }
      updateMutation.mutate({ id: room.room_id, payload })
      return
    }

    const payload: CreateCultivationRoomRequest = {
      roomCode: values.roomCode,
      roomName: values.roomName,
      description: values.description?.trim() ? values.description : undefined,
      capacity: values.capacity,
      status: values.status,
    }
    createMutation.mutate(payload)
  }

  return (
    <Modal
      title={isEdit ? `Sửa phòng ${room?.room_code}` : 'Thêm phòng nuôi trồng'}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText={isEdit ? 'Lưu thay đổi' : 'Tạo phòng'}
      cancelText="Hủy"
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      destroyOnHidden
      afterClose={() => form.resetFields()}
      width={520}
    >
      <Form<RoomFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={handleSubmit}
      >
        <Form.Item
          label="Mã phòng"
          name="roomCode"
          rules={[
            { required: true, message: 'Nhập mã phòng.' },
            { max: 50, message: 'Tối đa 50 ký tự.' },
          ]}
        >
          <Input placeholder="VD: TANG-01" autoComplete="off" />
        </Form.Item>

        <Form.Item
          label="Tên phòng"
          name="roomName"
          rules={[
            { required: true, message: 'Nhập tên phòng.' },
            { max: 120, message: 'Tối đa 120 ký tự.' },
          ]}
        >
          <Input placeholder="VD: Tầng 1 — Kệ A" autoComplete="off" />
        </Form.Item>

        <Form.Item
          label="Mô tả"
          name="description"
          rules={[{ max: 500, message: 'Tối đa 500 ký tự.' }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Ghi chú vị trí, thiết bị phụ trợ…"
            showCount
            maxLength={500}
          />
        </Form.Item>

        <Form.Item
          label="Sức chứa (số khay)"
          name="capacity"
          rules={[{ required: true, message: 'Nhập sức chứa.' }]}
        >
          <InputNumber min={1} max={200} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label="Trạng thái"
          name="status"
          rules={[{ required: true, message: 'Chọn trạng thái.' }]}
        >
          <Select options={[...ROOM_STATUS_OPTIONS]} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
