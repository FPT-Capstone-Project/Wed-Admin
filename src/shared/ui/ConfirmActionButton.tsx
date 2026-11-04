import type { ReactNode } from 'react'
import { App } from 'antd'
import { ActionButton, type ActionButtonProps } from './ActionButton'

export interface ConfirmActionButtonProps
  extends Omit<ActionButtonProps, 'onClick'> {
  /** Tiêu đề của hộp thoại xác nhận. */
  title: ReactNode
  /** Nội dung mô tả hậu quả (bắt buộc để user hiểu mình đang xoá gì). */
  content: ReactNode
  /** Nhãn nút xác nhận. */
  okText?: string
  /** Nhãn nút hủy. */
  cancelText?: string
  /** Hành động thực sự khi user xác nhận. */
  onConfirm: () => void | Promise<unknown>
}

/**
 * Nút hành động phá hủy kèm hộp thoại xác nhận **ở giữa màn hình**.
 *
 * ⚠ Vì sao KHÔNG dùng `<Popconfirm>` ở đây?
 *   Popconfirm render popup vào `document.body` → trong bảng có cột
 *   `fixed: 'right'` (dùng `transform`), vị trí popup bị tính sai ⇒ popup
 *   "bay" xuống góc dưới-trái màn hình, tách rời nút bấm. Người dùng
 *   phải di chuột đến chỗ lạ để bấm "Xác nhận" — rất dễ bỏ lỡ / tưởng
 *   popup tự tắt.
 *
 *   → `Modal.confirm({ centered: true })` hiển thị **giữa màn hình**, luôn
 *     nằm trong khung nhìn, bấm được chắc chắn, và không bị ảnh hưởng bởi
 *     `transform` của cột cố định hay `overflow` của bảng.
 *
 * ⚠ Dùng `App.useApp()` (context-aware) thay vì `Modal.confirm` static để
 *   giữ đúng theme + không cảnh báo "Static function can not consume context".
 */
export function ConfirmActionButton({
  title,
  content,
  okText = 'Xác nhận',
  cancelText = 'Hủy',
  onConfirm,
  ...buttonProps
}: ConfirmActionButtonProps) {
  const { modal } = App.useApp()

  const handleClick = () => {
    modal.confirm({
      title,
      content,
      okText,
      cancelText,
      centered: true,
      okButtonProps: { danger: true },
      maskClosable: false,
      onOk: async () => {
        // `onOk` trả promise ⇒ nút "Xác nhận" tự hiện loading + chỉ đóng
        // modal sau khi promise resolve ⇒ user thấy trạng thái rõ ràng.
        await onConfirm()
      },
    })
  }

  return <ActionButton {...buttonProps} onClick={handleClick} />
}
