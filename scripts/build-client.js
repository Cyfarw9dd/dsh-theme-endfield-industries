#!/usr/bin/env node
/**
 * build-client.js — produce the single-file browser artifact ./client.js.
 *
 *   node scripts/build-client.js          build (tsdown -> dist -> ./client.js)
 *   node scripts/build-client.js --check  verify the committed artifact is fresh
 *
 * Why an artifact at all: the DSH plugin loader serves exactly one file per
 * plugin client (exports["./client"] -> ./client.js), so the multi-file source
 * tree under src/ must collapse into one bundle. This follows the same shape
 * as @deepseek-ai's own client packages (tsdown-bundled lib/client.js).
 *
 * The artifact stays COMMITTED (like the previous hand-written client.js), so
 * plugin installs never build anything; freshness is enforced by --check in
 * `npm run check` and CI. `npm run watch` rebuilds on every source change so
 * the browser-refresh dev loop keeps working (the host serves the file from
 * disk per request).
 */
'use strict'

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const { ARTIFACT, DIST_ARTIFACT: DIST } = require('./lib/sources.js')

/* The boot-graph row the Host serves this bundle under is keyed by the real
   package name (see the registration comment in src/client/index.js), so the
   artifact's __ModuleLoader__ registration id must equal package.json "name".
   This is the drift gate for exactly the 2026-10-24 failure: the rename commit
   missed the id, the browser retried the bundle and died on "duplicate factory
   registration", and web boot reported "import failed" for the whole plugin. */
function registrationIdOf(code) {
  const m = code.match(/window\.__ModuleLoader__\.load\(\{\s*id:\s*"([^"]+)"/)
  return m && m[1]
}

function runTsdown(extra = []) {
  const bin = path.join(ROOT, 'node_modules', '.bin', 'tsdown')
  if (!fs.existsSync(bin)) {
    console.error('FAIL  tsdown is not installed — run `npm install` first (devDependencies)')
    process.exit(1)
  }
  execFileSync(process.execPath, [bin, ...extra], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] })
}

function artifactFrom(dist) {
  const code = fs.readFileSync(dist, 'utf8')
  /* Sanity gates before the copy: the artifact must keep the DSH browser
     module-registry shape and must carry the stylesheet payload (both source
     files embedded). A bundle that silently dropped either is not shippable. */
  if (!code.includes('window.__ModuleLoader__.load')) {
    throw new Error('built artifact lost the __ModuleLoader__ registration')
  }
  const packageName = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).name
  const registeredId = registrationIdOf(code)
  if (registeredId !== packageName) {
    throw new Error('built artifact registers __ModuleLoader__ id "' + registeredId + '" but package.json name is "' + packageName + '" — the Host serves the graph row under the package name, so the browser would fail the import (duplicate factory registration after the single-URL retry)')
  }
  for (const probe of ['theme-endfield', '--edge-accent', 'EDGE_TEX_BEGIN', 'EMBLEM_MASK_BEGIN']) {
    if (!code.includes(probe)) throw new Error('built artifact is missing expected content: ' + probe)
  }
  return code
}

if (process.argv.includes('--check')) {
  runTsdown()
  const built = artifactFrom(DIST)
  const committed = fs.readFileSync(ARTIFACT, 'utf8')
  if (built === committed) {
    console.log('ok    client.js is fresh (matches src/ + tsdown build)')
    process.exit(0)
  }
  console.error('FAIL  client.js is STALE — run `npm run build` and commit the artifact')
  console.error('      (diff size: committed ' + committed.length + 'B vs built ' + built.length + 'B)')
  process.exit(1)
}

runTsdown()
const code = artifactFrom(DIST)
fs.writeFileSync(ARTIFACT, code)
console.log('ok    client.js written (' + code.length + 'B) from dist/client.iife.js')
