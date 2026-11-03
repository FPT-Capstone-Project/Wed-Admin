# MCMS Admin — tài nguyên, bệnh học và thu hoạch

## Logic triển khai

Web chỉ cho Admin truy cập qua AuthGuard + RoleGuard. Admin cấu hình phòng/lưới khay/camera, đọc thông báo, phân công chuyên gia và duyệt ca bệnh MONITORING. Dữ liệu sinh trưởng, kiểm tra phôi, điều trị, sản lượng và bàn giao chỉ xem. Không thêm lệnh SSR hay form chỉnh ngưỡng tưới.

Các API dùng client xác thực hiện tại. TanStack Query cập nhật cache sau mutation; Ant Design phản hồi thành công/lỗi. Giữ stack, theme và player Imou đang có trong repo (Ant Design hiện là 6.6.1; không hạ phiên bản hoặc bổ sung framework CSS).

## Cấu trúc mã nguồn chính

```text
src/
  features/
    notifications/
      api/notification.api.ts
      hooks/useNotifications.ts
      components/NotificationBell.tsx
      pages/NotificationsPage.tsx
    rooms/
      api/cultivation-room.api.ts
      components/RoomAdministration.tsx
      components/RackView.tsx
      pages/RoomListPage.tsx
    cameras/
      api/camera.api.ts
      components/CameraAdministration.tsx
    disease-management/
      api/issues.api.ts
      api/issues.queries.ts
      components/IssueDetailDrawer.tsx
      pages/IssueManagementPage.tsx
    harvest/
      api/harvest.api.ts
      api/harvest.queries.ts
      api/harvest-metrics.ts
      components/HarvestDetailDrawer.tsx
      pages/HarvestManagementPage.tsx
    orders/
      api/order-audit.api.ts
      components/OrderAuditTabs.tsx
  pages/camera/CameraOverviewPage.tsx
  pages/orders/OrderManagementPage.tsx
  app/router/{index.tsx,lazy-pages.ts}
  app/layouts/AdminLayout.tsx
  shared/ui/{QueryFeedback.tsx,audit-format.ts,DataTable.tsx}
tests/harvest-metrics.test.mjs
```

## Hợp đồng backend và giới hạn

- DTO bệnh/thu hoạch theo snake_case của backend hiện có; payload phân công dùng `{ expertId }`.
- GET chi tiết ca bệnh không trả consultation_id. Drawer đọc đủ trang `/api/consultations`, đối chiếu issue_id rồi lấy nhật ký theo từng consultation_id. Không tạo tư vấn thay nhân viên. Cách này đúng với API hiện tại nhưng số request tăng theo tổng số tư vấn; backend nên bổ sung bộ lọc issueId khi dữ liệu lớn.
- Đơn hàng trả `{ orderId, sessions }`, có thể gồm nhiều phiên. Tab mới giữ đủ các phiên; mã khay lấy từ danh mục khay thực tế.
- API trạng thái đơn **chưa trả mã lô phôi**. Giao diện hiển thị số phôi và thông báo thiếu dữ liệu lô, không suy đoán mã lô.
- GET phiên stream trả `{ data: { count, start, limit, lives } }`. Nút dừng gửi liveToken của phiên thật tới `/api/cameras/live-streams/stop`; không hiển thị token trong giao diện.
- KPI tính trên toàn bộ danh sách theo bộ lọc (backend chưa phân trang harvest/admin). Tỷ lệ A/B = thương phẩm của các đợt phẩm cấp A/B / tổng khối lượng. Chưa có cân nặng hiện `—`, không coi là 0 kg.
- Chờ bàn giao = thu hoạch COMPLETED và yêu cầu nhận ở PENDING/SCHEDULED/CONFIRMED; không đếm yêu cầu đã COMPLETED hoặc thiếu yêu cầu.
- Lưới khay dùng floor_id thật từ `/api/iot/floors`, không dùng room_id thay thế. Các thao tác tạo/dọn có xác nhận; lỗi 409 hiển thị nguyên nhân backend.

## Kiểm tra

```powershell
npm run typecheck
npm run lint
npm run verify:tokens
node --experimental-strip-types --test tests/harvest-metrics.test.mjs
npm run build -- --outDir .verify-build
```

Đã chạy thành công TypeScript, ESLint, kiểm tra token/CSS và build production. Ba test KPI kiểm tra số thập phân PostgreSQL, thiếu dữ liệu/0 kg và trạng thái chờ bàn giao.

Chưa chạy E2E với phiên đăng nhập Admin hoặc thiết bị Imou thật. Khi nghiệm thu tích hợp, kiểm tra đánh dấu thông báo, tạo/sửa/xóa phòng (gồm 409), sinh/dọn khay, CRUD camera/dừng stream, phân công chuyên gia và duyệt MONITORING; đối chiếu các tab đơn hàng với dữ liệu backend.
