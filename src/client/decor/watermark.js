/**
 * decor/watermark.js — the background ENDFIELD wordmark (settings-toggleable).
 *
 * Extracted from the entry (see TODO.md「入口瘦身」): this module owns the
 * mark's two switches, its one placement and its mount lifecycle. The entry
 * injects the store (`prefs`), the master-switch reader (`isEnabled`) and the
 * app-frame finder (`findAppFrame`); everything else (keys, readers, state)
 * lives here.
 *
 * 2026-10-29（owner：「去掉点击新会话打开的首页中的 ENDFIELD INDUSTRIES 大字和
 * 终末地的倒三角 logo，仅在新会话主界面不显示」）：新建会话页不再承载水印。
 * hero 那一套（贴在标题行的圆框大字带 + 每帧跟随标题的 follow loop）整体删除，
 * 于是水印只剩**一个**挂载位置：任何不是新建会话页的页面（会话列；没有会话列时
 * 退到应用外框）。因为剩下的宿主都是「已经有内容」的页面，水印永远以 z-index:-1
 * 位于正文之下，两个宿主属性（isolation:isolate / position:relative）仍由
 * tokens.css 的 :has() 规则按需给上；本层 pointer-events:none，没法用命中测试
 * 断言，所以回归仍由 test/watermark-stacking.test.js 的像素比对看守。
 *
 * 两个开关仍是两个：
 *   WATERMARK_KEY — 背景水印总开关（默认开）。
 *   WATERMARK_PERSIST_KEY — 「会话页水印」（默认关）。新建会话页已经永远不画
 *     水印，所以这个开关现在决定的是：水印到底出不出现。
 */
export function createWatermark({ prefs, isEnabled, findAppFrame }) {
  const WATERMARK_KEY = 'dsh-theme-endfield-watermark'
  const WATERMARK_PERSIST_KEY = 'dsh-theme-endfield-watermark-persist'
  const WATERMARK_STYLE_KEY = 'dsh-theme-endfield-watermark-style'
  const WATERMARK_EMBLEM_KEY = 'dsh-theme-endfield-watermark-emblem'
  const isWatermarkOn = () => prefs.get(WATERMARK_KEY) !== '0'
  // Default OFF: the watermark is opt-in on the pages that can still carry it.
  const isWatermarkPersistOn = () => prefs.get(WATERMARK_PERSIST_KEY) === '1'
  /* 'hatch' = the official /operator hatch on the big letters; default 'solid'
     (the loading plate's flat grey). Applied as a body attribute; the stylesheet
     owns both appearances. */
  const isWatermarkHatchOn = () => prefs.get(WATERMARK_STYLE_KEY) === 'hatch'
  /* Which language the inverted-triangle Industries emblem in the tile's clear
     gap speaks. 'en' is the shipped look (Yue-plus vectorization); 'zh' swaps in
     the locally traced Chinese lockup from the PRTS-archived PNG. Only the
     ::after emblem swaps — the giant ENDFIELD / INDUSTRIES band is untouched.
     Applied as a body attribute; the stylesheet picks the mask. */
  const isWatermarkEmblemZh = () => prefs.get(WATERMARK_EMBLEM_KEY) === 'zh'
  /* Hash-free selectors only. DSH 0.1.2-rc.1 rebuilt its CSS modules and every
     hex hash changed (0/33 of the old pinned hashes survive), so anything of the
     form [class*='pXSMma_root'] dies silently on upgrade. The stable hooks are
     the semantic SUFFIX of the module class plus structural attributes:
     data-phase is rendered ONLY on ConversationRoot (settling|hero|active) and
     a status dot, and only ConversationRoot's class ends in '_root', so
     [class$='_root'][data-phase=…] names the conversation column exactly. */
  const findHeroRoot = () => {
    if (typeof document === 'undefined') return null
    const hero = document.querySelector('[class$="_root"][data-phase="hero"]')
    if (!hero) return null
    const r = hero.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return null
    return hero
  }
  /** The visible conversation column — the ONLY placement anchor left. The
   *  new-session column (`data-phase="hero"`) is not one any more. */
  const findConversationRoot = () => {
    if (typeof document === 'undefined') return null
    const all = document.querySelectorAll('[class$="_root"][data-phase]')
    for (const el of all) {
      if (el.getAttribute('data-phase') === 'hero') continue
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) return el
    }
    return null
  }
  let watermarkEl = null
  let watermarkHost = null
  /* Where the mark belongs for the current page. `null` means "nowhere", and
     the new-session page is deliberately that: 2026-10-29 the owner asked for
     the hero page to stop carrying the wordmark and the emblem, so a hero
     column suppresses the mark even when both switches are on.
     Otherwise mount INSIDE the element the mark decorates (2026-10-24: a
     body-level mark can never sit BETWEEN a column's background and its
     content) — the conversation column, or the app frame when no conversation
     column is on screen (a full-page settings view). */
  const mountPointFor = () => {
    if (findHeroRoot() !== null) return null
    const conv = findConversationRoot()
    if (conv !== null) return { parent: conv }
    // No conversation column on screen. A body child at z-index:-1 paints BELOW
    // the body/frame's own opaque backgrounds there and never shows, so prefer
    // the app FRAME: while the mark is mounted in it the stylesheet gives the
    // frame isolation:isolate (tokens.css), so -1 stays above the frame
    // background and strictly below the page content. body is only the last
    // resort for a page that has no frame at all. findAppFrame arrives by
    // injection, and is only ever called from here at runtime, never during the
    // factory pass.
    const frame = findAppFrame()
    return { parent: frame !== null ? frame : document.body }
  }
  const styleWatermark = (el) => {
    const s = el.style
    s.display = 'flex'
    s.alignItems = 'center'
    s.justifyContent = 'center'
    s.pointerEvents = 'none'
    s.color = 'var(--dsw-alias-label-primary)'
    s.userSelect = 'none'
    /* Two painted layers, both CSS masks: the hatched ENDFIELD/INDUSTRIES
       wordmark band (::before, assets/endfield-wordmark.svg, repeated in x by
       the stylesheet) and the Endfield Industries emblem stamped over it
       (::after, assets/endfield-industries.svg). No glyph is drawn from type,
       so translators have no text node to rewrite. */
    /* The theme's own face, via its own variable. It used to read
       --dsw-font-family directly, which now points at the APP's stack (the
       theme no longer overrides that token) — so reading it here would silently
       un-style the wordmark. --edge-font is body-scoped and falls back to the
       same stack, so this element is themed with or without the token. */
    s.fontFamily = 'var(--edge-font)'
    /* Strength comes from a CSS variable, never a literal number, so the two
       colour schemes can carry DIFFERENT alphas (defined in the stylesheet) and
       a scheme flip simply re-resolves the variable — no observer, no repaint
       logic here. An inline numeric opacity would also outrank the stylesheet,
       which is exactly what made this value unthemeable before. */
    /* Opacity lives on the ::before (hatched wordmark) and ::after (emblem)
       rules in the stylesheet instead of on the element, for the same
       themeability reason as before (CSS variables, scheme-dependent values,
       no repaint on flip) plus one new one: the two masks need DIFFERENT
       alphas — the emblem is a soft blur that needs a lift, and the wordmark's
       hatching covers only ~9% of each glyph, so one element-level opacity
       cannot express both. */
    // Fill the host and sit behind its content. z-index:-1 paints below in-flow
    // text but still above the host's own background, which is why the column /
    // frame is given `isolation: isolate` in the stylesheet: without a stacking
    // context there, -1 would slide behind that background and vanish.
    s.position = 'absolute'
    s.left = '0'
    s.right = '0'
    s.top = '0'
    s.bottom = '0'
    s.zIndex = '-1'
  }
  /* Keep the body attributes in step with the two appearance switches BEFORE
     the streaming fast path below (that path returns early and must not skip an
     appearance change). The emblem language is an attribute, not a class, for
     the same reason as the style: the stylesheet owns both masks and the element
     stays identical, so a flip is one attribute write and no remount. */
  const applyWatermarkStyle = () => {
    if (typeof document === 'undefined' || !document.body) return
    document.body.setAttribute('data-edge-wm-style', isWatermarkHatchOn() ? 'hatch' : 'solid')
    document.body.setAttribute('data-edge-wm-emblem', isWatermarkEmblemZh() ? 'zh' : 'en')
  }
  const syncWatermarkVisibility = () => {
    applyWatermarkStyle()
    const on = isEnabled() && isWatermarkOn() && isWatermarkPersistOn()
    /* The new-session page has no mark to mount, so there is nothing to decide:
       bail out before any rect read. This is the page the user types on, and the
       body observer fires on every React mutation batch — running the full
       decision per keystroke would force layout for a layer that is suppressed by
       design (2026-10-29). The probe is the cheap class/attribute match, no
       getBoundingClientRect: the live app flips data-phase on the SAME
       ConversationRoot element, so a hero hint in the DOM means the new-session
       screen is the current page. Leaving that page removes the hero element, so
       the very next batch falls through and mounts the mark again. */
    if (watermarkEl === null && typeof document !== 'undefined'
      && document.querySelector('[class$="_root"][data-phase="hero"]') !== null) return
    /* Streaming fast path. A mounted mark is still correctly placed while the
       switches are unchanged, its host is attached, no new-session column has
       appeared and its host is still the one a full decision would pick — all
       decidable WITHOUT a getBoundingClientRect. The observer fires on every
       body mutation batch, so during token streaming this used to run the full
       decision (querySelector(All) + rect reads = one forced layout) per frame.
       Any check failing here falls through to the full decision, so every real
       transition — feature off, the new-session page appearing, host detached,
       page switch — is still caught on the same batch.
       The host must also still be the one a full decision would pick: the
       fallback re-parents the mark into the app frame when no column exists
       (a full-page settings view). Coming BACK mounts a fresh column; a fast
       path that only checked host.isConnected would leave the mark stranded in
       the frame — where the column's own opaque background paints over its
       z-index:-1 forever (2026-10-26: that was a real bug). So: a column host
       must be the document's ONLY column candidate, and a frame/body host
       requires that no column candidate exists at all. querySelectorAll is
       cheap; the rect reads stay on the fall-through path only. */
    if (watermarkEl !== null && watermarkHost !== null && watermarkHost.isConnected && on
      && typeof document !== 'undefined'
      && document.querySelector('[class$="_root"][data-phase="hero"]') === null) {
      const columns = document.querySelectorAll('[class$="_root"][data-phase]')
      if (watermarkHost.hasAttribute('data-phase')) {
        if (columns.length === 1 && columns[0] === watermarkHost) return
      } else if (columns.length === 0) {
        return
      }
    }
    const target = on ? mountPointFor() : null
    // parent can be null during very early boot (no <body> yet) — never mount.
    const shouldShow = target !== null && target.parent !== null
    if (shouldShow && watermarkEl) {
      // A page change can move the parent — reparent in place, never recreate.
      if (watermarkHost !== target.parent) {
        target.parent.appendChild(watermarkEl)
        watermarkHost = target.parent
      }
    } else if (shouldShow && !watermarkEl) {
      const el = document.createElement('div')
      el.setAttribute('data-endfield-watermark', 'persist')
      /* Translation-proofing. The wordmark is a brand name that must never be
         rewritten by Chrome/Edge "translate this page", a Google Translate widget
         or a translator extension.
         The real defence is structural: the glyphs come from CSS `content` on a
         ::before (see the stylesheet), so there is NO DOM text node to translate —
         text-walking translators cannot see it at all. The attributes below are the
         declarative belt-and-braces for anything that inspects the element itself:
           translate="no"   — the HTML5 opt-out honoured by Chrome/Edge translate
           class notranslate — Google Translate's own opt-out hook
           lang="en"        — stops "this looks like Chinese page text" heuristics
         aria-hidden keeps a purely decorative mark out of the accessibility tree. */
      el.setAttribute('translate', 'no')
      el.setAttribute('lang', 'en')
      el.setAttribute('aria-hidden', 'true')
      el.className = 'notranslate'
      styleWatermark(el)
      target.parent.appendChild(el)
      watermarkEl = el
      watermarkHost = target.parent
    } else if (!shouldShow && watermarkEl) {
      if (watermarkEl.parentNode) watermarkEl.parentNode.removeChild(watermarkEl)
      watermarkEl = null
      watermarkHost = null
    }
  }
  /* The master-switch-off path (entry unmount()) and the run teardown share
     this: with the sheet torn down the mark's `opacity: var(--edge-wm-alpha)`
     computes invalid and falls back to 1, so an orphaned mark would sit on the
     page as a fully opaque logo stamp — it must go NOW, not on the next
     sync(). This path also runs when the switch is turned off from ANOTHER
     window (the store's live reconciler -> unmount), where nothing else removes
     the node. */
  const detach = () => {
    if (watermarkEl !== null && watermarkEl.parentNode) watermarkEl.parentNode.removeChild(watermarkEl)
    watermarkEl = null
    watermarkHost = null
  }
  /* Full run teardown. The hero era had a window resize listener here; with the
     follow loop gone there is no listener left to release. */
  const dispose = () => detach()
  return {
    KEY: WATERMARK_KEY,
    PERSIST_KEY: WATERMARK_PERSIST_KEY,
    STYLE_KEY: WATERMARK_STYLE_KEY,
    EMBLEM_KEY: WATERMARK_EMBLEM_KEY,
    isOn: isWatermarkOn,
    isPersistOn: isWatermarkPersistOn,
    isHatchOn: isWatermarkHatchOn,
    isEmblemZh: isWatermarkEmblemZh,
    sync: syncWatermarkVisibility,
    detach,
    dispose,
  }
}
