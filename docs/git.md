# Git 提交策略

> 回答「什么时候提交、提交怎么写」。工作流上下文见 [development.md](development.md)，文档分层见 [AGENTS.md](AGENTS.md)。

## 提交节奏

- **提交必须用户明示**：完整的逻辑变更做完后先停下汇报（改动摘要 + 拟用的提交信息 + 要跑的验证范围），用户点头才进入提交（2026-10-24 所有者口径，取代旧的「过验证即可提交」）
- **不主动 push**——推送必须用户明示
- 提交范围有歧义时（如混入无关文件）先问一句
- 验证分两层：**迭代期**只跑 `node check.js` + 命中的定向套件；用户同意提交后、写入提交前跑**全量** `npm test`（样式/行为改动；纯文档改动仍只需 `node check.js`）。红了先修，修完回到汇报

## Conventional Commits

格式：

```
<type>(<scope>?): <subject>          ← 必填；subject ≤72 字符，祈使句，不加句号

<body>                               ← 可选；解释「为什么」，可带测量数据

<footer>                             ← 可选；破坏性变更、来源批准等
```

### 类型表（本仓库实际用到的优先）

| type | 用途 | 本仓库示例 |
| --- | --- | --- |
| `feat` | 新功能 | `feat: add Endfield gray palette as default and vector emblem watermark` |
| `fix` | 缺陷修复 | `fix(client): scope the composer add hook so the settings add button stays readable` |
| `docs` | 文档 | `docs: restructure into DSH-style layers` |
| `test` | 测试补强 | `test: extend palette-contrast coverage to the gray palette` |
| `chore` | 构建/杂务 | `chore: bump version to 1.2.0` |
| `refactor` / `style` / `perf` / `revert` | 备用 | —— |

scope 可省（本仓库体量小，仅在有明确半区时用：`client` / `host` / `docs`）。

### body 与 footer 约定

- body 写**动机与证据**，不复述 diff；有测量数据就放数据（对比度、字节数、像素数）
- 破坏性变更：`!` + footer `BREAKING CHANGE: <说明>`，**只留给接入契约的破坏**——插件加载约定、Host `Config` 结构、对外导出的 API/路径、路由或事件形状这类会让下游代码、旧调用或跨仓库协作出错的变化。**删除本主题自己的可选功能或设置字段不算**：功能没了但没有任何下游依赖它，按 `feat:` / `refactor:` 记，body 里写清「旧键不再被读取/旧开关消失」即可（2026-10 所有者口径；先例：`feat: remove the 雷霆大字 feature`）
- 采用第三方来源素材：footer 注明批准事实，并与 `scripts/build-*.js` 头注、[credits.md](credits.md) 三处一致

## 操作细节

- **提交信息经文件写入**：`git commit -F <file>`，避免 shell 引号转义吞字符（本仓库踩过）
- **未推送**的提交可用 `--amend` 折叠后续修复（保持一个逻辑变更一个提交）；**已推送禁 amend**，需要改历史必须用户明示
- 提交后 `git status` 必须干净；不把临时探针、截图产物（`tmp/` 已 ignore）带进提交
