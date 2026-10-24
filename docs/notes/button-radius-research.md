# 官网按钮倒角复核(一手 CSS 证据)

> 本文回答一个问题:**官网的按钮到底是不是全直角**——所有者的记忆「不是全直角,
> 而是带微小倒角」是否成立,以及倒角体系的完整数值。不回答本主题要不要跟着改
> (那是所有者的决策;本报告只给事实)。取数日期:**2026-10-24**,全部为当日线上
> 一手 CSS 原文,不经任何二手转述。

---

## 0. 结论一句话

**成立。官网的矩形按钮没有一个是全直角**:全部带 2–7px 微倒角,主力档是 **4px**
(`.25rem` 与 `4px` 两种写法合计 29 处);唯一会「动圆角」的是通用按钮
`.Button_button`(**常态 2px → 悬停 6px**,`.2s ease`,竖屏基态 `.25rem`),其余
所有按钮的倒角**恒定不随状态变**。纯直角只出现在未声明 `border-radius` 的
装饰层(色带、角标、斜纹容器内部的条块),不在可点元素上。

---

## 1. 取数方法与当日线上清单(证据基础)

1. `curl` 官方站 3 个路由(`/`、`/news`、`/operator`,均 HTTP 200,SSR HTML),
   抽出 `<link rel="stylesheet">` 的**并集**:当前共引用 **10 个 CSS bundle**
   (前缀均为 `https://web.hycdn.cn/endfield/official-v4/_next/static/css/`);
2. 逐个取回正文(共 **401,157 字节**),花括号配平 + `@media` 递归解析,得到
   **2,002 条规则**;凡声明体含 `border-radius` 的规则全部登记;
3. 未下载任何图片/字体/音效;`url(...)` 引文与素材政策同先验调研。

| bundle(当日哈希) | 字节 | 备注 |
| --- | ---: | --- |
| `3036173670b5b1b4.css` | 35,420 | /news 公告列表 |
| `3a129342b9ac5e73.css` | 19,000 | Dropdown/OperatorItem(**哈希自 10-01 未变**) |
| `46158da72caa0121.css` | 100,288 | **Button/Header 全家** |
| `6b6d9a58b4c43339.css` | 340 | |
| `7f4007f6fbea68d1.css` | 91,138 | /operator 主界面 |
| `89618c72836110eb.css` | 21,722 | 影像区(**哈希未变**) |
| `a13bb29dcb00dc9c.css` | 16,740 | 下载按钮(**哈希未变**) |
| `c1b6a925ef3d04ee.css` | 94,582 | SubpageTab/HomeButton/Lore(**10-15 同款**) |
| `cf29e99f050a5f93.css` | 14,106 | Toast/公告列表 |
| `d27b439a0cf24257.css` | 7,821 | 滚动条 |

> 站点在 10-01 调研后重新部署过:旧 C3 `3519621a91073b60.css` 已不在引用列表,
> `.Button_button` 规则现居 `46158da72caa0121.css`。**本报告全部引用均为当日
> 线上原文,非旧档。**

---

## 2. 逐元素倒角原文(常态 / 悬停 / 激活)

### 2.1 通用按钮 `.Button_button`——全站唯一「动圆角」的元素

```css
/* 46158da72caa0121.css —— 常态(横屏) */
.Button_button__njqVS{position:relative;width:20rem;height:4.5rem;…;border:none;
  border-radius:2px;padding:0;cursor:pointer;background-color:#383838;…
  transition:color .2s ease,background-color .2s ease,border-radius .2s ease;…}
.Button_button__njqVS:before{…;border-radius:2px;transition:border-radius .2s ease;
  background-image:url(…/button-texture.63d91da2.png)}   /* 纹理层同步倒角 */

/* 竖屏基态抬到 4px */
@media(orientation:portrait){ .Button_button__njqVS{border-radius:.25rem;
  box-shadow:0 0 .75rem rgba(0,0,0,.25)} }

/* 悬停:换字色+换底色+变圆角,纹理层 :before 跟随;亮色变体同样 6px */
@media(any-hover:hover){
  .Button_button__njqVS:hover{color:#fff;background-color:#484848;border-radius:6px}
  .Button_button__njqVS:hover:before{border-radius:6px}
  .Button_button__njqVS.Button_light__kRD_6:hover{border-radius:6px}
}

/* 禁用只换色,不动角 */
.Button_button__njqVS.Button_disabled__FGmkD{cursor:not-allowed;pointer-events:none;
  background-color:#888;color:#666}
```

读法:**常态 2px → 悬停 6px**(`.2s ease`,角是被过渡的属性之一;竖屏 2px 换成
`.25rem`/4px 基态,悬停同样到 6px)。`:before` 等高线纹理层与本体同步变角,
避免纹理从圆角下露出来。

### 2.2 其余矩形按钮——全部**恒定**微倒角,状态只换色

| 元素(选择器去模块前缀) | 常态 | 悬停/激活改什么 | 出处 bundle |
| --- | --- | --- | --- |
| `SubpageTab_tab`(/news 页签) | **4px** | `:hover{background-color:#f3f3f3}`、`_active{#e5e5e5}`,不动角 | c1b6a925 |
| `Dropdown_trigger`(语言/下拉触发器) | **.25rem(4px)** | `:hover{border-color:hsla(0,0%,100%,.45)}`,不动角 | 3a129342 |
| `Dropdown_panel`(下拉面板) | **.25rem(4px)** | — | 3a129342 |
| `Header_buttonPreserveBg`(**#191919 黑牌 CTA「前往游戏」**) | **4px**(`:before` 斜纹层同 4px) | `:hover .Header_bg{opacity:1}` 黄层淡入 + 文字/分隔线翻 `#191919`,**不动角** | 46158da7 |
| `Header_buttonShareBg`(#e5e5e5 亮牌)/`buttonShare`/`shareListDetailActive` | **4px** | 同上家族 | 46158da7 |
| `HomeButton_button`(#fffa00 黄底主 CTA) | **.25rem(4px)** | `:active{border-color:#e6de01}`,不动角 | c1b6a925 |
| `/operator` `listButton`(列表行/CTA) | **.3125rem(5px)** | `:hover{#626262}`、`:active{#282828}`,不动角 | 7f4007f6 |
| 下载按钮 `pc-cn_button` | **.4375rem(7px)** | 换色族 | a13bb29d |
| 下载按钮 `h5-cn_button`/`h5-oversea_button`(:before .125rem) | **.25rem(4px)** | 换色族 | a13bb29d |
| `downloader_item`(下载器行)/`h5-cn_lineButton` | **.4375rem(7px)** | — | a13bb29d |
| `downloader_iconContainer` / `OperatorItem_operatorItem` | **.1875rem(3px)** | — | a13bb29d / 3a129342 |
| `__00-landing_actButton`(落地页行动钮,inner 左上单角 `.25rem 0 0 0`) | **.25rem(4px)** | — | c1b6a925 |
| `BackButton_backButton` | **.3125rem(5px)** | — | c1b6a925 |
| `Toast_content` | **.25em(4px)** | — | cf29e99f |
| 滚动条 `scrollBar` / `thumb` | **.1875rem(3px)** | — | d27b439a |
| `__04-Information` 日期标签/按钮容器 | **2px** | — | 89618c72 |
| `Header_navItem:before`(导航悬停牌) | **.25rem(4px)** | — | 46158da7 |
| 弹窗内容框(ReserveModal)/OrigQuery 表头 | **.25rem(4px)** / **.3125rem(5px)** | — | 46158da7 |
| 公告列表项 `noticeItem`/图片容器 | **.5rem(8px)** | — | 3036173670 / cf29e99f |

**圆形/胶囊家族**(形状本身是圆的,按先验「圆的保留圆」原则列出备查):
`switchItem`、`operatorSwitcher_button`(2.3125rem)、`Pagination_button`(2.3125rem,
外盘 2.625rem)、`backButton`(NoticeDetail)等为 `50%`;Lore 导航器 / 移动端
抽屉手柄为 2.25–3.375rem 胶囊(竖屏再放大);`Header_dropDown` 语言菜单 1rem。

---

## 3. 倒角体系汇总(2,002 条规则全量)

### 3.1 值频次

| 值 | 次数 | 角色 |
| --- | ---: | --- |
| `50%` | 26 | 圆形按钮/头像/箭头/指示点 |
| **`.25rem`(4px)** | **21** | **微倒角主力**:触发器、面板、CTA、下载钮、弹窗、Toast、导航牌 |
| **`4px`** | **8** | 同上(黑牌 CTA 家族、页签直接写 px) |
| `.5rem`(8px) | 6 | 公告列表项/空态卡(内容卡,非按钮) |
| `2px` | 4 | `.Button_button` 常态 + Information 标签/按钮容器 |
| **`6px`** | **3** | **仅** `.Button_button` 三条 hover 规则(本体/:before/亮变体) |
| `.1875rem`(3px) | 4 | 小件:图标容器、OperatorItem、滚动条 |
| `.3125rem`(5px) | 3 | listButton、BackButton、弹窗表头 |
| `.4375rem`(7px) | 3 | PC 下载按钮/下载器行 |
| `1.875rem`–`3.375rem` 等大胶囊 | 各 1–4 | 移动端圆形导航/分页/抽屉(含竖屏放大变体) |
| `100vw` / `.25rem 0 0 0` / `.125rem` / `.188rem` / `.094rem` | 各 1 | 特例(语言菜单项、单角落地钮等) |

### 3.2 「微倒角是不是按钮的普遍事实」——是

- **全部可点的矩形控件都声明了 2–7px 倒角;没有任何交互元素写 `border-radius:0`。**
  纯直角只属于不声明 radius 的装饰块(信号色带、角标图、分隔线、斜纹容器内部)。
- 档位随控件尺寸缩放:小件(图标槽/滚动条)3px → 标准按钮/触发器/CTA 4px →
  列表行/返回钮 5px → PC 下载大按钮 7px → 内容卡 8px → 圆/胶囊另族。
- **状态变化几乎从不动角**:2,002 条规则里 `:hover` 且改 `border-radius` 的只有
  `.Button_button` 一族 3 条;其余按钮的状态一律换底色/边色(与先验
  motion-research §4.3「hover 主力是换底色」一致)。

### 3.3 与先验记录的对账

| 先验说法 | 今日线上事实 |
| --- | --- |
| motion-research §4.2 / interaction.css 1 号注:「hover 里动圆角 2px→6px」 | ✅ **逐字仍在**(§2.1 原文),并补充:竖屏基态 `.25rem`、`:before` 纹理层与 `.Button_light` 变体同步 6px、`transition` 里 `border-radius .2s ease` 仍在(本体与 :before) |
| chrome.css:`Dropdown_trigger` radius `.25rem` | ✅ 仍在(`3a129342b9ac5e73.css`,该 bundle 哈希自 10-01 未变),hover 只换边色 |
| motion-research 附录 C4:`listButton` `.3125rem`(5px)、「官网列表行不是完全直角」 | ✅ 今日 `7f4007f6fbea68d1.css` 同值 |
| motion-research 附录 E:`SubpageTab_tab` 4px、hover `#f3f3f3` | ✅ 今日同值同结构 |

> 10-01→10-24 的重新部署**没有改任何倒角语义**,只是换了 bundle 哈希;
> 唯一观测差异是布局类微调(如页签 padding 竖屏变体),与本报告无关。

---

## 4. 暗面板 / 黑牌(#191919 家族)的倒角

| 元素 | 底色 | 倒角 | 状态 |
| --- | --- | --- | --- |
| `Header_buttonPreserveBg`(页头竖排黑牌 CTA,4.5×9.75rem) | `#191919` | **4px**(常量;`:before` 45° 斜纹层同 4px;`overflow:hidden` 裁切内层) | hover = 预建 `#fffa00` 黄层 `opacity .2s` 淡入 + 文字/分隔线翻 `#191919`,**角不变** |
| `Header_buttonShareBg`(#e5e5e5 亮灰牌) | `#e5e5e5` | 4px | 同家族,角不变 |
| H5 菜单底部按钮 `.Header_button` | `#191919` | `.25rem`(4px) | 换色族 |
| H5 `preserveButton:before` | `#191919` | 4px | — |
| `OperatorItem_operatorItem` | — | `.1875rem`(3px) | — |

即:**黑牌那批的倒角统一是 4px,且全部恒定**。

---

## 5. 与本主题「全直角」的关系(记录,不改码)

- 本主题默认 zero-radius 是**有意的分歧**(interaction.css 1 号注:曾照做
  「直角模式悬停 6px」,因「圆角全局恒定」准则与呈现不一致而撤除);
  endfield-ui-research.md §五「全直角」是对**官网整体气质**的概括,
  但就**按钮控件**而言,官网事实是**微倒角**。
- 若所有者要贴官网,今日证据给出的档位是:标准按钮 **4px**(主力)/小件 3px/
  列表行 5px;唯一有动效语义的是 `.Button_button` 的 2→6px(常态 2px 只属于
  这一个按钮,不是体系默认)。motion-research §C4 曾按体量比给过 DSH 密度下
  ≈2–3px 的折算参考,与本报告不冲突(官网 root 字号 16px、按钮字 1.75rem,
  体量比主题大 ≈2 倍)。

---

## 6. 局限

1. 只取了 `/`、`/news`、`/operator` 三个路由静态链接的 10 个 bundle;更深的
   子路由(单条公告详情 `/news/xxxx` 等)未枚举——但三路由已覆盖全部通用组件
   (Button/Header/Dropdown/SubpageTab/下载器/列表/页签)。
2. rem 均按官网 root 16px 换算为 px 备注(`.25rem`=4px 等),原文保留 rem。
3. 未做浏览器实机截图比对;结论基于 CSS 声明(与先验调研同一口径——官网无
   JS 内联样式的先验结论仍适用,未复核)。
