import { apiClient } from '../../../shared/api/client'
import { ensureObject } from '../../../shared/api/response-normalizer'
import type {
  CancelRentalRequest,
  CompleteRentalRequest,
  CreateRentalFromOrderRequest,
  RecordRentalHarvestRequest,
  RecordRentalProgressRequest,
  Rental,
  RentalListQuery,
  RentalPagination,
  SendRentalNotificationRequest,
  SentRentalNotification,
  StartCultivationSessionRequest,
  UpdateRentalRequest,
} from '../types/rental.types'

/**
 * Rentals Admin API — 9 endpoint dưới `/api/rentals/admin`.
 *
 * Phân quyền (đã verify trên Swagger):
 * - role_id 1 (Admin) + 2 (Farm Operator): tất cả trừ `/cancel`
 * - role_id 1 (Admin) mới được gọi `/cancel`
 * → UI phải ẩn nút huỷ với Farm Operator.
 *
 * Lưu ý về unwrap:
 * - `GET /api/rentals/admin` trả `{ data: Rental[], pagination: {...} }` —
 *   pagination KHÔNG nằm trong `data`, nên không dùng `ensureArray` một cách mù quáng.
 * - Các endpoint còn lại trả `{ data: {...} }` → dùng `ensureObject`.
 */

const BASE = '/api/rentals/admin'

/** Kết quả list + pagination (BE tách `pagination` ra ngoài `data`). */
export interface RentalListResult {
  items: Rental[]
  pagination: RentalPagination
}

export const rentalApi = {
  /**
   * GET /api/rentals/admin — danh sách vụ thuê (có phân trang + lọc).
   */
  async list(query: RentalListQuery = {}): Promise<RentalListResult> {
    const response = await apiClient.get<unknown>(BASE, { params: query })

    const body = (response.data ?? {}) as Record<string, unknown>
    const items = Array.isArray(body.data)
      ? (body.data as Rental[])
      : ensureObject<Rental[]>(body) ?? []

    const pagination = (body.pagination as RentalPagination | undefined) ?? {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      total: items.length,
      totalPages: 1,
    }

    return { items, pagination }
  },

  /**
   * GET /api/rentals/admin/{rentalId} — chi tiết vụ thuê
   * (kèm customer, order, package, tray, room).
   */
  async getById(rentalId: number): Promise<Rental | null> {
    const response = await apiClient.get<unknown>(`${BASE}/${rentalId}`)
    return ensureObject<Rental>(response.data)
  },

  /**
   * POST /api/rentals/admin/from-order — tạo rental thủ công cho đơn đã thanh toán.
   * Idempotent: nếu rental đã tồn tại thì BE trả `200` kèm rental cũ.
   *
   * @throws 404 khi không tìm thấy đơn rental đã thanh toán
   * @throws 409 khi đơn chưa thanh toán hoặc đã bị huỷ
   */
  async createFromOrder(
    payload: CreateRentalFromOrderRequest,
  ): Promise<Rental | null> {
    const response = await apiClient.post<unknown>(
      `${BASE}/from-order`,
      payload,
    )
    return ensureObject<Rental>(response.data)
  },

  /**
   * POST /api/rentals/admin/{rentalId}/cultivation-session — bắt đầu canh tác:
   * tạo session ACTIVE + progress PREPARATION, gán khay, đánh dấu khay OCCUPIED.
   *
   * @throws 409 khi rental chưa sẵn sàng, khay không khả dụng, hoặc session đã tồn tại
   */
  async startCultivationSession(
    rentalId: number,
    payload: StartCultivationSessionRequest,
  ): Promise<Rental | null> {
    const response = await apiClient.post<unknown>(
      `${BASE}/${rentalId}/cultivation-session`,
      payload,
    )
    return ensureObject<Rental>(response.data)
  },

  /**
   * POST /api/rentals/admin/{rentalId}/progress — ghi nhận tiến độ canh tác.
   *
   * @throws 400 khi dữ liệu không hợp lệ (vd: progressPercent ngoài 0–100)
   * @throws 409 khi rental/session không ACTIVE, hoặc tiến độ lùi về sau
   */
  async recordProgress(
    rentalId: number,
    payload: RecordRentalProgressRequest,
  ): Promise<Rental | null> {
    const response = await apiClient.post<unknown>(
      `${BASE}/${rentalId}/progress`,
      payload,
    )
    return ensureObject<Rental>(response.data)
  },

  /**
   * POST /api/rentals/admin/{rentalId}/harvests — ghi nhận thu hoạch.
   *
   * @throws 400 khi quantity ≤ 0 hoặc thiếu `unit`
   * @throws 409 khi rental không ACTIVE, hoặc giai đoạn hiện tại chưa phải HARVEST
   */
  async recordHarvest(
    rentalId: number,
    payload: RecordRentalHarvestRequest,
  ): Promise<Rental | null> {
    const response = await apiClient.post<unknown>(
      `${BASE}/${rentalId}/harvests`,
      payload,
    )
    return ensureObject<Rental>(response.data)
  },

  /**
   * POST /api/rentals/admin/{rentalId}/complete — hoàn tất vụ thuê sau thu hoạch.
   *
   * @throws 409 khi rental không ACTIVE, chưa có thu hoạch, hoặc đơn đã huỷ
   */
  async complete(
    rentalId: number,
    payload: CompleteRentalRequest = {},
  ): Promise<Rental | null> {
    const response = await apiClient.post<unknown>(
      `${BASE}/${rentalId}/complete`,
      payload,
    )
    return ensureObject<Rental>(response.data)
  },

  /**
   * POST /api/rentals/admin/{rentalId}/cancel — huỷ vụ thuê, đánh dấu đơn đã
   * thanh toán để hoàn tiền thủ công.
   *
   * ⚠ CHỈ Admin (role_id 1) — Farm Operator sẽ nhận 403.
   *
   * @throws 400 khi `reason` thiếu hoặc dài ngoài 3–500 ký tự
   * @throws 409 khi rental không huỷ được ở trạng thái hiện tại
   */
  async cancel(
    rentalId: number,
    payload: CancelRentalRequest,
  ): Promise<Rental | null> {
    const response = await apiClient.post<unknown>(
      `${BASE}/${rentalId}/cancel`,
      payload,
    )
    return ensureObject<Rental>(response.data)
  },

  /**
   * PATCH /api/rentals/admin/{rentalId} — duyệt rental (CONFIRMED → PREPARING)
   * hoặc chỉnh khay / thời hạn / ngày bắt đầu–kết thúc.
   *
   * @throws 409 khi chuyển trạng thái không hợp lệ, hoặc khay bị trùng lịch
   */
  async update(
    rentalId: number,
    payload: UpdateRentalRequest,
  ): Promise<Rental | null> {
    const response = await apiClient.patch<unknown>(
      `${BASE}/${rentalId}`,
      payload,
    )
    return ensureObject<Rental>(response.data)
  },

  /**
   * POST /api/rentals/admin/{rentalId}/notifications — gửi thông báo cho
   * khách thuê. BE tự suy ra người nhận từ `rental.user_id`.
   *
   * ⚠ Tên field loại thông báo: UI gửi `notification_type` (đúng tên field
   * trong schema `Notification`), nhưng service BE hiện đọc `body.type`
   * (`notification.service.js` → `normalizeType(body.type)`). BE không có
   * middleware validate body nên field thừa bị bỏ qua — vì vậy ta gửi **cả
   * hai** key với cùng giá trị:
   *   - BE đọc `type`              → vẫn đúng (BE hiện tại).
   *   - BE đổi sang `notification_type` → vẫn đúng, không cần sửa FE.
   * Nếu chỉ gửi một trong hai, loại thông báo sẽ bị BE bỏ qua và âm thầm
   * fallback về `OPERATOR_MESSAGE` — không có lỗi nhưng sai ý người dùng.
   *
   * @throws 400 khi title/message vượt giới hạn hoặc type không hợp lệ
   * @throws 409 khi vụ thuê đã đóng hoặc tài khoản khách không ACTIVE
   */
  async sendNotification(
    rentalId: number,
    payload: SendRentalNotificationRequest,
  ): Promise<SentRentalNotification | null> {
    const body: Record<string, unknown> = { message: payload.message }

    // Trim ở tầng API để title chỉ khoảng trắng không bị gửi lên (BE trả
    // 400 vì title rỗng). Caller khác cũng được an toàn mà không cần tự trim.
    const title = payload.title?.trim()
    if (title) {
      body.title = title
    }

    if (payload.notification_type) {
      body.notification_type = payload.notification_type
      body.type = payload.notification_type
    }

    const response = await apiClient.post<unknown>(
      `${BASE}/${rentalId}/notifications`,
      body,
    )
    return ensureObject<SentRentalNotification>(response.data)
  },
}