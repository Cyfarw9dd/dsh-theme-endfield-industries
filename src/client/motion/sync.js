/**
 * motion/sync.js — the <body> attribute/class sync layer and its DOM predicates.
 *
 * Extracted from the entry (see TODO.md「入口瘦身」第 3 项): every prefs-driven
 * <body> surface lives here — radius class, motion attribute, glass/texture
 * attributes — plus the DOM predicates the entry's surfaces
 * read (scheme / reduced-motion / app-frame). The entry injects `prefs` and the
 * master-switch reader `isEnabled`; nothing here touches a closure of apply().
 *
 * The entry calls syncAll() at every reconcile point (mount, the live
 * preference reconciler) and detach() on unmount; the per-surface syncs are
 * exposed for the settings panel's write-through paths.
 */
export function createMotionSync({ prefs, isEnabled }) {
  const RADIUS_KEY = 'dsh-theme-endfield-radius'
  const MOTION_KEY = 'dsh-theme-endfield-motion'
  /* 按钮动效自 2026-10 起是**一套合并设计**（信号母题 × 新会话/审批/表格行 +
     角标母题 × 侧边栏会话行，详见样式表动效区），不再是六选一的方案下拉。
     存储字面量只剩两个：
       'signal' = 开（沿用历史字面量，默认值与旧存量都不用迁移）；
       'off'    = 关。
     读取时把一切旧方案名（silent/impact/clamp/meter/stamp）都并轨为「开」——
     曾经明确选过关闭的用户保持关闭，其余用户直接进入合并设计。 */
  const readMotion = () => (prefs.get(MOTION_KEY) === 'off' ? 'off' : 'signal')
  const syncMotion = () => {
    if (typeof document === 'undefined' || document.body === null) return
    if (isEnabled() && readMotion() !== 'off') document.body.setAttribute?.('data-endfield-motion', 'signal')
    else document.body.removeAttribute?.('data-endfield-motion')
  }
  /* 工业底纹. Same three-literal shape as glass; carried on <body> as
     data-endfield-texture, and REMOVED entirely for 'off' (the runtime behaviour
     the other switches share). The official /operator backgrounds are the
     'standard' tier, so that is the shipped default. */
  const TEXTURE_KEY = 'dsh-theme-endfield-texture'
  const TEXTURE_OPTIONS = ['off', 'subtle', 'standard']
  const readTexture = () => {
    const value = prefs.get(TEXTURE_KEY)
    return TEXTURE_OPTIONS.includes(value) ? value : 'standard'
  }
  const syncTexture = () => {
    if (typeof document === 'undefined' || document.body === null) return
    const value = readTexture()
    if (isEnabled() && value !== 'off') document.body.setAttribute?.('data-endfield-texture', value)
    else document.body.removeAttribute?.('data-endfield-texture')
  }
  const GLASS_KEY = 'dsh-theme-endfield-glass'
  const GLASS_OPTIONS = ['off', 'subtle', 'standard', 'strong']
  const readGlass = () => {
    const value = prefs.get(GLASS_KEY)
    return GLASS_OPTIONS.includes(value) ? value : 'off'
  }
  const syncGlass = () => {
    if (typeof document === 'undefined' || document.body === null) return
    const value = readGlass()
    if (isEnabled() && value !== 'off') document.body.setAttribute?.('data-endfield-glass', value)
    else document.body.removeAttribute?.('data-endfield-glass')
  }
  const syncRadiusMode = () => {
    // The bundle can run before <body> exists (see the loader's DOMContentLoaded
    // deferral for the same window); a classList touch on null would throw and
    // kill the whole install.
    if (typeof document === 'undefined' || document.body === null) return
    const mode = prefs.get(RADIUS_KEY) || 'square'
    if (mode === 'round') document.body.classList.add('theme-endfield-round')
    else document.body.classList.remove('theme-endfield-round')
  }

  /* ---------- scheme + motion + frame predicates ------------------------------
     These three used to live inside the contour engine; the feature is gone
     but the watermark and loader code still read them (findAppFrame survives as
     the watermark's third-placement locator; the scheme/reduced-motion
     predicates stay for the surfaces that will read them again). */
  const isDarkScheme = () => typeof document !== 'undefined'
    && document.body
    && document.body.hasAttribute('data-ds-dark-theme')

  /* Someone who asked the OS for less motion gets the pattern without the motion.
     The boot plate honours this; checked live
     rather than cached so changing the OS setting takes effect on the next
     reconciliation. */
  const prefersReducedMotion = () => typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const findAppFrame = () => {
    if (typeof document === 'undefined') return null
    const col = document.querySelector('[class$="_centerCol"], [class*="_centerCol "]')
    const frame = col !== null ? col.parentElement : null
    if (frame === null) return null
    const r = frame.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return null
    return frame
  }

  /** Every body surface, in the order the mount block always used. The entry's
      reconcile points (mount + the live preference reconciler) call exactly
      this, so a new surface only has to be added here. */
  const syncAll = () => {
    syncRadiusMode()
    syncMotion()
    syncGlass()
    syncTexture()
  }
  /* The unmount-side counterpart of syncAll: the classes/attributes that only
     mean something under this theme's stylesheet must leave WITH that sheet.
     Note the original contract kept data-endfield-motion / data-endfield-texture
     on the body after unmount (their rules are gone with the sheet, so they are
     inert); detach() reproduces that exactly rather than "cleaning up more". */
  const detach = () => {
    // Guarded like every other body touch: an unload race must not throw here.
    if (typeof document === 'undefined' || document.body === null) return
    document.body.classList.remove('theme-endfield-round')
    document.body.removeAttribute?.('data-endfield-glass')
  }
  return {
    RADIUS_KEY,
    MOTION_KEY,
    TEXTURE_KEY,
    GLASS_KEY,
    TEXTURE_OPTIONS,
    GLASS_OPTIONS,
    readMotion,
    readTexture,
    readGlass,
    isDarkScheme,
    prefersReducedMotion,
    findAppFrame,
    syncRadiusMode,
    syncMotion,
    syncGlass,
    syncTexture,
    syncAll,
    detach,
  }
}
