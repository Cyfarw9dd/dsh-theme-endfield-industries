/**
 * decor/body-observer.js — the ONE body MutationObserver the decor layers share.
 *
 * Extracted from the entry (see TODO.md「入口瘦身」): the watermark and the hero
 * mark used to install one observer between them, and that sharing is the point
 * — one observer, two layers. Subscribers run in registration order on every
 * body mutation batch; the owner of each layer decides what a batch means.
 *
 * The bundle can be evaluated before <body> exists (the same window runLoader
 * defends with a DOMContentLoaded deferral). The old code created the observer
 * only when body was already there and never retried, so an early-boot apply
 * left the watermark without its (re)attach channel for good. Deferred install
 * instead, and right after installing, catch up on everything the observer
 * missed while it did not exist yet.
 */
export function createBodyObserver() {
  let observer = null
  const subscribers = []
  const run = () => { for (const fn of subscribers) fn() }
  const install = () => {
    if (observer !== null) return
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined' || document.body === null) return
    observer = new MutationObserver(run)
    observer.observe(document.body, { childList: true, subtree: true })
  }
  const late = () => {
    install()
    if (observer === null) return
    run()
  }
  const start = () => {
    if (typeof document !== 'undefined' && document.body !== null) install()
    else if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('DOMContentLoaded', late, { once: true })
    }
  }
  /* Run teardown: disconnect the observer, and drop a deferred install that may
     still be waiting on DOMContentLoaded so a disposed run is not wired back
     into the page. removeEventListener is a no-op when it never fired or
     already ran ({ once }), so both branches are safe. */
  const dispose = () => {
    if (observer) observer.disconnect()
    if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
      document.removeEventListener('DOMContentLoaded', late)
    }
  }
  return {
    add: (fn) => { subscribers.push(fn) },
    start,
    dispose,
  }
}
