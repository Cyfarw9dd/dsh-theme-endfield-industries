/**
 * diff-row-corners.test.js — file-comparison rows must be straight-edged.
 *
 * THE BUG THIS EXISTS FOR (owner report 2026-10-26). The deliverables FileDiff
 * (sidebar review tab AND the turn-tail hover preview) paints an added row's
 * gutter marker as `box-shadow: inset 3px 0 0 var(--diff-marker)` on the first
 * number cell. The theme's global micro-round ladder gives every classed box a
 * 4px radius, so the 3px bar — narrower than its own corner radius — keeps its
 * 3px width but BENDS sideways: its x-start follows the 4px corner arc on every
 * row's first/last device rows, and the diff reads as a column of rounded chips
 * instead of straight rows. Rounded row fills and the split-view column/cell
 * hairlines are the same defect.
 *
 * The fix is the `[data-review-view]` exception in src/styles/chrome.css. This
 * test renders the REAL theme (the rebuilt ./client.js) over the REAL upstream
 * FileDiff.module.css (every declaration verbatim, only the module hashes are
 * stripped so the fixture stays readable) and asserts:
 *
 *   1. micro-round: the row, the number cell carrying the inset bar and the
 *      text all compute 0px, while a neighbouring classed control still gets
 *      the official mainstay radius read out of tokens.css — the control
 *      assertion is what kills a "blanket radius removal" mutation;
 *   2. round mode (`body.theme-endfield-round`): rows are STILL 0px (upstream
 *      FileDiff.module.css declares no border-radius at all) and the control
 *      keeps the fixture's own upstream radius — proving the exception is
 *      scoped to micro-round and does not paint round mode. A fixture probe
 *      span INSIDE a [data-diff-line] row declares its own 3px radius: round
 *      mode must leave it at 3px while micro-round zeroes it. Without that
 *      probe the round-mode "rows are 0px" assertions could never fail even if
 *      the exception leaked, because upstream rows have no radius to leak into;
 *   3. PIXEL PROOF at dpr 1.5: decode a real screenshot and locate the marker
 *      bar on the number cell's FIRST device row vs its middle row. The bug does
 *      NOT thin the 3px bar — the bar keeps its width and BENDS sideways (its
 *      x-start follows the 4px corner arc), so a raw per-row pixel COUNT is a
 *      false green (pre-fix first row 4 vs middle row 4 in the verifier's
 *      measurement). Two discriminative predicates instead:
 *        (a) the bar's START X on the cell's first device row must agree with
 *            the middle row's within 1 device px — 6 vs 0 for this fixture, up
 *            to 6 device px and dependent on the row-top/device-grid alignment
 *            (an independently aligned harness measures 3 vs 0);
 *        (b) marker pixels inside the leftmost 2 CSS px must agree within 1 —
 *            pre-fix 0 vs 3.
 *      Expected marker colour comes from the cell's own computed box-shadow,
 *      with a small per-channel tolerance for AA at the band's leading edge; no
 *      hex is restated here.
 *
 *   4. COVERAGE: the same computed-radius assertions run on the unified body,
 *      the split non-wrap body ([data-diff-side] columns) and the split wrap
 *      body (.splitLine > .cell.add). The turn-tail hover preview renders
 *      ChangedFilePreview → FileDiff split=false wrap=false, i.e. the SAME
 *      unified body (data-review-view="unified") as the sidebar review tab, so
 *      the unified assertions cover the hover preview too.
 *
 * Mutation-verified: deleting the chrome.css block (and rebuilding) turns both
 * the computed-radius assertions and BOTH pixel predicates red.
 *
 * Usage: CHROME_PATH=/usr/bin/chromium-browser node test/diff-row-corners.test.js
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const { BROWSER_SETTINGS_SCOPE_SNIPPET } = require(path.join(__dirname, 'fixtures', 'settings-scope.browser.js'))
/* Browser plumbing (launch/CDP/PNG) is shared — see test/fixtures/chrome-cdp.js. */
const { launch } = require('./fixtures/chrome-cdp.js')

const ROOT = path.resolve(__dirname, '..')

/* Expected values are read from the real source, never restated: the official
   mainstay radius comes out of tokens.css through the one stylesheet manifest. */
const sources = require('../scripts/lib/sources.js')
const css = sources.concatCss()
const RADIUS_MAIN = (() => {
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const m = /--edge-radius:\s*([0-9]+(?:\.[0-9]+)?px)/.exec(noComments)
  if (!m) { console.error('FAIL  tokens.css 里读不到 --edge-radius 主力档'); process.exit(1) }
  return m[1]
})()

/* Fixture plumbing only — the installed app's LIGHT-theme file-diff tokens
   (read from @deepseek-ai/dsh-client-ui-theme: added #e6f4e7 / #edf7ed / #01a241,
   deleted #fce6e2 / #fdece9 / #ba2723) plus the radii the fixture's stand-ins
   declare for themselves. The assertions read the RENDERED values back out, so
   these constants only make the fixture look like the real page. */
const ADD = { bg: '#e6f4e7', gutter: '#edf7ed', marker: '#01a241' }
const DEL = { bg: '#fce6e2', gutter: '#fdece9', marker: '#ba2723' }
/* The fixture control's own upstream radius (the .5rem card tier, so an 8px
   value rather than the 4px mainstay): micro-round must override it to
   RADIUS_MAIN, round mode must leave it exactly at this value. */
const CONTROL_RADIUS = '8px'
/* Fixture probe: a classed span INSIDE a [data-diff-line] row with its own
   declared radius. Micro-round must zero it; round mode must leave it at this
   value — the only assertion that can fail if the :not() gate ever leaks, since
   the upstream rows carry no radius of their own. */
const PROBE_RADIUS = '3px'

const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'endfield-diff-'))
fs.copyFileSync(path.join(ROOT, 'client.js'), path.join(OUT, 'client.js'))
const page = path.join(OUT, 'mock.html')

/* Upstream FileDiff.module.css, fetched verbatim from
   @deepseek-ai/dsh-client-ui-deliverables@0.2.1-rc.3 lib/client.js (`css$3`,
   FileDiff.module.css). Only the `IP6KhG_` module hash prefixes are stripped so
   the fixture is readable; every declaration is the shipped one. Note what it
   does NOT contain: not a single border-radius declaration — which is why round
   mode is straight already and why this fixture proves the exception is inert
   there. */
const UPSTREAM = `
.root{--diff-empty-fill:color-mix(in srgb, var(--dsw-alias-interactive-bg-hover) 50%, transparent);box-sizing:border-box;width:100%;min-height:0;color:var(--dsw-alias-label-primary);flex-direction:column;display:flex}.header{box-sizing:border-box;border-bottom:.5px solid var(--dsw-alias-border-l3);flex:none;align-items:center;gap:6px;height:38px;padding:0 6px 0 8px;display:flex}.status{color:var(--dsw-alias-label-secondary);align-items:center;gap:12px;margin:0;padding:16px;font-size:13px;display:flex}.body{min-height:0;font:var(--dsw-font-markdown-code-block);flex-direction:column;flex:auto;padding:8px 0 16px;display:flex;overflow:auto}.columns{flex:auto;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-height:0;display:grid}.column,.body[data-review-view=unified]:not([data-review-wrap]){grid-template-columns:minmax(max-content,100%);align-content:start;display:grid}.column{overscroll-behavior:none;min-width:0;overflow-x:scroll}.column+.column{border-left:.5px solid var(--dsw-alias-border-l3)}.sideLine{box-sizing:border-box;white-space:pre;grid-template-columns:3.5em max-content;width:max-content;min-width:100%;min-height:22px;line-height:22px;display:grid}.note{font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-tertiary);margin:0;padding:4px 16px 8px}.hunk{margin-bottom:8px}.hunkHeader{color:var(--dsw-alias-label-tertiary);white-space:pre;padding:4px 16px}.line{box-sizing:border-box;white-space:pre;grid-template-columns:3.5em 3.5em 1.2em minmax(0,1fr);min-height:22px;line-height:22px;display:grid}.splitLine{white-space:pre;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-height:22px;line-height:22px;display:grid}.cell{box-sizing:border-box;grid-template-columns:3.5em minmax(0,1fr);min-width:0;display:grid}.cell+.cell{border-left:.5px solid var(--dsw-alias-border-l3)}.number{color:var(--dsw-alias-label-tertiary);text-align:right;user-select:none;padding-right:8px}.sign{text-align:center;user-select:none}.text{padding-right:16px}.body[data-review-wrap] .line,.body[data-review-wrap] .splitLine{white-space:pre-wrap}.body[data-review-wrap] .text{overflow-wrap:anywhere}.add{--diff-gutter-fill:var(--dsw-alias-file-diff-added-gutter);--diff-marker:var(--dsw-alias-file-diff-added-marker);background:var(--dsw-alias-file-diff-added-bg)}.del{--diff-gutter-fill:var(--dsw-alias-file-diff-deleted-gutter);--diff-marker:var(--dsw-alias-file-diff-deleted-marker);background:var(--dsw-alias-file-diff-deleted-bg)}.add .number,.del .number{background:var(--diff-gutter-fill);color:var(--diff-marker)}.add .number:first-child,.del .number:first-child{box-shadow:inset 3px 0 0 var(--diff-marker)}.add .sign,.del .sign{color:var(--diff-marker)}.context .text{color:var(--dsw-alias-label-secondary)}.empty{background:var(--diff-empty-fill)}
`

fs.writeFileSync(page, `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;height:100%}
  /* Fixture plumbing: the app writes the palette/file-diff tokens as body
     styles; only the handful the upstream CSS reads are needed here. */
  body{background:var(--dsw-alias-bg-base);font-family:Arial,sans-serif;
    --dsw-alias-bg-base:#e8e8e2;--dsw-alias-bg-layer-1:#f2f2ec;
    --dsw-alias-label-primary:#101110;--dsw-alias-label-secondary:#4a4c48;
    --dsw-alias-label-tertiary:#6a6d68;--dsw-alias-border-l3:#c9cac4;
    --dsw-alias-interactive-bg-hover:rgba(0,0,0,.06);
    --dsw-font-markdown-code-block:12px/22px monospace;
    --dsw-font-xs-13:13px/18px Arial;
    --dsw-alias-file-diff-added-bg:${ADD.bg};--dsw-alias-file-diff-added-gutter:${ADD.gutter};--dsw-alias-file-diff-added-marker:${ADD.marker};
    --dsw-alias-file-diff-deleted-bg:${DEL.bg};--dsw-alias-file-diff-deleted-gutter:${DEL.gutter};--dsw-alias-file-diff-deleted-marker:${DEL.marker}}
  /* Stand-in for a real upstream control next to the diff: it declares its own
     radius, which micro-round must override and round mode must leave alone. */
  .mockControl{border-radius:${CONTROL_RADIUS};border:0;padding:6px 12px;
    background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
  /* Fixture probe chip inside the del row (see PROBE_RADIUS): its own radius is
     what the :not(.theme-endfield-round) gate must protect in round mode. */
  .probeChip{border-radius:${PROBE_RADIUS};padding:0 2px;
    background:var(--dsw-alias-bg-layer-1)}
  .diffFrame{width:520px;margin:10px}
  ${UPSTREAM}
</style></head><body>
<div class="diffFrame" id="frame">
  <div class="body" id="unifiedBody" data-review-view="unified">
    <section class="hunk">
      <div class="hunkHeader" data-diff-hunk-header>@@ -40,3 +40,4 @@</div>
      <div class="line add" id="addRow" data-diff-line="add">
        <span class="number" id="addNo1">40</span>
        <span class="number" id="addNo2">41</span>
        <span class="sign">+</span>
        <span class="text" id="addText">added line</span>
      </div>
      <div class="line del" id="delRow" data-diff-line="del">
        <span class="number" id="delNo1">41</span>
        <span class="number" id="delNo2"></span>
        <span class="sign">-</span>
        <span class="text" id="delText">removed line <span class="probeChip" id="probeChip">c</span></span>
      </div>
    </section>
  </div>
  <div class="body" id="splitBody" data-review-view="split">
    <div class="columns">
      <div class="column" id="splitLeft" data-diff-side="left">
        <section class="hunk">
          <div class="hunkHeader" data-diff-hunk-header>@@ -40,1 +40,1 @@</div>
          <div class="sideLine del" id="splitDelRow" data-diff-line="del">
            <span class="number" id="splitDelNo">41</span>
            <span class="text">removed line</span>
          </div>
        </section>
      </div>
      <div class="column" id="splitRight" data-diff-side="right">
        <section class="hunk">
          <div class="hunkHeader" data-diff-hunk-header>@@ -40,1 +40,1 @@</div>
          <div class="sideLine add" id="splitAddRow" data-diff-line="add">
            <span class="number" id="splitAddNo">41</span>
            <span class="text">added line</span>
          </div>
        </section>
      </div>
    </div>
  </div>
  <!-- Split WRAP variant: TextDiff renders .splitLine > span.cell.add rows (no
       [data-diff-side] columns) when split && wrap. Same [data-diff-line] hook. -->
  <div class="body" id="wrapSplitBody" data-review-view="split" data-review-wrap>
    <section class="hunk">
      <div class="hunkHeader" data-diff-hunk-header>@@ -40,1 +40,1 @@</div>
      <div class="splitLine" id="wrapSplitRow" data-diff-line="add">
        <span class="cell add" id="wrapSplitCellLeft"><span class="number" id="wrapSplitNoLeft">41</span><span class="text">added line</span></span>
        <span class="cell add" id="wrapSplitCellRight"><span class="number" id="wrapSplitNoRight">41</span><span class="text">added line</span></span>
      </div>
    </section>
  </div>
  <button class="mockControl" id="control">重试</button>
</div>
<script>window.__ModuleLoader__={load:(m)=>{window.__MOD__=m}}</script>
<script src="./client.js"></script>
<script>
window.__RESULTS__=[]
${BROWSER_SETTINGS_SCOPE_SNIPPET}
var __prefs = __endfieldSettingsScope({ enabled:'1', loader:'0' });
const R=(name,pass,detail)=>window.__RESULTS__.push({name,pass:!!pass,detail:detail===undefined?'':String(detail)})
let appliedTokens=[]
const applyTokens=(t)=>{
  for(const n of appliedTokens) document.body.style.removeProperty(n)
  appliedTokens=[]
  for(const [k,v] of Object.entries(t)){ document.body.style.setProperty(k,v['light']); appliedTokens.push(k) }
}
const mod=window.__MOD__.factory(()=>null)
mod.apply({get:(n)=>n==='theme'?{overrideTokens:(_s,t)=>{applyTokens(t);return ()=>{}}}: (n==='configForms'?__prefs.forms:undefined),effect:()=>{}})

const $=(id)=>document.getElementById(id)
const cs=(id)=>getComputedStyle($(id))
const radius=(id)=>cs(id).borderRadius

/* Micro-round: body carries no round class, exactly like the shipped default
   (radius:'square'). Every box below the diff body must be square. */
const microRound=()=>{
  const tag='micro-round'
  R(tag+' · 新增行行底=0px', radius('addRow')==='0px', radius('addRow'))
  R(tag+' · 行号格（带 inset 标记条）=0px', radius('addNo1')==='0px', radius('addNo1'))
  R(tag+' · 新增行文字=0px', radius('addText')==='0px', radius('addText'))
  R(tag+' · 删除行行底=0px', radius('delRow')==='0px', radius('delRow'))
  R(tag+' · 删除行首行号格=0px', radius('delNo1')==='0px', radius('delNo1'))
  /* Probe inside the del row: own 3px radius, must be zeroed in micro-round. */
  R(tag+' · 行内探针（自带 ${PROBE_RADIUS}）=0px', radius('probeChip')==='0px', radius('probeChip'))
  R(tag+' · split 左列=0px', radius('splitLeft')==='0px', radius('splitLeft'))
  R(tag+' · split 新增行=0px', radius('splitAddRow')==='0px', radius('splitAddRow'))
  R(tag+' · split 行号格=0px', radius('splitAddNo')==='0px', radius('splitAddNo'))
  /* Split WRAP variant (.splitLine > .cell.add) — same hook, different markup. */
  R(tag+' · split-wrap 行=0px', radius('wrapSplitRow')==='0px', radius('wrapSplitRow'))
  R(tag+' · split-wrap 格(.cell)=0px', radius('wrapSplitCellLeft')==='0px', radius('wrapSplitCellLeft'))
  R(tag+' · split-wrap 行号格=0px', radius('wrapSplitNoLeft')==='0px', radius('wrapSplitNoLeft'))
  /* The ladder still paints the classed control around the diff. A "blanket
     radius=0" fix would report 0px here instead of the official mainstay. */
  R(tag+' · 周边控件仍是主力档 ${RADIUS_MAIN}', radius('control')==='${RADIUS_MAIN}',
    radius('control')+' 期望 ${RADIUS_MAIN}')
}

/* Round mode: the exception is scoped to :not(.theme-endfield-round), and
   upstream declares no radius on these boxes, so rows stay straight while the
   control returns to the fixture's own upstream radius. */
const roundMode=()=>{
  document.body.classList.add('theme-endfield-round')
  const tag='round 模式'
  R(tag+' · 新增行仍=0px（上游不声明 radius）', radius('addRow')==='0px', radius('addRow'))
  R(tag+' · 行号格仍=0px', radius('addNo1')==='0px', radius('addNo1'))
  R(tag+' · split 列仍=0px', radius('splitLeft')==='0px', radius('splitLeft'))
  R(tag+' · split-wrap 格仍=0px', radius('wrapSplitCellLeft')==='0px', radius('wrapSplitCellLeft'))
  R(tag+' · 控件回到夹具上游 ${CONTROL_RADIUS}', radius('control')==='${CONTROL_RADIUS}',
    radius('control')+' 期望 ${CONTROL_RADIUS}')
  /* Falsifiable :not() gate: the probe keeps its own radius, so this assertion
     would go red if the [data-review-view] exception ever escaped micro-round. */
  R(tag+' · 行内探针回到夹具上游 ${PROBE_RADIUS}（:not() 门生效）', radius('probeChip')==='${PROBE_RADIUS}',
    radius('probeChip')+' 期望 ${PROBE_RADIUS}')
  document.body.classList.remove('theme-endfield-round')
}

microRound()
roundMode()

/* Geometry probe for the pixel assertion (Node decodes the screenshot):
   the number cell's rect in CSS px, the marker colour parsed out of its own
   computed box-shadow, and the bar width out of the shadow's x-offset. No
   expected colour is restated. */
window.__PROBE__=()=>{
  const cell=$('addNo1')
  const style=getComputedStyle(cell)
  const r=cell.getBoundingClientRect()
  const m=/rgba?\\(([^)]+)\\)/.exec(style.boxShadow)
  const marker=m?m[1].split(',').slice(0,3).map(v=>parseFloat(v)):null
  const bar=/rgba?\\([^)]+\\)\\s+(-?[0-9.]+)px\\s/.exec(style.boxShadow)
  return {rect:{left:r.left,top:r.top,height:r.height,width:r.width},
    marker,bar:bar?parseFloat(bar[1]):null,boxShadow:style.boxShadow}
}

document.title='DONE '+JSON.stringify(window.__RESULTS__)
</script></body></html>`)

;(async () => {
  /* dpr 1.5 puts a whole number of device rows across the 22px cell and keeps
     the 3px inset bar at 4.5 device px — enough columns for a count, close
     enough to a CSS-pixel edge that the 4px corner visibly eats the bar. */
  const DPR = 1.5
  const browser = await launch({
    url: 'file:///' + page.replace(/\\/g, '/'),
    width: 900, height: 700, dpr: DPR,
    args: ['--hide-scrollbars', '--force-color-profile=srgb'],
  })
  let results, probe
  try {
    /* The page writes its verdicts into document.title once every computed-
       style assertion ran; wait for that marker instead of a virtual-time
       budget. */
    await browser.until("document.title.indexOf('DONE ') === 0")
    results = JSON.parse((await browser.evaluate('document.title')).slice(5))
    probe = JSON.parse(await browser.evaluate('JSON.stringify(window.__PROBE__())'))

    /* PIXEL ASSERTIONS — the acceptance-critical pair. Pre-fix the 3px bar is
       NOT thinner: it keeps its 3px width and BENDS sideways, its x-start
       following the 4px corner arc, so a raw per-row COUNT passes pre-fix (the
       verifier measured 4 vs 4). What discriminates is WHERE the band starts and
       whether the leftmost 2 CSS px are covered:
         (a) start x of the bar on the cell's first device row vs the middle row
             must agree within 1 device px (pre-fix 6 vs 0 for this fixture, up
             to 6 device px and dependent on the row-top/device-grid alignment);
         (b) marker pixels inside the leftmost 2 CSS px must agree within 1
             (pre-fix 0 vs 3).
       The band's leading edge is the only AA column; a small per-channel
       tolerance keeps solid marker pixels and drops the blend. */
    const img = await browser.screenshot()
    const px = (x, y) => { const i = (y * img.w + x) * img.ch; return [img.data[i], img.data[i + 1], img.data[i + 2]] }
    const TOL = 16
    const isMarker = (p) => Math.abs(p[0] - probe.marker[0]) <= TOL
      && Math.abs(p[1] - probe.marker[1]) <= TOL && Math.abs(p[2] - probe.marker[2]) <= TOL
    const cellX = Math.ceil(probe.rect.left * DPR)          // first device column inside the cell
    const firstRow = Math.ceil(probe.rect.top * DPR)        // first device row inside the cell
    const middleRow = Math.floor((probe.rect.top + probe.rect.height / 2) * DPR)
    /* bar width + 4 CSS px: room for the corner-arc bend pre-fix and AA. */
    const search = Math.ceil((probe.bar + 4) * DPR)
    const strip = Math.ceil(2 * DPR)                        // leftmost 2 CSS px
    const startX = (y) => {
      for (let i = 0; i < search; i++) if (isMarker(px(cellX + i, y))) return i
      return null
    }
    const stripCount = (y) => {
      let n = 0
      for (let i = 0; i < strip; i++) if (isMarker(px(cellX + i, y))) n++
      return n
    }
    const firstStart = startX(firstRow), midStart = startX(middleRow)
    const firstStrip = stripCount(firstRow), midStrip = stripCount(middleRow)
    results.push({
      name: '像素 · 标记条起点不随行端弯折（首设备行 vs 中行起始 x）',
      pass: firstStart !== null && midStart !== null && Math.abs(firstStart - midStart) <= 1,
      detail: 'bar=' + probe.bar + 'px firstRowStart=' + firstStart + ' midRowStart=' + midStart
        + ' marker=' + probe.marker.join(','),
    })
    results.push({
      name: '像素 · 最左 2 CSS px 内标记像素首行/中行等量',
      pass: firstStrip > 0 && midStrip > 0 && Math.abs(firstStrip - midStrip) <= 1,
      detail: 'firstRow=' + firstStrip + ' midRow=' + midStrip + ' strip=' + strip + ' device px',
    })
  } finally {
    await browser.close()
  }

  let failures = 0
  for (const r of results) {
    if (r.pass) console.log('ok    ' + r.name + '  [' + r.detail + ']')
    else { console.error('FAIL  ' + r.name + '  [' + r.detail + ']'); failures++ }
  }
  console.log('')
  if (failures) { console.error(failures + ' diff-row-corner check(s) failed'); process.exit(1) }
  console.log('all diff-row-corner checks passed (' + results.length + ' assertions)')
})().catch((e) => { console.error('FAIL  ' + (e && e.message)); process.exit(1) })
