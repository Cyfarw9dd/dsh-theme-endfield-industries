/**
 * prefs/keys.js — the preference-key vocabulary: schema fields, UI keys, and the
 * mapping between them. Pure data + pure functions (no ctx, no DOM, no storage),
 * so the entry, the diagnostics and the tests can all import the same table.
 *
 * Two namespaces coexist on purpose: PREFS_ENTRY is the DSH profile entry id the
 * settings transport is keyed by (index.js SETTINGS_ENTRY), while PREFS_NS is the
 * pre-0.1.7 namespace that is still the PREFIX of every UI key. The tables below
 * are the single place that knows both spellings; the read and write paths both
 * go through prefsFieldOf(), which is why a compound field cannot half-migrate.
 */

/* DSH 0.1.7-rc.1 settings namespace: the profile entry id of this plugin's
   row (index.js SETTINGS_ENTRY, cordis.patch.yml `id: theme-endfield`).
   `configForms.get()` is keyed by exactly that string. */
export const PREFS_ENTRY = 'theme-endfield'
/* Pre-0.1.7 namespace string. Still the prefix of every UI key in the
   tables below, so it stays even though no transport is keyed by it any
   more (the settingsScope seam it named was dropped with the >=0.2.0
   floor). */
export const PREFS_NS = 'dsh-theme-endfield'
export const PREFS_FIELD_DEFAULTS = {
  enabled: '1',
  radius: 'square',
  glass: 'off',
  texture: 'standard',
  motion: 'signal',
  watermark: '1',
  watermarkPersist: '0',
  loader: '0',
  /* 通知模块：主开关 + 三触发（默认随主开关开启）。 */
  notify: '1',
  notifyDone: '1',
  notifyQuestion: '1',
  notifyApprove: '1',
  /* 音频通知 (host half: lib/audio.js). Two live slots — the prompt that
     starts a turn and the final answer that ends one. `audioAttention` and
     `audioTurnFail` are 预留: the sounds and switches ship, the triggers do
     not, and the settings rows say so.

     The MASTER switch ships OFF (opt-in), mirroring index.js FIELD_DEFAULTS
     and lib/audio.js FALLBACK: an install that upgrades into this feature
     must not start making noise by itself. The per-slot switches stay ON, so
     turning the master on is what starts the sound. */
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
/* Convert a namespaced storage key tail to the camelCase field the settings
   schema declares (index.js FIELD_DEFAULTS). A build that derived the field
   by stripping the namespace prefix instead left a compound name in its
   kebab-case spelling, so this conversion is also the read migration for any
   key the explicit table below does not list. */
export const prefsFieldFromKey = (rawKey) => {
  const prefix = PREFS_NS + '-'
  const tail = rawKey.indexOf(prefix) === 0 ? rawKey.slice(prefix.length) : rawKey
  return tail.replace(/-([a-z0-9])/g, (_, ch) => ch.toUpperCase())
}
/* Which schema field each UI/store key names. The left half is the key the
   theme's own code has always used (the localStorage-era name, which the
   settings rows, locales and tests all still speak); the right half is the
   field the HOST registered in its schema (index.js FIELD_DEFAULTS — the
   only names a scope.set can actually store).

   THEY ARE NOT THE SAME STRING for any compound field, and deriving one
   from the other by stripping the namespace prefix — the old
   `k.slice(PREFS_NS.length + 1)` — is the bug this table exists to kill: it
   turned 'dsh-theme-endfield-watermark-persist' into 'watermark-persist',
   while the schema declares 'watermarkPersist'. Two fields were affected (that
   watermarkPersist): the write landed on an UNDECLARED key, schemastery
   kept it (it validates declared fields and passes extras through) but the
   declared field stayed at its default, so the switch worked for the page
   session, persisted junk into settings.yaml, and came back at its default
   on the next load. Hence "开关刷新后复位".

   Keys are therefore listed EXPLICITLY, never computed. */
export const PREFS_KEY_TO_FIELD = {
  'dsh-theme-endfield-enabled': 'enabled',
  'dsh-theme-endfield-radius': 'radius',
  'dsh-theme-endfield-glass': 'glass',
  'dsh-theme-endfield-texture': 'texture',
  'dsh-theme-endfield-dark-tier': 'darkTier',
  'dsh-theme-endfield-motion': 'motion',
  'dsh-theme-endfield-watermark': 'watermark',
  'dsh-theme-endfield-watermark-persist': 'watermarkPersist',
  'dsh-theme-endfield-loader': 'loader',
  'dsh-theme-endfield-notify': 'notify',
  'dsh-theme-endfield-notify-done': 'notifyDone',
  'dsh-theme-endfield-notify-question': 'notifyQuestion',
  'dsh-theme-endfield-notify-approve': 'notifyApprove',
  /* 音频通知. These tails happen to equal their schema fields, so every one of
     them would also resolve correctly through the prefix-strip fallback — they
     are listed explicitly because test/settings-namespace.test.js asserts that
     EVERY declared host field has a mapping entry, and because "the mapping is
     the one place a UI key becomes a field" only holds if it is complete. */
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
/* The pre-migration spelling of a compound field, for the sections that the
   buggy build already wrote: 'watermarkPersist' -> 'watermark-persist'. Derived from
   the table (not from the schema, which cannot know it) so the two can never
   drift, and only for fields that really do have a distinct legacy double:
   every single-word field maps to itself and is skipped. */
export const PREFS_FIELD_TO_LEGACY_KEY = (() => {
  const m = {}
  for (const field of Object.keys(PREFS_KEY_TO_FIELD)) {
    const f = PREFS_KEY_TO_FIELD[field]
    const legacy = field.slice(PREFS_NS.length + 1)
    if (legacy !== f) m[f] = legacy
  }
  return m
})()
/* The single place a UI/store key turns into a schema field name: both the
   read path (prefsGet) and the write path (prefsSet/prefsCommit) go through
   it, so a switch can never read a field other than the one it writes. A key
   that is already a field name passes through, which is what the settings
   panel's own state and the tests use. */
export const prefsFieldOf = (rawKey) => {
  if (Object.prototype.hasOwnProperty.call(PREFS_KEY_TO_FIELD, rawKey)) return PREFS_KEY_TO_FIELD[rawKey]
  if (Object.prototype.hasOwnProperty.call(PREFS_FIELD_DEFAULTS, rawKey)) return rawKey
  /* Last resort: a key this table does not list. It is camelCased through
     prefsFieldFromKey rather than handed back as the raw tail, so a compound
     name reaching this path still lands on the camelCase field the host
     DECLARES instead of on an undeclared kebab key — which is precisely the
     failure mode the table above exists to prevent, and which a future
     compound row could otherwise reintroduce silently. */
  return prefsFieldFromKey(rawKey)
}
