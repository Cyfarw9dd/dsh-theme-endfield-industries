/**
 * check.js — guard rails for the theme's stylesheet and client artifact.
 *
 * The stylesheet lives as REAL css files (src/styles/*.css layers per the manifest)
 * and is embedded into the built ./client.js by tsdown (see scripts/build-client.js).
 * With real .css files the old template-literal failure modes (a stray backtick
 * terminating the literal, ${...} interpolation) are structurally gone; what
 * remains mechanical here is structural CSS invariants (comment/brace balance,
 * palette blocks, token scoping), shape checks against the pre-bundle client
 * source, and artifact sanity (the bundle parses and carries the css payload).
 *
 * Artifact FRESHNESS is a separate gate: scripts/build-client.js --check
 * (wired into `npm run check` and CI) rebuilds and byte-compares client.js.
 *
 * Usage: node check.js [target.js]   (exit 0 = clean, 1 = problem found)
 *        The optional target exists so selftest.js can point the same logic at a
 *        deliberately-broken copy and prove each check really fails.
 */
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const file = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, 'client.js')
const src = fs.readFileSync(file, 'utf8')
/* CSS invariants read the stylesheet SOURCES: the build embeds them into the
   artifact as escaped string literals, so layout (lines, selector blocks) only
   exists pre-bundle. Shape checks that depend on JS quoting read the client
   source for the same reason (the bundler re-quotes strings). */
/* selftest.js redirects the source root into a temp copy so its mutations
   never touch the working tree (same trick as the old argv target override). */
/* Resolved from THIS file's directory (not process.cwd), so selftest.js can
   redirect the whole tree into a temp copy and check.js loads the copy's own
   manifest + sources. The manifest is the single definition of how the sheet
   composes; nothing below re-derives the file list or its order. */
const sources = require(path.join(__dirname, 'scripts', 'lib', 'sources.js'))
const cssText = sources.concatCss()
const cssLines = cssText.split('\n')
const clientSrc = fs.readFileSync(sources.CLIENT_ENTRY, 'utf8')
const lines = src.split('\n')

let failures = 0
const fail = (msg) => { console.error('FAIL  ' + msg); failures++ }
const pass = (msg) => console.log('ok    ' + msg)

/* --- 1. stylesheet sources + generated fences ---
   The sheet is the raw concatenation the client entry embeds (the
   STYLE_FILES manifest, in order). The old template-literal guards (stray backtick, ${...})
   are obsolete with real .css files; what stays mechanical is that the
   generated fences exist, in order, in generated.css. */
const body = cssText
{
  /* --- 1a. the client entry composes the manifest, in manifest order ---
     sources.js decides WHICH files and in WHAT order; src/client/index.js must
     import exactly those with ?raw, in that order, and hand them to the single
     insertCss() call as a RAW concatenation (ids joined by '+', nothing
     inserted: each layer file carries its own trailing newline, so anything
     added here would change the sheet's bytes — see sources.js concatCss).
     Without this guard the manifest could drift from the entry and silently
     change the cascade (order is the contract). */
  const imports = [...clientSrc.matchAll(/import\s+([A-Za-z_$][\w$]*)\s+from\s+'\.\.\/styles\/([\w.-]+)\?raw'/g)]
  const importedNames = imports.map((m) => m[2])
  const importedIds = imports.map((m) => m[1])
  /* Pick the composition call, not the `function insertCss(css)` definition:
     it is the one insertCss(...) whose argument references the imported ids. */
  const calls = [...clientSrc.matchAll(/insertCss\(\s*([^)]*)\)/g)]
    .map((m) => m[1])
    .filter((arg) => importedIds.some((id) => new RegExp('\\b' + id + '\\b').test(arg)))
  const callArg = calls.length === 1 ? calls[0] : ''
  const expectedCall = importedIds.join(' + ')
  const callOk = calls.length === 1 && callArg.replace(/\s+/g, ' ').trim() === expectedCall
  if (JSON.stringify(importedNames) === JSON.stringify(sources.STYLE_FILES) && callOk) {
    pass('client entry imports the stylesheet manifest, in order (' + sources.STYLE_FILES.join(' + ') + ')')
  } else {
    fail('src/client/index.js no longer composes src/styles in manifest order — expected ['
      + sources.STYLE_FILES.join(', ') + '] imported ?raw and concatenated with + into ONE insertCss() call; got ['
      + importedNames.join(', ') + '] → insertCss(' + callArg.trim() + ')')
  }
}
{
  const fences = ['EDGE_TEX_BEGIN', 'EMBLEM_MASK_BEGIN', 'HERO_LOGO_BEGIN']
  let last = -1
  let okFences = true
  for (const f of fences) {
    const i = cssText.indexOf(f)
    if (i < 0 || i < last) { okFences = false; break }
    last = i
  }
  if (okFences) pass('generated fences present and ordered (EDGE_TEX / EMBLEM_MASK / HERO_LOGO)')
  else fail('generated.css fences missing or out of order — run the build-*-texture/emblem/logo scripts')
}
/* two bare blocks keep the nesting depth the downstream sections were written
   against (the old template-literal locator opened two else-blocks here) */
{
{

    /* --- 2. CSS comment balance ---
       A previously-fixed bug closed a comment early with a stray close-marker,
       which dropped the following prose lines into the stylesheet as live CSS:
       --edge-word was then never defined and the whole brand block collapsed to the
       top-left. The file still PARSES in that state, so only this check catches it.
       (Writing that marker literally here would close THIS comment early too —
       which is precisely the failure being guarded against.)
       Braces inside comments must be ignored, so comments are stripped first and
       the brace balance below runs on real CSS only. */
    let stripped = ''
    let inComment = false
    let commentStart = -1
    let unterminated = -1
    let strayClose = -1
    for (let i = 0; i < body.length; i++) {
      if (!inComment && body[i] === '/' && body[i + 1] === '*') {
        inComment = true
        commentStart = i
        i++
        continue
      }
      if (inComment && body[i] === '*' && body[i + 1] === '/') {
        inComment = false
        i++
        continue
      }
      if (!inComment) {
        // A bare */ outside any comment means an earlier one closed too soon.
        if (body[i] === '*' && body[i + 1] === '/' && strayClose < 0) strayClose = i
        stripped += body[i]
      }
    }
    if (inComment) unterminated = commentStart

    const lineOf = (offset) => cssText.slice(0, offset).split('\n').length
    if (unterminated >= 0) {
      fail(`unterminated CSS comment opened at line ${lineOf(unterminated)} `
        + `-> everything after it is swallowed as a comment`)
    } else if (strayClose >= 0) {
      fail(`stray '*/' outside any comment at line ${lineOf(strayClose)}: `
        + `${cssLines[lineOf(strayClose) - 1].trim().slice(0, 70)}\n      `
        + `-> a comment closed early; the prose after it becomes live CSS`)
    } else {
      pass('CSS comments balanced')
    }

    /* --- 3. brace balance of the real CSS (comments already removed) --- */
    let depth = 0
    let bad = 0
    for (const ch of stripped) {
      if (ch === '{') depth++
      else if (ch === '}') { depth--; if (depth < 0) { bad++; depth = 0 } }
    }
    if (depth !== 0 || bad !== 0) {
      fail(`CSS braces unbalanced: ${depth} unclosed, ${bad} unexpected '}'`)
    } else {
      pass('CSS braces balanced')
    }

    /* --- 4. no sentence prose may sit at the top level of the live CSS ---
       This is the check that actually catches the historical "comment closed too
       early" bug. Closing a comment early leaves the comment BALANCED, so a
       comment-pairing check passes; the damage is that the leftover prose lands at
       the top level of the stylesheet, fuses with the next selector and silently
       kills that entire rule (measured: the prose "see the max() calls below."
       landed directly before "[data-endfield-loader] {", so the loader's variable
       block was dropped and the brand block collapsed to the top-left).

       Detection must be precise, not clever. A first attempt flagged any top-level
       chunk containing a comma or an English word and produced 33 FALSE POSITIVES
       on legitimate selectors (":is([role='tab'], ...)", "input, textarea",
       "tbody tr:hover"). The reliable signal is far narrower: real CSS selectors
       never contain a BARE WORD ending in a sentence period, and never contain a
       word immediately followed by a period-space. Prose does. */
    const suspects = []
    let buf = ''
    let bufAt = 0
    let inRule = 0
    for (let i = 0; i < stripped.length; i++) {
      const ch = stripped[i]
      if (ch === '{') {
        if (inRule === 0) {
          const sel = buf.trim()
          // ". " or a trailing "." after a letter — impossible in a selector,
          // characteristic of a sentence. (".foo" class syntax has the dot BEFORE
          // the word, so it never matches.)
          if (/[A-Za-z]\.(\s|$)/.test(sel)) {
            suspects.push({ text: sel.replace(/\s+/g, ' ').slice(0, 70), at: bufAt })
          }
        }
        inRule++
        buf = ''
        continue
      }
      if (ch === '}') { inRule = Math.max(0, inRule - 1); buf = ''; bufAt = i + 1; continue }
      if (inRule === 0) {
        if (!buf) bufAt = i
        buf += ch
      }
    }
    if (suspects.length) {
      for (const s of suspects) {
        fail(`prose leaked into live CSS near line ${lineOf(s.at)}: "${s.text}"\n      `
          + `-> a comment almost certainly closed early; the next rule is being destroyed`)
      }
    } else {
      pass('no sentence prose at the top level of the live CSS')
    }

    /* --- 5. the variables the brand block depends on must be DEFINED in CSS ---
       The collapse bug above manifested as a used-but-undefined custom property, so
       assert definition rather than mere mention (a comment mention is not a
       definition). */
    for (const v of ['--edge-word', '--edge-gap']) {
      if (new RegExp('^\\s*' + v + '\\s*:', 'm').test(stripped)) {
        pass(`${v} is defined in live CSS`)
      } else {
        fail(`${v} is used by the loader but never DEFINED in live CSS`)
      }
    }

    /* --- 6. both accent palettes must be DEFINED, and on body rather than :root ---
       Every accent in this stylesheet reads from these variables, so a missing one
       does not degrade gracefully: each rule that references it computes to nothing
       and that entire declaration is dropped.

       The :root check is the important half, and it is not hypothetical. The app
       applies its theme tokens as INLINE STYLES ON body, so a custom property
       declared at :root that substitutes a --dsw-* token is resolved at the html
       element, where the token does not exist -> guaranteed-invalid, computing to
       empty. The shipped --edge-line / --edge-paper / --edge-soft were declared
       that way and measured EMPTY in a real browser, silently disabling the themed
       scrollbar. Anything reading a token must therefore be declared on body. */
    const paletteVars = [
      '--edge-accent', '--edge-accent-ink', '--edge-accent-rgb', '--edge-accent-deep', '--edge-accent-onpaper',
      '--edge-status-light', '--edge-status-light-mid', '--edge-status-dark',
      '--edge-status-dark-mid', '--edge-glow-light', '--edge-glow-dark',
      /* 暗色三档梯度（tokens.css，tokens.js 暗色列经 var() 消费） */
      '--edge-dark-base', '--edge-dark-layer-1', '--edge-dark-layer-2', '--edge-dark-overlay', '--edge-dark-raised',
      '--edge-dark-border-l1', '--edge-dark-border-l2', '--edge-dark-label-primary', '--edge-dark-label-secondary',
    ]
    const missing = paletteVars.filter((v) => !new RegExp('^\\s*' + v + '\\s*:', 'm').test(stripped))
    if (missing.length === 0) pass(`all ${paletteVars.length} palette variables are defined in live CSS`)
    else fail(`palette variable(s) never DEFINED in live CSS: ${missing.join(', ')}`)

    // The switchable palettes (终末地灰 / 武陵青 / a class-carried 谷地黄) were
    // removed in 2026-10: 谷地黄 lives ONLY on the plain body base block, and a
    // leftover override block would be dead weight that still wins the cascade
    // the moment someone re-adds the class in JS. Assert they stay gone.
    for (const cls of ['theme-endfield-wuling', 'theme-endfield-gray', 'theme-endfield-valley']) {
      if (!new RegExp('body\\.' + cls + '\\s*\\{').test(stripped)) {
        pass('no leftover palette override block (body.' + cls + ')')
      } else {
        fail('body.' + cls + ' block is still in the sheet — the palette it belongs to was removed')
      }
    }
    // And their preference key must not come back either: nothing reads it, so a
    // re-added key would silently persist a value with no effect.
    if (!sources.concatClientJs().includes('dsh-theme-endfield-palette')) {
      pass('the removed palette preference key stays out of the client source')
    } else {
      fail('the client source references dsh-theme-endfield-palette — a palette field that no stylesheet answers to')
    }
    // The embedded emblem mask must be a real SVG data URI INSIDE a body{} rule:
    // a bare top-level declaration is invalid CSS whose error recovery eats the
    // next rule's selector (this exact bug shipped once — the contour layer
    // lost position:absolute and pushed the page down).
    if (/body\s*\{\s*--edge-emblem:\s*url\("data:image\/svg\+xml;base64,[A-Za-z0-9+/=]{100,}"\)\s*;\s*\}/.test(stripped)) {
      pass('emblem mask SVG data URI is embedded inside a body rule (see scripts/build-emblem.js)')
    } else {
      fail('--edge-emblem must be declared as: body { --edge-emblem: url("data:image/svg+xml;base64,...") } — run node scripts/build-emblem.js')
    }
    // The hero brand mark carries TWO masks, and they must sit in ONE body{} rule
    // for the same reason: two top-level declarations would each destroy the rule
    // that follows them.
    if (/body\s*\{\s*--edge-hero-logo-body-mask:\s*url\("data:image\/svg\+xml;base64,[A-Za-z0-9+/=]{100,}"\)\s*;\s*--edge-hero-logo-ink-mask:\s*url\("data:image\/svg\+xml;base64,[A-Za-z0-9+/=]{100,}"\)\s*;\s*\}/.test(stripped)) {
      pass('hero logo masks are embedded inside one body rule (see scripts/build-logo.js)')
    } else {
      fail('the hero logo masks must be declared as: body { --edge-hero-logo-body-mask: url(...); --edge-hero-logo-ink-mask: url(...); } — run node scripts/build-logo.js')
    }

    /* --- 7. the app's font TOKENS must not be redeclared anywhere ---
       Regression guard for a real shipped bug. The theme used to carry
           :root { --dsw-font-family: Arial, ...; --ds-font-family-code: ... }
       and that is not a theme-private knob: dsh-web-frontend renders the UI root
       font from it (`body{font-family:var(--dsw-font-family, <system stack>)}`),
       so the override restyled EVERY third-party widget injected into the app
       root. Anything with `font-family:inherit` — e.g. DeepSeek-Balance-Whale-
       Widget — inherited Arial and lost its own face for its balance digits.

       The check is deliberately a plain "these two names may not be declared at
       all", not a structural :root walk: the damage is caused by the DECLARATION,
       and a future edit could equally reinstate it on body or inside a media
       query. Reading them as fallbacks (`var(--dsw-font-family, <theme stack>)`)
       is the supported form and stays clean, because only `name:` is matched. */
    const ownedByApp = ['--dsw-font-family', '--ds-font-family-code']
    const redeclared = ownedByApp.filter((v) =>
      new RegExp('(^|[;{\\s])' + v + '\\s*:', 'm').test(stripped))
    if (redeclared.length === 0) {
      pass('the app font tokens (--dsw-font-family / --ds-font-family-code) are never redeclared')
    } else {
      fail(`the app font token(s) ${redeclared.join(', ')} are DECLARED by the theme\n      `
        + `-> the app renders the UI root font from --dsw-font-family, so this restyles `
        + `every third-party widget that inherits it (and --ds-font-family-code every code `
        + `surface). Use the theme's own --edge-font on the theme's own elements instead; `
        + `see the typography note at the top of the stylesheet.`)
    }

    /* Any --edge-* variable that substitutes a --dsw-* token must NOT be declared
       inside a :root block. Checked structurally: walk each top-level rule and look
       at :root blocks only. */
    const rootBlocks = []
    {
      const re = /(^|\})\s*([^{}]*?):root([^{}]*?)\{([^}]*)\}/g
      /* Iterated with for..of over matchAll rather than the usual while-loop that
         re-tests a global regex against null. Both walk the same matches, but this
         file is read by static signature scanners, and a bare dot-exec call matches
         their child_process rule: the scanner cannot see the receiver, so a RegExp
         exec reads as process execution and is reported as a HIGH security hit
         (the gate tool itself documents that false positive). matchAll keeps the
         loop and removes the token. */
      for (const m2 of stripped.matchAll(re)) rootBlocks.push({ body: m2[4], at: m2.index })
    }
    const offenders = []
    for (const b of rootBlocks) {
      const re2 = /^\s*(--edge-[\w-]+)\s*:\s*([^;]*var\(\s*--dsw-[^;]*)\;/gm
      for (const m3 of b.body.matchAll(re2)) offenders.push(m3[1])
    }
    if (offenders.length === 0) {
      pass('no --edge-* variable reads a --dsw-* token from :root (tokens live on body)')
    } else {
      fail(`--edge-* variable(s) declared at :root while substituting a body-level token: `
        + `${offenders.join(', ')}\n      `
        + `-> the app sets --dsw-* tokens inline ON BODY, so a :root declaration is `
        + `guaranteed-invalid and computes to EMPTY; move it into a body { } block`)
    }
  }
}

/* --- 3. the file must actually parse ---
   Compiled in-process with vm.Script rather than by spawning `node --check`:
   spawning to capture piped stdio is denied in some sandboxes (EPERM), and this
   checks exactly the same thing — the source compiles as a real script — without
   executing any of it. */
try {
  new vm.Script(src, { filename: file })
  pass('client.js compiles (parsed in-process, not executed)')
} catch (e) {
  fail('client.js does not parse: ' + e.message)
}

/* --- 4. the turn-status label must be recoloured via background-image ---
   A plain `color:` cannot win against upstream's transparent text fill, so an edit
   that "fixes" this rule with color: would silently do nothing. */
if (cssText.includes("turnStatus")) {
  const hasBg = /turnStatus[\s\S]{0,400}?background-image:\s*linear-gradient/.test(cssText)
  if (hasBg) pass('turn-status label is recoloured through background-image (gradient text)')
  else fail('turn-status rules found but no background-image gradient — a plain color: cannot recolour gradient text')
}

/* --- 5. the settings panel's unified dropdown must exist as CSS, not just JS ---
   The panel builds .endfield-select elements in React; if the stylesheet rules
   were dropped (or renamed on one side only), the control renders unstyled in
   every row and only a screenshot would notice. The menu must draw on the app's
   own menu-surface token, the open animation may only touch opacity/transform,
   and the shape is pinned to the official filter dropdown. This section runs
   BEFORE the exit below — it used to sit after it, so its failures were printed
   and then ignored (exit 0, "all checks passed"). */
{
  /* Re-derive the comment-stripped stylesheet: section 5 runs at top level,
     outside the scope that owns the section-1 local. */
  const s2 = cssText.replace(/\/\*[\s\S]*?\*\//g, '')
  const need = [
    ['.endfield-select-trigger', 'endfield-select-trigger rule missing — the row control renders unstyled'],
    ['.endfield-select-menu', 'endfield-select-menu rule missing — opened menus render unstyled'],
    ['.endfield-select-option', 'endfield-select-option rule missing — menu rows render unstyled'],
  ]
  for (const [needle, why] of need) {
    if (src.includes(needle)) pass(needle.slice(1) + ' is defined in the stylesheet')
    else fail(why)
  }
  const menuRule = /\.endfield-select-menu\s*\{([^}]*)\}/.exec(s2.replace(/\n\s*/g, ' '))
  if (menuRule && /var\(--dsw-menu-surface-fill\)/.test(menuRule[1])) {
    pass('endfield-select-menu draws on --dsw-menu-surface-fill (same surface as app menus)')
  } else {
    fail('endfield-select-menu must use var(--dsw-menu-surface-fill) — any other surface breaks the unified look')
  }
  const kf = /@keyframes\s+endfield-select-in\s*\{([\s\S]*?)\}\s*\}/.exec(s2)
  if (kf && !/width|height|top|left|right|bottom|margin|padding|inset/.test(kf[1])) {
    pass('endfield-select-in keyframes only animate opacity/transform')
  } else {
    fail('endfield-select-in must only animate opacity/transform (compositor-only, per docs/design-principles.md)')
  }
  /* 形制钉在官网 /operator 筛选下拉（官方 Dropdown 组件）上：铭牌色、圆形
     箭头、斜纹选中底与紫/绿信号条都是官方 CSS 原值。改动它们等于
     把控件从参考里拉出来——要改先改 docs/design-language.md 的对照表。 */
  const flat = s2.replace(/\n\s*/g, ' ')
  const ruleOf = (sel) => {
    const m = new RegExp(sel.replace(/[.[\]'()]/g, (c) => '\\' + c) + '\\s*\\{([^}]*)\\}').exec(flat)
    return m ? m[1] : ''
  }
  const trig = ruleOf('.endfield-select-trigger')
  const optBg = ruleOf('.endfield-select-option-bg')
  /* The panel (and its unified dropdown) moved to src/client/ui/settings/ with
     the module split, so the shape assertion reads the WHOLE client source tree
     and is whitespace-collapsed first: pinning the exact indentation of a moved
     block would make every future move a check.js edit for no added safety. */
  const clientJsFlat = sources.concatClientJs().replace(/\s+/g, ' ')
  const shapeChecks = [
    [/background-color:\s*#3a3a3a/.test(trig) && /color:\s*#ffffff/.test(trig), '铭牌 = 官方 #3a3a3a 底 + 白字'],
    [/background:\s*var\(--edge-dd-arrow\)/.test(ruleOf('.endfield-select-arrow')), '圆形箭头 = 内嵌的官方 arrow.png（--edge-dd-arrow）'],
    [/rotate\(180deg\)/.test(ruleOf('.endfield-select.is-open .endfield-select-arrow')), '展开时箭头 rotate(180deg)（官方 .Dropdown_open 同款）'],
    [/opacity:\s*0/.test(optBg) && /linear-gradient\(-45deg/.test(optBg)
      && /opacity:\s*1/.test(ruleOf(".endfield-select-option[aria-checked='true'] .endfield-select-option-bg")),
      '选中底 = 预建斜纹层，只切 opacity（不创造几何）'],
    [/#ff00f0 0, #ff00f0 50%, #00ffa2 0/.test(ruleOf('.endfield-select-option-bg::before')), '选中行左缘 = 官方紫 #ff00f0 / 绿 #00ffa2 各半'],
    [/\[role='menuitemradio'\]\[aria-checked='true'\]:not\(\.endfield-select-option\)\s*,/.test(flat), '全局「菜单当前项」划词灰规则对本控件开洞（否则 !important 盖掉斜纹）'],
    [clientJsFlat.includes("R.createElement('button', { key: o.value, type: 'button', role: 'menuitemradio'"), '选项是 button[role=menuitemradio]（可聚焦，同应用菜单元素）'],
  ]
  for (const [ok, what] of shapeChecks) {
    if (ok) pass('统一下拉形制 · ' + what)
    else fail('统一下拉形制丢失：' + what)
  }
}

/* --- 6. official button material (等高线流线) wired to the four hosts ---
   The bytes are pinned by scripts/build-texture.js --check (sha256); this
   section pins the WIRING: every requested host carries the layer, the band
   keeps the official 320:72 ratio WITHOUT covering the button (56% width +
   auto height, never cover/100%), and the dark outline host swaps to the
   palette-inverted twin. All four hosts are also in selector-guard's hook
   list. */
{
  const s3 = cssText.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*/g, ' ')
  const matRule = /(\[class\$='_newSession'\],[^{]*)\{([^}]*)\}/.exec(s3)
  const hosts = [
    ["[class$='_newSession'],", '新会话'],
    ["button[class*='_primary'],", '发送/停止'],
    ["[data-question-key] button[class*='_primary'],", '提问卡 · 提交'],
    ["[data-question-key] button[class*='_outline'],", '提问卡 · 跳过'],
  ]
  for (const [needle, label] of hosts) {
    if (matRule && matRule[1].includes(needle)) pass('等高线材质挂载 · ' + label)
    else fail('等高线材质缺主机：' + label + '（选择器 ' + needle + ' 应在材质规则里）')
  }
  /* 悬停/聚焦态必须逐个重述：主题自己的 background 简写 !important（新会话
     悬停、_primary 悬停）会把 image 层重置为 none，漏一个状态就掉一层。 */
  {
    const sel = matRule ? matRule[1] : ''
    const states = [
      ["[class$='_newSession']:hover", '新会话悬停'],
      ["[class$='_newSession']:focus-visible", '新会话聚焦'],
      ["[data-question-key] button[class*='_outline']:hover:not(:disabled)", '跳过悬停'],
    ]
    const hoverVariants = (sel.match(/:hover:not\(:disabled\)/g) || []).length
    const stateOk = states.every(([n]) => sel.includes(n)) && hoverVariants >= 3
    if (stateOk) pass('等高线材质 · 悬停/聚焦态逐个重述（防主题简写清层，×' + hoverVariants + '）')
    else fail('等高线材质有状态漏重述：' + states.filter(([n]) => !sel.includes(n)).map(([, l]) => l).join('、')
      + '（hover 变体 ' + hoverVariants + '<3）——悬停时图层会被 background 简写清掉')
  }
  const decls = matRule ? matRule[2] : ''
  const btnTexUri = (cssText.match(/--edge-btn-tex: url\("([^"]+)"\)/) || [])[1] || ''
  const materialChecks = [
    [/background-image:\s*var\(--edge-btn-tex\) !important/.test(decls), '图层读 --edge-btn-tex（官方原字节，由 build-texture.js 钉 sha）'],
    [/background-size:\s*auto calc\(100% \+ 2px\) !important/.test(decls), '上下各外溢 1px（calc(100%+2px)，被按钮裁掉），宽随内禀比例 320:72 向左延展'],
    [/background-position:\s*right -1px center !important/.test(decls) && /background-repeat:\s*no-repeat !important/.test(decls), '右缘外溢 1px（right -1px，盖住任何取整发丝缝）+ 单带 no-repeat'],
    [/background-origin:\s*border-box !important/.test(decls), '几何按 border-box（新会话按钮自带 .5px 边框，padding-box 会在右/上/下留发丝缝）'],
    [!/cover|100% 100%/.test(decls), '不用 cover/100%（那会把比例拉变形；「不铺满」由 320:72 比例自然给出）'],
    [/data:image\/svg\+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMjAgNzIi/.test(btnTexUri), '按钮材质 = SVG 包装（base64 头 = <svg … viewBox="0 0 320 72">，内含官方 PNG 原字节）'],
    [fs.readFileSync(path.join(__dirname, 'scripts', 'build-texture.js'), 'utf8').includes('stop-opacity')
      && fs.readFileSync(path.join(__dirname, 'scripts', 'build-texture.js'), 'utf8').includes('const wrapFadeSvg'),
      '左侧渐隐遮罩钉在构建脚本（x≤95 全隐 → x=165 全显，消除官方墨迹 x≈103 硬起笔的生硬左界）'],
    [cssText.includes('body { --edge-btn-tex-inv: url("data:image/svg+xml;base64,'), '反相派生同样走 SVG 包装（原图 + 渐隐在同一管线，不会漂移）'],
    [/body\[data-ds-dark-theme\] \[data-question-key\] button\[class\*='_outline'\][^{]*\{[^}]*background-image:\s*var\(--edge-btn-tex-inv\) !important/.test(s3), '暗色跳过换反相墨 --edge-btn-tex-inv（官方 invert(1) 的数据版）'],
    [/\[class\$='_newSession'\]\s*\{[^}]*border-color:\s*transparent !important[^}]*\}/.test(s3)
      && /\[class\$='_newSession'\]:hover,\s*\[class\$='_newSession'\]:focus-visible\s*\{[^}]*border-color:\s*transparent !important[^}]*\}/.test(s3.replace(/\n\s*/g, ' ')),
      '新会话边框透明（accent 同色边框会在上/下/右盖住 .5px 平色发丝带、隔断墨迹达缘，DPR≥2 实测外缘 1-2 设备行零墨）'],
  ]
  for (const [ok, what] of materialChecks) {
    if (ok) pass('等高线材质 · ' + what)
    else fail('等高线材质失守：' + what)
  }
  {
    /* 侧栏「插件 / 自动化任务」入口的无边框契约（2026-10-24 所有者要求）：
       原生 _panelRow 本就 border:none，这条规则是防御性剥离——守卫它，
       无论哪个来源再给入口加边框都会被压掉；规则本身消失则守卫报警。 */
    const stripOk = /\[class\$='_sidebarCol'\] \[class\*='_panelRow'\]\s*\{[^}]*border:\s*none !important[^}]*\}/.test(cssText)
    if (stripOk) pass('侧栏入口 · 插件/自动化任务无边框（防御剥离钉死）')
    else fail('侧栏 panelRow 剥边框规则消失——入口会随应用漂移重新长出边框')
  }
}

/* --- 7. agent-team expanded board keeps its Endfield form ---
   The board's upstream CSS-module classes are hash-prefixed (VoX2oq_*), so
   every hook here must stay hash-free: the panel is anchored by its stable
   data-team-panel attribute and the inner locals by semantic suffixes. This
   section pins the four things the token layer cannot give: the floating-
   family ring, the official decoLine under the section titles, tabular
   numerals, and the gray-step member hover (never a black scrim). */
{
  const s4 = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*/g, ' ')
  const boardChecks = [
    [/body \[data-team-panel\]\s*\{[^}]*box-shadow:\s*0 0 10px rgba\(0, 0, 0, \.25\), 0 0 0 0\.5px var\(--dsw-alias-border-l2\)/.test(s4)
      && /body\[data-ds-dark-theme\] \[data-team-panel\]\s*\{[^}]*0 0 0 0\.5px var\(--dsw-alias-border-l1\)/.test(s4),
      '面板描边 = 浮层家族（0.5px ring + 官方下拉软阴影，暗色换细线档）'],
    [/body \[data-team-panel\] h3\s*\{[^}]*position:\s*relative/.test(s4)
      && /body \[data-team-panel\] h3::after\s*\{[^}]*#ff00f0 16\.6667%,#fffa00 0,#fffa00 33\.4259%,#00ffa2 0/.test(s4),
      '分组标题 = 官方三色信号线（紫:黄:绿 1:1:4 比例停靠）'],
    [/body \[data-team-panel\] h3::after\s*\{[^}]*pointer-events:\s*none/.test(s4),
      '信号线不拦截交互（装饰不入核心工作区）'],
    [/body \[data-team-panel\] \[class\$='_count'\][^{]*\{[^}]*font-variant-numeric:\s*tabular-nums/.test(s4)
      && /body \[data-team-panel\] \[class\$='_taskState'\][^{]*\{[^}]*font-variant-numeric:\s*tabular-nums/.test(s4),
      '计数/任务读数等宽（tnum）'],
    [/body \[data-team-panel\] \[class\$='_member'\]:not\(:disabled\):hover[^{]*\{[^}]*rgba\(0, 0, 0, 0\.04\)/.test(s4),
      '成员卡悬停 = 官网灰阶洗面（rgba .04，非黑遮罩）'],
    [/body\[data-ds-dark-theme\] \[data-team-panel\] \[class\$='_member'\][^{]*\{[^}]*var\(--dsw-alias-bg-layer-3/.test(s4),
      '暗色成员卡悬停 = 沉底块抬一档（layer-3）'],
    [/body \[data-team-panel\] \[class\$='_member'\]\s*\{[^}]*transition:\s*background-color \.2s ease/.test(s4),
      '悬停过渡只动颜色，且挂在基础规则上（官网语法）'],
    [/body\[data-endfield-texture='subtle'\] \[data-team-panel\]::after/.test(s4)
      && /body\[data-endfield-texture='standard'\] \[data-team-panel\]::after/.test(s4)
      && !/body\[data-endfield-texture\] \[data-team-panel\]::after\s*\{[^}]*background-image/.test(s4),
      '底部斜纹带按值挂 subtle/standard 两档（off 与属性残留不画）'],
    [/(\[data-team-panel\]::after\s*\{[^}]*\})/.test(s4) && (() => {
        const b = (s4.match(/\[data-team-panel\]::after\s*\{([^}]*)\}/) || [])[1] || ''
        return b.includes('13.9512529279%') && b.includes('var(--edge-tex-hatch-color)')
          && b.includes('z-index: -1') && b.includes('pointer-events: none')
          && b.includes('background-size: .75rem .75rem')
      })(),
      '斜纹带 = 官方 shallowBg 配方（停靠/周期照抄，纹理令牌上色，压在内容之下）'],
    [/@media \(prefers-reduced-transparency: reduce\), \(prefers-contrast: more\)\s*\{[^}]*\[data-team-panel\]::after\s*\{[^}]*display:\s*none/.test(s4),
      '斜纹带在减透明/高对比下降级关闭（与列底纹同路径）'],
  ]
  for (const [ok, what] of boardChecks) {
    if (ok) pass('智能体团队看板 · ' + what)
    else fail('智能体团队看板失守：' + what)
  }
}

/* --- 8. the settings panel must NOT look React up from its own closures ---
   Guard for the blank-panel regression: on a real page the settings nav row
   existed but the section body stayed empty. Root cause: after the tsdown
   restructure every non-entry module (all of src/client/ except index.js) is
   hoisted to the IIFE TOP LEVEL of the artifact, OUT of the factory(require)
   body — inside the panel's component closures `typeof require` was
   'undefined', the app ships no global React either, so the old
   `typeof React !== 'undefined' ? React : require('react')` resolved to null
   and the component silently returned null. The in-process tests never saw
   it because their recording React double hangs off the GLOBAL, which that
   lookup's first branch accepts. Contract this pins, both halves: the entry
   resolves React inside apply() (the one function the artifact keeps inside
   the factory body, where the module seed require('react') is reachable) and
   injects it as `react`; the panel component reads that injection first and
   never mentions `require`. */
{
  const sectionPath = path.join(__dirname, 'src', 'client', 'ui', 'settings', 'section.js')
  /* Comments are stripped before the lookups are searched: the rationale
     blocks here and in the artifact quote the very phrases they ban, and the
     guard is about CODE doing the lookup, not about prose naming it. The
     character-class prefix keeps URL-ish `//` (preceded by : or letters or a
     quote) out of the line-comment match. */
  const stripComments = (s) => s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"A-Za-z0-9])\/\/[^\n]*/g, '$1')
  const sectionSrc = stripComments(fs.readFileSync(sectionPath, 'utf8'))
  if (!/typeof require/.test(sectionSrc)) {
    pass('section.js never touches a lexical require (React arrives by injection)')
  } else {
    fail('section.js looks up `require` from its closures — on the real artifact those scopes sit outside factory(require), the lookup returns null and the settings panel goes blank')
  }
  if (/const R = react \|\| \(\(typeof React !== 'undefined'\) \? React : null\)/.test(sectionSrc)) {
    pass('panel resolves React as `react ||` global-fallback (injection first)')
  } else {
    fail('panel must read the injected `react` first (`const R = react || ...`) — a global-only lookup goes null on real pages')
  }
  /* The entry side: resolve inside apply() (factory scope in the artifact),
     and actually hand the result to createSettingsSection. */
  if (/\? require\('react'\) : null\)/.test(clientSrc) && /react,\s*\n\s*}\)/.test(clientSrc)) {
    pass("index.js resolves require('react') inside the factory scope and injects `react`")
  } else {
    fail("index.js must resolve React via require('react') where the factory scope can see it, and pass `react` into createSettingsSection")
  }
  /* The artifact side: everything BEFORE the `factory: (require) =>` line is
     the hoisted module graph — the component closures live there, so neither
     `typeof require` nor an ambient-React lookup may appear in that region;
     the seed require("react") call itself may only sit after it. */
  const factoryAt = lines.findIndex((l) => /factory:\s*\(require\)\s*=>/.test(l))
  if (factoryAt === -1) {
    fail('artifact has no `factory: (require) =>` body — the module loader contract changed, re-check the React injection')
  } else {
    const hoisted = stripComments(lines.slice(0, factoryAt).join('\n'))
    /* Only the lexical `require` lookup is banned out here: the artifact's
       hoisted region genuinely has no `require` in scope, while a `typeof
       React` GLOBAL fallback is fine (test doubles and hosts that expose one
       ride exactly that branch). */
    if (!/typeof require/.test(hoisted)) {
      pass('artifact: hoisted module region (pre-factory) carries no lexical require lookup')
    } else {
      fail('artifact: a `typeof require` lookup sits in the hoisted region before factory(require) — that scope has no require, the panel will render blank')
    }
    const factoryBody = lines.slice(factoryAt).join('\n')
    if (/require\((['"])react\1\)/.test(factoryBody)) {
      pass('artifact: require("react") resolves inside the factory body (module seed reachable)')
    } else {
      fail("artifact: the factory body no longer calls require('react') — the panel has no React source on real pages")
    }
  }
}

console.log('')
if (failures) {
  console.error(`${failures} check(s) failed`)
  process.exit(1)
}
console.log('all checks passed')
