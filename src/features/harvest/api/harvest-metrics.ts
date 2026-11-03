import type { Harvest } from './harvest.api'
export type HarvestMetricRow = Pick<Harvest, 'total_weight_kg' | 'usable_weight_kg' | 'quality_grade' | 'status' | 'harvest_request_status'>
export function calculateHarvestMetrics(rows: readonly HarvestMetricRow[]) {
  let totalWeightKg = 0
  let usableGradeABKg = 0
  let recordedCount = 0
  let pendingHandover = 0
  for (const row of rows) {
    if (row.status === 'COMPLETED' && ['PENDING', 'SCHEDULED', 'CONFIRMED'].includes(row.harvest_request_status ?? '')) pendingHandover += 1
    if (row.total_weight_kg == null || !Number.isFinite(Number(row.total_weight_kg))) continue
    recordedCount += 1
    totalWeightKg += Number(row.total_weight_kg)
    if (['A', 'B'].includes(row.quality_grade ?? '') && row.usable_weight_kg != null && Number.isFinite(Number(row.usable_weight_kg))) {
      usableGradeABKg += Number(row.usable_weight_kg)
    }
  }
  return {
    totalWeightKg: recordedCount || rows.length === 0 ? totalWeightKg : null,
    gradeABPercent: totalWeightKg > 0 ? usableGradeABKg / totalWeightKg * 100 : null,
    pendingHandover,
  }
}
