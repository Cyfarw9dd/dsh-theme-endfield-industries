/**
 * prefs/transport.js — the durable-preference transport: which settings entry
 * spelling this install is bound to, when to re-select it, and the bounded
 * safety nets for a host that answers late.
 *
 * WHY IT IS SEPARATE. The >=0.2.0 floor made the settings domain's shared-form
 * service (services.configForms(), src/client/services.js) the only durable
 * seam, and the awkward half of using it is discovery: a ConfigForm is a lazy
 * view over a shared mirror keyed by the PROFILE ENTRY ID, which the patch
 * layer assigns. This package ships `id: theme-endfield`, but a hand-written
 * insert may use the package name and the loader tree path prefixes groups
 * with `include:`, so the module probes the candidate spellings, prefers the
 * one the Host actually SERVES, and self-heals when the right one is served
 * later. Everything here is about WHEN the section can be read — never about
 * what the values mean (that is prefs/store.js).
 *
 * THREE SAFETY NETS, each for a different real failure:
 *   rebind retry (40 x 250ms)  the settings service itself settles after
 *                              apply() — DSH mounts plugin rows concurrently.
 *   settle watch (20 x 500ms)  a bound form whose mirror never emitted the
 *                              ready transition (bounded replacement for the
 *                              pre-0.1.7 250ms binder poll).
 *   boot report (one line)     explains an unhealthy outcome once, instead of
 *                              leaving "the switches reset on reload" to
 *                              guesswork: boundNs / status / mode / writable /
 *                              valueKeys / settled / dirty / panelMounted /
 *                              hostServes / candidates.
 *
 * DEPENDENCIES ARE INJECTED: { services, debug, store }. The store is driven
 * through its documented protocol (adopt / flush / migrate / notify /
 * markSettled / needsSettlePass / pendingFields / settled / panelMounted);
 * this module installs the reverse port with store.bindTransport() and the
 * entry only composes the two.
 */
import { PREFS_ENTRY, PREFS_NS } from './keys.js'

export function createPrefsTransport({ services, debug: dbg, store }) {
  /* The bound settings transport: a DSH `ConfigForm` answering
     getSnapshot()/subscribe()/set(), which is all the store below needs;
     `prefsScopeKind` records what it is (for diagnostics and the
     write-settlement contract). The pre-0.1.7 `settingsScope` seam was
     dropped with the >=0.2.0 floor: pages without `configForms` (an
     out-of-DSH page, in-process tests) run on memory defaults. */
  let prefsScope = null
  let prefsScopeKind = null // 'configForms' | null (memory has no scope)
  let prefsScopeNs = null // the namespace / profile entry id the scope came from
  let prefsUnsubscribe = null // disposer of the active scope subscription, if any
  let prefsBindTimer = null // retry handle for a settings transport that arrives late
  let prefsSettleTimer = null // bounded settle watch for a transport bound before it was ready

  /* --- transport selection ------------------------------------------------
     The durable-preference seam is the settings domain's shared-form service
     (>=0.2.0 floor; the pre-0.1.7 `settingsScope` binder was dropped — a
     host without configForms is not a supported configuration):

        cfg = services.configForms()   (the settings domain's
        shared-form service; see src/client/services.js)
        cfg.get(<profile entry id>) -> ConfigForm with
        getSnapshot() / subscribe() / set() / unset() / mutate()
        and a snapshot of { status, value, base, user, revision,
        writable, mode }. set() returns Promise<boolean>: false
        means the Host refused or SKIPPED the write (the classic
        case being memory mode on a non-loopback page).
        0.2.1-rc.2 keeps this seam but DELETED `mode` (and
        `persistence`): the snapshot is { status, value, base,
        user, revision, writable } and every accepted set() is a
        remote.settings.mutate() against the Host document —
        treat a missing mode as durable (see the durable write
        gate below); only an explicit mode:'memory' (0.1.7-0.2.0
        on a non-loopback page) refuses.

      A ConfigForm is keyed by the PROFILE ENTRY ID, which the patch layer
      assigns: this package's own bundle patch inserts `theme-endfield`, but a
      hand-written insert may use the package name and the loader's tree path
      prefixes include groups with `include:`. PREFS_ENTRY_CANDIDATES lists the
      spellings this package can be installed under, in likelihood order.
      Acquisition prefers whichever candidate the Host actually SERVES and
      otherwise binds the first one immediately: a form is only a lazy view over
      the shared mirror, so binding early is what lets a slow boot deliver its
      section late instead of losing that page load's settings entirely. A wrong
      guess self-heals — while the bound form reports 'unavailable' and the
      mirror reloads, prefsOnScopeChange moves the binding to whichever
      candidate is served. */
  const PREFS_ENTRY_CANDIDATES = [
    PREFS_ENTRY,                   // this package's cordis.patch.yml row id
    'include:' + PREFS_ENTRY,      // loader tree path when bundle-mounted
    PREFS_NS,                      // a row inserted under the old namespace name
    'include:' + PREFS_NS,
  ]
  /* The 0.1.7 shared-form service, or undefined on a host that has none. Both
     access forms are tried: the injected-property spelling DSH's own client
     plugins use, then the optional-lookup form this module has always used. */
  const getConfigForms = () => {
    return services.configForms()
  }
  /* The namespaces the Host's describe view actually SERVES, for diagnostics.
     This is the one fact that tells "the host half exported no Config" apart
     from "the client bound an entry spelling this install does not use": both
     leave the bound form unserved, and only the served list says which one
     happened. Returns null while the mirror has not answered yet. */
  const prefsServedNamespaces = () => {
    try {
      const forms = getConfigForms()
      if (forms === undefined || typeof forms.describe !== 'function') return null
      const mirrored = forms.describe().getSnapshot()
      const view = mirrored && mirrored.view
      if (!view || !Array.isArray(view.namespaces)) return null
      return view.namespaces.map((row) => row && row.ns)
    } catch (e) { return null }
  }
  /* Snapshot of any transport object, or null when it cannot be read. */
  const prefsSnapshotOf = (scope) => {
    if (!scope || typeof scope.getSnapshot !== 'function') return null
    try { return scope.getSnapshot() } catch (e) { return null }
  }
  /* The first CANDIDATE spelling the Host actually serves (status 'ready'),
     or null. Kept separate from acquisition because it is also the re-check a
     bound-but-unserved form runs when the mirror reloads. */
  const prefsFindReadyForm = () => {
    const forms = getConfigForms()
    if (forms === undefined) return null
    for (const ns of PREFS_ENTRY_CANDIDATES) {
      let form = null
      try { form = forms.get(ns) } catch (e) { form = null }
      if (!form || typeof form.getSnapshot !== 'function') continue
      const snap = prefsSnapshotOf(form)
      if (snap !== null && snap.status === 'ready') return { scope: form, kind: 'configForms', ns }
    }
    return null
  }
  /* Acquire the transport for this page.
     A SERVED candidate wins outright. Otherwise the FIRST candidate is bound
     anyway, even while the mirror is still 'loading' or reports it
     'unavailable': a ConfigForm always exists (it is a lazy view over the
     shared mirror), and binding it immediately is what lets a slow or
     later-served Host still deliver its section through the subscription.
     A wrong guess is not fatal: prefsOnScopeChange re-selects as soon as
     another candidate is served. No transport at all (a page without the
     configForms service) returns null: the store runs on memory defaults.
     The pre-0.1.7 settingsScope binder is gone with the >=0.2.0 floor. */
  const acquirePrefsScope = () => {
    const ready = prefsFindReadyForm()
    if (ready !== null) return ready
    const forms = getConfigForms()
    if (forms !== undefined) {
      for (const ns of PREFS_ENTRY_CANDIDATES) {
        let form = null
        try { form = forms.get(ns) } catch (e) { form = null }
        if (form && typeof form.getSnapshot === 'function') return { scope: form, kind: 'configForms', ns }
      }
    }
    return null
  }
  /* Everything a bound transport needs after acquisition: adopt the initial
     snapshot, subscribe, then run the catch-up / legacy-repair / settled
     passes the single-transport version already ran. */
  /* Drop the active transport subscription, if any. Called by the re-selection
     below (switching to a different entry spelling) and by run teardown. */
  const prefsReleaseSubscription = () => {
    if (typeof prefsUnsubscribe === 'function') {
      try { prefsUnsubscribe() } catch (e) { /* the transport may already be gone */ }
    }
    prefsUnsubscribe = null
  }
  const prefsOnScopeChange = (scope) => {
    const snap = prefsSnapshotOf(scope)
    if (snap === null) return
    /* Re-selection. A form bound before the mirror answered reports 'loading'
       (bound while the Host was still sending its describe view) or
       'unavailable' (this install does not use that entry spelling); the
       moment the Host serves one of the OTHER candidates, move the binding
       there instead of staying deaf to the real entry. Re-selection uses a
       ready-only scan, so it can never bounce between two unserved
       candidates.

       'loading' is included in the trigger — not only 'unavailable' — because
       a real boot binds during exactly that window: client.js reaches
       acquirePrefsScope() while the mirror is still fetching, so the FIRST
       candidate is bound with status:'loading'. If that guess is the wrong
       spelling, the fix-up has to happen on the unserved side of the
       transition; waiting for 'unavailable' alone misses a wrong form that
       goes straight from 'loading' to a served other candidate. */
    if ((snap.status === 'unavailable' || snap.status === 'loading') && prefsScopeKind === 'configForms') {
      const ready = prefsFindReadyForm()
      if (ready !== null && ready.ns !== prefsScopeNs) {
        dbg('re-selecting settings entry', prefsScopeNs, '->', ready.ns)
        prefsReleaseSubscription()
        prefsScope = null
        prefsScopeKind = null
        prefsScopeNs = null
        prefsBindScope(ready)
        // A re-selection happens long after apply() (the mirror answered
        // late), so the theme is already mounted and must reconcile onto the
        // section that just arrived. Harmless at apply time, where no layer
        // has installed its reconciler yet.
        store.notify()
        return
      }
    }
    /* ONLY a status that cannot carry a section is ignored here. 'loading' is
       deliberately NOT ignored: it is the state a real page load STARTS in
       (the Host serves the section over the wire, so the bound form reports
       status:'loading', writable:false, valueKeys:0 while apply() runs), and
       the transition that matters — loading -> ready — is a single
       subscription event. Returning early on 'loading' swallowed exactly that
       event, so a section that settled after the bind never reached
       prefsFieldValue, the held edits were never replayed onto it, and
       store.markSettled() never fired. Everything then fell back to the schema
       defaults until the next reload, even though the Host had served the
       user's values. The bounded settle watch usually rescued it, which is why
       the failure was intermittent rather than total. */
    if (snap.status !== 'ready' && snap.status !== 'unavailable' && snap.status !== 'loading') return
    if (snap.status === 'ready' && snap.value !== undefined) store.adopt(snap.value)
    // An unavailable/loading -> ready transition is precisely when an edit we
    // HELD (see prefsCommit) can finally be written: replay any dirty fields
    // the moment the namespace is durably served. prefsReplayDirty is a no-op
    // when nothing is held or the scope is not yet served.
    store.flush()
    // The FIRST served section is also the first chance to see a document the
    // buggy build wrote (before that there is nothing to read), so the legacy
    // repair runs here too — and again on any later section that has not been
    // examined yet. Whatever it queues is replayed below.
    store.migrate(snap.value)
    store.flush()
    store.notify()
    /* Deliberately last: the startup hook must read the section only after it
       is resolved and migrated (and after prefsEmit has let the layer
       reconciler mount a theme the settled section switched on), and it must
       fire once rather than on every snapshot. */
    if (snap.status === 'ready' && snap.value !== undefined) store.markSettled()
  }
  const prefsBindScope = (acquired) => {
    const scope = acquired.scope
    prefsScope = scope
    prefsScopeKind = acquired.kind
    prefsScopeNs = acquired.ns
    const initial = prefsSnapshotOf(scope)
    if (initial) dbg('bound', acquired.kind, 'ns=', acquired.ns, '; initial status=', initial.status, 'writable=', initial.writable, 'mode=', initial.mode, 'valueKeys=', initial.value ? Object.keys(initial.value).length : 0)
    if (initial && initial.status === 'ready' && initial.value !== undefined) {
      store.adopt(initial.value)
    }
    /* The subscription disposer is RETAINED here (the single-transport version
       dropped it): a ConfigForm is a shared, provider-owned controller, so the
       run's teardown must remove this listener instead of leaking it into the
       next run — see dispose() below. */
    if (typeof scope.subscribe === 'function') {
      try {
        const unsubscribe = scope.subscribe(() => prefsOnScopeChange(scope))
        if (typeof unsubscribe === 'function') prefsUnsubscribe = unsubscribe
      } catch (e) { dbg('subscribe threw', e && e.message) }
    }
    // Catch up: an edit made before the scope settled must still persist. Replay
    // only genuinely user-changed fields (those prefsSet recorded as dirty) that
    // now differ from a freshly-fetched, durably-served host section.
    store.flush()
    // Then repair a section the buggy build wrote with the pre-migration field
    // spelling, and re-run the catch-up for whatever that migration queued.
    store.migrate(initial && initial.value)
    store.flush()
    /* A section that was ALREADY ready when the scope bound is authoritative on
       the first read too. In practice no hook is installed yet at this point in
       apply() (the boot-loader block below runs later), so this normally just
       records the transition — the plate's own apply()-time read is already
       correct when the section beat apply(), and that path is unchanged. */
    if (initial && initial.status === 'ready' && initial.value !== undefined) store.markSettled()
    // Safety net for a transport bound before the Host served it (no-op when
    // the section was ready already).
    prefsStartSettleWatch(0)
  }

  /* Bounded settle watch for a transport that was bound before the Host served
     it. The subscription is normally the cue — the shared describe mirror
     re-derives every form on a reload and the store notifies on a snapshot
     change — but a mirror that answers WITHOUT replacing the bound form's
     snapshot (or that only ever serves a different entry spelling) would leave
     this page load on schema defaults forever. This is the bounded safety net
     the legacy generation had as its 250 ms binder poll: it re-checks a limited
     number of times, moves to a newly served candidate spelling when one
     appears, and stops the moment the bound snapshot is ready. */
  const PREFS_SETTLE_LIMIT = 20 // ~20 * 500ms = up to ~10s after the bind
  const prefsStartSettleWatch = (attempt) => {
    if (prefsScope === null) return
    /* A re-bind or a re-selection can start a new chain while an earlier one
       is still pending; drop the old timer first so exactly one chain runs.
       The passes are idempotent, but duplicate chains duplicate logs and
       duplicate snapshot work. Clearing an already-fired handle is harmless. */
    if (prefsSettleTimer !== null && typeof clearTimeout === 'function') clearTimeout(prefsSettleTimer)
    prefsSettleTimer = null
    const snap = prefsSnapshotOf(prefsScope)
    if (snap !== null && snap.status === 'ready') {
      /* The form is served but its store never emitted (or the value arrived
         between acquisition and subscription). Run the same passes the
         subscription would have run — adopt, replay, migrate, settle — unless
         the bind already did them, then stop watching. */
      if (store.needsSettlePass()) prefsOnScopeChange(prefsScope)
      return
    }
    if (attempt >= PREFS_SETTLE_LIMIT) {
      /* Give up loudly, once. This is the page load that will lose the user's
         switches on the next reload, and the line below says which side is at
         fault: boundNs/status describe the client's binding, hostServes lists
         what the host actually serves (our entry id missing from it means the
         host half exported no Config — see index.js). */
      const finalSnap = prefsSnapshotOf(prefsScope)
      dbg('settle watch gave up after', attempt, 'attempts; preferences stay page-local. boundNs=', prefsScopeNs, 'status=', finalSnap === null ? null : finalSnap.status, 'mode=', finalSnap === null ? null : finalSnap.mode, 'hostServes=', prefsServedNamespaces())
      return
    }
    const ready = prefsFindReadyForm()
    if (ready !== null && ready.ns !== prefsScopeNs) {
      dbg('settle watch re-selecting settings entry', prefsScopeNs, '->', ready.ns)
      prefsReleaseSubscription()
      prefsScope = null
      prefsScopeKind = null
      prefsScopeNs = null
      prefsBindScope(ready)
      store.notify()
      return
    }
    if (typeof setTimeout !== 'function') return
    prefsSettleTimer = setTimeout(() => prefsStartSettleWatch(attempt + 1), 500)
  }

  /* One-shot boot report, logged ONLY when the store did not end up in the
     healthy state (a served, settled, writable host section with nothing held).
     "The switches reset on reload" has several causes that look identical from
     the outside — the entry spelling is wrong, the mirror never answered, the
     page is memory-backed, or an edit never reached the document — and each one
     is a property of THIS machine's install. When everything is fine this says
     nothing at all; when it is not, one line names the cause instead of leaving
     it to guesswork. */
  const prefsReportBoot = () => {
    const snap = prefsSnapshotOf(prefsScope)
    /* Same absence semantics as prefsDurablyServed: a 0.2.1 snapshot has no
       `mode` at all and is durable, so it must count as healthy here too —
       otherwise every healthy 0.2.1 page logs a misleading boot report. */
    const healthy = snap !== null && snap.status === 'ready' && (snap.mode === undefined || snap.mode === 'host')
      && snap.writable === true && store.pendingFields().length === 0
    if (healthy) return
    dbg('boot report (preferences did NOT reach a durable section):',
      'boundNs=', prefsScopeNs, 'kind=', prefsScopeKind,
      'status=', snap === null ? null : snap.status,
      'mode=', snap === null ? null : snap.mode,
      'writable=', snap === null ? null : snap.writable,
      'valueKeys=', snap && snap.value ? Object.keys(snap.value).length : 0,
      'settled=', store.settled(),
      'dirty=', store.pendingFields(),
      'panelMounted=', store.panelMounted(),
      'hostServes=', prefsServedNamespaces(),
      'candidates=', PREFS_ENTRY_CANDIDATES)
  }
  /* DIAG-ROUND5 (a host-vs-store value comparison printed on every load) was
     removed here: its cause was confirmed and fixed by the durable
     configForms transport, and dbg() is an unconditional console.warn, so the
     probe had become pure console noise on healthy pages. */
  let prefsBootReportTimer = null
  if (typeof setTimeout === 'function') {
    // After the mirror has had a fair chance to answer (the settle watch's own
    // budget), state the outcome once whether or not it worked. Tracked so the
    // dispose effect below can revoke it: after a teardown prefsScope is null,
    // which reads as "unhealthy" and would print a misleading boot report for
    // a page that is simply gone.
    prefsBootReportTimer = setTimeout(prefsReportBoot, PREFS_SETTLE_LIMIT * 500 + 500)
  }

  /* Repeatedly try to obtain a settings transport until one is servable. DSH
     web mounts plugin rows concurrently, so the settings service (and its
     describe mirror) can legitimately settle AFTER this theme's apply() runs;
     without this retry a single synchronous attempt that raced would leave
     prefsScope null forever and every subsequent toggle would silently stay
     page-local — the exact "works now, gone on refresh" symptom. */
  const rebindPrefs = (attempt) => {
    if (prefsScope !== null) return
    if (attempt > 40) { dbg('gave up binding a settings transport after retries; staying in-memory', 'hostServes=', prefsServedNamespaces()); return }
    let acquired = null
    try { acquired = acquirePrefsScope() } catch (e) { dbg('acquisition threw', e && e.message); acquired = null }
    if (acquired === null) {
      if (typeof setTimeout === 'function') {
        if (attempt % 8 === 0) dbg('waiting for a settings transport (attempt', attempt, ')')
        prefsBindTimer = setTimeout(() => rebindPrefs(attempt + 1), 250)
      }
      return
    }
    try {
      prefsBindScope(acquired)
    } catch (e) {
      // A throw in the middle of a bind leaves nothing usable behind: release
      // the slot and keep retrying instead of pretending a broken transport is
      // bound.
      prefsScope = null
      prefsScopeKind = null
      prefsScopeNs = null
      dbg('bind failed', e && e.message)
      if (typeof setTimeout === 'function') prefsBindTimer = setTimeout(() => rebindPrefs(attempt + 1), 250)
    }
  }
  // Dispose on run teardown: the active subscription is provider-owned
  // (a ConfigForm is shared across plugins), so a leaked listener would outlive
  // this run; the three bounded watches must not fire into a dead run either.
  // (The entry reaches this through the store's own dispose.)
  const dispose = () => {
    prefsReleaseSubscription()
    prefsScope = null
    prefsScopeKind = null
    prefsScopeNs = null
    if (prefsBindTimer !== null && typeof clearTimeout === 'function') clearTimeout(prefsBindTimer)
    prefsBindTimer = null
    if (prefsSettleTimer !== null && typeof clearTimeout === 'function') clearTimeout(prefsSettleTimer)
    prefsSettleTimer = null
    if (prefsBootReportTimer !== null && typeof clearTimeout === 'function') clearTimeout(prefsBootReportTimer)
    prefsBootReportTimer = null
  }

  /* The reverse port: what the store's write gate asks the bound form. A bound
     form set() is Promise<boolean> (false = refused/skipped); a rejection is
     the wire failing, and the store turns both back into a held edit. canWrite()
     distinguishes "bound but malformed" from "no transport at all", so the gate
     keeps such an edit held instead of clearing it. */
  const port = {
    snapshot: () => prefsSnapshotOf(prefsScope),
    bound: () => prefsScope !== null,
    binding: () => ({ kind: prefsScopeKind, ns: prefsScopeNs }),
    canWrite: () => prefsScope !== null && typeof prefsScope.set === 'function',
    write: (field, value) => {
      const scope = prefsScope
      if (!scope || typeof scope.set !== 'function') return false
      return scope.set(field, String(value))
    },
    served: () => prefsServedNamespaces(),
    dispose,
  }
  store.bindTransport(port)

  // Kick off the (re)trying transport acquisition, now that the store can see
  // the port.
  rebindPrefs(0)

  return { dispose }
}
