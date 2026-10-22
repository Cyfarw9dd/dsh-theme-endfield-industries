// Browser tests only. Node 22+ supplies WebSocket/fetch; no runtime dependency.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path')
const { spawn } = require('node:child_process')
const zlib = require('node:zlib')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
/** Decode a CDP PNG screenshot into {w,h,ch,data}. Pixel assertions across the
 *  suite used to carry their own copy of this; it lives here once. */
const decodePng = (buf) => {
  let pos = 8, w = 0, h = 0, bd = 0, ct = 0
  const idat = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    if (type === 'IHDR') {
      const d = buf.slice(pos + 8, pos + 8 + len)
      w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]
    } else if (type === 'IDAT') idat.push(buf.slice(pos + 8, pos + 8 + len))
    else if (type === 'IEND') break
    pos += 12 + len
  }
  const ch = ct === 6 ? 4 : ct === 2 ? 3 : 0
  if (!ch || bd !== 8) throw new Error('unsupported png ct=' + ct + ' bd=' + bd)
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = w * ch
  const out = Buffer.alloc(w * h * ch)
  let prev = Buffer.alloc(stride)
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.slice(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride)
    const cur = out.slice(y * stride, (y + 1) * stride)
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0, b = prev[x], c = x >= ch ? prev[x - ch] : 0
      let v = line[x]
      if (filter === 1) v += a
      else if (filter === 2) v += b
      else if (filter === 3) v += (a + b) >> 1
      else if (filter === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c)
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c)
      }
      cur[x] = v & 255
    }
    prev = cur
  }
  return { w, h, ch, data: out }
}
// A test process that dies between launch and close (timeout kill, crash) would
// otherwise leave a headless Chrome holding an isolated profile. One module-level
// hook reaps every live child at exit; close() is still the polite path.
const liveChildren = new Set()
process.on('exit', () => { for (const c of liveChildren) { try { c.kill() } catch {} } })
async function launch(options = {}) {
  /* Tests differ only in viewport, device scale, extra Chrome flags and the page
     they start on; all of it is plumbing and stays in this one file. */
  const { width = 1200, height = 800, dpr = 1.5, args = [], url = null } = options
  const chrome = [process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean).find(p => fs.existsSync(p))
  if (!chrome) throw new Error('Set CHROME_PATH to a Chrome/Edge executable')
  if (typeof WebSocket !== 'function') throw new Error('Browser tests require Node 22+')
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'endfield-cdp-'))
  const child=spawn(chrome,['--headless=new','--no-sandbox','--no-first-run','--no-default-browser-check',
    '--window-size=' + width + ',' + height,
    ...args,
    '--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'})
  liveChildren.add(child)
  let startupError=null
  child.on('error',e=>{startupError=e})
  let ws,seq=0
  const pending=new Map(),errors=[]
  async function close(){
    if(ws?.readyState===WebSocket.OPEN) { try { await send('Browser.close') } catch {} }
    ws?.close();child.kill();liveChildren.delete(child)
    for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Browser closed'))}
    pending.clear()
    // Chromium may still be releasing files on Windows; leave only this isolated
    // temp profile if removal is busy. It contains fixture data, never real login.
    try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:4,retryDelay:100})}catch{}
  }
  function send(method,params={}) {
    const id=++seq
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timed out'))},10000)
      pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}))
    })
  }
  try {
    const portFile=path.join(profile,'DevToolsActivePort')
    for(let i=0;!fs.existsSync(portFile)&&i<150;i++){if(startupError)throw startupError;await sleep(100)}
    if(!fs.existsSync(portFile))throw Error('Chrome startup timed out')
    const port=fs.readFileSync(portFile,'utf8').split('\n')[0]
    const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list',{signal:AbortSignal.timeout(5000)})).json()
    ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl)
    await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})})
    ws.addEventListener('message',event=>{
      const m=JSON.parse(event.data)
      if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}
      if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+': '+(m.params.exceptionDetails.exception?.description||''))
    })
    await send('Runtime.enable');await send('Page.enable')
    const setViewport = (d = dpr) =>
      send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:d,mobile:false})
    await setViewport()
    const evaluate=async expression=>{
      const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})
      if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
      return r.result.value
    }
    const api = {
      send,
      call: (method, params) => send(method, params || {}),
      evaluate, errors, close, sleep, setViewport,
      /* Poll a page-side predicate. The default ceiling is deliberately higher
         than the old --virtual-time-budget tests needed: those compressed real
         timers into virtual time, while here the wait is wall-clock. */
      async until(expression, timeoutMs = 10000){
        const deadline = Date.now() + timeoutMs
        for(;;){
          if(await evaluate(expression)) return
          if(Date.now() > deadline) throw Error('Condition timed out after ' + timeoutMs + 'ms: ' + expression)
          await sleep(100)
        }
      },
      async navigate(target){ await send('Page.navigate',{url:target}); await sleep(60) },
      /** Screenshot and decode it in one step (device pixels). */
      async screenshot(){
        const r = await send('Page.captureScreenshot',{format:'png'})
        return decodePng(Buffer.from(r.data,'base64'))
      },
      /** Screenshot straight to a PNG file (for tests that compare images later). */
      async screenshotTo(file){
        const r = await send('Page.captureScreenshot',{format:'png'})
        fs.writeFileSync(file, Buffer.from(r.data,'base64'))
        return file
      },
    }
    if (url !== null) {
      await api.navigate(url)
      await api.until("document.readyState === 'complete'")
    }
    return api
  }catch(error){await close();throw error}
}
const HTML=`<!doctype html><html><head><style>
html,body{height:100%;margin:0}body{--dsw-alias-bg-base:#e8e8e2;--dsw-alias-bg-layer-1:#f2f2ec;
--dsw-alias-label-primary:#101110;--dsw-alias-border-l1:#ccc;--dsw-alias-border-l2:#aaa}
body[data-ds-dark-theme]{--dsw-alias-bg-base:#101110;--dsw-alias-bg-layer-1:#181a17;--dsw-alias-label-primary:#f5f5f0}
.app_frame{position:relative;display:grid;grid-template-columns:220px 1fr;height:100%;background:var(--dsw-alias-bg-base)}
.app_centerCol,.app_sidebarCol{position:relative}.wSkVaW_root{height:100%}.test_tableScroll{margin:60px 30px}
td{padding:12px}[data-composer-card]{position:absolute;bottom:30px;left:260px;width:550px;height:90px;background:#eee}
[data-sidebar-right-panel]{position:absolute;right:0;top:0;width:120px;height:100%;background:#eee}
</style></head><body><div class="app_frame"><div class="app_sidebarCol" data-slot="sidebar"><div>Sidebar</div></div>
<div class="app_centerCol"><div class="wSkVaW_root"><table class="test_tableScroll"><tbody><tr><td id="cell">Selected text inside a hovered row</td></tr></tbody></table></div></div>
<div data-composer-card>Composer</div><div data-sidebar-right-panel="push">Docked panel</div></div></body></html>`
async function boot(browser,root,values={},prefix='') {
  await browser.send('Page.navigate',{url:'data:text/html,'+encodeURIComponent(HTML)})
  await browser.until('document.querySelector("#cell") !== null')
  await browser.evaluate(prefix+'\nwindow.__ModuleLoader__={load:m=>{window.__MOD__=m}}')
  await browser.evaluate(fs.readFileSync(path.join(root,'client.js'),'utf8'))
  const {BROWSER_SETTINGS_SCOPE_SNIPPET}=require(path.join(root,'test/fixtures/settings-scope.browser.js'))
  await browser.evaluate(BROWSER_SETTINGS_SCOPE_SNIPPET+`\nwindow.__prefs=__endfieldSettingsScope(${JSON.stringify({enabled:'1',loader:'0',watermark:'0',...values})});
    window.__disposers=[];window.__MOD__.factory(()=>null).apply({
      get:n=>n==='configForms'?__prefs.forms:n==='theme'?{overrideTokens:()=>()=>{}}:undefined,
      effect:f=>{const d=f();if(typeof d==='function')__disposers.push(d);return d}
    })`)
}
module.exports={launch,boot,decodePng}
