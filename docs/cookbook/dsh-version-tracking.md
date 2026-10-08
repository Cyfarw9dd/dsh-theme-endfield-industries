# DSH 版本追踪与同号发版

本页回答「怎么做」：如何让仓库在 DSH 发新版时自动验证、自动按 DSH 的版本号发版。
为什么这样做（上游依赖面的风险分级）见 [../compatibility.md](../compatibility.md)。

## 机制总览

| 部件 | 位置 | 职责 |
| --- | --- | --- |
| 追踪工作流 | `.github/workflows/dsh-track.yml` | 每 6 小时（cron `23 */6 * * *`，UTC）+ 手动触发；探测→验证→发版/报告 |
| 版本探测 | `.github/scripts/dsh-track.js --check` | 查 npm **官方源**的 `@deepseek-ai/dsh` dist-tags（registry 不是 npmjs.org 即拒绝）；对比记录文件输出 JSON |
| 漂移探针 | `.github/scripts/dsh-drift-probe.js` | 从 client.js **自动提取**三类上游契约，在目标版安装树里逐项验证 |
| 验证记录 | `.github/dsh-track.json` | `dshVersion` 语义是「**已通过验证**的最后版本」；验证失败不落盘 |
| 落盘与同号 | `.github/scripts/dsh-track.js --apply` | 写记录文件 + 把 `package.json` 的 `version` 提为 DSH 版本号 |

监测通道是 **latest 与 next**（next 优先）；alpha 噪音大不自动追，要验证时用
workflow_dispatch 手动填版本号（如 `0.2.1-alpha.1`）。

## 发版=同号

本主题的版本号**就是**它验证过的 DSH 版本（如 `v0.2.0-rc.2`）：

- 验证全绿 → `--apply` 同号提升 `package.json` → Conventional Commits 提交
  （作者 `github-actions[bot]`）→ 附注 tag `v<版本>` → GitHub Release
- 主题自身的日常改动只进 main、不发版，随下一个 DSH 版本一并带出
- 同一版本重复验证是幂等的：无变更则跳过提交，tag/Release 已存在则跳过

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
- **自动开 issue**：带 `<!-- dsh-drift -->` 标记的单一追踪 issue，覆盖更新不堆楼，
  附失败步骤日志与运行链接；发版成功后自动关闭
- 处置指引按 [../compatibility.md](../compatibility.md) 的新版本流程

## 首次部署清单

1. 推送本机制到 main（scheduled workflow 只在默认分支生效）
2. Actions 页手动运行「DSH 版本追踪」，`dsh_version` 填当前已验证版本
   （`.github/dsh-track.json` 的 `dshVersion`，本文写作时是 `0.2.0-rc.2`）——
   让首个 Release 走一遍完整管线
3. 之后完全自动；想验证未进通道的版本随时手动触发
