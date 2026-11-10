import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import axios from 'axios'
import {
  extractTokenPair,
  shouldAttemptRefresh,
} from '../src/shared/api/token-refresh.ts'

/**
 * Test luồng xoay vòng refresh token.
 *
 * ⚠ Module `refresh-interceptor.ts` có import runtime (`axios`, storage) ⇒
 *   không import trực tiếp bằng Node (ESM cần đuôi file) ⇒ dùng cùng pattern
 *   `loadApi` như `display-mapping.test.mjs`: transpile sang CommonJS rồi nạp
 *   trong `vm` với dependency **tiêm vào** (storage giả).
 */

const require = createRequire(import.meta.url)

function loadApi(relativePath, dependencies) {
  const filename = new URL(relativePath, import.meta.url)
  const source = readFileSync(filename, 'utf8')
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  const exports = {}
  runInNewContext(code, {
    exports,
    require: (id) => (Object.hasOwn(dependencies, id) ? dependencies[id] : require(id)),
    console,
    Map,
    Set,
    Date,
    URL,
    Promise,
  })
  return exports
}

/** Storage token giả — không cần `window`/localStorage thật. */
function createFakeTokenStorage() {
  let accessToken = null
  let refreshToken = null
  let persistence = 'local'

  return {
    getAccessToken: () => accessToken,
    getRefreshToken: () => refreshToken,
    getPersistence: () => persistence,
    setTokens(nextAccess, nextRefresh, mode = 'local') {
      accessToken = nextAccess
      refreshToken = nextRefresh ?? null
      persistence = mode
    },
    clear() {
      accessToken = null
      refreshToken = null
    },
    // Đọc trạng thái nội bộ (test helper).
    snapshot: () => ({ accessToken, refreshToken, persistence }),
  }
}

function loadInterceptor(tokenStorage) {
  return loadApi('../src/shared/api/refresh-interceptor.ts', {
    axios,
    './token-storage': { tokenStorage },
    './token-refresh': { extractTokenPair, shouldAttemptRefresh },
  })
}

/** Tạo lỗi axios giả có `response.status = 401` + `config`. */
function unauthorized(config) {
  const error = new Error('unauthorized')
  error.isAxiosError = true
  error.config = config
  error.response = {
    status: 401,
    data: {},
    headers: {},
    statusText: 'Unauthorized',
  }
  return error
}

test('a 401 refreshes the token and retries the original request with the new access token', async () => {
  const storage = createFakeTokenStorage()
  storage.setTokens('expired-access', 'refresh-1', 'local')

  const { attemptRefreshAndRetry, setRefreshTransport } = loadInterceptor(storage)

  let refreshCalls = 0
  const restoreTransport = setRefreshTransport(async (_baseUrl, refreshToken) => {
    refreshCalls += 1
    assert.equal(refreshToken, 'refresh-1')
    return { accessToken: 'fresh-access', refreshToken: 'refresh-2' }
  })

  const seen = []
  const instance = axios.create({
    adapter: async (config) => {
      const authorization = config.headers.Authorization
      seen.push(authorization)
      // Chỉ token CŨ mới bị 401 — token mới phải đi qua.
      if (authorization === 'Bearer expired-access') throw unauthorized(config)
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config }
    },
  })

  try {
    const error = unauthorized({ headers: { Authorization: 'Bearer expired-access' } })
    const outcome = await attemptRefreshAndRetry(instance, error)

    assert.equal(outcome.kind, 'retried')
    const response = await outcome.promise
    assert.equal(response.status, 200)
    assert.equal(refreshCalls, 1)

    // Request gốc đã fail (mô phỏng bằng `unauthorized(...)`), nên adapter
    // chỉ thấy lần **retry** — và lần đó phải đi kèm token MỚI.
    assert.deepEqual(seen, ['Bearer fresh-access'])

    // Rotation ⇒ storage phải chứa cả access token mới lẫn refresh token mới.
    assert.deepEqual(storage.snapshot(), {
      accessToken: 'fresh-access',
      refreshToken: 'refresh-2',
      persistence: 'local',
    })
  } finally {
    restoreTransport()
  }
})

test('when refresh fails the request is not retried and the session is closed', async () => {
  const storage = createFakeTokenStorage()
  storage.setTokens('expired-access', 'refresh-1', 'local')

  const { attemptRefreshAndRetry, setRefreshTransport } = loadInterceptor(storage)
  const restoreTransport = setRefreshTransport(async () => null)

  let retried = false
  const instance = axios.create({
    adapter: async (config) => {
      retried = true
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    },
  })

  try {
    const error = unauthorized({ headers: { Authorization: 'Bearer expired-access' } })
    const outcome = await attemptRefreshAndRetry(instance, error)

    assert.equal(outcome.kind, 'failed')
    assert.equal(retried, false, 'request gốc không được retry khi refresh thất bại')
  } finally {
    restoreTransport()
  }
})

test('a request that was already retried is not refreshed a second time', async () => {
  const storage = createFakeTokenStorage()
  storage.setTokens('expired-access', 'refresh-1', 'local')

  const { attemptRefreshAndRetry, setRefreshTransport } = loadInterceptor(storage)

  let refreshCalls = 0
  const restoreTransport = setRefreshTransport(async () => {
    refreshCalls += 1
    return { accessToken: 'fresh-access', refreshToken: 'refresh-2' }
  })

  const instance = axios.create({
    adapter: async (config) => ({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }),
  })

  try {
    const error = unauthorized({
      headers: { Authorization: 'Bearer expired-access' },
      __isRetried: true,
    })
    const outcome = await attemptRefreshAndRetry(instance, error)

    assert.equal(outcome.kind, 'not-applicable')
    assert.equal(refreshCalls, 0, 'không được gọi refresh lần thứ hai')
  } finally {
    restoreTransport()
  }
})

test('the login endpoint is never refreshed', async () => {
  const storage = createFakeTokenStorage()
  storage.setTokens('expired-access', 'refresh-1', 'local')

  const { attemptRefreshAndRetry, setRefreshTransport } = loadInterceptor(storage)

  let refreshCalls = 0
  const restoreTransport = setRefreshTransport(async () => {
    refreshCalls += 1
    return { accessToken: 'fresh-access', refreshToken: 'refresh-2' }
  })

  const instance = axios.create({
    adapter: async (config) => ({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }),
  })

  try {
    const error = unauthorized({
      url: '/api/auth/login',
      headers: { Authorization: '' },
    })
    const outcome = await attemptRefreshAndRetry(instance, error)

    assert.equal(outcome.kind, 'not-applicable')
    assert.equal(refreshCalls, 0, '401 ở endpoint đăng nhập = sai mật khẩu')
  } finally {
    restoreTransport()
  }
})

test('the refreshed access token is published to the store listener', async () => {
  const storage = createFakeTokenStorage()
  storage.setTokens('expired-access', 'refresh-1', 'session')

  const { attemptRefreshAndRetry, setRefreshTransport, setTokenRefreshedListener } =
    loadInterceptor(storage)

  let published = null
  setTokenRefreshedListener((accessToken) => {
    published = accessToken
  })

  // BE không trả refresh token mới ⇒ phải GIỮ refresh token cũ.
  const restoreTransport = setRefreshTransport(async () => ({
    accessToken: 'fresh-access',
    refreshToken: null,
  }))

  const instance = axios.create({
    adapter: async (config) => ({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }),
  })

  try {
    const error = unauthorized({ headers: { Authorization: 'Bearer expired-access' } })
    const outcome = await attemptRefreshAndRetry(instance, error)
    assert.equal(outcome.kind, 'retried')
    await outcome.promise

    assert.equal(published, 'fresh-access')
    assert.deepEqual(storage.snapshot(), {
      accessToken: 'fresh-access',
      refreshToken: 'refresh-1',
      persistence: 'session',
    })
  } finally {
    restoreTransport()
    setTokenRefreshedListener(null)
  }
})

test('concurrent 401 responses share a single refresh call', async () => {
  const storage = createFakeTokenStorage()
  storage.setTokens('expired-access', 'refresh-1', 'local')

  const { attemptRefreshAndRetry, setRefreshTransport } = loadInterceptor(storage)

  let refreshCalls = 0
  const restoreTransport = setRefreshTransport(async () => {
    refreshCalls += 1
    // Trễ nhẹ ⇒ nhiều request 401 cùng chờ 1 lần refresh.
    await new Promise((resolve) => setTimeout(resolve, 10))
    return { accessToken: 'fresh-access', refreshToken: 'refresh-2' }
  })

  const instance = axios.create({
    adapter: async (config) => ({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }),
  })

  try {
    const outcomes = await Promise.all(
      [1, 2, 3].map(() =>
        attemptRefreshAndRetry(
          instance,
          unauthorized({ headers: { Authorization: 'Bearer expired-access' } }),
        ),
      ),
    )

    assert.deepEqual(
      outcomes.map((outcome) => outcome.kind),
      ['retried', 'retried', 'retried'],
    )
    assert.equal(refreshCalls, 1, 'nhiều request 401 chỉ được gọi refresh 1 lần')
    await Promise.all(outcomes.map((outcome) => outcome.promise))
  } finally {
    restoreTransport()
  }
})
