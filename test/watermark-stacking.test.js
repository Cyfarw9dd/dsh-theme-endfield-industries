/**
 * watermark-stacking.test.js — prove the ENDFIELD watermark paints BEHIND the
 * app's own UI, and that its dark-mode ink is faint enough not to clutter.
 *
 * ── The bug, measured from a real screenshot of the live app ──────────────────
 * The model-select dropdown fill is #2c2e2a; the watermark ink is
 * --dsw-alias-label-primary (#f5f5f0) at alpha 0.13. Compositing those gives
 * exactly #464844 — and 11002 px of #464844 were found INSIDE the dropdown's
 * bounding box. The wordmark was painting on top of an opaque popover.
 *
 * ── Why it happened (a screenshot cannot tell you this) ──────────────────────
 * .wSkVaW_composerHero is `position:relative; z-index:1`, so it IS a stacking
 * context and the dropdown's own `z-index:20` is trapped inside it. The hero
 * watermark was a <body> child at `z-index:1` — the SAME level in the root
 * stacking context. A z-index tie is broken by DOM order and the watermark is
 * appended last, so it won every tie against the whole composer subtree.
 *
 * ── The mount, as of 2026-10-29 ──────────────────────────────────────────────
 * The mark lives INSIDE the conversation column (the
 * [class$='_root'][data-phase] element) at z-index:-1, on a column that gets
 * isolation:isolate + position:relative from the :has() rule in tokens.css.
 * The dropdown then beats it INSIDE the column's own stacking context
 * (mark -1 < composerHero 1 < menu 20) — and the industrial-texture overlays
 * can isolate the same column, which a body-level mark made impossible.
 * (2026-10-24: the same reasoning applied to the hero placement; 2026-10-29 the
 * owner removed the mark from the new-session page entirely, so the conversation
 * column is now the only placement and this fixture models that page. The
 * hero-absence rule is asserted in watermark-rehost.test.js, not here.)
 * The test asserts the mount itself too: parent = the conversation column,
 * mode = persist, z-index = -1.
 *
 * ── Why this test compares PIXELS and not elementsFromPoint ──────────────────
 * The first version of this file hit-tested with document.elementsFromPoint().
 * That can NEVER work here: the watermark sets `pointer-events:none !important`,
 * so it is structurally invisible to hit-testing and the check reported "ok"
 * for a build that was provably broken. Two screenshots are ground truth
 * instead: the dropdown is opaque, so if the mark is correctly behind it, every
 * pixel inside the dropdown must be BIT-IDENTICAL with the mark on and off.
 *
 * Three assertions, because "behind the menu" is trivially satisfied by drawing
 * nothing at all:
 *   1. The wordmark and the dropdown genuinely OVERLAP (else 2 is vacuous).
 *   2. ZERO changed pixels inside the dropbox box.
 *   3. The mark is still VISIBLE outside it, and its contrast against the page
 *      background stays inside the intended faint band.
 *
 * Usage: node test/watermark-stacking.test.js
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
/* Browser plumbing is shared — see test/fixtures/chrome-cdp.js. */
const { launch } = require('./fixtures/chrome-cdp.js')
const { BROWSER_SETTINGS_SCOPE_SNIPPET } = require(path.join(__dirname, 'fixtures', 'settings-scope.browser.js'))
/* Fixture surfaces from the real token source (fixtures/theme-values.js). */
const { jsTokenPair } = require('./fixtures/theme-values.js')
const TOKENS = {
  bgBase: jsTokenPair('--dsw-alias-bg-base'),
  bgLayer1: jsTokenPair('--dsw-alias-bg-layer-1'),
  bgLayer3: jsTokenPair('--dsw-alias-bg-layer-3'),
  labelPrimary: jsTokenPair('--dsw-alias-label-primary'),
  labelSecondary: jsTokenPair('--dsw-alias-label-secondary'),
  sidebarFill: jsTokenPair('--dsw-specific-sidebar-fill'),
  borderL1: jsTokenPair('--dsw-alias-border-l1'),
}
const rgbTriple = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]

const ROOT = path.resolve(__dirname, '..')
const OUT = process.env.ENDFIELD_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'endfield-stack-'))

const W = 1440
const H = 900
/* Both colour schemes are checked. The reported complaint was dark mode, and the
   two schemes now carry DIFFERENT alphas, so testing only one would leave the
   other free to regress. */
const DARK = process.env.ENDFIELD_SCHEME !== 'light'

/* Mock of the real hero page. Every class name, z-index and opaque fill below is
   copied from the installed @deepseek-ai bundles, because the bug is purely a
   stacking-order fact: weaken the mock and it stops reproducing.

   `alpha` selects the run. Both runs BUILD THE WATERMARK IDENTICALLY and differ
   only in its opacity ('' = themed value, '0' = invisible). Toggling the feature
   instead would change the DOM between renders, and that is not hypothetical: an
   earlier version of this test did exactly that and produced a 148/255 pixel
   delta from text shifting between the two runs, plus a dropdown box that moved
   74px. Same DOM + same layout means any surviving pixel difference is the mark's
   own ink and nothing else. */
const mk = (alpha) => `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body,#root{height:100%;margin:0}
  :root{
    /* 真值化（fixtures/theme-values.js）：旧字面量是退役的 #101110 系暗色，
       最深底根本测不出最亮档的超限。现在暗色跑在默认 soft 档（最亮、最险
       的档），逐档静态断言在 palette-contrast 里。 */
    --dsw-alias-bg-base:${DARK ? TOKENS.bgBase.dark : TOKENS.bgBase.light};
    --dsw-alias-bg-layer-1:${DARK ? TOKENS.bgLayer1.dark : TOKENS.bgLayer1.light};
    --dsw-alias-bg-layer-3:${DARK ? TOKENS.bgLayer3.dark : TOKENS.bgLayer3.light};
    --dsw-specific-menu:var(--dsw-alias-bg-layer-3);
    --dsw-alias-label-primary:${DARK ? TOKENS.labelPrimary.dark : TOKENS.labelPrimary.light};
    --dsw-alias-label-secondary:${DARK ? TOKENS.labelSecondary.dark : TOKENS.labelSecondary.light};
    --dsw-specific-sidebar-fill:${DARK ? TOKENS.sidebarFill.dark : TOKENS.sidebarFill.light};
    --dsw-alias-border-l1:${DARK ? TOKENS.borderL1.dark : TOKENS.borderL1.light};
    --dsw-alias-border-inverted:${DARK ? '#4a4d49' : '#b6b8b3'};
    --dsw-font-family:Arial,sans-serif;
    --dsh-composer-card-max-width:780px; --dsh-composer-side-clearance:16px;
  }
  body{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);
       font-family:Arial,sans-serif}
  /* the layout frame: position:relative, NO stacking context (z-index:auto) */
  .pI_x6G_frame{background:var(--dsw-alias-bg-base);height:100%;display:grid;
    grid-template-columns:248px 1fr;grid-template-rows:100%;
    position:relative;overflow:hidden}
  .pI_x6G_sidebarCol{background:var(--dsw-specific-sidebar-fill);
    border-right:1px solid var(--dsw-alias-border-l1)}
  .pI_x6G_centerCol{display:flex;flex-direction:column;min-width:0;overflow:hidden}
  .wSkVaW_root{background:var(--dsw-alias-bg-base);display:flex;
    flex-direction:column;height:100%;min-width:0}
  .wSkVaW_scrollBody{flex:1;display:flex;flex-direction:column;
    justify-content:center;min-height:0;overflow-y:auto}
  .wSkVaW_viewArea{flex:1 0 auto;display:flex;flex-direction:column;
    justify-content:center}
  /* THE stacking context that traps the dropdown's z-index:20 */
  .wSkVaW_composerStack{display:flex;flex-direction:column;gap:6px}
  .wSkVaW_composerHero{width:min(calc(var(--dsh-composer-card-max-width) + 2 *
    var(--dsh-composer-side-clearance)),100%);z-index:1;align-self:center;
    gap:8px;padding-bottom:32px;position:relative}
  .pXSMma_root{display:flex;justify-content:center;align-items:center;
    min-width:0;padding:0 24px}
  .pXSMma_stack{width:100%;max-width:var(--dsh-composer-card-max-width);
    display:flex;flex-direction:column;gap:12px}
  /* A headline row, kept because the live conversation skeleton renders one;
     the mark no longer measures it (the follow loop died with the hero placement). */
  .AvZvRG_headlineText{color:var(--dsw-alias-label-primary);display:grid;
    grid-template-columns:34px auto auto;justify-content:center;
    align-items:center;column-gap:10px;font-size:26px;font-weight:500;
    line-height:32px}
  .composer{border:1px solid var(--dsw-alias-border-l1);
    background:var(--dsw-alias-bg-layer-1);padding:14px;font-size:14px;
    color:var(--dsw-alias-label-secondary);position:relative;margin-top:24px}
  ._7KE1Ra_root{min-width:0;position:relative}
  /* the model-select dropdown: z-index 20, but scoped inside composerHero */
  ._7KE1Ra_menu{z-index:20;border:1px solid var(--dsw-alias-border-inverted);
    background:var(--dsw-specific-menu);width:min(120px,100vw - 32px);
    max-height:min(360px,100vh - 96px);
    display:flex;flex-direction:column;padding:4px;position:absolute;
    /* A SHORT menu straddling the mark's middle: it must overlap real ink, but
       the mark is now a full-width two-line wordmark BAND (band height
       clamp(190px, 21vw, 340px)) with the emblem sitting in the tile's clear gap, so the
       band heuristic needs ink ABOVE and BELOW the menu — a menu taller than the
       mark covers it entirely and the 'not erased' check goes vacuous. */
    bottom:calc(100% + 118px);left:50%;right:auto;transform:translateX(-50%);overflow:hidden}
  ._7KE1Ra_group{padding:6px 10px;font-size:11px;letter-spacing:.06em;
    text-transform:uppercase;color:var(--dsw-alias-label-secondary)}
  ._7KE1Ra_row{padding:7px 10px;font-size:13px;
    color:var(--dsw-alias-label-primary)}
</style></head><body><div id="root">
  <div class="pI_x6G_frame">
    <div class="pI_x6G_sidebarCol"></div>
    <div class="pI_x6G_centerCol"><div class="wSkVaW_root" data-phase="active">
      <div class="wSkVaW_scrollBody"><div class="wSkVaW_viewArea">
        <div class="wSkVaW_composerStack wSkVaW_composerHero">
          <div class="pXSMma_root"><div class="pXSMma_stack">
            <div class="AvZvRG_headlineText">探索未至之境</div>
          </div></div>
          <div class="composer">Message DeepSeek Harness…
            <div class="_7KE1Ra_root"><div class="_7KE1Ra_menu">
              <div class="_7KE1Ra_group">DeepSeek</div>
              <div class="_7KE1Ra_row">DeepSeek-V4-Pro</div>
            </div></div>
          </div>
        </div>
      </div></div>
    </div></div>
  </div></div>
<script>window.__ModuleLoader__={load:(m)=>{window.__MOD__=m}}</script>
<script src="./client.js"></script>
<script>
  ${DARK ? "document.body.setAttribute('data-ds-dark-theme','')" : ''}
  /* Theme reads switches via the settingsScope seam (not localStorage). */
  ${BROWSER_SETTINGS_SCOPE_SNIPPET}
  var __prefs=__endfieldSettingsScope({ enabled:'1', loader:'0', watermark:'1', watermarkPersist:'1' })
  const mod=window.__MOD__.factory(()=>null)
  mod.apply({get:(n)=>n==='theme'?{overrideTokens:()=>()=>{}}:(n==='configForms'?__prefs.forms:undefined),effect:(f)=>f()})
  document.body.appendChild(document.createElement('span'))
  /* Hide the mark by ALPHA ONLY, after it has mounted. The element, its box and
     every other node stay exactly as in the visible run, so the two screenshots
     are layout-identical by construction. */
  const HIDE=${JSON.stringify(alpha === '0')}
  setTimeout(()=>{
    if(HIDE){
      const s=document.createElement('style')
      s.textContent='[data-endfield-watermark]{opacity:0 !important}'
      document.head.appendChild(s)
    }
  },250)
  // Report geometry so the pixel comparison knows exactly where to look.
  setTimeout(()=>{
    const wm=document.querySelector('[data-endfield-watermark]')
    const menu=document.querySelector('._7KE1Ra_menu')
    const mb=menu.getBoundingClientRect()
    const out={
      mounted: wm!==null,
      mode: wm?wm.getAttribute('data-endfield-watermark'):null,
      parent: wm&&wm.parentNode===document.body?'body':(wm?String(wm.parentNode.className):null),
      zIndex: wm?getComputedStyle(wm).zIndex:null,
      opacity: wm?getComputedStyle(wm).opacity:null,
      color: wm?getComputedStyle(wm).color:null,
      menuBox:{x:Math.round(mb.left),y:Math.round(mb.top),
               w:Math.round(mb.width),h:Math.round(mb.height)}
    }
    /* The mark is a MASK now, not painted text: there is no glyph box to
       estimate from font metrics (the old ::before content is gone), and the
       flex container's own rect proves nothing. Real ink is measured from the
       pixels below — the same measurement the overlap assertion uses. */
    document.title='STACK '+JSON.stringify(out)
  },700)
</script></body></html>`

fs.copyFileSync(path.join(ROOT, 'client.js'), path.join(OUT, 'client.js'))

;(async () => {
const run = async (alpha, shot) => {
  const page = path.join(OUT, 'stack-' + (alpha === '0' ? 'off' : 'on') + '.html')
  fs.writeFileSync(page, mk(alpha))
  const browser = await launch({
    url: 'file:///' + page.replace(/\\/g, '/'),
    width: W, height: H, dpr: 1, args: ['--hide-scrollbars'],
  })
  try {
    /* Wait for the page's own settle beat (it reports after its 700ms layout
       timer) BEFORE grabbing pixels: the old --screenshot flag captured at the
       end of the virtual-time budget, which is the same moment. */
    await browser.until("document.title.indexOf('STACK ') === 0", 20000)
    if (shot) { await browser.screenshotTo(shot); return null }
    return JSON.parse((await browser.evaluate('document.title')).slice('STACK '.length))
  } finally {
    await browser.close()
  }
}

// 1) geometry, read from the SAME page the screenshots come from
const g = await run('', null)
if (!g) { console.error('no geometry report -- the page did not run'); process.exit(1) }

// 2) two renders that differ ONLY in the mark's alpha
const shotOn = path.join(OUT, 'on.png')
const shotOff = path.join(OUT, 'off.png')
await run('', shotOn)
await run('0', shotOff)

/* Compare the two PNGs. Decoding happens in headless Chrome itself so this test
   needs no image dependency: both files are drawn to a canvas and read back. */
const cmpPage = path.join(OUT, 'cmp.html')
fs.writeFileSync(cmpPage, `<!doctype html><meta charset="utf-8"><body><script>
const FILL=${JSON.stringify(rgbTriple(DARK ? TOKENS.bgLayer3.dark : TOKENS.bgLayer3.light))}
const load=(u)=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=u})
Promise.all([load('on.png'),load('off.png')]).then(([a,b])=>{
  const W=a.width,H=a.height
  const ca=document.createElement('canvas');ca.width=W;ca.height=H
  const cb=document.createElement('canvas');cb.width=W;cb.height=H
  ca.getContext('2d').drawImage(a,0,0);cb.getContext('2d').drawImage(b,0,0)
  const da=ca.getContext('2d').getImageData(0,0,W,H).data
  const db=cb.getContext('2d').getImageData(0,0,W,H).data
  const out={dims:[W,H,b.width,b.height]}
  /* Locate the dropdown FROM THE PIXELS of the watermark-off render, by its own
     opaque fill, instead of trusting a reported rect. A rect measured in a
     different browser run can be stale (that happened: it was 74px off), which
     would silently move the assertion window off the actual popover.
     Row x COLUMN co-clustering (2026-10-24): a bare exact-colour bbox is a
     collision lottery — the industrial texture blends grid/hatch lines over the
     surfaces, and the moment a blend lands exactly on the fill colour (it did,
     on the soft-tier base #1c1c1b vs fill #343433) the strays poison the box:
     scattered dots stretch it over the page, a HORIZONTAL line is row-dense
     (survives a row filter) and a vertical one column-dense. A solid rectangle
     is dense in BOTH directions, so cluster twice each way and keep only pixels
     dense in the other dimension's cluster; a fill/box ratio guard then fails
     loudly if the box ever inflates again. */
  const isFill=(i)=>db[i]===FILL[0]&&db[i+1]===FILL[1]&&db[i+2]===FILL[2]
  let fill=0
  const colHits=new Array(W).fill(0)
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4
    if(isFill(i)){fill++;colHits[x]++}}
  const DENSE=20
  const xLimit=(hits,lo,hi)=>{let a=1e9,b=-1
    for(let k=lo;k<=hi;k++)if(hits[k]>=DENSE){if(k<a)a=k;if(k>b)b=k}
    return b<0?null:[a,b]}
  const cols1=xLimit(colHits,0,W-1)
  if(!cols1){document.title='CMP '+JSON.stringify({...out,fillPx:fill,noCols:true});return}
  const rowHits=new Array(H).fill(0)
  for(let y=0;y<H;y++)for(let x=cols1[0];x<=cols1[1];x++){const i=(y*W+x)*4
    if(isFill(i))rowHits[y]++}
  const rows1=xLimit(rowHits,0,H-1)
  if(!rows1){document.title='CMP '+JSON.stringify({...out,fillPx:fill,noRows:true});return}
  const colHits2=new Array(W).fill(0)
  for(let y=rows1[0];y<=rows1[1];y++)for(let x=0;x<W;x++){const i=(y*W+x)*4
    if(isFill(i))colHits2[x]++}
  const cols2=xLimit(colHits2,0,W-1)
  if(!cols2){document.title='CMP '+JSON.stringify({...out,fillPx:fill,noCols2:true});return}
  let minX=cols2[0],maxX=cols2[1],minY=rows1[0],maxY=rows1[1],fillDense=0
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const i=(y*W+x)*4
    if(isFill(i))fillDense++}
  out.fillPx=fill
  out.fillDensePx=fillDense
  out.box={x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1}
  if(fillDense<out.box.w*out.box.h*0.5){out.sparseBox=true;document.title='CMP '+JSON.stringify(out);return}
  // Inset past the 1px border so its antialiasing is not counted as leakage.
  const x0=minX+2,y0=minY+2,x1=maxX-1,y1=maxY-1
  let inBox=0,inBoxMax=0,outBox=0,outMax=0
  const samples=[]
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=(y*W+x)*4
    const d=Math.max(Math.abs(da[i]-db[i]),Math.abs(da[i+1]-db[i+1]),Math.abs(da[i+2]-db[i+2]))
    if(d<=1) continue
    if(x>=x0&&x<x1&&y>=y0&&y<y1){ inBox++; if(d>inBoxMax){inBoxMax=d}
      if(samples.length<4) samples.push({x,y,d,
        on:[da[i],da[i+1],da[i+2]],off:[db[i],db[i+1],db[i+2]]}) }
    else { outBox++; if(d>outMax) outMax=d }
  }
  out.inBox=inBox;out.inBoxMax=inBoxMax;out.outBox=outBox;out.outMax=outMax
  out.samples=samples
  /* Overlap recomputed against the PIXEL-FOUND dropdown box, and measured from
     the mark's REAL INK rather than a font-metric estimate.

     Both corrections are from observed failures, not caution:
       - the DOM-reported menu rect came from a separate browser run and landed
         74px from where the popover actually rendered;
       - the glyph band estimated from font metrics spans the full element width,
         so intersecting it with the menu counted rows of empty leading/trailing
         space as "overlap" and reported 1984px while the negative control proved
         9945px of ink genuinely fell inside the menu.
     Real ink is simply every pixel the mark changed, so the overlap is the count
     of changed pixels within the menu's own columns and rows -- taken from the
     LEAK-FREE render is impossible (there is none), so it is computed on the
     union: changed pixels inside the box, plus, when the fix works, the ink that
     WOULD land there, obtained from the mark's vertical ink band. */
  let inkMinY=1e9,inkMaxY=-1,inkMinX=1e9,inkMaxX=-1
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=(y*W+x)*4
    const d=Math.max(Math.abs(da[i]-db[i]),Math.abs(da[i+1]-db[i+1]),Math.abs(da[i+2]-db[i+2]))
    if(d<=1) continue
    if(y<inkMinY)inkMinY=y; if(y>inkMaxY)inkMaxY=y
    if(x<inkMinX)inkMinX=x; if(x>inkMaxX)inkMaxX=x
  }
  out.inkBand=inkMaxY>=0?{x:inkMinX,y:inkMinY,w:inkMaxX-inkMinX+1,h:inkMaxY-inkMinY+1}:null
  if(out.inkBand){
    const ox=Math.max(0,Math.min(inkMaxX+1,maxX+1)-Math.max(inkMinX,minX))
    const oy=Math.max(0,Math.min(inkMaxY+1,maxY+1)-Math.max(inkMinY,minY))
    out.overlapPx=Math.round(ox*oy)
  }
  /* Contrast of the mark's ink against ITS OWN background, sampled outside the
     dropdown. The mark is a 130k-px SOLID BAND with a clear gap for the emblem;
     the emblem sits IN that gap, so the two layers do not overlap at all. Two
     readings are taken:
       - MAX pixel: the single most-changed pixel can be a background-texture or
         glyph-edge pixel, which is not the weight the eye reads for a flat, faint
         band.
       - 98th percentile: a FULL-COVERAGE band/emblem pixel (p95 = p98 in the
         measured renders), i.e. ink rather than antialiasing. The assertion uses
         this one; the max is logged for the record. */
  const lum=(c)=>{const f=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)})
    return 0.2126*f[0]+0.7152*f[1]+0.0722*f[2]}
  let maxInk=null,maxBg=null,best=0
  const hist=new Uint32Array(256)
  const sampleByDelta={}
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    if(x>=minX&&x<=maxX&&y>=minY&&y<=maxY) continue
    const i=(y*W+x)*4
    const d=Math.max(Math.abs(da[i]-db[i]),Math.abs(da[i+1]-db[i+1]),Math.abs(da[i+2]-db[i+2]))
    if(d<=1) continue
    if(d>best){best=d;maxInk=[da[i],da[i+1],da[i+2]];maxBg=[db[i],db[i+1],db[i+2]]}
    const k=d>255?255:d
    hist[k]++
    if(!sampleByDelta[k]) sampleByDelta[k]={on:[da[i],da[i+1],da[i+2]],off:[db[i],db[i+1],db[i+2]]}
  }
  const ratioOf=(ink,bg)=>{const L1=lum(ink),L2=lum(bg)
    return +(((Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05))).toFixed(3)}
  if(maxInk&&maxBg){out.ink=maxInk;out.bg=maxBg;out.ratioMax=ratioOf(maxInk,maxBg)}
  let acc=0,pdelta=best
  for(let v=255;v>=0;v--){acc+=hist[v];if(acc>=out.outBox*0.02){pdelta=v;break}}
  const sp=sampleByDelta[pdelta]||sampleByDelta[best]
  if(sp){out.inkP98=sp.on;out.bgP98=sp.off;out.ratio=ratioOf(sp.on,sp.off)}
  document.title='CMP '+JSON.stringify(out)
})
</script></body>`)
/* The comparison page loads both PNGs from disk into a canvas, so Chrome needs
   file:// read access — the one flag this fixture cannot infer. */
const cmpHtml = fs.readFileSync(cmpPage, 'utf8')
const cmpBrowser = await launch({
  url: 'file:///' + cmpPage.replace(/\\/g, '/'),
  width: W, height: H, dpr: 1,
  args: ['--hide-scrollbars', '--allow-file-access-from-files'],
})
let c
try {
  void cmpHtml
  await cmpBrowser.until("document.title.indexOf('CMP ') === 0", 30000)
  c = JSON.parse((await cmpBrowser.evaluate('document.title')).slice('CMP '.length))
} finally {
  await cmpBrowser.close()
}

let failures = 0
const scheme = DARK ? 'dark' : 'light'
const fail = (s) => { console.error('FAIL  ' + s); failures++ }
const pass = (s) => console.log('ok    ' + s)

console.log('=== colour scheme: ' + scheme + ' ===')
console.log('watermark: mode=' + g.mode + ' parent=' + g.parent
  + ' z-index=' + g.zIndex + ' opacity=' + g.opacity + ' color=' + g.color)
console.log('menu box (reported by DOM) : ' + JSON.stringify(g.menuBox))
console.log('menu box (found in pixels) : ' + JSON.stringify(c.box)
  + '  fill=' + c.fillPx + 'px')
console.log('ink band  (real pixels)    : ' + JSON.stringify(c.inkBand))
console.log('ink/menu overlap: ' + c.overlapPx + ' px^2')
console.log('')
console.log('pixels changed by the watermark:')
console.log('  inside the dropdown : ' + c.inBox + '  (max delta ' + c.inBoxMax + ')')
console.log('  elsewhere           : ' + c.outBox + '  (max delta ' + c.outMax + ')')
if (c.inkP98) {
  console.log('  p98 ink ' + JSON.stringify(c.inkP98) + ' over bg ' + JSON.stringify(c.bgP98)
    + '  contrast ' + c.ratio + ':1')
}
if (c.ratioMax !== undefined) {
  console.log('  max pixel contrast ' + c.ratioMax + ':1 (max pixel, logged only)')
}
if (c.samples && c.samples.length) {
  console.log('  leak samples: ' + c.samples.map((s) =>
    '(' + s.x + ',' + s.y + ') on=' + s.on.join(',') + ' off=' + s.off.join(',')).join('  '))
}
console.log('')

if (!g.mounted) fail('watermark never mounted -- the mock does not reproduce the page')
else pass('watermark mounted in ' + g.mode + ' mode')
/* The mount itself is part of the contract: a body-level mark can never sit
   between the column's background and its content, so pin parent + z-index here.
   Since 2026-10-29 the conversation column is the ONLY placement (the
   new-session page carries no mark at all), so the fixture is an active page. */
if (g.mode !== 'persist') {
  fail('expected persist mode on the conversation fixture, got ' + g.mode)
} else {
  pass('persist mode active (the only placement left)')
}
if (g.parent === 'body' || !/_root$/.test(String(g.parent))) {
  fail('watermark mounts at ' + g.parent + ' — it must live INSIDE the conversation'
    + '\n      column (a body-level mark cannot sit between the column background and its content)')
} else {
  pass('mark mounted inside the conversation column (' + g.parent + ')')
}
if (g.zIndex !== '-1') {
  fail('watermark z-index is ' + g.zIndex + ', expected -1 (in-column stacking)')
} else {
  pass('mark stacks at z-index -1 inside the isolated column')
}

// The comparison window must be the real popover, found in the pixels.
if (c.sparseBox) {
  fail('the fill-colour box is sparse (' + c.fillDensePx + ' dense px in a '
    + c.box.w + 'x' + c.box.h + ' box) — the locator is matching scattered'
    + '\n      texture blends, not a solid dropdown; the assertion window is garbage.'
    + '\n      -> fix the locator (row-density threshold) or the fill colour; do not trust this run')
} else if (!c.box || c.fillPx < 5000) {
  fail('could not locate the dropdown fill in the render (' + c.fillPx + ' px)'
    + '\n      -> the assertion window is unknown; do not trust this run')
} else {
  pass('dropdown located in the pixels: ' + c.fillPx + ' px of opaque fill'
    + ' (dense ' + c.fillDensePx + ' px in a ' + c.box.w + 'x' + c.box.h + ' box)')
}

/* GUARD AGAINST A VACUOUS PASS. Without real overlap the leakage assertion
   proves nothing and would report ok for a completely broken build. */
if (!c.overlapPx || c.overlapPx < 5000) {
  fail('the wordmark does not overlap the dropdown in this mock ('
    + c.overlapPx + ' px^2)\n      -> the leakage assertion would be vacuous;'
    + ' fix the mock geometry rather than trusting this run')
} else {
  pass('wordmark and dropdown genuinely overlap (' + c.overlapPx
    + ' px^2) -- the next assertion is meaningful')

  if (c.inBox > 0) {
    fail(c.inBox + ' px inside the opaque dropdown change when the watermark is'
      + ' enabled (max delta ' + c.inBoxMax + ')'
      + '\n      -> the wordmark is painting ON TOP of the popover')
  } else {
    pass('not one pixel inside the dropdown changes -- the mark is strictly behind it')
  }
}

// The mark must still be VISIBLE, or "behind everything" was achieved by
// drawing nothing at all.
if (c.outBox < 2000) {
  fail('the watermark only changes ' + c.outBox + ' px outside the dropdown'
    + '\n      -> it is effectively invisible; it must still clear the frame fill')
} else {
  pass('the mark still paints ' + c.outBox + ' px elsewhere (visible, not erased)')
}

/* Legibility band. The mark is decoration behind content: too strong and it
   clutters the UI, too weak and the feature is pointless. Contrast states that
   independently of the scheme's own colours. Both schemes now share the same
   1.43:1 ceiling: on 2026-10-25 the owner reported the dark mark as unreadable
   ("看不太清") at 0.09, so the dark ink was raised to 0.13 (measured 1.39–1.40
   over the ladder) and the per-scheme ceiling collapsed to one value. The 1.06
   floor is unchanged — below it the mark reads as absent.

   2026-10-25 metric change (120k-px solid band, emblem in its clear gap): the sampler
   used to read the single MOST-CHANGED pixel, which for the old solid mark was
   a full-coverage stroke. On the band it can be a texture/edge pixel crossing the emblem
   contour -- a rare pixel, not the weight the eye reads -- and it
   reported 1.94:1 while each layer alone sits in the band. The assertion now
   reads the 98th percentile of changed pixels: p95 = p98 in these renders,
   i.e. still a full-coverage ink pixel, not antialiasing, but not the rare
   double-ink one. The max pixel is logged. */
const CEIL = 1.43
if (c.ratio !== null && c.ratio !== undefined) {
  if (c.ratio > CEIL) {
    fail(scheme + '-mode watermark contrast is ' + c.ratio + ':1 -- too strong'
      + ' (ceiling ' + CEIL + ':1); it visually competes with the UI')
  } else if (c.ratio < 1.06) {
    fail(scheme + '-mode watermark contrast is ' + c.ratio + ':1 -- under the'
      + ' perceptual floor, the mark reads as absent')
  } else {
    pass(scheme + '-mode ink contrast ' + c.ratio + ':1 sits in the faint band'
      + ' (1.06-' + CEIL + ')')
  }
}

console.log('')
if (failures) { console.error(failures + ' check(s) failed'); process.exit(1) }
console.log('all checks passed')
})().catch((e) => { console.error('FAIL  ' + (e && e.message)); process.exit(1) })
