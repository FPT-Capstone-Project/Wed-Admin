import '../../../styles/catalog-industrial.css'
import { useEffect, useMemo } from 'react'
import { App, Form, InputNumber, Modal, Select } from 'antd'
import type {
  CreateMushroomConditionRequest,
  MushroomCondition,
  UpdateMushroomConditionRequest,
} from '../../../types/mushroom-condition'
import type { MushroomType } from '../../../types/mushroom-type'
import {
  useCreateMushroomCondition,
  useUpdateMushroomCondition,
} from '../../../features/packages/hooks/useMushroomConditions'
import { ActionButton } from '../../../shared/ui'

interface MushroomConditionFormModalProps {
  open: boolean
  /** Condition đang sửa — `null` ⇒ chế độ tạo mới. */
  initialValues?: MushroomCondition | null
  /** Danh sách giống nấm để chọn. */
  mushroomTypes: MushroomType[]
  onCancel: () => void
}

/**
 * Form shape — chỉ 2 chỉ số: **nhiệt độ** và **độ ẩm**.
 *
 * ⚠ Giai đoạn 0: đã gỡ CO₂ (`co2Min/Max`) và độ ẩm giá thể
 * (`substrateMoistureMin/Max`) khỏi BE / DB → không khai báo ở đây.
 */
type FormShape = {
  mushroomTypeId: number
  temperatureMin?: number | null
  temperatureMax?: number | null
  humidityMin?: number | null
  humidityMax?: number | null
}

/** Chuyển record BE (snake_case) → shape của form (camelCase). */
function toFormShape(item: MushroomCondition): FormShape {
  return {
    mushroomTypeId: item.mushroom_type_id,
    temperatureMin: item.temperature_min ?? undefined,
    temperatureMax: item.temperature_max ?? undefined,
    humidityMin: item.humidity_min ?? undefined,
    humidityMax: item.humidity_max ?? undefined,
  }
}

function formShapeToCreatePayload(
  values: FormShape,
): CreateMushroomConditionRequest {
  return {
    mushroomTypeId: values.mushroomTypeId,
    temperatureMin: values.temperatureMin ?? null,
    temperatureMax: values.temperatureMax ?? null,
    humidityMin: values.humidityMin ?? null,
    humidityMax: values.humidityMax ?? null,
  }
}

function formShapeToUpdatePayload(
  values: FormShape,
): UpdateMushroomConditionRequest {
  return {
    mushroomTypeId: values.mushroomTypeId,
    temperatureMin: values.temperatureMin ?? null,
    temperatureMax: values.temperatureMax ?? null,
    humidityMin: values.humidityMin ?? null,
    humidityMax: values.humidityMax ?? null,
  }
}

/**
 * Form tạo / sửa điều kiện sinh trưởng.
 *
 * Gắn trực tiếp API `POST /api/mushroom-conditions` và
 * `PUT /api/mushroom-conditions/{id}`.
 *
 * ⚠ BE chỉ cho phép **1 condition / giống nấm** (UNIQUE) → khi tạo mới,
 * các giống đã có condition bị loại khỏi danh sách chọn.
 */
export function MushroomConditionFormModal({
  open,
  initialValues,
  mushroomTypes,
  onCancel,
}: MushroomConditionFormModalProps) {
  const { message: messageApi } = App.useApp()
  const [form] = Form.useForm<FormShape>()
  const createMutation = useCreateMushroomCondition()
  const updateMutation = useUpdateMushroomCondition()

  const initialFormValues: FormShape = useMemo(
    () =>
      initialValues
        ? toFormShape(initialValues)
        : {
            mushroomTypeId: mushroomTypes[0]?.mushroom_type_id,
            temperatureMin: undefined,
            temperatureMax: undefined,
            humidityMin: undefined,
            humidityMax: undefined,
          },
    [initialValues, mushroomTypes],
  )

  useEffect(() => {
    if (!open) return
    form.setFieldsValue(initialFormValues)
  }, [form, initialFormValues, open])

  const handleFinish = async (values: FormShape) => {
    try {
      if (initialValues) {
        await updateMutation.mutateAsync({
          id: initialValues.condition_id,
          payload: formShapeToUpdatePayload(values),
        })
        messageApi.success('Đã cập nhật điều kiện sinh trưởng.')
      } else {
        await createMutation.mutateAsync(formShapeToCreatePayload(values))
        messageApi.success('Đã thêm điều kiện sinh trưởng.')
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
          ? 'Chỉnh sửa điều kiện sinh trưởng'
          : 'Thêm điều kiện sinh trưởng'
      }
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Lưu điều kiện"
      cancelText="Hủy"
      confirmLoading={isSubmitting}
      cancelButtonProps={{ disabled: isSubmitting }}
      closable={!isSubmitting}
      maskClosable={!isSubmitting}
      keyboard={!isSubmitting}
      destroyOnHidden
      width={680}
      afterClose={() => form.resetFields()}

 className="mcms-package-modal"
 footer={<><ActionButton icon={null} variant="text" label="Hủy" disabled={isSubmitting} onClick={onCancel} /><ActionButton icon={null} variant="primary" label="Lưu điều kiện" loading={isSubmitting} onClick={() => form.submit()} /></>}
    >
      <Form<FormShape>
        form={form}
        layout="vertical"
        requiredMark={false}
        preserve={false}
        onFinish={handleFinish}
      >
        <Form.Item
          label="Giống nấm"
          name="mushroomTypeId"
          rules={[{ required: true, message: 'Vui lòng chọn giống nấm.' }]}
        >
          <Select
            placeholder="— Chọn giống nấm —"
            options={mushroomTypes.map((type) => ({
              value: type.mushroom_type_id,
              label: type.name,
            }))}
          />
        </Form.Item>

        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item
            label="Nhiệt độ tối thiểu (°C)"
            name="temperatureMin"
            style={{ flex: 1, marginBottom: 0 }}
            rules={[{ type: 'number', message: 'Phải là số.' }]}
          >
            <InputNumber<number>
              step={0.5}
              style={{ width: '100%' }}
              placeholder="VD: 20"
              addonAfter="°C"
            />
          </Form.Item>

          <Form.Item
            label="Nhiệt độ tối đa (°C)"
            name="temperatureMax"
            style={{ flex: 1, marginBottom: 0 }}
            rules={[{ type: 'number', message: 'Phải là số.' }]}
          >
            <InputNumber<number>
              step={0.5}
              style={{ width: '100%' }}
              placeholder="VD: 28"
              addonAfter="°C"
            />
          </Form.Item>
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
          <Form.Item
            label="Độ ẩm tối thiểu (%RH)"
            name="humidityMin"
            style={{ flex: 1, marginBottom: 0 }}
            rules={[{ type: 'number', message: 'Phải là số.' }]}
          >
            <InputNumber<number>
              min={0}
              max={100}
              step={1}
              style={{ width: '100%' }}
              placeholder="VD: 80"
              addonAfter="%"
            />
          </Form.Item>

          <Form.Item
            label="Độ ẩm tối đa (%RH)"
            name="humidityMax"
            style={{ flex: 1, marginBottom: 0 }}
            rules={[{ type: 'number', message: 'Phải là số.' }]}
          >
            <InputNumber<number>
              min={0}
              max={100}
              step={1}
              style={{ width: '100%' }}
              placeholder="VD: 90"
              addonAfter="%"
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  )
}
