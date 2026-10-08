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
 *   node .github/scripts/dsh-track.js --apply <version> --dist-tags '<json>'
 *     更新记录文件，并把 package.json 的 version 提为 <version>（发版=同号）。
 *
 * 退出码：0 = 正常（changed 与否都是正常态）；1/2 = 错误。
 */
'use strict'

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..', '..')
const STATE_FILE = path.join(ROOT, '.github', 'dsh-track.json')
const PKG_FILE = path.join(ROOT, 'package.json')
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

const distTags = () => {
  assertOfficialRegistry()
  const tags = JSON.parse(npm(['view', PKG, 'dist-tags', '--json', '--prefer-online']))
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
    /* 候选：next 先于 latest（滚动通道领先时优先追它）；都等于记录则无变化。 */
    let version = null
    let channel = null
    for (const t of WATCHED) {
      if (tags[t] !== recorded) { version = tags[t]; channel = t; break }
    }
    const out = { changed: version !== null, version, channel, recorded, distTags: tags }
    console.log(JSON.stringify(out))
    process.exit(0)
  }

  if (mode === '--apply') {
    const version = process.argv[3]
    if (!version || !/^\d+\.\d+\.\d+(-[A-Za-z0-9.]+)?$/.test(version)) {
      console.error(`FAIL  --apply 需要一个合法版本号，收到: ${JSON.stringify(version ?? '')}`)
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

    /* 发版=同号：package.json 的 version 跟随 DSH 版本（docs/git.md 的发版约定）。 */
    const pkg = JSON.parse(fs.readFileSync(PKG_FILE, 'utf8'))
    if (pkg.version !== version) {
      pkg.version = version
      fs.writeFileSync(PKG_FILE, JSON.stringify(pkg, null, 2) + '\n')
      console.log(`ok    package.json version -> ${version}`)
    } else {
      console.log(`ok    package.json 已是 ${version}，无需改动`)
    }
    process.exit(0)
  }

  console.error('Usage: node .github/scripts/dsh-track.js --check | --apply <version> [--dist-tags <json>]')
  process.exit(2)
}

main()
