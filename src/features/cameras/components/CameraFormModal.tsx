import { useEffect, useMemo } from 'react'
import { App, Form, Input, Modal, Select } from 'antd'
import {
  useRegisterCamera,
  useUpdateCamera,
} from '../hooks/useCameras'
import { useCultivationRooms } from '../../rooms/hooks/useCultivation'
import { getApiErrorMessage } from '../../../shared/api/error'
import {
  type Camera,
  type CameraStatus,
  type CreateCameraRequest,
  type UpdateCameraRequest,
} from '../../../types/camera.types'

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'INACTIVE', label: 'Ngừng' },
  { value: 'OFFLINE', label: 'Mất kết nối' },
] as const

interface CameraFormValues {
  cameraCode: string
  cameraName: string
  roomId?: number | null
  streamUrl?: string | null
  status: CameraStatus
}

interface CameraFormModalProps {
  open: boolean
  /** Khi có camera → chế độ sửa; khi null → chế độ tạo mới. */
  camera: Camera | null
  onCancel: () => void
  onSuccess?: (camera: Camera | null) => void
}

/**
 * Form tạo / sửa camera Imou — gắn với `POST /api/cameras` và
 * `PUT /api/cameras/{cameraId}`.
 *
 * Lưu ý: `roomId` là **bắt buộc khi tạo** (spec `required: [roomId,
 * cameraCode, cameraName]`) nhưng **tuỳ chọn khi sửa** (spec chỉ khai báo
 * properties, không có required). Vì vậy rule `required` được chỉ áp dụng
 * khi tạo mới.
 */
export function CameraFormModal({
  open,
  camera,
  onCancel,
  onSuccess,
}: CameraFormModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<CameraFormValues>()
  const isEdit = Boolean(camera)

  const { data: rooms = [], isLoading: roomsLoading } = useCultivationRooms()

  // Chỉ hiện phòng đang hoạt động — camera treo ở phòng đã ngừng/ngừng bảo
  // trì không có ý nghĩa vận hành.
  const roomOptions = useMemo(() => {
    const active = rooms
      .filter((room) => room.status === 'ACTIVE')
      .map((room) => ({
        value: room.room_id,
        label: `${room.room_code} — ${room.room_name}`,
      }))

    // Camera đang gán phòng đã ngừng/bảo trì sẽ không có trong `active`.
    // Không bù lại option thì Select hiển thị raw số — rất khó đọc.
    if (camera && !active.some((opt) => opt.value === camera.roomId)) {
      return [
        ...active,
        { value: camera.roomId, label: `Phòng #${camera.roomId} (không hoạt động)` },
      ]
    }

    return active
  }, [rooms, camera])

  const registerMutation = useRegisterCamera({
    onSuccess: (created) => {
      message.success(
        created
          ? `Đã đăng ký camera "${created.cameraName}".`
          : 'Đã đăng ký camera.',
      )
      form.resetFields()
      onCancel()
      onSuccess?.(created)
    },
    onError: (err) => message.error(getApiErrorMessage(err)),
  })

  const updateMutation = useUpdateCamera({
    onSuccess: (updated) => {
      message.success(
        updated
          ? `Đã cập nhật camera "${updated.cameraName}".`
          : 'Đã cập nhật camera.',
      )
      form.resetFields()
      onCancel()
      onSuccess?.(updated)
    },
    onError: (err) => message.error(getApiErrorMessage(err)),
  })

  // Sync form values khi mở modal / đổi camera đang sửa
  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      cameraCode: camera?.cameraCode ?? '',
      cameraName: camera?.cameraName ?? '',
      roomId: camera?.roomId ?? undefined,
      streamUrl: camera?.streamUrl ?? '',
      status: camera?.status ?? 'ACTIVE',
    })
  }, [form, open, camera])

  const handleSubmit = (values: CameraFormValues) => {
    // Chuẩn hoá: string rỗng từ Input → null để BE hiểu là "xoá giá trị",
    // không phải "gửi chuỗi rỗng".
    const streamUrl = values.streamUrl?.trim() ? values.streamUrl.trim() : null

    if (camera) {
      const payload: UpdateCameraRequest = {
        cameraCode: values.cameraCode.trim(),
        cameraName: values.cameraName.trim(),
        // PUT khai báo `roomId: integer` (không nullable) → xoá ô thì gửi
        // undefined để field bị bỏ qua, không gửi null.
        roomId: values.roomId ?? undefined,
        streamUrl,
        status: values.status,
      }
      updateMutation.mutate({ id: camera.id, ...payload })
      return
    }

    const payload: CreateCameraRequest = {
      roomId: values.roomId as number,
      cameraCode: values.cameraCode.trim(),
      cameraName: values.cameraName.trim(),
      streamUrl,
      status: values.status,
    }
    registerMutation.mutate(payload)
  }

  return (
    <Modal
      title={isEdit ? `Sửa camera ${camera?.cameraCode}` : 'Thêm camera Imou'}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText={isEdit ? 'Lưu thay đổi' : 'Đăng ký camera'}
      cancelText="Hủy"
      confirmLoading={registerMutation.isPending || updateMutation.isPending}
      destroyOnHidden
      afterClose={() => form.resetFields()}
      width={520}
    >
      <Form<CameraFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={handleSubmit}
      >
        <Form.Item
          label="Tên camera"
          name="cameraName"
          rules={[
            { required: true, message: 'Nhập tên camera.' },
            { max: 120, message: 'Tối đa 120 ký tự.' },
          ]}
        >
          <Input placeholder="VD: Camera hành lang tầng 1" autoComplete="off" />
        </Form.Item>

        <Form.Item
          label="Imou device ID"
          name="cameraCode"
          tooltip="Mã thiết bị trên Imou cloud — dùng để lấy live stream."
          rules={[
            { required: true, message: 'Nhập Imou device ID.' },
            { max: 64, message: 'Tối đa 64 ký tự.' },
          ]}
        >
          <Input placeholder="VD: ABCD1234EFGH" autoComplete="off" />
        </Form.Item>

        <Form.Item
          label="Phòng"
          name="roomId"
          rules={
            isEdit
              ? []
              : [{ required: true, message: 'Chọn phòng chứa camera.' }]
          }
        >
          <Select
            placeholder={roomsLoading ? 'Đang tải danh sách phòng…' : 'Chọn phòng'}
            loading={roomsLoading}
            options={roomOptions}
            allowClear={isEdit}
            showSearch
            optionFilterProp="label"
            notFoundContent="Không có phòng đang hoạt động."
          />
        </Form.Item>

        <Form.Item
          label="Stream URL"
          name="streamUrl"
          tooltip="Tùy chọn — để trống nếu dùng Imou cloud."
          rules={[
            {
              type: 'url',
              message: 'URL không hợp lệ.',
            },
            { max: 500, message: 'Tối đa 500 ký tự.' },
          ]}
        >
          <Input
            placeholder="rtsp://… hoặc https://… (để trống nếu dùng Imou cloud)"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label="Trạng thái"
          name="status"
          rules={[{ required: true, message: 'Chọn trạng thái.' }]}
        >
          <Select options={[...STATUS_OPTIONS]} />
        </Form.Item>
      </Form>
    </Modal>
  )
}