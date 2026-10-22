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
  + `src/styles/theme.css`（手写样式，真 CSS 文件）+ `src/styles/generated.css`
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
- **偏好层开始拆模块**：`src/client/prefs/keys.js` 放 schema 字段、UI/存储键
  与两者映射（`prefsFieldOf()` 是读写两条路径唯一的入口）；`src/client/prefs/legacy.js`
  放旧字段拼写的修复规则（纯函数 `prefsLegacyFields` + 只跑一次的
  `createLegacyMigrator`，依赖以 thunk 注入，不碰 ctx/DOM/存储）。两者都是纯逻辑，
  入口只 import；读键表的测试（settings-namespace / settings-config-forms / texture）
  直接对源文件断言。**下一步**是把 store（读写门 + 挂起队列）与 transport
  （候选拼写、迟到重试、settle watch）也搬进来——需要先把闭包状态显式化成
  `createPrefsStore(services)`，这是拆这个文件的真正成本
- **样式源怎么拼，只有一个定义**：`scripts/lib/sources.js` 的 `STYLE_FILES`
  是层清单（顺序 = 级联顺序），`concatCss()` 就是客户端入口嵌进
  `insertCss()` 的那串字节。构建检查、`check.js`、`selftest.js` 的临时树、
  以及所有读样式的测试都从这里取，不各自拼 `theme.css + '\n' + generated.css`；
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
