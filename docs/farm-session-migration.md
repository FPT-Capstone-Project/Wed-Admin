# Refactor nguồn phiên canh tác sang Farm Sessions

## Luồng dữ liệu

- `GET /api/farm/sessions` là nguồn danh sách duy nhất cho sessionApi. Chỉ gửi `status` khi chọn bộ lọc.
- `start_at` → `start_date`; `harvest_date` → `expected_harvest_date`; `tray_quantity` → `tray_count`. Giữ `spawn_quantity`, `harvest_status`, `order_item_id`, `last_inspected_at`.
- Không lấy ngày bắt đầu phiên làm ngày tạo đơn; không coi số phôi yêu cầu là số phôi đã cấp.
- Danh sách chưa có mã khay, tên gói, tiền, email, tiến độ thực đo. Các giá trị thiếu giữ null; phân bổ khay được xem trong chi tiết. Thanh tiến độ theo giai đoạn là ước tính UI hiện hữu, không phải số đo backend.
- Phân trang và các bộ lọc ngoài status chạy ở frontend. Tổng hợp Dashboard/Sinh trưởng/Báo cáo/Đơn hàng không giới hạn 100 phiên.
- Chi tiết dùng `/api/farm/sessions/:id`. Đọc phân bổ khay qua `/api/customer/orders/:orderId/cultivation-status`, ghép theo session_id rồi lọc tray_id thật. Không suy đoán quan hệ từ tray_quantity; giới hạn 5 request quan hệ đồng thời.
- Loại nguồn danh sách trùng lặp ở Đơn hàng và Sinh trưởng. Đổi namespace cache phiên để tránh dùng dữ liệu nguồn cũ.
- Thêm hỗ trợ HARVEST_READY ở type, nhãn, bộ lọc và thống kê.
- Không còn tham chiếu route cũ trong src. Lỗi API thật vẫn được chuyển lên React Query, không trả danh sách rỗng giả.

## Phạm vi dữ liệu backend

Theo model backend trong workspace, danh sách mặc định gồm phiên đã thanh toán còn trong quy trình farm. Bộ lọc status cho phép lấy COMPLETED/CANCELLED. Tổng quan mặc định vì vậy phản ánh danh sách farm, không tự khẳng định là toàn bộ lịch sử trang trại. Quan hệ khay từ trạng thái đơn hiện chỉ trả assigned_trays ACTIVE; lịch sử khay đã RELEASED cần endpoint lịch sử riêng nếu muốn xem đầy đủ.

## File chính

```text
src/features/sessions/api/session.api.ts
src/features/sessions/api/session-normalizer.ts
src/features/sessions/types/session.types.ts
src/features/sessions/hooks/useSessions.ts
src/features/sessions/pages/SessionListPage.tsx
src/features/sessions/components/{SessionDetailDrawer.tsx,session-status.config.ts}
src/features/farm/{api/farm.api.ts,types/farm.types.ts}
src/features/cultivation/{api/cultivation.api.ts,types/cultivation.types.ts}
src/features/analytics/{api/analytics.api.ts,utils/executive-report.utils.ts}
src/features/orders/{hooks/useAdminOrders.ts,utils/merge-order-sources.ts}
src/features/rooms/hooks/useTraySessionSummaries.ts
src/features/devices/api/tray-history.api.ts
src/shared/ui/LoadErrorAlert.tsx
tests/display-mapping.test.mjs
```

## Kết quả tự kiểm tra

- TypeScript, ESLint và build production thành công.
- 18 tests qua, gồm mapping farm, phân trang frontend, trên 100 phiên, tra quan hệ khay, route chi tiết, lỗi API và các hồi quy trước.
- Build vào thư mục kiểm tra riêng để giữ dist đang có thay đổi; đã dọn artifact kiểm tra.
- Chưa kiểm thử E2E bằng tài khoản Admin với backend đang triển khai.
