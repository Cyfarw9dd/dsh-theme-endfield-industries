# 暗色调色板调研:「终末地工业终端黑」的舒适梯度

> 本文回答:主题暗色「太黑、白字压黑底对比过强(用户实测约 16.5:1)」应该改成什么梯度。
> 不回答:具体落地改码(那是调色板 PR 的事)。所有对比度均为本人按 WCAG 相对亮度公式
> 实算(公式见附录 A),不复述任何第三方算好的数字。调研日期:2026-10-24。
> 取色声明:**本报告没有任何「目测取色」值**——所有 hex 都来自可验证的文本源
> (官方规范/官方源码/仓库先验实测),或由公式计算得出。

---

## 0. 结论速览

1. **当前痛点量化**:正文 `#f5f5f0` 压底 `#101110` = **17.30:1**(层1 上 16.00、浮层上 15.34)。
   行业舒适区间实测量在 **11–15:1**(VS Code 11.25 / M3 14.35 / Radix 15.15);
   官网自己的暗面板 `#191919`+白字是 17.58:1——但那只是页头小黑牌,不是大面积阅读面。
2. **「底太黑」是真的**:底 `#101110`(相对亮度 ≈0.6%)比六大体系的常用底
   (M3 `#141218`、Radix `#111111`/`#191919`、VS Code `#1E1E1e`、Primer `#0D1117`+蓝相)
   都更黑或等黑,而正文却接近纯白,两头都顶到极限。
3. **梯度共识**:相邻层 1.05–1.2:1 步进、整梯 1.0→1.5:1(M3 容器族实测 1.04→1.52);
   正文用「近白非白」(#D4D4D4→#F0F6FC),次级 5–8.5:1,装饰描边 1.5–2.3:1。
4. **推荐三档**(§4,均在 Radix sand / 官网灰阶上构造,全部实算):
   **B 微暖工业灰(主推,正文 14.50)** / A 中性·官网直取(13.78)/ C 舒适最大化(12.04)。

---

## 1. 《明日方舟:终末地》界面色彩证据(任务一)

### 1.1 游戏状态与官方渠道清单

游戏**已正式上线**(发行日期 2026-01-22,据 biligame 官方 wiki 条目),不再是测试期。
本轮核到的官方渠道:

| 渠口 | URL | 本轮可达性 |
| --- | --- | --- |
| 国服官网 | https://endfield.hypergryph.com/ | ✅ 2026-10-24 抓取 HTTP 200 |
| 国际官方站(Gryphline) | https://endfield.gryphline.com/ | ✅ 抓取新闻页/公告成功 |
| 官方 B 竺空间 | https://space.bilibili.com/1265652806 | URL 来自官方 wiki「相关链接」表;B 站为 JS 站,文本抓取无内容 |
| 官方微博 | https://weibo.com/u/7745672941 | 同上(需登录,未抓取) |
| 官方 wiki(BWIKI) | https://wiki.biligame.com/zmd/首页 | ✅ 抓取成功 |
| 官方网页工具「协议终端」 | https://game.skport.com/endfield/game-data | ✅ 抓到 SPA 壳标题「Arknights: Endfield Protocol Terminal」,样式在打包 JS 内 |

### 1.2 官网实测色板(一手,精确值,非目测)

仓库先验实测(2026-09-30 对官网 368KB CSS 全量字面量统计,含像素级复核,
记录于 [docs/endfield-ui-research.md](../endfield-ui-research.md);本次未重新解包,
仅确认站点仍在):**灰阶绝对主导,且是纯中性灰(R=G=B,无色温倾向)**:

| 色值 | 角色 | 我实算:对 `#191919` 的对比度 |
| --- | --- | --- |
| `#191919` | 主工业灰:暗面板/页脚底/图标墨色(出现 85 次) | — |
| `#fff` | 暗底主文字(76 次) | **17.58** |
| `#d9d9d9` | 亮灰:悬停面/边线 | 12.46 |
| `#999` | 次要文字灰 | 6.17 |
| `#666` | 深一级次要灰 | 3.06(仅大字/图标级) |
| `#484848` / `#626262` | 暗色悬停面 | 1.92 / 2.75 |
| `#424242` | 边线灰 | 1.75 |
| `#35373c` | 面板灰(唯一微冷,−1/255 蓝相) | 1.48 |
| `#fffa00` | 信号黄:装饰条/选中标记/主 CTA 悬停(稀有) | — |

**交互语法**(官网 CSS 规则原文证据,先验实测):悬停/选中全部灰阶
(暗 `#484848`/`#626262`),黄只给「需要被看见的那一处」;文字层级
`#fff → #d9d9d9 → #999 → #666` 明度梯队。**官网暗面板与正文的关系就是「深灰底+纯白字」
的高对比**,但它出现在页头黑牌、页脚等小面积处,页面主体是白底——官网并没有给
「大面积暗色阅读面」的先例。

### 1.3 游戏内菜单/终端界面:诚实边界 + 可核来源

**边界声明**:游戏内 UI 的精确 hex 无法从文本渠道核实——实机画面取色需要看图,
本调研受「不下载任何素材」纪律与纯文本抓取通道所限,**不从视频/截图编造取色值**。
以下给定性结论(注明来源性质)与供人工核色的官方一手来源:

- **定性(二手,文字)**:[biubiu 美术解析](https://www.biubiu001.com/news/162917.html)(2026-01):
  「柠檬黄与灰调背景的结构性并置」「远景工业结构保持金属冷灰」「所有亮色集中于视线高频区域,
  避免大面积铺陈」——即**灰底主导、黄色稀有点缀**,与官网语法一致;场景灰偏「金属冷灰」。
- **官方实机画面来源(供人工核色,本轮未取色)**:
  官方 B 竺空间(上表)、Gryphline 国际站影像区 https://endfield.gryphline.com/zh-tw#information 、
  媒体实机整理(游侠网,2024-12 二测实机 https://3g.ali213.net/news/html/891139.html 、
  360 游戏 http://360game.360.cn/article/content?id=675ff8900318cc2b44db7b45 ——两者正文均纯图片,
  无色彩数值)。
- **官方 wiki 游戏内系统页**(预警终端/总控中枢/采购中心等)均为截图,无色彩文字;
  例:https://wiki.biligame.com/zmd/预警终端 。
- **后续可挖的一手来源**:官方网页工具「协议终端」(game.skport.com,上表)是官方
  终末地风格 Web UI,其打包 CSS 中应有精确令牌;本轮文本抓取只能拿到 SPA 壳,
  需要浏览器环境解包(留给后续任务)。

### 1.4 小结(任务一)

- 官网证据:**纯中性灰、零色温倾向**;梯度是 `#191919 → #222(暗悬停) → #484848/#626262`,
  正文白,次级 `#999`(6.17:1)。
- 游戏内界面(二手定性):同为「灰黑工业底 + 柠檬黄信号」语法;无证据表明菜单用
  暖色或冷色倾向的底色。
- 因此「终末地工业终端黑」的**底色应取中性或极微暖/极微冷灰,明度落在
  `#16`–`#1c` 区间**(与官网 `#191919` 同档),而不是现在的 `#10` 档。

---

## 2. 主流暗色主题实测(任务二)

### 2.1 数据来源(全部官方一手)

| 体系 | 来源 | 性质 |
| --- | --- | --- |
| Material 3 基线暗色 | androidx 源码 [ColorDarkTokens.kt](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/ColorDarkTokens.kt) + [PaletteTokens.kt](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/PaletteTokens.kt)(v0_210) | 官方源码 |
| Apple HIG / iOS | [Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode/) 与 [Color](https://developer.apple.com/design/human-interface-guidelines/color)(经官方文档 JSON 端点抓全文);灰阶 hex 为二手表(§2.3 注) | 官方原文 + 二手数值 |
| GitHub Primer dark | 官方令牌仓库 [primer/primitives](https://github.com/primer/primitives)(`src/tokens/functional/color/{bg,fg,border}Color.json5` + `base/color/dark/dark.json5`) | 官方源码 |
| VS Code Dark+ | [dark_vs.json / dark_plus.json](https://github.com/microsoft/vscode/blob/main/extensions/theme-defaults/themes/dark_vs.json) | 官方源码 |
| Radix Colors dark | 官方仓库 [radix-ui/colors `src/dark.ts`](https://github.com/radix-ui/colors/blob/main/src/dark.ts) + [12 步用例文档](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) | 官方源码/文档 |

### 2.2 实测值与实算对比度

**Material 3 基线暗色**(中性微紫,r−b≈−4):

| 角色 | hex | 对 surface `#141218` |
| --- | --- | --- |
| surface / background | `#141218` | — |
| surfaceContainerLowest / Low / (surface) / High / Highest | `#0F0D13` / `#1D1B20` / `#211F26` / `#2B2930` / `#36343B` | 1.04 / 1.09 / 1.14 / 1.29 / 1.52(整梯五级) |
| onSurface(正文) | `#E6E0E9` | **14.35** |
| onSurfaceVariant(次级) | `#CAC4D0` | 10.91(surface 上)/ 9.56(container 上) |
| outline(交互描边) | `#938F99` | **5.87** |
| outlineVariant(装饰描边) | `#49454F` | 1.99 |

**Apple iOS 暗色**(灰阶微蓝,`#1C1C1E` r−b=−2;官方原文:底=dim 的 base、浮层=bright 的
elevated;正文官方建议见 §3):

| 角色 | hex | 实算 |
| --- | --- | --- |
| systemBackground(底) | `#000000`(真黑,OLED) | — |
| secondary / tertiary(浮层梯度) | `#1C1C1E` / `#2C2C2E` | 对底 — / 1.22;白字对 secondary 17.01 |
| label(正文) | `#FFFFFF` | 对底 **21.00**(行业最高,Apple 特例) |
| secondaryLabel(60% 白,压黑底复合 ≈ `#8D8D93`) | `#EBEBF5` @60% | 对底 **6.36** |
| separator | `#38383A` | 对底 1.79 |
| systemGray / Gray6 | `#8E8E93` / `#1C1C1E` | 6.44 / — |

**GitHub Primer dark**(灰阶明显偏蓝冷,H≈213–218、canvas r−b=−10):

| 角色 | hex | 实算 |
| --- | --- | --- |
| canvas.default(底) | `#0D1117` | — |
| canvas.muted(层2) | `#151B23` | 对底 1.09 |
| canvas.inset(凹槽) | `#010409`(near-black) | — |
| fgColor.default(正文) | `#F0F6FC` | **17.39**(底上)/ 15.91(层2 上) |
| fgColor.muted(次级) | `#9198A1` | **6.50** / 5.94 |
| borderColor.default(暗色覆盖=neutral.7) | `#3D444D` | 1.92 / 1.76 |
| 高对比覆盖 | dark-high-contrast 正文回 neutral.13=白、边框升 neutral.10 | 体系内建「提对比」档 |

**VS Code Dark+(纯中性灰,R=G=B)**:

| 角色 | hex | 实算 |
| --- | --- | --- |
| editor.background(底) | `#1E1E1E` | —(六大体系里最亮的常驻底) |
| editor.foreground(正文) | `#D4D4D4` | **11.25**(行业低档,代码长时间阅读场景) |
| menu.background / menu.foreground | `#252526` / `#CCCCCC` | 9.54 |
| input.placeholderForeground / tab 非激活 | `#A6A6A6` | 6.85 |
| menu.border / widget 边 | `#454545` | 1.60 |
| sideBarTitle.foreground | `#BBBBBB` | 7.98(对 `#252526`) |

**Radix Colors dark·gray 族**(纯中性;官方 12 步:1–2 底、3–5 组件、6–8 描边、9–10 实心、
11–12 文字;步骤 11/12 官方保证在 step2 底上 Lc60/Lc90):

| 步 | hex(1→12) | 实算(对 gray2 `#191919`) |
| --- | --- | --- |
| 1 / 2(底) | `#111111` / **`#191919`** | — / 对 1:1.07 |
| 3 / 4 / 5(组件面) | `#222222` / `#2A2A2A` / `#313131` | 1.11 / 1.22 / 1.31 |
| 6 / 7(弱/交互描边) | `#3A3A3A` / `#484848` | 1.55 / 1.92 |
| 11(低对比文字) | `#B4B4B4` | **8.48** |
| 12(高对比文字) | `#EEEEEE` | **15.15**(对 gray1 则 16.28) |

> 旁证:Radix 官方暗色灰阶的 **step2 恰好就是 `#191919`**——终末地官网主工业灰
> 与业界「subtle dark background」标准档完全同值,这是「底抬到 19 档」的独立背书。
> Radix 同族 **sand(暖灰)**:`#111110/#191918/#222221/#2A2A28/#3B3A37/#494844/#B5B3AD/#EEEEEC`,
> 各步对比度与 gray 几乎逐一对齐(15.14/8.39/1.55/1.92)——证明「微暖灰」可以整套
> 平移而不破坏梯度。

### 2.3 Discord / Linear:本轮未能验证,如实说明

- discord.com 与 linear.app 在本环境不可达(网络错误/SPA 壳),两者都没有可抓取的
  官方静态色彩规范;社区流传值(如 Discord `#313338`、Linear `#08090a`)**无法在本轮
  核实来源,故不写入对比表格,不编造**。
- 「至少 4 家」的要求已由 Material 3 / Apple / Primer / VS Code + Radix(5 家,全官方一手)满足。

### 2.4 共性总结(任务二的「行业答案」)

1. **是否避免纯黑 `#000`?** 是,除 Apple(故意用真黑省电+OLED)与 Primer 的 inset
   `#010409`(凹槽语义)外,常驻底都在 `#0D`–`#1E` 的「深灰」档。Primer/Apple 的纯黑
   都有明确语义(最凹层/系统底),不是面板色。
2. **正文是否避免纯白 `#fff`?** 除 Apple(21.0,配合 vibrancy)外全部避免:
   VS Code `#D4D4D4`(11.25)< Radix 12 `#EEEEEE`(15.15)< M3 `#E6E0E9`(14.35)
   < Primer `#F0F6FC`(17.39,偏蓝相的白)。**正文越接近纯白,底越不能同时最黑**。
3. **surface 提升梯度怎么做?** 「同色相灰 + 明度步进」:相邻层 1.05–1.2:1,整梯
   1.0→1.5:1(M3 五级容器 1.04/1.09/1.14/1.29/1.52;Radix 1→5 步 1.07/1.11/1.22/1.31;
   Apple base→elevated→tertiary `#000`→`#1C1C1E`→`#2C2C2E`)。浮层永远比底亮。
4. **色温?** 三派并存:Primer 偏蓝冷(r−b=−10)、M3 微紫(−4)、Apple 灰微蓝(−2);
   VS Code Dark+ 与 Radix gray 纯中性;Radix 另提供暖灰族 sand 证明暖灰同样成立。
   **没有一家用绿相**——现主题 `#181a18`/`#1e201d` 的绿相(+2/255)是异类。
5. **次级文字落点 5.2–10.9:1**,集中在 6–8.5(Primer 6.50、Apple 复合 6.36、
   Radix 8.48、VS Code 6.85)。
6. **装饰描边 1.5–2.3:1**(六家无一 ≥3);**承担辨识/交互身份的描边才 ≥3:1**
   (M3 outline 5.87;Primer/Radix 的 interactive border 档)。

---

## 3. 暗色可读性舒适度共识(任务三)

### 3.1 晕光效应(halation)与散光人群

- [BOIA《Dark Mode Can Improve Text Readability — But Not for Everyone》](https://www.boia.org/blog/dark-mode-can-improve-text-readability-but-not-for-everyone)(2021,
  引无障碍专家 Sheri Byrne-Haber 的 UX Collective 文章与 H. Locke):**约 47% 的人有
  某种程度散光**;暗底使虹膜开大采光,散光者对焦困难,浅字在暗底上产生**「晕光效应」
  (halation,光晕/字边发虚)**;全对比(纯白压纯黑)对阅读障碍人群同样不友好。
  (UX Collective 原文 https://uxdesign.cc/accessibility-and-dark-ui-themes-f01001339b65
  本环境被 Cloudflare 拦截,内容经 BOIA 转引。)
- [NN/g《Dark Mode vs. Light Mode》](https://www.nngroup.com/articles/dark-mode/)(学术综述,
  2020):正常/矫正视力人群**正极性(浅底深字)在视力与校对任务全面占优**,且字号越小
  优势越大;**夜间+小字号时暗模式显著更难读**(Dobres et al., MIT AgeLab);
  主观疲劳度两种模式无显著差异——即「觉得舒服」与「实际可读」是两回事。
- Apple HIG Dark Mode 官方原文(本轮抓取):暗色下系统用「更暗的背景+更亮的前景」,
  且专门提醒**暗色语境里白底图像会「发光」(glowing)应压暗**——同一机制即白字压
  近黑底的发光感。原文:"Soften the color of white backgrounds…to prevent the background
  from glowing in the surrounding Dark Mode context."
  来源:https://developer.apple.com/design/human-interface-guidelines/dark-mode/

### 3.2 正文对比度的推荐区间

- **下限(WCAG 2.2 AA)**:正文 4.5:1、大字 3:1;AAA 为 7:1。
- **Apple HIG 官方**:最低不小于 4.5:1,自定义色对**争取 7:1,尤其小字**
  ("strive for a contrast ratio of 7:1, especially in small text")。
- **行业实践落点(§2 实算)**:正文 11–17.6:1;**代码/长文阅读型产品明显取低档**
  (VS Code 11.25);内容浏览型取高档(Primer 17.39)。综合晕光证据,**正文对比
  建议 11–15:1**:高于 AAA(7)保证可读,又比「纯白压纯黑 21」显著柔和;
  现主题 17.3 偏高档且叠在最黑的底上,正是用户不适的来源。

### 3.3 非文本 3:1 与「大面积低对比灰区」

- [WCAG 2.2 SC 1.4.11 Non-text Contrast 官方解释](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html):
  UI 组件辨识与状态信息、图形对象对相邻色 **≥3:1**;不活跃组件豁免;控件若已有
  文字/图标辨识,**边界线不强制 3:1**。另有两点直接相关:阈值不四舍五入(2.999 不过);
  **细线经抗锯齿后实际更淡,建议别用极细线或应超出规范值**("avoid particularly thin
  lines and shapes, or use a combination of colors that exceeds the normative requirements")。
- 「大面积低对比灰区」的行业处理(§2 数据):**功能分层,不做全 3:1**——装饰性
  边线/分隔线 1.5–2.3:1(六家一致),把 3:1+ 留给焦点环、交互描边、必需辨识物
  (M3 outline 5.87);大面积面与面靠 1.05–1.5 的梯度+阴影区分,而非拉对比。

### 3.4 高饱和色在暗底:提亮 + 降饱和

- **Apple 官方数据**(HIG Color 页系统色规格,本轮抓取的 light/dark RGB):
  黄 light `R161 G106 B0`(浓)→ dark `R254 G223 B67`(**更浅更淡**);
  红 light `R233 G21 B45` → dark accessible `R255 G97 B101`。暗色一律「抬明度、降饱和」。
- **Primer 实践**:暗色链接/强调 `#4493F8`,高对比档再提 `#74B9FF`(非把亮色模式的
  深蓝直接照搬)。
- [Smashing Magazine《Inclusive Dark Mode》](https://www.smashingmagazine.com/2025/04/inclusive-dark-mode-designing-accessible-dark-themes/)(2025):
  明确「用深灰不用纯黑」「**避免高饱和大面积色,暗模式里会累眼**」「暗模式抗锯齿会
  产生 halo(晕圈),需真机多端测试」。
- 对本主题的映射:**谷地黄 `#fffa00` 类信号黄绝不能作为暗底大面积色/长文本色**,
  只做信号位点缀(与官网语法一致);若暗色下要黄字/黄标,参照 Apple 语法提亮降饱和。

---

## 4. 「终末地工业终端黑」候选梯度(三档)

构造原则:底抬到 `#16`–`#1c` 档(官网/Radix 档位);正文退到 12–14.5:1 区间;
梯度对齐 Radix sand/gray 与 M3 容器族;描边维持装饰档、交互身份灰另行 ≥3:1
(沿用本仓库「选中/光标固定灰」语法,不在本表)。全部数值为本人实算。

### 档 A「中性·官网直取」——色温:纯中性(R=G=B,零倾向)

| 令牌 | hex | 实算对比度 |
| --- | --- | --- |
| 底 bg-base | `#191919`(官网主灰/Radix gray2 同值) | — |
| 层1 bg-layer-1 | `#222222` | 对底 1.11(Radix gray3) |
| 层2 bg-layer-2 | `#2A2A2A` | 对层1 1.11 / 对底 1.22(Radix gray4) |
| 浮层/菜单 overlay | `#262626` | 对层1 1.05 |
| 描边 L1 / L2 | `#3D3D3D` / `#525252` | 对底 1.62 / 2.25(装饰档,官网边线 1.75 同档) |
| 正文 label-primary | `#E4E4DF`(非纯白) | **对底 13.78** / 对浮层 11.86 |
| 次级 label-secondary | `#9A9A95` | 对底 6.22 / 对层1 5.63 / 对浮层 5.35 |

定位:最贴官网证据的一档;正文对比与 M3(14.35)同档。

### 档 B「微暖工业灰」(主推)——色温:极微暖(r−b=+1~+10,呼应亮色模式暖纸墨)

| 令牌 | hex | 实算对比度 |
| --- | --- | --- |
| 底 bg-base | `#161615` | — |
| 层1 bg-layer-1 | `#1E1E1C` | 对底 1.08 |
| 层2 bg-layer-2 | `#262623` | 对层1 1.10 / 对底 1.19 |
| 浮层/菜单 overlay | `#222220` | 对层1 1.05 |
| 描边 L1 / L2 | `#3B3A36` / `#54524C` | 对底 1.59 / 2.32 |
| 正文 label-primary | `#E8E6DF` | **对底 14.50** / 对层1 13.37 / 对浮层 12.76 |
| 次级 label-secondary | `#A09E96` | 对底 6.75 / 对浮层 5.94 |

定位:梯度逐段对齐 Radix sand(各步对比几乎同值);正文 14.5 落在 M3 与 Radix 之间;
微暖与主题亮色(暖白 `#E8E8E2`)成对,去掉现暗色的绿相。

### 档 C「舒适最大化」——色温:近中性(+1 暖,可再调零)

| 令牌 | hex | 实算对比度 |
| --- | --- | --- |
| 底 bg-base | `#1C1C1B`(六家最亮底 VS Code `#1E1E1E` 档) | — |
| 层1 bg-layer-1 | `#232322` | 对底 1.08 |
| 层2 bg-layer-2 | `#2B2B29` | 对层1 1.11 / 对底 1.20 |
| 浮层/菜单 overlay | `#272726` | 对层1 1.05 |
| 描边 L1 / L2 | `#414140` / `#575755` | 对底 1.67 / 2.35 |
| 正文 label-primary | `#D9D9D4`(≈VS Code `#D4D4D4` 档) | **对底 12.04** / 对浮层 10.56 |
| 次级 label-secondary | `#94948F` | 对底 5.60 / 对浮层 4.91 |

定位:正文降到 VS Code 档(长文阅读最柔和);代价是次级对浮层 4.91 贴着 AA 下限、
整体最「浅」,工业终端感最弱。

### 推荐顺序与理由

1. **B(主推)**:唯一同时满足「贴官网灰阶档位(Radix sand 逐档对齐)+ 正文 14.5 舒适档
   + 与亮色暖纸墨成对 + 无绿相」;
2. **A(并列可选)**:若想要「和官网像素级同源」的中性灰,A 是证据最硬的一档;
3. **C(备选)**:仅当用户仍嫌 B 正文刺眼时再降——次级对比与气质都到下限了。

三档共同注意事项:
- **黄信号**:底变亮后,谷地黄对比全面下降,焦点环/进度轨等信号位需按 §3.4 重新验算
  (黄在 `#16`–`#19` 底上仍高对比,但黄底黑字的 `--edge-accent-ink` 组合要复核);
- **交互身份灰**(选中/光标,仓库固定灰语法)与本表无冲突,不动;
- 落地时按仓库规矩把每个新色对其实际底面的对比度写进
  `test/palette-contrast.test.js`(本报告数值可直接抄)。

---

## 5. 来源清单

**任务一(终末地)**
- 官网(2026-10-24 可达):https://endfield.hypergryph.com/
- 仓库先验实测(2026-09-30,368KB CSS 全量统计+像素复核):docs/endfield-ui-research.md(本仓库)
- 国际官方站/新闻:https://endfield.gryphline.com/zh-tw/news/0755(游戏工具指南,官方)
- biligame 官方 wiki 条目(发行日期/官方渠道表):https://wiki.biligame.com/zmd/明日方舟：终末地
- wiki 预警终端页(游戏内系统,截图型):https://wiki.biligame.com/zmd/预警终端
- biubiu 美术解析(二手定性):https://www.biubiu001.com/news/162917.html
- 媒体实机(纯图,供人工核色):https://3g.ali213.net/news/html/891139.html 、
  http://360game.360.cn/article/content?id=675ff8900318cc2b44db7b45

**任务二(暗色体系)**
- androidx M3 令牌:ColorDarkTokens.kt / PaletteTokens.kt(见 §2.1 链接)
- Apple HIG Dark Mode(官方原文,经 JSON 端点):https://developer.apple.com/design/human-interface-guidelines/dark-mode/
- Apple HIG Color(系统色 light/dark 规格):https://developer.apple.com/design/human-interface-guidelines/color
- Apple 灰阶 hex(二手表,与公认值一致):https://themeandcolor.com/blog/ios-dark-mode-colors
- Primer primitives:https://github.com/primer/primitives(bgColor/fgColor/borderColor/base dark)
- VS Code Dark+:https://github.com/microsoft/vscode/blob/main/extensions/theme-defaults/themes/dark_vs.json
- Radix Colors:https://github.com/radix-ui/colors/blob/main/src/dark.ts 、
  https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale
- Discord/Linear:本轮官方源不可达,未采信任何社区值(§2.3)

**任务三(舒适度)**
- WCAG 2.2 SC 1.4.11 Understanding(官方):https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- BOIA(散光 47%/晕光,转引 Byrne-Haber):https://www.boia.org/blog/dark-mode-can-improve-text-readability-but-not-for-everyone
- 原文(未能直抓):https://uxdesign.cc/accessibility-and-dark-ui-themes-f01001339b65
- NN/g 学术综述:https://www.nngroup.com/articles/dark-mode/ 、
  用户调研 https://www.nngroup.com/articles/dark-mode-users-issues/
- Smashing Magazine:https://www.smashingmagazine.com/2025/04/inclusive-dark-mode-designing-accessible-dark-themes/

---

## 附录 A:对比度计算方法(可复现)

WCAG 相对亮度:`c≤0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4`(c 为 0–1 sRGB),
`L = 0.2126R + 0.7152G + 0.0722B`,`ratio = (L亮+0.05)/(L暗+0.05)`。
本文所有「实算」值均由该公式对 hex 直接计算(两点说明:Apple secondaryLabel 按
60% 白 `#EBEBF5` 压纯黑复合为 ≈`#8D8D93` 后计算,属**复合估计**;M3 值取 androidx
v0_210 基线,Material Theme Builder 按品牌生成会偏移)。

## 附录 B:与任务书中数字的对账

用户反馈「约 16.5:1」:实算正文/底 = 17.30,正文/层1 = 16.00,正文/浮层 = 15.34
——量级一致,差异来自所取底面不同;结论不受影响(全档 > 15 偏高)。
