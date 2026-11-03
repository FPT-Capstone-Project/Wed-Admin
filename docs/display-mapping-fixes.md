# Sửa 5 lỗi hiển thị và mapping dữ liệu

## Nguyên nhân và bản vá

| Lỗi | Nguyên nhân xác nhận trong mã | Cách sửa |
|---|---|---|
| Ngày 1970 | mergeOrderSources mặc định new Date(0), cột ngày format trực tiếp | Ngày thiếu giữ null; formatDate trả dấu — cho giá trị rỗng, 0, chuỗi 0, ngày không hợp lệ hoặc năm <= 1970. Không lấy ngày tạo phiên thay ngày tạo đơn. |
| Gói/tiền/thanh toán sai | DTO được cast trực tiếp, chỉ đọc một số key, tiền PostgreSQL có thể là chuỗi | normalizeOrder chuẩn hóa snake_case/camelCase/object lồng/order_items; chuyển tiền về số hữu hạn và chuẩn hóa trạng thái. Nguồn bổ sung không ghi đè tên gói/nấm từ đơn. |
| Trang phiên/sinh trưởng/báo cáo rỗng khi 404 | sessionApi, farmApi và lớp tổng hợp bắt lỗi rồi trả []/null | Cho lỗi danh sách đi lên React Query, hiển thị Alert và thử lại; không render KPI/bảng rỗng khi query lỗi. Đơn hàng vẫn hiển thị nguồn chính nhưng báo rõ lỗi nguồn phụ. |
| Sự cố bị rỗng | API giả định response chỉ có một lớp data | Loại param rỗng; unwrap mảng trực tiếp, data, data.data và data.items, giữ pagination; payload sai định dạng báo lỗi thay vì giả vờ không có sự cố. |
| Drawer khay đang thuê hiển thị Empty | Không phân biệt thiếu phiên với tải lỗi, và giữ placeholder của khay trước | Với OCCUPIED (được mapper UI chuyển thành rented), hiển thị thông tin chu kỳ nuôi trồng khi chưa có phiên. Báo lỗi có nút thử lại. Tắt placeholder cũ và không lấy phiên đã kết thúc làm phiên đang chạy của khay đang thuê. |

## Cấu trúc file

```text
src/shared/utils/date.ts
src/shared/api/list-response.ts
src/shared/ui/LoadErrorAlert.tsx
src/features/orders/api/{order.api.ts,order-normalizer.ts}
src/features/orders/utils/merge-order-sources.ts
src/features/orders/hooks/useAdminOrders.ts
src/features/orders/types/admin-order.types.ts
src/types/order.ts
src/pages/orders/OrderManagementPage.tsx
src/features/sessions/api/session.api.ts
src/features/sessions/pages/SessionListPage.tsx
src/features/cultivation/api/cultivation.api.ts
src/features/cultivation/pages/CultivationManagementPage.tsx
src/features/analytics/api/analytics.api.ts
src/pages/reports/ReportsAnalyticsPage.tsx
src/features/farm/api/farm.api.ts
src/features/disease-management/api/issues.api.ts
src/features/rooms/components/TrayDetailDrawer.tsx
tests/display-mapping.test.mjs
```

Dayjs 1.11.23 được khai báo dependency trực tiếp (đã có trong dependency tree trước đó). Giữ phiên bản Ant Design hiện tại của dự án; không hạ phiên bản hay đổi theme. Alert mới dùng API tương thích v5.

## Kiểm tra

- TypeScript: `npm run typecheck`.
- ESLint: `npm run lint`.
- Test: `node --experimental-strip-types --test tests/display-mapping.test.mjs tests/harvest-metrics.test.mjs` — 13 test qua.
- Build: `npm run build -- --outDir .verify-display-build` (thư mục riêng để giữ dist đang có thay đổi).
- Chưa chạy E2E với phiên đăng nhập/backend thật. Kiểm thử API dùng transport giả lập chỉ trong tests để xác nhận lỗi 404 và response lồng; ứng dụng không thêm dữ liệu giả.

Nếu API hoàn toàn không cung cấp tên gói, số tiền hay ngày đơn, frontend không thể tái tạo giá trị thực. Nếu endpoint trả 404, bản vá hiển thị lỗi rõ ràng; backend vẫn cần triển khai endpoint để có dữ liệu.
