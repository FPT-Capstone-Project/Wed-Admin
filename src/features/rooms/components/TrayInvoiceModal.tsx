import {
  CarOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  EnvironmentOutlined,
  PrinterOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Descriptions,
  Divider,
  Form,
  InputNumber,
  Modal,
  Radio,
  Tag,
  Typography,
} from 'antd'
import { useState } from 'react'
import type {
  TrayClosureOutcome,
  TrayRental,
} from '../../../types/room.types'
import { formatRentalDate, formatVnd } from '../utils/tray-rental.utils'
import { formatDecimal } from '../../../shared/utils/number-format'

export type InvoiceMode = Extract<
  TrayClosureOutcome,
  'EARLY_HARVEST' | 'ON_TIME_HARVEST'
>

interface TrayInvoiceModalProps {
  batchId: string
  trayId: string
  rental: TrayRental
  harvestDate: Date
  mode: InvoiceMode
  reason: string
  onCancel: () => void
  onComplete: (actualHarvestWeightKg: number) => Promise<void>
}

type DeliveryOption = 'DELIVER' | 'PICKUP'

interface HarvestFormValues {
  actualHarvestWeightKg: number
  deliveryOption: DeliveryOption
}

const MODE_LABELS: Record<InvoiceMode, string> = {
  EARLY_HARVEST: 'Thu hoạch sớm',
  ON_TIME_HARVEST: 'Thu hoạch đúng hạn',
}

export function TrayInvoiceModal({
  batchId,
  trayId,
  rental,
  harvestDate,
  mode,
  reason,
  onCancel,
  onComplete,
}: TrayInvoiceModalProps) {
  const [form] = Form.useForm<HarvestFormValues>()
  const [isCompleting, setIsCompleting] = useState(false)

  const watchedWeight = Form.useWatch('actualHarvestWeightKg', form)
  const watchedDelivery = Form.useWatch('deliveryOption', form) ?? 'DELIVER'

  const harvestDays = Math.max(
    1,
    Math.round(
      (new Date(harvestDate).getTime() -
        new Date(rental.startDate).getTime()) /
        (24 * 60 * 60 * 1000),
    ),
  )

  const handleComplete = async (values: HarvestFormValues) => {
    setIsCompleting(true)
    try {
      await onComplete(values.actualHarvestWeightKg)
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <Modal
      className="tray-invoice-modal"
      title={
        <span className="tray-dialog-title">

          Thu hoạch &amp; Bàn giao · {batchId} · {trayId}
        </span>
      }
      open
      onCancel={onCancel}
      width={680}
      centered
      closable={!isCompleting}
      mask={{ closable: !isCompleting }}
      keyboard={!isCompleting}
      footer={
        <div className="invoice-modal-footer">
          <Button onClick={onCancel} disabled={isCompleting}>
            Đóng
          </Button>
          <Button
            icon={<PrinterOutlined />}
            disabled={isCompleting}
            onClick={() => window.print()}
          >
            In / Tải hóa đơn
          </Button>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={isCompleting}
            onClick={() => form.submit()}
          >
            Xác nhận bàn giao &amp; Giải phóng khay
          </Button>
        </div>
      }
    >
      <Form<HarvestFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          actualHarvestWeightKg: undefined,
          deliveryOption: 'DELIVER',
        }}
        onFinish={(values) => void handleComplete(values)}
      >
        <Form.Item
          name="actualHarvestWeightKg"
          label="Cân nặng thực tế thu hoạch (kg)"
          extra="Cân toàn bộ nấm sau khi thu hoạch và nhập số liệu thực tế."
          rules={[
            { required: true, message: 'Vui lòng nhập cân nặng thực tế.' },
            {
              type: 'number',
              min: 0.01,
              max: 999.99,
              message: 'Cân nặng phải từ 0,01 đến 999,99 kg.',
            },
          ]}
        >
          <InputNumber<number>
            className="harvest-weight-input"
            min={0.01}
            max={999.99}
            step={0.1}
            precision={2}
            inputMode="decimal"
            placeholder="Ví dụ: 3,5"
            suffix="kg"
            prefix={<DashboardOutlined aria-hidden="true" />}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name="deliveryOption"
          label="Phương thức giao nhận"
          rules={[{ required: true }]}
        >
          <Radio.Group
            className="invoice-delivery-options"
            aria-label="Chọn phương thức giao nhận"
          >
            <Radio.Button value="DELIVER" className="invoice-delivery-option">
              <CarOutlined aria-hidden="true" />
              <span>
                <strong>Giao tận nhà</strong>
                <small>Theo địa chỉ khách đã đăng ký</small>
              </span>
            </Radio.Button>
            <Radio.Button value="PICKUP" className="invoice-delivery-option">
              <ShopOutlined aria-hidden="true" />
              <span>
                <strong>Khách tự đến hái</strong>
                <small>Tại trại nuôi trồng</small>
              </span>
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        {watchedDelivery === 'DELIVER' && (
          <Alert
            type="info"
            showIcon
            icon={<EnvironmentOutlined />}
            title={
              <span>
                Giao đến:{' '}
                <strong>{rental.tenantAddress}</strong>
              </span>
            }
            style={{ marginBottom: 16 }}
          />
        )}
      </Form>

      {/* ── Preview hóa đơn bàn giao ────────────────────────── */}
      <div className="invoice-preview" id="tray-invoice-print-area">
        <div className="invoice-preview-header">
          <div>
            <span className="invoice-brand">MCMS · SMART FARM</span>
            <Typography.Title level={4}>PHIẾU BÀN GIAO THU HOẠCH</Typography.Title>
            <Typography.Text type="secondary">
              Mã mẻ {batchId} · Khay {trayId} ·{' '}
              {MODE_LABELS[mode]}
            </Typography.Text>
          </div>
          <Tag color="success">{MODE_LABELS[mode]}</Tag>
        </div>

        <Descriptions
          className="invoice-info-table"
          column={{ xs: 1, sm: 2 }}
          size="small"
        >
          <Descriptions.Item label="Khách hàng">
            <strong>{rental.tenantName}</strong>
          </Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">
            {rental.tenantPhone}
          </Descriptions.Item>
          <Descriptions.Item label="Loại nấm">
            {rental.mushroomType} · {rental.mushroomVariety}
          </Descriptions.Item>
          <Descriptions.Item label="Thời gian nuôi">
            {harvestDays} ngày ({formatRentalDate(rental.startDate)} –{' '}
            {formatRentalDate(harvestDate)})
          </Descriptions.Item>
          <Descriptions.Item label="Phương thức giao">
            {watchedDelivery === 'DELIVER' ? (
              <span>
                <CarOutlined aria-hidden="true" /> Giao tận nhà
              </span>
            ) : (
              <span>
                <ShopOutlined aria-hidden="true" /> Khách tự đến hái
              </span>
            )}
          </Descriptions.Item>
          {watchedDelivery === 'DELIVER' && (
            <Descriptions.Item label="Địa chỉ giao">
              {rental.tenantAddress}
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider className="invoice-divider" />

        <div className="invoice-settlement">
          <div className="invoice-settlement-row">
            <span>Tiền gói thuê chuẩn</span>
            <span>
              {formatVnd(rental.basePrice)}
              <small> (Đã thanh toán)</small>
            </span>
          </div>
          <div className="invoice-settlement-row invoice-settlement-row--highlight">
            <strong>Sản lượng thực tế bàn giao</strong>
            <strong className="invoice-harvest-weight">
              {typeof watchedWeight === 'number'
                ? `${formatDecimal(watchedWeight, 3, 0)} kg`
                : '— kg'}
            </strong>
          </div>
        </div>

        <div className="invoice-note">
          <strong>Ghi chú nghiệp vụ</strong>
          <span>{reason}</span>
          <small>
            Hóa đơn tài chính sẽ được tạo và đối soát tại module
            Kế toán/Hóa đơn.
          </small>
        </div>
      </div>
    </Modal>
  )
}
