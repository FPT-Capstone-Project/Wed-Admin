/** Preserve identity; only shorten a row/column suffix explicitly present in the code. */
export function shortTrayCode(code: string): string {
  const value = code.trim()
  const location = value.match(/(?:^|[-_])R(\d+)[-_]C(\d+)$/i)
  return location ? `R${location[1]}-C${location[2]}` : value
}
