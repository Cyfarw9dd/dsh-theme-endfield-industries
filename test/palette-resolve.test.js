/**
 * palette-resolve.test.js — prove the one shipped palette actually PAINTS.
 *
 * palette-contrast.test.js checks the numbers are sound; it cannot see whether
 * the variables are wired up. This one runs the REAL client.js in a headless
 * browser against the shared app-DOM mock, applies theme tokens the way
 * the app really does (INLINE ON body — that detail is load-bearing, see below),
 * then measures computed styles. (Born as palette-switch.test.js while the
 * theme still shipped three switchable palettes; the class-flip machinery is
 * gone with them and what remains to guard is the resolution itself.)
 *
 * What it is really guarding:
 *
 *   1. The custom properties must resolve AT ALL. The theme's --edge-* aliases
 *      used to be declared at :root while the tokens they reference are set
 *      inline on body, which made them compute to EMPTY (a real shipped bug: it
 *      silently disabled the themed scrollbar). Every palette variable with the
 *      same mistake would break every rule that reads it, so emptiness is
 *      asserted against.
 *   2. A token override whose value is var(--edge-accent) must resolve THROUGH
 *      the accent declaration on the same element, with no JavaScript repaint
 *      and no re-registration of the token layer. That indirection is the
 *      design; if it were false every token-driven surface would stop
 *      following the palette block.
 *   3. The accent is 谷地黄 #fff500 on the PLAIN body block — no palette class
 *      exists any more, so none may appear on <body> whether the theme is on
 *      or off (the switchable classes were removed with their setting row).
 *
 * Usage: node test/palette-resolve.test.js
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
/* Browser plumbing is shared — see test/fixtures/chrome-cdp.js. */
const { launch } = require('./fixtures/chrome-cdp.js')
const { BROWSER_SETTINGS_SCOPE_SNIPPET } = require(path.join(__dirname, 'fixtures', 'settings-scope.browser.js'))

const ROOT = path.resolve(__dirname, '..')


const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'endfield-palette-'))
fs.copyFileSync(path.join(ROOT, 'client.js'), path.join(OUT, 'client.js'))
const page = path.join(OUT, 'mock.html')

/* The mock carries the parts of the real app that this feature touches: the frame
   , a table row and a turn-status label (two
   accent-driven surfaces with very different mechanisms), plus the opaque bg fills. */
fs.writeFileSync(page, `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body,#root{height:100%;margin:0}
  body{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:Arial,sans-serif}
  .pI_x6G_frame{background:var(--dsw-alias-bg-base);height:100%;grid-template-columns:260px 1fr;
    grid-template-rows:100%;display:grid;position:relative;overflow:hidden}
  .pI_x6G_sidebarCol{background:var(--dsw-specific-sidebar-fill)}
  .pI_x6G_centerCol{flex-direction:column;min-width:0;display:flex;overflow:hidden}
  .wSkVaW_root{background:var(--dsw-alias-bg-base);flex-direction:column;height:100%;display:flex}
  .area{flex:1 1 auto;padding:30px}
  /* Upstream's gradient-text turn status, reproduced so the override is measurable. */
  .Md3f7G_turnStatus{background:linear-gradient(90deg,#101110 0%,#101110 40%,#d3e2ff 50%,#101110 60%,#101110 100%);
    -webkit-text-fill-color:transparent;background-clip:text;-webkit-background-clip:text;font-size:14px}
</style></head><body><div id="root">
  <div class="pI_x6G_frame">
    <div class="pI_x6G_sidebarCol">sidebar</div>
    <div class="pI_x6G_centerCol"><div class="wSkVaW_root"><div class="area">
      <table><tbody><tr id="row"><td id="cell">cell</td></tr></tbody></table>
      <span class="Md3f7G_turnStatus" id="status">Deep diving...</span>
      <button id="newSession" class="x_newSession">new</button>
    </div></div></div>
  </div>
</div>
<script>window.__ModuleLoader__={load:(m)=>{window.__MOD__=m}}</script>
<script src="./client.js"></script>
<script>
window.__RESULTS__=[]
/* The theme now reads its preferences through the dsh settingsScope seam. This
   page seeds a fake binder exactly like the old localStorage lines did, and the
   master field naming carries the same polarity. */
${BROWSER_SETTINGS_SCOPE_SNIPPET}
var __prefs = __endfieldSettingsScope({ enabled:'1', loader:'0' });
const R=(name,pass,detail)=>window.__RESULTS__.push({name,pass:!!pass,detail:detail===undefined?'':String(detail)})

/* Apply theme tokens exactly as @deepseek-ai/dsh-client-ui-layout does: inline on
   <body>, one setProperty per token, picking the value for the ACTIVE scheme.
   Faking this with a stylesheet :root block would make the test pass while the real
   app broke — that asymmetry is the whole reason this harness exists. */
let appliedTokens=[]
let activeScheme='light'
let lastTokens=null
const applyTokens=(tokens)=>{
  lastTokens=tokens
  for(const n of appliedTokens) document.body.style.removeProperty(n)
  appliedTokens=[]
  for(const [k,v] of Object.entries(tokens)){ document.body.style.setProperty(k,v[activeScheme]); appliedTokens.push(k) }
}
/* Switching colour scheme re-applies the SAME layer with the other value, which is
   what the app does on a scheme change. The accent-carrying token only appears in
   dark mode, so this is how the test reaches it. */
const setScheme=(s)=>{
  activeScheme=s
  if(s==='dark') document.body.setAttribute('data-ds-dark-theme','')
  else document.body.removeAttribute('data-ds-dark-theme')
  if(lastTokens) applyTokens(lastTokens)
}
const mod=window.__MOD__.factory(()=>null)
const ctx={
  get:(n)=> n==='theme' ? {overrideTokens:(_s,t)=>{applyTokens(t); return ()=>{ for(const n of appliedTokens) document.body.style.removeProperty(n); appliedTokens=[] }}} : (n==='configForms' ? __prefs.forms : undefined),
  effect:(f)=>{window.__dispose__=f()},
}
mod.apply(ctx)

const cs=()=>getComputedStyle(document.body)
const v=(n)=>cs().getPropertyValue(n).trim()

/* ---- 1. the palette is 谷地黄, on the plain body block, classless ---- */
R('配色为谷地黄 #fff500（body 基础块，无 class）', v('--edge-accent').toLowerCase()==='#fff500', v('--edge-accent'))
R('rgb 通道列表与强调色一致', v('--edge-accent-rgb').replace(/\\s/g,'')==='255,245,0', v('--edge-accent-rgb'))
R('accent-ink 为墨色', v('--edge-accent-ink').toLowerCase()==='#101110', v('--edge-accent-ink'))
const PALETTE_CLASSES = ['theme-endfield-wuling', 'theme-endfield-gray', 'theme-endfield-valley']
R('body 上没有任何配色 class（随设置行一并移除）',
  PALETTE_CLASSES.every((c)=>!document.body.classList.contains(c)), document.body.className)

/* ---- 2. the palette variables actually RESOLVE (the :root bug) ---- */
for(const n of ['--edge-accent','--edge-accent-ink','--edge-accent-rgb','--edge-accent-deep','--edge-status-light',
                '--edge-status-dark','--edge-glow-light','--edge-glow-dark',
                '--edge-line','--edge-paper','--edge-soft','--edge-signal']){
  R('变量已解析（非空）: '+n, v(n)!=='', JSON.stringify(v(n)))
}

/* ---- 3. a token whose value is var(--edge-accent) resolves to the palette ----
    --dsw-alias-brand-primary carries the accent in DARK mode (light mode is ink), so
    the probe switches to dark, samples, and returns to light for the rest. */
setScheme('dark')
const brandDark=v('--dsw-alias-brand-primary')
R('主题令牌经 var(--edge-accent) 间接解析为谷地黄',
  /255,\\s*245,\\s*0|#fff500/i.test(brandDark), brandDark)
const wash=v('--dsw-alias-interactive-bg-hover')
R('半透明色块（rgba + 变量通道）落在黄通道上',
  wash.includes('255')&&wash.includes('245')&&wash.includes('0'),
  'wash='+wash)
const glowDark=getComputedStyle(document.getElementById('status')).backgroundImage
R('回合状态渐变文字换为暗色金档',
  /255,\\s*245,\\s*0|#a08a00/i.test(glowDark), glowDark.slice(0,90))
setScheme('light')
const glowLight=getComputedStyle(document.getElementById('status')).backgroundImage
R('回合状态渐变文字亮色档为深金（#fff500 在纸上不可读）',
  /107,\\s*93,\\s*0|#6b5d00/i.test(glowLight), glowLight.slice(0,90))

/* ---- 4. the dark-tier ladder paints through the var() references ----
    tokens.js's dark column is var(--edge-dark-*) all the way down; the default
    (no attribute) is tier C「舒适」. Flipping the body attribute must re-resolve
    the APPLIED inline token with zero JS repaint — that is the whole point of
    the 暗色档位 setting row. Must run BEFORE the theme-off part below: unmount
    disposes the token layer and blanks every inline token. */
setScheme('dark')
const baseDark=v('--dsw-alias-bg-base')
R('暗色底令牌经 var(--edge-dark-base) 解析为默认 C 档 #1c1c1b',
  /28,\s*28,\s*27|#1c1c1b/i.test(baseDark), baseDark)
document.body.setAttribute('data-endfield-dark','warm')
const baseWarm=v('--dsw-alias-bg-base')
document.body.setAttribute('data-endfield-dark','neutral')
const baseNeutral=v('--dsw-alias-bg-base')
document.body.setAttribute('data-endfield-dark','soft')
const baseSoft=v('--dsw-alias-bg-base')
document.body.removeAttribute('data-endfield-dark')
R('暗色档位切换即时重解析（warm=#161615 / neutral=#191919，soft 回默认）',
  (/22,\s*22,\s*21|#161615/i.test(baseWarm)) && (/25,\s*25,\s*25|#191919/i.test(baseNeutral)) && baseSoft===baseDark,
  baseWarm+' / '+baseNeutral+' → '+baseSoft)
setScheme('light')

/* ---- 5. switching the theme off leaves no palette class behind ---- */
__prefs.setField('enabled','0')
R('关闭主题后仍无配色 class 残留',
  PALETTE_CLASSES.every((c)=>!document.body.classList.contains(c)), document.body.className)

document.title=JSON.stringify(window.__RESULTS__)
</script></body></html>`)

;(async () => {
  const browser = await launch({ url: 'file:///' + page.replace(/\\/g, '/'), width: 1200, height: 900, dpr: 1 })
  let results
  try {
    /* The page finishes its scheme flips, then writes the verdict array
       into document.title; wait for that marker, then read it back as data. */
    await browser.until("document.title.trim().length > 2")
    try { results = JSON.parse(await browser.evaluate('document.title')) } catch (e) {
      console.error('FAIL  bad results JSON: ' + String(await browser.evaluate('document.title')).slice(0, 200))
      process.exit(1)
    }
  } finally {
    await browser.close()
  }

let failures = 0
for (const r of results) {
  if (r.pass) console.log('ok    ' + r.name + (r.detail ? '  [' + r.detail + ']' : ''))
  else { console.error('FAIL  ' + r.name + (r.detail ? '  [' + r.detail + ']' : '')); failures++ }
}
console.log('')
if (failures) { console.error(failures + ' palette-resolve check(s) failed'); process.exit(1) }
console.log('all palette-resolve checks passed (' + results.length + ' assertions)')
})().catch((e) => { console.error('FAIL  ' + (e && e.message)); process.exit(1) })
