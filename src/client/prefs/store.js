/**
 * prefs/store.js — the durable preference store: values, the durable write
 * gate and the held-edit queue.
 *
 * The theme's switches used to persist through `localStorage`, which DSH
 * Desktop broke on every restart: Desktop binds a fresh random localhost
 * port per launch, so the origin (and thus the browser storage scope)
 * changed and the saved settings silently reset to defaults.
 *
 * The durable authority is DSH's own settings service, and DSH 0.1.7-rc.1
 * moved it once more. The whole pre-0.1.7 seam — a host
 * `ctx.settings.register(namespace, schema)` persisted by
 * `@deepseek-ai/dsh-settings-file` to `<dshHome>/settings.yaml`, mirrored
 * to the browser as the `ctx.settingsScope` service — is GONE: the package
 * is not in the distribution any more, `settings.yaml` is not the settings
 * carrier, and the client has no `settingsScope` service at all.
 *
 * What replaced it (see index.js for the host side):
 *
 *   host    the plugin entry exports a schemastery `Config` whose fields
 *           are `.volatile()`. `ctx.settings` projects it into a form and
 *           persists user edits into the PROFILE PATCH
 *           (<profile>/cordis.patch.yml) through `ctx.configEditor`,
 *           i.e. a path owned by DSH and independent of the web origin.
 *   client  `services.configForms()` (src/client/services.js) — the
 *           settings domain's shared-form service — `.get(<profile entry id>)` returns that entry's
 *           ConfigForm: getSnapshot() / subscribe() / set() / unset() /
 *           mutate().
 *
 * The namespace is now the PROFILE ENTRY ID, not a plugin-chosen string:
 * this package's cordis.patch.yml inserts `id: theme-endfield`, and
 * index.js exports that same id as SETTINGS_ENTRY. Both halves still speak
 * the old namespace string for the legacy fallback and as the prefix of
 * every UI key in the tables below.
 *
 * The >=0.2.0 floor dropped the legacy seam entirely (peerDependencies
 * enforces it): a host without `configForms` is not a supported
 * configuration, and pages that have none (an out-of-DSH page,
 * in-process tests) run on memory defaults below. Either way the values
 * live host-side, so:
 *
 *   dsh web     (browser, fixed loopback port)  -> host persistence
 *   DSH Desktop (browser, random loopback port) -> host persistence
 *
 * Both are loopback pages, so DSH resolves the connection to 'host' mode
 * and the values land on disk; a change of port does not move them because
 * nothing lives in browser storage any more.
 *
 * Value model. Namespace fields are the tails of the old localStorage keys
 * and are stored as the same strings, so the semantics (and any older
 * <settings.yaml> section from a prior build) keep scanning identically:
 *   default-ON switches store  '1'  and read as  !== '0'
 *   default-OFF switches store '0'  and read as  === '1'
 *   palette/radius/fps/speed  store one of their documented literals.
 * FIELD_DEFAULTS is the shipped fallback and mirrors index.js.
 *
 * Resilience. Before the transport hands us a section (boot), or in an
 * environment with neither settings service at all (an out-of-DSH page,
 * in-process tests), the store falls back to FIELD_DEFAULTS overlaid with
 * any in-page overrides made this session. Writes are committed to the
 * settings transport only when it is ready + writable; otherwise they are
 * kept session-local so toggles still work in place but do not persist
 * (there is no durable backend to persist to — and no localStorage).
 *
 * Transport selection, candidate spellings, the bounded settle watch and the
 * boot report live in prefs/transport.js. This module never imports it: the
 * two halves meet at the small port installed by bindTransport() (a snapshot,
 * one field write, and the describe-view list for the diagnostics lines), and
 * the entry is the composition root that injects { debug } here and
 * { services, debug, store } there.
 */
import { PREFS_FIELD_DEFAULTS, prefsFieldOf } from './keys.js'
import { createLegacyMigrator } from './legacy.js'

export function createPrefsStore({ debug: dbg }) {
  const prefsListeners = []
  const prefsLocal = Object.assign({}, PREFS_FIELD_DEFAULTS) // schema defaults, for boot / no transport
  // The subset of prefsLocal a USER has actually edited this session. It is what
  // prefsGetValue overlays on the fetched section: prefsLocal as a whole carries
  // the shipped defaults, so overlaying all of it would shadow the very values
  // the host just served (watermark off would read back as its default on).
  const prefsLocalEdited = new Set()
  // Fields a panel toggle changed so far but that have not yet been durably
  // committed to the host scope. If the scope was not ready at apply() time and
  // only appears later, these are replayed so a pre-bind edit still persists
  // instead of silently living in page-only memory.
  const prefsDirty = new Set()
  // Fields whose value THIS SESSION changed (see prefsSet), regardless of where
  // that edit currently stands. Used to tell "the host already holds this value"
  // apart from "the user put it back to a value the host happens to hold":
  // only the former means there is nothing left to persist.
  const prefsEdited = new Set()
  let prefsFieldValue = null // last schema-resolved user+base+defaults section from the scope, if any
  let prefsRetryTimer = null // bounded retry for held edits whose ready cue has not arrived
  // Max held-edit retry passes. The ready transition is normally the cue; this
  // bounded timer is the safety net for a mirror whose first describe predates
  // a late host registration and sees no document commit to rerun on.
  const PREFS_RETRY_LIMIT = 20 // ~20 * 500ms = up to ~10s after the last held edit
  let prefsRetryCount = 0
  // True while prefsReplayDirty is mid-pass. A normal DSH scope.set is async,
  // but the mirror can fold a ready snapshot in synchronously (and document
  // mocks/transitions too), which would re-enter the replay from the theme's
  // own subscription and write the same held edits twice. The bus flag makes a
  // single replay pass authoritative; re-entrant calls become no-ops.
  let prefsReplayBusy = false
  /* Theme layers install *their* reconcile here once they exist (updated from
     the bottom of apply) so a transport event can live-apply a real change. */
  let reconciler = null
  /* True once an authoritative (status:'ready') section has been read for THIS
     page load, plus the one-shot hook the startup surfaces that depend on such a
     section install below. See prefsMarkSettled. */
  let prefsSettledOnce = false
  let settledHook = null
  /* Whether the settings page has rendered its body, for the boot report: a
     report from a page whose settings page was never opened is expected to
     show nothing, and must not be mistaken for a failure. */
  let panelMounted = false

  /* A schema-accepted section from the transport, else in-memory defaults
     (PREFS_FIELD_DEFAULTS is the fallback BEFORE a first section arrives).
     Fields the user has edited this session are overlaid ON TOP on purpose: a
     toggle writes prefsLocal synchronously and only then does the host echo the
     section back, so reading the fetched section first would show the panel the
     new state while the theme still acted on the old one until the round-trip
     closed. Only EDITED fields are overlaid (see prefsLocalEdited), so a served
     value for any other field is still what the theme reads. */
  let prefsOverlayCache = null
  const prefsGetValue = () => {
    const base = prefsFieldValue || PREFS_FIELD_DEFAULTS
    if (prefsLocalEdited.size === 0) return base
    /* Hot path: the watermark observer reads prefs many
       times per frame. Rebuilding this overlay per read allocated a fresh
       ~24-key object every time; caching it against the base-section
       REFERENCE keeps those reads allocation-free. prefsSet invalidates on
       every edit (the only place prefsLocalEdited grows), and a new section
       from the host arrives as a different `base` reference, so a stale pair
       can never be served. Callers treat the result as read-only — prefsGet
       is the sole runtime consumer and only reads single fields. */
    if (prefsOverlayCache !== null && prefsOverlayCache.base === base) return prefsOverlayCache.out
    const out = Object.assign({}, base)
    for (const field of prefsLocalEdited) out[field] = prefsLocal[field]
    prefsOverlayCache = { base, out }
    return out
  }
  /** read one field as its raw stored string: <stored-or-default>, never null. */
  const prefsGet = (rawKey) => {
    const field = prefsFieldOf(rawKey)
    const sec = prefsGetValue()
    if (sec && Object.prototype.hasOwnProperty.call(sec, field)) return String(sec[field])
    return PREFS_FIELD_DEFAULTS[field]
  }
  /** subscribe to any change of the whole namespace (transport or local). */
  const prefsSubscribe = (listener) => {
    prefsListeners.push(listener)
    return () => {
      const i = prefsListeners.indexOf(listener)
      if (i >= 0) prefsListeners.splice(i, 1)
    }
  }
  const prefsEmit = () => {
    for (const l of prefsListeners.slice()) { try { l() } catch (e) { /* keep going */ } }
    if (reconciler) try { reconciler() } catch (e) { /* keep going */ }
  }
  /* The FIRST authoritative section of a page load is a moment of its own: it is
     the instant the stored preferences become knowable at all. On a real page
     load the Host serves that section over the wire, so every read made while
     apply() runs — including the boot plate's — falls back to the schema
     defaults. A surface whose whole job happens at startup therefore cannot act
     on its apply()-time read; it hangs off this transition instead.

     Fires at most once per page load, and only AFTER the section has been
     resolved (prefsFieldValue assigned) and any legacy migration has run, so a
     hook reading prefsGet() sees final values rather than a half-applied
     snapshot. Deliberately not re-fired by later sections: a section that
     changes later is an ordinary runtime edit, not a page load. */
  const prefsMarkSettled = () => {
    if (prefsSettledOnce) return
    prefsSettledOnce = true
    if (settledHook) try { settledHook() } catch (e) { /* keep going */ }
  }

  /* The bound transport, installed by createPrefsTransport() through
     bindTransport(). The write gate needs only a snapshot, one field write
     and the diagnostics list from the host describe view. */
  let transport = null
  /* --- Durable write gate -----------------------------------------------
     A scope snapshot from @deepseek-ai/dsh-client-ui-settings carries three
     flags that must ALL hold before a scope.set can durably land:
       mode    === 'host'   OPTIONAL since DSH 0.2.1-rc.2, which DELETED the
                            field (and `persistence`) from the snapshot: the
                            shape is { status, value, base, user, revision,
                            writable } and every accepted set() is a
                            remote.settings.mutate() against the Host
                            document. A missing mode therefore means durable;
                            only an explicit 'memory' — 0.1.7-rc.* on a
                            non-loopback page, which never persists — refuses.
                            (Requiring mode==='host' verbatim on 0.2.1 held
                            every write, retried it inside the bounded settle
                            window and then dropped it: toggles worked for
                            the page session and reset on reload.)
       status  === 'ready'  the Host's describe view actually SERVES this
                            namespace and a decoded value stands. It stays
                            'loading' before the first accepted section and
                            becomes 'unavailable' when the namespace is NOT in
                            the host's served list (the host half has not run
                            its ctx.settings.register(...) yet, or the mirror
                            last fetched before it appeared). A scope.set into
                            a 'loading'/'unavailable' host scope reaches no
                            durable store.
       writable=== true     the Host document accepts writes.
     Gating on snap.writable ALONE is the old bug: a host-mode describe view
     answers writable=true even while this namespace is still unserved, so the
     old code fired scope.set into a namespace the host had not registered,
     cleared the dirty mark and logged the misleading
     `commit ... status= unavailable` warn — the preference kept working for
     the page session but vanished on the next reload. We issue a real wire
     write only once the namespace is genuinely served, and keep the edit
     dirty so a later ready transition (re)plays it. */
  const prefsSnap = () => (transport === null ? null : transport.snapshot())
  const prefsDurablyServed = (snap) => !!snap && (snap.mode === undefined || snap.mode === 'host') && snap.status === 'ready' && !!snap.writable
  /* One field write through the bound transport, with one settlement contract
     for both generations. The legacy scope.set() is fire-and-forget; a
     ConfigForm's set() returns Promise<boolean>, where false means the Host
     REFUSED or SKIPPED the write (most commonly memory mode on a non-loopback
     page) and a rejection means the wire call failed. Either way the edit is
     put back into prefsDirty so a later ready/replay pass retries it instead
     of the setting looking saved while nothing reached the document.
     Deliberately NOT marked dirty up front for a thenable write: DSH's own
     client folds an ACCEPTED write into the shared mirror before the returned
     promise resolves, so a synchronous dirty mark would make every toggle
     emit a redundant second write. A late repair beats a duplicate write.
     @returns true when the write was issued (not when it was accepted). */
  const prefsWriteField = (field, value) => {
    if (transport === null || typeof transport.write !== 'function') return false
    /* A bound form that cannot accept writes is not "issued" either: keep the
       edit in the queue instead of optimistically clearing it (step-1 parity —
       a real ConfigForm always has set(), this covers a malformed one). */
    if (typeof transport.canWrite === 'function' && !transport.canWrite()) return false
    let result = null
    try { result = transport.write(field, String(value)) } catch (e) {
      dbg('set threw', field, e && e.message)
      prefsDirty.add(field)
      return false
    }
    if (result && typeof result.then === 'function') {
      result.then((ok) => {
        if (ok === false) {
          dbg('set REFUSED by the host', field, value)
          prefsDirty.add(field)
          prefsScheduleRetry()
        } else {
          prefsDirty.delete(field)
        }
      }, (e) => {
        dbg('set REJECTED', field, value, String(e && e.message || e))
        prefsDirty.add(field)
      })
    } else {
      prefsDirty.delete(field)
    }
    return true
  }
  /* Push edits recorded while the scope was not durably served as soon as it
     is (bind catch-up + an unavailable/loading -> ready subscription both call
     this). A dirty field is cleared only once it is WRITTEN to a served host
     scope, or once the host's own FETCHED section already holds that exact
     value. Guarded against races the same way as prefsCommit: a rejected async
     write keeps the field for a later try. */
  const prefsReplayDirty = () => {
    if (prefsReplayBusy) return
    if (prefsDirty.size === 0) return
    prefsReplayBusy = true
    try {
      const snap = prefsSnap()
      const durable = prefsDurablyServed(snap)
      for (const field of Array.from(prefsDirty)) {
        const local = prefsLocal[field]
        const hostValue = snap && snap.value
          ? (Object.prototype.hasOwnProperty.call(snap.value, field) ? String(snap.value[field]) : undefined)
          : undefined
        /* An edit the host ALREADY holds needs no write — provided the host
           really holds it, rather than the user having just typed that value
           back in. Those differ in exactly one case, and it is the one that
           matters: the user reverts a field to a value the host's stale view
           still reports (the pre-migration default is the common one), and
           skipping the write would silently drop the revert. So only a field
           this session never edited is cleared on equality; an edited field is
           cleared by its write.
           Equality with the shipped DEFAULT is likewise not a reason to clear:
           the host may still hold a non-default value, and "put it back to the
           default" is then a real edit that has to reach the document. */
        if (local === hostValue && !prefsEdited.has(field)) {
          prefsDirty.delete(field)
          continue
        }
        if (!durable) continue
        // Optimistically clear; a refused/rejected write puts the field back
        // into prefsDirty from prefsWriteField's settlement handler.
        if (prefsWriteField(field, local)) {
          dbg('replayed held', field, '=', local)
          prefsDirty.delete(field)
        }
      }
    } finally {
      prefsReplayBusy = false
    }
  }
  /* Bounded safety net for a held edit whose "ready" cue never arrives on its
     own. A normal scope subscription fires on the ready transition and replays
     immediately; this is only for a mirror whose first describe predated a late
     host registration and that sees no intermediate document commit / reconnect
     to rerun on. Each tick simply calls prefsReplayDirty() again; once nothing
     is held (all written) the loop stops itself. Stops after PREFS_RETRY_LIMIT
     ticks so an environment where the namespace is genuinely never served does
     not spin forever. */
  const prefsStopRetry = () => {
    if (prefsRetryTimer !== null && typeof clearTimeout === 'function') clearTimeout(prefsRetryTimer)
    prefsRetryTimer = null
    prefsRetryCount = 0
  }
  const prefsScheduleRetry = () => {
    // Nothing held any more: no reason to keep ticking.
    if (prefsDirty.size === 0) { prefsStopRetry(); return }
    // A durably-served scope needs no timer — its subscription replays fast.
    if (prefsDurablyServed(prefsSnap())) { prefsStopRetry(); return }
    if (prefsRetryTimer !== null) return // already ticking
    if (typeof setTimeout !== 'function') return // no timer environment
    prefsRetryCount = 0
    const tick = () => {
      prefsRetryTimer = null
      prefsRetryCount += 1
      if (prefsRetryCount > PREFS_RETRY_LIMIT) { prefsStopRetry(); return }
      if (prefsDirty.size === 0) { prefsStopRetry(); return }
      if (prefsDurablyServed(prefsSnap())) { prefsStopRetry(); return }
      prefsReplayDirty()
      if (prefsDirty.size > 0) prefsRetryTimer = setTimeout(tick, 500)
      else prefsStopRetry()
    }
    prefsRetryTimer = setTimeout(tick, 500)
  }
  const prefsCommit = (field, encoded) => {
    // Best-effort durable write. A real wire write happens only while the
    // scope is durably served (see the gate note above); before that we stay
    // session-local, record the edit in prefsDirty and let prefsReplayDirty
    // push it once the namespace is served. We deliberately do NOT
    // prefsEmit() here: the caller's toggle already reconciles the layer it
    // changes, and the authoritative echo arrives through the scope
    // subscription below, so an immediate synchronous emit would do the same
    // work twice.
    if (transport !== null && transport.bound()) {
      const snap = prefsSnap()
      if (prefsDurablyServed(snap)) {
        const binding = transport.binding()
        dbg('commit', field, '=', encoded, 'via', binding.kind, binding.ns, 'status=', snap.status, 'mode=', snap.mode)
        prefsWriteField(field, encoded)
        return true
      }
      dbg('held (namespace not durably served yet)', field, '=', encoded, 'snap=', snap === null ? null : { status: snap.status, writable: snap.writable, mode: snap.mode }, 'hostServes=', transport.served())
    } else {
      dbg('commit with NO settings transport bound (page-local only)', field, encoded, 'hostServes=', transport === null ? null : transport.served())
    }
    prefsDirty.add(field)
    prefsScheduleRetry()
    return false
  }
  /** write one field with the exact stored-string value the UI derives. */
  const prefsSet = (rawKey, encoded) => {
    const field = prefsFieldOf(rawKey)
    prefsLocal[field] = String(encoded)
    prefsLocalEdited.add(field)
    prefsEdited.add(field)
    prefsOverlayCache = null
    prefsCommit(field, prefsLocal[field])
  }

  /* Normalize a section the transport handed us to a full set of SCHEMA
     fields: the declared fields the mirror resolved, plus schema defaults for
     any it has not. Field names come from the one table (prefsFieldOf), so a
     section is keyed exactly the way the theme reads it. */
  const prefsResolveSection = (section) => {
    const out = Object.assign({}, PREFS_FIELD_DEFAULTS)
    if (section === null || typeof section !== 'object') return out
    for (const field of Object.keys(PREFS_FIELD_DEFAULTS)) {
      if (Object.prototype.hasOwnProperty.call(section, field)) out[field] = String(section[field])
    }
    return out
  }
  /* Legacy-spelled fields written by the buggy build are repaired once per run;
     the pure decision rule lives in prefs/legacy.js. */
  const prefsMigrateLegacy = createLegacyMigrator({
    // Thunks, not references: prefsSet/dbg are declared in this closure and the
    // migrator only ever calls them long after apply() finished.
    commit: (field, value) => prefsSet(field, value),
    debug: (...a) => dbg(...a),
  }).migrate

  /* ---- transport protocol ------------------------------------------------
     What createPrefsTransport() drives: it owns WHEN a section is adopted and
     WHEN the held queue can be flushed, this module owns HOW. */
  const bindTransport = (port) => { transport = port }
  const adopt = (section) => { prefsFieldValue = prefsResolveSection(section) }
  const flush = () => prefsReplayDirty()
  const migrate = (section) => prefsMigrateLegacy(section)
  const notify = () => prefsEmit()
  const needsSettlePass = () => prefsFieldValue === null || prefsDirty.size > 0
  const pendingFields = () => Array.from(prefsDirty)
  const settled = () => prefsSettledOnce
  const panelMountedState = () => panelMounted

  /* Run teardown. The entry registers this on the run effect; it releases the
     listener list, the held-edit retry timer and the transport (subscription,
     scope binding, settle/boot watches) so a re-apply starts clean. */
  const dispose = () => {
    prefsListeners.length = 0
    settledHook = null
    if (transport !== null && typeof transport.dispose === 'function') transport.dispose()
    prefsFieldValue = null
    if (prefsRetryTimer !== null && typeof clearTimeout === 'function') clearTimeout(prefsRetryTimer)
    prefsRetryTimer = null
  }

  return {
    /* Reads and writes used by the theme surfaces. `get` is the sole runtime
       reader the hot paths call, so it stays allocation-free for the overlay. */
    get: prefsGet,
    set: prefsSet,
    commit: prefsCommit,
    listen: prefsSubscribe,
    wasEdited: (field) => prefsEdited.has(field),
    ready: () => prefsSettledOnce,
    /* Late-bound hooks: theme layers exist only once apply() has run, and the
       settled hook is claimed by the startup surface (the boot plate). */
    setReconciler: (fn) => { reconciler = fn },
    onSettled: (fn) => { settledHook = fn },
    /* Told by the settings panel that its body rendered, for the boot report. */
    markPanelMounted: () => { panelMounted = true },
    /* The store decides when a section becomes authoritative for this page. */
    markSettled: prefsMarkSettled,
    /* Transport protocol surface (createPrefsTransport drives these). */
    bindTransport,
    adopt,
    flush,
    migrate,
    notify,
    needsSettlePass,
    pendingFields,
    settled,
    panelMounted: panelMountedState,
    dispose,
  }
}
