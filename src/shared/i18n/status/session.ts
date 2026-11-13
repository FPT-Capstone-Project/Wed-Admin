/**
 * Từ điển trạng thái — **phiên canh tác** (cultivation session).
 *
 * ⚠ Nguồn sự thật duy nhất cho:
 *   - 9 trạng thái vòng đời phiên (`cultivation_sessions.status`).
 *   - 4 giai đoạn sinh trưởng (WF-03 — `growthStatus.enum`).
 *   - Trạng thái thu hoạch của phiên (`harvest_status`).
 *   - Tình trạng sức khoẻ phôi khi kiểm tra (`condition`).
 *
 * Feature layer (`features/sessions/components/*.config.ts`) chỉ **re-export**
 * từ đây ⇒ không có 2 nguồn sự thật, mà import cũ vẫn chạy nguyên.
 */

import type { StatusDictionary, StatusPresentation } from './types'

/** 9 trạng thái vòng đời phiên canh tác (giá trị gốc của BE). */
export type SessionStatusKey =
  | 'PENDING'
  | 'SPAWN_RESTING'
  | 'MYCELIAL_DEVELOPMENT'
  | 'READY_FOR_CULTIVATION'
  | 'CULTIVATING'
  | 'HARVEST_READY'
  | 'HARVESTING'
  | 'COMPLETED'
  | 'CANCELLED'

/** Nhóm trạng thái dùng cho bộ lọc rút gọn. */
export type SessionStatusGroupKey = 'CULTIVATING' | 'PENDING' | 'FINISHED'

/** Giai đoạn chuẩn bị và 4 giai đoạn sinh trưởng (WF-03). */
export type SessionGrowthStageKey =
  | 'PREPARATION'
  | 'FRUITING_INITIATION'
  | 'PINNING'
  | 'YOUNG_FRUITING'
  | 'MATURATION'

/**
 * 4 giai đoạn trồng nấm — **nghiệp vụ trồng nấm** (không phải enum BE).
 *
 * ⚠ Đây là cách gọi mà **người trồng nấm** dùng:
 *   1. `SPAWNING`   — **Ủ tơ**                (phôi đang ủ)
 *   2. `RUNNING`    — **Kéo tơ**              (tơ nấm phát triển)
 *   3. `FRUITING`   — **Nấm đang phát triển**
 *   4. `HARVESTING` — **Sẵn sàng thu hoạch** (chỉ khi phiên CHƯA kết thúc)
 *
 * ⚠ Ngoài 4 giai đoạn còn có `COMPLETED` — **trạng thái kết thúc**, KHÔNG
 *   phải giai đoạn sinh trưởng:
 *   - Phiên đã `COMPLETED` ⇒ hiển thị **"Hoàn thành"** (tiến độ 100 %),
 *     **tuyệt đối không** hiển thị "Sẵn sàng thu hoạch" (đã thu xong rồi).
 *
 * ⚠ BE dùng **2 enum khác nhau** cho cùng 1 vòng đời:
 *   - `cultivation_sessions.status` (vòng đời phiên)
 *   - `cultivation_progress.current_stage` (4 giai đoạn WF-03)
 *
 *   ⇒ Bảng ánh xạ dưới đây gộp cả 2 về **cùng 4 giai đoạn** để mọi màn
 *     hình hiển thị thống nhất cho người dùng.
 */
export type MushroomGrowthPhaseKey =
  | 'SPAWNING'
  | 'RUNNING'
  | 'FRUITING'
  | 'HARVESTING'
  | 'COMPLETED'

/** Nhãn + màu cho 4 giai đoạn trồng nấm (+ trạng thái kết thúc). */
export const MUSHROOM_GROWTH_PHASE_DICTIONARY: Record<
  MushroomGrowthPhaseKey,
  StatusPresentation
> = {
  SPAWNING: { tone: 'info', label: 'Ủ tơ' },
  RUNNING: { tone: 'info', label: 'Kéo tơ' },
  FRUITING: { tone: 'ok', label: 'Nấm đang phát triển' },
  HARVESTING: { tone: 'warning', label: 'Sẵn sàng thu hoạch' },
  // ⚠ Phiên đã kết thúc ⇒ "Hoàn thành" (KHÔNG phải "Sẵn sàng thu hoạch").
  COMPLETED: { tone: 'success', label: 'Hoàn thành' },
}

/**
 * Ánh xạ **trạng thái phiên** → giai đoạn trồng nấm.
 *
 * ⚠ Nghiệp vụ thực tế (xem `resolveGrowthPhase` để hiểu đầy đủ):
 *   - `SPAWN_RESTING` / `MYCELIAL_DEVELOPMENT` / `READY_FOR_CULTIVATION`
 *     ⇒ **"Ủ tơ"** (phôi đang ủ, chưa lên khay).
 *   - `CULTIVATING` ⇒ **"Kéo tơ"** (đã lên khay, Farm OP chưa ghi nhận ra quả).
 *   - `HARVEST_READY` / `HARVESTING` ⇒ **"Sẵn sàng thu hoạch"**.
 *   - `COMPLETED` ⇒ **"Hoàn thành"**.
 *
 * ⚠ `PENDING` / `CANCELLED` không thuộc 4 giai đoạn ⇒ `null`
 *   (UI hiển thị nhãn trạng thái tương ứng thay vì giai đoạn).
 * ⚠ `COMPLETED` ⇒ `COMPLETED` ("Hoàn thành"), **không** phải
 *   "Sẵn sàng thu hoạch" — phiên đã kết thúc thì đã thu xong.
 */
const SESSION_STATUS_TO_PHASE: Partial<
  Record<SessionStatusKey, MushroomGrowthPhaseKey>
> = {
  // ⚠ 3 trạng thái này đều là **giai đoạn 1 — "Ủ tơ"**: phôi đã được cấp
  //   cho khách nhưng vẫn đang ủ (chưa bố trí lên khay nuôi).
  SPAWN_RESTING: 'SPAWNING',
  MYCELIAL_DEVELOPMENT: 'SPAWNING',
  READY_FOR_CULTIVATION: 'SPAWNING',
  // ⚠ Lên khay ⇒ **giai đoạn 2 — "Kéo tơ"**. Chỉ khi Farm OP ghi nhận ra quả
  //   (`current_stage` = giai đoạn WF-03) thì mới nhảy sang "Nấm đang phát triển"
  //   — xem `resolveGrowthPhase`.
  CULTIVATING: 'RUNNING',
  HARVEST_READY: 'HARVESTING',
  HARVESTING: 'HARVESTING',
  COMPLETED: 'COMPLETED',
}

/**
 * Ánh xạ **giai đoạn WF-03** (`current_stage`) → giai đoạn trồng nấm.
 *
 * ⚠ 3 giai đoạn đầu (khai quả thể → ra nụ → nấm non) đều thuộc
 *   **"Nấm đang phát triển"**; chỉ `MATURATION` mới là
 *   **"Sẵn sàng thu hoạch"**.
 *
 * ⚠ `PREPARATION` (chuẩn bị, chưa lên khay) ⇒ **"Ủ tơ"**.
 */
const GROWTH_STAGE_TO_PHASE: Record<
  SessionGrowthStageKey,
  MushroomGrowthPhaseKey
> = {
  PREPARATION: 'SPAWNING',
  FRUITING_INITIATION: 'FRUITING',
  PINNING: 'FRUITING',
  YOUNG_FRUITING: 'FRUITING',
  MATURATION: 'HARVESTING',
}

/**
 * Các giai đoạn WF-03 mà Farm OP ghi nhận ⇒ **"Nấm đang phát triển"**.
 *
 * ⚠ BE có thể trả thêm giá trị `FRUITING` (ngoài 4 giai đoạn chuẩn) ⇒
 *   cũng tính vào nhóm "đang ra quả".
 */
const FRUITING_GROWTH_STAGES: ReadonlySet<string> = new Set([
  'FRUITING_INITIATION',
  'PINNING',
  'YOUNG_FRUITING',
  'FRUITING',
])

/** Trạng thái phiên → giai đoạn trồng nấm (`null` nếu không thuộc 4 giai đoạn). */
export function resolveGrowthPhaseFromStatus(
  status: SessionStatusKey | null | undefined,
): MushroomGrowthPhaseKey | null {
  if (!status) return null
  return SESSION_STATUS_TO_PHASE[status] ?? null
}

/** Giai đoạn WF-03 → giai đoạn trồng nấm (`null` nếu BE trả giá trị lạ). */
export function resolveGrowthPhaseFromStage(
  stage: SessionGrowthStageKey | string | null | undefined,
): MushroomGrowthPhaseKey | null {
  if (!stage) return null
  return GROWTH_STAGE_TO_PHASE[stage as SessionGrowthStageKey] ?? null
}

/**
 * Giai đoạn trồng nấm của 1 phiên — ưu tiên `current_stage` (giai đoạn WF-03
 * do Farm OP ghi nhận), fallback sang trạng thái phiên.
 *
 * ## Luồng nghiệp vụ thực tế
 *
 * | # | Giai đoạn | Khi nào áp dụng |
 * |---|-----------|----------------|
 * | 1 | **Ủ tơ** (`SPAWNING`) | `status` ∈ `SPAWN_RESTING` / `MYCELIAL_DEVELOPMENT` / `READY_FOR_CULTIVATION` — phôi đang ủ, chưa lên khay. `PENDING` vẫn là "Chờ xử lý". |
 * | 2 | **Kéo tơ** (`RUNNING`) | `status === 'CULTIVATING'` **và** Farm OP chưa ghi nhận giai đoạn ra quả — phôi vừa lên khay, tơ đang lan. |
 * | 3 | **Nấm đang phát triển** (`FRUITING`) | Farm OP cập nhật `current_stage` / `growth_status` ∈ `FRUITING_INITIATION` / `PINNING` / `YOUNG_FRUITING` / `FRUITING`. |
 * | 4 | **Sẵn sàng thu hoạch** (`HARVESTING`) | `current_stage === 'MATURATION'` hoặc `status` ∈ `HARVEST_READY` / `HARVESTING` (phiên chưa kết thúc). |
 * | — | **Hoàn thành** (`COMPLETED`) | `status === 'COMPLETED'` ⇒ luôn 100 %. |
 *
 * ⚠ **Phiên đã `COMPLETED`** ⇒ luôn trả `COMPLETED` ("Hoàn thành", 100 %),
 *   **không** phải "Sẵn sàng thu hoạch" — kể cả khi `current_stage` còn là
 *   `MATURATION` (Farm OP có thể chưa cập nhật khoảnh khắc cuối).
 *
 * ⚠ `CULTIVATING` mặc định là **"Kéo tơ"** (không nhảy thẳng sang "Nấm đang
 *   phát triển") — chỉ khi Farm OP thực sự ghi nhận giai đoạn ra quả mới
 *   chuyển sang giai đoạn 3.
 */
export function resolveGrowthPhase(
  stage: SessionGrowthStageKey | string | null | undefined,
  status: SessionStatusKey | string | null | undefined,
): MushroomGrowthPhaseKey | null {
  // ⚠ Ưu tiên trạng thái kết thúc hơn giai đoạn WF-03.
  const normalizedStatus =
    typeof status === 'string' ? status.trim().toUpperCase() : ''
  if (normalizedStatus === 'COMPLETED') return 'COMPLETED'

  const normalizedStage =
    typeof stage === 'string' ? stage.trim().toUpperCase() : ''

  // Giai đoạn 4 — trưởng thành ⇒ "Sẵn sàng thu hoạch".
  if (normalizedStage === 'MATURATION') return 'HARVESTING'

  // Giai đoạn 3 — Farm OP đã ghi nhận nấm đang ra quả.
  if (normalizedStage && FRUITING_GROWTH_STAGES.has(normalizedStage)) {
    return 'FRUITING'
  }

  // Giai đoạn 1 — phôi đang ủ (chưa lên khay).
  if (
    normalizedStatus === 'SPAWN_RESTING' ||
    normalizedStatus === 'MYCELIAL_DEVELOPMENT' ||
    normalizedStatus === 'READY_FOR_CULTIVATION'
  ) {
    return 'SPAWNING'
  }

  // Giai đoạn 4 — phiên đã được đánh dấu sẵn sàng thu hoạch.
  if (
    normalizedStatus === 'HARVEST_READY' ||
    normalizedStatus === 'HARVESTING'
  ) {
    return 'HARVESTING'
  }

  // Giai đoạn 2 — phôi đã lên khay, chưa có ghi nhận ra quả.
  if (normalizedStatus === 'CULTIVATING') return 'RUNNING'

  return resolveGrowthPhaseFromStatus(normalizedStatus as SessionStatusKey)
}

/** Trạng thái thu hoạch của phiên (`cultivation_sessions.harvest_status`). */
export type SessionHarvestStatusKey = 'NOT_READY' | 'HARVEST_READY'

/** Tình trạng sức khoẻ phôi khi kiểm tra (`condition`). */
export type SpawnConditionKey = 'NORMAL' | 'WARNING' | 'ABNORMAL'

/**
 * Trạng thái **gán khay** trong phiên (`cultivation_session_trays.status`).
 *
 * ⚠ Khác với `cultivation_trays.status` (trạng thái vật lý của khay — nằm ở
 *   `room.ts`): đây là trạng thái **quan hệ gán** khay ↔ phiên canh tác ⇒
 *   thuộc phạm vi **phiên** nên khai báo ở đây.
 */
export type SessionTrayAssignmentStatusKey = 'ACTIVE' | 'RELEASED'

/**
 * Presentation của trạng thái phiên.
 *
 * ⚠ KHÔNG còn `step` (bước trong vòng đời) — trước đây dùng để **suy ra**
 *   tiến độ mặc định khi BE chưa trả `progress_percent`. Nay tiến độ
 *   **chỉ** lấy từ `progress_percent` do Farm OP cập nhật qua API của phiên
 *   ⇒ không còn con số "nhẩm" theo thời gian.
 */
export interface SessionStatusPresentation extends StatusPresentation {
  readonly shortLabel: string
}

/**
 * Nhãn + màu cho 9 trạng thái phiên canh tác.
 *
 * ⚠ Thứ tự khớp với vòng đời thật:
 *   PENDING → SPAWN_RESTING → MYCELIAL_DEVELOPMENT → READY_FOR_CULTIVATION
 *   → CULTIVATING → HARVESTING → COMPLETED | CANCELLED
 */
export const SESSION_STATUS_DICTIONARY: Record<
  SessionStatusKey,
  SessionStatusPresentation
> = {
  PENDING: {
    tone: 'warning',
    label: 'Chờ xử lý',
    shortLabel: 'Chờ xử lý',
  },
  SPAWN_RESTING: {
    tone: 'info',
    label: 'Ủ tơ',
    shortLabel: 'Ủ tơ',
  },
  MYCELIAL_DEVELOPMENT: {
    // ⚠ Giai đoạn 1 — **"Ủ tơ"** (phôi đang ủ, chưa lên khay) — giống
    //   `SPAWN_RESTING`; khác `CULTIVATING` (đã lên khay ⇒ "Kéo tơ").
    tone: 'info',
    label: 'Ủ tơ',
    shortLabel: 'Ủ tơ',
  },
  READY_FOR_CULTIVATION: {
    tone: 'info',
    label: 'Sẵn sàng canh tác',
    shortLabel: 'Sẵn sàng canh tác',
  },
  CULTIVATING: {
    // ⚠ Giai đoạn 2 — **"Kéo tơ"** (phôi đã lên khay, Farm OP chưa ghi nhận
    //   ra quả). "Nấm đang phát triển" chỉ xuất hiện khi Farm OP cập nhật
    //   `current_stage` sang giai đoạn WF-03 — xem `resolveGrowthPhase`.
    tone: 'ok',
    label: 'Kéo tơ',
    shortLabel: 'Kéo tơ',
  },
  HARVEST_READY: {
    tone: 'warning',
    label: 'Sẵn sàng thu hoạch',
    shortLabel: 'Sẵn sàng thu hoạch',
  },
  HARVESTING: {
    tone: 'warning',
    label: 'Đang thu hoạch',
    shortLabel: 'Thu hoạch',
  },
  COMPLETED: {
    // ⚠ Tone `success` (**xanh dương**) — KHÔNG dùng `muted` (xám) để phân
    //   biệt rõ "đã hoàn tất" (xanh dương) với "đã huỷ" (đỏ) / "đang chạy"
    //   (xanh lá) trong cùng 1 bảng.
    //
    // ⚠ Nhãn là **"Hoàn thành"** — KHÔNG phải "Sẵn sàng thu hoạch": phiên đã
    //   kết thúc ⇒ đã thu xong, không còn ở giai đoạn "sẵn sàng thu hoạch".
    tone: 'success',
    label: 'Hoàn thành',
    shortLabel: 'Hoàn thành',
  },
  CANCELLED: {
    tone: 'danger',
    label: 'Đã huỷ',
    shortLabel: 'Đã huỷ',
  },
}

/**
 * Badge theo **nhóm trạng thái** — dùng cho bộ lọc & cột trạng thái rút gọn.
 *
 * ⚠ Yêu cầu hiển thị:
 *   - Đang canh tác → **xanh lá cây** (`ok`).
 *   - Chờ xử lý    → **vàng cam** (`warning`).
 *   - Hoàn tất      → **xanh dương** (`success`).
 *   - Đã huỷ       → đỏ (`danger`).
 */
export const SESSION_GROUP_DICTIONARY: Record<
  SessionStatusGroupKey,
  StatusPresentation
> = {
  CULTIVATING: { tone: 'ok', label: 'Đang canh tác' },
  PENDING: { tone: 'warning', label: 'Chờ xử lý' },
  FINISHED: { tone: 'success', label: 'Đã thu hoạch' },
}

/** Nhóm trạng thái của 1 phiên canh tác. */
export function resolveSessionGroup(
  status: SessionStatusKey,
): SessionStatusGroupKey {
  if (status === 'CANCELLED') return 'FINISHED'
  if (status === 'COMPLETED') return 'FINISHED'
  if (status === 'PENDING') return 'PENDING'
  return 'CULTIVATING'
}

/**
 * ⚠ KHÔNG còn bảng tiến độ mặc định theo trạng thái.
 *
 *   Trước đây `SESSION_DEFAULT_PROGRESS` suy ra % từ "bước trong vòng đời"
 *   khi BE chưa trả `progress_percent` ⇒ hiển thị con số **không có thật**
 *   (vd `CULTIVATING` → 65 % dù nhân viên chưa cập nhật gì).
 *
 *   Nay tiến độ **chỉ** lấy từ `progress_percent` của Phiên canh tác
 *   (Farm OP cập nhật qua API của phiên) ⇒ không có số liệu bịa ra.
 */

/**
 * Nhãn cho giai đoạn chuẩn bị và sinh trưởng (WF-03).
 *
 * ⚠ Dùng **đúng** nhãn nghiệp vụ trồng nấm (4 giai đoạn):
 *   - `FRUITING_INITIATION` / `PINNING` / `YOUNG_FRUITING` → **Nấm đang phát triển**
 *   - `MATURATION`                                        → **Sẵn sàng thu hoạch**
 *
 *   ⚠ Giai đoạn **Ủ tơ** / **Kéo tơ** là *trạng thái phiên*
 *     (`SPAWN_RESTING` / `MYCELIAL_DEVELOPMENT`) — xem
 *     `SESSION_STATUS_DICTIONARY` và `MUSHROOM_GROWTH_PHASE_DICTIONARY`.
 */
export const SESSION_GROWTH_STAGE_DICTIONARY: Record<
  SessionGrowthStageKey,
  StatusPresentation & { readonly shortLabel: string }
> = {
  PREPARATION: {
    tone: 'info',
    label: 'Ủ tơ',
    shortLabel: 'Ủ tơ',
  },
  FRUITING_INITIATION: {
    tone: 'info',
    label: 'Nấm đang phát triển',
    shortLabel: 'Nấm đang phát triển',
  },
  PINNING: {
    tone: 'info',
    label: 'Nấm đang phát triển',
    shortLabel: 'Nấm đang phát triển',
  },
  YOUNG_FRUITING: {
    tone: 'ok',
    label: 'Nấm đang phát triển',
    shortLabel: 'Nấm đang phát triển',
  },
  MATURATION: {
    tone: 'warning',
    label: 'Sẵn sàng thu hoạch',
    shortLabel: 'Sẵn sàng thu hoạch',
  },
}

/**
 * Nhãn cho trạng thái thu hoạch của phiên.
 *
 * ⚠ BE chỉ dùng 2 giá trị: `NOT_READY` và `HARVEST_READY`.
 */
export const SESSION_HARVEST_STATUS_DICTIONARY: Record<
  SessionHarvestStatusKey,
  StatusPresentation
> = {
  NOT_READY: { tone: 'muted', label: 'Chưa sẵn sàng' },
  HARVEST_READY: { tone: 'warning', label: 'Sẵn sàng thu hoạch' },
}

/**
 * Badge "Đã thu hoạch" — dùng cho phiên đã `COMPLETED`.
 *
 * ⚠ Khi phiên đã kết thúc, BE vẫn có thể giữ `harvest_status = 'HARVEST_READY'`
 *   ⇒ hiển thị badge cam "Sẵn sàng thu hoạch" sẽ gây hiểu nhầm cho người dùng
 *   (phiên đó đã thu xong rồi!). Vì vậy phiên `COMPLETED` luôn hiển thị
 *   "Đã thu hoạch" với tone xanh lá.
 */
export const SESSION_HARVESTED_PRESENTATION: StatusPresentation = {
  tone: 'ok',
  label: 'Đã thu hoạch',
}

/**
 * Trạng thái thu hoạch **hiển thị** của 1 phiên.
 *
 * ⚦ Quy tắc nghiệp vụ:
 *   - `status === 'COMPLETED'` ⇒ **"Đã thu hoạch"** (tone `ok`) — KHÔNG dùng
 *     badge cam "Sẵn sàng thu hoạch" cho phiên đã kết thúc.
 *   - Ngược lại ⇒ lấy theo `harvest_status` (`NOT_READY` / `HARVEST_READY`).
 *
 * @param status        Trạng thái vòng đời phiên (`cultivation_sessions.status`).
 * @param harvestStatus Trạng thái thu hoạch (`cultivation_sessions.harvest_status`).
 * @returns `null` khi không có thông tin thu hoạch để hiển thị.
 */
export function resolveSessionHarvestStatus(
  status: SessionStatusKey | string | null | undefined,
  harvestStatus: SessionHarvestStatusKey | string | null | undefined,
): StatusPresentation | null {
  if (typeof status === 'string' && status.trim().toUpperCase() === 'COMPLETED') {
    return SESSION_HARVESTED_PRESENTATION
  }

  if (!harvestStatus) return null

  const key = String(harvestStatus).trim().toUpperCase()
  return SESSION_HARVEST_STATUS_DICTIONARY[key as SessionHarvestStatusKey] ?? null
}

/** Nhãn cho tình trạng sức khoẻ phôi khi kiểm tra. */
export const SPAWN_CONDITION_DICTIONARY: StatusDictionary = {
  NORMAL: { tone: 'ok', label: 'Bình thường' },
  WARNING: { tone: 'warning', label: 'Cảnh báo' },
  ABNORMAL: { tone: 'danger', label: 'Bất thường' },
}

/**
 * Trạng thái gán khay trong phiên canh tác.
 *
 * ⚠ `ACTIVE` = khay đang được dùng cho phiên; `RELEASED` = đã thu hồi.
 */
export const SESSION_TRAY_ASSIGNMENT_DICTIONARY: Record<
  SessionTrayAssignmentStatusKey,
  StatusPresentation
> = {
  ACTIVE: { tone: 'ok', label: 'Đang sử dụng' },
  RELEASED: { tone: 'muted', label: 'Đã thu hồi' },
}

/**
 * Giai đoạn của **mốc tiến độ** (`cultivation_progress.current_stage`).
 *
 * ⚠ Cột này trộn **2 enum khác nhau**:
 *   - 4 giai đoạn sinh trưởng (WF-03): `FRUITING_INITIATION`…
 *   - trạng thái phiên khi phôi vừa được cấp: `SPAWN_PENDING`,
 *     `PENDING`, `SPAWN_RESTING`, `MYCELIAL_DEVELOPMENT`,
 *     `READY_FOR_CULTIVATION`.
 *
 *   ⇒ Gom vào 1 từ điển để timeline không bao giờ lộ chuỗi tiếng Anh.
 */
export const SESSION_PROGRESS_STAGE_DICTIONARY: StatusDictionary = {
  ...SESSION_GROWTH_STAGE_DICTIONARY,
  SPAWN_PENDING: { tone: 'warning', label: 'Chờ xử lý phôi' },
  PENDING: { tone: 'warning', label: 'Chờ xử lý' },
  SPAWN_RESTING: { tone: 'info', label: 'Ủ tơ' },
  MYCELIAL_DEVELOPMENT: { tone: 'info', label: 'Kéo tơ' },
  READY_FOR_CULTIVATION: { tone: 'info', label: 'Sẵn sàng canh tác' },
  UNKNOWN: { tone: 'muted', label: 'Chưa xác định' },
}
