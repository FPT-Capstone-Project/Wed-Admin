# WF-06 — Sự cố & Tư vấn chuyên gia

**Phạm vi Web Admin: chỉ xem và giám sát.** Thao tác ghi của Operator/Expert bên dưới là hợp đồng Backend tham chiếu cho các ứng dụng khác. Web Admin không tạo, nhận/phân công, phản hồi, gửi tin/ảnh, ghi/duyệt treatment hoặc hoàn tất sự cố. Mục 7 mô tả triển khai hiện hành.

1. Vai trò & phân quyền:
   - Farm Operator (`role_id = 2`): tạo issue, upload issue media, yêu cầu chuyên gia, nhắn tin/gửi ảnh hội thoại, ghi treatment, upload treatment media.
   - Mushroom Expert (tên role chứa `expert`): xem danh sách/chi tiết consultation, xem thông tin phiên trồng (chỉ đọc), nhận consultation (`assign`), chẩn đoán/yêu cầu thêm thông tin (`respond`), nhắn tin/gửi ảnh (khi được phân công), duyệt treatment (`review`), xác nhận hoàn tất (`resolve`).
   - Customer (`role_id = 3`): chỉ xem danh sách, chi tiết và timeline issue thuộc phiên mình sở hữu; không được gửi tin nhắn hay thao tác xử lý.

2. State Machine:
   - Issue: `OPEN -> WAITING_EXPERT -> IN_PROGRESS -> WAITING_REVIEW -> MONITORING -> RESOLVED`.
     - Khi Expert `respond` với `needsMoreInfo: true`: Issue giữ `WAITING_EXPERT`, Consultation giữ `IN_PROGRESS`, `solution: null`.
     - Khi Expert `review` với `NEEDS_MORE_ACTION`: Issue từ `WAITING_REVIEW` quay về `IN_PROGRESS`.
     - Khi Expert `review` với `APPROVED`: Issue sang `MONITORING`, Consultation giữ `ANSWERED`.
     - Khi Expert `resolve` (chỉ hợp lệ khi `MONITORING`): Issue sang `RESOLVED`, Consultation sang `CLOSED`.
   - Consultation: `PENDING -> IN_PROGRESS -> ANSWERED -> CLOSED`.
   - Gửi tin nhắn/ảnh hội thoại KHÔNG làm thay đổi trạng thái Issue hay Consultation.

3. Cập nhật mới từ Backend (cần đặc biệt nhấn mạnh):
   - **Xem thông tin phiên trồng (Read-only cho Expert):**
     - Dùng `GET /api/issues/{issueId}` (mở/đóng không đổi trạng thái tư vấn hay phiên trồng).
     - Các trường Backend bổ sung: `session_status`, `session_start_at`, `expected_harvest_date`, `growth_stage`, `growth_progress`, `growth_condition`, `growth_updated_at`, `tray_code`, `floor_id`, `tray_condition`, `mushroom_condition`, `inspection_notes`, `inspection_at`, `spawn_condition`.
     - Quy tắc hiển thị: giai đoạn hiện tại lấy từ bản ghi tiến độ mới nhất; giai đoạn lúc báo sự cố và ảnh chụp dữ liệu môi trường chỉ hiển thị nếu thực sự có dữ liệu đã lưu; trường thiếu dữ liệu hiển thị `"Chưa ghi nhận"`.
   - **Hội thoại hai chiều & ảnh (`Trao đổi trong yêu cầu`):**
     - Backend lưu hội thoại có cấu trúc trong cột `expert_consultations.question`, trả về câu hỏi gốc và danh sách `messages[]` (có `messages[].media_url` khi có ảnh). Tương thích ngược với tin cũ; phản hồi chuyên môn mới lưu thành tin riêng, không bị ghi đè mất.
     - Endpoint gửi tin: `POST /api/consultations/{id}/messages` nhận JSON `{ "message": "..." }` HOẶC `multipart/form-data` gồm `message` (tùy chọn) và `file` (ảnh, tối đa 25 MB; hỗ trợ gửi chỉ ảnh không có chữ).
     - Cả Farm Operator và Expert được phân công đều gửi được nhiều lượt tin & ảnh ở mọi trạng thái còn mở (kể cả sau khi `ANSWERED`, khi `WAITING_REVIEW` và `MONITORING` — không còn bị giới hạn ở `WAITING_EXPERT`). Ảnh tin nhắn độc lập với ảnh issue/treatment.
     - Yêu cầu UX: hiển thị người gửi, thời gian, bấm xem ảnh phóng lớn; auto-refresh mỗi 5 giây khi trang đang hoạt động + nút tải lại thủ công.
     - Sau khi hoàn tất (`RESOLVED`/`CLOSED`): hội thoại chuyển chỉ đọc (gọi gửi tin trả `409`). Expert chưa được phân công hoặc Customer gửi tin trả `403`.
   - **Luồng đính kèm ảnh khi Operator tạo yêu cầu chuyên gia:**
     - Ảnh được tải lên trước khi gửi yêu cầu; nếu lỗi vẫn cho phép tiếp tục với yêu cầu đã lưu.
   - **Notification cho Expert khi tạo consultation:**
     - `notification_type: "MUSHROOM_DISEASE"`, `reference_type: "EXPERT_CONSULTATION"`, `reference_id: <CONSULTATION_ID>`.

4. Hợp đồng API đầy đủ:
   - `POST /api/issues` (`spawnInspectionId`, `issueType`, `title`, `description`, `severity`) -> `201`, `OPEN`.
   - `GET /api/issues/{issueId}` -> chi tiết issue + thông tin phiên trồng bổ sung.
   - `POST /api/issues/{issueId}/media` (multipart: `file` chỉ JPG/PNG, `caption?`; yêu cầu issue có linked inspection; lỗi `400` nếu gửi video/thiếu file; `409` nếu issue đang `MONITORING`/`RESOLVED`).
   - `POST /api/issues/{issueId}/consultations` (`question`) -> `201`, Cons `PENDING`, Issue `WAITING_EXPERT` (`409` nếu issue không `OPEN`).
   - `GET /api/consultations?status=&page=1&pageSize=20` và `GET /api/consultations/{id}`.
   - `PATCH /api/consultations/{id}/assign` (không body) -> `200`, `IN_PROGRESS` (`409` nếu Expert khác đã nhận).
   - `PATCH /api/consultations/{id}/respond` (`diagnosis`, `solution?`, `needsMoreInfo`).
   - `POST /api/consultations/{id}/messages`.
   - `POST /api/consultations/{id}/treatments` (`actionDescription`, `resultDescription?`) -> `201`, Issue `WAITING_REVIEW` (`409` nếu tạo treatment thứ 2 trước khi lượt hiện tại được review).
   - `POST /api/treatments/{treatmentId}/media` (multipart: `file` ảnh/video, `mediaStage`: `BEFORE`|`DURING`|`AFTER`, `caption?`). Xóa treatment media khi issue đã khóa trả `409`.
   - `POST /api/treatments/{treatmentId}/review` (`reviewResult`: `NEEDS_MORE_ACTION`|`APPROVED`, `reviewComment?`; `409` nếu đã review).
   - `PATCH /api/issues/{issueId}/resolve` (`reviewComment?`) -> `RESOLVED` + Cons `CLOSED` (`409` nếu issue chưa `MONITORING`).
   - Customer read-only: `GET /api/customer/sessions/{sessionId}/issues`, `GET /api/customer/issues/{issueId}`, `GET /api/customer/issues/{issueId}/timeline`.

## 5. Mã lỗi và checklist QA

| Mã | Trường hợp | Xử lý UI |
|---|---|---|
| `400` | Payload không hợp lệ, thiếu file hoặc video issue media | Thông báo tiếng Việt và hướng dẫn sửa dữ liệu/file. |
| `403` | Thiếu quyền, Customer gửi tin hoặc Expert chưa phân công | Thông báo không có quyền thao tác. |
| `404` | Không tìm thấy tài nguyên | Hiển thị không tìm thấy và cho phép quay lại danh sách. |
| `409` | State xung đột, đã khóa, đã nhận hoặc review | Thông báo thân thiện và tự động refetch dữ liệu mới nhất. |

- [ ] Operator tạo issue OPEN, upload ảnh với linked inspection; video/thiếu file trả 400; trạng thái khóa trả 409.
- [ ] Tạo consultation PENDING và Issue WAITING_EXPERT; lỗi upload vẫn cho phép tiếp tục; notification tham chiếu consultation ID.
- [ ] Assign không body; tranh nhận consultation trả 409.
- [ ] needsMoreInfo giữ WAITING_EXPERT/IN_PROGRESS, solution null; phản hồi có giải pháp chuyển ANSWERED/IN_PROGRESS.
- [ ] Treatment chuyển WAITING_REVIEW; tạo treatment thứ hai trước review và review trùng trả 409.
- [ ] NEEDS_MORE_ACTION quay về IN_PROGRESS; APPROVED sang MONITORING, consultation giữ ANSWERED.
- [ ] Resolve chỉ ở MONITORING, chuyển RESOLVED/CLOSED; xóa media khi khóa trả 409.
- [ ] Phiên trồng chỉ đọc, mở/đóng không đổi state; field thiếu hiển thị Chưa ghi nhận; không dựng snapshot lịch sử từ dữ liệu hiện tại.
- [ ] Chat ít nhất 3 lượt mỗi bên; gửi chỉ ảnh; kiểm tra giới hạn 25 MB, người gửi/thời gian và ảnh phóng lớn.
- [ ] Gửi sau ANSWERED, tại WAITING_REVIEW và MONITORING; không đổi state; không mất phản hồi cũ; tương thích câu hỏi cũ.
- [ ] Polling 5 giây khi trang hoạt động và tải lại thủ công.
- [ ] Sau hoàn tất gửi trả 409; Expert chưa phân công và Customer gửi trả 403.
- [ ] Customer chỉ xem list/detail/timeline thuộc phiên sở hữu, không thao tác xử lý.
- [ ] Không hiển thị API path/nguồn API; mọi 409 thông báo thân thiện và refetch.

## 6. Quy ước triển khai Frontend
   - Không bao giờ hiển thị đường dẫn API hay tên nguồn API lên giao diện người dùng.
   - Khi nhận `409`, hiển thị thông báo tiếng Việt thân thiện và tự động refetch lại dữ liệu mới nhất.

## 7. Phạm vi triển khai Web Admin — chỉ xem và giám sát

Phạm vi hiện hành: Admin không phải Operator/Expert. Toàn bộ WF-06 trên Web Admin chỉ đọc; các endpoint ghi ở mục 4 là tham chiếu nghiệp vụ Backend cho ứng dụng khác, không phải danh sách việc cần triển khai cho Admin. Route giữ ADMIN_ONLY.

### Đã triển khai

- Danh sách sự cố có bộ lọc đủ 6 trạng thái và nút xem hồ sơ.
- Drawer có ba tab: Thông tin sự cố, Xem thông tin phiên trồng và Tư vấn & Xử lý. Giữ 14 trường phiên/kiểm tra nguồn, dữ liệu mới nhất, snapshot đã lưu và fallback Chưa ghi nhận.
- Tự tìm consultation từ consultation_id/consultation_ids/consultations của issue. Một phiếu hiển thị trực tiếp; từ hai phiếu mới dùng dropdown; không có input mã tư vấn. Không có phiếu thì hiển thị trạng thái trống.
- Nếu thiếu liên kết, dò danh sách tối đa 5 trang × 20 bản ghi; báo kết quả có thể thiếu khi chạm giới hạn. Backend cần trả liên kết hoặc hỗ trợ lọc issueId để bảo đảm đầy đủ.
- Một nút Tải lại nhỏ ở header drawer: refetch đồng thời issue và các query đang mở; đánh dấu dữ liệu ẩn là stale để tải lại khi xem, không tải đồng loạt treatment.
- Hội thoại chỉ xem toàn bộ tin/ảnh và phản hồi chuyên môn theo thời gian. Ẩn khung Câu hỏi ban đầu nếu tin đầu tiên trùng question sau trim.
- Tên chuyên gia ưu tiên expert_name/expertName, expert.full_name/fullName, expert.username, expert.name. Khi chỉ có expert_id/expertId hoặc expert.user_id/userId/id, dùng hook tra cứu tài khoản hiện có; không suy đoán chuyên gia từ người gửi tin. Nếu thiếu quyền hoặc dữ liệu tài khoản đã xóa, hiển thị thông báo thiếu thông tin, không hiện ID kỹ thuật.
- Treatment chỉ đọc, sắp xếp theo thời gian, giữ media BEFORE/DURING/AFTER và lịch sử review.
- Polling 5 giây cho các khối đang xem, dừng khi đóng drawer, ẩn trang/tab hoặc Issue RESOLVED/Consultation CLOSED theo từng query.
- Đã gỡ form/nút nhờ chuyên gia, assign, respond, chat/upload, treatment/upload, review, resolve; xóa IssueActionForm.tsx và toàn bộ service/mutation ghi. Chỉ giữ GET.
- Không hiển thị API path, nguồn dữ liệu hoặc enum tiếng Anh trên UI.

### Schema và giới hạn xác minh

GET issue/consultation/treatment trong Swagger vẫn thiếu response DTO (content never). Parser hỗ trợ wrapper data/trực tiếp và snake_case/camelCase, câu hỏi cũ và messages, các dạng review. Chưa thể khẳng định field thực tế trên môi trường triển khai nếu không có response thật; cần kiểm thử tài khoản Admin với quyền đọc và tra cứu chuyên gia.

### Checklist nghiệm thu Admin

- [ ] Không có form/input/upload hay nút xử lý nghiệp vụ ở mọi trạng thái.
- [ ] Không có ô Mã tư vấn; 0/1/nhiều phiếu có UI tương ứng.
- [ ] Header chỉ có một nút Tải lại; dữ liệu đang xem được cập nhật cùng nhau.
- [ ] Câu hỏi đầu không lặp khi trùng tin đầu; câu hỏi cũ không có messages vẫn hiện.
- [ ] Tên chuyên gia đọc đúng các field hỗ trợ hoặc tra cứu bằng ID, kể cả phiếu CLOSED.
- [ ] Giữ ảnh phóng lớn, treatment/media/review và các nhãn tiếng Việt.
- [ ] Polling chỉ cho phần đang mở, dừng khi ẩn tab/đóng drawer/hoàn tất.

### Kiểm tra tự động

tests/wf06.test.mjs kiểm tra parsing dữ liệu cũ/mới, khử trùng câu hỏi, các field chuyên gia, media/review, GET read-only và giới hạn dò consultation. Không còn test ghi hoặc import form đã xóa.

Đã thử trình duyệt bằng API giả lập: 0/1/2 phiếu, tên chuyên gia nested và tra cứu ID cho phiếu CLOSED, câu hỏi trùng/khác tin đầu, không có form ghi và nút tải lại duy nhất refetch các GET đang xem. Không thay thế kiểm thử với response Backend thật.

Lỗi TypeScript ngoài WF-06 do enum Khiếu nại đổi được sửa tương thích trong complaint-status.ts và KPI complaint.api.ts, kèm tests/complaints.test.mjs.

Tham chiếu lịch sử: docs/admin-control-tower-implementation.md mô tả thiết kế cũ có phân công/duyệt. Phạm vi Admin chỉ đọc ở tài liệu này thay thế mô tả đó cho WF-06.


