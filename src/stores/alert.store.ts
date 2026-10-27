import { create } from 'zustand'
import type {
  EnvironmentHistoryPoint,
  ReportPeriod,
  RevenueSummary,
  SystemAlert,
  YieldSummary,
} from '../types/alert.types'

/** Hàm tiện ích: lấy ngày hôm nay theo định dạng YYYY-MM-DD (UTC+7) */
function getTodayDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getNowIso() {
  return new Date().toISOString()
}

/**
 * Sinh cảnh báo tự động từ cultivation.store (gọi tại init alert store).
 * Quy tắc:
 *  - ORDER_OVERDUE : batch.estimatedHarvestDate < today && currentStage !== 'HARVESTED'
 *  - CONTAMINATION : batch.healthStatus === 'WARNING_CONTAMINATED'
 *
 * Được gọi trong MOCK_ALERTS definition để tránh circular dependency.
 */
function buildAutoAlerts(): Pick<
  SystemAlert,
  | 'id'
  | 'trayId'
  | 'trayName'
  | 'deviceId'
  | 'category'
  | 'severity'
  | 'message'
  | 'currentValue'
  | 'thresholdValue'
  | 'timestamp'
  | 'isRead'
  | 'isAcknowledged'
  | 'acknowledgedBy'
  | 'acknowledgedAt'
>[] {
  const today = getTodayDateString()
  const now = getNowIso()
  const alerts: Pick<
    SystemAlert,
    | 'id'
    | 'trayId'
    | 'trayName'
    | 'deviceId'
    | 'category'
    | 'severity'
    | 'message'
    | 'currentValue'
    | 'thresholdValue'
    | 'timestamp'
    | 'isRead'
    | 'isAcknowledged'
    | 'acknowledgedBy'
    | 'acknowledgedAt'
  >[] = []

  // ── Batch quá hạn thu hoạch (H3 fix) ────────────────────────────────────
  // FLOOR-1-HOANG-KIM: estimatedHarvestDate = 2026-09-05 < 2026-09-16 → 11 ngày quá hạn
  const overdueBatch = {
    id: 'AUTO-ALERT-001',
    trayId: 'T1-K2',
    trayName: 'Tầng 1 · Khay 2',
    deviceId: 'node-stm32-01',
    category: 'ORDER_OVERDUE' as const,
    severity: 'WARNING' as const,
    message:
      'Mẻ nấm T1-K2 (Hoàng Kim – KH: Phạm Thanh Tùng) đã quá ngày dự kiến thu hoạch (05/09/2026). Đề nghị kiểm tra và xử lý ngay.',
    currentValue: 11,
    thresholdValue: 0,
    timestamp: now,
    isRead: false,
    isAcknowledged: false,
    acknowledgedBy: null,
    acknowledgedAt: null,
  }
  // Chỉ push nếu hôm nay thực sự đã quá hạn
  if ('2026-09-05' < today) {
    alerts.push(overdueBatch)
  }

  // ── Batch bị nhiễm bệnh (M3 fix) ────────────────────────────────────────
  // MCMS-2607-W06: healthStatus = WARNING_CONTAMINATED
  alerts.push({
    id: 'AUTO-ALERT-002',
    trayId: 'T1-K3',
    trayName: 'Tầng 1 · Khay 3',
    deviceId: 'node-stm32-01',
    category: 'CONTAMINATION' as const,
    severity: 'CRITICAL' as const,
    message:
      'Phát hiện dấu hiệu nhiễm bệnh tại T1-K3 (Bào Ngư Xám – KH: Lê Thu Hà). Đốm mốc xanh phát hiện ngày 29/08. Yêu cầu cách ly và xử lý ngay.',
    currentValue: 1,
    thresholdValue: 0,
    timestamp: '2026-08-29T10:30:00+07:00',
    isRead: false,
    isAcknowledged: false,
    acknowledgedBy: null,
    acknowledgedAt: null,
  })

  return alerts
}

const AUTO_ALERTS = buildAutoAlerts()

export const MOCK_ALERTS: SystemAlert[] = [
  ...AUTO_ALERTS,
  {
    id: 'ALERT-002',
    trayId: 'T4-K1',
    trayName: 'Tầng 4 · Khay 1',
    deviceId: 'node-stm32-04',
    category: 'TEMPERATURE',
    severity: 'WARNING',
    message: 'Nhiệt độ tăng đột biến trong khay nấm Hoàng Kim.',
    currentValue: 31.8,
    thresholdValue: 28,
    timestamp: '2026-09-01T08:22:00+07:00',
    isRead: true,
    isAcknowledged: false,
    acknowledgedBy: null,
    acknowledgedAt: null,
  },
  {
    id: 'ALERT-003',
    trayId: 'T3-K1',
    trayName: 'Tầng 3 · Khay 1',
    deviceId: 'node-stm32-03',
    category: 'DEVICE_OFFLINE',
    severity: 'CRITICAL',
    message: 'Node STM32 tầng 3 mất kết nối quá 5 phút.',
    currentValue: 7,
    thresholdValue: 5,
    timestamp: '2026-09-01T08:10:00+07:00',
    isRead: false,
    isAcknowledged: false,
    acknowledgedBy: null,
    acknowledgedAt: null,
  },
  {
    id: 'ALERT-004',
    trayId: 'T2-K1',
    trayName: 'Tầng 2 · Khay 1',
    deviceId: 'node-stm32-02',
    category: 'HUMIDITY',
    severity: 'WARNING',
    message: 'Độ ẩm không khí đang tụt dưới vùng tối ưu.',
    currentValue: 68,
    thresholdValue: 75,
    timestamp: '2026-09-01T07:48:00+07:00',
    isRead: true,
    isAcknowledged: true,
    acknowledgedBy: 'Trần Quốc Huy',
    acknowledgedAt: '2026-09-01T07:55:00+07:00',
  },
  {
    id: 'ALERT-005',
    trayId: 'T1-K3',
    trayName: 'Tầng 1 · Khay 3',
    deviceId: 'node-stm32-01',
    category: 'HARDWARE_FAULT',
    severity: 'INFO',
    message: 'Relay quạt thông gió phản hồi chậm, cần theo dõi.',
    currentValue: 2.4,
    thresholdValue: 1,
    timestamp: '2026-09-01T07:30:00+07:00',
    isRead: false,
    isAcknowledged: false,
    acknowledgedBy: null,
    acknowledgedAt: null,
  },
  {
    id: 'ALERT-006',
    trayId: 'T1-K1',
    trayName: 'Tầng 1 · Khay 1',
    deviceId: 'node-stm32-01',
    category: 'HUMIDITY',
    severity: 'INFO',
    message: 'Chu kỳ phun sương buổi sáng đã hoàn tất.',
    currentValue: 86,
    thresholdValue: 80,
    timestamp: '2026-09-01T06:00:00+07:00',
    isRead: true,
    isAcknowledged: true,
    acknowledgedBy: 'Hệ thống tự động',
    acknowledgedAt: '2026-09-01T06:01:00+07:00',
  },
]

// Bộ dataset 30 ngày (17/08 → 16/09/2026) cho 4 khay chính, đồng bộ với room.store / cultivation.store
// - Nhiệt độ 22–28°C, độ ẩm 75–90%RH (chuẩn nuôi bào ngư / linh chi)
const HISTORY_BASE_DATES: ReadonlyArray<{
  date: string
  time: string
  byTier: Record<
    string,
    { temperature: number; humidity: number; soilMoisture: number }
  >
}> = [
  { date: '2026-08-17', time: '17/08', byTier: { 'T1-K1': { temperature: 23.4, humidity: 89, soilMoisture: 71 }, 'T1-K2': { temperature: 24.0, humidity: 86, soilMoisture: 68 }, 'T2-K1': { temperature: 25.6, humidity: 84, soilMoisture: 69 }, 'T3-K1': { temperature: 24.3, humidity: 88, soilMoisture: 73 } } },
  { date: '2026-08-18', time: '18/08', byTier: { 'T1-K1': { temperature: 23.8, humidity: 88, soilMoisture: 70 }, 'T1-K2': { temperature: 24.4, humidity: 85, soilMoisture: 67 }, 'T2-K1': { temperature: 25.9, humidity: 83, soilMoisture: 68 }, 'T3-K1': { temperature: 24.7, humidity: 87, soilMoisture: 72 } } },
  { date: '2026-08-19', time: '19/08', byTier: { 'T1-K1': { temperature: 24.1, humidity: 87, soilMoisture: 69 }, 'T1-K2': { temperature: 24.7, humidity: 84, soilMoisture: 66 }, 'T2-K1': { temperature: 26.1, humidity: 82, soilMoisture: 67 }, 'T3-K1': { temperature: 25.0, humidity: 86, soilMoisture: 71 } } },
  { date: '2026-08-20', time: '20/08', byTier: { 'T1-K1': { temperature: 24.3, humidity: 86, soilMoisture: 68 }, 'T1-K2': { temperature: 25.0, humidity: 83, soilMoisture: 65 }, 'T2-K1': { temperature: 26.4, humidity: 81, soilMoisture: 66 }, 'T3-K1': { temperature: 25.3, humidity: 85, soilMoisture: 70 } } },
  { date: '2026-08-21', time: '21/08', byTier: { 'T1-K1': { temperature: 24.6, humidity: 85, soilMoisture: 67 }, 'T1-K2': { temperature: 25.2, humidity: 82, soilMoisture: 64 }, 'T2-K1': { temperature: 26.6, humidity: 80, soilMoisture: 65 }, 'T3-K1': { temperature: 25.6, humidity: 84, soilMoisture: 69 } } },
  { date: '2026-08-22', time: '22/08', byTier: { 'T1-K1': { temperature: 24.8, humidity: 84, soilMoisture: 66 }, 'T1-K2': { temperature: 25.4, humidity: 81, soilMoisture: 63 }, 'T2-K1': { temperature: 26.8, humidity: 79, soilMoisture: 64 }, 'T3-K1': { temperature: 25.8, humidity: 83, soilMoisture: 68 } } },
  { date: '2026-08-23', time: '23/08', byTier: { 'T1-K1': { temperature: 24.5, humidity: 85, soilMoisture: 67 }, 'T1-K2': { temperature: 25.1, humidity: 82, soilMoisture: 64 }, 'T2-K1': { temperature: 26.5, humidity: 80, soilMoisture: 65 }, 'T3-K1': { temperature: 25.5, humidity: 84, soilMoisture: 69 } } },
  { date: '2026-08-24', time: '24/08', byTier: { 'T1-K1': { temperature: 24.2, humidity: 86, soilMoisture: 68 }, 'T1-K2': { temperature: 24.8, humidity: 83, soilMoisture: 65 }, 'T2-K1': { temperature: 26.2, humidity: 81, soilMoisture: 66 }, 'T3-K1': { temperature: 25.2, humidity: 85, soilMoisture: 70 } } },
  { date: '2026-08-25', time: '25/08', byTier: { 'T1-K1': { temperature: 24.0, humidity: 87, soilMoisture: 69 }, 'T1-K2': { temperature: 24.6, humidity: 84, soilMoisture: 66 }, 'T2-K1': { temperature: 26.0, humidity: 82, soilMoisture: 67 }, 'T3-K1': { temperature: 25.0, humidity: 86, soilMoisture: 71 } } },
  { date: '2026-08-26', time: '26/08', byTier: { 'T1-K1': { temperature: 23.7, humidity: 88, soilMoisture: 70 }, 'T1-K2': { temperature: 24.4, humidity: 85, soilMoisture: 67 }, 'T2-K1': { temperature: 25.8, humidity: 83, soilMoisture: 68 }, 'T3-K1': { temperature: 24.8, humidity: 87, soilMoisture: 72 } } },
  { date: '2026-08-27', time: '27/08', byTier: { 'T1-K1': { temperature: 23.5, humidity: 89, soilMoisture: 71 }, 'T1-K2': { temperature: 24.2, humidity: 86, soilMoisture: 68 }, 'T2-K1': { temperature: 25.6, humidity: 84, soilMoisture: 69 }, 'T3-K1': { temperature: 24.6, humidity: 88, soilMoisture: 73 } } },
  { date: '2026-08-28', time: '28/08', byTier: { 'T1-K1': { temperature: 23.8, humidity: 88, soilMoisture: 70 }, 'T1-K2': { temperature: 24.5, humidity: 85, soilMoisture: 67 }, 'T2-K1': { temperature: 25.9, humidity: 83, soilMoisture: 68 }, 'T3-K1': { temperature: 24.9, humidity: 87, soilMoisture: 72 } } },
  { date: '2026-08-29', time: '29/08', byTier: { 'T1-K1': { temperature: 24.1, humidity: 87, soilMoisture: 69 }, 'T1-K2': { temperature: 24.8, humidity: 84, soilMoisture: 66 }, 'T2-K1': { temperature: 26.1, humidity: 82, soilMoisture: 67 }, 'T3-K1': { temperature: 25.2, humidity: 86, soilMoisture: 71 } } },
  { date: '2026-08-30', time: '30/08', byTier: { 'T1-K1': { temperature: 24.4, humidity: 86, soilMoisture: 68 }, 'T1-K2': { temperature: 25.1, humidity: 83, soilMoisture: 65 }, 'T2-K1': { temperature: 26.3, humidity: 81, soilMoisture: 66 }, 'T3-K1': { temperature: 25.5, humidity: 85, soilMoisture: 70 } } },
  { date: '2026-08-31', time: '31/08', byTier: { 'T1-K1': { temperature: 24.7, humidity: 85, soilMoisture: 67 }, 'T1-K2': { temperature: 25.3, humidity: 82, soilMoisture: 64 }, 'T2-K1': { temperature: 26.5, humidity: 80, soilMoisture: 65 }, 'T3-K1': { temperature: 25.7, humidity: 84, soilMoisture: 69 } } },
  { date: '2026-09-01', time: '01/09', byTier: { 'T1-K1': { temperature: 24.5, humidity: 86, soilMoisture: 68 }, 'T1-K2': { temperature: 25.0, humidity: 83, soilMoisture: 65 }, 'T2-K1': { temperature: 26.2, humidity: 81, soilMoisture: 66 }, 'T3-K1': { temperature: 25.4, humidity: 85, soilMoisture: 70 } } },
  { date: '2026-09-02', time: '02/09', byTier: { 'T1-K1': { temperature: 24.2, humidity: 87, soilMoisture: 69 }, 'T1-K2': { temperature: 24.7, humidity: 84, soilMoisture: 66 }, 'T2-K1': { temperature: 25.9, humidity: 82, soilMoisture: 67 }, 'T3-K1': { temperature: 25.1, humidity: 86, soilMoisture: 71 } } },
  { date: '2026-09-03', time: '03/09', byTier: { 'T1-K1': { temperature: 24.0, humidity: 88, soilMoisture: 70 }, 'T1-K2': { temperature: 24.5, humidity: 85, soilMoisture: 67 }, 'T2-K1': { temperature: 25.7, humidity: 83, soilMoisture: 68 }, 'T3-K1': { temperature: 24.9, humidity: 87, soilMoisture: 72 } } },
  { date: '2026-09-04', time: '04/09', byTier: { 'T1-K1': { temperature: 23.8, humidity: 89, soilMoisture: 71 }, 'T1-K2': { temperature: 24.3, humidity: 86, soilMoisture: 68 }, 'T2-K1': { temperature: 25.5, humidity: 84, soilMoisture: 69 }, 'T3-K1': { temperature: 24.7, humidity: 88, soilMoisture: 73 } } },
  { date: '2026-09-05', time: '05/09', byTier: { 'T1-K1': { temperature: 24.1, humidity: 87, soilMoisture: 69 }, 'T1-K2': { temperature: 24.6, humidity: 84, soilMoisture: 66 }, 'T2-K1': { temperature: 25.8, humidity: 82, soilMoisture: 67 }, 'T3-K1': { temperature: 25.0, humidity: 86, soilMoisture: 71 } } },
  { date: '2026-09-06', time: '06/09', byTier: { 'T1-K1': { temperature: 24.4, humidity: 86, soilMoisture: 68 }, 'T1-K2': { temperature: 24.9, humidity: 83, soilMoisture: 65 }, 'T2-K1': { temperature: 26.0, humidity: 81, soilMoisture: 66 }, 'T3-K1': { temperature: 25.3, humidity: 85, soilMoisture: 70 } } },
  { date: '2026-09-07', time: '07/09', byTier: { 'T1-K1': { temperature: 24.7, humidity: 85, soilMoisture: 67 }, 'T1-K2': { temperature: 25.2, humidity: 82, soilMoisture: 64 }, 'T2-K1': { temperature: 26.3, humidity: 80, soilMoisture: 65 }, 'T3-K1': { temperature: 25.6, humidity: 84, soilMoisture: 69 } } },
  { date: '2026-09-08', time: '08/09', byTier: { 'T1-K1': { temperature: 24.9, humidity: 84, soilMoisture: 66 }, 'T1-K2': { temperature: 25.4, humidity: 81, soilMoisture: 63 }, 'T2-K1': { temperature: 26.5, humidity: 79, soilMoisture: 64 }, 'T3-K1': { temperature: 25.8, humidity: 83, soilMoisture: 68 } } },
  { date: '2026-09-09', time: '09/09', byTier: { 'T1-K1': { temperature: 24.6, humidity: 85, soilMoisture: 67 }, 'T1-K2': { temperature: 25.1, humidity: 82, soilMoisture: 64 }, 'T2-K1': { temperature: 26.2, humidity: 80, soilMoisture: 65 }, 'T3-K1': { temperature: 25.5, humidity: 84, soilMoisture: 69 } } },
  { date: '2026-09-10', time: '10/09', byTier: { 'T1-K1': { temperature: 24.3, humidity: 86, soilMoisture: 68 }, 'T1-K2': { temperature: 24.8, humidity: 83, soilMoisture: 65 }, 'T2-K1': { temperature: 25.9, humidity: 81, soilMoisture: 66 }, 'T3-K1': { temperature: 25.2, humidity: 85, soilMoisture: 70 } } },
  { date: '2026-09-11', time: '11/09', byTier: { 'T1-K1': { temperature: 24.0, humidity: 87, soilMoisture: 69 }, 'T1-K2': { temperature: 24.5, humidity: 84, soilMoisture: 66 }, 'T2-K1': { temperature: 25.6, humidity: 82, soilMoisture: 67 }, 'T3-K1': { temperature: 24.9, humidity: 86, soilMoisture: 71 } } },
  { date: '2026-09-12', time: '12/09', byTier: { 'T1-K1': { temperature: 24.2, humidity: 86, soilMoisture: 68 }, 'T1-K2': { temperature: 24.7, humidity: 83, soilMoisture: 65 }, 'T2-K1': { temperature: 25.8, humidity: 81, soilMoisture: 66 }, 'T3-K1': { temperature: 25.1, humidity: 85, soilMoisture: 70 } } },
  { date: '2026-09-13', time: '13/09', byTier: { 'T1-K1': { temperature: 24.5, humidity: 85, soilMoisture: 67 }, 'T1-K2': { temperature: 25.0, humidity: 82, soilMoisture: 64 }, 'T2-K1': { temperature: 26.0, humidity: 80, soilMoisture: 65 }, 'T3-K1': { temperature: 25.3, humidity: 84, soilMoisture: 69 } } },
  { date: '2026-09-14', time: '14/09', byTier: { 'T1-K1': { temperature: 24.8, humidity: 84, soilMoisture: 66 }, 'T1-K2': { temperature: 25.3, humidity: 81, soilMoisture: 63 }, 'T2-K1': { temperature: 26.3, humidity: 79, soilMoisture: 64 }, 'T3-K1': { temperature: 25.6, humidity: 83, soilMoisture: 68 } } },
  { date: '2026-09-15', time: '15/09', byTier: { 'T1-K1': { temperature: 25.1, humidity: 83, soilMoisture: 65 }, 'T1-K2': { temperature: 25.6, humidity: 80, soilMoisture: 62 }, 'T2-K1': { temperature: 26.6, humidity: 78, soilMoisture: 63 }, 'T3-K1': { temperature: 25.9, humidity: 82, soilMoisture: 67 } } },
  { date: '2026-09-16', time: '16/09', byTier: { 'T1-K1': { temperature: 25.4, humidity: 82, soilMoisture: 64 }, 'T1-K2': { temperature: 25.9, humidity: 79, soilMoisture: 61 }, 'T2-K1': { temperature: 26.9, humidity: 77, soilMoisture: 62 }, 'T3-K1': { temperature: 26.2, humidity: 81, soilMoisture: 66 } } },
]

export const MOCK_ENVIRONMENT_HISTORY: EnvironmentHistoryPoint[] =
  HISTORY_BASE_DATES.flatMap((entry) =>
    Object.entries(entry.byTier).map(([trayId, metrics]) => ({
      time: entry.time,
      date: entry.date,
      temperature: metrics.temperature,
      humidity: metrics.humidity,
      soilMoisture: metrics.soilMoisture,
      trayId,
    })),
  )

export const MOCK_YIELD_SUMMARIES: YieldSummary[] = [
  { cropType: 'Nấm Bào Ngư Xám', gradeA_Kg: 42, gradeB_Kg: 9, spoiled_Kg: 2, successRate: 92, trayId: 'T1-K1' },
  { cropType: 'Nấm Linh Chi', gradeA_Kg: 35, gradeB_Kg: 8, spoiled_Kg: 1, successRate: 95, trayId: 'T2-K1' },
  { cropType: 'Nấm Hoàng Kim', gradeA_Kg: 28, gradeB_Kg: 11, spoiled_Kg: 4, successRate: 88, trayId: 'T4-K1' },
  { cropType: 'Đông Trùng Hạ Thảo', gradeA_Kg: 21, gradeB_Kg: 3, spoiled_Kg: 1, successRate: 96, trayId: 'T1-K2' },
]

export const MOCK_REVENUE_SUMMARIES: RevenueSummary[] = [
  { month: 'T04/2026', totalRevenue: 28500000, rentalCount: 42, popularPackage: 'CROP-STANDARD' },
  { month: 'T05/2026', totalRevenue: 33200000, rentalCount: 48, popularPackage: 'CROP-STANDARD' },
  { month: 'T06/2026', totalRevenue: 41800000, rentalCount: 56, popularPackage: 'FAMILY-PREMIUM' },
  { month: 'T07/2026', totalRevenue: 46700000, rentalCount: 63, popularPackage: 'FAMILY-PREMIUM' },
  { month: 'T08/2026', totalRevenue: 52400000, rentalCount: 71, popularPackage: 'CORPORATE-CORDY' },
  { month: 'T09/2026', totalRevenue: 38900000, rentalCount: 54, popularPackage: 'CROP-STANDARD' },
]

interface AlertState {
  alerts: SystemAlert[]
  reportPeriod: ReportPeriod
  markAlertRead: (id: string) => void
  markAllRead: () => void
  acknowledgeAlert: (id: string, acknowledgedBy: string) => void
  acknowledgeAll: (acknowledgedBy: string) => void
  setReportPeriod: (period: ReportPeriod) => void
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: MOCK_ALERTS,
  reportPeriod: 'LAST_7_DAYS',

  markAlertRead: (id) =>
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === id ? { ...alert, isRead: true } : alert,
      ),
    })),

  markAllRead: () =>
    set((state) => ({
      alerts: state.alerts.map((alert) => ({ ...alert, isRead: true })),
    })),

  acknowledgeAlert: (id, acknowledgedBy) =>
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === id
          ? {
              ...alert,
              isRead: true,
              isAcknowledged: true,
              acknowledgedBy,
              acknowledgedAt: new Date().toISOString(),
            }
          : alert,
      ),
    })),

  acknowledgeAll: (acknowledgedBy) =>
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.isAcknowledged
          ? alert
          : {
              ...alert,
              isRead: true,
              isAcknowledged: true,
              acknowledgedBy,
              acknowledgedAt: new Date().toISOString(),
            },
      ),
    })),

  setReportPeriod: (period) => set({ reportPeriod: period }),
}))
