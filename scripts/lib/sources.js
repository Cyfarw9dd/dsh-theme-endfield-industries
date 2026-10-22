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

/** CSS sources, in cascade order. The client entry imports these with `?raw`,
 *  in this order, and joins them with '\n' before a single insertCss() call. */
const STYLE_FILES = ['theme.css', 'generated.css']

/** The one generated file: spliced by scripts/build-texture|emblem|logo.js
 *  between fence markers. Never hand-edited (see AGENTS.md). */
const GENERATED_FILE = 'generated.css'

const stylesDir = () => path.join(ROOT, 'src', 'styles')
const stylePath = (name) => path.join(stylesDir(), name)
const readStyle = (name) => fs.readFileSync(stylePath(name), 'utf8')
const cssFiles = () => STYLE_FILES.map((name) => ({ name, path: stylePath(name), text: readStyle(name) }))

/** The exact stylesheet string the client embeds (src/client/index.js). */
const concatCss = () => STYLE_FILES.map(readStyle).join('\n')

const CLIENT_ENTRY = path.join(ROOT, 'src', 'client', 'index.js')
const ARTIFACT = path.join(ROOT, 'client.js')
const DIST_ARTIFACT = path.join(ROOT, 'dist', 'client.iife.js')

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
  ARTIFACT,
  DIST_ARTIFACT,
}
