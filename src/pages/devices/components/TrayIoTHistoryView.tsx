import {
  ApartmentOutlined,
  CalendarOutlined,
  CloudOutlined,
  ExperimentOutlined,
  FireOutlined,
  HistoryOutlined,
  LineChartOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { Empty, Segmented, Select, Spin, Tabs, Tag } from 'antd'
import { useMemo, useRef, useState } from 'react'
import type {
  HistoryGranularity,
  HistoryRangePreset,
  HistoryViewMode,
  RentalSession,
  RentalSessionStatus,
} from '../../../types/iot-history'
import { useFloorList } from '../../../features/devices/hooks/useIoT'
import { useTrayHistory } from '../../../features/devices/hooks/useTrayHistory'
import { useCultivationTrays } from '../../../features/rooms/hooks/useCultivation'
import {
  aggregateLongTermTelemetry,
  buildYearComparison,
  formatHistoryDate,
} from '../utils/iot-history.utils'
import { IoTTelemetryChart } from './IoTTelemetryChart'
import { LongTermTrendChart } from './LongTermTrendChart'
import { OrderLifecycleLog } from './OrderLifecycleLog'
import { OrderStatusLogTable } from './OrderStatusLogTable'
import { RentalHistoryTable } from './RentalHistoryTable'
import { RentalSessionSummary } from './RentalSessionSummary'
import { TrayIoTHistoryApiView } from './TrayIoTHistoryApiView'

const RANGE_OPTIONS: Array<{ value: HistoryRangePreset; label: string }> = [
  { value: 'LAST_12_MONTHS', label: '1 năm qua' },
  { value: 'COMPARE_2025_2026', label: 'So sánh 2 năm gần nhất' },
  { value: 'ALL', label: 'Toàn bộ dữ liệu' },
]

const SESSION_STATUS_CONFIG: Record<
  RentalSessionStatus,
  { color: string; label: string }
> = {
  ACTIVE: { color: 'success', label: 'Đang trồng' },
  COMPLETED: { color: 'default', label: 'Hoàn thành' },
  OVERDUE: { color: 'error', label: 'Quá hạn' },
}

function SessionDropdownOption({ session }: { session: RentalSession }) {
  const status = SESSION_STATUS_CONFIG[session.status]

  return (
    <div className="session-dropdown-option">
      <strong>
        {session.tenantName} <span aria-hidden="true">•</span>{' '}
        {session.mushroomType}
      </strong>
      <div>
        <span>
          {formatHistoryDate(session.startDate)} –{' '}
          {formatHistoryDate(session.endDate)}
        </span>
        <span className="session-dropdown-order">{session.orderId}</span>
        <Tag color={status.color}>{status.label}</Tag>
      </div>
    </div>
  )
}

function SelectedSessionLabel({ session }: { session: RentalSession }) {
  const status = SESSION_STATUS_CONFIG[session.status]
  const fullLabel = `${session.orderId} · ${session.tenantName} - ${session.mushroomType} (${formatHistoryDate(session.startDate)} – ${formatHistoryDate(session.endDate)})`

  return (
    <span className="selected-session-label">
      <span title={fullLabel}>{fullLabel}</span>
      <Tag color={status.color}>{status.label}</Tag>
    </span>
  )
}

/**
 * Lịch sử telemetry IoT theo khay — **100% dữ liệu thật**.
 *
 * ⚠ Đã bỏ hoàn toàn `pages/devices/data/iot-history.mock.ts`.
 *
 * Nguồn dữ liệu (tất cả GET):
 *   - `GET /api/iot/floors` → danh sách tầng thật.
 *   - `GET /api/cultivation-trays` → danh sách khay thật.
 *   - `GET /api/cultivation-sessions/admin?trayId=` → các mẻ của khay.
 *   - `GET /api/iot/masters/.../history` → telemetry thật.
 *   - `GET /api/iot/floors/{id}/auto-control/logs` → nhật ký vận hành thật.
 */
export function TrayIoTHistoryView() {
  const [floorId, setFloorId] = useState<number | null>(null)
  const [trayId, setTrayId] = useState<number | null>(null)
  const [activeView, setActiveView] = useState<HistoryViewMode>('sessions')
  const [rangePreset, setRangePreset] =
    useState<HistoryRangePreset>('COMPARE_2025_2026')
  const [granularity, setGranularity] =
    useState<HistoryGranularity>('MONTH')
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const chartSectionRef = useRef<HTMLDivElement>(null)

  const { data: floors = [], isLoading: floorsLoading } = useFloorList()
  const { data: allTrays = [], isLoading: traysLoading } =
    useCultivationTrays()

  const sortedFloors = useMemo(
    () =>
      [...floors].sort(
        (left, right) => left.floor_number - right.floor_number,
      ),
    [floors],
  )

  // Tầng đang chọn — mặc định là tầng đầu tiên (suy ra, không dùng effect).
  const activeFloorId = floorId ?? sortedFloors[0]?.floor_id ?? null

  const trays = useMemo(
    () => allTrays.filter((tray) => tray.floor_id === activeFloorId),
    [allTrays, activeFloorId],
  )

  // Khay đang chọn — mặc định là khay đầu tiên của tầng đang chọn.
  const activeTrayId = useMemo(() => {
    if (trayId !== null && trays.some((tray) => tray.tray_id === trayId)) {
      return trayId
    }
    return trays[0]?.tray_id ?? null
  }, [trayId, trays])

  const { data: history, isLoading: historyLoading } = useTrayHistory(
    activeTrayId,
  )

  const sessions = useMemo<RentalSession[]>(
    () => history?.sessions ?? [],
    [history?.sessions],
  )

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ??
    sessions.find((session) => session.status === 'ACTIVE') ??
    sessions[0]
  const activeSessionId = selectedSession?.id ?? ''

  const sessionTelemetry = useMemo(
    () => history?.telemetryBySessionId?.[activeSessionId] ?? [],
    [activeSessionId, history?.telemetryBySessionId],
  )

  const irrigationCount = useMemo(
    () =>
      (selectedSession?.statusLogs ?? []).filter(
        (log) => log.type === 'IRRIGATION',
      ).length,
    [selectedSession?.statusLogs],
  )

  const longTermTelemetry = useMemo(
    () => history?.longTermTelemetry ?? [],
    [history?.longTermTelemetry],
  )

  const aggregatedLongTermData = useMemo(
    () =>
      aggregateLongTermTelemetry(
        longTermTelemetry,
        rangePreset,
        granularity,
      ),
    [granularity, longTermTelemetry, rangePreset],
  )

  const comparison = useMemo(
    () => buildYearComparison(aggregatedLongTermData, granularity),
    [aggregatedLongTermData, granularity],
  )

  const longTermSummary = useMemo(() => {
    if (aggregatedLongTermData.length === 0) {
      return { temperature: 0, humidity: 0 }
    }

    const totals = aggregatedLongTermData.reduce(
      (current, point) => ({
        temperature: current.temperature + point.temperature,
        humidity: current.humidity + point.humidity,
      }),
      { temperature: 0, humidity: 0 },
    )

    return {
      temperature: Number(
        (totals.temperature / aggregatedLongTermData.length).toFixed(1),
      ),
      humidity: Number(
        (totals.humidity / aggregatedLongTermData.length).toFixed(1),
      ),
    }
  }, [aggregatedLongTermData])

  const handleSelectFromTable = (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setActiveView('sessions')
    window.requestAnimationFrame(() => {
      chartSectionRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        block: 'start',
      })
    })
  }

  const handleFloorChange = (nextFloorId: number) => {
    setFloorId(nextFloorId)
    setTrayId(null)
  }

  const handleTrayChange = (nextTrayId: number) => {
    setTrayId(nextTrayId)
  }

  const sessionContent = selectedSession ? (
    <div className="iot-history-tab-content">
      <RentalSessionSummary
        session={selectedSession}
        irrigationCount={irrigationCount}
      />

      <div ref={chartSectionRef} className="iot-chart-anchor">
        <IoTTelemetryChart
          key={selectedSession.id}
          session={selectedSession}
          data={sessionTelemetry}
        />
      </div>

      <OrderLifecycleLog session={selectedSession} />

      <OrderStatusLogTable session={selectedSession} />

      <RentalHistoryTable
        sessions={sessions}
        selectedSessionId={activeSessionId}
        onSelectSession={handleSelectFromTable}
      />
    </div>
  ) : (
    <div className="iot-history-tab-content iot-empty-history">
      {historyLoading ? (
        <Spin />
      ) : (
        <Empty description="Khay này chưa có lịch sử canh tác trên hệ thống" />
      )}
    </div>
  )

  const longTermContent = (
    <div className="iot-history-tab-content">
      <div className="long-term-filter-row">
        <div className="iot-filter-field">
          <label htmlFor="history-range-select">Phạm vi dữ liệu</label>
          <Select
            id="history-range-select"
            value={rangePreset}
            onChange={setRangePreset}
            options={RANGE_OPTIONS}
            suffixIcon={<CalendarOutlined />}
          />
        </div>
        <div className="iot-filter-field">
          <span className="iot-filter-label">Độ chi tiết</span>
          <Segmented<HistoryGranularity>
            aria-label="Chọn độ chi tiết dữ liệu"
            value={granularity}
            onChange={setGranularity}
            options={[
              { value: 'MONTH', label: 'Theo tháng' },
              { value: 'WEEK', label: 'Theo tuần' },
            ]}
          />
        </div>
      </div>

      <div className="long-term-summary-strip" role="status">
        <span>
          <FireOutlined aria-hidden="true" />
          <small>Nhiệt độ TB</small>
          <strong>{longTermSummary.temperature.toLocaleString('vi-VN')}°C</strong>
        </span>
        <span>
          <CloudOutlined aria-hidden="true" />
          <small>Độ ẩm TB</small>
          <strong>{longTermSummary.humidity.toLocaleString('vi-VN')}%RH</strong>
        </span>
        <span>
          <HistoryOutlined aria-hidden="true" />
          <small>Số mốc tổng hợp</small>
          <strong>{aggregatedLongTermData.length}</strong>
        </span>
      </div>

      {aggregatedLongTermData.length === 0 ? (
        <Empty description="Chưa có dữ liệu telemetry dài hạn cho khay này" />
      ) : (
        <LongTermTrendChart
          key={`${activeTrayId}-${rangePreset}-${granularity}`}
          aggregatedData={aggregatedLongTermData}
          comparisonData={comparison.data}
          comparisonYears={comparison.years}
          granularity={granularity}
          isComparison={rangePreset === 'COMPARE_2025_2026'}
          trayId={
            allTrays.find((tray) => tray.tray_id === activeTrayId)?.tray_code ??
            `Khay #${activeTrayId ?? '-'}`
          }
        />
      )}
    </div>
  )

  return (
    <section className="tray-iot-history" aria-label="Lịch sử telemetry IoT theo khay">
      <div className="iot-history-filter-bar">
        <div className="iot-filter-heading">
          <span className="iot-filter-heading-icon" aria-hidden="true">
            <ApartmentOutlined />
          </span>
          <div>
            <strong>Phạm vi giám sát</strong>
            <span>
              Chọn tầng và khay thật để tra cứu lịch sử canh tác cùng chuỗi
              telemetry do thiết bị ghi nhận.
            </span>
          </div>
        </div>
        <div className="iot-filter-controls iot-cascade-controls">
          <div className="iot-filter-field iot-filter-field--tier">
            <label htmlFor="history-floor-select">Tầng</label>
            <Select<number>
              id="history-floor-select"
              value={activeFloorId ?? undefined}
              loading={floorsLoading}
              placeholder="Chọn tầng"
              onChange={handleFloorChange}
              options={sortedFloors.map((floor) => ({
                value: floor.floor_id,
                label: floor.floor_name || `Tầng ${floor.floor_number}`,
              }))}
            />
          </div>
          <RightOutlined className="cascade-separator" aria-hidden="true" />
          <div className="iot-filter-field iot-filter-field--tray">
            <label htmlFor="history-tray-select">Khay</label>
            <Select<number>
              id="history-tray-select"
              value={activeTrayId ?? undefined}
              loading={traysLoading}
              placeholder="Chọn khay"
              disabled={trays.length === 0}
              onChange={handleTrayChange}
              options={trays.map((tray) => ({
                value: tray.tray_id,
                label: tray.tray_name
                  ? `${tray.tray_code} · ${tray.tray_name}`
                  : tray.tray_code,
              }))}
            />
          </div>
          <RightOutlined className="cascade-separator" aria-hidden="true" />
          <div className="iot-filter-field iot-filter-field--session">
            <label htmlFor="rental-session-select">
              Mẻ canh tác của khay này
            </label>
            <Select
              id="rental-session-select"
              className="iot-session-select"
              value={activeSessionId || undefined}
              placeholder="Khay chưa có mẻ canh tác"
              disabled={sessions.length === 0}
              showSearch
              optionFilterProp="label"
              onChange={setSelectedSessionId}
              options={sessions.map((session) => ({
                value: session.id,
                label: `${session.orderId} ${session.batchId} ${session.tenantName} ${session.mushroomType}`,
              }))}
              optionRender={(option) => {
                const session = sessions.find(
                  (item) => item.id === option.value,
                )
                return session ? (
                  <SessionDropdownOption session={session} />
                ) : (
                  option.label
                )
              }}
              labelRender={({ value, label }) => {
                const session = sessions.find((item) => item.id === value)
                return session ? (
                  <SelectedSessionLabel session={session} />
                ) : (
                  label
                )
              }}
            />
          </div>
        </div>
      </div>

      <Tabs
        className="iot-history-tabs"
        activeKey={activeView}
        onChange={(key) => setActiveView(key as HistoryViewMode)}
        items={[
          {
            key: 'sessions',
            label: (
              <span>
                <HistoryOutlined aria-hidden="true" />
                Lịch sử theo Mẻ / Khách thuê
              </span>
            ),
            children: sessionContent,
          },
          {
            key: 'long-term',
            label: (
              <span>
                <LineChartOutlined aria-hidden="true" />
                Xu hướng Dài hạn
              </span>
            ),
            children: longTermContent,
          },
          {
            key: 'api',
            label: (
              <span>
                <ExperimentOutlined aria-hidden="true" />
                Lịch sử IoT API (Master/Sensor)
              </span>
            ),
            children: <TrayIoTHistoryApiView />,
          },
        ]}
      />
    </section>
  )
}
