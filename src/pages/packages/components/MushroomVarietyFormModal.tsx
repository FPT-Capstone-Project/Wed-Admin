import { useEffect, useRef, useState } from 'react'
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Tag,
} from 'antd'
import { DeleteOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons'
import type {
  CreateMushroomTypeFormPayload,
  MushroomType,
  UpdateMushroomTypeFormPayload,
} from '../../../types/mushroom-type'
import {
  useCreateMushroomType,
  useUpdateMushroomType,
} from '../../../features/packages/hooks/useMushroomTypes'

interface MushroomVarietyFormModalProps {
  open: boolean
  initialValues?: MushroomType | null
  onCancel: () => void
}

/**
 * Form shape — KHỚP 1:1 với `CreateMushroomTypeRequest` của backend:
 *   - name (required)
 *   - description (optional)
 *   - growingDays (required, integer)
 *   - price (required, number)
 *   - imageUrl (optional, string — URL ảnh cũ để preview)
 *   - status (optional, default 'ACTIVE')
 *
 * BE nhận multipart/form-data. Upload file riêng qua `image` (File),
 * các field text qua JSON part.
 */
type FormShape = {
  name: string
  description?: string
  growingDays: number
  price: number
}

const DEFAULT_STATUS = 'ACTIVE' as const

function toFormShape(item: MushroomType): FormShape {
  return {
    name: item.name,
    description: item.description ?? '',
    growingDays: Number(item.growing_days),
    price: Number(item.price),
  }
}

function formShapeToCreatePayload(values: FormShape, image: File | null): CreateMushroomTypeFormPayload {
  return {
    values: {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      growingDays: values.growingDays,
      price: values.price,
      status: DEFAULT_STATUS,
    },
    image: image,
  }
}

/**
 * Xây payload update. Nếu user chọn ảnh mới thì gửi file; nếu không
 * chọn (giữ nguyên) thì không gửi gì về ảnh → BE giữ ảnh cũ.
 */
function formShapeToUpdatePayload(
  values: FormShape,
  image: File | null,
): UpdateMushroomTypeFormPayload {
  return {
    values: {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      growingDays: values.growingDays,
      price: values.price,
    },
    image: image,
  }
}

export function MushroomVarietyFormModal({
  open,
  initialValues,
  onCancel,
}: MushroomVarietyFormModalProps) {
  const { message: messageApi } = App.useApp()
  const [form] = Form.useForm<FormShape>()
  const createMutation = useCreateMushroomType()
  const updateMutation = useUpdateMushroomType()

  // File upload state — truyền riêng qua FormData (multipart)
  const [imageFile, setImageFile] = useState<File | null>(null)
  // URL ảnh HIỆN ĐANG xem trong modal:
  //   = null            → chưa có ảnh (hiện dropzone)
  //   = string (URL)    → ảnh cũ từ server
  //   = string (dataURL) → ảnh mới user vừa chọn
  // Phân biệt nguồn bằng cờ `isUserPick`: false = từ initialValues, true = user vừa upload.
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [isUserPick, setIsUserPick] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const editingKey = initialValues?.mushroom_type_id
  const initialFormValues: FormShape = initialValues
    ? toFormShape(initialValues)
    : {
        name: '',
        description: '',
        growingDays: 30,
        price: 50_000,
      }

  // Nạp dữ liệu vào Form mỗi khi mở modal / đổi giống nấm.
  // KHÔNG dựa vào prop `initialValues` của <Form> vì nó chỉ áp dụng ở lần mount
  // đầu tiên; các lần mở sau store còn giá trị cũ hoặc đã bị clear.
  useEffect(() => {
    if (!open) return
    form.setFieldsValue(initialFormValues)
    setImageFile(null)
    setIsUserPick(false)
    setImagePreviewUrl(initialValues?.image_url ?? null)
  }, [editingKey, open])

  const handleFinish = async (values: FormShape) => {
    try {
      if (initialValues) {
        await updateMutation.mutateAsync({
          id: initialValues.mushroom_type_id,
          payload: formShapeToUpdatePayload(values, imageFile),
        })
        messageApi.success(`Đã cập nhật giống nấm "${values.name}".`)
      } else {
        await createMutation.mutateAsync(
          formShapeToCreatePayload(values, imageFile),
        )
        messageApi.success(`Đã thêm giống nấm "${values.name}".`)
      }
      onCancel()
    } catch (err) {
      messageApi.error(
        err instanceof Error ? err.message : 'Lỗi không xác định.',
      )
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <Modal
      title={
        initialValues
          ? `Chỉnh sửa giống nấm: ${initialValues.name}`
          : 'Thêm giống nấm mới'
      }
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Lưu giống nấm"
      cancelText="Hủy"
      confirmLoading={isSubmitting}
      cancelButtonProps={{ disabled: isSubmitting }}
      closable={!isSubmitting}
      maskClosable={!isSubmitting}
      keyboard={!isSubmitting}
      width={680}
      afterClose={() => {
        form.resetFields()
        setImageFile(null)
        setImagePreviewUrl(null)
        setIsUserPick(false)
      }}
    >
      <Form<FormShape>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={handleFinish}
      >
        <Form.Item
          label="Tên giống nấm"
          name="name"
          rules={[
            { required: true, message: 'Vui lòng nhập tên giống nấm.' },
            { whitespace: true, message: 'Tên không được để trống.' },
            { max: 120, message: 'Tên tối đa 120 ký tự.' },
          ]}
        >
          <Input placeholder="VD: Nấm Bào Ngư Xám" maxLength={120} />
        </Form.Item>

        <Form.Item
          label="Mô tả"
          name="description"
          rules={[
            { whitespace: true, message: 'Mô tả không được để trống.' },
            { max: 500, message: 'Mô tả tối đa 500 ký tự.' },
          ]}
        >
          <Input.TextArea
            rows={2}
            placeholder="VD: Giống PN-01, phù hợp khí hậu 22–28°C, ẩm 80–90%."
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Space.Compact block style={{ display: 'flex', gap: 16 }}>
          <Form.Item
            label="Thời gian sinh trưởng (ngày)"
            name="growingDays"
            rules={[
              { required: true, message: 'Vui lòng nhập số ngày.' },
              { type: 'number', min: 1, message: 'Số ngày phải ≥ 1.' },
              { type: 'number', max: 365, message: 'Số ngày phải ≤ 365.' },
            ]}
            style={{ flex: 1, marginBottom: 0 }}
            tooltip="Số ngày từ khi cấy phôi đến khi thu hoạch."
          >
            <InputNumber<number>
              min={1}
              max={365}
              step={1}
              precision={0}
              style={{ width: '100%' }}
              placeholder="VD: 30"
              addonAfter="ngày"
            />
          </Form.Item>

          <Form.Item
            label="Đơn giá phôi / khay"
            name="price"
            rules={[
              { required: true, message: 'Vui lòng nhập đơn giá.' },
              { type: 'number', min: 0, message: 'Đơn giá phải ≥ 0.' },
            ]}
            style={{ flex: 1, marginBottom: 0 }}
            tooltip="Đơn giá cho 1 khay phôi giống (VND)."
          >
            <InputNumber<number>
              min={0}
              step={10_000}
              precision={0}
              style={{ width: '100%' }}
              placeholder="VD: 120000"
              addonAfter="VND"
              formatter={(value) =>
                value != null ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
              }
              parser={(value) => {
                const raw = (value ?? '').replace(/[^\d]/g, '')
                const parsed = Number(raw)
                return Number.isFinite(parsed) ? parsed : 0
              }}
            />
          </Form.Item>
        </Space.Compact>

        <Form.Item
          label="Hình ảnh giống nấm"
          tooltip="Chọn file ảnh từ máy tính (JPG, PNG, WebP, tối đa 5MB). Để trống sẽ dùng ảnh mặc định."
          style={{ marginTop: 16 }}
        >
          {/* Input file ẩn — dùng ref để mở picker khi bấm nút */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const MAX = 5 * 1024 * 1024
              if (file.size > MAX) {
                messageApi.error('Kích thước ảnh tối đa 5MB.')
                return
              }
              setImageFile(file)
              setIsUserPick(true)
              const reader = new FileReader()
              reader.onload = (ev) => {
                setImagePreviewUrl(ev.target?.result as string)
              }
              reader.readAsDataURL(file)
              // Reset value để chọn lại cùng file vẫn fire onChange.
              e.target.value = ''
            }}
          />

          {imagePreviewUrl ? (
            <div
              style={{
                position: 'relative',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                overflow: 'hidden',
                background: '#f8fafc',
              }}
            >
              <img
                src={imagePreviewUrl}
                alt="preview"
                style={{
                  display: 'block',
                  width: '100%',
                  maxHeight: 280,
                  objectFit: 'contain',
                  background: '#fff',
                }}
              />
              <Space
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: 'rgba(255,255,255,0.92)',
                  borderRadius: 6,
                  padding: 4,
                }}
              >
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<PlusOutlined />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Đổi ảnh
                </Button>
                <Button
                  size="small"
                  danger
                  ghost
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    setImageFile(null)
                    setImagePreviewUrl(null)
                    setIsUserPick(false)
                  }}
                >
                  Xoá ảnh
                </Button>
              </Space>
              {isUserPick && (
                <Tag
                  color="processing"
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    left: 8,
                  }}
                >
                  Ảnh mới — sẽ lưu khi bấm "Lưu giống nấm"
                </Tag>
              )}
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  fileInputRef.current?.click()
                }
              }}
              style={{
                border: '1px dashed #cbd5e1',
                borderRadius: 8,
                padding: '32px 16px',
                textAlign: 'center',
                background: '#f8fafc',
                cursor: 'pointer',
              }}
            >
              <p style={{ margin: 0, fontSize: 32, color: '#94a3b8' }}>
                <InboxOutlined />
              </p>
              <p style={{ margin: '8px 0 0', fontWeight: 500 }}>
                Kéo thả hoặc click để chọn ảnh
              </p>
              <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 12 }}>
                Hỗ trợ JPG, PNG, WebP — tối đa 5MB
              </p>
            </div>
          )}
        </Form.Item>
      </Form>
    </Modal>
  )
}
