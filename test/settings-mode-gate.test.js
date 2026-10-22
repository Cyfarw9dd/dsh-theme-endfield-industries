/**
 * settings-mode-gate.test.js — regression: a snapshot WITHOUT a `mode` key is
 * DURABLE (DSH 0.2.1-rc.2+), and only an explicit mode:'memory' refuses a write.
 *
 * Bug it guards: DSH 0.2.1-rc.2 removed `mode` (and `persistence`) from the
 * settings snapshot — the shape became { status, value, base, user, revision,
 * writable }. The durable write gate still required `snap.mode === 'host'`
 * verbatim, so on that generation the gate never opened: every toggle was held
 * in the dirty queue, retried inside the bounded settle window and then
 * dropped. Toggles worked for the page session and reset on reload — the exact
 * "switches reset after refresh" symptom, on a page whose boot report read
 * `status= ready mode= undefined writable= true`. (The same disease was hit
 * and fixed independently upstream, commit f231bb1, 2026-10-17.)
 *
 * The fix reads the field's ABSENCE SEMANTICS instead of its spelling: a
 * missing `mode` means durable (the 0.2.1 mirror only exists over a Host
 * connection), and only an explicit 'memory' — 0.1.7-rc.* on a non-loopback
 * page — refuses. This test drives the real client.js apply() through three
 * ready+writable scopes whose snapshots differ ONLY in the `mode` key, using
 * the no-browser harness of settings-durable-hold.test.js.
 *
 * Mutation check: against the pre-fix gate, scenario A (no `mode` key) FAILS
 * this suite — the write is held, nothing reaches the wire. Scenarios B/C pass
 * both ways; they pin the contract's other two edges (explicit 'host' commits,
 * explicit 'memory' refuses) so a future "always durable" regression cannot
 * sneak in either.
 *
 * Usage: node test/settings-mode-gate.test.js
 */
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const ROOT = path.resolve(__dirname, '..')
const src = fs.readFileSync(path.join(ROOT, 'client.js'), 'utf8')

const FIELD_DEFAULTS = {
  enabled: '1', palette: 'wuling', radius: 'square',
  watermark: '1', watermarkPersist: '0',
  loader: '0', thunder: '0', thunderAnim: '0',
  audioEnabled: '0', audioVolume: '100', audioBoot: '1', audioTurnStart: '1', audioTurnDone: '1',
  audioAttention: '1', audioTurnFail: '1', audioDebounceMs: '2500',
  audioSoundDir: '', audioHumanOnly: '1', audioDiag: '0',
}

let failures = 0
const fail = (m) => { console.error('FAIL  ' + m); failures++ }
const pass = (m) => console.log('ok    ' + m)

/* Recording React stub (stateful dropdowns), as in settings-durable-hold. */
const makeReact = () => {
  const state = []
  let slot = 0
  return {
    __begin() { slot = 0 },
    useState(init) {
      const i = slot++
      if (state.length <= i) state[i] = typeof init === 'function' ? init() : init
      return [state[i], (next) => {
        const value = typeof next === 'function' ? next(state[i]) : next
        state[i] = value
      }]
    },
    createElement(type, props, ...children) {
      const kids = []
      for (const c of children) {
        if (Array.isArray(c)) kids.push(...c)
        else if (c !== null && c !== undefined && c !== false) kids.push(c)
      }
      return { type, props: props || {}, children: kids }
    },
  }
}
const textOf = (el) => {
  if (el === null || el === undefined || typeof el === 'boolean') return ''
  if (typeof el === 'string' || typeof el === 'number') return String(el)
  return (el.children || []).map(textOf).join('')
}
const walk = (el, out = []) => {
  if (el && typeof el === 'object' && el.type) {
    out.push(el)
    for (const c of el.children || []) walk(c, out)
  }
  return out
}

/* A ready+writable scope whose snapshot differs ONLY in the `mode` key:
   `mode` = 'omit'  -> the key is absent entirely (DSH 0.2.1-rc.2+ shape)
   `mode` = 'host'  -> explicit 'host' (0.1.7 loopback shape)
   `mode` = 'memory'-> explicit 'memory' (0.1.7 non-loopback page: never persists) */
function makeScope(mode) {
  const section = Object.assign({}, FIELD_DEFAULTS)
  const listeners = []
  const wireWrites = []
  const snapshot = () => {
    const s = {
      status: 'ready',
      value: Object.assign({}, section),
      base: Object.assign({}, FIELD_DEFAULTS),
      user: Object.assign({}, section),
      revision: 1,
      writable: true,
    }
    if (mode !== 'omit') s.mode = mode
    return s
  }
  const scope = {
    getSnapshot: snapshot,
    subscribe(l) { listeners.push(l); return () => { const i = listeners.indexOf(l); if (i >= 0) listeners.splice(i, 1) } },
    set(field, value) {
      wireWrites.push([field, String(value)])
      section[field] = String(value)
      for (const l of listeners.slice()) { try { l() } catch (e) { /* keep going */ } }
    },
  }
  return { binder: { bind: () => scope }, wireWrites, section }
}

/* One full page-load per scenario: client.js's apply() is idempotent per
   window, so each scenario gets a fresh sandbox and a fresh registration. */
function runScenario(mode) {
  const scope = makeScope(mode)
  const reactStub = makeReact()
  let rendered = null
  const slots = {
    inject(_n, fn) { fn() },
    register(_o, render) { rendered = render; return () => {} },
  }
  const classList = { add() {}, remove() {} }
  const noopEl = () => ({
    style: {}, setAttribute() {}, appendChild() {}, removeChild() {},
    querySelector: () => null, querySelectorAll: () => [], insertBefore() {},
    getBoundingClientRect: () => ({ width: 0, height: 0, top: 0, left: 0 }),
    classList, className: '', parentNode: null, firstChild: null,
    hasAttribute: () => false, getAttribute: () => null, isConnected: true,
    getContext: () => null, appendData() {},
  })
  const document = {
    body: Object.assign(noopEl(), { classList }),
    head: noopEl(),
    createElement: () => noopEl(),
    querySelector: () => null, querySelectorAll: () => [], getElementById: () => null,
    addEventListener() {}, removeEventListener() {},
  }
  const sandbox = {
    window: {
      __ModuleLoader__: null, addEventListener() {}, removeEventListener() {},
      matchMedia: () => ({ matches: false }), innerWidth: 1440,
      setTimeout: () => 0, clearTimeout: () => {},
    },
    document,
    React: reactStub,
    MutationObserver: function () { this.observe = () => {}; this.disconnect = () => {} },
    ResizeObserver: function () { this.observe = () => {}; this.disconnect = () => {} },
    requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
    performance: { now: () => 0 },
    setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, clearTimeout() {},
    console,
  }
  sandbox.globalThis = sandbox
  sandbox.window.document = document
  let loaded = null
  sandbox.window.__ModuleLoader__ = { load: (m) => { loaded = m } }
  vm.createContext(sandbox)
  new vm.Script(src, { filename: 'client.js' }).runInContext(sandbox)
  if (loaded === null) { fail('module never registered with __ModuleLoader__'); process.exit(1) }
  const mod = loaded.factory(() => null)
  const ctx = {
    get: (n) => {
      if (n === 'theme') return { overrideTokens: () => () => {} }
      if (n === 'slots') return slots
      if (n === 'settingsScope') return scope.binder
      return undefined
    },
    effect: () => {},
  }
  mod.apply(ctx)
  if (typeof rendered !== 'function') { fail('settings.section was never registered'); process.exit(1) }
  const rawRendered = rendered
  rendered = () => { reactStub.__begin(); return rawRendered() }

  /* Drive the radius dropdown like a user: open, click 圆角. */
  const t1 = rendered()
  const trigger = walk(t1).find((n) => n.type === 'button' && n.props && n.props['aria-label'] === '主题圆角'
    && n.props['aria-haspopup'] === 'menu')
  if (!trigger) { fail('radius dropdown trigger not found'); process.exit(1) }
  trigger.props.onClick()
  const t2 = rendered()
  const menu = walk(t2).find((n) => n.props && n.props.role === 'menu' && n.props['aria-label'] === '主题圆角')
  if (!menu) { fail('radius menu did not open'); process.exit(1) }
  const option = walk(menu).find((n) => n.props && n.props.role === 'menuitemradio' && textOf(n) === '圆角')
  if (!option) { fail('圆角 option not found'); process.exit(1) }
  option.props.onClick()
  return scope
}

/* --- A: DSH 0.2.1-rc.2+ shape — NO `mode` key. The gate must read absence as
   durable and let the write reach the wire. (Fails against the pre-fix gate,
   which held every write on this generation.) --- */
const omitScope = runScenario('omit')
if (omitScope.wireWrites.some(([f, v]) => f === 'radius' && v === 'round')) pass('no-mode snapshot (0.2.1+): radius=round reached the wire')
else fail('no-mode snapshot (0.2.1+): the write was HELD — the gate still requires mode===\'host\' verbatim; wireWrites=' + JSON.stringify(omitScope.wireWrites))
if (omitScope.section.radius === 'round') pass('no-mode snapshot (0.2.1+): host section holds radius=round')
else fail('no-mode snapshot (0.2.1+): section.radius=' + omitScope.section.radius)

/* --- B: explicit mode:'host' (0.1.7 loopback) still commits. --- */
const hostScope = runScenario('host')
if (hostScope.wireWrites.some(([f, v]) => f === 'radius' && v === 'round')) pass('explicit mode:host: radius=round reached the wire')
else fail('explicit mode:host: the write was held; wireWrites=' + JSON.stringify(hostScope.wireWrites))

/* --- C: explicit mode:'memory' (0.1.7 non-loopback page) still refuses —
   absence-as-durable must NOT become always-durable. --- */
const memoryScope = runScenario('memory')
if (memoryScope.wireWrites.length === 0) pass('explicit mode:memory: the write stayed held (no wire write)')
else fail('explicit mode:memory: a non-persistent scope received writes: ' + JSON.stringify(memoryScope.wireWrites))

if (failures === 0) pass('all mode-gate checks passed')
else { console.error('\n' + failures + ' mode-gate check(s) FAILED'); process.exit(1) }
