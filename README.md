# dsh-theme-endfield-industries

English (current) · [简体中文](README.zh-CN.md)

A DSH Web theme plugin modeled on the official Arknights: Endfield website (an unofficial fan work).

Cream paper background, ink-black text, Endfield industrial-terminal look with the official constant micro-round corners (4px-scale; measured system in docs/notes/button-radius-research.md). The one palette is **Valley Yellow** (the official signal yellow `#fff500`; the earlier Endfield Gray / Wuling Teal switch shipped until 2026-10). The client half (`client.js`) restyles the UI through theme tokens and one global stylesheet; the host half (`index.js`) only handles settings persistence and optional audio notifications (spawned system-player subprocesses). Neither modifies application code.

## Origin

This project is a heavily customized derivative of [ymh0000123/dsh-theme-endfield](https://github.com/ymh0000123/dsh-theme-endfield), which set the Endfield-website visual direction and the plugin architecture. It now evolves independently as the industries variant; upstream changes are picked up via an `upstream` remote when needed. All credit for the original design and implementation goes to the upstream author, under the MIT License.

## Install

```bash
dsh plugin --profile web add github:Cyfarw9dd/dsh-theme-endfield-industries
```

Restart or reload the `web` profile to activate. **When updating plugin files**: the client half (`client.js`) is read from disk per request, so a browser refresh is enough; the host half (`index.js`) is imported once at profile startup, so **the whole DSH process must be restarted** to reload it (`dsh-hmr`'s watch ignores `**/node_modules` by default, and linked-installed repo files are outside its scope). If you only refresh the page, you are still running the host code from startup. Uninstall:

```bash
dsh plugin --profile web rm dsh-theme-endfield-industries
```

## Features

Adjust in **Settings › Endfield Theme Settings** (24 fields; all labels follow the DSH language setting, zh/en, switching live):

- **01 Theme**: master switch (off = native app look, no refresh needed, and the settings page stays readable while off); square/rounded corners; frosted glass (off by default); button motion (on by default, merged design: arrow slide-in on approval buttons + 12px engineering corner brackets on session/search rows); industrial texture (off/light/full, **full** by default = the official `/operator` set: engineering grid + 45° hatching + two levels of waves and a top glow, anchored to the main content column only);
- **02 Background**: the big `ENDFIELD` wordmark watermark (on by default, new-session page only, never intercepts interaction, protected against browser mistranslation) and a keep-showing toggle; the brand mark on the new-session page (the collab "Endfield Mark 3" above the headline, built as two alpha masks, painted in the asset's own colors in both light and dark);
- **03 Animation**: boot loader animation (off by default; full-screen black + 10px progress rail on the left edge, ticks/percent travel with the fill head, with a hard failsafe timer and reduced-motion fallback);
- **05 Notifications**: industrial-style notification cards (on by default) — task-done receipts auto-dismiss after 6s; question/approval cards persist until handled; sounds follow the audio-notification switch;
- **06 Audio**: optional audio notifications (**master switch off by default**) — boot chime, turn start/end, needs-your-attention, plus a reserved error slot; volume, per-slot debounce interval, custom sound directory and a diagnostic log are adjustable. **Played by the host process**, not the browser, so you hear them even when the page is minimized. See [docs/cookbook/audio-notifications.md](docs/cookbook/audio-notifications.md).

Several fixes are **automatic** and switchless: the official button contour material replicated on new-session/send/question-card buttons; conversation tabs restyled per the official SubpageTab language (gray wash on hover, steady highlight when active, `.2s` switching choreography); composer action chips hover in industrial gray; tooltips folded into the paper floating-surface family; the header preset badge restored to the accent color; contrast fixes for Settings › Models row actions, attachment carousel arrows, and more. The full list is in [docs/features.md § 其他自动生效的修正](docs/features.md).

Every value-bearing row in the settings panel uses one unified dropdown control, its form copied from the official `/operator` filter dropdown (dark plaque + official round arrow, selected row on hatched gray with a purple/green signal bar on the left edge).

### Settings persistence

All settings are persisted by DSH's own settings service, independent of page origin/port: the host `index.js` exports a schemastery `Config` with every field `.volatile()` (namespace = this plugin's profile entry id `theme-endfield`), and the browser `client.js` reads/writes/subscribes through `ctx.configForms`, with values landing in `<profile>/cordis.patch.yml`. **The compatibility floor is DSH 0.2.0** (enforced by peerDependencies) — the older `settingsScope` generation was dropped, with no fallback. Because nothing is origin-scoped, DSH web and DSH Desktop both save correctly and survive restarts/port changes — the old `localStorage` (wiped by Desktop's random ports) is no longer used. See [docs/features.md](docs/features.md) and [docs/engineering-notes.md](docs/engineering-notes.md). After upgrading to 0.1.7, old settings must be re-entered once in the settings page (`settings.yaml` was deprecated by DSH; see [engineering-notes.md § DSH 0.1.7-rc.1 换掉了整套 settings API](docs/engineering-notes.md#dsh-017-rc1-换掉了整套-settings-api-v110-已跟进)).

**If switches keep resetting after refresh**: first check whether the host side has that `Config` (`Config.listConfigs` reporting `absent` for the entry means it doesn't). Without a Config, DSH projects no form at all; the host `apply()` logs a warning and leaves a report file `theme-endfield-diagnostic.json` in the profile directory (auto-deleted when the Config builds successfully; the report's `schemaMode` / `loaded` / `loadError` fields say which resolution path was taken and whether a copy "resolved but failed to load") — triage and criteria in [docs/testing.md](docs/testing.md#设置页). Also note: **host-half (`index.js`) changes require a full DSH restart**; refreshing the page only reloads `client.js`.

## Documentation

All docs are written in Chinese.

| Doc | Layer | Contents |
| --- | --- | --- |
| [docs/AGENTS.md](docs/AGENTS.md) | Governance | Doc layering rules and contribution flow |
| [docs/design-principles.md](docs/design-principles.md) | Governance | Design principles: one necessary decoration only, stay out of the core workspace, motion must pay its way |
| [TODO.md](TODO.md) | Governance | Long-running refactor backlog: remaining module split order, hazards and acceptance gates |
| [docs/architecture.md](docs/architecture.md) | Theme | Two-half structure, stylesheet organization, verification chain |
| [docs/compatibility.md](docs/compatibility.md) | Theme | Backwards compatibility and stability: upstream risk grading, version matrix |
| [docs/glossary.md](docs/glossary.md) | Theme | Glossary and token quick reference |
| [docs/credits.md](docs/credits.md) | Theme | Asset credits: per-item sources, sha256 and adoption registry |
| [docs/design-language.md](docs/design-language.md) | Theme | Palette, token mapping and contrast rules |
| [docs/endfield-ui-research.md](docs/endfield-ui-research.md) | Theme | Official-site UI research: color frequencies, interaction-grammar evidence, logo asset inventory |
| [docs/features.md](docs/features.md) | Theme | Feature behavior, defaults, storage keys and edge cases |
| [docs/testing.md](docs/testing.md) | Theme | Verification scripts and test-suite notes |
| [docs/engineering-notes.md](docs/engineering-notes.md) | Theme | Deep engineering notes: implementation decisions and measured data |
| [docs/development.md](docs/development.md) | Theme | Development and release workflow |
| [docs/git.md](docs/git.md) | Theme | Git commit strategy and Conventional Commits conventions |
| [docs/cookbook/](docs/cookbook/) | Cookbook | How-to topics: [audio notifications](docs/cookbook/audio-notifications.md) · [frosted glass](docs/cookbook/glass.md) · [DSH version tracking](docs/cookbook/dsh-version-tracking.md) |
| [docs/notes/](docs/notes/) | Archive | One-off records ([PR description](docs/notes/PR-description.md), [official motion research](docs/notes/endfield-motion-research.md), [dark palette research](docs/notes/dark-palette-research.md), [button radius research](docs/notes/button-radius-research.md)) |

## Development & verification

```bash
npm run build        # rebuild the client.js artifact after editing src/ (npm run watch in dev)
npm run check        # artifact freshness + generated-asset pins + source-CSS invariants (fast)
node selftest.js     # reverse-verifies that check.js actually catches those problems
npm test             # all of the above + palette/settings/rendering/motion-performance suites
```

`npm test` covers style invariants, palette contrast, the settings page (both transport generations), real-browser rendering, animation accessibility and performance budgets (layout/frame intervals/main thread). Some tests require a local Chrome, Chromium or Edge. Run tests with Node 22+ (browser fixtures depend on global `WebSocket`/`fetch`; older versions fail loudly at that point — running the plugin itself has no such requirement). Testing principles: **read values from the real `client.js`, never restate numbers; every assertion has been mutation-tested** — methodology in [docs/testing.md](docs/testing.md).

## Project layout

```text
client.js          client-side single-file artifact (bundled from src/ by tsdown; do not edit)
src/client/         client-side source (IIFE shell + prefs engine + feature surfaces + settings panel)
src/styles/         stylesheet layers (tokens/decor/interaction/chrome/surfaces/overlays.css + generated.css fences)
index.js           host side: exports the volatile Config, declares the settings namespace and audio runtime
lib/               audio notifications: slots.js (slot defs), tone.js (WAV synthesis), audio.js (playback runtime)
sounds/            generated notification sounds (npm run sound:build regenerates; --check guards drift)
assets/            asset sources: watermark emblem vector, new-session mark original + masks, official textures/arrow/button material
scripts/           build scripts: build-sounds / build-emblem / build-logo / build-texture (all with --check)
cordis.patch.yml   bundle injection config (this plugin row's profile entry id is the settings namespace)
check.js           static stylesheet checks
selftest.js        checker self-test
test/              rendering, settings, palette and performance tests
docs/              design, feature, engineering and testing docs (Chinese)
```

Generated artifacts (`sounds/`, the mask/texture embed regions) are **regenerated from sources and scripts only, never hand-edited**; each build script's `--check` catches drift.

## Asset credits & disclaimer

This plugin is an **unofficial fan work** with no affiliation, sponsorship or endorsement from Hypergryph. The Arknights: Endfield name, marks, official-site visuals and related art assets are copyrighted by Hypergryph; use here is for learning, demonstration and non-commercial purposes only and is not covered by the MIT license. Per-item sources, sha256 hashes and adoption rationale are in [docs/credits.md](docs/credits.md). If any rights holder finds any asset used inappropriately, please open an issue and we will remove or replace it immediately.

## License

MIT, covering this project's original code only; third-party asset attribution in [Asset credits & disclaimer](#asset-credits--disclaimer) and [docs/credits.md](docs/credits.md).
