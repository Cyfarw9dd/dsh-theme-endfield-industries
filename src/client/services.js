/**
 * services.js — the ONLY place the browser half touches the DSH plugin surface.
 *
 * The theme consumes six upstream seams (see docs/compatibility.md §二): the
 * `theme` service, the settings transport (`configForms` — two generations, the
 * newer one also reachable as `ctx.configForms`), `sessions`, `locale`, `slots`,
 * and `ctx.effect` for run-scoped disposal. Keeping every lookup in one adapter
 * means a DSH API change is a change here, not a hunt through 4k lines, and it
 * gives tests a seam to stub services without faking a whole cordis context.
 *
 * Do NOT cache what the host binds late: `sessions` may arrive after apply()
 * (the announcement feature re-tries), and `configForms` is re-selected when the
 * settings entry changes. Both accessors re-read on every call, which is what
 * the call sites did before this file existed.
 */

/** Every service this half touches, for docs and for the boot diagnostics. */
export const SERVICE_NAMES = ['theme', 'configForms', 'sessions', 'locale', 'slots']

export function createServices(ctx) {
  /** `ctx.get()` may be missing, may return undefined, or may throw while a
   *  getter's dependency is not up yet — all three mean "not available". */
  const get = (name) => {
    try {
      const value = ctx.get(name)
      return value === undefined ? undefined : value
    } catch (e) {
      return undefined
    }
  }

  return {
    /** Required: apply() bails out (and leaves the idempotency flag unset) when
     *  the theme service is not there yet, so a later apply can still mount. */
    theme: () => get('theme'),

    /** Settings transport. Two generations are accepted, in this order: the
     *  0.1.7-era shared form service exposed as a context property, then the
     *  `configForms` service. Anything without `.get()` is not a transport. */
    configForms: () => {
      try {
        if (ctx.configForms !== undefined && ctx.configForms !== null
          && typeof ctx.configForms.get === 'function') return ctx.configForms
      } catch (e) {
        /* the property may be a getter that throws when not available */
      }
      const forms = get('configForms')
      return (forms !== undefined && forms !== null && typeof forms.get === 'function')
        ? forms
        : undefined
    },

    /** Conversation service: optional, arrives late, retried by the caller. */
    sessions: () => get('sessions'),

    /** Locale service: optional — without it the settings page stays Chinese. */
    locale: () => get('locale'),

    /** Slot registry for the settings section; optional. */
    slots: () => get('slots'),

    /** Register a run-scoped disposer (the cordis contract). */
    effect: (fn) => ctx.effect(fn),
  }
}
