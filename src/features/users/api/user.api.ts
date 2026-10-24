import { apiClient } from '../../../shared/api/client'
import { unwrapApiCall } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import type {
  CreateManagedUserRequest,
  UpdateUserStatusRequest,
  UserAccountDetail,
  UserListQuery,
  UserWithRole,
} from '../../../types/user.types'

/**
 * Users Admin API — nhóm endpoint `/api/users` (trừ `/me` đã nằm ở `authApi`).
 *
 * Phân quyền (Swagger): mọi endpoint dưới đây yêu cầu **Admin**;
 * role khác nhận 403 → `RoleGuard` đã chặn route `/users` cho non-Admin.
 *
 * Unwrap: cả 4 endpoint đều bọc payload trong `{ data: ... }`
 * → `ensureArray` / `ensureObject` là đủ dùng.
 */
const BASE = '/api/users'

export const userApi = {
  /**
   * GET /api/users?roleId= — danh sách tài khoản kèm thông tin vai trò.
   *
   * ⚠ BE chỉ hỗ trợ lọc `roleId`; tìm kiếm theo tên/email/SĐT và lọc
   * `status` phải làm phía client (giống RentalListPage).
   *
   * @throws 400 khi `roleId` không hợp lệ
   * @throws 403 khi không phải Admin
   */
  async list(query: UserListQuery = {}): Promise<UserWithRole[]> {
    const response = await apiClient.get<unknown>(BASE, { params: query })
    return ensureArray<UserWithRole>(response.data)
  },

  /**
   * POST /api/users — tạo tài khoản mới và gán vai trò.
   *
   * @throws 400 khi input không hợp lệ hoặc `roleId` không tồn tại
   * @throws 409 khi email đã được đăng ký
   */
  async create(
    payload: CreateManagedUserRequest,
  ): Promise<UserAccountDetail | null> {
    return unwrapApiCall(async () => {
      const response = await apiClient.post<unknown>(BASE, payload)
      return ensureObject<UserAccountDetail>(response.data)
    })
  },

  /**
   * GET /api/users/{userId} — chi tiết tài khoản (kèm `order_count`,
   * `rental_count` để hiển thị số liệu tổng hợp).
   *
   * @throws 404 khi không tìm thấy user
   */
  async getById(userId: number): Promise<UserAccountDetail | null> {
    const response = await apiClient.get<unknown>(`${BASE}/${userId}`)
    return ensureObject<UserAccountDetail>(response.data)
  },

  /**
   * PATCH /api/users/{userId}/status — bật / tạm khoá tài khoản.
   *
   * @throws 404 khi không tìm thấy user
   * @throws 400 khi `status` không thuộc ACTIVE | INACTIVE | BLOCKED
   */
  async updateStatus(
    userId: number,
    payload: UpdateUserStatusRequest,
  ): Promise<UserWithRole | null> {
    const response = await apiClient.patch<unknown>(
      `${BASE}/${userId}/status`,
      payload,
    )
    return ensureObject<UserWithRole>(response.data)
  },
}