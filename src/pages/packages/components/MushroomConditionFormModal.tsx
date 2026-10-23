import { useEffect } from 'react'
import { App, Form, InputNumber, Modal, Select } from 'antd'
import type {
  CreateMushroomConditionRequest,
  MushroomCondition,
  UpdateMushroomConditionRequest,
} from '../../../types/mushroom-condition'
import { useMushroomTypes } from '../../../features/packages/hooks/useMushroomTypes'
import {
  useCreateMushroomCondition,
  useUpdateMushroomCondition,
} from '../../../features/packages/hooks/useMushroomConditions'

interface MushroomConditionFormModalProps {
  open: boolean
  initialValues?: MushroomCondition | null
  onCancel: () => void
}

/** Thông số canh tác — 7 range min/max (tất cả optional, ℃/ppm/%/%). */
type FormShape = {
  mushroomTypeId: number
  temperatureMin?: number | null
  temperatureMax?: number | null
  humidityMin?: number | null
  humidityMax?: number | null
  co2Min?: number | null
  co2Max?: number | null
  substrateMoistureMin?: number | null
  substrateMoistureMax?: number | null
}

function toFormShape(item: MushroomCondition): FormShape {
  return {
    mushroomTypeId: item.mushroom_type_id,
    temperatureMin: item.temperature_min,
    temperatureMax: item.temperature_max,
    humidityMin: item.humidity_min,
    humidityMax: item.humidity_max,
    co2Min: item.co2_min,
    co2Max: item.co2_max,
    substrateMoistureMin: item.substrate_moisture_min,
    substrateMoistureMax: item.substrate_moisture_max,
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
    co2Min: values.co2Min ?? null,
    co2Max: values.co2Max ?? null,
    substrateMoistureMin: values.substrateMoistureMin ?? null,
    substrateMoistureMax: values.substrateMoistureMax ?? null,
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
    co2Min: values.co2Min ?? null,
    co2Max: values.co2Max ?? null,
    substrateMoistureMin: values.substrateMoistureMin ?? null,
    substrateMoistureMax: values.substrateMoistureMax ?? null,
  }
}

export function MushroomConditionFormModal({
  open,
  initialValues,
  onCancel,
}: MushroomConditionFormModalProps) {
  const { message: messageApi } = App.useApp()
  const [form] = Form.useForm<FormShape>()
  const createMutation = useCreateMushroomCondition()
  const updateMutation = useUpdateMushroomCondition()

  const { data: varieties = [] } = useMushroomTypes()
  const varietyOptions = varieties.map((v) => ({
    label: v.name,
    value: v.mushroom_type_id,
  }))

  useEffect(() => {
    if (!open) return
    form.resetFields()
    if (initialValues) {
      form.setFieldsValue(toFormShape(initialValues))
    } else {
      form.setFieldsValue({
        mushroomTypeId: varieties[0]?.mushroom_type_id,
        temperatureMin: 18,
        temperatureMax: 24,
        humidityMin: 80,
        humidityMax: 90,
        co2Min: 350,
        co2Max: 500,
        substrateMoistureMin: 55,
        substrateMoistureMax: 70,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, initialValues, open, varieties])

  const handleFinish = async (values: FormShape) => {
    try {
      if (initialValues) {
        await updateMutation.mutateAsync({
          id: initialValues.condition_id,
          payload: formShapeToUpdatePayload(values),
        })
        messageApi.success(
          `Đã cập nhật thông số canh tác cho giống nấm ID ${values.mushroomTypeId}.`,
        )
      } else {
        await createMutation.mutateAsync({
          ...formShapeToCreatePayload(values),
        })
        messageApi.success(
          `Đã thêm thông số canh tác cho giống nấm ID ${values.mushroomTypeId}.`,
        )
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
          ? `Chỉnh sửa thông số canh tác #${initialValues.condition_id}`
          : 'Thêm thông số canh tác'
      }
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Lưu thông số"
      cancelText="Hủy"
      confirmLoading={isSubmitting}
      cancelButtonProps={{ disabled: isSubmitting }}
      closable={!isSubmitting}
      maskClosable={!isSubmitting}
      keyboard={!isSubmitting}
      destroyOnHidden
      width={760}
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
          rules={[
            { required: true, message: 'Vui lòng chọn giống nấm.' },
          ]}
        >
          <Select
            placeholder="Chọn giống nấm"
            options={varietyOptions}
            showSearch
            optionFilterProp="label"
            disabled={Boolean(initialValues)}
          />
        </Form.Item>

        <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
          <Form.Item
            name="temperatureMin"
            rules={[{ type: 'number', min: -10, max: 60 }]}
            style={{ flex: 1, marginBottom: 8 }}
          >
            <InputNumber<number>
              min={-10}
              max={60}
              step={0.5}
              style={{ width: '100%' }}
              placeholder="Tối thiểu"
              addonAfter="℃"
            />
          </Form.Item>
          <Form.Item
            name="temperatureMax"
            rules={[{ type: 'number', min: -10, max: 60 }]}
            style={{ flex: 1, marginBottom: 8 }}
          >
            <InputNumber<number>
              min={-10}
              max={60}
              step={0.5}
              style={{ width: '100%' }}
              placeholder="Tối đa"
              addonAfter="℃"
            />
          </Form.Item>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <Form.Item label="Độ ẩm (%) — Min" name="humidityMin" style={{ marginBottom: 8 }}>
              <InputNumber<number>
                min={0}
                max={100}
                step={1}
                style={{ width: '100%' }}
                addonAfter="%"
              />
            </Form.Item>
            <Form.Item label="Độ ẩm (%) — Max" name="humidityMax" style={{ marginBottom: 8 }}>
              <InputNumber<number>
                min={0}
                max={100}
                step={1}
                style={{ width: '100%' }}
                addonAfter="%"
              />
            </Form.Item>
          </div>

          <div style={{ flex: 1 }}>
            <Form.Item label="CO₂ (ppm) — Min" name="co2Min" style={{ marginBottom: 8 }}>
              <InputNumber<number>
                min={0}
                max={5000}
                step={10}
                style={{ width: '100%' }}
                addonAfter="ppm"
              />
            </Form.Item>
            <Form.Item label="CO₂ (ppm) — Max" name="co2Max" style={{ marginBottom: 8 }}>
              <InputNumber<number>
                min={0}
                max={5000}
                step={10}
                style={{ width: '100%' }}
                addonAfter="ppm"
              />
            </Form.Item>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item
            label="Ẩm giá thể (%) — Min"
            name="substrateMoistureMin"
            style={{ flex: 1, marginBottom: 0 }}
          >
            <InputNumber<number>
              min={0}
              max={100}
              step={1}
              style={{ width: '100%' }}
              addonAfter="%"
            />
          </Form.Item>
          <Form.Item
            label="Ẩm giá thể (%) — Max"
            name="substrateMoistureMax"
            style={{ flex: 1, marginBottom: 0 }}
          >
            <InputNumber<number>
              min={0}
              max={100}
              step={1}
              style={{ width: '100%' }}
              addonAfter="%"
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  )
}
