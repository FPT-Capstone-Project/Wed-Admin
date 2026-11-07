import {
  HistoryOutlined,
  LineChartOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Empty,
  Flex,
  Segmented,
  Skeleton,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { DataTable } from '../../../shared/ui/DataTable'
import { formatMeasurement } from '../../../shared/utils/measurement-format'
import {
  useSessionAllCommands,
  useSessionSensorChart,
  useSessionSensorHistory,
} from '../hooks/useSessionIoTHistory'
import { useSessionClimateThresholds } from '../hooks/useSessionClimateThresholds'
import type { SessionSensorReading } from '../types/session-iot-history.types'
import type { SessionSensorTimeRange } from '../utils/session-sensor-aggregation.utils'
import { SessionCommandTable } from './SessionCommandTable'
import { SessionMappedFloorList } from './SessionMappedFloorList'
import { SessionSensorChart } from './SessionSensorChart'

/** Sub-tab bên trong tab "Lịch sử IoT". */
type IoTHistoryView = 'sensors' | 'commands'

/**
 * Số bản ghi tối đa hiển thị trong bảng "Dữ liệu cảm biến chi tiết".
 *
 * ⚠ BE báo tổng có thể lên tới **hàng trăm nghìn** lần đo (≈22.000 trang) —
 *   không ai đọc nổi. Ta chặn ở **200 bản ghi mới nhất** (≈10 trang × 20).
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

export interface SessionIoTHistoryTabProps {
  sessionId: number | null
  /** Tầng của các khay được gán — fallback khi BE chưa trả `floors`. */
  fallbackFloorIds: number[]
}

/**
 * Tab "Lịch sử IoT" của phiên canh tác — **100% READ-ONLY**.
 *
 * ## Phân tách trách nhiệm 2 API
 *
 * | Sub-tab           | Endpoint                        | Nội dung                         |
 * |-------------------|---------------------------------|----------------------------------|
 * | **Cảm biến**     | `GET .../iot-history/sensors`   | Nhiệt độ + độ ẩm raw (biểu đồ)  |
 * | **Lệnh thiết bị** | `GET .../iot-history`           | Lệnh ON/OFF + tầng đã map (bảng) |
 *
 * ⚠ **Tách riêng** vì đây là 2 endpoint khác nhau với mục đích khác nhau:
 *   biểu đồ cần **nhiều điểm** (gộp nhiều trang), còn bảng audit cần
 *   **phân trang server-side**. Trộn chung sẽ khiến mỗi lần đổi bảng phải
 *   vẽ lại toàn bộ biểu đồ.
 *
 * ⚠ Chỉ gọi API của sub-tab đang mở ⇒ không tải thừa khi user vừa mở drawer.
 *
 * ⚠ Shape response đã verify từ Backend:
 *   - `/iot-history` → `data = { session, floors, temperatureReadings,
 *     deviceEvents, pagination }` — key lệnh là **`deviceEvents`**.
 *   - `/iot-history/sensors` → `data = { session, readings, pagination }`.
 *
 * ⚠ Cả 2 route **đã được BE implement** (verify từ
 *   `Backend/src/routes/cultivationSession.routes.js`) ⇒ 404 chỉ xảy ra khi
 *   phiên không tồn tại / bị chặn quyền ⇒ hook trả `null` ⇒ hiển thị empty
 *   state có hướng dẫn thay vì banner lỗi đỏ.
 */
export function SessionIoTHistoryTab({
  sessionId,
  fallbackFloorIds,
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

  /*
   * ⚠ **Tầng dùng cho biểu đồ** — lấy từ `trays[].floor_id` của endpoint quản
   *   trị (nguồn chuẩn của phiên).
   *
   *   Nguồn `environment-history` trả dữ liệu của **mọi tầng ACTIVE** ⇒ phải
   *   lọc theo đúng tầng của phiên, nếu không sẽ vẽ lẫn tầng của phiên khác.
   *
   *   ⚠ Dùng `fallbackFloorIds` (không phải `floorIds`) vì `floorIds` còn phụ
   *     thuộc `mappedFloors` — mà `mappedFloors` chỉ có khi sub-tab "Lệnh thiết
   *     bị" được mở ⇒ lúc này luôn rỗng. `fallbackFloorIds` luôn sẵn có.
   */
  const chartFloorIds = fallbackFloorIds

  // ─── Cảm biến (biểu đồ — đã gộp nhiều trang theo mốc thời gian) ───────
  const {
    data: chartPoints,
    isLoading: chartLoading,
    isFetching: chartFetching,
    isError: chartFailed,
    error: chartError,
    refetch: refetchChart,
  } = useSessionSensorChart(sessionId, timeRange, chartFloorIds, {
    enabled: view === 'sensors',
  })

  // ─── Cảm biến (bảng — phân trang server-side) ──────────────────────────
  const [sensorPage, setSensorPage] = useState(1)
  const [sensorPageSize, setSensorPageSize] = useState(20)
  const {
    data: sensorPageData,
    isLoading: sensorLoading,
    isError: sensorFailed,
    error: sensorError,
    refetch: refetchSensors,
  } = useSessionSensorHistory(
    sessionId,
    { page: sensorPage, pageSize: sensorPageSize },
    { enabled: view === 'sensors' },
  )

  // ─── Lệnh thiết bị (gom TOÀN BỘ lệnh của phiên — lọc client-side) ─────
  const {
    data: allCommandsData,
    isLoading: commandLoading,
    isError: commandFailed,
    error: commandError,
    refetch: refetchCommands,
  } = useSessionAllCommands(sessionId, { enabled: view === 'commands' })

  const readings = useMemo(
    () => sensorPageData?.readings ?? [],
    [sensorPageData?.readings],
  )
  const commands = useMemo(
    () => allCommandsData?.commands ?? [],
    [allCommandsData?.commands],
  )
  const mappedFloors = useMemo(
    () => allCommandsData?.floors ?? [],
    [allCommandsData?.floors],
  )

  /**
   * Tầng dùng để tra ngưỡng canh tác.
   *
   * Ưu tiên tầng BE map trong `/iot-history`; fallback tầng của các khay được
   * gán (endpoint quản trị trả `trays[].floor_id`).
   */
  const floorIds = useMemo(() => {
    const ids = new Set<number>()
    mappedFloors.forEach((floor) => {
      if (floor.floor_id != null) ids.add(floor.floor_id)
    })
    fallbackFloorIds.forEach((id) => ids.add(id))
    return [...ids]
  }, [mappedFloors, fallbackFloorIds])

  const thresholdsByFloor = useSessionClimateThresholds(
    view === 'sensors' ? floorIds : [],
  )

  const readingColumns: ColumnsType<SessionSensorReading> = [
    {
      title: 'Thời điểm',
      key: 'timestamp',
      width: 150,
      render: (_, row) => (
        <Typography.Text className="mcms-session-mono" style={{ fontSize: 12 }}>
          {fmtDateTime(row.measured_at ?? row.received_at)}
        </Typography.Text>
      ),
    },
    {
      title: 'Tầng',
      dataIndex: 'floor_name',
      key: 'floor_name',
      width: 130,
      render: (value: string | null, row) => (
        <Typography.Text style={{ fontSize: 12 }}>
          {value ?? (row.floor_id != null ? `Tầng ${row.floor_id}` : '—')}
        </Typography.Text>
      ),
    },
    {
      title: 'Cảm biến',
      key: 'sensor',
      width: 120,
      render: (_, row) => (
        <Typography.Text
          className="mcms-session-mono"
          style={{ fontSize: 12 }}
        >
          {row.sensor_id != null ? `Sensor ${row.sensor_id}` : '—'}
          {row.node_address != null ? ` · N${row.node_address}` : ''}
        </Typography.Text>
      ),
    },
    {
      title: 'Nhiệt độ',
      dataIndex: 'temperature',
      key: 'temperature',
      width: 110,
      align: 'right',
      render: (value: number | null) => (
        <Typography.Text strong>
          {value != null ? `${formatMeasurement(value)}°C` : '—'}
        </Typography.Text>
      ),
    },
    {
      title: 'Độ ẩm',
      dataIndex: 'humidity',
      key: 'humidity',
      width: 110,
      align: 'right',
      render: (value: number | null) => (
        <Typography.Text strong>
          {value != null ? `${formatMeasurement(value)}%RH` : '—'}
        </Typography.Text>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 110,
      align: 'center',
      render: (_, row) => (
        <Typography.Text
          type={row.is_valid === false ? 'danger' : 'secondary'}
          style={{ fontSize: 12 }}
        >
          {row.is_valid === false
            ? 'Sai số'
            : row.is_valid === true
              ? 'Hợp lệ'
              : '—'}
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
      ) : chartLoading && !chartPoints ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
          <SessionSensorChart
            points={chartPoints ?? []}
            thresholdsByFloor={thresholdsByFloor}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            loading={chartFetching}
          />
          {sensorFailed && (
            <Alert
              type="warning"
              showIcon
              message="Không tải được bảng dữ liệu cảm biến."
              description={sensorError?.message}
            />
          )}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Bảng hiển thị tối đa {MAX_SENSOR_TABLE_RECORDS} bản ghi đo mới nhất
            để đối chiếu thông số tức thời. Để theo dõi toàn bộ chu kỳ, vui lòng
            quan sát biểu đồ phía trên.
          </Typography.Text>
          <DataTable<SessionSensorReading>
            rowKey={(row) =>
              row.reading_id != null
                ? String(row.reading_id)
                : `${row.received_at}-${row.sensor_id}-${row.master_id}`
            }
            title="Dữ liệu cảm biến chi tiết"
            description="Nhiệt độ và độ ẩm từng lần đo trong phiên canh tác."
            columns={readingColumns}
            dataSource={readings}
            loading={sensorLoading}
            pagination={{
              current: sensorPage,
              pageSize: sensorPageSize,
              /*
               * ⚠ **Giới hạn cứng 10 trang** (~100–200 bản ghi mới nhất).
               *
               * BE báo tổng có thể lên tới **hàng trăm nghìn** lần đo (≈22.000
               * trang) — không ai đọc nổi. Ta chặn phân trang ở 10 trang gần
               * nhất; phần còn lại xem qua biểu đồ.
               */
              total: Math.min(
                sensorPageData?.pagination.total ?? readings.length,
                MAX_SENSOR_TABLE_RECORDS,
              ),
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total) => `Tổng ${total} lần đo`,
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
            scroll={{ x: 760 }}
            emptyTitle="Chưa có dữ liệu cảm biến"
            emptyDescription="Phiên này chưa ghi nhận lần đo nào từ cảm biến."
          />
        </>
      )}
    </Flex>
  )

  const commandsContent = (
    <Flex vertical gap={16}>
      {commandFailed ? (
        <Alert
          type="warning"
          showIcon
          message="Không tải được nhật ký lệnh thiết bị."
          description={commandError?.message}
        />
      ) : commandLoading && !allCommandsData ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
          <SessionMappedFloorList floors={mappedFloors} />
          <SessionCommandTable commands={commands} loading={commandLoading} />
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
          loading={chartLoading || commandLoading || sensorLoading}
          onClick={() => {
            if (view === 'sensors') {
              void refetchChart()
              void refetchSensors()
            } else {
              void refetchCommands()
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
        (chartPoints?.length ?? 0) === 0 && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Phiên này chưa có lịch sử cảm biến. Cảm biến chỉ ghi nhận dữ liệu khi thiết bị hoạt động trong suốt phiên."
          />
        )}
    </Flex>
  )
}
