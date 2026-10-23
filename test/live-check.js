/**
 * live-check.js — verify the palette against the bundle the RUNNING GUI serves,
 * not the local file. The web profile symlinks this package, so the two should be
 * identical — but "should be" is exactly the kind of assumption worth checking
 * before telling someone the feature is live.
 *
 * Usage: node test/live-check.js [baseUrl]
 */
const fs = require('fs')
const path = require('path')
const http = require('http')

const BASE = process.argv[2] || 'http://127.0.0.1:3080'
const URL_PATH = '/plugins/dsh-theme-endfield/client.js'
const ROOT = path.resolve(__dirname, '..')

const get = (url) => new Promise((resolve, reject) => {
  http.get(url, (res) => {
    if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode + ' for ' + url)); res.resume(); return }
    let d = ''
    res.setEncoding('utf8')
    res.on('data', (c) => { d += c })
    res.on('end', () => resolve(d))
  }).on('error', reject)
})

let failures = 0
const pass = (m) => console.log('ok    ' + m)
const fail = (m) => { console.error('FAIL  ' + m); failures++ }

;(async () => {
  let served
  try { served = await get(BASE + URL_PATH) } catch (e) {
    console.error('FAIL  could not fetch the live bundle: ' + e.message)
    console.error('      (is the GUI running at ' + BASE + '?)')
    process.exit(1)
  }
  pass('live bundle fetched from ' + BASE + URL_PATH + ' (' + served.length + ' bytes)')

  const local = fs.readFileSync(path.join(ROOT, 'client.js'), 'utf8')
  /* Compare ignoring line endings: the repo is CRLF and the server may normalise. */
  const norm = (s) => s.replace(/\r\n/g, '\n')
  if (norm(served) === norm(local)) pass('served bundle is byte-identical to client.js (symlink is live)')
  else fail('the served bundle DIFFERS from client.js — the GUI is running older code')

  /* The palette contract, checked against what the browser will actually run.
     One palette ships: 谷地黄 #fff500 on the plain body block. The switchable
     palettes and their setting row are gone, so their remains must be ABSENT
     from the served bundle as well as the local one. */
  const required = [
    ['--edge-accent: #fff500', '谷地黄 accent (the one palette)'],
    ['--edge-accent-rgb: 255, 245, 0', '谷地黄 channel list (same colour, for rgba washes)'],
        ["dark: 'var(--edge-accent)'", 'brand token follows the palette'],
  ]
  for (const [needle, label] of required) {
    if (served.includes(needle)) pass('live: ' + label)
    else fail('live bundle is missing ' + label + ' (' + needle + ')')
  }

  const forbidden = [
    ['body.theme-endfield-wuling', '武陵青 override block'],
    ['body.theme-endfield-gray', '终末地灰 override block'],
    ["'dsh-theme-endfield-palette'", 'palette storage key'],
    ['切换武陵青', 'settings row offering 武陵青'],
    ['切换谷地黄', 'settings row offering 谷地黄'],
    ['#14d0d0', '武陵青 accent hex'],
  ]
  for (const [needle, label] of forbidden) {
    if (!served.includes(needle)) pass('live: no leftover ' + label)
    else fail('live bundle still carries the removed ' + label + ' (' + needle + ')')
  }

  console.log('')
  if (failures) { console.error(failures + ' live check(s) failed'); process.exit(1) }
  console.log('the running GUI is serving the palette feature')
})()
