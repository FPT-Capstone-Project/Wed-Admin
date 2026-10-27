/**
 * Hồ sơ vi khí hậu / thông số canh tác theo từng giống nấm.
 *
 * Mỗi tầng nuôi trồng ở chế độ AUTO sẽ đồng bộ theo hồ sơ của giống nấm
 * đang được gán trên khay.
 *
 * ⚠ Ngưỡng ẩm giá thể là **optional** (`null` = không đặt ngưỡng):
 *   không phải giống nấm nào cũng cần đủ nhóm chỉ số.
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
  /** Dải độ ẩm cơ chất / giá thể (%) — `null` = không đặt ngưỡng */
  soilMoistureMin: number | null
  soilMoistureMax: number | null
  isDefault: boolean
  updatedAt: string
}
