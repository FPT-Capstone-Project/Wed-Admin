# Module trung tâm trạng thái (`src/shared/i18n/status/`)

> **Nguồn sự thật duy nhất** cho mọi enum trạng thái hiển thị lên UI.
> BE trả về `PLANNED` / `ACTIVE` / `WAITING_EXPERT`… — **không bao giờ** render
> thẳng. Mọi thứ phải đi qua helper ở đây.

## Cấu trúc

```
src/shared/i18n/status/
├── types.ts      # StatusPresentation / StatusDictionary / StatusOption
├── registry.ts   # presentStatus() / statusLabel() / selectOptions() + STATUS_REGISTRY
├── session.ts    # Phiên canh tác (9 status, 4 giai đoạn, trạng thái thu hoạch)
├── harvest.ts    # Vụ thu hoạch, hình thức nhận, trạng thái bàn giao, phẩm cấp
├── order.ts      # Đơn hàng + thanh toán
├── iot.ts        # Master, tầng, rơ-le, control_state, run, command, event
├── issue.ts      # Sự cố, mức độ, giai đoạn bằng chứng, tình trạng khay
├── user.ts       # Tài khoản + vai trò
├── room.ts       # Phòng + khay (BE / UI / gán phiên) + thu hoạch lô thuê
├── package.ts    # Gói thuê, giống nấm, chu kỳ tính tiền
├── camera.ts     # Camera + phiên live stream
└── reference.ts  # Tham chiếu chéo, thông báo, cảnh báo
```

## API

```ts
import {
  presentStatus,     // → { label, tone }  — an toàn tuyệt đối
  statusLabel,       // → string           — nhãn dạng chuỗi
  selectOptions,     // → { value, label }[] — cho antd <Select>
  statusOptions,     // → StatusOption[]  — bản đầy đủ (có tone)
} from '@/shared/i18n/status'
```

### `presentStatus(dictionary, value, emptyLabel?)`

| Tình huống | Kết quả |
|---|---|
| `value` hợp lệ | `{ label: 'Đã bàn giao', tone: 'success' }` |
| `value` rỗng / `null` | `{ label: emptyLabel, tone: 'muted' }` |
| `value` không có trong từ điển | `{ label: 'Chưa xác định (XXX)', tone: 'muted' }` |

⚠ **Không bao giờ** throw, **không bao giờ** lộ giá trị gốc.

## Quy ước

1. **Tone** — dùng `SemanticTone` của design system
   (`ok | success | info | warning | danger | muted | neutral`).
   ❌ Không dùng màu preset của antd (`success`/`error`) vì **FAIL WCAG AA**.

2. **Badge** — render bằng `<StatusBadge {...presentStatus(dict, value)} />`
   (từ `src/shared/ui`), **không** dùng `<Tag>` của antd.

3. **Feature layer chỉ re-export** — file config cũ trong `features/*` được đổi
   thành `export { X as X_CONFIG } from '.../shared/i18n/status'` ⇒ import cũ
   vẫn chạy, nhưng không còn 2 nguồn sự thật.

4. **Guardrail** — ESLint rule `mcms/no-raw-status-in-jsx` (mức `error`) chặn
   render trực tiếp enum thô vào JSX.

## Thêm từ điển mới

1. Thêm vào file miền phù hợp trong `status/` (hoặc tạo file mới).
2. Đăng ký vào `STATUS_REGISTRY` (`registry.ts`) nếu muốn tra cứu theo tên miền.
3. Export từ `status/index.ts` (barrel).
4. Xoá bảng trùng ở feature layer, thay bằng re-export.

## Bảo trì

- Khi BE thêm enum mới → thêm vào từ điển **kèm tone phù hợp**.
- Khi đổi nhãn → sửa **ở 1 chỗ duy nhất** (file trong `status/`), mọi màn hình
  cùng nhận.
- Khi thêm trường enum mới cần hiển thị → thêm tên field vào
  `ENUM_FIELD_NAMES` trong `eslint-rules/no-raw-status-in-jsx.js` để guardrail
  tự động canh.
