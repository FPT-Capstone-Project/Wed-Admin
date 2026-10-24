import { SaveOutlined } from '@ant-design/icons'
import { Alert, App, Form, InputNumber, Modal, Row, Col, Select } from 'antd'
import { useEffect } from 'react'
import type { AutoMistingConfiguration } from '../../../types/iot'
import { useFloorConfig, useSaveAutoControlConfig } from '../../../features/devices/hooks/useIoT'
import { useMushroomTypes } from '../../../features/packages/hooks/useMushroomTypes'
import { sanitizeAutoMistingConfig } from '../../../features/devices/utils/auto-misting-config'

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
  mushroomTypeId?: number
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
 * Giá trị mặc định khi tầng chưa có config — khớp preset commissioning
 * của BE (`autoMisting.profile.js`): xung 3s, nghỉ 60s, độ ẩm 80–90%.
 */
const DEFAULT_THRESHOLD_FORM_VALUES: AutoThresholdFormValues = {
  humidityMin: 80,
  humidityMax: 90,
  humidityStartThreshold: 80,
  humidityStopThreshold: 85,
  mistingPulseSeconds: 3,
  cooldownMinutes: 1,
}

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

  // Loại nấm — BE **bắt buộc** `mushroom_type_id` ở nhánh LEGACY
  // (`validateConfig`: `Invalid mushroom_type_id: expected 1..2147483647`).
  const { data: mushroomTypes = [] } = useMushroomTypes(
    { status: 'ACTIVE' },
    { enabled: open },
  )

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
  //
  // ⚠ Tầng chưa có config (`GET /auto-control` → `config: null`) thì form
  // trống hoàn toàn → bấm "Lưu" sẽ fail validate và người dùng không biết
  // cần điền gì. → Đặt giá trị mặc định hợp lệ (preset commissioning của
  // BE, xem `autoMisting.profile.js`).
  useEffect(() => {
    if (!open) return
    if (!config) {
      form.setFieldsValue(DEFAULT_THRESHOLD_FORM_VALUES)
      return
    }
    form.setFieldsValue({
      mushroomTypeId: config.mushroom_type_id ?? undefined,
      humidityMin: config.humidity_min,
      humidityMax: config.humidity_max,
      humidityStartThreshold: config.humidity_start_threshold,
      humidityStopThreshold: config.humidity_stop_threshold,
      mistingPulseSeconds: msToSeconds(config.misting_pulse_ms),
      cooldownMinutes: msToMinutes(config.cooldown_ms),
    })
  }, [open, config, form])

  const handleOk = async () => {
    // ⚠ `validateFields()` **reject** khi form chưa hợp lệ. Không bắt lỗi
    // → unhandled promise rejection và modal không báo lỗi cho người dùng.
    let values: AutoThresholdFormValues
    try {
      values = await form.validateFields()
    } catch {
      // Ant Design đã hiển thị lỗi ngay dưới từng field → không cần
      // message thêm. Chỉ cần dừng lại.
      return
    }

    // ⚠ BE **allow-list** field (`validateConfig`): config lấy từ
    // `GET /auto-control` là nguyên row DB (có `id`, `floor_id`,
    // `configured_by`, `configured_at`, …) → gửi thẳng sẽ luôn 400
    // `Unknown configuration field`. Phải lọc trước.
    const base = sanitizeAutoMistingConfig(config)

    const payload = {
      ...base,
      // ⚠ BE bắt buộc `mushroom_type_id` ở nhánh LEGACY. Nhánh 'FLOOR'
      // thì BE tự suy ra từ phiên trồng → không gửi field này.
      ...(base.config_source === 'FLOOR'
        ? {}
        : { mushroom_type_id: values.mushroomTypeId ?? base.mushroom_type_id }),
      humidity_min: values.humidityMin,
      humidity_max: values.humidityMax,
      humidity_start_threshold: values.humidityStartThreshold,
      humidity_stop_threshold: values.humidityStopThreshold,
      misting_pulse_ms: values.mistingPulseSeconds * 1000,
      cooldown_ms: values.cooldownMinutes * 60_000,
      // Giữ các tham số an toàn (giới hạn tần suất) của BE.
      // Range BE: evaluation_interval_ms 1000..60000,
      // max_activations_per_hour 1..3600, max_cumulative_on_ms_per_hour 1000..3600000.
      evaluation_interval_ms: base.evaluation_interval_ms ?? 5_000,
      max_sensor_spread_percent: base.max_sensor_spread_percent ?? 10,
      max_activations_per_hour: base.max_activations_per_hour ?? 20,
      max_cumulative_on_ms_per_hour:
        base.max_cumulative_on_ms_per_hour ?? 200_000,
    } as AutoMistingConfiguration

    try {
      await saveConfig.mutateAsync({ floorId: floorId as number, payload })
    } catch {
      // `onError` của mutation đã hiển thị message → không cần bắt ở đây,
      // nhưng phải catch để không sinh unhandled rejection.
    }
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

        {/* ⚠ BE bắt buộc `mushroom_type_id` ở nhánh LEGACY — không có
            loại nấm thì không lưu được cấu hình. */}
        <Form.Item
          label="Loại nấm"
          name="mushroomTypeId"
          rules={[
            {
              required: true,
              message: 'Chọn loại nấm cho tầng.',
            },
          ]}
          extra="Nhánh LEGACY của BE yêu cầu loại nấm. Tầng dùng profile sàn (FLOOR) sẽ tự suy ra từ các mẻ đang trồng."
        >
          <Select
            placeholder="— Chọn loại nấm —"
            showSearch
            optionFilterProp="label"
            options={mushroomTypes.map((m) => ({
              value: m.mushroom_type_id,
              label: m.name,
            }))}
          />
        </Form.Item>

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