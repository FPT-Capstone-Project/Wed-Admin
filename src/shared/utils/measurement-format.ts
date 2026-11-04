/** One decimal everywhere in the monitoring UI; missing is never zero. */
export function formatMeasurement(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : value.toFixed(1)
}

/** Format numeric measurements embedded in existing domain descriptions. */
export function formatMeasurementDetails(text: string): string {
  return text.replace(/-?\d+(?:\.\d+)?(?=°C|%RH|%)/g,
    value => formatMeasurement(Number(value)))
}
