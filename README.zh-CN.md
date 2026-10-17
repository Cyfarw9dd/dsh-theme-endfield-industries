# dsh-theme-endfield

[English](README.md) · 简体中文（当前）

参考《明日方舟：终末地》官网风格的 DSH Web 主题插件（非官方同人作品）。

奶油纸底、墨黑文字、全直角工业编辑风；默认配色**终末地灰**沿用官网的灰阶交互语法，另提供谷地黄、武陵青两套强调色。Client 侧（`client.js`）通过主题令牌和一张全局样式表覆盖界面；Host 侧（`index.js`）只负责设置持久化与可选的音频通知（派生系统播放器子进程），两者都不修改应用代码。

## 安装

```bash
dsh plugin --profile web add github:Cyfarw9dd/dsh-theme-endfield-industries
```

重启或重新加载 `web` profile 后生效。**更新插件文件时注意**：Client 半（`client.js`）由 Host 按请求从磁盘读取，浏览器刷新即可生效；Host 半（`index.js`）只在 profile 启动时 import 一次，**必须整进程重启 DSH** 才会重新加载（`dsh-hmr` 的 watch 默认忽略 `**/node_modules`，软链安装的仓库文件不在其观察范围内）。只刷新页面时，运行的仍是启动时那份 Host 代码。卸载：

```bash
dsh plugin --profile web rm dsh-theme-endfield
```

## 功能

在 **设置 › 终末地主题设置** 中调整（27 个字段，全部文案跟随 DSH 语言设置中/英即时切换）：

- **01 主题**：总开关（关闭即回到应用原生外观，无需刷新，且关闭后设置页仍保持可读）；三态配色（默认终末地灰）；直角/圆角；磨砂玻璃（默认关）；按钮动效（默认开，合并设计：主 CTA 箭头滑入 + 会话/搜索行四角工程角标）；工业底纹（关闭/轻/完整，默认**完整**＝官网 `/operator` 那套：工程网格 + 45° 斜纹 + 两级波纹与顶部光晕，只锚定主内容列）；
- **02 背景**：`ENDFIELD` 大字水印（默认开，仅新建会话页，不拦截交互、防浏览器误翻译）及保持显示；新建会话页品牌标识（联名「终末地标识 3」贴在标题「探索未至之境」正上方，两个 alpha 掩码实现，明暗两套均画素材原色）；
- **03 动画**：启动加载动画（默认关，整屏黑底 + 左缘 10px 进度轨、刻度/百分比随填充端下移，带硬性保险丝与 reduce 降级）；
- **04 娱乐**：雷霆大字（默认关，任务开始/结束时居中白字 3 秒，点击任意处立即关闭且该次点击照常抵达）及入场动画（独立的子开关）；
- **05 通知**：工业风通知卡片（默认开）——任务完成回执 6 秒自动消失，提问/索权常驻卡片处理后自动消失，音效跟随音频通知开关；
- **06 音频**：可选音频通知（**总开关默认关**）——启动音、任务开始/结束音、需要回应提示、出错预留槽位；音量、同槽位最小间隔、自定义音效目录、诊断日志可调。**由宿主进程播放**而非浏览器，页面最小化时同样能听到。详见 [docs/cookbook/audio-notifications.md](docs/cookbook/audio-notifications.md)。

另有若干**自动生效**、无需开关的修正：官网基础按钮的等高线材质复刻到新会话/发送/提问卡按钮；对话页签按官方 SubpageTab 语言重排（悬停灰洗面、选中常亮、`.2s` 切换编排）；输入卡操作条 chips 悬停收工业灰；浮动提示气泡并入纸面浮层家族；会话头部预设徽章恢复强调色；设置 › 模型行操作、附件轮播箭头等多处对比度修复。完整清单见 [docs/features.md § 其他自动生效的修正](docs/features.md)。

设置面板里每一个「有值」的行都用同一套统一下拉控件，形制照抄官网 `/operator` 筛选下拉（深色铭牌 + 官方圆形箭头，选中行斜纹灰底与左缘紫/绿信号条）。

### 设置持久化

所有设置由 DSH 自己的设置服务持久化，与页面 origin/端口无关：在 **DSH 0.1.7-rc.1** 上，Host `index.js` 导出一份字段全部 `.volatile()` 的 schemastery `Config`（命名空间 = 本插件 profile entry id `theme-endfield`），浏览器 `client.js` 通过 `ctx.configForms` 读写并订阅，值随 `<profile>/cordis.patch.yml` 落盘；在**旧版 DSH** 上则回落到 `ctx.settings.register('dsh-theme-endfield', schema)` + `ctx.settingsScope`（`<dshHome>/settings.yaml`）。两代都与页面 origin 无关，因此 DSH web 与 DSH Desktop 都能正确保存并在重启/换端口后恢复，不再使用会被 Desktop 随机端口清空的 `localStorage`。详见 [docs/features.md](docs/features.md) 与 [docs/engineering-notes.md](docs/engineering-notes.md)；0.1.7 升级后旧设置需要在设置页重设一次（`settings.yaml` 已被 DSH 废弃，见 [engineering-notes.md § DSH 0.1.7-rc.1 换掉了整套 settings API](docs/engineering-notes.md#dsh-017-rc1-换掉了整套-settings-api-v110-已跟进)）。

**如果开关总是「刷新后复位」**：先看 Host 侧有没有这份 `Config`（`Config.listConfigs` 对该 entry 报 `absent` 就是没有）。没有 Config 时 DSH 不投影任何表单，Host `apply()` 会打一行 warn 并在 profile 目录留下报告文件 `theme-endfield-diagnostic.json`（`Config` 构建成功时会自动删除它；报告里的 `schemaMode` / `loaded` / `loadError` 会写明走了哪条解析路径、以及某个副本是否「解析得到却加载失败」）——排查与判据见 [docs/testing.md](docs/testing.md#设置页)。另外注意：**改 Host 半（`index.js`）必须整进程重启 DSH**，刷新页面只重载 `client.js`。

## 文档

| 文档 | 层 | 内容 |
| --- | --- | --- |
| [docs/AGENTS.md](docs/AGENTS.md) | 治理 | 文档分层规则与贡献流程 |
| [docs/design-principles.md](docs/design-principles.md) | 治理 | 设计原则：装饰只做必要的一处、不进入核心工作区、动效必须付得起 |
| [docs/architecture.md](docs/architecture.md) | 主题 | 双半结构、样式表组织、验证链 |
| [docs/compatibility.md](docs/compatibility.md) | 主题 | 向后兼容与稳定性：上游依赖风险分级、版本适配清单 |
| [docs/glossary.md](docs/glossary.md) | 主题 | 术语与令牌速查 |
| [docs/credits.md](docs/credits.md) | 主题 | 素材归属：逐项来源、sha256 与采用登记 |
| [docs/design-language.md](docs/design-language.md) | 主题 | 色板、令牌映射与对比度规则 |
| [docs/endfield-ui-research.md](docs/endfield-ui-research.md) | 主题 | 官网 UI 设计语言调研：色彩频次、交互语法证据、徽标素材盘点 |
| [docs/features.md](docs/features.md) | 主题 | 功能行为、默认值、存储键与边界情况 |
| [docs/testing.md](docs/testing.md) | 主题 | 校验脚本与测试套件说明 |
| [docs/engineering-notes.md](docs/engineering-notes.md) | 主题 | 工程深水笔记：实现决策与实测数据 |
| [docs/development.md](docs/development.md) | 主题 | 开发与发布工作流 |
| [docs/git.md](docs/git.md) | 主题 | Git 提交策略与 Conventional Commits 规范 |
| [docs/cookbook/](docs/cookbook/) | 手册 | 功能专题：[音频通知](docs/cookbook/audio-notifications.md) · [磨砂玻璃](docs/cookbook/glass.md) · [DSH 版本追踪](docs/cookbook/dsh-version-tracking.md) |
| [docs/notes/](docs/notes/) | 记录 | 一次性存档（[PR 说明](docs/notes/PR-description.md)、[官网动效调研](docs/notes/endfield-motion-research.md)） |

## 开发与验证

```bash
node check.js        # 秒级静态校验：模板字符串/CSS 不变量、生成物钉值、client.js 可编译
node selftest.js     # 反向验证 check.js 真能抓到那些问题
npm test             # 上述 + 配色/设置页/渲染/动效性能等全套
```

`npm test` 覆盖样式不变量、配色对比度、设置页（两代 transport）、真实浏览器渲染、动画可访问性与性能预算（layout/帧间隔/主线程）。部分测试需要本机安装 Chrome 或 Edge。跑测试请用 Node 22+（浏览器 fixture 依赖全局 `WebSocket`/`fetch`，版本不足会在测试处明确报错；插件本身的运行没有这个要求）。测试原则：**从真实 `client.js` 里读值，不复述数值；每条断言都做过变异验证**——方法论见 [docs/testing.md](docs/testing.md)。

## 项目结构

```text
client.js          Client 侧主题实现（样式表是其中一个 JS 模板字符串）
index.js           Host 侧：导出 volatile Config，声明设置命名空间与音频运行时
lib/               音频通知：slots.js（槽位定义）、tone.js（WAV 合成）、audio.js（播放运行时）
sounds/            生成的通知音（npm run sound:build 重新生成，--check 防漂移）
assets/            素材源：水印徽标矢量源、新建会话页标识原图与掩码、官方背景纹理/下拉箭头/按钮材质
scripts/           构建脚本：build-sounds / build-emblem / build-logo / build-texture（均带 --check）
cordis.patch.yml   Bundle 注入配置（本插件行的 profile entry id 即设置命名空间）
check.js           样式表静态校验
selftest.js        校验器自检
test/              渲染、设置、配色与性能测试
docs/              设计、功能、工程与测试文档
```

生成物两件套（`sounds/`、掩码/纹理内嵌区）**只改源与脚本，不手改产物**，各构建脚本的 `--check` 会拦漂移。

## 素材归属与免责声明

本插件是**非官方同人作品**，与鹰角网络（Hypergryph）不存在任何隶属、赞助或背书关系。《明日方舟：终末地》的名称、标识、官网视觉与相关美术素材版权归鹰角网络所有；本项目对其的使用仅限学习、展示与非商业用途，不在 MIT 许可证覆盖范围内。逐项来源、sha256 与采用依据见 [docs/credits.md](docs/credits.md)；若权利方认为任何素材使用不当，请通过 Issue 联系，我们会立即删除或替换。

## 许可证

MIT，仅覆盖本项目的原创代码；第三方素材的归属见[素材归属与免责声明](#素材归属与免责声明)与 [docs/credits.md](docs/credits.md)。
