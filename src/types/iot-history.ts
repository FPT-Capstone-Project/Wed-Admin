export type RentalSessionStatus = 'COMPLETED' | 'ACTIVE' | 'OVERDUE'

export type GrowthStageName =
  | 'Ủ tơ / Nuôi sợi'
  | 'Kích nụ / Ra ghim'
  | 'Phát triển thể quả'
  | 'Sẵn sàng thu hoạch'

export interface StageTimelineItem {
  id: string
  stageName: GrowthStageName
  startTime: string
  endTime: string
  backgroundColor: string
}

export type OrderStatusLogType =
  | 'ORDER_STARTED'
  | 'STAGE_CHANGED'
  | 'IRRIGATION'
  | 'VENTILATION'
  | 'CLIMATE_ALERT'
  | 'HARVEST_COMPLETED'
  | 'ORDER_OVERDUE'

export type OrderStatusLogSeverity = 'INFO' | 'SUCCESS' | 'WARNING'

export interface OrderStatusLog {
  id: string
  orderId: string
  batchId: string
  trayId: string
  timestamp: string
  type: OrderStatusLogType
  severity: OrderStatusLogSeverity
  title: string
  description: string
  actor: string
}

export interface RentalSession {
  id: string
  orderId: string
  batchId: string
  trayId: string
  tenantId: string
  tenantName: string
  mushroomType: string
  startDate: string
  endDate: string
  harvestedAt: string | null
  status: RentalSessionStatus
  avgTemp: number
  avgHumidity: number
  stagesTimeline: StageTimelineItem[]
  statusLogs: OrderStatusLog[]
}

export interface TelemetryPoint {
  rentalSessionId: string
  orderId: string
  batchId: string
  trayId: string
  stageId: string
  stageName: GrowthStageName
  timestamp: string
  temperature: number
  humidity: number
  irrigationActive?: boolean
  fanActive?: boolean
}

export interface LongTermTelemetryPoint {
  timestamp: string
  temperature: number
  humidity: number
}

export type HistoryViewMode = 'sessions' | 'long-term'
export type HistoryRangePreset =
  | 'LAST_12_MONTHS'
  | 'COMPARE_2025_2026'
  | 'ALL'
export type HistoryGranularity = 'MONTH' | 'WEEK'
export type TelemetryMetric = 'temperature' | 'humidity'
