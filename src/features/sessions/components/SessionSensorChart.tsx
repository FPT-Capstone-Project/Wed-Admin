import {
  ChartFrame,
  ChartLegend,
  ChartTooltipSurface,
} from '../../../shared/ui/charts/ChartPrimitives'
import { useChartMotion } from '../../../shared/ui/charts/useChartMotion'
import { chartTickStyle } from '../../../shared/ui/charts/chart-styles'
import { formatMeasurement } from '../../../shared/utils/measurement-format'
import { chartSeries, tones } from '../../../app/theme/tokens'
import {
  evaluateHumidity,
  evaluateTemperature,
  type ClimateThresholds,
} from '../../rooms/utils/tray-climate.utils'
import { getClimateDirection } from '../../rooms/utils/climate-tone.utils'
import { climateAxis } from '../../dashboard/utils/climate-axis.utils'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Flex, Segmented, Skeleton, Spin, Typography } from 'antd'
import { useMemo } from 'react'
import {
  buildAxisTicks,
  resolveAxisDomain,
  SENSOR_TIME_RANGE_BUCKET_MINUTES,
  SENSOR_TIME_RANGE_OPTIONS,
  SENSOR_TIME_RANGE_USES_SERVER_AGGREGATE,
  type SessionClimatePoint,
  type SessionSensorTimeRange,
} from '../utils/session-sensor-aggregation.utils'

/**
 * Biểu đồ lịch sử cảm biến của một phiên canh tác.
 *
 * ⚠ Nguồn dữ liệu (xem `hooks/useSessionIoTHistory.ts` → `useSessionSensorChart`):
 *   - `1h` → `GET /api/cultivation-sessions/admin/{sessionId}/iot-history/sensors`
 *     (dữ liệu thô, gom 1 phút/điểm tại FE).
 *   - `6h/12h/24h` → `GET /api/analytics/dashboard/environment-history`
 *     (BE gộp sẵn 15 phút/điểm — 1 request phủ trọn cửa sổ).
 *
 * Quy ước hiển thị (đồng nhất với `features/dashboard/components/EnvironmentChart.tsx`):
 *   - Trục tung **trái**  = nhiệt độ (°C) — đường liền, **đỏ**.
 *   - Trục tung **phải** = độ ẩm (%RH) — đường **đứt**, **xanh dương**.
 *   - Trục hoành        = thời gian.
 *
 * ⚠ Màu chữ trong tooltip **theo đúng màu đường** (`chartSeries`) ⇒ nhận diện
 *   chỉ số bằng màu giống hệt đường vẽ, không dùng màu tone trạng thái
 *   (xanh lá "ổn") vốn dễ gây nhầm với màu đường.
 *
 * ⚠ Cảm biến có thể thuộc **nhiều tầng** (phiên gán nhiều khay ở nhiều tầng).
 *   ⇒ Mỗi điểm được gắn ngưỡng của tầng tương ứng; điểm không xác định được
 *   tầng thì dùng ngưỡng **chung** (hợp nhất các tầng) để không bị mất cảnh
 *   báo.
 *
 * ⚠ **Trục hoành cố định theo cửa sổ thời gian cho 6h/12h/24h**:
 *   nếu co theo min/max dữ liệu, biểu đồ sẽ "co cụm" về vài chút cuối cùng
 *   (lỗi đã gặp: chọn 6 giờ nhưng trục chỉ hiện 21:30–22:00).
 *   Riêng 1h co theo dữ liệu thực tế để trải đường line trên toàn biểu đồ.
 *
 * ⚠ **Gom theo nhóm thời gian** (xem `utils/session-sensor-aggregation.utils.ts`):
 *   3 cảm biến × mỗi 5 giây ⇒ ~36 điểm/phút ⇒ vẽ thẳng sẽ thành đường
 *   răng cưa dạng sọc đứng. Bảng "Dữ liệu cảm biến chi tiết" bên dưới giữ
 *   **log gốc**.
 */

/** Một điểm đã chuẩn hoá cho biểu đồ. */
interface SensorChartPoint {
  /** Timestamp (epoch ms) — trục hoành là thang số thực. */
  timestamp: number
  /** Nhãn mốc `HH:mm DD/MM`. */
  label: string
  temperature: number | null
  humidity: number | null
  /** Tầng của điểm đo (dùng cho tooltip). */
  floorLabel: string
  /** Ngưỡng áp dụng cho điểm đo này. */
  thresholds: ClimateThresholds | null
  /** Số lần đo đã gộp vào điểm này. */
  sampleCount: number
  /** `true` = điểm do BE gộp sẵn (số lần đo không xác định). */
  serverAggregated: boolean
}

export interface SessionSensorChartProps {
  /**
   * Các điểm đã chuẩn hoá (chuẩn hoá ở hook theo nguồn dữ liệu).
   *
   * ⚠ Không còn là `readings` thô — việc gom nhóm đã nằm trong
   *   `useSessionSensorChart` để cả 2 nguồn dùng chung 1 đường vẽ.
   */
  points: SessionClimatePoint[]
  /** Ngưỡng theo tầng — suy ra từ cấu hình tự động của tầng. */
  thresholdsByFloor: Map<number, ClimateThresholds>
  /**
   * Khoảng thời gian đang chọn — điều khiển cả thanh chọn lẫn **domain trục
   * hoành**.
   *
   * ⚠ **Do component cha quản lý** (không phải state nội bộ) vì khoảng thời
   *   gian quyết định **dữ liệu nào được kéo từ API** ⇒ đổi mốc phải kích
   *   hoạt fetch lại, không chỉ re-render.
   */
  timeRange: SessionSensorTimeRange
  /** Callback khi đổi khoảng thời gian. */
  onTimeRangeChange: (range: SessionSensorTimeRange) => void
  /**
   * Đang tải dữ liệu của mốc thời gian mới.
   *
   * ⚠ Hiển thị lớp phủ mờ trên biểu đồ để user biết đang chờ dữ liệu mới
   *   (thay vì biểu đồ trống trông như lỗi).
   */
  loading?: boolean
}

export function SessionSensorChart({
  points: climatePoints,
  thresholdsByFloor,
  timeRange,
  onTimeRangeChange,
  loading = false,
}: SessionSensorChartProps) {
  const animate = useChartMotion()

  /**
   * Ngưỡng chung của mọi tầng — dùng làm fallback cho điểm không xác định
   * được tầng.
   */
  const sharedThresholds = useMemo<ClimateThresholds | null>(() => {
    const all = [...thresholdsByFloor.values()]
    if (all.length === 0) return null

    const mins = all
      .map((item) => item.tempMin)
      .filter((value): value is number => value != null)
    const maxes = all
      .map((item) => item.tempMax)
      .filter((value): value is number => value != null)
    const humidityMins = all
      .map((item) => item.humidityMin)
      .filter((value): value is number => value != null)
    const humidityMaxes = all
      .map((item) => item.humidityMax)
      .filter((value): value is number => value != null)

    return {
      // Giao các khoảng (min = max của các min, max = min của các max) để
      // ngưỡng chung luôn là ngưỡng **an toàn** cho mọi tầng.
      tempMin: mins.length ? Math.max(...mins) : null,
      tempMax: maxes.length ? Math.min(...maxes) : null,
      humidityMin: humidityMins.length ? Math.max(...humidityMins) : null,
      humidityMax: humidityMaxes.length ? Math.min(...humidityMaxes) : null,
    }
  }, [thresholdsByFloor])

  /**
   * Gắn ngưỡng của tầng cho từng điểm.
   *
   * ⚠ Ưu tiên tầng đầu tiên có dữ liệu để tra ngưỡng; nếu không có tầng nào
   *   ⇒ dùng ngưỡng chung (để không mất cảnh báo vượt/thấp ngưỡng).
   */
  const points = useMemo<SensorChartPoint[]>(() => {
    return climatePoints.map((point) => {
      const floorId = point.floorIds[0]
      const thresholds =
        (floorId != null ? thresholdsByFloor.get(floorId) : null) ??
        sharedThresholds

      return {
        timestamp: point.timestamp,
        label: point.label,
        temperature: point.temperature,
        humidity: point.humidity,
        floorLabel:
          point.floorLabels.length > 0 ? point.floorLabels.join(', ') : '—',
        thresholds,
        sampleCount: point.sampleCount,
        serverAggregated: point.serverAggregated,
      }
    })
  }, [climatePoints, thresholdsByFloor, sharedThresholds])

  /**
   * **Domain trục hoành CỐ ĐỊNH cho 6h/12h/24h** theo cửa sổ đã chọn.
   *
   * ⚠ Các mốc dài không dùng `['dataMin', 'dataMax']` — trục sẽ co theo dữ liệu
   *   thực có ⇒ khi dữ liệu chỉ phủ 30 phút cuối, trục chỉ hiện 30 phút đó
   *   (đúng lỗi "co cụm": chọn 6 giờ nhưng trục chỉ hiện 21:30–22:00).
   *
   * ⚠ **Padding 1 phút mỗi mép**: điểm dữ liệu nằm **đúng** trên mép domain
   *   (mốc `:00`/`:15`/`:30`/`:45` của bucket BE) sẽ bị Recharts cắt mất một
   *   nửa ⇒ mép phải (mốc `now`) "mất" luôn. Padding nhỏ giữ trọn điểm mà
   *   không làm lệch cửa sổ hiển thị (1 phút trên cửa sổ 6–24 giờ).
   *   Riêng 1h dùng min/max dữ liệu và padding 10px trên XAxis.
   *
   *   ⚠ Padding **chỉ** áp dụng cho domain của biểu đồ, **không** áp dụng cho
   *     cửa sổ gọi API — BE giới hạn `to - from ≤ 24h` ⇒ cửa sổ fetch phải
   *     đúng 24 giờ, không được nới rộng thêm.
   */
  const xDomain = useMemo<[number, number]>(
    () => resolveAxisDomain(timeRange),
    [timeRange],
  )

  /**
   * Mốc 1h lấy tối đa 5 nhãn trải đều theo chỉ số các điểm đo thực tế.
   * Các mốc dài trải đều suốt cửa sổ, độc lập dữ liệu.
   *
   * ⚠ 5 mốc: `start`, `start + 1/4`, …, `end` ⇒ mốc 6 giờ lúc 22:00 sẽ là
   *   16:00 · 17:30 · 19:00 · 20:30 · 22:00.
   */
  const xTicks = useMemo(() => {
    if (timeRange !== '1h') return buildAxisTicks(timeRange)

    const timestamps = [...new Set(points.map((point) => point.timestamp))]
    if (timestamps.length <= 5) return timestamps

    return Array.from({ length: 5 }, (_, index) =>
      timestamps[Math.round((index * (timestamps.length - 1)) / 4)],
    )
  }, [points, timeRange])

  // Domain trục Y suy ra từ dữ liệu thật (bước 1/2/5×10ⁿ) — không hardcode.
  const temperatureAxis = useMemo(
    () => climateAxis(points.map((point) => point.temperature)),
    [points],
  )
  const humidityAxis = useMemo(
    () => climateAxis(points.map((point) => point.humidity)),
    [points],
  )

  const hasData = points.some(
    (point) => point.temperature != null || point.humidity != null,
  )

  return (
    <Flex vertical gap={8}>
      <Flex justify="space-between" align="center" gap={12} wrap>
        <Typography.Text strong style={{ fontSize: 13 }}>
          Diễn biến nhiệt độ &amp; độ ẩm
        </Typography.Text>
        <Segmented<SessionSensorTimeRange>
          size="small"
          value={timeRange}
          onChange={onTimeRangeChange}
          options={SENSOR_TIME_RANGE_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
      </Flex>

      <ChartFrame
        className="mcms-session-sensor-chart"
        empty={!hasData && !loading}
        height={280}
        label="Biểu đồ nhiệt độ và độ ẩm theo thời gian của phiên canh tác; đường đứt là độ ẩm."
      >
        {/*
         * ⚠ **UX mềm khi đổi mốc thời gian**:
         *
         *   - Có dữ liệu cũ (đang tải mốc mới) ⇒ **giữ nguyên biểu đồ**, chỉ
         *     làm mờ (opacity 0.6) + hiện spinner ở góc ⇒ không nhấp nháy, không
         *     mất ngữ cảnh xu hướng.
         *   - Chưa có dữ liệu nào (lần tải đầu) ⇒ skeleton như cũ.
         */}
        {loading && points.length === 0 ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : (
          <div style={{ position: 'relative', height: '100%' }}>
            <div
              style={{
                height: '100%',
                opacity: loading ? 0.6 : 1,
                transition: 'opacity 220ms ease',
              }}
            >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={points}
                margin={{ top: 12, right: 4, bottom: 4, left: 0 }}
              >
            <CartesianGrid stroke="var(--mcms-border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={timeRange === '1h' ? ['dataMin', 'dataMax'] : xDomain}
              padding={timeRange === '1h' ? { left: 10, right: 10 } : undefined}
              ticks={xTicks}
              /*
               * ⚠ `interval="preserveStartEnd"` ⇒ giữ **đủ 5 mốc** đã tính.
               *   Mặc định `"preserveEnd"` của Recharts có thể **bỏ mốc cuối**
               *   (mốc `now`) khi nhãn chạm mép phải ⇒ trục thiếu mốc quan
               *   trọng nhất. `preserveStartEnd` giữ cả mốc đầu lẫn mốc cuối.
               */
              interval="preserveStartEnd"
              tickFormatter={(value: number) =>
                formatAxisTimestamp(value, timeRange !== '1h' && value === xTicks[0])
              }
              minTickGap={20}
              tick={chartTickStyle}
            />
            <YAxis
              yAxisId="temperature"
              {...temperatureAxis}
              width={48}
              tickFormatter={formatMeasurement}
              unit="°C"
              tick={chartTickStyle}
            />
            <YAxis
              yAxisId="humidity"
              {...humidityAxis}
              orientation="right"
              width={64}
              tickFormatter={formatMeasurement}
              unit="%RH"
              tick={chartTickStyle}
            />
            <Tooltip content={SensorTooltip} />
            <ChartLegend
              items={[
                {
                  key: 'temperature',
                  label: 'Nhiệt độ (°C)',
                  color: chartSeries.temperature,
                },
                {
                  key: 'humidity',
                  label: 'Độ ẩm (%RH)',
                  color: chartSeries.humidity,
                  dashed: true,
                },
              ]}
            />
            <Line
              yAxisId="temperature"
              dataKey="temperature"
              name="Nhiệt độ (°C)"
              stroke={chartSeries.temperature}
              type="monotone"
              dot={false}
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={animate}
            />
            <Line
              yAxisId="humidity"
              dataKey="humidity"
              name="Độ ẩm (%RH)"
              stroke={chartSeries.humidity}
              strokeDasharray="7 4"
              type="monotone"
              dot={false}
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={animate}
            />
          </LineChart>
            </ResponsiveContainer>
            </div>
            {loading && (
              <Spin
                size="small"
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                }}
              />
            )}
          </div>
        )}
      </ChartFrame>

      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {/*
         * ⚠ Mốc dài dùng nguồn **BE gộp sẵn** (15 phút/điểm) ⇒ không nói
         *   "trung bình theo phút" (sai), nói đúng nhóm thời gian thực tế.
         */}
        {SENSOR_TIME_RANGE_USES_SERVER_AGGREGATE[timeRange]
          ? `Giá trị hiển thị là trung bình theo nhóm 15 phút của ${points.length} nhóm lần đo trong khoảng đã chọn.`
          : `Giá trị hiển thị là trung bình theo nhóm ${SENSOR_TIME_RANGE_BUCKET_MINUTES[timeRange]} phút của ${points.length} nhóm lần đo trong khoảng đã chọn.`}{' '}
        Bảng bên dưới giữ log gốc từng lần đo.
      </Typography.Text>
    </Flex>
  )
}

const axisTime = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
})

const axisDateTime = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Định dạng nhãn mốc trục hoành.
 *
 * ⚠ Chỉ mốc **đầu tiên** mang thêm ngày (`DD/MM HH:mm`), các mốc còn lại chỉ
 *   `HH:mm` ⇒ nhãn gọn, không chồng lấn trên trục hẹp, nhưng vẫn biết được
 *   cửa sổ bắt đầu từ ngày nào (quan trọng với mốc 24h).
 */
function formatAxisTimestamp(value: number, isFirst: boolean): string {
  const date = new Date(value)
  return (isFirst ? axisDateTime : axisTime).format(date)
}

interface SensorTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{
    payload?: SensorChartPoint
  }>
}

/**
 * Tooltip hiển thị giá trị + cảnh báo vượt/thấp ngưỡng.
 *
 * ⚠ Màu chữ giá trị **theo màu đường biểu đồ** (nhiệt độ = đỏ, độ ẩm =
 *   xanh dương) ⇒ người dùng nhận diện chỉ số bằng màu giống hệt đường vẽ,
 *   không phải màu tone trạng thái (xanh lá = "ổn") vốn gây nhầm lẫn.
 */
function SensorTooltip({ active, payload }: SensorTooltipProps) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null

  return (
    <ChartTooltipSurface>
      <strong>{point.label}</strong>
      <div className="mcms-session-sensor-tooltip-floor">
        Tầng: {point.floorLabel}
      </div>
      <div style={{ color: tones.muted.text }}>
        {/*
         * ⚠ Với nguồn **BE gộp sẵn** thì không biết số lần đo thực tế ⇒
         *   hiển thị số tầng góp mẫu thay vì "Trung bình N lần đo" (tránh nói
         *   sai số liệu).
         */}
        {point.serverAggregated
          ? `Trung bình ${point.sampleCount} tầng`
          : `Trung bình ${point.sampleCount} lần đo`}
      </div>
      {(['temperature', 'humidity'] as const).map((metric) => {
        const reading = (metric === 'temperature'
          ? evaluateTemperature
          : evaluateHumidity)(point[metric], point.thresholds)
        const direction = getClimateDirection(reading)
        const unit = metric === 'temperature' ? '°C' : '%RH'
        const value = point[metric]
        const target =
          [
            reading.min == null ? null : `≥ ${formatMeasurement(reading.min)}${unit}`,
            reading.max == null ? null : `≤ ${formatMeasurement(reading.max)}${unit}`,
          ]
            .filter(Boolean)
            .join(', ') || 'Chưa có ngưỡng'

        return (
          <div key={metric}>
            <span
              style={{
                color: value == null ? tones.muted.text : chartSeries[metric],
              }}
            >
              {metric === 'temperature' ? 'Nhiệt độ' : 'Độ ẩm'}:{' '}
              {formatMeasurement(value)}
              {value != null && unit}{' '}
              {direction === 'high'
                ? '▲ vượt ngưỡng'
                : direction === 'low'
                  ? '▼ dưới ngưỡng'
                  : ''}
            </span>
            <div>Mục tiêu: {target}</div>
            {(direction === 'high' || direction === 'low') && (
              /*
                ⚠ Ghi rõ **tên metric** trong câu — chỉ dựa vào màu/đơn vị thì
                **không đủ** (cả nhiệt độ lẫn độ ẩm có thể vượt ngưỡng cùng
                lúc, và màu đỏ của nhiệt độ trùng nghĩa "nguy hiểm").
              */
              <span
                style={{
                  color:
                    value == null ? tones.muted.text : chartSeries[metric],
                }}
              >
                {metric === 'temperature' ? 'Nhiệt độ' : 'Độ ẩm'}{' '}
                {direction === 'high' ? 'cao hơn' : 'thấp hơn'} ngưỡng{' '}
                {formatMeasurement(reading.deviation)}
                {unit}
              </span>
            )}
          </div>
        )
      })}
    </ChartTooltipSurface>
  )
}
