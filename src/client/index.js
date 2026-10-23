import TOKENS_CSS from '../styles/tokens.css?raw'
import DECOR_CSS from '../styles/decor.css?raw'
import INTERACTION_CSS from '../styles/interaction.css?raw'
import CHROME_CSS from '../styles/chrome.css?raw'
import SURFACES_CSS from '../styles/surfaces.css?raw'
import OVERLAYS_CSS from '../styles/overlays.css?raw'
import GENERATED_CSS from '../styles/generated.css?raw'
import { createServices } from './services.js'
import { createPrefsStore } from './prefs/store.js'
import { createPrefsTransport } from './prefs/transport.js'
import { createWatermark } from './decor/watermark.js'
import { createHeroLogo } from './decor/hero-logo.js'
import { createLoader } from './decor/loader.js'
import { createBodyObserver } from './decor/body-observer.js'
import { createAudioPrefs } from './notify/audio.js'
import { createToasts } from './notify/toast.js'
import { createAttentionWatch } from './notify/attention.js'
import { createTurnWatch } from './notify/turn-watch.js'
import { createMotionSync } from './motion/sync.js'
import { createSettingsSection } from './ui/settings/section.js'
import { THEME_TOKEN_OVERRIDES } from './ui/tokens.js'
/**
 * dsh-theme-endfield — Edge Intelligence Theme (browser client bundle)
 * 还原自《明日方舟：终末地》（Arknights: Endfield）官网的「工业编辑风」。
 * 参考：https://endfield.hypergryph.com
 *
 * 本文件只是组合根（模块图见 docs/architecture.md）：services → prefs →
 * motion/notify/decor 各面 → settings 注册 → run effect。两样只有这里能做：
 *   1) theme.overrideTokens 注册令牌层（字面量在 ui/tokens.js）+ insertCss
 *      注入样式层（清单见 scripts/lib/sources.js；动态插件环境走 styles.insert，
 *      独立 bundle 时直接注入 <style>）——mount/unmount 管两层生命周期；
 *   2) prefs.setReconciler 的编排：主开关翻 mount/unmount，其余各面 sync()。
 * 设置持久化走 ctx.configForms（下限 DSH 0.2.0）；文案/词典在
 * ui/settings/dictionaries.js；不再使用 localStorage。
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
       The entry is only the composition root now: prefs/store.js owns the
       values, the durable write gate and the held-edit queue, and
       prefs/transport.js owns the settings-form binding (candidate spellings,
       late retries, settle watch, boot report). Both take their dependencies
       explicitly; the debug sink below is the one this file still owns, and the
       late-bound hooks (the live reconciler / the settled hook) stay with the
       surfaces that own them. Rationale lives in the two module headers. */
    const dbg = (...a) => { try { if (typeof console !== 'undefined' && console.warn) console.warn('[dsh-theme-endfield:prefs]', ...a) } catch (e) { /* noop */ } }
    const prefs = createPrefsStore({ debug: (...a) => dbg(...a) })
    createPrefsTransport({ services, debug: (...a) => dbg(...a), store: prefs })
    /* One run-scoped effect owns every timer, listener and transport
       subscription the store holds (its dispose releases the transport's too:
       a ConfigForm is shared and provider-owned, so a leaked listener would
       outlive the run in the next mount of this plugin). */
    services.effect(() => () => prefs.dispose())
    const ENABLED_KEY = 'dsh-theme-endfield-enabled'
    const isEnabled = () => prefs.get(ENABLED_KEY) !== '0'

    /* ---------- motion: the <body> attribute/class sync layer ----------
       Extracted into src/client/motion/sync.js (TODO 清单第 3 项): radius
       class, motion/glass/texture attributes, palette classes, plus the DOM
       predicates (scheme / reduced-motion / app-frame). Injected: prefs +
       the master-switch reader. The entry calls motionSync.syncAll() at every
       reconcile point and motion.detach() on unmount; the panel write-through
       paths use the per-surface readers/syncs. */
    const motionSync = createMotionSync({ prefs, isEnabled })
    /* ---------- notify: audio prefs / toasts / attention / turn watch ----------
       Extracted into src/client/notify/ (TODO 清单第 2 项): audio.js owns the
       browser half of 音频通知 (switches, volume, preview/report round-trips),
       toast.js owns the industrial cards and their four switches,
       attention.js owns the 需要你回应 anchors + watcher (mutation observer
       with a poll backstop, feeding BOTH the chime report and the toast),
       turn-watch.js owns the 回合边沿 → 任务完成 receipt trigger (the ONE
       ConversationSnapshot.running subscription). Dependencies are injected
       by hand and nothing here reads a closure of apply() directly; the entry
       wires the test seams (module.exports.__*) that the pre-split entry
       attached itself. The composition must sit ABOVE the decor composition:
       the boot loader reads audio.isOn / audio.previewSlot. */
    const audio = createAudioPrefs({ prefs })
    const toasts = createToasts({ prefs, isEnabled })
    const turnWatch = createTurnWatch({ services, debug: (...a) => dbg(...a), isEnabled, isDoneOn: toasts.isDoneOn, showToast: toasts.show })
    const attention = createAttentionWatch({ isEnabled, audio, toasts })
    /* Test seams: driven by test/audio-attention-watch.test.js (markers stay
       semantic; the mutation path is drivable without a real observer) and
       test/notify.test.js (fire/dismiss one notification directly). */
    module.exports.__attentionMarkers = attention.MARKERS
    module.exports.__attentionCheck = attention.tick
    module.exports.__attentionSchedule = attention.schedule
    module.exports.__notifyFire = toasts.show
    module.exports.__notifyDismiss = toasts.dismiss

    /* ---------- decor: watermark / hero mark / boot plate ----------
       Extracted into src/client/decor/ (one module per surface, plus the one
       body observer the watermark and hero mark share — one observer, two
       layers). Dependencies are injected by hand: prefs + the master-switch
       reader for every surface, findAppFrame for the watermark's third
       placement, and the host-audio seams (audio.isOn / audio.previewSlot) for
       the loader's boot chime. The composition sits BELOW the motion and notify
       compositions on purpose: the factories receive real function references,
       not thunks, so a forward declaration would be a TDZ ReferenceError. The
       entry only composes and calls: sync() at the reconcile points, detach()
       on unmount, dispose() at run teardown. */
    const watermark = createWatermark({ prefs, isEnabled, findAppFrame: motionSync.findAppFrame })
    const heroLogo = createHeroLogo({ isEnabled })
    const loader = createLoader({ prefs, isEnabled, isAudioOn: audio.isOn, previewSlot: audio.previewSlot })
    const bodyObserver = createBodyObserver()
    bodyObserver.add(() => watermark.sync())
    bodyObserver.add(() => heroLogo.sync())
    bodyObserver.start()

    let disposeToken = () => {}
    let disposeStyles = () => {}
    let mounted = false
    const mount = () => {
      if (mounted) return
      mounted = true
      disposeToken = theme.overrideTokens('edge-intelligence-theme', THEME_TOKEN_OVERRIDES)

    disposeStyles = insertCss(TOKENS_CSS + DECOR_CSS + INTERACTION_CSS + CHROME_CSS + SURFACES_CSS + OVERLAYS_CSS + GENERATED_CSS)
      motionSync.syncAll()
    }
    const unmount = () => {
      if (!mounted) return
      mounted = false
      disposeToken()
      disposeStyles()
      disposeToken = () => {}
      disposeStyles = () => {}
      // The radius/palette classes and the glass attribute must go with the
      // stylesheet that gives them meaning (guarded like every other body
      // touch: an unload race must not throw here).
      motionSync.detach()
      // The plate is styled by the theme stylesheet just torn down — an orphaned
      // plate would sit there as an unstyled black-less div, so drop it too.
      loader.destroy()
      /* With the theme off there is nobody to notify: drop the session subscription. */
      turnWatch.stop()
      /* The watermark must go with the stylesheet too, and it cannot wait for
         watermark.sync(): with the sheet torn down its
         `opacity: var(--edge-wm-alpha)` computes invalid and falls back to 1,
         so an orphaned mark sits on the page as a fully opaque logo stamp.
         This path also runs when the switch is turned off from ANOTHER window
         (the store's live reconciler -> unmount), where nothing else removes the node —
         the local toggle path only looked covered because toggleTheme happened
         to call watermark.sync() itself. */
      watermark.detach()
      /* Same reason: the hero mark is styled by the sheet just torn down, so it
         leaves with it. */
      heroLogo.detach()
      // The attention poll belongs to the themed, audio-enabled page; leaving it
      // running would keep reporting confirmations for a theme that is off.
      attention.stop()
    }

    if (isEnabled()) {
      mount()
      watermark.sync()
      heroLogo.sync()
      // Boot animation: only on a real page load, only when switched on, and only
      // after the stylesheet above exists (mount() inserted it).
      if (loader.isOn()) loader.run()
      // 任务完成回执: subscribes only while that switch is on; its first read is a
      // baseline, so enabling mid-turn stays silent.
      turnWatch.sync()
      // 需要你回应: starts only while the theme and the audio feature are both on.
      attention.sync()
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
       (the store's settled hook) — that is the same page-load moment, not a later edit — plus
       the plate's own toggle and 预览 button. Every layer entry point is idempotent
       (mount() and unmount() guard on `mounted`), so repeated echoes are cheap
       and safe. */
    prefs.setReconciler(() => {
      const enabledNext = isEnabled()
      const enabledNow = mounted
      if (enabledNext && !enabledNow) mount()
      else if (!enabledNext && enabledNow) unmount()
      if (enabledNext) {
        // These sync helpers read the store on each call, so no snapshot passing.
        motionSync.syncAll()
        watermark.sync()
        heroLogo.sync()
        turnWatch.sync()
        // Same reason: it re-reads both switches and starts or stops the poll.
        attention.sync()
      } else {
        // Switched off mid-session: the watcher must not keep polling a page the
        // theme no longer owns.
        attention.stop()
      }
    })

    /* ---------- settings section: dictionaries + locale wiring + panel ----------
       Extracted into src/client/ui/settings/ (TODO 清单第 4 项):
       dictionaries.js carries the zh/en copy, section.js carries the locale
       registration, the settings.section slots injection and the whole React
       panel (including the unified endfield-select). Injected by hand:
       services, prefs, the master-switch trio (isEnabled / mount / unmount)
       and every feature surface the panel writes through. Returns the
       section disposer, called from the run teardown below. */
    const disposeSettings = createSettingsSection({
      services,
      prefs,
      themeApi: { isEnabled, mount, unmount, enabledKey: ENABLED_KEY },
      motionSync,
      watermark,
      loader,
      toasts,
      attention,
      audio,
    })

    services.effect(() => () => {
      unmount()
      // Release the idempotency flag so a re-apply after this dispose can mount
      // the theme again; leaving it set killed the theme until a hard reload.
      if (typeof window !== 'undefined') window.__dshThemeEndfieldApplied = false
      /* The shared body observer: disconnect it, and drop a deferred install
         that may still be waiting on DOMContentLoaded when the run ends, so a
         disposed run is not wired back into the page. Both live in the
         observer's own dispose(). */
      bodyObserver.dispose()
      // The watermark's rAF handle, resize listener and node all go with the run.
      watermark.dispose()
      // The plate owns a rAF handle and a fixed DOM node; both must go with the run.
      loader.destroy()
      /* The turn watcher owns two store subscriptions and a retry timeout, all
         of which outlive any DOM node — unmount() covers the switched-off
         path, but a fiber unload while the theme is ON must release them here
         too, or the callbacks keep firing against a dead run. */
      turnWatch.stop()
      // The notification stack owns DOM nodes and dismissal timers; both go here.
      toasts.destroy()
      // Same reason as the announcement watcher: a poll that outlives its fiber
      // keeps POSTing against a dead run.
      attention.stop()
      disposeSettings()
    })
  }

		exports.name = "dsh-theme-endfield";
		exports.inject = ["theme"];
		exports.apply = apply;
		/* The attention markers live in notify/attention.js and are re-exported
		   on the module by apply() (see the notify composition above); they are
		   read by test/audio-attention-watch.test.js, which asserts they stay
		   semantic: a hashed module class would rot on an upstream rebuild and
		   the watcher would just stop matching, with no error anywhere. */
		return module.exports;
	}
});
