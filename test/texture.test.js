/**
 * texture.test.js — the industrial background (official /operator layers) must be
 * present, switchable, and DECORATIVELY quiet.
 *
 * The theme's rule for decoration is one-sided and already used by the watermark
 * and the hero glow: a decorative layer may never read louder than the thing it
 * replaces, and anything below ~1.06:1 reads as absent. This file applies the
 * same band to the texture, because a backdrop is exactly the kind of thing that
 * can be "obviously fine" in one palette and muddy the text in another.
 *
 * It reads the alpha values out of client.js instead of restating them, and it
 * measures the composite the way the browser paints it (translucent ink over the
 * actual surface), so retuning the texture is what this test sees.
 *
 * Usage: node test/texture.test.js
 */
const fs = require('fs')
const path = require('path')
/* Single definition of how the stylesheet composes (src/styles manifest). */
const sources = require('../scripts/lib/sources.js')
/* 暗色三档梯度从真值口读取（fixtures/theme-values.js），逐档合成 */
const { TIERS, LADDERS } = require('./fixtures/theme-values.js')

const ROOT = path.resolve(__dirname, '..')
/* The sync layer moved to src/client/motion/sync.js with the module split, so
   the JS-side assertions read the WHOLE client source tree (entry + modules)
   instead of the entry alone. */
const src = sources.concatClientJs()
/* The key vocabulary moved to its own module (prefs/keys.js); the prefs entry
   for the texture row is asserted against that module now. */
const keysSrc = fs.readFileSync(path.join(ROOT, 'src', 'client', 'prefs', 'keys.js'), 'utf8')
/* CSS tier assertions read the source stylesheet (see palette-contrast). */
const css = sources.concatCss()

let failures = 0
const fail = (m) => { console.error('FAIL  ' + m); failures++ }
const pass = (m) => console.log('ok    ' + m)

/* ---------- WCAG maths (same helpers as palette-contrast.test.js) ---------- */
const hex = (h) => {
  const s = h.trim().replace('#', '')
  const f = s.length === 3 ? s.split('').map((c) => c + c).join('') : s
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)]
}
const lin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
const lum = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2])
const ratio = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05) }
const over = (fg, bg, alpha) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha))
const rgbText = (p) => 'rgb(' + p.map((c) => Math.round(c)).join(', ') + ')'

/** Read one custom property from the first block whose header contains `needle`. */
const blockWith = (needle) => {
  const i = src.indexOf(needle)
  if (i < 0) return null
  const open = src.indexOf('{', i)
  const close = src.indexOf('}', open)
  return close < 0 ? null : src.slice(open, close)
}
/** Same, but runs on a whitespace-collapsed copy so indentation is not part of the
    needle. client.js indents its stylesheet by 6 spaces and the generated blocks by
    2, so matching raw text is a trap. */
const blockWithLoose = (needle) => {
  /* Strip comments FIRST, then collapse whitespace: collapsing first leaves the
     prose intact, and prose contains '}', which truncates the block at the wrong
     place. */
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ')
  const i = flat.indexOf(needle.replace(/\s+/g, ' '))
  if (i < 0) return null
  const open = flat.indexOf('{', i)
  const close = flat.indexOf('}', open)
  return close < 0 ? null : flat.slice(open + 1, close)
}
const varIn = (block, name) => {
  if (block === null) return null
  const m = new RegExp(name.replace(/[-]/g, '\\-') + '\\s*:\\s*([^;]+);').exec(block)
  return m ? m[1].trim() : null
}

/* ---------- 1. the switch exists and is wired end to end ---------- */
/* `off` is the ABSENCE of the attribute in the real client (syncTexture removes
   it) — but the CSS must not RELY on that: the first version gated every rule on
   the attribute's PRESENCE, and a stale 'off' value then painted the texture
   anyway (measured). The overlays are therefore gated on explicit values, and
   this assertion pins that: 'subtle' must name the overlay by value. */
if (/body\[data-endfield-texture='subtle'\] \[class\$='_centerCol'\] \[class\$='_root'\]\[data-phase\]::before/.test(css)) {
  pass('叠加层按值命中会话根（后代匹配，容忍插槽包装层）')
} else {
  fail('叠加层没有按值匹配——属性残留 off 时纹理仍会画（按存在匹配的老写法）')
}
/* Tripwire: the hero watermark used to be a body-level child, which forced a
   :not(:has(> [data-endfield-watermark])) exception on these rules and shipped
   the hero page without grid/hatch. The mark now mounts inside the column in
   BOTH modes (decor/watermark.js), so the exception must stay gone — if it
   creeps back, the hero texture silently dies again. Comments are stripped so
   the historical mention of the pattern (design notes) cannot self-trip this. */
if (!/:not\(:has\(> \[data-endfield-watermark\]\)\)/.test(css.replace(/\/\*[\s\S]*?\*\//g, ''))) {
  pass('纹理不再对水印让位（水印已挂列内，hero 页同享底纹）')
} else {
  fail('纹理仍有水印例外——hero 页底纹会被静默关掉（水印已改挂列内，例外即回归）')
}
if (/data-endfield-texture='standard'/.test(css)) pass('CSS carries the standard tier')
else fail('no CSS rules for tier standard')
/* Collapse whitespace so the check is about the code, not its line breaks. */
const oneLine = src.replace(/\s+/g, ' ')
if (/setAttribute\?\.\('data-endfield-texture', value\)[\s\S]{0,60}else document\.body\.removeAttribute\?\.\('data-endfield-texture'\)/.test(oneLine)) {
  pass('off 档通过移除属性实现（不留死属性）')
} else {
  fail('syncTexture 没有在 off 时移除 data-endfield-texture')
}
if (/const TEXTURE_OPTIONS = \['off', 'subtle', 'standard'\]/.test(src)) pass('client TEXTURE_OPTIONS matches the three tiers')
else fail('client TEXTURE_OPTIONS is missing or drifted from the CSS tiers')
if (/'dsh-theme-endfield-texture': 'texture'/.test(keysSrc)) pass('prefs key maps to the schema field "texture"')
else fail('PREFS_KEY_TO_FIELD has no entry for dsh-theme-endfield-texture — the row would not persist')
const host = fs.readFileSync(path.join(ROOT, 'index.js'), 'utf8')
if (/texture: 'standard'/.test(host)) pass('host FIELD_DEFAULTS ships texture=standard')
else fail('index.js FIELD_DEFAULTS has no texture default — the switch would reset every load')

/* ---------- 1b. the texture must be CONTENT-ANCHORED, never window-tiled ----------
   The first implementation painted 'position:fixed; inset:0' overlays on the
   frame, the center column AND the sidebar, plus full-element repeating hatch
   layers — i.e. tiled across the whole window. The official page anchors every
   layer to a content region instead (grid clipped to the content column and
   fading downward, hatch as a bottom band fading upward, wave pinned top-right).
   These two tripwires stop exactly that regression from coming back. */
{
  const section = css.slice(css.indexOf('背景纹理：官网'), css.indexOf('The watermark is the Endfield Industries LOGO'))
  if (!/\[class\$='_frame'\]/.test(section) && !/\[class\$='_sidebarCol'\]/.test(section)) {
    pass('纹理不挂外框/侧栏（不整窗平铺，只锚定主内容列）')
  } else {
    fail('纹理又挂到了 _frame/_sidebarCol 上——那是整窗平铺；官方做法是按内容区域锚定')
  }
  /* Find the overlay pseudo in RULES, not prose: the section's comments (and
     the generated asset notes inside it) legitimately mention pseudo layers,
     so the first raw '::before' substring can be documentation, not CSS. */
  const sectionNoComments = section.replace(/\/\*[\s\S]*?\*\//g, '')
  const overlayRule = sectionNoComments.slice(sectionNoComments.indexOf('::before'), sectionNoComments.indexOf('::before') + 700)
  if (/z-index:\s*-1/.test(overlayRule)) {
    pass('叠加层在内容之下（z-index:-1 + isolation）——装饰不盖文字')
  } else {
    fail('网格叠加层不在内容之下：需要 z-index:-1，否则纹理画在正文上面')
  }
}

/* ---------- 2. the official assets are embedded, and only as data URIs ---------- */
for (const prop of ['--edge-tex-grid-mask', '--edge-tex-wave', '--edge-tex-tape']) {
  const re = new RegExp('body\\s*\\{\\s*' + prop + ':\\s*url\\("data:image\\/(svg\\+xml|png);base64,[A-Za-z0-9+/=]{100,}"\\)\\s*;\\s*\\}')
  if (re.test(css)) pass(prop + ' is embedded inside a body rule')
  else fail(prop + ' is not embedded as a body-scoped data URI — run: node scripts/build-texture.js')
}
/* No external asset may sneak into the texture: everything ships in the bundle. */
{
  const textureSection = css.slice(css.indexOf('背景纹理：官网'), css.indexOf('The watermark is the Endfield Industries LOGO'))
  /* Only the embedded data URIs count: scan the section minus its comments, so a
     comment that explains the assets cannot trip this. */
  const external = [...textureSection.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/url\((?!")[^)]*\)/g)].map((m) => m[0])
  if (external.length === 0) pass('纹理段不含任何外链资源（全部内嵌）')
  else fail('纹理段出现外链资源：' + external.slice(0, 2).join(', '))
}

/* ---------- 2b. the top-right wave: official on LIGHT, inverted TWIN on DARK ----------
   History, so nobody "simplifies" this back: 2026-10-25 the owner had the dark
   standard stack omit BOTH official wave images (the top-right stepped wave's ink
   is #1a1a1a — the dark base itself, invisible; the middle tape-wave's light ink
   read too loud on dark). 2026-10-29 the owner asked for the top-right contour
   back on dark (\u300c\u6697\u8272\u80cc\u666f\u4e0b\u7f3a\u5c11\u53f3\u4e0a\u89d2\u9ad8\u7b49\u7ebf\u5e95\u7eb9\u300d), so the dark stack now paints a
   PALETTE-INVERTED twin of the same official bytes (scripts/build-texture.js:
   PLTE only, tRNS/IDAT untouched — the data form of the official invert(1)
   grammar the button material already uses). The middle tape-wave stays
   light-only, and the dark stock therefore has TWO layers instead of one.
   Guards: (1) the light stack still paints both official images; (2) the dark
   stack paints the twin at the top-right, NOT the light-deep-ink image and NOT
   the tape; (3) background-* lists are matched to layers BY ORDER, so the dark
   rule must restate its own size/position/repeat; (4) the twin must be a real
   derivation of the committed asset (same alpha table, exactly inverted PLTE),
   not a hand-made second image; (5) its composite stays in the decorative band
   on every dark tier. */
{
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const stackOf = (re, mustMatch) => [...noComments.matchAll(re)]
    .map((m) => m[1])
    .find((body) => /background-image:/.test(body) && (!mustMatch || mustMatch.test(body)))
  const lightStack = stackOf(/body\[data-endfield-texture='standard'\][^{]*\{([^}]*)\}/g, /--edge-tex-(wave|tape)/)
  const darkStack = stackOf(/body\[data-ds-dark-theme\]\[data-endfield-texture='standard'\][^{]*\{([^}]*)\}/g)
  if (lightStack && /var\(--edge-tex-wave\)/.test(lightStack) && /var\(--edge-tex-tape\)/.test(lightStack)) pass('亮色 standard 档仍画官方两张波纹图（右上 + 中下）')
  else fail('亮色 standard 档丢了波浪图层（--edge-tex-wave / --edge-tex-tape）')
  if (darkStack && /var\(--edge-tex-wave-dark\)/.test(darkStack)) pass('暗色 standard 档画出右上等高线（官方调色板反相孪生）')
  else fail('暗色 standard 档缺少右上等高线 —— 2026-10-29 owner 要求补回')
  if (darkStack && !/var\(--edge-tex-wave\)/.test(darkStack) && !/--edge-tex-tape/.test(darkStack)) pass('暗色只画反相孪生：官方深墨图与中下波纹带仍不画')
  else fail('暗色又去画官方深墨波浪 / 中下波纹带了（深墨在暗底不可见，波纹带仍偏抢）')
  if (darkStack && /background-position:\s*100% 0,\s*50% 0/.test(darkStack) && /background-size:\s*39\.1875rem 26\.3125rem,\s*100% 100%/.test(darkStack)) pass('暗色 standard 档重新声明了自己的 background-size/position（防层序错位）')
  else fail('暗色 standard 档没有重声明 background-size/position：background-* 按层序取值的列表会错位')

  /* Both images are measured from their EMBEDDED bytes (no literal restated). */
  const dataUri = (prop) => {
    const at = css.indexOf(prop + ":")
    if (at < 0) return null
    const marker = "url(\"data:image/png;base64,"
    const i = css.indexOf(marker, at)
    if (i < 0 || i > at + 200) return null
    const start = i + marker.length
    const end = css.indexOf("\"", start)
    return end < 0 ? null : css.slice(start, end)
  }
  const paletteOf = (b64) => {
    if (!b64) return null
    const buf = Buffer.from(b64, 'base64')
    let off = 8, plte = null, trns = null
    while (off + 12 <= buf.length) {
      const len = buf.readUInt32BE(off)
      const type = buf.toString('ascii', off + 4, off + 8)
      const data = buf.subarray(off + 8, off + 8 + len)
      if (type === 'PLTE') plte = data
      if (type === 'tRNS') trns = data
      if (type === 'IEND') break
      off += 12 + len
    }
    if (!plte || plte.length < 6) return null
    const entries = []
    for (let i = 0; i < plte.length; i += 3) {
      const index = i / 3
      const a = trns && index < trns.length ? trns[index] / 255 : 1
      entries.push({ ink: [plte[i], plte[i + 1], plte[i + 2]], alpha: a })
    }
    return entries
  }
  const official = paletteOf(dataUri('--edge-tex-wave'))
  const twin = paletteOf(dataUri('--edge-tex-wave-dark'))
  if (!official) {
    fail('无法从生成的 CSS 里解出波浪 PNG 的调色板（--edge-tex-wave）')
  } else {
    if (official.every((e) => Math.max(...e.ink) <= 0x40)) pass('亮色波浪是深墨（官方 #1a1a1a）')
    else fail('亮色波浪的墨色不再是深墨：' + JSON.stringify(official.slice(0, 4)))
    let worst = 0
    for (const e of official) if (e.alpha > 0) worst = Math.max(worst, ratio(over(e.ink, hex('#e8e8e2'), e.alpha), hex('#e8e8e2')))
    if (worst >= 1.06 && worst <= 1.6) pass('亮色 右上波浪 墨 ' + worst.toFixed(2) + ':1（1.06–1.6）')
    else fail('亮色右上波浪 ' + worst.toFixed(2) + ':1 出装饰区间')
  }
  if (!twin) {
    fail('--edge-tex-wave-dark 没有内嵌成 data URI —— 跑 node scripts/build-texture.js')
  } else if (official) {
    const sameAlpha = official.length === twin.length
      && official.every((e, i) => Math.abs(e.alpha - twin[i].alpha) <= 1 / 255)
    const inverted = official.length === twin.length
      && official.every((e, i) => e.ink.every((c, k) => twin[i].ink[k] === 255 - c))
    if (sameAlpha && inverted) pass('暗色等高线 = 官方字节的调色板严格反相孪生（alpha 表原样、PLTE 逐项取反）')
    else fail('暗色等高线不是官方图的严格反相（alpha 表或 PLTE 不再对应）：它必须是派生，不是第二张手画图')
    if (twin.every((e) => Math.min(...e.ink) >= 0xc0)) pass('暗色等高线是浅墨（#1a1a1a 反相为 #e5e5e5）')
    else fail('暗色等高线的墨色不再是浅墨：' + JSON.stringify(twin.slice(0, 4)))
    let worstDark = 0
    for (const t of TIERS) {
      const bg = hex(LADDERS[t].base)
      let w = 0
      for (const e of twin) if (e.alpha > 0) w = Math.max(w, ratio(over(e.ink, bg, e.alpha), bg))
      worstDark = Math.max(worstDark, w)
      if (w > 1.6) fail('暗色·' + t + ' 右上等高线 ' + w.toFixed(2) + ':1 超过 1.6 装饰上限')
    }
    if (worstDark >= 1.06 && worstDark <= 1.6) pass('暗色 右上等高线 max 墨 ' + worstDark.toFixed(2) + ':1（1.06–1.6，三档全量）')
    else fail('暗色 右上等高线 ' + worstDark.toFixed(2) + ':1 出装饰区间（<1.06 等于不存在）')
  }
}
/* ---------- 3. decoration band, measured per scheme ---------- */
{
  /* The texture paints translucent ink over the surface. Read the ink and the
     alphas from the stylesheet, composite onto the real surface, and check the
     result stays inside the decorative band. */
  const LIGHT_SURFACES = { 'bg-base': '#e8e8e2', 'bg-layer-1': '#f2f2ec' }
  /* 暗色底面自 2026-10-24 起随档位走（--edge-dark-* 梯度）：三档逐档从
     真值口读 base/layer-1 合成过带——此前只测默认档，另两档的装饰强度
     是注释承诺；回抄字面量的旧版（#101110 系）更是退役值。 */
  const DARK_SURFACES = {}
  for (const t of TIERS) DARK_SURFACES[t] = { 'bg-base': LADDERS[t].base, 'bg-layer-1': LADDERS[t].layer1 }
  /* Anchor on the whole first declaration line: '#181818' also appears in the
     documented fallbacks, so a bare colour search finds the wrong block. */
  const lightBlock = blockWithLoose('body { --edge-tex-ink: #181818;')
  const darkBlock = blockWithLoose('body[data-ds-dark-theme] { --edge-tex-ink: #e9e9e3;')
  const LIGHT_INK = varIn(lightBlock, '--edge-tex-ink')
  const DARK_INK = varIn(darkBlock, '--edge-tex-ink')
  /* The tokens hold PERCENTAGES ('5%'), and colour maths needs a fraction — the
     first version passed '5%' straight into the compositor, which produced a
     nonsense ratio (0.000 light / 1190 dark). */
  const pct = (v) => parseFloat(v) / 100
  const LIGHT_GRID = pct(varIn(lightBlock, '--edge-tex-grid-a'))
  const LIGHT_HATCH = pct(varIn(lightBlock, '--edge-tex-hatch-a'))
  const DARK_GRID = pct(varIn(darkBlock, '--edge-tex-grid-a'))
  const DARK_HATCH = pct(varIn(darkBlock, '--edge-tex-hatch-a'))
  if (!LIGHT_INK || !DARK_INK || Number.isNaN(LIGHT_GRID) || Number.isNaN(DARK_HATCH)) {
    fail('could not read the texture tokens out of client.js')
  } else {
    const check = (label, ink, alpha, surfaces) => {
      let worst = 0
      for (const [name, bg] of Object.entries(surfaces)) {
        const r = ratio(over(hex(ink), hex(bg), alpha), hex(bg))
        worst = Math.max(worst, r)
        if (r > 1.6) fail(`${label} on ${name} reads ${r.toFixed(3)}:1 — louder than the 1.6 decorative ceiling`)
      }
      if (worst <= 1.6) pass(`${label} 装饰强度 ${worst.toFixed(3)}:1 (≤1.6)`)
      if (worst < 1.06) fail(`${label} reads ${worst.toFixed(3)}:1 — below the 1.06 floor, i.e. absent`)
    }
    for (const [label, ink, a, surf] of [
      ['亮色 网格', LIGHT_INK, LIGHT_GRID, LIGHT_SURFACES],
      ['亮色 斜纹', LIGHT_INK, LIGHT_HATCH, LIGHT_SURFACES],
    ]) check(label, ink, a, surf)
    for (const t of TIERS) {
      check('暗色·' + t + ' 网格', DARK_INK, DARK_GRID, DARK_SURFACES[t])
      check('暗色·' + t + ' 斜纹', DARK_INK, DARK_HATCH, DARK_SURFACES[t])
    }
  }
}

/* ---------- 4. static: no motion, no layer promotion ---------- */
{
  const section = css.slice(css.indexOf('背景纹理：官网'), css.indexOf('The watermark is the Endfield Industries LOGO'))
  if (!/transition\s*:/.test(section) && !/@keyframes/.test(section)) {
    pass('纹理段是静态的（无 transition、无 @keyframes）——官网的底纹也是静态的')
  } else {
    fail('纹理段出现了过渡或关键帧：官网的网格/斜纹是静态的，动起来即超出语法')
  }
  if (!/will-change/.test(section)) pass('纹理段没有 will-change（不为装饰预建合成层）')
  else fail('纹理段用了 will-change')
  /* The SURFACE rules must carry the texture through background-* alone. The
     tri-colour signal rule is a real element with a real 2px height, so it is
     excluded from this check rather than pretending it is a background layer. */
  const surfaceRules = section.slice(0, section.indexOf('.endfield-settings .endfield-settings-group-title'))
    .replace(/\/\*[\s\S]*?\*\//g, '')
  /* `position: relative` on the host and `position: fixed` on the overlay ARE the
     texture's carrying mechanism (the grid needs its own layer), so they are
     expected; what must not appear is a size/spacing property. */
  if (!/(^|[;{\s])(width|height|padding|margin)\s*:/.test(surfaceRules)) {
    pass('承载面只用背景属性，不改任何布局属性')
  } else {
    fail('承载面出现了布局属性——纹理必须只走 background-*')
  }
}

/* ---------- 5. degradation is declared ---------- */
if (/prefers-reduced-transparency: reduce/.test(css) && /prefers-contrast: more/.test(css)) {
  const i = css.indexOf('@media (prefers-reduced-transparency: reduce)')
  /* strip comments first: the window may open inside the section's prose */
  const block = css.slice(i, i + 700).replace(/\/\*[\s\S]*?\*\//g, '')
  if (/background-image:\s*none/.test(block)) pass('减少透明/更高对比偏好下纹理整段关闭')
  else fail('降级媒体查询存在，但没有把 background-image 关掉')
} else {
  fail('缺少 prefers-reduced-transparency / prefers-contrast 降级')
}

/* ---------- 6. the tri-colour rules carry the OFFICIAL PROPORTIONS ----------
   The official stops are ABSOLUTE (11.25rem / 22.5625rem) on a 67.5rem-wide
   element, which makes green two thirds of the line. Copying the rem values
   onto this theme's fluid-width lines rendered near-equal thirds (user report);
   the stops are therefore the official ratio converted to percentages, and the
   DERIVATION must stay in the source so nobody "simplifies" it back. */
{
  const official = 'linear-gradient(90deg,#ff00f0 16.6667%,#fffa00 0,#fffa00 33.4259%,#00ffa2 0)'
  const compact = official.replace(/\s+/g, '')
  const found = css.replace(/\s+/g, '').split(compact).length - 1
  if (found >= 2) pass('两条三色线（设置分组标题 + 已编辑文件卡片底栏）都用官方比例停靠（绿占 2/3）')
  else fail('三色线数量 ' + found + '（应 ≥2：设置分组标题 + 已编辑文件卡片底栏）')
  if (/11\.25\/67\.5/.test(css)) pass('比例换算的推导留在源码注释里')
  else fail('缺少 11.25/67.5 的换算推导注释——没人能再把比例改回均分而不被问')
}

console.log('')
if (failures) { console.error(failures + ' texture check(s) failed'); process.exit(1) }
console.log('all texture checks passed')
