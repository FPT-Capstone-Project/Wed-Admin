# Báo Cáo Tổng Hợp — Tích Hợp API & Giao Diện

> **Dự án:** `mcms-web-admin` — IoT / Telemetry monitoring admin dashboard
> **Cập nhật:** 2026-10-22
> **Công nghệ:** React · TypeScript · Ant Design 5 · Tailwind · Recharts · Vite · React Query · Zustand

---

## Tóm tắt nhanh

| Hạng mục | Kết quả |
|---|---|
| API tổng trong phạm vi rà soát | **40 endpoint** |
| Đã gắn & có UI | **30** |
| Có code nhưng chưa dùng / không UI | **3** |
| Chỉ dành thao tác thủ công (không bắt buộc) | **2** |
| Chưa gọi | **5** |
| Màn hình (pages) | 17 |
| Component UI | 71 |
| Route đã đăng ký | 19 |

> **Ghi chú về báo cáo cũ:** `FINAL-INTEGRATION-REPORT.md` và `FRONTEND-AUDIT-REPORT.md` chứa một số thông tin **không còn chính xác** (vd: khai `/api/trays` thay vì `/api/cultivation-trays`, khai hook `useUserList`/`useCreateUser` không tồn tại). Báo cáo này đã đối chiếu trực tiếp mã nguồn.

---

# PHẦN 1 — DANH SÁCH API VÀ CHỨC NĂNG ĐÃ TÍCH HỢP

## 1.1 Cultivation Rooms & Trays

**Tệp API:** `src/features/rooms/api/cultivation-room.api.ts`, `cultivation-tray.api.ts`
**Hook:** `src/features/rooms/hooks/useCultivation.ts`

| # | Method | Endpoint | Trạng thái | Hàm gọi | Hook |
|---|---|---|---|---|---|
| 1 | GET | `/api/cultivation-rooms` | ✅ | `cultivationRoomApi.list` | `useCultivationRooms` |
| 2 | POST | `/api/cultivation-rooms` | ✅ | `cultivationRoomApi.create` | `useCreateCultivationRoom` |
| 3 | GET | `/api/cultivation-rooms/{id}` | ✅ | `cultivationRoomApi.getById` | `useCultivationRoom` |
| 4 | PUT | `/api/cultivation-rooms/{id}` | ✅ | `cultivationRoomApi.update` | `useUpdateCultivationRoom` |
| 5 | DELETE | `/api/cultivation-rooms/{id}` | ✅ | `cultivationRoomApi.remove` | `useDeleteCultivationRoom` |
| 6 | GET | `/api/cultivation-trays` | ✅ | `cultivationTrayApi.list` | `useCultivationTrays`, `useAvailableTrays`, `useAllUiTrays` |
| 7 | POST | `/api/cultivation-trays` | ✅ | `cultivationTrayApi.create` | `useCreateCultivationTray` |
| 8 | GET | `/api/cultivation-trays/{id}` | ✅ | `cultivationTrayApi.getById` | `useCultivationTray` |
| 9 | PUT | `/api/cultivation-trays/{id}` | ✅ | `cultivationTrayApi.update` | `useUpdateCultivationTray` |
| 10 | DELETE | `/api/cultivation-trays/{id}` | ✅ | `cultivationTrayApi.remove` | `useDeleteCultivationTray` |
| 11 | GET | `/api/cultivation-rooms/{id}/trays` | ❌ | — | — |

**Kết quả: 10/11.** Thiếu `#11` — chưa có lời gọi trực tiếp, nhưng UI vẫn dựng được danh sách khay theo phòng qua `useAllUiTrays()` (`useCultivation.ts:142`) rồi lọc phía client.

---

## 1.2 Rentals — Admin

**Tệp API:** `src/features/rentals/api/rental.api.ts`
**Hook:** `src/features/rentals/hooks/useRentals.ts`
**Types:** `src/features/rentals/types/rental.types.ts`

| # | Method | Endpoint | Trạng thái | Hàm gọi | Hook |
|---|---|---|---|---|---|
| 12 | GET | `/api/rentals/admin` | ✅ | `rentalApi.list` | `useRentals` |
| 13 | POST | `/api/rentals/admin/from-order` | ✅ | `rentalApi.createFromOrder` | `useCreateRentalFromOrder` |
| 14 | POST | `/api/rentals/admin/{rentalId}/cultivation-session` | ✅ | `rentalApi.startCultivationSession` | `useStartCultivationSession` |
| 15 | POST | `/api/rentals/admin/{rentalId}/progress` | ✅ | `rentalApi.recordProgress` | `useRecordRentalProgress` |
| 16 | POST | `/api/rentals/admin/{rentalId}/harvests` | ✅ | `rentalApi.recordHarvest` | `useRecordRentalHarvest` |
| 17 | POST | `/api/rentals/admin/{rentalId}/complete` | ✅ | `rentalApi.complete` | `useCompleteRental` |
| 18 | POST | `/api/rentals/admin/{rentalId}/cancel` | ✅ | `rentalApi.cancel` | `useCancelRental` |
| 19 | GET | `/api/rentals/admin/{rentalId}` | ✅ | `rentalApi.getById` | `useRental` |
| 20 | PATCH | `/api/rentals/admin/{rentalId}` | ✅ | `rentalApi.update` | `useUpdateRental` |

**Kết quả: 9/9 — hoàn thành.**

**Phân quyền (đã đối chiếu Swagger + kiểm chứng thực tế):**

| Endpoint | Admin (role_id 1) | Farm Operator (role_id 2) |
|---|---|---|
| 8/9 endpoint trừ `/cancel` | ✅ | ✅ |
| `POST /cancel` | ✅ | ❌ **403** |
| Toàn bộ route `/rentals` | ✅ | ✅ |
| Route `/rentals` với Customer | ❌ | ❌ (chặn bởi `RoleGuard`) |

> ⚠ `/cancel` chỉ cho Admin — UI chặn 2 tầng: ẩn nút trong `RentalDetailDrawer.tsx:64` (điều kiện `canCancel`) và không render `CancelRentalModal` tại dòng 215. Operator thấy dòng thông báo *"Huỷ vụ thuê chỉ dành cho Quản trị viên"*.

**Đặc biệt — shape response `GET /api/rentals/admin`:**

```json
{ "data": [...], "pagination": { "page": 1, "pageSize": 20, "total": 4, "totalPages": 1 } }
```

`pagination` nằm **ngoài** `data` → API service xử lý riêng, trả về `RentalListResult { items, pagination }` (không dùng `ensureArray` mù quáng).

---

## 1.3 IoT Telemetry & SSR

**Tệp API:** `src/features/devices/api/iot.api.ts`
**Hook:** `src/features/devices/hooks/useIoT.ts`

| # | Method | Endpoint | Trạng thái | Hook | Ghi chú |
|---|---|---|---|---|---|
| 21 | GET | `/api/iot/masters` | ✅ | `useMasterList` | — |
| 22 | GET | `/api/iot/masters/{masterId}/sensors` | ✅ | `useMasterSensors` | — |
| 23 | GET | `/api/iot/masters/{masterId}/nodes/{nodeId}/sensors/{sensorId}` | ⚠️ | — | Hàm `iotApi.getSensor` đã viết tại `iot.api.ts:34` nhưng **không có hook nào gọi** |
| 24 | GET | `.../sensors/{sensorId}/history` | ✅ | `useSensorHistory` | Dùng bởi `TrayIoTHistoryApiView.tsx` |
| 25 | GET | `/api/iot/masters/{masterId}/ssr` | ✅ | `useSsrStatus`, `useSsrChannels` | — |
| 26 | POST | `/api/iot/masters/{masterId}/ssr/{channel}/commands` | ➖ | `useSsrCommand` | **Thủ công** — không bắt buộc cho Admin |
| 27 | GET | `/api/iot/commands/{commandId}` | ➖ | `useCommandStatus` | **Thủ công** — chỉ poll kết quả lệnh #26 |
| 28 | PUT | `/api/iot/masters/{masterId}/light` | ❌ | — | **Chưa có ở đâu cả** |

**Kết quả: 5/8 đầy đủ · 2 thủ công (đã có code, không bắt buộc) · 2 thiếu.**

---

## 1.4 Automatic Misting (Phun sương tự động)

**Tệp API + Hook:** `iot.api.ts` → `useIoT.ts` (cùng file, khối `autoMistingApi`)

| # | Method | Endpoint | Trạng thái | Hook |
|---|---|---|---|---|
| 29 | GET | `/api/iot/floors` | ✅ | `useFloorList` |
| 30 | POST | `/api/iot/floors` | ✅ | `useCreateFloor` |
| 31 | PUT | `/api/iot/floors/{floorId}` | ✅ | `useUpdateFloor` |
| 32 | PUT | `/api/iot/floors/{floorId}/trays/{trayId}` | ✅ | `useAssignFloorToTray` |
| 33 | GET | `/api/iot/floors/{floorId}/environment` | ✅ | `useFloorEnvironment` |
| 34 | GET | `/api/iot/floors/{floorId}/auto-control` | ✅ | `useFloorConfig` |
| 35 | PUT | `/api/iot/floors/{floorId}/auto-control` | ✅ | `useSaveAutoControlConfig` |
| 36 | GET | `/api/iot/floors/{floorId}/auto-control/suggestions` | ❌ | — |
| 37 | POST | `/api/iot/floors/{floorId}/auto-control/start` | ✅ | `useStartAutoMisting` |
| 38 | POST | `/api/iot/floors/{floorId}/auto-control/stop` | ✅ | `useStopAutoMisting` |
| 39 | GET | `/api/iot/floors/{floorId}/auto-control/status` | ✅ | `useFloorAutoControlStatus` |
| 40 | GET | `/api/iot/floors/{floorId}/auto-control/logs` | ✅ | `useFloorAutoControlLogs` |
| 41 | POST | `/api/iot/floors/{floorId}/auto-control/evaluate` | ✅ | `useEvaluateAutoMisting` |

**Kết quả: 11/12.** Thiếu `#36` (suggestions).

---

## 1.5 Các nhóm khác (ngoài phạm vi rà soát ban đầu)

Liệt kê để audit đầy đủ:

| Nhóm | Endpoint | Trạng thái | Tệp |
|---|---|---|---|
| **Auth** | `POST /api/auth/login` · `GET /api/users/me` · `POST /api/auth/forgot-password` · `POST /api/auth/request-change-password-otp` · `PUT /api/auth/change-password` | ✅ | `features/auth/api/auth.api.ts` |
| **Orders** | `GET /api/orders` · `GET /api/orders/{id}` | ✅ (read-only) | `features/orders/api/order.api.ts` |
| **Payments** | `GET /api/orders/{orderId}/payment...` | ✅ | `features/orders/api/payment.api.ts` |
| **Packages** | CRUD `/api/rental-packages` | ✅ | `features/packages/api/rental-package.api.ts` |
| **Mushroom types** | CRUD `/api/mushroom-types` | ✅ | `features/packages/api/mushroom-type.api.ts` |
| **Mushroom conditions** | CRUD `/api/mushroom-conditions` | ✅ | `features/packages/api/mushroom-condition.api.ts` |
| **Users** | — | ⚠️ **Mock** | `stores/user.store.ts` (zustand, không gọi API) |

> ⚠ **Phát hiện khi audit:** `UserManagementPage.tsx` dùng `useUserStore` (zustand với `MOCK_USERS` cố định), **không có** `useUserList`/`useCreateUser`/`useDeleteUser` như báo cáo cũ khai. Trang quản lý tài khoản hiện là dữ liệu giả, chưa nối BE.

> ℹ️ `order.api.ts` cố ý **không export mutation** (`POST /api/orders/rentals`, `PATCH /api/orders/{id}/cancel`, `POST /api/payments/orders/{id}/payos`) — các luồng này do app người dùng thực hiện, admin chỉ đọc để theo dõi vận hành.

---

# PHẦN 2 — MÀN HÌNH & COMPONENT UI

## 2.1 Pages (17)

### `src/features/` (7)

| Trang | Đường dẫn | Mô tả |
|---|---|---|
| `auth/pages/LoginPage.tsx` | `/login` | Đăng nhập |
| `auth/pages/ForgotPasswordPage.tsx` | `/forgot-password` | Quên mật khẩu |
| `auth/pages/ChangePasswordPage.tsx` | `/change-password` | Đổi mật khẩu (OTP) |
| `dashboard/pages/DashboardPage.tsx` | `/` | Tổng quan |
| `rooms/pages/RoomListPage.tsx` | `/rooms`, `/rooms/:id` | Kệ nấm + drawer chi tiết khay |
| `tenants/pages/TenantListPage.tsx` | `/customers` | Quản lý khách thuê |
| **`rentals/pages/RentalListPage.tsx`** | **`/rentals`** | **Quản lý vụ thuê (mới)** |

### `src/pages/` (10)

| Trang | Đường dẫn | Mô tả |
|---|---|---|
| `devices/DeviceManagementPage.tsx` | `/devices` | Thiết bị IoT + phun sương tự động |
| `devices/IoTHistoryPage.tsx` | `/devices/history` | Lịch sử cảm biến |
| `orders/OrderManagementPage.tsx` | `/orders` | Đơn đặt từ app |
| `packages/PackageManagementPage.tsx` | `/packages` | Gói cước thuê |
| `cultivation/CultivationManagementPage.tsx` | `/cultivation` | Sinh trưởng & thu hoạch |
| `alerts/AlertManagementPage.tsx` | `/alerts` | Cảnh báo vi khí hậu |
| `reports/ReportsAnalyticsPage.tsx` | `/reports` | Báo cáo & phân tích |
| `users/UserManagementPage.tsx` | `/users` | Tài khoản (**mock**) |
| `camera/CameraOverviewPage.tsx` | `/camera` | Camera toàn cảnh |
| `settings/SettingsPage.tsx` | `/settings` | Hồ sơ vi khí hậu |

---

## 2.2 Component Rentals (mới — 9 tệp)

### Drawer

| Tệp | Vai trò |
|---|---|
| `features/rentals/components/RentalDetailDrawer.tsx` | Drawer chi tiết + điều phối 5 modal + phân quyền |

### Modal (5)

| Tệp | Endpoint | Validate chính |
|---|---|---|
| `components/StartSessionModal.tsx` | `POST /cultivation-session` | Chọn khay AVAILABLE |
| `components/RecordProgressModal.tsx` | `POST /progress` | Select giai đoạn + Slider `min=currentPercent` (chặn lùi tiến độ) |
| `components/RecordHarvestModal.tsx` | `POST /harvests` | `quantity min 0.01`, `unit max 20`, chặn ngày tương lai |
| `components/CompleteRentalModal.tsx` | `POST /complete` | `note max 1000` |
| `components/CancelRentalModal.tsx` | `POST /cancel` | `reason min 3 / max 500` ⚠ chỉ Admin |

### Tag / Config

| Tệp | Vai trò |
|---|---|
| `components/rental-status.config.ts` | Nhãn + màu 5 `RentalStatus`, 5 `CultivationStage`, `PaymentStatus` |
| `components/RentalStatusTag.tsx` | Component `<Tag>` tái sử dụng |

---

## 2.3 Component hiện có (khác)

### Rooms — 10 tệp (`src/features/rooms/components/`)

`RackView` · `TrayDetailDrawer` · `TrayStatusTag` · `tray-status.config` · `RoomsTraysAdminPanel` · `RoomFormModal` · `TrayFormModal` · `TrayAdminActions` · `TrayClosureReasonModal` · `TrayInvoiceModal` · `TrayStaffActionWorkflow` · `RentalLifecycleSection` · `RentalCostSection`

### Devices — 14 tệp (`src/pages/devices/components/`)

`AutoMistingControlPanel` · `FloorClimateConfigModal` · `DeviceControlPanel` · `DeviceMetricsGrid` · `IoTTelemetryChart` · `LongTermTrendChart` · `TrayIoTHistoryApiView` · `TrayIoTHistoryView` · `RentalSessionSummary` · `RentalHistoryTable` · `OrderLifecycleLog` · `OrderStatusLogTable`

### Packages — 9 tệp · Cultivation — 8 tệp · Reports — 8 tệp

`PackageManagementPage` / `CultivationManagementPage` / `ReportsAnalyticsPage` với các component con tương ứng.

### Auth — 5 tệp · Dashboard — 5 tệp · Tenants — 3 tệp · Users — 2 tệp · Alerts — 1 tệp · Settings — 2 tệp

---

## 2.4 Route đã đăng ký (19) — `src/app/router/index.tsx`

| Đường dẫn | Component | RoleGuard |
|---|---|---|
| `/login` | `LoginPage` | — |
| `/forgot-password` | `ForgotPasswordPage` | — |
| `/` | `DashboardPage` | — |
| `/rooms` · `/rooms/:id` | `RoomListPage` | — |
| `/trays` | → redirect `/rooms` | — |
| `/devices` | `DeviceManagementPage` | `ADMIN`, `OPERATOR` |
| `/devices/history` | `IoTHistoryPage` | `ADMIN`, `OPERATOR` |
| `/packages` | `PackageManagementPage` | — |
| `/orders` | `OrderManagementPage` | — |
| **`/rentals`** | **`RentalListPage`** | **`ADMIN`, `OPERATOR`** ⭐ mới |
| `/cultivation` | `CultivationManagementPage` | — |
| `/alerts` | `AlertManagementPage` | — |
| `/reports` | `ReportsAnalyticsPage` | — |
| `/customers` | `TenantListPage` | — |
| `/tenants` | → redirect `/customers` | — |
| `/camera` | `CameraOverviewPage` | — |
| `/users` | `UserManagementPage` | `ADMIN` |
| `/settings` | `SettingsPage` | — |
| `/change-password` | `ChangePasswordPage` | — |
| `*` | → redirect `/` | — |

## 2.5 Menu — `src/app/layouts/AdminLayout.tsx`

| Nhóm | Mục |
|---|---|
| **VẬN HÀNH** | Tổng quan · Quản lý phòng · Quản lý khay · Thiết bị IoT · Camera toàn cảnh · Sinh trưởng & thu hoạch · Cảnh báo vi khí hậu · Báo cáo & phân tích |
| **QUẢN TRỊ** | Khách thuê · Đơn đặt từ App · **Vụ thuê** ⭐ mới · Gói cước thuê · Tài khoản · Cấu hình |

> ℹ️ Menu **không lọc theo role** — mọi role đều thấy đủ. Điều này là hành vi có sẵn của dự án, giữ nguyên để nhất quán. Việc chặn thực tế do `RoleGuard` trong router đảm nhiệm.

---

# PHẦN 3 — ĐIỂM CHƯA LÀM / ĐANG KHUYẾT

## 3.1 API chưa gọi (5)

| # | Endpoint | Mức độ | Ghi chú |
|---|---|---|---|
| 1 | `PUT /api/iot/masters/{masterId}/light` | 🔴 Trung bình | Chỉnh ánh sáng — admin nên có. Chưa có hàm trong `iot.api.ts` |
| 2 | `GET /api/iot/floors/{floorId}/auto-control/suggestions` | 🟡 Trung bình | Gợi ý cấu hình phun sương. Chưa có hàm |
| 3 | `GET /api/iot/masters/{id}/nodes/{n}/sensors/{s}` | 🟡 Thấp | `iotApi.getSensor()` **đã viết** tại `iot.api.ts:34` nhưng không hook nào gọi |
| 4 | `GET /api/cultivation-rooms/{id}/trays` | 🟢 Thấp | UI vẫn dựng được danh sách khay qua `useAllUiTrays()` |
| 5 | CRUD `/api/users` | 🔴 **Cao** | `UserManagementPage` chạy hoàn toàn trên zustand mock. Swagger có đủ 4 endpoint |

## 3.2 Hạn chế từ phía BE

| Vấn đề | Chi tiết | Ảnh hưởng |
|---|---|---|
| **Thiếu API lịch sử tiến độ** | `GET /api/rentals/admin/{id}` chỉ trả thông tin rental, **không kèm mảng progress** | Drawer chi tiết không hiển thị được "nhật ký tiến độ" như yêu cầu UI |
| **Thiếu API lịch sử thu hoạch** | Tương tự — không có endpoint trả lịch sử harvests | Drawer không hiển thị được "lịch sử thu hoạch" |
| **Thiếu param tìm kiếm** | `GET /api/rentals/admin` không có `keyword`/`search` | Đang lọc **ở client** trên 1 trang dữ liệu — không đúng khi phân trang nhiều trang |
| **Không có schema Swagger** | Swagger không định nghĩa response schema cho rental | Types phải suy ra từ response thực tế (đã làm) |

**Đề xuất cần BE bổ sung:**

| Endpoint | Mục đích |
|---|---|
| `GET /api/rentals/admin/{rentalId}/progress` | Danh sách tiến độ để vẽ timeline |
| `GET /api/rentals/admin/{rentalId}/harvests` | Danh sách lần thu hoạch + tổng khối lượng |
| Thêm `keyword` vào `GET /api/rentals/admin` | Tìm kiếm server-side |

## 3.3 Chưa xây dựng UI

| Hạng mục | Trạng thái |
|---|---|
| Nhật ký tiến độ trong Drawer | ❌ Chờ API (`3.2`) |
| Lịch sử thu hoạch trong Drawer | ❌ Chờ API (`3.2`) |
| Nút "Tạo rental từ đơn" (`POST /from-order`) | ⚠️ Hook `useCreateRentalFromOrder` đã có, **chưa gắn nút UI** |
| Nút "Duyệt rental" (`PATCH` → `PREPARING`) | ⚠️ Hook `useUpdateRental` đã có, **chưa gắn nút UI** |
| Gợi ý cấu hình (`suggestions`) | ❌ Chờ API |
| Chỉnh ánh sáng (`PUT light`) | ❌ Chờ API |

## 3.4 Nợ kỹ thuật

| Vấn đề | Vị trí | Mức độ |
|---|---|---|
| 8 lỗi TypeScript có sẵn | `useIoT.ts` (thiếu import `IotSensor`), `useTiersWithEnvironment.ts` (thiếu export `CultivationFloorMapping`), `RoomListPage.tsx`, `TrayIoTHistoryApiView.tsx`, `DeviceManagementPage.tsx`, `useFloorThresholdsFromApi.ts`, `OrderManagementPage.tsx` | 🟡 Trung bình |
| 17 lỗi ESLint `react-refresh/only-export-components` | `app/router/index.tsx` — pattern có sẵn (gom nhiều `lazy` component trong 1 file) | 🟢 Thấp |
| Đồng thời có 2 báo cáo trùng chủ đề | `FINAL-INTEGRATION-REPORT.md`, `FRONTEND-AUDIT-REPORT.md` (chứa thông tin sai) | 🟡 Nên hợp nhất |

> ✅ Module Rentals (12 tệp) và các file đã sửa (`router/index.tsx`, `AdminLayout.tsx`) **không phát sinh lỗi mới**.

---

## Phụ lục — Kiểm chứng

| Hạng mục | Kết quả |
|---|---|
| Dữ liệu types | Lấy từ **response thực tế** của BE qua 2 request đã xác thực (`GET /api/rentals/admin`, `GET /api/rentals/admin/4`) |
| Phân quyền | Đối chiếu Swagger `swagger-ui-init.js` + xác nhận tại `types/auth.ts:58-60` (role_id 1/2/3 → ADMIN/OPERATOR/CUSTOMER) |
| Type-check | `npx tsc --noEmit -p tsconfig.app.json` — 0 lỗi ở Rentals |
| Lint | ESLint 9 tệp Rentals — 0 lỗi |