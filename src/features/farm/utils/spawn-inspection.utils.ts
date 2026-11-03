import type { SpawnInspection } from '../types/farm.types'

/**
 * Lấy URL ảnh đầu tiên hợp lệ từ 1 lần kiểm tra phôi.
 *
 * Ảnh được lưu trên Cloudinary nên `secure_url` được ưu tiên; fallback về
 * `url` (bản http) nếu BE không trả `secure_url`.
 */
export function firstImageUrl(
  inspection: SpawnInspection | null | undefined,
): string | null {
  if (!inspection?.images?.length) return null
  for (const image of inspection.images) {
    const url = image.secure_url ?? image.url
    if (url) return url
  }
  return null
}
