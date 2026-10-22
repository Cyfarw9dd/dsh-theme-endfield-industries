# 素材归属

本文回答：本主题用到的每一份第三方/官方素材**来自哪里、以什么方式采用、权利归谁**；不回答设计取值（见 [design-language.md](design-language.md)）与构建管线（见各 `scripts/build-*.js` 头注）。README 只保留免责声明与指向本文的链接；采用第三方来源的登记规则见 [AGENTS.md](../AGENTS.md) 与 [docs/AGENTS.md](AGENTS.md)。

本插件是**非官方同人作品**，与鹰角网络（Hypergryph）不存在任何隶属、赞助或背书关系。

- 《明日方舟：终末地》（Arknights: Endfield）的游戏名称、标识、商标、官网视觉与设计语言及相关美术素材，版权归**鹰角网络（上海鹰角网络科技有限公司，Hypergryph Network Technology）**所有。
- 背景纹理直接沿用官方站点自身的发布产物：`endfield-block-bg.svg`（工程网格）、`endfield-wave-bg.png`（右上波纹）、`endfield-tape-wave-bg.png`（中央波纹带），三者取自官方 CDN `web.hycdn.cn/endfield/official-v4/_next/static/media/` 的 `/operator` 路由发布文件，**以原始字节内嵌**（不做再压缩）。来源 URL、sha256 与构建方式见 [scripts/build-texture.js](../scripts/build-texture.js) 头注；采用已获本仓库所有者明确指示（「沿用官方」）。
- 设置面板统一下拉的圆形箭头沿用官网 `/operator` 页筛选下拉（官方 `Dropdown` 组件）自身的发布文件 `endfield-dropdown-arrow.png`（官方 `arrow.592963ed.png`），同取自上述官方 CDN 目录，**以原始字节内嵌**。来源、sha256 与构建方式同见 [scripts/build-texture.js](../scripts/build-texture.js) 头注；采用依据是本仓库所有者指定该下拉为设置面板控件的参考。
- 按钮等高线材质 `endfield-button-texture.png`（官方 `button-texture.63d91da2.png`，320×72）取自官网**基础按钮** `.Button_button::before` 的发布文件，同 CDN，**官方 PNG 原字节内嵌于带左侧渐隐遮罩的 SVG 包装**（墨迹 x≈103 硬起笔需渐隐消解）；暗色「跳过」用的反相墨是**构建期从原图派生**的调色板反相变体（仅 PLTE 块翻转，非第二次下载）。来源、sha256、派生与包装方式见 [scripts/build-texture.js](../scripts/build-texture.js) 头注与 [endfield-ui-research.md § 七](endfield-ui-research.md)；采用已获本仓库所有者明确指示（「图案复刻官方」，2026-10-13）。
- 新建会话页的品牌标识（`assets/hero-logo-body.svg` / `assets/hero-logo-ink.svg`）取自《明日方舟：终末地》× 优衣库 UTme! 联名活动页的「终末地标识 3」（定格今夏系列）贴图，**来源为活动页自身的官方承载域名** `www.bilibiliytoy.com`（页面 https://www.bilibili.com/toy/skland-uniqlo-2026/index.html 内嵌的 `assets/stickers/summer/logo-03.png`）；原始 1024×458 PNG 以原始字节保留在 `assets/hero-logo-3-summer.png`（sha256 `ee4fcfbd547e50202550d12bdd27934c608f3c8455d1242020b3e431c70dc966`），两个 SVG 是**在本地由该 PNG 分层描摹得到的形状掩码**（颜色由主题给出）。采用已获本仓库所有者明确指示（「把这个放到新会话的主界面」）；来源 URL、描摹步骤与斜纹几何测量见 [scripts/build-logo.js](../scripts/build-logo.js) 头注。
- 本仓库中的**部分素材**（如 `assets/` 下的界面截图，水印徽标矢量源 [endfield-industries.svg](../assets/endfield-industries.svg)（[Yue-plus/endfield_icons](https://github.com/Yue-plus/endfield_icons) 对官方标识的矢量重制，采用已经本仓库所有者批准），以及主题中还原的 `ENDFIELD` 字标、信号黄配色与终末地工业终端风格版式）源自或参考上述作品及其官网，仅用于**学习、展示与非商业用途**；其权利仍归鹰角网络所有，**不在本项目的 MIT 许可证覆盖范围内**。
- 本项目的原创代码（`client.js`、`index.js`、`scripts/`、`test/` 等）以 MIT 许可证发布。
- 若权利方认为本仓库中的任何素材使用不当，请通过 Issue 联系，我们会立即删除或替换相关内容。
