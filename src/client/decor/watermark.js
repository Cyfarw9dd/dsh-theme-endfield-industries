/**
 * decor/watermark.js — the background ENDFIELD wordmark (settings-toggleable).
 *
 * Extracted from the entry (see TODO.md「入口瘦身」): this module owns the
 * mark's two switches, its two placements and its per-frame follow loop. The
 * entry injects the store (`prefs`), the master-switch reader (`isEnabled`)
 * and the app-frame finder (`findAppFrame`, a direct reference — the factory
 * is composed after that declaration, so no TDZ); everything else (keys,
 * readers, state, timers) lives here.
 *
 * Two independent switches:
 *   WATERMARK_KEY  — the watermark itself (default ON), shown on the hero page.
 *   WATERMARK_PERSIST_KEY — "keep showing it off the hero page" (default OFF),
 *     which also paints it on an active conversation / settings / any other page.
 * On the hero page the mark is centred on the headline. Off the hero page there
 * is no headline to follow, so it is centred in the conversation column instead
 * and mounted INSIDE that column rather than on <body>: a fixed body child
 * paints above the message text (it has no z-index competitor to lose to),
 * which would wash out what the user is reading. See mountPointFor().
 *
 * Both placements must stay strictly BEHIND the app's own chrome. That is a
 * z-index question in the hero case and it is genuinely subtle -- see the long
 * note on s.zIndex in styleWatermark(); it is locked down by
 * test/watermark-stacking.test.js, which compares real screenshots because a
 * pointer-events:none layer cannot be hit-tested.
 */
export function createWatermark({ prefs, isEnabled, findAppFrame }) {
  const WATERMARK_KEY = 'dsh-theme-endfield-watermark'
  const WATERMARK_PERSIST_KEY = 'dsh-theme-endfield-watermark-persist'
  const isWatermarkOn = () => prefs.get(WATERMARK_KEY) !== '0'
  // Default OFF: the hero-only behaviour stays the shipped default.
  const isWatermarkPersistOn = () => prefs.get(WATERMARK_PERSIST_KEY) === '1'
  /* Hash-free selectors only. DSH 0.1.2-rc.1 rebuilt its CSS modules and every
     hex hash changed (0/33 of the old pinned hashes survive), so anything of the
     form [class*='pXSMma_root'] dies silently on upgrade. The stable hooks are
     the semantic SUFFIX of the module class plus structural attributes:
     data-phase is rendered ONLY on ConversationRoot (settling|hero|active) and
     a status dot, and only ConversationRoot's class ends in '_root', so
     [class$='_root'][data-phase=…] names the conversation column exactly. */
  const isHeroVisible = () => {
    if (typeof document === 'undefined') return false
    const hero = document.querySelector('[class$="_root"][data-phase="hero"]')
    if (!hero) return false
    const r = hero.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }
  /** The visible conversation column — the persist-mode anchor and mount parent. */
  const findConversationRoot = () => {
    if (typeof document === 'undefined') return null
    const all = document.querySelectorAll('[class$="_root"][data-phase]')
    for (const el of all) {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) return el
    }
    return null
  }
  const findVisibleHeadline = () => {
    if (typeof document === 'undefined') return null
    const all = document.querySelectorAll('[class$="_headlineText"]')
    for (const h of all) {
      const r = h.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) return h
    }
    return null
  }
  let watermarkEl = null
  let watermarkRaf = null
  let watermarkHost = null
  /* Where the mark belongs for the current page, and how it must stack there:
       hero    -> <body>, above the (empty) hero backdrop, following the headline.
       persist -> inside the conversation column, BEHIND the message text.
     Returning the parent alongside the mode keeps the two decisions in one place,
     so remount happens exactly when either the parent or the stacking changes. */
  const mountPointFor = () => {
    if (isHeroVisible()) return { mode: 'hero', parent: document.body }
    const conv = findConversationRoot()
    if (conv !== null) return { mode: 'persist', parent: conv }
    // No conversation column on screen (e.g. a full-page settings view). A body
    // child at z-index:-1 paints BELOW the body/frame's own opaque backgrounds
    // there and never shows, so prefer the app FRAME: while the mark is mounted
    // in it the stylesheet gives the frame isolation:isolate (the same pair of
    // properties the conversation column gets above), so -1 stays above the
    // frame background and strictly below the page content. body is only the
    // last resort for a page that has no frame at all. findAppFrame arrives by
    // injection, and is only ever called from here at runtime, never during the
    // factory pass.
    const frame = findAppFrame()
    return { mode: 'persist', parent: frame !== null ? frame : document.body }
  }
  const positionWatermark = () => {
    if (!watermarkEl) return
    if (watermarkEl.getAttribute('data-endfield-watermark') === 'persist') {
      // Centred in its own positioned parent — no per-frame measurement needed.
      return
    }
    const headline = findVisibleHeadline()
    if (!headline) return
    const r = headline.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return
    const cy = r.top + r.height / 2
    const cx = r.left + r.width / 2
    const vw = (typeof window !== 'undefined' && window.innerWidth) || (typeof document !== 'undefined' ? document.documentElement.clientWidth : 0)
    // Half the logo box: 13vw wide (240px cap) x square aspect / 2 (see the
    // ::after sizing and the height calc in styleWatermark).
    const half = vw * 0.13 * 0.51
    const top = (cy - half) + 'px'
    const tx = 'translateX(' + (cx - vw / 2) + 'px)'
    // Only write when the value actually changed, so a stable layout costs nothing.
    if (watermarkEl.style.top !== top) watermarkEl.style.top = top
    if (watermarkEl.style.transform !== tx) watermarkEl.style.transform = tx
  }
  const watermarkRafLoop = () => {
    // Only the hero placement is measured per frame; persist mode is pure CSS, so
    // the loop must stop when the mode changes rather than spin for nothing.
    if (!watermarkEl || watermarkEl.getAttribute('data-endfield-watermark') !== 'hero') {
      watermarkRaf = null
      return
    }
    positionWatermark()
    watermarkRaf = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame(watermarkRafLoop) : null
  }
  const styleWatermark = (el, mode) => {
    const s = el.style
    s.display = 'flex'
    s.alignItems = 'center'
    s.justifyContent = 'center'
    s.pointerEvents = 'none'
    s.fontWeight = '900'
    s.letterSpacing = '0.1em'
    s.color = 'var(--dsw-alias-label-primary)'
    s.textTransform = 'uppercase'
    s.userSelect = 'none'
    /* Single-child mark: the official logo paints as the ::after mask. */
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
    /* Opacity now lives on the ::before (letters) and ::after (emblem) rules in
       the stylesheet instead of on the element, for the same themeability
       reason as before (CSS variables, scheme-dependent values, no repaint on
       flip) plus one new one: the official emblem mask is a soft blur that
       needs a slightly HIGHER alpha than the letters to read as part of the
       same mark, and one element-level opacity cannot express that. */
    if (mode === 'hero') {
      s.position = 'fixed'
      s.left = '0'
      s.right = '0'
      s.top = ''
      s.bottom = ''
      /* Logo-only box: 13vw wide (240px cap) x the square viewBox. */
      s.height = 'calc(min(13vw, 240px) * 1.02)'
      /* z-index 0, NOT 1 — this is the fix for the wordmark painting on top of
         the app's own popovers, and the cause was a z-index TIE:
           the hero composer wrapper ('*_composerHero') is position:relative +
           z-index:1, so it IS a stacking context and the model-select menu's
           z-index:20 is trapped inside it; that 20 never competes at body level.
         The mark used to be z-index:1 too — the same level as composerHero in
         the root stacking context — and ties are broken by DOM order. Appended
         to <body> last, the mark won every tie and painted over the whole
         composer subtree, dropdown included (measured: 12027 changed pixels
         inside the opaque menu box, matching 11002 px found in a real capture).
         At 0 it loses to composerHero (1), the tabs (1) and the composer seat
         (7), yet still paints ABOVE the app frame's own opaque bg-base: the
         frame is position:relative with z-index:auto, so it creates no stacking
         context, both boxes paint in the same step, and the mark is still the
         later sibling. Verified by test/watermark-stacking.test.js. */
      s.zIndex = '0'
      s.fontSize = '9.5vw'
      s.transform = ''
    } else {
      // Fill the conversation column and sit behind its content. z-index:-1 paints
      // below in-flow text but still above the column's own background, which is
      // why the column is given `isolation: isolate` in the stylesheet: without a
      // stacking context there, -1 would slide behind that background and vanish.
      s.position = 'absolute'
      s.left = '0'
      s.right = '0'
      s.top = '0'
      s.bottom = '0'
      s.height = ''
      s.zIndex = '-1'
      s.fontSize = '9.5vw'
      s.transform = ''
    }
  }
  const syncWatermarkVisibility = () => {
    /* Streaming fast path. A mounted persist-mode mark is still correctly
       placed while (a) the switches that could turn it off are unchanged,
       (b) no hero root exists in the document and (c) its host is still
       attached — all three decidable WITHOUT a single getBoundingClientRect.
       The observer fires on every body mutation batch, so during token
       streaming this used to run the full mountPointFor() below (several
       querySelector(All) + rect reads = one forced layout) per frame. Any
       check failing here falls through to the full decision, so every real
       transition — theme off, hero appearing, host detached, persist flipped
       off — is still caught on the same batch. */
    if (watermarkEl !== null && watermarkHost !== null && watermarkHost.isConnected
      && typeof document !== 'undefined'
      && watermarkEl.getAttribute('data-endfield-watermark') === 'persist'
      && isEnabled() && isWatermarkOn() && isWatermarkPersistOn()
      && document.querySelector('[class$="_root"][data-phase="hero"]') === null) return
    const on = isEnabled() && isWatermarkOn()
    const target = on ? mountPointFor() : null
    // Off the hero page the mark only survives when the persist switch is on.
    // parent can be null during very early boot (no <body> yet) — never mount.
    const shouldShow = target !== null && target.parent !== null
      && (target.mode === 'hero' || isWatermarkPersistOn())
    if (shouldShow && watermarkEl) {
      // A page change can flip the mode or move the parent — restyle/reparent in place.
      if (watermarkEl.getAttribute('data-endfield-watermark') !== target.mode) {
        watermarkEl.setAttribute('data-endfield-watermark', target.mode)
        styleWatermark(watermarkEl, target.mode)
      }
      if (watermarkHost !== target.parent) {
        target.parent.appendChild(watermarkEl)
        watermarkHost = target.parent
      }
    } else if (shouldShow && !watermarkEl) {
      const el = document.createElement('div')
      el.setAttribute('data-endfield-watermark', target.mode)
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
      styleWatermark(el, target.mode)
      target.parent.appendChild(el)
      watermarkEl = el
      watermarkHost = target.parent
    } else if (!shouldShow && watermarkEl) {
      if (watermarkEl.parentNode) watermarkEl.parentNode.removeChild(watermarkEl)
      watermarkEl = null
      watermarkHost = null
    }
    // While visible, follow the headline every frame (page switches, sidebar
    // width changes, animations) — no reliance on observer timing. The persist
    // placement is pure CSS, so it needs no frame loop.
    const needsLoop = watermarkEl !== null && watermarkEl.getAttribute('data-endfield-watermark') === 'hero'
    if (needsLoop && !watermarkRaf && typeof requestAnimationFrame === 'function') {
      watermarkRaf = requestAnimationFrame(watermarkRafLoop)
    } else if (!needsLoop && watermarkRaf !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(watermarkRaf)
      watermarkRaf = null
    }
  }
  const onWatermarkResize = () => { if (watermarkEl) positionWatermark() }
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('resize', onWatermarkResize)
  }
  /* The master-switch-off path (entry unmount()) and the run teardown share
     this: with the sheet torn down the mark's `opacity: var(--edge-wm-alpha)`
     computes invalid and falls back to 1, so an orphaned mark would sit on the
     page as a fully opaque logo stamp — it must go NOW, not on the next
     sync(). This path also runs when the switch is turned off from ANOTHER
     window (the store's live reconciler -> unmount), where nothing else removes
     the node. */
  const detach = () => {
    if (watermarkRaf !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(watermarkRaf)
    watermarkRaf = null
    if (watermarkEl !== null && watermarkEl.parentNode) watermarkEl.parentNode.removeChild(watermarkEl)
    watermarkEl = null
    watermarkHost = null
  }
  /* Full run teardown: everything detach() drops, plus the resize listener
     this factory installed. */
  const dispose = () => {
    detach()
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('resize', onWatermarkResize)
    }
  }
  return {
    KEY: WATERMARK_KEY,
    PERSIST_KEY: WATERMARK_PERSIST_KEY,
    isOn: isWatermarkOn,
    isPersistOn: isWatermarkPersistOn,
    sync: syncWatermarkVisibility,
    detach,
    dispose,
  }
}
