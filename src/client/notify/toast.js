/**
 * notify/toast.js — 终末地工业风通知 (the industrial toast cards).
 *
 * Extracted from the entry (see TODO.md「入口瘦身」). Three triggers, one
 * visual language: 任务完成 (turn end, from the SAME ConversationSnapshot.running
 * edge the toasts derive from — see notify/turn-watch.js) and 提问 / 索权 (the
 * attention watcher's question / approval / plan-review kinds — see
 * notify/attention.js). Sound is NOT re-implemented: the existing audio slots
 * already fire for exactly these moments (attention via the attention report,
 * turn end via the host's own listener), so a notification is the VISUAL half
 * of the same event and the audio switches keep owning the audible half.
 *
 * Lifetime rules differ by urgency, deliberately:
 *   done      auto-dismisses after DONE_MS — it is a receipt;
 *   attention STICKS until the interaction resolves (the watcher's
 *             kind -> null transition clears it) or the user dismisses it —
 *             these need a human decision, and a receipt-style fade could
 *             hide exactly the moment the user was being called for.
 *
 * The stack is plain DOM (same decision as the watermark): the panel's
 * mini-React owns settings, not page chrome, and a fixed-position stack has
 * no interaction with the app's layout.
 */
export function createToasts({ prefs, isEnabled }) {
  const NOTIFY_KEY = 'dsh-theme-endfield-notify'
  const NOTIFY_DONE_KEY = 'dsh-theme-endfield-notify-done'
  const NOTIFY_QUESTION_KEY = 'dsh-theme-endfield-notify-question'
  const NOTIFY_APPROVE_KEY = 'dsh-theme-endfield-notify-approve'
  // Master default ON: the module was requested as a feature, not as an
  // opt-in experiment. Sub-switches default ON and read independently.
  const isNotifyOn = () => prefs.get(NOTIFY_KEY) !== '0'
  const isNotifyDoneOn = () => prefs.get(NOTIFY_DONE_KEY) !== '0'
  const isNotifyQuestionOn = () => prefs.get(NOTIFY_QUESTION_KEY) !== '0'
  const isNotifyApproveOn = () => prefs.get(NOTIFY_APPROVE_KEY) !== '0'
  /** Does this attention kind have a notification switch flipped on? */
  const notifyWantsKind = (kind) => {
    if (kind === 'question') return isNotifyQuestionOn()
    // plan-review is an approval-family surface (same human decision).
    return isNotifyApproveOn()
  }
  const NOTIFY_DONE_MS = 6000
  let notifyStack = null
  const notifyTimers = new Map() // kind -> dismissal timeout (done only)
  /** Copy per kind. Hardcoded zh like the rest of the page chrome, not a
      settings string, and the theme's face is bilingual-unfriendly by design. */
  const notifyCopy = (kind) => ({
    done: { title: '任务完成', body: '回合已结束，可以继续。' },
    question: { title: '等待回答', body: '助手提出了一个需要你选择的问题。' },
    approval: { title: '需要授权', body: '一个操作正在等待你的批准。' },
    'plan-review': { title: '方案确认', body: '计划变更正在等待你的审阅。' },
  }[kind] || { title: '通知', body: '' })
  const notifyCard = (kind, title, body) => {
    const el = document.createElement('div')
    el.setAttribute('data-endfield-notify', kind)
    el.setAttribute('data-endfield-notify-kind', kind)
    // done is a receipt -> status; attention kinds call for a human -> alert.
    el.setAttribute('role', kind === 'done' ? 'status' : 'alert')
    const rail = document.createElement('span')
    rail.setAttribute('data-endfield-notify-rail', '')
    rail.setAttribute('aria-hidden', 'true')
    const main = document.createElement('div')
    main.setAttribute('data-endfield-notify-main', '')
    const head = document.createElement('span')
    head.setAttribute('data-endfield-notify-head', '')
    head.textContent = title
    const text = document.createElement('span')
    text.setAttribute('data-endfield-notify-body', '')
    text.textContent = body
    main.appendChild(head)
    main.appendChild(text)
    el.appendChild(rail)
    el.appendChild(main)
    // Sticky kinds carry their own dismissal; the receipt does not need one.
    if (kind !== 'done') {
      const close = document.createElement('button')
      close.setAttribute('data-endfield-notify-close', '')
      close.setAttribute('aria-label', '×')
      close.type = 'button'
      close.textContent = '×'
      close.addEventListener('click', () => dismissNotify(kind))
      el.appendChild(close)
    }
    return el
  }
  /** Idempotent stack host, created on first use and torn down with the run. */
  const notifyHost = () => {
    if (notifyStack !== null && notifyStack.isConnected) return notifyStack
    if (typeof document === 'undefined' || !document.body) return null
    if (notifyStack === null) notifyStack = document.createElement('div')
    notifyStack.setAttribute('data-endfield-notify-stack', '')
    // Newest on top: the stack is a column and toasts prepend, so the live
    // interaction is always the closest to the corner.
    document.body.appendChild(notifyStack)
    return notifyStack
  }
  /** Show (or replace) the toast for one kind. Self-guarded on every switch. */
  const showNotify = (kind) => {
    if (!isEnabled() || !isNotifyOn()) return
    if (kind === 'done' && !isNotifyDoneOn()) return
    if (kind !== 'done' && !notifyWantsKind(kind)) return
    if (typeof document === 'undefined' || !document.body) return
    const host = notifyHost()
    if (host === null) return
    dismissNotify(kind, true)
    const copy = notifyCopy(kind)
    const el = notifyCard(kind, copy.title, copy.body)
    host.insertBefore(el, host.firstChild)
    if (kind === 'done' && typeof setTimeout === 'function') {
      notifyTimers.set(kind, setTimeout(() => dismissNotify('done'), NOTIFY_DONE_MS))
    }
  }
  /** Remove the toast for a kind; `quiet` skips timer cleanup recursion. */
  const dismissNotify = (kind, quiet) => {
    if (!quiet && notifyTimers.has(kind)) {
      clearTimeout(notifyTimers.get(kind))
      notifyTimers.delete(kind)
    }
    if (notifyStack === null) return
    const el = notifyStack.querySelector('[data-endfield-notify-kind="' + kind + '"]')
    if (el !== null) el.remove()
  }
  /** Attention resolution clears every sticky kind (question answered,
      approval decided, panel replaced by another kind). */
  const notifyResolveAttention = () => {
    for (const kind of ['question', 'approval', 'plan-review']) dismissNotify(kind)
  }
  const destroyNotify = () => {
    for (const t of notifyTimers.values()) clearTimeout(t)
    notifyTimers.clear()
    if (notifyStack !== null && notifyStack.parentNode) notifyStack.parentNode.removeChild(notifyStack)
    notifyStack = null
  }
  return {
    KEY: NOTIFY_KEY,
    DONE_KEY: NOTIFY_DONE_KEY,
    QUESTION_KEY: NOTIFY_QUESTION_KEY,
    APPROVE_KEY: NOTIFY_APPROVE_KEY,
    isOn: isNotifyOn,
    isDoneOn: isNotifyDoneOn,
    isQuestionOn: isNotifyQuestionOn,
    isApproveOn: isNotifyApproveOn,
    show: showNotify,
    dismiss: dismissNotify,
    resolveAttention: notifyResolveAttention,
    destroy: destroyNotify,
  }
}
