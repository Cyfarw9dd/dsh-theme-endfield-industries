# AGENTS — 本仓库协作契约

DSH Web 主题插件（终末地工业终端风格）。改任何东西前先过这一篇；细节按分层文档深入。

## 结构速览

- **双半架构**：`index.js`（Host/Node，启动加载）+ `client.js`（浏览器，按请求读盘、**刷新生效**）。安装用 link 方式：`dsh plugin --profile web add <本仓库>`
- **client.js 是构建产物**：源码在 `src/client/`（入口 + 各模块）与 `src/styles/`（六层手写 CSS + `generated.css`），tsdown 打包成单文件产物（与 @deepseek-ai 自家 client 包同管线）。改完跑 `npm run build`（或 `npm run watch`）再刷新；产物提交入库，`scripts/build-client.js --check` 防漂移。**不手改 client.js**
- **DSH 服务只经 `src/client/services.js`**：浏览器半区唯一出现 `ctx.get`/`ctx.effect` 的地方（theme/configForms/sessions/locale/slots + 清理钩子）；DSH 升级先看它，测试打桩也从这里进
- **样式层清单只有一个**：`scripts/lib/sources.js` 的 `STYLE_FILES` 定义层与顺序（顺序 = 级联契约），所有脚本/测试取 `concatCss()`；`check.js` 断言 `src/client/index.js` 的 `?raw` 导入与清单同名同序——加/拆样式层只需改清单 + 入口两处，别在别处另拼路径
- 生成物三件套（音效 `sounds/`、`generated.css` 的掩码/纹理围栏区、`client.js` 产物）：**只改源与脚本，不手改产物**，各 `--check` 防漂移

## 硬规则

1. **素材来源**：只从官方渠道下载。第三方来源必须用户显式批准，并在 `scripts/build-*.js` 头注 + [docs/credits.md](docs/credits.md) 双重登记（先例：矢量徽标来自 Yue-plus/endfield_icons）
2. **提交**：完整逻辑变更过验证后即可提交，不主动 push；Conventional Commits，作者用仓库本地 git config，信息经 `-F` 文件写入——细则见 [docs/git.md](docs/git.md)
3. **颜色是量出来的**：新色值必须对实际底面算对比度并写进 `test/palette-contrast.test.js`；选中/光标是**不随调色板的固定灰**（官网语法，依据见 docs/endfield-ui-research.md）
4. **测试从真实文件读值，不复述数值**；每条断言做过变异验证（selftest.js 方法论）
5. **`--edge-*` 变量声明在 `body`，绝不在 `:root`**（应用令牌是 body 行内样式，:root 解析为空）
6. **装饰克制**：新增装饰/动效前先过 [docs/design-principles.md](docs/design-principles.md) 的三问——装饰不得拦截交互或盖住正文，动效只许动合成器属性并过 `test/perf-motion.test.js` 的预算

## 验证门槛

```bash
node check.js        # 秒级，任何改动前先跑
CHROME_PATH=/usr/bin/chromium-browser npm test   # 样式/行为改动必须全绿（757+ 项）
```

本机已装系统 Chromium（`/usr/bin/chromium-browser`）：Fedora 拼法不在测试夹具的自动发现列表里，**裸 `npm test` 找不到它，必须带 `CHROME_PATH`**。其他机器换成各自的 Chrome/Edge 路径；备选浏览器是 `~/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome`（Chrome for Testing）。若 Chromium 启动即崩（crashpad 报 `--database is required`），排查线索见 [docs/development.md](docs/development.md) 的环境一节。

## 文档

改动前读 [docs/AGENTS.md](docs/AGENTS.md)（分层规则）；入口索引在 README「文档」表。一句话判断：讲为什么 → docs 根级；讲怎么做 → docs/cookbook/；一次性记录 → docs/notes/。
