import {
  ControlOutlined,
  EnvironmentOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import {
  Alert,
  App as AntdApp,
  Badge,
  Button,
  Checkbox,
  Divider,
  Form,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { useMemo, useState } from 'react'
import type {
  FloorClimateConfig,
  FloorClimateThresholdValues,
} from '../../../types/device.types'
import type { Tray } from '../../../types/room.types'
import { getTrayPosition } from '../../../types/room.types'
import type { MushroomThresholdProfile } from '../../../types/setting.types'
import {
  calculateMushroomProfileAverages,
  findMushroomThresholdProfile,
  getActiveClimateSourceTrays,
} from '../utils/floor-climate.utils'
import {
  useEvaluateAutoMisting,
  useFloorAutoControlStatus,
  useFloorConfig,
  useStartAutoMisting,
  useStopAutoMisting,
} from '../../../features/devices/hooks/useIoT'
import { AutoMistingControlPanel } from './AutoMistingControlPanel'
import { AutoControlLogsTable } from './AutoControlLogsTable'
import { FloorProfileApproval } from './FloorProfileApproval'
import type { AutoControlEvaluateResult } from '../../../types/iot'

interface TraySourceSelection {
  trayId: string
  selectedMushroomId: string
  isEnabled: boolean
}

interface FloorClimateConfigModalProps {
  open: boolean
  floorName: string
  config: FloorClimateConfig
  trays: Tray[]
  mushroomProfiles: MushroomThresholdProfile[]
  onCancel: () => void
  onSubmit: (values: FloorClimateThresholdValues) => void
}

function resolveDefaultProfileId(
  tray: Tray,
  mushroomProfiles: MushroomThresholdProfile[],
): string {
  const activeType = tray.rental?.mushroomType ?? ''
  if (activeType) {
    const matched = findMushroomThresholdProfile(activeType, mushroomProfiles)
    if (matched) return matched.id
  }
  return mushroomProfiles.find((p) => p.isDefault)?.id ?? ''
}

export function FloorClimateConfigModal({
  open,
  floorName,
  config,
  trays,
  mushroomProfiles,
  onCancel,
  onSubmit,
}: FloorClimateConfigModalProps) {
  const { message } = AntdApp.useApp()
  const [form] = Form.useForm<FloorClimateThresholdValues>()
  const [traySources, setTraySources] = useState<TraySourceSelection[]>(() => {
    const activeIds = new Set(
      getActiveClimateSourceTrays(trays).map((t) => t.id),
    )
    return trays.map((tray) => ({
      trayId: tray.id,
      selectedMushroomId: resolveDefaultProfileId(tray, mushroomProfiles),
      isEnabled: activeIds.has(tray.id),
    }))
  })

  // ── Auto-misting hooks (dùng tierId làm floorId) ───────────────────
  const numericFloorId = config.tierId // 1|2|3|4

  const {
    data: runtimeStatus,
    isLoading: statusLoading,
  } = useFloorAutoControlStatus(numericFloorId, {
    enabled: open,
    staleTime: 5_000,
  })

  const [evaluateResult, setEvaluateResult] = useState<AutoControlEvaluateResult | null>(null)

  /** Config đang lưu của sàn — nguồn cho panel Duyệt Profile. */
  const { data: floorConfig } = useFloorConfig(numericFloorId, {
    enabled: open,
  })

  const startMutation = useStartAutoMisting({
    onSuccess: () => {
      message.success(`Đã bắt đầu tưới tự động cho ${floorName}.`)
    },
    onError: (err) => {
      message.error(`Lỗi bắt đầu AUTO: ${err.message}`)
    },
  })

  const stopMutation = useStopAutoMisting({
    onSuccess: () => {
      message.success(`Đã dừng tưới tự động cho ${floorName}.`)
      setEvaluateResult(null)
    },
    onError: (err) => {
      message.error(`Lỗi dừng AUTO: ${err.message}`)
    },
  })

  const evaluateMutation = useEvaluateAutoMisting({
    onSuccess: (result) => {
      setEvaluateResult(result)
    },
    onError: (err) => {
      message.error(`Lỗi đánh giá: ${err.message}`)
    },
  })

  // ── Tray source logic ─────────────────────────────────────────────────
  const validProfiles = useMemo(
    () =>
      traySources
        .filter((src) => src.isEnabled && src.selectedMushroomId)
        .map((src) =>
          mushroomProfiles.find((p) => p.id === src.selectedMushroomId),
        )
        .filter((p): p is MushroomThresholdProfile => p !== undefined),
    [mushroomProfiles, traySources],
  )

  const mushroomOptions = useMemo(
    () => [
      { value: '', label: '-- Để trống / Không chọn --' },
      ...mushroomProfiles.map((p) => ({
        value: p.id,
        label: p.mushroomType,
        comment: p.name,
      })),
    ],
    [mushroomProfiles],
  )

  const updateTraySource = (
    trayId: string,
    patch: Partial<Omit<TraySourceSelection, 'trayId'>>,
  ) => {
    setTraySources((current) =>
      current.map((src) =>
        src.trayId === trayId ? { ...src, ...patch } : src,
      ),
    )
  }

  const handleSyncThresholds = () => {
    if (validProfiles.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 khay có loại nấm cụ thể.')
      return
    }
    const calc = calculateMushroomProfileAverages(validProfiles)
    if (!calc) {
      message.error('Không thể tính ngưỡng — danh sách profile không hợp lệ.')
      return
    }
    form.setFieldsValue({
      tempMin: calc.tempMin,
      tempMax: calc.tempMax,
      humidityMin: calc.humidityMin,
      humidityMax: calc.humidityMax,
      co2Max: calc.co2Max,
    })
    void form.validateFields()
    message.success(
      `Đã tính trung bình từ ${validProfiles.length} khay — tự động điền ngưỡng.`,
    )
  }

  const handleFinish = (values: FloorClimateThresholdValues) => {
    const fieldErrors: Array<{
      name: keyof FloorClimateThresholdValues
      errors: string[]
    }> = []
    if (values.tempMin >= values.tempMax) {
      fieldErrors.push({
        name: 'tempMin',
        errors: ['Nhiệt độ Min phải nhỏ hơn Nhiệt độ Max.'],
      })
    }
    if (values.humidityMin >= values.humidityMax) {
      fieldErrors.push({
        name: 'humidityMin',
        errors: ['Độ ẩm Min phải nhỏ hơn Độ ẩm Max.'],
      })
    }
    if (fieldErrors.length > 0) {
      form.setFields(fieldErrors)
      return
    }
    onSubmit(values)
    message.success(`Đã lưu cấu hình AUTO cho ${floorName}.`)
  }

  return (
    <Modal
      rootClassName="floor-climate-config-modal-root"
      className="floor-climate-config-modal"
      classNames={{
        container: 'floor-climate-modal-container',
        footer: 'floor-climate-modal-footer',
      }}
      title={
        <span className="floor-climate-modal-title">
          <ControlOutlined aria-hidden="true" />
          Cấu hình AUTO · {floorName}
        </span>
      }
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Lưu cấu hình"
      cancelText="Hủy"
      width={{ xs: 'calc(100% - 16px)', sm: 680 }}
      centered
      destroyOnHidden
      afterClose={() => form.resetFields()}
    >
      {/* ── Auto-misting control panel ───────────────────────────────── */}
      <AutoMistingControlPanel
        floorName={floorName}
        // `AutoControlState`: chạy = mode AUTO + run.status RUNNING.
        runState={runtimeStatus?.run?.status === 'RUNNING' ? 'ACTIVE' : 'STOPPED'}
        startedAt={runtimeStatus?.run?.started_at ?? null}
        lastEvaluationAt={runtimeStatus?.runtime?.pulse_deadline_at ?? null}
        isLoadingStatus={statusLoading}
        evaluateResult={evaluateResult}
        isEvaluating={evaluateMutation.isPending}
        isStarting={startMutation.isPending}
        isStopping={stopMutation.isPending}
        onStart={() => startMutation.mutate(numericFloorId)}
        onStop={() => stopMutation.mutate(numericFloorId)}
        onEvaluate={() => evaluateMutation.mutate(numericFloorId)}
      />

      <Divider className="floor-climate-sync-divider" />

      {/* ── Floor profile approval (config_source = 'FLOOR') ──────────── */}
      <FloorProfileApproval
        floorId={numericFloorId}
        config={floorConfig ?? null}
      />

      <Divider className="floor-climate-sync-divider" />

      {/* ── Auto-control logs ─────────────────────────────────────────── */}
      <AutoControlLogsTable floorId={numericFloorId} />

      <Divider className="floor-climate-sync-divider" />

      {/* ── Threshold source sync ────────────────────────────────────── */}
      <Alert
        type="info"
        showIcon
        title="Tính ngưỡng tự động theo giống nấm đang trồng"
        description="Bật các khay tham gia tính trung bình, chọn giống nấm phù hợp, rồi nhấn Tính trung bình. Các ô nhập bên dưới luôn cho phép sửa tay."
        className="floor-climate-info-alert"
      />

      <div className="floor-climate-sync-panel">
        <div className="floor-climate-sync-copy">
          <div className="floor-climate-source-heading">
            <Typography.Text strong>Nguồn tính hiện tại</Typography.Text>
            <Badge
              status={validProfiles.length > 0 ? 'success' : 'default'}
              text={
                <span className="floor-source-badge-text">
                  {validProfiles.length}/{trays.length} khay hợp lệ
                </span>
              }
            />
          </div>

          <div
            className="floor-climate-source-list"
            aria-label="Chọn khay làm nguồn tính ngưỡng trung bình"
          >
            {trays.map((tray) => {
              const source = traySources.find(
                (item) => item.trayId === tray.id,
              )
              if (!source) return null

              const selectedProfile = mushroomProfiles.find(
                (p) => p.id === source.selectedMushroomId,
              )
              const isDisabled = !source.isEnabled
              const isValid = source.isEnabled && Boolean(selectedProfile)
              const pos = getTrayPosition(tray.code)

              return (
                <div
                  key={tray.id}
                  className={[
                    'floor-climate-source-item',
                    isDisabled ? 'floor-climate-source-item--off' : '',
                    isValid ? 'floor-climate-source-item--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <Checkbox
                    className="floor-source-checkbox"
                    checked={source.isEnabled}
                    onChange={(e) =>
                      updateTraySource(tray.id, {
                        isEnabled: e.target.checked,
                      })
                    }
                    aria-label={`K${pos}: ${
                      source.isEnabled
                        ? 'Bật làm nguồn tính'
                        : 'Tắt nguồn tính'
                    }`}
                  />
                  <label className="floor-source-label">
                    <span className="floor-source-label-code">K{pos}:</span>
                    {tray.rental ? (
                      <Tooltip
                        title={`${tray.rental.tenantName} · ${tray.rental.mushroomType}`}
                      >
                        <Tag
                          color="processing"
                          className="floor-source-label-tag"
                        >
                          {tray.rental.mushroomType}
                        </Tag>
                      </Tooltip>
                    ) : (
                      <Tag className="floor-source-label-tag floor-source-label-tag--empty">
                        Trống
                      </Tag>
                    )}
                  </label>
                  <Select
                    className="floor-source-select"
                    value={source.selectedMushroomId || undefined}
                    placeholder="Gán giống nấm cho khay này..."
                    options={mushroomOptions}
                    optionFilterProp="label"
                    showSearch
                    allowClear
                    onChange={(val) =>
                      updateTraySource(tray.id, {
                        selectedMushroomId: val ?? '',
                      })
                    }
                    aria-label={`Gán giống nấm cho K${pos}`}
                  />
                  <span
                    className={[
                      'floor-source-preview',
                      !isValid ? 'floor-source-preview--muted' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {selectedProfile ? (
                      <>
                        <EnvironmentOutlined aria-hidden="true" />
                        Ngưỡng{' '}
                        <strong>{selectedProfile.mushroomType}</strong>:{' '}
                        <span className="floor-source-preview-range">
                          {selectedProfile.tempMin}–{selectedProfile.tempMax}°C
                          · {selectedProfile.humidityMin}–
                          {selectedProfile.humidityMax}%RH
                          {selectedProfile.co2Max != null &&
                            ` · CO₂ < ${selectedProfile.co2Max} ppm`}
                        </span>
                      </>
                    ) : (
                      <span className="floor-source-preview-placeholder">
                        Chưa gán giống nấm —
                        {tray.rental
                          ? ' giống đang trồng không khớp profile'
                          : ' khay trống'}
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>

          {validProfiles.length === 0 && (
            <Alert
              type="warning"
              showIcon
              title="Chưa có nguồn hợp lệ — nhập ngưỡng thủ công bên dưới."
              className="floor-climate-source-warning"
            />
          )}
        </div>

        <Button
          block
          className="floor-climate-sync-button"
          icon={<SyncOutlined />}
          onClick={handleSyncThresholds}
        >
          <strong>Tính trung bình</strong> theo {validProfiles.length} khay đã
          chọn
        </Button>
      </div>

      {/* ── Threshold form ───────────────────────────────────────────── */}
      <Form<FloorClimateThresholdValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          tempMin: config.tempMin,
          tempMax: config.tempMax,
          humidityMin: config.humidityMin,
          humidityMax: config.humidityMax,
          co2Max: config.co2Max,
        }}
        onFinish={handleFinish}
      >
        <Space.Compact block className="floor-climate-inputs-row">
          <Form.Item
            label="Nhiệt độ Min (°C)"
            name="tempMin"
            rules={[{ required: true, message: 'Nhập nhiệt độ Min.' }]}
            style={{ flex: 1 }}
          >
            <InputNumber
              min={0}
              max={60}
              precision={1}
              className="floor-climate-input"
            />
          </Form.Item>
          <Form.Item
            label="Nhiệt độ Max (°C)"
            name="tempMax"
            rules={[{ required: true, message: 'Nhập nhiệt độ Max.' }]}
            style={{ flex: 1 }}
          >
            <InputNumber
              min={0}
              max={60}
              precision={1}
              className="floor-climate-input"
            />
          </Form.Item>
        </Space.Compact>

        <Space.Compact block className="floor-climate-inputs-row">
          <Form.Item
            label="Độ ẩm Min (%RH)"
            name="humidityMin"
            rules={[{ required: true, message: 'Nhập độ ẩm Min.' }]}
            style={{ flex: 1 }}
          >
            <InputNumber
              min={0}
              max={100}
              precision={1}
              className="floor-climate-input"
            />
          </Form.Item>
          <Form.Item
            label="Độ ẩm Max (%RH)"
            name="humidityMax"
            rules={[{ required: true, message: 'Nhập độ ẩm Max.' }]}
            style={{ flex: 1 }}
          >
            <InputNumber
              min={0}
              max={100}
              precision={1}
              className="floor-climate-input"
            />
          </Form.Item>
        </Space.Compact>

        <Form.Item
          label="CO₂ tối đa (ppm)"
          name="co2Max"
          rules={[{ required: true, message: 'Nhập ngưỡng CO₂.' }]}
        >
          <InputNumber
            min={1}
            max={5000}
            precision={0}
            className="floor-climate-input"
            style={{ width: 200 }}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
