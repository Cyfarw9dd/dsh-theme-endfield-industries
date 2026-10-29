/**
 * watermark-rehost.test.js — the persist mark must FOLLOW the page, including
 * the return trip from a no-column page (the plugin panel).
 *
 * ── The bug (2026-10-26, reported by the owner) ──────────────────────────────
 * Click the sidebar's plugin button, then come back to a session: the big
 * ENDFIELD band and the logo vanish until the watermark switch is toggled
 * off/on. Why: the persist fallback re-parents the mark. Leaving for the
 * plugin panel unmounts the conversation column, so the observer's full
 * decision moves the mark into the app FRAME. Coming back mounts a FRESH
 * column — but sync()'s streaming fast path only checked "host still
 * connected", and the frame is always connected. The early return stranded the
 * mark in the frame, where the column's own opaque background paints over its
 * z-index:-1 for good. Toggling the switch ran the full decision and remounted
 * it — which is exactly why off/on "fixed" it.
 *
 * ── What this proves, from the real source file (no literals restated) ──────
 *   1. On a session page the mark mounts INSIDE the conversation column.
 *   2. When the column unmounts, the mark falls back to the app frame.
 *   3. THE REGRESSION: when a (fresh) column comes back, sync() must re-host
 *      the mark in it — without any switch being touched in between.
 *   4. The fast path still holds when the page is genuinely unchanged: the
 *      mark node is not recreated and does not churn between hosts.
 *   5. THE PAGE THAT MUST STAY CLEAN (2026-10-29): the new-session page
 *      (data-phase="hero") gets NO mark at all — not in its column, not in the
 *      frame fallback — even with both switches on, and leaving it for a
 *      conversation must bring the mark back.
 *
 * Usage: node test/watermark-rehost.test.js
 */
const fs = require('fs')
const path = require('path')
const vm = require('vm')

let failures = 0
const fail = (m) => { console.error('FAIL  ' + m); failures++ }
const pass = (m) => console.log('ok    ' + m)

/* ---------- a just-faithful-enough DOM for the selectors the source uses ----
   Supports the attribute-selector shapes watermark.js and motion/sync.js
   actually issue: [class$="_root"][data-phase], [data-phase="hero"],
   [class$="_headlineText"], [class$="_centerCol"], [class*="_centerCol "].
   Anything else throws, so a selector drift in the source fails loudly here
   instead of silently passing. */
function makeDoc() {
  const doc = { body: null }
  const matchesAttr = (el, sel) => {
    /* Bare [attr] and valued [attr]/[attr$="v"]/[attr*="v"] are separate
       shapes: the valued form's = is NOT optional, or [data-phase] would
       parse as data-phase with an empty value and never match. */
    let m = sel.match(/^\[([A-Za-z-]+)\]$/)
    if (m) {
      const v = el.getAttribute(m[1])
      return v !== null && v !== undefined && v !== ''
    }
    m = sel.match(/^\[([A-Za-z-]+)(\$|\*)?="([^"]*)"\]$/)
    if (!m) throw new Error('test DOM: unsupported selector ' + sel)
    const [, attr, op, val] = m
    const v = el.getAttribute(attr)
    if (v === null || v === undefined || v === '') return false
    return op === '$' ? v.endsWith(val) : v.includes(val)
  }
  /* A comma in CSS is a UNION (OR), not an intersection — the frame finder's
     '[class$="_centerCol"], [class*="_centerCol "]' must not require both. */
  const matches = (el, selector) => selector.split(',').some((part) => {
    const preds = part.trim().match(/\[[^\]]+\]/g) || []
    return preds.every((p) => matchesAttr(el, p.trim()))
  })
  const connected = (el) => {
    for (let n = el; n; n = n.parentNode) if (n === doc.body) return true
    return false
  }
  const makeEl = (tagName, className) => {
    const attrs = {}
    if (className !== undefined) attrs.class = className
    const el = {
      tagName, children: [], parentNode: null,
      style: {},
      setAttribute: (k, v) => { attrs[k] = String(v) },
      getAttribute: (k) => (Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null),
      hasAttribute: (k) => Object.prototype.hasOwnProperty.call(attrs, k),
      getBoundingClientRect: () => el.rect || { width: 0, height: 0, top: 0, left: 0 },
      appendChild(child) {
        if (child.parentNode) {
          const i = child.parentNode.children.indexOf(child)
          if (i >= 0) child.parentNode.children.splice(i, 1)
        }
        el.children.push(child)
        child.parentNode = el
        return child
      },
      removeChild(child) {
        const i = el.children.indexOf(child)
        if (i >= 0) el.children.splice(i, 1)
        child.parentNode = null
        return child
      },
    }
    Object.defineProperty(el, 'isConnected', { get: () => connected(el) })
    return el
  }
  doc.createElement = (t, className) => makeEl(t, className)
  const walk = function* (node) {
    for (const c of node.children) { yield c; yield* walk(c) }
  }
  doc.querySelector = (sel) => { for (const el of walk(doc.body)) if (matches(el, sel)) return el; return null }
  doc.querySelectorAll = (sel) => Array.from(walk(doc.body)).filter((el) => matches(el, sel))
  doc.body = makeEl('body')
  return doc
}

/* Load createWatermark from the REAL source (export clause stripped for vm). */
function loadWatermark(doc) {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'src', 'client', 'decor', 'watermark.js'), 'utf8')
  const body = raw.replace('export function createWatermark', 'function createWatermark') + '\nreturn createWatermark\n'
  const src = '(function(){\n' + body + '\n})()'
  const sandbox = { document: doc, window: { addEventListener() {}, removeEventListener() {} } }
  return new vm.Script(src, { filename: 'watermark.js' }).runInContext(vm.createContext(sandbox))
}

/* prefs map mirroring the on-state: master switch on, persist on (the only way
   the mark shows on a session page at all). */
const prefs = {
  get: (k) => ({
    'dsh-theme-endfield-watermark': '1',
    'dsh-theme-endfield-watermark-persist': '1',
    'dsh-theme-endfield-watermark-style': 'solid',
    'dsh-theme-endfield-watermark-emblem': 'en',
  }[k]),
}
/* findAppFrame rebuilt the way motion/sync.js builds it: the center column's
   parent, if it has size. */
const frameFinder = (doc) => () => {
  const col = doc.querySelector('[class$="_centerCol"], [class*="_centerCol "]')
  return col && col.parentNode
}

const doc = makeDoc()
const createWatermark = loadWatermark(doc)
const watermark = createWatermark({ prefs, isEnabled: () => true, findAppFrame: frameFinder(doc) })

/* App frame + center column, frame sized so the fallback accepts it. */
const frame = doc.createElement('div', 'app_frame')
frame.rect = { width: 900, height: 800, top: 0, left: 0 }
doc.body.appendChild(frame)
const centerCol = doc.createElement('div', 'app_centerCol')
centerCol.rect = { width: 900, height: 800, top: 0, left: 0 }
frame.appendChild(centerCol)

/* Page 1: a session page — one visible conversation column. */
const columnA = doc.createElement('div', 'xS1_root')
columnA.setAttribute('data-phase', 'active')
columnA.rect = { width: 600, height: 800, top: 0, left: 0 }
centerCol.appendChild(columnA)

watermark.sync()
let mark = doc.querySelector('[data-endfield-watermark]')
if (mark === null) fail('1. no watermark mounted on the session page')
else if (mark.parentNode !== columnA) fail('1. watermark host is ' + mark.parentNode.tagName + ', expected the conversation column')
else if (mark.getAttribute('data-endfield-watermark') !== 'persist') fail('1. watermark mode is not persist')
else pass('1. persist mark mounted inside the conversation column')

/* Page 2: the plugin panel — the column is unmounted. */
centerCol.removeChild(columnA)
watermark.sync()
mark = doc.querySelector('[data-endfield-watermark]')
if (mark === null) fail('2. watermark vanished entirely instead of falling back')
else if (mark.parentNode !== frame) fail('2. fallback host is not the app frame: ' + mark.parentNode.tagName)
else pass('2. column gone -> mark fell back into the app frame')

/* Page 3: back to the session — a FRESH column node (React remount). */
const columnB = doc.createElement('div', 'xS2_root')
columnB.setAttribute('data-phase', 'active')
columnB.rect = { width: 600, height: 800, top: 0, left: 0 }
centerCol.appendChild(columnB)
watermark.sync()
mark = doc.querySelector('[data-endfield-watermark]')
if (mark === null) fail('3. watermark missing after returning to the session (THE BUG)')
else if (mark.parentNode !== columnB) fail('3. mark still stranded in ' + mark.parentNode.tagName + ' after the column came back (THE BUG)')
else pass('3. column back -> mark re-hosted in the fresh column, no switch touched')

/* 4. The fast path must still hold on an unchanged page: no churn. */
const markBefore = mark
watermark.sync()
watermark.sync()
mark = doc.querySelector('[data-endfield-watermark]')
if (mark !== markBefore) fail('4. fast path recreated the mark node on an unchanged page')
else if (mark.parentNode !== columnB) fail('4. fast path moved the mark on an unchanged page')
else pass('4. unchanged page -> mark node and host untouched by repeated sync()')

/* 5. Frame-hosted fast path: no column in the document keeps the frame host. */
centerCol.removeChild(columnB)
watermark.sync()
const inFrame = doc.querySelector('[data-endfield-watermark]')
watermark.sync()
if (inFrame === null || inFrame.parentNode !== frame) fail('5. frame-hosted mark did not stay put on a column-less page')
else pass('5. no column -> mark stays in the frame across repeated sync()')
/* 6. THE NEW-SESSION PAGE STAYS CLEAN (2026-10-29). With the switches still on,
   mounting a hero column must remove the mark — the hero page must not carry the
   wordmark band or the emblem in ANY host, including the frame fallback. */
const heroCol = doc.createElement('div', 'xS3_root')
heroCol.setAttribute('data-phase', 'hero')
heroCol.rect = { width: 600, height: 800, top: 0, left: 0 }
centerCol.appendChild(heroCol)
watermark.sync()
if (doc.querySelector('[data-endfield-watermark]') !== null) {
  fail('6. the watermark mounted on the new-session page (host ' + doc.querySelector('[data-endfield-watermark]').parentNode.tagName + ') — the hero screen must stay clean')
} else {
  pass('6. new-session page -> no watermark anywhere, switches untouched')
}

/* 7. ...and leaving the new-session page for a conversation mounts it again. */
centerCol.removeChild(heroCol)
const columnC = doc.createElement('div', 'xS4_root')
columnC.setAttribute('data-phase', 'active')
columnC.rect = { width: 600, height: 800, top: 0, left: 0 }
centerCol.appendChild(columnC)
watermark.sync()
mark = doc.querySelector('[data-endfield-watermark]')
if (mark === null) fail('7. watermark did not come back after leaving the new-session page')
else if (mark.parentNode !== columnC) fail('7. watermark host after the new-session page is ' + mark.parentNode.tagName + ', expected the conversation column')
else pass('7. conversation after the new-session page -> mark re-hosted')

if (failures === 0) console.log('watermark-rehost: all checks passed')
else { console.error('watermark-rehost: ' + failures + ' failure(s)'); process.exit(1) }
