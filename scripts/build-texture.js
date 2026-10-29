'use strict'
/**
 * scripts/build-texture.js — embed the official /operator background assets (and
 * the round arrow of its filter dropdown) into src/styles/generated.css as data URIs.
 *
 * SOURCE OF THE ASSETS (provenance, do not lose):
 *   All three are the official Arknights: Endfield site's own page backgrounds,
 *   served from its official CDN for the /operator route:
 *     https://web.hycdn.cn/endfield/official-v4/_next/static/media/<name>
 *   downloaded 2026-10-01; sha256 of the exact bytes committed under assets/:
 *
 *     endfield-block-bg.svg      16d0d6dcb24d1cdb2765a23d4db864dd7a5599a27d9b9f2ed34c72474b0f8675
 *     endfield-wave-bg.png       5a9efdd3ede79f2e4a7cf033e25b1716847d210f636e950db0fc5c870f6dcdac
 *     endfield-tape-wave-bg.png  66b0f225288d5c5b5b5415f64be56663500a51c24f093ab26c9da1a553c7a99e
 *
 *   official filenames: block-bg.f05eda37.svg, wave-bg.8955885a.png,
 *                       tape-wave-bg.2bce9fc0.png
 *
 *   Same CDN, same route, the /operator page's filter dropdown (official
 *   Dropdown component, CSS bundle 3a129342b9ac5e73.css), downloaded 2026-10-01:
 *
 *     endfield-dropdown-arrow.png  34b1690c75f0da184f93a8af0bd60144c842036918157ca0cf8fe4bd79cd1db2
 *
 *   official filename: arrow.592963ed.png (the round chevron of .Dropdown_arrow)
 *   Taken because the repository owner pointed at that dropdown as THE
 *   reference for the settings panel's control (2026-10).
 *
 *   Same CDN, the official base button's own material image (official
 *   Button_button ::before background), downloaded 2026-10-13:
 *
 *     endfield-button-texture.png  0a2fc215c49899a1ef0c1047dedbd4c9460e742e1c9ae0acd87a9e1db9a7fc5b
 *
 *   official filename: button-texture.63d91da2.png (320x72, 8-bit colormap
 *   with tRNS). Measured: near-black ink (~#090909) at alpha 4-11%, 63% ink
 *   coverage, per-row mean alpha rising 14.4 -> 21.1 top to bottom — the
 *   layered flowing-line "contour" material. Taken because the repository
 *   owner asked for it on the 新会话/发送/提交/跳过 buttons ("图案复刻官方")
 *   after this texture was measured live on the official site (2026-10-13).
 *
 *   DERIVED VARIANTS (not a second download): two twins are rebuilt from these
 *   same committed bytes, because an element background-image layer cannot
 *   carry a filter — the data form of the official `invert(1)` grammar is an
 *   inverted palette. Both PNGs are colormap images, so inverting the ink is
 *   exactly inverting the PLTE entries (255-R/G/B per entry; tRNS and IDAT
 *   untouched — the indices are the same). Only that one chunk (plus its CRC)
 *   is rewritten; everything else stays byte-for-byte. Twins:
 *     --edge-btn-tex-inv   the official light-button branch's invert(1)
 *                          (2026-10-13); keeps the left-fade wrapper.
 *     --edge-tex-wave-dark the top-right stepped wave on the dark theme
 *                          (2026-10-29, owner: 「暗色背景下缺少右上角等高线底纹」).
 *                          The official wave ink is #1a1a1a (the dark base
 *                          itself, invisible) and the theme had omitted the
 *                          layer; the inverted twin paints #e5e5e5 at the same
 *                          per-pixel alpha, i.e. the official contour at the
 *                          official strength. Only the top-right wave is
 *                          mirrored; the middle tape-wave stays light-only.
 *
 *   LEFT-FADE WRAPPER: both button-material variants ship inside a one-rect
 *   SVG mask (opacity 0 until x=95 of 320, ramping to 1 at x=165). Reason:
 *   the official ink starts HARD at x≈103 (its left 103 columns are fully
 *   transparent), which on the official 1:1 320x72 button reads as pattern
 *   structure, but on our right-flush band is a harsh vertical cut against
 *   the flat button fill (owner review, 2026-10-13). The PNG bytes inside
 *   the SVG remain the official image verbatim.
 *
 *   The local download-source policy defaults to official channels only; these
 *   ARE official (the game's own site, its own CDN hosts no third-party code),
 *   and taking them was explicitly instructed by the repository owner
 *   ("沿用官方"). Registered in docs/credits.md（素材归属） as well.
 *
 * WHAT THIS SCRIPT DOES. The SVG is editor-clean already (163 bytes: one <path>
 * with a 2px stroke), but it still goes through the same minimize pass the
 * emblem uses so the two pipelines stay one shape. The two PNGs are embedded
 * BYTE-FOR-BYTE (no re-encoding, no quantization, no downscaling) — the point of
 * "沿用官方" is that what ships is exactly what the site ships, not a
 * re-compression of it. Sizes: 17,084 B and 37,025 B -> ~72KB base64 total; the
 * dropdown arrow adds 874 B; the button material adds 4,530 B raw plus its
 * palette-inverted twin (same length, PLTE-flipped).
 *
 * Markers, same splice contract as build-emblem.js:
 *   node scripts/build-texture.js          # rewrite the marked region in src/styles/generated.css
 *   node scripts/build-texture.js --check  # exit 1 if the generated region drifted
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ROOT = path.join(__dirname, '..')
const { stylePath, GENERATED_FILE } = require('./lib/sources.js')
const CLIENT = stylePath(GENERATED_FILE)
const BEGIN = '/* EDGE_TEX_BEGIN (generated by scripts/build-texture.js — do not edit by hand) */'
const END = '/* EDGE_TEX_END */'
const checkOnly = process.argv.includes('--check')

/* Each entry: committed file, its pinned sha256, the CSS custom property it
   becomes, and the token the CSS reads it through. */
const ASSETS = [
  {
    file: 'endfield-block-bg.svg',
    sha256: '16d0d6dcb24d1cdb2765a23d4db864dd7a5599a27d9b9f2ed34c72474b0f8675',
    prop: '--edge-tex-grid-mask',
    kind: 'svg',
    note: 'engineering grid tile (viewBox 217x217, 2px stroke)',
  },
  {
    file: 'endfield-wave-bg.png',
    sha256: '5a9efdd3ede79f2e4a7cf033e25b1716847d210f636e950db0fc5c870f6dcdac',
    prop: '--edge-tex-wave',
    kind: 'png',
    note: '627x461 stepped wave, used top-right',
  },
  {
    file: 'endfield-tape-wave-bg.png',
    sha256: '66b0f225288d5c5b5b5415f64be56663500a51c24f093ab26c9da1a553c7a99e',
    prop: '--edge-tex-tape',
    kind: 'png',
    note: '946x216 wave band, used as the centre strip',
  },
  {
    file: 'endfield-dropdown-arrow.png',
    sha256: '34b1690c75f0da184f93a8af0bd60144c842036918157ca0cf8fe4bd79cd1db2',
    prop: '--edge-dd-arrow',
    kind: 'png',
    note: '97x96 round chevron of the official filter dropdown',
  },
  {
    file: 'endfield-button-texture.png',
    sha256: '0a2fc215c49899a1ef0c1047dedbd4c9460e742e1c9ae0acd87a9e1db9a7fc5b',
    prop: '--edge-btn-tex',
    kind: 'png',
    note: '320x72 flowing-line material of the official base Button (pseudo layer)',
  },
]

/* crc32 for rewriting the one chunk the derived variant touches. */
const crc32 = (buf) => {
  let table = crc32.table
  if (!table) {
    table = crc32.table = []
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c >>> 0
    }
  }
  let c = 0xffffffff
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/* Palette-inverted twin of the button material: the official light branch is
   filter: invert(1); as pure data that is PLTE entries -> 255-R/G/B with the
   alpha table and the compressed indices untouched (colormap PNG). Every other
   byte of every other chunk is copied verbatim. */
const invertPalettePng = (buf, label) => {
  let off = 8
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    if (type === 'PLTE') {
      const next = Buffer.from(buf)
      for (let i = 0; i < len; i += 3) {
        const p = off + 8 + i
        next[p] = 255 - next[p]
        next[p + 1] = 255 - next[p + 1]
        next[p + 2] = 255 - next[p + 2]
      }
      next.writeUInt32BE(crc32(next.subarray(off + 4, off + 8 + len)), off + 8 + len)
      return next
    }
    off += 12 + len
  }
  throw new Error((label || 'png') + ' has no PLTE chunk — the invert derivation expects a colormap image')
}

/* Left-fade wrapper for the button material. Measured fact: the official ink
   STARTS HARD at x≈103 of 320 (columns 0..102 are fully transparent, the
   flowing lines' left endpoints appear abruptly). The official site maps the
   texture 1:1 onto a 320x72 button where that hard start reads as pattern
   structure; on our right-flush band it reads as a harsh vertical cut against
   the flat button colour. The wrapper masks the image with a horizontal
   gradient (opacity 0 until x=95, ramping to 1 at x=165) so the ink fades in
   over ~62 image px. The PNG bytes inside are the official image verbatim. */
const wrapFadeSvg = (pngBuf) => {
  const b64 = pngBuf.toString('base64')
  const svg = ''
    + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 72">'
    + '<defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="0">'
    + '<stop offset="0" stop-color="#fff" stop-opacity="0"/>'
    + '<stop offset="0.297" stop-color="#fff" stop-opacity="0"/>'
    + '<stop offset="0.516" stop-color="#fff" stop-opacity="1"/>'
    + '</linearGradient>'
    + '<mask id="m"><rect width="320" height="72" fill="url(#f)"/></mask></defs>'
    + `<image width="320" height="72" mask="url(#m)" href="data:image/png;base64,${b64}"/>`
    + '</svg>'
  return 'data:image/svg+xml;base64,' + Buffer.from(svg, 'utf8').toString('base64')
}

/* Same minimize pass as build-emblem.js: drop the prolog/comments, rebuild the
   root with only the default namespace + viewBox, collapse whitespace. */
const minimizeSvg = (src) => {
  let s = src
  s = s.replace(/<\?xml[^>]*\?>/g, '')
  s = s.replace(/<!--[\s\S]*?-->/g, '')
  const vb = s.match(/viewBox="([^"]+)"/)
  if (!vb) throw new Error('no viewBox in the source SVG — cannot rebuild the root')
  s = s.replace(/<svg[\s\S]*?>/, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb[1]}">`)
  s = s.replace(/\s(id|class)="[^"]*"/g, '')
  s = s.replace(/<g\s*>/g, '<g>')
  s = s.replace(/\s+/g, ' ').replace(/\s*<\s*/g, '<').replace(/\s*>\s*/g, '>').trim()
  if (!/^<svg[\s\S]*<\/svg>$/.test(s)) throw new Error('minimized SVG failed its shape sanity check')
  return s
}

const main = () => {
  const parts = []
  for (const a of ASSETS) {
    const p = path.join(ROOT, 'assets', a.file)
    const raw = fs.readFileSync(p)
    const sha = crypto.createHash('sha256').update(raw).digest('hex')
    if (sha !== a.sha256) {
      throw new Error(`${a.file} sha256 drifted\n  expected ${a.sha256}\n  actual   ${sha}\n`
        + '  The upstream file changed (or the local copy did). Verify the new bytes against the\n'
        + '  official CDN URL before updating this pin — see docs/credits.md（素材归属）.')
    }
    const payload = a.kind === 'svg' ? Buffer.from(minimizeSvg(raw.toString('utf8')), 'utf8') : raw
    const mime = a.kind === 'svg' ? 'image/svg+xml' : 'image/png'
    let uri = `data:${mime};base64,` + payload.toString('base64')
    let extra = ''
    if (a.prop === '--edge-btn-tex') {
      /* The button material ships INSIDE the left-fade wrapper (see
         wrapFadeSvg): the official PNG bytes are embedded verbatim in the
         SVG; only their left entry is softened. */
      uri = wrapFadeSvg(raw)
      extra = ' + left-fade mask'
    }
    parts.push({
      prop: a.prop,
      uri,
      line: `${a.file} (${a.note}${extra}) — ${raw.length}B raw, ${Math.round(uri.length / 1024)}KB base64, sha256 ${a.sha256.slice(0, 16)}…`,
    })
  }
  /* Derived dark twins (see header): rebuilt from the same committed bytes with
     only the PLTE chunk flipped, so the official image and its inverse can
     never drift apart. */
  {
    const raw = fs.readFileSync(path.join(ROOT, 'assets', 'endfield-wave-bg.png'))
    const inv = invertPalettePng(raw, 'endfield-wave-bg.png')
    parts.push({
      prop: '--edge-tex-wave-dark',
      uri: 'data:image/png;base64,' + inv.toString('base64'),
      line: 'endfield-wave-bg.png (derived: PLTE-inverted twin of --edge-tex-wave — the top-right contour at the official alpha, for the dark scheme 2026-10-29) — ' + inv.length + 'B raw, ' + Math.round(inv.length / 1024) + 'KB base64',
    })
  }
  {
    const raw = fs.readFileSync(path.join(ROOT, 'assets', 'endfield-button-texture.png'))
    const inv = invertPalettePng(raw, 'endfield-button-texture.png')
    const uri = wrapFadeSvg(inv)
    parts.push({
      prop: '--edge-btn-tex-inv',
      uri,
      line: `endfield-button-texture.png (derived: PLTE-inverted twin of --edge-btn-tex + left-fade mask — the data form of the official invert(1) light branch) — ${inv.length}B raw, ${Math.round(uri.length / 1024)}KB base64`,
    })
  }
  const block = BEGIN + '\n' +
    parts.map((p) => `  /* ${p.line} */\n  body { ${p.prop}: url("${p.uri}"); }`).join('\n') + '\n' +
    '  ' + END

  const src = fs.readFileSync(CLIENT, 'utf8')
  const beginIdx = src.indexOf(BEGIN)
  const endIdx = src.indexOf(END)
  if (beginIdx < 0 || endIdx < 0 || endIdx < beginIdx) {
    throw new Error('EDGE_TEX markers missing from src/styles/generated.css — see the background-texture CSS block')
  }
  const next = src.slice(0, beginIdx) + block + src.slice(endIdx + END.length)
  const total = parts.reduce((n, p) => n + p.uri.length, 0)
  if (next === src) {
    console.log(`ok       background texture unchanged (${parts.length} assets, ${Math.round(total / 1024)}KB base64)`)
    return
  }
  if (checkOnly) {
    console.error('DRIFTED  generated.css texture region — run: node scripts/build-texture.js')
    process.exitCode = 1
    return
  }
  fs.writeFileSync(CLIENT, next)
  console.log(`updated  generated.css background texture (${parts.length} assets, ${Math.round(total / 1024)}KB base64)`)
}

main()
