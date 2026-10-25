import { useEffect, useMemo, useRef, useState } from 'react'
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
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
import { StatusBadge } from '../../../shared/ui'

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

function formShapeToCreatePayload(
  values: FormShape,
  image: File | null,
): CreateMushroomTypeFormPayload {
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

interface MushroomImageFieldProps {
  /** URL ảnh đang lưu trên server (để preview khi sửa). */
  initialImageUrl: string | null
  /** Báo lên parent file ảnh mới (null = xoá ảnh / giữ ảnh cũ). */
  onFileChange: (file: File | null) => void
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/**
 * Ô chọn ảnh giống nấm.
 *
 * Tách riêng khỏi form chính để state ảnh (preview + cờ "ảnh mới") được
 * khởi tạo lại bằng `key` remount mỗi lần mở modal — không cần `useEffect`
 * gọi setState (tránh cascading render theo khuyến nghị React).
 */
function MushroomImageField({
  initialImageUrl,
  onFileChange,
}: MushroomImageFieldProps) {
  const { message: messageApi } = App.useApp()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // null = chưa có preview (hiện dropzone)
  // string = dataURL của ảnh mới user vừa chọn
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(
    initialImageUrl,
  )
  // true = ảnh đang xem là ảnh MỚI (chưa lưu), false = ảnh cũ từ server
  const [isUserPick, setIsUserPick] = useState(false)

  const handlePickFile = (file: File | null) => {
    if (!file) return
    if (file.size > MAX_IMAGE_BYTES) {
      messageApi.error('Kích thước ảnh tối đa 5MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImagePreviewUrl(ev.target?.result as string)
      setIsUserPick(true)
    }
    reader.readAsDataURL(file)
    onFileChange(file)
  }

  const handleClearImage = () => {
    setImagePreviewUrl(null)
    setIsUserPick(false)
    onFileChange(null)
  }

  return (
    <>
      {/* Input file ẩn — dùng ref để mở picker khi bấm nút */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          handlePickFile(file)
          // Reset value để chọn lại cùng file vẫn fire onChange.
          e.target.value = ''
        }}
      />

      {imagePreviewUrl ? (
        <div
          style={{
            position: 'relative',
            border: '1px solid var(--mcms-border)',
            borderRadius: 'var(--mcms-radius-lg)',
            overflow: 'hidden',
            background: 'var(--mcms-background)',
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
              background: 'var(--mcms-surface)',
            }}
          />
          <Space
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'color-mix(in srgb, var(--mcms-surface) 92%, transparent)',
              borderRadius: 'var(--mcms-radius-md)',
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
              onClick={handleClearImage}
            >
              Xoá ảnh
            </Button>
          </Space>
          {isUserPick && (
            <StatusBadge
              tone="info"
              label="Ảnh mới — sẽ lưu khi bấm 'Lưu giống nấm'"
              className="mcms-image-pending-badge"
            />
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
            border: '1px dashed var(--mcms-border-strong)',
            borderRadius: 'var(--mcms-radius-lg)',
            padding: '32px 16px',
            textAlign: 'center',
            background: 'var(--mcms-background)',
            cursor: 'pointer',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 32,
              color: 'var(--mcms-text-muted)',
            }}
          >
            <InboxOutlined />
          </p>
          <p style={{ margin: '8px 0 0', fontWeight: 500 }}>
            Kéo thả hoặc click để chọn ảnh
          </p>
          <p
            style={{
              margin: '4px 0 0',
              color: 'var(--mcms-text-muted)',
              fontSize: 12,
            }}
          >
            Hỗ trợ JPG, PNG, WebP — tối đa 5MB
          </p>
        </div>
      )}
    </>
  )
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

  /**
   * File ảnh mới để gửi lên BE.
   * Dùng `ref` (không phải state) vì chỉ cần đọc lúc submit — tránh
   * render lại không cần thiết và tránh setState trong effect.
   */
  const imageFileRef = useRef<File | null>(null)

  const editingKey = initialValues?.mushroom_type_id
  const initialFormValues: FormShape = useMemo(
    () =>
      initialValues
        ? toFormShape(initialValues)
        : {
            name: '',
            description: '',
            growingDays: 30,
            price: 50_000,
          },
    [initialValues],
  )

  // Nạp dữ liệu vào Form mỗi khi mở modal / đổi giống nấm.
  // KHÔNG dựa vào prop `initialValues` của <Form> vì nó chỉ áp dụng ở lần mount
  // đầu tiên; các lần mở sau store còn giá trị cũ hoặc đã bị clear.
  useEffect(() => {
    if (!open) return
    form.setFieldsValue(initialFormValues)
  }, [form, initialFormValues, open])

  const handleFinish = async (values: FormShape) => {
    const image = imageFileRef.current
    try {
      if (initialValues) {
        await updateMutation.mutateAsync({
          id: initialValues.mushroom_type_id,
          payload: formShapeToUpdatePayload(values, image),
        })
        messageApi.success(`Đã cập nhật giống nấm "${values.name}".`)
      } else {
        await createMutation.mutateAsync(
          formShapeToCreatePayload(values, image),
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

  /**
   * Key remount cho ô chọn ảnh: đổi khi mở/đóng modal hoặc đổi giống nấm
   * → state ảnh (preview + cờ "ảnh mới") luôn sạch mỗi lần mở.
   */
  const imageFieldKey = `${editingKey ?? 'new'}-${open ? 'open' : 'closed'}`

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
        imageFileRef.current = null
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
                value != null
                  ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                  : ''
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
          <MushroomImageField
            key={imageFieldKey}
            initialImageUrl={initialValues?.image_url ?? null}
            onFileChange={(file) => {
              imageFileRef.current = file
            }}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
