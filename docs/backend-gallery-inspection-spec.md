# Yêu cầu Backend — Thư viện ảnh & tiến độ kiểm tra khay

> **Ngày:** 2026-11-10 · **Người gửi:** Web Admin (FE)
> **Trạng thái:** FE đã triển khai **tạm** bằng 2 endpoint hiện có.
> Khi BE bổ sung các endpoint dưới đây, FE chỉ cần đổi 1 file adapter.

---

## 1. Bối cảnh nghiệp vụ

Vòng đời canh tác có **2 giai đoạn**, mỗi giai đoạn lưu ảnh ở **bảng riêng**:

| Giai đoạn | Bảng ảnh | Endpoint đọc hiện có |
|---|---|---|
| 1 — Nghỉ ủ phôi | `spawn_inspection_images` | `GET /api/farm/sessions/{id}/spawn-inspections` |
| 2 — Trồng trên khay | `cultivation_inspection_images` | `GET /api/cultivation-sessions/{id}/daily-inspections` |

Yêu cầu nghiệp vụ:

- **Màn Phiên canh tác**: thư viện ảnh **tổng hợp**, xuyên suốt từ lúc nhận phôi ủ tơ tới khi thu hoạch xong.
- **Màn Chi tiết khay**: chỉ ảnh kiểm tra phát sinh **từ lúc phôi được gán lên khay đó** tới lúc thu hoạch.

---

## 2. Endpoint đã có (FE đã dùng)

| # | Method | Đường dẫn | Ghi chú |
|---|---|---|---|
| 1 | GET | `/api/farm/sessions/{sessionId}/spawn-inspections` | Giai đoạn 1. Trả `images[]` với `image_id`, `image_url`, `caption`, `created_at` |
| 2 | GET | `/api/cultivation-sessions/{sessionId}/daily-inspections` | Giai đoạn 2, toàn phiên. Trả `inspections[]` + `images[]` (`imageId`, `imageUrl`, `caption`, `uploadedAt`) |
| 3 | GET | `/api/cultivation-sessions/{sessionId}/trays/{sessionTrayId}/daily-inspections` | Giai đoạn 2, 1 khay |

⚠ Lưu ý khoá: endpoint #3 dùng `session_tray_id`
(`cultivation_session_trays.session_tray_id`), **không** phải `tray_id` vật lý.

---

## 3. Endpoint BE cần bổ sung

### 3.1 `GET /api/cultivation-sessions/admin/{sessionId}/gallery` — ưu tiên cao

Thư viện ảnh tổng hợp 1 phiên, sắp xếp theo thời gian tăng dần.

**Response:**

```json
{
  "data": {
    "session_id": 9,
    "photos": [
      {
        "photo_id": "spawn:12:100",
        "url": "https://res.cloudinary.com/.../spawn-1.jpg",
        "caption": "Phôi ngày 1",
        "taken_at": "2026-11-01T08:00:00.000Z",
        "phase": "SPAWN",
        "inspection_id": 12,
        "session_tray_id": null,
        "tray_id": null,
        "tray_code": null
      },
      {
        "photo_id": "tray:45:200",
        "url": "https://res.cloudinary.com/.../tray-1.jpg",
        "caption": "Khay ngày 5",
        "taken_at": "2026-11-05T09:00:00.000Z",
        "phase": "TRAY",
        "inspection_id": 45,
        "session_tray_id": 31,
        "tray_id": 21,
        "tray_code": "F2-TRAY-01"
      }
    ],
    "stats": {
      "total": 2,
      "spawn_count": 1,
      "tray_count": 1,
      "inspection_count": 2
    }
  }
}
```

**Yêu cầu cụ thể:**

| Field | Ràng buộc |
|---|---|
| `photos[].phase` | `SPAWN` \| `TRAY` — cho FE lọc theo giai đoạn |
| `photos[].taken_at` | ISO-8601. **Không** được `null` — đây là trục thời gian của timeline |
| `photos[].photo_id` | Ổn định & unique — FE dùng làm React key |
| `photos[]` | Sắp xếp **tăng dần** theo `taken_at` (cũ → mới) |
| `stats` | FE đang tự tính; BE trả sẵn để 2 nơi không lệch |

**Query params (tuỳ chọn):**

| Param | Kiểu | Mặc định | Mô tả |
|---|---|---|---|
| `phase` | `SPAWN` \| `TRAY` | tất cả | Lọc theo giai đoạn |
| `sessionTrayId` | integer | tất cả | Chỉ ảnh của 1 khay trong phiên |

**Mã lỗi:** `401` (chưa đăng nhập) · `403` (không đúng role 1/2) · `404` (không tìm thấy phiên)

---

### 3.2 `GET /api/cultivation-trays/{trayId}/assignments` — ưu tiên cao

Tra cứu lần gán khay vật lý vào phiên. Hiện FE phải gọi
`GET /api/farm/sessions?trayId=…` rồi tự dò `session_tray_id` trong mảng
`trays[]` — **dễ vỡ** vì endpoint farm không bảo đảm trả khoá gán.

**Response:**

```json
{
  "data": {
    "tray_id": 21,
    "tray_code": "F2-TRAY-01",
    "assignments": [
      {
        "session_tray_id": 31,
        "session_id": 9,
        "status": "ACTIVE",
        "assigned_at": "2026-11-01T00:00:00.000Z",
        "released_at": null,
        "session": {
          "session_id": 9,
          "status": "CULTIVATING",
          "start_at": "2026-11-01T00:00:00.000Z",
          "expected_harvest_date": "2026-11-20T00:00:00.000Z",
          "customer_name": "Nguyễn Văn A",
          "mushroom_name": "Nấm hương"
        }
      }
    ]
  }
}
```

**Yêu cầu:** trả **mọi** lần gán (kể cả `RELEASED`) theo `assigned_at DESC` để
FE hiển thị lịch sử vụ thuê của khay.

---

### 3.3 `GET /api/cultivation-trays/{trayId}/progress` — ưu tiên trung bình

Tiến độ **theo khay**. Hiện `cultivation_progress` chỉ lưu theo **phiên** ⇒
BE không thể trả tiến độ riêng cho từng khay.

**Response:**

```json
{
  "data": {
    "tray_id": 21,
    "session_tray_id": 31,
    "session_id": 9,
    "progress_percent": 40,
    "growth_stage": "PINNING",
    "last_inspection_date": "2026-11-05T09:00:00.000Z",
    "inspection_count": 5
  }
}
```

**Ghi chú:** `growth_progress` đã có sẵn ở `cultivation_inspections` ⇒ BE có
thể lấy giá trị mới nhất thay vì tạo bảng progress mới.

---

### 3.4 `GET /api/cultivation-sessions/admin/session-trays/{sessionTrayId}/inspections` — ưu tiên trung bình

Hiện chỉ có `POST` cho endpoint này (`admin/session-trays/{id}/inspections`).
Thêm `GET` (read-only) cho phép Admin xem lịch sử kiểm tra **theo 1 lần gán
khay** mà không cần biết `sessionId`.

**Response:** giống #3 ở mục 3.1 nhưng thay `photos` bằng `inspections`
(đầy đủ field `cultivation_inspections`).

---

## 4. Bảng tổng hợp ưu tiên triển khai

| # | Endpoint | Ưu tiên | Lý do |
|---|---|---|---|
| 1 | `GET /cultivation-sessions/admin/{id}/gallery` | 🔴 Cao | FE đang gộp 2 endpoint + tự sort ⇒ nặng & dễ lệch thứ tự |
| 2 | `GET /cultivation-trays/{trayId}/assignments` | 🔴 Cao | Thiếu khoá `session_tray_id` ⇒ màn khay không gọi được endpoint #3 |
| 3 | `GET /cultivation-trays/{trayId}/progress` | 🟡 TB | Tiến độ theo khay là yêu cầu nghiệp vụ |
| 4 | `GET /cultivation-sessions/admin/session-trays/{id}/inspections` | 🟡 TB | Bổ sung cho endpoint `POST` đã có |

---

## 5. Hành vi FE hiện tại (để BE đối chiếu)

### 5.1 Màn Phiên canh tác — `SessionDetailDrawer`

| Tab | Nguồn | Endpoint |
|---|---|---|
| Kiểm tra phôi | Giai đoạn 1 | `GET /api/farm/sessions/{id}/spawn-inspections` |
| Kiểm tra khay | Giai đoạn 2 | `GET /api/cultivation-sessions/{id}/daily-inspections` |
| Thư viện ảnh | Giai đoạn 1 + 2 (FE gộp) | 2 endpoint trên |

### 5.2 Màn Chi tiết khay — `TrayDetailDrawer`

| Card | Nguồn | Endpoint |
|---|---|---|
| Lịch sử kiểm tra phôi | Giai đoạn 1 | `GET /api/farm/sessions/{id}/spawn-inspections` |
| Lịch sử kiểm tra trên khay | Giai đoạn 2 | `GET /api/cultivation-sessions/{id}/trays/{sessionTrayId}/daily-inspections` |

⚠ Card "Lịch sử kiểm tra trên khay" **chỉ hiển thị khi tra được
`session_tray_id`**. Nếu BE bổ sung endpoint #2, FE sẽ luôn hiển thị.

---

## 6. Bug BE / FE đã phát hiện trong quá trình tích hợp

| # | Vấn đề | Vị trí | Trạng thái |
|---|---|---|---|
| 1 | BE trả cột `inspected_at` (không có `checked_at`) ⇒ mọi lần kiểm tra phôi mất timestamp | `spawn_inspections` | ✅ FE đã fallback (`checked_at` → `inspected_at`) |
| 2 | BE trả cột `image_url` (không có `secure_url`) ⇒ ảnh có thể không hiển thị | `spawn_inspection_images` | ✅ FE đã fallback (`secure_url` → `image_url`) |
| 3 | `GET /api/farm/sessions` không trả `session_tray_id` ⇒ không tra được khoá gán khay | `cultivation_session_trays` | ⏳ Chờ endpoint #2 |

---

## 7. Checklist cho Backend

- [ ] Thêm route `GET /api/cultivation-sessions/admin/:sessionId/gallery` (roles 1, 2)
- [ ] Thêm route `GET /api/cultivation-trays/:trayId/assignments` (roles 1, 2)
- [ ] Thêm route `GET /api/cultivation-trays/:trayId/progress` (roles 1, 2)
- [ ] Thêm route `GET /api/cultivation-sessions/admin/session-trays/:sessionTrayId/inspections` (roles 1, 2)
- [ ] Cập nhật Swagger (`@openapi` JSDoc trong `cultivationSession.routes.js` + `cultivationTray.routes.js`)
- [ ] Regenerate `src/types/api-schema.d.ts` phía FE
