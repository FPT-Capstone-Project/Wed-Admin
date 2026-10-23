import { SaveOutlined } from '@ant-design/icons'
import { Alert, App, Form, InputNumber, Modal, Row, Col } from 'antd'
import { useEffect } from 'react'
import type { AutoMistingConfiguration } from '../../../types/iot'
import { useFloorConfig, useSaveAutoControlConfig } from '../../../features/devices/hooks/useIoT'

interface AutoThresholdsConfigModalProps {
  floorId: number | null
  floorName: string
  open: boolean
  /** Số sensor đang đọc được — quyết định có cho phép bật AUTO hay không. */
  validSensorCount: number
  onClose: () => void
}

/** Form lưu ngưỡng, đơn vị hiển thị theo nghiệp vụ admin. */
interface AutoThresholdFormValues {
  humidityMin: number
  humidityMax: number
  humidityStartThreshold: number
  humidityStopThreshold: number
  mistingPulseSeconds: number
  cooldownMinutes: number
}

const PULSE_MIN_SEC = 1
const PULSE_MAX_SEC = 600
const COOLDOWN_MIN_MIN = 1
const COOLDOWN_MAX_MIN = 120

/**
 * Cấu hình ngưỡng Auto-misting — `PUT /api/iot/floors/{floorId}/auto-control`.
 *
 * ⚠ API này **không yêu cầu** tầng phải có sensor: chỉ lưu cấu hình. Vì vậy
 * admin có thể cài ngưỡng trước, rồi cắm sensor sau rồi bấm bật AUTO. Đây là
 * điều kiện cần thiết — nếu bắt buộc lưu mới được bật, mọi tầng mới sẽ
 * không cấu hình được gì trước khi lắp phần cứng.
 *
 * Ngược lại, `POST .../auto-control/start` **có** kiểm tra sensor và trả 400
 * nếu chưa đủ — xem `hasSensors` bên dưới.
 */
export function AutoThresholdsConfigModal({
  floorId,
  floorName,
  open,
  validSensorCount,
  onClose,
}: AutoThresholdsConfigModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<AutoThresholdFormValues>()

  const { data: config, isLoading } = useFloorConfig(floorId, { enabled: open })
  const saveConfig = useSaveAutoControlConfig({
    onSuccess: () => {
      message.success(`Đã lưu cấu hình ngưỡng AUTO cho ${floorName}.`)
      onClose()
    },
    onError: (err) => {
      message.error(err.message || 'Không thể lưu cấu hình ngưỡng.')
    },
  })

  // Prefill từ config BE trả về (đổi ms ↔ giây/phút cho khớp đơn vị nhập).
  useEffect(() => {
    if (!open || !config) return
    form.setFieldsValue({
      humidityMin: config.humidity_min,
      humidityMax: config.humidity_max,
      humidityStartThreshold: config.humidity_start_threshold,
      humidityStopThreshold: config.humidity_stop_threshold,
      mistingPulseSeconds: msToSeconds(config.misting_pulse_ms),
      cooldownMinutes: msToMinutes(config.cooldown_ms),
    })
  }, [open, config, form])

  const handleOk = async () => {
    const values = await form.validateFields()

    const payload: AutoMistingConfiguration = {
      ...(config ?? ({} as AutoMistingConfiguration)),
      mushroom_type_id: config?.mushroom_type_id ?? 0,
      humidity_min: values.humidityMin,
      humidity_max: values.humidityMax,
      humidity_start_threshold: values.humidityStartThreshold,
      humidity_stop_threshold: values.humidityStopThreshold,
      misting_pulse_ms: values.mistingPulseSeconds * 1000,
      cooldown_ms: values.cooldownMinutes * 60_000,
      // Giữ nguyên các tham số an toàn (giới hạn tần suất) của BE.
      evaluation_interval_ms: config?.evaluation_interval_ms ?? 300_000,
      max_sensor_spread_percent: config?.max_sensor_spread_percent ?? 10,
      max_activations_per_hour: config?.max_activations_per_hour ?? 12,
      max_cumulative_on_ms_per_hour:
        config?.max_cumulative_on_ms_per_hour ?? 600_000,
      profile_name: config?.profile_name ?? null,
      profile_approved: config?.profile_approved,
    }

    await saveConfig.mutateAsync({ floorId: floorId as number, payload })
  }

  return (
    <Modal
      title={`Cấu hình ngưỡng Auto · ${floorName}`}
      open={open}
      onCancel={onClose}
      onOk={() => void handleOk()}
      okText="Lưu cấu hình ngưỡng Auto"
      cancelText="Hủy"
      okButtonProps={{ icon: <SaveOutlined /> }}
      confirmLoading={saveConfig.isPending}
      loading={isLoading}
      width={640}
      centered
      destroyOnHidden
      afterClose={() => form.resetFields()}
    >
      {/* Điểm mấu chốt yêu cầu 3: cho phép lưu ngưỡng khi chưa có sensor. */}
      {validSensorCount === 0 && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Tầng chưa có sensor — vẫn có thể lưu cấu hình."
          description="Bạn có thể cài ngưỡng trước, lắp sensor sau rồi bấm 'Bắt đầu AUTO'. Lưu cấu hình không yêu cầu có sensor."
        />
      )}

      <Form<AutoThresholdFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Độ ẩm dưới ngưỡng bật sẽ kích hoạt phun sương; đạt ngưỡng dừng sẽ tắt."
        />

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="Độ ẩm tối thiểu (%RH)"
              name="humidityMin"
              rules={[
                { required: true, message: 'Nhập độ ẩm tối thiểu.' },
                { type: 'number', min: 0, max: 100, message: 'Khoảng 0–100.' },
              ]}
            >
              <InputNumber min={0} max={100} precision={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Độ ẩm tối đa (%RH)"
              name="humidityMax"
              rules={[
                { required: true, message: 'Nhập độ ẩm tối đa.' },
                { type: 'number', min: 0, max: 100, message: 'Khoảng 0–100.' },
                {
                  validator: (_, value: number | undefined) =>
                    form.getFieldValue('humidityMin') < (value ?? 100)
                      ? Promise.resolve()
                      : Promise.reject(
                          new Error('Độ ẩm tối đa phải lớn hơn tối thiểu.'),
                        ),
                },
              ]}
            >
              <InputNumber min={0} max={100} precision={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="Bật phun khi ≤ (%RH)"
              name="humidityStartThreshold"
              rules={[
                { required: true, message: 'Nhập ngưỡng bật.' },
                { type: 'number', min: 0, max: 100, message: 'Khoảng 0–100.' },
              ]}
              extra="Khi độ ẩm tụt xuống ngưỡng này, máy bơm bật."
            >
              <InputNumber min={0} max={100} precision={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Tắt phun khi ≥ (%RH)"
              name="humidityStopThreshold"
              rules={[
                { required: true, message: 'Nhập ngưỡng tắt.' },
                { type: 'number', min: 0, max: 100, message: 'Khoảng 0–100.' },
                {
                  validator: (_, value: number | undefined) =>
                    (form.getFieldValue('humidityStartThreshold') ?? 0) <
                    (value ?? 100)
                      ? Promise.resolve()
                      : Promise.reject(
                          new Error('Ngưỡng tắt phải lớn hơn ngưỡng bật.'),
                        ),
                },
              ]}
            >
              <InputNumber min={0} max={100} precision={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="Thời gian mỗi đợt phun (giây)"
              name="mistingPulseSeconds"
              rules={[
                { required: true, message: 'Nhập thời gian phun.' },
                {
                  type: 'number',
                  min: PULSE_MIN_SEC,
                  max: PULSE_MAX_SEC,
                  message: `Khoảng ${PULSE_MIN_SEC}–${PULSE_MAX_SEC} giây.`,
                },
              ]}
            >
              <InputNumber
                min={PULSE_MIN_SEC}
                max={PULSE_MAX_SEC}
                precision={0}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Khoảng nghỉ giữa các đợt (phút)"
              name="cooldownMinutes"
              rules={[
                { required: true, message: 'Nhập khoảng nghỉ.' },
                {
                  type: 'number',
                  min: COOLDOWN_MIN_MIN,
                  max: COOLDOWN_MAX_MIN,
                  message: `Khoảng ${COOLDOWN_MIN_MIN}–${COOLDOWN_MAX_MIN} phút.`,
                },
              ]}
            >
              <InputNumber
                min={COOLDOWN_MIN_MIN}
                max={COOLDOWN_MAX_MIN}
                precision={0}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  )
}

function msToSeconds(ms: number) {
  return Math.max(1, Math.round(ms / 1000))
}

function msToMinutes(ms: number) {
  return Math.max(1, Math.round(ms / 60_000))
}