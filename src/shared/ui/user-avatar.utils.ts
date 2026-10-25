/**
 * Sinh chữ cái đầu từ họ tên — lấy 2 chữ cái đầu của 2 từ cuối.
 *
 * VD: "Nguyễn Minh Anh" → "NA", "Trần Quốc Bảo" → "QB".
 * Khi tên rỗng → fallback "NA" để avatar không trống.
 */
export function getUserInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return 'NA'

  const initials = parts
    .slice(-2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()

  return initials || 'NA'
}
