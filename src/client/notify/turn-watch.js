/**
 * notify/turn-watch.js — 回合边沿 → 任务完成回执.
 *
 * Extracted from the entry (see TODO.md「入口瘦身」). The 任务完成 receipt's
 * trigger is the authoritative ConversationSnapshot.running bit, NOT the DOM:
 * one subscription on the session face, and the first readable value is a
 * baseline so enabling mid-turn stays silent. Started and stopped from the
 * same reconcile points as the other features (mount, master switch,
 * teardown); the notification module self-guards its own switch.
 *
 * Late-bound on purpose: the sessions service may arrive after apply() (the
 * runtime provides it asynchronously and this theme declares no `inject`), so
 * a one-shot const would capture undefined for the whole session and the
 * receipt would be permanently dead depending on load order.
 */
export function createTurnWatch({ services, debug: dbg, isEnabled, isDoneOn, showToast }) {
  const getSessions = () => services.sessions()
  let turnUnsubList = null
  let turnUnsubSession = null
  let turnRetryTimer = null
  /* Retry budget for turnRebind, bounded like every other retry in this
     module family (rebindPrefs 40, settle watch 20): a permanently absent
     sessions service must not leave a 120 ms poll running for the life of the
     page. A settings change re-runs sync -> turnRebind, which restarts the
     budget. */
  let turnRetryAttempts = 0
  let turnWatchedId = null
  // null = nothing readable observed yet, so the next value is a baseline.
  let turnLastRunning = null
  /** The running bit of one session face, or null when it cannot be read. */
  const turnReadRunning = (face) => {
    try {
      const snap = face.getSnapshot()
      if (snap === null || typeof snap !== 'object') return null
      return snap.running === true
    } catch (e) {
      return null
    }
  }
  const turnDetach = () => {
    if (turnUnsubSession !== null) {
      try { turnUnsubSession() } catch (e) { /* already torn down */ }
      turnUnsubSession = null
    }
    turnWatchedId = null
    turnLastRunning = null
  }
  /** Subscribe to selection changes once; idempotent. */
  const turnSubscribeList = (sessions) => {
    if (turnUnsubList !== null) return
    let unsub = null
    try { unsub = sessions.list.subscribe(() => { turnRebind() }) } catch (e) { unsub = null }
    turnUnsubList = (typeof unsub === 'function') ? unsub : null
  }
  /* Follow the CURRENT session. `sessions.list` publishes the selection, and the
     runtime's own list subscriber (registered at construction, so it runs first)
     stages the session that makes binding() resolve. A miss here is therefore
     ordinary timing rather than an error, so it retries on a short timer instead
     of giving up — that single deferred retry is also what covers the very first
     reconcile during boot, before any session is staged. */
  const turnRebind = () => {
    const sessions = getSessions()
    if (turnRetryTimer !== null && typeof clearTimeout === 'function') clearTimeout(turnRetryTimer)
    turnRetryTimer = null
    /* Service not there yet: keep retrying rather than giving up for good, since
       the only reason to be here is that the feature is switched on — but only
       within the budget above. */
    if (sessions === undefined) {
      if (turnRetryAttempts >= 100) {
        dbg('turn rebind gave up: no sessions service after', turnRetryAttempts, 'tries')
        return
      }
      turnRetryAttempts += 1
      if (typeof setTimeout === 'function') turnRetryTimer = setTimeout(turnRebind, 120)
      return
    }
    // The list subscription may have been skipped earlier (no service then), so
    // attach it as soon as one exists.
    turnSubscribeList(sessions)
    let id
    try {
      const snap = sessions.list.getSnapshot()
      id = (snap === null || typeof snap !== 'object') ? undefined : snap.current
    } catch (e) {
      return
    }
    if (id === undefined || id === null) {
      turnDetach()
      return
    }
    /* Already watching this one: skip the detach/resubscribe churn. `sessions.list`
       publishes for every unrelated reason (a title change, a job row, a sidebar
       refresh), and rebinding on each one would tear down and re-add the same
       subscription constantly.

       Deliberately NOT claimed as an edge-correctness guard: the reseed would be
       synchronous, so `running` cannot change inside the gap and the baseline
       would land on the value it already held. Verified by removing this line —
       the edge assertions still pass. It is a cost guard, and it is honest about
       being one. */
    if (id === turnWatchedId && turnUnsubSession !== null) return
    turnDetach()
    let face = null
    try {
      const binding = sessions.binding(id)
      if (binding !== undefined && binding !== null) face = binding.session
    } catch (e) {
      face = null
    }
    if (face === null || typeof face.subscribe !== 'function' || typeof face.getSnapshot !== 'function') {
      if (turnRetryAttempts >= 100) {
        dbg('turn rebind gave up: session face never became bindable for', id)
        return
      }
      turnRetryAttempts += 1
      if (typeof setTimeout === 'function') turnRetryTimer = setTimeout(turnRebind, 120)
      return
    }
    turnRetryAttempts = 0
    turnWatchedId = id
    turnLastRunning = turnReadRunning(face)
    let unsub = null
    try {
      unsub = face.subscribe(() => {
        const next = turnReadRunning(face)
        if (next === null || next === turnLastRunning) return
        const prev = turnLastRunning
        turnLastRunning = next
        // First readable value is the baseline, not an edge — see the note above.
        if (prev === null) return
        // Falling edge is also the notification module's 任务完成 trigger:
        // the SAME authoritative bit, one subscription, two consumers.
        if (!next) showToast('done')
      })
    } catch (e) {
      unsub = null
    }
    turnUnsubSession = (typeof unsub === 'function') ? unsub : null
    if (turnUnsubSession === null) turnWatchedId = null
  }
  const turnStopWatch = () => {
    if (turnRetryTimer !== null && typeof clearTimeout === 'function') clearTimeout(turnRetryTimer)
    turnRetryTimer = null
    turnRetryAttempts = 0
    if (turnUnsubList !== null) {
      try { turnUnsubList() } catch (e) { /* already torn down */ }
      turnUnsubList = null
    }
    turnDetach()
  }
  /* Switched off costs nothing: no subscription, no timer — an off switch must
     not leave a listener behind that wakes on every streamed token just to
     return early. Only the notification module consumes this now, and it
     self-guards its own switch, so being switched on is the whole condition. */
  const syncTurnWatch = () => {
    if (!(isEnabled() && isDoneOn())) {
      turnStopWatch()
      return
    }
    // turnRebind() resolves the service itself and re-arms its own retry, so
    // there is nothing to check here — being switched on is the whole condition.
    turnRebind()
  }
  return {
    sync: syncTurnWatch,
    stop: turnStopWatch,
  }
}
