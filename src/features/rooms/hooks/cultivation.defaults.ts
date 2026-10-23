/**
 * Default telemetry dùng khi BE chưa trả real-time data.
 * Sau này sẽ được replace bằng WebSocket real-time telemetry.
 */
import type { TierTelemetry } from '../../../types/room.types'

export const DEFAULT_TELEMETRY: TierTelemetry = {
  temperature: 24.5,
  humidity: 85,
  /** BE chưa expose CO2 — đợi BA bổ sung sensor. */
  co2: null,
  updatedAt: new Date().toISOString(),
}
