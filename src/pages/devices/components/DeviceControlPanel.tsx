import { getClimateTone, getClimateDirection } from '../../../features/rooms/utils/climate-tone.utils'
import { climateThresholdsFromConfig } from '../../../features/rooms/utils/farm-climate.utils'
import { evaluateTemperature, evaluateHumidity, type ClimateReading } from '../../../features/rooms/utils/tray-climate.utils'
import { tones } from '../../../app/theme/tokens'
import { formatMeasurement } from '../../../shared/utils/measurement-format'
import '../device-industrial.css'
import { Suspense, useMemo, useState } from 'react'
import {
  ApiOutlined,
  BulbOutlined,
  ControlOutlined,
  ExperimentOutlined,
  EyeOutlined,
  SyncOutlined,
  ThunderboltOutlined,
  VideoCameraOutlined,
  WifiOutlined,
} from '@ant-design/icons'
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Flex,
  Segmented,
  Select,
  Space,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { ActionButton, StatCard, MetadataBadge, StatusBadge, DataTable } from '../../../shared/ui'
import { formatSensorLabel } from '../../../shared/i18n/terms'
import { CameraStreamModal } from '../../../app/router/lazy-modals'
import { useFloorCameraMap } from '../../../features/cameras/hooks/useFloorCameras'
import {
  useAutoControlConfigList,
  useFloorList,
  useMasterList,
  useMasterSensors,
  useResolvedFloorEnvironment,
  TELEMETRY_POLL_INTERVAL_MS,
} from '../../../features/devices/hooks/useIoT'
import type {
  CultivationFloorMapping,
  FloorStatus,
  IotSensor,
} from '../../../types/iot'
import type { Camera } from '../../../types/camera.types'
import { AutoControlDetailModal } from '../../../app/router/lazy-modals'
import { SensorHistoryPanel } from './SensorHistoryPanel'
import {
  formatDurationMs,
  formatProfileName,
  formatTriggerCondition,
} from '../utils/auto-control.utils'
import {
  FLOOR_CAMERA_UNAVAILABLE_MESSAGES,
  type FloorCameraUnavailableReason,
} from '../utils/floor-camera.utils'
import {
  FLOOR_STATUS_DICTIONARY,
  MASTER_STATUS_DICTIONARY,
  SENSOR_VALIDITY_DICTIONARY,
} from '../../../shared/i18n/status/iot'
import { presentStatus, statusLabel } from '../../../shared/i18n/status/registry'

/** Tab của card "Cảm biến môi trường". */
type SensorTab = 'realtime' | 'history'

/**
 * Nhãn trạng thái **bộ điều khiển** (master).
 *
 * ⚠ Luôn tra qua từ điển trung tâm ⇒ không bao giờ lộ `online` / `offline`
 *   thô ra giao diện.
 */
function masterStatusLabel(status: string | null | undefined): string {
  return statusLabel(MASTER_STATUS_DICTIONARY, status, 'Chưa xác định')
}

/**
 * Nhãn trạng thái **tầng** (sàn).
 *
 * ⚠ `cultivation_floors.status` chỉ có `ACTIVE` / `INACTIVE` — nhưng BE có
 *   thể trả giá trị lạ ⇒ dùng `statusLabel` để không lộ chuỗi thô.
 */
function floorStatusLabel(status: string | null | undefined): string {
  return statusLabel(FLOOR_STATUS_DICTIONARY, status, 'Chưa ghi nhận')
}

/**
 * Nhãn tình trạng số đo của cảm biến.
 *
 * ⚠ BE trả **boolean** (`IotSensor.ok`) ⇒ chuẩn hoá sang `VALID` / `INVALID`
 *   trước khi tra cứu.
 */
function sensorValidityLabel(ok: boolean): string {
  return statusLabel(
    SENSOR_VALIDITY_DICTIONARY,
    ok ? 'VALID' : 'INVALID',
    'Chưa ghi nhận',
  )
}

function formatTimestamp(timestamp: string | number | null) {
  if (!timestamp) return '—'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('vi-VN')
}

/**
 * Panel giám sát thiết bị IoT — **CHỈ ĐỌC**.
 *
 * ⚠ Admin web chỉ được XEM. Mọi thao tác cấu hình (đặt ngưỡng, bật/tắt
 * tưới tự động, tạo/sửa tầng, gán khay, duyệt profile) do **nhân viên
 * (staff)** thực hiện trên mobile app — xem `features/auth/permissions.ts`
 * (`iot.automation.manage`).
 *
 * Vì vậy panel này cố tình **không** render:
 *   - nút "Thêm cấu hình tầng"
 *   - nút "Cấu hình" / "Chỉnh sửa" / "Lưu" / "Cập nhật" / "Xóa"
 *   - toggle bật/tắt tưới thủ công
 *   - các modal cấu hình (assign tray, auto-thresholds, floor form)
 *
 * Cột "Hành động" của bảng cấu hình chỉ có **một** nút: `Xem chi tiết`,
 * mở modal chỉ đọc (`AutoControlDetailModal`) với 2 tab:
 *   1. Cấu hình tự động hiện tại (Descriptions — không dùng Form/Input)
 *   2. Nhật ký kích hoạt (bảng log của hệ thống)
 *
 * API gắn trực tiếp (chỉ đọc):
 *  - GET /api/iot/masters
 *  - GET /api/iot/masters/{id}/sensors
 *  - GET /api/iot/floors
 *  - GET /api/iot/floors/{id}/environment
 *  - GET /api/iot/floors/{id}/auto-control
 *  - GET /api/iot/floors/{id}/auto-control/logs
 *
 * ⚠ Không còn gọi `GET /api/iot/masters/{id}/ssr` — phần "Trạng thái rơ-le
 *   (SSR)" đã được gỡ khỏi giao diện.
 */
export function DeviceControlPanel() {
  const navigate = useNavigate()
  const { message } = App.useApp()

  /**
   * Tab đang xem trong card "Cảm biến môi trường".
   *
   * ⚠ `realtime` → polling 3s (bảng số liệu live).
   * `history`   → **tắt polling** (chỉ tra cứu lịch sử, không cần live).
   */
  const [sensorTab, setSensorTab] = useState<SensorTab>('realtime')
  const isRealtimeTab = sensorTab === 'realtime'

  // ── Data from APIs (read-only) ───────────────────────────────────────
  const { data: masters = [] } = useMasterList({ staleTime: 30_000 })
  const { data: floors = [], isLoading: floorsLoading } = useFloorList()
  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null)
  // Resolve the default after the asynchronous list arrives, without an effect
  // that could overwrite the administrator's selection on a refresh.
  const selectedMaster = masters.find((master) => master.id === selectedMasterId)
    ?? masters.find((master) => master.reportedStatus === 'online')
    ?? masters[0]
  const selectedFloors = useMemo(
    () => floors.filter((floor) => floor.master_id === selectedMaster?.id),
    [floors, selectedMaster?.id],
  )
  const isMasterOnline = selectedMaster?.reportedStatus === 'online'
  const onlineCount = masters.filter((master) => master.reportedStatus === 'online').length
  const onlineTone = onlineCount === 0 ? 'danger' : onlineCount === masters.length ? 'ok' : 'warning'

  /**
   * Telemetry cảm biến — polling khi đang ở tab "Thời gian thực".
   *
   * ⚠ `refetchInterval: false` khi chuyển sang tab "Lịch sử" ⇒ TanStack Query
   * **xoá timer** ⇒ không còn gọi `GET /api/iot/masters/{id}/sensors`.
   *
   * ⚠ Truyền `undefined` (không ép số) ở tab "Thời gian thực" ⇒ hook tự quyết
   *   định chu kỳ **và tự dừng khi tab trình duyệt bị ẩn** (xem `useIoT.ts`).
   */
  const { data: sensorsResponse, isLoading: sensorsLoading, isFetching: sensorsFetching } =
    useMasterSensors(selectedMaster?.masterId ?? null, {
      refetchInterval: isRealtimeTab ? undefined : false,
    })
  const sensors = sensorsResponse?.sensors ?? []

  // ── Detail drawers (chỉ xem) ─────────────────────────────────────────
  const [selectedFloor, setSelectedFloor] =
    useState<CultivationFloorMapping | null>(null)
  const [selectedSensor, setSelectedSensor] = useState<IotSensor | null>(null)

  // Tầng đang mở modal "Xem chi tiết" — CHỈ ĐỌC (xem cấu hình + nhật ký).
  const [autoControlFloor, setAutoControlFloor] =
    useState<CultivationFloorMapping | null>(null)

  // ── Camera theo tầng (xem nhanh live stream) ──────────────────────────
  //
  // ⚠ Camera **không** nằm trong bảng cấu hình tưới — nó là tài nguyên
  // riêng (`GET /api/cameras`). Ánh xạ tầng ↔ camera nằm ở
  // `utils/floor-camera.utils.ts` (đọc `floor_id` từ API nếu BE có, nếu
  // không thì dùng `FLOOR_CAMERA_CONFIG`) ⇒ khi gắn camera cho Tầng 2 chỉ
  // cần sửa config/API, **không sửa lại component này**.
  const floorCameraMap = useFloorCameraMap(floors)

  /** Camera đang phát live — `null` ⇒ modal đóng. */
  const [streamingCamera, setStreamingCamera] = useState<Camera | null>(null)
  /** Tầng đang mở modal live (dùng cho tiêu đề + thông báo). */
  const [streamingFloor, setStreamingFloor] =
    useState<CultivationFloorMapping | null>(null)

  /**
   * Bấm nút Camera của một tầng.
   *
   * - Có camera → mở modal ImouPlayer (tái sử dụng `CameraStreamModal` của
   *   trang "Camera toàn cảnh" — cùng component, cùng ImouPlayer SDK).
   * - Chưa có camera → `message.info` nhẹ (Cách 2 trong yêu cầu). Nút vẫn
   *   bị disable + có tooltip nên `message` chỉ là bổ sung cho trường hợp
   *   user bấm rất nhanh trước lúc render.
   */
  const handleOpenCamera = (floor: CultivationFloorMapping) => {
    const resolution = floorCameraMap.byFloorId.get(floor.floor_id)
    const camera = resolution?.camera ?? null

    if (!camera) {
      const reason = resolution?.reason as
        | FloorCameraUnavailableReason
        | null
        | undefined
      const text =
        reason && FLOOR_CAMERA_UNAVAILABLE_MESSAGES[reason]
          ? FLOOR_CAMERA_UNAVAILABLE_MESSAGES[reason]
          : 'Tầng này chưa được lắp camera'
      message.info(`Tầng ${floor.floor_number} chưa được cấu hình camera. ${text}`)
      return
    }

    setStreamingFloor(floor)
    setStreamingCamera(camera)
  }

  // Cấu hình tự động của từng tầng — để bảng hiển thị tóm tắt ngưỡng.
  const floorIds = useMemo(
    () => floors.map((floor) => floor.floor_id).filter((id) => id > 0),
    [floors],
  )
  const { configByFloorId, isLoading: configsLoading } =
    useAutoControlConfigList(floorIds)

  // Master của tầng đang xem — `master_id` là số, API cần `masterId` string.
  const selectedFloorMasterId =
    masters.find((m) => m.id === selectedFloor?.master_id)?.masterId ?? null

  // Môi trường tầng — tự fallback sang telemetry Master khi API environment
  // rỗng (BE chưa map tray → node_id/sensor_id).
  //
  // ⚠ `floorId` = `floor_id` của BE, **không** phải `room_id` (nhiều tầng
  // có thể cùng room). Xem `CultivationFloorMapping.floor_id`.
  //
  // ⚠ Chỉ polling khi đang ở tab "Thời gian thực" — tab "Lịch sử" thì tắt
  // để không gọi API vô ích.
  const floorEnv = useResolvedFloorEnvironment(
    selectedFloor?.floor_id ?? null,
    selectedFloorMasterId,
    selectedFloor?.node_address ?? null,
    {
      /*
       * ⚠ `undefined` ở tab "Thời gian thực" ⇒ 2 query tự quyết định chu kỳ
       *   **và tự dừng khi tab trình duyệt bị ẩn** (xem `useIoT.ts`).
       */
      refetchInterval: isRealtimeTab ? undefined : false,
    },
  )

  function sensorThresholds(sensor: IotSensor) {
    const matches = selectedFloors.filter(floor => floor.node_address === sensor.nodeId)
    return climateThresholdsFromConfig(matches.length === 1
      ? configByFloorId.get(matches[0].floor_id) : null)
  }

  // ── Tables ──────────────────────────────────────────────────────────
  /**
   * Cột của bảng cảm biến — chỉ các chỉ số vi khí hậu chuẩn.
   *
   * ⚠ Không có cột "Thông báo khách" / nút "Báo khách": admin web chỉ
   *   **xem** telemetry, không gửi thông báo tới khách từ trang này.
   */
  const sensorColumns: ColumnsType<IotSensor> = [
    {
      title: 'Cảm biến',
      key: 'sensorId',
      className: 'mcms-iot-mono',
      width: 110,
      render: (_, row) => (
        <MetadataBadge  label={<>Cảm biến #{row.sensorId}</>} />
      ),
    },
    {
      title: 'Nhiệt độ (°C)', key: 'temp', width: 190,
      render: (_, row) => <ClimateMeasurement reading={evaluateTemperature(row.temperature, sensorThresholds(row))} unit="°C" />,
    },
    {
      title: 'Độ ẩm (%)', key: 'hum', width: 190,
      render: (_, row) => <ClimateMeasurement reading={evaluateHumidity(row.humidity, sensorThresholds(row))} unit="%RH" />,
    },
    {
      title: 'Tình trạng cảm biến', dataIndex: 'ok', key: 'ok', width: 160,
      render: (ok: boolean) => !isMasterOnline ? (
        <StatusBadge
          tone="danger"
          label="Mất tín hiệu"
          title="Bộ điều khiển đang ngoại tuyến, dữ liệu có thể đã cũ"
        />
      ) : (
        <StatusBadge
          tone={ok ? 'ok' : 'warning'}
          label={sensorValidityLabel(ok)}
        />
      ),
    },
    {
      title: 'Cập nhật cuối',
      key: 'lastReceived',
      className: 'mcms-iot-mono',
      width: 170,
      render: (_, row) => (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {formatTimestamp(row.lastReceivedAt)}
        </Typography.Text>
      ),
    },
    {
      title: 'Chi tiết',
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <ActionButton
          variant="text"
              icon={<BulbOutlined />}
          label="Xem chi tiết cảm biến"
          description="Mở bảng thông số đầy đủ của cảm biến này"
          hideLabel
          onClick={() => setSelectedSensor(record)}
        />
      ),
    },
  ]

  const floorColumns: ColumnsType<CultivationFloorMapping> = [
    {
      /*
       * ⚠ Gộp "Tầng" + "Tên tầng" thành **1 cột duy nhất**.
       *
       *   Trước đây 2 cột hiển thị **trùng nội dung** (badge "Tầng 1" ở
       *   cột 1 và tên tầng ở cột 2) ⇒ 290px chiếm chỗ vô ích ⇒ bảng
       *   tràn ngang trên laptop 1280–1536px.
       *
       *   ⇒ Gộp lại: badge "Tầng N" + tên tầng (ellipsis) trong cùng ô.
       */
      title: 'Tầng',
      key: 'floor',
      width: 110,
      render: (_, record) => (
        <Tooltip title="Xem môi trường thực tế của tầng">
          <Button
            type="text"
            size="small"
            style={{ padding: 0, height: 'auto', maxWidth: '100%' }}
            onClick={() => setSelectedFloor(record)}
          >
            <Flex vertical gap={0} align="flex-start" style={{ minWidth: 0 }}>
              <MetadataBadge style={{ fontSize: 13, padding: '2px 8px' }} label={<>
                Tầng {record.floor_number}
              </>} />
              {record.floor_name && (
                <Typography.Text
                  type="secondary"
                  style={{ fontSize: 11 }}
                  ellipsis={{ tooltip: record.floor_name }}
                >
                  {record.floor_name}
                </Typography.Text>
              )}
            </Flex>
          </Button>
        </Tooltip>
      ),
    },
    {
      title: 'Bộ điều khiển',
      key: 'master',
      width: 150,
      render: (_, record) => {
        const master = masters.find((m) => m.id === record.master_id)
        if (!master) return <Typography.Text type="secondary">—</Typography.Text>
        const status = master.reportedStatus ?? 'offline'
        return (
          <Flex vertical gap={2}>
            <Flex align="center" gap={4}>
              <ControlOutlined style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)' }} />
              <Typography.Text code style={{ fontSize: 12 }}>
                {master.masterId}
              </Typography.Text>
            </Flex>
            <StatusBadge
              {...presentStatus(MASTER_STATUS_DICTIONARY, status)}
              title={`Trạng thái bộ điều khiển: ${masterStatusLabel(status)}`}
              style={{ fontSize: 11, width: 'fit-content' }}
            />
          </Flex>
        )
      },
    },
    {
      title: 'Cụm cảm biến',
      dataIndex: 'node_address',
      key: 'node_address',
      className: 'mcms-iot-mono',
      width: 110,
      align: 'center',
      render: (addr: number) => (
        <MetadataBadge  label={<>Cụm {addr}</>} />
      ),
    },
    {
      title: 'Kênh rơ-le',
      dataIndex: 'misting_ssr_channel',
      key: 'misting_ssr_channel',
      className: 'mcms-iot-mono',
      width: 110,
      align: 'center',
      // ⚠ Chỉ hiển thị **số kênh** cấu hình của tầng. Trạng thái ON/OFF
      //   thật của rơ-le đã được gỡ khỏi trang (không gọi
      //   `GET /api/iot/masters/{id}/ssr` nữa).
      render: (ch: number) => (
        <MetadataBadge style={{ fontSize: 12 }} label={<>
          <ThunderboltOutlined /> Kênh {ch}
        </>} />
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 145,
      align: 'center',
      render: (status: FloorStatus) => (
        <StatusBadge
          {...presentStatus(FLOOR_STATUS_DICTIONARY, status, 'Chưa ghi nhận')}
          title={`Trạng thái tầng: ${floorStatusLabel(status)}`}
          /*
           * ⚠ `white-space: nowrap` ⇒ "Đang hoạt động" hiển thị trên **1 hàng**,
           *   không gãy dòng ("Đang hoạt" / "động") làm hàng bị cao lệch.
           */
          style={{ whiteSpace: 'nowrap' }}
        />
      ),
    },
    {
      title: 'Chế độ / Điều kiện kích hoạt',
      key: 'triggerCondition',
      width: 210,
      ellipsis: true,
      render: (_, record) => {
        const config = configByFloorId.get(record.floor_id)
        const condition = formatTriggerCondition(config)
        if (!condition) {
          return (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Chưa có cấu hình
            </Typography.Text>
          )
        }
        const profileName = formatProfileName(config)
        return (
          <Flex vertical gap={2} style={{ minWidth: 0 }}>
            <MetadataBadge
              style={{ fontSize: 12, width: 'fit-content', maxWidth: '100%' }}
              label={<span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{condition}</span>}
            />
            <Typography.Text
              type="secondary"
              style={{ fontSize: 11 }}
              ellipsis={{ tooltip: profileName ?? 'Tự động theo độ ẩm' }}
            >
              {profileName ?? 'Tự động theo độ ẩm'}
            </Typography.Text>
          </Flex>
        )
      },
    },
    {
      title: 'Thời lượng phun',
      key: 'pulseDuration',
      width: 110,
      align: 'right',
      render: (_, record) => {
        const config = configByFloorId.get(record.floor_id)
        const duration = formatDurationMs(config?.misting_pulse_ms)
        if (!duration) {
          return (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              —
            </Typography.Text>
          )
        }
        return (
          <Typography.Text strong style={{ fontSize: 13 }}>
            {duration}
          </Typography.Text>
        )
      },
    },
    {
      // ⚠ Cột hành động CHỈ có nút xem — không có Edit / Setting / Xóa /
      // bật-tắt thủ công (quyền này thuộc staff trên mobile app).
      //
      // Có 2 nút **chỉ đọc**:
      //   1. "Xem chi tiết"  → modal cấu hình + nhật ký tưới tự động.
      //   2. "Xem camera"    → modal live stream ImouPlayer của tầng đó.
      //
      // ⚠ Cả 2 nút đều **icon-only** (đồng bộ bảng Accounts / Orders) ⇒
      //   cột này chỉ cần 70px thay vì 240px ⇒ bảng vừa khít 1 màn hình.
      title: 'Hành động',
      key: 'actions',
      width: 70,
      align: 'center',
      render: (_, record) => {
        const resolution = floorCameraMap.byFloorId.get(record.floor_id)
        const camera = resolution?.camera ?? null
        const reason = resolution?.reason ?? null
        const canViewCameras = floorCameraMap.canViewCameras

        // Tầng chưa lắp camera → nút mờ + tooltip giải thích.
        const cameraDisabled = !camera || !canViewCameras
        const cameraDescription =
          camera && canViewCameras
            ? `Xem live stream camera của Tầng ${record.floor_number}`
            : reason && FLOOR_CAMERA_UNAVAILABLE_MESSAGES[reason]
              ? FLOOR_CAMERA_UNAVAILABLE_MESSAGES[reason]
              : 'Tầng này chưa được lắp camera'

        return (
          <Flex gap={4} justify="center">
            <ActionButton
              variant="text"
              icon={<EyeOutlined />}
              label="Xem chi tiết"
              description="Xem cấu hình tự động và nhật ký kích hoạt của tầng này"
              hideLabel
              onClick={() => setAutoControlFloor(record)}
            />
            <ActionButton
              variant="text"
              icon={<VideoCameraOutlined />}
              label={`Xem camera Tầng ${record.floor_number}`}
              description={cameraDescription}
              hideLabel
              disabled={cameraDisabled}
              onClick={() => handleOpenCamera(record)}
            />
          </Flex>
        )
      },
    },
  ]

  return (
    <div className="mcms-iot-view">
      <Flex align="center" gap={12} wrap style={{ marginBottom: 16 }}>
        <Typography.Text strong>Bộ điều khiển</Typography.Text>
        <Select<number>
          aria-label="Chọn bộ điều khiển Master"
          value={selectedMaster?.id}
          disabled={masters.length === 0}
          placeholder="Chưa có bộ điều khiển"
          style={{ width: 320, maxWidth: '100%' }}
          options={masters.map((master) => ({
            value: master.id,
            label: `${master.masterId} · ${masterStatusLabel(master.reportedStatus)}`,
          }))}
          onChange={(id) => {
            setSelectedMasterId(id)
            setSelectedFloor(null)
            setSelectedSensor(null)
            setAutoControlFloor(null)
            setStreamingCamera(null)
            setStreamingFloor(null)
          }}
        />
      </Flex>
      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
        <StatCard
          title="Bộ điều khiển trung tâm"
          value={masters.length}
          icon={<ControlOutlined />}
          description="Master đã đăng ký"
          style={{ flex: '1 1 200px' }}
        />
        <StatCard
          title="Số tầng đã cấu hình"
          value={floors.length}
          icon={<ExperimentOutlined />}
          description="Tầng trong nhà trồng"
          style={{ flex: '1 1 200px' }}
        />
        <StatCard
          title="Cảm biến môi trường"
          value={sensors.length}
          icon={<WifiOutlined />}
          description="Cảm biến nhiệt độ & độ ẩm"
          style={{ flex: '1 1 200px' }}
        />
        <StatCard
          title="Bộ điều khiển trực tuyến"
          value={onlineCount}
          suffix={`/ ${masters.length}`}
          icon={<WifiOutlined />}
          tone={onlineTone}
          highlightValue
          description={onlineCount === 0 ? 'Không có bộ điều khiển trực tuyến' : onlineCount === masters.length ? 'Tất cả bộ điều khiển đang trực tuyến' : 'Một số bộ điều khiển đang ngoại tuyến'}
          style={{ flex: '1 1 200px' }}
        />
      </Flex>

      {/* ── Floor Configuration (read-only) ────────────────────────────── */}
      <Card
        title={
          <Flex align="center" gap={8}>
            <ThunderboltOutlined aria-hidden="true" />
            <span>Cấu hình tưới phun sương tự động</span>
          </Flex>
        }
        extra={
          <MetadataBadge icon={<ApiOutlined />} label={<>
            Chỉ xem
          </>} />
        }
        style={{ marginBottom: 16 }}
        styles={{ body: { padding: 12 } }}
      >
        <DataTable<CultivationFloorMapping>
          rowKey="floor_id"
          columns={floorColumns}
          dataSource={selectedFloors}
          loading={floorsLoading || configsLoading}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scrollX={1015}
          tableLayout="fixed"
          emptyTitle="Chưa cấu hình tầng nào. Nhân viên có thể thiết lập trên mobile app."
        />
      </Card>

      {/* ── Sensor Master Snapshot ──────────────────────────────────────── */}
      <Card
        title={
          <Flex align="center" gap={8}>
            <WifiOutlined aria-hidden="true" />
            <span>
              Cảm biến môi trường — Bộ điều khiển {selectedMaster?.masterId ?? '—'}
            </span>
            {isRealtimeTab && sensorsFetching && !sensorsLoading && (
              <StatusBadge tone="info" style={{ fontSize: 11 }} label={<>
                <SyncOutlined spin /> Đang cập nhật
              </>} />
            )}
          </Flex>
        }
        extra={
          <Flex align="center" gap={12}>
            {isRealtimeTab && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Tự cập nhật mỗi {TELEMETRY_POLL_INTERVAL_MS / 1000}s
              </Typography.Text>
            )}
            <Segmented<SensorTab>
              value={sensorTab}
              options={[
                { label: 'Thời gian thực', value: 'realtime' },
                { label: 'Lịch sử', value: 'history' },
              ]}
              onChange={setSensorTab}
            />
          </Flex>
        }
        styles={{ body: { padding: 12 } }}
      >
        {isRealtimeTab ? (
          <Flex vertical gap={16}>
            {selectedFloors.map(floor => (
              <section key={floor.floor_id} aria-label={floor.floor_name || `Tầng ${floor.floor_number}`}>
                <Typography.Title level={4}>{floor.floor_name || `Tầng ${floor.floor_number}`}</Typography.Title>
          <DataTable<IotSensor>
            rowKey={(row) => `${row.nodeId}-${row.sensorId}`}
            columns={sensorColumns}
            dataSource={sensors.filter(sensor => sensor.nodeId === floor.node_address)}
            loading={sensorsLoading}
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scrollX={800}
            emptyTitle="Chưa nhận dữ liệu từ cảm biến nào."
          />
              </section>
            ))}
            {sensors.some(sensor => !selectedFloors.some(floor => floor.node_address === sensor.nodeId)) && (
              <DataTable<IotSensor> title="Cảm biến chưa gán tầng" rowKey={row => `${row.nodeId}-${row.sensorId}`}
                columns={sensorColumns} dataSource={sensors.filter(sensor => !selectedFloors.some(floor => floor.node_address === sensor.nodeId))} />
            )}
            {!selectedFloors.length && !sensors.length && <Empty description="Chưa có dữ liệu tầng" />}
          </Flex>
        ) : (
          /*
            Tab "Lịch sử" — polling đã TẮT (refetchInterval: false) nên không
            tốn request nào cho bảng live.
          */
          <SensorHistoryPanel
            key={selectedMaster?.masterId ?? 'no-master'}
            masterId={selectedMaster?.masterId ?? null}
            onOpenFullHistory={() => navigate('/devices/history')}
          />
        )}
      </Card>

      {/* ── Floor Environment Drawer (read-only) ───────────────────────── */}
      <Drawer className="mcms-iot-drawer"
        title={
          selectedFloor ? (
            <Space>
              <ExperimentOutlined />
              <span>Môi trường {selectedFloor.floor_name}</span>
            </Space>
          ) : (
            'Môi trường tầng'
          )
        }
        open={Boolean(selectedFloor)}
        onClose={() => setSelectedFloor(null)}
        width={520}
        destroyOnHidden
      >
        {selectedFloor && (
          <Flex vertical gap={16}>
            <Descriptions
              column={1}
              bordered
              size="small"
              items={[
                {
                  key: 'room_id',
                  label: 'Room ID',
                  children: selectedFloor.room_id,
                },
                {
                  key: 'floor_number',
                  label: 'Số tầng',
                  children: selectedFloor.floor_number,
                },
                {
                  key: 'floor_status',
                  label: 'Trạng thái tầng',
                  children: (
                    <StatusBadge
                      {...presentStatus(
                        FLOOR_STATUS_DICTIONARY,
                        selectedFloor.status,
                        'Chưa ghi nhận',
                      )}
                    />
                  ),
                },
                {
                  key: 'avgTemperature',
                  label: 'Nhiệt độ trung bình',
                  children: <ClimateMeasurement reading={evaluateTemperature(floorEnv.data.avgTemperature, climateThresholdsFromConfig(configByFloorId.get(selectedFloor.floor_id)))} unit="°C" />,
                },
                {
                  key: 'avgHumidity',
                  label: 'Độ ẩm trung bình',
                  children: <ClimateMeasurement reading={evaluateHumidity(floorEnv.data.avgHumidity, climateThresholdsFromConfig(configByFloorId.get(selectedFloor.floor_id)))} unit="%RH" />,
                },
                {
                  key: 'validSensors',
                  label: 'Sensor hợp lệ',
                  children: floorEnv.isFallback
                    ? `${floorEnv.data.sensors.length} sensor(s) (từ Node ${selectedFloor.node_address})`
                    : `${floorEnv.data.sensors.length} sensor(s)`,
                },
                {
                  key: 'channel',
                  label: 'Kênh SSR',
                  children: `Kênh ${selectedFloor.misting_ssr_channel}`,
                },
              ]}
            />

            {floorEnv.isFallback && (
              <Alert
                type="warning"
                showIcon
                message="Đã kết nối dữ liệu từ Node RS485 của tầng. Khay chưa được cấu hình sensor_id trong DB."
                description={`Nhiệt độ / độ ẩm dưới đây là số đo thật từ Node ${
                  selectedFloor.node_address
                }, không phải từ bản ghi khay.`}
              />
            )}

            <Typography.Title level={5} style={{ marginTop: 0 }}>
              Cảm biến tầng
            </Typography.Title>

            {floorEnv.data.sensors.length > 0 ? (
              <Flex vertical gap={8}>
                {floorEnv.data.sensors.map((sensor) => (
                  <Card key={`${sensor.nodeId}-${sensor.sensorId}`} size="small">
                    <Flex justify="space-between" align="center">
                      <Flex vertical gap={2}>
                        <Typography.Text strong>
                          {formatSensorLabel(sensor.nodeId, sensor.sensorId)}
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          Cập nhật: {formatTimestamp(sensor.lastReceivedAt)}
                        </Typography.Text>
                      </Flex>
                      <Flex gap={12} wrap>
                        <ClimateMeasurement reading={evaluateTemperature(sensor.temperature, climateThresholdsFromConfig(configByFloorId.get(selectedFloor.floor_id)))} unit="°C" />
                        <ClimateMeasurement reading={evaluateHumidity(sensor.humidity, climateThresholdsFromConfig(configByFloorId.get(selectedFloor.floor_id)))} unit="%RH" />
                      </Flex>
                    </Flex>
                  </Card>
                ))}
              </Flex>
            ) : (
              <Empty description="Chưa có dữ liệu sensor cho tầng này." />
            )}
          </Flex>
        )}
      </Drawer>

      {/* ── Sensor Detail Drawer ────────────────────────────────────────── */}
      <Drawer className="mcms-iot-drawer"
        title="Chi tiết cảm biến"
        open={Boolean(selectedSensor)}
        onClose={() => setSelectedSensor(null)}
        size={460}
        destroyOnHidden
      >
        {selectedSensor && (
          <Descriptions
            column={1}
            bordered
            size="small"
            items={[
              {
                key: 'master',
                label: 'Bộ điều khiển',
                children: selectedSensor.masterId,
              },
              {
                key: 'node',
                label: 'Cụm cảm biến',
                children: `Cụm cảm biến Tầng ${selectedSensor.nodeId}`,
              },
              {
                key: 'sensor',
                label: 'Cảm biến',
                children: `Cảm biến #${selectedSensor.sensorId}`,
              },
              {
                key: 'temperature',
      className: 'mcms-iot-mono',
                label: 'Nhiệt độ',
                children: <ClimateMeasurement reading={evaluateTemperature(selectedSensor.temperature, sensorThresholds(selectedSensor))} unit="°C" />,
              },
              {
                key: 'humidity',
      className: 'mcms-iot-mono',
                label: 'Độ ẩm',
                children: <ClimateMeasurement reading={evaluateHumidity(selectedSensor.humidity, sensorThresholds(selectedSensor))} unit="%RH" />,
              },
              {
                key: 'ok',
                label: 'Tình trạng cảm biến',
                children: !isMasterOnline ? (
                  <StatusBadge tone="danger" label="Mất tín hiệu" title="Bộ điều khiển đang ngoại tuyến, dữ liệu có thể đã cũ" />
                ) : (
                  <StatusBadge
                    tone={selectedSensor.ok ? 'ok' : 'warning'}
                    label={sensorValidityLabel(selectedSensor.ok)}
                  />
                ),
              },
              {
                key: 'measuredAt',
                label: 'Đo lúc',
                children: formatTimestamp(selectedSensor.measuredAt),
              },
              {
                key: 'lastValid',
                label: 'Hợp lệ cuối',
                children: formatTimestamp(selectedSensor.lastValidAt),
              },
            ]}
          />
        )}
      </Drawer>

      {/* ── Auto Control Detail Modal (READ-ONLY) ─────────────────────── */}
      {/*
        Modal chỉ hiển thị: cấu hình tự động + nhật ký kích hoạt.
        Không có form, không có nút lưu / sửa / xóa / bật-tắt.
      */}
            <Suspense fallback={null}>
              <AutoControlDetailModal
              floor={autoControlFloor}
              open={autoControlFloor !== null}
              onClose={() => setAutoControlFloor(null)}
              />
            </Suspense>

      {/* ── Camera Live Modal (READ-ONLY) ──────────────────────────────── */}
      {/*
        Tái sử dụng **đúng component** của trang "Camera toàn cảnh"
        (`features/cameras/components/CameraStreamModal`) → cùng ImouPlayer
        SDK, cùng KitToken flow, cùng xử lý lỗi.

        ⚠ Chỉ mở khi `streamingCamera !== null` ⇒ modal tự huỷ player khi
        đóng (`destroyOnHidden` + cleanup trong `CameraStreamModal`).
      */}
      {/*
        ⚠ `CameraStreamModal` lazy-load (xem `app/router/lazy-modals.ts`)
        ⇒ code modal + ImouPlayer SDK chỉ nạp khi modal mở lần đầu.
      */}
      <Suspense fallback={null}>
        <CameraStreamModal
          open={streamingCamera !== null}
          camera={streamingCamera}
          title={
            streamingFloor ? (
              <Space size={8}>
                <VideoCameraOutlined />
                <span>
                  Live — Tầng {streamingFloor.floor_number}
                  {streamingCamera?.cameraName
                    ? ` · ${streamingCamera.cameraName}`
                    : ''}
                </span>
              </Space>
            ) : undefined
          }
          onClose={() => {
            setStreamingCamera(null)
            setStreamingFloor(null)
          }}
        />
      </Suspense>
    </div>
  )
}

function ClimateMeasurement({ reading, unit }: { reading: ClimateReading; unit: string }) {
  const tone = getClimateTone(unit === '°C' ? 'temperature' : 'humidity', getClimateDirection(reading))
  const outside = reading.level === 'warning' || reading.level === 'danger'
  const below = reading.value != null && reading.min != null && reading.value < reading.min
  const target = reading.min != null && reading.max != null
    ? `${formatMeasurement(reading.min)}–${formatMeasurement(reading.max)}${unit}`
    : reading.min != null ? `≥ ${formatMeasurement(reading.min)}${unit}`
      : reading.max != null ? `≤ ${formatMeasurement(reading.max)}${unit}` : 'chưa có mục tiêu'
  const label = reading.value == null ? 'Chưa có dữ liệu'
    : `${formatMeasurement(reading.value)}${unit}, ${outside
      ? `${below ? 'thấp' : 'cao'} hơn ngưỡng ${formatMeasurement(reading.deviation)}${unit}`
      : reading.level === 'ok' ? 'trong ngưỡng' : 'chưa đủ thông tin'}, mục tiêu ${target}`
  return <Tooltip title={label} trigger={['hover', 'focus']}>
    <span tabIndex={0} aria-label={label} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, color: tones[tone].text }}>
      <strong style={{ fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>{formatMeasurement(tone === 'muted' ? null : reading.value)}</strong>
      {tone !== 'muted' && <small>{unit}</small>}
      {outside && <span aria-hidden="true" style={{ fontSize: 11 }}>{below ? '▼' : '▲'}</span>}
    </span>
  </Tooltip>
}
