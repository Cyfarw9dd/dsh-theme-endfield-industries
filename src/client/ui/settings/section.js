/**
 * ui/settings/section.js — the settings section: locale wiring, the slots
 * injection and the React panel.
 *
 * Extracted from the entry (see TODO.md「入口瘦身」第 4 项). Everything the
 * panel touches arrives by injection: the services adapter (locale/slots/
 * effect), the preference store, the master-switch trio (isEnabled/mount/
 * unmount) and every feature surface it writes through (motionSync, watermark,
 * loader, toasts, attention, audio). The panel is otherwise verbatim the code
 * that lived in the entry — including its useState ORDER, which
 * test/settings-config-forms.test.js pins by index (hooks[4] === glass).
 */
import { ENDFIELD_NS, LOCALE_ZH, LOCALE_EN } from './dictionaries.js'

export function createSettingsSection({ services, prefs, themeApi, motionSync, watermark, loader, toasts, attention, audio, react }) {
  /* A React-less render is a SILENT blank page (nav row present, body empty)
     — the exact shape of the 2026-10 blank-panel regression, which shipped
     unnoticed precisely because nothing was printed. Warn once per run
     instead of once per render (the section outlet re-invokes this factory
     on every settings re-render, so an unguarded warn would flood). */
  let warnedNoReact = false
  const { isEnabled, mount, unmount, enabledKey: ENABLED_KEY } = themeApi
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
        /* React arrives BY INJECTION, not by lookup from here. Two facts make
           every ambient lookup wrong on a real page: (1) the app ships no
           global React (the framework bundle keeps it module-scoped), and (2)
           after the tsdown restructure the panel's component closures live at
           the IIFE top level of the artifact — hoisted out of the
           factory(require) body — so even `typeof require` is 'undefined'
           here. The entry (index.js) resolves React inside apply(), which the
           artifact DOES keep inside the factory body, and passes it down as
           `react`; the global spelling stays as a fallback for hosts and test
           doubles that expose it. null means "no panel" — the slot then
           renders nothing, which is exactly what a React-less page must do
           rather than crash the settings dialog. */
        const R = react || ((typeof React !== 'undefined') ? React : null)
        if (!R) {
          if (!warnedNoReact) {
            warnedNoReact = true
            try { console.warn('[dsh-theme-endfield] settings panel has no React: the section will render blank. Neither the injected `react` nor a global React was available where the panel component runs.') } catch (e) { /* console may be absent */ }
          }
          return null
        }
        const [enabled, setEnabled] = R.useState(isEnabled())
        const [wmOn, setWmOn] = R.useState(watermark.isOn())
        const [wmPersist, setWmPersist] = R.useState(watermark.isPersistOn())
        const [loaderOn, setLoaderOn] = R.useState(loader.isOn())
        const [glass, setGlass] = R.useState(motionSync.readGlass())
        const [texture, setTexture] = R.useState(motionSync.readTexture())
        const [mode, setMode] = R.useState(prefs.get(motionSync.RADIUS_KEY) || 'square')
        const [motion, setMotion] = R.useState(motionSync.readMotion())
        /* 音频通知 is a HOST feature: the browser only owns its switches and
           the preview buttons. `hostState` mirrors what the host half reports
           over /theme-endfield/audio/state (which file each slot actually
           resolved to), so the panel can show the truth instead of assuming
           the bundled tone is in use. */
        const [audioOn, setAudioOn] = R.useState(audio.isOn())
        const [audioBoot, setAudioBoot] = R.useState(audio.isBootOn())
        const [audioStart, setAudioStart] = R.useState(audio.isStartOn())
        const [audioDone, setAudioDone] = R.useState(audio.isDoneOn())
        const [audioVolume, setAudioVolume] = R.useState(audio.readVolume())
        const [audioHumanOnly, setAudioHumanOnly] = R.useState(audio.isHumanOnly())
        const [audioDiag, setAudioDiag] = R.useState(audio.isDiagOn())
        const [hostState, setHostState] = R.useState(null)
        const [previewNote, setPreviewNote] = R.useState('')
        const [notifyOn, setNotifyOn] = R.useState(toasts.isOn())
        const [notifyDone, setNotifyDone] = R.useState(toasts.isDoneOn())
        const [notifyQuestion, setNotifyQuestion] = R.useState(toasts.isQuestionOn())
        const [notifyApprove, setNotifyApprove] = R.useState(toasts.isApproveOn())
        const refreshHostState = () => {
          if (typeof fetch !== 'function') return
          fetch(audio.STATE_URL, { headers: { accept: 'application/json' } })
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => { if (json) setHostState(json) })
            .catch(() => { /* host bridge absent: the rows simply show no source */ })
        }
        /* Re-sync the panel onto the settings section when it finally arrives.
           Every useState above seeded itself from prefs.get() during the FIRST
           render — which, on a real page load, happens while the Host is still
           sending the section, so each read fell back to the schema default.
           Without this effect the switches stayed frozen at those defaults for
           the whole session (the theme's own surfaces recovered, because
           the store's live reconciler re-derives them, but the panel's React state had
           no such path): the user sees their settings "reset after refresh"
           even though the values were on disk and the theme was applying them.

           Subscribing to the store rather than using the one-shot
           settled hook is deliberate — that slot is already claimed by
           the boot loader, and a subscription additionally keeps the panel
           honest when the Host or another surface changes a value mid-session.
           the store emits on every transport snapshot and on every local edit, so
           this simply re-derives the same reads the initializers used; React
           bails out of the re-render when a value is unchanged.

           `useEffect` is feature-detected the way the rest of this panel
           feature-detects React: it must render on a host (or test double)
           whose React face does not expose the hook rather than throwing
           during render. Losing the effect only costs the live re-sync, which
           is no worse than the behaviour before this fix. */
        if (typeof R.useEffect === 'function') {
          prefs.markPanelMounted()
          /* Re-derive every switch from the store. Kept as one named function so
             the mount pass and every later subscription event run identical
             reads — a switch can never be re-synced from a different source
             than the one the initializers used. */
          const resyncPanelFromPrefs = () => {
            setEnabled(isEnabled())
            setWmOn(watermark.isOn())
            setWmPersist(watermark.isPersistOn())
            setLoaderOn(loader.isOn())
            setNotifyOn(toasts.isOn())
            setNotifyDone(toasts.isDoneOn())
            setNotifyQuestion(toasts.isQuestionOn())
            setNotifyApprove(toasts.isApproveOn())
            setGlass(motionSync.readGlass())
            setTexture(motionSync.readTexture())
            setMode(prefs.get(motionSync.RADIUS_KEY) || 'square')
            setMotion(motionSync.readMotion())
            /* The 音频 rows seed themselves from the same store, so they are
               re-derived here as well — the section can arrive after the
               panel's first render, which would otherwise leave every audio
               switch frozen at its schema default for the whole session. */
            setAudioOn(audio.isOn())
            setAudioBoot(audio.isBootOn())
            setAudioStart(audio.isStartOn())
            setAudioDone(audio.isDoneOn())
            setAudioVolume(audio.readVolume())
            setAudioHumanOnly(audio.isHumanOnly())
            setAudioDiag(audio.isDiagOn())
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
            const unsubscribe = prefs.listen(resyncPanelFromPrefs)
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
          if (!motionSync.GLASS_OPTIONS.includes(value)) return
          prefs.set(motionSync.GLASS_KEY, value)
          setGlass(value)
          motionSync.syncGlass()
        }
        const setTextureValue = (value) => {
          if (!motionSync.TEXTURE_OPTIONS.includes(value)) return
          prefs.set(motionSync.TEXTURE_KEY, value)
          setTexture(value)
          motionSync.syncTexture()
        }
        /* ---------- toggles ----------
           EVERY handler below derives its `next` value from the STORE
           (prefs.get / the is* / read* readers), never from the React state
           variable of the same name. Those two can disagree, and when they do
           the toggle writes the WRONG value to the durable section:

             - the initial useState(read*()) runs while the Host section
               is still 'loading', so it seeds the schema DEFAULT;
             - the mount effect re-derives it, but that pass and any later
               subscription pass only run on a store event, so a panel that
               mounted mid-transition can still be showing a default;
             - the store's read overlay covers session-edited fields over the fetched
               section, so the store and the rendered switch are two different
               reads by construction.

           Reading the store here makes the click a decision about the CURRENT
           durable value rather than about whatever the last render happened to
           capture, so a stale panel can no longer persist a default over a
           real choice. The state setter still runs, so the UI follows. */
        const toggleTheme = () => {
          const next = !isEnabled()
          prefs.set(ENABLED_KEY, next ? '1' : '0')
          setEnabled(next)
          if (next) { mount(); watermark.sync() }
          else { unmount(); watermark.sync() }
          /* The watchers are gated on the master switch too, so they have
             to be reconciled here. unmount() already stops them, but turning
             the theme back ON must restart them — otherwise the features
             would stay dead until the next page load. (The reconciler
             installed below covers the same cases on the next section echo;
             this keeps the panel's own click path immediate.) */
        }
        const toggleWm = () => {
          const next = !watermark.isOn()
          prefs.set(watermark.KEY, next ? '1' : '0')
          setWmOn(next)
          watermark.sync()
        }
        /* 按钮动效下拉：'signal'（开，历史字面量）或 'off'。 */
        const motionOn = motion !== 'off'
        const setMotionValue = (value) => {
          if (value !== 'signal' && value !== 'off') return
          if (value === motionSync.readMotion()) return
          prefs.set(motionSync.MOTION_KEY, value)
          setMotion(value)
          motionSync.syncMotion()
        }
        /* Persist as a select (was a two-value cycle button): same pattern. */
        const setWmPersistValue = (value) => {
          const next = value === '1'
          if (next === watermark.isPersistOn()) return
          prefs.set(watermark.PERSIST_KEY, next ? '1' : '0')
          setWmPersist(next)
          watermark.sync()
        }
        const toggleWmPersist = () => {
          const next = !watermark.isPersistOn()
          prefs.set(watermark.PERSIST_KEY, next ? '1' : '0')
          setWmPersist(next)
          watermark.sync()
        }
        /* Notifications. The master re-arms the attention watcher so a switch
           flip is live without a reload; the sub-switches only gate rendering,
           which toasts.show checks per fire. */
        const toggleNotify = () => {
          const next = !toasts.isOn()
          prefs.set(toasts.KEY, next ? '1' : '0')
          setNotifyOn(next)
          attention.sync()
          if (!next) toasts.destroy()
        }
        const toggleNotifyDone = () => {
          const next = !toasts.isDoneOn()
          prefs.set(toasts.DONE_KEY, next ? '1' : '0')
          setNotifyDone(next)
        }
        const toggleNotifyQuestion = () => {
          const next = !toasts.isQuestionOn()
          prefs.set(toasts.QUESTION_KEY, next ? '1' : '0')
          setNotifyQuestion(next)
          attention.sync()
        }
        const toggleNotifyApprove = () => {
          const next = !toasts.isApproveOn()
          prefs.set(toasts.APPROVE_KEY, next ? '1' : '0')
          setNotifyApprove(next)
          attention.sync()
        }
        const toggleLoader = () => {
          const next = !loader.isOn()
          prefs.set(loader.KEY, next ? '1' : '0')
          setLoaderOn(next)
          // Turning it on plays it once right away, so the switch shows what it
          // bought instead of making the user reload to find out.
          if (next) loader.replay()
          else loader.destroy()
        }
        const replayLoader = () => { loader.replay() }
        /* Radius as a select (was a cycle button): the current value
           preselects, onChange writes through. */
        const setRadiusValue = (value) => {
          if (value !== 'square' && value !== 'round') return
          if (value === (prefs.get(motionSync.RADIUS_KEY) || 'square')) return
          prefs.set(motionSync.RADIUS_KEY, value)
          setMode(value)
          if (value === 'round') document.body.classList.add('theme-endfield-round')
          else document.body.classList.remove('theme-endfield-round')
        }
        const toggleMode = () => {
          const next = (prefs.get(motionSync.RADIUS_KEY) || 'square') === 'round' ? 'square' : 'round'
          prefs.set(motionSync.RADIUS_KEY, next)
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
        const playPreview = (slot) => { audio.previewSlot(slot).then(showPreviewNote) }
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
          prefs.set(audio.KEYS.enabled, next ? '1' : '0')
          setAudioOn(next)
          // The attention watcher is gated on this switch, so it has to be
          // reconciled here as well as on the pref echo.
          attention.sync()
          if (next) playPreview('turn-done')
        }
        const toggleAudioStart = () => {
          const next = !audioStart
          prefs.set(audio.KEYS.turnStart, next ? '1' : '0')
          setAudioStart(next)
          if (next) playPreview('turn-start')
        }
        const toggleAudioBoot = () => {
          const next = !audioBoot
          prefs.set(audio.KEYS.boot, next ? '1' : '0')
          setAudioBoot(next)
          // Preview the boot slot itself: the real one fires from the loader,
          // which is awkward to re-trigger from here.
          if (next) playPreview('boot')
        }
        const toggleAudioDone = () => {
          const next = !audioDone
          prefs.set(audio.KEYS.turnDone, next ? '1' : '0')
          setAudioDone(next)
          if (next) playPreview('turn-done')
        }
        const setAudioVolumeValue = (next) => {
          const clamped = Math.min(100, Math.max(0, Math.round(next)))
          prefs.set(audio.KEYS.volume, String(clamped))
          setAudioVolume(clamped)
        }
        const toggleAudioHumanOnly = () => {
          const next = !audioHumanOnly
          prefs.set(audio.KEYS.humanOnly, next ? '1' : '0')
          setAudioHumanOnly(next)
        }
        const toggleAudioDiag = () => {
          const next = !audioDiag
          prefs.set(audio.KEYS.diag, next ? '1' : '0')
          setAudioDiag(next)
        }
        const applySoundDir = (value) => {
          const text = typeof value === 'string' ? value.trim() : ''
          prefs.set(audio.KEYS.soundDir, text)
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
        const setWmValue = boolSelect(toggleWm, () => watermark.isOn())
        const setLoaderValue = boolSelect(toggleLoader, () => loader.isOn())
        const setNotifyValue = boolSelect(toggleNotify, () => toasts.isOn())
        const setNotifyDoneValue = boolSelect(toggleNotifyDone, () => toasts.isDoneOn())
        const setNotifyQuestionValue = boolSelect(toggleNotifyQuestion, () => toasts.isQuestionOn())
        const setNotifyApproveValue = boolSelect(toggleNotifyApprove, () => toasts.isApproveOn())
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
                options: motionSync.GLASS_OPTIONS.map((value) => ({
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
                options: motionSync.TEXTURE_OPTIONS.map((value) => ({
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
                  // theme is off has nothing to show (loader.run refuses as well).
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
                  onMouseUp: () => { audio.previewSlot('turn-done').then(showPreviewNote) },
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
                t('audioSoundDirRow') + t('sep') + (audio.readSoundDir() || t('audioSoundDirDefault')),
                R.createElement('span', { style: hintStyle }, t('audioSoundDirHint'))
              ),
              R.createElement('span', { style: { display: 'flex', gap: '8px', flex: '0 0 auto' } },
                R.createElement('input', {
                  type: 'text',
                  'aria-label': t('audioSoundDirRow'),
                  defaultValue: audio.readSoundDir(),
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

  // The run teardown calls this: every registered row disposer in order.
  return disposeSettings
}
