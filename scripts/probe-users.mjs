/**
 * Script kiểm tra shape response thật của các endpoint /api/users.
 * Chạy: node scripts/probe-users.mjs
 * Dùng email/mật khẩu admin qua env: MCMS_EMAIL, MCMS_PASSWORD
 */
const BASE = process.env.PROBE_BASE ?? 'http://localhost:5173'
const email = process.env.MCMS_EMAIL
const password = process.env.MCMS_PASSWORD

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
  show(`POST /api/auth/login [${loginRes.status}]`, loginBody)

  const token = loginBody?.token
  if (!token) {
    console.error('Không lấy được token.')
    process.exit(1)
  }

  const auth = { Authorization: `Bearer ${token}` }

  for (const [label, path] of [
    ['GET /api/users', '/api/users'],
    ['GET /api/users?roleId=3', '/api/users?roleId=3'],
  ]) {
    const res = await fetch(`${BASE}${path}`, { headers: auth })
    const body = await res.json()
    const data = Array.isArray(body?.data) ? body.data : body
    show(`${label} [${res.status}] (${Array.isArray(data) ? data.length : 'n/a'} items)`, Array.isArray(data) ? data.slice(0, 2) : data)

    if (Array.isArray(data) && data[0]) {
      console.log('keys:', Object.keys(data[0]))
    }
  }

  const firstId = Number((await (await fetch(`${BASE}/api/users`, { headers: auth })).json())?.data?.[0]?.user_id)
  if (Number.isFinite(firstId)) {
    const res = await fetch(`${BASE}/api/users/${firstId}`, { headers: auth })
    show(`GET /api/users/${firstId} [${res.status}]`, await res.json())
  }
} catch (err) {
  console.error('Lỗi probe:', err.message)
  process.exit(1)
}