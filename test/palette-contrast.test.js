/**
 * palette-contrast.test.js — the accent palette must be MEASURED, not picked.
 *
 * This theme has one rule about colour (see README): every accent role is checked
 * against the surfaces it actually lands on, because two of the three historical
 * colour bugs in this repo were "the text is the same colour as the thing behind
 * it" — invisible chips and a 1.02:1 turn-status label. One palette ships
 * (谷地黄 / #fff500, on the plain body base block — the switchable 终末地灰 /
 * 武陵青 classes were removed in 2026-10), so the check is mechanical rather
 * than a promise, and it guards that removal too.
 *
 * It reads the REAL values out of client.js (the palette block) instead of
 * restating them, so a future edit to the stylesheet is what this test sees.
 * Restating them would only test the copy.
 *
 * Usage: node test/palette-contrast.test.js
 */
const fs = require('fs')
const path = require('path')
/* Single definition of how the stylesheet composes (src/styles manifest). */
const sources = require('../scripts/lib/sources.js')

const ROOT = path.resolve(__dirname, '..')
const src = fs.readFileSync(path.join(ROOT, 'client.js'), 'utf8')
/* CSS-rule assertions read the SOURCE stylesheet: the build embeds the css as
   an escaped string literal, so selector/block layout only exists in src/. */
const css = sources.concatCss()
/* JS token-override literals keep their single-quoted spelling only in the
   pre-bundle client source (the bundler re-quotes artifact strings). */
/* The token literals moved to ui/tokens.js with the module split; read the whole client tree. */
const clientSrc = sources.concatClientJs()

/* 暗色三档（2026-10-24）：tokens.js 的暗色列全部是 var(--edge-dark-*) 引用，
   档位真值声明在样式表梯度里（第一个 body 块 = 默认档 soft/C「舒适」）。
   resolveDark 把 var 引用解析成默认档字面值供对比度取数；亮色仍读字面量。
   依据 docs/notes/dark-palette-research.md（三档自身的对比关系已在该报告
   逐档实算，此处钉默认档）。 */
const LADDER = {}
{
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const m of noComments.matchAll(/--edge-dark-([a-z0-9-]+):\s*(#[0-9a-f]{6})/g)) {
    if (LADDER[m[1]] === undefined) LADDER[m[1]] = m[2].toLowerCase()
  }
}
const resolveDark = (raw) => {
  const v = /^var\(--edge-dark-([a-z0-9-]+)\)$/.exec(String(raw).trim())
  return v ? LADDER[v[1]] : raw
}
/* css 侧（surfaces.css 兜底块）的 var() 值同样经 LADDER 解析成默认档字面值 */
const cssVarVal = (name) => {
  const m = new RegExp(name + ':\\s*var\\(--edge-dark-([a-z0-9-]+)\\)', 'i').exec(css)
  return m ? LADDER[m[1]] : undefined
}

let failures = 0
const fail = (m) => { console.error('FAIL  ' + m); failures++ }
const pass = (m) => console.log('ok    ' + m)

/* ---------- colour maths (sRGB, WCAG 2.x) ---------- */
const hex = (h) => {
  const s = h.trim().replace('#', '')
  const f = s.length === 3 ? s.split('').map((c) => c + c).join('') : s
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)]
}
const lin = (v) => {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}
const lum = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2])
const ratio = (a, b) => {
  const la = lum(a), lb = lum(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
/** Composite `fg` at `alpha` over opaque `bg` (what a translucent wash really shows). */
const over = (fg, bg, alpha) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha))

/* ---------- surfaces this theme actually paints on ---------- */
const LIGHT_BGS = { 'bg-base': hex('#e8e8e2'), 'bg-layer-1': hex('#f2f2ec') }
const DARK_BGS = { 'bg-base': hex('#101110'), 'bg-layer-1': hex('#181a18') }
const INK = hex('#101110')

/* ---------- pull the palette definitions out of the real stylesheet ---------- */
const varIn = (block, name) => {
  if (block === null) return null
  const m = block.match(new RegExp('\\n\\s*' + name + '\\s*:\\s*([^;]+);'))
  return m ? m[1].trim() : null
}

/* The one palette block is the one that DEFINES --edge-accent (plain `body {`
   appears many times in this stylesheet, so find the right occurrence). */
const defaultBlock = (() => {
  let from = 0
  for (;;) {
    const i = css.indexOf('\n      body {', from)
    if (i < 0) return null
    const j = src.indexOf('}', i)
    const b = css.slice(i, j)
    if (/--edge-accent\s*:/.test(b)) return b
    from = i + 1
  }
})()
if (defaultBlock === null) { fail('no body block defines --edge-accent (谷地黄 palette missing)'); }

/* The switchable palettes are GONE: 谷地黄 must be the ONLY accent block, on the
   plain body. A leftover body.theme-endfield-* override block would still win the
   cascade the moment its class came back, so its absence is asserted here too
   (check.js guards the same from the build side). */
if (!/body\.theme-endfield-(wuling|gray|valley)\s*\{/.test(css)) {
  pass('样式表不再含切换配色的覆盖块（仅 body 基础块的谷地黄）')
} else {
  fail('样式表仍有 body.theme-endfield-* 覆盖块 —— 对应配色已随设置行移除')
}
if (failures) { console.error('\n' + failures + ' palette check(s) failed'); process.exit(1) }

const palettes = {
  '谷地黄': defaultBlock,
}

/* ---------- 1. accent used as a SOLID FILL under ink text ----------
   Rows, badges, the new-session button, approval chips and ::selection all paint
   the accent as a background with #101110 / #000 on top. That pairing is the most
   reused one in the theme, so it must clear AA on its own. */
for (const [name, block] of Object.entries(palettes)) {
  const accent = varIn(block, '--edge-accent')
  if (accent === null) { fail(name + ': --edge-accent is not defined'); continue }
  const r = ratio(INK, hex(accent))
  if (r >= 4.5) pass(name + ' 实心强调色底 + 墨色字：' + r.toFixed(2) + ':1 (AA)')
  else fail(name + ' ink-on-accent is only ' + r.toFixed(2) + ':1 — chips/rows become illegible')

  // The hover variant carries the same text, so it needs the same guarantee.
  const deep = varIn(block, '--edge-accent-deep')
  if (deep === null) { fail(name + ': --edge-accent-deep is not defined'); continue }
  const rd = ratio(INK, hex(deep))
  if (rd >= 4.5) pass(name + ' 悬停加深底 + 墨色字：' + rd.toFixed(2) + ':1 (AA)')
  else fail(name + ' ink-on-accent-deep is only ' + rd.toFixed(2) + ':1')
}

/* ---------- 2. turn-status gradient text ("Deep diving...") ----------
   Gradient text: EVERY stop paints glyphs, and under prefers-reduced-motion the
   mid stop is pinned inside the letters permanently, so both stops must clear AA
   against both backgrounds of their mode. This is the exact bug that made the
   label 1.02:1 with signal yellow. */
const gradientRoles = [
  ['--edge-status-light', LIGHT_BGS, '亮色主色'],
  ['--edge-status-light-mid', LIGHT_BGS, '亮色亮带'],
  ['--edge-status-dark', DARK_BGS, '暗色主色'],
  ['--edge-status-dark-mid', DARK_BGS, '暗色亮带'],
]
for (const [name, block] of Object.entries(palettes)) {
  for (const [v, bgs, label] of gradientRoles) {
    const val = varIn(block, v)
    if (val === null) { fail(name + ': ' + v + ' is not defined'); continue }
    let worst = Infinity
    let worstBg = ''
    for (const [bgName, bg] of Object.entries(bgs)) {
      const r = ratio(hex(val), bg)
      if (r < worst) { worst = r; worstBg = bgName }
    }
    if (worst >= 4.5) pass(name + ' 回合状态 ' + label + ' ' + val + '：最差 ' + worst.toFixed(2) + ':1 vs ' + worstBg + ' (AA)')
    else fail(name + ' turn-status ' + label + ' ' + val + ' is ' + worst.toFixed(2) + ':1 vs ' + worstBg + ' — fails AA (gradient text paints glyphs with every stop)')
  }
}

/* ---------- 3. accent as ICON/TEXT ink in dark mode ----------
   Dark mode paints the accent as foreground on icon buttons and links, so it is
   real text contrast, not decoration. 3:1 is the floor for large glyph/icon ink. */
for (const [name, block] of Object.entries(palettes)) {
  const accent = varIn(block, '--edge-accent')
  if (accent === null) continue
  let worst = Infinity
  for (const bg of Object.values(DARK_BGS)) worst = Math.min(worst, ratio(hex(accent), bg))
  if (worst >= 3) pass(name + ' 暗色图标/链接强调色：' + worst.toFixed(2) + ':1 (>=3 非文本/大字号下限)')
  else fail(name + ' accent-as-ink in dark mode is only ' + worst.toFixed(2) + ':1')
}

/* ---------- 5. hero glow depth ----------
   The glow replaces the app's own #6187D8 at 8%. The README's rule is that the
   replacement must not make the hero read LOUDER than the glow it replaces,
   measured as the luminance shift of the composited ellipse core against the page.

   The bound is deliberately ONE-SIDED, and getting this wrong is instructive: a
   symmetric "within N of the blue" bar fails the SHIPPED yellow light value, which
   sits at ΔY -0.17 against the blue's -7.90. That is not a defect — on cream,
   yellow is almost luminance-neutral and shifts chroma instead (blue channel -18),
   which the README records as "a warm breath on the paper rather than the blue's
   grey-blue darkening — gentler than what it replaces, not louder". Quieter than
   the original is always acceptable; louder is the regression worth catching. */
const glowAlpha = (block, name) => {
  const v = varIn(block, name)
  return v === null ? null : Number(v)
}
const yShift = (fg, bg, a) => {
  const c = over(fg, bg, a)
  const Y = (p) => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]
  return Y(c) - Y(bg)
}
const BLUE = hex('#6187D8')
for (const [name, block] of Object.entries(palettes)) {
  const accent = varIn(block, '--edge-accent')
  if (accent === null) continue
  for (const [mode, bg] of [['light', LIGHT_BGS['bg-base']], ['dark', DARK_BGS['bg-base']]]) {
    const a = glowAlpha(block, '--edge-glow-' + mode)
    if (a === null) { fail(name + ': --edge-glow-' + mode + ' is not defined'); continue }
    const mine = Math.abs(yShift(hex(accent), bg, a))
    const blue = Math.abs(yShift(BLUE, bg, 0.08))
    // 2 Y of headroom over the original: below the ~3 Y level where a change in
    // hero depth becomes noticeable side by side.
    const budget = blue + 2
    if (mine <= budget) {
      pass(name + ' hero 光晕 ' + mode + ' α=' + a + '：|ΔY| ' + mine.toFixed(2)
        + ' <= ' + budget.toFixed(2) + '（原品牌蓝 ' + blue.toFixed(2) + '）')
    } else {
      fail(name + ' hero glow ' + mode + ' |ΔY| ' + mine.toFixed(2)
        + ' exceeds the ' + budget.toFixed(2) + ' budget set by the blue it replaces ('
        + blue.toFixed(2) + ') — the hero reads louder than stock')
    }
  }
}

/* ---------- 6. accent notation ----------
   Every accent value in this package is written as HEX, so assert the notation as
   well as the colour. The first version carried the accent in two notations (hex in
   CSS, rgb() in the settings row and the canvas strokes), which is exactly how two
   spellings of one colour drift apart. */
const ay = varIn(palettes['谷地黄'], '--edge-accent')
if (ay !== null && /^#[0-9a-f]{6}$/i.test(ay)) pass('谷地黄 强调色为 6 位十六进制：' + ay)
else fail('谷地黄 --edge-accent should be a 6-digit hex value, got ' + ay)

/* ---------- 12. the signal arrow vs the FILL it is drawn on ----------
   The merged motion design slides an accent-ink arrow into the new-session CTA,
   whose own fill IS --edge-accent (hover --edge-accent-deep). The arrow is
   therefore a graphic ON a solid accent surface, and it must be checked THERE.
   (This section originally guarded the meter readout bar — same surface, same
   token, and the same two invisible versions shipped first: --edge-accent at
   1.00:1, then --edge-accent-onpaper, which EQUALS the accent in both bright
   palettes (1.00-1.51:1). The lesson carries over verbatim.)
   Its first version used --edge-accent (1.00:1 at rest — literally invisible) and
   the second used --edge-accent-onpaper, which is EQUAL to the accent in both
   bright palettes (1.00-1.51:1). The role that actually pairs with an accent fill
   everywhere in this theme is --edge-accent-ink, so that is what the CSS uses and
   what this section checks. Non-text UI graphics need 3:1 (WCAG 1.4.11).
   Nothing here covered either candidate token before, which is exactly why two
   invisible-bar versions could ship. */
for (const [name, block] of Object.entries(palettes)) {
  const ink = varIn(block, '--edge-accent-ink')
  const accent = varIn(block, '--edge-accent')
  const deep = varIn(block, '--edge-accent-deep')
  if (ink === null) { fail(name + ': --edge-accent-ink is not defined'); continue }
  for (const [label, fill] of [['强调实心底', accent], ['悬停加深底', deep]]) {
    if (fill === null) { fail(name + ': ' + label + ' 未定义'); continue }
    const r = ratio(hex(ink), hex(fill))
    if (r >= 3) pass(name + ' 信号箭头(accent-ink) / ' + label + '：' + r.toFixed(2) + ':1 (>=3 非文本下限)')
    else fail(name + ' signal arrow on ' + label + ' is only ' + r.toFixed(2) + ':1 — the bar disappears')
  }
}
/* ---------- 13. the 划词灰 pair and its three 2026-10 applications ----------
   The model-menu / permission current rows and the composer + hover paint with
   the ::selection pair (--edge-select-fill / --edge-select-ink). The VALUES are
   the scheme-gray declared on the plain body blocks (this test reads them from
   client.js, never restating a hex); what this section adds is (a) the pair's
   contrast in both schemes, and (b) the guarantee that all three applications
   actually reference those tokens — a hardcoded #d9d9d9 would pass (a) and still
   break the dark scheme, which is exactly the class of drift (a) alone cannot
   see. */
{
  /* The pair is SCHEME-only (declared on plain body / body[data-ds-dark-theme],
     never per palette — see the ::selection block in client.js), so read the two
     scheme blocks the same way defaultBlock is found. */
  const schemeBlock = (dark) => {
    const needle = dark ? '\n      body[data-ds-dark-theme] {' : '\n      body {'
    let from = 0
    for (;;) {
      const i = css.indexOf(needle, from)
      if (i < 0) return null
      const b = css.slice(i, css.indexOf('}', i))
      if (b.includes('--edge-select-fill')) return b
      from = i + 1
    }
  }
  for (const [blk, label] of [[schemeBlock(false), '亮色'], [schemeBlock(true), '暗色']]) {
    if (blk === null) { fail('划词灰 ' + label + '：选择令牌块未找到'); continue }
    const fill = varIn(blk, '--edge-select-fill')
    const ink = varIn(blk, '--edge-select-ink')
    if (fill === null || ink === null) { fail('划词灰 ' + label + '：fill/ink 未定义'); continue }
    const r = ratio(hex(ink), hex(fill))
    if (r >= 4.5) pass('划词灰 ' + label + ' 选择底 + 选择墨：' + r.toFixed(2) + ':1 (AA)')
    else fail('划词灰 ' + label + ' pair is only ' + r.toFixed(2) + ':1')
  }
  const hooks = [
    ["[role='menuitemradio'][aria-checked='true']", '模型菜单当前项'],
    ["[role='menuitem'][class*='_selected']:has([class$='_optionLabel'])", '权限弹层当前项'],
  ]
  for (const [needle, name] of hooks) {
    /* The explanatory COMMENT names these selectors verbatim, so indexOf alone
       would read the comment. Walk every occurrence and take the one that is a
       RULE: followed by a declaration block within 600 chars (the model-menu
       selector list carries the settings-dropdown :not() carve-out). */
    let i = -1, body = ''
    for (let at = src.indexOf(needle); at >= 0; at = src.indexOf(needle, at + 1)) {
      const candidate = src.slice(at, at + 600)
      if (candidate.includes('background-color')) { i = at; body = candidate; break }
    }
    if (i < 0) { fail('划词灰 · ' + name + ' 的规则不在样式表里'); continue }
    if (body.includes('var(--edge-select-fill') && body.includes('var(--edge-select-ink')) {
      pass('划词灰 · ' + name + ' 引用的是 --edge-select-* 令牌（非硬编码）')
    } else {
      fail('划词灰 · ' + name + ' 未引用选择令牌  [' + body.slice(0, 80) + ']')
    }
  }
  const addIdx = src.indexOf("[class*='_add']:hover:not(:disabled)")
  if (addIdx >= 0) {
    const addBody = src.slice(addIdx, addIdx + 400)
    if (addBody.includes('var(--edge-select-fill') && addBody.includes('var(--edge-select-ink')) {
      pass('划词灰 · 添加按钮悬停引用的是 --edge-select-* 令牌（非硬编码）')
    } else {
      fail('划词灰 · 添加按钮悬停未引用选择令牌  [' + addBody.slice(0, 80) + ']')
    }
  } else {
    fail('划词灰 · 添加按钮悬停规则缺失')
  }
  /* 第四个应用（2026-10-15）：输入卡操作条 chips（插件/自动化任务/设置/
     工作区内修改/模型选择/智能体团队/标准模式/后台任务）的悬停/按下。
     两路都要引用同一对令牌：容器内令牌重映射（--dsw-alias-interactive-bg-*
     → select-fill）与 _trigger 收灰规则（盖过全局 _trigger 实心强调）。 */
  const remapIdx = src.indexOf("--dsw-alias-interactive-bg-hover: var(--edge-select-fill)")
  if (remapIdx >= 0) {
    const remapBody = src.slice(Math.max(0, remapIdx - 400), remapIdx + 400)
    const count = (remapBody.match(/var\(--edge-select-fill\)/g) || []).length
    if (count >= 4) pass('划词灰 · 操作条 chips 令牌重映射 ≥4 项全指向 --edge-select-fill（hover/solid/accent/active）')
    else fail('操作条 chips 重映射不完整（' + count + '/4 项）')
  } else fail('划词灰 · 操作条 chips 重映射规则缺失')
  const trigIdx = src.indexOf("[class$='_trigger'][aria-expanded='true'],\n      :is([data-composer-seat]")
  const trigAlt = src.indexOf(") [class$='_trigger']:hover:not(:disabled)")
  if (trigIdx >= 0 || trigAlt >= 0) {
    const trigBody = src.slice(trigIdx >= 0 ? trigIdx : trigAlt, (trigIdx >= 0 ? trigIdx : trigAlt) + 700)
    if (trigBody.includes('var(--edge-select-fill') && trigBody.includes('var(--edge-select-ink')) {
      pass('划词灰 · chips 的 _trigger 收灰规则引用 --edge-select-* 令牌（盖过全局实心强调）')
    } else fail('chips _trigger 收灰规则未引用选择令牌')
  } else fail('划词灰 · chips _trigger 收灰规则缺失')
  /* the dark full-inversion rule must carve BOTH surfaces out, or it would
     repaint them solid accent in dark with !important and win the cascade. */
  const darkRule = src.indexOf("[class*='selected' i]:not([class*='unselected' i])")
  if (darkRule >= 0 && src.slice(darkRule, darkRule + 300).includes(":not([role='menuitemradio']):not([role='menuitem']:has([class$='_optionLabel']))")) {
    pass('划词灰 · 暗色「选中行反转」规则已为两处菜单面开洞（不会盖回强调黄）')
  } else {
    fail('划词灰 · 暗色反转规则未开洞，暗色下两处菜单仍会被涂成强调黄')
  }
}

/* ---------- 10b. settings dropdown: the official filter-dropdown plate ----------
   The control copies the official /operator Dropdown: a FIXED dark plate with
   white text, and a hatched gray selected row with white text — the same in
   both schemes and every palette. The official selected gray #8f8f8f only gives
   white text ~3.2:1, so the row was lowered to this theme's dark selection gray;
   these lines prove every text/fill pair the control paints clears AA, reading
   the values out of the real rules. */
{
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*/g, ' ')
  const ruleOf = (sel) => {
    const m = new RegExp(sel.replace(/[.[\]'()]/g, (c) => '\\' + c) + '\\s*\\{([^}]*)\\}').exec(flat)
    return m ? m[1] : null
  }
  const decl = (body, prop) => {
    if (body === null) return null
    const m = new RegExp('(?:^|;)\\s*' + prop + ':\\s*(#[0-9a-f]{6})\\s*(?:;|$)', 'i').exec(body)
    return m ? m[1] : null
  }
  const trig = ruleOf('.endfield-select-trigger')
  const hover = ruleOf('.endfield-select-trigger:hover:not(:disabled)')
  const optBg = ruleOf('.endfield-select-option-bg')
  const selected = ruleOf(".endfield-select-option[aria-checked='true']")
  /* the hatch stripe colour: the stop written as "<c> 0, <c> <pos>%" */
  const stripe = optBg === null ? null : ((/(#[0-9a-f]{6}) 0, \1 [\d.]+%/i.exec(optBg) || [])[1] || null)
  const pairs = [
    ['铭牌白字 / 铭牌底', decl(trig, 'color'), decl(trig, 'background-color')],
    ['铭牌白字 / 悬停底', decl(trig, 'color'), decl(hover, 'background-color')],
    ['选中行白字 / 斜纹底色', decl(selected, 'color'), decl(optBg, 'background-color')],
    ['选中行白字 / 斜纹线色', decl(selected, 'color'), stripe],
  ]
  for (const [name, fg, bg] of pairs) {
    if (fg === null || bg === null) { fail('设置下拉 · ' + name + '：规则里读不到色值'); continue }
    const r = ratio(hex(fg), hex(bg))
    if (r >= 4.5) pass('设置下拉 · ' + name + '：' + fg + ' on ' + bg + ' = ' + r.toFixed(2) + ':1 (AA)')
    else fail('设置下拉 · ' + name + ' is only ' + r.toFixed(2) + ':1 (' + fg + ' on ' + bg + ')')
  }
  /* The plate is the control's boundary, so on paper it must clear the 3:1
     non-text floor against both surfaces it sits on. On near-black the plate is
     the LIGHTER shape and the white value text carries the affordance; it only
     has to read as a distinct plate there (>= 1.5:1). */
  const plate = decl(trig, 'background-color')
  if (plate === null) fail('设置下拉 · 铭牌底色读不到')
  else {
    for (const [scheme, bgs, floor] of [['亮色', LIGHT_BGS, 3], ['暗色', DARK_BGS, 1.5]]) {
      for (const [bgName, bg] of Object.entries(bgs)) {
        const r = ratio(hex(plate), bg)
        if (r >= floor) pass('设置下拉 · 铭牌对' + scheme + ' ' + bgName + '：' + r.toFixed(2) + ':1 (>= ' + floor + ')')
        else fail('设置下拉 · 铭牌在' + scheme + ' ' + bgName + ' 上读不出来：' + r.toFixed(2) + ':1')
      }
    }
  }
}

/* ---------- 10b-bis. dark tiers: every ladder paints sound pairs ----------
   The dark palette is three switchable ladders (2026-10-24). Parse each tier
   block out of the real stylesheet (default block = soft/C, plus the
   [data-endfield-dark] blocks) and assert the load-bearing pairs per tier —
   body text in the comfort band (4.5 AA floor, 15 comfort ceiling), secondary
   ≥4.5, keycap raised over the bubble overlay ≥1.06, border-l1 within the
   theme's own 1.6 decorative ceiling over the base. */
{
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const tierBlocks = [...noComments.matchAll(/(--edge-dark-[a-z0-9-]+):\s*(#[0-9a-f]{6})/g)]
  const tiers = new Map()
  const order = []
  for (const m of tierBlocks) {
    const block = m.index >= noComments.indexOf("data-endfield-dark='neutral'") && m.index < noComments.indexOf("data-endfield-dark='warm'")
      ? 'neutral' : (m.index > noComments.indexOf("data-endfield-dark='warm'") ? 'warm' : 'soft')
    if (!tiers.has(block)) { tiers.set(block, {}); order.push(block) }
    if (!(m[1].slice(12) in tiers.get(block))) tiers.get(block)[m[1].slice(12)] = m[2].toLowerCase()
  }
  if (order.length !== 3 || tiers.get('soft').base !== '#1c1c1b' || tiers.get('warm').base !== '#161615' || tiers.get('neutral').base !== '#191919') {
    fail('暗色三档 · 梯度块解析失败（' + order.join('/') + '，soft=' + (tiers.get('soft') || {}).base + '）')
  } else for (const t of order) {
    const L = tiers.get(t)
    const rBody = ratio(hex(L['label-primary']), hex(L.base))
    if (rBody >= 4.5 && rBody <= 15) pass('暗色三档 · ' + t + ' 正文×底 ' + rBody.toFixed(2) + ':1（AA 且 ≤15 舒适上限）')
    else fail('暗色三档 · ' + t + ' 正文 ' + rBody.toFixed(2) + ':1 出带')
    const rSec = ratio(hex(L['label-secondary']), hex(L.base))
    if (rSec >= 4.5) pass('暗色三档 · ' + t + ' 次级×底 ' + rSec.toFixed(2) + ':1 (AA)')
    else fail('暗色三档 · ' + t + ' 次级 ' + rSec.toFixed(2) + ':1 低于 AA')
    const rKey = ratio(hex(L.raised), hex(L.overlay))
    if (rKey >= 1.06) pass('暗色三档 · ' + t + ' 键帽(raised)×气泡(overlay) ' + rKey.toFixed(2) + ':1（装饰下限）')
    else fail('暗色三档 · ' + t + ' 键帽读不出来：' + rKey.toFixed(2) + ':1')
    const rB1 = ratio(hex(L['border-l1']), hex(L.base))
    if (rB1 >= 1.06 && rB1 <= 1.6) pass('暗色三档 · ' + t + ' 描边L1×底 ' + rB1.toFixed(2) + ':1（装饰区间）')
    else fail('暗色三档 · ' + t + ' 描边L1 ' + rB1.toFixed(2) + ':1 出区间')
  }
}

/* ---------- 10c. hover tooltip: the floating paper chip ----------
   The app's Tooltip primitive bubbles ([role='tooltip'], e.g. the sidebar 归档
   hint) ship near-black (#2c2c2e/#43454a) with white text — a dead-black chip on
   the paper theme. The theme moves them into its floating-surface family: overlay
   paper fill + ink text + hairline ring + the official panel shadow. The fill and
   keycap fill live in TWO layers (overrideTokens for the real app, which writes
   alias tokens as body inline styles, plus stylesheet body fallback blocks); this
   section reads BOTH out of client.js, proves they agree, and measures every
   text/fill pair plus the decorative floors (ring edge, keycap separation). */
{
  const jsToken = (name) => {
    const m = new RegExp("'" + name + "'\\s*:\\s*\\{\\s*light:\\s*'(#[0-9a-f]{6})'\\s*,\\s*dark:\\s*'([^']+)'", 'i').exec(clientSrc)
    return m ? { light: m[1], dark: resolveDark(m[2]) } : null
  }
  const cssVals = (name) => [...css.matchAll(new RegExp(name + ':\\s*(#[0-9a-f]{6})', 'gi'))].map((m) => m[1].toLowerCase())
  const bubble = jsToken('--dsw-alias-tooltip-bg')
  const key = jsToken('--dsw-alias-tooltip-key-bg')
  const text = jsToken('--dsw-alias-label-primary')
  const ring = { light: (jsToken('--dsw-alias-border-l2') || {}).light, dark: (jsToken('--dsw-alias-border-l1') || {}).dark }
  const surfaces = { light: [(jsToken('--dsw-alias-bg-base') || {}).light, (jsToken('--dsw-alias-bg-layer-1') || {}).light],
                     dark: [(jsToken('--dsw-alias-bg-base') || {}).dark, (jsToken('--dsw-alias-bg-layer-1') || {}).dark] }
  if (!bubble || !key || !text || !ring.light || !ring.dark || surfaces.light.some((v) => !v) || surfaces.dark.some((v) => !v)) {
    fail('提示气泡 · overrideTokens 层读不齐（bubble/key/text/ring/surface）')
  } else {
    /* the stylesheet fallback blocks must carry the same values as the token
       layer, in source order light-then-dark — otherwise the two layers drift. */
    const fbBg = cssVals('--dsw-alias-tooltip-bg')
    const fbKey = cssVals('--dsw-alias-tooltip-key-bg')
    const fbBgDark = cssVarVal('--dsw-alias-tooltip-bg')
    const fbKeyDark = cssVarVal('--dsw-alias-tooltip-key-bg')
    if (fbBg.length === 1 && fbBg[0] === bubble.light.toLowerCase() && fbBgDark === bubble.dark.toLowerCase()) {
      pass('提示气泡 · 兜底块气泡底与令牌层一致：' + fbBg[0] + ' / var→' + fbBgDark)
    } else fail('提示气泡 · 兜底块气泡底漂移：' + JSON.stringify(fbBg) + '+var→' + fbBgDark + ' ≠ ' + bubble.light + '/' + bubble.dark)
    if (fbKey.length === 1 && fbKey[0] === key.light.toLowerCase() && fbKeyDark === key.dark.toLowerCase()) {
      pass('提示气泡 · 兜底块键帽底与令牌层一致：' + fbKey[0] + ' / var→' + fbKeyDark)
    } else fail('提示气泡 · 兜底块键帽底漂移：' + JSON.stringify(fbKey) + '+var→' + fbKeyDark + ' ≠ ' + key.light + '/' + key.dark)
    for (const mode of ['light', 'dark']) {
      const label = mode === 'light' ? '亮色' : '暗色'
      const r1 = ratio(hex(text[mode]), hex(bubble[mode]))
      if (r1 >= 4.5) pass('提示气泡 · ' + label + '气泡字/气泡底：' + text[mode] + ' on ' + bubble[mode] + ' = ' + r1.toFixed(2) + ':1 (AA)')
      else fail('提示气泡 · ' + label + '气泡字只有 ' + r1.toFixed(2) + ':1')
      const r2 = ratio(hex(text[mode]), hex(key[mode]))
      if (r2 >= 4.5) pass('提示气泡 · ' + label + '键帽字/键帽底：' + text[mode] + ' on ' + key[mode] + ' = ' + r2.toFixed(2) + ':1 (AA)')
      else fail('提示气泡 · ' + label + '键帽字只有 ' + r2.toFixed(2) + ':1')
      const r3 = ratio(hex(key[mode]), hex(bubble[mode]))
      if (r3 >= 1.06) pass('提示气泡 · ' + label + '键帽底/气泡底：' + r3.toFixed(2) + ':1 (装饰下限 1.06)')
      else fail('提示气泡 · ' + label + '键帽在气泡上读不出来：' + r3.toFixed(2) + ':1')
      const r4 = ratio(hex(ring[mode]), hex(bubble[mode]))
      if (r4 >= 1.06) pass('提示气泡 · ' + label + '描边/气泡底：' + r4.toFixed(2) + ':1 (装饰下限 1.06)')
      else fail('提示气泡 · ' + label + '描边在气泡上读不出来：' + r4.toFixed(2) + ':1')
      /* the keycap's own inset hairline is border-l2 in BOTH modes */
      const r6 = ratio(hex((jsToken('--dsw-alias-border-l2') || {})[mode]), hex(key[mode]))
      if (r6 >= 1.06) pass('提示气泡 · ' + label + '键帽描边/键帽底：' + r6.toFixed(2) + ':1 (装饰下限 1.06)')
      else fail('提示气泡 · ' + label + '键帽描边读不出来：' + r6.toFixed(2) + ':1')
      surfaces[mode].forEach((s, i) => {
        const r5 = ratio(hex(ring[mode]), hex(s))
        if (r5 >= 1.06) pass('提示气泡 · ' + label + '描边/浮面' + (i + 1) + '：' + r5.toFixed(2) + ':1 (分离下限 1.06)')
        else fail('提示气泡 · ' + label + '气泡在浮面' + (i + 1) + ' 上分不开：' + r5.toFixed(2) + ':1')
      })
    }
  }
}

/* ---------- 10d. 对话/轨迹 tabs: the official /news SubpageTab wash steps ----------
   The tabs' hover used to copy the /news IMAGE-CARD scrim (rgba(0,0,0,.25)),
   which composites to 1.81:1 on the paper — a black slab. The official tab
   component (SubpageTab, c1b6a925ef3d04ee.css, first-hand quotes in the motion
   research appendix E) uses LIGHT washes instead: hover #f3f3f3 and active
   #e5e5e5 over its white page. Those official steps are 1.08:1 / 1.21:1; the
   theme reproduces the STEPS on its own paper via rgba alphas. This section
   reads the alphas out of the real rules, composites them over bg-base, and
   proves both steps land on the official ratios — plus ink text stays AA on
   the deeper active wash. */
{
  const official = (fg, bg) => ratio(hex(fg), hex(bg))
  const offHover = official('#f3f3f3', '#ffffff')
  const offActive = official('#e5e5e5', '#ffffff')
  /* rule bodies, not indexOf windows: the same ::before selector also appears
     inside the reduced-transparency block as a bare display:none. */
  const bodiesOf = (selPat) => [...css.matchAll(new RegExp(selPat + '\\s*\\{([^}]*)\\}', 'g'))].map((m) => m[1])
  const alphaIn = (body) => { const m = /rgba\(0, 0, 0, 0\.(\d+)\)/.exec(body); return m === null ? null : Number('0.' + m[1]) }
  const hoverA = bodiesOf("\\[class\\$='_centerCol'\\] \\[class\\$='_tabs'\\] :is\\(\\[class\\$='_tab'\\],\\[class\\$='_tabActive'\\]\\)::before").map(alphaIn).find((v) => v !== null)
  const activeA = bodiesOf("\\[class\\$='_centerCol'\\] \\[class\\$='_tabs'\\] \\[class\\$='_tabActive'\\]::before").map(alphaIn).find((v) => v !== null)
  const paperM = new RegExp("'--dsw-alias-bg-base'\\s*:\\s*\\{\\s*light:\\s*'(#[0-9a-f]{6})'", 'i').exec(clientSrc)
  const paper = paperM ? paperM[1] : null
  if (hoverA === undefined || activeA === undefined || paper === null) {
    fail('页签洗面 · 规则或纸底令牌读不到（hover alpha=' + hoverA + '，active alpha=' + activeA + '）')
  } else {
    const comp = (a) => over([0, 0, 0], hex(paper), a)
    const rHover = ratio(comp(hoverA), hex(paper))
    const rActive = ratio(comp(activeA), hex(paper))
    /* hover step must sit on the official 1.08 within a tight band */
    if (Math.abs(rHover - offHover) <= 0.06) pass('页签洗面 · 悬停档 = 官方 #f3f3f3 步（' + rHover.toFixed(3) + ':1 vs 官方 ' + offHover.toFixed(3) + ':1，alpha .' + String(hoverA).slice(2) + '）')
    else fail('页签悬停档偏离官方步：' + rHover.toFixed(3) + ':1（官方 ' + offHover.toFixed(3) + ':1）')
    if (Math.abs(rActive - offActive) <= 0.06) pass('页签洗面 · 激活档 = 官方 #e5e5e5 步（' + rActive.toFixed(3) + ':1 vs 官方 ' + offActive.toFixed(3) + ':1，alpha .' + String(activeA).slice(2) + '）')
    else fail('页签激活档偏离官方步：' + rActive.toFixed(3) + ':1（官方 ' + offActive.toFixed(3) + ':1）')
    /* hierarchy must not invert: active >= hover, and neither may return to slab strength */
    if (rActive > rHover) pass('页签洗面 · 层级不倒挂（激活 ' + rActive.toFixed(3) + ' > 悬停 ' + rHover.toFixed(3) + '）')
    else fail('页签洗面层级倒挂：悬停比激活还深')
    if (rActive < 1.6) pass('页签洗面 · 两档都在装饰区间内（激活 ' + rActive.toFixed(2) + ':1 < 1.6，黑方片不回归）')
    else fail('页签洗面过深，黑方片回归：' + rActive.toFixed(2) + ':1')
    /* ink text on the deeper active wash stays AA */
    const inkOnWash = ratio(hex('#101110'), comp(activeA))
    if (inkOnWash >= 4.5) pass('页签洗面 · 墨字/激活洗面：' + inkOnWash.toFixed(2) + ':1 (AA)')
    else fail('页签墨字在激活洗面上只有 ' + inkOnWash.toFixed(2) + ':1')
    /* the official active choreography: circular arrow chip + #d9d9d9 gutter
       divider. Values read out of the shipped rule (the SVG data URI carries
       the chip colours literally; the divider reads the border-l1 token). */
    const circleM = /fill='%23([0-9a-f]{6})'/i.exec(src)
    const chevM = /stroke='%23([0-9a-f]{6})'/i.exec(src)
    const bl1 = { light: hoverA === undefined ? null : (new RegExp("'--dsw-alias-border-l1'\\s*:\\s*\\{\\s*light:\\s*'(#[0-9a-f]{6})'", 'i').exec(clientSrc) || [])[1], dark: resolveDark((new RegExp("'--dsw-alias-border-l1'\\s*:\\s*\\{[^}]*dark:\\s*'([^']+)'", 'i').exec(clientSrc) || [])[1]) }
    if (circleM && chevM && bl1.light && bl1.dark) {
      const circle = '#' + circleM[1], chev = '#' + chevM[1]
      const rCircle = ratio(hex(circle), comp(activeA))
      if (rCircle >= 1.06 && rCircle <= 1.6) pass('页签箭头 · 圆片/激活洗面：' + circle + ' = ' + rCircle.toFixed(2) + ':1（官方 #fafafa/#e5e5e5 ' + official('#fafafa', '#e5e5e5').toFixed(2) + ':1，装饰区间）')
      else fail('页签箭头圆片对比度出区间：' + rCircle.toFixed(2) + ':1')
      const rChev = ratio(hex(chev), hex(circle))
      if (rChev >= 1.6) pass('页签箭头 · 山形/圆片：' + chev + ' = ' + rChev.toFixed(2) + ':1（官方 #999/#fafafa ' + official('#999999', '#fafafa').toFixed(2) + ':1）')
      else fail('页签箭头山形不可读：' + rChev.toFixed(2) + ':1')
      const darkBase = resolveDark((new RegExp("'--dsw-alias-bg-base'\\s*:\\s*\\{[^}]*dark:\\s*'([^']+)'", 'i').exec(clientSrc) || [])[1])
      for (const [mode, v, base] of [['亮', bl1.light, paper], ['暗', bl1.dark, darkBase]]) {
        if (!v || !base) { fail('页签分隔线 · ' + mode + '色底色读不到'); continue }
        const rDiv = ratio(hex(v), hex(base))
        if (rDiv >= 1.06 && rDiv <= 1.6) pass('页签分隔线 · ' + mode + '色：' + v + ' on ' + base + ' = ' + rDiv.toFixed(2) + ':1（官方 #d9d9d9/白 ' + official('#d9d9d9', '#ffffff').toFixed(2) + ':1，装饰区间）')
        else fail('页签分隔线 ' + mode + '色出区间：' + rDiv.toFixed(2) + ':1')
      }
    } else fail('页签箭头/分隔线 · 源里读不到色值（data URI 或 border-l1 令牌）')
  }
}

/* ---------- 10e. agent-team board: member hover wash steps ----------
   The board's member cards sit on bg-layer-2 (沉底块). Their hover must be
   the official gray STEP, not the /news image-card black scrim that the tabs
   section (10d) documents: light composites rgba(0,0,0,.04) over layer-2 and
   must land on the official #f3f3f3 step (1.08:1 over white); dark cannot
   wash white over near-black (noise floor, documented), so it lifts the card
   one layer (layer-3 over layer-2). Both steps must stay in the decorative
   band (<1.6) and the label-primary ink must stay AA on the washed surface.
   Values are read out of the real rules and token blocks, never restated. */
{
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const flat = noComments.replace(/\n\s*/g, ' ')
  const lightBody = /body \[data-team-panel\] \[class\$='_member'\]:not\(:disabled\):hover, body \[data-team-panel\] \[class\$='_member'\]:not\(:disabled\):focus-visible \{([^}]*)\}/.exec(flat)
  const washM = lightBody && /rgba\(0, 0, 0, 0\.(\d+)\)/.exec(lightBody[1])
  const tok = (name, mode) => {
    const raw = (new RegExp("'" + name + "'\\s*:\\s*\\{[^}]*" + mode + ":\\s*'([^']+)'", 'i').exec(clientSrc) || [])[1]
    return mode === 'dark' ? resolveDark(raw) : raw
  }
  const l2 = { light: tok('--dsw-alias-bg-layer-2', 'light'), dark: tok('--dsw-alias-bg-layer-2', 'dark') }
  const l3m = (/body\[data-ds-dark-theme\] \{[^}]*--dsw-alias-bg-layer-3: (var\(--edge-dark-[a-z0-9-]+\)|#[0-9a-f]{6})/.exec(flat) || [])[1]
  const l3dark = l3m ? (l3m[0] === '#' ? l3m : LADDER[/--edge-dark-([a-z0-9-]+)/.exec(l3m)[1]]) : undefined
  const inkLight = tok('--dsw-alias-label-primary', 'light')
  const inkDark = tok('--dsw-alias-label-primary', 'dark')
  if (!washM || !l2.light || !l2.dark || !l3dark || !inkLight || !inkDark) {
    fail('看板洗面 · 规则或底色令牌读不到（wash=' + (washM && washM[1]) + '，layer2=' + l2.light + '/' + l2.dark + '，layer3dark=' + l3dark + '）')
  } else {
    const a = Number('0.' + washM[1])
    const offHover = ratio(hex('#f3f3f3'), hex('#ffffff'))
    const washLight = over([0, 0, 0], hex(l2.light), a)
    const rLight = ratio(washLight, hex(l2.light))
    if (Math.abs(rLight - offHover) <= 0.06) pass('看板洗面 · 亮色 = 官方 #f3f3f3 悬停步（' + rLight.toFixed(3) + ':1，alpha .' + washM[1] + ' on ' + l2.light + '）')
    else fail('看板亮色悬停档偏离官方步：' + rLight.toFixed(3) + ':1（官方 ' + offHover.toFixed(3) + ':1）')
    const rDark = ratio(hex(l3dark), hex(l2.dark))
    if (rDark > rLight * 0.9 && rDark < 1.6) pass('看板洗面 · 暗色 = 沉底块抬一档（' + l3dark + ' on ' + l2.dark + ' = ' + rDark.toFixed(3) + ':1，装饰区间）')
    else fail('看板暗色悬停档出区间：' + rDark.toFixed(3) + ':1')
    const inkOnLight = ratio(hex(inkLight), washLight)
    const inkOnDark = ratio(hex(inkDark), hex(l3dark))
    if (inkOnLight >= 4.5) pass('看板洗面 · 墨字/亮色洗面：' + inkOnLight.toFixed(2) + ':1 (AA)')
    else fail('看板墨字在亮色洗面上只有 ' + inkOnLight.toFixed(2) + ':1')
    if (inkOnDark >= 4.5) pass('看板洗面 · 纸字/暗色抬档：' + inkOnDark.toFixed(2) + ':1 (AA)')
    else fail('看板纸字在暗色抬档上只有 ' + inkOnDark.toFixed(2) + ':1')
  }
}

/* ---------- 10f. agent-team board: bottom hatch band over the menu surface ----------
   The board's shallowBg band reuses the texture tokens (--edge-tex-ink +
   --edge-tex-hatch-a) but lands on the PANEL surface (--dsw-menu-surface-fill),
   not on bg-base like the column band. Same rule as every decorative layer:
   composite the ink at its alpha over the surface it actually paints on and
   keep it inside the decorative band (1.06–1.6), in step with the column
   texture (1.10–1.19). Values read from the real declarations. */
{
  const noC = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const flat = noC.replace(/\n\s*/g, ' ')
  const band = /\[data-team-panel\]::after\s*\{([^}]*)\}/.exec(flat)
  const tok = (name) => (new RegExp(name + ":\\s*(#[0-9a-f]{6})").exec(noC) || [])[1]
  const alpha = (name) => (new RegExp(name + ":\\s*(\\d+)%").exec(noC) || [])[1]
  const menu = (mode) => {
    const raw = (new RegExp("'--dsw-menu-surface-fill'\\s*:\\s*\\{[^}]*" + mode + ":\\s*'([^']+)'", 'i').exec(clientSrc) || [])[1]
    return mode === 'dark' ? resolveDark(raw) : raw
  }
  const inkLight = tok('--edge-tex-ink'), aLight = alpha('--edge-tex-hatch-a')
  const inkDarkM = /body\[data-ds-dark-theme\]\s*\{[^}]*--edge-tex-ink:\s*(#[0-9a-f]{6})/.exec(flat)
  const aDarkM = /body\[data-ds-dark-theme\]\s*\{[^}]*--edge-tex-hatch-a:\s*(\d+)%/.exec(flat)
  if (!band || !band[1].includes('var(--edge-tex-hatch-color)') || !inkLight || !aLight || !inkDarkM || !aDarkM || !menu('light') || !menu('dark')) {
    fail('看板斜纹 · 规则或纹理令牌读不到')
  } else {
    const cases = [
      ['亮', hex(inkLight), Number(aLight) / 100, menu('light')],
      ['暗', hex(inkDarkM[1]), Number(aDarkM[1]) / 100, menu('dark')],
    ]
    for (const [label, ink, a, surface] of cases) {
      const r = ratio(over(ink, hex(surface), a), hex(surface))
      if (r >= 1.06 && r <= 1.6) pass('看板斜纹 · ' + label + '色合成 = ' + r.toFixed(2) + ':1（装饰区间，与会话列底纹同档）')
      else fail('看板斜纹 ' + label + '色出装饰区间：' + r.toFixed(2) + ':1')
    }
  }
}

console.log('')
if (failures) { console.error(failures + ' palette check(s) failed'); process.exit(1) }
console.log('all palette-contrast checks passed')
