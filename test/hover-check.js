/**
 * hover-check.js — exercise the REAL :hover selector, not a same-specificity
 * stand-in, by driving Chrome over the DevTools Protocol and moving the mouse.
 *
 * Why this exists: settings-buttons.test.js reads computed styles, which cannot
 * trigger :hover, so it swaps in a .HOVERPROBE class. That is a fair cascade
 * equivalent, but a reverse-control experiment proved the limit — deleting the real
 * ':hover' half of the theme rule did NOT fail that test, because the probe half
 * was carrying it alone. A guard that cannot fail for the shipped selector is not
 * evidence about the shipped selector.
 *
 * This script therefore asserts on real hovered pixels: it screenshots the button
 * with the pointer over it and measures the glyph colour against the fill.
 *
 * It covers three surfaces, because a hover defect and its fix can pull in
 * opposite directions and both need a real pointer:
 *
 *   1. 编辑 (settings > 模型, '*_secondaryButton') — the accent fill lands on the
 *      button itself and must be met with ink. The original bug.
 *   2. 添加模型提供商 ('*_addButton' inside the plain '*_addActions' wrapper) — THE
 *      REPORTED 模型设置页面 BUG. The theme's composer hook was the bare substring
 *      '_add', which also matched that wrapper <div>: hovering the button hovered
 *      the wrapper, the theme filled the WRAPPER with the solid accent, and the
 *      button kept upstream's translucent wash + label-primary — measured
 *      rgb(245, 245, 240) on rgb(255, 245, 0) = 1.05:1, an invisible label.
 *      A '.HOVERPROBE' class could never have caught this one either: the old rule
 *      had no probe half and the wrapper is a DIFFERENT element from the button.
 *   3. the composer's + button ('RlGAzG_add') — the hook's actual purpose. Scoping
 *      the hook to the composer fixes (2) but must not delete (3), so both the
 *      rest ink (accent) and the hovered inversion (black on accent) are asserted.
 *
 * Usage: node test/hover-check.js
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
/* Browser plumbing (Chrome discovery, launch, CDP transport, PNG decoding) is
   shared with the rest of the suite — see test/fixtures/chrome-cdp.js. */
const { launch } = require('./fixtures/chrome-cdp.js')

const ROOT = path.resolve(__dirname, '..')

let failures = 0
const pass = (m) => console.log('ok    ' + m)
const fail = (m) => { console.error('FAIL  ' + m); failures++ }

const lin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
const lum = (p) => 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2])
const ratio = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05) }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'endfield-hover-'))
  fs.copyFileSync(path.join(ROOT, 'client.js'), path.join(OUT, 'client.js'))
  const page = path.join(OUT, 'p.html')

  /* Upstream secondaryButton CSS, verbatim, WITHOUT any HOVERPROBE stand-in: the
     point is to exercise the genuine :hover path. */
  fs.writeFileSync(page, `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;height:100%}
    body{background:var(--dsw-alias-bg-base);font-family:Arial,sans-serif}
    .panel{padding:40px;background:var(--dsw-alias-bg-layer-1)}
    .zGbnIq_secondaryButton{box-sizing:border-box;font:inherit;cursor:pointer;border:none;
      justify-content:center;align-items:center;padding:0 10px;font-size:12px;line-height:18px;
      height:28px;display:inline-flex;border:1px solid var(--dsw-alias-border-l2);
      color:var(--dsw-alias-label-primary);background:0 0}
    .zGbnIq_secondaryButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
    .zGbnIq_secondaryButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-solid)}
    /* ---- settings > 模型: 添加模型提供商 (the reported bug) ----
       Verbatim from @deepseek-ai/dsh-client-ui-settings-models ModelsSection.module.css
       as installed (the '*_3nPmjq_*' build; the older '*_zGbnIq_*' names in
       settings-buttons.test.js are the same buttons under an older hash). The part
       that matters: upstream wraps the button in a PLAIN <div> ('_addActions'), so
       a pointer over the button hovers the wrapper as well. */
    ._3nPmjq_addBlock{flex-direction:column;gap:12px;display:flex}
    ._3nPmjq_addActions{display:flex}
    ._3nPmjq_addButton{box-sizing:border-box;font:inherit;cursor:pointer;border:none;
      justify-content:center;align-items:center;gap:6px;padding:0 14px;font-size:14px;
      line-height:22px;display:inline-flex;height:44px;flex:1 1 0;min-width:180px;
      border:1px dashed var(--dsw-alias-border-l3);
      color:var(--dsw-alias-label-primary);background:0 0}
    ._3nPmjq_addButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
    /* ---- composer + button: what the theme hook actually targets ----
       Verbatim from @deepseek-ai/dsh-client-ui-conversation InputBar.module.css. */
    .Dc7zOa_composerSeat{display:flex;flex-direction:column}
    .RlGAzG_add{background:var(--dsw-specific-selector);width:28px;height:28px;
      color:var(--dsw-alias-label-primary);cursor:pointer;border:none;border-radius:999px;
      flex:none;place-items:center;display:grid}
    .RlGAzG_add:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-solid)}
    /* ---- composer action chips: verbatim upstream hover consumers ----
       .uV2eYG_select from InputBar.module.css; .JObwrW_trigger from the
       plugins chip module (same hover token family). */
    .uV2eYG_tools{align-items:center;min-width:0;display:flex;gap:12px}
    .uV2eYG_select{border-radius:var(--dsw-radius-sm);max-width:220px;height:28px;
      color:var(--dsw-alias-label-secondary);white-space:nowrap;cursor:pointer;appearance:none;
      background-color:#0000;border:none;outline:none;padding:0 20px 0 8px;font-size:13px;
      font-weight:500;line-height:20px}
    .uV2eYG_select:hover:not(:disabled){background-color:var(--dsw-alias-interactive-bg-hover)}
    .JObwrW_trigger{height:28px;border:none;background:0 0;cursor:pointer;
      color:var(--dsw-alias-label-secondary);font-size:13px;padding:0 8px}
    .JObwrW_trigger:hover,.JObwrW_trigger[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
    .plainHover:hover{background:var(--dsw-alias-interactive-bg-hover)}
  </style></head><body>
  <div class="panel"><button class="zGbnIq_secondaryButton" id="edit">编辑</button></div>
  <div class="panel _3nPmjq_addBlock">
    <div class="_3nPmjq_addActions" id="addWrap">
      <button class="_3nPmjq_addButton" id="addProvider">+ 添加模型提供商</button>
    </div>
  </div>
  <div class="panel Dc7zOa_composerSeat">
    <!-- IconPlusOutlineMedium's geometry: a filled path on currentColor. -->
    <button class="RlGAzG_add" id="composerAdd" aria-label="+"><svg width="14" height="14"
      viewBox="0 0 16 16"><path fill="currentColor" d="M7 3h2v4h4v2H9v4H7V9H3V7h4z"/></svg></button>
    <!-- The composer action chips (插件/模型选择/…): verbatim upstream hover
         consumers inside the _tools row the theme's token remap scopes to.
         chipGuard sits in the seat but OUTSIDE the rows — it must keep the
         body-level accent wash, proving the remap does not leak. -->
    <div class="uV2eYG_tools">
      <select class="uV2eYG_select" id="chipSelect"><option>模型选择</option></select>
      <button class="JObwrW_trigger" id="chipTrigger">插件</button>
    </div>
    <button class="plainHover" id="chipGuard">范围外</button>
  </div>
  <div class="panel pI_x6G_centerCol">
    <!-- The app's real tab rules (ui-conversation), verbatim, including the
         active underline ::after the theme must clear AND the label span
         (overflow:hidden) the theme's slide must not clip. The SELECTED tab
         keeps the app's class order 'wSkVaW_tab wSkVaW_tabActive' — the
         compound suffix is exactly what silently killed the first
         :is()-less version. -->
    <style>
      .wSkVaW_tabs{gap:36px;margin-top:10px;padding-left:8px;display:flex;position:relative}
      .wSkVaW_tab{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;
        padding:0 0 9px;font-size:13px;font-weight:500;line-height:16px;position:relative}
      .wSkVaW_tab:after{content:"";background:0 0;border-radius:2px;height:2px;position:absolute;bottom:-1px;left:0;right:0}
      .wSkVaW_tabActive{color:var(--dsw-alias-state-business-primary)}
      .wSkVaW_tabActive:after{background:var(--dsw-alias-state-business-primary)}
      .wSkVaW_tabLabel{text-overflow:ellipsis;white-space:nowrap;max-width:88px;display:block;overflow:hidden}
    </style>
    <div class="wSkVaW_tabs">
      <button class="wSkVaW_tab wSkVaW_tabActive" id="tabSel"><span class="wSkVaW_tabLabel" id="labSel">对话</span></button>
      <button class="wSkVaW_tab" id="tabIdle"><span class="wSkVaW_tabLabel" id="labIdle">轨迹</span></button>
    </div>
    <!-- Reversed activeness: exercises the OTHER divider rule (first tab idle
         while its next sibling is active draws the RIGHT gutter via :has(+…)). -->
    <div class="wSkVaW_tabs" style="margin-top:24px">
      <button class="wSkVaW_tab" id="tabIdleFirst"><span class="wSkVaW_tabLabel" id="labIdleFirst">对话</span></button>
      <button class="wSkVaW_tab wSkVaW_tabActive" id="tabSelSecond"><span class="wSkVaW_tabLabel" id="labSelSecond">轨迹</span></button>
    </div>
  </div>
  <script>window.__ModuleLoader__={load:(m)=>{window.__MOD__=m}}</script>
  <script src="./client.js"></script>
  <script>
    let applied=[], scheme='dark', last=null
    const applyTokens=(t)=>{ last=t
      for(const n of applied) document.body.style.removeProperty(n); applied=[]
      for(const [k,v] of Object.entries(t)){ document.body.style.setProperty(k,v[scheme]); applied.push(k) } }
    window.__setScheme__=(s)=>{ scheme=s
      if(s==='dark') document.body.setAttribute('data-ds-dark-theme',''); else document.body.removeAttribute('data-ds-dark-theme')
      if(last) applyTokens(last) }
    window.__statusdark__=()=>getComputedStyle(document.body).getPropertyValue('--edge-status-dark').trim()
    window.__selectfill__=()=>getComputedStyle(document.body).getPropertyValue('--edge-select-fill').trim()
    localStorage.setItem('dsh-theme-endfield-enabled','1')
    localStorage.setItem('dsh-theme-endfield-loader','0')
    const mod=window.__MOD__.factory(()=>null)
    mod.apply({get:(n)=>n==='theme'?{overrideTokens:(_s,t)=>{applyTokens(t);return ()=>{}}}:undefined,effect:()=>{}})
    window.__setScheme__('dark')
    window.__rect__=(id)=>{ const r=document.getElementById(id).getBoundingClientRect()
      return {x:r.x,y:r.y,w:r.width,h:r.height} }
    window.__style__=(id)=>{ const cs=getComputedStyle(document.getElementById(id))
      return {color:cs.color, rgb:(cs.color.match(/\\d+/g)||[]).slice(0,3).map(Number)} }
    window.__accent__=()=>getComputedStyle(document.body).getPropertyValue('--edge-accent').trim()
    window.__pseudo__=(id,which,prop)=>getComputedStyle(document.getElementById(id),which)[prop]
    /* The slide lives on the label span (the app's real markup), so measure
       there: translateX from the computed matrix, and the glyph box against the
       span's own border box to catch the overflow:hidden clip regression. */
    window.__translate__=(id)=>{ const t=getComputedStyle(document.getElementById(id)).transform
      if(t==='none') return 0
      const m=t.match(/matrix\\(([^)]+)\\)/); return m?parseFloat(m[1].split(',')[4]):0 }
    window.__clip__=(id)=>{ const el=document.getElementById(id)
      const lr=el.getBoundingClientRect(), r=document.createRange(); r.selectNodeContents(el)
      const tr=r.getBoundingClientRect()
      return {left:+(lr.left-tr.left).toFixed(2), right:+(tr.right-lr.right).toFixed(2),
        textW:+tr.width.toFixed(2), boxW:+lr.width.toFixed(2)} }
  </script></body></html>`)

  /* Font-rendering flags plus the 4x device scale are what make this check
     platform-independent. The ink sample picks "the pixel furthest in luminance
     from the fill that occurs >= 3 times", which needs SOLID stroke pixels to
     land on. At 1x and 12px, Windows (DirectWrite) leaves plenty but Linux
     (FreeType) smears the same glyphs into mostly-blended pixels, so the sample
     lands on an anti-aliased edge — a ~50% mix of ink and fill — and the measured
     contrast collapses (3.38:1 on 谷地黄, 2.99:1 on 武陵青; note the sampled
     rgb(137,133,7) IS the midpoint of #101110 and #fff500) even though the
     palette never changed. Greyscale AA with hinting off is necessary but not
     sufficient; rasterising at 4x is what guarantees a solid stroke core exists
     on every platform. The CSS is untouched, so the rule under test is still the
     shipped one. */
  const SCALE = 4
  let cdp
  try {
    cdp = await launch({
      width: 520, height: 560, dpr: SCALE,
      url: 'file:///' + page.replace(/\\/g, '/'),
      args: ['--hide-scrollbars', '--font-render-hinting=none',
        '--disable-font-subpixel-positioning', '--disable-lcd-text',
        '--force-color-profile=srgb'],
    })
    await sleep(600)

    const evaluate = (expr) => cdp.evaluate(expr)
    const shoot = () => cdp.screenshot()

    const hexRgb = (s) => {
      const m = /^#?([0-9a-f]{6})$/i.exec(String(s).trim())
      if (!m) return null
      const n = parseInt(m[1], 16)
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    }
    const near = (a, b, tol) => a !== null && b !== null
      && Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol && Math.abs(a[2] - b[2]) <= tol
    const rgbText = (p) => 'rgb(' + p.join(', ') + ')'

    /* Real pointer over the element, screenshot, then split the box pixels into
       fill (the dominant colour) and glyph ink (the furthest pixel in luminance
       that occurs >= 3 times), and measure their contrast.
       Rect comes back in CSS px; the screenshot is SCALE times that. */
    const hoverSample = async (id) => {
      const b = JSON.parse(await evaluate('JSON.stringify(window.__rect__(' + JSON.stringify(id) + '))'))
      const cx = Math.round(b.x + b.w / 2), cy = Math.round(b.y + b.h / 2)
      // Move the real mouse over the element so the genuine :hover rules apply.
      await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy, buttons: 0 })
      await sleep(220)
      const img = await shoot()
      const x0 = Math.max(0, Math.round((b.x + 2) * SCALE)), x1 = Math.min(img.w - 1, Math.round((b.x + b.w - 2) * SCALE))
      const y0 = Math.max(0, Math.round((b.y + 2) * SCALE)), y1 = Math.min(img.h - 1, Math.round((b.y + b.h - 2) * SCALE))
      const tally = new Map()
      const px = (x, y) => { const i = (y * img.w + x) * img.ch; return [img.data[i], img.data[i + 1], img.data[i + 2]] }
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const k = px(x, y).join(',')
        tally.set(k, (tally.get(k) || 0) + 1)
      }
      const sorted = [...tally.entries()].sort((a, b2) => b2[1] - a[1])
      if (sorted.length === 0) throw new Error('no pixels sampled for #' + id + ' — is it inside the viewport?')
      const fill = sorted[0][0].split(',').map(Number)
      let ink = fill, best = 0
      for (const [k, n] of sorted) {
        if (n < 3) continue
        const p = k.split(',').map(Number)
        const d = Math.abs(lum(p) - lum(fill))
        if (d > best) { best = d; ink = p }
      }
      return { ratio: ratio(ink, fill), ink, fill }
    }
    const parkPointer = async () => {
      await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5, buttons: 0 })
      await sleep(120)
    }
    const inkCheck = (label, s, min) => {
      const detail = s.ratio.toFixed(2) + ':1  ink=' + rgbText(s.ink) + ' on fill=' + rgbText(s.fill)
      if (s.ratio >= min) pass(label + '  [' + detail + ']')
      else fail(label + '  [' + detail + ']  <- 悬停时文字与底色对比不足')
    }

    /* One shipped palette (谷地黄) — the loop is the scheme pair only. */
    for (const scheme of ['light', 'dark']) {
      {
        await evaluate("window.__setScheme__('" + scheme + "')")
        await sleep(150)
        const accent = hexRgb(await evaluate('window.__accent__()'))
        const tag = '谷地黄 · ' + scheme

        /* 1. 编辑 — the accent fill is on the button itself (it needs ink on it). */
        inkCheck(tag + ' · 编辑 真实 :hover', await hoverSample('edit'), 4.5)
        await parkPointer()

        /* 2. 添加模型提供商 — the reported bug. The label must stay readable on the
           composited fill, and the wrapper underneath must NOT be carrying the
           theme's solid accent (that is the 1.05:1 state in the report). */
        const add = await hoverSample('addProvider')
        inkCheck(tag + ' · 模型页「添加模型提供商」真实 :hover', add, 4.5)
        if (near(add.fill, accent, 4)) {
          fail(tag + ' · 「添加模型提供商」外层容器不得被实心强调色填充  [fill=' + rgbText(add.fill)
            + ' ≈ accent=' + rgbText(accent) + ']')
        } else {
          pass(tag + ' · 「添加模型提供商」外层容器未被实心强调色填充  [fill=' + rgbText(add.fill) + ']')
        }
        await parkPointer()

        /* 3. composer + — the hook's purpose. Since 2026-10 the hover fill is the
           划词灰 pair (same tokens as ::selection, per the user's ask), NOT the
           solid accent: assert the fill equals the selection gray AND that the
           glyph still reads on it. Its rest ink is dark-mode-only by design (in
           light the app's own label-primary already contrasts on
           --dsw-specific-selector). */
        const composer = await hoverSample('composerAdd')
        inkCheck(tag + ' · 输入区 + 真实 :hover', composer, 4.5)
        const selFill = hexRgb(await evaluate('window.__selectfill__()'))
        if (near(composer.fill, selFill, 4)) pass(tag + ' · 输入区 + 悬停为划词灰底（同 ::selection）  [fill=' + rgbText(composer.fill) + ']')
        else fail(tag + ' · 输入区 + 悬停应为划词灰底  [fill=' + rgbText(composer.fill) + ' vs select=' + rgbText(selFill) + ']')
        await parkPointer()

        const rest = JSON.parse(await evaluate('JSON.stringify(window.__style__("composerAdd"))'))
        const restColor = rest.rgb
        if (scheme === 'dark') {
          /* The rest ink reads --edge-status-dark, which EQUALS the accent for
             谷地黄 — read it from the page so the rule stays honest even if the
             two roles ever split again. */
          const restTarget = hexRgb(await evaluate('window.__statusdark__()'))
          if (near(restColor, restTarget, 4)) pass(tag + ' · 输入区 + 常态仍为强调色墨  [color=' + rest.color + ']')
          else fail(tag + ' · 输入区 + 常态应为强调色墨  [color=' + rest.color + ' vs ' + rgbText(restTarget) + ']')
        } else {
          if (near(restColor, accent, 4)) fail(tag + ' · 输入区 + 常态不应被暗色规则上色  [color=' + rest.color + ']')
          else pass(tag + ' · 输入区 + 常态未被暗色规则上色  [color=' + rest.color + ']')
        }
      }
    }
    /* ---- 对话/轨迹 tabs: the official /news SubpageTab wash, pinned permanently ----
       The first version of the tab rules silently matched nothing: the selected
       tab's class string ends in '_tabActive', so [class$='_tab'] never hit it
       and the ink underline survived pixel-perfect (a delegated review caught it
       by element.matches). These assertions keep that regression from coming
       back: rules must MATCH (via computed pseudos), the underline must be
       cleared on the COMPOUND class order, the hover WASH (official #f3f3f3
       step -> rgba(0,0,0,.04) composited on paper) must flip, and the ACTIVE
       tab carries the deeper official wash (#e5e5e5 step -> rgba(0,0,0,.09))
       at rest — and keeps it while hovered (official keeps #e5e5e5). */
    await evaluate("window.__setScheme__('light')")
    await sleep(200)
    const afterSel = await evaluate("window.__pseudo__('tabSel','::after','backgroundColor')")
    const afterSelW = await evaluate("window.__pseudo__('tabSel','::after','width')")
    const afterSelO = await evaluate("window.__pseudo__('tabSel','::after','opacity')")
    /* the app's underline is killed by REPLACEMENT now: every tab's ::after is the
       pre-built 1.5px divider box (not the app's 2px underline geometry), and on
       the active tab it stays unlit. */
    if (afterSelW === '1.5px' && afterSelO === '0') pass('选中标签原生底线已被线盒取代（复合类序命中）  [w=' + afterSelW + ' · ' + afterSel + ' @' + afterSelO + ']')
    else fail('选中标签底线仍在——:is() 双后缀失效  [w=' + afterSelW + ' · ' + afterSel + ' @' + afterSelO + ']')
    const washIdle = await evaluate("window.__pseudo__('tabIdle','::before','backgroundColor')")
    if (washIdle === 'rgba(0, 0, 0, 0.04)') pass('悬停洗面 = 官方 #f3f3f3 档（纸面 rgba .04）  [' + washIdle + ']')
    else fail('悬停洗面色漂移（应 rgba(0,0,0,0.04)，黑遮罩回归？）  [' + washIdle + ']')
    /* the wash plate must BREATHE around the text: the app's tab buttons have no
       horizontal padding, so inset:0 hugs the glyphs ("刚刚把文字罩下来", user
       report). Official SubpageTab gets this from 0 3rem padding; here negative
       offsets extend the plate ±12px/−4px past the border box. */
    const idleRect = JSON.parse(await evaluate("JSON.stringify(window.__rect__('tabIdle'))"))
    const washW = parseFloat(await evaluate("window.__pseudo__('tabIdle','::before','width')"))
    const washTop = await evaluate("window.__pseudo__('tabIdle','::before','top')")
    if (washW >= idleRect.w + 24 - 0.5) pass('洗面外扩左右各 12px（' + washW.toFixed(1) + 'px ≥ 文字盒 ' + idleRect.w.toFixed(1) + '+24，不贴字）')
    else fail('洗面退回贴字几何  [洗面 ' + washW.toFixed(1) + 'px vs 盒 ' + idleRect.w.toFixed(1) + 'px]')
    if (washTop === '-4px') pass('洗面上扩 4px  [' + washTop + ']')
    else fail('洗面上缘贴字  [top=' + washTop + ']')
    const beforeIdleRest = await evaluate("window.__pseudo__('tabIdle','::before','opacity')")
    if (beforeIdleRest === '0') pass('未选标签常态 opacity=0（洗面不亮）  [' + beforeIdleRest + ']')
    else fail('未选标签常态洗面不应可见  [opacity=' + beforeIdleRest + ']')
    const selWash = await evaluate("window.__pseudo__('tabSel','::before','backgroundColor')")
    const selRest = await evaluate("window.__pseudo__('tabSel','::before','opacity')")
    if (selWash === 'rgba(0, 0, 0, 0.09)' && selRest === '1') pass('选中标签常态 = 官方 #e5e5e5 档常亮  [' + selWash + ' @' + selRest + ']')
    else fail('选中标签洗面不对（应 rgba(0,0,0,0.09) @1）  [' + selWash + ' @' + selRest + ']')
    /* the official active choreography: constant 22px side padding, text slide,
       circular arrow as a ::before background layer, 2px bevel */
    const selPad = await evaluate("getComputedStyle(document.getElementById('tabSel')).paddingLeft")
    if (selPad === '22px') pass('页签结构 = 官方恒定水平 padding（0 22px 9px）  [' + selPad + ']')
    else fail('页签水平 padding 不对（应 22px）  [' + selPad + ']')
    /* The slide must live on the app's label span, NOT as inherited text-indent
       on the button: text-indent inherits into .tabLabel (whose overflow:hidden
       then eats the first glyph — the shipped "对话"→"话" bug), and it shrinks
       the label's intrinsic width (26→13px), which shrinks the button too. */
    const selIndent = await evaluate("getComputedStyle(document.getElementById('tabSel')).textIndent")
    const labIndent = await evaluate("getComputedStyle(document.getElementById('labSel')).textIndent")
    if (selIndent === '0px' && labIndent === '0px') pass('文字滑移不靠可继承的 text-indent（按钮/label 均为 0）')
    else fail('text-indent 又回到页签上（会继承进 label 并裁剪首字）  [' + selIndent + ' / ' + labIndent + ']')
    const selShift = await evaluate("window.__translate__('labSel')")
    if (selShift === -13) pass('激活文字滑移 = label transform translateX(−13px)（官方 −1.75rem ×0.46）  [' + selShift + ']')
    else fail('激活滑移不对（label 应在 −13px）  [' + selShift + ']')
    const idleShift = await evaluate("window.__translate__('labIdle')")
    if (idleShift === 0) pass('未选页签 label 不位移  [' + idleShift + ']')
    else fail('未选页签 label 被位移  [' + idleShift + ']')
    const selClip = JSON.parse(await evaluate("JSON.stringify(window.__clip__('labSel'))"))
    if (selClip.left <= 0.01 && selClip.right <= 0.01) pass('激活 label 无裁剪：首字完整（「对话」盒 ' + selClip.boxW + 'px = 文字 ' + selClip.textW + 'px）  [溢出 L' + selClip.left + ' R' + selClip.right + ']')
    else fail('激活 label 仍被 overflow:hidden 裁剪（首字丢失）  [溢出 L' + selClip.left + ' R' + selClip.right + ']')
    const selRectW = JSON.parse(await evaluate("JSON.stringify(window.__rect__('tabSel'))")).w
    const idleRectW = JSON.parse(await evaluate("JSON.stringify(window.__rect__('tabIdle'))")).w
    if (Math.abs(selRectW - idleRectW) < 0.5) pass('激活/未选页签等宽（无切换跳版）  [' + selRectW.toFixed(1) + ' vs ' + idleRectW.toFixed(1) + ']')
    else fail('激活页签宽度与未选不等（text-indent 缩宽回归？）  [' + selRectW.toFixed(1) + ' vs ' + idleRectW.toFixed(1) + ']')
    const selArrow = await evaluate("window.__pseudo__('tabSel','::before','backgroundImage')")
    if (/data:image\/svg\+xml/.test(selArrow) && /%23f5f5f0/.test(selArrow)) pass('激活 = 官方圆形箭头图层（纸白圆 ⌀16）')
    else fail('激活箭头图层缺失  [' + String(selArrow).slice(0, 60) + ']')
    const selRadius = await evaluate("window.__pseudo__('tabSel','::before','borderRadius')")
    if (selRadius === '4px') pass('洗面倒角 = 官网 4px 对齐（2026-10-24 起不再 0.46 折算）  [' + selRadius + ']')
    else fail('洗面倒角不对（应 4px）  [' + selRadius + ']')
    /* the official #d9d9d9 gutter divider: drawn by whichever neighbour is idle */
    const divIdle = await evaluate("window.__pseudo__('tabIdle','::after','backgroundColor')")
    const divIdleLeft = await evaluate("window.__pseudo__('tabIdle','::after','left')")
    const divIdleW = await evaluate("window.__pseudo__('tabIdle','::after','width')")
    if (divIdle === 'rgb(216, 217, 213)' && divIdleLeft === '-18.75px' && divIdleW === '1.5px') pass('竖分隔线 = 官方 #d9d9d9 档（左沟，闲置侧绘制）  [' + divIdle + ' @' + divIdleLeft + ']')
    else fail('左沟分隔线不对  [' + divIdle + ' @' + divIdleLeft + ' w=' + divIdleW + ']')
    const divFirst = await evaluate("window.__pseudo__('tabIdleFirst','::after','right')")
    const divFirstBg = await evaluate("window.__pseudo__('tabIdleFirst','::after','backgroundColor')")
    if (divFirst === '-18.75px' && divFirstBg === 'rgb(216, 217, 213)') pass('竖分隔线右沟分支（首签闲置 + :has(+) 命中）  [' + divFirst + ']')
    else fail('右沟分隔线不对（:has(+) 失效？）  [right=' + divFirst + ' bg=' + divFirstBg + ']')
    const activeAfter = await evaluate("window.__pseudo__('tabSel','::after','opacity')")
    if (activeAfter === '0') pass('激活页签 ::after 线盒熄灭（箭头在 ::before，不画线）  [@' + activeAfter + ']')
    else fail('激活页签 ::after 不应亮线  [opacity=' + activeAfter + ']')
    /* real pointer onto the SELECTED tab: the compound class must get the wash too,
       and it must STAY at the active step (official keeps #e5e5e5 on hover) */
    const rect = JSON.parse(await evaluate("JSON.stringify(window.__rect__('tabSel'))"))
    await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(rect.x + rect.w / 2), y: Math.round(rect.y + rect.h / 2), buttons: 0 })
    await sleep(260)
    const beforeSelHover = await evaluate("window.__pseudo__('tabSel','::before','opacity')")
    const selHoverWash = await evaluate("window.__pseudo__('tabSel','::before','backgroundColor')")
    if (beforeSelHover === '1' && selHoverWash === 'rgba(0, 0, 0, 0.09)') pass('选中标签悬停仍为激活档（命中且不倒挂）  [' + selHoverWash + ']')
    else fail('选中标签悬停反馈不对  [' + selHoverWash + ' @' + beforeSelHover + ']')
    await parkPointer()
    /* ---- click-switch choreography: the official .2s fades actually RUN ----
       The slide is a compositor-only translateX on the label span (README of the
       fix: chrome.css 「滑移挂在 LABEL 上」). Prove the transitions execute: flip
       the active class, sample mid-flight (~90ms into the 200ms), assert the
       values are BETWEEN rest and target — a missing transition would land
       exactly on the endpoint, a dead rule on the start point. Then settle and
       confirm the endpoints, flip back, and check the reduced-motion guard flips
       instantly. */
    const transDecl = await evaluate("getComputedStyle(document.getElementById('tabIdle')).transitionProperty")
    const labTransDecl = await evaluate("getComputedStyle(document.getElementById('labIdle')).transitionProperty")
    if (/color/.test(transDecl) && /transform/.test(labTransDecl)) pass('切换过渡声明 = 页签 color + label transform（官方 .2s ease 对）  [' + transDecl + ' / ' + labTransDecl + ']')
    else fail('切换过渡声明缺失或仍驱动布局属性  [' + transDecl + ' / ' + labTransDecl + ']')
    await evaluate("document.getElementById('tabSel').classList.remove('wSkVaW_tabActive');document.getElementById('tabIdle').classList.add('wSkVaW_tabActive')")
    await sleep(90)
    const midIndent = parseFloat(await evaluate("window.__translate__('labIdle')"))
    const midWash = parseFloat(await evaluate("window.__pseudo__('tabIdle','::before','opacity')"))
    const midDiv = parseFloat(await evaluate("window.__pseudo__('tabSel','::after','opacity')"))
    if (midIndent < -0.5 && midIndent > -12.5) pass('切换中程：文字滑移进行中  [translateX ' + midIndent.toFixed(1) + 'px ∈ (−13,0)]')
    else fail('滑移未动画化（中程采样 ' + midIndent.toFixed(1) + 'px 应在 −13 与 0 之间）')
    if (midWash > 0.02 && midWash < 0.98) pass('切换中程：洗面+箭头淡入进行中  [opacity ' + midWash.toFixed(2) + ']')
    else fail('洗面淡入未动画化  [opacity ' + midWash.toFixed(2) + ']')
    if (midDiv > 0.02 && midDiv < 0.98) pass('切换中程：分隔线交叉淡入进行中  [opacity ' + midDiv.toFixed(2) + ']')
    else fail('分隔线淡入未动画化  [opacity ' + midDiv.toFixed(2) + ']')
    await sleep(400)
    const endIndent = await evaluate("window.__translate__('labIdle')")
    const endWash = await evaluate("window.__pseudo__('tabIdle','::before','opacity')")
    if (endIndent === -13 && endWash === '1') pass('切换终点落位  [translateX ' + endIndent + ' · wash ' + endWash + ']')
    else fail('切换终点不对  [translateX ' + endIndent + ' · wash ' + endWash + ']')
    /* flip back (tabSel active again), then reduced-motion must cut the animation */
    await evaluate("document.getElementById('tabIdle').classList.remove('wSkVaW_tabActive');document.getElementById('tabSel').classList.add('wSkVaW_tabActive')")
    await sleep(400)
    await cdp.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
    await sleep(60)
    await evaluate("document.getElementById('tabSel').classList.remove('wSkVaW_tabActive');document.getElementById('tabIdle').classList.add('wSkVaW_tabActive')")
    await sleep(60)
    const rmIndent = await evaluate("window.__translate__('labIdle')")
    if (rmIndent === -13) pass('减效降级：滑移瞬时落位（无动画）  [' + rmIndent + ']')
    else fail('减效降级下仍有滑移动画  [' + rmIndent + ']')
    await cdp.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: '' }] })
    /* restore the original activeness for the dark assertions below */
    await evaluate("document.getElementById('tabIdle').classList.remove('wSkVaW_tabActive');document.getElementById('tabSel').classList.add('wSkVaW_tabActive')")
    await sleep(300)
    await evaluate("window.__setScheme__('dark')"); await sleep(200)
    const darkDisplay = await evaluate("window.__pseudo__('tabIdle','::before','display')")
    if (darkDisplay === 'none') pass('暗色标签无洗面（display=none，文字提亮承担悬停）')
    else fail('暗色洗面未禁用  [display=' + darkDisplay + ']')

    /* ---- composer action chips: hover switches industrial yellow -> scheme gray ----
       The chips come from eight packages but all consume the
       --dsw-alias-interactive-bg-* family; the theme remaps the tokens inside the
       _tools/_modes/_standardControls rows to the 划词灰 pair. Real pointer, both
       schemes, expectations read from the live --edge-select-* tokens. The
       accent (#fff500) differs from the select gray (#d9d9d9), so the probe can
       tell a genuine remap from an accent leak. The guard button (seat, outside
       the rows) must keep the accent wash. */
    for (const scheme of ['light', 'dark']) {
      await evaluate("window.__setScheme__('" + scheme + "')"); await sleep(150)
      const wantFill = await evaluate("getComputedStyle(document.body).getPropertyValue('--edge-select-fill').trim()")
      const wantInk = await evaluate("getComputedStyle(document.body).getPropertyValue('--edge-select-ink').trim()")
      const hex2rgb = (h) => { const n = parseInt(h.slice(1), 16); return 'rgb(' + ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ')' }
      for (const id of ['chipSelect', 'chipTrigger']) {
        const r = JSON.parse(await evaluate("JSON.stringify(window.__rect__('" + id + "'))"))
        await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(r.x + r.w / 2), y: Math.round(r.y + r.h / 2), buttons: 0 })
        await sleep(180)
        const bg = await evaluate("window.__style__('" + id + "').color ? getComputedStyle(document.getElementById('" + id + "')).backgroundColor : ''")
        const fg = await evaluate("getComputedStyle(document.getElementById('" + id + "')).color")
        const tag = '操作条chips · ' + scheme + ' · ' + id
        if (bg === hex2rgb(wantFill)) pass(tag + ' 悬停底=划词灰  [' + bg + ']')
        else fail(tag + ' 悬停底不对（工业黄回归？）  [' + bg + ' 期望 ' + hex2rgb(wantFill) + ']')
        if (fg === hex2rgb(wantInk)) pass(tag + ' 悬停字=配对墨/白  [' + fg + ']')
        else fail(tag + ' 悬停字未配对  [' + fg + ' 期望 ' + hex2rgb(wantInk) + ']')
        await parkPointer(); await sleep(120)
      }
      if (scheme === 'light') {
        const r = JSON.parse(await evaluate("JSON.stringify(window.__rect__('chipGuard'))"))
        await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(r.x + r.w / 2), y: Math.round(r.y + r.h / 2), buttons: 0 })
        await sleep(180)
        const guardBg = await evaluate("getComputedStyle(document.getElementById('chipGuard')).backgroundColor")
        const accentRgb = await evaluate("getComputedStyle(document.body).getPropertyValue('--edge-accent-rgb').trim()")
        if (accentRgb && guardBg.indexOf(accentRgb) >= 0) pass('操作条chips · 作用域不外溢（行外仍强调色 α 洗）  [' + guardBg + ' 含 ' + accentRgb + ']')
        else fail('行外元素也被换灰（作用域外溢）  [' + guardBg + ' 不含 ' + accentRgb + ']')
        await parkPointer(); await sleep(120)
      }
    }

    cdp.close()
  } finally {
    if (cdp) await cdp.close()
  }

  console.log('')
  if (failures) { console.error(failures + ' real-hover check(s) failed'); process.exit(1) }
  console.log('all real-hover contrast checks passed')
})().catch((e) => { console.error('FAIL  ' + e.message); process.exit(1) })
