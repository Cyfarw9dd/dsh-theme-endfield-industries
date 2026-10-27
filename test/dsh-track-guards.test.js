/**
 * dsh-track-guards.test.js — 追踪器不得把「更旧的 dist-tag 目标」当新版本。
 *
 * THE INCIDENT (2026-10-23~24). rc.3 只发了 next 通道，latest 一直钉在 rc.2。
 * 追踪器从 next 验证并记录 rc.3 之后，每 6 小时一轮的探测都发现
 * latest=rc.2 ≠ 记录，把一个**旧版本**反复当新版本去验证——连续三轮红，
 * 而且报警 job 因为 if 里缺状态函数被隐式 success() 吞掉，一次都没响。
 * 本文件钉死那次事故换来的防护，以及 2026-10-24 版本语义切换（镜像→own semver）的契约：
 *
 *   1. pickCandidate / compareVersions（.github/scripts/dsh-track.js）：
 *      通道目标必须比记录「严格更新」才算候选；latest 落后 next 是 DSH 的
 *      常态（rc 构建只发 next），不算事件。事故现场的通道快照与已验证
 *      版本从 .github/dsh-track.json 真实读取，不在测试里复述数值。
 *   2. 验证 job 必须在跑 test:ci 之前安装 devDependencies（tsdown 门禁），
 *      否则验证一律红在 scripts/build-client.js --check 上。
 *   3. 报警 job 的 if 必须以状态检查函数开头（!cancelled()）——不含状态
 *      函数时 GitHub 隐式包一层 success()，validate 一红报警就被整体 skip。
 *      2 和 3 都直接对 .github/workflows/dsh-track.yml 的真实文本断言。
 *
 * Usage: node test/dsh-track-guards.test.js
 */
const fs = require('fs')
const path = require('path')
const { compareVersions, pickCandidate, normalizeDistTags } = require('../.github/scripts/dsh-track.js')

const ROOT = path.resolve(__dirname, '..')

let failures = 0
const pass = (m) => console.log('ok    ' + m)
const fail = (m) => { console.error('FAIL  ' + m); failures++ }
const eq = (actual, expected, m) => (
  JSON.stringify(actual) === JSON.stringify(expected)
    ? pass(m)
    : fail(m + ' — 期望 ' + JSON.stringify(expected) + '，实得 ' + JSON.stringify(actual))
)

/* ---------- 1. compareVersions：semver 子集的次序语义 ---------- */

eq(compareVersions('0.2.1', '0.2.1-rc.3') > 0, true, '无预发布 > 同号预发布（0.2.1 > 0.2.1-rc.3）')
eq(compareVersions('0.2.1-rc.10', '0.2.1-rc.9') > 0, true, '预发布数字标识符按数值比（rc.10 > rc.9）')
eq(compareVersions('0.2.1-rc.1', '0.2.1-alpha.5') > 0, true, '预发布字母标识符按字典序（rc > alpha）')
eq(compareVersions('0.2.2-alpha.1', '0.2.1') > 0, true, '核心三元组优先于预发布（0.2.2-alpha.1 > 0.2.1）')
eq(compareVersions('0.2.1-rc.2', '0.2.1-rc.3') < 0, true, 'rc.2 < rc.3（事故里的方向）')
eq(compareVersions('0.2.1-rc.3', '0.2.1-rc.3'), 0, '同串等价')
eq(compareVersions('0.2.1-rc.3.1', '0.2.1-rc.3') > 0, true, '同前缀下标识符更多者更大')

let threwParse = null
try { compareVersions('banana', '0.2.1') } catch (e) { threwParse = e.message }
eq(threwParse !== null, true, '无法解析的版本号抛错（绝不静默比较）')

/* 事故的真实快照：#11 发版那一刻的 dist-tags 与已验证版本（多处断言共用）。 */
const state = JSON.parse(fs.readFileSync(path.join(ROOT, '.github', 'dsh-track.json'), 'utf8'))

/* npm ≥12 单结果包数组、npm ≤11 裸对象——本机 npm 12 与 CI npm 10 都真实出现过。 */
eq(normalizeDistTags([state.distTags]), state.distTags, 'npm 12 的单元素数组收缩回对象（真实快照）')
eq(normalizeDistTags(state.distTags), state.distTags, 'npm 10 的裸对象原样通过')
eq(normalizeDistTags([]), null, '空数组 → null（由缺通道检查大声失败）')
eq(normalizeDistTags([{ latest: '1' }, { latest: '2' }]), null, '多元素数组 → null（语义不明不猜）')

/* ---------- 2. pickCandidate：事故现场重放 ---------- */

const replay = pickCandidate(state.distTags, state.dshVersion)
eq(replay.version, null,
  '事故重放：next=' + state.distTags.next + ' / latest=' + state.distTags.latest +
  ' 对记录 ' + state.dshVersion + ' 不再产生候选')
eq(replay.skipped.some((s) => s.channel === 'latest'), true, '落后的 latest 记入 skipped（note 可追溯）')

eq(pickCandidate({ next: '0.2.2-rc.1', latest: '0.2.1-rc.3' }, '0.2.1-rc.3'),
  { version: '0.2.2-rc.1', channel: 'next', skipped: [] }, 'next 出真正的新版本照常追')
eq(pickCandidate({ next: '0.2.1-rc.3', latest: '0.2.1-rc.3' }, '0.2.1-rc.3').version, null,
  '通道目标与记录相等 → 无变化')
eq(pickCandidate({ next: '0.2.1-rc.2', latest: '0.2.1-rc.2' }, null).channel, 'next',
  '首次运行（无记录）任何目标都是候选')
eq(pickCandidate({ next: '0.3.0', latest: '0.2.1-rc.2' }, '0.2.1-rc.3'),
  { version: '0.3.0', channel: 'next', skipped: [] },
  'next 领先时优先追它（找到候选即停，后续通道不再检查）')

let threwChannel = null
try { pickCandidate({ latest: '0.2.1' }, '0.2.0') } catch (e) { threwChannel = e.message }
eq(threwChannel !== null, true, '缺被监测通道时抛错（绝不静默跳过）')

/* ---------- 3. workflow 契约：对真实文本断言 ---------- */

const yml = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'dsh-track.yml'), 'utf8')
const rel = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'release.yml'), 'utf8')
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))

const reportIf = yml.split('\n').find((l) => l.trim().startsWith('if:') && l.includes("needs.validate.result == 'failure'"))
if (reportIf && /!cancelled\(\)/.test(reportIf)) {
  pass('报警 job 的 if 以 !cancelled() 开头（防隐式 success() 吞报警）')
} else {
  fail('报警 job 的 if 缺 !cancelled() — ' + JSON.stringify(reportIf ?? '(未找到)'))
}

const installAt = yml.indexOf('npm install --no-audit --no-fund')
const suiteAt = yml.indexOf('run-tests.js test:ci')
if (installAt > 0 && suiteAt > installAt) {
  pass('validate 在跑测试套件前安装构建依赖（tsdown 门禁）')
} else {
  fail('validate 缺 npm install --no-audit --no-fund（install@' + installAt + ', suite@' + suiteAt + '）')
}

/* ---------- 4. 雷达/发版拆分契约（2026-10-24 版本语义切换） ---------- */

/* 雷达不发版：dsh-track.yml 里不得再出现任何发版动作；记录走 --record。 */
eq(yml.includes('gh release create'), false, '雷达 workflow 不创建 GitHub Release（发版在 release.yml）')
eq(yml.includes('git tag -a'), false, '雷达 workflow 不打 tag')
eq(yml.includes('refs/tags/v'), false, '雷达 workflow 不推 tag')
eq(yml.includes('--record'), true, '雷达用 --record 落盘（--apply 同号时代已退役）')
eq(yml.includes('--apply'), false, '雷达不再引用 --apply')
const trackSrc = fs.readFileSync(path.join(ROOT, '.github', 'scripts', 'dsh-track.js'), 'utf8')
eq(trackSrc.includes('PKG_FILE'), false, 'dsh-track.js 不再持有 package.json 句柄（--record 只写记录文件）')

/* 发版管线必须自带：手动入口、装依赖、实测版探针、全量套件、tag/Release、npm 闸门。 */
eq(rel.includes('workflow_dispatch'), true, 'release.yml 以手动 dispatch 触发（自己的发版节奏）')
const relInstall = rel.indexOf('npm install --no-audit --no-fund')
const relProbe = rel.indexOf('dsh-drift-probe.js')
const relSuite = rel.indexOf('run-tests.js test:ci')
if (relInstall > 0 && relProbe > relInstall && relSuite > relProbe) {
  pass('release.yml 顺序：装依赖 → 实测版探针 → 全量套件')
} else {
  fail('release.yml 门禁顺序不对（install@' + relInstall + ', probe@' + relProbe + ', suite@' + relSuite + '）')
}
eq(rel.includes('dsh-track.json'), true, 'release.yml 从雷达记录取实测 DSH 版本（对齐发生在探针与 notes）')
eq(rel.includes('gh release create'), true, 'release.yml 负责创建 GitHub Release')
const npmStep = rel.split('\n').find((l) => l.trim().startsWith('if:') && l.includes('inputs.publish_npm'))
if (npmStep && npmStep.includes('inputs.publish_npm')) {
  pass('npm publish 步骤被 inputs.publish_npm 闸住（默认关闭）')
} else {
  fail('npm publish 闸门缺失 — ' + JSON.stringify(npmStep ?? '(未找到)'))
}

/* 版本语义不变量：主题版本号与记录的 DSH 版本**永久解耦**——两者相等
   说明 --apply 时代的同号提升又回来了（或有人手动改错了）。 */
eq(pkg.version === state.dshVersion, false,
  'package.json ' + pkg.version + ' ≠ 记录的 DSH ' + state.dshVersion + '（版本号归主题，对齐进元数据）')
eq(typeof pkg.engines?.dsh, 'string', 'engines.dsh 声明宿主区间（生态惯例：wallpaper-engine/cost-meter 同款）')

/* ---------- 5. 漂移探针的自设锚点豁免（2026-10-26/27 radar #25/#26 误红） ----------
 * 水印 band 往 body 写 data-edge-wm-*（76a7a75），探针没豁免该前缀，把它们当
 * 上游契约去安装树里找 → 0.2.1-rc.4 验证连续两轮误红。断言改在真实源码文本上：
 * 两个自设前缀 + data-plugin 缺一不可。 */
const probeSrc = fs.readFileSync(path.join(ROOT, '.github', 'scripts', 'dsh-drift-probe.js'), 'utf8')
const ownAnchor = probeSrc.split('const OWN_DATA_ANCHOR =')[1]?.split('\n').slice(0, 2).join('\n') ?? ''
eq(ownAnchor.includes("startsWith('data-endfield-')"), true, '探针豁免自设前缀 data-endfield-')
eq(ownAnchor.includes("startsWith('data-edge-')"), true, '探针豁免自设前缀 data-edge-')
eq(ownAnchor.includes("=== 'data-plugin'"), true, '探针豁免自设属性 data-plugin')

if (failures > 0) {
  console.error('')
  console.error(failures + ' 项失败')
  process.exit(1)
}
console.log('')
console.log('ok    dsh-track 防护全部通过')
