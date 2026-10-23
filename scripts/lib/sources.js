'use strict'
/**
 * sources.js — the ONE place that knows how this package's browser sources compose.
 *
 * A single-artifact plugin still has a source tree: files live under src/, one
 * composition root (src/client/index.js) assembles them, and tsdown bundles that
 * root into the committed ./client.js artifact. Every consumer that needs to
 * reason about "which files, in which order" — the build check, check.js, the
 * self-test fixture tree, and each browser test — reads this manifest instead of
 * re-deriving the concatenation. Adding or reordering a layer is then a one-line
 * change here, and check.js proves the client entry stayed in sync with it.
 *
 * Order IS the contract for CSS: later files win cascade ties, so the list below
 * is the cascade order, exactly the order the client entry imports them in.
 */
const fs = require('node:fs')
const path = require('node:path')

/** Repo root. Resolved from this file so a redirected tree (selftest.js copies
 *  the tree into a temp dir) loads ITS OWN manifest, not the working tree's. */
const ROOT = path.resolve(__dirname, '..', '..')

/** CSS sources, in cascade order (raw byte concatenation = the artifact sheet).
 *
 * The hand-written sheet is layered by concern; the ONE generated file stays
 * last so its fences can be spliced by the build scripts:
 *
 *   tokens.css       typography scoping, the accent palettes, --edge-* variables,
 *                   watermark strength tokens (everything the rest of the sheet reads)
 *   decor.css        the /operator backdrop texture + the new-session hero mark
 *   interaction.css  selection/caret grays, the merged button-motion design,
 *                   the menu-current-item fill, reduced-motion respect
 *   chrome.css       app-chrome restyle: settings dropdown, tooltips, sidebar,
 *                   workspace rows, tables, badges, chips, the agent-team board
 *   surfaces.css     accent-filled surfaces: dark compaction, hero glow,
 *                   composer +, official button material, selected rows,
 *                   question chips, the turn-status readout
 *   overlays.css     the boot loading plate + the industrial notify cards
 *   generated.css    machine-written fences (build-texture/emblem/logo.js)
 *
 * concatCss() is a PLAIN JOIN with no separator: each file carries its own
 * trailing newline, and the blank line that used to sit between theme.css and
 * generated.css lives at the end of overlays.css. That is what makes a layer
 * split provably cascade-neutral — the split was accepted on concatCss() being
 * byte-identical before/after (see TODO.md 第 5 项). */
const STYLE_FILES = ['tokens.css', 'decor.css', 'interaction.css', 'chrome.css', 'surfaces.css', 'overlays.css', 'generated.css']

/** The one generated file: spliced by scripts/build-texture|emblem|logo.js
 *  between fence markers. Never hand-edited (see AGENTS.md). */
const GENERATED_FILE = 'generated.css'

const stylesDir = () => path.join(ROOT, 'src', 'styles')
const stylePath = (name) => path.join(stylesDir(), name)
const readStyle = (name) => fs.readFileSync(stylePath(name), 'utf8')
const cssFiles = () => STYLE_FILES.map((name) => ({ name, path: stylePath(name), text: readStyle(name) }))

/** The exact stylesheet string the client embeds (src/client/index.js). */
const concatCss = () => STYLE_FILES.map(readStyle).join('')

const CLIENT_ENTRY = path.join(ROOT, 'src', 'client', 'index.js')
const ARTIFACT = path.join(ROOT, 'client.js')
const DIST_ARTIFACT = path.join(ROOT, 'dist', 'client.iife.js')

const clientDir = () => path.join(ROOT, 'src', 'client')

/** Every JS source under src/client — the entry plus each module directory
 *  (prefs/, decor/, …, nested to any depth), in a stable order. The bundle
 *  re-quotes strings, so tests that assert facts about pre-bundle source text
 *  (selector hooks, token literals) must read these files; after the entry
 *  split those facts can live in any module, hence the whole-tree view. */
const walkJs = (dir, out) => {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walkJs(full, out)
    else if (ent.name.endsWith('.js')) out.push(full)
  }
  return out
}
const clientSources = () => {
  /* The walk also yields the entry itself; keep it first, exactly once. */
  const all = walkJs(clientDir(), [])
  return [CLIENT_ENTRY, ...all.filter((p) => p !== CLIENT_ENTRY)]
}

/** The client JS sources as one stream, for the source-text tests. */
const concatClientJs = () => clientSources().map((p) => fs.readFileSync(p, 'utf8')).join('\n')

module.exports = {
  ROOT,
  STYLE_FILES,
  GENERATED_FILE,
  stylesDir,
  stylePath,
  readStyle,
  cssFiles,
  concatCss,
  CLIENT_ENTRY,
  clientDir,
  clientSources,
  concatClientJs,
  ARTIFACT,
  DIST_ARTIFACT,
}
