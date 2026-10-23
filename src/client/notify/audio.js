/**
 * notify/audio.js — the browser half of 音频通知: switches, volume, previews.
 *
 * Extracted from the entry (see TODO.md「入口瘦身」). The host process owns
 * playback (lib/audio.js); the browser's whole job here is switches, a volume
 * number and the preview buttons — every sound is played by the host,
 * including the previews (that is the point: the preview must go through the
 * same path as a real notification, or testing it proves nothing).
 *
 * The keys below pass through the prefs/keys.js table unchanged and equal the
 * schema field names, so a switch can never write an undeclared field. The
 * settings panel (UI keys), the boot loader's chime (isOn / previewSlot) and
 * the attention watcher (isOn) all read through this one instance.
 */
export function createAudioPrefs({ prefs }) {
  const KEYS = {
    enabled: 'audioEnabled',
    boot: 'audioBoot',
    turnStart: 'audioTurnStart',
    turnDone: 'audioTurnDone',
    volume: 'audioVolume',
    humanOnly: 'audioHumanOnly',
    diag: 'audioDiag',
    soundDir: 'audioSoundDir',
  }
  const STATE_URL = '/theme-endfield/audio/state'
  const PREVIEW_URL = '/theme-endfield/audio/preview'
  // Default ON for the master switch and both live slots; default OFF for the
  // diagnostics switch, so the host console stays quiet unless asked.
  const isOn = () => prefs.get(KEYS.enabled) !== '0'
  const isBootOn = () => prefs.get(KEYS.boot) !== '0'
  const isStartOn = () => prefs.get(KEYS.turnStart) !== '0'
  const isDoneOn = () => prefs.get(KEYS.turnDone) !== '0'
  const isHumanOnly = () => prefs.get(KEYS.humanOnly) !== '0'
  const isDiagOn = () => prefs.get(KEYS.diag) === '1'
  const readVolume = () => {
    const parsed = Number.parseInt(prefs.get(KEYS.volume), 10)
    return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 100
  }
  const readSoundDir = () => prefs.get(KEYS.soundDir) || ''
  /** Ask the host to play one slot through the real notification path. */
  const previewSlot = (slot) => {
    if (typeof fetch !== 'function') return Promise.resolve({ played: false, why: 'no fetch' })
    return fetch(PREVIEW_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slot }),
    }).then(
      (res) => res.json().catch(() => ({ played: false, why: 'bad response' })),
      (error) => ({ played: false, why: String(error && error.message ? error.message : error) }),
    )
  }
  return {
    KEYS,
    STATE_URL,
    PREVIEW_URL,
    isOn,
    isBootOn,
    isStartOn,
    isDoneOn,
    isHumanOnly,
    isDiagOn,
    readVolume,
    readSoundDir,
    previewSlot,
  }
}
