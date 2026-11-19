/**
 * Tiện ích nhận diện văn bản **tiếng Việt**.
 *
 * ⚠ Vì sao cần?
 *   Một số mô tả trong DB là **seed data cũ bằng tiếng Anh** (vd:
 *   `"Premium package"`, `"Basic oyster mushroom cultivation package"`).
 *   Web Admin là UI **tiếng Việt** ⇒ hiện nguyên xi mô tả tiếng Anh dưới
 *   tên gói làm giao diện lệch ngôn ngữ.
 *
 *   ⇒ Dùng hàm này để **ẩn** dòng mô tả không phải tiếng Việt, thay vì
 *     hiện chữ tiếng Anh cho người dùng.
 */

/**
 * Ký tự có dấu riêng của tiếng Việt.
 *
 * ⚠ Chỉ tính **dấu tiếng Việt** — chữ cái Latin không dấu (vd "package")
 *   không đủ để kết luận là tiếng Anh, nên cần thêm bước 2 bên dưới.
 */
const VIETNAMESE_DIACRITICS =
  /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụừứửữựỳýỷỹỵđĐ]/u

/**
 * Từ khoá tiếng Việt thường gặp — dùng khi chuỗi **không có dấu**.
 *
 * ⚠ Vì sao cần nhánh này?
 *   Mô tả tiếng Việt hợp lệ vẫn có thể **không dấu** (vd do admin gõ nhanh:
 *   `"Goi 30 ngay"`). Nếu chỉ dựa vào dấu ⇒ mô tả này bị ẩn oan.
 *
 * ⚠ So khớp theo **ranh giới từ** để không dính chuỗi con (vd "mua" không
 *   được khớp trong "mushroom").
 */
const VIETNAMESE_KEYWORDS = [
  'goi',
  'khay',
  'nam',
  'thue',
  'vu mua',
  'vu',
  'bao gom',
  'cham soc',
  'dich vu',
  'giang',
  'hang',
  'don',
  'tinh',
  'dung',
  'theo',
  'mo ta',
  'thuoc',
  'nang',
  'mua',
  'vay',
  'su dung',
  'chieu',
  'khach',
  'dau',
  'cuoi',
  'giua',
]

/**
 * Bỏ dấu + hạ chữ thường + gộp khoảng trắng — để so khớp từ khoá.
 */
function stripDiacritics(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Chuỗi có chứa dấu tiếng Việt không?
 */
export function containsVietnameseDiacritics(text: string): boolean {
  return VIETNAMESE_DIACRITICS.test(text)
}

/**
 * Chuỗi có phải **mô tả tiếng Việt hợp lệ** để hiển thị ra UI không?
 *
 * ⚠ Quy tắc:
 *   1. Rỗng / chỉ khoảng trắng ⇒ `false`.
 *   2. Có dấu tiếng Việt ⇒ `true`.
 *   3. Không dấu nhưng chứa từ khoá tiếng Việt ⇒ `true`.
 *   4. Còn lại (mô tả tiếng Anh từ seed cũ) ⇒ `false` ⇒ **ẩn khỏi UI**.
 *
 * @param text Mô tả cần kiểm tra.
 */
export function isVietnameseDescription(
  text: string | null | undefined,
): boolean {
  const trimmed = text?.trim()
  if (!trimmed) return false

  if (containsVietnameseDiacritics(trimmed)) return true

  const normalized = stripDiacritics(trimmed)
  return VIETNAMESE_KEYWORDS.some((keyword) =>
    new RegExp(`(^|[^a-z0-9])${keyword}([^a-z0-9]|$)`, 'i').test(normalized),
  )
}
