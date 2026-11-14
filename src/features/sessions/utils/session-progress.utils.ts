export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

/**
 * Format tiến độ đã ghi nhận — **không** tự suy ra giá trị khi thiếu dữ liệu.
 *
 * @param value `progress_percent` / `progress` của Phiên canh tác.
 */
export function formatSessionProgress(
  value: number | string | null | undefined,
): string {
  const parsed = resolveSessionProgress(value)
  return parsed === null ? '—' : `${parsed}%`
}

/** Only recorded Farm OP progress; stage/status never imply a percentage. */
export function resolveSessionProgress(
  progressPercent: number | string | null | undefined,
  _status?: string,
  _stage?: string | null,
): number | null {
  // Retain the existing call signature; lifecycle context cannot imply progress.
  void _status
  void _stage
  if (progressPercent == null || (typeof progressPercent === 'string' && !progressPercent.trim())) return null
  const parsed = Number(progressPercent)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null
}
