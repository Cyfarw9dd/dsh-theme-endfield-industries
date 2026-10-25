# 开发指南

> 回答「怎么在这个仓库上开发与发布」。架构见 [architecture.md](architecture.md)，各测试守什么见 [testing.md](testing.md)。

## 环境

- Node 22+；浏览器测试需要本机 Chrome/Chromium（`CHROME_PATH` 指定路径）
- 本机浏览器＝系统 Chromium 155（`/usr/bin/chromium-browser`，Fedora 包装脚本指向 `/usr/lib64/chromium-browser/`）。注意两点：
  - 夹具的自动发现列表只认 `/usr/bin/google-chrome`、`/usr/bin/chromium`，**不含 Fedora 拼法**，所以裸 `npm test` 会报 `Set CHROME_PATH`——用 `CHROME_PATH=/usr/bin/chromium-browser npm test`；
  - 若启动即崩（`chrome_crashpad_handler: --database is required` 后跟 SIGTRAP 核心转储）：crashpad 初始化要写 `$HOME` 下的路径，家目录只读时会这样死；把 `HOME` 指到可写目录即可绕过（`HOME=$(mktemp -d) CHROME_PATH=/usr/bin/chromium-browser npm test`）。本机 2026-10 曾复现，后自行消失。
  - 备选浏览器：`~/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome`（Chrome for Testing，同样以 `CHROME_PATH` 指定）。命令行截图通道（`--screenshot`/`--virtual-time-budget`）在新版 Chrome/Chromium 上已不可靠，截图一律走 CDP 夹具（见 testing.md）
- 首次安装构建依赖（devDependency 只有 tsdown，构建只要它的闭包）：
  `env -u npm_config_allow_scripts npm install --legacy-peer-deps --package-lock=false --ignore-scripts --cache .npm-cache`
  - npm 12 的 `allow-scripts` 策略会经环境变量（`npm_config_allow_scripts`）从启动器继承进子进程，项目级安装直接 `EALLOWSCRIPTS` 拒绝（npm 的 `resolve-allow-scripts.js` 对 env 层策略在项目作用域一律报错）——先 `env -u` 摘掉再装（2026-10-23 本机首建实测）；
  - `--legacy-peer-deps`：不加会把 peerDependencies 的整个 `@deepseek-ai/dsh`（约 660 包，含 koffi/node-pty 等带安装脚本的原生包）拖进树；tsdown 自己的闭包只有 55 包且无脚本包（lockfile 核对过）；
  - `--package-lock=false` 不动 lockfile；`--cache .npm-cache` 把缓存落在仓库目录（数百 MB，`.gitignore` 已列），不写 `~/.npm`
- 安装到 profile 用 link 方式（改仓库文件即生效）：
  `dsh plugin --profile web add <本仓库路径>`

## 验证三层

```bash
node scripts/build-client.js --check            # 产物新鲜度（重打包 + 逐字节比对 client.js）
node check.js                                   # 秒级：样式表静态不变量
node selftest.js                                # 变异验证 check 真能抓 bug
CHROME_PATH=/usr/bin/chromium-browser npm test  # 全量（含真实渲染）
```

`npm run shots && node test/verify-shots.js` 生成并校验调色板截图（人工复核用）。

## 生成物契约

| 脚本 | 源 | 产物 | 防漂移 |
| --- | --- | --- | --- |
| `scripts/build-client.js` | `src/client/index.js` + `src/styles/*.css`（清单见 `scripts/lib/sources.js`） | 根 `client.js`（tsdown 单文件产物） | `--check`（在 npm run check / npm test 链首） |
| `scripts/build-sounds.js` | `lib/slots.js` + `lib/tone.js` | `sounds/*.wav` | `--check`（在 npm test 链内） |
| `scripts/build-emblem.js` | `assets/endfield-industries.svg`（英文版）+ `assets/endfield-industries-logo-zh.svg`（中文版，PRTS 归档图描摹） | `src/styles/generated.css` 的 EMBLEM_MASK 围栏区（一个 body 规则里的 `--edge-emblem` / `--edge-emblem-zh`） | `--check`（在 npm test 链内） |
| `scripts/build-logo.js` | `assets/`（hero 徽标矢量） | `src/styles/generated.css` 的 HERO_LOGO 围栏区 | `--check`（在 npm test 链内） |
| `scripts/build-texture.js` | `assets/`（官方纹理/箭头字节） | `src/styles/generated.css` 的 EDGE_TEX 围栏区 | `--check`（在 npm test 链内） |

规则：**永远改源与脚本，不手改产物**；提交前跑对应 `--check`。

## 常见任务

**加/拆一层样式**：在 `src/styles/` 加文件 → 改 `scripts/lib/sources.js` 的 `STYLE_FILES`（顺序 = 级联顺序）→ 在 `src/client/index.js` 按同样顺序 `import … ?raw` 并拼进 `insertCss()`（`check.js` 会断言两边一致）→ 读样式的脚本/测试不用动（都走 `concatCss()`）→ `npm run build`。

**调色板已收拢为谷地黄一套**（2026-10 移除三态切换；如需再加：`src/styles/tokens.css` 的 body 基础块或新 class 块 + 设置面板行与中英文案 + `palette-contrast.test.js` 断言，并同步 `check.js` 的「覆盖块不得回流」守卫）。

**加功能开关**：Host `FIELD_DEFAULTS`（index.js + client.js 各一份）→ 设置面板行 → 文档登记 features.md。

## 提交与发布

- 完整逻辑变更过验证即可提交；Conventional Commits 规范与操作细则见 [git.md](git.md)
- 版本号在 package.json，是**主题自己的 semver**（自 0.3.0 起），随特性手动演进；[DSH 兼容雷达](cookbook/dsh-version-tracking.md) 只负责验证新版 DSH 并落记录，发版走 release.yml，Release notes 引用实测 DSH 版本（对齐在元数据，不在版本号）
- 未推送的提交可用 `--amend` 折叠后续修复；已推送禁用
