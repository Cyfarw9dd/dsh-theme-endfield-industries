import THEME_CSS from '../styles/theme.css?raw'
import GENERATED_CSS from '../styles/generated.css?raw'
import { createServices } from './services.js'
import {
  PREFS_ENTRY,
  PREFS_NS,
  PREFS_FIELD_DEFAULTS,
  prefsFieldFromKey,
  PREFS_KEY_TO_FIELD,
  PREFS_FIELD_TO_LEGACY_KEY,
  prefsFieldOf,
} from './prefs/keys.js'
/**
 * dsh-theme-endfield — Edge Intelligence Theme (browser client bundle)
 * 还原自《明日方舟：终末地》（Arknights: Endfield）官网的「工业编辑风」。
 * 参考：https://endfield.hypergryph.com
 *
 * Client 半部：
 *   1) theme.overrideTokens —— 覆盖主题令牌（亮/暗双色），映射终末地官网色板；
 *   2) insertCss —— 注入字体栈、强调色、直角化、去蓝、hover 反色等全局样式。
 *      （动态插件环境走 styles.insert；安装为独立 bundle 时直接注入 <style> 到 head。）
 *   3) 设置页「终末地主题设置」—— 设置项按五组分类（主题 / 背景 / 动画 / 通知 / 音频），
 *      默认值 / 语义标记通过 DSH 的设置命名空间随 profile 落盘：client 走
 *      `ctx.configForms`（host index.js 导出的 volatile `Config`，命名空间
 *      = profile entry id `theme-endfield`）。兼容下限 DSH 0.2.0（peerDependencies
 *      钉住），更旧的 `settingsScope` 一代已移除。文案跟随 DSH
 *      的语言设置。不再使用 localStorage：见本文 apply() 顶部
 *      「Durable preference store」注释。
 *
 * 文档：README.md 为索引；设计语言见 docs/design-language.md，
 * 各开关行为见 docs/features.md，实现决策与实测数据见 docs/engineering-notes.md。
 *
 * 由 dsh-client-modules 以 /plugins/theme-endfield/client.js 形式加载；
 * 通过 `dsh plugin --profile web add github:Cyfarw9dd/dsh-theme-endfield-industries` 安装挂载。
 */
window.__ModuleLoader__.load({
	id: "dsh-theme-endfield",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

function insertCss(css) {
  // Dynamic Cordis runner provides the `styles` global; standalone bundle does not.
  if (typeof styles !== 'undefined' && styles && typeof styles.insert === 'function') {
    return styles.insert(css)
  }
  // Idempotency: the installed bundle can be applied more than once (boot loader +
  // cordis composition both mount it). Never stack duplicate theme stylesheets.
  document.querySelectorAll('style[data-plugin="dsh-theme-endfield"]').forEach((old) => old.remove())
  const el = document.createElement('style')
  el.setAttribute('data-plugin', 'dsh-theme-endfield')
  el.textContent = css
  document.head.appendChild(el)
  return () => {
    if (el.parentNode) el.parentNode.removeChild(el)
  }
}

function apply(ctx) {    // Idempotency: the installed bundle can be applied more than once (boot loader +
    // cordis composition both mount it). Only the first application owns tokens/styles;
    // duplicate overrideTokens would replace the layer and break the toggle's dispose.
    // The flag is RELEASED by the run's dispose (see the ctx.effect cleanup below), so
    // a dispose followed by a re-apply in the same page session mounts the theme again
    // instead of staying dead until a hard reload.
    if (typeof window !== 'undefined' && window.__dshThemeEndfieldApplied) return
    // Claim the flag only once the theme service is actually there: a boot order where
    // it is still missing must not lock the flag in place and kill every later apply.
    const services = createServices(ctx)
    const theme = services.theme()
    if (theme === undefined) return
    if (typeof window !== 'undefined') window.__dshThemeEndfieldApplied = true

    /* ---------- Durable preference store (replaces localStorage) ----------
       The theme's switches used to persist through `localStorage`, which DSH
       Desktop broke on every restart: Desktop binds a fresh random localhost
       port per launch, so the origin (and thus the browser storage scope)
       changed and the saved settings silently reset to defaults.

       The durable authority is DSH's own settings service, and DSH 0.1.7-rc.1
       moved it once more. The whole pre-0.1.7 seam — a host
       `ctx.settings.register(namespace, schema)` persisted by
       `@deepseek-ai/dsh-settings-file` to `<dshHome>/settings.yaml`, mirrored
       to the browser as the `ctx.settingsScope` service — is GONE: the package
       is not in the distribution any more, `settings.yaml` is not the settings
       carrier, and the client has no `settingsScope` service at all.

       What replaced it (see index.js for the host side):

         host    the plugin entry exports a schemastery `Config` whose fields
                 are `.volatile()`. `ctx.settings` projects it into a form and
                 persists user edits into the PROFILE PATCH
                 (<profile>/cordis.patch.yml) through `ctx.configEditor`,
                 i.e. a path owned by DSH and independent of the web origin.
         client  `services.configForms()` (src/client/services.js) — the
                 settings domain's shared-form service — `.get(<profile entry id>)` returns that entry's
                 ConfigForm: getSnapshot() / subscribe() / set() / unset() /
                 mutate().

       The namespace is now the PROFILE ENTRY ID, not a plugin-chosen string:
       this package's cordis.patch.yml inserts `id: theme-endfield`, and
       index.js exports that same id as SETTINGS_ENTRY. Both halves still speak
       the old namespace string for the legacy fallback and as the prefix of
       every UI key in the tables below.

       The >=0.2.0 floor dropped the legacy seam entirely (peerDependencies
       enforces it): a host without `configForms` is not a supported
       configuration, and pages that have none (an out-of-DSH page,
       in-process tests) run on memory defaults below. Either way the values
       live host-side, so:

         dsh web     (browser, fixed loopback port)  -> host persistence
         DSH Desktop (browser, random loopback port) -> host persistence

       Both are loopback pages, so DSH resolves the connection to 'host' mode
       and the values land on disk; a change of port does not move them because
       nothing lives in browser storage any more.

       Value model. Namespace fields are the tails of the old localStorage keys
       and are stored as the same strings, so the semantics (and any older
       <settings.yaml> section from a prior build) keep scanning identically:
         default-ON switches store  '1'  and read as  !== '0'
         default-OFF switches store '0'  and read as  === '1'
         palette/radius/fps/speed  store one of their documented literals.
       FIELD_DEFAULTS is the shipped fallback and mirrors index.js.

       Resilience. Before the transport hands us a section (boot), or in an
       environment with neither settings service at all (an out-of-DSH page,
       in-process tests), the store falls back to FIELD_DEFAULTS overlaid with
       any in-page overrides made this session. Writes are committed to the
       settings transport only when it is ready + writable; otherwise they are
       kept session-local so toggles still work in place but do not persist
       (there is no durable backend to persist to — and no localStorage). */
    /* ---------- 音频通知 preferences (host half owns playback) ----------
       The browser's whole job here is switches, a volume number and the preview
       buttons; every sound is played by the host process, including the previews
       (that is the point: the preview must go through the same path as a real
       notification, or testing it proves nothing). The keys below pass through
       prefsFieldOf unchanged and equal the schema field names, so a switch can
       never write an undeclared field. */
    const AUDIO_ENABLED_KEY = 'audioEnabled'
    const AUDIO_BOOT_KEY = 'audioBoot'
    const AUDIO_TURN_START_KEY = 'audioTurnStart'
    const AUDIO_TURN_DONE_KEY = 'audioTurnDone'
    const AUDIO_VOLUME_KEY = 'audioVolume'
    const AUDIO_HUMAN_ONLY_KEY = 'audioHumanOnly'
    const AUDIO_DIAG_KEY = 'audioDiag'
    const AUDIO_SOUND_DIR_KEY = 'audioSoundDir'
    const AUDIO_STATE_URL = '/theme-endfield/audio/state'
    const AUDIO_PREVIEW_URL = '/theme-endfield/audio/preview'
    const AUDIO_ATTENTION_URL = '/theme-endfield/audio/attention'
    // Default ON for the master switch and both live slots; default OFF for the
    // diagnostics switch, so the host console stays quiet unless asked.
    const isAudioOn = () => prefsGet(AUDIO_ENABLED_KEY) !== '0'
    const isAudioBootOn = () => prefsGet(AUDIO_BOOT_KEY) !== '0'
    const isAudioStartOn = () => prefsGet(AUDIO_TURN_START_KEY) !== '0'
    const isAudioDoneOn = () => prefsGet(AUDIO_TURN_DONE_KEY) !== '0'
    const isAudioHumanOnly = () => prefsGet(AUDIO_HUMAN_ONLY_KEY) !== '0'
    const isAudioDiagOn = () => prefsGet(AUDIO_DIAG_KEY) === '1'
    const readAudioVolume = () => {
      const parsed = Number.parseInt(prefsGet(AUDIO_VOLUME_KEY), 10)
      return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 100
    }
    const readAudioSoundDir = () => prefsGet(AUDIO_SOUND_DIR_KEY) || ''
    /** Ask the host to play one slot through the real notification path. */
    const previewSlot = (slot) => {
      if (typeof fetch !== 'function') return Promise.resolve({ played: false, why: 'no fetch' })
      return fetch(AUDIO_PREVIEW_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slot }),
      }).then(
        (res) => res.json().catch(() => ({ played: false, why: 'bad response' })),
        (error) => ({ played: false, why: String(error && error.message ? error.message : error) }),
      )
    }
    /* ---------- 需要你回应：界面观察器 ----------
       WHY THIS EXISTS. The host-side seams that would normally carry this moment
       (`approval/request`, `user-questions/request`, raised by dsh-user-approval
       and dsh-tool-ask-user) do not fire in every deployment. Measured here: with
       the theme plugin mounted, a question was on screen and ANSWERED while the
       host half's counter stayed at 0 — because `ask_user_question` in this
       composition is provided outside the profile's plugin stack, so
       `dsh-tool-ask-user` never runs and the waterfall is never raised.

       The UI is therefore the only place where "a human must act" is always real.
       The host still owns the sound (switch, volume, debounce) — the page only
       reports that a confirmation box appeared. The host-side listeners stay in
       place for compositions where they DO fire; both paths end at the same slot
       and the host's debounce collapses a double report into one sound.

       ANCHORS: only the per-panel DATA ATTRIBUTES, never a class name.

       A class-based first attempt was tried and it mis-fired in the field:
       `[class*='_card']` matches 15 different components across the installed
       client packages (model selector, agent-preset picker, …) and
       `[class*='_frame']` matches 8, so opening any such card rang the attention
       sound while no confirmation box was on screen. What the panels actually
       expose, verified against the installed packages, is one stable attribute
       each:
         approval panel    <div data-approval-key="…">
         plan review panel <div data-plan-review-key="…">
         question dialog   <div data-question-key="…">

       A marker that disappears in a future UI release silences this feature
       without breaking anything — hence the counter in the settings page, which
       is the only way to notice that the anchors stopped matching. */
    const ATTENTION_MARKERS = [
      { kind: 'approval', selector: '[data-approval-key]' },
      { kind: 'plan-review', selector: '[data-plan-review-key]' },
      { kind: 'question', selector: '[data-question-key]' },
    ];
    // Exposed on the module so a test can assert the anchors stay semantic (see
    // exports.__attentionMarkers at the bottom of this file).
    module.exports.__attentionMarkers = ATTENTION_MARKERS;
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
      return fetch(AUDIO_ATTENTION_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind }),
      }).then(
        (res) => res.json().catch(() => ({ played: false, why: 'bad response' })),
        (error) => ({ played: false, why: String(error && error.message ? error.message : error) }),
      )
    }
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
    let prefsRetryTimer = null // bounded retry for held edits whose ready cue has not arrived
    let prefsSettleTimer = null // bounded settle watch for a transport bound before it was ready
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
    let reconcileFromPrefs = null
    /* True once an authoritative (status:'ready') section has been read for THIS
       page load, plus the one-shot hook the startup surfaces that depend on such a
       section install below. See prefsMarkSettled. */
    let prefsSettledOnce = false
    let onPrefsSettled = null
    /* Whether the settings page has rendered its body, for the boot report: a
       report from a page whose settings page was never opened is expected to
       show nothing, and must not be mistaken for a failure. */
    let panelMounted = false
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
      if (reconcileFromPrefs) try { reconcileFromPrefs() } catch (e) { /* keep going */ }
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
      if (onPrefsSettled) try { onPrefsSettled() } catch (e) { /* keep going */ }
    }
    const dbg = (...a) => { try { if (typeof console !== 'undefined' && console.warn) console.warn('[dsh-theme-endfield:prefs]', ...a) } catch (e) { /* noop */ } }

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
    const prefsSnap = () => {
      const scope = prefsScope
      if (!scope) return null
      try { return scope.getSnapshot() } catch (e) { return null }
    }
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
      const scope = prefsScope
      if (!scope || typeof scope.set !== 'function') return false
      let result = null
      try { result = scope.set(field, String(value)) } catch (e) {
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
      const scope = prefsScope
      if (scope) {
        const snap = prefsSnapshotOf(scope)
        if (prefsDurablyServed(snap)) {
          dbg('commit', field, '=', encoded, 'via', prefsScopeKind, prefsScopeNs, 'status=', snap.status, 'mode=', snap.mode)
          prefsWriteField(field, encoded)
          return true
        }
        dbg('held (namespace not durably served yet)', field, '=', encoded, 'snap=', snap === null ? null : { status: snap.status, writable: snap.writable, mode: snap.mode }, 'hostServes=', prefsServedNamespaces())
      } else {
        dbg('commit with NO settings transport bound (page-local only)', field, encoded, 'hostServes=', prefsServedNamespaces())
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
    /* Sections written by the BUILD THAT SHIPPED THE FIELD-NAME BUG still carry
       the pre-migration spelling of a compound field ('watermarkPersist' written as
       'watermark-persist'), because that write landed on an undeclared key the schema
       passes through instead of storing it into the declared field. Without this
       pass the user's stored choice is ignored and the field default silently
       wins — for them the switch would look like it reset again after the fix.
       Returns the [field, value] pairs whose recorded legacy value is the one to
       honour, i.e. the edits that need re-committing onto the declared field.

       WHEN IS THE DECLARED FIELD THE USER'S OWN VALUE? This is the whole
       question, because a fetched section ALWAYS carries every declared field:
       the schema merges its defaults into the stored section, so
       `hasOwnProperty` cannot tell a user-set value from an implied default.
       And in practice only ONE signal can: a value that differs from the shipped
       default. A declared field sitting at its default is indistinguishable from
       an untouched one — the section is the merged view, so nothing survives in
       it to say whether the document stored that default or the schema inserted
       it. Therefore:

         declared absent or === default  -> nothing recorded a choice for this
                                            field, so the stray legacy key is the
                                            only trace of one: honour it.
         declared set to anything else    -> a correctly-writing build stored it,
                                            so it wins and the stray key is
                                            ignored. (Never let the pre-migration
                                            spelling overwrite a real edit.)

       That makes the migration idempotent in the good direction: after the value
       is re-committed, the declared field is non-default and the stray key can
       never win again. */
    const prefsLegacyFields = (section) => {
      const out = []
      if (section === null || typeof section !== 'object') return out
      for (const field of Object.keys(PREFS_FIELD_TO_LEGACY_KEY)) {
        const legacy = PREFS_FIELD_TO_LEGACY_KEY[field]
        if (!Object.prototype.hasOwnProperty.call(section, legacy)) continue
        const value = section[legacy]
        if (value === undefined || value === null || String(value) === '') continue
        const declared = Object.prototype.hasOwnProperty.call(section, field) ? String(section[field]) : undefined
        if (declared !== undefined && declared !== PREFS_FIELD_DEFAULTS[field]) continue
        out.push([field, String(value)])
      }
      return out
    }
    /* Re-commit a legacy-spelled value onto the declared field, once. Writes go
       through prefsSet, i.e. through the same durable gate as a user toggle: on a
       served scope it lands on the schema field immediately, on one that is not
       served yet it is held and replayed (and mirrored locally, so the theme
       behaves correctly meanwhile). The stale key itself is left in the document
       — the theme no longer declares or reads it, and rewriting a section it does
       not own would be a bigger hammer than the bug deserves. */
    const prefsMigrated = new Set()
    // The section object this pass has already run against. A section is a fresh
    // object on every transport update, so identity is what says "this document
    // has not been examined yet" — and it keeps the pass from re-running against
    // its own writes within the same snapshot.
    let prefsMigratedFor = null
    const prefsMigrateLegacy = (section) => {
      if (section === null || typeof section !== 'object') return
      if (section === prefsMigratedFor) return
      prefsMigratedFor = section
      for (const [field, value] of prefsLegacyFields(section)) {
        if (prefsMigrated.has(field)) continue
        prefsMigrated.add(field)
        dbg('migrating legacy-spelled field', PREFS_FIELD_TO_LEGACY_KEY[field], '->', field, '=', value)
        prefsSet(field, value)
      }
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
          prefsEmit()
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
         prefsMarkSettled() never fired. Everything then fell back to the schema
         defaults until the next reload, even though the Host had served the
         user's values. The bounded settle watch usually rescued it, which is why
         the failure was intermittent rather than total. */
      if (snap.status !== 'ready' && snap.status !== 'unavailable' && snap.status !== 'loading') return
      if (snap.status === 'ready' && snap.value !== undefined) prefsFieldValue = prefsResolveSection(snap.value)
      // An unavailable/loading -> ready transition is precisely when an edit we
      // HELD (see prefsCommit) can finally be written: replay any dirty fields
      // the moment the namespace is durably served. prefsReplayDirty is a no-op
      // when nothing is held or the scope is not yet served.
      prefsReplayDirty()
      // The FIRST served section is also the first chance to see a document the
      // buggy build wrote (before that there is nothing to read), so the legacy
      // repair runs here too — and again on any later section that has not been
      // examined yet. Whatever it queues is replayed below.
      prefsMigrateLegacy(snap.value)
      prefsReplayDirty()
      prefsEmit()
      /* Deliberately last: the startup hook must read the section only after it
         is resolved and migrated (and after prefsEmit has let the layer
         reconciler mount a theme the settled section switched on), and it must
         fire once rather than on every snapshot. */
      if (snap.status === 'ready' && snap.value !== undefined) prefsMarkSettled()
    }
    const prefsBindScope = (acquired) => {
      const scope = acquired.scope
      prefsScope = scope
      prefsScopeKind = acquired.kind
      prefsScopeNs = acquired.ns
      const initial = prefsSnapshotOf(scope)
      if (initial) dbg('bound', acquired.kind, 'ns=', acquired.ns, '; initial status=', initial.status, 'writable=', initial.writable, 'mode=', initial.mode, 'valueKeys=', initial.value ? Object.keys(initial.value).length : 0)
      if (initial && initial.status === 'ready' && initial.value !== undefined) {
        prefsFieldValue = prefsResolveSection(initial.value)
      }
      /* The subscription disposer is RETAINED here (the single-transport version
         dropped it): a ConfigForm is a shared, provider-owned controller, so the
         run's teardown must remove this listener instead of leaking it into the
         next run — see the prefs ctx.effect below. */
      if (typeof scope.subscribe === 'function') {
        try {
          const unsubscribe = scope.subscribe(() => prefsOnScopeChange(scope))
          if (typeof unsubscribe === 'function') prefsUnsubscribe = unsubscribe
        } catch (e) { dbg('subscribe threw', e && e.message) }
      }
      // Catch up: an edit made before the scope settled must still persist. Replay
      // only genuinely user-changed fields (those prefsSet recorded as dirty) that
      // now differ from a freshly-fetched, durably-served host section.
      prefsReplayDirty()
      // Then repair a section the buggy build wrote with the pre-migration field
      // spelling, and re-run the catch-up for whatever that migration queued.
      prefsMigrateLegacy(initial && initial.value)
      prefsReplayDirty()
      /* A section that was ALREADY ready when the scope bound is authoritative on
         the first read too. In practice no hook is installed yet at this point in
         apply() (the boot-loader block below runs later), so this normally just
         records the transition — the plate's own apply()-time read is already
         correct when the section beat apply(), and that path is unchanged. */
      if (initial && initial.status === 'ready' && initial.value !== undefined) prefsMarkSettled()
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
        if (prefsFieldValue === null || prefsDirty.size > 0) prefsOnScopeChange(prefsScope)
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
        prefsEmit()
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
        && snap.writable === true && prefsDirty.size === 0
      if (healthy) return
      dbg('boot report (preferences did NOT reach a durable section):',
        'boundNs=', prefsScopeNs, 'kind=', prefsScopeKind,
        'status=', snap === null ? null : snap.status,
        'mode=', snap === null ? null : snap.mode,
        'writable=', snap === null ? null : snap.writable,
        'valueKeys=', snap && snap.value ? Object.keys(snap.value).length : 0,
        'settled=', prefsSettledOnce,
        'dirty=', Array.from(prefsDirty),
        'panelMounted=', panelMounted,
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
    // Kick off the (re)trying transport acquisition.
    rebindPrefs(0)
    // Dispose on run teardown (mirrors ctx.effect owned resources). One effect
    // owns the whole store — the earlier pair was a strict duplicate — and it
    // also releases the transport subscription: a ConfigForm is shared and
    // provider-owned, so leaving our listener behind would leak it into the
    // next run of this plugin in the same page.
    services.effect(() => () => {
      prefsListeners.length = 0
      prefsReleaseSubscription()
      prefsScope = null
      prefsScopeKind = null
      prefsScopeNs = null
      prefsFieldValue = null
      onPrefsSettled = null
      if (prefsBindTimer !== null && typeof clearTimeout === 'function') clearTimeout(prefsBindTimer)
      prefsBindTimer = null
      if (prefsRetryTimer !== null && typeof clearTimeout === 'function') clearTimeout(prefsRetryTimer)
      prefsRetryTimer = null
      if (prefsSettleTimer !== null && typeof clearTimeout === 'function') clearTimeout(prefsSettleTimer)
      prefsSettleTimer = null
      if (prefsBootReportTimer !== null && typeof clearTimeout === 'function') clearTimeout(prefsBootReportTimer)
      prefsBootReportTimer = null
    })

    const RADIUS_KEY = 'dsh-theme-endfield-radius'
    const ENABLED_KEY = 'dsh-theme-endfield-enabled'
    const isEnabled = () => prefsGet(ENABLED_KEY) !== '0'
    const MOTION_KEY = 'dsh-theme-endfield-motion'
    /* 按钮动效自 2026-10 起是**一套合并设计**（信号母题 × 新会话/审批/表格行 +
       角标母题 × 侧边栏会话行，详见样式表动效区），不再是六选一的方案下拉。
       存储字面量只剩两个：
         'signal' = 开（沿用历史字面量，默认值与旧存量都不用迁移）；
         'off'    = 关。
       读取时把一切旧方案名（silent/impact/clamp/meter/stamp）都并轨为「开」——
       曾经明确选过关闭的用户保持关闭，其余用户直接进入合并设计。 */
    const readMotion = () => (prefsGet(MOTION_KEY) === 'off' ? 'off' : 'signal')
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
      const value = prefsGet(TEXTURE_KEY)
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
      const value = prefsGet(GLASS_KEY)
      return GLASS_OPTIONS.includes(value) ? value : 'off'
    }
    const syncGlass = () => {
      if (typeof document === 'undefined' || document.body === null) return
      const value = readGlass()
      if (isEnabled() && value !== 'off') document.body.setAttribute?.('data-endfield-glass', value)
      else document.body.removeAttribute?.('data-endfield-glass')
    }
    const syncRadiusMode = () => {
      // The bundle can run before <body> exists (see runLoader's DOMContentLoaded
      // deferral for the same window); a classList touch on null would throw and
      // kill the whole install. syncPaletteClass guards the same way.
      if (typeof document === 'undefined' || document.body === null) return
      const mode = prefsGet(RADIUS_KEY) || 'square'
      if (mode === 'round') document.body.classList.add('theme-endfield-round')
      else document.body.classList.remove('theme-endfield-round')
    }

    /* ---------- accent palette: 终末地灰 (default) / 谷地黄 / 武陵青 ----------
       The palette is ONE class on <body>; the stylesheet defines both variable
       sets, so switching is a class flip with no restyling work here. Because the
       app applies its theme tokens as inline body styles and this theme's token
       overrides are var(--edge-accent) references, those tokens re-resolve on the
       same flip — no JS repaint, no theme.overrideTokens() re-registration.

       'valley' (谷地黄, signal yellow) is the DEFAULT, so an unset field and any
       unrecognised value both mean yellow. Only the exact string 'wuling' selects
       武陵青, which keeps a corrupt stored value (schema rejects / outside the
       fallback) from silently changing the shipped look.

       A palette flip made in another tab or restored by the browser is caught by
       the body-class observer below, which re-syncs the class onto the page. */
    const PALETTE_KEY = 'dsh-theme-endfield-palette'
    /* 终末地灰 (gray) is the DEFAULT, so an unset field and any unrecognised value
       both mean gray. Only the exact strings 'valley' / 'wuling' select a bright
       palette, which keeps a corrupt stored value from silently changing the
       shipped look. valley and wuling carry their own body class; gray's class
       exists too (its block overrides the base body block) so every non-default
       state is observable from the DOM. */
    const PALETTE_CLASSES = { gray: 'theme-endfield-gray', wuling: 'theme-endfield-wuling' }
    const readPalette = () => {
      const stored = prefsGet(PALETTE_KEY)
      return stored === 'valley' || stored === 'wuling' ? stored : 'gray'
    }
    /* Read from the DOM, not from storage: the canvas must match what is actually
       on screen. While the theme is switched off the class is absent, so the sheet
       keeps its default palette instead of following an ignored preference. */
    const isPalette = (name) => typeof document !== 'undefined'
      && document.body !== null
      && document.body.classList.contains(PALETTE_CLASSES[name])
    const syncPaletteClass = () => {
      if (typeof document === 'undefined' || document.body === null) return
      // A class only applies while the theme owns the page; unmount() drops it.
      const active = isEnabled() ? readPalette() : null
      for (const [name, cls] of Object.entries(PALETTE_CLASSES)) {
        if (name === active) document.body.classList.add(cls)
        else document.body.classList.remove(cls)
      }
    }

    /* ---------- background ENDFIELD watermark (settings-toggleable) ----------
       Two independent switches:
         WATERMARK_KEY  — the watermark itself (default ON), shown on the hero page.
         WATERMARK_PERSIST_KEY — "keep showing it off the hero page" (default OFF),
           which also paints it on an active conversation / settings / any other page.
       On the hero page the mark is centred on the headline. Off the hero page there
       is no headline to follow, so it is centred in the conversation column instead
       and mounted INSIDE that column rather than on <body>: a fixed body child
       paints above the message text (it has no z-index competitor to lose to),
       which would wash out what the user is reading. See mountPointFor().

       Both placements must stay strictly BEHIND the app's own chrome. That is a
       z-index question in the hero case and it is genuinely subtle -- see the long
       note on s.zIndex in styleWatermark(); it is locked down by
       test/watermark-stacking.test.js, which compares real screenshots because a
       pointer-events:none layer cannot be hit-tested. */
    const WATERMARK_KEY = 'dsh-theme-endfield-watermark'
    const WATERMARK_PERSIST_KEY = 'dsh-theme-endfield-watermark-persist'
    const isWatermarkOn = () => prefsGet(WATERMARK_KEY) !== '0'
    // Default OFF: the hero-only behaviour stays the shipped default.
    const isWatermarkPersistOn = () => prefsGet(WATERMARK_PERSIST_KEY) === '1'
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
      // last resort for a page that has no frame at all. findAppFrame is declared
      // further down but only ever called from here at runtime, never during the
      // synchronous apply pass.
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
    /* ---------- new-session hero brand mark ----------------------------------
       The summer-series 「终末地标识 3」 mark sits ABOVE the hero headline. This is
       plain DOM created here and inserted into the app's own centred column — the
       same decision as the watermark — so the mark takes part in that layout
       instead of being pinned to coordinates a font or locale change invalidates.

       The anchor is found by the stable SUFFIX of the app's CSS-module class, never
       a hash (0.1.2-rc.1 rotated every hash): 0.2.0-rc.2 names the headline ROW
       '*_headline' (fish + title group), 0.1.x named the text node
       '*_headlineText'. The row is preferred because inserting before it puts the
       mark above the whole line rather than beside it. When neither exists — a
       future rename — the mark simply does not appear, and nothing else breaks. */
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
    let watermarkObserver = null
    /* The bundle can be evaluated before <body> exists (the same window runLoader
       defends with a DOMContentLoaded deferral). The old code created the observer
       only when body was already there and never retried, so an early-boot apply
       left the watermark without its (re)attach channel
       for good. Deferred install instead, and right after installing, catch up on
       everything the observer missed while it did not exist yet. */
    const installWatermarkObserver = () => {
      if (watermarkObserver !== null) return
      if (typeof MutationObserver === 'undefined' || typeof document === 'undefined' || document.body === null) return
      watermarkObserver = new MutationObserver(() => {
        syncWatermarkVisibility()
        syncHeroLogo()
      })
      watermarkObserver.observe(document.body, { childList: true, subtree: true })
    }
    const watermarkObserverLate = () => {
      installWatermarkObserver()
      if (watermarkObserver === null) return
      syncWatermarkVisibility()
      syncHeroLogo()
    }
    if (typeof document !== 'undefined' && document.body !== null) installWatermarkObserver()
    else if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('DOMContentLoaded', watermarkObserverLate, { once: true })
    }

    /* ---------- scheme + motion + frame helpers ------------------------------
       These three used to live inside the contour engine; the feature is gone
       but the watermark and loader code still read them. */
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

    // DOM sampling stays outside the extraction kernel, which remains usable
    // by headless geometry tests and future renderers with explicit trail input.
    /* ---------- boot loading screen (settings-toggleable, default OFF) ----------
       Recreates the Endfield launcher boot screen: a full-viewport black plate with
       an 8px signal-yellow progress rail down the left edge, a meter group (tick +
       percentage + status line) that rides the fill end, and the centred ENDFIELD
       wordmark. It plays once per page load, then fades out and removes itself.

       Default OFF as requested: a loading plate that covers the app is opt-in, and
       an off switch must cost nothing, so nothing is built or timed until enabled.

       Geometry is not guessed — it is measured off the reference frame (1340x731):
         rail width 8px, fill 57.5% of viewport height at the captured moment,
         meter left edge x=24, tick 4x15px, digits cap-height 28px (~39px Arial),
         status line 15px below the digits in #666.
       Those ratios are reproduced here as em/percentage values so they hold at any
       viewport size. */
    const LOADER_KEY = 'dsh-theme-endfield-loader'
    // Default OFF (=== '1' rather than !== '0'): opt-in, per the request.
    const isLoaderOn = () => prefsGet(LOADER_KEY) === '1'
    let loaderEl = null
    let loaderRaf = null
    let loaderTick = null
    let loaderFuse = null
    let loaderExitTimer = null
    let loaderPlateH = 0
    let loaderMeterH = 0
    // Last-resort hard kill. Deliberately NOT cleared by clearLoaderTimers(): the
    // completion flourish calls that to stop the progress clocks, and this timer has
    // to outlive it so a stalled flourish can still never leave the app covered.
    let loaderKill = null
    let loaderDone = false
    const clearLoaderTimers = () => {
      if (loaderRaf !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(loaderRaf)
      loaderRaf = null
      if (loaderTick !== null && typeof clearInterval === 'function') clearInterval(loaderTick)
      loaderTick = null
      if (loaderFuse !== null && typeof clearTimeout === 'function') clearTimeout(loaderFuse)
      loaderFuse = null
      if (loaderExitTimer !== null && typeof clearTimeout === 'function') clearTimeout(loaderExitTimer)
      loaderExitTimer = null
    }
    /** Remove the plate and release every timer/handle it owns. Idempotent. */
    const destroyLoader = () => {
      clearLoaderTimers()
      if (loaderKill !== null && typeof clearTimeout === 'function') clearTimeout(loaderKill)
      loaderKill = null
      if (loaderEl && loaderEl.parentNode) loaderEl.parentNode.removeChild(loaderEl)
      loaderEl = null
      loaderPlateH = 0
      loaderMeterH = 0
    }
    /* One boot animation. The progress value is derived from elapsed WALL-CLOCK time,
       never accumulated per frame, so it cannot drift.

       Two clocks drive the same `step`, deliberately:
         requestAnimationFrame — smooth, vsync-aligned updates while the tab paints;
         setInterval           — a coarse fallback that keeps advancing when rAF is
                                 throttled or suspended (background/occluded tab, an
                                 embedded webview, a headless renderer that stops
                                 painting after first paint).
       rAF alone is NOT safe here: when it stalls, a full-screen plate would stay on
       screen forever. Because progress is time-based and `step` is idempotent for a
       given instant, running from both clocks is harmless — whichever fires first
       just renders the current value.

       `loaderFuse` is the last line of defence: a single timeout that force-finishes
       the plate even if both clocks stop, so the app can never stay covered. */
    /* 启动加载动画音. The sound is played by the HOST (lib/audio.js) — the page
       only reports that the plate started, so volume, debounce, the custom-sound
       directory and the slot switch all stay in one place. `audioBootSent` makes
       this exactly once per page load, which is the loader's own contract: the
       预览 button re-runs the plate deliberately and must not re-ring a boot
       sound, and neither must a toggle-on. */
    let audioBootSent = false
    const playBootChime = () => {
      if (audioBootSent) return
      audioBootSent = true
      // Master switch, slot switch and volume are the host's call; the page only
      // avoids the round-trip when the feature is switched off outright.
      if (typeof isAudioOn === 'function' && !isAudioOn()) return
      try {
        previewSlot('boot').catch(() => { /* host bridge absent: boot stays silent */ })
      } catch (e) { /* keep going */ }
    }
    const runLoader = () => {
      // The plate is themed BY this theme: with the master switch off its
      // stylesheet is gone and the plate would render as stray unstyled text in
      // the page flow (the percentage and status rows are real DOM text), so an
      // off switch must not be able to start it — including the settings 预览
      // button and the toggle-on path, which both land here.
      if (!isEnabled()) return
      if (loaderDone || loaderEl !== null) return
      if (typeof document === 'undefined') return
      // The plate is a <body> child. If the client bundle is evaluated before the
      // body exists, defer to DOMContentLoaded instead of silently skipping the
      // animation (loaderDone stays false, so the retry is the real first run).
      if (!document.body) {
        if (typeof document.addEventListener === 'function') {
          document.addEventListener('DOMContentLoaded', () => { runLoader() }, { once: true })
        }
        return
      }
      loaderDone = true
      playBootChime()

      const el = document.createElement('div')
      el.setAttribute('data-endfield-loader', '')
      // Same translation-proofing as the watermark: every glyph the plate shows is
      // brand/UI chrome drawn from CSS `content` or set as textContent on elements
      // marked notranslate, so "translate this page" cannot rewrite ENDFIELD.
      el.setAttribute('translate', 'no')
      el.setAttribute('lang', 'en')
      el.setAttribute('aria-hidden', 'true')
      el.className = 'notranslate'
      /* Poster layout, following the supplied key-art reference (1184x685).
         The brand block is a LEFT-aligned stack that sits in the right third of
         the plate: kicker, END, FIELD, then a detail cluster and the tagline, all
         sharing one left rhythm line. No localized chip — the reference wordmark is
         latin-only, so every glyph here comes from CSS content() and the plate
         carries no translatable DOM text at all.
         The meter (tick + percent + status) RIDES THE FILL END: its top follows the
         rail's fill height, matching the launcher reference where the readout sits
         just under the leading edge of the yellow bar.
         `-wipe` is the completion flourish: once the rail reaches 100% it expands
         from the rail into a full-screen yellow sweep to the right, then the whole
         plate fades out. It is a separate layer so the sweep can cover the brand
         block and meter without disturbing their layout. */
      el.innerHTML =
        '<div data-endfield-loader-tex></div>' +
        '<div data-endfield-loader-track></div>' +
        '<div data-endfield-loader-fill></div>' +
        '<div data-endfield-loader-meter>' +
        '<span data-endfield-loader-tick></span>' +
        '<span data-endfield-loader-pct></span>' +
        '<span data-endfield-loader-status></span>' +
        '</div>' +
        '<div data-endfield-loader-brand>' +
        '<span data-endfield-loader-kicker></span>' +
        '<span data-endfield-loader-word data-endfield-loader-word1></span>' +
        '<span data-endfield-loader-word data-endfield-loader-word2></span>' +
        '<span data-endfield-loader-detail>' +
        '<span data-endfield-loader-chev></span>' +
        '<span data-endfield-loader-sub></span>' +
        '<span data-endfield-loader-seq></span>' +
        '<span data-endfield-loader-squares>' +
        '<i data-on></i><i data-on></i><i data-on></i><i></i><i></i><i></i>' +
        '<i data-on></i><i data-on></i><i></i><i></i><i></i><i></i>' +
        '</span>' +
        '</span>' +
        '<span data-endfield-loader-tag></span>' +
        '</div>' +
        '<div data-endfield-loader-wipe></div>'
      document.body.appendChild(el)
      loaderEl = el

      const fill = el.querySelector('[data-endfield-loader-fill]')
      const meter = el.querySelector('[data-endfield-loader-meter]')
      const pct = el.querySelector('[data-endfield-loader-pct]')
      const status = el.querySelector('[data-endfield-loader-status]')
      const DURATION = 1750
      const start = (typeof performance !== 'undefined' && typeof performance.now === 'function')
        ? performance.now()
        : Date.now()
      loaderPlateH = el.clientHeight || Math.ceil(el.getBoundingClientRect().height) || 0
      loaderMeterH = meter ? Math.ceil(meter.getBoundingClientRect().height) : 0
      const now = () => ((typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now())
      /* Completion sequence, in order:
           WIPE_MS  the rail expands rightward into a full-screen yellow sweep;
           EXIT_MS  the whole plate (yellow included) fades to transparent.
         The fuse below must outlast WIPE_MS + EXIT_MS, or it would tear the plate
         down mid-flourish. */
      const WIPE_MS = 520
      const EXIT_MS = 620
      let finished = false
      /* Play the yellow sweep, then fade out, then remove. Guarded so the two clocks
         plus the fuse can all reach the end without stacking timers, restarting the
         sweep, or double-removing the node.

         Both phases are driven from JS on the same dual-clock/wall-clock basis as
         the progress ramp, NOT from a CSS transition. Measured reason: a CSS
         transition is not a reliable animation primitive in every renderer this
         plate can run in — in the verification renderer a transition declared this
         way emitted no transitionrun/start/end events at all and the computed width
         stayed pinned at its start value indefinitely, which would leave a 10px
         stub on screen instead of a sweep. Driving it here means the flourish
         advances wherever the progress ramp advances, and it stays measurable. */
      const finish = () => {
        if (finished) return
        finished = true
        // Stop the progress clocks but keep the plate: the flourish reuses these
        // handles, so clearLoaderTimers() must not be what tears the node down.
        clearLoaderTimers()
        if (!loaderEl) return
        const el = loaderEl
        const wipeEl = el.querySelector('[data-endfield-loader-wipe]')
        const hasRaf = typeof requestAnimationFrame === 'function'
        const hasTimeout = typeof window !== 'undefined' && typeof window.setTimeout === 'function'
        // Someone who asked for less motion gets the plate gone, not a flourish.
        const reduceMotion = typeof window !== 'undefined'
          && typeof window.matchMedia === 'function'
          && window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (reduceMotion || (!hasRaf && !hasTimeout)) { destroyLoader(); return }
        el.setAttribute('data-endfield-loader-wiping', '')
        // JS owns opacity from here, so the stylesheet transition must not fight it.
        el.style.transition = 'none'
        const t0 = now()
        const plateW = el.clientWidth || 0
        const RAIL = 10
        let exitMarked = false
        const flourish = () => {
          if (!loaderEl) return
          const elapsed = now() - t0
          // phase 1 — sweep out of the rail across the full width
          const wt = Math.min(1, elapsed / WIPE_MS)
          const eased = 1 - Math.pow(1 - wt, 3)
          if (wipeEl) {
            wipeEl.style.opacity = '1'
            wipeEl.style.width = (RAIL + eased * Math.max(0, plateW - RAIL)).toFixed(1) + 'px'
          }
          // phase 2 — fade the whole plate, yellow included
          const fadeMs = elapsed - WIPE_MS
          if (fadeMs > 0) {
            if (!exitMarked) { exitMarked = true; el.setAttribute('data-endfield-loader-exit', '') }
            el.style.opacity = Math.max(0, 1 - fadeMs / EXIT_MS).toFixed(3)
          }
          if (elapsed >= WIPE_MS + EXIT_MS) { destroyLoader(); return }
          loaderRaf = hasRaf ? requestAnimationFrame(flourish) : null
        }
        // First frame synchronously so the sweep never starts from a blank frame.
        flourish()
        if (typeof setInterval === 'function') loaderTick = setInterval(flourish, 30)
        if (hasTimeout) loaderExitTimer = window.setTimeout(destroyLoader, WIPE_MS + EXIT_MS + 400)
      }
      const step = () => {
        if (finished || !loaderEl) return
        const t = Math.min(1, (now() - start) / DURATION)
        // easeOutCubic: quick climb, gentle settle onto 100%.
        const eased = 1 - Math.pow(1 - t, 3)
        const value = Math.round(eased * 100)
        const shown = value + '%'
        if (fill) fill.style.height = (eased * 100).toFixed(2) + '%'
        if (pct && pct.textContent !== shown) pct.textContent = shown
        if (status) {
          const label = value < 45 ? 'Connecting...' : (value < 99 ? 'Updating...' : 'Ready')
          if (status.textContent !== label) status.textContent = label
        }
        /* Meter follows the fill's leading edge, driven by the SAME eased value so
           the bar and its readout can never disagree. Positioned in px and clamped:
           the group is ~90px tall, so a raw percentage would push it off the bottom
           of the screen as the fill nears 100%. GAP keeps the tick just below the
           leading edge (per the reference, the readout trails the edge). Measure
           after updating the text: the initial empty meter is much shorter than the
           completed percentage/status group and would otherwise make 100% overflow.
           Keep extra room below the line box because the percentage uses a compact
           line-height and its glyphs can paint below that box. */
        if (meter) {
          const SAFE_BOTTOM = 64
          if (value >= 100) {
            /* Anchor the completed readout from the bottom. At this point the
               percentage and status have their final font metrics, so bottom
               anchoring is more reliable than clamping a cached top position. */
            meter.style.setProperty('top', 'auto', 'important')
            meter.style.setProperty('bottom', SAFE_BOTTOM + 'px', 'important')
          } else {
            meter.style.removeProperty('bottom')
            meter.style.removeProperty('top')
            const plateRect = el.getBoundingClientRect()
            loaderMeterH = Math.ceil(meter.getBoundingClientRect().height)
            const GAP = 10
            const raw = eased * (plateRect.height || loaderPlateH) + GAP
            const maxTop = Math.max(0, (plateRect.height || loaderPlateH) - loaderMeterH - SAFE_BOTTOM)
            meter.style.top = Math.min(raw, maxTop).toFixed(1) + 'px'
            /* Use the rendered rectangle as the final authority. Font metrics and
               fractional viewport sizes can make the line box differ from the
               cached height, especially in a narrow window. Correct any remaining
               overflow instead of allowing the readout to be clipped. */
            const meterRect = meter.getBoundingClientRect()
            const allowedBottom = plateRect.bottom - SAFE_BOTTOM
            if (meterRect.bottom > allowedBottom) {
              const currentTop = parseFloat(meter.style.top) || 0
              meter.style.top = Math.max(0, currentTop - meterRect.bottom + allowedBottom).toFixed(1) + 'px'
            }
          }
        }
        if (t >= 1) {
          el.setAttribute('data-endfield-loader-complete', '')
          // Hold the completed frame for a beat so 100% is actually readable.
          if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') {
            if (loaderExitTimer === null) loaderExitTimer = window.setTimeout(finish, 220)
          } else finish()
          return
        }
        loaderRaf = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame(step) : null
      }
      // Paint the first frame synchronously: the plate must never flash at 0%/empty.
      step()
      // Clock 2: coarse fallback that survives rAF throttling.
      if (typeof setInterval === 'function') loaderTick = setInterval(step, 60)
      if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') {
        // Fuse: if both progress clocks stall, force the completion sequence.
        loaderFuse = window.setTimeout(() => { finished = false; finish() }, DURATION + 1600)
        // Hard kill: covers the flourish itself stalling (a suspended tab can hold a
        // CSS transition indefinitely). Outlasts fuse + wipe + fade, then removes the
        // node unconditionally, so the app can never stay covered.
        loaderKill = window.setTimeout(destroyLoader, DURATION + 1600 + WIPE_MS + EXIT_MS + 400)
      } else if (loaderRaf === null && loaderTick === null) {
        destroyLoader()
      }
    }

    /* The first authoritative settings section can land AFTER apply() has run (the
       Host serves it over the wire), and until it does every prefsGet falls back
       to the schema default — for the loader that default is '0' ("default off"),
       so the boot-time call in apply() is a silent no-op and the plate never plays
       however the user has it stored. That is the whole "the startup animation
       stopped appearing" symptom, and it is invisible to any test whose fixture
       scope answers 'ready' from the first synchronous read.

       This closes the window. The store calls it once, on the first real section
       of the page load — which IS the "once per page load" moment the boot-time
       call is trying to hit — and the guards below keep every other case out:
         - a section that changes LATER (another window, a reverting host) never
           reaches here at all, because the store fires this hook only once;
         - a plate already played or mid-play is left alone;
         - a user who has answered this question in-session (the settings toggle)
           outranks a section that was still in flight when they answered it. What
           enforces that is prefsGetValue overlaying prefsLocalEdited, so
           isLoaderOn() already reads the session value; the prefsEdited check
           below merely pins the same intent at this call site instead of leaning
           on the overlay's internals. The plain 预览 button needs neither guard:
           runLoader() sets loaderDone the instant it starts. */
    onPrefsSettled = () => {
      if (loaderDone || loaderEl !== null) return
      if (prefsEdited.has('loader')) return
      if (!isEnabled()) return
      if (!isLoaderOn()) return
      runLoader()
    }

    /* ---------- 回合边沿 → 任务完成回执 ----------
       The 任务完成 receipt's trigger is the authoritative ConversationSnapshot.running
       bit, NOT the DOM: one subscription on the session face, and the first
       readable value is a baseline so enabling mid-turn stays silent. Started and
       stopped from the same reconcile points as the other features (mount, master
       switch, teardown); the notification module self-guards its own switch. */
    /* Late-bound on purpose: the sessions service may arrive after apply() (the
       runtime provides it asynchronously and this theme declares no `inject`), so
       a one-shot const would capture undefined for the whole session and the
       receipt would be permanently dead depending on load order. */
    const getSessions = () => services.sessions()
    let turnUnsubList = null
    let turnUnsubSession = null
    let turnRetryTimer = null
    /* Retry budget for turnRebind, bounded like every other retry in this
       file (rebindPrefs 40, settle watch 20): a permanently absent sessions
       service must not leave a 120 ms poll running for the life of the page.
       A settings change re-runs syncTurnWatch -> turnRebind, which restarts
       the budget. */
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
          if (!next) showNotify('done')
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
      if (!(isEnabled() && isNotifyDoneOn())) {
        turnStopWatch()
        return
      }
      // turnRebind() resolves the service itself and re-arms its own retry, so
      // there is nothing to check here — being switched on is the whole condition.
      turnRebind()
    }

    /* ---------- 需要你回应 watcher ----------
       A coarse poll rather than a MutationObserver. The reason is the failure mode
       rather than the cost: an observer watching a container that the app later
       replaces (or an anchor that renders before `document.body` exists) stops
       delivering and cannot tell anyone, while a poll that asks "is a confirmation
       box on screen?" keeps working through any re-render, and its only symptom is
       up to `AUDIO_ATTENTION_POLL_MS` of latency — imperceptible for a chime.

       The edge is "a box is on screen after a moment where none was". A box that
       stays open does not re-report, so a forgotten dialog cannot beep forever; and
       a re-render that briefly drops the node and puts it back would re-report, so
       the poll is deliberately slower than a React remount. Whatever still slips
       through lands on the host's per-slot debounce, which is the backstop for
       every path. */
    /* Detection is edge-triggered on a MutationObserver, with a slow poll as the
       backstop. The first version polled alone at 400ms, which stacked its
       worst-case latency on top of the ~200-400ms it takes the host to cold-start
       the player process — the user measured the total as "a bit delayed". The
       observer cuts the first term to roughly one animation frame; the poll stays
       because an observer bound to a container the app later replaces would stop
       delivering silently, and a poll cannot. Its period is deliberately longer
       than a React remount, so a re-render that briefly drops and re-adds the node
       cannot register as two separate boxes. */
    const AUDIO_ATTENTION_POLL_MS = 1000
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
          if (audioAttentionKind !== null) notifyResolveAttention()
          audioAttentionKind = null
          return
        }
        if (kind === audioAttentionKind) return
        audioAttentionKind = kind
        // Visual half of the same event (self-guarded on the notify switches).
        showNotify(kind)
        if (!isAudioOn()) return
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
    const syncAudioAttentionWatch = () => {
      /* The watch now serves TWO consumers: the audio chime and the visual
         notification, so it must run when EITHER is switched on. The notify
         master alone is not enough — all three kind switches could be off. */
      const notifyWantsWatch = isNotifyOn() && (isNotifyQuestionOn() || isNotifyApproveOn())
      const wanted = isEnabled() && (isAudioOn() || notifyWantsWatch)
      if (wanted && audioAttentionTimer === null && typeof setInterval === 'function') {
        audioAttentionKind = null
        audioAttentionTimer = setInterval(audioAttentionTick, AUDIO_ATTENTION_POLL_MS)
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
    // Exposed so the watcher test can drive the mutation path (the observer's own
    // callback in a browser) without a real MutationObserver.
    module.exports.__attentionCheck = audioAttentionTick
    module.exports.__attentionSchedule = audioAttentionSchedule

    /* ---------- 终末地工业风通知 ----------------------------------------------
       Three triggers, one visual language: 任务完成 (turn end, from the SAME
       ConversationSnapshot.running edge the toasts derive from) and
       提问 / 索权 (the attention watcher's question / approval / plan-review
       kinds). Sound is NOT re-implemented: the existing audio slots already fire
       for exactly these moments (attention via reportAttention above, turn end
       via the host's own listener), so a notification is the VISUAL half of the
       same event and the audio switches keep owning the audible half.

       Lifetime rules differ by urgency, deliberately:
         done      auto-dismisses after NOTIFY_DONE_MS — it is a receipt;
         attention STICKS until the interaction resolves (the watcher's
                   kind -> null transition clears it) or the user dismisses it —
                   these need a human decision, and a receipt-style fade could
                   hide exactly the moment the user was being called for.

       The stack is plain DOM (same decision as the watermark): the panel's
       mini-React owns settings, not page chrome, and a fixed-position stack has
       no interaction with the app's layout. */
    const NOTIFY_KEY = 'dsh-theme-endfield-notify'
    const NOTIFY_DONE_KEY = 'dsh-theme-endfield-notify-done'
    const NOTIFY_QUESTION_KEY = 'dsh-theme-endfield-notify-question'
    const NOTIFY_APPROVE_KEY = 'dsh-theme-endfield-notify-approve'
    // Master default ON: the module was requested as a feature, not as an
    // opt-in experiment. Sub-switches default ON and read independently.
    const isNotifyOn = () => prefsGet(NOTIFY_KEY) !== '0'
    const isNotifyDoneOn = () => prefsGet(NOTIFY_DONE_KEY) !== '0'
    const isNotifyQuestionOn = () => prefsGet(NOTIFY_QUESTION_KEY) !== '0'
    const isNotifyApproveOn = () => prefsGet(NOTIFY_APPROVE_KEY) !== '0'
    /** Does this attention kind have a notification switch flipped on? */
    const notifyWantsKind = (kind) => {
      if (kind === 'question') return isNotifyQuestionOn()
      // plan-review is an approval-family surface (same human decision).
      return isNotifyApproveOn()
    }
    const NOTIFY_DONE_MS = 6000
    let notifyStack = null
    const notifyTimers = new Map() // kind -> dismissal timeout (done only)
    /** The industrial card: square, 2px ink border, paper fill, signal rail. */
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
    // Exposed for tests: drive one notification directly (the done edge needs a
    // sessions service, which in-process harnesses stub differently).
    module.exports.__notifyFire = showNotify
    module.exports.__notifyDismiss = dismissNotify


    let disposeToken = () => {}
    let disposeStyles = () => {}
    let mounted = false
    const mount = () => {
      if (mounted) return
      mounted = true
      disposeToken = theme.overrideTokens('edge-intelligence-theme', {
      '--dsw-alias-bg-base': {
        light: '#e8e8e2',
        dark: '#101110',
      },
      '--dsw-alias-bg-layer-1': {
        light: '#f2f2ec',
        dark: '#181a18',
      },
      '--dsw-alias-bg-layer-2': {
        light: '#dcddd6',
        dark: '#1e201d',
      },
      '--dsw-alias-bg-overlay': {
        light: '#f2f2ec',
        dark: '#1c1e1c',
      },
      /* 菜单/弹层面（@ 与 / 呼出的列表、模型选择、工作区菜单……）。
         上游默认 --dsw-menu-surface-fill 是 **58%/45% alpha 的半透明**
         (#f8f9fa94 / #43454a73)，设计上要配 --dsw-menu-backdrop-filter 的
         blur(40px) 磨砂。本主题没有给菜单接磨砂（玻璃开关只覆盖输入卡与侧栏），
         半透明就只是「透」：正文与背景纹理会从菜单底下渗上来（用户实测反馈）。
         对齐到主题自己的浮层令牌——不透明、与纸面同族，配 0.5px 描边 + 阴影
         分层。若日后玻璃开关要扩到菜单，应整组换（半透明 + backdrop-filter），
         不能只留半透明。 */
      '--dsw-menu-surface-fill': {
        light: '#f2f2ec',
        dark: '#1c1e1c',
      },
      /* 浮动提示气泡（Tooltip 原语，[role='tooltip']，侧栏归档/工具栏按钮的
         hover 提示）。上游默认近黑底白字（tooltip-bg → neutral-bluish 850/750
         ≈ #2c2c2e/#43454a），压在纸墨界面上就是一块死黑。对齐上面的浮层家族
         ——底取 overlay 同值；文字/描边/阴影在样式表的 [role='tooltip'] 规则里
         （bubble 的 color 是类规则里的 --dsw-static-neutral-bluish-00，令牌
         管不到）。key-bg 上游是 color-mix(tooltip-bg, white 18%)：底换成纸面
         后混白与底不可分，改沉底块（layer-3 同值）。 */
      '--dsw-alias-tooltip-bg': {
        light: '#f2f2ec',
        dark: '#1c1e1c',
      },
      '--dsw-alias-tooltip-key-bg': {
        light: '#dcddd6',
        dark: '#2c2e2a',
      },
      '--dsw-alias-border-l1': {
        light: '#d8d9d5',
        dark: '#343633',
      },
      '--dsw-alias-border-l2': {
        light: '#b6b8b3',
        dark: '#4a4d49',
      },
      '--dsw-alias-brand-primary': {
        light: '#101110',
        /* The one ACCENT-carrying token in this layer, so it is the one that must
           not be a literal. A token value may itself be a var() reference: the app
           writes these as inline properties on <body>, the palette variables are
           declared on <body> too, so the reference resolves on the same element and
           re-resolves when the palette class flips — no re-registration of this
           layer, no JS repaint. Verified by test/palette-switch.test.js, which
           caught exactly this token still reading #fff500 after a flip. */
        dark: 'var(--edge-accent)',
      },
      '--dsw-alias-label-primary': {
        light: '#101110',
        dark: '#f5f5f0',
      },
      '--dsw-alias-label-secondary': {
        light: '#4a4c48',
        dark: '#898d89',
      },
      '--dsw-alias-state-error-primary': {
        light: '#ff3b30',
        dark: '#ff6b61',
      },
      '--dsw-alias-state-success-primary': {
        light: '#2f9e44',
        dark: '#4fbf5c',
      },
      '--dsw-alias-state-warn-primary': {
        light: '#d9822b',
        dark: '#ffb700',
      },
      '--dsw-specific-sidebar-fill': {
        light: '#e8e8e2',
        dark: '#101110',
      },
    })

    disposeStyles = insertCss(THEME_CSS + '\n' + GENERATED_CSS)
      syncRadiusMode()
      syncMotion()
      syncGlass()
      syncTexture()
      syncPaletteClass()
    }
    const unmount = () => {
      if (!mounted) return
      mounted = false
      disposeToken()
      disposeStyles()
      disposeToken = () => {}
      disposeStyles = () => {}
      // Guarded like every other body touch: an unload race must not throw here.
      if (typeof document !== 'undefined' && document.body !== null) {
        document.body.classList.remove('theme-endfield-round')
        /* The palette classes must go with the stylesheet that gives them
           meaning: left behind each would be a class nothing defines, and it
           would make isPalette() report a palette the page is no longer using.
           The stored preference is untouched, so re-enabling restores it. */
        for (const cls of Object.values(PALETTE_CLASSES)) document.body.classList.remove(cls)
        document.body.removeAttribute?.('data-endfield-glass')
      }
      // The plate is styled by the theme stylesheet just torn down — an orphaned
      // plate would sit there as an unstyled black-less div, so drop it too.
      destroyLoader()
            /* The announcement plate is styled entirely by that stylesheet too, so an
         in-flight word would become an unstyled, un-positioned block of text in the
         document flow. Stop watching as well: with the theme off there is nothing to
         announce into. */
      /* With the theme off there is nobody to notify: drop the session subscription. */
      turnStopWatch()
      /* The watermark must go with the stylesheet too, and it cannot wait for
         syncWatermarkVisibility(): with the sheet torn down its
         `opacity: var(--edge-wm-alpha)` computes invalid and falls back to 1,
         so an orphaned mark sits on the page as a fully opaque logo stamp.
         This path also runs when the switch is turned off from ANOTHER window
         (reconcileFromPrefs -> unmount), where nothing else removes the node —
         the local toggle path only looked covered because toggleTheme happened
         to call syncWatermarkVisibility() itself. */
      if (watermarkRaf !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(watermarkRaf)
      watermarkRaf = null
      if (watermarkEl !== null && watermarkEl.parentNode) watermarkEl.parentNode.removeChild(watermarkEl)
      watermarkEl = null
      watermarkHost = null
      /* Same reason: the hero mark is styled by the sheet just torn down, so it
         leaves with it. */
      if (heroLogoEl !== null && heroLogoEl.parentNode) heroLogoEl.parentNode.removeChild(heroLogoEl)
      heroLogoEl = null
      // The attention poll belongs to the themed, audio-enabled page; leaving it
      // running would keep reporting confirmations for a theme that is off.
      stopAudioAttentionWatch()
    }

    if (isEnabled()) {
      mount()
      syncWatermarkVisibility()
      syncHeroLogo()
      // Boot animation: only on a real page load, only when switched on, and only
      // after the stylesheet above exists (mount() inserted it).
      if (isLoaderOn()) runLoader()
      // 任务完成回执: subscribes only while that switch is on; its first read is a
      // baseline, so enabling mid-turn stays silent.
      syncTurnWatch()
      // 需要你回应: starts only while the theme and the audio feature are both on.
      syncAudioAttentionWatch()
    }

    /* Live preference reconciler. The namespace scope subscription in the store
       block near the top of apply() calls this every time an authoritative
       section change lands (our own committed writes echo back, another window /
       device edits the same profile's settings document
       (<profile>/cordis.patch.yml on 0.1.7, <dshHome>/settings.yaml before it),
       or the host reverts a value). It mirrors the initial mount block above so a
       runtime change re-paints exactly the live surfaces it can: the master switch mounts/unmounts
       the token + stylesheet layers, then radius/palette/watermark/
       the notification cards re-derive from the new value. The boot loader is deliberately not
       replayed here: it is a once-per-page-load plate, so a mid-session section
       change must not slam a startup animation over a running app. The one thing
       that DOES start it outside apply() is the first authoritative settle
       (onPrefsSettled) — that is the same page-load moment, not a later edit — plus
       the plate's own toggle and 预览 button. Every layer entry point is idempotent
       (mount() and unmount() guard on `mounted`), so repeated echoes are cheap
       and safe. */
    reconcileFromPrefs = () => {
      const enabledNext = isEnabled()
      const enabledNow = mounted
      if (enabledNext && !enabledNow) mount()
      else if (!enabledNext && enabledNow) unmount()
      if (enabledNext) {
        // These sync helpers read the store on each call, so no snapshot passing.
        syncRadiusMode()
        syncMotion()
        syncGlass()
        syncTexture()
        syncPaletteClass()
        syncWatermarkVisibility()
        syncHeroLogo()
        syncTurnWatch()
        // Same reason: it re-reads both switches and starts or stops the poll.
        syncAudioAttentionWatch()
      } else {
        // Switched off mid-session: the watcher must not keep polling a page the
        // theme no longer owns.
        stopAudioAttentionWatch()
      }
    }

    /* ---------- Settings page copy: zh / en dictionaries ----------
       The panel followed DSH's language setting for nothing before this: every
       label was a hardcoded Chinese literal, so an English UI showed a wholly
       Chinese settings page.

       The texts go through the app's own `locale` service (@deepseek-ai/dsh-client-
       locale) rather than a private language guess: it already owns the user's
       preference, its own durable storage and the re-render channel, and reading
       navigator.language here would drift from the setting the user actually chose.

       zh is the source of truth for the key set (this repo's convention) and en is
       kept complete against it — a key present in one and missing in the other would
       silently fall back to the raw key string in the UI, which is why the test suite
       compares the two key sets rather than trusting review.

       Naming: keys are grouped by row (`theme*`, `palette*`, `notify*`) so a row's
       copy stays discoverable next to its switch. */
    const ENDFIELD_NS = 'settings.theme-endfield'
    const LOCALE_ZH = {
      nav: '终末地主题设置',
      /* The separator between a row label and its value. It is a DICTIONARY KEY, not
         a literal: Chinese uses the full-width '：' with no trailing space, English
         the ASCII ': '. Hardcoding the full-width form (as the first version did) put
         a Chinese colon into every English row — subtle, but exactly the kind of
         thing that makes a localized page feel machine-translated. */
      sep: '：',
      on: '开启',
      off: '关闭',
      groupTheme: '主题',
      groupBg: '背景',
      groupAnim: '动画',
      groupNotify: '通知',
      themeRow: '终末地主题',
      paletteRow: '主题配色',
      paletteGray: '终末地灰',
      paletteValley: '谷地黄',
      paletteWuling: '武陵青',
      paletteHintGray: '官网工业灰：悬停/选中用灰阶（亮 #d9d9d9 · 暗 #6a6a6a），默认',
      paletteHintValley: '信号黄 #fff500（终末地官网强调色）',
      paletteHintWuling: '青碧色强调 #14d0d0，用于按钮、悬停与选中行',
      radiusRow: '主题圆角',
      radiusRound: '圆角',
      radiusSquare: '直角',
      watermarkRow: '背景水印',
      wmPersistRow: '水印保持显示',
      wmPersistOn: '保持显示',
      wmPersistOff: '仅新建页',
      wmPersistHintOn: '在对话等非新建会话页面也显示水印（置于正文之下）',
      wmPersistHintOff: '仅在新建会话页显示水印',
      wmPersistNeedWm: '请先开启背景水印',
      loaderRow: '启动加载动画',
      loaderHintOn: '刷新页面时播放 ENDFIELD 启动加载屏（左侧进度轨 + 百分比，跟随当前配色）',
      loaderHintOff: '默认关闭；开启后每次刷新页面播放一次',
      loaderNeed: '请先开启启动加载动画',
      preview: '预览',
      glassRow: '磨砂玻璃',
      glassHint: '只作用于输入卡片：轻微/标准/强 = 8/14/22px 有界局部模糊；右侧面板保持不透明，侧栏仅静态着色',
      glassOff: '关闭',
      glassSubtle: '轻微',
      glassStandard: '标准',
      glassStrong: '强',
      textureRow: '工业底纹',
      textureHint: '官网 /operator 的背景（只作用于主内容列）：上半网格渐隐 + 底部斜纹带 + 两级波纹',
      textureOff: '关闭（纯色）',
      textureSubtle: '轻（网格 + 斜纹）',
      textureStandard: '完整（官网默认）',
      motionRow: '按钮动效',
      motionHint: '合并设计：新会话/审批按钮＝信号箭头滑入，侧边栏会话行＝四角工程角标；全局 .2s 颜色过渡、按下暗一档',
      notifyRow: '工业风通知',
      notifyHintOn: '任务完成自动消失；提问/索权常驻直到处理完成；音效跟随「音频通知」开关',
      notifyHintOff: '默认开启；右下角工业风卡片通知',
      notifyNeed: '请先开启通知',
      notifyDoneRow: '任务完成通知',
      notifyDoneHint: '回合结束时弹出回执卡片，6 秒后自动消失',
      notifyQuestionRow: '提问通知',
      notifyQuestionHint: '助手提问时弹出常驻卡片，回答后自动消失',
      notifyApproveRow: '索权通知',
      notifyApproveHint: '操作授权与方案审阅时弹出常驻卡片，处理完自动消失',
      /* 音频通知：播放发生在宿主进程（lib/audio.js），所以这里的每一行都在
         说明「什么时候响」而不是「怎么响」；各槽位的「预览」按钮走宿主真实
         播放链路（与加载动画行的预览同一个词，不再单用「试听」）。 */
      groupAudio: '音频',
      audioRow: '音频通知',
      audioHintOn: '由宿主进程播放，页面最小化或切到别的应用时同样能听到',
      audioHintOff: '默认关闭；开启后按下面的开关出声（也可以只留想要的几个）',
      audioBootRow: '启动加载动画音',
      audioBootHint: '播放 ENDFIELD 加载板时响一次；只认真正的页面加载，点「预览」重播不会响',
      audioStartRow: '任务开始音',
      audioStartHint: '只在你从会话框提交指令后播放（后台唤醒、目标续跑不计）',
      audioDoneRow: '任务结束音',
      audioDoneHint: '只在我产出最终结果后播放；中途报错或等待审批时不出声',
      audioVolumeRow: '音量',
      audioVolumeHint: '只缩放提示音本身，不改系统音量',
      audioSlotStart: '开始',
      audioSlotDone: '结束',
      audioSlotBoot: '开机',
      audioSlotQuestion: '提问',
      audioSlotApproval: '审批',
      audioSlotUi: '界面',
      audioAttentionRow: '需要你回应',
      audioTurnFailRow: '出错提示音',
      audioAttentionHint: '审批请求、我的提问、计划求批都会响',
      audioReservedNeed: '无事件接线：不需要人工干预的错误保持静音',
      audioSoundDirRow: '自定义音效目录',
      audioSoundDirHint: '把 turn-start.wav / turn-done.wav 放进该目录即可覆盖内置音；留空则查工作区与桌面',
      audioSoundDirDefault: '未设置（用桌面 / 工作区 / 内置音）',
      audioFileRow: '当前音源',
      audioFileBundled: '内置合成音',
      audioFileOwn: '自定义文件',
      audioFileMissing: '未找到文件',
      audioHumanOnlyRow: '开始音仅认会话框',
      audioHumanOnlyOn: '仅会话框',
      audioHumanOnlyOff: '宽松模式',
      audioHumanOnlyHintOn: '只认带提交凭据的用户消息，最不容易误触发',
      audioHumanOnlyHintOff: '任何用户来源消息都算（调试用，后台唤醒可能误响）',
      audioDiagRow: '诊断日志',
      audioDiagHint: '在宿主控制台与 /theme-endfield/audio/state 记录每次事件判定',
      audioTestOk: '已交由宿主播放',
      audioTestFail: '宿主未播放',
      audioNeedOn: '请先开启音频通知',
      audioRefresh: '刷新状态',
    }
    const LOCALE_EN = {
      nav: 'Endfield Theme',
      sep: ': ',
      /* Capitalised: these are VALUES in a "Label: Value" readout, not sentence
         fragments, and the screenshot showed lowercase reading like a typo there. */
      on: 'On',
      off: 'Off',
      groupTheme: 'THEME',
      groupBg: 'BACKGROUND',
      groupAnim: 'ANIMATION',
      groupNotify: 'NOTIFY',
      themeRow: 'Endfield theme',
      paletteRow: 'Accent palette',
      paletteGray: 'Endfield Gray',
      paletteValley: 'Valley Yellow',
      paletteWuling: 'Wuling Cyan',
      paletteHintGray: 'Official industrial gray for hover/selection (light #d9d9d9, dark #6a6a6a); default',
      paletteHintValley: 'Signal yellow #fff500 (the Endfield site accent)',
      paletteHintWuling: 'Teal-cyan accent #14d0d0 for buttons, hover and selected rows',
      radiusRow: 'Corners',
      radiusRound: 'Rounded',
      radiusSquare: 'Square',
      watermarkRow: 'Background wordmark',
      wmPersistRow: 'Keep wordmark visible',
      wmPersistOn: 'Keep visible',
      wmPersistOff: 'New session only',
      wmPersistHintOn: 'Also shown on conversations and other pages, behind the text',
      wmPersistHintOff: 'Shown only on the new-session screen',
      wmPersistNeedWm: 'Turn on the background wordmark first',
      loaderRow: 'Boot animation',
      loaderHintOn: 'Plays the ENDFIELD boot screen on reload (progress rail + percentage, following the palette)',
      loaderHintOff: 'Off by default; plays once on every page reload when enabled',
      loaderNeed: 'Turn on the boot animation first',
      preview: 'Preview',
      glassRow: 'Frosted glass',
      glassHint: 'Composer card only: subtle/standard/strong = 8/14/22px bounded blur; the docked right panel stays opaque, the sidebar gets a static tint only',
      glassOff: 'Off',
      glassSubtle: 'Subtle',
      glassStandard: 'Standard',
      glassStrong: 'Strong',
      textureRow: 'Industrial texture',
      textureHint: 'The official /operator backdrop (main column only): top-fading grid, bottom hatch band, two wave layers',
      textureOff: 'Off (flat colour)',
      textureSubtle: 'Light (grid + hatch)',
      textureStandard: 'Full (official default)',
      motionRow: 'Button motion',
      motionHint: 'One merged design: signal arrow slides into the New-session/approve buttons, sidebar session rows gain corner brackets; .2s colour transitions everywhere, dim on press',
      notifyRow: 'Industrial notify',
      notifyHintOn: 'Task-done auto-dismisses; question/approval stay until resolved; sound follows the audio switches',
      notifyHintOff: 'On by default; industrial toast cards in the bottom-right corner',
      notifyNeed: 'Turn notifications on first',
      notifyDoneRow: 'Task done',
      notifyDoneHint: 'A receipt card on turn end; auto-dismisses after 6s',
      notifyQuestionRow: 'Question',
      notifyQuestionHint: 'A sticky card when the assistant asks; clears when answered',
      notifyApproveRow: 'Approval',
      notifyApproveHint: 'A sticky card for approvals and plan reviews; clears when decided',
      groupAudio: 'AUDIO',
      audioRow: 'Audio notifications',
      audioHintOn: 'Played by the host process, so a minimized page or another app in front still gets the sound',
      audioHintOff: 'Off by default; turning it on enables the slots below (keep only the ones you want)',
      audioBootRow: 'Boot animation sound',
      audioBootHint: 'Rings once when the ENDFIELD boot plate plays; a real page load only — the Preview button replays it silently',
      audioStartRow: 'Task-start sound',
      audioStartHint: 'Plays only after you submit from the composer (wakeups and goal continuations do not count)',
      audioDoneRow: 'Task-end sound',
      audioDoneHint: 'Plays only after the final answer; interrupted turns and approval waits stay silent',
      audioVolumeRow: 'Volume',
      audioVolumeHint: 'Rescales only the notification sound, never the system volume',
      audioSlotStart: 'Start',
      audioSlotDone: 'Done',
      audioSlotBoot: 'Boot',
      audioSlotQuestion: 'Questions',
      audioSlotApproval: 'Approvals',
      audioSlotUi: 'Seen',
      audioAttentionRow: 'Needs your response',
      audioTurnFailRow: 'Error sound',
      audioAttentionHint: 'Fires on approval requests, my questions and plan reviews',
      audioReservedNeed: 'Not wired by design: an error needing no human decision stays silent',
      audioSoundDirRow: 'Custom sound directory',
      audioSoundDirHint: 'Drop turn-start.wav / turn-done.wav there to override the built-in tone; blank falls back to the workspace and the Desktop',
      audioSoundDirDefault: 'Not set (Desktop / workspace / bundled)',
      audioFileRow: 'Current source',
      audioFileBundled: 'Bundled synthesized tone',
      audioFileOwn: 'Your own file',
      audioFileMissing: 'No file found',
      audioHumanOnlyRow: 'Start sound: composer only',
      audioHumanOnlyOn: 'Composer only',
      audioHumanOnlyOff: 'Loose mode',
      audioHumanOnlyHintOn: 'Requires the submission credential a real prompt carries — least likely to misfire',
      audioHumanOnlyHintOff: 'Any user-source message counts (debugging; background wakeups may misfire)',
      audioDiagRow: 'Diagnostics',
      audioDiagHint: 'Logs every event verdict to the host console and /theme-endfield/audio/state',
      audioTestOk: 'Handed to the host',
      audioTestFail: 'The host did not play it',
      audioNeedOn: 'Turn audio notifications on first',
      audioRefresh: 'Refresh state',
    }

    /* The locale service is optional, exactly like `theme` and `sessions`: the
       in-process settings tests mount this theme with a ctx carrying only
       theme/slots, and a composition without the locale plugin must still get a
       working (Chinese) settings page rather than a crash. `t` therefore falls back
       to the zh dictionary, and only the key itself as a last resort — a visible
       key beats a blank row. */
    const locale = services.locale()
    let t = (key) => (Object.prototype.hasOwnProperty.call(LOCALE_ZH, key) ? LOCALE_ZH[key] : key)
    let localeReady = false
    if (locale !== undefined && typeof locale.register === 'function' && typeof locale.bind === 'function') {
      /* Registered through ctx.effect so the dictionaries retire with the run;
         re-applying the bundle would otherwise throw on the duplicate (ns, locale)
         the service rejects by design. */
      services.effect(() => locale.register(ENDFIELD_NS, { zh: LOCALE_ZH, en: LOCALE_EN }))
      const bound = locale.bind(ENDFIELD_NS)
      if (typeof bound === 'function') {
        t = bound
        localeReady = true
      }
    }

    /* ---------- Settings page: 主题 (own settings.section) ---------- */
    const slots = services.slots()
    const disposeRows = []
    let disposeSettings = () => { disposeRows.forEach((d) => d()) }
    if (slots !== undefined) {
      slots.inject('settings.section', () => {
        const d = slots.register(
        /* `label` is a THUNK, not a string: the slot contract re-evaluates it per
           read, so the nav row follows a language switch with no re-registration.

           `locale` is declared ONLY when a locale service actually exists. It is not
           what drives the re-render — ui-renderer's useLocaleRevision subscribes
           EVERY outlet to the locale revision, so this panel re-renders on a language
           switch either way, and the body reads `t` from the apply closure rather than
           from the injected seat. What declaring it buys is the framework's own
           re-derivation of that seat; what it COSTS when the service is missing is a
           hard failure — ui-renderer throws SlotAssemblyError ("entry declares locale
           namespace ... but no locale face is installed") for an entry declaring a
           namespace with no installed face. Declaring it unconditionally would turn a
           composition without the locale plugin from "settings page in Chinese" into
           "settings page crashes", so the key is spread in only when present. */
        Object.assign(
          { name: 'settings.section', id: 'theme-endfield', order: 35, label: () => t('nav') },
          localeReady ? { locale: ENDFIELD_NS } : {}
        ),
        () => {
          const R = (typeof React !== 'undefined') ? React : ((typeof require === 'function') ? require('react') : null)
          if (!R) return null
          const [enabled, setEnabled] = R.useState(isEnabled())
          const [wmOn, setWmOn] = R.useState(isWatermarkOn())
          const [wmPersist, setWmPersist] = R.useState(isWatermarkPersistOn())
          const [loaderOn, setLoaderOn] = R.useState(isLoaderOn())
          const [palette, setPalette] = R.useState(readPalette())
          const [glass, setGlass] = R.useState(readGlass())
          const [texture, setTexture] = R.useState(readTexture())
          const [mode, setMode] = R.useState(prefsGet(RADIUS_KEY) || 'square')
          const [motion, setMotion] = R.useState(readMotion())
          /* 音频通知 is a HOST feature: the browser only owns its switches and
             the preview buttons. `hostState` mirrors what the host half reports
             over /theme-endfield/audio/state (which file each slot actually
             resolved to), so the panel can show the truth instead of assuming
             the bundled tone is in use. */
          const [audioOn, setAudioOn] = R.useState(isAudioOn())
          const [audioBoot, setAudioBoot] = R.useState(isAudioBootOn())
          const [audioStart, setAudioStart] = R.useState(isAudioStartOn())
          const [audioDone, setAudioDone] = R.useState(isAudioDoneOn())
          const [audioVolume, setAudioVolume] = R.useState(readAudioVolume())
          const [audioHumanOnly, setAudioHumanOnly] = R.useState(isAudioHumanOnly())
          const [audioDiag, setAudioDiag] = R.useState(isAudioDiagOn())
          const [hostState, setHostState] = R.useState(null)
          const [previewNote, setPreviewNote] = R.useState('')
          const [notifyOn, setNotifyOn] = R.useState(isNotifyOn())
          const [notifyDone, setNotifyDone] = R.useState(isNotifyDoneOn())
          const [notifyQuestion, setNotifyQuestion] = R.useState(isNotifyQuestionOn())
          const [notifyApprove, setNotifyApprove] = R.useState(isNotifyApproveOn())
          const refreshHostState = () => {
            if (typeof fetch !== 'function') return
            fetch(AUDIO_STATE_URL, { headers: { accept: 'application/json' } })
              .then((res) => (res.ok ? res.json() : null))
              .then((json) => { if (json) setHostState(json) })
              .catch(() => { /* host bridge absent: the rows simply show no source */ })
          }
          /* Re-sync the panel onto the settings section when it finally arrives.
             Every useState above seeded itself from prefsGet() during the FIRST
             render — which, on a real page load, happens while the Host is still
             sending the section, so each read fell back to the schema default.
             Without this effect the switches stayed frozen at those defaults for
             the whole session (the theme's own surfaces recovered, because
             reconcileFromPrefs re-derives them, but the panel's React state had
             no such path): the user sees their settings "reset after refresh"
             even though the values were on disk and the theme was applying them.

             Subscribing to the store rather than using the one-shot
             onPrefsSettled hook is deliberate — that slot is already claimed by
             the boot loader, and a subscription additionally keeps the panel
             honest when the Host or another surface changes a value mid-session.
             prefsEmit runs on every transport snapshot and on every local edit, so
             this simply re-derives the same reads the initializers used; React
             bails out of the re-render when a value is unchanged.

             `useEffect` is feature-detected the way the rest of this panel
             feature-detects React: it must render on a host (or test double)
             whose React face does not expose the hook rather than throwing
             during render. Losing the effect only costs the live re-sync, which
             is no worse than the behaviour before this fix. */
          if (typeof R.useEffect === 'function') {
            panelMounted = true
            /* Re-derive every switch from the store. Kept as one named function so
               the mount pass and every later subscription event run identical
               reads — a switch can never be re-synced from a different source
               than the one the initializers used. */
            const resyncPanelFromPrefs = () => {
              setEnabled(isEnabled())
              setWmOn(isWatermarkOn())
              setWmPersist(isWatermarkPersistOn())
              setLoaderOn(isLoaderOn())
              setNotifyOn(isNotifyOn())
              setNotifyDone(isNotifyDoneOn())
              setNotifyQuestion(isNotifyQuestionOn())
              setNotifyApprove(isNotifyApproveOn())
              setPalette(readPalette())
              setGlass(readGlass())
              setMode(prefsGet(RADIUS_KEY) || 'square')
              setMotion(readMotion())
              /* The 音频 rows seed themselves from the same store, so they are
                 re-derived here as well — the section can arrive after the
                 panel's first render, which would otherwise leave every audio
                 switch frozen at its schema default for the whole session. */
              setAudioOn(isAudioOn())
              setAudioBoot(isAudioBootOn())
              setAudioStart(isAudioStartOn())
              setAudioDone(isAudioDoneOn())
              setAudioVolume(readAudioVolume())
              setAudioHumanOnly(isAudioHumanOnly())
              setAudioDiag(isAudioDiagOn())
            }
            R.useEffect(() => {
              /* Subscribe FIRST, then re-derive once. A subscription alone is not
                 enough: the panel can finish mounting AFTER the section already
                 settled, in which case the ready transition that would have
                 notified it has already been emitted and no later event is
                 guaranteed (the mirror only re-reads on a Host document change or
                 a reconnect). Running the pass here makes the panel's state
                 converge whenever it mounts, with no dependence on
                 having been present for the transition. */
              const unsubscribe = prefsSubscribe(resyncPanelFromPrefs)
              resyncPanelFromPrefs()
              return unsubscribe
            }, [])
            // One read per panel mount: the host is the only authority on which
            // file each slot resolved to, and re-reading on every render would
            // hammer the route while the user drags the volume slider. Guarded
            // with the effect above, because the in-process settings tests drive
            // this panel with a minimal recording React that has no effect hook
            // at all — an unguarded call would turn "cannot refresh the source
            // read-out" into "the whole panel throws".
            R.useEffect(() => { refreshHostState() }, [])
          }
          const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--dsw-alias-border-l1)' }
          const labelStyle = { color: 'var(--dsw-alias-label-primary)', fontSize: '13px', fontWeight: 500, lineHeight: '1.5' }
          // Sub-label explaining what a switch does, so the row is self-describing.
          const hintStyle = { display: 'block', color: 'var(--dsw-alias-label-tertiary)', fontSize: '12px', fontWeight: 400, lineHeight: '1.5', marginTop: '2px' }
          const btnStyleFor = (on, disabled) => {
            /* The switches are themed BY the theme they configure, so while the
               theme is ON the "on" fill reads from the palette variable rather
               than a literal — an inline #fff500 here would keep every enabled
               button yellow while the rest of the UI turned cyan.

               But --edge-accent / --edge-btn-muted live in the theme's own
               stylesheet, which unmount() removes when the theme is switched
               OFF. The hardcoded ink (#000) would then sit on a transparent
               button — invisible in dark mode, where the app panel is dark.
               So when the theme is OFF these buttons fall back to app-native
               tokens (filled chip for "on", outline for "off"), which are the
               same surfaces the rest of the settings page uses. */
            const themed = enabled
            return {
              color: !themed ? 'var(--dsw-alias-label-primary)' : (on ? '#000' : 'var(--dsw-alias-label-primary)'),
              background: !themed
                ? (on ? 'var(--dsw-alias-interactive-bg-hover-solid)' : 'transparent')
                : (on ? 'var(--edge-accent)' : 'var(--edge-btn-muted)'),
              border: '1px solid var(--dsw-alias-border-l2)',
              borderRadius: mode === 'round' ? '999px' : '0',
              /* These buttons share their row with .endfield-select-trigger
                 (height: 32px), so they declare the SAME height from the same
                 source instead of growing out of padding: heights line up,
                 widths stay content-driven. 13px matches the trigger's text. */
              height: '32px',
              boxSizing: 'border-box',
              padding: '0 14px',
              fontSize: '13px',
              // A disabled control has to look disabled, not merely ignore clicks.
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.45 : 1,
              whiteSpace: 'nowrap',
            }
          }
          const setGlassValue = (value) => {
            if (!GLASS_OPTIONS.includes(value)) return
            prefsSet(GLASS_KEY, value)
            setGlass(value)
            syncGlass()
          }
          const setTextureValue = (value) => {
            if (!TEXTURE_OPTIONS.includes(value)) return
            prefsSet(TEXTURE_KEY, value)
            setTexture(value)
            syncTexture()
          }
          /* ---------- toggles ----------
             EVERY handler below derives its `next` value from the STORE
             (prefsGet / the is* / read* readers), never from the React state
             variable of the same name. Those two can disagree, and when they do
             the toggle writes the WRONG value to the durable section:

               - the initial useState(readPalette()) runs while the Host section
                 is still 'loading', so it seeds the schema DEFAULT;
               - the mount effect re-derives it, but that pass and any later
                 subscription pass only run on a store event, so a panel that
                 mounted mid-transition can still be showing a default;
               - prefsGetValue overlays prefsLocalEdited on top of the fetched
                 section, so the store and the rendered switch are two different
                 reads by construction.

             Reading the store here makes the click a decision about the CURRENT
             durable value rather than about whatever the last render happened to
             capture, so a stale panel can no longer persist a default over a
             real choice. The state setter still runs, so the UI follows. */
          const toggleTheme = () => {
            const next = !isEnabled()
            prefsSet(ENABLED_KEY, next ? '1' : '0')
            setEnabled(next)
            if (next) { mount(); syncWatermarkVisibility() }
            else { unmount(); syncWatermarkVisibility() }
            /* The announcement watcher is gated on the master switch too, so it has
               to be reconciled here. unmount() already stops it, but turning the
               theme back ON must restart it — otherwise the feature would stay dead
               until the next page load. */
          }
          /* Palette selection via <select>. Everything visual is carried by the
             class flip inside syncPaletteClass(); a select fires onChange with
             the chosen value, so no cycle order is needed. */
          const setPaletteValue = (value) => {
            if (value !== 'gray' && value !== 'valley' && value !== 'wuling') return
            if (value === readPalette()) return
            prefsSet(PALETTE_KEY, value)
            setPalette(value)
            syncPaletteClass()
          }
          const toggleWm = () => {
            const next = !isWatermarkOn()
            prefsSet(WATERMARK_KEY, next ? '1' : '0')
            setWmOn(next)
            syncWatermarkVisibility()
          }
          /* 按钮动效下拉：'signal'（开，历史字面量）或 'off'。 */
          const motionOn = motion !== 'off'
          const setMotionValue = (value) => {
            if (value !== 'signal' && value !== 'off') return
            if (value === readMotion()) return
            prefsSet(MOTION_KEY, value)
            setMotion(value)
            syncMotion()
          }
          /* Persist as a select (was a two-value cycle button): same pattern. */
          const setWmPersistValue = (value) => {
            const next = value === '1'
            if (next === isWatermarkPersistOn()) return
            prefsSet(WATERMARK_PERSIST_KEY, next ? '1' : '0')
            setWmPersist(next)
            syncWatermarkVisibility()
          }
          const toggleWmPersist = () => {
            const next = !isWatermarkPersistOn()
            prefsSet(WATERMARK_PERSIST_KEY, next ? '1' : '0')
            setWmPersist(next)
            syncWatermarkVisibility()
          }
          /* Notifications. The master re-arms both watchers (the attention poll
             and the shared turn-edge subscription) so a switch flip is live
             without a reload; the sub-switches only gate rendering, which
             showNotify checks per fire. */
          const toggleNotify = () => {
            const next = !isNotifyOn()
            prefsSet(NOTIFY_KEY, next ? '1' : '0')
            setNotifyOn(next)
            syncAudioAttentionWatch()
            if (!next) destroyNotify()
          }
          const toggleNotifyDone = () => {
            const next = !isNotifyDoneOn()
            prefsSet(NOTIFY_DONE_KEY, next ? '1' : '0')
            setNotifyDone(next)
          }
          const toggleNotifyQuestion = () => {
            const next = !isNotifyQuestionOn()
            prefsSet(NOTIFY_QUESTION_KEY, next ? '1' : '0')
            setNotifyQuestion(next)
            syncAudioAttentionWatch()
          }
          const toggleNotifyApprove = () => {
            const next = !isNotifyApproveOn()
            prefsSet(NOTIFY_APPROVE_KEY, next ? '1' : '0')
            setNotifyApprove(next)
            syncAudioAttentionWatch()
          }
          const toggleLoader = () => {
            const next = !isLoaderOn()
            prefsSet(LOADER_KEY, next ? '1' : '0')
            setLoaderOn(next)
            // Turning it on plays it once right away, so the switch shows what it
            // bought instead of making the user reload to find out.
            if (next) { loaderDone = false; destroyLoader(); runLoader() }
            else destroyLoader()
          }
          const replayLoader = () => {
            loaderDone = false
            destroyLoader()
            runLoader()
          }
          /* Radius as a select (was a cycle button): the same shape as the
             palette row — the current value preselects, onChange writes through. */
          const setRadiusValue = (value) => {
            if (value !== 'square' && value !== 'round') return
            if (value === (prefsGet(RADIUS_KEY) || 'square')) return
            prefsSet(RADIUS_KEY, value)
            setMode(value)
            if (value === 'round') document.body.classList.add('theme-endfield-round')
            else document.body.classList.remove('theme-endfield-round')
          }
          const toggleMode = () => {
            const next = (prefsGet(RADIUS_KEY) || 'square') === 'round' ? 'square' : 'round'
            prefsSet(RADIUS_KEY, next)
            setMode(next)
            if (next === 'round') document.body.classList.add('theme-endfield-round')
            else document.body.classList.remove('theme-endfield-round')
          }
          /* ---------- 音频通知 handlers ----------
             A switch writes its field and updates local state; the host half
             watches the same namespace, so the next event uses the new value
             without a reload. The preview buttons deliberately do NOT play
             anything in the browser: they ask the host, so what you hear while
             testing is exactly what a real notification will sound like. */
          const showPreviewNote = (result) => {
            if (result && result.played) setPreviewNote(t('audioTestOk'))
            else setPreviewNote(t('audioTestFail') + (result && result.why ? '：' + result.why : ''))
          }
          const playPreview = (slot) => { previewSlot(slot).then(showPreviewNote) }
          /* One spelling for every action button in the panel: 「预览」, the same
             word the loader row uses. The row label already names the
             slot, so a per-slot suffix would only repeat it. */
          const audioTestButton = (slot) => R.createElement('button', {
            key: 'audio-test-' + slot,
            type: 'button',
            onClick: () => playPreview(slot),
            style: btnStyleFor(false, !audioOn),
            // Previewing while the master switch is off is refused by the host
            // (volume 0 / disabled), so the button says why instead of failing
            // silently.
            disabled: !audioOn,
            title: audioOn ? '' : t('audioNeedOn'),
          }, t('preview'))
          const toggleAudio = () => {
            const next = !audioOn
            prefsSet(AUDIO_ENABLED_KEY, next ? '1' : '0')
            setAudioOn(next)
            // The attention watcher is gated on this switch, so it has to be
            // reconciled here as well as on the pref echo.
            syncAudioAttentionWatch()
            if (next) playPreview('turn-done')
          }
          const toggleAudioStart = () => {
            const next = !audioStart
            prefsSet(AUDIO_TURN_START_KEY, next ? '1' : '0')
            setAudioStart(next)
            if (next) playPreview('turn-start')
          }
          const toggleAudioBoot = () => {
            const next = !audioBoot
            prefsSet(AUDIO_BOOT_KEY, next ? '1' : '0')
            setAudioBoot(next)
            // Preview the boot slot itself: the real one fires from the loader,
            // which is awkward to re-trigger from here.
            if (next) playPreview('boot')
          }
          const toggleAudioDone = () => {
            const next = !audioDone
            prefsSet(AUDIO_TURN_DONE_KEY, next ? '1' : '0')
            setAudioDone(next)
            if (next) playPreview('turn-done')
          }
          const setAudioVolumeValue = (next) => {
            const clamped = Math.min(100, Math.max(0, Math.round(next)))
            prefsSet(AUDIO_VOLUME_KEY, String(clamped))
            setAudioVolume(clamped)
          }
          const toggleAudioHumanOnly = () => {
            const next = !audioHumanOnly
            prefsSet(AUDIO_HUMAN_ONLY_KEY, next ? '1' : '0')
            setAudioHumanOnly(next)
          }
          const toggleAudioDiag = () => {
            const next = !audioDiag
            prefsSet(AUDIO_DIAG_KEY, next ? '1' : '0')
            setAudioDiag(next)
          }
          const applySoundDir = (value) => {
            const text = typeof value === 'string' ? value.trim() : ''
            prefsSet(AUDIO_SOUND_DIR_KEY, text)
            refreshHostState()
          }
          /* 布尔行的下拉写法：与既有 toggle 共用一条路径，仅当值真的变化时才写。
             isOn 读 STORE（与 toggle 的判定源一致）。 */
          const boolSelect = (toggleFn, isOn) => (value) => {
            const next = value === '1'
            if (next === isOn()) return
            toggleFn()
          }
          /* ---------- 下拉用的值写入器：全部走上面既有的 toggle/setter ----------
             每个 toggle 保留自己的副作用（挂载/卸载、预览、重挂监听器……），
             这里只做「值没变就不动」的门卫。 */
          const setThemeValue = boolSelect(toggleTheme, isEnabled)
          const setWmValue = boolSelect(toggleWm, isWatermarkOn)
          const setLoaderValue = boolSelect(toggleLoader, isLoaderOn)
          const setNotifyValue = boolSelect(toggleNotify, isNotifyOn)
          const setNotifyDoneValue = boolSelect(toggleNotifyDone, isNotifyDoneOn)
          const setNotifyQuestionValue = boolSelect(toggleNotifyQuestion, isNotifyQuestionOn)
          const setNotifyApproveValue = boolSelect(toggleNotifyApprove, isNotifyApproveOn)
          /* audio 系列的 toggle 读 React 状态（见各自定义），门卫用同一来源。 */
          const setAudioValue = (value) => { if ((value === '1') !== audioOn) toggleAudio() }
          const setAudioBootValue = (value) => { if ((value === '1') !== audioBoot) toggleAudioBoot() }
          const setAudioStartValue = (value) => { if ((value === '1') !== audioStart) toggleAudioStart() }
          const setAudioDoneValue = (value) => { if ((value === '1') !== audioDone) toggleAudioDone() }
          const setAudioHumanValue = (value) => { if ((value === '1') !== audioHumanOnly) toggleAudioHumanOnly() }
          const setAudioDiagValue = (value) => { if ((value === '1') !== audioDiag) toggleAudioDiag() }
          /** The host's view of one slot, or undefined while it has not answered. */
          const slotState = (slot) => {
            if (hostState === null || !Array.isArray(hostState.slots)) return undefined
            return hostState.slots.find((entry) => entry.id === slot)
          }
          // The two reserved rows have no switch, so their value read-out reports
          // whether the SOUND is previewable instead of pretending to be a toggle.
          const audioTestReady = () => (hostState === null ? true : slotState('attention') !== undefined)
          const sourceSummary = () => {
            const done = slotState('turn-done')
            if (done === undefined) return '—'
            if (done.file === null) return t('audioFileMissing')
            return done.bundled ? t('audioFileBundled') : t('audioFileOwn')
          }
          const sourceDetail = () => {
            const rows = []
            for (const slot of ['boot', 'turn-start', 'turn-done']) {
              const state = slotState(slot)
              const name = slot === 'boot' ? t('audioSlotBoot') : slot === 'turn-start' ? t('audioSlotStart') : t('audioSlotDone')
              rows.push(name + t('sep') + (state === undefined || state.file === null ? t('audioFileMissing') : state.file))
            }
            /* How many intervention requests this host half has actually seen.
               Without it, "no sound" cannot distinguish "the event never reached
               the plugin" from "the plugin chose to stay silent" — the two are
               indistinguishable from the page. Re-open this page (or press 刷新)
               after answering a question to watch the counter move. */
            if (hostState !== null && hostState.attention !== undefined) {
              rows.push(t('audioAttentionRow') + t('sep')
                + t('audioSlotUi') + ' ' + String(hostState.attention.ui)
                + ' / ' + t('audioSlotQuestion') + ' ' + String(hostState.attention.question)
                + ' / ' + t('audioSlotApproval') + ' ' + String(hostState.attention.approval))
            }
            if (hostState !== null && Array.isArray(hostState.log) && hostState.log.length > 0) {
              const last = hostState.log[hostState.log.length - 1]
              rows.push(t('audioDiagRow') + t('sep') + last.kind + (last.detail ? ' ' + last.detail : ''))
            }
            return rows.join('　·　')
          }
          const pageStyle = { maxWidth: '640px', padding: '4px 0 16px' }
          /* The ten switches are grouped into four concerns so the page can be
             scanned instead of read as a flat list: 主题 (master switch +
             appearance), 背景 (watermark), 动画 (boot loader), 通知 and 音频.
             Each group is an editorial numbered header; rows keep their stable
             React keys. The last row of each group drops its divider so the next
             group header's own rule is the only line between groups.

             The header shows the group name in the ACTIVE language plus a latin
             all-caps line. Under English both would collapse to the same word, so
             the second line is dropped there rather than printed twice — the latin
             line is editorial styling for the Chinese name, not a translation. */
          const groupTitle = (no, key, first) => {
            const name = t(key)
            const latin = LOCALE_EN[key]
            const parts = [
              R.createElement('span', { key: 'mark', 'aria-hidden': 'true', style: { width: '4px', height: '14px', flex: '0 0 auto', background: 'currentColor' } }),
              R.createElement('span', { key: 'cn', style: { fontSize: '12px', fontWeight: 600, letterSpacing: '0.14em', lineHeight: '1.5' } }, no + ' ' + name),
            ]
            if (latin !== undefined && latin !== name) {
              parts.push(R.createElement('span', { key: 'en', style: { fontSize: '10px', fontWeight: 500, letterSpacing: '0.2em', opacity: 0.72, lineHeight: '1.5' } }, latin))
            }
            return R.createElement('div', {
              key: 'group-title-' + no,
              className: 'endfield-settings-group-title',
              style: {
                display: 'flex', alignItems: 'center', gap: '8px',
                marginTop: first ? '0' : '26px', paddingBottom: '8px',
                borderBottom: '1px solid var(--dsw-alias-border-l1)',
              },
            }, parts)
          }
          /** "<row label>: <on|off>" — one spelling for every status row. */
          const stateOf = (on) => t(on ? 'on' : 'off')
          const row = (key, last, children) => R.createElement('div', { key, style: last ? { ...rowStyle, borderBottom: 'none' } : rowStyle }, children)
          /* ---------- 统一下拉（.endfield-select）：本面板所有「有值行」的唯一控件 ----------
             形制照抄官网 /operator 的筛选下拉（逐条对照写在样式表 .endfield-select
             段）：触发器 = 深色铭牌上的值 + 圆形箭头；卡片至少与触发器等宽，
             每行只有文字，选中行亮起预建的斜纹底与左缘信号条。

             行为照应用菜单：role=menu 卡片 + role=menuitemradio 选项
             （aria-checked 标当前值，选中样式由本组件自己的规则给出，全局
             「菜单当前项」划词灰规则对本控件开洞）、Escape 与点击面板外收起、
             选中即写值并收起。打开态用 useState 存在本组件里；点外收起的监听器
             在打开时挂、收起时摘，判定「还在本控件内」用 target.closest 对比
             自己的根（R.useRef 特性检测——测试桩没有 ref 也能渲染，只是少了
             点外收起）。theme OFF 时样式表整个卸载，铭牌与圆形箭头图都无从
             显示：触发器退回「值 + 山形箭头」并用应用令牌内联兜底底/字色
             （与 btnStyleFor 的 !themed 分支同一策略），settings-off 的对比度
             探针因此仍然成立。 */
          const endfieldSelect = ({ value, options, ariaLabel, disabled, title, onChange }) => {
            const [open, setOpen] = R.useState(false)
            const rootRef = typeof R.useRef === 'function' ? R.useRef(null) : null
            /* 事件处理器盒子：useState 的初始对象跨渲染是同一个引用（真 React
               与有状态测试桩都如此），可当稳定的实例槽用。 */
            const box = R.useState({ handler: null })[0]
            const closeMenu = () => {
              setOpen(false)
              if (box.handler !== null && typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
                document.removeEventListener('click', box.handler)
                box.handler = null
              }
            }
            const openMenu = () => {
              setOpen(true)
              if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
                /* 打开发生在 trigger 的 click 处理器里；该 click 继续冒泡到
                   document 时监听器已在场，但 target 在自己的根内，会被守卫
                   放行——所以不需要 setTimeout 技巧。 */
                box.handler = (ev) => {
                  const root = rootRef ? rootRef.current : null
                  const target = ev && ev.target
                  if (root && target && typeof target.closest === 'function' && target.closest('.endfield-select') === root) return
                  closeMenu()
                }
                document.addEventListener('click', box.handler)
              }
            }
            const current = options.filter((o) => o.value === value)[0]
            const valueEl = R.createElement('span', { key: 'val', className: 'endfield-select-value' }, current ? current.label : '')
            const plate = enabled
              ? [valueEl,
                R.createElement('span', { key: 'arrow', className: 'endfield-select-arrow', 'aria-hidden': 'true' })]
              : [valueEl,
                R.createElement('svg', { key: 'chev', width: 12, height: 12, viewBox: '0 0 12 12', fill: 'none', 'aria-hidden': 'true' },
                  R.createElement('path', { d: 'M3 4.5L6 7.5L9 4.5', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }))]
            const trigger = R.createElement('button', {
              key: 'trigger', type: 'button', className: 'endfield-select-trigger',
              'aria-haspopup': 'menu', 'aria-expanded': open ? 'true' : 'false',
              'aria-label': ariaLabel, disabled: disabled === true, title: title || '',
              onClick: () => { if (disabled === true) return; if (open) closeMenu(); else openMenu() },
              style: enabled ? undefined : { color: 'var(--dsw-alias-label-secondary)', background: 'var(--dsw-alias-bg-layer-1)' },
            }, plate)
            const menu = (open && disabled !== true) ? R.createElement('div', {
              key: 'menu', className: 'endfield-select-menu', role: 'menu', 'aria-label': ariaLabel,
            }, options.map((o) => R.createElement('button', {
              key: o.value, type: 'button', role: 'menuitemradio', 'aria-checked': o.value === value ? 'true' : 'false',
              className: 'endfield-select-option',
              onClick: () => { if (o.value !== value) onChange(o.value); closeMenu() },
            },
              R.createElement('span', { key: 'bg', className: 'endfield-select-option-bg', 'aria-hidden': 'true' }),
              R.createElement('span', { key: 'l', className: 'endfield-select-option-label' }, o.label)
            ))) : null
            return R.createElement('div', {
              className: 'endfield-select' + (open ? ' is-open' : ''),
              onKeyDown: (e) => { if (e && e.key === 'Escape' && open) closeMenu() },
              ref: rootRef ? (el) => { rootRef.current = el } : undefined,
            }, [trigger, menu])
          }

          return R.createElement('div', { className: 'endfield-settings', style: pageStyle }, [
            /* --- 01 主题：总开关在最前，随后是配色与圆角 --- */
            R.createElement('div', { key: 'group-theme' }, [
              groupTitle('01', 'groupTheme', true),
              row('theme', false, [
                R.createElement('span', { style: labelStyle }, t('themeRow')),
                endfieldSelect({
                  value: enabled ? '1' : '0', ariaLabel: t('themeRow'),
                  options: [{ value: '1', label: t('on') }, { value: '0', label: t('off') }],
                  onChange: setThemeValue,
                })
              ]),
              row('palette', false, [
                R.createElement('span', { style: labelStyle },
                  t('paletteRow'),
                  R.createElement('span', { style: hintStyle },
                    t('paletteHint' + (palette === 'gray' ? 'Gray' : palette === 'wuling' ? 'Wuling' : 'Valley'))
                  )
                ),
                endfieldSelect({
                  value: palette, ariaLabel: t('paletteRow'),
                  options: [
                    { value: 'gray', label: t('paletteGray') },
                    { value: 'valley', label: t('paletteValley') },
                    { value: 'wuling', label: t('paletteWuling') },
                  ],
                  onChange: setPaletteValue,
                })
              ]),
              row('motion', false, [
                R.createElement('span', { style: labelStyle }, t('motionRow'),
                  R.createElement('span', { style: hintStyle }, t('motionHint'))),
                endfieldSelect({
                  value: motionOn ? 'signal' : 'off', ariaLabel: t('motionRow'),
                  options: [{ value: 'signal', label: t('on') }, { value: 'off', label: t('off') }],
                  onChange: setMotionValue,
                })
              ]),
              row('glass', false, [
                R.createElement('span', { style: labelStyle }, t('glassRow'),
                  R.createElement('span', { style: hintStyle }, t('glassHint'))),
                endfieldSelect({
                  value: glass, ariaLabel: t('glassRow'),
                  options: GLASS_OPTIONS.map((value) => ({
                    value, label: t({ off: 'glassOff', subtle: 'glassSubtle', standard: 'glassStandard', strong: 'glassStrong' }[value]),
                  })),
                  onChange: setGlassValue,
                })
              ]),
              row('texture', false, [
                R.createElement('span', { style: labelStyle }, t('textureRow'),
                  R.createElement('span', { style: hintStyle }, t('textureHint'))),
                endfieldSelect({
                  value: texture, ariaLabel: t('textureRow'),
                  options: TEXTURE_OPTIONS.map((value) => ({
                    value, label: t(value === 'off' ? 'textureOff' : value === 'subtle' ? 'textureSubtle' : 'textureStandard'),
                  })),
                  onChange: setTextureValue,
                })
              ]),
              row('radius', true, [
                R.createElement('span', { style: labelStyle }, t('radiusRow')),
                endfieldSelect({
                  value: mode, ariaLabel: t('radiusRow'),
                  options: [
                    { value: 'square', label: t('radiusSquare') },
                    { value: 'round', label: t('radiusRound') },
                  ],
                  onChange: setRadiusValue,
                })
              ]),
            ]),
            /* --- 02 背景：水印，主开关在前、附属开关在后 --- */
            R.createElement('div', { key: 'group-bg' }, [
              groupTitle('02', 'groupBg', false),
              row('watermark', false, [
                R.createElement('span', { style: labelStyle }, t('watermarkRow')),
                endfieldSelect({
                  value: wmOn ? '1' : '0', ariaLabel: t('watermarkRow'),
                  options: [{ value: '1', label: t('on') }, { value: '0', label: t('off') }],
                  onChange: setWmValue,
                })
              ]),
              row('watermark-persist', true, [
                R.createElement('span', { style: labelStyle },
                  t('wmPersistRow'),
                  R.createElement('span', { style: hintStyle },
                    t(wmPersist ? 'wmPersistHintOn' : 'wmPersistHintOff')
                  )
                ),
                endfieldSelect({
                  value: wmPersist ? '1' : '0', ariaLabel: t('wmPersistRow'),
                  options: [
                    { value: '0', label: t('wmPersistOff') },
                    { value: '1', label: t('wmPersistOn') },
                  ],
                  // The choice only has meaning while the watermark itself is on.
                  disabled: !wmOn,
                  title: wmOn ? '' : t('wmPersistNeedWm'),
                  onChange: setWmPersistValue,
                })
              ]),
            ]),
            /* --- 03 动画：启动加载动画 --- */
            R.createElement('div', { key: 'group-anim' }, [
              groupTitle('03', 'groupAnim', false),
              row('loader', true, [
                R.createElement('span', { style: labelStyle },
                  t('loaderRow'),
                  R.createElement('span', { style: hintStyle },
                    t(loaderOn ? 'loaderHintOn' : 'loaderHintOff')
                  )
                ),
                R.createElement('span', { style: { display: 'flex', gap: '8px', flex: '0 0 auto', alignItems: 'center' } },
                  // Replay only makes sense while the feature is on; it lets the user
                  // re-watch the animation without reloading the page.
                  R.createElement('button', {
                    type: 'button',
                    onClick: replayLoader,
                    // The master switch gates this too: the plate is styled by the
                    // stylesheet the master switch removes, so previewing while the
                    // theme is off has nothing to show (runLoader refuses as well).
                    style: btnStyleFor(false, !loaderOn || !enabled),
                    disabled: !loaderOn || !enabled,
                    title: loaderOn ? '' : t('loaderNeed'),
                  }, t('preview')),
                  endfieldSelect({
                    value: loaderOn ? '1' : '0', ariaLabel: t('loaderRow'),
                    options: [{ value: '1', label: t('on') }, { value: '0', label: t('off') }],
                    onChange: setLoaderValue,
                  })
                )
              ]),
            ]),
            /* --- 05 通知：工业风卡片，三触发 --- */
            R.createElement('div', { key: 'group-notify' }, [
              groupTitle('05', 'groupNotify', false),
              row('notify', false, [
                R.createElement('span', { style: labelStyle },
                  t('notifyRow'),
                  R.createElement('span', { style: hintStyle },
                    t(notifyOn ? 'notifyHintOn' : 'notifyHintOff')
                  )
                ),
                endfieldSelect({
                  value: notifyOn ? '1' : '0', ariaLabel: t('notifyRow'),
                  options: [{ value: '1', label: t('on') }, { value: '0', label: t('off') }],
                  onChange: setNotifyValue,
                })
              ]),
              row('notify-done', false, [
                R.createElement('span', { style: labelStyle },
                  t('notifyDoneRow'),
                  R.createElement('span', { style: hintStyle }, t('notifyDoneHint'))
                ),
                endfieldSelect({
                  value: notifyDone ? '1' : '0', ariaLabel: t('notifyDoneRow'),
                  options: [{ value: '1', label: t('on') }, { value: '0', label: t('off') }],
                  disabled: !notifyOn,
                  title: notifyOn ? '' : t('notifyNeed'),
                  onChange: setNotifyDoneValue,
                })
              ]),
              row('notify-question', false, [
                R.createElement('span', { style: labelStyle },
                  t('notifyQuestionRow'),
                  R.createElement('span', { style: hintStyle }, t('notifyQuestionHint'))
                ),
                endfieldSelect({
                  value: notifyQuestion ? '1' : '0', ariaLabel: t('notifyQuestionRow'),
                  options: [{ value: '1', label: t('on') }, { value: '0', label: t('off') }],
                  disabled: !notifyOn,
                  title: notifyOn ? '' : t('notifyNeed'),
                  onChange: setNotifyQuestionValue,
                })
              ]),
              row('notify-approve', true, [
                R.createElement('span', { style: labelStyle },
                  t('notifyApproveRow'),
                  R.createElement('span', { style: hintStyle }, t('notifyApproveHint'))
                ),
                endfieldSelect({
                  value: notifyApprove ? '1' : '0', ariaLabel: t('notifyApproveRow'),
                  options: [{ value: '1', label: t('on') }, { value: '0', label: t('off') }],
                  disabled: !notifyOn,
                  title: notifyOn ? '' : t('notifyNeed'),
                  onChange: setNotifyApproveValue,
                })
              ]),
            ]),
            /* --- 06 音频：两个生效槽位 + 两个预留槽位 ---
               Every row states WHEN it fires, because that is the whole contract
               of this feature; the two reserved rows say outright that they will
               not fire yet, so a switch that does nothing cannot read as broken. */
            R.createElement('div', { key: 'group-audio' }, [
              groupTitle('06', 'groupAudio', false),
              row('audio', false, [
                R.createElement('span', { style: labelStyle },
                  t('audioRow'),
                  R.createElement('span', { style: hintStyle },
                    t(audioOn ? 'audioHintOn' : 'audioHintOff')
                  )
                ),
                endfieldSelect({
                  value: audioOn ? '1' : '0', ariaLabel: t('audioRow'),
                  options: [{ value: '1', label: t('on') }, { value: '0', label: t('off') }],
                  onChange: setAudioValue,
                })
              ]),
              /* The boot row pairs two independent controls stacked on the right:
                 the loader's preview button, and the sound's own on/off select.
                 They are separate because the loader can be on with no sound. */
              row('audio-boot', false, [
                R.createElement('span', { style: labelStyle },
                  t('audioBootRow'),
                  R.createElement('span', { style: hintStyle }, t('audioBootHint'))
                ),
                R.createElement('span', { style: { display: 'flex', flexDirection: 'column', gap: '6px', flex: '0 0 auto', alignItems: 'stretch' } },
                  R.createElement('button', {
                    type: 'button', onClick: replayLoader,
                    style: btnStyleFor(false, !loaderOn || !enabled),
                    disabled: !loaderOn || !enabled,
                    title: loaderOn ? '' : t('loaderNeed'),
                  }, t('preview') + ' · ' + t('loaderRow')),
                  endfieldSelect({
                    value: audioBoot ? '1' : '0', ariaLabel: t('audioBootRow'),
                    options: [{ value: '1', label: t('on') }, { value: '0', label: t('off') }],
                    disabled: !audioOn,
                    title: audioOn ? '' : t('audioNeedOn'),
                    onChange: setAudioBootValue,
                  })
                )
              ]),
              row('audio-start', false, [
                R.createElement('span', { style: labelStyle },
                  t('audioStartRow'),
                  R.createElement('span', { style: hintStyle }, t('audioStartHint'))
                ),
                R.createElement('span', { style: { display: 'flex', gap: '8px', flex: '0 0 auto', alignItems: 'center' } },
                  audioTestButton('turn-start'),
                  endfieldSelect({
                    value: audioStart ? '1' : '0', ariaLabel: t('audioStartRow'),
                    options: [{ value: '1', label: t('on') }, { value: '0', label: t('off') }],
                    disabled: !audioOn,
                    title: audioOn ? '' : t('audioNeedOn'),
                    onChange: setAudioStartValue,
                  })
                )
              ]),
              row('audio-done', false, [
                R.createElement('span', { style: labelStyle },
                  t('audioDoneRow'),
                  R.createElement('span', { style: hintStyle }, t('audioDoneHint'))
                ),
                R.createElement('span', { style: { display: 'flex', gap: '8px', flex: '0 0 auto', alignItems: 'center' } },
                  audioTestButton('turn-done'),
                  endfieldSelect({
                    value: audioDone ? '1' : '0', ariaLabel: t('audioDoneRow'),
                    options: [{ value: '1', label: t('on') }, { value: '0', label: t('off') }],
                    disabled: !audioOn,
                    title: audioOn ? '' : t('audioNeedOn'),
                    onChange: setAudioDoneValue,
                  })
                )
              ]),
              row('audio-volume', false, [
                R.createElement('span', { style: labelStyle },
                  t('audioVolumeRow') + t('sep') + String(audioVolume) + '%',
                  R.createElement('span', { style: hintStyle }, t('audioVolumeHint'))
                ),
                R.createElement('span', { style: { display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' } },
                  R.createElement('input', {
                    type: 'range', min: 0, max: 100, step: 5,
                    'aria-label': t('audioVolumeRow'),
                    value: audioVolume,
                    disabled: !audioOn,
                    onChange: (event) => setAudioVolumeValue(Number(event.target.value)),
                    onMouseUp: () => { previewSlot('turn-done').then(showPreviewNote) },
                    style: { width: '140px', accentColor: enabled ? 'var(--edge-accent)' : undefined },
                  }),
                  R.createElement('span', { style: { ...labelStyle, minWidth: '38px', textAlign: 'right' } }, String(audioVolume) + '%')
                )
              ]),
              row('audio-attention', false, [
                R.createElement('span', { style: labelStyle },
                  t('audioAttentionRow') + t('sep') + stateOf(audioTestReady()),
                  R.createElement('span', { style: hintStyle }, t('audioAttentionHint'))
                ),
                R.createElement('span', { style: { display: 'flex', gap: '8px', flex: '0 0 auto' } },
                  audioTestButton('attention')
                )
              ]),
              row('audio-fail', false, [
                R.createElement('span', { style: labelStyle },
                  t('audioTurnFailRow') + t('sep') + stateOf(audioTestReady()),
                  R.createElement('span', { style: hintStyle }, t('audioReservedNeed'))
                ),
                R.createElement('span', { style: { display: 'flex', gap: '8px', flex: '0 0 auto' } },
                  audioTestButton('turn-fail')
                )
              ]),
              row('audio-source', false, [
                R.createElement('span', { style: labelStyle },
                  t('audioFileRow') + t('sep') + sourceSummary(),
                  R.createElement('span', { style: hintStyle, wordBreak: 'break-all' }, sourceDetail())
                ),
                R.createElement('button', {
                  type: 'button', onClick: () => { setPreviewNote(''); refreshHostState() },
                  style: btnStyleFor(false),
                }, t('audioRefresh'))
              ]),
              row('audio-dir', false, [
                R.createElement('span', { style: labelStyle },
                  t('audioSoundDirRow') + t('sep') + (readAudioSoundDir() || t('audioSoundDirDefault')),
                  R.createElement('span', { style: hintStyle }, t('audioSoundDirHint'))
                ),
                R.createElement('span', { style: { display: 'flex', gap: '8px', flex: '0 0 auto' } },
                  R.createElement('input', {
                    type: 'text',
                    'aria-label': t('audioSoundDirRow'),
                    defaultValue: readAudioSoundDir(),
                    placeholder: t('audioSoundDirDefault'),
                    onKeyDown: (event) => { if (event.key === 'Enter') applySoundDir(event.target.value) },
                    onBlur: (event) => applySoundDir(event.target.value),
                    style: { width: '200px', color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-layer-1)', border: '1px solid var(--dsw-alias-border-l2)', padding: '6px 8px', fontSize: '12px' },
                  })
                )
              ]),
              row('audio-human', false, [
                R.createElement('span', { style: labelStyle },
                  t('audioHumanOnlyRow'),
                  R.createElement('span', { style: hintStyle },
                    t(audioHumanOnly ? 'audioHumanOnlyHintOn' : 'audioHumanOnlyHintOff')
                  )
                ),
                endfieldSelect({
                  value: audioHumanOnly ? '1' : '0', ariaLabel: t('audioHumanOnlyRow'),
                  options: [
                    { value: '1', label: t('audioHumanOnlyOn') },
                    { value: '0', label: t('audioHumanOnlyOff') },
                  ],
                  disabled: !audioOn,
                  title: audioOn ? '' : t('audioNeedOn'),
                  onChange: setAudioHumanValue,
                })
              ]),
              row('audio-diag', true, [
                R.createElement('span', { style: labelStyle },
                  t('audioDiagRow'),
                  R.createElement('span', { style: hintStyle },
                    previewNote !== '' ? previewNote : t('audioDiagHint')
                  )
                ),
                endfieldSelect({
                  value: audioDiag ? '1' : '0', ariaLabel: t('audioDiagRow'),
                  options: [{ value: '1', label: t('on') }, { value: '0', label: t('off') }],
                  onChange: setAudioDiagValue,
                })
              ]),
            ]),
          ])
        }
      )
      disposeRows.push(d)
      return d
    })
    }

    services.effect(() => () => {
      unmount()
      // Release the idempotency flag so a re-apply after this dispose can mount
      // the theme again; leaving it set killed the theme until a hard reload.
      if (typeof window !== 'undefined') window.__dshThemeEndfieldApplied = false
      if (watermarkObserver) watermarkObserver.disconnect()
      /* A deferred observer install may still be waiting on DOMContentLoaded when
         the run ends; drop the pending listener so a disposed run is not wired
         back into the page. removeEventListener is a no-op when it never fired
         or already ran ({ once }), so both branches are safe. */
      if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
        document.removeEventListener('DOMContentLoaded', watermarkObserverLate)
      }
      if (watermarkRaf !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(watermarkRaf)
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') window.removeEventListener('resize', onWatermarkResize)
      if (watermarkEl && watermarkEl.parentNode) watermarkEl.parentNode.removeChild(watermarkEl)
      // The plate owns a rAF handle and a fixed DOM node; both must go with the run.
      destroyLoader()
            /* The announcement feature owns two store subscriptions, a retry timeout and
         a hide timeout, all of which outlive the DOM node — unmount() covers the
         switched-off path, but a fiber unload while the theme is ON must release
         them here too, or the callbacks keep firing against a dead run. */
      turnStopWatch()
      // The notification stack owns DOM nodes and dismissal timers; both go here.
      destroyNotify()
      // Same reason as the announcement watcher: a poll that outlives its fiber
      // keeps POSTing against a dead run.
      stopAudioAttentionWatch()
      disposeSettings()
    })
  }

		exports.name = "dsh-theme-endfield";
		exports.inject = ["theme"];
		exports.apply = apply;
		/* The attention markers are attached by apply() itself (they are declared in
		   its scope) and read by test/audio-attention-watch.test.js, which asserts
		   they stay semantic: a hashed module class would rot on an upstream rebuild
		   and the watcher would just stop matching, with no error anywhere. */
		return module.exports;
	}
});
