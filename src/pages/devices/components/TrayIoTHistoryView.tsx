import {
  ApartmentOutlined,
  CalendarOutlined,
  CloudOutlined,
  CloudServerOutlined,
  ExperimentOutlined,
  FireOutlined,
  HistoryOutlined,
  LineChartOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { Empty, Segmented, Select, Tabs, Tag } from 'antd'
import { useMemo, useRef, useState } from 'react'
import type {
  HistoryGranularity,
  HistoryRangePreset,
  HistoryViewMode,
  RentalSession,
  RentalSessionStatus,
} from '../../../types/iot-history'
import type { TierId, TrayPosition } from '../../../types/room.types'
import { TIER_IDS, TRAY_POSITIONS } from '../../../types/room.types'
import {
  countIrrigationEvents,
  getLongTermTelemetryForTray,
  getRentalSessionsForTray,
  getTelemetryForSession,
} from '../data/iot-history.mock'
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
  { value: 'COMPARE_2025_2026', label: 'So sánh 2025 vs 2026' },
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

function getPreferredSessionId(trayId: string) {
  const sessions = getRentalSessionsForTray(trayId)
  return (
    sessions.find((session) => session.status === 'ACTIVE')?.id ??
    sessions[0]?.id ??
    ''
  )
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

export function TrayIoTHistoryView() {
  const [tierId, setTierId] = useState<TierId>(4)
  const [trayPosition, setTrayPosition] = useState<TrayPosition>(1)
  const [activeView, setActiveView] = useState<HistoryViewMode>('sessions')
  const [rangePreset, setRangePreset] =
    useState<HistoryRangePreset>('COMPARE_2025_2026')
  const [granularity, setGranularity] =
    useState<HistoryGranularity>('MONTH')
  const [selectedSessionId, setSelectedSessionId] = useState(() => {
    return getPreferredSessionId('T4-K1')
  })
  const chartSectionRef = useRef<HTMLDivElement>(null)
  const trayId = `T${tierId}-K${trayPosition}`

  const sessions = useMemo(
    () => getRentalSessionsForTray(trayId),
    [trayId],
  )

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ??
    sessions.find((session) => session.status === 'ACTIVE') ??
    sessions[0]
  const activeSessionId = selectedSession?.id ?? ''
  const sessionTelemetry = useMemo(
    () => getTelemetryForSession(activeSessionId),
    [activeSessionId],
  )
  const irrigationCount = useMemo(
    () => countIrrigationEvents(sessionTelemetry),
    [sessionTelemetry],
  )
  const longTermTelemetry = useMemo(
    () => getLongTermTelemetryForTray(trayId),
    [trayId],
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
  const comparisonData = useMemo(
    () => buildYearComparison(aggregatedLongTermData, granularity),
    [aggregatedLongTermData, granularity],
  )
  const longTermSummary = useMemo(() => {
    if (aggregatedLongTermData.length === 0) {
      return { temperature: 0, humidity: 0, co2: 0 }
    }

    const totals = aggregatedLongTermData.reduce(
      (current, point) => ({
        temperature: current.temperature + point.temperature,
        humidity: current.humidity + point.humidity,
        co2: current.co2 + point.co2,
      }),
      { temperature: 0, humidity: 0, co2: 0 },
    )

    return {
      temperature: Number(
        (totals.temperature / aggregatedLongTermData.length).toFixed(1),
      ),
      humidity: Number(
        (totals.humidity / aggregatedLongTermData.length).toFixed(1),
      ),
      co2: Math.round(totals.co2 / aggregatedLongTermData.length),
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

  const handleTierChange = (nextTierId: TierId) => {
    setTierId(nextTierId)
    setSelectedSessionId(
      getPreferredSessionId(`T${nextTierId}-K${trayPosition}`),
    )
  }

  const handleTrayChange = (nextTrayPosition: TrayPosition) => {
    setTrayPosition(nextTrayPosition)
    setSelectedSessionId(
      getPreferredSessionId(`T${tierId}-K${nextTrayPosition}`),
    )
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
      <Empty description="Khay chưa có lịch sử thuê" />
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
          <CloudServerOutlined aria-hidden="true" />
          <small>CO₂ TB</small>
          <strong>{longTermSummary.co2.toLocaleString('vi-VN')} ppm</strong>
        </span>
        <span>
          <HistoryOutlined aria-hidden="true" />
          <small>Số mốc tổng hợp</small>
          <strong>{aggregatedLongTermData.length}</strong>
        </span>
      </div>

      <LongTermTrendChart
        key={`${trayId}-${rangePreset}-${granularity}`}
        aggregatedData={aggregatedLongTermData}
        comparisonData={comparisonData}
        granularity={granularity}
        isComparison={rangePreset === 'COMPARE_2025_2026'}
        trayId={trayId}
      />
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
              Chọn vị trí khay vật lý để tra cứu các đợt trồng của từng khách
              hàng qua các năm.
            </span>
          </div>
        </div>
        <div className="iot-filter-controls iot-cascade-controls">
          <div className="iot-filter-field iot-filter-field--tier">
            <label htmlFor="history-tier-select">Tầng</label>
            <Select<TierId>
              id="history-tier-select"
              value={tierId}
              onChange={handleTierChange}
              options={TIER_IDS.map((value) => ({
                value,
                label: `Tầng ${value}`,
              }))}
            />
          </div>
          <RightOutlined className="cascade-separator" aria-hidden="true" />
          <div className="iot-filter-field iot-filter-field--tray">
            <label htmlFor="history-tray-select">Khay</label>
            <Select<TrayPosition>
              id="history-tray-select"
              value={trayPosition}
              onChange={handleTrayChange}
              options={TRAY_POSITIONS.map((value) => ({
                value,
                label: `K${value}`,
              }))}
            />
          </div>
          <RightOutlined className="cascade-separator" aria-hidden="true" />
          <div className="iot-filter-field iot-filter-field--session">
            <label htmlFor="rental-session-select">
              Order / Mẻ của khay này
            </label>
            <Select
              id="rental-session-select"
              className="iot-session-select"
              value={activeSessionId || undefined}
              placeholder="Khay chưa có lịch sử thuê"
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
                Xu hướng Dài hạn (2025 – 2026)
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
