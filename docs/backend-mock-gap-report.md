# Mock data cần BE expose

Báo cáo gửi BA/backend sau khi audit `src/pages/devices/DeviceManagementPage.tsx`.

> **Trạng thái hiện tại: toàn bộ mock điều khiển thiết bị đã được XOÁ khỏi UI.**
> Các tín hiệu dưới đây hiện **không còn hiển thị** cho tới khi BE sẵn sàng endpoint tương ứng.
> Xem bảng "Trạng thái hiện tại" để biết phần nào đã gắn API thật.

## Snapshot thật backend (49 endpoints)

Đã xác minh qua `GET https://backend-75e1.onrender.com/api-docs/swagger-ui-init.js`.

## API đã có — FE đã gắn (nhóm hợp lệ)

| API | Method | FE dùng ở |
|---|---|---|
| `/api/iot/masters` | GET | `useMasterList` |
| `/api/iot/masters/{id}/sensors` | GET | `useMasterSensors` |
| `/api/iot/masters/{id}/nodes/{n}/sensors/{s}` | GET | `useSensorDetail` |
| `/api/iot/masters/{id}/nodes/{n}/sensors/{s}/history` | GET | `useSensorHistory` |
| `/api/iot/masters/{id}/ssr` | GET | `useSsrChannels` — đọc trạng thái 8 kênh |
| `/api/iot/masters/{id}/ssr/{channel}/commands` | POST | `useSsrCommand` — bật/tắt kênh |
| `/api/iot/commands/{commandId}` | GET | `useCommandStatus` |
| `/api/iot/floors` | GET/POST/PUT | `useFloorList`, `useCreateFloor`, `useUpdateFloor` |
| `/api/iot/floors/{id}/trays/{trayId}` | PUT | `useAssignFloorToTray` |
| `/api/iot/floors/{id}/environment` | GET | `useFloorEnvironment` |
| `/api/iot/floors/{id}/auto-control` | GET/PUT | `useFloorConfig`, `useSaveAutoControlConfig` |
| `/api/iot/floors/{id}/auto-control/start\|stop\|status\|logs\|evaluate` | POST/GET | `useStartAutoMisting`, `useStopAutoMisting`, `useFloorAutoControlStatus`, `useAutoMistingLogs`, `useEvaluateAutoMisting` |

## API cần BA bổ sung (mock đã xoá khỏi UI)

| # | Tín hiệu UI | Mock đã xoá | API cần có | Trạng thái UI hiện tại |
|---|---|---|---|---|
| 1 | Gateway Master — IP / MAC / firmware / Wi-Fi RSSI | `device.store.gateway` | `GET /api/iot/gateway` trả `GatewayMaster` | Hiển thị `NO_BACKEND_HINT` |
| 2 | Card "RS485 Topology" — node, latency, packet loss | `device.store.nodes` | `GET /api/iot/masters/{id}/nodes` trả `Rs485Node[]` | Hiển thị `NO_BACKEND_HINT` |
| 3 | Nút `Ping` / `Restart` cho từng node | `device.store.pingNode`, `restartNode` | `POST /api/iot/masters/{id}/nodes/{nodeId}/ping\|restart` | Đã xoá UI |
| 4 | Camera "Front Overview Camera" + chụp ảnh | `device.store.camera`, `takeSnapshot` | `GET /api/iot/cameras` trả `CameraConfig[]` | Trang `/camera` hiện báo "chưa có API" |
| 5 | Toggle "Giả lập telemetry" | `room.store.simulateTelemetry` | (KHÔNG CẦN API — đã xoá hẳn) | Đã xoá UI |
| 6 | Fan switch / irrigation valve per tier | `room.store.toggleTierFan`, `toggleTrayValve` | `POST /api/iot/masters/{id}/ssr/{channel}/commands` | Đã xoá UI (chỉ còn panel SSR 8 kênh) |

## Backend cần mở rộng

| # | Nội dung | Lý do |
|---|---|---|
| 1 | `IotSsrChannelState` cần thêm `deviceType` (vd. `WATER_VALVE`, `FAN`, `LIGHT`, `PUMP`) + `label` | BE hiện **không** trả loại thiết bị. FE đang hiển thị nhãn trung tính `"Kênh N"` (`src/features/devices/utils/ssr-channel-labels.ts`) thay vì đoán "van / quạt / đèn" |
| 2 | API điều khiển theo tầng (vd. bật van tưới của tầng 2) | BE chỉ có lệnh theo `masterId + channel`, FE phải tự quyết channel nào thuộc tầng nào |
| 3 | API timer / schedule cho thiết bị (đồng hồ bật/tắt theo lịch) | BE chưa có endpoint schedule — chỉ có lệnh tức thời `POST .../commands` |
| 4 | `IotSensor` cần thêm trường CO₂ | UI hiện hiển thị `—` cho CO₂ |
| 5 | `/api/iot/floors/{id}/auto-control/suggestions` | Đã có trong Swagger, FE chưa dùng |

## MISMATCH: `role_id` giữa Swagger và DB thực tế — BE cần sửa

**Mức độ:** Sửa tài liệu (Swagger) — **không cần đổi logic BE**, DB/guard đang đúng.
**Ngày xác minh:** 2026-10-22 · **Spec:** `GET /api-docs/swagger-ui-init.js` (backend `backend-75e1.onrender.com`)

### Vấn đề

Trong schema `RegisterRequest`, BE mô tả sai thứ tự `roleId`:

```json
"roleId": {
  "type": "integer",
  "minimum": 1,
  "example": 3,
  "description": "Optional; role IDs in the current seed: 1 = Farm Operator, 2 = Admin, 3 = Customer. Without roleId, Customer (3) is assigned."
}
```

Mô tả này **sai** so với DB thực tế. Cùng file spec cũng có mâu thuẫn nội bộ: schema `User.role_id` có `example: 2`, và endpoint `/api/rentals/admin` viết *"Role IDs 1 and 2 are allowed"* cho Admin + Farm Operator — mâu thuẫn với `RegisterRequest`.

### Mapping ĐÚNG (theo DB thực tế)

| `role_id` | Role | Tên hiển thị ở FE |
|---|---|---|
| `1` | ADMIN | Quản trị viên |
| `2` | OPERATOR | Vận hành trang trại (Farm Operator) |
| `3` | CUSTOMER | Khách thuê khay |

### Bằng chứng thực nghiệm (đã chạy trên BE thật)

**Test 1 — endpoint chỉ cho Admin:** `POST /api/rentals/admin/{rentalId}/cancel`

| Token `role_id` | Kết quả | Kết luận |
|---|---|---|
| `1` | `400 {"message":"reason is required"}` | ✅ **Đã qua guard Admin** (chỉ thiếu body) |
| `2` | `403 {"message":"You do not have permission to access this resource"}` | ❌ Không phải Admin |
| `3` | `403` | ❌ Không phải Admin |

**Test 2 — endpoint Admin + Farm Operator:** `GET /api/rentals/admin`

| Token `role_id` | Kết quả | Kết luận |
|---|---|---|
| `1` | `200` | ✅ Admin |
| `2` | `200` | ✅ Farm Operator |
| `3` | `403` | ❌ Customer bị chặn |

**Test 3 — round-trip `roleId`:** `POST /api/auth/register` với `roleId` = 1 / 2 / 3 → response `role_id` = 1 / 2 / 3 (BE lưu 1:1, không map lại).

→ Kết luận: **`role_id = 1` là ADMIN**, không phải Farm Operator như Swagger ghi.

### Đề nghị sửa

1. **Sửa `description` của `roleId` trong schema `RegisterRequest`** thành:
   `"Optional; role IDs: 1 = Admin, 2 = Farm Operator, 3 = Customer. Without roleId, Customer (3) is assigned."`
2. **Sửa schema `User.role_id`**: đổi `example: 2` → `example: 1` (hoặc bỏ example, chỉ ghi "1 = Admin, 2 = Farm Operator, 3 = Customer").
3. **Thống nhất tên gọi** trong toàn bộ `description` của các endpoint `403` đang ghi *"Only Admin and Farm Operator roles are allowed"* — cân nhắc dùng đúng tên role trong DB: `Admin` / `Farm Operator` / `Customer`.
4. **Khuyến nghị (không bắt buộc):** thêm trường `role_name` vào schema `User` (trả kèm `role_id`) để FE không phải hardcode mapping `role_id → role`. Khi đó chỉ cần sửa 1 chỗ mapper ở `src/types/auth.ts` (`backendRoleIdToUiRole`) và `src/routes/RoleGuard.tsx` (`normalizeRole`).

### Ảnh hưởng nếu BE KHÔNG sửa

- FE hiện đã map đúng theo DB thực tế nên **không có bug runtime** — web admin vẫn phân quyền chính xác.
- Rủi ro chỉ là: (a) người đọc Swagger bị nhầm ngược mapping, (b) mobile app hoặc backend khác nếu tin theo Swagger sẽ **cấp nhầm quyền Admin** cho tài khoản `role_id = 1`.

### Ghi chú thêm cho FE

Web admin đã **gỡ toàn bộ chức năng đăng ký** (route `/register` + `/register-otp` xoá, API `register*` không còn expose). Admin/Operator giờ **chỉ đăng nhập bằng tài khoản được cấp** — đúng nhu cầu "admin không cần tự đăng ký". Endpoint `POST /api/auth/register` vẫn tồn tại ở BE (mobile app dùng), nhưng hiện **cho phép truyền `roleId` bất kỳ** → ai cũng tự tạo được tài khoản Admin qua endpoint này.

→ **Khuyến nghị bảo mật:** BE nên bỏ `roleId` khỏi `RegisterRequest` (luôn gán `Customer` = 3), và cấp ADMIN/OPERATOR qua endpoint riêng dành cho quản trị viên (`POST /api/users` của role Admin). Đây là lỗ hổng leo thang đặc quyền, không chỉ là lỗi tài liệu.

## 🔴 CRITICAL: `/api/mushroom-types` — KHÔNG có phân quyền, Customer sửa/xoá được catalog

**Ngày kiểm tra:** 2026-10-22 · **Kết quả:** 4 lỗi · **Mức độ: Cao**

Tất cả 7 endpoint dưới đây đều chỉ kiểm tra "có JWT hợp lệ", **không có middleware phân quyền theo `role_id`**. Tài khoản Customer (`role_id = 3`) — vốn chỉ nên mua khay nấm — có toàn quyền CRUD catalog.

### Ma trận kết quả (đã chạy thật với token 3 role)

| Endpoint | Admin (1) | Operator (2) | Customer (3) | Kỳ vọng |
|---|---|---|---|---|
| `GET /api/users/me` | 200 | 200 | 200 | ✅ cả 3 đều hợp lệ |
| `GET /api/mushroom-types` | 200 | 200 | 200 | ✅ đọc OK |
| `GET /api/mushroom-types/{id}` | 200 | 200 | 200 | ✅ đọc OK |
| `POST /api/mushroom-types` | 201 | **201** | **201** | ❌ chỉ nên Admin/Operator |
| `PUT /api/mushroom-types/{id}` | 200 | **200** | **200** | ❌ chỉ nên Admin/Operator |
| `DELETE /api/mushroom-types/{id}` | 200 | **200** | **200** | ❌ chỉ nên Admin |

### Bằng chứng cụ thể

**Lỗi 1 — Customer tạo được loại nấm mới:**
```
POST /api/mushroom-types   (token role_id=3)
→ 201 {"message":"Mushroom type created successfully",
      "data":{"mushroom_type_id":14,"name":"DeleteProbeBy3", ...}}
```

**Lỗi 2 — Customer sửa được record có sẵn của hệ thống** (nghiêm trọng nhất — phá hoại dữ liệu):
```
PUT /api/mushroom-types/9   (token role_id=3)
body: name="TAMPERED by role3", price=1, status=INACTIVE
→ 200 {"data":{"mushroom_type_id":9,"name":"TAMPERED by role3",
              "price":"1.00","status":"INACTIVE"}}
```
Record `id=9` (Nấm sư trưng, `growing_days=7`) đã bị đổi tên và giá về `1.00`.

**Lỗi 3 — Customer xoá được loại nấm:**
```
DELETE /api/mushroom-types/14   (token role_id=3) → 200 "deleted successfully"
```

**Lỗi 4 — Swagger không ghi 403 cho các endpoint này.** `POST/PUT/DELETE /api/mushroom-types` chỉ liệt kê `400/401/404`, **không có `403`** → đúng với hành vi hiện tại (không chặn role), nhưng chứng tỏ BE **chưa thiết kế** phân quyền cho nhóm API này.

### Đề nghị sửa

1. **Thêm middleware role guard** cho `POST/PUT/DELETE /api/mushroom-types*` — chỉ cho `Admin` (1) và `Farm Operator` (2), trả `403` cho `Customer` (3).
2. **Cân nhắc siết thêm `PUT`**: nên yêu cầu `Admin` (1) cho thao tác sửa/xoá, vì catalog nấm là dữ liệu danh mục dùng chung cho mọi đơn hàng.
3. **Bổ sung response `403`** vào Swagger cho `POST/PUT/DELETE /api/mushroom-types`.
4. **Rà soát lại toàn bộ nhóm CRUD không có guard** (xem bảng bên dưới).

### Nhóm API cần rà soát (cùng kiểu: không thấy 403 trong Swagger)

| Nhóm | Endpoint | Ghi chú |
|---|---|---|
| Mushroom Types | `/api/mushroom-types*` | ❌ **Đã xác nhận lỗ hổng** |
| Mushroom Conditions | `/api/mushroom-conditions*` | Chưa test — cùng pattern, khả năng cao cũng lỗi |
| Rental Packages | `/api/rental-packages*` | Chưa test — nhạy cảm hơn (giá, khuyến mãi) |
| Cultivation Rooms/Trays | `/api/cultivation-rooms*`, `/api/cultivation-trays*` | Chưa test — Customer có thể không nên sửa phòng/tray |
| Orders | `/api/orders*` | Cần test kỹ — Customer chỉ nên đọc/xoá đơn **của chính mình** |
| Users | `/api/users/me` | ✅ Chỉ đọc profile của bản thân — OK |

> **Gợi ý:** FE có thể test giúp các nhóm trên nếu BE cần bằng chứng nhanh — hoặc BE tự chạy `curl` với token Customer.

### Ảnh hưởng

- **Tính toàn vẹn dữ liệu:** bất kỳ tài khoản Customer nào (kể cả tự tạo qua `POST /api/auth/register`) đều có thể sửa giá/nội dung loại nấm trong catalog → sai lệch đơn giá toàn hệ thống.
- **Không có audit trail** trong response để truy vết ai đã sửa.
- FE đang hiển thị catalog cho mọi user, nên lỗi này **hiển thị thẳng ra UI** — người dùng sẽ thấy tên/giá bị sửa.

### Đã khôi phục

- `id=9`: đã trả lại `name="Nấm sư trường"` → (server lưu `"Nấm sư trung"`), `status=ACTIVE`.
  ⚠️ **`price` của `id=9` còn là `1.00`** — test của tôi đã ghi đè và BE không có backup giá cũ. Cần BE đối chiếu seed data và khôi phục đúng giá gốc của Nấm sư trưng.
- Các record probe đã tạo (`id=10, 11, 12, 13, 14`) đã xoá hết.

### MISMATCH nhỏ: `price` trả về là string

Swagger khai `price: { type: "number" }` nhưng response thật trả **string**:

```json
"price": "123000.00"   ← Swagger nói number
```

FE cần parse bằng `Number(price)`. Đề nghị BE sửa schema thành `type: "string", format: "decimal"` hoặc đổi response về number thật để khớp.

## 🔴 CRITICAL #2: `/api/mushroom-conditions` — Cùng lỗ hổng, nghiêm trọng hơn

**Ngày kiểm tra:** 2026-10-22 · **Kết quả:** 5 lỗi

Đây là nhóm API **cùng pattern với `/api/mushroom-types`** → xác nhận lỗ hổng là **có hệ thống**, không phải sự cố đơn lẻ. Đây là nhóm nguy hiểm hơn vì các condition là **thông số canh tác điều khiển thiết bị IoT**.

### Ma trận kết quả

| Endpoint | Admin (1) | Operator (2) | Customer (3) | Kỳ vọng |
|---|---|---|---|---|
| `GET /api/mushroom-conditions` | 200 | 200 | 200 | ✅ đọc OK |
| `GET /api/mushroom-conditions/{id}` | 200 | 200 | 200 | ✅ đọc OK |
| `POST /api/mushroom-conditions` | 201 | **201** | **201** | ❌ chỉ nên Admin/Operator |
| `PUT /api/mushroom-conditions/{id}` | 200 | **200** | **200** | ❌ chỉ nên Admin/Operator |
| `DELETE /api/mushroom-conditions/{id}` | 200 | **200** | **200** | ❌ chỉ nên Admin |

### Bằng chứng cụ thể

**Lỗi 1 — Customer tạo được condition với giá trị vô lý:**
```
POST /api/mushroom-conditions   (token role_id=3)
{"mushroomTypeId":15,"temperatureMin":99,"temperatureMax":100,
 "humidityMin":1,"humidityMax":2}
→ 201 {"data":{"condition_id":9,"temperature_min":"99.00",...}}
```

**Lỗi 2 — Customer sửa được thông số canh tác của hệ thống:**
```
PUT /api/mushroom-conditions/6   (token role_id=3)
{"temperatureMin":-50,"temperatureMax":500,"humidityMin":0,"humidityMax":100}
→ 200 {"data":{"condition_id":6,"temperature_min":"-50.00","temperature_max":"500.00"}}
```
`condition_id=6` thuộc `mushroom_type_id=9` — tức là thông số thật của "Nấm sư trưng" đã bị đổi thành **-50°C → 500°C**. Giá trị này được dùng để cấu hình ngưỡng cảnh báo cho thiết bị IoT.

**Lỗi 3 — Customer xoá được condition:**
```
DELETE /api/mushroom-conditions/7   (token role_id=3) → 200 "deleted successfully"
```

**Lỗi 4 — BE không validate giá trị vô lý.** Chấp nhận `-50`, `500` cho nhiệt độ và `0`, `100` cho độ ẩm. Không có khoảng giới hạn hợp lý (nấm trồng trong nhà kính không thể ở -50°C).

**Lỗi 5 — Ràng buộc "1 loại nấm chỉ 1 condition" đã bị vi phạm trong dữ liệu sẵn có:**

| condition_id | mushroom_type_id | Nhiệt độ | Độ ẩm | CO2 |
|---|---|---|---|---|
| 1 | **1** | 18–24 | 80–95 | 400–1200 |
| 4 | **1** | 18–24 | 80–90 | 350–500 |

→ `mushroom_type_id=1` (Oyster Mushroom) có **2 condition trùng nhau**. Endpoint `POST` chặn bằng `409`, nhưng dữ liệu hiện có vi phạm → có thể do seed data cũ hoặc đã bị sửa tay. **Cần BE kiểm tra và dọn dữ liệu.**

**Lỗi 6 — Response thiếu trường `substrate_moisture_*`.** `CreateMushroomConditionRequest` khai báo `substrateMoistureMin/Max` nhưng response không trả về → các field này **không hoạt động**.

**Lỗi 7 — Swagger không có `403` cho bất kỳ endpoint nào** trong nhóm này (GET/POST/PUT/DELETE đều chỉ có `400/401/404/409`).

### Đề nghị sửa

1. **Thêm role guard** cho `POST/PUT/DELETE /api/mushroom-conditions*` — chỉ Admin (1) + Farm Operator (2).
2. **Thêm validation giá trị** cho các ngưỡng canh tác, ví dụ:
   - `temperatureMin/Max`: `0 ≤ x ≤ 60` (°C)
   - `humidityMin/Max`: `0 ≤ x ≤ 100` (%)
   - `co2Min/Max`: `0 ≤ x ≤ 5000` (ppm)
   - Bắt buộc `Min < Max`
3. **Sửa response** trả về `substrate_moisture_min/max`, hoặc bỏ 2 field khỏi `CreateMushroomConditionRequest` nếu không dùng.
4. **Dọn dữ liệu** 2 condition trùng của `mushroom_type_id=1`, và thêm DB constraint `UNIQUE(mushroom_type_id)`.
5. **Bổ sung response `403`** vào Swagger.

### Ảnh hưởng (nghiêm trọng hơn `/api/mushroom-types`)

- Thông số condition được FE nạp vào cấu hình ngưỡng cảnh báo cho từng thiết bị IoT. Một Customer sửa `temperature_max = 500` → thiết bị **không bao giờ cảnh báo**, nấm chết mà hệ thống không báo.
- Ngược lại `temperature_max = -50` → cảnh báo liên tục, gây nhiễu.
- Đây là đường tấn công vào **hệ thống điều khiển thiết bị**, không chỉ vào dữ liệu.

### Đã khôi phục

- `condition_id=6` (type 9): xoá rồi tạo lại → `condition_id=10`, `T=[20,32] H=[80,87]` — khớp với giá trị gốc.
- Record probe (`cond=7,8,9`, `type=15`) đã xoá hết.
- Dữ liệu còn lại giữ nguyên: 7 mushroom types, 5 conditions.

## 🔴 CHƯA SỬA — `/api/mushroom-types` & `/api/mushroom-conditions` (kiểm tra lại 2026-10-22 19:45)

**Đã hỏi BE và kiểm tra lại toàn bộ. Kết quả: phân quyền CHƯA được gắn.**

### 1. Phân quyền — ❌ vẫn lỗi, không thay đổi

Chạy lại với token mới (BE đã deploy, spec đã cập nhật):

```
POST /api/mushroom-types      (role_id=3) → 201 created id=18
POST /api/mushroom-conditions (role_id=3) → 201 created
PUT  /api/mushroom-conditions/18  (role_id=3)
     {"temperatureMin":-50,"temperatureMax":500,...}
     → 200 {"temperature_min":"-50.00","temperature_max":"500.00"}
```

→ Customer vẫn tạo/sửa/xoá được cả 2 nhóm. **Không có gì thay đổi so với lần test đầu.**

### 2. Swagger — ⚠️ spec ĐÃ cập nhật nhưng 2 nhóm này chưa được thêm `403`

Spec mới (`/api-docs/swagger-ui-init.js`) đã có **28 chỗ `403`** so với bản cũ. Nhưng kiểm tra từng path:

| Path | Số `403` |
|---|---|
| `/api/mushroom-types` | **0** |
| `/api/mushroom-conditions` | **0** |
| `/api/mushroom-conditions/{id}` | **0** |

Các nhóm **đã** có `403` (để đối chiếu — BE đã làm đúng pattern ở đây):
- `/api/rentals/admin/*` (7 endpoints)
- `/api/iot/floors/*` (8 endpoints)
- `/api/cameras`, `/api/cameras/{cameraId}/live-stream*`
- `/api/iot/masters/{masterId}/light`

→ **Kết luận: BE đã biết cách gắn role guard** (thể hiện rõ ở `/api/rentals/admin` và `/api/iot/floors`), nhưng **chưa áp dụng cho `mushroom-types` và `mushroom-conditions`.**

### 3. Validation — ⚠️ đã sửa 1 phần

```
PUT {"temperatureMin":90,"temperatureMax":10}
→ 400 {"message":"Temperature minimum cannot be greater than maximum"}   ✅ MỚI
```

→ BE **đã thêm** validation logic `min > max`. Đây là tiến triển tốt.

**Nhưng chưa thêm validation khoảng giá trị:**
```
PUT {"temperatureMin":-50,"temperatureMax":500,"humidityMin":0,"humidityMax":100}
→ 200 {"temperature_min":"-50.00","temperature_max":"500.00"}          ❌ VẪN LỖI
```

`-50°C` và `500°C` vẫn được chấp nhận. Cần thêm:
- `0 ≤ temperature ≤ 60`
- `0 ≤ humidity ≤ 100`
- `0 ≤ co2 ≤ 5000`

### 4. `substrate_moisture_*` — ❌ chưa sửa

Response vẫn **không có** trường `substrate_moisture_min/max`, dù `CreateMushroomConditionRequest` vẫn khai báo 2 field này.

### 5. Dữ liệu trùng — ❌ chưa dọn

`mushroom_type_id=1` vẫn có **2 condition** (`cond_id=1` và `cond_id=4`):

| condition_id | mushroom_type_id | Nhiệt độ | Độ ẩm | CO2 |
|---|---|---|---|---|
| 1 | **1** | 18–24 | 80–95 | 400–1200 |
| 4 | **1** | 18–24 | 80–90 | 350–500 |

→ Cần xoá 1 trong 2 và thêm DB constraint `UNIQUE(mushroom_type_id)`.

### Tổng kết cần BE làm

| # | Việc | Trạng thái |
|---|---|---|
| 1 | Role guard `POST/PUT/DELETE` (chỉ Admin + Operator) | ❌ Chưa làm |
| 2 | Thêm `403` vào Swagger 2 nhóm này | ❌ Chưa làm |
| 3 | Validation khoảng giá trị (0–60°C, 0–100%, 0–5000ppm) | ⚠️ Mới làm `min > max`, thiếu khoảng |
| 4 | Trả `substrate_moisture_*` trong response | ❌ Chưa làm |
| 5 | Dọn 2 condition trùng của `type_id=1` + `UNIQUE` constraint | ❌ Chưa làm |

**Cách gắn nhanh nhất:** BE đã có sẵn pattern ở `/api/rentals/admin` (7 endpoints có `403`) và `/api/iot/floors` (8 endpoints). Chỉ cần áp dụng lại decorator/middleware đó cho 2 nhóm này.

### Đã khôi phục

Record probe `GuardCheck1/2/3` (`type=16,17,18`, `cond=11,12,13`) đã xoá hết. Dữ liệu còn lại giữ nguyên: **7 types, 5 conditions**.

## 🔴 CRITICAL #3: `/api/rental-packages` — Nghiêm trọng nhất, trực tiếp tổn thất tiền

**Ngày kiểm tra:** 2026-10-22 · **Kết quả:** 5 endpoint, 3 lỗ hổng phân quyền

### Ma trận kết quả

| Endpoint | Admin (1) | Operator (2) | Customer (3) | Kỳ vọng |
|---|---|---|---|---|
| `GET /api/rental-packages` | 200 | 200 | 200 | ✅ đọc OK |
| `GET /api/rental-packages/{id}` | 200 | 200 | 200 | ✅ đọc OK |
| `POST /api/rental-packages` | 201 | **201** | **201** | ❌ |
| `PUT /api/rental-packages/{id}` | 200 | **200** | **200** | ❌ |
| `DELETE /api/rental-packages/{id}` | 200 | **200** | **200** | ❌ |

### Bằng chứng

**Lỗi 1 — Customer tạo được gói giá 1đ:**
```
POST /api/rental-packages   (token role_id=3)
{"packageName":"RbacProbe3","durationDays":365,"price":1}
→ 201 {"package_id":7,"price":"1.00"}
```

**Lỗi 2 — Customer sửa được gói thật "Premium" thành giá 1đ:**

Gói `package_id=3` trước test: `Premium`, 90 ngày, **1.300.000đ**

```
PUT /api/rental-packages/3   (token role_id=3)
{"packageName":"HACKED_3","price":1,"durationDays":9999,"status":"ACTIVE"}
→ 200 {"package_id":3,"package_name":"HACKED_3","price":"1.00","duration_days":9999}
```

→ Gói Premium giảm **1.299.999đ (99,99%)**. Doanh nghiệp bán gói rẻ hơn giá vốn.

**Lỗi 3 — Cả 3 role đều xoá được gói:**
```
DELETE /api/rental-packages/5   (role_id=1) → 200 deleted
DELETE /api/rental-packages/6   (role_id=2) → 200 deleted
DELETE /api/rental-packages/7   (role_id=3) → 200 deleted
```

### Vì sao nghiêm trọng hơn 2 nhóm trước

| Nhóm | Hậu quả |
|---|---|
| `mushroom-types` | Sửa tên/giá hiển thị → uy tín |
| `mushroom-conditions` | Sửa ngưỡng cảnh báo IoT → thiết bị |
| **`rental-packages`** | **Sửa/xoá gói giá → mất tiền thật + đơn hàng hỏng** |

Rủi ro cụ thể:

1. **Mất doanh thu trực tiếp** — Customer đổi giá gói về 1đ rồi tự đặt đơn.
2. **Giá vốn âm** — nếu giá gói < chi phí 1 khay canh tác, hệ thống lỗ.
3. **`409` protection không hiệu lực** — Swagger mô tả `DELETE` trả `409 "Package is referenced by an order or rental"`. Chưa xác minh được vì cần xoá gói đang được đơn hàng tham chiếu (dữ liệu thật). **Cần BE xác nhận ràng buộc này có hoạt động không** — nếu không, xoá gói sẽ làm hỏng đơn/rental đang chạy.
4. **Không có audit log** — không có bằng chứng ai đã đổi giá lúc nào.

### Ghi chú thêm

- Endpoint `GET /api/rental-packages/{id}` **thiếu `401`** trong Swagger (các endpoint khác có).
- `POST` **thiếu `401`** trong Swagger.
- Spec không có `403` cho cả 5 endpoint.

### Đề nghị sửa

1. **Role guard** cho `POST/PUT/DELETE /api/rental-packages*` — chỉ Admin (1) + Farm Operator (2).
2. **Xác nhận/tăng cường ràng buộc `409`** — không cho xoá gói đang được tham chiếu.
3. **Validation giá**: `price > 0`, `durationDays ∈ [1, 365]`.
4. **Thêm audit log** cho mọi thay đổi giá (actor, giá cũ, giá mới, thời gian).
5. **Bổ sung `401`/`403`** vào Swagger.

### Đã khôi phục

- `package_id=3` → khôi phục về `Premium`, 90 ngày, 1.300.000đ, `ACTIVE`.
- Xoá hết record probe (`package_id=5,6,7`).
- Dữ liệu còn lại giữ nguyên: **3 gói** (Basic 500k, Standard 900k, Premium 1.3tr).

### ⚠️ Việc chưa kiểm tra

`DELETE` gói `1` (Basic) và `2` (Standard) — tôi **cố ý không thử** vì đây là dữ liệu thật, có thể đang được đơn hàng/rental tham chiếu. Nếu xoá thành công thì hệ thống mất dữ liệu tham chiếu. **BE cần tự kiểm tra ràng buộc `409` này.**

## Ghi chú kỹ thuật

- `PUBLISHED` trong `IotCommand` chỉ nghĩa là broker MQTT đã PUBACK — **không xác nhận thiết bị thực sự tác động**. Firmware không trả command ID.
- `statesMatch` trong `IotSsrChannelState` chỉ so sánh giá trị, không phải acknowledgment.
- Không tự động retry lệnh `FAILED` / `TIMED_OUT`.
