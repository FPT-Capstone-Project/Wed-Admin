/** Remove empty text and Swagger's placeholder from display-only fields. */
export function cleanText(value: string | null | undefined): string {
  const text = value?.trim()
  return !text || text === 'string' ? '—' : text
}
