# Kết quả Đợt 1 — 16/11/2026

Đã triển khai nhóm 1, 2, 3 của audit; chưa triển khai Đợt 2.

## Thay đổi

- API danh sách và chi tiết admin trả bản ghi chính sau chuẩn hóa, không gọi withFarmGrowth. API session dùng chung cũng bỏ bước kéo lịch sử cho từng phiên. Danh sách không còn phụ thuộc sự thành công của API lịch sử/tiến độ.
- Drawer chỉ query chi tiết khi có sessionId được chọn. Thông tin farm là query phụ độc lập; lỗi query này không chặn nội dung chính. Lịch sử kiểm tra phôi chỉ tải ở tab tương ứng và có cảnh báo lỗi riêng; kiểm tra khay/thư viện ảnh giữ cơ chế lazy hiện có.
- resolveSessionPhase ưu tiên COMPLETED trước stage. Bảng và Drawer cùng hiển thị “Hoàn thành”, giữ nguyên tỷ lệ Farm OP ghi nhận, không tự nâng thành 100%.
- Query IoT chỉ dùng đầu vào của request trong cache key: session, range/anchor hoặc limit. Bản ghi được cache trước khi lọc tầng. Việc cập nhật nhãn/map tầng chạy qua select để không refetch URL không đổi.
- LoadErrorAlert dùng resource do nơi gọi cung cấp; bỏ heuristic gán mọi lỗi /farm/sessions thành “danh sách phiên canh tác”, để lỗi panel được diễn đạt đúng phạm vi.

## Cấu trúc file đã sửa

| File | Trách nhiệm |
|---|---|
| src/features/sessions/api/admin-session.api.ts | Bỏ history fan-out khỏi danh sách/chi tiết |
| src/features/sessions/api/session.api.ts | Bỏ bước tổng hợp lịch sử ngầm ở API dùng chung |
| src/features/sessions/hooks/useAdminCultivationSessions.ts | Bảo vệ enabled của query chi tiết |
| src/features/sessions/components/SessionDetailDrawer.tsx | Query theo lựa chọn, lỗi phụ độc lập và lazy inspection tab |
| src/features/sessions/hooks/useSessionEnvironmentHistory.ts | Cache dữ liệu mạng, lọc/gắn nhãn bằng select |
| src/features/sessions/utils/session-state.utils.ts | Ưu tiên lifecycle Hoàn thành |
| src/features/sessions/utils/farm-growth.utils.ts | Giữ kiểu snapshot sinh học riêng với trạng thái kết thúc |
| src/shared/ui/LoadErrorAlert.tsx | Báo lỗi đúng tài nguyên |
| tests/session-state.test.mjs | Regression cho lifecycle và % ghi nhận |
| tests/session-query-isolation.test.mjs | API không fan-out; metadata reselect không refetch |

## Playwright với dữ liệu thật

Đã mở lại http://localhost:5173/sessions bằng trình duyệt thực tế ở 1920×1080, dữ liệu 13 phiên.

| Luồng | Trước | Sau |
|---|---|---|
| Tải trang Phiên canh tác | 41 GET API, gồm 39 history/progress | **2 GET API**: danh sách + số thông báo |
| Mở Drawer Tổng quan | 5 GET: 2 chi tiết + 3 lịch sử/tiến độ | **2 GET chi tiết**; 0 inspection/progress/environment-history |
| Mở tab IoT | Mỗi URL môi trường bị gọi 2 lần | **Mỗi URL 1 lần** |
| Quay lại tab IoT ngay trong thời gian cache | — | **0 GET environment-history bổ sung** |

Hai URL môi trường có mục đích khác nhau: một lấy lô mới nhất cho bảng/chỉ số, một có from/to cho biểu đồ. Trong lượt đo mới, mỗi URL cần một trang. Tab IoT có thêm một GET danh mục tầng và một GET cấu hình auto-control; không tính chúng là request lịch sử môi trường trùng.

Con số trên áp dụng dữ liệu hiện có và lần tải mới. Tập dữ liệu lớn hơn có thể cần phân trang; sau staleTime hoặc khi người dùng chủ động tải lại vẫn được phép refetch.

Phiên #20 ở bảng hiện “Hoàn thành · 20%”; Drawer cùng phiên hiện “Hoàn thành · 20%” và “Đã thu hoạch”. Không thay đổi dữ liệu tiến độ trên backend.

## Regression và lỗi phụ

- Unit/API tests: **50/50 pass** trong 4 file session-state, session-environment-history, session-device-climate-floor-anchor và session-query-isolation.
- Test QueryObserver xác nhận metadata tầng thay đổi làm kết quả lọc cập nhật nhưng không gọi lại queryFn. Query sessionId rỗng và tab disabled không được kích hoạt.
- Playwright giả lập HTTP 403 tại farm detail và spawn-inspections: bảng vẫn đủ **13 dòng**, Drawer giữ nội dung chính. Lỗi hiện riêng “thông tin bổ sung của phiên” và “lịch sử kiểm tra phôi”.
- TypeScript typecheck: pass. ESLint: pass. git diff --check: pass.
- Production build: pass khi dùng thư mục đầu ra tạm D:/mcms-project/phase1-build-output; đã dọn thư mục tạm sau kiểm tra. Build vào dist mặc định bị EPERM khi Vite dọn dist/assets; .preview cũng không ghi được. Không thay đổi quyền hoặc cấu hình build của dự án để xử lý vấn đề môi trường này.
- Không ghi nhận pageerror trong lượt Playwright. HTTP 403 và cảnh báo Alert deprecated ở kịch bản lỗi là dữ liệu kiểm thử/nhóm cleanup chưa thuộc Đợt 1.

## Bằng chứng

- [Network và kết quả xác minh](ui-audit-phase1-verification.json).
- [Drawer phiên Hoàn thành](phase1-completed-drawer.png).
- [Tab IoT](phase1-session-iot.png).
- [API phụ lỗi, bảng vẫn giữ dữ liệu](phase1-secondary-error.png).

Giới hạn: không sửa mâu thuẫn giữa readiness flag và giai đoạn của các phiên đang chạy, không tự cập nhật dữ liệu Farm OP, chưa triển khai token/layout/ngôn ngữ thuộc Đợt 2. Summary stage/progress trên bảng lấy từ API danh sách chính; không còn tổng hợp từ lịch sử ngầm.
