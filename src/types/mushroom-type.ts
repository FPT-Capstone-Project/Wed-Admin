/**
 * Mushroom Types — DTOs khớp với Swagger schemas.
 * Endpoint: /api/mushroom-types
 */

export type MushroomTypeStatus = 'ACTIVE' | 'INACTIVE'

/** GET /api/mushroom-types → response.data[] */
export interface MushroomType {
  mushroom_type_id: number
  name: string
  description: string | null
  growing_days: number
  price: number
  image_url: string | null
  status: MushroomTypeStatus
  created_at: string
}

/** POST /api/mushroom-types — multipart/form-data (JSON part only) */
export interface CreateMushroomTypeRequest {
  name: string
  description?: string
  growingDays: number
  price: number
  imageUrl?: string
  status?: MushroomTypeStatus
}

/** PUT /api/mushroom-types/{id} */
export interface UpdateMushroomTypeRequest {
  name?: string
  description?: string
  growingDays?: number
  price?: number
  imageUrl?: string
  status?: MushroomTypeStatus
}

/** Query filter */
export interface MushroomTypeListQuery {
  status?: MushroomTypeStatus
}

/** Helper cho FormData POST (vì backend nhận multipart) */
export interface CreateMushroomTypeFormPayload {
  values: CreateMushroomTypeRequest
  image?: File | null
}

export interface UpdateMushroomTypeFormPayload {
  values: UpdateMushroomTypeRequest
  image?: File | null
}