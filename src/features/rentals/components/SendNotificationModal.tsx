import { useEffect, useState } from 'react'
import { Alert, App, Form, Input, Modal, Select } from 'antd'
import { extractApiError, getApiErrorMessage } from '../../../shared/api/error'
import { useSendRentalNotification } from '../hooks/useRentals'
import type { RentalNotificationType } from '../types/rental.types'

interface SendNotificationModalProps {
  rentalId: number
  /** Tên khách thuê — hiển thị cho người vận hành để khỏi gửi nhầm. */
  customerName?: string
  open: boolean
  onClose: () => void
}

interface NotificationFormValues {
  notification_type: RentalNotificationType
  title?: string
  message: string
}

/**
 * Đúng 3 giá trị BE chấp nhận — `notification.service.js` (`NOTIFICATION_TYPES`).
 * Gửi giá trị khác (vd `RENTAL_UPDATE`) sẽ bị BE trả 400.
 */
const TYPE_OPTIONS: Array<{ value: RentalNotificationType; label: string }> = [
  { value: 'OPERATOR_MESSAGE', label: 'Thông báo từ vận hành' },
  { value: 'MUSHROOM_DISEASE', label: 'Cảnh báo nấm bệnh' },
  { value: 'DEVICE_ISSUE', label: 'Sự cố thiết bị' },
]

/** Tiêu đề mặc định — trùng `DEFAULT_NOTIFICATION_TITLE` của BE. */
const DEFAULT_TITLE = 'Thông báo từ SmartMush Farm'

/**
 * Gửi thông báo cho khách thuê — `POST /api/rentals/admin/:rentalId/notifications`.
 *
 * BE tự suy ra người nhận từ `rental.user_id` (admin không chọn tay được).
 * Giới hạn: message ≤ 1000, title ≤ 100 ký tự.
 *
 * ⚠ BE trả 409 khi vụ thuê đã đóng (COMPLETED/CANCELLED) hoặc tài khoản
 * khách không còn ACTIVE → hiển thị lỗi ngay trong modal (Alert) để người
 * vận hành thấy và sửa, thay vì chỉ có toast biến mất.
 */
export function SendNotificationModal({
  rentalId,
  customerName,
  open,
  onClose,
}: SendNotificationModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<NotificationFormValues>()
  /** Lỗi API hiển thị trong modal — giữ nguyên form để người dùng sửa lại. */
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const sendMutation = useSendRentalNotification({
    onSuccess: () => {
      message.success(`Đã gửi thông báo tới ${customerName ?? 'khách thuê'}.`)
      form.resetFields()
      onClose()
    },
  })

  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      notification_type: 'OPERATOR_MESSAGE',
      title: DEFAULT_TITLE,
      message: '',
    })
  }, [form, open])

  /**
   * Chuyển lỗi axios/BE thành thông điệp tiếng Việt để hiện trong Alert.
   * 409 là case nghiệp vụ dễ gặp nhất nên diễn đạt rõ thay vì trả message
   * kỹ thuật của axios ("Request failed with status code 409").
   */
  const describeError = (error: unknown): string => {
    const { status } = extractApiError(error)

    if (status === 409) {
      return 'Vụ thuê đã kết thúc hoặc tài khoản khách thuê không còn hoạt động — không thể gửi thông báo.'
    }

    if (status === 404) {
      return 'Không tìm thấy vụ thuê. Vui lòng tải lại trang rồi thử lại.'
    }

    if (status === 403) {
      return 'Bạn không có quyền gửi thông báo cho vụ thuê này.'
    }

    return getApiErrorMessage(error)
  }

  const handleOk = async () => {
    let values: NotificationFormValues
    try {
      values = await form.validateFields()
    } catch {
      // validateFields reject khi form sai → AntD tự hiện lỗi field.
      return
    }

    setErrorMessage(null)

    const title = values.title?.trim()

    try {
      await sendMutation.mutateAsync({
        rentalId,
        payload: {
          notification_type: values.notification_type,
          // `title` optional: để trống → bỏ hẳn khỏi payload để BE dùng
          // default, vì BE trả 400 nếu nhận title rỗng.
          ...(title ? { title } : {}),
          message: values.message.trim(),
        },
      })
    } catch (error) {
      // Bắt lỗi ở đây để không có unhandled promise rejection, và để người
      // dùng thấy lỗi ngay trong modal thay vì chỉ có toast.
      setErrorMessage(describeError(error))
    }
  }

  return (
    <Modal
      title="Gửi thông báo cho khách thuê"
      open={open}
      onCancel={() => {
        form.resetFields()
        setErrorMessage(null)
        onClose()
      }}
      onOk={() => void handleOk()}
      okText="Gửi thông báo"
      cancelText="Huỷ"
      confirmLoading={sendMutation.isPending}
      cancelButtonProps={{ disabled: sendMutation.isPending }}
      destroyOnHidden
      width={560}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={`Người nhận: ${customerName ?? 'khách thuê của vụ thuê'}`}
      />

      {errorMessage && (
        <Alert
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          message="Không gửi được thông báo"
          description={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}

      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="notification_type"
          label="Loại thông báo"
          rules={[{ required: true, message: 'Vui lòng chọn loại thông báo.' }]}
        >
          <Select options={TYPE_OPTIONS} />
        </Form.Item>

        <Form.Item
          name="title"
          label="Tiêu đề"
          tooltip="Bỏ trống để dùng tiêu đề mặc định của hệ thống."
          rules={[{ max: 100, message: 'Tiêu đề tối đa 100 ký tự.' }]}
        >
          <Input maxLength={100} showCount placeholder={DEFAULT_TITLE} />
        </Form.Item>

        <Form.Item
          name="message"
          label="Nội dung"
          rules={[
            { required: true, message: 'Vui lòng nhập nội dung.' },
            { whitespace: true, message: 'Nội dung không được để trống.' },
            { max: 1000, message: 'Nội dung tối đa 1000 ký tự.' },
          ]}
        >
          <Input.TextArea
            rows={5}
            maxLength={1000}
            showCount
            placeholder="Nhắn cho khách biết giai đoạn canh tác hiện tại và những việc cần họ phối hợp."
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
