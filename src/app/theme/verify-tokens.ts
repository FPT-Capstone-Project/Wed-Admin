/**
 * Kiểm tra tự động tương phản WCAG cho design tokens.
 *
 * Chạy: `npm run verify:tokens`
 *
 * Không cần test framework — dùng `node --experimental-strip-types`
 * (Node ≥ 22.6) nên không phải cài thêm package.
 *
 * Mục tiêu: bảo đảm không ai vô tình đổi token làm hỏng WCAG AA.
 */

import { border, palette, surface, text, tones } from './tokens.ts'

/** WCAG 2.x relative luminance. */
function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const channel = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const r = channel(Number.parseInt(h.slice(0, 2), 16))
  const g = channel(Number.parseInt(h.slice(2, 4), 16))
  const b = channel(Number.parseInt(h.slice(4, 6), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio giữa 2 màu. */
function contrast(fg: string, bg: string): number {
  const l1 = luminance(fg)
  const l2 = luminance(bg)
  const hi = Math.max(l1, l2)
  const lo = Math.min(l1, l2)
  return (hi + 0.05) / (lo + 0.05)
}

const failures: string[] = []
const checks: Array<{ name: string; ratio: number; min: number }> = []

function check(name: string, fg: string, bg: string, min: number): void {
  const ratio = contrast(fg, bg)
  checks.push({ name, ratio, min })
  if (ratio < min) {
    failures.push(
      `${name}: ${ratio.toFixed(2)}:1 (cần ≥ ${min}:1) — ${fg} trên ${bg}`,
    )
  }
}

/* --- Chữ trên nền (AA = 4.5:1) ----------------------------------------- */

check('Chữ chính / trắng', text.base, surface.surface, 4.5)
check('Chữ chính / nền app', text.base, surface.background, 4.5)
check('Chữ chính / nền lạch', text.base, surface.surfaceMuted, 4.5)
check('Chữ phụ / trắng', text.muted, surface.surface, 4.5)
check('Chữ phụ / nền app', text.muted, surface.background, 4.5)
check('Chữ phụ / nền lạch', text.muted, surface.surfaceMuted, 4.5)
check('Nút chính / trắng trên primary', text.inverse, palette.primary, 4.5)

/* --- Trạng thái ngữ nghĩa (AA = 4.5:1) -------------------------------- */

for (const [name, tone] of Object.entries(tones)) {
  check(`Tone ${name} / chữ trên nền mềm`, tone.text, tone.bg, 4.5)
  check(`Tone ${name} / chữ trên trắng`, tone.text, surface.surface, 4.5)
}

/* --- Viền (WCAG 1.4.11 Non-text Contrast = 3:1) ------------------------ */

check('Viền nhấn / trắng', border.strong, surface.surface, 3)
check('Viền nhấn / nền app', border.strong, surface.background, 3)
check('Focus ring / trắng', palette.primary, surface.surface, 3)
check('Focus ring / nền app', palette.primary, surface.background, 3)

for (const [name, tone] of Object.entries(tones)) {
  check(`Viền tone ${name} / nền mềm`, tone.border, tone.bg, 3)
  check(`Viền tone ${name} / trắng`, tone.border, surface.surface, 3)
}

/* --- Báo cáo ----------------------------------------------------------- */

const maxWidth = Math.max(...checks.map((c) => c.name.length))
console.log('=== KIỂM TRA TUONG PHAN WCAG — MCMS DESIGN TOKENS ===\n')

for (const { name, ratio, min } of checks) {
  const status = ratio >= min ? 'PASS' : 'FAIL'
  console.log(
    `${status}  ${name.padEnd(maxWidth)}  ${ratio.toFixed(2).padStart(6)}:1  (can >= ${min}:1)`,
  )
}

console.log('')

if (failures.length > 0) {
  console.error(`X ${failures.length}/${checks.length} kiem tra KHONG dat:\n`)
  for (const failure of failures) console.error(`   - ${failure}`)
  process.exit(1)
}

console.log(`OK — Tat ca ${checks.length} kiem tra dat WCAG AA.`)
