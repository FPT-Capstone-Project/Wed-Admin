/**
 * Types dùng riêng cho module Reports / Executive Dashboard.
 * Định nghĩa TRỰC TIẾP tại đây để tránh coupling ngược với alert.types.ts
 * (lý do: TS bundler-mode + verbatimModuleSyntax không resolve được
 * relative re-exports của type-only khi có cache cũ).
 *
 * Nếu alert.types.ts cần dùng các type này, hãy import từ file này.
 */

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

export interface EnvironmentHistoryPoint {
  time: string
  date: string
  temperature: number
  humidity: number
  soilMoisture: number
  trayId: string
}
