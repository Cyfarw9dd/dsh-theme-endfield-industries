#!/usr/bin/env node
/**
 * dsh-track.js — 监测 @deepseek-ai/dsh 的发布、维护已验证版本记录。
 *
 * 配套 .github/workflows/dsh-track.yml：定时（或手动）调用 --check 发现新版本，
 * 工作流跑完漂移探针 + 完整测试套件后再调用 --apply 落盘。细节与设计决策见
 * docs/cookbook/dsh-version-tracking.md。
 *
 * 监测通道：latest 与 next（去重后取一个候选；alpha 噪音大，不自动追，
 * 可通过 workflow_dispatch 手动指定版本去验证）。查询走 npm 官方源——
 * 本仓库的素材来源政策同样适用于版本信息：registry 不是官方 npmjs.org 就拒绝。
 *
 * 记录文件 .github/dsh-track.json 的 dshVersion 语义是「**已通过验证**的最后
 * 版本」，不是「最后见过的版本」：验证失败不落盘，下一次运行会重试同一版本，
 * 修好主题后无需人工干预即自动补发。
 *
 * Usage:
 *   node .github/scripts/dsh-track.js --check
 *     stdout 输出一行 JSON：{ changed, version, channel, recorded, distTags }
 *     候选必须是「比已验证版本更新」的通道目标：latest 落后 next 是常态
 *     （rc 构建只发 next），比记录旧的通道目标不算新版本，记 note 跳过。
 *   node .github/scripts/dsh-track.js --record <version> --dist-tags '<json>'
 *     只更新记录文件。**不再碰 package.json**：版本号是主题自己的 semver
 *     （自 0.3.0 起），发版走 .github/workflows/release.yml，对齐动作发生在
 *     Release notes 与漂移探针里，不发生在版本号里。
 *
 * 退出码：0 = 正常（changed 与否都是正常态）；1/2 = 错误。
 */
'use strict'

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..', '..')
const STATE_FILE = path.join(ROOT, '.github', 'dsh-track.json')
const PKG = '@deepseek-ai/dsh'
const WATCHED = ['next', 'latest'] // 优先级从高到低：next 是滚动通道

const npm = (args) => execFileSync('npm', args, {
  encoding: 'utf8',
  timeout: 60_000,
  maxBuffer: 4 * 1024 * 1024,
  stdio: ['ignore', 'pipe', 'pipe'],
})

/* 素材来源政策的等价物：版本信息只信官方 npm 源。 */
const assertOfficialRegistry = () => {
  const reg = npm(['config', 'get', 'registry']).trim()
  if (!/^https:\/\/registry\.npmjs\.org\/?$/.test(reg)) {
    console.error(`FAIL  npm registry 不是官方源: ${reg}（dsh-track 只从 registry.npmjs.org 取版本信息）`)
    process.exit(1)
  }
}

const readState = () => {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  } catch {
    return null // 首次运行（或记录损坏）：视为“从未验证过”
  }
}

/* ---------- 版本比较与候选选择（纯函数，test/dsh-track-guards.test.js 直测） ----------
 *
 * 事故背景（2026-10-23~24）：rc.3 只发了 next，latest 一直钉在 rc.2。追踪器从
 * next 验证并记录 rc.3 之后，每轮都发现 latest=rc.2 ≠ 记录，把一个旧版本当
 * 新版本反复验证。修复：候选必须比记录**更新**（semver 严格大于）；不比记录
 * 新的通道目标记入 skipped，在 CI 日志里留一行 note，不算事件。手动入口
 * （workflow_dispatch 指定版本）不受此约束——那是人的显式决定。 */

/* 只接受 --apply 同款形状：x.y.z[-pre]。npm dist-tags 不带构建元数据；带即非法。 */
const PRERELEASE_ID = /^[0-9A-Za-z.]+$/
const parseVersion = (v) => {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.]+))?$/.exec(v ?? '')
  if (!m || (m[4] !== undefined && !PRERELEASE_ID.test(m[4]))) return null
  return {
    core: [Number(m[1]), Number(m[2]), Number(m[3])],
    pre: m[4] === undefined ? null : m[4].split('.').map((id) => (/^\d+$/.test(id) ? Number(id) : id)),
  }
}

/* 语义与 node-semver 一致：>0 = a 更新，<0 = a 更旧，0 = 等价。
   预发布标识符双数字比数字、双字符串比字典序、数字恒小于字符串；
   无预发布 > 有预发布；相同前缀下标识符更多者更大。 */
const compareVersions = (a, b) => {
  const va = parseVersion(a)
  const vb = parseVersion(b)
  if (va === null) throw new Error(`版本号无法解析: ${JSON.stringify(a ?? '')}`)
  if (vb === null) throw new Error(`版本号无法解析: ${JSON.stringify(b ?? '')}`)
  for (let i = 0; i < 3; i++) {
    if (va.core[i] !== vb.core[i]) return va.core[i] - vb.core[i]
  }
  if (va.pre === null && vb.pre === null) return 0
  if (va.pre === null) return 1
  if (vb.pre === null) return -1
  const n = Math.min(va.pre.length, vb.pre.length)
  for (let i = 0; i < n; i++) {
    const x = va.pre[i]
    const y = vb.pre[i]
    if (x === y) continue
    const xn = typeof x === 'number'
    const yn = typeof y === 'number'
    if (xn && yn) return x - y
    if (xn !== yn) return xn ? -1 : 1 // 数字标识符恒小于字母数字标识符
    return x < y ? -1 : 1
  }
  return va.pre.length - vb.pre.length
}

/* 候选选择：按 WATCHED 顺序找第一个「不等于记录且严格更新」的通道目标；
   相等或更旧的通道记入 skipped。记录为 null（首次运行）时任何目标都算新。
   解析不了的版本号直接抛错——绝不静默跳过。 */
const pickCandidate = (tags, recorded, watched = WATCHED) => {
  const skipped = []
  for (const t of watched) {
    if (typeof tags[t] !== 'string') {
      throw new Error(`dist-tags 缺少被监测的通道 "${t}": ${JSON.stringify(tags)}`)
    }
    if (tags[t] === recorded) continue
    if (recorded === null || compareVersions(tags[t], recorded) > 0) {
      return { version: tags[t], channel: t, skipped }
    }
    skipped.push({ channel: t, version: tags[t] })
  }
  return { version: null, channel: null, skipped }
}

/* npm ≥12 的 `view <pkg> dist-tags --json` 把单结果也包成数组；npm ≤11 返回裸对象。
 * CI（setup-node 的 node 22 自带 npm 10）与本地（npm 12）两种形状都真实出现过。
 * 收缩成对象；空数组/多元素/非对象说明输出语义变了，交给下面的缺通道检查大声失败。 */
const normalizeDistTags = (parsed) => {
  if (!Array.isArray(parsed)) return parsed
  if (parsed.length === 1 && parsed[0] && typeof parsed[0] === 'object') return parsed[0]
  return null
}

const distTags = () => {
  assertOfficialRegistry()
  const tags = normalizeDistTags(JSON.parse(npm(['view', PKG, 'dist-tags', '--json', '--prefer-online'])))
  if (!tags || typeof tags !== 'object') {
    console.error(`FAIL  dist-tags 输出形状无法识别: ${JSON.stringify(tags)}`)
    process.exit(1)
  }
  for (const t of WATCHED) {
    if (typeof tags[t] !== 'string') {
      console.error(`FAIL  官方源返回的 dist-tags 缺少 "${t}" 通道: ${JSON.stringify(tags)}`)
      process.exit(1)
    }
  }
  return tags
}

const main = () => {
  const mode = process.argv[2]

  if (mode === '--check') {
    const tags = distTags()
    const recorded = readState()?.dshVersion ?? null
    /* 候选：next 先于 latest（滚动通道领先时优先追它），且必须比记录新；
       都不比记录新（含「与记录相等」）则无变化。 */
    let pick
    try {
      pick = pickCandidate(tags, recorded)
    } catch (err) {
      console.error(`FAIL  ${err.message}`)
      process.exit(1)
    }
    for (const s of pick.skipped) {
      console.error(`note  通道 ${s.channel}=${s.version} 不比已验证的 ${recorded} 新，跳过（latest 落后 next 是常态，不算新版本）`)
    }
    const out = {
      changed: pick.version !== null,
      version: pick.version,
      channel: pick.channel,
      recorded,
      distTags: tags,
    }
    console.log(JSON.stringify(out))
    process.exit(0)
  }

  if (mode === '--record') {
    const version = process.argv[3]
    if (!version || !/^\d+\.\d+\.\d+(-[A-Za-z0-9.]+)?$/.test(version)) {
      console.error(`FAIL  --record 需要一个合法版本号，收到: ${JSON.stringify(version ?? '')}`)
      process.exit(2)
    }
    const tagsIdx = process.argv.indexOf('--dist-tags')
    const tags = tagsIdx > 0 && process.argv[tagsIdx + 1]
      ? JSON.parse(process.argv[tagsIdx + 1])
      : distTags()

    const state = {
      dshVersion: version,
      distTags: tags,
      updatedAt: new Date().toISOString(),
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n')
    console.log(`ok    记录已更新: dshVersion=${version}`)
    process.exit(0)
  }

  console.error('Usage: node .github/scripts/dsh-track.js --check | --record <version> [--dist-tags <json>]')
  process.exit(2)
}

/* 直接运行才执行主流程；被 require 时只导出纯函数供测试。 */
module.exports = { compareVersions, pickCandidate, normalizeDistTags }

if (require.main === module) main()
