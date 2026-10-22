/**
 * prefs/legacy.js — the one-shot repair for sections written by the build that
 * shipped the field-name bug.
 *
 * A compound field's UI key is kebab-cased while the schema field is camelCase
 * (`'dsh-theme-endfield-watermark-persist'` -> `'watermarkPersist'`). The buggy
 * build pushed the UI spelling into the document; schemastery passes undeclared
 * keys through untouched and also merges every default into the fetched
 * section, so without this pass the user's stored choice is ignored and the
 * field default silently wins — the switch looks like it "reset again" after
 * the fix.
 *
 * `prefsLegacyFields` is pure (section in, repairs out) so the hard part — the
 * decision rule below — can be reasoned about and tested without a transport.
 * `createLegacyMigrator` adds exactly-once bookkeeping around it.
 */
import { PREFS_FIELD_DEFAULTS, PREFS_FIELD_TO_LEGACY_KEY } from './keys.js'

/**
 * The [field, value] pairs whose recorded legacy value is the one to honour,
 * i.e. the edits that need re-committing onto the declared field.
 *
 * WHEN IS THE DECLARED FIELD THE USER'S OWN VALUE? A fetched section ALWAYS
 * carries every declared field (the schema merges its defaults in), so
 * `hasOwnProperty` cannot tell a user-set value from an implied default. Only
 * one signal can: a value that differs from the shipped default.
 *
 *   declared absent or === default  -> nothing recorded a choice for this
 *                                      field, so the stray legacy key is the
 *                                      only trace of one: honour it.
 *   declared set to anything else    -> a correctly-writing build stored it,
 *                                      so it wins and the stray key is ignored
 *                                      (never let the pre-migration spelling
 *                                      overwrite a real edit).
 *
 * That makes the migration idempotent in the good direction: once the value is
 * re-committed the declared field is non-default, so the stray key can never
 * win again.
 */
export function prefsLegacyFields(section) {
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

/**
 * Wrap the pure pass with the two guards the store needs:
 *   - `migrated`: a field is repaired at most once per run (a replayed write
 *     must not loop back into another repair);
 *   - `migratedFor`: the section object this pass already examined. A section
 *     is a fresh object on every transport update, so object identity is what
 *     says "this document has not been looked at yet" — and it stops the pass
 *     from re-running against its own echo within one snapshot.
 *
 * Writes go through `commit`, i.e. the same durable gate as a user toggle: on a
 * served scope it lands on the schema field immediately, on one that is not
 * served yet it is held and replayed (and mirrored locally, so the theme
 * behaves correctly meanwhile). The stale key itself is left in the document —
 * the theme no longer declares or reads it, and rewriting a section it does not
 * own would be a bigger hammer than the bug deserves.
 */
export function createLegacyMigrator({ commit, debug }) {
  const migrated = new Set()
  let migratedFor = null
  return {
    migrate(section) {
      if (section === null || typeof section !== 'object') return
      if (section === migratedFor) return
      migratedFor = section
      for (const [field, value] of prefsLegacyFields(section)) {
        if (migrated.has(field)) continue
        migrated.add(field)
        debug('migrating legacy-spelled field', PREFS_FIELD_TO_LEGACY_KEY[field], '->', field, '=', value)
        commit(field, value)
      }
    },
  }
}
