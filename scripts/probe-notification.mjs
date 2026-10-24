/**
 * Script kiểm tra endpoint POST /api/rentals/admin/{rentalId}/notifications.
 *
 * Mục tiêu: xác nhận BE đọc field nào trong body — `type` hay
 * `notification_type` — vì `notification.service.js` đọc `body.type` trong
 * khi schema `Notification` lại dùng `notification_type`.
 * FE gửi CẢ HAI key; script này gửi riêng từng key để biết chính xác
 * BE lấy giá trị từ đâu (nếu gửi cả hai thì không phân biệt được).
 *
 * Chạy: node scripts/probe-notification.mjs
 * Dùng email/mật khẩu admin qua env: MCMS_EMAIL, MCMS_PASSWORD
 *
 * ⚠ Gửi notification thật cho khách của vụ thuê → dùng vụ thuê test.
 */
const BASE = process.env.PROBE_BASE ?? 'http://localhost:5173'
const email = process.env.MCMS_EMAIL
const password = process.env.MCMS_PASSWORD

/** BE chỉ cho gửi cho rental ở 3 trạng thái này (`NOTIFIABLE_RENTAL_STATUSES`). */
const NOTIFIABLE = ['CONFIRMED', 'PREPARING', 'ACTIVE']

if (!email || !password) {
  console.error('Thiếu MCMS_EMAIL / MCMS_PASSWORD')
  process.exit(1)
}

const show = (label, value) => {
  console.log(`\n===== ${label} =====`)
  console.log(JSON.stringify(value, null, 2))
}

try {
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const loginBody = await loginRes.json()
  const token = loginBody?.token

  if (!token) {
    show(`POST /api/auth/login [${loginRes.status}]`, loginBody)
    process.exit(1)
  }

  const auth = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  // ─── 1. Tìm một rental có thể gửi notification ───────────────────────
  const listRes = await fetch(`${BASE}/api/rentals/admin?pageSize=100`, {
    headers: auth,
  })
  const listBody = await listRes.json()
  const rentals = Array.isArray(listBody?.data) ? listBody.data : []

  const candidate = rentals.find((r) => NOTIFIABLE.includes(r.status))

  show(
    `GET /api/rentals/admin [${listRes.status}] — ${rentals.length} rentals`,
    rentals.slice(0, 5).map((r) => ({
      rental_id: r.rental_id,
      status: r.status,
      customer_name: r.customer_name,
    })),
  )

  if (!candidate) {
    console.error(
      `\nKhông có rental nào ở trạng thái ${NOTIFIABLE.join('/')}. ` +
        'Cần tạo rental test trước, hoặc dùng tài khoản có rental phù hợp.',
    )
    process.exit(1)
  }

  const rentalId = candidate.rental_id
  console.log(`\n>>> Dùng rental_id=${rentalId} (${candidate.status}, ${candidate.customer_name})`)

  // ─── 2. Gửi và xem BE thực sự lưu notification_type nào ───────────────
  // Response trả `notification_type` (đọc thẳng từ DB) → phản ánh giá trị
  // BE đã INSERT, tức là field nào BE thật sự đọc.
  const cases = [
    [
      'CHỈ notification_type (không có type)',
      { message: '[probe] test notification_type', notification_type: 'MUSHROOM_DISEASE' },
    ],
    [
      'CHỈ type (không có notification_type)',
      { message: '[probe] test type', type: 'DEVICE_ISSUE' },
    ],
    [
      'CẢ HAI (giống hệt FE đang gửi)',
      {
        message: '[probe] test both',
        notification_type: 'OPERATOR_MESSAGE',
        type: 'OPERATOR_MESSAGE',
      },
    ],
  ]

  for (const [label, body] of cases) {
    const res = await fetch(`${BASE}/api/rentals/admin/${rentalId}/notifications`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify(body),
    })
    const text = await res.text()
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = text
    }

    show(`[${res.status}] ${label}`, parsed)

    if (res.status === 201) {
      const savedType = parsed?.data?.notification_type
      console.log(`>>> BE đã lưu notification_type = "${savedType}"`)
    }
  }

  // ─── 3. Các case lỗi cần xử lý trong UI ───────────────────────────────
  const errorCases = [
    ['type không hợp lệ → 400', { message: '[probe] bad type', type: 'RENTAL_UPDATE' }],
    ['message rỗng → 400', { message: '   ', type: 'OPERATOR_MESSAGE' }],
    ['message thiếu → 400', { type: 'OPERATOR_MESSAGE' }],
    ['title quá dài (>100) → 400', { message: '[probe]', title: 'x'.repeat(101), type: 'OPERATOR_MESSAGE' }],
    ['rental không tồn tại → 404', { message: '[probe]', type: 'OPERATOR_MESSAGE' }],
  ]

  for (const [label, body] of errorCases) {
    const path = label.includes('404')
      ? `${BASE}/api/rentals/admin/999999/notifications`
      : `${BASE}/api/rentals/admin/${rentalId}/notifications`

    const res = await fetch(path, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify(body),
    })
    const text = await res.text()
    show(`[${res.status}] ${label}`, text.slice(0, 300))
  }

  // ─── 4. Xác nhận khách đã nhận notification ──────────────────────────
  const notesRes = await fetch(`${BASE}/api/notifications?pageSize=5`, { headers: auth })
  const notesBody = await notesRes.json()
  show(`GET /api/notifications [${notesRes.status}] (admin tự nhận, nếu có)`, notesBody?.data?.slice?.(0, 3))
} catch (err) {
  console.error('Lỗi probe:', err.message)
  process.exit(1)
}
