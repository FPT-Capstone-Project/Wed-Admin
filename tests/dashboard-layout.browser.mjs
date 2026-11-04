// Optional browser regression: real AntD/MCMS components, synthetic data, no server/API.
// Run: node tests/dashboard-layout.browser.mjs [path-to-chrome]
import assert from 'node:assert/strict'
import { existsSync, readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync, spawn } from 'node:child_process'
import { runInNewContext } from 'node:vm'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ConfigProvider, Layout, Typography } from 'antd'
import { StyleProvider, createCache, extractStyle } from '@ant-design/cssinjs'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const chrome = process.argv[2] ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
assert.ok(existsSync(chrome), 'Supply an installed Chrome/Chromium executable')
const baseline = process.env.LAYOUT_BASELINE ?? '05bdb69e'
function read(path, before) {
  return before ? execFileSync('git', ['show', `${baseline}:${relative(root, path).replaceAll('\\', '/')}`], { cwd: root, encoding: 'utf8' }) : readFileSync(path, 'utf8')
}
function loader(before) {
  const modules = new Map()
  function load(path) {
    if (modules.has(path)) return modules.get(path)
    const exports = {}
    modules.set(path, exports)
    const source = read(path, before)
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText
    runInNewContext(code, { exports, console, require: id => {
      if (!id.startsWith('.')) return require(id)
      const base = resolve(dirname(path), id)
      if (base === resolve(root, 'src/shared/ui')) return {
        StatCard: load(resolve(base, 'StatCard.tsx')).StatCard,
        StatusBadge: load(resolve(base, 'StatusBadge.tsx')).StatusBadge,
      }
      const target = [base, `${base}.ts`, `${base}.tsx`].find(candidate => existsSync(candidate))
      assert.ok(target, `Missing fixture dependency: ${id}`)
      return load(target)
    } })
    return exports
  }
  return load
}
const h = React.createElement
function fixture(before) {
  const load = loader(before)
  const { QuickSummaryStats } = load(resolve(root, 'src/features/dashboard/components/QuickSummaryStats.tsx'))
  const { StatusBadge } = load(resolve(root, 'src/shared/ui/StatusBadge.tsx'))
  const { mcmsTheme } = load(resolve(root, 'src/app/theme/theme.ts'))
  const cache = createCache()
  const content = renderToStaticMarkup(h(StyleProvider, { cache }, h(ConfigProvider, { theme: mcmsTheme },
    h(Layout, { className: 'mcms-app-shell' },
      h(Layout.Sider, { className: 'mcms-sider', width: 272 }),
      h(Layout, { className: 'mcms-main-layout' }, h(Layout.Content, { className: 'mcms-content' },
        h('main', { className: 'admin-content-inner dashboard-page' },
          h(QuickSummaryStats, { metrics: { revenue: { value: 128500000, currency: 'VND' }, trays_used: 18,
            harvest_quality: { usable_rate: 92.5, waste_rate: 7.5 } }, totalTrays: 18, activeInUseTrays: 16, maintenanceTrays: 2, activeAlerts: 12 }),
          h('section', { className: 'dashboard-section' }, h('div', { className: 'section-heading-row' },
            h('div', null, h(Typography.Title, { id: 'structure-heading', level: 2 }, 'Môi trường'),
              h(Typography.Text, null, '2 phòng · 2 tầng · 18 khay')),
            h(StatusBadge, { tone: 'ok', label: '1/1 Master online' }))),
        )))))))
  const css = ['src/index.css', 'src/App.css', 'src/styles/design-system.css', 'src/features/dashboard/dashboard.css']
    .map(path => read(resolve(root, path), before)).join('\n')
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${extractStyle(cache)}<style>${css}</style></head><body>${content}<script>
    window.addEventListener('load', () => setTimeout(() => {
      const root = document.querySelector('[aria-label="Thống kê nhanh trang trại"]');
      const cards = [...root.querySelectorAll('.mcms-stat-card')].map(el => ({ box: el.getBoundingClientRect(), parent: el.parentElement.getBoundingClientRect() }));
      const heading = document.querySelector('.section-heading-row');
      const bottom = Math.max(...cards.map(card => card.box.bottom));
      const errors = [];
      if (bottom > root.getBoundingClientRect().bottom + 1) errors.push('cards exceed KPI container');
      if (cards.some(card => card.box.bottom > card.parent.bottom + 1)) errors.push('card exceeds its column');
      if (heading.getBoundingClientRect().top <= bottom) errors.push('KPI overlaps environment heading');
      if ([...heading.children].some(el => { const r = el.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth; })) errors.push('environment header clipped horizontally');
      for (const card of cards) {
        const peers = cards.filter(other => Math.abs(other.box.top - card.box.top) < 1);
        if (peers.some(other => Math.abs(other.box.height - card.box.height) > 1)) { errors.push('cards in same row have unequal heights'); break; }
      }
      const result = document.createElement('pre'); result.id = 'layout-result';
      result.textContent = JSON.stringify({ width: innerWidth, errors, kpiBottom: bottom, headingTop: heading.getBoundingClientRect().top });
      document.body.append(result);
    }, 50));
  </script></body></html>`
}

const temp = mkdtempSync(join(tmpdir(), 'mcms-dashboard-layout-'))
let browser
let socket
try {
  const profile = join(temp, 'profile')
  browser = spawn(chrome, ['--headless=new', '--disable-gpu', '--disable-background-networking', '--disable-extensions',
    '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank'],
  { windowsHide: true, stdio: 'ignore' })
  const portFile = join(profile, 'DevToolsActivePort')
  const deadline = Date.now() + 15_000
  while (!existsSync(portFile)) {
    assert.ok(Date.now() < deadline, 'Chrome did not expose its local debugging port')
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  const port = readFileSync(portFile, 'utf8').split('\n')[0]
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  let id = 0
  const pending = new Map()
  const events = new Map()
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (message.id) {
      const request = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) request?.reject(new Error(JSON.stringify(message.error)))
      else request?.resolve(message.result)
    } else if (events.has(message.method)) { events.get(message.method)(); events.delete(message.method) }
  })
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id
    pending.set(requestId, { resolve, reject })
    socket.send(JSON.stringify({ id: requestId, method, params }))
  })
  const nextLoad = () => new Promise(resolve => events.set('Page.loadEventFired', resolve))
  await send('Page.enable')
  let reproduced = false
  for (const before of [true, false]) {
    const path = join(temp, before ? 'before.html' : 'after.html')
    writeFileSync(path, fixture(before))
    for (const width of [1280, 768, 375]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 1200, deviceScaleFactor: 1, mobile: false })
      const loaded = nextLoad()
      await send('Page.navigate', { url: pathToFileURL(path).href })
      await loaded
      const evaluation = await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true,
        expression: `new Promise((resolve, reject) => { const deadline = Date.now() + 10000; const timer = setInterval(() => {
          const result = document.getElementById('layout-result');
          if (result) { clearInterval(timer); resolve(JSON.parse(result.textContent)); }
          else if (Date.now() > deadline) { clearInterval(timer); reject(new Error('Layout measurement timeout')); }
        }, 50); })` })
      assert.ok(!evaluation.exceptionDetails, JSON.stringify(evaluation.exceptionDetails))
      const result = evaluation.result.value
      assert.equal(result.width, width, 'Measure the exact requested viewport')
      console.log(JSON.stringify({ version: before ? 'before' : 'after', ...result }))
      if (before) reproduced ||= result.errors.length > 0
      else assert.equal(result.errors.length, 0, JSON.stringify(result))
    }
  }
  assert.ok(reproduced, 'Baseline must reproduce the overflow')
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ id: 999999, method: 'Browser.close' }))
    socket.close()
  }
  if (browser && browser.exitCode == null) {
    await new Promise(resolve => {
      const timeout = setTimeout(() => { browser.kill(); resolve() }, 5000)
      browser.once('exit', () => { clearTimeout(timeout); resolve() })
    })
  }
  assert.ok(resolve(temp).startsWith(resolve(tmpdir()) + '\\') || resolve(temp).startsWith(resolve(tmpdir()) + '/'))
  rmSync(temp, { recursive: true, force: true, maxRetries: 3 })
}
