# Kết quả Đợt 2 — 16/11/2026

Đã hoàn tất nhóm 4, 5, 6 của audit. Không sửa dữ liệu backend.

## Các thay đổi

- Registry vai trò bổ sung Chuyên gia (role_id 4 đã xác minh từ API thật). Enum chưa biết chỉ hiện “Chưa xác định”, không kèm mã thô. Các template thông báo hệ thống được Việt hóa qua shared/i18n/notification-content.ts và registry reference; ghi chú tự do/tên người/tên gói được giữ nguyên.
- useStaffNames dùng danh mục chung, chỉ query chi tiết những ID cần hiển thị nhưng thiếu trong danh mục; có cache và kiểm tra quyền. useConfiguratorNames tái sử dụng cùng hook. Không tra được thì hiện trạng thái tự nhiên, không giả tên hoặc in ID kỹ thuật.
- Cột bàn giao kiểm tra ngày hợp lệ trước khi ghép “Xong”; không còn “Xong —”. Đã xác minh nhân viên thật “Trần Anh Tú” và trường hợp danh mục thiếu ID được tra ra “xuankhoi”.
- Token radius: 4px cho button/input, 6px cho card/panel; đồng bộ CSS và các góc hardcode sai chuẩn. Avatar/status dot tròn đúng chức năng được giữ lại. Gradient đăng nhập, thanh kệ và Skeleton shimmer được thay bằng nền phẳng.
- Bảng phiên bỏ cột số lượng Khay/Phôi trùng với thông tin có sẵn trong Drawer, giảm min-width về 990px. Giữ font đọc được, không che overflow để làm giả kết quả. Chỉnh phân bổ cột bàn giao để bảng yêu cầu nhận nấm cũng không dư ngang trên laptop.
- Pagination dùng primaryStrong; màu chữ thực tế #15803d trên trắng đạt 5,02:1.
- Ant Design: Drawer width → size; Modal maskClosable → mask.closable; Alert message → title; InputNumber addonAfter → suffix. Giữ nguyên kích thước overlay và điều kiện đóng khi submit.

## Cấu trúc file chính

| Nhóm | File |
|---|---|
| Việt hóa | src/shared/i18n/notification-content.ts; status/user.ts; status/registry.ts; features/notifications/api/notification.api.ts; features/alerts/api/alert.api.ts |
| Nhân viên/ngày | features/users/hooks/useStaffNames.ts; features/devices/hooks/useConfigurators.ts; HarvestRequestManagementPage.tsx; AutoControlDetailModal.tsx |
| Token/layout | app/theme/tokens.ts; app/theme/theme.ts; App.css; styles/design-system.css; SessionListPage.tsx; rooms-industrial.css; LoginPage.tsx |
| Deprecated props | Các Drawer/Modal/Alert và form giống nấm/gói thuê đã nêu trong audit; shared UI tương ứng |
| Nghiệm thu | package.json thêm npm test; tests/display-mapping.test.mjs bổ sung regression và sửa resolver fixture cũ; shared/utils/date.ts thêm đuôi .js cho Day.js locale |
| Mẫu môi trường | .env.example; .env.production.sample; .gitignore cho phép commit hai file mẫu không chứa secret |

## Kết quả lệnh nghiệm thu

| Lệnh | Kết quả |
|---|---|
| npm test | **209/209 pass** |
| npx tsc --noEmit | Pass |
| npm run typecheck | Pass; kiểm tra thực sự tsconfig.app.json bên cạnh root tsconfig tham chiếu |
| npm run lint | Pass |
| npm run verify:tokens | 87 kiểm tra tương phản đạt; 120 biến CSS đồng bộ |
| npm run build | Pass vào **dist mặc định sau khi dọn sạch dist** |
| git diff --check | Pass |

dist cũ thuộc quyền tài khoản khác khiến thao tác dọn trong sandbox bị từ chối. Đã dùng quyền thực thi bổ sung cho đúng đường dẫn tuyệt đối D:/mcms-project/mcms-web-admin/dist, dọn sạch và build lại thành công; không đổi cấu hình outDir hoặc ACL.

## Playwright nghiệm thu

Sidebar mở **272px** ở cả hai viewport. Số đo clientWidth / scrollWidth:

| Bảng | 1920×1080 | 1366×768 |
|---|---|---|
| Phiên canh tác | **1496 / 1496** | **1034 / 1034** |
| Yêu cầu nhận nấm | **1498 / 1498** | **1036 / 1036** |

Không có cuộn ngang bảng hoặc toàn trang ở hai bảng chính. Chiều rộng khả dụng có thể giảm 15px khi scrollbar dọc xuất hiện; lượt đo laptop có scrollbar trước đó cũng đạt 1019 / 1019 cho bảng phiên và 1021 / 1021 cho yêu cầu nhận nấm.

Quét 15 trang trong menu: không có gradient computed đang hiển thị, không còn các mẫu enum/text tiếng Anh đã ghi nhận trong audit. Vai trò EXPERT hiện “Chuyên gia”. Kiểm tra cuối mở Modal giống nấm, chuyển Devices/Orders/Users/Settings/Alerts, mở Drawer phiên và tab IoT: **0 console warning/error, 0 pageerror**. Không gửi form lưu, xóa hoặc điều khiển thiết bị.

Mock ngày năm 0001/epoch và loại nhân viên khỏi danh mục: UI không hiện “Xong —”, chỉ gọi API chi tiết cho nhân viên thiếu và hiện tên thật. Đã gỡ mock trước khi kết thúc.

Các số đo trên chứng minh hai bảng quản lý chính theo yêu cầu. Không khẳng định tất cả bảng phụ của mọi tab đều không cuộn ngang: các bảng lịch sử nhiều cột vẫn có cuộn nội bộ theo thiết kế. Không dịch tên riêng và nội dung tự do do người dùng nhập.

## Bằng chứng

- [JSON số đo, Console và kiểm thử dữ liệu biên](ui-audit-phase2-verification.json).
- [Phiên canh tác — 1920×1080, sidebar mở](phase2-sessions-1920.png).
- [Phiên canh tác — 1366×768, sidebar mở](phase2-sessions-1366.png).
- [Yêu cầu nhận nấm — 1920×1080](phase2-harvest-requests-1920.png).
- [Yêu cầu nhận nấm — 1366×768](phase2-harvest-requests-1366.png).
- [Modal giống nấm](phase2-package-modal.png).
- [Tra tên nhân viên thiếu và chặn ngày mặc định](phase2-staff-date-edge.png).
