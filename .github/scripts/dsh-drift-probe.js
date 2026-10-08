#!/usr/bin/env node
/**
 * dsh-drift-probe.js — 对一份真实安装的 @deepseek-ai/dsh 依赖树做契约漂移检查。
 *
 * 为什么需要它。测试套件里的上游 CSS / DOM 契约是**逐字抄进测试文件的冻结快照**
 * （hover-check 等），它们验证的是「主题对着当年那份 bundle 的行为」，不能发现
 * DSH 新版悄悄改了类名后缀 / 令牌 / 锚点。docs/compatibility.md 的流程一直写着
 * 「每当 upstream 发布新版本，跑一遍 npm test 并对照新 bundle」——那是手工的，
 * 这个探针把其中可机械化的部分固化：
 *
 *   1. 从主题自己的 client.js 里**提取**它实际依赖的三类契约：
 *      - CSS module 语义后缀钩子  [class$='_x'] / [class*='_x'] / [class^='_x']
 *      - 上游设计令牌             var(--dsw-*)
 *      - 上游 data-* 锚点         [data-*]（data-endfield-* / data-plugin 是主题
 *                                 自设的，不算上游契约，自动排除）
 *      提取而非手抄清单：清单永远与真实使用的钩子同步，不会腐化。
 *   2. 在安装树（node_modules/@deepseek-ai）里逐个验证仍然存在。
 *      后缀按「`_x` 后不接标识符字符」的词边界匹配；令牌与锚点按字面匹配。
 *
 * 失配意味着什么：选择器/探测器在新版上静默失配（不报错、不生效），正是
 * selector-guard.test.js 头注里 DSH 0.1.2-rc.1 全量重哈希那次事故的形状。
 * 探针输出每条失配在 client.js 里的使用位置，供修复定位。
 *
 * 已退役钩子（RETIRED）：上游已删除、主题**有意保留**规则以兼容旧宿主的钩子。
 * 新增条目必须写明理由与退役版本。豁免条目若从 client.js 中消失，会提示清理。
 *
 * Usage:
 *   node .github/scripts/dsh-drift-probe.js <node_modules/@deepseek-ai> [client.js]
 *
 * 退出码：0 = 全部契约命中（或已豁免）；1 = 有失配。
 */
'use strict'

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', '..')
const CLIENT = process.argv[3] ? path.resolve(process.argv[3]) : path.join(ROOT, 'client.js')
const TREE = process.argv[2] ? path.resolve(process.argv[2]) : ''

if (!TREE) {
  console.error('Usage: node .github/scripts/dsh-drift-probe.js <node_modules/@deepseek-ai> [client.js]')
  process.exit(2)
}
if (!fs.existsSync(TREE)) {
  console.error(`FAIL  安装树不存在: ${TREE}`)
  process.exit(2)
}

/* ---------- 已退役钩子：上游已删、主题保留规则兼容旧宿主 ---------- */
const RETIRED = new Map([
  ['_heroGlow',
    // DSH 0.2.0 移除了 ConversationRoot 的 <HeroGlow>（0.2.0-rc.2 安装树里已无任何
    // heroGlow 痕迹，探针首次运行即发现）。主题规则 [class*='_heroGlow'] ellipse
    // 在 0.1.x 宿主上仍然有效，静默失配无害，故保留规则并在此豁免。
    'DSH 0.2.0 移除 <HeroGlow>；规则为 0.1.x 宿主保留'],
  ['_headlineText',
    // DSH 0.2.0 移除了新会话 hero 的 headlineText 节点（安装树里连子串都没有，
    // 现存的是 *_headline 家族）。主题两个消费点——findVisibleHeadline()（水印
    // 避让，client.js:1265）与 hero 插入锚点（client.js:1493）——都是 null 安全
    // 的探测器，在 0.2 上返回 null 走既有兜底，在 0.1.x 宿主上仍生效。
    'DSH 0.2.0 移除 hero 的 headlineText；两个 null 安全探测器为 0.1.x 宿主保留'],
])

/* ---------- 主题自设（非上游契约）的 data 属性 ---------- */
const OWN_DATA_ANCHOR = (name) =>
  name.startsWith('data-endfield-') || name === 'data-plugin'

const src = fs.readFileSync(CLIENT, 'utf8')

/* ---------- 1. 从 client.js 提取契约 ---------- */
const classSuffixes = new Set()
for (const m of src.matchAll(/\[class[$*^]\s*=\s*(['"])(_[A-Za-z0-9]+)\1\]/g)) {
  classSuffixes.add(m[2])
}
const tokens = new Set()
for (const m of src.matchAll(/var\(\s*(--dsw-[A-Za-z0-9-]+)/g)) {
  tokens.add(m[1])
}
const dataAnchors = new Set()
for (const m of src.matchAll(/\[data-([A-Za-z-]+)/g)) {
  if (!OWN_DATA_ANCHOR('data-' + m[1])) dataAnchors.add('data-' + m[1])
}

if (classSuffixes.size + tokens.size + dataAnchors.size === 0) {
  console.error('FAIL  从 client.js 提取不到任何契约——提取正则失效了？')
  process.exit(1)
}

/* 契约在 client.js 里的首个使用行，失配时给人看。 */
const firstLine = (needle) => {
  const idx = src.indexOf(needle)
  return idx < 0 ? '?' : String(src.slice(0, idx).split('\n').length)
}

/* ---------- 2. 收集安装树语料（.js/.css，跳过 source map） ---------- */
const corpus = []
const walk = (dir) => {
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { walk(p); continue }
    const ext = path.extname(e.name).toLowerCase()
    if ((ext === '.js' || ext === '.css') && ext !== '.map' && !e.name.endsWith('.map')) {
      corpus.push(p)
    }
  }
}
walk(TREE)

/* 待验证清单：suffix -> { re, kind, where } */
const pending = new Map()
const addPending = (kind, name, matcher) => {
  if (RETIRED.has(name)) return // 豁免的仍要校验“还在被使用”，见下文
  pending.set(kind + ':' + name, { kind, name, matcher })
}
for (const s of classSuffixes) {
  addPending('class-suffix', s, new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z0-9_-])'))
}
for (const t of tokens) addPending('token', t, t)
for (const a of dataAnchors) addPending('data-anchor', a, a)

/* ---------- 3. 扫描：每个文件对仍未命中的契约做一次匹配 ---------- */
const hitIn = new Map() // kind:name -> 首个命中文件
for (const file of corpus) {
  if (pending.size === 0) break
  let text
  try { text = fs.readFileSync(file, 'utf8') } catch { continue }
  for (const [key, c] of pending) {
    const okMatch = c.matcher instanceof RegExp ? c.matcher.test(text) : text.includes(c.matcher)
    if (okMatch) { hitIn.set(key, file); pending.delete(key) }
  }
}

/* ---------- 4. 报告 ---------- */
let failures = 0
const pass = (m) => console.log('ok    ' + m)
const fail = (m) => { console.error('FAIL  ' + m); failures++ }

const rel = (p) => path.relative(path.resolve(TREE, '..', '..'), p)

for (const s of [...classSuffixes].sort()) {
  const key = 'class-suffix:' + s
  if (hitIn.has(key)) {
    if (RETIRED.has(s)) continue // 豁免但命中了——新包可能恢复了该元素，提示解除豁免
    pass(`类后缀 ${s}（client.js:${firstLine(s)}）→ ${rel(hitIn.get(key))}`)
  } else if (RETIRED.has(s)) {
    pass(`类后缀 ${s} 已豁免（${RETIRED.get(s)}）`)
  } else {
    fail(`类后缀 ${s} 在安装树中不存在（client.js:${firstLine(s)} 使用）——` +
      '上游改名/删除了这个语义后缀，相关规则将静默失配')
  }
}
for (const t of [...tokens].sort()) {
  const key = 'token:' + t
  if (hitIn.has(key)) {
    pass(`令牌 ${t}（client.js:${firstLine(t)}）→ ${rel(hitIn.get(key))}`)
  } else {
    fail(`令牌 ${t} 在安装树中不存在（client.js:${firstLine(t)} 使用）——` +
      '上游改名了设计令牌，var() 将解析为空并走兜底值（或彻底失去上游配色跟随）')
  }
}
for (const a of [...dataAnchors].sort()) {
  const key = 'data-anchor:' + a
  if (hitIn.has(key)) {
    pass(`锚点 [${a}]（client.js:${firstLine('[' + a)}）→ ${rel(hitIn.get(key))}`)
  } else {
    fail(`锚点 [${a}] 在安装树中不存在（client.js:${firstLine('[' + a)} 使用）——` +
      '上游改了 data 属性命名，对应探测器/选择器失效')
  }
}

/* 豁免条目不再被 client.js 引用 → 提示清理豁免清单。 */
for (const [name, reason] of RETIRED) {
  if (!classSuffixes.has(name) && !tokens.has(name) && !dataAnchors.has(name)) {
    console.error(`note  豁免条目 ${name} 已不被 client.js 引用，可从 RETIRED 清单移除（${reason}）`)
  }
}

const retiredActive = [...RETIRED.keys()].filter((n) => classSuffixes.has(n)).length
const total = classSuffixes.size + tokens.size + dataAnchors.size
console.log(`SUMMARY: ${total} 项契约，${total - failures - retiredActive} 命中，` +
  `${failures} 失配，${retiredActive} 豁免`)

if (failures > 0) {
  console.error('      以上失配项不会报运行时错误——它们就是“静默失效”。' +
    '按 docs/compatibility.md 的新版本流程处理后，把结论沉淀进该文档。')
  process.exit(1)
}
