# Đặc tả biểu đồ môi trường Dashboard cho Mobile

Tài liệu này mô tả hành vi và kiểu hiển thị của biểu đồ nhiệt độ/độ ẩm trong
Dashboard Web để đội Flutter / React Native có thể triển khai tương đương.
Các giá trị bên dưới được đối chiếu từ component Recharts, utility, design
tokens và CSS hiện tại. Các trục Y thay đổi theo dữ liệu; không hardcode một
khoảng cố định như `24–32°C` hoặc `70–100%RH`.

## 1. Cấu trúc và dữ liệu

- Mỗi tầng (`floor`) hiển thị trong một card và có một biểu đồ đường riêng.
- Tiêu đề card là `floorName`, cỡ chữ 14 px.
- Dữ liệu là các bucket đã được gộp ở backend; Mobile không tính trung bình
  lại. Mỗi điểm gồm:

  ```json
  {
    "timestamp": 1767225600000,
    "temperature": 25.3,
    "humidity": 85.1
  }
  ```

- `timestamp` là epoch milliseconds, tại đầu bucket; điểm được sắp theo thời
  gian tăng dần.
- Mặc định cửa sổ API là 24 giờ, bucket 15 phút (96 bucket), nhưng hãy dùng
  `from`, `to`, `bucketMs` backend trả về thay vì giả định cố định. `to` của
  API là exclusive.
- Thiếu số đo là `null`, không phải `0`. Chuẩn hóa số không hợp lệ / thiếu về
  `null` và giữ nguyên điểm để biểu đồ thể hiện khoảng trống.
- Tầng không có điểm bị bỏ khỏi danh sách card. Có danh sách tầng rỗng thì
  hiển thị “Chưa có dữ liệu tầng”; một tầng có điểm nhưng cả hai series đều
  thiếu số đo thì hiển thị “Chưa có dữ liệu” thay phần đồ thị.

Nguồn dữ liệu và DTO:
[`environment-history.utils.ts`](../src/features/dashboard/utils/environment-history.utils.ts),
[`environment-history.ts`](../src/types/environment-history.ts).

## 2. Đường dữ liệu và nội suy

| Thuộc tính | Nhiệt độ | Độ ẩm |
|---|---|---|
| Nhãn | `Nhiệt độ (°C)` | `Độ ẩm (%RH)` |
| Màu đường | `#c2413b` (coral/đỏ) | `#2563eb` (xanh dương) |
| Độ dày | 2 px | 2 px |
| Kiểu nét | Liền | Đứt, `strokeDasharray = "4 4"` (4 px vẽ, 4 px trống) |
| Điểm thường | Ẩn (`dot = false`) | Ẩn (`dot = false`) |
| Điểm đang focus | Bán kính 4 px | Bán kính 4 px |
| Nối qua null | Không (`connectNulls = false`) | Không (`connectNulls = false`) |
| Nội suy | `monotone` | `monotone` |

`monotone` là nội suy đơn điệu của Recharts, không phải nối tuyến tính thuần.
Khi một metric là `null`, ngắt riêng đường metric đó tại bucket tương ứng;
không nối qua khoảng thiếu. Metric còn lại ở cùng timestamp vẫn có thể vẽ.

Animation của hai series đang bật trên Web (`isAnimationActive = true`).
Mobile có thể dùng animation tương đương khi tải/cập nhật dữ liệu, nhưng không
được làm biến dạng giá trị, thứ tự điểm hoặc cách ngắt khoảng trống.

Màu series lấy từ [`tokens.ts`](../src/app/theme/tokens.ts). Màu đỏ mô tả
nhiệt độ, không đại diện cho trạng thái cảnh báo.

## 3. Hai trục Y

Mỗi tầng có hai trục độc lập, mỗi trục lấy domain từ các giá trị hữu hạn của
metric tương ứng trong toàn bộ `points` của tầng đó:

- Trái: nhiệt độ, `temperature`.
- Phải: độ ẩm, `humidity`, đặt ở cạnh phải.
- Tick label định dạng một chữ số thập phân (`toFixed(1)`); đơn vị là `°C`
  hoặc `%RH`.
- Màu tick là `#5b6b80`, cỡ chữ 12 px.
- Không có giá trị mẫu: domain `[0, 4]`, ticks `[0, 1, 2, 3, 4]`.

### Thuật toán tạo domain và ticks

Hàm `climateAxis` tính riêng cho nhiệt độ và độ ẩm:

1. Lọc bỏ `null`, `NaN`, `Infinity`.
2. Với `min` và `max` của tập hữu hạn, tính
   `rawStep = max(1, (max - min) / 4)`.
3. Tính `scale = 10 ^ floor(log10(rawStep))`.
4. Chọn step đầu tiên trong `[1, 2, 5, 10] * scale` lớn hơn hoặc bằng
   `rawStep`.
5. Làm tròn domain ra ngoài theo bội số step:
   `low = floor(min / step) * step`,
   `high = ceil(max / step) * step`.
6. Nếu `low == high` (mọi mẫu bằng nhau), mở rộng một step ở cả hai phía.
7. Tạo ticks cách nhau đúng một step, bao gồm cả hai đầu domain.

Do đó các giá trị miền và step phụ thuộc mẫu đo; ví dụ `24.0–32.0°C` chỉ là
một khả năng, không phải cấu hình mặc định. Utility gốc:
[`climate-axis.utils.ts`](../src/features/dashboard/utils/climate-axis.utils.ts).

Ví dụ giả lập:

```ts
function climateAxis(values: Array<number | null>) {
  const finite = values.filter(
    (v): v is number => v !== null && Number.isFinite(v),
  )
  if (finite.length === 0) {
    return { domain: [0, 4], ticks: [0, 1, 2, 3, 4] }
  }

  const min = Math.min(...finite)
  const max = Math.max(...finite)
  const rawStep = Math.max(1, (max - min) / 4)
  const scale = 10 ** Math.floor(Math.log10(rawStep))
  const multiplier = [1, 2, 5, 10].find(n => n * scale >= rawStep) ?? 10
  const step = multiplier * scale

  let low = Math.floor(min / step) * step
  let high = Math.ceil(max / step) * step
  if (low === high) {
    low -= step
    high += step
  }
  const count = Math.round((high - low) / step)
  const ticks = Array.from({ length: count + 1 }, (_, i) => low + i * step)
  return { domain: [low, high], ticks }
}
```

Pseudo cấu hình:

```json
{
  "temperatureAxis": {
    "side": "left",
    "dataKey": "temperature",
    "domainAndTicks": "climateAxis(points.map(p => p.temperature))",
    "numberFormat": "fixed(1)",
    "unit": "°C",
    "tickColor": "#5b6b80",
    "tickFontSize": 12
  },
  "humidityAxis": {
    "side": "right",
    "dataKey": "humidity",
    "domainAndTicks": "climateAxis(points.map(p => p.humidity))",
    "numberFormat": "fixed(1)",
    "unit": "%RH",
    "tickColor": "#5b6b80",
    "tickFontSize": 12
  }
}
```

## 4. Trục X và lưới

### X-Axis

- Dùng timestamp epoch milliseconds làm trục số, không dùng index của mảng.
- Nhãn giờ theo locale `vi-VN`, 24 giờ, mẫu `HH:mm` (hai chữ số giờ/phút).
- Domain giữ cửa sổ thời gian API và các điểm thực tế:
  - Đầu trục là `min(from, timestamp điểm đầu)`.
  - Cuối trục là `max(to, timestamp điểm cuối + bucketMs)`.
  - Nếu thiếu `from`/`to`, suy ra từ điểm đầu/cuối; domain hỏng/rỗng được
    thay bằng khoảng tối thiểu một bucket.
- Bucket mặc định nếu `bucketMs` không hợp lệ/không có là 15 phút
  (`900000 ms`).
- Trên Web, tick có `minTickGap = 45 px`; Mobile nên giảm mật độ nhãn theo
  chiều rộng thực tế để tránh chồng chữ, nhưng vẫn giữ format `HH:mm`.

### CartesianGrid

- Màu: `#e2e8f0` (biến CSS `--mcms-border`).
- Nét đứt: `strokeDasharray = "3 3"` (3 px vẽ, 3 px trống).
- Web không truyền `horizontal` hoặc `vertical`, do đó sử dụng mặc định
  Recharts: hiển thị cả đường lưới ngang và dọc.

## 5. Tooltip và chú giải

### Tooltip

Web hiển thị tooltip khi hover/focus điểm; Mobile cần hiện cùng nội dung khi
tap/chạm giữ một bucket. Tooltip dùng timestamp của điểm và hai metric:

1. Thời gian `HH:mm`.
2. `Nhiệt độ: {value một chữ số thập phân}°C`.
3. `Độ ẩm: {value một chữ số thập phân}%RH`.
4. Mỗi metric có dòng mục tiêu theo ngưỡng hiện tại của tầng:
   `≥ {min}` và/hoặc `≤ {max}`, kèm đơn vị. Nếu không có ngưỡng thì ghi
   `Chưa có ngưỡng`.
5. Giá trị vượt ngưỡng có thêm `▲ vượt ngưỡng`; thấp hơn có `▼ dưới ngưỡng`.
   Có thể có dòng giải thích, ví dụ `Nhiệt độ cao hơn ngưỡng 1.2°C`.
6. Thiếu giá trị hiển thị `—` (không kèm đơn vị), không chuyển thành 0.
   Màu giá trị là màu series (`#c2413b`/`#2563eb`); giá trị thiếu dùng
   `#5b6b80`.

So sánh vượt ngưỡng là strict: `value > max` nghĩa là cao, `value < min`
nghĩa là thấp; bằng ngưỡng vẫn trong khoảng. Tooltip dùng ngưỡng hiện tại của
tầng, không phải ngưỡng lịch sử. Ngưỡng nhiệt độ có thể được bổ sung từ
fallback ở FE khi API lịch sử không cung cấp; Mobile nên dùng ngưỡng tương
ứng đang có trong model/API của ứng dụng.

Phong cách bề mặt tooltip Web: nền trắng `#ffffff`, chữ chính `#0f172a`, viền
`#e2e8f0` 1 px, bo góc 8 px, padding 12 px, font 12 px, line-height 1.5,
shadow nhỏ; chiều rộng tối đa 80vw. Các giá trị lấy từ
[`chart-styles.ts`](../src/shared/ui/charts/chart-styles.ts) và
[`tokens.ts`](../src/app/theme/tokens.ts).

### Legend

Legend nằm dưới biểu đồ, luôn hiện cả hai series, không có thao tác ẩn/hiện:

- Mẫu nhiệt độ: đường liền `#c2413b`, dày 2 px; nhãn `Nhiệt độ (°C)`.
- Mẫu độ ẩm: đường đứt `#2563eb`, dày 2 px; nhãn `Độ ẩm (%RH)`.
- Chữ `#5b6b80`, cỡ 12 px; cho phép xuống dòng, khoảng cách item 8 px,
  padding dọc 8 px.

## 6. Bố cục và màu nền tham chiếu

- Web chia card theo lưới: một card mỗi hàng trên màn nhỏ (`xs=24`), hai card
  mỗi hàng từ breakpoint `lg` (`lg=12`). Mobile nên dùng một card mỗi hàng.
- Card nền `#ffffff`, viền `#e2e8f0` 1 px, bo góc `8 px`, không đổ bóng;
  phần thân padding 12 px.
- Vùng biểu đồ 280 px trên Web, tối thiểu 240 px. Đây là kích thước tham
  chiếu web; trên điện thoại ưu tiên khả năng đọc nhãn hai trục và tooltip,
  đồng thời không làm mất series/legend.
- Màu chữ phụ / ticks / legend `#5b6b80`; màu chữ chính tooltip `#0f172a`.

CSS liên quan: [`dashboard.css`](../src/features/dashboard/dashboard.css).
Màu/token: [`App.css`](../src/App.css) và
[`tokens.ts`](../src/app/theme/tokens.ts).

## 7. Pseudocode ghép dữ liệu và cấu hình chart

Pseudocode dưới đây là hợp đồng hành vi, không phụ thuộc thư viện biểu đồ:

```ts
const chart = {
  data: points, // timestamp tăng dần; null được giữ nguyên
  x: {
    type: 'time',
    domain: resolveEnvironmentDomain(from, to, bucketMs, points),
    label: timestamp => formatDate(timestamp, 'HH:mm', 'vi-VN'),
  },
  grid: {
    color: '#e2e8f0',
    dash: [3, 3],
    horizontal: true,
    vertical: true,
  },
  axes: [
    { key: 'temperature', side: 'left', ...climateAxis(points.map(p => p.temperature)), unit: '°C' },
    { key: 'humidity', side: 'right', ...climateAxis(points.map(p => p.humidity)), unit: '%RH' },
  ],
  series: [
    { key: 'temperature', color: '#c2413b', width: 2, dash: [], curve: 'monotone', connectNulls: false, markers: false, focusRadius: 4 },
    { key: 'humidity', color: '#2563eb', width: 2, dash: [4, 4], curve: 'monotone', connectNulls: false, markers: false, focusRadius: 4 },
  ],
  legend: [
    { label: 'Nhiệt độ (°C)', color: '#c2413b', dash: [] },
    { label: 'Độ ẩm (%RH)', color: '#2563eb', dash: [4, 4] },
  ],
}
```

### Tham chiếu mã nguồn

- [`EnvironmentChart.tsx`](../src/features/dashboard/components/EnvironmentChart.tsx):
  cấu hình Recharts, tick, tooltip, legend và series.
- [`climate-axis.utils.ts`](../src/features/dashboard/utils/climate-axis.utils.ts):
  domain và ticks động cho trục Y.
- [`environment-history.utils.ts`](../src/features/dashboard/utils/environment-history.utils.ts):
  chuẩn hóa dữ liệu, domain thời gian và ánh xạ tầng.
- [`measurement-format.ts`](../src/shared/utils/measurement-format.ts):
  formatter một chữ số thập phân và cách biểu diễn thiếu dữ liệu.
