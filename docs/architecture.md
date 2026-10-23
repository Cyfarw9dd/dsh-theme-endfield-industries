# 架构

> 回答「这个主题由哪几块组成、它们怎么接起来」。取值依据见
> [design-language.md](design-language.md)，实现细节见 [engineering-notes.md](engineering-notes.md)。

## 双半结构

```
┌─ Host 半（Node）──────────────┐   ┌─ Client 半（浏览器）────────────┐
│ index.js                      │   │ client.js（单文件 IIFE 模块）     │
│  · volatile Config（设置 schema）│ → │  · 样式表：src/styles 经清单合成   │
│  · lib/audio.js 播放运行时     │   │  · 令牌覆盖（theme.overrideTokens）│
│  · lib/slots.js、lib/tone.js   │   │  · 功能面：水印/加载屏/大字        │
└──────────────┬───────────────┘   │  · React 迷你实现（设置面板）       │
               │                   └───────────────┬─────────────────┘
   cordis.patch.yml（bundle 注入声明）                │ configForms（下限 DSH 0.2.0）
   「./client」导出 → Host 按请求读盘 ← 浏览器刷新即生效 │
```

- **Host 半**只在 profile 启动时加载一次；**Client 半**按请求从磁盘读取，刷新生效
- 两半通过 DSH 设置命名空间（`theme-endfield`，`ctx.configForms`，兼容下限 DSH 0.2.0）同步偏好；浏览器 localStorage 已弃用（见工程笔记）

## 源码组织与构建

- 浏览器半的源码在 `src/`：`src/client/index.js`（JS，含外壳与 `insertCss()`）
  + `src/styles/` 分层样式（`tokens/decor/interaction/chrome/surfaces/overlays.css`
  手写六层 + `generated.css` 机器生成层；清单即级联顺序）
  （机器生成的掩码/纹理围栏区）。tsdown 把两者打包成**单文件产物
  `client.js`**（DSH 插件加载器的硬约束），与 @deepseek-ai 自家 client 包
  （`tsdown bundle → lib/client.js`）同一条管线；产物提交入库，
  `scripts/build-client.js --check` 保证不过期
- **DSH 服务只经一个适配层**：`src/client/services.js` 的 `createServices(ctx)`
  是浏览器半区**唯一**出现 `ctx.get` / `ctx.effect` 的地方——`theme`（必需，
  缺席时 apply 直接返回且不锁幂等标记）、`configForms`（两代形态：上下文属性
  优先，其次服务；二者都要有 `.get()`）、`sessions`（可迟到，调用方重试、
  不缓存）、`locale`（缺席退回中文）、`slots`（设置页挂载点），以及把清理
  钩子登记到 run 生命周期的 `effect()`。DSH 升级时先看这个文件；它也是测试
  打桩服务的接缝（不必伪造整个 cordis 上下文）
- **偏好层已拆成四个模块**：`src/client/prefs/keys.js` 放 schema 字段、UI/存储键
  与两者映射（`prefsFieldOf()` 是读写两条路径唯一的入口）；`prefs/legacy.js`
  放旧字段拼写的修复规则（纯函数 `prefsLegacyFields` + 只跑一次的
  `createLegacyMigrator`，依赖以 thunk 注入，不碰 ctx/DOM/存储）；`prefs/store.js`
  是**值 + 持久写入门控 + 挂起队列**（`createPrefsStore({ debug })`：对主题面
  `get/set/listen/commit/wasEdited`，对 transport 是
  `adopt/flush/migrate/notify/markSettled/needsSettlePass/...` 协议）；`prefs/transport.js`
  是**设置表单的发现与绑定**（候选 entry 拼写、迟到重试、有界 settle watch、一行
  boot report；`createPrefsTransport({ services, debug, store })`）。两模块互不
  import：store 只认 transport 用 `bindTransport()` 装进来的 port（snapshot / 一次
  字段写 / describe 列表），transport 只认 store 的协议，依赖全部显式注入、debug
  由入口传入。入口因此退化成组合根：建两个对象 + 一个
  `services.effect(() => () => prefs.dispose())` 收尾。读键表的测试
  （settings-namespace / settings-config-forms / texture）直接对源文件断言
- **装饰面已拆成 decor/ 模块**：`src/client/decor/watermark.js`（水印双开关、
  hero/persist 两种挂载与堆叠、逐帧跟随循环）、`hero-logo.js`（新会话品牌标）、
  `loader.js`（启动加载屏：双时钟 + 保险丝 + 一次 per 页面加载契约，含
  `prefs.onSettled` 引导读）、`body-observer.js`（水印与 hero 共用的那**一个**
  body MutationObserver——一个观察器、两层）。依赖显式注入：`prefs` + 主开关
  读取器逐面注入，水印另收 `findAppFrame`，加载屏另收 `isAudioOn` /
  `previewSlot` 两个宿主音频接缝；入口的组合根放在 `findAppFrame` 声明**之后**
  （传函数本体而非 thunk，前向引用会 TDZ——见 TODO 高危清单第 1 条）。入口只
  调用：sync() 在各 reconcile 点、detach() 于 unmount、dispose() 于 run 收尾
- **通知面已拆成 notify/ 模块**：`src/client/notify/audio.js`（音频通知的浏览
  器半：开关/音量/预览与上报的 round-trip，键名与 schema 字段同名）、`toast.js`
  （工业风卡片 + 四个通知开关，任务完成 6s 自消、attention 类常驻）、
  `attention.js`（需要你回应的语义锚点 + watcher：MutationObserver 快路径 +
  慢轮询兜底，同时喂音频上报与 toast）、`turn-watch.js`（回合边沿 → 任务完成
  回执：ConversationSnapshot.running 的唯一订阅，首读为基线）。模块间依赖走
  实例方法（attention 持 audio 与 toasts 的引用），测试接缝（`__attention*`、
  `__notify*`）由入口在组合时挂回 module.exports——与拆分前完全同名同形
- **body 属性同步已拆成 motion/ 模块**：`src/client/motion/sync.js`
  （`createMotionSync({ prefs, isEnabled })`）持有 radius class、
  motion/glass/texture 属性、调色板 class 的全部读写与同步
  （`syncAll()` 是 mount/reconciler 的统一入口，`detach()` 是 unmount 的对应
  面——按原契约只清 class/glass，motion/texture 属性随样式表失效而留存），
  以及 scheme / prefers-reduced-motion / findAppFrame 三个 DOM 判定。入口的
  `setReconciler` 注册块只保留 mount/unmount 编排 + 各面 sync；设置面板的
  写入路径经 `motionSync.*` 逐面调用
- **设置面板已拆成 ui/settings/ 模块**：`src/client/ui/settings/dictionaries.js`
  （zh/en 文案，zh 为键集真源）、`section.js`（locale 注册 + settings.section
  slots 注入 + 整个 React 面板与统一下拉；`createSettingsSection({ services,
  prefs, themeApi, … })` 返回 section 的 dispose）。面板的 useState 顺序被
  settings-config-forms 按下标钉死（`hooks[6]` = radius 的 mode），搬移保序；
  `label` 保持 thunk、`locale:` 仍只在 locale 服务存在时声明。入口至此只剩
  组合根：services → prefs → 各 feature 模块 → settings 注册 → run effect。
  令牌覆盖层是同目录的 `ui/tokens.js`（纯数据，亮/暗成对），入口的 mount()
  用 `theme.overrideTokens(...)` 整体注册并持有 dispose 句柄
- **样式源怎么拼，只有一个定义**：`scripts/lib/sources.js` 的 `STYLE_FILES`
  是层清单（顺序 = 级联顺序），`concatCss()` 就是客户端入口嵌进
  `insertCss()` 的那串字节。构建检查、`check.js`、`selftest.js` 的临时树、
  以及所有读样式的测试都从这里取，不各自拼路径；拼接是**纯字节串接**
  （各层自带行尾换行，层与层之间不插入任何分隔）；
  `check.js` 另有一条守卫断言客户端入口的 `?raw` 导入与清单**同名同序**，
  `selftest.js` 有对应变异案例（把两个 import 调换顺序必须被抓到）
- 强调色按**调色板 class**（`theme-endfield-gray` / `-wuling`）切换：一个 class
  翻转全量重绘，无 JS 重绘
- 选中/光标是**不随调色板**的固定交互灰（官网语法，见调研文档）
- 生成物由各自脚本维护（`build-emblem.js` / `build-logo.js` /
  `build-texture.js` 打进 `generated.css` 围栏区），`--check` 防漂移

## 验证链

```
node scripts/build-client.js --check → 产物新鲜度（重打包并逐字节比对 client.js）
node check.js → 静态不变量（清单↔入口同序、源样式表结构、调色板块、围栏、产物可解析）
node selftest.js → 变异验证：把每个真实 bug 注入临时副本树，证明 check 真能抓住
npm test → 上述 + 配色对比度 / 设置页 / 真实浏览器渲染 / 性能预算
```

详见 [testing.md](testing.md)；开发工作流见 [development.md](development.md)。
