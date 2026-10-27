export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export type AlertCategory =
  | 'TEMPERATURE'
  | 'HUMIDITY'
  | 'DEVICE_OFFLINE'
  | 'HARDWARE_FAULT'
  | 'ORDER_OVERDUE'
  | 'CONTAMINATION'

export type AlertReadFilter = 'ALL' | 'UNREAD' | 'READ'
export type AlertAcknowledgementFilter =
  | 'ALL'
  | 'UNACKNOWLEDGED'
  | 'ACKNOWLEDGED'

export type ReportPeriod =
  | 'TODAY'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'CURRENT_CROP'

export interface SystemAlert {
  id: string
  trayId: string
  trayName: string
  deviceId: string
  category: AlertCategory
  severity: AlertSeverity
  message: string
  currentValue: number | null
  thresholdValue: number | null
  timestamp: string
  isRead: boolean
  isAcknowledged: boolean
  acknowledgedBy: string | null
  acknowledgedAt: string | null
}

export interface EnvironmentHistoryPoint {
  time: string
  date?: string
  temperature: number
  humidity: number
  soilMoisture: number
  trayId?: string
}

export interface YieldSummary {
  cropType: string
  gradeA_Kg: number
  gradeB_Kg: number
  spoiled_Kg: number
  successRate: number
  trayId?: string
}

export interface RevenueSummary {
  month: string
  totalRevenue: number
  rentalCount: number
  popularPackage: string
}
