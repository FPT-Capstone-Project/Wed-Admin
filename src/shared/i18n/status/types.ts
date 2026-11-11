/**
 * Kiểu dữ liệu dùng chung cho toàn bộ **từ điển trạng thái** của MCMS.
 *
 * ⚠ Nguyên tắc bất di bất dịch của module `shared/i18n/status`:
 *
 *   1. **Giá trị gốc của BE được giữ nguyên** — key của từ điển luôn là
 *      enum/string mà backend trả về (`PENDING`, `AVAILABLE`, `ON`, ...).
 *      Việc Việt hoá **chỉ** diễn ra ở tầng hiển thị.
 *   2. **Một trạng thái = một tone ngữ nghĩa** (`SemanticTone`) — không dùng
 *      màu preset của antd (`success`/`warning`/`error`) vì chúng FAIL
 *      WCAG AA. Xem `src/app/theme/tokens.ts`.
 *   3. **Không bao giờ lộ chuỗi tiếng Anh chưa dịch** — giá trị lạ luôn
 *      được gói kèm nhãn "Chưa xác định (VALUE)" + tone `muted`.
 */

import type { SemanticTone } from '../../../app/theme/tokens'

/**
 * Một trạng thái đã được "chuẩn hoá" cho hiển thị.
 *
 * - `label` — nhãn đầy đủ (badge, bảng, drawer).
 * - `tone` — tone ngữ nghĩa quyết định màu badge.
 * - `shortLabel` — nhãn rút gọn cho ô nhỏ (lưới khay, chip) — tuỳ chọn.
 * - `description` — giải thích ngắn để hiển thị trong tooltip.
 */
export interface StatusPresentation {
  /** Nhãn tiếng Việt dùng trong UI. */
  readonly label: string
  /** Tone ngữ nghĩa — dùng cho `StatusBadge`. */
  readonly tone: SemanticTone
  /** Nhãn rút gọn cho không gian hẹp. */
  readonly shortLabel?: string
  /** Mô tả ngắn (tooltip). */
  readonly description?: string
}

/**
 * Từ điển trạng thái — map từ **giá trị gốc của BE** sang presentation.
 *
 * ⚠ Key có thể là bất kỳ chuỗi nào (BE có thể trả enum mới chưa khai báo
 * ở FE) ⇒ tra cứu phải luôn an toàn, xem `presentStatus()`.
 */
export type StatusDictionary = Readonly<Record<string, StatusPresentation>>

/**
 * Một lựa chọn trạng thái — dùng cho `Select` / bộ lọc.
 *
 * ⚠ `tone` là metadata, KHÔNG phải prop của antd `Select` — khi truyền
 *  thẳng vào `options` của antd, hãy dùng `selectOptions()`.
 */
export interface StatusOption {
  /** Giá trị gốc của BE (dùng làm `value`). */
  readonly value: string
  /** Nhãn tiếng Việt đã dịch. */
  readonly label: string
  /** Tone ngữ nghĩa kèm theo. */
  readonly tone: SemanticTone
}
