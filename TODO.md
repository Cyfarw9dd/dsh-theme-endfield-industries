# 重构 TODO（长期跟踪）

> 本文回答「浏览器/宿主半区还有哪些模块要拆、按什么顺序、每项怎么验收」。
> 不回答「现在架构是什么」（见 [docs/architecture.md](docs/architecture.md)）、
> 「改动怎么提交」（见 [docs/git.md](docs/git.md)）或「功能是什么」（见
> [docs/features.md](docs/features.md)）。硬规则以 [AGENTS.md](AGENTS.md) 与
> [docs/AGENTS.md](docs/AGENTS.md) 为准，这里只记任务、顺序与验收。
>
> **怎么用**：盒子里的 `[ ]` 是待办、`[x]` 是已入库且完整门槛通过。一次只做
> 一项、一项一个提交；提交 body 写动机与证据（行数/字节/测试结果），复述 diff
> 无意义。完成一项时勾掉对应条目，并在同一提交里同步相关文档——本文件本身也
> 是「同一提交」的一部分。不主动 push；已推送历史不 rebase/amend。

## 每项通用验收

```bash
node scripts/build-client.js --check   # 产物必须与源码一起提交；这条要 fresh
node check.js                          # 静态不变量
node selftest.js                       # 变异验证 check 真能抓到
CHROME_PATH=/home/sunwing/.cache/puppeteer/chrome/linux-152.0.7977.54/chrome-linux64/chrome \
  npm test                             # exit 0、0 行 FAIL
```

- 行为不变的纯搬移重构：**不新增/不改变外部契约**；删功能/字段按
  [docs/git.md](docs/git.md)（不加 `!`/BREAKING CHANGE，body 说清旧键不再读）。
- 每一小步都要能让 `npm test` 全绿再提交；宁可提交切得碎，不提交半成品。
- 新增 `src/` 文件：`selftest.js` 的 `stageTree()` 目前整目录复制
  `src/client/prefs/`；若新增**别的目录**，同步把该目录加进 `stageTree()`，
  否则重定向树会缺文件。
- 浏览器测试一律用 `test/fixtures/chrome-cdp.js` 的 `until(条件)`；禁止
  `Chrome --dump-dom` / `--virtual-time-budget`（[docs/testing.md](docs/testing.md)）。

## 拆模块时的高危清单（会假绿的地方）

1. **依赖显式注入**：把代码移出 `apply()` 闭包时，不能直接引用 `dbg` / `prefsSet`
   等闭包 const（TDZ）。先例：`prefs/legacy.js` 用 thunk 注入 `commit`/`debug`；
   `prefs/store.js` / `transport.js` 从入口收 `{ debug }` / `{ services, debug, store }`。
2. **有测试按文本读源文件**，移动代码后必须重新指向：
   - `font-scope.test.js`：`className: 'endfield-settings'`（index.js）+ CSS（`sources.concatCss()`）
   - `palette-contrast.test.js`：JS 令牌字面量读 `src/client/index.js`
   - `tooltip.test.js`：`overrideTokens` 字面量读 `src/client/index.js`
   - `texture.test.js`：`TEXTURE_OPTIONS` 读 `src/client/index.js`；键表读 `prefs/keys.js`
   - `settings-namespace` / `settings-config-forms`：键表/`PREFS_ENTRY` 读 `prefs/keys.js`
   - `check.js` 1a：客户端入口的 `?raw` 导入与 `sources.STYLE_FILES` 同名同序；
     以及约 400 行处对统一 `createElement('button', …role: 'menuitemradio')` 的形状断言
3. **`settings-config-forms.test.js` 有硬编码的 React hook slot 序号**（palette 目前
   `hooks[4]`）。若改变设置面板的 `useState` 顺序，必须同步这个下标。
4. 不手改产物：`client.js` 由 `npm run build` 生成；`generated.css` 的围栏区由
   `scripts/build-*.js` 维护。
5. 改设置面板/`prefs` 契约的套件是行为契约：`settings-rows`、`settings-durable-hold`、
   `settings-mode-gate`、`settings-config-forms`、`settings-namespace`、
   `settings-locale`、`loader-late-prefs`——搬偏好/设置代码时逐个点名复跑。

## 已完成（入口瘦身这条线）

- [x] 偏好键词汇表 → `src/client/prefs/keys.js`（`d016114`）
- [x] 旧字段拼写修复 → `src/client/prefs/legacy.js`（`98035ed`）
- [x] 偏好层显式化：散落的闭包状态 → `createPrefsStore(services)`（`c91ef1a`）
- [x] store/transport 搬文件：`prefs/store.js` + `prefs/transport.js`，
  entry 退化为组合根（`1961d70`）；entry `3536 → 2789` 行（-747，约 -21%）

## 待完成（按顺序做，一次一项）

### [ ] 1. `decor/`（水印 / hero / 启动屏）

- **现状**：仍在 `src/client/index.js`，按注释标题 grep 定位：
  `background ENDFIELD watermark`、`new-session hero brand mark`、
  `boot loading screen`。
- **产出**：`src/client/decor/` 下按面拆（如 `watermark.js`、`hero-logo.js`、
  `loader.js`），图像尺寸/几何/挂载点依赖显式注入；entry 只调用。
- **验收**：完整门槛 + 点名复跑 `watermark-stacking`、`hero-logo`、
  `loader-performance`、`loader-late-prefs`（A/B/C 三态）、`font-scope`
  （水印/加载屏字体断言）。**不要动**「回合边沿 → 任务完成回执」的
  watcher——它是通知模块的资产。

### [ ] 2. `notify/`（attention + toast）

- **现状**：`音频通知 preferences` helpers、`需要你回应：界面观察器`、
  `回合边沿 → 任务完成回执`、`需要你回应 watcher`、`终末地工业风通知`。
- **产出**：`src/client/notify/`（如 `attention.js`、`toast.js`、`turn-watch.js`），
  DOM/定时器/开关依赖显式注入；视觉样式仍只走 `src/styles/`。
- **验收**：完整门槛 + 点名复跑 `notify`、`audio-attention-watch`、
  `audio-notify`、`host-no-inject`、`settings-rows`（通知行仍在、写对字段）。
  通知是 DOM + timer 密集区，拆完要确认 teardown 仍释放订阅/定时器
  （参考 [engineering-notes.md § 定时器泄漏](docs/engineering-notes.md) 的方法条目）。

### [ ] 3. `motion/`（属性同步 + reconciler）

- **现状**：`accent palette` 与 `scheme + motion + frame helpers`、
  `sync*`（radius/glass/texture/motion/palette）以及 entry 里的
  `prefs.setReconciler(...)` 注册块。
- **产出**：`src/client/motion/`（或 `ui/tokens.js` + `motion/`）：`<body>` 属性/
  类同步、调色板 class、prefers-reduced-motion 判定、live reconciler 分层。
- **验收**：完整门槛 + 点名复跑 `palette-contrast`、`palette-switch`、
  `motion-check`、`perf-motion`、`glass`、`texture`、`selector-guard`。
  动效只许动合成器属性（`transform`/`opacity`/颜色），预算见
  [docs/design-principles.md](docs/design-principles.md)。

### [ ] 4. `ui/settings/` + 组合根

- **现状**：`Settings page copy: zh / en dictionaries`、`Settings page: 主题
  (own settings.section)`、locale 注册、slots 注入、音频 handler、统一
  `endfield-select` 组件。
- **产出**：`src/client/ui/settings/`（词典、面板、控件）；entry 只剩组合根：
  services → prefs → 各 feature 模块 → settings 注册 → run effect。
- **验收**：完整门槛 + 全部 8 个 settings 套件点名复跑
  （见上「高危清单」第 5 条）+ `settings-off`、`settings-buttons`。
  **改 `useState` 顺序必须同步 `hooks[4]`**；`label` 保持 thunk、`locale:` 仍
  只在服务存在时声明。

### [ ] 5. CSS 按 `scripts/lib/sources.js` 清单分层切文件

- **现状**：`src/styles/theme.css` + `generated.css` 两文件，入口按清单
  `?raw` 导入后 `insertCss`。
- **做法**：只改 `STYLE_FILES` 清单 + `src/styles/` 拆文件；所有脚本/测试都从
  `concatCss()` 取值，不另拼路径。
- **验收**：拆分前后 `concatCss()` **逐字节相同**（与顺序即契约），
  `build-client --check` fresh、`check.js` 的 1a 守卫同名同序、`selftest.js`
  的「import 顺序」变异案例仍能抓到；完整门槛 + 点名复跑读样式的测试
  （`texture`、`palette-contrast`、`font-scope`、`perf-motion`、`selector-guard`）。

### [ ] 6. Host 半区 `index.js`

- 仅在**下次改动它**时拆（Config/schema、audio 运行时、路由、诊断各成模块）；
  不为了拆而拆。改 Host 半必须整进程重启 DSH 才能生效（刷新页面只重载 client.js）。
- **验收**：完整门槛 + `settings-config-fallback`（字段契约与选择顺序）、
  `host-no-inject`、`audio-notify`（host 播放路径）。

### [ ] 7. CI 清理

- `package.json` 里 `test:perf` / `test:coverage` 等已无对应脚本的死引用；
- `.github/workflows/` 里 static job 的过时注释（与现在的 Node/Chrome/`until()`
  约定对齐）。
- **验收**：`npm run test:ci` 与 CI 一致；`node check.js` 绿；CI 配置改完本地
  按 CI 脚本完整跑一遍。
