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
