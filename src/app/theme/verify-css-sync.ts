/**
 * Kiểm tra đồng bộ giữa `tokens.ts` và `App.css`.
 *
 * `App.css` khai báo lại CSS variables để tải nhanh (tránh runtime JS),
 * nên phải có cơ chế bảo đảm hai nguồn không lệch nhau.
 *
 * Chạy: `npm run verify:tokens`
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { buildCssVariables } from './tokens.ts'

const here = dirname(fileURLToPath(import.meta.url))
const appCssPath = resolve(here, '../../App.css')
const appCss = readFileSync(appCssPath, 'utf8')

/** Trích các cặp `--name: value;` trong block `:root` đầu tiên. */
function extractRootVars(css: string): Map<string, string> {
  const rootMatch = css.match(/:root\s*\{([\s\S]*?)\n\}/)
  if (!rootMatch) return new Map()

  const vars = new Map<string, string>()
  const re = /--([\w-]+)\s*:\s*([^;]+);/g
  let match: RegExpExecArray | null
  while ((match = re.exec(rootMatch[1])) !== null) {
    vars.set(match[1], match[2].trim())
  }
  return vars
}

const cssVars = extractRootVars(appCss)
const generated = extractRootVars(buildCssVariables())

const failures: string[] = []

/** Mỗi biến trong tokens.ts phải có trong App.css với cùng giá trị. */
for (const [name, value] of generated) {
  const actual = cssVars.get(name)
  if (actual === undefined) {
    failures.push(`Thieu bien trong App.css: --${name} (gia tri mong doi: ${value})`)
  } else if (actual !== value) {
    failures.push(
      `Sai gia tri --${name}: App.css = ${actual} | tokens.ts = ${value}`,
    )
  }
}

/** Không có biến "mồ côi" trong App.css mà tokens.ts không sinh ra. */
for (const name of cssVars.keys()) {
  if (!generated.has(name)) {
    failures.push(`Bien khong co nguon trong tokens.ts: --${name}`)
  }
}

console.log('=== DONG BO tokens.ts <-> App.css ===\n')
console.log(`tokens.ts sinh: ${generated.size} bien`)
console.log(`App.css co:     ${cssVars.size} bien\n`)

if (failures.length > 0) {
  console.error(`X ${failures.length} khac biet:\n`)
  for (const failure of failures) console.error(`   - ${failure}`)
  process.exit(1)
}

console.log(`OK — ${generated.size} bien da dong bo hoan toan.`)
