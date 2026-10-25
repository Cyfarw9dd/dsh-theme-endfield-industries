/**
 * prefs/scheme.js — the app palette preference bridge (light / dark / system).
 *
 * Why this is a bridge and not a fourth preference field: DSH's theme service
 * already owns the ONE palette preference (`ui-theme.preference`), persists it
 * through its own settings scope, resolves `system` via prefers-color-scheme and
 * publishes `theme/change`. The General settings › 外观 row writes it. The
 * Endfield panel now offers the same three choices, so it must read/write THE
 * SAME value — storing a second field here would let the two places disagree
 * (and `system` could not be represented by a boolean at all).
 *
 * So:
 *   read()      → theme.getTheme().preference   (the persisted preference)
 *   write(v)    → theme.setTheme(v)             (the service persists it itself)
 *   subscribe() → services.onThemeChange        (General › 外观 → this row, live)
 *
 * The theme service is optional throughout the same way it is in the entry:
 * hosts/tests without one fall back to 'light', writes are refused instead of
 * throwing, and subscribing registers nothing.
 */

/** The three choices, in the order the unified dropdown lists them. */
export const SCHEME_OPTIONS = ['light', 'dark', 'system']

export function createThemeScheme({ theme, services }) {
  const read = () => {
    try {
      const snapshot = theme && typeof theme.getTheme === 'function' ? theme.getTheme() : null
      const preference = snapshot && snapshot.preference
      return SCHEME_OPTIONS.indexOf(preference) < 0 ? 'light' : preference
    } catch (e) {
      return 'light'
    }
  }
  const write = (value) => {
    if (SCHEME_OPTIONS.indexOf(value) < 0) return false
    if (!theme || typeof theme.setTheme !== 'function') return false
    try {
      theme.setTheme(value)
      return true
    } catch (e) {
      return false
    }
  }
  /* The panel subscribes through the effect that owns it; a host without the
     event bus returns a no-op disposer. Re-read inside the notification instead
     of trusting an argument shape: both `theme/change` (snapshot) and a bare
     preference must produce the same panel value. */
  const subscribe = (listener) => services.onThemeChange(() => listener(read()))
  return { read, write, subscribe, OPTIONS: SCHEME_OPTIONS }
}
