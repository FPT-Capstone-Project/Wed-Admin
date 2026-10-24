/**
 * Hồ sơ vi khí hậu / thông số canh tác theo từng giống nấm.
 *
 * Mỗi tầng nuôi trồng ở chế độ AUTO sẽ đồng bộ theo hồ sơ của giống nấm
 * đang được gán trên khay.
 *
 * ⚠ Các ngưỡng CO₂ và ẩm giá thể là **optional** (`null` = không đặt ngưỡng):
 *   không phải giống nấm nào cũng cần cả 4 nhóm chỉ số.
 */
export interface MushroomThresholdProfile {
  id: string
  /** Tên loại nấm (vd: "Nấm Bào Ngư") */
  mushroomType: string
  /** Tên gợi nhớ của hồ sơ (phân biệt các hồ sơ cùng giống nấm) */
  name: string
  /** Chu kỳ gói (tuần) — dùng để hiển thị và đồng bộ với Pricing Model */
  cycleWeeks: number
  /** Dải nhiệt độ (°C) */
  tempMin: number
  tempMax: number
  /** Dải độ ẩm không khí (%RH) */
  humidityMin: number
  humidityMax: number
  /** Dải CO₂ (ppm) — `null` = không đặt ngưỡng CO₂ */
  co2Min: number | null
  co2Max: number | null
  /** Dải độ ẩm cơ chất / giá thể (%) — `null` = không đặt ngưỡng */
  soilMoistureMin: number | null
  soilMoistureMax: number | null
  isDefault: boolean
  updatedAt: string
}

export type ThresholdProfileInput = Omit<
  MushroomThresholdProfile,
  'id' | 'isDefault' | 'updatedAt' | 'cycleWeeks'
> & {
  /** Chu kỳ gói — optional, store tự suy ra khi bỏ trống */
  cycleWeeks?: number
}
