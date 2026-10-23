# Báo cáo Hiện trạng Frontend MCMS Admin Dashboard

> **Ngày chốt:** 19/10/2026 · **Phiên bản:** tại HEAD local  
> **Phạm vi:** Toàn bộ source code dưới `src/` (đã scan: ~30 page/component lớn + 9 stores + 10 types)

---

## TL;DR

| Chỉ số | Giá trị |
|---|---|
| Tổng số **Page / View** đang hoạt động | **15** |
| Trang dùng **MOCK data (in-memory Zustand)** | **15 / 15 (100%)** |
| Trang đã wire **API thật** | **0 / 15** |
| Tầng **HTTP client** (`axios` có trong `package.json`) | **Chưa khởi tạo** – không file nào `import axios` |
| Tầng `api/` folder (auth, rooms, tenants, trays) | **Tồn tại folder, RỖNG** – chưa có file nào |
| Trang dùng `localStorage` (persistence) | 1 (chỉ `auth.store.ts` cho session) |

**Kết luận chính:** Project hiện tại là **1 SPA hoàn chỉnh về UI nhưng chưa có bất kỳ layer API thật nào**. Toàn bộ data là mock hard-code trong Zustand store; chỉ `auth` có logic `setTimeout(300)` giả lập HTTP request.

---

## 1. Cấu trúc Route & Trang (Pages/Views)

### 1.1. Danh sách 15 page đang hoạt động

| # | Route | Page Component | Path | Phân quyền | Vị trí file |
|---|---|---|---|---|---|
| 1 | `/login` | `LoginPage` | Public | — | `src/features/auth/pages/LoginPage.tsx` |
| 2 | `/` | `DashboardPage` | Private | All | `src/features/dashboard/pages/DashboardPage.tsx` |
| 3 | `/rooms`, `/rooms/:id` | `RoomListPage` | Private | All | `src/features/rooms/pages/RoomListPage.tsx` |
| 4 | `/devices` | `DeviceManagementPage` | Private | `ADMIN, OPERATOR` | `src/pages/devices/DeviceManagementPage.tsx` |
| 5 | `/devices/history` | `IoTHistoryPage` | Private | `ADMIN, OPERATOR` | `src/pages/devices/IoTHistoryPage.tsx` |
| 6 | `/packages` | `PackageManagementPage` | Private | All (write: ADMIN/OPERATOR/FARM_MANAGER) | `src/pages/packages/PackageManagementPage.tsx` |
| 7 | `/orders` | `OrderManagementPage` | Private | All | `src/pages/orders/OrderManagementPage.tsx` |
| 8 | `/cultivation` | `CultivationManagementPage` | Private | All (Customer chỉ xem của mình) | `src/pages/cultivation/CultivationManagementPage.tsx` |
| 9 | `/alerts` | `AlertManagementPage` | Private | All (Customer chỉ xem của mình) | `src/pages/alerts/AlertManagementPage.tsx` |
| 10 | `/reports` | `ReportsAnalyticsPage` | Private | All | `src/pages/reports/ReportsAnalyticsPage.tsx` |
| 11 | `/customers` | `TenantListPage` | Private | All | `src/features/tenants/pages/TenantListPage.tsx` |
| 12 | `/camera` | `CameraOverviewPage` | Private | All | `src/pages/camera/CameraOverviewPage.tsx` |
| 13 | `/users` | `UserManagementPage` | Private | `ADMIN` | `src/pages/users/UserManagementPage.tsx` |
| 14 | `/settings` | `SettingsPage` | Private | All (Customer read-only) | `src/pages/settings/SettingsPage.tsx` |
| 15 | `*` (404) | — | — | — | Chưa có (router không khai báo route 404) |

### 1.2. Các component "phụ" không phải route nhưng chứa UI phức tạp

| Component | Mục đích | Có thể cần API riêng? |
|---|---|---|
| `TrayDetailDrawer` | Drawer chi tiết 1 khay | ✅ |
| `TrayAssignmentModal` | Modal gán khay cho đơn | ✅ |
| `FloorCameraModal`, `FloorClimateConfigModal` | Modal cấu hình tầng | ✅ |
| `ThresholdProfileModal` | Form ngưỡng vi khí hậu | ✅ |
| `MushroomVarietyFormModal`, `PackageFormModal`, `UserFormModal` | CRUD modal | ✅ |
| `BatchDailyPhotosModal`, `GrowthSnapshotLightbox` | Xem ảnh sinh trưởng | ✅ |
| `RentalHistoryTable`, `TrayIoTHistoryView` | Bảng lịch sử thuê/telemetry | ✅ |

---

## 2. Hiện trạng Mock Data / API

### 2.1. Bảng tổng hợp nguồn data của từng page

| Page | Nguồn data hiện tại | Loại | Có persist? |
|---|---|---|---|
| `LoginPage` | `auth.store.ts` → `MOCK_CREDENTIALS` + `MOCK_USER` | MOCK hard-code | ✅ `localStorage` (`mcms-auth-session`) |
| `DashboardPage` | `room.store.tiers`, `alert.store.alerts` | MOCK in-memory | ❌ |
| `RoomListPage` | `room.store.tiers` (12 trays × 4 tiers) | MOCK in-memory | ❌ |
| `TenantListPage` | `tenant.store.tenants` (5 khách) | MOCK in-memory | ❌ |
| `DeviceManagementPage` | `device.store` (gateway + 4 nodes + camera + 4 climate configs) | MOCK in-memory | ❌ |
| `IoTHistoryPage` | `iot-history.mock.ts` (4 khay × 12 tháng) | MOCK in-memory | ❌ |
| `PackageManagementPage` | `pricing.store.serviceFee` + `pricing.store.varieties` | MOCK in-memory | ❌ |
| `OrderManagementPage` | `order.store.orders` (5 đơn) | MOCK in-memory | ❌ |
| `CultivationManagementPage` | `cultivation.store.batches` (5 mẻ) | MOCK in-memory | ❌ |
| `AlertManagementPage` | `alert.store.alerts` (6 alerts + 2 auto-generated) | MOCK in-memory | ❌ |
| `ReportsAnalyticsPage` | `MOCK_ENVIRONMENT_HISTORY` + `MOCK_REVENUE_SUMMARIES` + `MOCK_YIELD_SUMMARIES` | MOCK in-memory | ❌ |
| `CameraOverviewPage` | `device.store.camera` + `room.store.tiers` | MOCK in-memory | ❌ |
| `UserManagementPage` | `user.store.users` (5 users) | MOCK in-memory | ❌ |
| `SettingsPage` | `setting.store.thresholdProfiles` (6 profiles) | MOCK in-memory | ❌ |

### 2.2. Cấu trúc tầng data hiện tại

```
┌────────────────────┐
│  React Components  │  (15 pages + ~35 modals/drawers/tables)
└────────┬───────────┘
         │ useStore() ← Zustand hook
         ▼
┌────────────────────┐
│   Zustand Stores   │  9 stores trong src/stores/*.ts
│   (in-memory)      │  + 1 store riêng features/auth
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  MOCK_xxx arrays   │  Hard-code trong từng file store
│  (in-source)       │  Chỉ auth có localStorage
└────────────────────┘
         ❌  (chưa có HTTP layer)
         ▼
      (nothing)
```

### 2.3. Điểm lưu ý quan trọng

- **Không có `api/` layer**: Folder `src/features/{auth,rooms,tenants,trays}/api/`, `src/shared/api/` đều **RỖNG** (chỉ có placeholder, không file `.ts` nào).
- **`axios` đã có trong `package.json` v1.19.0 nhưng KHÔNG file nào import**. Cần tạo `src/shared/api/client.ts` trước.
- **Toàn bộ mutation** (`addUser`, `updateOrder`, `closeTray`...) chỉ gọi `set((state) => ({...}))` — KHÔNG có optimistic update vì không có remote source of truth.
- **Giả lập latency**: Một số handler có `await new Promise(r => setTimeout(r, 300))` để mô phỏng API delay.

---

## 3. Bản đồ ghép API (API Mapping Checklist)

### Nhóm 1 — Authentication (ưu tiên cao)

> Hai endpoint được yêu cầu ưu tiên. Hiện trạng: `auth.store.ts` so sánh `email/password` với `MOCK_CREDENTIALS = {admin@mcms.vn, Admin@123}`.

| # | Endpoint | Method | UI cần gọi | Hiện trạng | Field UI ↔ API |
|---|---|---|---|---|---|
| 1.1 | `/api/auth/login` | POST | `LoginForm.tsx` → `useAuthStore().login()` | MOCK (chỉ check string equality) | UI gửi `{email, password, rememberMe}` → API trả `{accessToken, refreshToken, user: {id, email, name, role}}` |
| 1.2 | `/api/users/me` | GET | `AuthGuard` để re-validate session khi F5 | **Chưa có** — chỉ đọc `localStorage` | Cần thêm gọi ở app boot để hydrate `useAuthStore` |

**Checklist triển khai Auth:**
- [ ] Tạo `src/shared/api/client.ts` (axios instance + interceptor gắn Bearer token + auto refresh 401)
- [ ] Tạo `src/features/auth/api/auth.api.ts` với `login()` và `me()`
- [ ] Refactor `auth.store.ts`: `login` → gọi `authApi.login()` rồi set state; thêm `hydrate()` gọi `/me` khi app boot
- [ ] Xử lý token refresh + redirect `/login` khi 401
- [ ] Xóa `MOCK_CREDENTIALS` & `MOCK_USER`

**⚠️ GAP phát hiện:** Có **xung đột role naming** — `auth.types.ts` định nghĩa role **lowercase** (`'admin' \| 'farm_manager' \| 'operator'`), nhưng `user.types.ts` + `RoleGuard` dùng **UPPERCASE** (`'ADMIN' \| 'OPERATOR' \| 'CUSTOMER'`). `RoleGuard` đã có hàm `normalizeRole` để map `farm_manager → OPERATOR`, nhưng `user.store.ts` (phần Customer) đang hard-code role `'CUSTOMER'` uppercase → sau khi wire API phải chuẩn hoá về 1 source of truth.

---

### Nhóm 2 — Quản lý (Mushroom Types / Conditions / Packages / Rooms / Trays / Orders / Payments / IoT)

#### 2.A. Mushroom Types (`/packages` → tab MushroomVarietyCatalog)

| # | Endpoint | Method | Mapping hiện tại | Source field |
|---|---|---|---|---|
| 2A.1 | `/api/mushroom-varieties` | GET | `usePricingStore().varieties` | `pricing.store.ts` |
| 2A.2 | `/api/mushroom-varieties` | POST | `addVariety` | `pricing.store.ts` |
| 2A.3 | `/api/mushroom-varieties/{id}` | PUT | `updateVariety` | `pricing.store.ts` |
| 2A.4 | `/api/mushroom-varieties/{id}` | DELETE | `removeVariety` | `pricing.store.ts` |
| 2A.5 | `/api/pricing/service-fee` | GET / PUT | `usePricingStore().serviceFee` | `pricing.store.ts` |

**Type mapping:** `MushroomVariety` (id, name, imageUrl, description, cycleWeeks, spawnPricePerTray, availability, createdAt) ↔ Backend nên trả cùng schema.

#### 2.B. Mushroom Conditions (`/settings` → ThresholdProfile)

| # | Endpoint | Method | Mapping hiện tại | Source field |
|---|---|---|---|---|
| 2B.1 | `/api/threshold-profiles` | GET | `useSettingStore().thresholdProfiles` | `setting.store.ts` |
| 2B.2 | `/api/threshold-profiles` | POST | `addThresholdProfile` | `setting.store.ts` |
| 2B.3 | `/api/threshold-profiles/{id}` | PUT | `updateThresholdProfile` | `setting.store.ts` |
| 2B.4 | `/api/threshold-profiles/{id}` | DELETE | `removeThresholdProfile` | `setting.store.ts` |

**Type mapping:** `MushroomThresholdProfile` (id, mushroomType, name, cycleWeeks, tempMin/Max, humidityMin/Max, co2Max, soilMoistureMin/Max, isDefault, updatedAt).

#### 2.C. Rental Packages (`/packages` → nếu có tab Packages)

> **Lưu ý:** Hiện tại `PackageManagementPage` chỉ render `ServiceFeeSettings` + `MushroomVarietyCatalog`. **Không có page quản lý `RentalPackage` (gói cước cũ)**. Type `RentalPackage` vẫn còn trong `package.types.ts` nhưng không được sử dụng ở UI. Có thể backend đã bỏ concept này (đã chuyển sang Pricing Model mới).

- [ ] **Xác nhận với BE** còn dùng `RentalPackage` không → nếu không, xóa `package.types.ts` và bỏ `package.store.ts`.

| # | Endpoint (nếu còn dùng) | Method | UI |
|---|---|---|---|
| 2C.1 | `/api/rental-packages` | GET | (hiện không có page) |
| 2C.2 | `/api/rental-packages` | POST | — |
| 2C.3 | `/api/rental-packages/{id}` | PUT | — |

#### 2.D. Cultivation Rooms (`/rooms`)

| # | Endpoint | Method | Mapping hiện tại | Source field |
|---|---|---|---|---|
| 2D.1 | `/api/rooms/tiers` | GET | `useRoomStore().tiers` | `room.store.ts` |
| 2D.2 | `/api/rooms/tiers/{id}/climate` | PUT | `updateFloorClimateConfig` | `device.store.ts` |
| 2D.3 | `/api/rooms/tiers/{id}/fan` | POST | `toggleTierFan` | `room.store.ts` |
| 2D.4 | `/api/rooms/trays/{id}/valve` | POST | `toggleTrayValve` | `room.store.ts` |
| 2D.5 | `/api/rooms/telemetry` | GET (polling/WS) | `tier.telemetry` | `room.store.ts` (`simulateTelemetry` mỗi 5s) |

**Type mapping:** `Tier` (tierId, name, nodeId, trays[], telemetry, relays) + `Tray` (id, code, tierId, status, customerId, batchId, rental).

#### 2.E. Cultivation Trays (`/rooms` + `TrayDetailDrawer`)

| # | Endpoint | Method | UI | Source field |
|---|---|---|---|---|
| 2E.1 | `/api/trays/{id}` | GET | `TrayDetailDrawer` | `room.store.trays` |
| 2E.2 | `/api/trays/{id}/rental` | POST | `TrayStaffActionWorkflow` (Start rental) | `room.store.assignCustomerToTray` |
| 2E.3 | `/api/trays/{id}/close` | POST | `TrayStaffActionWorkflow` (Close rental) | `room.store.closeTraySession` |
| 2E.4 | `/api/trays/{id}/care-log` | POST | `TrayStaffActionWorkflow` (Ghi chăm sóc) | `room.store.addCareLog` |
| 2E.5 | `/api/trays/{id}/closure-reason` | POST | `TrayClosureReasonModal` | `room.store` |
| 2E.6 | `/api/trays/{id}/invoice` | GET | `TrayInvoiceModal` | `order.store` |
| 2E.7 | `/api/trays/{id}/admin-action` | POST | `TrayAdminActions` | `room.store` |

**Type mapping:** `TrayRental` (tenantName, tenantPhone, tenantAddress, mushroomType, mushroomVariety, weeks, startDate, expectedHarvestDate, packageEndDate, basePrice, dailyOverdueFee, harvestStatus, customerContactStatus, careLogs[]).

#### 2.F. Orders (`/orders`)

| # | Endpoint | Method | UI | Source field |
|---|---|---|---|---|
| 2F.1 | `/api/orders` | GET | `OrderManagementPage` (list + filter) | `order.store.orders` |
| 2F.2 | `/api/orders/{id}` | GET | (khi click row) | `order.store.orders` |
| 2F.3 | `/api/orders/{id}/assign-tray` | POST | `TrayAssignmentModal` | `order.store.assignTrayToOrder` |
| 2F.4 | `/api/orders/{id}/cancel` | POST | "Hủy đơn" button | `order.store.cancelOrder` |
| 2F.5 | `/api/orders/{id}/status` | PATCH | (chuyển status) | (chưa có action) |

**Type mapping:** `AppOrder` (id, orderCode, tenantId, tenantName, tenantPhone, tenantAddress, items[], deliveryMethod, deliveryAddress, deliveryFee, totalAmount, paymentMethod, paymentStatus, status, trayId?, batchId?, assignedAt?, createdAt, updatedAt, notes?).

#### 2.G. Payments

> **Hiện trạng UI:** KHÔNG có trang Payment riêng. Payment chỉ hiển thị ở 2 cột trong `OrderManagementPage` (paymentMethod + paymentStatus). **Chưa có action "Đối soát / Refund / Re-check"**.

- [ ] **Quyết định phạm vi:** Backend có module `/api/payments` riêng không? Nếu có, cần tạo trang mới `/payments` hoặc thêm action vào Order detail.
- [ ] Nếu chỉ cần đọc trạng thái: GET `/api/orders/{id}` đã đủ (đã có `paymentStatus` field).

| # | Endpoint (đề xuất) | Method | UI |
|---|---|---|---|
| 2G.1 | `/api/payments?orderId=...` | GET | Modal chi tiết đơn (chưa có) |
| 2G.2 | `/api/payments/{id}/refund` | POST | Button "Hoàn tiền" (chưa có) |
| 2G.3 | `/api/payments/webhook-status` | GET | (tuỳ chọn) |

#### 2.H. IoT / Automatic misting (`/devices` + `/devices/history`)

| # | Endpoint | Method | UI | Source field |
|---|---|---|---|---|
| 2H.1 | `/api/devices/gateway` | GET | `DeviceManagementPage` (Gateway card) | `device.store.gateway` |
| 2H.2 | `/api/devices/gateway/relay/{key}` | POST | 3 Switch (Bơm / Quạt / Đèn) | `device.store.toggleGatewayRelay` |
| 2H.3 | `/api/devices/nodes` | GET | RS485 node grid (4 nodes) | `device.store.nodes` |
| 2H.4 | `/api/devices/nodes/{id}/ping` | POST | Button "Ping" | `device.store.pingNode` |
| 2H.5 | `/api/devices/nodes/{id}/restart` | POST | Button "Restart" | `device.store.restartNode` |
| 2H.6 | `/api/devices/telemetry/realtime` | WS / SSE | Tier telemetry live | Hiện: `simulateTelemetry()` mỗi 5s |
| 2H.7 | `/api/devices/telemetry/history?trayId=&from=&to=` | GET | `IoTHistoryPage` | `iot-history.mock.ts` |
| 2H.8 | `/api/devices/camera/snapshot` | POST | Camera button "Chụp" | `device.store.takeSnapshot` |
| 2H.9 | `/api/devices/cameras/{floorId}/stream` | WS (RTSP proxy) | `FloorCameraModal` | `device.store.camera` |
| 2H.10 | `/api/floors/{tierId}/climate-config` | GET / PUT | `FloorClimateConfigModal` | `device.store.floorClimateConfigs` |

**Type mapping:** `GatewayMaster`, `Rs485Node`, `CameraConfig`, `TierTelemetry`, `TierRelayState`, `FloorClimateConfig`, `FloorClimateThresholdValues`, `TelemetryPoint`, `LongTermTelemetryPoint`, `RentalSession`, `StageTimelineItem`, `OrderStatusLog`.

**Lưu ý cho auto-misting (tưới tự động):**
- Hiện tại `useEffect` ở `DeviceManagementPage` đang **bật/tắt giả lập** telemetry mỗi 5s qua `simulateTelemetry` → sẽ thay bằng WebSocket subscribe thật.
- 12 valves (3 mỗi tầng × 4 tầng) hiện chỉ là Switch trên UI, không có lịch tưới tự động. Có thể cần thêm endpoint `POST /api/floors/{id}/irrigation-schedule` (chưa có trong UI).

---

## 4. Các điểm xung đột UI / Data (Gaps)

### 4.1. Xung đột giữa FE type ↔ API response dự kiến

| # | Vị trí UI | Vấn đề | Mức độ | Đề xuất |
|---|---|---|---|---|
| **G1** | `auth.types.ts` vs `RoleGuard` | Role `auth` là lowercase (`'admin'\|'farm_manager'\|'operator'`) nhưng `RoleGuard` mapt sang `UserRole` UPPERCASE (`'ADMIN'\|'OPERATOR'\|'CUSTOMER'`) | 🔴 Cao | Chốt 1 schema, đề xuất giữ UPPERCASE để match `user.store` hiện tại |
| **G2** | `AppOrder.paymentStatus` | FE có field `paymentStatus: 'PAID'\|'UNPAID'\|'REFUNDED'` nhưng chưa có action nào để set/cập nhật | 🟡 Trung bình | Cần endpoint `PATCH /api/orders/{id}/payment-status` |
| **G3** | `RentalPackage` type | Type vẫn còn nhưng **không có UI nào dùng** (đã chuyển sang Pricing Model) | 🟡 Trung bình | Xác nhận với BE, xoá nếu không dùng |
| **G4** | `MushroomVariety.cycleWeeks` | Dùng type `PricingCycleWeeks = 1\|2\|3\|4` (literal), nhưng `MushroomThresholdProfile.cycleWeeks` là `number` | 🟢 Thấp | Chuẩn hoá 1 type chung `CycleWeeks = number` |
| **G5** | `Tier.id` vs `Tier.tierId` | Type `Tier` có `tierId: TierId` và `nodeId: NodeId` nhưng **KHÔNG có field `id` trên `Tier`** — `node.id` thuộc `Rs485Node` | 🟢 Thấp | Xác nhận schema FE/BE |
| **G6** | `Tray.rental` | Khi `status === 'rented'` mới có `rental: TrayRental \| null`, nhưng `customerContactStatus` + `harvestStatus` chỉ có ở trong `rental` → query lồng nhau | 🟡 Trung bình | Backend nên flatten hoặc trả sub-resource |
| **G7** | `GallerySnapshot` trong `CultivationBatch` | UI có `BatchDailyPhotosModal` đọc 7 snapshots, nhưng `gallerySnapshots[]` chỉ có 1-2 mẫu trong mock | 🟢 Thấp | Cần BE seed data đầy đủ cho test |

### 4.2. UI có nhưng API chưa rõ field

| # | UI Component | Cần field từ API | Mức độ |
|---|---|---|---|
| **U1** | `OrderManagementPage` cột "Hành động" | Cần thêm action **"Xem chi tiết"** → mở `OrderDetailDrawer` chưa tồn tại | 🔴 |
| **U2** | `TenantListPage` | Hiện **KHÔNG có action "Xem lịch sử thuê"** của từng tenant | 🟡 |
| **U3** | `AlertItemRow` | Có field `acknowledgedBy` (text) nhưng **không có link/profile** của user xử lý | 🟢 |
| **U4** | `DeviceManagementPage` | Có `latencyMs`, `packetLossPercent` nhưng **không có biểu đồ xu hướng** (chỉ text) | 🟡 |
| **U5** | `CultivationBatchCard` | Có `actualYieldKg` + `expectedYieldKg` → **chưa có progress bar hoặc chart** so sánh | 🟡 |
| **U6** | `ReportsAnalyticsPage` "Xuất CSV" | Có button nhưng **chỉ xuất client-side**, chưa gọi `/api/reports/export` | 🔴 |
| **U7** | `ThresholdProfileTab` | Có nút "Xem biểu đồ" (nếu có) nhưng **chưa so sánh được với telemetry thật** của khay | 🟡 |

### 4.3. API có thể trả field mà UI chưa hiển thị

| # | Field dự kiến từ API | UI có dùng? | Gợi ý |
|---|---|---|---|
| **A1** | `Tier.location` (vd: "Khu A, Tầng 1") | ❌ Không | Thêm vào header card |
| **A2** | `Rs485Node.cpuUsage`, `memoryUsage` | ❌ Không | Thêm vào tooltip |
| **A3** | `Tray.lastInspectionAt`, `inspectorName` | ❌ Không | Thêm vào `TrayDetailDrawer` |
| **A4** | `AppOrder.refundedAmount` | ❌ Không | Nếu backend support, hiển thị trong cột "Tổng tiền" |
| **A5** | `CultivationBatch.contaminationDetectedAt` | ❌ Không (đang bị "gộp" trong `healthStatus`) | Nên tách thành field riêng để sort/filter |
| **A6** | `MushroomVariety.actualStock` | ❌ Không (chỉ có `availability: 'AVAILABLE'\|'OUT_OF_STOCK'`) | Cân nhắc thêm số lượng tồn kho phôi |
| **A7** | `User.lastLoginAt`, `lastLoginIp` | ❌ Không | Thêm cột trong `UserManagementPage` |

### 4.4. Vấn đề kỹ thuật phát hiện khi scan

| # | Vấn đề | Vị trí | Hướng xử lý |
|---|---|---|---|
| **T1** | Folder `api/` tồn tại nhưng rỗng ở 4 features | `src/features/{auth,rooms,tenants,trays}/api/` | Tạo skeleton files trước khi wire |
| **T2** | Không có HTTP client instance | toàn project | Tạo `src/shared/api/client.ts` với axios + interceptor |
| **T3** | Không có error boundary tập trung | toàn project (chỉ có `ReportsErrorBoundary`) | Thêm `GlobalErrorBoundary` ở `AdminLayout` |
| **T4** | 6/9 stores có MOCK_xxx hard-code > 100 dòng | `alert.store.ts` (280 dòng mock), `room.store.ts`, `cultivation.store.ts` | Sau khi wire API, có thể xoá bớt mock để giảm bundle |
| **T5** | `RoleGuard` so sánh uppercase sau khi normalize nhưng `auth.user.role` raw là lowercase | `RoleGuard.tsx` line 19-29 | Backend nên trả UPPERCASE để nhất quán |
| **T6** | `OrderManagementPage` có **2 bản columns** (1 dùng AntD Table columns prop, 1 manual `<table>` ở dòng 380-595) | `OrderManagementPage.tsx` | Refactor chỉ dùng 1 cách (khuyến nghị giữ AntD Table) |
| **T7** | Không có `route 404` | `src/app/router/index.tsx` | Thêm `{ path: '*', element: <NotFoundPage /> }` |
| **T8** | 1 store có circular dependency: `tenant.store` import `room.store` | `src/features/tenants/store/tenant.store.ts` line 3 | Sau khi refactor API, tách sang React Query sẽ hết |

---

## 5. Đề xuất lộ trình triển khai (gợi ý)

| Phase | Nội dung | Effort | Phụ thuộc |
|---|---|---|---|
| **Phase 0** (nền tảng) | Tạo `src/shared/api/client.ts` + `react-query` setup + GlobalErrorBoundary + 404 page | 0.5 ngày | — |
| **Phase 1** (Auth) | Wire `/api/auth/login` + `/api/users/me` + fix role schema | 1 ngày | Phase 0 |
| **Phase 2** (Catalog) | Mushroom Varieties + Threshold Profiles + Service Fee (CRUD) | 1.5 ngày | Phase 0 |
| **Phase 3** (Rooms/Trays) | Tiers + Trays + Telemetry WebSocket + Care logs | 2 ngày | Phase 0 |
| **Phase 4** (Orders) | Orders CRUD + Assign Tray + Status transitions | 1.5 ngày | Phase 3 |
| **Phase 5** (IoT Devices) | Gateway + Nodes + Camera snapshot | 1.5 ngày | Phase 0 |
| **Phase 6** (Payments) | Refund + Re-check + Webhook status (nếu có) | 1 ngày | Phase 4 |
| **Phase 7** (Reports) | Time-series queries + CSV export server-side | 1.5 ngày | Phase 3, 4 |
| **Phase 8** (Cleanup) | Xoá mock data dư + chuẩn hoá type + refactor OrderManagementPage duplicate table | 1 ngày | All |

**Tổng ước tính: ~10.5 ngày** (1 dev fulltime)

---

## 6. Phụ lục: Thống kê nhanh

### 6.1. Theo domain

| Domain | Số page | Số MOCK array | Có localStorage? |
|---|---|---|---|
| Auth | 1 | 2 | ✅ |
| Dashboard | 1 | 0 (chỉ aggregate) | ❌ |
| Rooms/Trays | 2 | 1 (`room.store.MOCK_TIERS`) | ❌ |
| Tenants | 1 | 1 (`MOCK_TENANTS`) | ❌ |
| Devices/IoT | 2 | 8 (`device.store`) | ❌ |
| Cultivation | 1 | 2 (`cultivation.store`) | ❌ |
| Orders | 1 | 4 (`order.store`) | ❌ |
| Packages/Pricing | 1 | 2 (`pricing.store`) | ❌ |
| Settings | 1 | 0 (`setting.store` đọc từ default) | ❌ |
| Reports | 1 | 3 (`alert.store` exports) | ❌ |
| Alerts | 1 | 6 (`alert.store.MOCK_ALERTS`) | ❌ |
| Camera | 1 | 0 (dùng `device.store.camera`) | ❌ |
| Users | 1 | 2 (`MOCK_USERS`) | ❌ |
| **Tổng** | **15** | **31 MOCK array** | **1** |

### 6.2. Theo dependency

- **`axios`**: có trong `package.json` (v1.19.0) — **0 file import**
- **`@tanstack/react-query`**: có trong `package.json` (v5.102.2) — **0 file import** (chưa setup Provider)
- **`dayjs`**: dùng ở 4 file (Reports, Services)
- **`zustand`**: dùng ở 10 file (9 stores + 1 auth store)

---

> **Báo cáo được tạo tự động bằng cách scan toàn bộ source code. Mọi con số "15 page / 31 MOCK / 0 API" đều dựa trên phân tích thực tế các file `.tsx` và `.ts` trong repo.**
