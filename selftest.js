/**
 * Self-test for check.js: inject each real historical bug into a COPY of the
 * source tree and assert the guard actually fails. A guard that has never been
 * seen to fail is not evidence of anything.
 *
 * The tree is copied into a temp directory (client.js artifact + src/client +
 * src/styles), one file is mutated per case, and check.js runs against that
 * root through the DSH_CHECK_ROOT override (plus the argv artifact target, as
 * before). The old copy-client.js-aside trick grew into a tree copy when the
 * stylesheet moved out of the bundle into real .css files.
 *
 * The pre-bundle template-literal cases (stray backtick, ${...}) are retired:
 * with real .css files those failure modes are structurally impossible, which
 * is the whole point of the build. Their slots are taken by the new structural
 * guards (generated fences, artifact parse).
 *
 * Usage: node selftest.js
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const vm = require('vm')

const root = __dirname
const checkSrc = fs.readFileSync(path.join(root, 'check.js'), 'utf8')
const realClient = fs.readFileSync(path.join(root, 'client.js'), 'utf8')
const realClientSrc = fs.readFileSync(path.join(root, 'src', 'client', 'index.js'), 'utf8')
/* The sheet is layered (STYLE_FILES); keep one pristine copy of every layer so
   each case can mutate one file and resetTree() can restore all of them. The
   layer list is read from the manifest, never re-typed here. */
const manifest = require(path.join(root, 'scripts', 'lib', 'sources.js'))
const realStyles = {}
for (const name of manifest.STYLE_FILES) {
  realStyles[name] = fs.readFileSync(path.join(root, 'src', 'styles', name), 'utf8')
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'endfield-selftest-'))
const tmpClient = path.join(tmpRoot, 'client.js')

function stageTree() {
  fs.mkdirSync(path.join(tmpRoot, 'src', 'styles'), { recursive: true })
  fs.mkdirSync(path.join(tmpRoot, 'src', 'client'), { recursive: true })
  fs.mkdirSync(path.join(tmpRoot, 'scripts'), { recursive: true })
  /* The entry is split into modules now (src/client/<dir>/*.js — prefs/,
     decor/, notify/, motion/, ui/settings/, … nested to any depth), and
     check.js reads the entry as text. Copy the WHOLE client module tree so the
     redirected tree stays shaped like the real one and a future guard that
     resolves the entry's imports does not fail on a missing sibling. */
  const copyTree = (from, to) => {
    fs.mkdirSync(to, { recursive: true })
    for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
      if (ent.isDirectory()) copyTree(path.join(from, ent.name), path.join(to, ent.name))
      else fs.copyFileSync(path.join(from, ent.name), path.join(to, ent.name))
    }
  }
  copyTree(path.join(root, 'src', 'client'), path.join(tmpRoot, 'src', 'client'))
  fs.copyFileSync(path.join(root, 'check.js'), path.join(tmpRoot, 'check.js'))
  /* check.js loads scripts/lib/sources.js from ITS directory: the temp tree must
     carry the manifest too, or every case would fail on a missing module. */
  fs.mkdirSync(path.join(tmpRoot, 'scripts', 'lib'), { recursive: true })
  fs.copyFileSync(path.join(root, 'scripts', 'lib', 'sources.js'),
    path.join(tmpRoot, 'scripts', 'lib', 'sources.js'))
  /* check.js asserts facts about the texture build script's source; that file
     is not a mutation target, but it must exist at the redirected root. */
  fs.copyFileSync(path.join(root, 'scripts', 'build-texture.js'), path.join(tmpRoot, 'scripts', 'build-texture.js'))
}
function resetTree() {
  fs.writeFileSync(tmpClient, realClient)
  fs.writeFileSync(path.join(tmpRoot, 'src', 'client', 'index.js'), realClientSrc)
  for (const name of manifest.STYLE_FILES) {
    fs.writeFileSync(path.join(tmpRoot, 'src', 'styles', name), realStyles[name])
  }
}

/** Run check.js against the temp tree, capturing its pass/fail lines. */
function runCheck() {
  const logs = []
  let failed = false
  const sandbox = {
    require,
    __dirname: tmpRoot,
    __filename: path.join(tmpRoot, 'check.js'),
    module: { exports: {} },
    exports: {},
    console: {
      log: (...a) => logs.push(['ok', a.join(' ')]),
      error: (...a) => logs.push(['FAIL', a.join(' ')]),
    },
    process: {
      argv: [process.argv[0], 'check.js', tmpClient],
      execPath: process.execPath,
      env: { DSH_CHECK_ROOT: tmpRoot },
      exit: (code) => { if (code) failed = true },
    },
  }
  sandbox.globalThis = sandbox
  try {
    vm.createContext(sandbox)
    new vm.Script(checkSrc, { filename: 'check.js' }).runInContext(sandbox)
  } catch (e) {
    logs.push(['FAIL', 'check.js threw: ' + e.message])
    failed = true
  }
  const text = logs.map(([k, m]) => k + ' ' + m).join('\n')
  return { failed: failed || /(^|\n)FAIL/.test(text), text }
}

/* Each case names the file it mutates ('client' artifact, 'client-src', or a
   stylesheet layer name from the manifest) and a mutation over that file's
   pristine text. Layer targets follow the content: the loader wordmark and the
   brace-balance case live in overlays.css, the turn-status readout in
   surfaces.css, the palette variables in tokens.css. */
const CASES = [
  {
    name: 'comment closed early (prose leaks into live CSS)',
    file: 'overlays.css',
    mutate: (s) => s.replace(
      'additionally carry a px floor — see the max() calls below. */',
      'additionally carry a px floor */ see the max() calls below.'),
    expect: /stray '\*\/'|prose/,
  },
  {
    name: 'turn-status recoloured with an ineffective color: instead of a gradient',
    file: 'surfaces.css',
    /* The gradient stops are palette VARIABLES, not literals; \s* spans CRLF. */
    mutate: (s) => s
      .replace(/background-image:\s*linear-gradient\(90deg,\s*var\(--edge-status-light\)[^;]*;/,
        'color: var(--edge-status-light) !important;')
      .replace(/background-image:\s*linear-gradient\(90deg,\s*var\(--edge-status-dark\)[^;]*;/,
        'color: var(--edge-status-dark) !important;'),
    expect: /no background-image gradient|cannot recolour/,
  },
  {
    name: '--edge-word used but never defined',
    file: 'overlays.css',
    mutate: (s) => s.replace(
      /^\s*--edge-word:\s*clamp\([^;]*;/m,
      '        /* deliberately removed */'),
    expect: /--edge-word is used .* never DEFINED/,
  },
  {
    name: 'unbalanced CSS brace',
    file: 'overlays.css',
    mutate: (s) => s.replace(
      /(\[data-endfield-loader-brand\]\s*\{)/,
      '$1\n      {'),
    expect: /braces unbalanced/,
  },
  {
    name: 'a palette variable is deleted (every rule reading it silently dies)',
    file: 'tokens.css',
    mutate: (s) => s.replace(/^\s*--edge-accent-deep:\s*#[0-9a-f]{6};/gim, '        /* removed */'),
    expect: /palette variable\(s\) never DEFINED/,
  },
  {
    name: 'the 武陵青 palette block is removed (switch becomes inert)',
    file: 'tokens.css',
    mutate: (s) => s.replace('body.theme-endfield-wuling {', 'body.theme-endfield-wuling-DISABLED {'),
    expect: /no body\.theme-endfield-wuling block/,
  },
  {
    name: 'a token-reading --edge-* variable is moved back to :root (computes EMPTY)',
    /* Reproduces the real shipped bug: --edge-line at :root substituting a
       --dsw-* token that the app sets inline on body. Injected as a :root
       block of its own, prepended to the first hand-written layer. */
    file: 'tokens.css',
    mutate: (s) => ':root { --edge-line: var(--dsw-alias-border-l1); }\n' + s,
    expect: /declared at :root while substituting a body-level token/,
  },
  {
    name: 'the theme redeclares the app font token (restyles every third-party widget)',
    file: 'tokens.css',
    mutate: (s) => ':root { --dsw-font-family: Arial, "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif; }\n' + s,
    expect: /--dsw-font-family.*DECLARED by the theme/,
  },
  {
    name: 'a generated fence is deleted (drift between scripts and stylesheet)',
    file: 'generated.css',
    mutate: (s) => s.replace('/* EDGE_TEX_BEGIN (generated by scripts/build-texture.js — do not edit by hand) */',
      '/* fence removed */'),
    expect: /fences missing or out of order/,
  },
  {
    name: 'the client entry imports the stylesheet layers out of manifest order',
    /* Order is the CSS cascade contract: swapping the two ?raw imports must be
       caught, otherwise a future reorder silently repaints the whole theme. */
    file: 'client-src',
    mutate: (s) => s
      .replace("import DECOR_CSS from '../styles/decor.css?raw'", '@@A@@')
      .replace("import INTERACTION_CSS from '../styles/interaction.css?raw'", "import DECOR_CSS from '../styles/decor.css?raw'")
      .replace('@@A@@', "import INTERACTION_CSS from '../styles/interaction.css?raw'"),
    expect: /no longer composes src\/styles in manifest order/,
  },
  {
    name: 'the built artifact does not parse',
    file: 'client',
    mutate: (s) => s.replace('(function() {', '(function() { /* broken'),
    expect: /does not parse|compiles|threw|SyntaxError/,
  },
]

const pristine = Object.assign({ client: realClient, 'client-src': realClientSrc }, realStyles)
let bad = 0

try {
  stageTree()

  // 0. the guard must PASS on the pristine tree
  resetTree()
  let base = runCheck()
  if (base.failed) {
    console.error('FAIL  baseline: guard rejects the pristine tree\n' + base.text)
    bad++
  } else {
    console.log('ok    baseline: guard passes on the pristine tree')
  }

  // 1..n: each injected bug must be caught
  for (const c of CASES) {
    const original = pristine[c.file]
    const mutated = c.mutate(original)
    if (mutated === original) {
      console.error(`FAIL  ${c.name}: INJECTION DID NOT APPLY (test is vacuous)`)
      bad++
      continue
    }
    resetTree()
    /* The style mutation targets are manifest layer names now (tokens.css,
       surfaces.css, …); 'theme' no longer exists as a file. */
    const target = c.file === 'client' ? tmpClient
      : c.file === 'client-src' ? path.join(tmpRoot, 'src', 'client', 'index.js')
        : path.join(tmpRoot, 'src', 'styles', c.file)
    fs.writeFileSync(target, mutated)
    const r = runCheck()
    if (!r.failed) {
      console.error(`FAIL  ${c.name}: guard did NOT fail`)
      bad++
    } else if (!c.expect.test(r.text)) {
      console.error(`FAIL  ${c.name}: failed, but not with the expected message`)
      console.error(r.text.split('\n').filter((l) => l.startsWith('FAIL')).join('\n'))
      bad++
    } else {
      console.log(`ok    caught: ${c.name}`)
    }
  }
} finally {
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }) } catch (e) { /* best effort */ }
}

console.log('')
if (bad) {
  console.error(`${bad} self-test(s) failed`)
  process.exit(1)
}
console.log('all self-tests passed')
