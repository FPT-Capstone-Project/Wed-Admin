import { useEffect, useMemo, useState } from 'react'
import { Cascader, Form, Input, Modal, Select, message } from 'antd'
import { useRoomStore } from '../../rooms/store/room.store'
import { TRAY_STATUS_CONFIG } from '../../rooms/components/tray-status.config'
import { formatFriendlyDeviceLocation } from '../../../shared/i18n/terms'
import type { TierId } from '../../../types/room.types'
import type { Tenant, TenantFormValues } from '../types/tenant.types'

interface TenantFormProps {
  visible: boolean
  onCancel: () => void
  onSubmit: (values: TenantFormValues) => Promise<void>
  initialValues?: Partial<TenantFormValues>
  editingCustomerId?: string
}

type TraySelection = [TierId, string]

interface TenantFormFields extends Omit<TenantFormValues, 'assignedTrayId'> {
  traySelection?: TraySelection
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Đang thuê' },
  { value: 'expired', label: 'Hết hạn' },
] satisfies Array<{ value: Tenant['status']; label: string }>

export function TenantForm({
  visible,
  onCancel,
  onSubmit,
  initialValues,
  editingCustomerId,
}: TenantFormProps) {
  const [form] = Form.useForm<TenantFormFields>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const tiers = useRoomStore((state) => state.tiers)

  const trayOptions = useMemo(
    () =>
      [...tiers]
        .sort((left, right) => left.tierId - right.tierId)
        .map((tier) => ({
          value: tier.tierId,
          label: `${tier.name} · ${formatFriendlyDeviceLocation(tier.nodeId)}`,
          children: tier.trays.map((tray) => {
            const isCurrentCustomer = tray.customerId === editingCustomerId
            const isUnavailable =
              tray.status !== 'empty' || tray.customerId !== null

            return {
              value: tray.id,
              label: `${tray.code} · ${TRAY_STATUS_CONFIG[tray.status].label}`,
              disabled: isUnavailable && !isCurrentCustomer,
            }
          }),
        })),
    [editingCustomerId, tiers],
  )

  useEffect(() => {
    if (!visible) {
      return
    }

    const selectedTray = tiers
      .flatMap((tier) => tier.trays)
      .find((tray) => tray.id === initialValues?.assignedTrayId)

    form.resetFields()
    form.setFieldsValue({
      status: 'active',
      ...initialValues,
      traySelection: selectedTray
        ? [selectedTray.tierId, selectedTray.id]
        : undefined,
    })
  }, [form, initialValues, tiers, visible])

  const handleSubmit = async ({ traySelection, ...values }: TenantFormFields) => {
    if (!traySelection) {
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit({ ...values, assignedTrayId: traySelection[1] })
      form.resetFields()
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : 'Không thể gán khay cho khách thuê.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      title={initialValues ? 'Cập nhật khách thuê' : 'Thêm khách thuê'}
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Lưu"
      cancelText="Hủy"
      confirmLoading={isSubmitting}
      cancelButtonProps={{ disabled: isSubmitting }}
      closable={!isSubmitting}
      maskClosable={!isSubmitting}
      keyboard={!isSubmitting}
      destroyOnHidden
      afterClose={() => form.resetFields()}
    >
      <Form<TenantFormFields>
        form={form}
        layout="vertical"
        requiredMark={false}
        preserve={false}
        onFinish={handleSubmit}
      >
        <Form.Item
          label="Họ tên"
          name="name"
          rules={[
            { required: true, message: 'Vui lòng nhập họ tên khách thuê.' },
            { whitespace: true, message: 'Họ tên không được để trống.' },
          ]}
        >
          <Input placeholder="Nhập họ tên khách thuê" maxLength={100} />
        </Form.Item>

        <Form.Item
          label="Số điện thoại"
          name="phone"
          rules={[
            { required: true, message: 'Vui lòng nhập số điện thoại.' },
            {
              pattern: /^(0|\+84)\d{9,10}$/,
              message: 'Số điện thoại không đúng định dạng.',
            },
          ]}
        >
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Nhập số điện thoại"
            maxLength={14}
          />
        </Form.Item>

        <Form.Item
          label="Tầng → Khay con"
          name="traySelection"
          rules={[
            { required: true, message: 'Vui lòng chọn tầng và khay con.' },
          ]}
        >
          <Cascader
            options={trayOptions}
            placeholder="Chọn tầng, sau đó chọn khay trống"
            showSearch
          />
        </Form.Item>

        <Form.Item
          label="Trạng thái"
          name="status"
          rules={[{ required: true, message: 'Vui lòng chọn trạng thái.' }]}
        >
          <Select options={STATUS_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
