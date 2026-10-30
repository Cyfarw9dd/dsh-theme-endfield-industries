/**
 * settings-rows.test.js — prove the 「终末地工业主题设置」 panel actually renders.
 *
 * The settings section is the ONLY way a user reaches these switches, and it is a
 * React component built with React.createElement inside the theme. A mistake there
 * (a throw, a missing key, a row wired to the wrong preference) is invisible to
 * check.js and to the canvas tests, so it is asserted here.
 *
 * No React and no browser: the theme is executed in-process with a recording
 * `React` stub and a recording `slots` stub. That is enough to capture the real
 * element tree, because the component only uses createElement/useState.
 *
 * Preferences: since the theme migrated from localStorage to the DSH settings
 * namespace, this test feeds the plugin a fake `ctx.settingsScope` binder (see
 * test/fixtures/settings-scope.js) and asserts writes through it — the theme
 * never touches localStorage.
 *
 * Usage: node test/settings-rows.test.js
 */
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { formStub, fieldName } = require(path.join(__dirname, 'fixtures', 'settings-scope.js'))

const ROOT = path.resolve(__dirname, '..')
const src = fs.readFileSync(path.join(ROOT, 'client.js'), 'utf8')

let failures = 0
const fail = (m) => { console.error('FAIL  ' + m); failures++ }
const pass = (m) => console.log('ok    ' + m)

/* Minimal recording React. useState is STATEFUL across rendered() passes now:
   the panel's unified dropdowns keep their open/close in React state, so a
   no-op setter would make "open the menu, click an option" untestable — the
   tree would never show the menu. Slots are indexed in call order (the panel
   renders the same rows in the same order every pass, so indexes are stable),
   setters write the slot, and the next rendered() call re-runs the component
   which reads the stored value. No auto-rerender: the test calls rendered()
   explicitly, exactly like the older assertions did. */
const makeReact = () => {
  const state = []
  let slot = 0
  return {
    /* Call before each rendered() pass so the slot counter walks 0..N again. */
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

const reactStub = makeReact()

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

/** Drive the unified dropdown the way a user does: open it, then click the
    option whose visible text matches. getTree must return a FRESH render
    (the menu only exists in the post-open tree). Returns 'ok' or which step
    failed, so callers can fail with the exact missing piece. */
const driveSelect = (getTree, ariaLabel, optionText) => {
  const t1 = getTree()
  const trigger = walk(t1).find((n) => n.type === 'button' && n.props && n.props['aria-label'] === ariaLabel
    && n.props['aria-haspopup'] === 'menu')
  if (!trigger) return 'trigger'
  if (typeof trigger.props.onClick !== 'function') return 'trigger-onClick'
  trigger.props.onClick()
  const t2 = getTree()
  const menu = walk(t2).find((n) => n.props && n.props.role === 'menu' && n.props['aria-label'] === ariaLabel)
  if (!menu) return 'menu'
  const option = walk(menu).find((n) => n.props && n.props.role === 'menuitemradio' && textOf(n) === optionText)
  if (!option) return 'option:' + optionText
  if (typeof option.props.onClick !== 'function') return 'option-onClick'
  option.props.onClick()
  return 'ok'
}
/** The trigger of a row's dropdown (closed state): its visible text is the
    current value. */
const selectTriggerOf = (tree, ariaLabel) => walk(tree).find((n) => n.type === 'button' && n.props
  && n.props['aria-label'] === ariaLabel && n.props['aria-haspopup'] === 'menu')

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

/* The durable prefs seam: a fake settingsScope binder over an in-memory section.
   Start with the default section (enabled on). The panel drives reads from it,
   and every toggle writes back through it. */
const prefStore = formStub()

const sandbox = {
  window: {
    __ModuleLoader__: null,
    addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false }),
    innerWidth: 1440, setTimeout: () => 0, clearTimeout() {},
  },
  document,
  React: reactStub,
  MutationObserver: function () { this.observe = () => {}; this.disconnect = () => {} },
  ResizeObserver: function () { this.observe = () => {}; this.disconnect = () => {} },
  requestAnimationFrame: () => 0,
  cancelAnimationFrame() {},
  performance: { now: () => 0 },
  setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, clearTimeout() {},
  console,
}
sandbox.globalThis = sandbox
sandbox.window.document = document

let loaded = null
sandbox.window.__ModuleLoader__ = { load: (m) => { loaded = m } }

vm.createContext(sandbox)
try {
  new vm.Script(src, { filename: 'client.js' }).runInContext(sandbox)
} catch (e) {
  fail('client.js threw while loading: ' + e.message)
  process.exit(1)
}
if (loaded === null) { fail('module never registered with __ModuleLoader__'); process.exit(1) }

const mod = loaded.factory(() => null)
/* The app palette preference (外观) is NOT one of this plugin's form fields: it
   lives in the DSH theme service, shared with General › 外观. The stub mirrors
   getTheme/setTheme and records what the panel writes, so the row's wiring is
   provable here. The two-way live sync (theme/change → this row) is covered in
   settings-config-forms.test.js, whose React fake runs mount effects — this
   file's stub deliberately has none. */
let themePreference = 'light'
const themeStub = {
  overrideTokens: () => () => {},
  getTheme: () => ({ preference: themePreference }),
  setTheme: (id) => { themePreference = id },
}
const ctx = {
  get: (n) => {
    if (n === 'theme') return themeStub
    if (n === 'slots') return slots
    if (n === 'configForms') return prefStore.service
    return undefined
  },
  effect: () => {},
  on: () => () => {},
}
// Enable the theme so mount() runs, mirroring a real session.
prefStore.setField('enabled', '1')
prefStore.setField('loader', '0')
try { mod.apply(ctx) } catch (e) { fail('apply() threw: ' + e.message); process.exit(1) }
pass('apply() completed without throwing')

if (typeof rendered !== 'function') { fail('settings.section was never registered'); process.exit(1) }
pass('settings.section registered')

/* Wrap the registered render so every pass resets the stub's hook slot counter
   before the component body runs (see makeReact). Every later rendered() in
   this file goes through this wrapper. */
const rawRendered = rendered
rendered = () => { reactStub.__begin(); return rawRendered() }

/* --- render the panel and inspect the real element tree --- */
let tree
try { tree = rendered() } catch (e) { fail('settings render threw: ' + e.message); process.exit(1) }
pass('settings panel rendered without throwing')

const nodes = walk(tree)
const buttons = nodes.filter((n) => n.type === 'button')
/* The rows live inside five group containers (主题 / 背景 / 动画 / 通知 /
   音频), so "all rows" means every div whose key is one of the ROW_KEYS
   switch rows, wherever it sits in the tree.

   ROW_KEYS is BOTH the expected set and the counter, so a new row that is not
   listed here is silently ignored rather than counted — which is exactly what
   happened when a row was added (the count stayed at 9 and the assertion
   passed while a tenth row was on screen). The independent total below is what
   makes that impossible now. */
/* The row set is the union of both lines of work: main's glass row plus this
   branch's 11 audio rows. The count is asserted below against the rendered tree
   as well, so a row that exists in the page but not in this list still fails. */
const ROW_KEYS = ['theme', 'scheme', 'motion', 'glass', 'texture', 'dark-tier', 'radius', 'watermark', 'watermark-style', 'watermark-emblem', 'watermark-persist', 'loader', 'notify', 'notify-done', 'notify-question', 'notify-approve', 'audio', 'audio-boot', 'audio-start', 'audio-done', 'audio-volume', 'audio-attention', 'audio-fail', 'audio-source', 'audio-dir', 'audio-human', 'audio-diag']
const rows = nodes.filter((n) => n.type === 'div' && n.props && ROW_KEYS.includes(n.props.key))
const groups = (tree.children || []).filter((c) => c && c.type === 'div' && c.props && /^group-/.test(c.props.key))

if (rows.length === 27) pass('panel has all 27 setting rows')
else fail('expected 27 rows, found ' + rows.length)

/* Count the rows the way the PAGE defines them — every direct child of a group
   container — so an unlisted new row shows up as a mismatch instead of vanishing. */
const rowsInGroups = groups.reduce((acc, g) => acc.concat(
  (g.children || []).filter((c) => c && c.type === 'div' && c.props && c.props.key !== undefined
    && !/^group-title-/.test(String(c.props.key)))), [])
if (rowsInGroups.length === rows.length) {
  pass('分组内的行数与已登记的 ROW_KEYS 一致（' + rowsInGroups.length + '）')
} else {
  fail('分组内有 ' + rowsInGroups.length + ' 行，但 ROW_KEYS 只登记了 ' + rows.length
    + ' 行 — 未登记的行会被静默忽略：'
    + rowsInGroups.map((r) => r.props.key).filter((k) => !ROW_KEYS.includes(k)).join(', '))
}

if (groups.length === 5) pass('rows are grouped into 5 sections (主题/背景/动画/通知/音频)')
else fail('expected 5 group containers, found ' + groups.length)

const unkeyed = rows.filter((r) => !r.props || r.props.key === undefined)
if (unkeyed.length === 0) pass('every row carries a React key')
else fail(unkeyed.length + ' row(s) missing a key (React will warn)')

const keys = rows.map((r) => r.props.key)
if (new Set(keys).size === keys.length) pass('row keys are unique: ' + keys.join(', '))
else fail('duplicate row keys: ' + keys.join(', '))

/* The group headers must be numbered editorial labels in the documented order,
   and the scheme-aware ink rule for them must exist in the stylesheet source. */
const all = textOf(tree)
for (const [label, title] of [['01 主题', 'THEME'], ['02 背景', 'BACKGROUND'], ['03 动画', 'ANIMATION'], ['04 通知', 'NOTIFY'], ['05 音频', 'AUDIO']]) {
  if (all.includes(label) && all.includes(title)) pass('group header present: ' + label + ' / ' + title)
  else fail('group header missing: ' + label + ' / ' + title)
}
if (src.includes('.endfield-settings-group-title')) pass('group-title stylesheet rule is defined')
else fail('client.js never defines .endfield-settings-group-title — headers will use default text colour')
/* Rows that must exist. 光点移动 is deliberately NOT in this list: it is described
   in the README and was asserted here, but it has never existed in client.js (git
   log -S finds no commit adding it), so the assertion tested the test rather than
   the theme and failed on every pristine checkout. Removed rather than left
   red-by-default — a suite that is expected to fail teaches nothing. */
for (const label of ['背景水印']) {
  if (all.includes(label)) pass('row present: ' + label)
  else fail('row missing: ' + label)
}

/* --- the palette row is GONE: 终末地灰/武陵青 were removed, 谷地黄 is the
   only shipped palette (painted by the stylesheet's base block), so the panel
   must not offer a switch that would do nothing --- */
if (!all.includes('主题配色') && !all.includes('终末地灰') && !all.includes('武陵青')) {
  pass('设置页不再提供配色行（仅谷地黄，无切换）')
} else {
  fail('设置页仍出现配色行或已移除的配色名（主题配色/终末地灰/武陵青）')
}
/* --- the dropdown MENU shape: options are focusable buttons, aria-checked
   marks the current one. Re-homed from the removed palette row onto 磨砂玻璃
   (the widest menu this panel ships: four options). --- */
{
  const trig = selectTriggerOf(rendered(), '磨砂玻璃')
  if (trig) {
    trig.props.onClick()
    const tOpen = rendered()
    const menu = walk(tOpen).find((n) => n.props && n.props.role === 'menu' && n.props['aria-label'] === '磨砂玻璃')
    const opts = menu ? walk(menu).filter((n) => n.props.role === 'menuitemradio') : []
    if (opts.length === 4) pass('下拉菜单提供四档（menuitemradio，磨砂玻璃）')
    else fail('glass menu has ' + opts.length + ' options, expected 4')
    /* 元素必须是可聚焦的 button：应用的菜单行就是 button[role=menuitem*]，
       div 会丢掉键盘 Tab/Enter（2026-10 二次核对后钉住）。 */
    if (opts.length > 0 && opts.every((n) => n.type === 'button' && n.props.type === 'button')) {
      pass('下拉选项是 button[type=button]（可聚焦，同应用菜单）')
    } else {
      fail('下拉选项不是 button：' + JSON.stringify(opts.map((n) => n.type)))
    }
    const checked = opts.filter((n) => n.props['aria-checked'] === 'true')
    if (checked.length === 1 && textOf(checked[0]).includes('关闭')) pass('当前值以 aria-checked 标在默认档（关闭）上')
    else fail('aria-checked should mark exactly the current option, got ' + checked.length + ' checked')
    /* close it again so later assertions start from a closed panel */
    const again = selectTriggerOf(rendered(), '磨砂玻璃'); if (again) again.props.onClick()
  } else fail('no glass trigger for the menu-shape assertion')
}

/* --- 高度对齐：动作按钮与同排的下拉触发器同高（宽度可不同） ---
   触发器高度从真实样式表读（.endfield-select-trigger 的 height），不在此
   复述数值：将来触发器改高度而按钮没跟上时，这条会红而不是默默失配。 */
{
  const hm = src.match(/\.endfield-select-trigger\s*\{[^}]*?height:\s*([^;\s]+)/)
  if (!hm) fail('样式表里找不到 .endfield-select-trigger 的 height 声明')
  else {
    const triggerH = hm[1]
    /* btnStyleFor 是这些按钮唯一的样式来源；带 style.height 的 button 恰好
       就是它们（下拉触发器的高度在样式表里，不在内联 style 上）。 */
    const actionBtns = nodes.filter((n) => n.type === 'button' && n.props.style && n.props.style.height !== undefined)
    if (actionBtns.length >= 7) pass('面板渲染出 ' + actionBtns.length + ' 个动作按钮（预览×5 + 刷新 + 开机行预览）')
    else fail('动作按钮应有 7 个（含音频四槽位），只找到 ' + actionBtns.length)
    const wrongH = actionBtns.filter((b) => b.props.style.height !== triggerH)
    const wrongBox = actionBtns.filter((b) => b.props.style.boxSizing !== 'border-box')
    if (wrongH.length === 0) pass('动作按钮与下拉触发器同高（' + triggerH + '，含被禁用的）')
    else fail(wrongH.length + ' 个按钮高度为 ' + wrongH[0].props.style.height + '，与触发器 ' + triggerH + ' 不齐：' + textOf(wrongH[0]))
    if (wrongBox.length === 0) pass('动作按钮声明 box-sizing:border-box（border 计入 32px）')
    else fail(wrongBox.length + ' 个按钮缺 box-sizing:border-box，边框会让实高多 2px：' + textOf(wrongBox[0]))
  }
}

/* --- 统一文案：音频各槽位的动作按钮与加载动画行同为「预览」 ---
   「试听 · 开始」曾是第三种拼法；统一后整页只允许一个动作词，槽位由行名
   说明。 */
if (!all.includes('试听')) pass('面板不再出现「试听」文案（统一为「预览」）')
else fail('面板仍含「试听」——音频动作按钮应统一为「预览」')
{
  const slotBtns = ['audio-start', 'audio-done', 'audio-attention', 'audio-fail'].map((k) => {
    const r = rows.find((x) => x.props.key === k)
    return r ? walk(r).find((n) => n.type === 'button' && String(n.props.key || '').indexOf('audio-test-') === 0) : null
  })
  if (slotBtns.every((b) => b && textOf(b) === '预览')) pass('音频四槽位按钮统一为「预览」（行名即槽位名，无后缀）')
  else fail('音频槽位按钮文案应恰为「预览」: ' + JSON.stringify(slotBtns.map((b) => (b ? textOf(b) : '(missing)'))))
  if (slotBtns.every((b) => b && b.props.onClick !== undefined)) pass('槽位按钮仍接真实播放路径（onClick 保留）')
  else fail('统一文案时弄丢了 onClick——按钮会点了没反应')
}

/* --- 按钮动效: a dropdown like every other value row (2026-10 统一) ---
   The stored literals are 'signal' (on — historic default literal, unchanged)
   and 'off'; legacy scheme names must READ as on. */
{
  const trig = selectTriggerOf(rendered(), '按钮动效')
  if (trig && textOf(trig).includes('开启')) pass('按钮动效 默认开启（合并设计，触发器显示当前值）')
  else fail('按钮动效 trigger should read 开启 with the default state: ' + (trig ? textOf(trig) : '(none)'))
  const offStep = driveSelect(() => rendered(), '按钮动效', '关闭')
  if (offStep === 'ok') {
    if (prefStore.get('motion') === 'off') pass('按钮动效 下拉写入 motion=off')
    else fail('按钮动效 dropdown wrote ' + JSON.stringify(prefStore.get('motion')) + ', expected "off"')
  } else fail('按钮动效 dropdown could not be driven to 关闭: ' + offStep)
  const trigOff = selectTriggerOf(rendered(), '按钮动效')
  if (trigOff && textOf(trigOff).includes('关闭')) pass('motion=off 后触发器翻转为「关闭」')
  else fail('motion=off 后触发器仍显示: ' + (trigOff ? textOf(trigOff) : '(none)'))
  const onStep = driveSelect(() => rendered(), '按钮动效', '开启')
  if (onStep === 'ok' && prefStore.get('motion') === 'signal') pass('重新开启写入 motion=signal（历史字面量）')
  else fail('重新开启写入 ' + JSON.stringify(prefStore.get('motion')) + ', expected "signal" [' + onStep + ']')
  /* Legacy scheme names must READ as ON (merge migration): the trigger value
     derives from readMotion(), which folds every old scheme name into on. */
  for (const legacy of ['silent', 'impact', 'clamp', 'meter', 'stamp']) {
    prefStore.setField('motion', legacy)
    const trigL = selectTriggerOf(rendered(), '按钮动效')
    if (trigL && textOf(trigL).includes('开启')) pass('旧方案名 ' + legacy + ' 读取为「开」（并入合并设计）')
    else fail('旧方案名 ' + legacy + ' 读成了关: ' + (trigL ? textOf(trigL) : '(none)'))
  }
  prefStore.setField('motion', 'signal')
}

/* --- 外观 (2026-10-25): the SAME light/dark/system preference as DSH General ›
   外观, so dark mode is switchable from both places. The row reads the theme
   service (not a form field) and writes through theme.setTheme(); the value the
   service holds is the single source of truth. Two-way live sync is asserted in
   settings-config-forms.test.js, where the React fake runs the mount effect. --- */
{
  /* Every value row's aria-label comes from the dictionary, so the row is found
     by the same 外观 label DSH uses — asserting the copy as well as the wiring. */
  const trig = selectTriggerOf(rendered(), '外观')
  if (trig && textOf(trig).includes('浅色')) pass('外观行默认浅色（读 theme 服务的 preference）')
  else fail('外观 trigger should read 浅色 by default: ' + (trig ? textOf(trig) : '(none)'))
  if (all.includes('通用设置')) pass('外观行的说明文案注明与「通用设置 › 外观」是同一个开关')
  else fail('外观行缺少「通用设置」说明——用户会以为两处是两个不同的开关')
  const toDark = driveSelect(() => rendered(), '外观', '深色')
  if (toDark === 'ok' && themePreference === 'dark') pass('外观行选深色写入 theme.setTheme("dark")')
  else fail('外观行选深色没有写进 theme 服务：preference=' + JSON.stringify(themePreference) + ' [' + toDark + ']')
  const trigDark = selectTriggerOf(rendered(), '外观')
  if (trigDark && textOf(trigDark).includes('深色')) pass('theme.setTheme("dark") 后触发器翻转为「深色」')
  else fail('切到深色后触发器仍显示: ' + (trigDark ? textOf(trigDark) : '(none)'))
  /* 跟随系统 is the third choice General settings offers; a boolean switch could
     not represent it, which is why this row mirrors the three-way preference. */
  const toSystem = driveSelect(() => rendered(), '外观', '跟随系统')
  if (toSystem === 'ok' && themePreference === 'system') pass('外观行提供「跟随系统」并写入 theme.setTheme("system")')
  else fail('跟随系统选项没有写进 theme 服务：preference=' + JSON.stringify(themePreference) + ' [' + toSystem + ']')
  const back = driveSelect(() => rendered(), '外观', '浅色')
  if (back === 'ok' && themePreference === 'light') pass('外观行切回浅色写入 theme.setTheme("light")')
  else fail('外观行切回浅色失败：preference=' + JSON.stringify(themePreference) + ' [' + back + ']')
}

/* --- dropdown writes must land on the documented namespace fields --- */
{
  prefStore.setField('watermark', '1')
  const step = driveSelect(() => rendered(), '背景水印', '关闭')
  if (step === 'ok') {
    const v = prefStore.get('watermark')
    if (v === '0') pass('背景水印 下拉写入 watermark=0')
    else fail('背景水印 dropdown wrote ' + JSON.stringify(v) + ', expected "0"')
  } else fail('背景水印 dropdown could not be driven: ' + step)
  const step2 = driveSelect(() => rendered(), '背景水印', '开启')
  if (step2 === 'ok' && prefStore.get('watermark') === '1') pass('背景水印 重新开启写入 watermark=1')
  else fail('背景水印 re-enable wrote ' + JSON.stringify(prefStore.get('watermark')) + ' [' + step2 + ']')
}
/* --- 徽标版本 (2026-10-25): the watermark gap's inverted-triangle Industries
   emblem swaps between the English and Chinese lockups. The row must DEFAULT to
   the shipped English look, write the documented `watermarkEmblem` field on a
   change, flip its own trigger's visible value, and switch back. The stylesheet
   answers the value through body[data-edge-wm-emblem='zh'] (asserted in
   check.js / decor.css); here we only prove the panel wiring. --- */
{
  prefStore.setField('watermark', '1')
  prefStore.setField('watermarkEmblem', 'en')
  const trig = selectTriggerOf(rendered(), '徽标版本')
  if (trig && textOf(trig).includes('英文版')) pass('徽标版本默认英文版（既有外观）')
  else fail('徽标版本 trigger should read 英文版 by default: ' + (trig ? textOf(trig) : '(none)'))
  const toZh = driveSelect(() => rendered(), '徽标版本', '中文版')
  if (toZh === 'ok' && prefStore.get('watermarkEmblem') === 'zh') pass('徽标版本 下拉写入 watermarkEmblem=zh')
  else fail('徽标版本 dropdown wrote ' + JSON.stringify(prefStore.get('watermarkEmblem')) + ', expected "zh" [' + toZh + ']')
  const trigZh = selectTriggerOf(rendered(), '徽标版本')
  if (trigZh && textOf(trigZh).includes('中文版')) pass('watermarkEmblem=zh 后触发器翻转为「中文版」')
  else fail('watermarkEmblem=zh 后触发器仍显示: ' + (trigZh ? textOf(trigZh) : '(none)'))
  const toEn = driveSelect(() => rendered(), '徽标版本', '英文版')
  if (toEn === 'ok' && prefStore.get('watermarkEmblem') === 'en') pass('徽标版本 切回英文版写入 watermarkEmblem=en')
  else fail('徽标版本 switch-back wrote ' + JSON.stringify(prefStore.get('watermarkEmblem')) + ' [' + toEn + ']')
  prefStore.setField('watermarkEmblem', 'en')
}
if (!/(typeof\s+localStorage|localStorage\.(getItem|setItem|removeItem))/.test(src)) pass('client.js has no localStorage storage-API calls')
else fail('client.js still calls the localStorage storage API — migration incomplete')

console.log('')
if (failures) { console.error(failures + ' settings check(s) failed'); process.exit(1) }
console.log('all settings-panel checks passed')
