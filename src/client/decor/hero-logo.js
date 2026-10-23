/**
 * decor/hero-logo.js — the new-session hero brand mark.
 *
 * Extracted from the entry (see TODO.md「入口瘦身」): this module owns the mark
 * and its anchor hunt; the entry injects only the master-switch reader
 * (`isEnabled`). Re-attachment is driven from the shared body observer
 * (decor/body-observer.js) and the preference reconciler, exactly as before.
 *
 * The summer-series 「终末地标识 3」 mark sits ABOVE the hero headline. This is
 * plain DOM created here and inserted into the app's own centred column — the
 * same decision as the watermark — so the mark takes part in that layout
 * instead of being pinned to coordinates a font or locale change invalidates.
 *
 * The anchor is found by the stable SUFFIX of the app's CSS-module class, never
 * a hash (0.1.2-rc.1 rotated every hash): 0.2.0-rc.2 names the headline ROW
 * '*_headline' (fish + title group), 0.1.x named the text node
 * '*_headlineText'. The row is preferred because inserting before it puts the
 * mark above the whole line rather than beside it. When neither exists — a
 * future rename — the mark simply does not appear, and nothing else breaks.
 */
export function createHeroLogo({ isEnabled }) {
  let heroLogoEl = null
  const findHeroLogoAnchor = () => {
    if (typeof document === 'undefined') return null
    const hero = document.querySelector('[class$="_root"][data-phase="hero"]')
    if (hero === null) return null
    const row = hero.querySelector('[class$="_headline"]')
    const anchor = row !== null ? row : hero.querySelector('[class$="_headlineText"]')
    if (anchor === null || anchor.parentElement === null) return null
    const r = anchor.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return null
    return anchor
  }
  /* Idempotent: created once, then only re-parented. React owns the sibling list
     of the column it lives in and is free to drop a foreign node on a re-render,
     so this is re-run from the same body observer the watermark uses — one
     observer, two layers — and from the preference reconciler. */
  const syncHeroLogo = () => {
    const anchor = isEnabled() ? findHeroLogoAnchor() : null
    if (anchor === null) {
      if (heroLogoEl !== null && heroLogoEl.parentNode !== null) heroLogoEl.parentNode.removeChild(heroLogoEl)
      return
    }
    if (heroLogoEl === null) {
      heroLogoEl = document.createElement('div')
      heroLogoEl.setAttribute('data-endfield-hero-logo', '')
      /* Decorative, and nothing a page translator may rewrite: the mark is two
         CSS mask layers, so there is no text node to walk. */
      heroLogoEl.setAttribute('aria-hidden', 'true')
      heroLogoEl.setAttribute('translate', 'no')
      heroLogoEl.className = 'notranslate'
    }
    if (heroLogoEl.parentNode !== anchor.parentElement || heroLogoEl.nextSibling !== anchor) {
      anchor.parentElement.insertBefore(heroLogoEl, anchor)
    }
  }
  /* The mark is styled by the theme stylesheet: unmount() and the run teardown
     both drop it with the sheet, or an orphan would sit as an unstyled box. */
  const detach = () => {
    if (heroLogoEl !== null && heroLogoEl.parentNode !== null) heroLogoEl.parentNode.removeChild(heroLogoEl)
    heroLogoEl = null
  }
  return {
    sync: syncHeroLogo,
    detach,
  }
}
