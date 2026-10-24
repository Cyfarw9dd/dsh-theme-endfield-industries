/**
 * theme-values.js — 测试侧的主题真值单一读取口。
 *
 * 为什么存在：fixture 曾经把主题色值抄成字面量，主题一改（2026-10-24 暗色
 * 三档把 #101110 系整组退役）抄过的测试就集体过期——有的安静测错底色
 * （hero-logo），有的让本该翻红的回归绿灯（watermark 的 1.32 上限跑在
 * 退役的最深底上，而 0.105→0.095 修的是最亮 C 档）。本模块把「梯度/令牌/
 * 半径/水印 alpha」全部从真实源（scripts/lib/sources.js 的 concatCss 与
 * concatClientJs）读出，fixture 引用它，令牌一改处处随，不再人肉同步。
 *
 * 所有读取失败都抛错（require 即响亮崩），绝不静默回退。
 */
const sources = require('../../scripts/lib/sources.js')

const css = sources.concatCss()
const clientSrc = sources.concatClientJs()
const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '')

const die = (what) => { throw new Error('theme-values: ' + what + ' 无法从真实源读出——令牌结构变了？先修这里，别抄字面量。') }

/* ---------- 暗色三档梯度（tokens.css）----------
   默认档 = 第一个声明 --edge-dark-base 的 body 块；neutral/warm 各有
   body[data-endfield-dark='…'] 属性块。键名转 camelCase。 */
const LADDER_KEYS = [
  ['base', 'base'], ['layer-1', 'layer1'], ['layer-2', 'layer2'],
  ['raised', 'raised'], ['overlay', 'overlay'],
  ['border-l1', 'borderL1'], ['border-l2', 'borderL2'],
  ['label-primary', 'labelPrimary'], ['label-secondary', 'labelSecondary'],
]
const parseLadderBlock = (block) => {
  const out = {}
  for (const [cssName, key] of LADDER_KEYS) {
    const m = new RegExp('--edge-dark-' + cssName + ':\\s*(#[0-9a-f]{6})', 'i').exec(block)
    if (!m) die('梯度块缺少 --edge-dark-' + cssName)
    out[key] = m[1].toLowerCase()
  }
  return out
}
const LADDERS = {}
{
  let defaultDone = false
  for (const m of noComments.matchAll(/\bbody\s*\{([^}]*)\}/g)) {
    if (!defaultDone && /--edge-dark-base:/.test(m[1])) {
      LADDERS.soft = parseLadderBlock(m[1]); defaultDone = true
    }
  }
  if (!defaultDone) die('默认暗色档（body 块的 --edge-dark-* 梯度）')
  for (const tier of ['neutral', 'warm']) {
    const m = new RegExp("body\\[data-endfield-dark='" + tier + "'\\]\\s*\\{([^}]*)\\}").exec(noComments)
    if (!m) die("暗色档位块 body[data-endfield-dark='" + tier + "']")
    LADDERS[tier] = parseLadderBlock(m[1])
  }
}
const TIERS = ['soft', 'warm', 'neutral']

/* tokens.js 暗色列的 var() 引用解析成指定档的字面值（非 var 的原样返回） */
const resolveDark = (raw, tier = 'soft') => {
  const v = /^var\(--edge-dark-([a-z0-9-]+)\)$/.exec(String(raw).trim())
  if (!v) return raw
  const key = LADDER_KEYS.find(([cssName]) => cssName === v[1])
  return key ? LADDERS[tier][key[1]] : undefined
}

/* ---------- 令牌覆盖表（src/client/ui/tokens.js，经整树拼接）----------
   暗色列经 resolveDark 解析到默认档（浏览器测试不设档位属性时即默认档）。 */
const jsTokenPair = (name, tier = 'soft') => {
  const m = new RegExp("'" + name + "'\\s*:\\s*\\{\\s*light:\\s*'(#[0-9a-f]{6})'\\s*,\\s*dark:\\s*'([^']+)'", 'i').exec(clientSrc)
  if (!m) die('tokens.js 覆盖表里读不到 ' + name)
  const dark = resolveDark(m[2], tier)
  if (!/^#[0-9a-f]{6}$/i.test(dark)) die(name + ' 暗色列解析不出档位字面值：' + m[2])
  return { light: m[1].toLowerCase(), dark: dark.toLowerCase() }
}

/* ---------- 微倒角三档（tokens.css）与水印 alpha ---------- */
const RADIUS = {}
for (const [key, name] of [['main', '--edge-radius'], ['sm', '--edge-radius-sm'], ['card', '--edge-radius-card']]) {
  const m = new RegExp(name + ':\\s*([0-9]+(?:\\.[0-9]+)?px)').exec(noComments)
  if (!m) die('tokens.css 里读不到 ' + name)
  RADIUS[key] = m[1]
}
const WM = {}
{
  for (const [mode, anchor] of [['light', /\bbody\s*\{/], ['dark', /body\[data-ds-dark-theme\]\s*\{/]]) {
    let block = null
    for (const m of noComments.matchAll(new RegExp(anchor.source + '([^}]*)\\}', 'g'))) {
      if (/--edge-wm-alpha:/.test(m[1])) { block = m[1]; break }
    }
    if (!block) die('水印 alpha 块（' + mode + '）')
    const letters = /--edge-wm-alpha:\s*([0-9.]+)/.exec(block)
    const emblem = /--edge-wm-emblem-alpha:\s*([0-9.]+)/.exec(block)
    if (!letters || !emblem) die('水印 alpha 值（' + mode + '）')
    WM[mode] = { letters: parseFloat(letters[1]), emblem: parseFloat(emblem[1]) }
  }
}

/* 水印上限（watermark-stacking 的可读性带，与 tokens.css 注释同源） */
const WM_CEILING = { light: 1.43, dark: 1.32 }

module.exports = { TIERS, LADDERS, resolveDark, jsTokenPair, RADIUS, WM, WM_CEILING, css, clientSrc }
