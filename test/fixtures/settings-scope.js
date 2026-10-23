/**
 * settings-scope.js — canonical DSH settings seam used by the theme tests.
 *
 * Migration (see docs/engineering-notes.md): the theme no longer persists to
 * localStorage. Its switches read/write a DSH settings namespace through the
 * `configForms` shared-form service (peerDependencies floors the host at
 * >=0.2.0, so the pre-0.1.7 `settingsScope` binder is NOT modelled any more —
 * a page without configForms is not a supported configuration).
 *
 *   `configFormsStub()` — the `ctx.configForms` service. A form is keyed by
 *               the PROFILE ENTRY ID (`theme-endfield`, see index.js
 *               SETTINGS_ENTRY); its `set()` returns `Promise<boolean>`,
 *               where `false` means the Host refused or skipped the write
 *               (memory mode on a non-loopback page). This is what
 *               test/settings-config-forms.test.js drives.
 *   `formStub()`  — the same service pre-bound to the canonical entry id and
 *               SERVED from the first read, with the convenience helpers
 *               (section / setField / get / setSection / reset) the
 *               simpler tests need. Same surface the old settingsScopeStub
 *               exposed, minus the binder.
 *
 * THE SECTION IS KEYED BY SCHEMA FIELD NAME, NOT BY UI KEY. This is the whole
 * point of these tests and it is worth stating explicitly, because getting it
 * wrong here hides the bug that shipped: the host declares camelCase fields
 * (`watermarkPersist`, `watermarkPersist`, …) in index.js FIELD_DEFAULTS, so a scope.set
 * or form.set can only ever store those names. An earlier version of this
 * fixture stripped the `dsh-theme-endfield-` prefix off the UI key instead —
 * the same wrong mapping the client had — so `setField('watermark-persist', …)` and
 * the client's `prefsGet('dsh-theme-endfield-watermark-persist')` agreed on a name
 * that does not exist in the schema, both sides passed, and every compound
 * switch silently reset on reload. KEY_TO_FIELD below is the fixture's copy of
 * that mapping and must stay in step with client.js PREFS_KEY_TO_FIELD.
 *
 * Contracts honoured (mirroring @deepseek-ai/dsh-client-ui-settings):
 *   configForms.get(entryId) -> form
 *               form.getSnapshot() -> { status, value, base, user, revision, writable, mode }
 *               (0.2.1-rc.2+ snapshots carry NO `mode` at all — model that with
 *               the `omitMode` option; the theme reads absence as durable)
 *               form.subscribe(listener) -> disposer
 *               form.set(field, value) / form.unset(field) -> Promise<boolean>
 *
 * The theme only trusts a `status === 'ready'` snapshot with a `value` object;
 * before that, and when no transport is present at all, it falls back to
 * in-memory schema defaults (enabled on, loader off, ...). All fields are
 * stored as the exact strings described in docs/features.md.
 */
'use strict'

const FIELD_DEFAULTS = {
  enabled: '1',
  radius: 'square',
  glass: 'off',
  texture: 'standard',
  motion: 'signal',

  watermark: '1',
  watermarkPersist: '0',
  loader: '0',
  notify: '1',
  notifyDone: '1',
  notifyQuestion: '1',
  notifyApprove: '1',
  /* 音频通知 — same defaults as index.js FIELD_DEFAULTS. These names are already
     camelCase schema fields, so they pass through fieldName() unchanged; they are
     listed here so the fixture stays a faithful projection of the host schema
     (settings-namespace.test.js diffs the two). The master switch ships OFF. */
  audioEnabled: '0',
  audioVolume: '100',
  audioBoot: '1',
  audioTurnStart: '1',
  audioTurnDone: '1',
  audioAttention: '1',
  audioTurnFail: '1',
  audioDebounceMs: '2500',
  audioSoundDir: '',
  audioHumanOnly: '1',
  audioDiag: '0',
}

/** UI/store key -> schema field. Mirrors client.js PREFS_KEY_TO_FIELD. */
const KEY_TO_FIELD = {
  'dsh-theme-endfield-enabled': 'enabled',
  'dsh-theme-endfield-radius': 'radius',
  'dsh-theme-endfield-glass': 'glass',
  'dsh-theme-endfield-texture': 'texture',
  'dsh-theme-endfield-motion': 'motion',

  'dsh-theme-endfield-watermark': 'watermark',
  'dsh-theme-endfield-watermark-persist': 'watermarkPersist',
  'dsh-theme-endfield-loader': 'loader',
  'dsh-theme-endfield-notify': 'notify',
  'dsh-theme-endfield-notify-done': 'notifyDone',
  'dsh-theme-endfield-notify-question': 'notifyQuestion',
  'dsh-theme-endfield-notify-approve': 'notifyApprove',
  /* Audio rows: the tail already equals the schema field, but the mapping is
     asserted to cover EVERY declared field, so they are listed like the rest. */
  'dsh-theme-endfield-audio-enabled': 'audioEnabled',
  'dsh-theme-endfield-audio-volume': 'audioVolume',
  'dsh-theme-endfield-audio-boot': 'audioBoot',
  'dsh-theme-endfield-audio-turn-start': 'audioTurnStart',
  'dsh-theme-endfield-audio-turn-done': 'audioTurnDone',
  'dsh-theme-endfield-audio-attention': 'audioAttention',
  'dsh-theme-endfield-audio-turn-fail': 'audioTurnFail',
  'dsh-theme-endfield-audio-debounce-ms': 'audioDebounceMs',
  'dsh-theme-endfield-audio-sound-dir': 'audioSoundDir',
  'dsh-theme-endfield-audio-human-only': 'audioHumanOnly',
  'dsh-theme-endfield-audio-diag': 'audioDiag',
}

/** Accept a UI key ('dsh-theme-endfield-watermark-persist'), a bare schema field
 *  ('watermarkPersist'), or a namespaced schema field ('dsh-theme-endfield-watermarkPersist'
 *  — the spelling the upstream tests seed with, written against the older fixture
 *  that stripped the prefix instead of mapping it). All three name a DECLARED
 *  field. Anything else — in particular the legacy pre-migration spelling
 *  'watermark-persist' — is handed back unchanged, exactly as a scope.set of an
 *  undeclared field behaves in production: stored, but never read as a declared
 *  field. Resolving that legacy tail here would hide the very bug these tests
 *  exist to catch, so a test that needs it must build the section through
 *  `section`/`setSection` directly, which keeps the migration path exercised
 *  rather than papered over. */
function fieldName(key) {
  if (Object.prototype.hasOwnProperty.call(KEY_TO_FIELD, key)) return KEY_TO_FIELD[key]
  const NS = 'dsh-theme-endfield-'
  if (key.indexOf(NS) === 0) {
    const tail = key.slice(NS.length)
    if (Object.prototype.hasOwnProperty.call(FIELD_DEFAULTS, tail)) return tail
  }
  return key
}

/**
 * Build a fake `configForms` service pre-bound to the canonical entry id
 * (`theme-endfield`) and SERVED from the first read, plus the convenience
 * helpers the simpler tests drive values through.
 *
 * @param initial - initial stored section (schema field -> string; UI keys are
 *                  accepted too). Undefined fields resolve to FIELD_DEFAULTS
 *                  during value resolution, exactly like a schema `.default()`
 *                  merges into a stored section.
 * @param options - forwarded to configFormsStub (mode / omitMode / writable /
 *                  accept / loading are the useful ones).
 * @returns { service, section, getSnapshot, writes, get, setField, setSection, reset }
 */
function formStub(initial = {}, options = {}) {
  const NS = 'theme-endfield'
  const backing = configFormsStub({ [NS]: initial }, Object.assign({ served: [NS] }, options))
  const section = backing.sectionOf(NS)
  return {
    service: backing.service,
    writes: backing.writes,
    section,
    get: (key) => section[fieldName(key)],
    setField: (key, value) => { section[fieldName(key)] = String(value); backing.touch(NS) },
    /** Write a section key VERBATIM — no key->field mapping. This is how a test
     *  reproduces a document a buggy build wrote (e.g. the undeclared
     *  'watermark-persist' next to a defaulted 'watermarkPersist'). */
    setSection: (key, value) => { section[key] = String(value); backing.touch(NS) },
    getSnapshot: () => backing.service.get(NS).getSnapshot(),
    reset() { for (const k of Object.keys(FIELD_DEFAULTS)) section[k] = FIELD_DEFAULTS[k]; backing.touch(NS) },
    serve: backing.serve,
    settle: backing.settle,
  }
}

/**
 * Build a fake DSH 0.1.7 `configForms` service over per-namespace sections.
 *
 * The namespace is chosen by the CALLER (the theme asks for the profile entry
 * id, index.js SETTINGS_ENTRY), and only namespaces listed in `served` answer
 * `status:'ready'` — everything else reports `'unavailable'`, exactly like the
 * Host's describe mirror does for a namespace it does not serve. That is what
 * lets a test prove the theme prefers a served spelling, never persists anything
 * through an unserved one, and re-selects once the real entry appears.
 *
 * @param initialSections - { [namespace]: { field: value } }; undeclared fields
 *                          resolve to FIELD_DEFAULTS, like schema defaults.
 * @param options.served    - namespaces the Host serves (default: none).
 * @param options.accept    - (namespace, field, value) -> boolean. Return false
 *                            to model a REFUSED write: the returned promise
 *                            resolves false and the section does not change.
 * @param options.mode      - 'host' (default) or 'memory' (non-loopback page;
 *                            never persists).
 * @param options.omitMode  - model the DSH 0.2.1-rc.2+ snapshot, which carries
 *                            NO `mode` key at all. The theme must read absence
 *                            as durable; a stub that always spells a mode
 *                            freezes the 0.1.7-0.2.0 shape into the suite.
 * @param options.writable  - false models a read-only Host document.
 * @param options.loading   - namespaces that report `status:'loading'` with
 *                            `writable:false` and NO value, modelling the real
 *                            boot window before the Host's describe view
 *                            arrives. This is the state a real page load starts
 *                            in, and the one an earlier stub could not produce
 *                            at all — which is how a `loading -> ready`
 *                            transition bug shipped with every test green.
 *                            Call `settle(ns)` to move it to ready.
 * @returns { service, writes, unsubscribed, sections, sectionOf, serve, settle,
 *            touch, setAccept, writtenNamespaces }
 */
function configFormsStub(initialSections = {}, options = {}) {
  const sections = {}
  for (const ns of Object.keys(initialSections)) {
    sections[ns] = Object.assign({}, FIELD_DEFAULTS, initialSections[ns])
  }
  const served = (options.served || []).slice()
  // Namespaces still in flight: 'loading' now, ready once settle() is called.
  const loading = (options.loading || []).slice()
  const mode = options.mode || 'host'
  /* 0.2.1-rc.2+ snapshots carry no `mode` key at all (omitMode models that). */
  const withMode = options.omitMode !== true
  const writable = options.writable !== false
  // A mirror that answers without replacing any form's snapshot (models the
  // worst case the theme's bounded settle watch exists for).
  const quiet = options.quiet === true
  let accept = options.accept || (() => true)

  const listeners = {}
  const forms = {}
  const writes = []       // { ns, field, value } in call order, accepted or not
  const unsubscribed = [] // namespaces whose subscription was disposed

  // The describe mirror is SHARED: a Host document change (or a mirror reload)
  // replaces every form's snapshot at once, so notifications are global. That is
  // also what lets a form bound to the wrong entry spelling notice that another
  // candidate became served.
  const notify = () => {
    for (const ns of Object.keys(listeners)) {
      for (const l of (listeners[ns] || []).slice()) { try { l() } catch (e) { /* test safety */ } }
    }
  }
  const sectionOf = (ns) => sections[ns] || (sections[ns] = Object.assign({}, FIELD_DEFAULTS))
  const snapshotOf = (ns) => {
    /* Still in flight: the Host has not sent its describe view yet. This is the
       exact shape the live theme logs at boot — status 'loading', writable
       false, no value — and a write issued here must NOT be treated as landed
       (prefsDurablyServed requires status 'ready'). */
    const snap = (extra) => {
      if (withMode) return Object.assign({ mode }, extra)
      return extra
    }
    if (loading.indexOf(ns) >= 0) {
      return snap({ status: 'loading', value: undefined, base: undefined, user: undefined, revision: undefined, writable: false })
    }
    if (served.indexOf(ns) < 0) {
      return snap({ status: 'unavailable', value: undefined, base: undefined, user: undefined, revision: undefined, writable })
    }
    return snap({
      status: 'ready',
      value: Object.assign({}, sectionOf(ns)),
      base: Object.assign({}, FIELD_DEFAULTS),
      user: Object.assign({}, sectionOf(ns)),
      revision: 1,
      writable,
    })
  }
  const formFor = (ns) => forms[ns] || (forms[ns] = {
    getSnapshot: () => snapshotOf(ns),
    subscribe(listener) {
      (listeners[ns] = listeners[ns] || []).push(listener)
      return () => {
        unsubscribed.push(ns)
        const list = listeners[ns] || []
        const i = list.indexOf(listener)
        if (i >= 0) list.splice(i, 1)
      }
    },
    set(field, value) {
      const encoded = String(value)
      writes.push({ ns, field, value: encoded })
      // A still-loading namespace must REFUSE: the Host document is not open
      // (writable:false in the snapshot). Modelling this as an accepted write
      // would hide the very gate prefsDurablyServed exists to enforce.
      const ok = served.indexOf(ns) >= 0 && loading.indexOf(ns) < 0
        && writable && accept(ns, field, encoded) !== false
      if (ok) { sectionOf(ns)[field] = encoded; notify() }
      return Promise.resolve(ok)
    },
    unset(field) {
      sectionOf(ns)[field] = FIELD_DEFAULTS[field]
      notify()
      return Promise.resolve(true)
    },
  })

  return {
    service: { get: (ns) => formFor(ns) },
    writes,
    unsubscribed,
    sections,
    sectionOf,
    /** Put a namespace into the Host's served list (mirror reload). `quiet`
        suppresses the notification, leaving the theme's bounded settle watch as
        the only thing that can notice. */
    serve(ns) { if (served.indexOf(ns) < 0) { served.push(ns); if (!quiet) notify() } },
    /** Finish a boot: the Host's describe view arrives, so the namespace serves
        its section and accepts writes. This is the `loading -> ready`
        transition the live theme waits for.

        Wire fidelity, deliberately. The real client sees ONE event here: the
        describe view lands, the shared mirror re-derives every form, and the
        subscription fires once against a now-'ready' snapshot. There is no
        separate synthetic `loading` notification followed by a `ready` one — and
        modelling it that way is a trap: the extra `ready` event would rescue a
        gate that wrongly rejected the transitional state, hiding exactly the
        defect this fixture exists to expose. So `settle()` flips the state and
        notifies exactly once. */
    settle(ns) {
      const i = loading.indexOf(ns)
      if (i >= 0) loading.splice(i, 1)
      if (served.indexOf(ns) < 0) served.push(ns)
      if (!quiet) notify()
    },
    /** Model the mirror pushing a still-loading snapshot (the boot window the
        live theme logs as `status= loading writable= false valueKeys= 0`).
        Notifies without serving anything. */
    notifyLoading() { if (!quiet) notify() },
    /** Fire a snapshot replacement without changing the section. */
    touch(ns) { if (!quiet) notify() },
    setAccept(fn) { accept = fn || (() => true) },
    writtenNamespaces: () => Array.from(new Set(writes.map((w) => w.ns))),
  }
}

module.exports = { formStub, configFormsStub, FIELD_DEFAULTS, KEY_TO_FIELD, fieldName }
