/**
 * notify/attention.js — 需要你回应: the UI observer and its watcher.
 *
 * Extracted from the entry (see TODO.md「入口瘦身」), in two halves that were
 * two entry sections before:
 *
 *   · the OBSERVER — WHICH semantic anchors name "a human must act" on screen
 *     (ATTENTION_MARKERS / detectPendingInteraction);
 *   · the WATCHER — WHEN a report happens: edge-triggered on a
 *     MutationObserver with a slow poll as the backstop, feeding both the
 *     audio chime (through the host report route) and the visual toast.
 *
 * WHY THIS EXISTS. The host-side seams that would normally carry this moment
 * (`approval/request`, `user-questions/request`, raised by dsh-user-approval
 * and dsh-tool-ask-user) do not fire in every deployment. Measured: with
 * the theme plugin mounted, a question was on screen and ANSWERED while the
 * host half's counter stayed at 0 — because `ask_user_question` in this
 * composition is provided outside the profile's plugin stack, so
 * `dsh-tool-ask-user` never runs and the waterfall is never raised.
 *
 * The UI is therefore the only place where "a human must act" is always real.
 * The host still owns the sound (switch, volume, debounce) — the page only
 * reports that a confirmation box appeared. The host-side listeners stay in
 * place for compositions where they DO fire; both paths end at the same slot
 * and the host's debounce collapses a double report into one sound.
 *
 * ANCHORS: only the per-panel DATA ATTRIBUTES, never a class name.
 *
 * A class-based first attempt was tried and it mis-fired in the field:
 * `[class*='_card']` matches 15 different components across the installed
 * client packages (model selector, agent-preset picker, …) and
 * `[class*='_frame']` matches 8, so opening any such card rang the attention
 * sound while no confirmation box was on screen. What the panels actually
 * expose, verified against the installed packages, is one stable attribute
 * each:
 *   approval panel    <div data-approval-key="…">
 *   plan review panel <div data-plan-review-key="…">
 *   question dialog   <div data-question-key="…">
 *
 * A marker that disappears in a future UI release silences this feature
 * without breaking anything — hence the counter in the settings page, which
 * is the only way to notice that the anchors stopped matching.
 *
 * The WATCHER half is a coarse poll rather than a MutationObserver alone. The
 * reason is the failure mode rather than the cost: an observer watching a
 * container that the app later replaces (or an anchor that renders before
 * `document.body` exists) stops delivering and cannot tell anyone, while a
 * poll that asks "is a confirmation box on screen?" keeps working through any
 * re-render, and its only symptom is up to `POLL_MS` of latency —
 * imperceptible for a chime. The edge is "a box is on screen after a moment
 * where none was". A box that stays open does not re-report, so a forgotten
 * dialog cannot beep forever; and a re-render that briefly drops the node and
 * puts it back would re-report, so the poll is deliberately slower than a
 * React remount. Whatever still slips through lands on the host's per-slot
 * debounce, which is the backstop for every path. The observer cuts the
 * first-notice latency to roughly one animation frame; the poll stays because
 * an observer bound to a container the app later replaces would stop
 * delivering silently, and a poll cannot. Its period is deliberately longer
 * than a React remount, so a re-render that briefly drops and re-adds the node
 * cannot register as two separate boxes.
 */
export function createAttentionWatch({ isEnabled, audio, toasts }) {
  const ATTENTION_URL = '/theme-endfield/audio/attention'
  const ATTENTION_MARKERS = [
    { kind: 'approval', selector: '[data-approval-key]' },
    { kind: 'plan-review', selector: '[data-plan-review-key]' },
    { kind: 'question', selector: '[data-question-key]' },
  ];
  const POLL_MS = 1000
  /** Which kind of pending interaction is on screen right now, if any. */
  const detectPendingInteraction = () => {
    if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return null
    for (const marker of ATTENTION_MARKERS) {
      try {
        if (document.querySelector(marker.selector) !== null) return marker.kind
      } catch (e) { /* malformed selector: treat as absent */ }
    }
    return null
  }
  /** Tell the host a confirmation box appeared; it decides whether to sound. */
  const reportAttention = (kind) => {
    if (typeof fetch !== 'function') return Promise.resolve({ played: false, why: 'no fetch' })
    return fetch(ATTENTION_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind }),
    }).then(
      (res) => res.json().catch(() => ({ played: false, why: 'bad response' })),
      (error) => ({ played: false, why: String(error && error.message ? error.message : error) }),
    )
  }
  /* The app mutates the DOM continuously while a turn streams, so a mutation
     cannot run the query on its own frame: it only schedules one. Coalescing on
     the next frame keeps the check off the render path and collapses a burst of
     mutations into a single look. */
  let audioAttentionTimer = null
  let audioAttentionObserver = null
  let audioAttentionFrame = null
  let audioAttentionKind = null
  const audioAttentionTick = () => {
    try {
      const kind = detectPendingInteraction()
      if (kind === null) {
        // Resolution clears every sticky notification: the question was
        // answered / the approval decided, so the card has no reason to stay.
        if (audioAttentionKind !== null) toasts.resolveAttention()
        audioAttentionKind = null
        return
      }
      if (kind === audioAttentionKind) return
      audioAttentionKind = kind
      // Visual half of the same event (self-guarded on the notify switches).
      toasts.show(kind)
      if (!audio.isOn()) return
      reportAttention(kind)
    } catch (e) { /* never let the watcher break the page */ }
  }
  /** Collapse a burst of mutations into one look on the next frame. */
  const audioAttentionSchedule = () => {
    if (audioAttentionFrame !== null) return
    if (typeof requestAnimationFrame !== 'function') {
      audioAttentionTick()
      return
    }
    audioAttentionFrame = requestAnimationFrame(() => {
      audioAttentionFrame = null
      audioAttentionTick()
    })
  }
  const stopAudioAttentionWatch = () => {
    if (audioAttentionTimer !== null && typeof clearInterval === 'function') clearInterval(audioAttentionTimer)
    audioAttentionTimer = null
    if (audioAttentionObserver !== null) {
      try { audioAttentionObserver.disconnect() } catch (e) { /* already gone */ }
      audioAttentionObserver = null
    }
    if (audioAttentionFrame !== null) {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(audioAttentionFrame)
      audioAttentionFrame = null
    }
    audioAttentionKind = null
  }
  const syncAudioAttentionWatch = () => {
    /* The watch now serves TWO consumers: the audio chime and the visual
       notification, so it must run when EITHER is switched on. The notify
       master alone is not enough — all three kind switches could be off. */
    const notifyWantsWatch = toasts.isOn() && (toasts.isQuestionOn() || toasts.isApproveOn())
    const wanted = isEnabled() && (audio.isOn() || notifyWantsWatch)
    if (wanted && audioAttentionTimer === null && typeof setInterval === 'function') {
      audioAttentionKind = null
      audioAttentionTimer = setInterval(audioAttentionTick, POLL_MS)
      if (typeof MutationObserver === 'function' && typeof document !== 'undefined' && document.body) {
        audioAttentionObserver = new MutationObserver(audioAttentionSchedule)
        try {
          audioAttentionObserver.observe(document.body, { childList: true, subtree: true })
        } catch (e) {
          audioAttentionObserver = null
        }
      }
      audioAttentionTick()
    } else if (!wanted && audioAttentionTimer !== null) {
      stopAudioAttentionWatch()
    }
  }
  return {
    MARKERS: ATTENTION_MARKERS,
    sync: syncAudioAttentionWatch,
    stop: stopAudioAttentionWatch,
    /* Exposed for tests: drive the mutation path (the observer's own callback
       in a browser) without a real MutationObserver. */
    tick: audioAttentionTick,
    schedule: audioAttentionSchedule,
  }
}
