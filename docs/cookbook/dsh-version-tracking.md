# DSH 版本追踪与发版

本页回答「怎么做」：雷达如何在新版 DSH 出现时自动验证并落记录，发版如何按主题
自己的节奏走、并把 Release 对齐到实测的 DSH 版本。为什么这样做（上游依赖面的
风险分级）见 [../compatibility.md](../compatibility.md)。

## 机制总览

| 部件 | 位置 | 职责 |
| --- | --- | --- |
| 兼容雷达 | `.github/workflows/dsh-track.yml` | 每 6 小时（cron `23 */6 * * *`，UTC）+ 手动触发；探测→验证→落记录/报警，**不发版** |
| 版本探测 | `.github/scripts/dsh-track.js --check` | 查 npm **官方源**的 `@deepseek-ai/dsh` dist-tags（registry 不是 npmjs.org 即拒绝）；对比记录文件输出 JSON |
| 漂移探针 | `.github/scripts/dsh-drift-probe.js` | 从 client.js **自动提取**三类上游契约，在目标版安装树里逐项验证 |
| 验证记录 | `.github/dsh-track.json` | `dshVersion` 语义是「**已通过验证**的最后版本」；验证失败不落盘 |
| 落盘 | `.github/scripts/dsh-track.js --record` | 只写记录文件（github-actions[bot] 提交推送）；不碰 package.json |
| 发版管线 | `.github/workflows/release.yml` | 手动 dispatch：全量门禁 + 对实测版重跑探针 → tag/Release（npm publish 预留） |

监测通道是 **latest 与 next**（next 优先）；alpha 噪音大不自动追，要验证时用
workflow_dispatch 手动填版本号（如 `0.2.1-alpha.1`）。

**候选必须比记录更新**（`pickCandidate` 的降级保护，2026-10-24 加入）。事故：
rc.3 只发了 next、latest 钉在 rc.2，追踪器记录 rc.3 后每轮都把 latest 的旧
rc.2 当「新版本」反复验证。现在通道目标与记录相等或更旧都不算事件（CI 日志
里留一行 note）；手动入口是人的显式决定，不受此约束。比较语义是 semver 子集
（`compareVersions`），`test/dsh-track-guards.test.js` 直测并在事故快照上重放。

验证 job 跑 test:ci 前必须 `npm install --no-audit --no-fund`——test:ci 以
`scripts/build-client.js --check` 开头，tsdown 等 devDependencies 不装就必红
（2026-10-23~24 三连红的另一半根因；漂移探针零依赖，所以红得很晚才暴露）。

## 发版：own semver + Release 对齐实测 DSH 版本

版本号是主题自己的 semver（自 **0.3.0** 起），随特性手动演进；「对齐 DSH」发生在
发版管线的探针与 Release notes 里，不发生在版本号里。此前的「发版=同号」
（版本号镜像验证过的 DSH 版本）已于 2026-10-24 退役——背景：主题特性高频产出而
DSH 发版节奏不受我们控制，镜像制下特性拿不到版本号；且 npm 上线后版本号必须
承担升级路径。生态参照（独立 semver + engines/peerDeps 区间）见上游主题
`dsh-theme-endfield@1.2.x` 与 wallpaper-engine / cost-meter 等 npm 插件。

**发版操作**（release.yml，手动 dispatch）：

1. 把目标版本号改进 `package.json` 并提交（版本号属于特性提交的一部分）
2. Actions 页运行「发版」，输入版本号（可选勾选 `publish_npm`，默认关）
3. 管线：校验输入（与 package.json 一致、tag 不存在）→ 装依赖 → 按
   `.github/dsh-track.json` 记录装实测版 DSH 重跑漂移探针 → 完整测试套件
   → tag `v<版本>` → GitHub Release（notes 自动带实测 DSH 版本与上版以来的提交）
4. npm 步骤预留：`publish_npm` 闸门 + `NPM_TOKEN` secret，启用前复核 `files`
   白名单与 provenance/2FA 前置条件

**宿主区间声明**：`engines.dsh`（`>=0.2.1-rc.3 <0.3`，下限=实测点，上限在
0.3 实测前是护栏）+ 既有 `peerDependencies`。雷达每次验证新绿都会推进记录里的
实测版本；`engines` 的下限随主题自己的发版判断手动抬升。

## 漂移探针查什么

测试套件里的上游 CSS/DOM 契约是**冻结快照**（逐字抄进测试文件），它们不能发现
新版 DSH 悄悄改了类名——探针补上这一段。它从 client.js 提取：

1. **CSS module 语义后缀钩子**（`[class$='_x']` / `[class*='_x']` / `[class^='_x']`）——
   按 `_x` 后不接标识符字符的词边界在安装树中匹配；
2. **上游设计令牌**（`var(--dsw-*)` 的全部被引用者）——按字面匹配；
3. **上游 data-* 锚点**（`[data-*]`，`data-endfield-*` 与 `data-plugin` 是主题自设的，自动排除）。

提取而非手抄清单：清单永远与真实使用的钩子同步。探针首次运行（2026-10-08，
对 0.2.0-rc.2）即抓到两个真实漂移——`_heroGlow`（DSH 0.2.0 移除 `<HeroGlow>`）
与 `_headlineText`（hero 节点移除，两处 null 安全探测器空转）——均已作为
**已退役钩子**记入探针头部的 `RETIRED` 豁免清单：规则为 0.1.x 宿主保留，
静默失配无害。新增豁免条目必须写明理由与退役版本；条目不再被 client.js
引用时探针会提示清理。

安装树只扫 `.js`/`.css`（跳过 source map——map 内容会掩盖漂移）。本地复跑：

```bash
node .github/scripts/dsh-drift-probe.js <某份 node_modules/@deepseek-ai>
```

## 验证失败时

- **不发版**：记录文件不更新，下一次运行（最多 6 小时后）自动重试同一版本——
  主题修复后无需人工干预即自动补发
- **报警，不开 issue**（2026-10-18 所有者指定；仓库 Issues 功能处于关闭状态）：
  report 任务以红色结束并打 `::error` 注解（任务页红条 + GitHub 失败通知都带它，
  定时任务的失败通知发给最后编辑过 workflow 文件的用户），失败日志截尾收进
  该步骤的 Summary
- report 的 `if` 必须以 `!cancelled()` 开头：if 表达式里不含任何状态检查函数时
  GitHub 会隐式包一层 `success()`，validate 一红 report 就被整体 skip——上面
  三连红期间报警一次都没响就是它。该契约由 `test/dsh-track-guards.test.js`
  对 workflow 真实文本断言
- 处置指引按 [../compatibility.md](../compatibility.md) 的新版本流程

## 运行与运维

- 两个 workflow 都只在默认分支生效；推送后雷达完全自动（每 6 小时一轮）
- 想验证未进通道的版本（如 alpha）：手动运行「DSH 兼容雷达」，`dsh_version`
  填目标版本——手动入口不受降级保护约束（人的显式决定），但同样只落记录不发版
- 想发版：按上一节操作 release.yml；tag 命名 `v<主题 semver>`（镜像时代的
  `v0.2.1-rc.3` 之前缀同形但语义不同，历史 tag 不迁移）
- 雷达的 record job 以 github-actions[bot] 身份推 main（只动
  `.github/dsh-track.json`），会触发 CI 跑一轮——正常现象
