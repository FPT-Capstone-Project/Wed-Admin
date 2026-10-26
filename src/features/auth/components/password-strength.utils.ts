/**
 * Ước lượng độ mạnh mật khẩu theo 4 tiêu chí thực tế.
 *
 * Không nhằm mã hoá an toàn — chỉ để NGƯỜI DÙNG biết mật khẩu của họ có
 * đủ đa dạng hay không trước khi gửi lên server.
 *
 * ⚠ Tách riêng khỏi `PasswordStrength.tsx` vì rule
 *   `react-refresh/only-export-components` yêu cầu file component chỉ
 *   export component — helper thuần nằm ở file riêng để HMR hoạt động đúng.
 */

export type PasswordStrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong'

export function scorePassword(
  value: string,
): Exclude<PasswordStrengthLevel, 'empty'> | 'empty' {
  if (!value) return 'empty'

  let score = 0
  if (value.length >= 8) score += 1
  if (value.length >= 12) score += 1
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1
  if (/\d/.test(value)) score += 1
  if (/[^\w\s]/.test(value)) score += 1

  if (score <= 1) return 'weak'
  if (score === 2) return 'fair'
  if (score === 3) return 'good'
  return 'strong'
}
