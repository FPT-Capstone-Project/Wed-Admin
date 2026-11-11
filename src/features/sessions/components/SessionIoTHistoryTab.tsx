import {
  HistoryOutlined,
  LineChartOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Descriptions,
  Empty,
  Flex,
  Segmented,
  Skeleton,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { DataTable } from '../../../shared/ui/DataTable'
import { formatMeasurement } from '../../../shared/utils/measurement-format'
import { SESSION_GROWTH_STAGE_DICTIONARY } from '../../../shared/i18n/status/session'
import { statusLabel } from '../../../shared/i18n/status/registry'
import {
  useLatestSessionEnvironment,
  useSessionEnvironmentChart,
  useSessionEnvironmentHistory,
} from '../hooks/useSessionEnvironmentHistory'
import {
  useSessionClimateThresholds,
} from '../hooks/useSessionClimateThresholds'
import {
  useSessionDeviceCycles,
  useSessionFloorMappings,
} from '../hooks/useSessionDeviceActivity'
import type { SessionEnvironmentRecord } from '../types/session-environment-history.types'
import type { CultivationSessionStatus } from '../types/session.types'
import {
  buildFloorLabelMap,
  collectMappedFloorIds,
  filterSessionFloorMappings,
  type SessionFloorKey,
} from '../utils/session-floor-matching.utils'
import {
  resolveSessionChartAnchor,
  type SessionSensorTimeRange,
} from '../utils/session-sensor-aggregation.utils'
import { SessionDeviceCycleTable } from './SessionDeviceCycleTable'
import { SessionMappedFloorList } from './SessionMappedFloorList'
import { SessionSensorChart } from './SessionSensorChart'

/** Sub-tab bên trong tab "Lịch sử IoT". */
type IoTHistoryView = 'sensors' | 'commands'

/**
 * Số bản ghi tối đa hiển thị trong bảng "Dữ liệu cảm biến chi tiết".
 *
 * ⚠ BE đã **gộp sẵn 10 phút/tầng** ⇒ 1 phiên (15–20 ngày) chỉ có vài nghìn
 *   bản ghi ⇒ không còn rủi ro "hàng trăm nghìn" như khi đọc dữ liệu thô.
 *   Ta vẫn giới hạn ở **200 bản ghi mới nhất** cho bảng để dễ đọc.
 */
const MAX_SENSOR_TABLE_RECORDS = 200

const VIEW_OPTIONS: Array<{ value: IoTHistoryView; label: string }> = [
  { value: 'sensors', label: 'Cảm biến' },
  { value: 'commands', label: 'Lệnh thiết bị' },
]

const DATE_TIME_FMT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

function fmtDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return DATE_TIME_FMT.format(date)
}

/**
 * Nhãn tiếng Việt cho giai đoạn canh tác — lấy từ **module trung tâm**
 * (khớp `components/admin-session-status.config.ts`).
 */
const GROWTH_STAGE_LABEL: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(SESSION_GROWTH_STAGE_DICTIONARY).map(([key, value]) => [
      key,
      value.label,
    ]),
  ),
  UNKNOWN: 'Chưa ghi nhận',
}

/**
 * Nhãn giai đoạn **an toàn** — enum lạ của BE không bao giờ lộ ra UI.
 */
function growthStageLabel(value: string | null | undefined): string {
  if (!value) return '—'
  if (value === 'UNKNOWN') return GROWTH_STAGE_LABEL.UNKNOWN
  return statusLabel(SESSION_GROWTH_STAGE_DICTIONARY, value, GROWTH_STAGE_LABEL[value] ?? value)
}

export interface SessionIoTHistoryTabProps {
  sessionId: number | null
  /** Tầng của các khay được gán — nguồn chuẩn của các tầng thuộc phiên. */
  fallbackFloorIds: number[]
  /** Đầu phiên (ISO 8601) — dùng lọc nhật ký thiết bị theo đúng khoảng phiên. */
  sessionStart?: string | null
  /** Cuối phiên (ISO 8601) — `null` nghĩa là phiên đang chạy. */
  sessionEnd?: string | null
  /**
   * Trạng thái phiên — dùng để biết phiên đã kết thúc hay chưa.
   *
   * ⚠ **Quan trọng**: phiên đã kết thúc thì biểu đồ phải neo về **cuối
   *   phiên** thay vì `now` (xem `resolveSessionChartAnchor`).
   */
  sessionStatus?: CultivationSessionStatus | null
  /**
   * Khoá tầng của phiên — dùng để khớp với danh sách tầng của BE.
   *
   * ⚠ Khi BE **không** trả `floor_id` trong `/api/iot/floors`, ta cần thêm
   *   `room_id` + `floor_number` + `floor_name` để khớp tầng (xem
   *   `utils/session-floor-matching.utils.ts`).
   */
  floorKeys?: SessionFloorKey[]
}

/**
 * Tab "Lịch sử IoT" của phiên canh tác — **100% READ-ONLY**.
 *
 * ## Phân tách trách nhiệm 2 API
 *
 * | Sub-tab           | Endpoint                                       | Nội dung                       |
 * |-------------------|------------------------------------------------|--------------------------------|
 * | **Cảm biến**     | `GET /api/environment-history/sessions/{id}`    | Nhiệt độ + độ ẩm (biểu đồ + bảng) |
 * | **Lệnh thiết bị** | `GET /api/iot/floors/{floorId}/auto-control/logs` | Nhật ký chu kỳ bật/tắt thiết bị |
 *
 * ⚠ **Vì sao đổi API?**
 *   BE đã **gỡ bỏ** nhóm `/api/cultivation-sessions/admin/{sessionId}/iot-history`
 *   (commit `4e136253` — "xóa xem lịch sử iot của từng phiên trồng") ⇒ cả
 *   `/iot-history` lẫn `/iot-history/sensors` đều trả **404**.
 *
 *   - Dữ liệu cảm biến nay nằm ở nhóm **Environment History**
 *     (`/api/environment-history/sessions/{sessionId}`), đã **gộp sẵn 10
 *     phút/tầng** bởi BE ⇒ 1 request phủ trọn cửa sổ thay vì hàng trăm
 *     trang dữ liệu thô.
 *   - Nhật ký lệnh thiết bị nay nằm ở `iot_auto_control_logs`, đọc **theo
 *     tầng** ⇒ ta gộp log của các tầng thuộc phiên rồi lọc theo khoảng thời
 *     gian của phiên.
 *
 * ⚠ Chỉ gọi API của sub-tab đang mở ⇒ không tải thừa khi user vừa mở drawer.
 */
export function SessionIoTHistoryTab({
  sessionId,
  fallbackFloorIds,
  sessionStart,
  sessionEnd,
  sessionStatus = null,
  floorKeys = [],
}: SessionIoTHistoryTabProps) {
  const [view, setView] = useState<IoTHistoryView>('sensors')

  /**
   * Khoảng thời gian của biểu đồ — **mặc định 1 giờ**.
   *
   * ⚠ State nằm ở component cha (không phải trong `SessionSensorChart`) vì mốc
   *   thời gian quyết định **dữ liệu nào được kéo từ API** ⇒ đổi mốc phải
   *   kích hoạt fetch lại, không chỉ re-render.
   */
  const [timeRange, setTimeRange] = useState<SessionSensorTimeRange>('1h')

  /**
   * ⚠ Phiên đã **kết thúc** hay chưa?
   *
   *   `COMPLETED` / `CANCELLED` ⇒ dữ liệu nằm trong quá khứ ⇒ biểu đồ phải
   *   neo về cuối phiên thay vì `now`.
   */
  const sessionEnded =
    sessionStatus === 'COMPLETED' || sessionStatus === 'CANCELLED'

  /**
   * ⚠ **Tầng dùng cho biểu đồ** — lấy từ `trays[].floor_id` của endpoint quản
   *   trị (nguồn chuẩn của phiên).
   *
   *   Endpoint `environment-history` **đã giới hạn theo phiên** ⇒ trả về đúng
   *   các tầng thuộc phiên ⇒ không cần lọc thêm.
   *
   *   Ta vẫn giữ danh sách này để (1) gắn **nhãn tầng** cho tooltip biểu đồ và
   *   (2) làm căn cứ lấy nhật ký thiết bị ở sub-tab "Lệnh thiết bị".
   */
  const chartFloorIds = fallbackFloorIds

  // ─── Tầng đã map của hệ thống ──────────────────────────────────────────
  /*
   * ⚠ Danh sách tầng (`GET /api/iot/floors`) được dùng cho **cả 2** sub-tab:
   *   - "Cảm biến": gắn nhãn tầng cho tooltip biểu đồ.
   *   - "Lệnh thiết bị": lọc tầng **thuộc phiên** + lấy `floor_id` để gọi
   *     `GET /api/iot/floors/{floorId}/auto-control/logs`.
   *
   *   ⇒ Gọi **1 lần** cho cả tab (danh sách tầng rất nhỏ) ⇒ không tải thừa.
   */
  const {
    data: floorMappings,
    isLoading: mappingLoading,
  } = useSessionFloorMappings()

  /**
   * Nhãn tầng — tra theo `floor_id` để hiển thị "Tầng 1" (số tầng **thực tế**)
   * thay vì "Tầng #1" / ID database.
   *
   * ⚠ **Vì sao gộp 2 nguồn?**
   *   - BE map (`/api/iot/floors`): có `floor_number` + `floor_name` chuẩn,
   *     nhưng có thể **thiếu** `floor_id` (Swagger không khai báo cột này).
   *   - `trays[]` của phiên (`floorKeys`): có `floor_id` + `floor_number`,
   *     luôn có sẵn trong dữ liệu phiên.
   *   ⇒ Gộp cả hai ⇒ **luôn** map được `floor_id` → `floor_number` ⇒ không
   *     bao giờ rơi vào nhánh fallback in ID database.
   */
  const floorLabels = useMemo(() => {
    const labels = buildFloorLabelMap([
      ...(floorMappings ?? []),
      ...floorKeys,
    ])

    // Fallback cuối cùng: tầng có `floor_id` nhưng không có bất kỳ metadata nào.
    for (const id of chartFloorIds) {
      if (!labels.has(id)) labels.set(id, `Tầng ${id}`)
    }

    return labels
  }, [chartFloorIds, floorMappings, floorKeys])

  // ─── Cảm biến (biểu đồ) ────────────────────────────────────────────────
  /*
   * ⚠ **Thứ tự gọi API** — `latest` phải **đi trước** `chart` vì mốc neo của
   *   biểu đồ (cho phiên đã kết thúc) lấy từ bản ghi mới nhất.
   *
   *   ⇒ Với phiên **đã kết thúc**, ta **chờ** `latest` resolve rồi mới bật
   *     `chart` ⇒ không phải fetch 2 lần (lần đầu neo nhầm, lần 2 neo đúng).
   *
   *   Với phiên **đang chạy**, mốc neo là `now` ⇒ không cần chờ ⇒ `chart` bật
   *   luôn ⇒ không bị chậm.
   */
  const {
    data: latestRecord,
    isPending: latestPending,
  } = useLatestSessionEnvironment(sessionId, {
    enabled: view === 'sensors',
  })

  /**
   * ⚠ **Mốc neo của biểu đồ** — phiên đã kết thúc thì lùi về cuối phiên.
   *
   *   Nếu không có mốc neo, biểu đồ của phiên kết thúc sẽ **trống trơn**
   *   (dữ liệu nằm trong quá khứ, cửa sổ lại tính từ `now`).
   */
  const chartAnchorEnd = useMemo(
    () =>
      resolveSessionChartAnchor({
        sessionEnded,
        sessionEnd,
        latestRecord,
      }),
    [sessionEnded, sessionEnd, latestRecord],
  )

  /**
   * ⚠ Phiên đã kết thúc ⇒ chờ `latest` xong rồi mới vẽ biểu đồ.
   *
   *   ⇒ trục thời gian luôn khớp đúng vùng dữ liệu thực tế, chỉ 1 request.
   */
  const chartReady =
    view !== 'sensors' || !sessionEnded || !latestPending

  const {
    data: chartPoints,
    isLoading: chartLoading,
    isFetching: chartFetching,
    isError: chartFailed,
    error: chartError,
    refetch: refetchChart,
  } = useSessionEnvironmentChart(
    sessionId,
    timeRange,
    floorLabels,
    chartAnchorEnd,
    { enabled: view === 'sensors' && chartReady },
  )

  // ─── Cảm biến (bảng — phân trang server-side) ──────────────────────────
  const [sensorPage, setSensorPage] = useState(1)
  const [sensorPageSize, setSensorPageSize] = useState(20)
  const {
    data: sensorPageData,
    isLoading: sensorLoading,
    isError: sensorFailed,
    error: sensorError,
    refetch: refetchSensors,
  } = useSessionEnvironmentHistory(
    sessionId,
    { page: sensorPage, pageSize: sensorPageSize },
    { enabled: view === 'sensors' },
  )

  // ─── Lệnh thiết bị (nhật ký theo tầng — lọc client-side) ─────────────
  const sessionWindow = useMemo(() => {
    const from = sessionStart ? Date.parse(sessionStart) : undefined
    /*
     * ⚠ **Không** dùng `Date.now()` trong render (React purity rule).
     *   Phiên chưa có `end_date` (đang canh tác) ⇒ không chặn trên ⇒ log tới
     *   hiện tại vẫn được lấy (đúng ý nghĩa "từ lúc bắt đầu phiên").
     */
    const to = sessionEnd ? Date.parse(sessionEnd) : undefined
    return {
      from: Number.isFinite(from) ? from : undefined,
      to: Number.isFinite(to) ? to : undefined,
    }
  }, [sessionStart, sessionEnd])

  /**
   * ⚠ **Tầng đã map thuộc phiên** — khớp theo `floor_id` trước, fallback sang
   *   `room_id` + `floor_number` / thiết bị / tên khi BE không trả `floor_id`.
   *
   *   Xem `utils/session-floor-matching.utils.ts` để hiểu thứ tự ưu tiên.
   */
  const mappedFloors = useMemo(
    () => filterSessionFloorMappings(floorKeys, floorMappings ?? []),
    [floorKeys, floorMappings],
  )

  /**
   * ⚠ **Nhãn tầng cho bảng nhật ký thiết bị.**
   *
   *   ⚠ **Vì sao cần?**
   *     `floor_id` là khoá kỹ thuật trong DB (`cultivation_floors.floor_id` là
   *     SERIAL, đánh số theo thứ tự tạo — **không** theo thứ tự tầng).
   *     ⇒ Tầng "Tầng 2" có thể có `floor_id = 3` ⇒ in trực tiếp `floor_id`
   *       sẽ hiện "Tầng 3" ⇒ **sai**, lệch với thẻ tầng ở trên.
   *
   *   ⚠ Gộp **cả** tầng BE map (`mappedFloors`) lẫn tầng của các khay được
   *     gán (`floorKeys`) ⇒ luôn map được `floor_id` → `floor_number`, kể cả
   *     khi BE map thiếu `floor_id` hoặc thiếu `floor_number`.
   */
  const deviceFloorLabels = useMemo(
    () => buildFloorLabelMap([...mappedFloors, ...floorKeys]),
    [mappedFloors, floorKeys],
  )

  /**
   * ⚠ **Tầng dùng để gọi endpoint nhật ký thiết bị.**
   *
   *   Ưu tiên `floor_id` mà BE map trong `/iot/floors` (đây mới là định danh
   *   đúng của tầng — `room_id` chỉ là phòng chứa tầng).
   *
   *   Fallback về `trays[].floor_id` của endpoint quản trị khi BE map không
   *   khớp được tầng nào (thiếu `floor_id` trong response `/api/iot/floors`).
   */
  const deviceFloorIds = useMemo(() => {
    const ids = collectMappedFloorIds(mappedFloors)
    if (ids.length > 0) return ids
    return fallbackFloorIds
  }, [mappedFloors, fallbackFloorIds])

  const {
    data: deviceCycles,
    isLoading: deviceLoading,
    isError: deviceFailed,
    error: deviceError,
    refetch: refetchDevices,
  } = useSessionDeviceCycles(
    view === 'commands' ? deviceFloorIds : [],
    sessionWindow,
    {
      enabled: view === 'commands',
      floorLabels: deviceFloorLabels,
    },
  )

  const records = useMemo(
    () => sensorPageData?.records ?? [],
    [sensorPageData?.records],
  )

  /**
   * Tầng dùng để tra ngưỡng canh tác.
   *
   * Ưu tiên tầng BE map trong `/iot/floors`; fallback tầng của các khay được
   * gán (endpoint quản trị trả `trays[].floor_id`).
   */
  const floorIds = useMemo(() => {
    const ids = new Set<number>()
    mappedFloors.forEach((floor) => {
      if (floor.floorId != null) ids.add(floor.floorId)
    })
    fallbackFloorIds.forEach((id) => ids.add(id))
    return [...ids]
  }, [mappedFloors, fallbackFloorIds])

  const thresholdsByFloor = useSessionClimateThresholds(
    view === 'sensors' ? floorIds : [],
  )

  const recordColumns: ColumnsType<SessionEnvironmentRecord> = [
    {
      title: 'Khoảng thời gian',
      key: 'period',
      width: 170,
      render: (_, row) => (
        <Flex vertical gap={2}>
          <Typography.Text className="mcms-session-mono" style={{ fontSize: 12 }}>
            {fmtDateTime(row.period_start)}
          </Typography.Text>
          <Typography.Text
            className="mcms-session-mono"
            type="secondary"
            style={{ fontSize: 11 }}
          >
            → {fmtDateTime(row.period_end)}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Tầng',
      dataIndex: 'floor_id',
      key: 'floor_id',
      width: 110,
      /*
       * ⚠ **Dùng map `floorLabels`** để hiển thị **số tầng thực tế**
       *   (`Tầng ${floor_number}`) thay vì in trực tiếp `row.floor_id`.
       *
       *   `floor_id` là khoá kỹ thuật trong DB (SERIAL) ⇒ có thể khác số tầng
       *   (tầng "Tầng 2" có `floor_id = 3`) ⇒ in thẳng sẽ hiện "Tầng 3" ⇒ sai.
       */
      render: (value: number | null) => (
        <Typography.Text style={{ fontSize: 12 }}>
          {value != null
            ? (floorLabels.get(value) ?? `Tầng ${value}`)
            : '—'}
        </Typography.Text>
      ),
    },
    {
      title: 'Giai đoạn',
      dataIndex: 'growth_stage',
      key: 'growth_stage',
      width: 150,
      render: (value: string | null) => (
        <Tag color={value === 'UNKNOWN' ? 'default' : 'blue'} style={{ fontSize: 11 }}>
          {growthStageLabel(value)}
        </Tag>
      ),
    },
    {
      title: 'Nhiệt độ TB',
      dataIndex: 'temperature_avg',
      key: 'temperature_avg',
      width: 120,
      align: 'right',
      render: (value: number | null) => (
        <Typography.Text strong>
          {value != null ? `${formatMeasurement(value)}°C` : '—'}
        </Typography.Text>
      ),
    },
    {
      title: 'Độ ẩm TB',
      dataIndex: 'humidity_avg',
      key: 'humidity_avg',
      width: 120,
      align: 'right',
      render: (value: number | null) => (
        <Typography.Text strong>
          {value != null ? `${formatMeasurement(value)}%RH` : '—'}
        </Typography.Text>
      ),
    },
  ]

  const sensorsContent = (
    <Flex vertical gap={16}>
      {chartFailed ? (
        <Alert
          type="warning"
          showIcon
          message="Không tải được lịch sử cảm biến."
          description={chartError?.message}
        />
      ) : (chartLoading && !chartPoints) || (!chartReady && !chartPoints) ? (
        /*
         * ⚠ Chờ `latest` resolve (phiên đã kết thúc) ⇒ hiển thị skeleton thay
         *   vì biểu đồ chưa thể vẽ đúng mốc neo.
         */
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
          <SessionSensorChart
            points={chartPoints ?? []}
            thresholdsByFloor={thresholdsByFloor}
            timeRange={timeRange}
            anchorEnd={chartAnchorEnd}
            onTimeRangeChange={setTimeRange}
            loading={chartFetching}
          />

          {/* ── Chỉ số mới nhất ─────────────────────────────────────── */}
          {latestRecord && (
            <Descriptions
              size="small"
              bordered
              column={{ xs: 1, sm: 2, lg: 4 }}
              title="Chỉ số môi trường mới nhất"
              items={[
                {
                  key: 'time',
                  label: 'Thời điểm',
                  children: (
                    <Typography.Text
                      className="mcms-session-mono"
                      style={{ fontSize: 12 }}
                    >
                      {fmtDateTime(latestRecord.period_start)}
                    </Typography.Text>
                  ),
                },
                {
                  key: 'floor',
                  label: 'Tầng',
                  children:
                    latestRecord.floor_id != null
                      ? `Tầng ${latestRecord.floor_id}`
                      : '—',
                },
                {
                  key: 'temp',
                  label: 'Nhiệt độ TB',
                  children:
                    latestRecord.temperature_avg != null
                      ? `${formatMeasurement(latestRecord.temperature_avg)}°C`
                      : '—',
                },
                {
                  key: 'humidity',
                  label: 'Độ ẩm TB',
                  children:
                    latestRecord.humidity_avg != null
                      ? `${formatMeasurement(latestRecord.humidity_avg)}%RH`
                      : '—',
                },
              ]}
            />
          )}

          {sensorFailed && (
            <Alert
              type="warning"
              showIcon
              message="Không tải được bảng dữ liệu cảm biến."
              description={sensorError?.message}
            />
          )}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Bảng hiển thị tối đa {MAX_SENSOR_TABLE_RECORDS} bản ghi mới nhất.
            Mỗi bản ghi là trung bình của các lần đo hợp lệ trong 10 phút tại
            tầng đó. Để theo dõi toàn bộ chu kỳ, vui lòng quan sát biểu đồ phía
            trên.
          </Typography.Text>
          {/*
            ⚠ **Phiên đã kết thúc** — biểu đồ neo về cuối phiên thay vì `now`
              ⇒ ghi chú lại để Admin không tưởng là lỗi hiển thị sai.
          */}
          {sessionEnded && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Phiên đã kết thúc nên biểu đồ được neo về thời điểm dữ liệu cuối
              cùng
              {chartAnchorEnd
                ? ` (${fmtDateTime(new Date(chartAnchorEnd).toISOString())})`
                : ''}
              , không phải thời điểm hiện tại.
            </Typography.Text>
          )}
          <DataTable<SessionEnvironmentRecord>
            rowKey={(row) =>
              `${row.session_id ?? ''}-${row.floor_id ?? ''}-${row.period_start ?? ''}`
            }
            title="Dữ liệu cảm biến chi tiết"
            description="Nhiệt độ và độ ẩm trung bình theo tầng, đã gộp sẵn theo nhóm 10 phút."
            columns={recordColumns}
            dataSource={records}
            loading={sensorLoading}
            pagination={{
              current: sensorPage,
              pageSize: sensorPageSize,
              /*
               * ⚠ **Giới hạn cứng 10 trang** (~100–200 bản ghi mới nhất).
               */
              total: Math.min(
                sensorPageData?.pagination.total ?? records.length,
                MAX_SENSOR_TABLE_RECORDS,
              ),
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total) => `Tổng ${total} bản ghi`,
              onChange: (nextPage, nextPageSize) => {
                /*
                 * ⚠ Chặn bước sang trang > 10 — bảng chỉ dẫn tới 200 bản ghi
                 *   mới nhất.
                 */
                const maxPage = Math.max(
                  1,
                  Math.ceil(MAX_SENSOR_TABLE_RECORDS / nextPageSize),
                )
                setSensorPage(
                  Math.min(
                    nextPageSize !== sensorPageSize ? 1 : nextPage,
                    maxPage,
                  ),
                )
                setSensorPageSize(nextPageSize)
              },
            }}
            scroll={{ x: 720 }}
            emptyTitle="Chưa có dữ liệu cảm biến"
            emptyDescription="Phiên này chưa ghi nhận bản ghi môi trường nào. Dữ liệu được tổng hợp mỗi 10 phút khi thiết bị hoạt động trong suốt phiên."
          />
        </>
      )}
    </Flex>
  )

  const commandsContent = (
    <Flex vertical gap={16}>
      {deviceFailed ? (
        <Alert
          type="warning"
          showIcon
          message="Không tải được nhật ký thiết bị."
          description={deviceError?.message}
        />
      ) : deviceLoading && !deviceCycles ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
          <SessionMappedFloorList floors={mappedFloors} />
          <SessionDeviceCycleTable
            cycles={deviceCycles ?? []}
            loading={deviceLoading || mappingLoading}
          />
        </>
      )}
    </Flex>
  )

  return (
    <Flex vertical gap={16}>
      <Flex justify="space-between" align="center" gap={12} wrap>
        <Segmented<IoTHistoryView>
          value={view}
          onChange={(next) => {
            setView(next)
            setSensorPage(1)
          }}
          options={VIEW_OPTIONS.map((option) => ({
            value: option.value,
            label: (
              <span>
                {option.value === 'sensors' ? (
                  <LineChartOutlined aria-hidden="true" />
                ) : (
                  <HistoryOutlined aria-hidden="true" />
                )}{' '}
                {option.label}
              </span>
            ),
          }))}
        />
        <Button
          type="text"
          size="small"
          icon={<ReloadOutlined />}
          loading={chartLoading || sensorLoading || deviceLoading}
          onClick={() => {
            if (view === 'sensors') {
              void refetchChart()
              void refetchSensors()
            } else {
              void refetchDevices()
            }
          }}
        >
          Tải lại
        </Button>
      </Flex>

      {view === 'sensors' ? sensorsContent : commandsContent}

      {view === 'sensors' &&
        !chartLoading &&
        !chartFailed &&
        chartReady &&
        (chartPoints?.length ?? 0) === 0 && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              sessionEnded
                ? 'Phiên này không có dữ liệu cảm biến trong khoảng thời gian đã chọn. Dữ liệu môi trường được tổng hợp mỗi 10 phút khi thiết bị hoạt động trong suốt phiên.'
                : 'Phiên này chưa có lịch sử cảm biến. Dữ liệu môi trường được tổng hợp mỗi 10 phút khi thiết bị hoạt động trong suốt phiên.'
            }
          />
        )}
    </Flex>
  )
}
