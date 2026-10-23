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
CHROME_PATH=/usr/bin/chromium-browser npm test   # exit 0、0 行 FAIL（其他机器换各自的 Chrome/Edge 路径）
```

- 行为不变的纯搬移重构：**不新增/不改变外部契约**；删功能/字段按
  [docs/git.md](docs/git.md)（不加 `!`/BREAKING CHANGE，body 说清旧键不再读）。
- 每一小步都要能让 `npm test` 全绿再提交；宁可提交切得碎，不提交半成品。
- **新增 `src/` 文件**：`selftest.js` 的 `stageTree()` 现在整目录复制
  `src/client/` 下**每个**模块目录；新增目录无需再改它。
- 浏览器测试一律用 `test/fixtures/chrome-cdp.js` 的 `until(条件)`；禁止
  `Chrome --dump-dom` / `--virtual-time-budget`（[docs/testing.md](docs/testing.md)）。

## 拆模块时的高危清单（会假绿的地方）

1. **依赖显式注入**：把代码移出 `apply()` 闭包时，不能直接引用 `dbg` / `prefsSet`
   等闭包 const（TDZ）。先例：`prefs/legacy.js` 用 thunk 注入 `commit`/`debug`；
   `prefs/store.js` / `transport.js` 从入口收 `{ debug }` / `{ services, debug, store }`。
2. **有测试按文本读源文件**，移动代码后必须重新指向（现状已指向
   `sources.concatClientJs()` = 整棵 `src/client` 树的，搬家不用动；仍读
   单文件的如下）：
   - `font-scope.test.js`：`className: 'endfield-settings'`（读 `concatClientJs()`）
     + CSS（`sources.concatCss()`）
   - `palette-contrast.test.js`：JS 令牌字面量读 `concatClientJs()`
     （令牌层在 `ui/tokens.js`）
   - `tooltip.test.js`：`overrideTokens` 字面量读 `concatClientJs()`（同上）
   - `texture.test.js`：`TEXTURE_OPTIONS` 读 `concatClientJs()`；键表读 `prefs/keys.js`
   - `settings-namespace` / `settings-config-forms`：键表/`PREFS_ENTRY` 读 `prefs/keys.js`
   - `check.js` 1a：客户端入口的 `?raw` 导入与 `sources.STYLE_FILES` 同名同序；
     以及对统一 `createElement('button', …role: 'menuitemradio')` 的形状断言
     （读 `concatClientJs()`，已去空白敏感）
3. **`settings-config-forms.test.js` 有硬编码的 React hook slot 序号**（palette 目前
   `hooks[4]`）。若改变设置面板的 `useState` 顺序，必须同步这个下标。
4. 不手改产物：`client.js` 由 `npm run build` 生成；`generated.css` 的围栏区由
   `scripts/build-*.js` 维护。
5. 改设置面板/`prefs` 契约的套件是行为契约：`settings-rows`、`settings-durable-hold`、
   `settings-mode-gate`、`settings-config-forms`、`settings-namespace`、
   `settings-locale`、`loader-late-prefs`——搬偏好/设置代码时逐个点名复跑。

## 已完成（入口瘦身这条线）

- [x] 偏好键词汇表 → `src/client/prefs/keys.js`（`f2b0166`）
- [x] 旧字段拼写修复 → `src/client/prefs/legacy.js`（`33ee418`）
- [x] 偏好层显式化：散落的闭包状态 → `createPrefsStore(services)`（`0897907`）
- [x] store/transport 搬文件：`prefs/store.js` + `prefs/transport.js`，
  entry 退化为组合根（`0fd77f9`）；entry `3536 → 2789` 行（-747，约 -21%）
- [x] `decor/` 拆分 → `src/client/decor/`（`watermark.js` / `hero-logo.js` /
  `loader.js` + 共享的 `body-observer.js`），依赖显式注入（prefs、isEnabled、
  findAppFrame、isAudioOn/previewSlot）；entry `2789 → 2128` 行（-661，约 -24%）
- [x] `notify/` 拆分 → `src/client/notify/`（`audio.js` / `toast.js` /
  `attention.js` / `turn-watch.js`），模块间依赖走实例方法，测试接缝
  （`__attention*` / `__notify*`）由入口挂回 module.exports；entry
  `2128 → 1661` 行（-467，约 -22%）
- [x] `motion/` 拆分 → `src/client/motion/sync.js`（radius/motion/glass/
  texture/palette 的读写+同步+`syncAll()`/`detach()`，及 scheme/reduced-motion/
  findAppFrame 判定）；texture.test.js 的 JS 侧断言改读 `concatClientJs()`；
  entry `1661 → 1538` 行（-123）
- [x] `ui/settings/` 拆分 → `src/client/ui/settings/`（`dictionaries.js` 词典 +
  `section.js` locale 接线/slots 注入/React 面板/统一下拉，useState 保序）；
  check.js 的 menuitemradio 形状断言与 font-scope 的类名断言改读
  `concatClientJs()`；entry `1538 → 389` 行（-1149，约 -75%；整个瘦身起点
  `3536 → 389`）
- [x] CSS 分层切文件 → `src/styles/` 六个手写层（`tokens/decor/interaction/
  chrome/surfaces/overlays.css`）+ `generated.css`；`concatCss()` 改为纯字节
  串接（各层自带行尾换行，theme↔generated 原有的分隔空行收进 overlays.css
  尾部），拆分前后**逐字节相同**（sha256 前缀比对）；check.js 1a 守卫改为
  断言 `insertCss(层 + 层 + …)` 的精确拼接形状；selftest 的变异案例逐个
  重指到所在层，import 顺序变异改换 decor/interaction 两层

- [x] 令牌层搬出 → `src/client/ui/tokens.js`（第 3 项留下的口子；纯数据，
  入口只保留 overrideTokens 注册与 dispose 句柄），palette-contrast /
  tooltip 的字面量读取改走 `concatClientJs()`；entry `392 → 303` 行

## 待完成（按顺序做，一次一项）

- [x] CI 清理（`chore(ci)`）：删除 ci.yml 里整个 perf job——它调用的
  `test:perf` / `test:coverage` 脚本早已随等高线特性移除而消失；static job
  的护栏注释更新为现查内容（清单同序/CSS 结构/产物解析/变异验证）；
  package.json `test:buttons` 去掉重复的 tooltip 一项；顺带订正 tokens.css
  继承自 theme.css 的历史头注，并清掉分层带入的 3 个层尾空行
  （whitespace-check 抓到；纯空白、级联无关，产物重建）

## 仅在下次改动 Host 半时再做（不为拆而拆）

### [ ] 6. Host 半区 `index.js`

- 仅在**下次改动它**时拆（Config/schema、audio 运行时、路由、诊断各成模块）。
  改 Host 半必须整进程重启 DSH 才能生效（刷新页面只重载 client.js）。
- **验收**：完整门槛 + `settings-config-fallback`（字段契约与选择顺序）、
  `host-no-inject`、`audio-notify`（host 播放路径）。
