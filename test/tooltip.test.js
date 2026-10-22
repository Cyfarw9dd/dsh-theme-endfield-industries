/**
 * tooltip.test.js — the hover tooltip bubbles ([role='tooltip'], e.g. the sidebar
 * 归档 hint) must land in the theme's floating-surface family, not stay a black
 * chip.
 *
 * THE BUG THIS EXISTS FOR. Upstream's Tooltip primitive ships
 *     background: var(--dsw-alias-tooltip-bg)   → #2c2c2e / #43454a (near-black)
 *     color:      var(--dsw-static-neutral-bluish-00)  (white, a STATIC token)
 * so on the paper theme the bubble reads as a dead-black chip. The fix has three
 * halves and each can silently die on its own:
 *   1. the FILL comes from overrideTokens (the app writes alias tokens as body
 *      inline styles — a stylesheet body rule cannot win there);
 *   2. the TEXT is recoloured by a stylesheet rule on [role='tooltip'] (the
 *      bubble's own color is a class rule reading a STATIC token the theme must
 *      not touch globally);
 *   3. the ring/keycap geometry is ring-shadow, not border (a border would eat
 *      the 3px/7px padding the bubble was designed around).
 * This test renders the real theme over the real upstream bubble CSS and asserts
 * all three halves on COMPUTED styles, in both schemes, reading the expected
 * values out of client.js instead of restating them.
 *
 * Usage: node test/tooltip.test.js
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execFileSync } = require('child_process')
const { BROWSER_SETTINGS_SCOPE_SNIPPET } = require(path.join(__dirname, 'fixtures', 'settings-scope.browser.js'))

const ROOT = path.resolve(__dirname, '..')

function findChrome() {
  const c = [process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean)
  for (const p of c) if (fs.existsSync(p)) return p
  return null
}
const chrome = findChrome()
if (!chrome) { console.error('FAIL  no Chrome/Edge found (set CHROME_PATH)'); process.exit(1) }

/* Expected values are read from the real source (client.js), never restated. */
const src = fs.readFileSync(path.join(ROOT, 'client.js'), 'utf8')
const jsToken = (name) => {
  const m = new RegExp("'" + name + "'\\s*:\\s*\\{\\s*light:\\s*'(#[0-9a-f]{6})'\\s*,\\s*dark:\\s*'(#[0-9a-f]{6})'", 'i').exec(src)
  if (!m) { console.error('FAIL  overrideTokens 里读不到 ' + name); process.exit(1) }
  return { light: m[1], dark: m[2] }
}
const EXPECT = {
  bubble: jsToken('--dsw-alias-tooltip-bg'),
  key: jsToken('--dsw-alias-tooltip-key-bg'),
  text: jsToken('--dsw-alias-label-primary'),
  /* bubble ring: border-l2 in light, border-l1 in dark (like the dark dropdown
     panel ring); keycap inset hairline: border-l2 in BOTH modes. */
  ring: { light: jsToken('--dsw-alias-border-l2').light, dark: jsToken('--dsw-alias-border-l1').dark },
  keyRing: { light: jsToken('--dsw-alias-border-l2').light, dark: jsToken('--dsw-alias-border-l2').dark },
}

const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'endfield-tip-'))
fs.copyFileSync(path.join(ROOT, 'client.js'), path.join(OUT, 'client.js'))
const page = path.join(OUT, 'mock.html')

/* Upstream bubble CSS, verbatim from @deepseek-ai/dsh-client-ui-primitives
   Tooltip.module.css as installed (only the class names are unhashed so the
   fixture stays readable; every declaration is the shipped one, including the
   static-token text colour that the theme must beat via [role='tooltip']). */
const UPSTREAM = `
  .bubble{display:inline-flex;align-items:center;gap:8px;position:fixed;z-index:100;
    width:max-content;max-width:50vw;padding:3px 7px;border-radius:var(--dsw-radius-sm);
    background:var(--dsw-alias-tooltip-bg);color:var(--dsw-static-neutral-bluish-00);
    font-size:13px;line-height:20px;white-space:pre-line;overflow-wrap:break-word;
    pointer-events:none;animation:tooltip-in 150ms var(--ds-ease-in-out)}
  .label{min-width:0}
  .keys{display:inline-flex;align-items:center;gap:2px}
  .key{min-width:16px;height:16px;padding:0 2px;border-radius:4px;border:0;
    background:var(--dsw-alias-tooltip-key-bg)}
  @keyframes tooltip-in{from{opacity:0}}
`

fs.writeFileSync(page, `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;height:100%}
  body{background:var(--dsw-alias-bg-base);font-family:Arial,sans-serif}
  .sidebar{width:240px;height:200px;padding:20px;background:var(--dsw-alias-bg-base)}
  ${UPSTREAM}
</style></head><body>
<div class="sidebar">
  <button id="archive">归档</button>
  <span class="bubble" id="tip" role="tooltip" data-side="right">
    <span class="label" id="tipLabel">归档对话</span>
    <span class="keys"><kbd class="key" id="tipKey">A</kbd></span>
  </span>
</div>
<script>window.__ModuleLoader__={load:(m)=>{window.__MOD__=m}}</script>
<script src="./client.js"></script>
<script>
window.__RESULTS__=[]
${BROWSER_SETTINGS_SCOPE_SNIPPET}
var __prefs = __endfieldSettingsScope({ enabled:'1', loader:'0' });
const R=(name,pass,detail)=>window.__RESULTS__.push({name,pass:!!pass,detail:detail===undefined?'':String(detail)})

let appliedTokens=[]
let scheme='light'
let lastTokens=null
const applyTokens=(t)=>{
  lastTokens=t
  for(const n of appliedTokens) document.body.style.removeProperty(n)
  appliedTokens=[]
  for(const [k,v] of Object.entries(t)){ document.body.style.setProperty(k,v[scheme]); appliedTokens.push(k) }
}
const setScheme=(s)=>{
  scheme=s
  if(s==='dark') document.body.setAttribute('data-ds-dark-theme','')
  else document.body.removeAttribute('data-ds-dark-theme')
  if(lastTokens) applyTokens(lastTokens)
}
const mod=window.__MOD__.factory(()=>null)
mod.apply({get:(n)=>n==='theme'?{overrideTokens:(_s,t)=>{applyTokens(t);return ()=>{}}}: (n==='configForms'?__prefs.forms:undefined),effect:()=>{}})

const EXPECT=${JSON.stringify(EXPECT)}
const hex2rgb=(h)=>{const n=parseInt(h.slice(1),16);return 'rgb('+((n>>16)&255)+', '+((n>>8)&255)+', '+(n&255)+')'}
const parse=(s)=>{const m=s.match(/rgba?\\(([^)]+)\\)/); if(!m) return null
  const p=m[1].split(',').map(v=>parseFloat(v.trim())); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}}
const lin=(v)=>{const c=v/255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)}
const lum=(c)=>0.2126*lin(c.r)+0.7152*lin(c.g)+0.0722*lin(c.b)
const ratio=(a,b)=>{const la=lum(a),lb=lum(b);return (Math.max(la,lb)+0.05)/(Math.min(la,lb)+0.05)}

const run=(paletteName)=>{
  for(const s of ['light','dark']){
    setScheme(s)
    const tag=paletteName+' · '+s
    const bubble=document.getElementById('tip')
    const key=document.getElementById('tipKey')
    const label=document.getElementById('tipLabel')
    const bs=getComputedStyle(bubble)
    const ks=getComputedStyle(key)

    /* 1. fill: the floating-paper token, not the upstream near-black */
    R(tag+' · 气泡底=浮层纸面', bs.backgroundColor===hex2rgb(EXPECT.bubble[s]),
      bs.backgroundColor+' 期望 '+hex2rgb(EXPECT.bubble[s]))
    /* 2. text: ink/paper via the [role=tooltip] rule — the original bug was
          white-on-paper because the bubble colour is a STATIC token */
    R(tag+' · 气泡字=墨/纸', bs.color===hex2rgb(EXPECT.text[s]),
      bs.color+' 期望 '+hex2rgb(EXPECT.text[s]))
    /* 3. ring hairline present in the shadow list (border would eat padding) */
    R(tag+' · 描边=ring shadow', bs.boxShadow.indexOf(hex2rgb(EXPECT.ring[s]))>=0,
      bs.boxShadow)
    R(tag+' · 无 border（不挤 padding）', bs.borderTopWidth==='0px', bs.borderTopWidth)
    /* 4. keycap fill + inset hairline */
    R(tag+' · 键帽底=沉底块', ks.backgroundColor===hex2rgb(EXPECT.key[s]),
      ks.backgroundColor+' 期望 '+hex2rgb(EXPECT.key[s]))
    R(tag+' · 键帽=inset hairline', ks.boxShadow.indexOf('inset')>=0 && ks.boxShadow.indexOf(hex2rgb(EXPECT.keyRing[s]))>=0,
      ks.boxShadow)
    /* 5. square corners (global derounding reaches the bubble) */
    R(tag+' · 直角', bs.borderRadius==='0px', bs.borderRadius)
    /* 6. composited contrast, measured on what the browser reports */
    const lc=parse(getComputedStyle(label).color)
    const bc=parse(bs.backgroundColor)
    R(tag+' · 气泡对比度', ratio(lc,bc)>=4.5, ratio(lc,bc).toFixed(2)+':1')
    const kc=parse(ks.backgroundColor)
    const ktc=parse(getComputedStyle(key).color)
    R(tag+' · 键帽对比度', ratio(ktc,kc)>=4.5, ratio(ktc,kc).toFixed(2)+':1')
  }
}

run('默认灰')
document.body.classList.add('theme-endfield-wuling')
run('武陵青')

document.title='DONE '+JSON.stringify(window.__RESULTS__)
</script></body></html>`)

const html = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox',
  /* Chrome ≥ 13x refuses to start without an explicit profile dir on some
     Linux setups ("Failed to create headless user data directory container"),
     and Chrome ≥ 132 removed the old --headless mode entirely. */
  '--user-data-dir=' + path.join(OUT, 'profile'),
  '--virtual-time-budget=4000', '--dump-dom', 'file:///' + page.replace(/\\/g, '/')],
  { encoding: 'utf8', maxBuffer: 1 << 26, timeout: 60000, killSignal: 'SIGKILL' })
const m = html.match(/<title>DONE ([\s\S]*?)<\/title>/)
if (!m) {
  console.error('FAIL  page produced no results')
  const t = html.match(/<title>([\s\S]*?)<\/title>/)
  if (t) console.error('      title was: ' + t[1].slice(0, 300))
  process.exit(1)
}
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'")
const results = JSON.parse(decode(m[1]))

let failures = 0
for (const r of results) {
  if (r.pass) console.log('ok    ' + r.name + '  [' + r.detail + ']')
  else { console.error('FAIL  ' + r.name + '  [' + r.detail + ']'); failures++ }
}
console.log('')
if (failures) { console.error(failures + ' tooltip check(s) failed'); process.exit(1) }
console.log('all tooltip checks passed (' + results.length + ' assertions)')
