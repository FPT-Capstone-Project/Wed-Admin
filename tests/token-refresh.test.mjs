import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AUTH_LOGIN_URL,
  AUTH_REFRESH_URL,
  extractAccessToken,
  extractRefreshToken,
  extractTokenPair,
  isAuthLoginUrl,
  isAuthRefreshUrl,
  shouldAttemptRefresh,
} from '../src/shared/api/token-refresh.ts'

test('access token is read from the new shape and the legacy shape', () => {
  // Shape mới (khớp `AuthResponse` trong api-schema.d.ts).
  assert.equal(extractAccessToken({ accessToken: 'a1', refreshToken: 'r1' }), 'a1')
  // Shape cũ — JWT thuần.
  assert.equal(extractAccessToken({ token: 'legacy' }), 'legacy')
  // Wrapper `{ data: {...} }`.
  assert.equal(extractAccessToken({ data: { accessToken: 'wrapped' } }), 'wrapped')
  // Không có token ⇒ null.
  assert.equal(extractAccessToken({}), null)
  assert.equal(extractAccessToken(null), null)
  assert.equal(extractAccessToken('nope'), null)
})

test('refresh token is null when the backend does not rotate it', () => {
  assert.equal(extractRefreshToken({ accessToken: 'a1', refreshToken: 'r1' }), 'r1')
  assert.equal(extractRefreshToken({ accessToken: 'a1' }), null)
  assert.equal(extractRefreshToken({ token: 'legacy' }), null)
})

test('token pair requires an access token', () => {
  assert.deepEqual(
    extractTokenPair({ accessToken: 'a1', refreshToken: 'r1' }),
    { accessToken: 'a1', refreshToken: 'r1' },
  )
  // Không có access token ⇒ refresh thất bại ⇒ null.
  assert.equal(extractTokenPair({ refreshToken: 'r1' }), null)
  assert.equal(extractTokenPair({}), null)
})

test('auth endpoints are detected by url', () => {
  assert.equal(isAuthLoginUrl('/api/auth/login'), true)
  assert.equal(isAuthLoginUrl('/api/auth/logout'), false)
  assert.equal(isAuthRefreshUrl('/api/auth/refresh'), true)
  assert.equal(isAuthRefreshUrl('/api/auth/login'), false)
  assert.equal(isAuthRefreshUrl(null), false)
  assert.equal(isAuthLoginUrl(undefined), false)
})

test('refresh is attempted only for 401 on a normal endpoint', () => {
  const base = { status: 401, url: '/api/sessions' }

  assert.equal(shouldAttemptRefresh(base), true)

  // Sai thông tin đăng nhập ⇒ không refresh.
  assert.equal(
    shouldAttemptRefresh({ status: 401, url: AUTH_LOGIN_URL }),
    false,
  )

  // Chính endpoint refresh ⇒ không refresh (tránh vòng lặp vô hạn).
  assert.equal(
    shouldAttemptRefresh({ status: 401, url: AUTH_REFRESH_URL }),
    false,
  )

  // Đã retry 1 lần rồi ⇒ không refresh lần nữa.
  assert.equal(
    shouldAttemptRefresh({ status: 401, url: '/api/sessions', alreadyRetried: true }),
    false,
  )

  // Lỗi khác 401 ⇒ không refresh.
  assert.equal(shouldAttemptRefresh({ status: 403, url: '/api/sessions' }), false)
  assert.equal(shouldAttemptRefresh({ status: 500, url: '/api/sessions' }), false)
  assert.equal(shouldAttemptRefresh({ status: null, url: '/api/sessions' }), false)
})
