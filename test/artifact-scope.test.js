/**
 * artifact-scope.test.js — the panel must render in the REAL page's React shape.
 *
 * WHY THIS TEST EXISTS. The 2026-10 blank-panel regression (settings nav row
 * present, section body empty, no error anywhere) shipped past every existing
 * gate because each one verified a DIFFERENT environment than the page:
 *
 *   - check.js pins the artifact's structure (no lexical require before the
 *     factory, require("react") inside it) — but only for the one failure mode
 *     it was written after;
 *   - settings-rows.test.js executes the real artifact, yet hangs its React
 *     double off the SANDBOX GLOBAL — the lookup's first branch — so the
 *     module-seed path the real page actually uses (`require('react')`
 * reachable only inside the factory body) is never exercised;
 *   - the in-process source tests stub the global the same way.
 *
 * This test executes the built client.js in the page's exact React shape:
 * NO global React anywhere in the sandbox, and the React double delivered
 * ONLY through the factory(require) parameter, the way dsh-client-modules
 * delivers the platform seed. If a bundler change (hoisting, scope
 * restructuring, a new pipeline) ever moves code out of the factory body
 * again, or breaks the react injection chain, the panel goes null HERE and
 * this test is the one that goes red — silently on the page, loudly here.
 *
 * It also pins the two side contracts that made the regression hard to see:
 * the artifact may only require the platform seeds it actually uses (today:
 * 'react'), and a React-less render must WARN instead of failing silently.
 *
 * Usage: node test/artifact-scope.test.js
 */
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { formStub } = require(path.join(__dirname, 'fixtures', 'settings-scope.js'))

const ROOT = path.resolve(__dirname, '..')
const src = fs.readFileSync(path.join(ROOT, 'client.js'), 'utf8')

let failures = 0
const fail = (m) => { console.error('FAIL  ' + m); failures++ }
const pass = (m) => console.log('ok    ' + m)

/* Same stateful recording double as settings-rows.test.js (the panel's
   dropdowns keep open/close in React state), plus the two hooks that file's
   minimal double omits: useRef for the dropdown's outside-click root and
   useEffect so the mount pass (store subscription + host-state read) runs
   like it does on the page. */
const makeReact = () => {
  const state = []
  let slot = 0
  return {
    __begin() { slot = 0 },
    useState(init) {
      const i = slot++
      if (state.length <= i) state[i] = typeof init === 'function' ? init() : init
      return [state[i], (next) => {
        state[i] = typeof next === 'function' ? next(state[i]) : next
      }]
    },
    useRef(init) { return { current: init } },
    useEffect(fn) { const cleanup = fn(); return typeof cleanup === 'function' ? cleanup : undefined },
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

/** Depth-first text of an element tree. */
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

/** The DOM/service doubles the artifact's apply() touches. Shared shape with
 * settings-rows.test.js (that file owns the rationale for each no-op). */
const makeSandboxBody = (sandboxConsole) => {
  let rendered = null
  const slots = {
    inject(_name, fn) { fn() },
    register(_opts, render) { rendered = render; return () => {} },
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
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    addEventListener() {},
  }
  const prefStore = formStub()
  const sandbox = {
    window: {
      __ModuleLoader__: null,
      addEventListener() {}, removeEventListener() {},
      matchMedia: () => ({ matches: false }),
      innerWidth: 1440, setTimeout: () => 0, clearTimeout: {},
    },
    document,
    /* NO React key here — that omission is the whole point of this file. */
    MutationObserver: function () { this.observe = () => {}; this.disconnect = () => {} },
    ResizeObserver: function () { this.observe = () => {}; this.disconnect = () => {} },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    performance: { now: () => 0 },
    setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, clearTimeout() {},
    console: sandboxConsole,
  }
  sandbox.globalThis = sandbox
  sandbox.window.document = document
  let loaded = null
  sandbox.window.__ModuleLoader__ = { load: (m) => { loaded = m } }
  const ctx = {
    get: (n) => {
      if (n === 'theme') return { overrideTokens: () => () => {} }
      if (n === 'slots') return slots
      if (n === 'configForms') return prefStore.service
      return undefined
    },
    effect: () => {},
  }
  return { sandbox, loaded: () => loaded, rendered: () => rendered, ctx, prefStore, slots }
}

/** Execute the artifact inside `body`'s sandbox and drive factory + apply. */
const bootArtifact = (body, requireForFactory) => {
  vm.createContext(body.sandbox)
  new vm.Script(src, { filename: 'client.js' }).runInContext(body.sandbox)
  const mod = body.loaded().factory(requireForFactory)
  body.prefStore.setField('enabled', '1')
  body.prefStore.setField('loader', '0')
  mod.apply(body.ctx)
  return mod
}

/* --- scenario A: the page's real shape — React only via the factory seed ---
   No global React in the sandbox; requireForFactory is the module-table face
   dsh-client-modules hands the factory. It records every specifier asked for:
   the artifact's whole external surface is asserted below, not assumed. */
{
  const asked = []
  const reactSeed = makeReact()
  const requireForFactory = (spec) => {
    asked.push(spec)
    if (spec === 'react') return reactSeed
    throw new Error('client-modules: require("' + spec + '") missed the module table')
  }
  let body
  try {
    body = makeSandboxBody(console)
    bootArtifact(body, requireForFactory)
  } catch (e) {
    fail('artifact failed in the no-global-React shape: ' + e.message)
    process.exit(1)
  }
  pass('artifact loads + applies with React supplied ONLY through the factory seed')

  if (typeof body.rendered() !== 'function') { fail('settings.section was never registered'); process.exit(1) }
  pass('settings.section registered')

  const rawRendered = body.rendered()
  const tree = (() => { reactSeed.__begin(); return rawRendered() })()
  if (tree === null || tree === undefined) {
    fail('panel rendered NULL in the real page shape — the react injection chain is broken; on the page this is exactly the silent blank section')
    process.exit(1)
  }
  pass('panel renders non-null with no global React (injection chain intact)')

  const root = tree.props && tree.props.className === 'endfield-settings' ? tree : null
  if (root) pass("root element is .endfield-settings")
  else fail('rendered root is not the .endfield-settings panel: ' + JSON.stringify(tree.type) + ' / ' + JSON.stringify(tree.props && tree.props.className))

  const nodes = walk(tree)
  const triggers = nodes.filter((n) => n.type === 'button' && n.props && n.props['aria-haspopup'] === 'menu')
  if (triggers.length >= 10) pass('unified dropdowns present in the tree (' + triggers.length + ' triggers)')
  else fail('expected the panel\'s unified dropdowns (>=10 triggers), found ' + triggers.length)

  const all = textOf(tree)
  if (all.includes('01 主题') && all.includes('终末地主题')) pass('panel copy present (01 主题 group, master row)')
  else fail('panel text missing: no "01 主题" group or master row label in the rendered tree')

  /* The artifact's module-table surface: everything it may require. A new
     entry here means the bundle grew a dependency this test must seed first —
     fail loudly so the author decides, instead of the page throwing. */
  const seeds = [...new Set(asked)]
  if (seeds.length === 1 && seeds[0] === 'react') {
    pass("artifact's only platform seed is 'react'")
  } else {
    fail('artifact asks the module table for ' + JSON.stringify(seeds) + " — expected exactly ['react']; seed the new dependency or drop the require")
  }
}

/* --- scenario B: React unreachable everywhere — the failure must be LOUD ---
   This is the regression's original shape with the post-fix addition: when
   neither the factory seed nor a global can provide React, the panel still
   returns null (a throw would crash the whole settings dialog) but it must
   WARN first. A silent null is what let the bug ship for days. */
{
  const warns = []
  const sandboxConsole = { warn: (...a) => warns.push(a.join(' ')), log() {}, error() {} }
  let body
  try {
    body = makeSandboxBody(sandboxConsole)
    /* factory(undefined): `typeof require` inside apply() is 'undefined', the
       exact scope shape a bundler regression produces. */
    bootArtifact(body, undefined)
  } catch (e) {
    fail('artifact crashed in the React-less shape (it must degrade, not throw): ' + e.message)
    process.exit(1)
  }
  pass('artifact still loads + applies when React is unreachable')

  if (typeof body.rendered() !== 'function') { fail('settings.section was never registered (React-less shape)'); process.exit(1) }
  const rawRendered = body.rendered()
  let tree = null
  try { tree = rawRendered() } catch (e) {
    fail('panel threw instead of degrading to null: ' + e.message)
    process.exit(1)
  }
  if (tree === null) pass('panel degrades to null (does not crash the settings dialog)')
  else fail('panel should return null when React is unreachable, got ' + JSON.stringify(tree.type))

  const loud = warns.filter((w) => w.includes('no React'))
  if (loud.length >= 1) pass('React-less render WARNS instead of failing silently')
  else fail('React-less render produced no warning — a silent blank panel is undiagnosable on the page')
}

console.log('')
if (failures) {
  console.error(`${failures} artifact-scope check(s) failed`)
  process.exit(1)
}
console.log('all artifact-scope checks passed')
