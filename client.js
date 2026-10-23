(function() {

// src/styles/tokens.css?raw
	var tokens_default = "/* tokens.css — layer 1 of the hand-written stylesheet (see the layer map in\n   scripts/lib/sources.js; the sheet used to be one theme.css before the split).\n   Loaded by src/client/index.js via the raw-css plugin and concatenated — in\n   manifest order, raw bytes — with the other layers inside the built client.js\n   artifact. Editing any layer requires `npm run build` (or `npm run watch`) to\n   refresh the artifact; `npm run check` fails on a stale artifact. */\n\n      /* ================= typography: SCOPED to the theme's own elements =====\n         The theme used to redeclare the app's two font TOKENS at :root:\n             --dsw-font-family: Arial, ...      -> dropped, see below\n             --ds-font-family-code: <mono list> -> dropped (see the note under it)\n         and that is what broke third-party widgets.\n\n         WHY IT BROKE THEM. The app declares --dsw-font-family at :root and then\n         renders the UI root font from it — dsh-web-frontend ships exactly\n         'body{font-family:var(--dsw-font-family, <system stack>)}'. A :root\n         declaration WINS over the app's own :root one, so the entire UI root\n         font became Arial; a widget injected into the app root (DeepSeek-\n         Balance-Whale-Widget and friends) carries 'font-family:inherit' and\n         therefore inherited Arial, losing its own face for its balance digits.\n         The root font token is a SHARED PUBLIC INTERFACE of the app, not a\n         theme-private knob: overriding it silently restyles every third-party\n         component on the page, so this theme no longer touches either token.\n\n         WHAT KEEPS THE LOOK. The theme's industrial editorial face lives in\n         --edge-font, declared on body and applied ONLY to elements this theme\n         owns: the boot plate, the watermark wordmark, and the settings panel.\n         --dsw-font-family is still READ on those elements, as the trailing\n         fallback of that stack, so nothing outside the theme is ever affected\n         while the app's own font configuration stays part of the protocol. The\n         ORDER of that stack matters and is documented where it is declared —\n         flipping it re-types the boot plate.\n\n         The code token went for the same reason. It is nearly identical to the\n         app's own list (only the final fallbacks differ: Liberation Mono, Menlo,\n         Courier, PingFang SC, Microsoft YaHei here vs Helvetica, Arial,\n         sans-serif in the app), so dropping the override is visually inert on\n         every code surface the theme does not own.\n\n         NO GLOBAL TEXT PROPERTIES EITHER. There is deliberately no 'body { ... }'\n         rule setting font-family / font-feature-settings / font-variant-*: all\n         three inherit, so all three leak into injected third-party nodes exactly\n         the way the token did. openType features belong on the specific elements\n         that measure with them instead (see the loader's own tabular figures). */\n      /* ================= accent palette =================================\n         Every accent value in this stylesheet reads from the variables below\n         instead of a literal, so the whole theme repaints from ONE declaration\n         block. ONE palette ships:\n\n           谷地黄   signal yellow  #fff500 — the Endfield site accent\n\n         (An earlier build also offered 终末地灰 / 武陵青 as switchable body\n         classes; both went away with their setting row in 2026-10. The role\n         variables below survive because rules throughout the sheet speak them —\n         they all resolve to the one yellow now.)\n\n         WHY THIS BLOCK IS ON body AND NOT :root. The app applies its theme\n         tokens as INLINE STYLES ON <body> (dsh-client-ui-layout does\n         body.style.setProperty(name, value) for every token in the snapshot).\n         A custom property declared at :root that substitutes one of those\n         tokens is resolved AT THE html ELEMENT, where the token does not\n         exist, so it becomes guaranteed-invalid and computes to nothing.\n         That was not theory: the shipped --edge-line / --edge-paper /\n         --edge-soft were declared at :root and measured EMPTY in a real\n         browser, which silently disabled the themed scrollbar\n         (scrollbar-color computed to 'auto') and left the table/hairline\n         rules falling back. Moving them onto body is what makes them resolve\n         (see test/probe-edge-line.js).\n\n         The same fact is what keeps the accent indirection free: the theme's\n         token overrides are values like var(--edge-accent), resolved on the\n         same element where the palette block declares it, so every token and\n         every rule below paints through the variables with NO JavaScript\n         repaint involved — verified in a real browser (test/probe-css.js),\n         not assumed.\n\n         --edge-accent-rgb is the same colour as a bare comma list, because\n         rgba() needs channels rather than a hex; substituting a comma-list\n         custom property inside rgba() is legal and was verified in the same\n         probe. Keeping both in one place is why the ~30 translucent washes\n         did not have to become 60 declarations.\n\n         Values are MEASURED, not chosen — see test/palette-contrast.test.js,\n         which fails the build if any of them stops clearing its bar:\n           ink #101110 on 谷地黄 16.50:1   (AA, solid chips)\n           accent as dark-mode icon ink  15.26:1  (>=3 icon floor) */\n      body {\n        --edge-accent: #fff500;\n        --edge-accent-rgb: 255, 245, 0;\n        /* Text paired with the accent as a SOLID FILL. The accent carries\n           ink-coloured text, and the pairing travels as its own token so a\n           future fill that needs a different ink can flip it in one\n           declaration instead of chasing every rule. */\n        --edge-accent-ink: #101110;\n        /* Hover/pressed step of the accent, still carrying ink-coloured text:\n           谷地黄 13.60:1. */\n        --edge-accent-deep: #e8e000;\n        /* The one place the accent must survive on CREAM as a fill (the light\n           deepseek-450 slot): pure signal yellow is nearly paper-white there,\n           so light mode uses a darkened step of the same hue. */\n        --edge-accent-onpaper: #d9c700;\n        /* Turn-status gradient text stops — see the long note on that rule.\n           Gradient text paints glyphs with EVERY stop, and reduced-motion pins\n           the mid band permanently inside the letters, so all four clear AA\n           against both surfaces of their mode:\n             light #6b5d00 5.35 / mid #3f3600 9.82\n             dark  #fff500 15.26 / mid #a08a00 5.11 */\n        --edge-status-light: #6b5d00;\n        --edge-status-light-mid: #3f3600;\n        --edge-status-dark: #fff500;\n        --edge-status-dark-mid: #a08a00;\n        /* Hero backdrop glow alpha, per scheme. These are the measured values\n           from the note on that rule: the replacement must not change how deep\n           the hero reads compared with the app's own #6187D8 at 8%. */\n        --edge-glow-light: 0.08;\n        --edge-glow-dark: 0.05;\n      }\n      /* Token-derived aliases. These MUST be on body, not :root — see above. */\n      body {\n        --edge-signal: var(--edge-accent);\n        --edge-signal-dim: rgba(var(--edge-accent-rgb), 0.7);\n        --edge-paper: var(--dsw-alias-bg-base);\n        --edge-panel: var(--dsw-alias-bg-layer-1);\n        --edge-line: var(--dsw-alias-border-l1);\n        --edge-soft: var(--dsw-alias-bg-layer-2);\n        /* The theme's own face. THREE things are deliberate here.\n\n           (1) THE THEME STACK LEADS, with --dsw-font-family as a trailing\n               fallback — and this ORDER was measured, not guessed. On this host\n               the app's token renders in Segoe UI while the theme's stack renders\n               Arial (same string, 81.688px vs 84.516px — measured by\n               test/font-scope.test.js), so reading the token FIRST would silently\n               repaint the boot plate, the watermark and the settings panel in a\n               different face and invalidate every Arial-based proportion the\n               loader was measured with (see the pixel-scan notes on the brand\n               block). Leading with the theme stack keeps those surfaces exactly\n               as they render today, which is what this fix has to promise: the\n               request is to stop RESTYLING THE WHOLE APP, not to re-type the\n               theme.\n           (2) THE TOKEN IS STILL HONOURED, which is the protocol half of the\n               requirement: it is read, not ignored, and it is what applies on a\n               host with no Arial/Narrow/PingFang/YaHei at all — so a system\n               carrying neither the theme stack nor a configured root font still\n               lands on the app's stack instead of an arbitrary generic. A user\n               who deliberately configures a root font family therefore still\n               reaches the theme's own elements. If a future author wants the\n               world's configuration to win OUTRIGHT over the theme face, swapping\n               the two halves of this declaration is the whole change — say so in\n               the commit, because it re-types the boot plate.\n           (3) IT IS DECLARED ON body, NOT :root, for the same reason the aliases\n               above are — see the app-token note higher up. The var() fallback is\n               not decoration either: a custom property that substitutes a token\n               missing at the element it is READ from computes to nothing, the\n               trap that already shipped once with --edge-line\n               (test/probe-edge-line.js). Resolving where the value is used cannot\n               hit it. */\n        --edge-font: Arial, \"Helvetica Neue\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif, var(--dsw-font-family);\n      }\n      /* ---------- where the theme's face is applied, and where it is NOT ----------\n         Only elements this theme created or owns. Every one of the three is a\n         node the theme injected itself, so a third-party widget can never be an\n         ancestor or a descendant of one of them — unless it attaches INSIDE the\n         boot plate or the watermark, which it does not: those layers are\n         pointer-events:none, aria-hidden chrome.\n           [data-endfield-loader]  the boot plate      (also carries the feature\n                                                       settings the layout measures:\n                                                       tabular figures + the\n                                                       altered single-storey\n                                                       glyph)\n           [data-endfield-watermark] the ENDFIELD wordmark\n           .endfield-settings      the 「终末地主题设置」 panel root\n         Deliberately NOT on body: the app renders its UI root font from\n         var(--dsw-font-family) on body, and a body font-family here would\n         re-break every installed widget exactly as the old :root override did. */\n      [data-endfield-loader],\n      [data-endfield-watermark],\n      .endfield-settings {\n        font-family: var(--edge-font);\n        font-feature-settings: \"tnum\" 1, \"ss01\" 1;\n        font-variant-ligatures: no-common-ligatures;\n      }\n      /* The persist-mode watermark is a z-index:-1 child of the conversation column.\n         Two properties are needed on that column, and only while the mark is mounted\n         there (the :has() guard makes this a no-op whenever the feature is off):\n           isolation: isolate — without a stacking context, z-index:-1 escapes to the\n             nearest ancestor context and paints behind the column's own opaque\n             background, i.e. invisible.\n           position: relative — the column ships as position:static, so an absolutely\n             positioned child would resolve against the app frame instead and spill\n             across the sidebar. This makes the column the containing block so\n             inset:0 means \"exactly this column\".\n         Every absolute descendant the app itself renders (header:after, tab:after,\n         heroGlow, the overlay composer seat) already has a positioned ancestor\n         nearer than this column, so their containing blocks are unchanged. */\n      /* Suffix-only match: the :has(>) guard pins this to exactly the element the\n         JS mounted the watermark into (only the conversation column or the app\n         frame ever hosts it), so the broad '_root' suffix cannot over-match. */\n      [class$='_root']:has(> [data-endfield-watermark]) {\n        isolation: isolate;\n        position: relative;\n      }\n      /* The persist FALLBACK mounts inside the app FRAME on pages with no\n         conversation column (a full-page settings view). Same reason as the rule\n         above: without isolation, the mark's z-index:-1 escapes to the root\n         stacking context and paints below the frame's own opaque background —\n         i.e. it never shows, which is exactly what the old body-level fallback\n         did. The frame is already position:relative, so\n         isolation alone is enough here. The :has() guard keeps the frame's\n         stacking behaviour stock whenever the mark is not mounted in it. */\n      [class*='_frame']:has(> [data-endfield-watermark]) {\n        isolation: isolate;\n      }\n      /* The mark sits behind text, so it must never intercept selection or clicks. */\n      [data-endfield-watermark] {\n        pointer-events: none !important;\n      }\n      /* ---------- watermark strength, per colour scheme ----------\n         One variable per scheme instead of one number in JS, because the two\n         schemes genuinely need different alphas and a scheme flip must re-resolve\n         with no JS involved.\n\n         Computed, not eyeballed — contrast of the composited ink against its own\n         background (the mark is always BEHIND text, so this measures how loudly\n         the decoration competes for attention, never foreground readability):\n\n              alpha | dark #101110  | light #e8e8e2\n              0.07  | 1.171 : 1     | 1.152 : 1\n              0.085 | 1.215 : 1     | 1.186 : 1\n              0.10  | 1.278 : 1     | 1.225 : 1\n              0.13  | 1.406 : 1     | 1.310 : 1   <- previous dark value\n              0.16  | 1.541 : 1     | 1.398 : 1   <- previous persist value\n\n         Dark mode is the reported problem: adding luminance to a near-black page\n         makes the wordmark read far louder than the same alpha subtracted from\n         cream, and at 0.13/0.16 it visibly cluttered the UI. Dark therefore drops\n         to 0.085 (1.215:1) — still clearly present, no longer competing. Light\n         keeps more strength (0.13) because cream needs it to register at all;\n         1.310:1 there looks quieter than 1.215:1 on black.\n         Floor is ~1.06:1, below which the mark reads as absent. */\n      body {\n        --edge-wm-alpha: 0.13;\n        /* The emblem mask is NORMALISED to full strength by the build (the official\n           PNG's own alpha peaks at ~40%, which under this opacity read as nothing),\n           so the emblem needs only a small lift over the letters to sit in the same\n           presence band. */\n        --edge-wm-emblem-alpha: 0.16;\n      }\n      body[data-ds-dark-theme] {\n        --edge-wm-alpha: 0.085;\n        --edge-wm-emblem-alpha: 0.105;\n      }\n";

// src/styles/decor.css?raw
	var decor_default = "      /* ================= 背景纹理：官网 /operator 那一套底纹 =================\n\n         全部素材与参数来自官网自己的 CSS（5f3bf8547312569e.css，/operator 路由），\n         逐条对应见 docs/notes/endfield-motion-research.md 附录 D：\n\n           block-bg.svg     → 工程网格 217×217 矢量，官方 12.8125rem 一格、opacity:.05\n           wave-bg.png      → 右上角阶梯波纹，官方 39.1875×26.3125rem / contain / 100% 0\n           tape-wave-bg.png → 中下部波纹带，官方 59.125rem×13.5rem / cover\n           45° 斜纹          → 官方 shallowBg：13.9512529279% / 36.0487470721% 停靠、\n                              .75rem 周期（后写的 background-size 覆盖前面的 .5rem）\n           三色信号线        → 官方 decoLine 原文（见下方 .endfield-settings-group-title）\n\n         三个素材是官方站点自己的发布产物，由仓库所有者指示「沿用官方」，以**原始\n         字节**内嵌为 data URI（scripts/build-texture.js；URL 与 sha256 见其头注与\n         docs/credits.md（素材归属））。PNG 不做任何再压缩或量化。\n\n         **纹理不铺满窗口**——官网每一层都锚定在内容区的一个部位，而不是整窗平铺：\n           · 网格（decoFlag）用 clip-path 水平裁到中央内容列，mask 从上往下、\n             50% 之后淡出 → 只在内容区上半段；\n           · 斜纹（shallowBg）是**底部 32.8125rem 高的一条带**，mask 从下往上淡出；\n           · 波纹钉死右上角；波纹带在中下部（top: 50% + 3.8125rem）。\n         本主题照此映射到**主内容列 _centerCol**（它就是 DSH 的「内容列」）：\n         侧栏与外框**不上纹理**，四个层各自锚定在列内的一个区域。\n\n         官网这些底纹是**静态的**（无 animation/transition），本段一条过渡都不加。 */\n\n      /* 纹理令牌。alpha 与官网同为 0.05 量级；test/texture.test.js 实算「纹理压在\n         实际底面上」的合成对比度，断言落在装饰区间（与水印、hero 光晕同一规则）。 */\n      body {\n        --edge-tex-ink: #181818;\n        /* The official block-bg.svg is a TRANSPARENT tile whose only content is a 2px\n           black stroke. That makes it usable in exactly one way: as an ALPHA MASK\n           (same trick the watermark uses with --edge-emblem). Used as a background\n           image it paints nothing visible; used opaque it blackens the surface.\n           So the ALPHA travels in the mask (--edge-tex-grid-mask) and the COLOUR\n           travels separately in --edge-tex-grid-color / --edge-tex-hatch-color —\n           the two MUST NOT be the same custom property: putting the url() inside a\n           linear-gradient() is invalid CSS and silently resolves the whole\n           background to none (measured: an entire layer stack vanished). */\n        --edge-tex-grid-a: 5%;\n        --edge-tex-hatch-a: 5%;\n        /* Declared after the alphas above so var() substitution picks up this block's\n           values rather than the previous rule's. */\n        --edge-tex-grid-color: color-mix(in srgb, var(--edge-tex-ink) var(--edge-tex-grid-a), transparent);\n        --edge-tex-hatch-color: color-mix(in srgb, var(--edge-tex-ink) var(--edge-tex-hatch-a), transparent);\n      }\n      body[data-ds-dark-theme] {\n        --edge-tex-ink: #e9e9e3;\n        --edge-tex-grid-a: 7%;\n        --edge-tex-hatch-a: 6%;\n      }\n\n\n      /* 锚点：**内容列里的那个不透明根**（_centerCol 的直接子元素 _root，即会话\n         根，应用自己声明 position:relative）。第一版挂 _centerCol 本身——但它里面\n         还有一层不透明的 wSkVaW_root（background:var(--dsw-alias-bg-base); height:100%），\n         z-index:-1 的叠加层画在那层不透明底**之下**，整段纹理无声消失（像素实测零\n         变化）。挂到根上，叠加层才在「根底色之上、正文之下」。isolation 建层叠\n         上下文，保证 -1 伪元素不落到根自己背景的后面。侧栏与外框不挂纹理。\n\n         **选择器不要求直接子级**：会话 UI 经插槽挂载，centerCol 与 root 之间\n         可能有包装层（应用的 ui-slots 会包无类名 div），用 '>' 会整段静默失配\n         ——用户实测「看不到底纹」的根因之一。改用**后代 + [data-phase]**：\n         data-phase 只出现在 ConversationRoot 上（水印查找器 findConversationRoot\n         用的正是这个钩子），比标签后缀更精确。\n\n         **水印共存例外（:not(:has(> [data-endfield-watermark]))）**：水印挂 body\n         时（hero 页），隔离根会让整个根子树（含 z:20 的下拉框）变成一个\n         z:auto 单元，被 body 级水印按 DOM 顺序压过——水印自己修过的那类 bug\n         （见 test/watermark-stacking.test.js 头注）。所以**只在 body 直接挂着\n         水印时**不隔离；此时网格/斜纹两个叠加层随之不可见（落在根底色后面），\n         波纹/光晕是背景图层、不受影响。水印关闭或在会话内（挂根上）时，\n         hero 页也有完整底纹。这是水印 :has 条件隔离同一门派的用法。 */\n      body[data-endfield-texture='subtle']:not(:has(> [data-endfield-watermark])) [class$='_centerCol'] [class$='_root'][data-phase],\n      body[data-endfield-texture='standard']:not(:has(> [data-endfield-watermark])) [class$='_centerCol'] [class$='_root'][data-phase] {\n        position: relative;\n        isolation: isolate;\n      }\n\n      /* 网格：官方 decoFlag 的复刻。**颜色渐变自己带着那条 180° 淡出**（上半实、\n         往下渐透明），SVG 遮罩只负责形状——两层职责分开，就不用碰多遮罩的合成\n         语义（mask 列表默认 add=并集，并出来的结果是整面色块，实测过）。 */\n      body[data-endfield-texture='subtle']:not(:has(> [data-endfield-watermark])) [class$='_centerCol'] [class$='_root'][data-phase]::before,\n      body[data-endfield-texture='standard']:not(:has(> [data-endfield-watermark])) [class$='_centerCol'] [class$='_root'][data-phase]::before {\n        content: '';\n        position: absolute;\n        inset: 0;\n        z-index: -1;\n        pointer-events: none;\n        background-image: linear-gradient(180deg,\n          var(--edge-tex-grid-color) 0, var(--edge-tex-grid-color) 50%,\n          transparent 100%);\n        -webkit-mask-image: var(--edge-tex-grid-mask);\n        mask-image: var(--edge-tex-grid-mask);\n        -webkit-mask-size: 12.8125rem 12.8125rem;\n        mask-size: 12.8125rem 12.8125rem;\n        -webkit-mask-repeat: repeat;\n        mask-repeat: repeat;\n      }\n\n      /* 斜纹：官方 shallowBg 的复刻——**底部一条带**（32.8125rem 高，窄视口收到\n         45%），单一遮罩做 0° 淡出（底边最实、往上渐透明），纹路周期与停靠值照官方。 */\n      body[data-endfield-texture='subtle']:not(:has(> [data-endfield-watermark])) [class$='_centerCol'] [class$='_root'][data-phase]::after,\n      body[data-endfield-texture='standard']:not(:has(> [data-endfield-watermark])) [class$='_centerCol'] [class$='_root'][data-phase]::after {\n        content: '';\n        position: absolute;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        top: calc(100% - min(32.8125rem, 45%));\n        z-index: -1;\n        pointer-events: none;\n        background-image: repeating-linear-gradient(-45deg,\n          transparent 0 13.9512529279%,\n          var(--edge-tex-hatch-color) 13.9512529279% 36.0487470721%,\n          transparent 36.0487470721% 50%,\n          transparent 50% 63.9512529279%,\n          var(--edge-tex-hatch-color) 63.9512529279% 86.0487470721%,\n          transparent 86.0487470721%);\n        background-size: .75rem .75rem;\n        -webkit-mask-image: linear-gradient(0deg, rgb(0,0,0) 0, rgb(0,0,0) 50%, rgba(0,0,0,0));\n        mask-image: linear-gradient(0deg, rgb(0,0,0) 0, rgb(0,0,0) 50%, rgba(0,0,0,0));\n      }\n\n      /* subtle 档到此为止：网格 + 斜纹两个叠加层，列本身不加任何背景图层。 */\n\n      /* standard 档：再叠官方两级波纹与顶部光晕——作为列的背景图层，天然画在\n         全部内容之下。波纹钉右上角；波纹带照官方放在中下部，no-repeat、超宽部分\n         由列右缘裁掉（官方那条左缘渐隐的 mask 在这里由裁边代替）。 */\n      body[data-endfield-texture='standard'] [class$='_centerCol'] [class$='_root'][data-phase] {\n        background-image:\n          var(--edge-tex-wave),\n          /* 波纹带的顶边渐隐：官方给 decoTape 挂的是左缘 90 度 mask（宽列里从右侧\n             延伸进来）；DSH 的窄列里图几乎塞满整列，左缘 mask 失效，顶边变成一条\n             横贯全列的硬切线（实测行间跳变 11 个灰阶）。遮罩没法只作用于背景图的\n             某一层，所以这里用一条「与波纹带同盒、顶部不透明底色、往下 3.5rem\n             渐透明」的覆盖层把顶边揉掉——官方 mask 的意图，转了 90 度。 */\n          linear-gradient(180deg, var(--dsw-alias-bg-base, #101110) 0, transparent 3.5rem),\n          var(--edge-tex-tape),\n          radial-gradient(120% 55% at 50% 0%,\n            rgba(var(--edge-accent-rgb, 126, 126, 126), var(--edge-glow-light, 0.08)), transparent 70%);\n        background-size:\n          39.1875rem 26.3125rem,\n          59.125rem 13.5rem,\n          59.125rem 13.5rem,\n          100% 100%;\n        background-position:\n          100% 0,\n          30% 62%,\n          30% 62%,\n          50% 0;\n        background-repeat: no-repeat, no-repeat, no-repeat, no-repeat;\n      }\n      body[data-ds-dark-theme][data-endfield-texture='standard'] [class$='_centerCol'] [class$='_root'][data-phase] {\n        background-image:\n          var(--edge-tex-wave),\n          linear-gradient(180deg, var(--dsw-alias-bg-base, #101110) 0, transparent 3.5rem),\n          var(--edge-tex-tape),\n          radial-gradient(120% 55% at 50% 0%,\n            rgba(var(--edge-accent-rgb, 126, 126, 126), var(--edge-glow-dark, 0.04)), transparent 70%);\n      }\n\n      /* 三色信号线：官方 decoLine。原文是绝对停靠（90deg,#ff00f0 11.25rem,\n         #fffa00 0,#fffa00 22.5625rem,#00ffa2 0），挂在 67.5rem 宽的容器上——\n         也就是 紫 11.25 : 黄 11.3125 : 绿 44.9375rem，**绿占三分之二**。绝对\n         停靠只在那一个宽度下成立：本主题的两条线宽度都随容器伸缩，照抄 rem\n         会让三条色带在窄容器上几乎均分（用户实测反馈与官方不符）。所以这里\n         换算成官方自己的比例停靠：11.25/67.5 = 16.6667%，22.5625/67.5 =\n         33.4259%，绿吃剩余 ——任何宽度下都是官方的紫:黄:绿观感。\n\n         分组标题本身是 'display:flex'（标记块 + 中英文两行），所以这条线不能靠\n         ::after 当 flex 子项（会被当成第三段文字挤在一行），必须绝对定位到标题底部\n         整宽。类名是 '.endfield-settings-group-title'，不是 '.endfield-group-title'\n         ——写错类名会静默不生效，只有截图能看出来。 */\n      .endfield-settings .endfield-settings-group-title:has(> span) {\n        position: relative;\n      }\n      .endfield-settings .endfield-settings-group-title:has(> span)::after {\n        content: '';\n        position: absolute;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        height: 2px;\n        background-image: linear-gradient(90deg,#ff00f0 16.6667%,#fffa00 0,#fffa00 33.4259%,#00ffa2 0);\n      }\n\n      /* 「已编辑 N 个文件」卡片（deliverables 的 ChangedFiles）：底部装饰线。\n         官方 decoLine 的分划用法放在这个卡片的底边（用户指定）。选择器无哈希：\n         「直接子元素是 _header 的 _card」——该组件的卡片形态（header 是 60px\n         的展开按钮）；卡片自带 overflow:hidden，线条被裁进边角（直角模式下\n         无圆角可裁）。伪元素无占用（bundle 全量查过）。静态、无动画。 */\n      [class$='_card']:has(> [class$='_header']) {\n        position: relative;\n      }\n      [class$='_card']:has(> [class$='_header'])::after {\n        content: '';\n        position: absolute;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        height: 2px;\n        pointer-events: none;\n        background-image: linear-gradient(90deg,#ff00f0 16.6667%,#fffa00 0,#fffa00 33.4259%,#00ffa2 0);\n      }\n\n      /* 降级：要求减少透明/更高对比时整段让位（装饰不与无障碍偏好争）。\n         注意伪元素：列上的 background-image:none 只清背景图层，两个叠加层\n         （::before 网格 / ::after 斜纹）必须各自 display:none。 */\n      @media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {\n        body[data-endfield-texture] [class$='_centerCol'] [class$='_root'][data-phase] {\n          background-image: none !important;\n        }\n        body[data-endfield-texture] [class$='_centerCol'] [class$='_root'][data-phase]::before,\n        body[data-endfield-texture] [class$='_centerCol'] [class$='_root'][data-phase]::after {\n          display: none !important;\n        }\n        .endfield-settings .endfield-settings-group-title:has(> span)::after,\n        [class$='_card']:has(> [class$='_header'])::after {\n          background-image: none !important;\n        }\n        [class$='_centerCol'] [class$='_tabs'] :is([class$='_tab'],[class$='_tabActive'])::before {\n          display: none !important;\n        }\n      }\n\n      /* The watermark is the Endfield Industries LOGO ALONE as a VECTOR mask\n         (Yue-plus/endfield_icons' vectorization of the official Hypergryph\n         mark; see scripts/build-emblem.js for provenance and the minimize\n         pass). No DOM text, no CSS glyphs — translators have nothing to\n         rewrite, and being vector it is crisp at every zoom and pixel ratio\n         (the previous pipeline was a raster mask capped at its 755px source).\n         DEFAULT mask mode (alpha) is deliberate: the paths' own alpha channel\n         IS the shape, so the default black fill paints the mark with\n         currentColor and both colour schemes stay automatic. The viewBox is\n         square (512x512), hence the 1/1 aspect. */\n      [data-endfield-watermark]::after {\n        content: '';\n        display: block;\n        width: 13vw;\n        max-width: 240px;\n        aspect-ratio: 1 / 1;\n        background: currentColor;\n        opacity: var(--edge-wm-emblem-alpha, var(--edge-wm-alpha));\n        -webkit-mask-image: var(--edge-emblem);\n        mask-image: var(--edge-emblem);\n        -webkit-mask-size: contain;\n        mask-size: contain;\n        -webkit-mask-repeat: no-repeat;\n        mask-repeat: no-repeat;\n        -webkit-mask-position: center;\n        mask-position: center;\n      }\n      /* Without mask support the logo cannot paint at all; the watermark\n         degrades to nothing rather than to a wrong-looking mark. */\n      @supports not ((mask-image: none) or (-webkit-mask-image: none)) {\n        [data-endfield-watermark]::after { content: none; }\n      }\n      /* ---------- new-session hero brand mark ------------------------------\n         The summer-series 「终末地标识 3」 sticker, painted over the hero headline\n         ('探索未至之境'). Two ALPHA MASKS carry the shapes and the stylesheet owns\n         every colour — see scripts/build-logo.js for provenance and the trace\n         recipe, and the two body blocks below for the measured values.\n\n         Why masks rather than the three-colour vector itself: it is 30x smaller\n         (5.7KB of minimized SVG against 197KB), its hatch becomes ONE gradient\n         instead of fifty traced bars, and its colours live in the stylesheet, where\n         a scheme can restate them without re-tracing anything.\n\n         The colours are the artwork's own on BOTH schemes — the owner's call, and a\n         deliberate trade: #ffe01d / #f4d73e / #d2d3d4 measure 14.36 / 13.19 /\n         12.62:1 against the dark page, but only 1.25 / 1.12 / 1.22:1 against the\n         light scheme's cream paper, so on light the mark reads as a pale print\n         instead of a headline. WCAG exempts logotypes from its contrast minimums,\n         and test/hero-logo.test.js therefore asserts that what is PAINTED is the\n         artwork's own triple (decoded from assets/hero-logo-3-summer.png) rather\n         than asserting AA on the light scheme.\n\n         The hatching is a gradient, not fifty traced bars, and its geometry is\n         MEASURED off the artwork rather than eyeballed: the stripe boundaries are\n         one rigid line family x + 1.73y = const, period 28.20px along x, 39.7% of\n         it hatched. At 150deg the gradient line is |W·sin150| + |H·cos150| =\n         0.8878W for this 1024:458 box, so one period is 14.12px =\n         14.12/(0.8878·1024) = 1.5526% of the gradient line and the hatched band is\n         39.7% of that = 0.6166% (the body colour fills 0..0.936%). Percentages,\n         not px, keep the hatch exact at every size. */\n      body {\n        /* The artwork's own colours, on both schemes (see the note above). Kept as\n           three variables rather than baked into the masks so a future fork can\n           restate them in one place, and so the test can compare what is painted\n           against the source file. No scheme override: brand art is not a\n           theme-relative ink. */\n        --edge-hero-logo-body: #ffe01d;\n        --edge-hero-logo-hatch: #f4d73e;\n        --edge-hero-logo-ink: #d2d3d4;\n      }\n      [data-endfield-hero-logo] {\n        display: block;\n        position: relative;\n        width: min(60%, 440px);\n        margin: 0 auto 2px;\n        aspect-ratio: 1024 / 458;\n        /* Decoration only: it must never eat a click meant for the composer. */\n        pointer-events: none;\n      }\n      /* Both layers share one box and one mask contract; only the paint differs —\n         a hatched gradient for the arrow, flat ink for the wordmark. */\n      [data-endfield-hero-logo]::before,\n      [data-endfield-hero-logo]::after {\n        content: '';\n        position: absolute;\n        inset: 0;\n        -webkit-mask-repeat: no-repeat;\n        mask-repeat: no-repeat;\n        -webkit-mask-position: center;\n        mask-position: center;\n        -webkit-mask-size: contain;\n        mask-size: contain;\n      }\n      [data-endfield-hero-logo]::before {\n        background-image: repeating-linear-gradient(150deg,\n          var(--edge-hero-logo-body) 0 0.936%,\n          var(--edge-hero-logo-hatch) 0.936% 1.5526%);\n        -webkit-mask-image: var(--edge-hero-logo-body-mask);\n        mask-image: var(--edge-hero-logo-body-mask);\n      }\n      [data-endfield-hero-logo]::after {\n        background-color: var(--edge-hero-logo-ink);\n        -webkit-mask-image: var(--edge-hero-logo-ink-mask);\n        mask-image: var(--edge-hero-logo-ink-mask);\n      }\n      /* Without mask support both layers would paint as solid rectangles; the mark\n         degrades to nothing instead (the same call the watermark makes). */\n      @supports not ((mask-image: none) or (-webkit-mask-image: none)) {\n        [data-endfield-hero-logo] { display: none; }\n      }\n      /* Optional bounded frost. No full-window blur, nested filters or animation. */\n      body[data-endfield-glass] {\n        --edge-glass-fill: 248 247 240;\n        --edge-glass-alpha: .8;\n        --edge-glass-blur: 14px;\n        --edge-glass-edge: rgb(255 255 255 / .65);\n        --edge-glass-sheen: rgb(255 255 255 / .35);\n      }\n      body[data-endfield-glass][data-ds-dark-theme] {\n        --edge-glass-fill: 31 36 34;\n        --edge-glass-alpha: .76;\n        --edge-glass-edge: rgb(255 255 255 / .18);\n        --edge-glass-sheen: rgb(255 255 255 / .07);\n      }\n      body[data-endfield-glass='subtle'] { --edge-glass-alpha: .68; --edge-glass-blur: 8px; }\n      body[data-endfield-glass='strong'] { --edge-glass-alpha: .9; --edge-glass-blur: 22px; }\n      body[data-endfield-glass='subtle'][data-ds-dark-theme] { --edge-glass-alpha: .64; }\n      body[data-endfield-glass='strong'][data-ds-dark-theme] { --edge-glass-alpha: .88; }\n      /* Glass is COMPOSER-ONLY. The docked right panel used to share the\n         material, and because it spans half the screen the translucent fill\n         read as 'half the page is frosted' even without blur — a big slab of\n         milky overlay with nothing local to show for it. The panel now keeps\n         its native opaque background entirely: no fill, no sheen, no edge.\n         The left sidebar keeps a STATIC sheen (no blur, no fill). */\n      body[data-endfield-glass] [data-composer-card] {\n        background-color: rgb(var(--edge-glass-fill) / var(--edge-glass-alpha)) !important;\n        background-image: linear-gradient(145deg, var(--edge-glass-sheen), transparent 58%),\n          radial-gradient(ellipse at 0% 0%, color-mix(in srgb, var(--edge-accent) 10%, transparent), transparent 75%) !important;\n        -webkit-backdrop-filter: blur(var(--edge-glass-blur)) saturate(1.05);\n        backdrop-filter: blur(var(--edge-glass-blur)) saturate(1.05);\n        --dsw-elevation-stroke-color: var(--edge-glass-edge);\n      }\n      body[data-endfield-glass] [data-slot='sidebar'] > div {\n        background-image: linear-gradient(145deg, var(--edge-glass-sheen), transparent 58%),\n          radial-gradient(ellipse at 0% 0%, color-mix(in srgb, var(--edge-accent) 8%, transparent), transparent 75%);\n        box-shadow: inset -1px 0 0 var(--edge-glass-edge);\n      }\n      @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {\n        body[data-endfield-glass] [data-composer-card] {\n          background-color: rgb(var(--edge-glass-fill) / .96) !important;\n        }\n      }\n      @media (prefers-reduced-transparency: reduce) {\n        body[data-endfield-glass] [data-composer-card] {\n          background-color: rgb(var(--edge-glass-fill)) !important;\n          -webkit-backdrop-filter: none; backdrop-filter: none;\n        }\n      }\n";

// src/styles/interaction.css?raw
	var interaction_default = "      /* ---------- selection + caret: the official interaction GRAYS ----------\n         Measured from the official site's own CSS: hover and selection surfaces\n         are a gray scale there (#d9d9d9/#f0f0f0 light, #484848/#626262 dark)\n         while the accent stays a rare SIGNAL. Text selection is the most\n         repeated interaction in this UI, so it follows the official grammar in\n         EVERY palette — a yellow selection reads as a highlighter and was\n         reported as exactly that. These tokens are scheme-only: no palette\n         class ever overrides them. Pairs stay AA:\n           light #d9d9d9 + ink 13.41:1 · dark #6a6a6a + white 5.41:1 */\n      body {\n        --edge-select-fill: #d9d9d9;\n        --edge-select-ink: #101110;\n        --edge-caret: #666666;\n      }\n      body[data-ds-dark-theme] {\n        --edge-select-fill: #6a6a6a;\n        --edge-select-ink: #ffffff;\n        --edge-caret: #d9d9d9;\n      }\n      ::selection {\n        color: var(--edge-select-ink, #000);\n        background: var(--edge-select-fill, #d9d9d9);\n      }\n      /* ================= 按钮交互动效（合并设计，data-endfield-motion 开关） =======\n         这里曾是六套互斥方案（A 信号 / B 静默 / C 冲压 / D 角标 / E 读数 /\n         F 盖章），由设置页下拉切换。2026-10 合并为**一套固定设计**：B 静默、\n         C 冲压、F 盖章整体移除（它们的硬阴影位移 / 落印旋转 / 按下抖动与官网\n         「时长 ≤.3s、无弹跳、变形优先于位移」的实测语法相抵触，且互为噪音），\n         E 读数随 CTA 归属信号而失去独立母题；两套幸存母题按角色分工——\n\n           · 信号（官网签名，原方案A）：\n             - 新会话按钮 / 审批按钮：箭头自左侧滑入（transform + opacity，\n               合成器级，零重排）；\n             - 表格行（tbody tr）：悬停左缘 3px 信号色细条。\n\n           · 角标（工程标注，原方案D 的母题、收到行角色）：\n             - 侧边栏会话行 + 搜索结果行：悬停时四角 12px L 形角标淡入\n               （.18s）——工程图纸的「框选/定位」语法。\n\n         共通底座不变：全局 .2s 颜色过渡（hover 不瞬变）+ :active 暗一档。\n         开关只剩开/关：data-endfield-motion 属性在场即整套生效，属性值固定\n         'signal'（历史存储字面量；读侧把一切旧方案名都并轨为「开」，见\n         readMotion）。\n\n         官网实测数据支撑（动效部分见 docs/notes/endfield-motion-research.md）：\n         · 时长全部 ≤.3s；无弹跳/无回弹（keyframes 的 cubic-bezier y ≤ 1）\n         · 变形优先于位移；颜色就是状态（hover亮/active暗）\n         · 零 JS 动画库，纯 CSS transition\n\n         色彩取值分两类，**不要混**：\n         · 画在纸/面板上的（角标、表格行左边条亮色档）走 --edge-accent-onpaper；\n         · 画在**强调色实心底**上的只有信号箭头，它走 --edge-accent-ink——新会话\n           按钮自己的底就是 --edge-accent（悬停/按下 --edge-accent-deep），同色叠\n           同色会 1.00:1，而 onpaper 在亮黄/亮青里**等于** accent（1.00–1.51:1）。\n           这个反例真的上线过，最后被像素断言抓住。\n         配对由 test/palette-contrast.test.js 第 12 节断言（ink × accent/deep，\n         各配色 5.41–16.50:1）。\n\n         prefers-reduced-motion：位移动画全部关掉，保留颜色过渡，见本节末尾。 */\n      /* ================= 菜单当前项：划词灰填充（模型栏 / 权限更改） =================\n         本主题的语法是「选中 = 固定灰」（::selection 那对 fill/ink，亮\n         #d9d9d9 / 暗 #6a6a6a，配对对比度见上方注释），强调黄只做信号。但两处\n         下拉的「当前项」只有一枚对勾浮在透明底上——一眼读不出哪项是当前值。\n         按用户要求改成与划词完全一致的灰底 + 墨字（含子孙元素，对勾/徽标\n         一并单色化），其余行的悬停/键盘高亮仍走黄色淡染：选中是状态，\n         悬停是信号。\n\n         两个钩子都对过整个已装应用包（0.1.7-era），各只命中目标组件：\n           · [role='menuitemradio'][aria-checked='true'] —— 模型选择包独有\n             （composer 模型位与 /model 弹窗共用同一组件，模型行与推理等级行\n             都是 menuitemradio + aria-checked）；\n           · [role='menuitem'][class*='_selected']:has([class$='_optionLabel'])\n             —— 权限预设弹层（primitives Menu 的 check 选中行，标签内嵌\n             optionLabel span）。用户提问编排器（user-questions）也有\n             _optionLabel，但那些是普通 chip（无 menuitem 角色），不会被\n             :has 这条够到；其余 Menu 弹层不带 optionLabel，同样不命中。\n           · 本主题自己的设置下拉（.endfield-select-option）也是 menuitemradio，\n             但它照官网筛选下拉画自己的斜纹选中底（见 .endfield-select 段），\n             所以开洞——否则这里的 !important 会把斜纹层与图块一起刷成平灰。 */\n      [role='menuitemradio'][aria-checked='true']:not(.endfield-select-option),\n      [role='menuitemradio'][aria-checked='true']:not(.endfield-select-option) *,\n      [role='menuitem'][class*='_selected']:has([class$='_optionLabel']),\n      [role='menuitem'][class*='_selected']:has([class$='_optionLabel']) * {\n        background-color: var(--edge-select-fill, #d9d9d9) !important;\n        color: var(--edge-select-ink, #101110) !important;\n      }\n      /* 背景只落在行盒本身：子元素若是行内排版的 span，background 会随\n         color 一起继承成灰条，把「整行填充」碎成文字块。显式清零，只让\n         行盒持底色。 */\n      [role='menuitemradio'][aria-checked='true']:not(.endfield-select-option) *,\n      [role='menuitem'][class*='_selected']:has([class$='_optionLabel']) * {\n        background-color: transparent !important;\n      }\n\n\n      /* ---------- 共通（合并设计）：全局颜色过渡 ----------\n         只过渡「颜色类」属性。两个实测/证词都指向同一条：过渡属性越少越省。\n         · box-shadow / filter / width 在悬停按下时是**一次性**变化，本来不需要\n           过渡，写进 transition 只会让每次悬停多跑一遍栅格化或重排；\n         · border-radius 尤其贵——浏览器把它当「可触发重排」的属性处理，在长列表\n           上悬停会造成整屏布局失效（实测：把 border-radius 留在通用过渡里，\n           300 行扫描的 LayoutDuration 从 0 涨到 20ms/s）。合并设计里没有任何\n           规则动圆角（见 1 号注），它也就始终不进通用过渡。 */\n      body[data-endfield-motion] button,\n      body[data-endfield-motion] [role='button'],\n      body[data-endfield-motion] [role='tab'],\n      body[data-endfield-motion] [role='menuitem'],\n      body[data-endfield-motion] [role='option'],\n      body[data-endfield-motion] a {\n        transition: background-color .2s ease, color .2s ease, border-color .2s ease;\n      }\n\n      /* ---------- 共通（合并设计）：:active 按下暗一档 ---------- */\n      body[data-endfield-motion] button:active:not(:disabled),\n      body[data-endfield-motion] [role='button']:active:not(:disabled) {\n        filter: brightness(.85);\n      }\n\n      /* ================= 信号母题（原方案A）：箭头 + 行左缘 ================= */\n\n      /* 1 号注.（已删除）悬停圆角软化。\n         官网确实在 hover 里动圆角（2px→6px，调研 §4.2 原文），这里曾照做过一条\n         「直角模式下按钮悬停 border-radius:6px」。撤掉的原因是用户实测反馈定的\n         准则：**圆角全局恒定，不随状态变化**——悬停瞬间方角变圆角，再叠加排除\n         清单（图标/走纸/发送按钮不参与），呈现为「部分按钮、悬停时才变的不一致\n         倒角」。直角模式一律 0；圆角模式（theme-endfield-round）保持上游原样；\n         两种模式各自恒定。附带收益：border-radius 被浏览器按「可能触发重排」\n         处理，悬停改圆角在长列表上有实测成本（见性能段）。 */\n      /* 2. 新会话按钮箭头动效。\n         不做 clip-path 变形——两个 polygon 之间的点位插值在过渡期间产生\n         自交形状（蝶形），视觉上闪烁扭曲。改为：形状固定为右指三角，\n         仅动画 transform + opacity（合成器级，零 paint，零重排）。\n         悬停时箭头从左侧滑入并放大到位。 */\n      body[data-endfield-motion] [class$='_newSession'] {\n        position: relative;\n      }\n      body[data-endfield-motion] [class$='_newSession']::after {\n        content: '';\n        position: absolute;\n        left: 6px;\n        top: 50%;\n        width: 12px;\n        height: 60%;\n        background-color: var(--edge-accent-ink, #101110);\n        clip-path: polygon(0 15%, 100% 50%, 0 85%);\n        opacity: 0;\n        transform: translateY(-50%) translateX(-14px) scale(.4);\n        transition: opacity .2s ease, transform .2s cubic-bezier(.16, 1, .3, 1);\n        pointer-events: none;\n        z-index: 1;\n      }\n      body[data-endfield-motion] [class$='_newSession']:hover::after {\n        opacity: 1;\n        transform: translateY(-50%) translateX(0) scale(1);\n      }\n\n      /* 3. 审批按钮：同款箭头滑入 */\n      body[data-endfield-motion] [data-cordis-approve] {\n        position: relative;\n      }\n      body[data-endfield-motion] [data-cordis-approve]::after {\n        content: '';\n        position: absolute;\n        left: 6px;\n        top: 50%;\n        width: 10px;\n        height: 55%;\n        background-color: currentColor;\n        clip-path: polygon(0 15%, 100% 50%, 0 85%);\n        opacity: 0;\n        transform: translateY(-50%) translateX(-12px) scale(.4);\n        transition: opacity .2s ease, transform .2s cubic-bezier(.16, 1, .3, 1);\n        pointer-events: none;\n      }\n      body[data-endfield-motion] [data-cordis-approve]:hover::after {\n        opacity: 1;\n        transform: translateY(-50%) translateX(0) scale(1);\n      }\n\n      /* 4. 发送/停止按钮（输入区 _primary）**不做动效**。\n         这里曾经是一个「信号色箭头自左侧滑入」的伪元素。取消它的理由有两条：\n         · 官方 /operator 右侧那列圆形按钮（切换干员）只有 .3s 的 transform 与\n           background-color .2s 两种过渡，**没有任何形变式动效**——它的状态靠\n           颜色与 2px 黄边表达（选中 '#fffa00'、悬停 '#626262'、按下 '#282828'）。\n           发送按钮上挂一个滑入箭头，比参考对象本身更吵；也不符合设计语言\n           「强调色只做信号、不做装饰」。\n         · 发送是高频动作，箭头在每一次悬停都重放，属于噪音。\n         现在发送按钮只保留全局的颜色过渡（背景/文字/边框），与其它按钮一致。\n         （旧的「全方案强制取消」守护规则随冲压/读数一起删除——合并设计里\n         本就没有任何规则给输入区按钮挂动画或 transform。） */\n\n      /* 5. 表格行：悬停左缘信号色细条。用 --edge-accent-onpaper（深色档，\n          在纸面与面板上都可读），因为默认灰配色的 --edge-accent 就是\n          #d9d9d9——在奶油色悬停底上不可见。\n          边框在**常态**预声明为 3px 透明，悬停只改颜色：悬停才加边框会让\n          每一行悬停都重排一次（300 行扫描实测：悬停建边框 11.6ms/s\n          LayoutDuration，常态预声明 0.00ms/s）。\n          侧边栏会话行/搜索行原属同一条处理，合并时按用户指定改用角标母题\n          （见下一节）——左缘细条只保留给表格行。\n          菜单/列表框条目（[role='menuitem'] / [role='option']）不进这条处理：\n          它们原生 border:none，紧凑弹层里悬停才显色的左边框读起来是\n          「没闭合的边框」（用户实测反馈），弹层内的选中反馈交给底色高亮；\n          设置页按钮同理（整圈 1px 边框会被 3px 透明条「打开」）。 */\n      body[data-endfield-motion] tbody tr {\n        border-left: 3px solid transparent !important;\n      }\n      body[data-endfield-motion] tbody tr:hover {\n        border-left: 3px solid var(--edge-accent-onpaper, var(--edge-accent)) !important;\n      }\n\n      /* ================= 角标母题（原方案D，收到侧边栏行角色） ================= */\n\n      /* 四角 L 形角标：两个 12px 方块伪元素，各用两条渐变边画一个 L，分放\n          ::before（左上）/ ::after（右下），不互相覆盖——半透明叠加会加深那一\n          角，L 的两条臂就不再等宽。\n          原方案D 把角标画在**所有**方角按钮/菜单项上；合并时按用户指定收窄到\n          「侧边栏各个会话」——会话行（div[role='treeitem']）与搜索结果行\n          （button）。上游这两类行都不使用伪元素（审计过 workspace 包的\n          CSS module），不存在抢占。\n          两条渐变的边 = 一个 L。**不用 mask / 不用 SVG**：隔离页实测同一个\n          12px 方块上的 SVG 遮罩在 DPR 1 下整条不落笔、DPR 2/3 正常——选择器\n          与计算样式全都对，只有跨 DPR 截图才能发现。渐变边没有遮罩/位图依赖，\n          DPR 1/2/3 都正常。\n          '.theme-endfield-round' 守卫沿用原方案D 的理由：圆角模式下上游圆角\n          全部保留，方角标贴不上任何一条边。 */\n      body[data-endfield-motion]:not(.theme-endfield-round) [class$='_sidebarCol'] [class$='_sessionRow'],\n      body[data-endfield-motion]:not(.theme-endfield-round) [class$='_sidebarCol'] [class$='_searchResultRow'] {\n        position: relative;\n      }\n      body[data-endfield-motion]:not(.theme-endfield-round) [class$='_sidebarCol'] [class$='_sessionRow']::before,\n      body[data-endfield-motion]:not(.theme-endfield-round) [class$='_sidebarCol'] [class$='_sessionRow']::after,\n      body[data-endfield-motion]:not(.theme-endfield-round) [class$='_sidebarCol'] [class$='_searchResultRow']::before,\n      body[data-endfield-motion]:not(.theme-endfield-round) [class$='_sidebarCol'] [class$='_searchResultRow']::after {\n        /* 盒子常态就存在（content/几何/颜色都在常态规则里），显隐只切 opacity。\n           三版实现里只有这一版同时做到「可见」与「0 重排」，实测：\n             · content 只写在 hover 规则里（悬停才生成盒子）→ 布局失效 29.2ms/s；\n             · content 在悬停、几何在常态 → 同样 29.2ms/s：代价来自「伪元素在常态\n               是否已存在」，不是 content 写在哪；\n             · 常态生成 + 只切 opacity → 0.00ms/s（见 test/perf-motion.test.js）。\n           入场用 @keyframes 而不是 transition：本仓库已实测 transition 在部分渲染\n           路径上根本不触发（见启动屏注释），而关键帧 + fill-mode:both 的终点是\n           确定的；opacity 单属性动画让浏览器只栅格化一次、之后每帧只合成。 */\n        content: '';\n        position: absolute;\n        width: 12px;\n        height: 12px;\n        pointer-events: none;\n        z-index: 2;\n        background-image:\n          linear-gradient(var(--edge-accent-onpaper, var(--edge-accent)), var(--edge-accent-onpaper, var(--edge-accent))),\n          linear-gradient(var(--edge-accent-onpaper, var(--edge-accent)), var(--edge-accent-onpaper, var(--edge-accent)));\n        background-size: 12px 2px, 2px 12px;\n        background-repeat: no-repeat;\n        opacity: 0;\n      }\n      @keyframes endfield-clamp-in {\n        from { opacity: 0; }\n        to { opacity: 1; }\n      }\n      body[data-endfield-motion]:not(.theme-endfield-round) [class$='_sidebarCol'] [class$='_sessionRow']::before,\n      body[data-endfield-motion]:not(.theme-endfield-round) [class$='_sidebarCol'] [class$='_searchResultRow']::before {\n        left: 1px;\n        top: 1px;\n        background-position: left top, left top;\n      }\n      body[data-endfield-motion]:not(.theme-endfield-round) [class$='_sidebarCol'] [class$='_sessionRow']::after,\n      body[data-endfield-motion]:not(.theme-endfield-round) [class$='_sidebarCol'] [class$='_searchResultRow']::after {\n        right: 1px;\n        bottom: 1px;\n        background-position: right bottom, right bottom;\n      }\n      /* 显隐切换必须排在基础规则之后：两条规则特异性相同，靠源码顺序决胜。\n          （这一条一度被排到基础 opacity:0 之前，于是角标永远不亮——而且只有\n          像素断言会发现，计算样式与选择器看起来都对。） */\n      body[data-endfield-motion]:not(.theme-endfield-round) [class$='_sidebarCol'] [class$='_sessionRow']:hover::before,\n      body[data-endfield-motion]:not(.theme-endfield-round) [class$='_sidebarCol'] [class$='_sessionRow']:hover::after,\n      body[data-endfield-motion]:not(.theme-endfield-round) [class$='_sidebarCol'] [class$='_searchResultRow']:hover::before,\n      body[data-endfield-motion]:not(.theme-endfield-round) [class$='_sidebarCol'] [class$='_searchResultRow']:hover::after {\n        animation: endfield-clamp-in .18s ease 1 both;\n      }\n\n      /* ---------- 尊重「减少动态效果」：位移/动画/揭示全部关掉，只留颜色 ---------- */\n      @media (prefers-reduced-motion: reduce) {\n        body[data-endfield-motion] button,\n        body[data-endfield-motion] [role='button'],\n        body[data-endfield-motion] [role='tab'],\n        body[data-endfield-motion] [role='menuitem'],\n        body[data-endfield-motion] [role='option'] {\n          animation: none !important;\n          transform: none !important;\n          box-shadow: none !important;\n          /* Colour IS the state, so the colour feedback stays. outline-color\n             rather than the shorthand, so the app's focus ring keeps its width\n             and style. */\n          outline-color: transparent !important;\n        }\n        /* The dim-on-press half of the shared feedback is a colour change, not\n           motion: keep it. */\n        body[data-endfield-motion] button:active:not(:disabled),\n        body[data-endfield-motion] [role='button']:active:not(:disabled) {\n          filter: brightness(.85) !important;\n        }\n        /* No sliding arrow, no appearing brackets: the reveal IS the motion.\n           EVERY decorative pseudo-element the merged design paints, on both\n           corners of the bracket rows — a rule that only kills ::after leaves\n           the ::before corner painted (measured: the clamp top-left bracket\n           survived 'reduce' until this list included it). */\n        body[data-endfield-motion] [class$='_newSession']::after,\n        body[data-endfield-motion] [data-cordis-approve]::after,\n        body[data-endfield-motion] [class$='_sidebarCol'] [class$='_sessionRow']::before,\n        body[data-endfield-motion] [class$='_sidebarCol'] [class$='_sessionRow']::after,\n        body[data-endfield-motion] [class$='_sidebarCol'] [class$='_searchResultRow']::before,\n        body[data-endfield-motion] [class$='_sidebarCol'] [class$='_searchResultRow']::after {\n          content: none !important;\n        }\n      }\n";

// src/styles/chrome.css?raw
	var chrome_default = "      /* ================= 设置面板统一下拉（.endfield-select） =================\n         「终末地主题设置」里所有有值行的唯一控件。形制**照抄官网 /operator 页的\n         筛选下拉**（官方 Dropdown 组件，CSS bundle 3a129342b9ac5e73.css，\n         2026-10 一手取数；仓库所有者指定的参考）——深色铭牌触发器 + 卡片，\n         选中行是斜纹灰底 + 左缘紫/绿信号条。官方铭牌右侧的分隔线 + 值图块、\n         与菜单行里的职业图标按所有者要求**不做**：本面板的值是文字，图块只是\n         把文字再画一遍。\n\n         官方以 rem 计（站点 1rem = 16px 量级）；设置页行高 28–40px，整体按\n         **1rem → 8px** 缩放，比例不变：\n\n          | 部位 | 官方原文 | 本组件 |\n          | --- | --- | --- |\n          | 根 | .Dropdown_root：width 18.9375rem；disabled → opacity .45 | min-width 152px（= 18.9375 × 8）；更长的值（「完整（官网默认）」）向左长，右缘仍对齐 |\n          | 触发器 | .Dropdown_trigger：height 4rem、padding 0 1.25rem、gap .5rem、radius .25rem、#3a3a3a 底、#fff 字、1.625rem | 32px、0 10px、4px、2px、同色、13px |\n          | 圆形箭头 | .Dropdown_arrow：arrow.png、1.6875rem、margin-left 1rem、opacity .85、transform .2s、展开 rotate(180deg) | 原图字节内嵌（--edge-dd-arrow）、14px、同；官方箭头紧跟文字是因为右边还有图块，去掉图块后靠右收尾 |\n          | 卡片 | .Dropdown_panel：top 100%、left/right 0（与触发器等宽）、padding .25rem 0、radius .25rem、box-shadow 0 0 1.25rem rgba(0,0,0,.25)；入场 opacity + translateY(-.25rem) .15s | 右对齐、至少与触发器等宽（「轻（网格 + 斜纹）」这类长值放不进铭牌宽度时向左长，不截断）、2px 0、2px、0 0 10px；入场同款（-2px） |\n          | 选项行 | .Dropdown_option：height 4.5rem、padding-left 2.5rem、文字居中、hover rgba(0,0,0,.06) | 36px、20px、居中、同色（暗色取白 .06）；不画图标 |\n          | 选中底 | .Dropdown_bg：#8f8f8f + -45° 斜纹 #8b8b8b（11.74/38.26/61.74/88.26%）、.75rem 周期；opacity 0→1（.2s）；::before 左缘 .25rem 紫 #ff00f0 / 绿 #00ffa2 各半 | 斜纹几何与周期比例照抄（6px），底色压到 #6a6a6a / 纹 #666666（白字 #8f8f8f 只有 3.2:1，过不了 AA；#6a6a6a 是本主题的暗色划词灰，白字 5.4:1），左缘 2px 同色 |\n\n         选中底是**预建几何、只切 opacity**（官方也是这么做的）——每行都有那层\n         span，选中与否只差 opacity，悬停/切换不创造几何。悬停 = 官方 Button\n         暗色悬停 #484848（官方触发器只换了一条不存在的边框色，等于无反馈）。\n         这里的色值不随调色板也不随亮暗：官网就是一块固定的深色铭牌，强调色\n         只留给焦点环（全局规则）。\n\n         radius 写明 2px：直角模式下全局 [class]{border-radius:0!important} 把它\n         归零，圆角模式下才是官方的 .25rem。菜单在行内绝对定位，不 portal——\n         设置页无 overflow 裁剪，absolute 还让菜单随页面滚动跟随触发器。 */\n      .endfield-select {\n        position: relative;\n        display: inline-flex;\n        flex: 0 0 auto;\n        min-width: 152px;\n      }\n      .endfield-select-trigger {\n        position: relative;\n        display: flex;\n        align-items: center;\n        gap: 4px;\n        width: 100%;\n        height: 32px;\n        box-sizing: border-box;\n        padding: 0 10px;\n        border: none;\n        border-radius: 2px;\n        cursor: pointer;\n        background-color: #3a3a3a;\n        color: #ffffff;\n        font-family: inherit;\n        font-size: 13px;\n        font-weight: 500;\n        line-height: 1;\n        white-space: nowrap;\n        text-align: left;\n        transition: background-color .15s ease;\n      }\n      .endfield-select-trigger:hover:not(:disabled) {\n        background-color: #484848;\n      }\n      .endfield-select-trigger:disabled {\n        opacity: .45;\n        cursor: not-allowed;\n      }\n      .endfield-select-value {\n        flex: 1 1 auto;\n        min-width: 0;\n        overflow: hidden;\n        text-overflow: ellipsis;\n      }\n      .endfield-select-arrow {\n        flex: none;\n        width: 14px;\n        height: 14px;\n        margin-left: 8px;\n        background: var(--edge-dd-arrow) 50% / cover no-repeat;\n        opacity: .85;\n        transition: transform .2s ease;\n      }\n      .endfield-select.is-open .endfield-select-arrow {\n        transform: rotate(180deg);\n      }\n      .endfield-select-menu {\n        position: absolute;\n        top: 100%;\n        right: 0;\n        z-index: 1100;\n        box-sizing: border-box;\n        width: max-content;\n        min-width: 100%;\n        max-width: 360px;\n        max-height: min(360px, 100vh - 96px);\n        overflow-y: auto;\n        padding: 2px 0;\n        display: flex;\n        flex-direction: column;\n        border-radius: 2px;\n        background: var(--dsw-menu-surface-fill);\n        box-shadow: 0 0 10px rgba(0, 0, 0, .25);\n        animation: endfield-select-in .15s ease 1 both;\n      }\n      body[data-ds-dark-theme] .endfield-select-menu {\n        box-shadow: 0 0 10px rgba(0, 0, 0, .5), 0 0 0 1px var(--dsw-alias-border-l1);\n      }\n      @keyframes endfield-select-in {\n        from { opacity: 0; transform: translateY(-2px); }\n        to { opacity: 1; transform: translateY(0); }\n      }\n      .endfield-select-option {\n        position: relative;\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        width: 100%;\n        height: 36px;\n        flex: none;\n        box-sizing: border-box;\n        padding: 0 12px 0 20px;\n        border: none;\n        border-radius: 0;\n        background-color: transparent;\n        cursor: pointer;\n        color: var(--dsw-alias-label-primary);\n        font-family: inherit;\n        font-size: 13px;\n        font-weight: 400;\n        line-height: 1.3;\n        text-align: center;\n        white-space: nowrap;\n        transition: background-color .2s ease;\n      }\n      .endfield-select-option:hover,\n      .endfield-select-option:focus-visible {\n        background-color: rgba(0, 0, 0, .06);\n      }\n      body[data-ds-dark-theme] .endfield-select-option:hover,\n      body[data-ds-dark-theme] .endfield-select-option:focus-visible {\n        background-color: rgba(255, 255, 255, .06);\n      }\n      .endfield-select-option-bg {\n        position: absolute;\n        inset: 0;\n        background-color: #6a6a6a;\n        background-image: linear-gradient(-45deg, transparent, transparent 11.7415035135%, #666666 0, #666666 38.2584964865%, transparent 0, transparent 61.7415035135%, #666666 0, #666666 88.2584964865%, transparent 0, transparent);\n        background-size: 6px 6px;\n        opacity: 0;\n        transition: opacity .2s ease;\n        pointer-events: none;\n      }\n      .endfield-select-option-bg::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: 0;\n        width: 2px;\n        height: 100%;\n        background-image: linear-gradient(180deg, #ff00f0 0, #ff00f0 50%, #00ffa2 0, #00ffa2);\n      }\n      .endfield-select-option[aria-checked='true'] {\n        color: #ffffff;\n      }\n      .endfield-select-option[aria-checked='true'] .endfield-select-option-bg {\n        opacity: 1;\n      }\n      .endfield-select-option-label {\n        position: relative;\n        min-width: 0;\n        overflow: hidden;\n        text-overflow: ellipsis;\n      }\n      @media (prefers-reduced-motion: reduce) {\n        .endfield-select-menu { animation: none; }\n        .endfield-select-trigger,\n        .endfield-select-arrow,\n        .endfield-select-option,\n        .endfield-select-option-bg { transition: none; }\n      }\n\n      /* Square corners (default): zero EVERY classed element, then restore circles/pills below.\n         body.theme-endfield-round disables all of this and restores app-native rounding. */\n      body:not(.theme-endfield-round) button,\n      body:not(.theme-endfield-round) input,\n      body:not(.theme-endfield-round) textarea,\n      body:not(.theme-endfield-round) select,\n      body:not(.theme-endfield-round) [role='button'],\n      body:not(.theme-endfield-round) [role='dialog'],\n      body:not(.theme-endfield-round) [role='menu'],\n      body:not(.theme-endfield-round) [role='tooltip'],\n      body:not(.theme-endfield-round) [role='tab'] {\n        border-radius: 0 !important;\n      }\n      body:not(.theme-endfield-round) [class] {\n        border-radius: 0 !important;\n      }\n      body:not(.theme-endfield-round) [class*='avatar'],\n      body:not(.theme-endfield-round) [class*='Avatar'],\n      body:not(.theme-endfield-round) [class*='spinner'],\n      body:not(.theme-endfield-round) [class*='Spinner'],\n      body:not(.theme-endfield-round) [class*='dot'],\n      body:not(.theme-endfield-round) [class*='Dot'],\n      body:not(.theme-endfield-round) [class*='actionButton' i],\n      body:not(.theme-endfield-round) [class$='_iconButton'] {\n        border-radius: 50% !important;\n      }\n      /* Hover feedback should track the pointer immediately; the app's broad\n         transition rule otherwise makes colour changes feel delayed. */\n      button,\n      [role='button'] {\n        transition: none !important;\n      }\n      body:not(.theme-endfield-round) [class*='scrollbar'],\n      body:not(.theme-endfield-round) [class*='Scrollbar'] {\n        border-radius: 0 !important;\n      }\n      /* ---------- 浮动提示气泡（Tooltip 原语）的墨字、描边与阴影 ----------\n         底色/键帽底在令牌层（overrideTokens：应用把 alias 令牌写成 body 的\n         行内样式，样式表规则压不过，必须注册层）。这里补令牌管不到的三件：\n         · 文字色：bubble 的 color 是类规则里的 --dsw-static-neutral-bluish-00\n           （白）——底从近黑换成纸面后白字不可见，必须跟着换成墨/纸；\n         · 描边用 ring shadow 不用 border：bubble 的 padding 3px 7px 按无框\n           设计，加 border 会挤内容（与暗色下拉面板的 0 0 0 1px 环同一手法）；\n         · 键帽 inset hairline 同理，零布局代价。\n         官网没有 tooltip 语法（动效调研 §四：78 条 hover 全在控件本体上，\n         无浮层提示），所以这不是复刻，是把主题浮层家族套上去；阴影取官方\n         Dropdown_panel 的 0 0 1.25rem rgba(0,0,0,.25) 按 1rem=8px 缩放\n         （与「设置面板统一下拉」同款）。特异性 body 前缀 (0,1,1) 高于\n         bubble 的哈希类 (0,1,0)，不受注入顺序影响。 */\n      body [role='tooltip'] {\n        color: var(--dsw-alias-label-primary);\n        box-shadow: 0 0 10px rgba(0, 0, 0, .25), 0 0 0 0.5px var(--dsw-alias-border-l2);\n      }\n      body[data-ds-dark-theme] [role='tooltip'] {\n        box-shadow: 0 0 10px rgba(0, 0, 0, .5), 0 0 0 0.5px var(--dsw-alias-border-l1);\n      }\n      body [role='tooltip'] kbd {\n        box-shadow: inset 0 0 0 0.5px var(--dsw-alias-border-l2);\n      }\n      * {\n        scrollbar-width: thin;\n        scrollbar-color: var(--edge-line) transparent;\n      }\n      /* ---------- Light mode: deepen tertiary/secondary labels for icon visibility ---------- */\n      body:not([data-ds-dark-theme]) {\n        --dsw-alias-label-tertiary: #6a6d68;\n        --dsw-alias-label-caption: #5a5d58;\n        --dsw-alias-label-dimmed: #9a9d98;\n        --edge-btn-muted: #dcddd6;\n      }\n      /* ---------- Neutralize remaining DeepSeek brand blues ---------- */\n      body {\n        --dsw-static-deepseek-50: #dcddd6;\n        --dsw-static-deepseek-100: #dcddd6;\n        --dsw-static-deepseek-200: #d8d9d5;\n        --dsw-static-deepseek-300: #c8cac5;\n        --dsw-static-deepseek-400: #757874;\n        --dsw-static-deepseek-450: var(--edge-accent-onpaper);\n        --dsw-static-deepseek-500: #101110;\n        --dsw-static-deepseek-600: #101110;\n        --dsw-static-deepseek-800: #3a3c38;\n        --dsw-static-deepseek-900: #2a2c2a;\n        --dsw-static-blue-900: #101110;\n        --dsw-alias-button-info-fill: #101110;\n        --dsw-alias-button-info-hover: #2a2b28;\n        --dsw-alias-state-business-primary: #101110;\n        --dsw-alias-state-business-tertiary: rgba(var(--edge-accent-rgb), 0.14);\n        --dsw-alias-brand-primary-new-colorprimary-new-color: #101110;\n        --dsw-alias-label-primary-bluish: #101110;\n        --dsw-specific-bubble: #f2f2ec;\n        --dsw-specific-bubble-highlight: #dcddd6;\n        --dsw-specific-sidebar-nav-item-active-accent: #101110;\n        --dsw-alias-interactive-bg-hover-accent: rgba(var(--edge-accent-rgb), 0.14);\n        --dsw-alias-border-l3: #b6b8b3;\n        --dsw-alias-border-l4: #9a9d98;\n      }\n      body[data-ds-dark-theme] {\n        --dsw-static-deepseek-50: #242624;\n        --dsw-static-deepseek-100: #242624;\n        --dsw-static-deepseek-200: #2f312e;\n        --dsw-static-deepseek-300: #3a3c38;\n        --dsw-static-deepseek-400: #898d89;\n        --dsw-static-deepseek-450: var(--edge-accent);\n        --dsw-static-deepseek-500: #f5f5f0;\n        --dsw-static-deepseek-600: #d8d9d5;\n        --dsw-static-deepseek-800: #343633;\n        --dsw-static-deepseek-900: #242624;\n        --dsw-static-blue-900: #f5f5f0;\n        --dsw-alias-button-info-fill: var(--edge-accent);\n        --dsw-alias-button-info-hover: var(--edge-accent);\n        --dsw-alias-state-business-primary: var(--edge-accent);\n        --dsw-alias-state-business-tertiary: rgba(var(--edge-accent-rgb), 0.22);\n        --dsw-alias-brand-primary-new-colorprimary-new-color: var(--edge-status-dark, var(--edge-accent));\n        --dsw-alias-label-primary-bluish: #f5f5f0;\n        --dsw-specific-bubble: #181a18;\n        --dsw-specific-bubble-highlight: #242624;\n        --dsw-specific-sidebar-nav-item-active-accent: var(--edge-accent);\n        --dsw-alias-interactive-bg-hover-accent: rgba(var(--edge-accent-rgb), 0.22);\n        --dsw-alias-border-l3: #4f534f;\n        --dsw-alias-border-l4: #5f6460;\n        --edge-btn-muted: #3a3c38;\n      }\n      /* ---------- Signal yellow everywhere (light: visible but soft) ---------- */\n      body {\n        --dsw-alias-interactive-bg-hover: rgba(var(--edge-accent-rgb), 0.16);\n        --dsw-alias-interactive-bg-active: rgba(var(--edge-accent-rgb), 0.26);\n        --dsw-alias-interactive-bg-hover-solid: var(--edge-accent);\n        --dsw-alias-bg-multi-select: rgba(var(--edge-accent-rgb), 0.16);\n        --dsw-alias-bg-skeleton: rgba(var(--edge-accent-rgb), 0.12);\n        --dsw-alias-markdown-citation: rgba(var(--edge-accent-rgb), 0.16);\n        --dsw-alias-markdown-code-block-banner: rgba(var(--edge-accent-rgb), 0.10);\n        --dsw-alias-markdown-code-segment-selected: rgba(var(--edge-accent-rgb), 0.22);\n        --dsw-alias-markdown-code-segment-unselected: rgba(var(--edge-accent-rgb), 0.06);\n        --dsw-alias-markdown-inline-code: rgba(var(--edge-accent-rgb), 0.14);\n        --dsw-alias-markdown-tag: rgba(var(--edge-accent-rgb), 0.18);\n        --dsw-alias-scrollbar-bg-l1: transparent;\n        --dsw-alias-scrollbar-bg-l2: transparent;\n        --dsw-alias-scrollbar-hover-l1: var(--edge-accent);\n        --dsw-alias-scrollbar-hover-l2: var(--edge-accent);\n        --dsw-specific-sidebar-nav-item-active: rgba(var(--edge-accent-rgb), 0.16);\n        --dsw-specific-sidebar-nav-item-hover: rgba(var(--edge-accent-rgb), 0.12);\n      }\n      body[data-ds-dark-theme] {\n        --dsw-alias-interactive-bg-hover: rgba(var(--edge-accent-rgb), 0.18);\n        --dsw-alias-interactive-bg-active: rgba(var(--edge-accent-rgb), 0.28);\n        --dsw-alias-interactive-bg-hover-solid: var(--edge-accent);\n        --dsw-alias-bg-multi-select: rgba(var(--edge-accent-rgb), 0.18);\n        --dsw-alias-bg-skeleton: rgba(var(--edge-accent-rgb), 0.14);\n        --dsw-alias-markdown-citation: rgba(var(--edge-accent-rgb), 0.20);\n        --dsw-alias-markdown-code-block-banner: rgba(var(--edge-accent-rgb), 0.12);\n        --dsw-alias-markdown-code-segment-selected: rgba(var(--edge-accent-rgb), 0.26);\n        --dsw-alias-markdown-code-segment-unselected: rgba(var(--edge-accent-rgb), 0.08);\n        --dsw-alias-markdown-inline-code: rgba(var(--edge-accent-rgb), 0.18);\n        --dsw-alias-markdown-tag: rgba(var(--edge-accent-rgb), 0.22);\n        --dsw-alias-scrollbar-bg-l1: transparent;\n        --dsw-alias-scrollbar-bg-l2: transparent;\n        --dsw-alias-scrollbar-hover-l1: var(--edge-accent);\n        --dsw-alias-scrollbar-hover-l2: var(--edge-accent);\n        --dsw-specific-sidebar-nav-item-active: rgba(var(--edge-accent-rgb), 0.20);\n        --dsw-specific-sidebar-nav-item-hover: rgba(var(--edge-accent-rgb), 0.16);\n      }\n      /* The caret follows the same scheme-gray rule as selection (see the\n         selection block above): light #666666 on paper, dark #d9d9d9 on ink —\n         always visible (4.67:1 / 13.41:1), never the accent (yellow on cream\n         was 1.07:1, i.e. invisible). */\n      input, textarea, [contenteditable='true'] {\n        caret-color: var(--edge-caret, #666666);\n      }\n      :focus-visible {\n        outline: 2px solid var(--edge-accent) !important;\n        outline-offset: 1px;\n      }\n      a {\n        text-decoration-thickness: 1px;\n      }\n      a:hover {\n        text-decoration-color: var(--edge-accent);\n      }\n      /* Reads the STATUS token, not the accent. For 谷地黄 the two are equal\n         (#fff500); the role split survives from the palette era so a future\n         fill that reads as text can dim separately from the solid accent. */\n      body[data-ds-dark-theme] a:hover {\n        color: var(--edge-status-dark, var(--edge-accent));\n      }\n      ::-webkit-scrollbar {\n        width: 10px;\n        height: 10px;\n      }\n      ::-webkit-scrollbar-thumb {\n        border-radius: 0;\n        background: var(--edge-line);\n      }\n      ::-webkit-scrollbar-thumb:hover {\n        background: var(--edge-accent) !important;\n      }\n      ::-webkit-scrollbar-track {\n        background: transparent;\n      }\n      /* ---------- Hover text contrast (reference page inversion) ---------- */\n      /* Note: plain buttons are excluded — their own fill/text color must survive hover\n         (e.g. yellow toggle button keeps black text; white-on-dark send button stays white). */\n      :is([role='tab'], [role='menuitem'], [role='option'], [role='link'], [role='treeitem'], [role='checkbox'], [role='switch'], [role='radio'], [role='combobox'], [class*='nav-item' i], [class*='menu-item' i], [class*='list-item' i], [class*='session-item' i], [class*='workspace-item' i], [class*='search-result' i], [class*='item' i], [class*='tab' i], [class*='card' i], [class*='row' i], [class*='tool' i], [class*='composer' i]):hover {\n        color: var(--dsw-alias-label-primary) !important;\n      }\n      /* 对话/轨迹 标签（_tabs/_tab，在 header 里）。注意复合类名：选中标签的\n         class 是 'wSkVaW_tab wSkVaW_tabActive'——[class$='_tab'] 要求整个 class\n         串以 _tab 结尾，选中标签不满足（评审 element.matches 实测三条规则全部\n         落空，原生墨条逐像素存活）。必须 :is([class$='_tab'],[class$='_tabActive'])\n         两种后缀都列，与类序无关。\n         历经五版：纯墨条（截断分划线）、三色线（24px 读不出三段）、短划上移、\n         官方 /news **图片卡**的黑色遮罩（rgba(0,0,0,.25)，纸面合成 1.81:1，\n         用户实测就是一块黑灰方片——那是图片的语言，不是页签的）。\n         2026-10-15 重取数：/news 的页签组件是 SubpageTab（bundle\n         c1b6a925ef3d04ee.css，一手原文见动效调研附录 E），配方是**浅灰水面**：\n\n         · .SubpageTab_tab：border-radius 4px + transition:background-color .2s ease\n           （transition 在基础规则，状态只写值——官网语法）；\n         · @media(any-hover:hover){ :hover{background-color:#f3f3f3} }——悬停 =\n           一档浅灰面，对官方白底实测 1.11:1；\n         · .active{background-color:#e5e5e5}——激活 = 再深一档，1.26:1；悬停\n           激活标签时保持激活档不变浅（active 规则同特异性置后）；\n         · 激活编排：文字左移 −1.75rem + 圆形箭头（⌀2.3rem、#fafafa 底、\n           #999 图标）淡入 + 页签间 #d9d9d9 竖分隔线（0.1875×2.5rem，\n           首尾隐藏）。**全取**（2026-10-15 用户指定，前两版曾以「紧凑页签\n           放不下」为由省略——正确解法不是省略，而是把官方的**结构**\n           （恒定水平 padding + 激活滑移）一并搬过来，见下方映射注释）；\n           4px 圆角按 0.46 缩放为 2px（伪元素不受全局直角化约束）。\n\n         落地映射——档位按**合成对比度**对齐官方，不照抄 hex（官方底是白，\n         主题底是纸 #e8e8e2）：\n         · 悬停 rgba(0,0,0,.04)：纸面合成 1.09:1 ≈ 官方 1.11（WCAG 实测）；\n         · 激活 rgba(0,0,0,.09)：合成 1.22:1 ≈ 官方 1.26，**常态常亮**——\n           悬停档必须弱于激活档，层级才不倒挂；\n         · 墨字在两档洗面上 13.5 / 12.3:1（AA 无虞，实测见 palette 10d 段）；\n         · 实现沿用预建 ::before + 只切 opacity（悬停不创造几何，layout 0.00；\n           opacity 过渡挂在伪元素自身——应用的 button{transition:none} 管不到\n           它），bottom:5px 的失真保留（洗面盒止于分划线上方）；\n         · 悬停规则只写 opacity、激活规则只写底色+opacity——两条不同属性，\n           无特异性之争，悬停激活标签时保持激活底色（同官方行为）；\n         · 官网 any-hover 守卫仍不设（已登记分歧：无头环境仿真不了 any-hover，\n           触屏粘滞悬停作为已知代价）；\n         · **暗色不洗面**：近黑底上等档需要 ~10% 白洗，落在噪声地板（前轮\n           评审实测白 12% 仅 1.39:1 判不可见）；暗色悬停信号仍是既有\n           「文字提亮一档」（17.3:1），display:none 连盒子都不画。轨迹页自己\n           的 detailTab（大写 T 结尾）不受影响。 */\n      /* 官方结构映射：SubpageTab 每个页签自带 0 3rem 水平 padding（盘子恒宽、\n         文字居中），激活时文字左移 −1.75rem 腾出箭头位。按官方/主题体量比\n         ≈ 0.46（文字 28px/13px）折算：padding 22px、滑移 −13px、箭头 ⌀16px、\n         分隔线 1.5×18px、倒角 2px（官方 4px/60px 盒）。布局验算（gap 36）：\n         相邻盘子边缘隔 12px，分隔线居中两侧各 ≈6px，箭头与文字净距 27px。\n         padding 全页签恒定，无跳版。 */\n      [class$='_centerCol'] [class$='_tabs'] :is([class$='_tab'],[class$='_tabActive']) {\n        padding: 0 22px 9px;\n        /* 点击切换动效（2026-10-15 用户指定，官方三路并行渐变里可迁移的两路）：\n           文字色 + 滑移各 .2s ease（官方时长/缓动对）。洗面与箭头已经由\n           ::before 的 opacity 过渡承担，分隔线交叉淡入由 ::after 承担。\n           text-indent 是布局属性——原则上只动合成器属性，这里是**所有者\n           指定的已登记例外**（测量记录见 engineering-notes「页签切换动画的\n           布局代价」）：重排范围是页签一行两个小按钮，切换风暴（8.3 次/秒\n           持续 4 秒）下 Layout 7.9 ms/s ≈ 每帧 0.13ms、每次切换总布局 ≈0.95ms\n           摊在 200ms 的 12 帧上；基线（无过渡）1.2 ms/s。动画只在类翻转时\n           发生、指针扫过不触发，自然切换频率（秒级一次）摊薄后 <0.1 ms/s。\n           !important 压过全局 button{transition:none}。 */\n        transition: color .2s ease, text-indent .2s ease !important;\n      }\n      [class$='_centerCol'] [class$='_tabs'] [class$='_tabActive'] {\n        text-indent: -13px;\n      }\n      /* 分隔线底座：每个页签的 ::after 都预建线盒（1.5×18、border-l1），\n         常态 opacity 0——app 原生选中底线（.tabActive::after 的 accent 底\n         与 left:0/right:0/bottom:-1px/height:2px 几何）被这里的几何+底色\n         整体改写取代（旧「background:0 0 清底线」规则已并入本条）。预建\n         盒子后，切换只是同一条沟两侧宿主的交叉淡入淡出，零「创造几何」\n         代价（与角标/指示线同一门派）。 */\n      [class$='_centerCol'] [class$='_tabs'] :is([class$='_tab'],[class$='_tabActive'])::after {\n        content: '';\n        position: absolute;\n        top: 0;\n        width: 1.5px;\n        height: 18px;\n        background: var(--dsw-alias-border-l1);\n        opacity: 0;\n        transition: opacity .2s ease;\n      }\n      [class$='_centerCol'] [class$='_tabs'] :is([class$='_tab'],[class$='_tabActive'])::before {\n        content: '';\n        position: absolute;\n        /* 几何外扩：应用页签原生零水平内边距，上一版 inset:0 的洗面「刚刚把\n           文字罩下来」（用户实测）；现在 padding 22px 已给盘内呼吸位，负偏移\n           −12px 再把盘子边缘衬出字外（官方盘沿永远在字外），上 −4px，bottom\n           5px 止于分划线上方。倒角 2px：官方 4px/60px 盒按 0.46 缩放——伪元素\n           不在全局直角化清单（[class] 只命中元素），可安全使用。 */\n        left: -12px;\n        right: -12px;\n        top: -4px;\n        bottom: 5px;\n        border-radius: 2px;\n        background-color: rgba(0, 0, 0, 0.04);\n        opacity: 0;\n        transition: opacity .2s ease;\n        pointer-events: none;\n      }\n      [class$='_centerCol'] [class$='_tabs'] :is([class$='_tab'],[class$='_tabActive']):hover::before {\n        opacity: 1;\n      }\n      /* 激活 = 深一档洗面常亮 + 官方圆形箭头（⌀16px，纸白圆 + 灰山形箭头，\n         官方 arrow ⌀2.3rem/#fafafa/#999 按 0.46 折算）。箭头作为 ::before 的\n         背景图层挂在 right 3px：随盘子一起由 opacity 渐显（class 翻转触发\n         ::before 的过渡），无需第三个伪元素。悬停规则只写 opacity、激活\n         规则只写底色与图层——不同属性，无特异性之争。 */\n      [class$='_centerCol'] [class$='_tabs'] [class$='_tabActive']::before {\n        background-color: rgba(0, 0, 0, 0.09);\n        background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='8' fill='%23f5f5f0'/%3E%3Cpath d='M6.2 4.4l3.6 3.6-3.6 3.6' fill='none' stroke='%239a9d98' stroke-width='1.6'/%3E%3C/svg%3E\");\n        background-repeat: no-repeat;\n        background-position: right 3px center;\n        background-size: 16px 16px;\n        opacity: 1;\n      }\n      /* 官方竖分隔线（#d9d9d9 × 0.1875/2.5rem → 1.5×18px，缩放后），沟中心\n         居于相邻盘子之间。绘制归属（官方是独立 DOM 元素，这里借 ::after）：\n         · 非首个、非激活的页签：点亮自己的左沟线；\n         · 首个页签闲置且紧邻的下一个是激活页签（:has(+…)）：它的左沟线\n           无人画（激活侧 ::after 保持熄灭），由它自己点亮右沟线。\n         恰好覆盖两页签的全部组合；若上游未来放第三个页签，最坏情形是\n         激活页签左邻缺一条线（登记为已知边界）。分支只写定位与\n         opacity——线盒在底座已预建，切换零几何创建、只做交叉淡入。 */\n      [class$='_centerCol'] [class$='_tabs'] :is([class$='_tab'],[class$='_tabActive']):not(:first-child):not([class$='_tabActive'])::after {\n        left: -18.75px;\n        right: auto;\n        opacity: 1;\n      }\n      [class$='_centerCol'] [class$='_tabs'] :is([class$='_tab'],[class$='_tabActive']):first-child:not([class$='_tabActive']):has(+ [class$='_tabActive'])::after {\n        left: auto;\n        right: -18.75px;\n        opacity: 1;\n      }\n      /* 减效降级：切换动画全部关闭（含 text-indent 滑移与两条伪元素的淡入），\n         只保留瞬时状态翻转——本主题自加（官网无此降级，已登记分歧）。 */\n      @media (prefers-reduced-motion: reduce) {\n        [class$='_centerCol'] [class$='_tabs'] :is([class$='_tab'],[class$='_tabActive']) {\n          transition: none !important;\n        }\n        [class$='_centerCol'] [class$='_tabs'] :is([class$='_tab'],[class$='_tabActive'])::before,\n        [class$='_centerCol'] [class$='_tabs'] :is([class$='_tab'],[class$='_tabActive'])::after {\n          transition: none;\n        }\n      }\n      /* 暗色无洗面/箭头：近黑底的等档白洗落在噪声地板（评审实测），文字提亮\n         承担悬停；分隔线保留（结构元素，border-l1 暗档 #343633 对墨底 1.55:1，\n         装饰区间内）。text-indent 暗色保留——无箭头时它是激活态的轻量位移信号。 */\n      body[data-ds-dark-theme] [class$='_centerCol'] [class$='_tabs'] :is([class$='_tab'],[class$='_tabActive'])::before {\n        display: none;\n      }\n      body[data-ds-dark-theme] [class$='_centerCol'] [class$='_tabs'] [class$='_tabActive'] {\n        color: var(--dsw-alias-label-primary, #f5f5f0);\n      }\n\n      /* ---------- Workspace browser rows (ui-sidebar) ---------- */\n      /* Hash-free rebuild of the old .YDXeBa_* rules: those class names are\n         '<hash>_suffix' CSS-module exports and 0.1.2-rc.1 rehashed every module,\n         killing all 33 pinned hashes. Matching survives on the SEMANTIC suffix\n         ('_sessionRow' etc.), scoped to the sidebar column — '_slot'/'_row' style\n         suffixes are too generic to match bare, but the sidebar column suffix is\n         unique to the layout frame (same hook findAppFrame()\n         already rely on). Compound states match on substrings, NOT [class$=]: a\n         suffix match needs the WHOLE class attribute to end with the string, so\n         'x_sessionRow x_selected' would silently miss the second condition.\n         '_unselected' is safe against '_selected' here — the leading underscore\n         breaks the substring. */\n      [class$='_sidebarCol'] [class*='_slot'] {\n        color: var(--dsw-alias-brand-primary) !important;\n      }\n      [class$='_sidebarCol'] [class*='_projectRow']:hover,\n      [class$='_sidebarCol'] [class*='_sessionRow']:hover,\n      [class$='_sidebarCol'] [class*='_sessionRow'][class*='_selected'],\n      [class$='_sidebarCol'] [class*='_searchResultRow']:hover,\n      [class$='_sidebarCol'] [class*='_searchResultRow'][class*='_selected'] {\n        background: rgba(var(--edge-accent-rgb), 0.22) !important;\n      }\n      [class$='_sidebarCol'] [class*='_projectRow']:hover *,\n      [class$='_sidebarCol'] [class*='_sessionRow']:hover *,\n      [class$='_sidebarCol'] [class*='_sessionRow'][class*='_selected'] *,\n      [class$='_sidebarCol'] [class*='_searchResultRow']:hover *,\n      [class$='_sidebarCol'] [class*='_searchResultRow'][class*='_selected'] * {\n        color: var(--edge-accent-ink, #000) !important;\n      }\n      /* ---------- Light mode: workspace folder / icon buttons ink ---------- */\n      body:not([data-ds-dark-theme]) [class$='_sidebarCol'] [class*='_folder'],\n      body:not([data-ds-dark-theme]) [class$='_sidebarCol'] [class*='_chevron'],\n      body:not([data-ds-dark-theme]) [class$='_sidebarCol'] [class*='_arrow'],\n      body:not([data-ds-dark-theme]) [class$='_sidebarCol'] [class*='_iconButton'],\n      body:not([data-ds-dark-theme]) [class$='_sidebarCol'] [class*='_searchButton'],\n      body:not([data-ds-dark-theme]) [class$='_sidebarCol'] [class*='_clearButton'] {\n        color: var(--edge-accent-ink, #101110) !important;\n      }\n      /* ---------- Dark mode: solid signal-yellow inversions ---------- */\n      body[data-ds-dark-theme] [class$='_sidebarCol'] [class*='_projectRow']:hover,\n      body[data-ds-dark-theme] [class$='_sidebarCol'] [class*='_sessionRow']:hover,\n      body[data-ds-dark-theme] [class$='_sidebarCol'] [class*='_sessionRow'][class*='_selected'],\n      body[data-ds-dark-theme] [class$='_sidebarCol'] [class*='_searchResultRow']:hover,\n      body[data-ds-dark-theme] [class$='_sidebarCol'] [class*='_searchResultRow'][class*='_selected'] {\n        background: var(--edge-accent) !important;\n      }\n      body[data-ds-dark-theme] [class*='badge' i]:hover,\n      body[data-ds-dark-theme] [class*='badge' i][data-active] {\n        background: var(--edge-accent) !important;\n      }\n      /* ---------- Dark mode: icon buttons (plus / ellipsis / stop / actions) ---------- */\n      /* The cordis approval trio is EXCLUDED here. Those three buttons carry their own\n         solid fill (signal yellow for approve, error red for decline) from the approval\n         block below, so a signal-yellow glyph renders yellow-on-yellow — an invisible\n         check. A 'body[data-ds-dark-theme] [attr]' selector (0,2,1) also outranks the\n         plain '[data-cordis-approve]' (0,1,0) rules below, so source order cannot undo it:\n         the exclusion has to happen in this selector. Their ink is set below. */\n      body[data-ds-dark-theme] [class$='_iconButton'],\n      body[data-ds-dark-theme] [data-cordis-switch],\n      body[data-ds-dark-theme] [class*='actionButton' i]:not([data-cordis-approve]):not([data-cordis-approve-plugin]):not([data-cordis-decline]) {\n        color: var(--edge-status-dark, var(--edge-accent)) !important;\n      }\n      body[data-ds-dark-theme] [class$='_iconButton']:hover:not(:disabled),\n      body[data-ds-dark-theme] [data-cordis-switch]:hover:not(:disabled),\n      body[data-ds-dark-theme] [class*='actionButton' i]:not([data-cordis-approve]):not([data-cordis-approve-plugin]):not([data-cordis-decline]):hover:not(:disabled) {\n        color: var(--edge-accent-ink, #000) !important;\n        background: var(--edge-accent) !important;\n      }\n      /* ---------- Cordis approval buttons (allow once / allow plugin / decline) ---------- */\n      /* Each button is a solid chip, so its glyph must contrast with its OWN fill:\n         black check on signal yellow, white X on error red. The icons are\n         fill=\"currentColor\" svg paths, so 'color' alone drives the glyph — but the\n         svg/path are also targeted explicitly, because any inherited-color rule that\n         wins on a descendant would otherwise repaint the glyph and hide it again. */\n      [data-cordis-approve],\n      [data-cordis-approve-plugin],\n      [data-cordis-approve] svg,\n      [data-cordis-approve-plugin] svg,\n      [data-cordis-approve] svg path,\n      [data-cordis-approve-plugin] svg path {\n        color: var(--edge-accent-ink, #101110) !important;\n        fill: currentColor !important;\n      }\n      [data-cordis-approve],\n      [data-cordis-approve-plugin] {\n        background: var(--edge-accent) !important;\n      }\n      [data-cordis-decline],\n      [data-cordis-decline] svg,\n      [data-cordis-decline] svg path {\n        color: #fff !important;\n        fill: currentColor !important;\n      }\n      [data-cordis-decline] {\n        background: var(--dsw-alias-state-error-primary) !important;\n      }\n      /* The second check of the double-check icon is dimmed to .7 opacity by the panel's\n         own stylesheet; on the solid chip keep both strokes at full ink. */\n      [data-cordis-approve-plugin] [class$='_doubleCheck'] svg {\n        opacity: 1 !important;\n      }\n      [data-cordis-approve]:hover:not(:disabled),\n      [data-cordis-approve-plugin]:hover:not(:disabled) {\n        background: var(--edge-accent-deep) !important;\n      }\n      [data-cordis-decline]:hover:not(:disabled) {\n        background: #d6281d !important;\n      }\n      /* ---------- Tables: bright signal-yellow hover (reference .data-table) ---------- */\n      [class*='tableScroll' i] th,\n      [class*='table' i] th {\n        background: var(--edge-soft) !important;\n        border-bottom-color: var(--edge-line) !important;\n      }\n      [class*='tableScroll' i] td,\n      [class*='table' i] td {\n        border-bottom-color: var(--edge-line) !important;\n      }\n      tbody tr:hover,\n      tbody tr:hover *,\n      [class*='table' i] tbody tr:hover,\n      [class*='table' i] tbody tr:hover *,\n      [class*='tableScroll' i] tbody tr:hover,\n      [class*='tableScroll' i] tbody tr:hover * {\n        color: var(--dsw-alias-label-primary) !important;\n        background: color-mix(in srgb, var(--edge-accent) 15%, var(--dsw-alias-bg-base)) !important;\n        /* 染色只许落在 padding-box 里。上游 markdown 链接用「3px 透明左边框 +\n           margin-left:-3px」白嫖 3px 点击区（ui-chat 的 ._markdown a，几何见\n           test/motion-check.js 夹具里的 .x_mdScroll）：盒子比单元格内容盒左探\n           3px，而 background 默认按 border-box 绘制、又是隔着透明边框透出来\n           的——于是悬停染上的行底色正好盖住行左缘那条 3px 信号条，在链接\n           （首列就是项目名 + 图标链接）那一行的高度上把竖线啃掉一段，看起来\n           就是「图标和黄色高亮竖线之间有缺口」。裁到 padding-box 后，链接\n           的透明边框区不再参与绘制，信号条完整；行自身的染色同理（bar 是\n           不透明边框，画在背景之上，裁掉边下的底色不可见）。\n           不能只给链接清底（background: transparent）：上游只要再给别的内联\n           元素加同样的负 margin 盒子就复发，这条是结构约束。 */\n        background-clip: padding-box !important;\n      }\n      /* Row hover keeps the accent tint; ::selection is scheme-gray in every\n         palette (see the selection block), so the two stay distinct by texture. */\n      /* ---------- New session button (sidebar) ---------- */\n      [class$='_newSession'] {\n        color: var(--edge-accent-ink, #000) !important;\n        background: var(--edge-accent) !important;\n        /* TRANSPARENT, not accent-matched: the border paints ABOVE the\n           background, and the upstream button carries .5px of it. An\n           accent-matched border is invisible against the fill but still\n           COVERS the material band with a flat hairline (at DPR>=2 that is\n           a whole device pixel) between the ink and the true edge —\n           measured at DPR 2: the outermost 1-2 device rows/columns of the\n           band rendered flat 217 with zero ink. Transparent keeps the\n           identical look (same fill shows through) and lets the ink reach\n           the edge. */\n        border-color: transparent !important;\n      }\n      body:not(.theme-endfield-round) [class$='_newSession'] {\n        border-radius: 0 !important;\n      }\n      [class$='_newSession']:hover,\n      [class$='_newSession']:focus-visible {\n        color: var(--edge-accent-ink, #000) !important;\n        background: var(--edge-accent-deep) !important;\n        /* Same reason as the resting state: keep the border from covering\n           the material band at the edges. */\n        border-color: transparent !important;\n      }\n      [class$='_newSession'] svg {\n        color: var(--edge-accent-ink, #000) !important;\n      }\n      [class$='_newSessionLabel'] {\n        color: var(--edge-accent-ink, #000) !important;\n      }\n      /* ---------- 侧栏面板行（插件 / 自动化任务）：淡黄 wash → 划词灰 ----------\n         Owner trial (2026-10-16): these panel entries showed a pale-yellow\n         wash (their active/hover state reads --dsw-alias-interactive-bg-hover,\n         which this theme maps to a 16% accent wash) right below a solid-\n         yellow 设置 trigger — an inconsistent half-signal. Official grammar\n         says hover/selected is grayscale (research §三), so use the 划词灰\n         pair (light #d9d9d9 ink-on-gray / dark #6a6a6a white-on-gray), the\n         same pair the menu current-items use. Scoped to the sidebar column;\n         the label keeps label-primary, which is the designed ink for both\n         fills (16.8:1 / 5.4:1). */\n      [class$='_sidebarCol'] [class*='_panelRow']:hover,\n      [class$='_sidebarCol'] [class*='_panelRow'][class*='_panelActive'] {\n        background: var(--edge-select-fill) !important;\n      }\n      /* ---------- Badge hover: signal-yellow inversion (reference .kpi:hover) ---------- */\n      [class*='badge' i]:hover,\n      [class*='badge' i]:hover *,\n      [class*='badge' i][data-active],\n      [class*='badge' i][data-active] * {\n        color: var(--edge-accent-ink, #000) !important;\n      }\n      /* ---------- Cordis action buttons (run/stop) ---------- */\n      /* Approval chips excluded again: they already own a solid fill, and this blanket\n         hover would repaint the decline chip yellow and re-tint the approve glyphs. */\n      [data-cordis-switch]:hover:not(:disabled),\n      [class*='actionButton' i]:not([data-cordis-approve]):not([data-cordis-approve-plugin]):not([data-cordis-decline]):hover:not(:disabled) {\n        color: var(--edge-accent-ink, #000) !important;\n        background: var(--edge-accent) !important;\n      }\n      body:not(.theme-endfield-round) [data-cordis-switch],\n      body:not(.theme-endfield-round) [class*='actionButton' i] {\n        border-radius: 999px !important;\n      }\n      /* ---------- Session header actions (agent preset / subagent / jobs) ---------- */\n      [class$='_trigger']:hover:not(:disabled),\n      [class$='_trigger'][aria-expanded='true'],\n      [class$='_trigger']:focus-visible {\n        color: var(--edge-accent-ink, #000) !important;\n        background: var(--edge-accent) !important;\n      }\n      /* ---------- Agent-preset header chip: accent fill, stock geometry ---------- */\n      /* Hash-free scope for the old .SVAs4q_label: the chip is the preset label the\n         agent-preset plugin registers into the \"conversation.session.header.actions\"\n         slot. A bare [class*='_label'] is PROHIBITED here: it was tried first and it\n         yellowed plain list labels (产物 / settings / jobs names), which is why this\n         was hash-pinned in the first place.\n\n         DOM measured off the running 0.1.5-rc.2 GUI (not inferred):\n\n           div.pI_x6G_centerCol\n             > header.wSkVaW_header\n                 > div.wSkVaW_titleRow\n                   > div.wSkVaW_titleCluster\n                     > div.wSkVaW_headerActions\n                       > div                  <- the slot's own entry wrapper.\n                         > span.SVAs4q_label     It has NO class at all, so it\n                           > svg.SVAs4q_icon     cannot be named either.\n\n         Two silent-failure lessons are baked in here — a selector that matches\n         nothing reports nothing, so both cost a shipped bug:\n           1. The chip is NOT a child of _header; it is four levels down. Every '>'\n              between the header and the chip encodes how many wrappers upstream\n              happens to render, and upstream has now added wrappers twice.\n           2. The chip's own parent is a class-less wrapper, so the depth cannot be\n              collapsed onto a named container either.\n         The scope therefore STOPS at the actions container and the chip is picked\n         out by a property of the chip itself: it is the only _label in that slot\n         carrying an icon. The jobs rows render text-only _label spans and the\n         schedule module declares no _label local at all, so the scope still does\n         exactly what it exists for. */\n      [class$='_centerCol'] [class$='_header'] [class$='_headerActions'] [class*='_label']:has(> svg) {\n        color: var(--edge-accent-ink, #000) !important;\n        background: var(--edge-accent) !important;\n        padding: 0 12px !important;\n      }\n      body:not(.theme-endfield-round) [class$='_centerCol'] [class$='_header'] [class$='_headerActions'] [class*='_label']:has(> svg) {\n        border-radius: 0 !important;\n      }\n      [class$='_centerCol'] [class$='_header'] [class$='_headerActions'] [class*='_label']:has(> svg) svg,\n      [class$='_centerCol'] [class$='_header'] [class$='_headerActions'] [class*='_label']:has(> svg) [class*='_icon'] {\n        opacity: 1 !important;\n        color: var(--edge-accent-ink, #000) !important;\n      }\n      /* DELIBERATELY NOT STRETCHED. This rule used to carry flex:1 1 auto and\n         max-width:none, and an earlier attempt of this fix also flattened the slot\n         wrapper (display:contents) and grew _headerActions, to reproduce the old\n         \"chip fills the action row\" look. On the real 0.1.5-rc.2 header that turns\n         the chip into a full-width yellow BAR across the top of the conversation\n         (measured: 923px of a 976px row) — nothing like the stock chip it is\n         replacing, and reported straight back as \"现在变成一个长条了\".\n         The theme's job here is the ACCENT, not the geometry: the chip keeps its\n         stock size/hit area (height, 180px cap and ellipsis included) and only its\n         colours change. Everything that made it grow is gone — do not reintroduce\n         flex/max-width/display overrides without looking at it on the real page. */\n      /* ---------- 智能体团队展开看板（agent-team board） ----------\n          上游 dsh-experimental-client-ui-agent-team 的 CSS 模块类带哈希\n          （VoX2oq_*），按本仓库规则一律不碰：锚点只用该包自带的稳定\n          data 属性——根/触发器 data-team-action、portal 到 body 的面板\n          data-team-panel；面板内部的成员卡/任务卡/计数用语义后缀\n          （[class$='_member'] 等）匹配，重哈希不影响。\n          面板底面（--dsw-specific-menu）已被令牌层换成不透明纸面\n          （--dsw-menu-surface-fill 覆写），直角由全局 [class] 规则自动\n          处理，触发器悬停已被全局 [class$='_trigger'] 实心强调规则覆盖\n          ——这里只补令牌管不到的四件。 */\n\n      /* 1. 浮层家族对齐：上游 elevation-stroke 是 1px alpha 细线，在纸面\n             上几乎不可见。换成主题浮层统一配方（与设置下拉、tooltip 同款）：\n             0.5px 重线 ring + 官方 Dropdown_panel 软阴影（1.25rem→10px）。\n             特异性 body 前缀 (0,1,1) 高于面板哈希类 (0,1,0)，不依赖注入\n             顺序。 */\n      body [data-team-panel] {\n        box-shadow: 0 0 10px rgba(0, 0, 0, .25), 0 0 0 0.5px var(--dsw-alias-border-l2);\n      }\n      body[data-ds-dark-theme] [data-team-panel] {\n        box-shadow: 0 0 10px rgba(0, 0, 0, .5), 0 0 0 0.5px var(--dsw-alias-border-l1);\n      }\n\n      /* 2. 分组标题（成员 / 任务）挂官方三色信号线 decoLine：与设置页\n             分组标题、交付物卡底边同一条 linear-gradient（紫:黄:绿 =\n             1:1:4 的官方比例停靠，见 design-language「背景纹理」一节）。\n             h3 本身 display:flex，与设置页分组标题同理不能当 flex 子项，\n             绝对定位到标题底部整宽；h3 自带 8px 下 margin，再加 7px\n             padding 让线离开字形。静态、无动画、pointer-events 关闭，\n             不属于会话列底纹（prefers-reduced-transparency 不需要让位：\n             线本身不透明，不是纹理层）。 */\n      body [data-team-panel] h3 {\n        position: relative;\n        padding-bottom: 7px;\n      }\n      body [data-team-panel] h3::after {\n        content: '';\n        position: absolute;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        height: 2px;\n        pointer-events: none;\n        background-image: linear-gradient(90deg,#ff00f0 16.6667%,#fffa00 0,#fffa00 33.4259%,#00ffa2 0);\n      }\n\n      /* 3. 数字等宽（设计语言第 3 条）：成员数/任务数计数、任务卡 meta\n             （任务 id、阻塞关系）与状态行都是会跳动的数字文本。 */\n      body [data-team-panel] [class$='_count'],\n      body [data-team-panel] [class$='_meta'],\n      body [data-team-panel] [class$='_taskState'] {\n        font-variant-numeric: tabular-nums;\n      }\n\n      /* 4. 成员卡悬停 = 官网灰阶洗面（SubpageTab 家族，非黑遮罩）：\n             亮色 rgba(0,0,0,.04) 在沉底块 #dcddd6 上合成 1.09:1，正好\n             官方 #f3f3f3 悬停步；暗色近黑底上白洗落在噪声地板（文档化\n             结论），改走「沉底块抬一档」——layer-3 (#2c2e2a) 对 layer-2\n             (#1e201d) 1.20:1，与官方激活步同档。底色渐变挂在基础规则上\n             （官网语法：transition 不写在状态规则里）；上游 stock 悬停\n             只换 box-shadow 描边色，本规则特异性 (0,4,1) 压过哈希类的\n             (0,3,0)，只接管 background 一件，描边照旧。当前会话卡\n             （_memberCurrent）是 disabled，:not(:disabled) 天然排除。 */\n      body [data-team-panel] [class$='_member'] {\n        transition: background-color .2s ease;\n      }\n      body [data-team-panel] [class$='_member']:not(:disabled):hover,\n      body [data-team-panel] [class$='_member']:not(:disabled):focus-visible {\n        background: rgba(0, 0, 0, 0.04);\n      }\n      body[data-ds-dark-theme] [data-team-panel] [class$='_member']:not(:disabled):hover,\n      body[data-ds-dark-theme] [data-team-panel] [class$='_member']:not(:disabled):focus-visible {\n        background: var(--dsw-alias-bg-layer-3, #2c2e2a);\n      }\n\n      /* 5. 底部斜纹带：官方 shallowBg 的同款复刻，按看板体量缩一条。\n             会话列那条带是 32.8125rem 高；看板最宽 500px、最高 680px，\n             取 min(9rem, 40%)——高板 144px、矮板（compact 单人态）按\n             40% 封顶。纹路周期（.75rem）与停靠值（13.95…/36.05…%）照\n             官方原文，颜色复用纹理令牌 --edge-tex-hatch-color（亮 5% 墨 /\n             暗 6% 纸白），0° 单遮罩「底边最实、往上渐隐」同官方。\n             画面上它只在卡片之间的空隙与面板底部露出——成员卡/任务卡\n             是不透明沉底块，天然盖住自己身后的纹。\n             叠放：面板自带 z-index:100 已建层叠上下文，::after 取\n             z-index:-1 与上游 ::before（纸面层）同层、按树序画在其上、\n             在全部内容之下；伪元素无占用（bundle 全量查过：面板只有\n             :before）。开关跟随纹理总开关：按值匹配 subtle/standard 两档\n             （off 不画），prefers-reduced-transparency / more contrast 下\n             display:none——与列底纹同一条降级路径。静态、无动画。合成\n             对比度：亮 1.10:1 / 暗 1.16:1（palette-contrast 10f 段实算），\n             与会话列底纹（1.10–1.19:1）同档装饰区间。 */\n      body[data-endfield-texture='subtle'] [data-team-panel]::after,\n      body[data-endfield-texture='standard'] [data-team-panel]::after {\n        content: '';\n        position: absolute;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        top: calc(100% - min(9rem, 40%));\n        z-index: -1;\n        pointer-events: none;\n        background-image: repeating-linear-gradient(-45deg,\n          transparent 0 13.9512529279%,\n          var(--edge-tex-hatch-color) 13.9512529279% 36.0487470721%,\n          transparent 36.0487470721% 50%,\n          transparent 50% 63.9512529279%,\n          var(--edge-tex-hatch-color) 63.9512529279% 86.0487470721%,\n          transparent 86.0487470721%);\n        background-size: .75rem .75rem;\n        -webkit-mask-image: linear-gradient(0deg, rgb(0,0,0) 0, rgb(0,0,0) 50%, rgba(0,0,0,0));\n        mask-image: linear-gradient(0deg, rgb(0,0,0) 0, rgb(0,0,0) 50%, rgba(0,0,0,0));\n      }\n      @media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {\n        body[data-endfield-texture] [data-team-panel]::after {\n          display: none;\n        }\n      }\n";

// src/styles/surfaces.css?raw
	var surfaces_default = "      /* ================= dark compaction notice + residual blues ================= */\n      /* Dark mode: warm label grays (compaction notice title/summary/sep used bluish defaults) */\n      body[data-ds-dark-theme] {\n        --dsw-alias-label-tertiary: #9a9d98;\n        --dsw-alias-label-caption: #a4a6a1;\n        --dsw-alias-label-dimmed: #70736f;\n        --dsw-alias-label-primary-dimmed: #d8d9d5;\n        --dsw-alias-label-primary-inverted: #101110;\n      }\n      /* Preset menu descriptions readable without hover in dark */\n      body[data-ds-dark-theme] [class$='_itemDesc'] {\n        color: #c5c7c2 !important;\n      }\n      /* Light + dark: warm the remaining bluish-gray surfaces / buttons / code blocks */\n      body {\n        --dsw-alias-bg-layer-3: #dcddd6;\n        --dsw-alias-bg-module-platform: #f2f2ec;\n        --dsw-alias-markdown-code-block: #ecece6;\n        --dsw-alias-button-elevated-fill: #f2f2ec;\n        --dsw-alias-button-floating-fill: #f2f2ec;\n        --dsw-alias-button-floating-hover: #e8e8e2;\n        --dsw-alias-button-ghost-active-fill: #dcddd6;\n        --dsw-alias-button-ghost-active-hover: #d8d9d5;\n        --dsw-alias-button-ghost-active-border: #b6b8b3;\n        --dsw-alias-button-primary-hover: #2a2b28;\n        --dsw-alias-button-contrast-fill: #3a3c38;\n        /* 浮层提示气泡（正常路径在 overrideTokens，这里是无 presenter 环境的兜底） */\n        --dsw-alias-tooltip-bg: #f2f2ec;\n        --dsw-alias-tooltip-key-bg: #dcddd6;\n        --dsw-specific-input-major: #f2f2ec;\n        --dsw-specific-selector: #e8e8e2;\n        --dsw-specific-tip: #e8e8e2;\n        --dsw-static-blue-400: #757874;\n        --dsw-static-blue-450: var(--edge-accent);\n        --dsw-static-blue-500: #101110;\n        --dsw-alias-label-quaternary: #6a6d68;\n        --dsw-alias-label-error: #ff3b30;\n        --dsw-alias-label-inverse: #101110;\n        --dsw-alias-line-secondary: #d8d9d5;\n        --dsw-alias-separator-primary: #9a9d98;\n        --dsw-alias-border-secondary: #b6b8b3;\n        --dsw-alias-bg-primary: #f2f2ec;\n        --dsw-alias-interactive-bg-primary: var(--edge-accent);\n        --dsw-alias-fill-l2: #dcddd6;\n        --dsw-alias-fill-tsp-secondary: #dcddd6;\n      }\n      body[data-ds-dark-theme] {\n        --dsw-alias-bg-layer-3: #2c2e2a;\n        --dsw-alias-bg-module-platform: #2c2e2a;\n        --dsw-alias-bg-layer-2: #1e201d;\n        --dsw-alias-markdown-code-block: #181a18;\n        --dsw-alias-button-elevated-fill: #3a3c38;\n        --dsw-alias-button-floating-fill: #343633;\n        --dsw-alias-button-floating-hover: #3a3c38;\n        --dsw-alias-button-ghost-active-fill: #343633;\n        --dsw-alias-button-ghost-active-hover: #3f413d;\n        --dsw-alias-button-ghost-active-border: #5f6460;\n        --dsw-alias-button-primary-hover: var(--edge-accent-deep);\n        --dsw-alias-button-contrast-fill: #f5f5f0;\n        /* 浮层提示气泡（同上，兜底层） */\n        --dsw-alias-tooltip-bg: #1c1e1c;\n        --dsw-alias-tooltip-key-bg: #2c2e2a;\n        --dsw-specific-input-major: #202220;\n        --dsw-specific-selector: #2c2e2a;\n        --dsw-specific-tip: #2c2e2a;\n        --dsw-static-blue-400: #9a9d98;\n        --dsw-static-blue-450: var(--edge-accent);\n        --dsw-static-blue-500: #f5f5f0;\n        --dsw-alias-label-quaternary: #9a9d98;\n        --dsw-alias-label-error: #ff6b61;\n        --dsw-alias-label-inverse: #101110;\n        --dsw-alias-line-secondary: #343633;\n        --dsw-alias-separator-primary: #70736f;\n        --dsw-alias-border-secondary: #4a4d49;\n        --dsw-alias-bg-primary: #181a18;\n        --dsw-alias-interactive-bg-primary: var(--edge-accent);\n        --dsw-alias-fill-l2: #242624;\n        --dsw-alias-fill-tsp-secondary: #242624;\n      }\n      /* Token meter: messages segment signal yellow, system warm gray (tools keeps purple)\n         Both suffixes are unique to the ContextMeter component, so a bare substring\n         match is safe (hash-pinned .JObwrW_* died in the 0.1.2-rc.1 rehash). */\n      [class*='_colorMessages'] {\n        --meter-tint: var(--edge-accent) !important;\n      }\n      [class*='_colorSystem'] {\n        --meter-tint: #9a9d98 !important;\n      }\n      /* Appearance theme cube selected border: warm.\n         '_selected' as a bare substring is safe-ish BECAUSE the rule only sets\n         border-color: an element without a border is untouched, and any bordered\n         selected element gets the warm line colour — which is the theme's\n         de-blue-ing goal everywhere anyway. In dark mode the broad accent rule\n         further down (0,2,0 specificity) outranks this and keeps its own colour. */\n      [class*='_selected'] {\n        border-color: var(--dsw-alias-border-l2) !important;\n      }\n      /* Hero preview badge: solid signal-yellow + black (reference accent chip).\n         '_previewBadge' is unique to the hero shell (HeroShell on 0.1.2-rc.1). */\n      [class*='_previewBadge'] {\n        color: var(--edge-accent-ink, #101110) !important;\n        background: var(--edge-accent) !important;\n        border-color: var(--edge-accent) !important;\n      }\n      /* ---------- Hero backdrop glow: brand blue -> signal yellow ----------\n         The empty-conversation hero paints one large blurred ellipse behind the\n         composer card (ConversationRoot's <HeroGlow>, class *_heroGlow, figma\n         313:14109; feGaussianBlur stdDeviation 50, ellipse 135% of the column\n         width centred 92px above its bottom edge).\n         Its colour is an SVG PRESENTATION ATTRIBUTE — fill=\"#6187D8\"\n         fill-opacity=\"0.08\" — not a token, so the whole \"neutralize remaining\n         DeepSeek brand blues\" variable block above could never reach it: a soft\n         periwinkle haze survived the theme on that one page. A presentation\n         attribute loses to ANY author CSS declaration, so restyling the ellipse\n         here is sufficient and no app source is touched.\n\n         Opacity is per scheme, and the two values are MEASURED, not picked: the\n         app's exact glow svg was rendered headless over each --dsw-alias-bg-base\n         and the ellipse core sampled, so the replacement can be matched to the\n         presence of the glow it replaces (Y = 0.2126R+0.7152G+0.0722B):\n           light #e8e8e2 (Y 231.5): 8% #6187D8 -> #DDE0E1 (Y 223.3, -8.2)\n                                    8% #fff500 -> #E9E8D0 (Y 230.4, -1.1)\n           dark  #101110 (Y  16.8): 8% #6187D8 -> #161A1F (Y  25.0, +8.2)\n                                    5% #fff500 -> #1C1C0F (Y  27.1, +10.3)\n         Light keeps 8%: yellow there is almost luminance-NEUTRAL and shifts only\n         chroma (blue channel -18), i.e. a warm breath on the paper rather than\n         the blue's grey-blue darkening — gentler than what it replaces, not\n         louder. Dark had to come down from 8%/7%: over near-black, added\n         luminance reads far more readily than subtracted blue does over cream\n         (7% measured #20200E, Y +13.4 — about 1.6x the blue's lift), and 5%\n         lands within ~2 Y of the original glow. So the hero keeps exactly the\n         depth it had, in the theme's own accent.\n         Matched on the '_heroGlow' CSS-module suffix, never on a build hash.\n         NOTE: 0.1.2-rc.1 removed the glow SVG entirely (the hero was merged into\n         ConversationRoot with no <HeroGlow>), so these rules match nothing there;\n         they are kept as a self-healing hook in case upstream restores it. */\n      [class*='_heroGlow'] ellipse {\n        fill: var(--edge-signal, var(--edge-accent)) !important;\n        fill-opacity: var(--edge-glow-light) !important;\n      }\n      body[data-ds-dark-theme] [class*='_heroGlow'] ellipse {\n        fill-opacity: var(--edge-glow-dark) !important;\n      }\n      /* Brand wordmark HARNESS chip: signal-yellow box + black letters (both modes) */\n      body {\n        --dsw-alias-label-primary-inverted: var(--edge-accent-ink, #101110);\n      }\n      [class*='brand'] svg rect,\n      [class$='_newSession'] svg rect {\n        fill: var(--edge-accent) !important;\n      }\n      /* Compaction notice row: soft yellow wash + accent in dark, hover = solid inversion */\n      body[data-ds-dark-theme] [class$='_compactionRow'] {\n        background: rgba(var(--edge-accent-rgb), 0.08) !important;\n        border-left: 2px solid rgba(var(--edge-accent-rgb), 0.55) !important;\n      }\n      body[data-ds-dark-theme] [class$='_compactionButton']:hover:not(:disabled),\n      body[data-ds-dark-theme] [class$='_compactionButton']:focus-visible {\n        background: var(--edge-accent) !important;\n      }\n      body[data-ds-dark-theme] [class$='_compactionButton']:hover *,\n      body[data-ds-dark-theme] [class$='_compactionButton']:focus-visible * {\n        color: var(--edge-accent-ink, #000) !important;\n      }\n      body[data-ds-dark-theme] [class$='_compactionButton']:hover [class$='_compactionSep'],\n      body[data-ds-dark-theme] [class$='_compactionButton']:focus-visible [class$='_compactionSep'] {\n        background: var(--edge-accent-ink, #000) !important;\n      }\n      /* ================= composer add (+) button ================= */\n      /* Dark: + icon stays signal yellow at REST (a quiet accent, see below);\n         hover is the scheme-gray selected-text fill. Light mode only needs the\n         hover half (the app's own hover already pairs with label-primary).\n         reason: the hook is a bare SUBSTRING ('_add'), so every upstream class that\n         merely CONTAINS it was painted too. Audited against the installed bundles\n         (0.1.7-era), the collision set is:\n           RlGAzG_add             composer + button                    <- the target\n           _3nPmjq_addActions     settings > 模型 add-block WRAPPER   <- the report\n           _3nPmjq_addBlock / _addCard / _addModes / _addPanel / _addModelButton\n           _0SbxAa_add            deliverables file-diff ADDED line\n           LFNH1G_added / kuvljq_added / pFy1Ka_diffAdded /\n           haSm5q_promptDiffLineadded\n           qWvkEq_address*        sidebar-browser address bar\n           fO69Vq_addButton / _3nPmjq_addButton   (what the old ':not()' excluded)\n\n         The reported screenshot is the WRAPPER. '_addActions' is a plain <div>\n         around 添加模型提供商, so ':disabled' never applies and pointing at the\n         BUTTON hovers the wrapper as well. The theme filled the wrapper with the\n         SOLID accent while the button kept upstream's translucent wash\n         (rgba(255,245,0,.18)) plus color: label-primary — #f5f5f0 on #fff500 =\n         1.05:1, an invisible label. The button's dashed border kept drawing over\n         the fill, which is exactly what the report shows. Measured on the running\n         build (not inferred): rest -> wrapper transparent, hover -> wrapper\n         rgb(255,245,0) under a button at rgb(245,245,240).\n\n         ':not([class*='_addButton'])' could not have caught it — the wrapper is not\n         the button — and every '*_add*' container upstream adds would have had to be\n         appended to that exclusion list one bug report at a time. Scoping fixes the\n         whole family at once, the same way '_arrow' was fixed.\n\n         The scope is the pair the composer '_primary' / '_arrow' rules already use,\n         so the + keeps its inversion. '[data-composer-seat]' is included because the\n         seat declares it upstream ('data-composer-seat', an e2e anchor): a\n         '[class$=]' hook dies silently the moment upstream appends a second class to\n         that element, which is the failure mode this file has already paid for.\n\n         Note the + is the ONLY composer element whose class contains '_add'; the\n         scope cannot reach the settings wrappers, the diff lines or the address bar.\n         Verified by test/hover-check.js against real hovered pixels in both\n         palettes and both schemes. */\n      /* Dark REST: the + icon stays signal yellow (a quiet accent at rest —\n         --edge-status-dark reads on every dark palette). */\n      body[data-ds-dark-theme] :is([data-composer-seat], [class$='_composerSeat'], [class$='_composerHero']) [class*='_add'] {\n        color: var(--edge-status-dark, var(--edge-accent)) !important;\n      }\n      /* Hover: 划词灰（用户指定：+ 的悬停与模型栏选中一致，用 ::selection 的\n         fill/ink 对，不用实心强调黄——黄只留给发送/停止主按钮）。亮暗两案\n         都写：亮色下上游自己的 hover 底是 --dsw-alias-interactive-bg-hover-solid\n         （本主题映射为实心强调色），同样需要这把灰盖掉。配对与 ::selection\n         同源：亮 #d9d9d9+墨字 13.41:1，暗 #6a6a6a+白字 5.41:1。 */\n      :is([data-composer-seat], [class$='_composerSeat'], [class$='_composerHero']) [class*='_add']:hover:not(:disabled),\n      :is([data-composer-seat], [class$='_composerSeat'], [class$='_composerHero']) [class*='_add']:focus-visible {\n        color: var(--edge-select-ink, #101110) !important;\n        background: var(--edge-select-fill, #d9d9d9) !important;\n      }\n      /* 操作条 chips（插件 / 自动化任务 / 设置 / 工作区内修改 / 模型选择 /\n         智能体团队 / 标准模式 / 后台任务）。各功能包自己的 CSS 模块（哈希\n         类名、分属八个包），但悬停/按下底色**全部**消费\n         --dsw-alias-interactive-bg-* 一族——本主题在 body 上把它映射成强调\n         黄 α 洗，于是整排悬停都是工业黄。用户指定（2026-10-15）：这排 chips\n         改工业灰，与上面的 + 同一对划词灰。\n         实现走**容器内令牌重映射**而非逐 chip 枚举：chips 全部住在输入卡的\n         _tools / _modes / _standardControls 三行（语义后缀；发送键在\n         _trailing，不入列），重映射对整族一次生效——与 + 的「scoping fixes\n         the whole family」同一门派。各 chip 弹出的菜单都 portal 到 body、\n         不在作用域内，菜单行悬停不受影响；自定义属性向下继承，容器声明\n         盖过 body 层的同名令牌。按下（-active）一并换灰，否则点按瞬间会\n         闪一下黄。 */\n      :is([data-composer-seat], [class$='_composerSeat'], [class$='_composerHero']) :is([class$='_tools'], [class$='_modes'], [class$='_standardControls']) {\n        --dsw-alias-interactive-bg-hover: var(--edge-select-fill);\n        --dsw-alias-interactive-bg-hover-solid: var(--edge-select-fill);\n        --dsw-alias-interactive-bg-hover-accent: var(--edge-select-fill);\n        --dsw-alias-interactive-bg-active: var(--edge-select-fill);\n      }\n      /* 配对字色：chips 自身的悬停字色是 label-secondary/tertiary 一档，\n         暗色下压在 #6a6a6a 上只有约 1.7:1——悬停/按下/聚焦时强制换划词灰\n         的配对墨/白（亮 #101110、暗 #ffffff，随模式翻转），不枚举 chip 类名，\n         按行内可交互元素兜底。图标描边走 currentColor，一并换色。 */\n      :is([data-composer-seat], [class$='_composerSeat'], [class$='_composerHero']) :is([class$='_tools'], [class$='_modes'], [class$='_standardControls']) :is(button, select, [role='button'], [role='combobox']):hover:not(:disabled),\n      :is([data-composer-seat], [class$='_composerSeat'], [class$='_composerHero']) :is([class$='_tools'], [class$='_modes'], [class$='_standardControls']) :is(button, select, [role='button'], [role='combobox']):active:not(:disabled),\n      :is([data-composer-seat], [class$='_composerSeat'], [class$='_composerHero']) :is([class$='_tools'], [class$='_modes'], [class$='_standardControls']) :is(button, select, [role='button'], [role='combobox']):focus-visible {\n        color: var(--edge-select-ink, #101110) !important;\n      }\n      /* 还有第二路黄：下面「会话头部动作」的全局 [class$='_trigger'] 悬停规则\n         （实心强调 + !important）没有作用域，把输入卡里所有 *_trigger chips\n         （插件/团队/任务这类带弹出菜单的）也刷成了实心黄——令牌重映射管\n         不到它。这里用更高特异性（(0,7,0) > (0,3,0)）在同三行内把\n         _trigger 收回划词灰对，展开态（aria-expanded，菜单开着时 chip 常亮）\n         一并归灰。头部那些真正的 _trigger 不在本作用域，保持原样。 */\n      :is([data-composer-seat], [class$='_composerSeat'], [class$='_composerHero']) :is([class$='_tools'], [class$='_modes'], [class$='_standardControls']) [class$='_trigger']:hover:not(:disabled),\n      :is([data-composer-seat], [class$='_composerSeat'], [class$='_composerHero']) :is([class$='_tools'], [class$='_modes'], [class$='_standardControls']) [class$='_trigger'][aria-expanded='true'],\n      :is([data-composer-seat], [class$='_composerSeat'], [class$='_composerHero']) :is([class$='_tools'], [class$='_modes'], [class$='_standardControls']) [class$='_trigger']:focus-visible {\n        color: var(--edge-select-ink, #101110) !important;\n        background: var(--edge-select-fill, #d9d9d9) !important;\n      }\n      /* Dark: hardcoded #fff icon on yellow info-fill -> black icon; hover deeper yellow.\n         Scoped to the composer (the seat band in a live conversation, the hero\n         wrapper on the empty state) and to <button>: '_primary' as a bare suffix is\n         too generic to trust with a colour flip anywhere else. */\n      body[data-ds-dark-theme] :is([class$='_composerSeat'], [class$='_composerHero']) button[class*='_primary'] {\n        color: var(--edge-accent-ink, #101110) !important;\n      }\n      body[data-ds-dark-theme] :is([class$='_composerSeat'], [class$='_composerHero']) button[class*='_primary']:hover:not(:disabled) {\n        color: var(--edge-accent-ink, #101110) !important;\n        background: var(--edge-accent-deep) !important;\n      }\n      /* ================= light-mode white-on-dark buttons keep white icon ================= */\n      /* Generic hover inversion would make the white send icon black on the dark fill.\n         (The old list also had .zGbnIq_primaryButton from settings › 模型; upstream\n         removed that class in 0.1.2-rc.1. If a replacement appears, name it here\n         explicitly rather than widening the composer scope.) */\n      body:not([data-ds-dark-theme]) :is([class$='_composerSeat'], [class$='_composerHero']) button[class*='_primary'],\n      body:not([data-ds-dark-theme]) :is([class$='_composerSeat'], [class$='_composerHero']) button[class*='_primary']:hover:not(:disabled) {\n        color: #fff !important;\n      }\n      /* ================= official button material (等高线流线) =================\n         The official base button (.Button_button) carries a 320x72 flowing-line\n         PNG on its ::before: near-black ink (~#090909) at alpha 4-11%, per-row\n         mean alpha rising 14.4 -> 21.1 top to bottom, 63% coverage — faint\n         layered contour lines, visible only on dark fills (the official light\n         branch is the same image with filter: invert(1)). Measured live\n         2026-10-13, spec in docs/endfield-ui-research.md.\n\n         Owner request: 新会话 / 发送 / 提交 / 跳过 carry it, pattern replicated\n         from the official bytes, keeping the official 320:72 proportion, and\n         (2026-10-13 follow-up) the band is FULL HEIGHT and FLUSH RIGHT — no\n         gaps above or below, hugging the right edge; it grows leftward at the\n         intrinsic ratio, so a button wider than the band keeps clean space on\n         the left (that is the \"not covering the whole button\" part, given by\n         the ratio itself rather than a centred 56% patch). Per 素材取最省表达\n         this paints the element's own background-image layer instead of a\n         pseudo (the new-session ::after already belongs to the signal arrow,\n         and the app's own pseudo usage is not ours to take). All four hosts\n         are accent-filled or on paper in both schemes, so the dark-ink image\n         serves both — except 跳过 (an outline button on the card surface),\n         which takes the palette-inverted twin in dark. The theme's own\n         shorthand background rules above reset the image layer, so every\n         state they cover is restated here, after them; disabled buttons stay\n         clean (upstream dims them to .4). */\n      [class$='_newSession'],\n      [class$='_newSession']:hover,\n      [class$='_newSession']:focus-visible,\n      :is([class$='_composerSeat'], [class$='_composerHero']) button[class*='_primary'],\n      :is([class$='_composerSeat'], [class$='_composerHero']) button[class*='_primary']:hover:not(:disabled),\n      [data-question-key] button[class*='_primary'],\n      [data-question-key] button[class*='_primary']:hover:not(:disabled),\n      [data-question-key] button[class*='_outline'],\n      [data-question-key] button[class*='_outline']:hover:not(:disabled) {\n        background-image: var(--edge-btn-tex) !important;\n        background-repeat: no-repeat !important;\n        background-position: right -1px center !important;\n        /* background-origin defaults to the PADDING box: the sidebar's\n           new-session button carries a .5px border, which left a hairline\n           gap on the right/top/bottom (the band was sized to the inner\n           edge). Reference the BORDER box so the ink reaches the true\n           edge, painting under the border strip. */\n        background-origin: border-box !important;\n        /* Bleed 1px past every edge (clipped by the button box itself):\n           whatever the device pixel ratio rounds to, the ink is already\n           there — the last resort against sub-pixel hairlines. The width\n           stays ratio-driven (auto), so 320:72 holds. The material image\n           itself carries a build-time left-fade mask (see\n           scripts/build-texture.js): the official ink starts HARD at\n           x~103/320, which against a flat button fill read as a harsh\n           vertical cut — the mask fades the entry in instead. */\n        background-size: auto calc(100% + 2px) !important;\n      }\n      /* 跳过 sits on the card surface itself: near-black ink would vanish on\n         the dark card, so dark swaps to --edge-btn-tex-inv — the data form of\n         the official invert(1) branch (same alpha, flipped palette). */\n      body[data-ds-dark-theme] [data-question-key] button[class*='_outline'],\n      body[data-ds-dark-theme] [data-question-key] button[class*='_outline']:hover:not(:disabled) {\n        background-image: var(--edge-btn-tex-inv) !important;\n      }\n      /* ================= buttons the theme fills with the SOLID accent =================\n         Settings > 模型 draws its row actions with a '<hash>_secondaryButton'\n         class (zGbnIq_ in the 0.1.1 bundles), whose upstream rule is:\n             color:      var(--dsw-alias-label-primary)\n             background: var(--dsw-alias-interactive-bg-hover-solid)   (on :hover)\n         This theme maps that background token to the solid accent but upstream keeps\n         owning the foreground — so in dark mode the label stayed label-primary\n         (#f5f5f0) on signal yellow. Measured from a real screenshot of the 编辑\n         button: 63 px of #f5f5f0 sitting on #fff500 = 1.05:1, i.e. the word was\n         invisible. (When switchable palettes shipped, the same pairing measured\n         2.61:1 on 武陵青 — still failing, just less obviously, which is how it\n         stayed hidden until someone screenshotted the yellow.)\n\n         Why the existing hover-inversion rule did not already cover it: that\n         selector deliberately EXCLUDES plain buttons, because a button's own fill\n         and text must survive hover (the yellow toggle keeps black text, the\n         white-on-dark send button keeps white). This button is the case where the\n         fill comes from the THEME and the text from the APP, so it has to be named.\n\n         Scoped to the accent-filled states only, so the resting transparent button\n         keeps label-primary and stays correct in both schemes (measured 16.00:1\n         dark / 16.84:1 light). Guarded by test/settings-buttons.test.js.\n\n         .HOVERPROBE is included deliberately: a screenshot/computed-style test\n         cannot trigger :hover, so the test swaps in that class, which has the same\n         0,1,0 specificity as the pseudo-class and therefore the same cascade\n         outcome. Naming it here keeps the rule the test verifies identical to the\n         rule that ships, instead of testing a near-copy. It never matches in the\n         real app, since nothing renders that class.\n\n         The class list is not just the reported button. Auditing the installed\n         bundles for elements whose hover background is that token found SIX, and\n         three of them additionally re-assert color:label-primary in the same rule\n         (so they would fight a token-level fix):\n           *_secondaryButton   settings > 模型 row actions           <- reported\n           *_inspectButton     inspect panels (cordis / skill / tool —\n                               three modules, one semantic suffix)\n           *_arrow             attachment carousel arrow\n           *_add               composer + (already handled above)\n         All are the same defect on different screens, so they are fixed together\n         rather than one bug report at a time.\n\n         MATCHING IS HASH-FREE and matched on the SUBSTRING, not [class$=...]: an\n         attribute-suffix match requires the WHOLE class attribute to end with the\n         string, so it silently misses any element that carries a second class\n         after it (measured: [class$='_inspectButton'] failed on\n         class=\"gNWCoW_inspectButton HOVERPROBE\"). Upstream composes class lists\n         freely AND rehashes modules between releases (0.1.2-rc.1 killed all 33\n         pinned hashes), so the semantic token embedded in the class is the only\n         durable hook — '_secondaryButton' / '_inspectButton' are specific enough\n         that no other component uses them.\n\n         '_arrow' is the one exception that needs SCOPING, not a bare match: two\n         other components (trajectory, workspace) also carry *_arrow classes and\n         take NO hover fill, so a bare match would force ink onto elements that\n         keep their normal background — black-on-near-black in dark mode,\n         inventing a new contrast bug while fixing this one. The attachment\n         carousel lives inside the composer, so the composer wrappers scope it;\n         if a hover-filled arrow ever renders elsewhere, add its scope here. */\n      :is([class*='_secondaryButton'], [class*='_inspectButton']):hover:not(:disabled),\n      :is([class*='_secondaryButton'], [class*='_inspectButton']):hover:not(:disabled) svg,\n      :is([class*='_secondaryButton'], [class*='_inspectButton']):hover:not(:disabled) svg path,\n      :is([class*='_secondaryButton'], [class*='_inspectButton']).HOVERPROBE:not(:disabled),\n      :is([class*='_secondaryButton'], [class*='_inspectButton']).HOVERPROBE:not(:disabled) svg,\n      :is([class*='_secondaryButton'], [class*='_inspectButton']).HOVERPROBE:not(:disabled) svg path,\n      :is([class$='_composerSeat'], [class$='_composerHero']) [class*='_arrow']:hover:not(:disabled),\n      :is([class$='_composerSeat'], [class$='_composerHero']) [class*='_arrow']:hover:not(:disabled) svg,\n      :is([class$='_composerSeat'], [class$='_composerHero']) [class*='_arrow']:hover:not(:disabled) svg path,\n      :is([class$='_composerSeat'], [class$='_composerHero']) [class*='_arrow'].HOVERPROBE:not(:disabled),\n      :is([class$='_composerSeat'], [class$='_composerHero']) [class*='_arrow'].HOVERPROBE:not(:disabled) svg,\n      :is([class$='_composerSeat'], [class$='_composerHero']) [class*='_arrow'].HOVERPROBE:not(:disabled) svg path {\n        /* Accent-ink on accent: 16.50:1 — AA through --edge-accent-ink. */\n        color: var(--edge-accent-ink, #101110) !important;\n        fill: currentColor !important;\n      }\n      /* ---------- light mode: the danger (移除) button needs a darker red ----------\n         Not part of the accent work, but measured by the same test and failing:\n         --dsw-alias-state-error-primary is #ff3b30, which on the settings panel\n         (#f2f2ec) is only 3.16:1 — below AA for the 12px label it paints. iOS-style\n         reds are tuned for white-on-red fills, not red-on-paper text. Darkening the\n         TEXT colour alone (the token keeps its value for fills/dots elsewhere)\n         brings it to 5.12:1 while staying unmistakably red.\n         (0.1.2-rc.1 removed the old zGbnIq_dangerButton class; the semantic suffix\n         is kept so the rule re-arms itself if the button returns under the same\n         name, and no-ops harmlessly until then.) */\n      body:not([data-ds-dark-theme]) [class*='_dangerButton'] {\n        color: #c62016 !important;\n      }\n      /* ================= dark mode: selected rows = solid signal-yellow + black text ================= */\n      /* The translucent yellow wash makes white text look muddy olive; the reference\n         inverts to black-on-signal-yellow, so selected rows get the full inversion.\n         CARVED OUT (2026-10): the model menu rows ([role='menuitemradio'] — unique\n         to the model-selection package) and the permission popup rows\n         ([role='menuitem'] whose label embeds an '_optionLabel' span) use the\n         划词灰 selection pair instead — including in dark, where the pair flips\n         to #6a6a6a/#ffffff (see the 菜单当前项 section). :not() with :has() inside\n         is level-4 selectors, same dependency the header chip rule already has.\n         The user-questions option chips keep THIS rule: they carry '_optionLabel'\n         too but no menuitem role, so the second :not() cannot reach them. */\n      body[data-ds-dark-theme] [class*='selected' i]:not([class*='unselected' i]):not([role='menuitemradio']):not([role='menuitem']:has([class$='_optionLabel'])) {\n        color: var(--edge-accent-ink, #000) !important;\n        background: var(--edge-accent) !important;\n        border-color: var(--edge-accent) !important;\n      }\n      body[data-ds-dark-theme] [class*='selected' i]:not([class*='unselected' i]):not([role='menuitemradio']):not([role='menuitem']:has([class$='_optionLabel'])) *:not(svg):not(path) {\n        color: var(--edge-accent-ink, #000) !important;\n      }\n      /* ================= ask_user_question option chips ================= */\n      /* Two contrast collisions in the question card (@deepseek-ai/dsh-client-ui-user-questions),\n         both measured on a real card rather than guessed.\n\n         1) The recommended chip. Upstream paints it with\n              color: var(--dsw-alias-button-info-fill)\n              background: var(--dsw-specific-sidebar-nav-item-active-accent)\n            i.e. it uses info-fill as a FOREGROUND. This theme maps that token and the\n            nav accent to the SAME value in both modes (#101110 light / #fff500 dark),\n            so the label painted itself onto its own fill and the chip measured as a\n            single flat colour with ZERO glyph pixels. Broken in BOTH modes, not just\n            dark. Pin the pair explicitly instead of retuning either token, because\n            both are consumed as real background fills elsewhere. */\n      :is([role='radio'], [role='checkbox']) [class*='badge' i] {\n        color: var(--edge-accent-ink, #101110) !important;\n        background: var(--edge-accent) !important;\n      }\n      /* On a selected row the row itself is already solid signal yellow, so the chip\n         inverts to keep its edge instead of dissolving into the row. */\n      body[data-ds-dark-theme] [class*='selected' i]:not([class*='unselected' i]) [class*='badge' i] {\n        color: var(--edge-status-dark, var(--edge-accent)) !important;\n        background: #101110 !important;\n      }\n      /* 2) The option number (\"1\", \"2\", ...). The blanket dark inversion above\n            recolours descendant TEXT to black but cannot touch a descendant's own\n            background, so this chip kept its overlay fill\n            (--dsw-alias-bg-overlay = #1c1e1c) and rendered a black digit on\n            near-black: measured 1.25:1, i.e. the numbering vanished on the selected\n            row. Wash the chip rather than filling it, so the digit reads on yellow\n            and the chip still looks like a chip. */\n      body[data-ds-dark-theme] [class*='selected' i]:not([class*='unselected' i]) [class*='number' i] {\n        color: var(--edge-accent-ink, #101110) !important;\n        background: color-mix(in srgb, var(--edge-accent-ink, #101110) 14%, transparent) !important;\n      }\n      /* ---------- Turn-status label (\"Deep diving...\") ----------\n         Owner: @deepseek-ai/dsh-client-ui-conversation, class Md3f7G_turnStatus.\n\n         This label is GRADIENT TEXT, not coloured text. Upstream paints a\n         linear-gradient background, sets -webkit-text-fill-color: transparent plus\n         background-clip: text, and animates background-position to shimmer:\n\n           background: linear-gradient(90deg,\n             var(--dsw-static-deepseek-500) 0%   40%,\n             var(--dsw-static-deepseek-200) 50%,\n             var(--dsw-static-deepseek-500) 60% 100%);\n           color: #0000; -webkit-text-fill-color: transparent;\n\n         Two consequences drive the rules below:\n           1. A plain 'color:' CANNOT recolour this label — the transparent text\n              fill wins, so the glyphs would stay whatever the gradient paints. The\n              recolour therefore has to go through the gradient itself.\n           2. Retinting the shared --dsw-static-deepseek-* tokens is the wrong lever:\n              --dsw-static-deepseek-500/200 also back --dsw-alias-button-info-fill,\n              --dsw-alias-state-business-primary and --dsw-specific-bubble-highlight\n              (verified in dsh-client-ui-theme/styles/design-platform.css), so the\n              theme already maps them to ink/paper on purpose. Only\n              background-image is overridden here, which leaves upstream's\n              background-size, background-position and shimmer animation untouched.\n\n         COLOUR CHOICE IS MEASURED, NOT PICKED BY EYE. Every gradient stop must\n         clear WCAG AA 4.5:1 against BOTH backgrounds the label can sit on in its\n         mode (bg-base and bg-layer-1), because the mid-band sweeps through the\n         glyphs — and under prefers-reduced-motion upstream pins background-size to\n         100%, leaving that mid-band permanently inside the text. Measured:\n           light bg #e8e8e2 / #f2f2ec —  #fff500 scores 1.02:1 (invisible; the naive\n             \"just make it yellow\" reading of this request), #8f7c00 3.38, #7d6c00\n             4.25, and #6b5d00 5.35 is the FIRST gold that clears AA;\n           dark  bg #101110 / #181a18 —  #fff500 15.26, #a08a00 5.11, while #8f7c00\n             falls to 4.21 and fails.\n         Hence the sweep DIPS deeper in both modes instead of lifting brighter:\n         in light mode no gold above #6b5d00 can clear AA, and in dark mode a pale\n         lift band desaturates to near-white and loses the yellow entirely.\n         Light mode is a deep gold rather than signal yellow for the same reason the\n         watermark and rail are not: on cream, #fff500 is not a colour choice, it is\n         an erasure. */\n      body [class*='turnStatus']:not([class*='turnStatusClock']) {\n        background-image: linear-gradient(90deg,\n          var(--edge-status-light) 0%, var(--edge-status-light) 40%, var(--edge-status-light-mid) 50%, var(--edge-status-light) 60%, var(--edge-status-light) 100%) !important;\n      }\n      body[data-ds-dark-theme] [class*='turnStatus']:not([class*='turnStatusClock']) {\n        background-image: linear-gradient(90deg,\n          var(--edge-status-dark) 0%, var(--edge-status-dark) 40%, var(--edge-status-dark-mid) 50%, var(--edge-status-dark) 60%, var(--edge-status-dark) 100%) !important;\n      }\n";

// src/styles/overlays.css?raw
	var overlays_default = "      /* ================= boot loading screen ================= */\n      /* Fixed plate above everything, including the shell overlay layer. It exists\n         only while the boot animation plays and is removed afterwards, so none of\n         these rules match during normal use. Measurements come from the reference\n         frame (1340x731) expressed as ratios so they scale with the viewport. */\n      [data-endfield-loader] {\n        position: fixed;\n        inset: 0;\n        z-index: 2147483000;\n        background: #101110;\n        /* Not inherited from the app: the plate can paint before tokens resolve,\n           and since the theme stopped overriding the root font token it must not\n           depend on inheritance for its face either. Both the family and the\n           openType features are declared here rather than globally. */\n        color: #f5f5f0;\n        font-family: var(--edge-font);\n        font-feature-settings: \"tnum\" 1, \"ss01\" 1;\n        overflow: hidden;\n        /* Never trap the user: even mid-animation the app underneath stays usable. */\n        pointer-events: none;\n        opacity: 1;\n        /* No opacity transition: the fade is driven from JS (see finish()) because a\n           CSS transition proved not to run in every renderer this plate targets.\n           finish() also sets inline transition:none so nothing can fight it. */\n      }\n      /* Kept as a state hook (and a fallback for a renderer that never runs the JS\n         fade) — the inline opacity written by finish() is what actually animates. */\n      [data-endfield-loader][data-endfield-loader-exit] {\n        opacity: 0;\n      }\n      /* Faint industrial grid, matching the reference backdrop texture. */\n      [data-endfield-loader-tex] {\n        position: absolute;\n        inset: 0;\n        opacity: 0.55;\n        background-image:\n          repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.014) 0 1px, transparent 1px 4px),\n          repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.010) 0 1px, transparent 1px 120px);\n      }\n      /* 8px rail: dim track full height, signal-yellow fill from the top down. */\n      /* 10px rail, measured from the reference (10/1184 of the width). */\n      [data-endfield-loader-track] {\n        position: absolute;\n        left: 0;\n        top: 0;\n        bottom: 0;\n        width: 10px;\n        background: rgba(var(--edge-accent-rgb), 0.10);\n      }\n      [data-endfield-loader-fill] {\n        position: absolute;\n        left: 0;\n        top: 0;\n        width: 10px;\n        height: 0%;\n        background: var(--edge-accent);\n      }\n      /* Meter RIDES THE FILL END: its top offset is set per frame from the same eased\n         progress value that drives the fill height (see step()), so the readout\n         descends with the bar. The exact offset and the clamping are done in JS,\n         where the group's real height is known — a pure CSS percentage would let the\n         readout hang off the bottom of the screen as the fill approaches 100%.\n         Deliberately no CSS transition on the top offset: it is already updated every\n         frame, and a transition would make the readout visibly lag the bar. */\n      [data-endfield-loader-meter] {\n        position: absolute;\n        left: 26px;\n        top: 0;\n        will-change: top;\n      }\n      [data-endfield-loader][data-endfield-loader-complete] [data-endfield-loader-meter] {\n        position: fixed !important;\n        left: 26px !important;\n        top: auto !important;\n        bottom: 64px !important;\n      }\n      /* ---- completion flourish: yellow sweep to the right, then fade ----\n         Starts as the rail itself (same 10px width, same colour, same left edge) and\n         widens to cover the viewport, so the sweep reads as the finished bar flooding\n         the screen rather than a new element appearing.\n         Width and opacity are animated from JS (see finish()), deliberately NOT by a\n         CSS transition: measured in the verification renderer, a transition declared\n         here never started — no transitionrun/start/end events fired and the computed\n         width stayed at 10px well past its duration — which would leave a thin stub\n         instead of a sweep. These rules therefore only describe the resting state and\n         must not declare a width/opacity transition that would fight the JS. */\n      [data-endfield-loader-wipe] {\n        position: absolute;\n        left: 0;\n        top: 0;\n        bottom: 0;\n        width: 10px;\n        background: var(--edge-accent);\n        opacity: 0;\n      }\n      [data-endfield-loader-tick] {\n        display: block;\n        width: 4px;\n        height: 15px;\n        background: var(--edge-accent);\n      }\n      [data-endfield-loader-pct] {\n        display: block;\n        margin-top: 7px;\n        color: var(--edge-status-dark, var(--edge-accent));\n        font-size: 39px;\n        font-weight: 700;\n        line-height: 1;\n        letter-spacing: -0.01em;\n        font-variant-numeric: tabular-nums;\n      }\n      [data-endfield-loader-status] {\n        display: block;\n        margin-top: 12px;\n        color: #666;\n        font-size: 11px;\n        font-weight: 400;\n        letter-spacing: 0.02em;\n      }\n      /* ---- Poster brand block --------------------------------------------------\n         Measured from the supplied key-art (1184x685) by scanning its pixels, not\n         estimated — the ink bands on the right half of the reference are:\n           block left ink edge  x=868  -> 868/1184 = 73.3% of the width\n           right-most ink       x=1098 -> right gap 86px = 7.3% of the width\n           kicker band          y 258..260   h=3    (ratio to cap 0.10)\n           END band             y 265..293   h=29   -> cap 4.23% of plate height\n           FIELD band           y 297..325   h=29   -> line pitch 32px, 32/29 = 1.10\n           chevron band         y 498..506   x=841  -> outdent 868-841 = 27px\n           tagline band         y 543..551   h=9, run width 231px\n         The block is LEFT-aligned internally (all rows share x=868) but placed on\n         the right — that combination is what gives the reference its look; a\n         right-aligned (ragged-left) block reads completely differently.\n\n         GEOMETRY MODEL — the block is anchored by its RIGHT margin, not by a left\n         percentage. That is deliberate and is what fixes two measured faults:\n           1. A left percentage (the old --edge-rail: 73%) sets where the block\n              STARTS and lets its width run toward the right edge, so the margin\n              that a viewer actually reads as \"too far right\" was never controlled.\n              Anchoring 'right' makes that margin the declared quantity, and the\n              rhythm line falls out of the widest row instead of being guessed.\n           2. Sizing purely in vh made the wordmark shrink on a wide-but-short\n              window and, at the old 4.2vh, rendered the cap at 3.01% of plate\n              height against the reference's 4.23% — measurably ~70% of reference,\n              which is why it read as too small.\n         --edge-word is therefore clamp(26px, min(5.2vh, 4.8vw), 64px):\n           min(5.2vh, 4.8vw)  scales with the SMALLER axis, so neither a short nor\n                              a narrow window can push the block into the rail;\n           26px floor         keeps the sub-rows legible on a tiny plate;\n           64px ceiling       measured: without it, cap-height fell to 2.69% of H\n                              at 2560x1440 (the block visibly shrank on a large\n                              display); 64px holds it at ~3.2% and up.\n         Verified across 13 viewports from 520x900 to 2560x1440: cap-height stays\n         within 3.1-3.9% of plate height (reference 4.23%, intentionally a touch\n         under — see below) with no overflow past any edge and >=150px clearance\n         from the progress rail and its meter.\n         The block still renders slightly under reference scale on purpose: the\n         key-art is a full-bleed poster, whereas this plate flashes over an app.\n         Every row is a ratio of --edge-word, so this one value rescales the whole\n         block without disturbing the measured proportions above. The small rows\n         additionally carry a px floor — see the max() calls below. */\n      [data-endfield-loader] {\n        --edge-word: clamp(26px, min(5.2vh, 4.8vw), 64px);\n        /* Distance from the plate's right edge to the block's right edge. The %\n           term keeps it proportional on a wide display; the px term stops it\n           collapsing on a narrow one. */\n        --edge-gap: max(64px, 12%);\n      }\n      [data-endfield-loader-brand] {\n        position: absolute;\n        right: var(--edge-gap);\n        top: 50%;\n        transform: translateY(-50%);\n        /* No max-width: every row sets white-space: nowrap, so a width cap cannot\n           wrap them — it only clips. The block moves instead (see the --edge-gap\n           media queries) so the longest row always fits. */\n      }\n      /* Anchor to --edge-word like every other row. Without this the em below\n         resolves against the inherited root font-size (16px), which rendered the\n         kicker at 2.25x its reference size and bloated the whole block. */\n      [data-endfield-loader-kicker] {\n        display: block;\n        font-size: var(--edge-word);\n      }\n      [data-endfield-loader-kicker]::before {\n        content: 'DEEPSEEK HARNESS';\n        display: block;\n        margin-bottom: 0.5em;\n        color: #f5f5f0;\n        /* max() floor: the reference ratio alone (0.135em of the wordmark) computes\n           to ~4px on a short plate, which renders as an illegible grey smudge\n           rather than text. 9px is the smallest size this still reads at. */\n        font-size: max(9px, 0.155em);\n        font-weight: 600;\n        letter-spacing: 0.26em;\n        white-space: nowrap;\n        opacity: 0.95;\n      }\n      /* Both rows: the negative margin cancels Arial's left side bearing so the\n         INK edge lands on the rhythm line, not the glyph box edge. */\n      [data-endfield-loader-word] {\n        display: block;\n        margin-left: -0.055em;\n        color: #f5f5f0;\n        font-size: var(--edge-word);\n        font-weight: 900;\n        /* 0.80, not 1.10: the reference pitch/cap of 1.10 is measured between\n           INK tops, while line-height spans the full em box (ascender+descender),\n           which for Arial-900 is ~1.38x the cap height. 1.10 as a line-height\n           renders a visibly loose 1.52 ink pitch. */\n        line-height: 0.80;\n        letter-spacing: 0.01em;\n        white-space: nowrap;\n      }\n      [data-endfield-loader-word1]::before { content: 'END'; }\n      [data-endfield-loader-word2]::before { content: 'FIELD'; }\n      /* ---- detail cluster: chevron outdented into the left margin ---- */\n      [data-endfield-loader-detail] {\n        display: block;\n        position: relative;\n        margin-top: 1.9em;\n        font-size: var(--edge-word);\n      }\n      [data-endfield-loader-chev] {\n        position: absolute;\n        left: -0.26em;\n        top: 0.02em;\n        width: 0.12em;\n        height: 0.24em;\n      }\n      /* Two stacked chevrons drawn from borders — no glyph, no font dependency. */\n      [data-endfield-loader-chev]::before,\n      [data-endfield-loader-chev]::after {\n        content: '';\n        position: absolute;\n        left: 0;\n        width: 0.10em;\n        height: 0.10em;\n        border-left: 0.028em solid var(--edge-accent);\n        border-bottom: 0.028em solid var(--edge-accent);\n        transform: rotate(-45deg);\n      }\n      [data-endfield-loader-chev]::before { top: 0; }\n      [data-endfield-loader-chev]::after { top: 0.09em; }\n      [data-endfield-loader-sub]::before {\n        content: 'EDGE INTELLIGENCE THEME';\n        display: block;\n        color: #8a8d88;\n        /* Same legibility floor as the kicker: measured, the bare ratio rendered\n           this row 3px tall — visible as a blur, not readable as words. */\n        font-size: max(9px, 0.135em);\n        font-weight: 500;\n        letter-spacing: 0.12em;\n        white-space: nowrap;\n      }\n      [data-endfield-loader-seq]::before {\n        content: 'TERRA RESEARCH COMMISSION / BOOT SEQUENCE';\n        display: block;\n        margin-top: 0.4em;\n        color: #6a6d64;\n        font-size: max(8px, 0.125em);\n        font-weight: 500;\n        letter-spacing: 0.10em;\n        white-space: nowrap;\n      }\n      [data-endfield-loader-squares] {\n        display: grid;\n        grid-template-columns: repeat(6, 0.115em);\n        gap: 0.04em;\n        margin-top: 0.30em;\n      }\n      [data-endfield-loader-squares] i {\n        display: block;\n        height: 0.05em;\n        background: #2e302d;\n      }\n      [data-endfield-loader-squares] i[data-on] {\n        background: var(--edge-accent);\n      }\n      /* Tagline closes the block on the same rhythm line.\n         Reference: cap 11px across 232px, i.e. cap/width 0.38 — unreachable in\n         Arial, where an 11px-cap run of this string measures 299px (340px at the\n         reference's tracking). The source art uses a condensed face, and probing\n         the renderer showed Arial Narrow genuinely resolves here (245px vs Arial's\n         299px on the same probe), so it is used with Arial as the fallback: on a\n         host without it the run simply sets wider in Arial and still fits, because\n         the size below is a ratio of the wordmark rather than a fixed px. */\n      [data-endfield-loader-tag]::before {\n        content: 'OVER THE FRONTIER / INTO THE FRONT';\n        display: block;\n        margin-top: 1.05em;\n        color: #f5f5f0;\n        font-family: \"Arial Narrow\", Arial, sans-serif;\n        font-size: max(10px, 0.34em);\n        font-weight: 500;\n        letter-spacing: 0.06em;\n        white-space: nowrap;\n      }\n      [data-endfield-loader-tag] {\n        display: block;\n        font-size: var(--edge-word);\n      }\n      /* Narrow windows: pull the block toward the right edge so the measured ratios\n         survive instead of the text clipping. Only the margin changes — --edge-word\n         already scales itself off the smaller viewport axis, so the wordmark needs\n         no per-breakpoint override. */\n      @media (max-width: 1100px) {\n        [data-endfield-loader] { --edge-gap: max(48px, 9%); }\n      }\n      @media (max-width: 760px) {\n        [data-endfield-loader] { --edge-gap: max(28px, 5%); }\n      }\n      /* Reduced motion is handled in finish(), which skips the sweep/fade entirely\n         and removes the plate outright; nothing here needs to disable a transition,\n         since the plate no longer declares one. */\n      /* Settings page root (the settings.section slot's own wrapper div, the one\n         element of that panel this theme gets to name). Declaring the theme face\n         here means every row, hint and button inside it inherits it BY\n         CONSTRUCTION, without touching the app's root font token. The class is\n         stable and additive, so it is safe to target. It also carries no colours:\n         the panel keeps taking its ink and surfaces from app tokens, which is\n         what keeps it readable on both schemes and with the theme switched off\n         (see test/settings-off.test.js). */\n      .endfield-settings {\n        font-family: var(--edge-font);\n      }\n      /* Settings page group headers (rendered by the settings.section slot).\n         The label is accent ink that stays AA on both surfaces: light mode uses\n         the darkened accent stops (--edge-status-light: #6b5d00), dark mode the\n         bright ones (--edge-status-dark: #fff500) — the same measured pairs the\n         turn-status shimmer uses. */\n      .endfield-settings-group-title {\n        color: var(--edge-status-light);\n      }\n      body[data-ds-dark-theme] .endfield-settings-group-title {\n        color: var(--edge-status-dark);\n      }\n      /* ================= 终末地工业风通知 =================\n         The toast stack: bottom-right column of square industrial cards.\n         Design language: paper fill, 2px ink border, ZERO radius, a signal-colour\n         left rail (the accent as a 6px stripe — the same rail grammar as the boot\n         plate), barcode-style head row. Attention kinds carry their own dismiss\n         button; the done receipt does not (it auto-dismisses). */\n      [data-endfield-notify-stack] {\n        position: fixed;\n        right: 16px;\n        bottom: 16px;\n        z-index: 2147481000;\n        display: flex;\n        flex-direction: column;\n        gap: 8px;\n        /* Above the app's own chrome but below the boot plate; the stack is\n           interactive (dismiss buttons), so it must not be pointer-events:none. */\n        pointer-events: none;\n        max-width: min(340px, calc(100vw - 32px));\n      }\n      [data-endfield-notify] {\n        pointer-events: auto;\n        position: relative;\n        display: flex;\n        align-items: stretch;\n        background: var(--dsw-alias-bg-layer-1);\n        border: 2px solid var(--dsw-alias-label-primary);\n        border-radius: 0;\n        box-shadow: 4px 4px 0 rgba(16, 17, 16, 0.35);\n        overflow: hidden;\n        animation: endfield-notify-in 220ms cubic-bezier(0.16, 1, 0.3, 1) 1 both;\n      }\n      [data-endfield-notify-rail] {\n        flex: 0 0 6px;\n        background: var(--edge-accent);\n      }\n      /* Attention kinds keep the ink border; the receipt swaps the rail for a\n         thinner one so urgency is readable at a glance. */\n      [data-endfield-notify='done'] [data-endfield-notify-rail] {\n        flex-basis: 4px;\n        background: var(--edge-accent-onpaper, var(--edge-accent));\n      }\n      [data-endfield-notify-main] {\n        display: flex;\n        flex-direction: column;\n        gap: 2px;\n        padding: 10px 12px;\n        min-width: 0;\n      }\n      [data-endfield-notify-head] {\n        font-family: \"Arial Black\", Arial, \"PingFang SC\", \"Microsoft YaHei\", sans-serif;\n        font-weight: 900;\n        font-size: 12px;\n        letter-spacing: 0.14em;\n        color: var(--dsw-alias-label-primary);\n        white-space: nowrap;\n        overflow: hidden;\n        text-overflow: ellipsis;\n      }\n      [data-endfield-notify-body] {\n        font-size: 12px;\n        line-height: 1.5;\n        color: var(--dsw-alias-label-secondary);\n      }\n      [data-endfield-notify-close] {\n        flex: 0 0 auto;\n        align-self: flex-start;\n        margin: 6px 6px auto 0;\n        width: 22px;\n        height: 22px;\n        border: 1px solid var(--dsw-alias-border-l2);\n        border-radius: 0;\n        background: transparent;\n        color: var(--dsw-alias-label-secondary);\n        font-size: 14px;\n        line-height: 1;\n        cursor: pointer;\n      }\n      [data-endfield-notify-close]:hover {\n        background: var(--dsw-alias-label-primary);\n        color: var(--dsw-alias-bg-layer-1);\n      }\n      @keyframes endfield-notify-in {\n        from { opacity: 0; transform: translateX(24px); }\n        to   { opacity: 1; transform: translateX(0); }\n      }\n      @media (prefers-reduced-motion: reduce) {\n        [data-endfield-notify] { animation: none; }\n      }\n";

// src/styles/generated.css?raw
	var generated_default = "/* generated.css — machine-written regions, patched in place by the build\n   scripts (do not edit by hand). Each fence below is owned by its script:\n\n     EDGE_TEX     scripts/build-texture.js\n     EMBLEM_MASK  scripts/build-emblem.js\n     HERO_LOGO    scripts/build-logo.js\n\n   Everything here is body-level custom-property declarations (data-URI\n   masks/textures), which resolve at computed-value time and are therefore\n   order-independent — this file is concatenated AFTER theme.css by the\n   client entry without cascade effects. */\n\n      /* EDGE_TEX_BEGIN (generated by scripts/build-texture.js — do not edit by hand) */\n  /* endfield-block-bg.svg (engineering grid tile (viewBox 217x217, 2px stroke)) — 163B raw, 0KB base64, sha256 16d0d6dcb24d1cdb… */\n  body { --edge-tex-grid-mask: url(\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMTcgMjE3Ij48cGF0aCBkPSJNIDAgMCBMIDEgMSBoIDIxNyBNIDEgMSB2IDIxNyBNIDEgMSBMIDIxNyAyMTciIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIyIiAvPjwvc3ZnPg==\"); }\n  /* endfield-wave-bg.png (627x461 stepped wave, used top-right) — 17084B raw, 22KB base64, sha256 5a9efdd3ede79f2e… */\n  body { --edge-tex-wave: url(\"data:image/png;base64,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\"); }\n  /* endfield-tape-wave-bg.png (946x216 wave band, used as the centre strip) — 37025B raw, 48KB base64, sha256 66b0f225288d5c5b… */\n  body { --edge-tex-tape: url(\"data:image/png;base64,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\"); }\n  /* endfield-dropdown-arrow.png (97x96 round chevron of the official filter dropdown) — 874B raw, 1KB base64, sha256 34b1690c75f0da18… */\n  body { --edge-dd-arrow: url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGEAAABgCAMAAAA6hOw0AAAAVFBMVEUAAAB0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHRDQ0NqampGRkZzc3NTU1NhYWFLS0tlZWVk9w4pAAAAE3RSTlMA+Bjd7Us+KJmLrMi6e2sINl4OXyTMTgAAArJJREFUaN612utymzAQhmGdEBIHg1k7Tur7v8+2M+18k4C8K3l5f3vyDEiKsLAR1ndzmkYfLNngxynNXW/06i9DoH1huKgoMXsq51M0b+VmT1x+du13J1mSZFPb3XL4+wKj/jq2bKkmm7c6oPNUm++MvCVRS2kRj7CntrxwxK+WWrNXCZDpnTI/BAO917AwwETvNi0ccC4xkEZDGUikUyoBF9JqPgYi6RWPABcUheAOhIk0m/bAlXS7nHaPcJ+YlaC+KlZC58ynkfQbv22adEYdcwmqF7HSOa3MRFKcTs7SUfcHiXsefta6l/9T7x+/xMTX7fPxamGPx8DtBoIDbiAOxtqVABAsUCIcbtIhAIIHQOxv01AEQPAAiP1sCgXgH3HngTIR/gJ9AQDBA2Wix9azB0CwQJm4Hj2nft5+9HEvAuxH89H+/GAIIYD92pOEaATI/xEsiYg2gCxWNEtUAljVPbUQPIDpGklMtAAUIYgIOYDNuiM58awEIMgJOQAhEk+gpxjAOKxUR1QCtGK2CokvIYDZulElUQfQhg2IIRoBiycNhmgEyGObZoh6ABv1TCzRDtCMJ/tKAgD/hO+oieABPJJ5CdEIeBxZsUQTQAlfscQEAPkXrSXIiAYgLDj0kRMA5MdAkaQEgMqv1F5KVALe/G8mKQGg7iDLWTFRA1hXccAHAoBonHERcgKA4BJQJv3yOQdYKDjlk1D+GG5UBsb9aw2rCtj+zBNjLLYTDxMnc9Tm1QDvCm+YghIQelMoWhXAxhKgdWbZvXxTprPUTiX4V3KdPWkM0BreAMJqBLmxGRidEbXkRiAvRlr0VJ/HEIguAwOu+5Id9VMVMPWmvig3xmjaWgeSNMQzfxKCH4S0t86jLY3umFej0tblKdD3wpS7zajm1utlzimlPF+uq/zW/Aa/OBkSXm/+WQAAAABJRU5ErkJggg==\"); }\n  /* endfield-button-texture.png (320x72 flowing-line material of the official base Button (pseudo layer) + left-fade mask) — 4530B raw, 8KB base64, sha256 0a2fc215c49899a1… */\n  body { --edge-btn-tex: url(\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMjAgNzIiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZiIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjAiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIwIi8+PHN0b3Agb2Zmc2V0PSIwLjI5NyIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIwIi8+PHN0b3Agb2Zmc2V0PSIwLjUxNiIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIxIi8+PC9saW5lYXJHcmFkaWVudD48bWFzayBpZD0ibSI+PHJlY3Qgd2lkdGg9IjMyMCIgaGVpZ2h0PSI3MiIgZmlsbD0idXJsKCNmKSIvPjwvbWFzaz48L2RlZnM+PGltYWdlIHdpZHRoPSIzMjAiIGhlaWdodD0iNzIiIG1hc2s9InVybCgjbSkiIGhyZWY9ImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBVUFBQUFCSUNBTUFBQUN3YXR4QkFBQUF3RkJNVkVVQUFBQUpDUWtKQ1FrSUNBZ0pDUWtJQ0FnSUNBZ0pDUWtQRHc4SkNRa0lDQWdKQ1FrR0JnWUhCd2NJQ0FnTEN3c0hCd2NIQndjSEJ3Y0dCZ1lJQ0FoUVVGQUdCZ1lURXhOYlcxdUJnWUUrUGo1ZlgxOG1KaVlwS1NsTFMwdkJ3Y0Y4Zkh4d2NIQWpJeU5DUWtKVlZWVkVSRVJCUVVFZUhoNGtKQ1JlWGw1UFQwK1RrNU5OVFUxeWNuSTJOalpwYVdsdWJtNHdNRERQejg5WVdGaHhjWEUvUHorRmhZVWhJU0d3c0xDN3U3dlMwdEs5dmIyWW1KakZ4Y1hYMTllYW1wcXdIVWZMQUFBQVFIUlNUbE1BRGhvWEN4d2VGQWdTSUJBakp5VUpLUzB2S3lJS01RWUhDU0loSXg0VENpSWVKeDRuR1NZdUdpMHNIQThSS0NjWUxSNGRMUzBxS2ljc0xSd2pEU1V1Sk5yemhBQUFFR0ZKUkVGVWVOck0ybTIza2tBVUJXQ2pLRFBmV3NsU2VTa1FNWXJ5R2xTMzB1ci8vNnYyT1dlWVFVZWlQb1R0Q3VucnMvYmg0Tnc3NkNuTDRYQzFYcTJXeStWcXZWNnZoc1BaYkRaY3YzcTFuajE2aEwvbmVYQ1paenBQZFo0MDgvQktzbU41ZU9nNFRuWTQ1STZUNTdodzhpekxIVmV1em5sY055L0t4SFZkK1E5ZHJEeCtIS1Vwcmk3RkdRNTZDZ0NYS3hEaWM4aUVIaEZxd2RrL0FJVGc4VUJnaDBPR0R3Q3FDQjJ1cmdIVVZ0WHhtTHJYMkd6Qng0Z3o2Q21BQXlFRW1kQmJyV0VwZ2g3NGxGKzM0Tk5uU3E4YkVEbUlZRlljTEVCSEFicEdUK0lVWmFGNExnUk5JQmpWdDROK0lvQlN3aUVIaEI0THJrVVBpTWJQaXZZVFFKQjErMUgzeW1QR2dEa0ppaFJ1bUM2ckltcWdQYUJGZWF3aUFLcTQrbFpuTkdMQlVmK0FJQVRjc2hZRW9JY0svaTBnOGtlQW9FS2RjamdXV1RkZ1U3QXNxalJTYmdSbENWSUhSNzBEU2p4VVQ5MllDczcrZElSTnVnQmxXb3NTN2Fzd3d5eklZRTVlNFE2QXVXV25CSk5qQ2NPa2d1SjFRTmlsS2E3SW9KY0lvQkhrejVubkRibUMzWUNYTytTbDVMZUNEb2NYU1Y0VXFuNHNtRmVaUTR6MnNoQkhJYVFjaXdTSVVHUXIrZUFMRGJFL0dpMXVBY2p2TXhyUXpIQjNBNTlxdi9lU2w3cUdMWDRpbU9rWkJrOE42RVpWRloyNXFVVWgxNmhLQ2lDeTRpa0pVa3lzQ2N2NWZyam9FMUFKOG9kVWNEYjBNTU5EdlVhNkFaK0NVUHlrZ2ZoczdaL09BWTlCMnNPdVdyWUVXSkZrbGFCYWplblZTME92MmlDbzRoTVRIdEZGZndRd3R1T2JzRy9BcFd4aENRUE92T1pEY05ZOXdqVmczVHdTN0FUTWkrTUJGYVM5d1JYazd0Rk5sYVFHOER3akhXWk00aFBhZUFvQXg0QkM2UHNMWk5CVGxoVHg0eThpcW9La0tJRFdGbTVid3ZCNzlrVGxLUVRiTjRqRXpZNUZtaFV3QTZBSXBsVU9zelNwNkJYRjhObUFodEVQVUVVV1hOUkJCY2ZqOGFDZkFGRDZSNHJlc2drNDVJY2cvTHBmWTVDNmdHb0xQejI4ZjluaFI2L0dYRUZ1b0FBbUtSVXh3UXhmeTZoQnVEQmU4WStqUDE3b2pHOENpS3ZFelBEUWZwR3hCV3U5UzBBSUhySjJQaEdrUFlJS2dqS1NlUlU2dHlxcXk5NFpPaVBJaXFEeVVjSHhHSGVTdmdHSEFOUitHbkR0OGRlNVdWY0ZkZjlnU0lEbVBSQkhCVS9hQUNXbzRERkJCVk9VamlzSU9wcGVPQlpwNjl5YWg1M0syUC95QTRBNjB6QU14OVAvQVpCbkdPa0cxSTlBQVpTOFBGd084UVVmSFJEUUlrNGNONHBrWTZqcFRZc2tGVHBMcjZianF3eHVVSjdDaHQ4MDNHMm0wK21ncHl5WEZpQWZhRFgyY0RkZ2N3ZmpvaUpEYk9zWndQeFlWazVWcFB3VXhOYmc2WFZac0FoSTBtd0wxTXIzc1hoVFB3cFYrd1FNQlN3RHNCbkF6UTBBV2RBQWNnWGxYZnFQQVo4WndLdERiUE1oU1ZrNFVTSVZmQ3dWbE9kZkdzY0pZVVdRaXdndVNHSUpibjBTMUFONytuRUt5VzlLZjVESlpoZE9KNzBDUXRBR05CWHNCbXhPTUFIYUZiUUJFYXhkT3VTakNrWXA5Rml3a0E1R0VFc1NhR2s2YWg4bHdHMm9BYldmQVF4N0I3UXJLSUNQN0s5ekxZQzZnRTNBaDgwS09sWmNKQ3JLQksycmNFZnJWMDF2RXNrckhwcUhLTGd3MUs5NThjbFhmTFJBdnV5bUpHZXkzMjBtdlFJaVYyYVlBTlVpTmptM016dUVDNmhlWWd3Zzlralc3bGZQc1B1NFNsSlhINFhDODRRbHJCNTk4cmxvaE5ST0FYMUFEWDRuK0RVeXdRUVQ0R1RRVXdSd2VRVndTQXVFanZiL3RJQlB6eWFZMkRLemlLLzZ5UXhMQlJsUVVtR01mVVc0T0lzYTJ5QUlwN1ZmT0xVQkovMEMwdDltQmIyVjU4a3o4SkUxeEZZRDlVdjB4WkUwcTVtbm9JVW5lY3d6VEJXa2sxRDlWWU9mYzM1MDNqelJJN2ZGMWw4UTFnNSsrOGtFYWt3bm1XKzIrOG04UjBCRUFNM1JOUDFrUkFBeHhOL1h2d2VVRFlJQ1dvQmN3ZXkzZnJBcmkwaGUveUthMi9xRVR3amx5VGNtUGhWZXQ0c2QxVTcyTC93WWNGTDd6ZmQ5QXdKTkFNMmhvSWZNQ0pBcjJEckRabjV4QW1nQmNnNkh2QVhRbk5OWFlNUlR6MDBocUJQU0JxSFZDMFFPUGxrUVdZUWJYTWN4L05qdURIRFNNK0JLMXZDWjMwekZudUZyVDBEeWV5Y2JCQmNOcUN2WURzaHJONmtyT0lvQy8vekxScWoyTUZXUk5IZmpLUXR1R0hETCsxY05yeW5nWlBmMmZvNE1lb3BVendEU2thRHg2d1FFSC96ZVA5TWJ4QUk4dEFOS0JZOWx4Vi9lY0p2NkVaZFFMUXk2b25vSVhZUDRMcFFYbGpERWRYUDZFWVBPQXR6czlwT2JBbm9HMEg0R1drc1lnTy9Zend5d0FUUVZ2T3FuRHBtVDhoU05IaWRGU29JQkNHSElnSHJ2OG5XNjhPOThWSkFLR1BJRytiS2RXSm5URHBuZkVOQ2pHODBIUHlsZ2V3UEI5MDc4ckJIdUJPUXRJb3Q0RkNVeEJwaVBtWk5BTHc5Y0pGeThMWStzSEJaTXRsOU9lOXNQTytRbWdLc21vT2FqL3JYNUNkOEQrS2tYR0d1Q3RXRGU0c2RCM1ZJTU1leGlFaHo1RUpRdmJySTBHdXQzdCtYbGl4bkYwQUx3ODZZaHA3Ti9zM254NHBZalBOU0FkSmhnK1Yyclh3ZGc1alNqL1RRZ1htV09BZWppT0pXZkNnR1JEWDNxbnluZzNaWjNzSHpSRU1ENWhSNDM4RGFBU3RBQTh2aXVsWjhOYU5VUHNmbVFQTXZ5VmtBUkhDWDhZdzBXbE9VUkFqRSt4VUVvUndTYzdSMDFiNG9SWlRVOEEybFdML2hlcUFhK2VESG9LZktMV1FBY1N2UUllL0JyUDRzUnZuY1B5TTBlNGJOalFBdFE2NWtPeG1XWnNLQTVaK0ZEZzFnT3Fpajd1eDFON21hNzNYRHI5bDkrYk9lWEFkeUhONTllSVAwQlhqd0VWeDREeXZpeW40bmxKd2VCSFlCNWM0WXY2MWNmR3FDRHNiOEkrZnZIcUo1Yy9EZVFOeGNEdDd2YnlkVGVmLzd4K2Y2TUR2K1ErN2R2NzI4Q3FDcUlUL2F6Nm9kYytPRUQ2V3dnelhBSElCSWNmL0NETU9EMW9Ramx6UVZoT0NuZ0hSeFpjUGYxNjg0Q1JENTlmTnNuNEZJZWY4dHpRUG1KWERzZy9GQS95ZStmZ1VEak5lSzJBMHJTRTVkd1FTdUVESldnSEJ0Y0ZsQXErTzNudmRZemdQY2ZQOTdmQkhEWkFGeXBINnEzQWRaK3pRRzI5Y1FQTTF6VnYzOGxlaFlmQXJuZ1Mva2xBQnd0a0ZoVkQ2ZkxYRUIrQWlKd25OZXJkLy8xMjkzOEJmdnBTQVhmdkg3Ky9GY3o5N3JqTkF4RUFiaEkzS0cwU1ZsUUFTMVFRa09za2loUzRqUlZMKy8vVnB5WmNUcWh4Z1NFbERCb2QvOS9PdU54YlpmWkNLV0FMTmdEUkFCLyt6NTF0OU1yOVFGQWlhQysrUE1CWHdzZzRvWlpnc05tSmp3ZVJYRExjSysyUlU1b0NPSWNmazZ3T0p3VER0OU5HVFR4ZUlCZUR6L2xEdGJiSkMxZEFIY1N3RENnK3NsamFEelo4QUg3VjczeTJlMzk4Ynd2cUdsZko1K09DVWNRQ1NUQVpBTXg2dUNsRnBxNE5UZDgwU3FLVWxQVjQ3U3dBc294akl4aEJ4aWVJTUVBK29CUy9BTEcyMEZyNlQwbDNtbWNzWGVoengyZjVMQitzK0VaTElERkplbVBqYzNsMEJiTmJRQWhtR1hsYktUQ2FkWnREK3QxM0NLd2hSa0lvQWNvajdCY3FaOFBpTEdSZE5jYzIrTW56QTBBMHZCRkozUFQ3dTI4TDRnTUhteHp3NGNxTXpNYnFkd0FZVGw5Mm5ZM3NJZmU2UVFaREtCRThQTzNSNCtGendka1BDbUNReHNuZEV5YTJPVFZGVEJudUh5LzN3Sk8rS2lXV1F2QktPcnJpZUJzbEZKQUVWUkE5UEFBNExNL0I4U2pTZHhWOGlQSklLQUtvbzBoQ0xVaTJXZ0NHMEtiSTRKYkpLNDNlVTE3cURCMEZWQ3FubzFVMnIwS2lQSUJ0Ym8xOEM4QVdmRExJNVVMQUFyaGhnVFJ2YnpwQTZBTUVaa2JoYlZGRGowVnpBNXQ3UUhHNld5VVVrQjVuUytBdWdnR0FIVWJyWDVCUVBTdEU2U3ZLS2hjMEErQzZPS2NObjlncENIU0g3ODVDSk5tMWZraGErM0JDR0NrRmNlemtlcHQ3NU13NXJBQUR0MGxQZUNQd1I2ZzRQbjVZMFM4bmtUcDQzb1pITC8wQTkzeGJEZlV3OWo2NVpzNXNSV05XL2dhRUdhTjR4UEFER1RNcHpVdW9QWXczNmpyVlVnQUVCSEVPUXo3aFFHOXo3K1A4TUtlaTE1clBPNEErM3g2TzQ0cjN3UmpCSTNiOFB5WUp4ZmRyelNtTXYwRXRsbmsxWGdiNmU0dW1DTjRwMDhTZ29BdlhBUWg2T3p3RXdKVVF2ZHVBNGYyb3NpUHJLUnUvV2dFRitmamhodDN2azBhM2pUdnJXa2MyOUtZcGc5b3BnYkU4aWNSWE5QN2FIY1pzZzRCeWxrMHp4RDIwd3Jxb2JvSlFvajBZRTFPN1QwL3ZtT2pKcVlJNWhZOW5CYzViNXJ0eFZhWmd5dE5TY3NlU3hrTWtUanVMMy94cUd1Z2ZFVkVJaWl2QWxud2pnREQxK24zR3NHZW9lOG4xUUgyTDg1eGM4N25weTg5UHlsN3R2T054Y3JYSkxMaU5YbFdJWVkxeFE2QXRQNXhaWDFBeGtPTkR5Z1JYSzhWRUQwY0JrUUU3OW51RHdFZi8vd0pSSzU5NmRUbG5mTDlETGh0TVlnVGkvVGwxeFd2cVcxcmF6alZXUWsrRDVEMVJnZUVJTk4xYjZPZnN1RGk0eWtFcUJFTUE0WXZRZnBibCtmdklCZ0EzTkNSZlc0TFRCQkRPejgyakpwcWoyM3p5bFRFS0dqbUJqQWVHMUI3MkwyTkJxQXVncUgzSEJKQnFjRWwwRDlDNkI2SnY1TkQrLzc4Nktwb0MveXlPWUtYUUxBN0o2Z1F3VlZXbFoyZkFyTGJOSUJ2Q1ZCT1VybUg3MzU2VlJUNFpnZ2VKQ2pmM3dGQ3IzdStBY0hYRVBRQmwwbTczMUFFR3hMTTRDaUNaVldsU0tBQ2x1M2tnRndDaUI1K0NFRjlWVFQ0Sk12VEd3U1U3Ui9LWFh2UW02RSszdlhBdWNYWlZXTE5Fb0ltS3dXUTA2ZUFZRXN2aDR5YmQySkE5REJmaGdnZzJMQUlodk1uRWZUU3AzcEJQdWxlbEZ2NzhOeDA0L2hZVUFIM1o1ellONVV0M1YwYjhDQzRxbkZhV21jS0dGV0hTd3F4aVFIbFdibE1rSVgwOE9rajhZVy9YSWdJS21ESXp3ZFVQeGtlZk45MncrZnVMWXM1OXN3MlcvSUFkaHNYdXZoTmFSOFk2eUo0TUZNQ0xrU1FBWGtCWkVDWnd6NmdIc0k4b1I0ZURLQ1U4dm1BSHdxNnFmUUJsMFZyRzhoWlMya2pRUkZMalVtQnFJRG9ZUnRObjBEYXlDd1cwci9TdzNqWjlrdEEvTWdXOFA3M2dLRWpmUFVUd1VRaTJNZGpRTE1ud0pXeGhyS1hsbGZBTEFXaUFESWM3UVFuQmx6QXJvdmdHbmlJb0t5Q0E0QXYvaDFRWGczOUduQ2Z5ejB2TDM5bEk0QllBRlBhU2NleEFISUVxNGxiV0wrYzlKRG1jQmRCcklLaERnWWdDUWI5d29DRXArV2VEYUdIbFU5cWhURnMrTVMwcW5udFN5TXBBenp1NFpqNUpJSmwvRWJ4M3J3Wkd4Q0MxTU9rQmtqOCtuVUVkUVFQQUFiOVhQaTAzSzI1cHUvcUo0QXlkcWx6SFdBY21hcU1xWStWaXlQNHh0SGhIOVZzaFBJQTd3UVFmd1R3N25UYVhmRVVVSXIvYjRSbi93UUlQbjA0NUFCVnNOa2ZNZ0JHTkhiN2dCa0FLWUs5d0ZFRVllY0E0L0VCRjY2SGJ5TDRRQVgxaTEyT3J3YzR2SVBXQ2V3M01BVFJ3K3FuZ0xhdGVId1k0d09tbVVZdzFnZ0szaVNBc2hQVUNLNXBEL053TFlMT3prdmcvZjNBRHNaYi8zNTUvcHdueVNzZmNPa0FWMWZBV0FIanVqS1JGMEhBVFFLNFlFQlpCRkZyUkpBRVNlNTBPa2tEKzRDeUNJWSt3WVVBMVU4Qk1VWnc2YVo2N3ZhajZnQ3pFb0Nwcm9GMVRCRzB0WVJPSTRpYUFsQUtmemw2WXNlL0tYdTcwK2s3OTYvbkoxL3JEd0FHRmtDVTc0ZkswY00rWUxhM3l4NWc1QUJyQUtKS1c2VUluVVl3L1I4QUZ5SEJFT0N6SUtENkRRTTJHQ00rSU8ya0NiRE9hZ1owRzcreTR1VXZ5aTRaUlZBSDhTU0E2Rjh0U1dEWHZ5cTRlNkdsZmd3WUdNRERFN2pueC9lKytRMGZxdDVmU2pMalRSOERzbGFLUlpELzJrdjlVd1RMU1FEeDZRMGx2eVY1c2d6dVNQQTdDWDVIQkpWUEFYa1IvQm9HUklVQk5ZRHUrMFhiWGdDNys3Wjlhd1RRcEF6b2loZEJoSysrZEUzOFJpSTRNU0IrQkZBRkFZamlDRDd6QURtQ1g1OEUrUUx6US9DVVR5Sm9pbzBIV0dJalNJQVVPUVhrSG81WTBEV3hpQmxFY0RKQWlQRnZqZUNPQlhjUXhBVVNKckVBNmoxd0IzZ2Y5dk9PWUlKKy9QUWcwVmRYVWhHRmlxK0phT0JHQ2hnQmxOMjRpYm04Q0k1MEw2eUEzWmN6VVhJSzNRa0NrQ01vbjRFVlVCZkJZVUR3RFFFMk9OUmFyWDRHakxMV3BnUm9DTERValhOZEdVbWVOTEVyZWlSejlYdndBN3ZZaU5jTHdveGZBQUFBQUVsRlRrU3VRbUNDIi8+PC9zdmc+\"); }\n  /* endfield-button-texture.png (derived: PLTE-inverted twin of --edge-btn-tex + left-fade mask — the data form of the official invert(1) light branch) — 4530B raw, 8KB base64 */\n  body { --edge-btn-tex-inv: url(\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMjAgNzIiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZiIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjAiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIwIi8+PHN0b3Agb2Zmc2V0PSIwLjI5NyIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIwIi8+PHN0b3Agb2Zmc2V0PSIwLjUxNiIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIxIi8+PC9saW5lYXJHcmFkaWVudD48bWFzayBpZD0ibSI+PHJlY3Qgd2lkdGg9IjMyMCIgaGVpZ2h0PSI3MiIgZmlsbD0idXJsKCNmKSIvPjwvbWFzaz48L2RlZnM+PGltYWdlIHdpZHRoPSIzMjAiIGhlaWdodD0iNzIiIG1hc2s9InVybCgjbSkiIGhyZWY9ImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBVUFBQUFCSUNBTUFBQUN3YXR4QkFBQUF3RkJNVkVYLy8vLzI5dmIyOXZiMzkvZjI5dmIzOS9mMzkvZjI5dmJ3OFBEMjl2YjM5L2YyOXZiNStmbjQrUGozOS9mMDlQVDQrUGo0K1BqNCtQajUrZm4zOS9ldnI2LzUrZm5zN095a3BLUitmbjdCd2NHZ29LRFoyZG5XMXRhMHRMUStQajZEZzRPUGo0L2MzTnk5dmIycXFxcTd1N3UrdnI3aDRlSGIyOXVob2FHd3NMQnNiR3l5c3JLTmpZM0p5Y21XbHBhUmtaSFB6ODh3TURDbnA2ZU9qbzdBd01CNmVucmUzdDVQVDA5RVJFUXRMUzFDUWtKbloyYzZPam9vS0NobFpXVXg2Y0YwQUFBQVFIUlNUbE1BRGhvWEN4d2VGQWdTSUJBakp5VUpLUzB2S3lJS01RWUhDU0loSXg0VENpSWVKeDRuR1NZdUdpMHNIQThSS0NjWUxSNGRMUzBxS2ljc0xSd2pEU1V1Sk5yemhBQUFFR0ZKUkVGVWVOck0ybTIza2tBVUJXQ2pLRFBmV3NsU2VTa1FNWXJ5R2xTMzB1ci8vNnYyT1dlWVFVZWlQb1R0Q3VucnMvYmg0Tnc3NkNuTDRYQzFYcTJXeStWcXZWNnZoc1BaYkRaY3YzcTFuajE2aEwvbmVYQ1paenBQZFo0MDgvQktzbU41ZU9nNFRuWTQ1STZUNTdodzhpekxIVmV1em5sY055L0t4SFZkK1E5ZHJEeCtIS1Vwcmk3RkdRNTZDZ0NYS3hEaWM4aUVIaEZxd2RrL0FJVGc4VUJnaDBPR0R3Q3FDQjJ1cmdIVVZ0WHhtTHJYMkd6Qng0Z3o2Q21BQXlFRW1kQmJyV0VwZ2g3NGxGKzM0Tk5uU3E4YkVEbUlZRlljTEVCSEFicEdUK0lVWmFGNExnUk5JQmpWdDROK0lvQlN3aUVIaEI0THJrVVBpTWJQaXZZVFFKQjErMUgzeW1QR2dEa0ppaFJ1bUM2ckltcWdQYUJGZWF3aUFLcTQrbFpuTkdMQlVmK0FJQVRjc2hZRW9JY0svaTBnOGtlQW9FS2RjamdXV1RkZ1U3QXNxalJTYmdSbENWSUhSNzBEU2p4VVQ5MllDczcrZElSTnVnQmxXb3NTN2Fzd3d5eklZRTVlNFE2QXVXV25CSk5qQ2NPa2d1SjFRTmlsS2E3SW9KY0lvQkhrejVubkRibUMzWUNYTytTbDVMZUNEb2NYU1Y0VXFuNHNtRmVaUTR6MnNoQkhJYVFjaXdTSVVHUXIrZUFMRGJFL0dpMXVBY2p2TXhyUXpIQjNBNTlxdi9lU2w3cUdMWDRpbU9rWkJrOE42RVpWRloyNXFVVWgxNmhLQ2lDeTRpa0pVa3lzQ2N2NWZyam9FMUFKOG9kVWNEYjBNTU5EdlVhNkFaK0NVUHlrZ2ZoczdaL09BWTlCMnNPdVdyWUVXSkZrbGFCYWplblZTME92MmlDbzRoTVRIdEZGZndRd3R1T2JzRy9BcFd4aENRUE92T1pEY05ZOXdqVmczVHdTN0FUTWkrTUJGYVM5d1JYazd0Rk5sYVFHOER3akhXWk00aFBhZUFvQXg0QkM2UHNMWk5CVGxoVHg0eThpcW9La0tJRFdGbTVid3ZCNzlrVGxLUVRiTjRqRXpZNUZtaFV3QTZBSXBsVU9zelNwNkJYRjhObUFodEVQVUVVV1hOUkJCY2ZqOGFDZkFGRDZSNHJlc2drNDVJY2cvTHBmWTVDNmdHb0xQejI4ZjluaFI2L0dYRUZ1b0FBbUtSVXh3UXhmeTZoQnVEQmU4WStqUDE3b2pHOENpS3ZFelBEUWZwR3hCV3U5UzBBSUhySjJQaEdrUFlJS2dqS1NlUlU2dHlxcXk5NFpPaVBJaXFEeVVjSHhHSGVTdmdHSEFOUitHbkR0OGRlNVdWY0ZkZjlnU0lEbVBSQkhCVS9hQUNXbzRERkJCVk9VamlzSU9wcGVPQlpwNjl5YWg1M0syUC95QTRBNjB6QU14OVAvQVpCbkdPa0cxSTlBQVpTOFBGd084UVVmSFJEUUlrNGNONHBrWTZqcFRZc2tGVHBMcjZianF3eHVVSjdDaHQ4MDNHMm0wK21ncHl5WEZpQWZhRFgyY0RkZ2N3ZmpvaUpEYk9zWndQeFlWazVWcFB3VXhOYmc2WFZac0FoSTBtd0wxTXIzc1hoVFB3cFYrd1FNQlN3RHNCbkF6UTBBV2RBQWNnWGxYZnFQQVo4WndLdERiUE1oU1ZrNFVTSVZmQ3dWbE9kZkdzY0pZVVdRaXdndVNHSUpibjBTMUFONytuRUt5VzlLZjVESlpoZE9KNzBDUXRBR05CWHNCbXhPTUFIYUZiUUJFYXhkT3VTakNrWXA5Rml3a0E1R0VFc1NhR2s2YWg4bHdHMm9BYldmQVF4N0I3UXJLSUNQN0s5ekxZQzZnRTNBaDgwS09sWmNKQ3JLQksycmNFZnJWMDF2RXNrckhwcUhLTGd3MUs5NThjbFhmTFJBdnV5bUpHZXkzMjBtdlFJaVYyYVlBTlVpTmptM016dUVDNmhlWWd3Zzlralc3bGZQc1B1NFNsSlhINFhDODRRbHJCNTk4cmxvaE5ST0FYMUFEWDRuK0RVeXdRUVQ0R1RRVXdSd2VRVndTQXVFanZiL3RJQlB6eWFZMkRLemlLLzZ5UXhMQlJsUVVtR01mVVc0T0lzYTJ5QUlwN1ZmT0xVQkovMEMwdDltQmIyVjU4a3o4SkUxeEZZRDlVdjB4WkUwcTVtbm9JVW5lY3d6VEJXa2sxRDlWWU9mYzM1MDNqelJJN2ZGMWw4UTFnNSsrOGtFYWt3bm1XKzIrOG04UjBCRUFNM1JOUDFrUkFBeHhOL1h2d2VVRFlJQ1dvQmN3ZXkzZnJBcmkwaGUveUthMi9xRVR3amx5VGNtUGhWZXQ0c2QxVTcyTC93WWNGTDd6ZmQ5QXdKTkFNMmhvSWZNQ0pBcjJEckRabjV4QW1nQmNnNkh2QVhRbk5OWFlNUlR6MDBocUJQU0JxSFZDMFFPUGxrUVdZUWJYTWN4L05qdURIRFNNK0JLMXZDWjMwekZudUZyVDBEeWV5Y2JCQmNOcUN2WURzaHJONmtyT0lvQy8vekxScWoyTUZXUk5IZmpLUXR1R0hETCsxY05yeW5nWlBmMmZvNE1lb3BVendEU2thRHg2d1FFSC96ZVA5TWJ4QUk4dEFOS0JZOWx4Vi9lY0p2NkVaZFFMUXk2b25vSVhZUDRMcFFYbGpERWRYUDZFWVBPQXR6czlwT2JBbm9HMEg0R1drc1lnTy9Zend5d0FUUVZ2T3FuRHBtVDhoU05IaWRGU29JQkNHSElnSHJ2OG5XNjhPOThWSkFLR1BJRytiS2RXSm5URHBuZkVOQ2pHODBIUHlsZ2V3UEI5MDc4ckJIdUJPUXRJb3Q0RkNVeEJwaVBtWk5BTHc5Y0pGeThMWStzSEJaTXRsOU9lOXNQTytRbWdLc21vT2FqL3JYNUNkOEQrS2tYR0d1Q3RXRGU0c2RCM1ZJTU1leGlFaHo1RUpRdmJySTBHdXQzdCtYbGl4bkYwQUx3ODZZaHA3Ti9zM254NHBZalBOU0FkSmhnK1Yyclh3ZGc1alNqL1RRZ1htV09BZWppT0pXZkNnR1JEWDNxbnluZzNaWjNzSHpSRU1ENWhSNDM4RGFBU3RBQTh2aXVsWjhOYU5VUHNmbVFQTXZ5VmtBUkhDWDhZdzBXbE9VUkFqRSt4VUVvUndTYzdSMDFiNG9SWlRVOEEybFdML2hlcUFhK2VESG9LZktMV1FBY1N2UUllL0JyUDRzUnZuY1B5TTBlNGJOalFBdFE2NWtPeG1XWnNLQTVaK0ZEZzFnT3Fpajd1eDFON21hNzNYRHI5bDkrYk9lWEFkeUhONTllSVAwQlhqd0VWeDREeXZpeW40bmxKd2VCSFlCNWM0WXY2MWNmR3FDRHNiOEkrZnZIcUo1Yy9EZVFOeGNEdDd2YnlkVGVmLzd4K2Y2TUR2K1ErN2R2NzI4Q3FDcUlUL2F6Nm9kYytPRUQ2V3dnelhBSElCSWNmL0NETU9EMW9Ramx6UVZoT0NuZ0hSeFpjUGYxNjg0Q1JENTlmTnNuNEZJZWY4dHpRUG1KWERzZy9GQS95ZStmZ1VEak5lSzJBMHJTRTVkd1FTdUVESldnSEJ0Y0ZsQXErTzNudmRZemdQY2ZQOTdmQkhEWkFGeXBINnEzQWRaK3pRRzI5Y1FQTTF6VnYzOGxlaFlmQXJuZ1Mva2xBQnd0a0ZoVkQ2ZkxYRUIrQWlKd25OZXJkLy8xMjkzOEJmdnBTQVhmdkg3Ky9GY3o5N3JqTkF4RUFiaEkzS0cwU1ZsUUFTMVFRa09za2loUzRqUlZMKy8vVnB5WmNUcWh4Z1NFbERCb2QvOS9PdU54YlpmWkNLV0FMTmdEUkFCLyt6NTF0OU1yOVFGQWlhQysrUE1CWHdzZzRvWlpnc05tSmp3ZVJYRExjSysyUlU1b0NPSWNmazZ3T0p3VER0OU5HVFR4ZUlCZUR6L2xEdGJiSkMxZEFIY1N3RENnK3NsamFEelo4QUg3VjczeTJlMzk4Ynd2cUdsZko1K09DVWNRQ1NUQVpBTXg2dUNsRnBxNE5UZDgwU3FLVWxQVjQ3U3dBc294akl4aEJ4aWVJTUVBK29CUy9BTEcyMEZyNlQwbDNtbWNzWGVoengyZjVMQitzK0VaTElERkplbVBqYzNsMEJiTmJRQWhtR1hsYktUQ2FkWnREK3QxM0NLd2hSa0lvQWNvajdCY3FaOFBpTEdSZE5jYzIrTW56QTBBMHZCRkozUFQ3dTI4TDRnTUhteHp3NGNxTXpNYnFkd0FZVGw5Mm5ZM3NJZmU2UVFaREtCRThQTzNSNCtGendka1BDbUNReHNuZEV5YTJPVFZGVEJudUh5LzN3Sk8rS2lXV1F2QktPcnJpZUJzbEZKQUVWUkE5UEFBNExNL0I4U2pTZHhWOGlQSklLQUtvbzBoQ0xVaTJXZ0NHMEtiSTRKYkpLNDNlVTE3cURCMEZWQ3FubzFVMnIwS2lQSUJ0Ym8xOEM4QVdmRExJNVVMQUFyaGhnVFJ2YnpwQTZBTUVaa2JoYlZGRGowVnpBNXQ3UUhHNld5VVVrQjVuUytBdWdnR0FIVWJyWDVCUVBTdEU2U3ZLS2hjMEErQzZPS2NObjlncENIU0g3ODVDSk5tMWZraGErM0JDR0NrRmNlemtlcHQ3NU13NXJBQUR0MGxQZUNQd1I2ZzRQbjVZMFM4bmtUcDQzb1pITC8wQTkzeGJEZlV3OWo2NVpzNXNSV05XL2dhRUdhTjR4UEFER1RNcHpVdW9QWXczNmpyVlVnQUVCSEVPUXo3aFFHOXo3K1A4TUtlaTE1clBPNEErM3g2TzQ0cjN3UmpCSTNiOFB5WUp4ZmRyelNtTXYwRXRsbmsxWGdiNmU0dW1DTjRwMDhTZ29BdlhBUWg2T3p3RXdKVVF2ZHVBNGYyb3NpUHJLUnUvV2dFRitmamhodDN2azBhM2pUdnJXa2MyOUtZcGc5b3BnYkU4aWNSWE5QN2FIY1pzZzRCeWxrMHp4RDIwd3Jxb2JvSlFvajBZRTFPN1QwL3ZtT2pKcVlJNWhZOW5CYzViNXJ0eFZhWmd5dE5TY3NlU3hrTWtUanVMMy94cUd1Z2ZFVkVJaWl2QWxud2pnREQxK24zR3NHZW9lOG4xUUgyTDg1eGM4N25weTg5UHlsN3R2T054Y3JYSkxMaU5YbFdJWVkxeFE2QXRQNXhaWDFBeGtPTkR5Z1JYSzhWRUQwY0JrUUU3OW51RHdFZi8vd0pSSzU5NmRUbG5mTDlETGh0TVlnVGkvVGwxeFd2cVcxcmF6alZXUWsrRDVEMVJnZUVJTk4xYjZPZnN1RGk0eWtFcUJFTUE0WXZRZnBibCtmdklCZ0EzTkNSZlc0TFRCQkRPejgyakpwcWoyM3p5bFRFS0dqbUJqQWVHMUI3MkwyTkJxQXVncUgzSEJKQnFjRWwwRDlDNkI2SnY1TkQrLzc4Nktwb0MveXlPWUtYUUxBN0o2Z1F3VlZXbFoyZkFyTGJOSUJ2Q1ZCT1VybUg3MzU2VlJUNFpnZ2VKQ2pmM3dGQ3IzdStBY0hYRVBRQmwwbTczMUFFR3hMTTRDaUNaVldsU0tBQ2x1M2tnRndDaUI1K0NFRjlWVFQ0Sk12VEd3U1U3Ui9LWFh2UW02RSszdlhBdWNYWlZXTE5Fb0ltS3dXUTA2ZUFZRXN2aDR5YmQySkE5REJmaGdnZzJMQUlodk1uRWZUU3AzcEJQdWxlbEZ2NzhOeDA0L2hZVUFIM1o1ellONVV0M1YwYjhDQzRxbkZhV21jS0dGV0hTd3F4aVFIbFdibE1rSVgwOE9rajhZVy9YSWdJS21ESXp3ZFVQeGtlZk45MncrZnVMWXM1OXN3MlcvSUFkaHNYdXZoTmFSOFk2eUo0TUZNQ0xrU1FBWGtCWkVDWnd6NmdIc0k4b1I0ZURLQ1U4dm1BSHdxNnFmUUJsMFZyRzhoWlMya2pRUkZMalVtQnFJRG9ZUnRObjBEYXlDd1cwci9TdzNqWjlrdEEvTWdXOFA3M2dLRWpmUFVUd1VRaTJNZGpRTE1ud0pXeGhyS1hsbGZBTEFXaUFESWM3UVFuQmx6QXJvdmdHbmlJb0t5Q0E0QXYvaDFRWGczOUduQ2Z5ejB2TDM5bEk0QllBRlBhU2NleEFISUVxNGxiV0wrYzlKRG1jQmRCcklLaERnWWdDUWI5d29DRXArV2VEYUdIbFU5cWhURnMrTVMwcW5udFN5TXBBenp1NFpqNUpJSmwvRWJ4M3J3Wkd4Q0MxTU9rQmtqOCtuVUVkUVFQQUFiOVhQaTAzSzI1cHUvcUo0QXlkcWx6SFdBY21hcU1xWStWaXlQNHh0SGhIOVZzaFBJQTd3UVFmd1R3N25UYVhmRVVVSXIvYjRSbi93UUlQbjA0NUFCVnNOa2ZNZ0JHTkhiN2dCa0FLWUs5d0ZFRVllY0E0L0VCRjY2SGJ5TDRRQVgxaTEyT3J3YzR2SVBXQ2V3M01BVFJ3K3FuZ0xhdGVId1k0d09tbVVZdzFnZ0szaVNBc2hQVUNLNXBEL053TFlMT3prdmcvZjNBRHNaYi8zNTUvcHdueVNzZmNPa0FWMWZBV0FIanVqS1JGMEhBVFFLNFlFQlpCRkZyUkpBRVNlNTBPa2tEKzRDeUNJWSt3WVVBMVU4Qk1VWnc2YVo2N3ZhajZnQ3pFb0Nwcm9GMVRCRzB0WVJPSTRpYUFsQUtmemw2WXNlL0tYdTcwK2s3OTYvbkoxL3JEd0FHRmtDVTc0ZkswY00rWUxhM3l4NWc1QUJyQUtKS1c2VUluVVl3L1I4QUZ5SEJFT0N6SUtENkRRTTJHQ00rSU8ya0NiRE9hZ1owRzcreTR1VXZ5aTRaUlZBSDhTU0E2Rjh0U1dEWHZ5cTRlNkdsZmd3WUdNRERFN2pueC9lKytRMGZxdDVmU2pMalRSOERzbGFLUlpELzJrdjlVd1RMU1FEeDZRMGx2eVY1c2d6dVNQQTdDWDVIQkpWUEFYa1IvQm9HUklVQk5ZRHUrMFhiWGdDNys3Wjlhd1RRcEF6b2loZEJoSysrZEUzOFJpSTRNU0IrQkZBRkFZamlDRDd6QURtQ1g1OEUrUUx6US9DVVR5Sm9pbzBIV0dJalNJQVVPUVhrSG81WTBEV3hpQmxFY0RKQWlQRnZqZUNPQlhjUXhBVVNKckVBNmoxd0IzZ2Y5dk9PWUlKKy9QUWcwVmRYVWhHRmlxK0phT0JHQ2hnQmxOMjRpYm04Q0k1MEw2eUEzWmN6VVhJSzNRa0NrQ01vbjRFVlVCZkJZVUR3RFFFMk9OUmFyWDRHakxMV3BnUm9DTERValhOZEdVbWVOTEVyZWlSejlYdndBN3ZZaU5jTHdveGZBQUFBQUVsRlRrU3VRbUNDIi8+PC9zdmc+\"); }\n  /* EDGE_TEX_END */\n\n      /* EMBLEM_MASK_BEGIN (generated by scripts/build-emblem.js — do not edit by hand) */\n  /* Vector emblem mask (Yue-plus/endfield_icons vectorization of the official\n     Hypergryph mark; see scripts/build-emblem.js for provenance). Minimized\n     SVG 22153 bytes / 29KB base64. Alpha mask:\n     the paths' own alpha is the shape. Regenerate: node scripts/build-emblem.js */\n  body { --edge-emblem: url(\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48Zz48cGF0aCBkPSJNMTA0LjUsMjM5LjJ2NDAuN0g4My4yVjIwM2gyMS43bDI5LjIsNDAuMWwwLjQtMC4xVjIwM2gxLjZjMTEuNiwwLDIzLjItMC4xLDM0LjgsMGMxMS42LDAuMSwyMS41LDQuMSwyOS41LDEyLjUgYzYsNi4yLDkuMSwxMy44LDkuOSwyMi40cy0wLjQsMTUuMS00LjIsMjJjLTUuMywxMC4xLTEzLjksMTYtMjQuOSwxOC43Yy0zLjUsMC44LTcsMS4zLTEwLjYsMS4zYy0xMS43LDAuMS0yMy41LDAuMS0zNS4yLDAuMUgxMzQgbC0yOS4yLTQxTDEwNC41LDIzOS4yIE0xNTYuNSwyNjAuM2M1LjktMC4yLDExLjYsMC40LDE3LjQtMC42YzkuMS0xLjYsMTQuMi03LDE1LTE2LjJjMC42LTYuNy0xLjMtMTIuNS02LjktMTYuNyBjLTMtMi4zLTYuNy0zLjctMTAuNS0zLjljLTQuNy0wLjMtOS4zLTAuMS0xMy45LTAuMmwtMSwwLjJMMTU2LjUsMjYwLjN6Ii8+PHBhdGggZD0iTTM2NC40LDI4MHYtNzYuOWgyMS4ydjU3LjFoMzAuNlYyMDNoMS44YzExLjQsMCwyMi44LTAuMSwzNC4xLDBjMTEuNCwwLjEsMjIuMiw0LjMsMzAuMiwxMy4yYzYsNi43LDksMTQuNiw5LjQsMjMuNSBjMC40LDYuNi0wLjksMTMuMy0zLjcsMTkuM2MtNS4zLDEwLjUtMTQuMSwxNi44LTI1LjQsMTkuN2MtMy41LDAuOS03LDEuMy0xMC42LDEuM2MtMjguNywwLjEtNTcuNSwwLjEtODYuMiwwLjFoLTEuNSBNNDM3LjksMjYwLjUgaDguN2MzLDAsNi0wLjMsOC45LTAuN2M3LjEtMS40LDEyLjQtNS4yLDE0LjItMTIuNmMwLjUtMi4yLDAuNy00LjQsMC41LTYuN2MtMC4zLTcuMi0zLjgtMTIuNC0xMC4zLTE1LjVjLTIuNC0xLjItNS4xLTEuOS03LjktMS45IGMtNC4zLTAuMS04LjUtMC4xLTEyLjgtMC4xbC0xLjMsMC4yVjI2MC41eiIvPjxwYXRoIGQ9Ik00MiwyMjIuOGMwLDAuNy0wLjEsMS4zLTAuMSwxLjl2Ny44aDI2LjJ2MTcuOWgtMjZ2OS45aDM2LjdWMjgwSDIwLjZ2LTc2LjloNTcuNXYxOS43SDQyeiIvPjxwb2x5Z29uIHBvaW50cz0iMzAxLjcsMjc5LjkgMzAxLjcsMjAzIDM1OS4zLDIwMyAzNTkuMywyMjIuNyAzMjMuMywyMjIuNyAzMjMuMywyMzIuNCAzNDkuMiwyMzIuNCAzNDkuMiwyNTAuMyAzMjMuMywyNTAuMyAzMjMuMywyNjAuMyAzNjAsMjYwLjMgMzYwLDI3OS45ICIvPjxwb2x5Z29uIHBvaW50cz0iMjcxLjIsMjIyLjggMjM2LjIsMjIyLjggMjM2LjIsMjM0IDI2My4xLDIzNCAyNjMuMSwyNTMuOSAyMzYuMSwyNTMuOSAyMzYuMSwyODAgMjE0LjgsMjgwIDIxNC44LDIwMy4xIDI3MS4yLDIwMy4xICIvPjxwYXRoIGQ9Ik00NDYuMywxMDQuNGwtMS43LDNsLTEtMC40Yy0xNS41LTkuMy0zMS45LTE2LjgtNDguNC0yNC4yYy05LjYtNC40LTE5LjQtOC4zLTI5LjUtMTEuNmMtNS0xLjYtOS44LTEuNi0xNC4zLDEuNCBjLTAuNywwLjQtMS4zLDAuOS0xLjksMS41Yy01LjYsNC42LTguNSwxMS0xMS4xLDE3LjVjLTMuMiw3LjgtNS40LDE2LjEtNi41LDI0LjVjLTAuMywyLjItMC41LDQuNC0wLjgsNi41IGMtMC43LDYuNCwxLjksMTEuNCw3LjYsMTQuNWM1LjQsMywxMS4yLDUuMSwxNy4yLDYuMmM4LjYsMS44LDE3LjEsMy41LDI1LjcsNS40YzYuOSwxLjYsMTMuNSw0LjcsMTkuMSw5YzMuNCwyLjUsNi43LDUuMiwxMC4xLDcuOSBjLTAuNSwwLjgtMC45LDEuNi0xLjQsMi40Yy0yLjEtMS4zLTQuMS0yLjQtNi0zLjZjLTQuOS0zLjMtMTAuMi02LTE1LjctNy45Yy02LjItMi4xLTEyLjYtMy4zLTE5LjEtMy42IGMtOS41LTAuNS0xOC44LTIuMS0yNy45LTQuOGwtMTEuNi0zLjVjLTUuOS0xLjgtMTEuMi00LjktMTYuMi04LjVjLTIuNi0xLjktMy43LTQuNS0zLjctNy42czEtNi42LDItOS44YzEuOS01LjksMy43LTExLjYsNi42LTE3IGMwLjMtMC43LDAuNi0xLjMsMC44LTEuOWMwLjctMi4zLDIuMS00LjMsMy45LTUuOWMzLjMtMywzLjYtNi44LDEuNC0xMS40YzEuNy04LjgsNC4zLTE3LjQsNy45LTI1LjdIMzY1bDEuOSwxLjQgYzguNSw2LjcsMTcuMiwxMy4xLDI2LjYsMTguOGM0LjEsMi40LDguMyw0LjYsMTIuNiw2LjVjMTMuNCw2LjEsMjYuNCwxMy4xLDM5LjMsMjAuMUw0NDYuMywxMDQuNCIvPjxwYXRoIGQ9Ik0yNDAuNyw0MDcuNWMtNi44LTExLjctMTMuNS0yMy4zLTIwLjEtMzQuOGMxLjQtMTAuMi0xLTE5LjUtNS42LTI4LjRjLTMuNy03LjItOC4yLTEzLjktMTIuNy0yMC44bC0xMC44LTE2LjNsLTAuOS0xLjUgYzEuMS0wLjQsMzEuNy0wLjcsMzQuNC0wLjJjNiw2LjIsMTguOCwyOC42LDIwLjMsMzUuN2MtMi43LDEuNy0zLjEsMy0yLjIsNi4yYzIuMiw2LjcsNC4zLDEzLjQsNi41LDIwYzAuNSwxLjYsMC43LDMuMiwwLjYsNC45IGMtMC42LDcuMi0xLjYsMTQuMy0zLjksMjEuMWMtMS42LDQuNS0zLjQsOC45LTUuMiwxMy4zQzI0MS4xLDQwNi45LDI0MC45LDQwNy4yLDI0MC43LDQwNy41Ii8+PHBhdGggZD0iTTQ0My4xLDEwOS45bC0xLjksMy4zbC0yLTEuMWwtMjEuOC0xMi4yYy02LjUtMy42LTEzLjctNS42LTIxLjEtNi42Yy04LjgtMS4xLTE3LjgsMC0yNi4xLDMuM2MtNS4zLDIuMS0xMC4xLDUuNC0xNCw5LjYgYy0yLDItMy42LDQuNC00LjcsN2MtMi4yLDUuMi0xLjQsMTAsMi4yLDE0LjNjMy42LDQuMyw3LjYsNi4zLDEyLjUsNy43YzUuNCwxLjYsMTEsMi43LDE2LjYsMy4yYzguNywwLjksMTYsNC45LDIxLjcsMTEuNSBjMywzLjYsNiw3LjMsOS4xLDExYy0wLjQsMC43LTAuOCwxLjQtMS4zLDIuM2wtMS41LTFsLTctNS42Yy02LjctNS40LTE0LjQtOC41LTIyLjYtMTAuNmMtNS40LTEuNC0xMS0yLjEtMTYuNS0zLjMgcy05LjUtMi4zLTE0LjItMy42Yy0yLjMtMC42LTQuNS0xLjUtNi44LTIuMmMtMi42LTAuOS00LjktMi40LTYuOC00LjRjLTEuNS0xLjYtMi40LTMuNi0yLjctNS43Yy0wLjgtNi41LDAuMy0xMi44LDIuMi0xOC45IGMxLjktNi4yLDMuOS0xMi44LDYtMTkuMWMxLjgtNS40LDUuMi0xMC4yLDkuOC0xMy42YzMuMS0yLjUsNy4xLTMuMywxMC45LTIuMmM3LjcsMi4yLDE1LjEsNC45LDIyLjMsOC4zYzEzLjIsNiwyNi41LDEyLDM5LjUsMTguMyBjNiwyLjksMTEuNyw2LjUsMTcuNiw5LjhDNDQyLjcsMTA5LjUsNDQyLjksMTA5LjcsNDQzLjEsMTA5LjkiLz48cGF0aCBkPSJNMjA4LjcsMTk2Yy02LjUsMC0xMi44LTAuMi0xOS4yLDAuMWMtMy45LDAuMy03LjgtMC45LTEwLjgtMy4zYy0zLjgtMi43LTcuOC01LjItMTItNy4zYy0xMC4zLTUuNS0xOS4yLTEzLjQtMjUuOC0yMy4xIGMtNC43LTYuNy05LjYtMTMuMS0xNC41LTE5LjdzLTkuNy0xNC41LTEyLjUtMjNjLTIuNi03LjQtNi4zLTE0LjMtMTEuMS0yMC41Yy00LjItNS44LTguOC0xMS4zLTEzLjEtMTcgYy01LjktNy45LTExLjgtMTYtMTcuNy0yMy45bC0wLjgtMS4zaDQuNmwwLjQsMC40YzIuOSwzLjYsNi4zLDYuNSw5LjYsOS42YzYuNSw2LjEsMTEuNywxMy4xLDE2LjUsMjAuNiBjNC43LDcuNSw4LjcsMTcuMiwxMi4xLDI2LjNjMS40LDMuOSwyLjksNy44LDQuNSwxMS42YzIuNCw1LjksNi41LDEwLjcsMTAuOCwxNS40YzUuMyw1LjgsMTEuNCwxMC44LDE3LjIsMTYgYzcuMyw2LjUsMTQuNywxMi44LDIyLDE5LjFjMywyLjYsNi40LDQuNSwxMC40LDVjNCwwLjUsNS4yLTAuOSw1LjQtNC40YzAuMS0zLTAuMS02LTAuNy04LjljLTEtNS0xLjktMTAtMi43LTE1LjEgYy0wLjctMy45LTAuMi03LjksMC40LTExLjZjMi4xLTEzLjUsNC41LTI2LjksOC44LTQwYzAuOC0yLjQsMS42LTQuOCwyLjUtNy4zYzAtMC4xLDAuMS0wLjIsMC4xLTAuMmw1LjYsMy4xIGMtMC4xLDAuNS0wLjIsMC45LTAuNCwxLjNjLTQuMSwxMi43LTcuNCwyNS41LTEwLjEsMzguNmMtMS43LDcuNy0xLjQsMTUuNywwLjcsMjMuM2MyLjEsNi45LDYuMiwxMi4yLDExLjksMTYuNSBjMy45LDIuOCw4LDUuMSwxMi40LDdjOC41LDMuOCwxNyw3LjQsMjUuNSwxMS4xbDEuNywxbC0wLjEsMC40bC0xLjMsMC4xaC0xMS42Yy0xLTAuMS0xLjktMC4zLTIuNy0wLjdjLTMuMS0xLjQtNi40LTIuMS05LjgtMi4xIEMyMTIuNSwxOTMuMiwyMTAuMywxOTMuNywyMDguNywxOTYiLz48cGF0aCBkPSJNNDAxLjcsMTgxLjdsLTguMiwxNC4zbC0yLjMtMC4zbC0xMi43LTEuOGwtMTAuOC0xLjFsLTExLjgtMS4zbC02LjgtMC41bC04LjUtMC43Yy04LjYtMC43LTE3LjEtMS44LTI1LjUtMy4zIGMtOC45LTEuNi0xNy40LTQuNC0yNS45LTcuNmwtMTEuNS00LjVMMjc2LDE3NHYtNi40bDEuOCwwLjVjNywyLjIsMTQuMSw0LjQsMjEuMSw2LjdjMy4yLDEsNi40LDEsOS42LDAuOGwxMy4zLTAuNmwxNi44LTEuMiBjOS42LTAuNywxOS4yLTAuNywyOC44LDBjMTEuNSwxLDIyLjMsNC44LDMzLjQsNy40TDQwMS43LDE4MS43Ii8+PHJlY3QgeD0iMjc1IiB5PSIyMDMuMSIgd2lkdGg9IjIxLjIiIGhlaWdodD0iNzYuOSIvPjxwYXRoIGQ9Ik0yNjkuMiwzNDMuM2wxLjItMC4yYzAtMi4yLTAuMS00LjMsMC4xLTYuNWMwLjEtMi4yLDEtNi4yLDMuNC04LjVjMC42LTAuNywxLjEtMS41LDEuNS0yLjNjMC44LTEuNiwwLjQtMi45LTEuMS0zLjkgYy0xLjEtMC42LTIuMi0xLjEtMy4zLTEuNWwtMTAuMi0zLjJsLTMuNC01LjlsMC4yLTAuNGwxMi43LDQuM2MxLjItMy4yLDAuOC02LjYsMS44LTEwLjFjMC41LDAuMywwLjksMC42LDEuMywxIGM2LjcsOS42LDExLjUsMjAuMiwxMy4yLDMyYzAuNiwzLjMsMC45LDYuNywwLjcsMTBjLTAuMywzLjktMC40LDcuNy0xLjEsMTEuNmMtMi4xLDExLjEtNS4xLDIxLjktOSwzMi41IGMtMy4zLDktNi44LDE3LjctMTEuOCwyNS45Yy0yLjksNC42LTUuNSw5LjQtOC4yLDE0LjFsLTEsMS44Yy0xLjctMy0zLjMtNS43LTQuOS04LjVjMC4zLTAuOCwwLjYtMS42LDEtMi40IGM0LjMtMTAuMiw4LjUtMjAuNSwxMS44LTMxLjJjMi4zLTcuOCw0LjEtMTUuOCw1LjItMjMuOWMwLjYtMy44LDAuNy03LjYsMS4xLTExLjRjMC4xLTAuNiwwLjItMS4zLDAuNC0xLjkgYzAuNC0xLjgsMC41LTMuNS0wLjQtNS4xYy0wLjItMC4xLTAuMy0wLjMtMC4zLTAuNUwyNjkuMiwzNDMuMyIvPjxwYXRoIGQ9Ik00MDguMywxNzAuM2wtMSwxLjVsLTEuNS0wLjVsLTEyLjgtNS41Yy05LjQtNC4zLTE5LjctNi40LTMwLTYuMmMtOC4xLDAuMS0xNi4yLTAuMS0yNC4zLTAuOWMtMi43LTAuMy01LjQtMC45LTgtMS42IGMtNy0yLjEtMTQtNC4yLTIxLTYuNHMtMTMuMS01LjYtMTkuMS05LjZjLTAuNy0wLjUtMS40LTEtMi4xLTEuNmMtNS00LjItNi42LTkuNy00LjUtMTZjMS0yLjgsMi4zLTUuNiwzLjUtOC4zIGMwLjMtMC41LDAuNy0xLDEuMS0xLjNjMy44LTQuMiw4LjMtNy43LDEzLjQtMTAuM2M0LjQtMi4yLDguOS00LDEzLjQtNS45bDEuNS0wLjRjLTAuMiwwLjYtMC40LDEuMi0wLjYsMS44IGMtMS42LDMuNi0zLjMsNy4xLTQuNywxMC44Yy0yLjEsNS4yLTMuNywxMC42LTQuOCwxNi4yYy0wLjYsMi45LDAuNCw1LjUsMS43LDhjMS4zLDIuNCwzLjEsNC40LDUuMyw1LjljNC4zLDMsOC45LDUuMywxMy45LDYuOSBjMTEsNCwyMi40LDYuNiwzNC4xLDhjMywwLjQsNi4yLDAuNCw5LjMsMC43YzkuNCwxLDE4LjUsMy40LDI2LjcsOC4zTDQwOC4zLDE3MC4zIi8+PHBhdGggZD0iTTQzNS44LDEyMi42bC0yLjgsNC45bC0zLjQtMS4zbC05LjUtM2MtNS4yLTEuNi05LjYsMC44LTExLjEsNi4yYy0wLjgsMi41LTAuNCw1LjIsMS4xLDcuM2MxLDEuMywyLjEsMi42LDMsMy45bDYuOCw5LjMgYy0xLDEuOS0yLDMuNi0zLjEsNS41bC0xLjMtMS4zYy0yLjctMy4xLTUuMy02LjMtOC4xLTkuM2MtNS45LTYuNC0xMi44LTEwLjktMjEuNS0xMi41Yy0zLTAuNS02LTAuNy05LjEtMS4xIGMtNS4xLTAuNi05LjktMi40LTE0LjUtNC43bC0xLjctMS4xYy0zLjYtMi43LTQuMi02LTEuNy05LjZjMi45LTQuMyw2LjktNy43LDExLjYtOS43YzExLjQtNC43LDIyLjktNC42LDM0LjQtMC4xIGM0LjIsMS43LDguMywzLjcsMTIuMiw1LjljNS42LDMsMTEsNi4zLDE2LjUsOS41TDQzNS44LDEyMi42IE0zNzguOSwxMDYuOWwtMi40LDAuN2MtNC45LDEtOS4zLDMuMi0xMy42LDUuOSBjLTAuOSwwLjYtMS41LDEuNC0xLjgsMi40Yy0wLjUsMi40LTAuNCw0LjcsMS42LDYuNWMwLjcsMC42LDEuMiwxLjMsMS45LDEuOWMzLjIsMi43LDYuNyw0LjcsMTEsNC4yYzIuMS0wLjMsNC4xLTAuOCw2LTEuNiBjNC4yLTEuMyw1LjMtNi42LDQuMi05LjVzLTEuOC00LjItMi41LTYuNUMzODIuNywxMDguOSwzODEsMTA3LjMsMzc4LjksMTA2LjkiLz48cGF0aCBkPSJNMTI4LjUsMTk1LjhsLTAuOC0xYy0xMS4xLTE1LjEtMjMuMy0yOS41LTM0LjktNDQuMmMtMS0xLjItMS44LTIuNS0yLjYtMy45Yy0xNy0yOS4zLTM0LTU4LjYtNTAuOS04OC4xbC0wLjktMS42IGMwLjctMC41LDEuMi0wLjMsMS42LDAuM2M4LjEsMTEuMiwxNy4zLDIxLjUsMjYuNywzMS41YzguNyw5LjEsMTUuNywxOS43LDIwLjgsMzEuM2M1LjksMTMuNiwxMy4xLDI2LjQsMjEuNywzOC40IGM0LjksNi45LDkuNSwxNC4xLDE0LjUsMjAuOWMzLjksNS4zLDguMiwxMC4yLDEyLjQsMTUuMWwwLjgsMS4xSDEyOC41eiIvPjxwYXRoIGQ9Ik00NDMuMywxNTdoLTNsMTYuOC0yOS4yYzUuNi05LjYsMTEuMi0xOS4zLDE2LjgtMjlsMTYuNy0yOC45bDE3LTI5LjRoLTkuOGw0LjQtNy45aC0zMTBjLTAuMS0wLjktMC4xLTEuNi0wLjEtMi4yIGMxLjMtMC42LDMxMi40LTAuNywzMTQuNS0wLjFjLTEuNCwyLjQtMi43LDQuOC00LjIsNy41TDUxMiwzOEM0ODguOSw3Ny45LDQ2Ni4xLDExNy40LDQ0My4zLDE1NyIvPjxwYXRoIGQ9Ik0yODAuNCwzOTFjMC4xLTAuNCwwLjItMC45LDAuNC0xLjNjNC4yLTExLjcsNy4yLTIzLjgsOC43LTM2LjFjMC42LTQuNCwwLjItOS0wLjMtMTMuNGMtMS4zLTEyLTUuNi0yMy42LTEyLjUtMzMuNSBsLTAuMy0wLjZjLTAuMS0wLjEsMC0wLjIsMC0wLjRoMjIuNmMzLjUsNC4zLDYsOS40LDcuMywxNC44YzEuNyw3LjQsMS4yLDE0LjgtMC40LDIyLjJjLTAuMiwxLjMtMC41LDIuNS0wLjgsMy44IGMtMC45LDMuNy0yLjMsNy4yLTQuMiwxMC41Yy02LjUsMTEtMTIuOCwyMi0xOS4xLDMzbC0wLjksMS40TDI4MC40LDM5MSIvPjxwYXRoIGQ9Ik0xODguNCw1Ni45aDguOWMtMC4zLDAuNy0wLjYsMS4zLTEsMS45Yy00LjksOC41LTkuNCwxNy4zLTEzLjQsMjYuM2MtMy43LDguNC02LDE3LjMtNi44LDI2LjRjLTAuNSw0LjgtMC40LDkuOC0wLjcsMTQuNyBjLTAuMyw2LjktMS43LDEzLjgtNC4yLDIwLjNsLTAuNywxLjZjLTIuNCw0LjgtNi42LDctMTEuOSw2LjFjLTcuNi0xLjMtMTMuNy01LTE4LjYtMTAuN2MtMy42LTQuMi02LjctOC44LTkuMy0xMy43bC0yMC4yLTM4LjMgYy01LjktMTEuMi0xMi4zLTIyLjEtMTkuMi0zMi45Yy0wLjQtMC41LTAuNy0xLjEtMS0xLjdsMS0wLjJIOTRsMS4xLDEuOWMxMC42LDE4LjMsMjEuMSwzNi43LDMwLjgsNTUuNWMxLjMsMi40LDIuMiw1LDMuNSw3LjMgYzEuMywyLjQsMy45LDcsNi4xLDEwLjNjNCw2LDEwLjMsMTAuMSwxNy40LDExLjNjNC43LDAuOCw4LjgtMC44LDEyLTQuMmM0LjItNC42LDYuMi0xMC4yLDYuOC0xNi40YzAuNC00LjEsMS4xLTguMiwxLjYtMTIuMiBjMC4zLTIuOCwwLjctNS42LDAuNy04LjVjMC4yLTUuNywxLjYtMTEuMywyLjktMTYuOGMxLjMtNS42LDMuOC0xMS45LDYuNS0xNy41YzEuNS0zLDIuOC02LDQuMi05TDE4OC40LDU2LjkiLz48cGF0aCBkPSJNOTcsNTYuOGg2LjVsMC45LDIuMWMzLjQsMTAsNy44LDE5LjcsMTIuMywyOS4zczEwLjgsMTguOCwxNy4zLDI3LjVjMy4yLDQuMiw2LjUsOC4yLDkuOCwxMi4zYzIuMSwyLjYsNSw0LjIsOC4zLDQuNyBjNi4xLDAuOCwxNC43LTQuOCwxMy44LTEzYy0wLjQtNC41LTEuMy05LTEuNy0xMy41Yy0wLjYtNi0wLjUtMTEuOSwwLjItMTcuOWMxLjMtMTAuNyw1LjYtMjAuNCw5LjktMzBjMC4yLTAuNSwwLjQtMC45LDAuNy0xLjMgaDkuOWMtMC4yLDAuNi0wLjQsMS4xLTAuNiwxLjZjLTIuMiw1LTQuMyw5LjktNi40LDE0LjhjLTMuOSw5LjQtNiwxOS40LTYuMiwyOS42YzAsMS4yLTAuNSwyLjMtMC43LDMuNWwtMC45LDkuOSBjLTAuNSw0LjMtMSw4LjctMi42LDEyLjhjLTAuNywyLTEuNyw0LTIuOSw1LjhjLTMuMyw1LTcuNSw2LjctMTMuMyw1LjFjLTIuNC0wLjctNC42LTEuNi02LjgtMi43Yy0xLjktMC44LTMuMS0yLjQtNC4zLTMuOSBjLTYuMy04LjQtMTEuMS0xNy43LTE2LTI2LjljLTguNi0xNi4xLTE3LjUtMzIuMS0yNi40LTQ3LjlDOTcuNiw1OC4xLDk3LjQsNTcuNiw5Nyw1Ni44Ii8+PHBhdGggZD0iTTE5NS4zLDgwLjljLTIuNCwwLjktMywxLjYtMi45LDQuN2MwLDIuMy0wLjQsNC42LTEuMyw2LjdjLTQuOCwxMi43LTguMywyNS45LTEwLjMsMzkuNGMtMC41LDMuNS0xLjIsNi45LTEuNiwxMC4zIGMtMC44LDYuMy0wLjUsMTIuNywwLjgsMTguOWMwLjYsMy4yLDEuNiw2LjIsMi4yLDkuM2MwLjMsMiwwLjQsNC4xLDAuMiw2LjFjLTAuMSwxLjctMS4xLDIuNC0yLjcsMi4xYy0xLjYtMC4zLTMuMi0wLjgtNC43LTEuNiBjLTIuMi0xLjMtNC4yLTIuNy02LjItNC4zYy03LTYtMTMuOS0xMi4yLTIwLjktMTguM2wtMC43LTAuN2wwLjEtMC40bDEuOSwwLjZjMi43LDEuNCw1LjYsMi40LDguNiwyLjljNy41LDEuMSwxMi45LTEuOCwxNS44LTguOCBjMi40LTUuOCwzLjgtMTIsNC4yLTE4LjNjMC41LTYuNiwwLjctMTMuMiwxLjMtMTkuOGMwLjktOS4zLDMuNS0xOC40LDcuNi0yNi44YzQuMS04LjUsOC42LTE2LjcsMTMtMjUuMWwwLjctMWg4LjIgQzIwNC4yLDY0LjksMTk5LjgsNzIuNywxOTUuMyw4MC45Ii8+PHBhdGggZD0iTTE0Ny44LDE5NS45aC03bC0xMC4yLTExLjZjLTE0LjItMTYuMi0yNS40LTM0LjMtMzQuOS01My42Yy03LjYtMTUuNS0xNi0zMC41LTI3LjItNDMuN2MtNS4zLTYuMi0xMS0xMi4yLTE2LjMtMTguNSBjLTMtMy4zLTUuNi03LTguMy0xMC42bC0wLjYtMWg4LjlsMC45LDEuMmM2LjYsMTAuNywxNC4xLDIwLjcsMjIuNCwzMC4yYzEuNCwxLjUsMi42LDMuMSwzLjcsNC44YzguNCwxMy4zLDE2LjYsMjYuNiwyNSwzOS45IGM2LjgsMTAuOSwxMy43LDIxLjgsMjAuNiwzMi42YzIuOCw0LjMsNiw4LjMsOS4xLDEyLjNjNC4yLDUuNSw4LjUsMTAuOCwxMi43LDE2LjJDMTQ3LDE5NC42LDE0Ny4zLDE5NS4yLDE0Ny44LDE5NS45Ii8+PHBhdGggZD0iTTQ1Ny44LDg0LjVsLTUuOC0zLjNjLTExLjQtNi41LTIzLjQtMTEuNi0zNS41LTE2LjRjLTQuOC0xLjktOS40LTQuNC0xNC02LjZjLTAuNi0wLjMtMS4yLTAuNi0xLjctMSBjMS4yLTAuNSw1Ny45LTAuOCw2NC41LTAuNGw1LjcsNUw0NTcuOCw4NC41Ii8+PHBhdGggZD0iTTI4My4xLDE1NC40bDEtMS42YzEuMi0yLjIsMC45LTQuMi0xLjItNS42Yy0xLjMtMC45LTIuNy0xLjYtNC4yLTIuMWwtMTYuNC01Yy0xLTAuMy0xLjgtMC45LTIuMy0xLjggYy0xLjMtMS45LTIuMS00LjEtMi41LTYuNGwyMC45LDYuMmMwLjctMy4yLDEuMy02LjMsMS45LTkuNGgwLjRjMC4xLDAuMywwLjIsMC43LDAuMiwxYy0wLjEsMy45LDEuNSw3LDQuMSw5LjggYzMuMiwzLjMsNi44LDYuMSwxMC44LDguMmM3LjMsNC4yLDE1LjIsNi45LDIzLjQsOWM2LjUsMS42LDEzLDMuMSwxOS41LDQuNWMyLjQsMC41LDUsMC40LDcuNCwwLjdjMS40LDAsMi44LDAuMiw0LjIsMC40IGMxOS44LTIuMiwzOC4xLDIuNyw1NS42LDEyLjJjLTAuMywwLjQtMC41LDAuOC0wLjcsMS4ybC04LjgtMi45Yy02LjEtMS44LTEyLjEtMy44LTE4LjMtNS4zYy00LjctMS4yLTkuNS0xLjgtMTQuNC0xLjkgYy0xLjgtMC4xLTMuNi0wLjQtNS40LTAuNGMtMS42LDAtMy4yLDAtNC43LDAuMmwtNi40LDAuNWMtMS4xLDAuMS0yLjMsMC4zLTMuNCwwLjZoLTcuMWMtMTAuOSwwLjItMjEuNy0xLjUtMzItNSBjLTYuNS0yLjQtMTMuMi00LjMtMTkuOC02LjVsLTEuNy0wLjciLz48cGF0aCBkPSJNMjYyLjgsNTYuOWg3LjZjLTMsOC43LTcuOSwxNi0xMy44LDIzLjFoMy4xYzYtNi44LDEwLjQtMTQuNywxMy45LTIzLjFoMTYuM2MtMS41LDguNi00LjcsMTYuOC05LjMsMjQuMWgtMTMuNyBjLTAuOCw0LjMtMS42LDguNS0yLjQsMTIuOGgtMTAuNWMtMC43LTQuMi0xLjYtOC41LTIuMy0xMi44aC00LjVDMjUyLjksNzIuOSwyNTkuNiw2NiwyNjIuOCw1Ni45Ii8+PHBhdGggZD0iTTI1Ni4zLDQ2Mi42bC01LjcsOS40Yy0zMi4xLTU1LjYtNjQtMTEwLjktOTYuMS0xNjYuNWwyLjQtMC44YzcuOSwxMy41LDE1LjcsMjcsMjMuNCw0MC40bDIzLjQsNDAuNWwyMy4zLDQwLjRsMjMuNiw0MC44IGw1LjYtOS4zYzEuOCwzLDMuNSw1LjcsNS4zLDguOGwzMS44LTU0LjlsMi4xLDEuN2wtMzMuOCw1OC40TDI1Ni4zLDQ2Mi42Ii8+PHBhdGggZD0iTTE2Mi43LDE5NS45aC0xMS42bC0xLjUtMS45Yy03LjQtOS45LTE1LjEtMTkuNS0yMi4yLTI5LjZjLTUuOS04LjMtMTEuMy0xNy0xNi43LTI1LjZjLTguNS0xMy42LTE2LjctMjcuNC0yNS4zLTQwLjkgYy0zLjgtNS45LTguMy0xMS40LTEyLjUtMTdjLTUuNi03LjMtMTEuNi0xNC40LTE2LjUtMjIuM2wtMS4xLTEuOWg1LjhjMC4zLDAuNSwwLjcsMSwxLDEuNmM1LjgsOS41LDExLjQsMTkuMSwxOC4xLDI4IGMzLjcsNSw3LjgsOS43LDEyLjIsMTQuMWMzLjIsMy4zLDUuOSw3LjIsNy45LDExLjRjMy4zLDYuNyw2LjMsMTMuNSw5LjksMjBjNy4yLDEyLjgsMTUuMiwyNSwyNC45LDM2LjFjMy42LDQuMiw3LjMsOC40LDExLjIsMTIuMyBjMy45LDMuOSw5LjMsOC44LDE0LDEzLjFsMi40LDJMMTYyLjcsMTk1LjkiLz48cGF0aCBkPSJNNjQuMiw1Ni44aDMuM2MwLjQsMC42LDAuOSwxLjEsMS4zLDEuN2M2LjMsOC41LDEyLjUsMTcuMSwxOC45LDI1LjdjMyw0LjEsNi41LDcuOSw5LjcsMTEuOWM0LjUsNS41LDguMywxMS41LDExLjQsMTggYzAuOSwxLjgsMS42LDMuNywyLjMsNS42YzIuNCw3LjUsNi4xLDE0LjYsMTAuOCwyMWM2LjgsOS4xLDEzLjQsMTguMywyMC4zLDI3LjNjNC45LDYuNSwxMC45LDEyLDE3LjgsMTYuMmwxNi44LDEwLjUgYzAuNSwwLjMsMC45LDAuNywxLjEsMS4yaC0xMC43bC0yLjUtMi4yYy04LjYtNy4yLTE2LjgtMTUuMS0yNC4zLTIzLjVjLTEyLjgtMTQuNC0yMy42LTMwLjQtMzIuMS00Ny43Yy0xLjgtMy43LTMuNi03LjMtNS4zLTExIGMtMi4xLTQuOC01LTkuMi04LjYtMTIuOWMtMTAuOC0xMC44LTE5LjUtMjMtMjYuOS0zNi4zQzY2LjUsNjAuNSw2NS40LDU4LjgsNjQuMiw1Ni44Ii8+PHBhdGggZD0iTTIzNi4zLDE4NS4xbDMuNiw2LjZsLTEtMC4xYy04LjItMy41LTE2LjUtNi44LTI0LjYtMTAuNWMtNi44LTIuOS0xMi45LTcuNC0xNy44LTEzLjFjLTQuNC00LjktNi43LTExLjQtNi41LTE4IGMwLTIuMi0wLjItNC41LDAtNi44YzAuMi0yLjIsMC44LTUuMywxLjMtOGMyLjUtMTIuMyw1LjctMjQuNCw5LjYtMzYuM2MwLjItMC42LDAuNC0xLjEsMC43LTEuOWw0LjcsMS44Yy0wLjEsMC42LTAuMywxLTAuNCwxLjUgYy00LjEsMTIuMi03LjQsMjQuNy05LjksMzcuNGMtMi43LDEzLjYsMS45LDI0LjMsMTIuNiwzMi43YzQuNSwzLjQsOS40LDUuOSwxNC41LDguM0wyMzYuMywxODUuMSIvPjxwYXRoIGQ9Ik0xMDYuNCw1Ni45aDIuNGMwLjIsMC42LDAuNiwxLjMsMC44LDEuOWM1LjUsMTQuNiwxMywyOC40LDIyLjQsNDAuOWMzLjEsNC4xLDYuNiw3LjksOS45LDExLjZjMS4zLDEuNiwzLjEsMi42LDUuMSwzLjEgYzQuNywxLjEsMTAuNi0xLjcsMTIuOC02YzAuNC0xLDAuOS0xLjksMS40LTIuOGgwLjNjMC4xLDEuMSwwLjMsMi4yLDAuNSwzLjNjMC43LDMuOCwxLjYsNy41LDEuNSwxMS40Yy0wLjEsNi4yLTQuOSw5LjMtOS42LDkuOCBjLTMuNiwwLjMtNi42LTEuNy04LjgtNC41cy01LjktNy4zLTguNi0xMS4xYy05LjEtMTIuNS0xNy40LTI1LjQtMjMuMy0zOS44Yy0yLjItNS42LTQuNC0xMS4xLTYuNS0xNi43IEMxMDYuNiw1Ny41LDEwNi41LDU3LjIsMTA2LjQsNTYuOSIvPjxwYXRoIGQ9Ik00MDMuNiwxNzcuOWMwLDAuMiwwLDAuNC0wLjEsMC41Yy0wLjEsMC4zLTAuMywwLjUtMC40LDAuN2wtMS42LTAuM2wtMTQuOS0zLjhjLTUuMy0xLjMtMTAuNi0yLjQtMTYtMy42IGMtMS45LTAuMy0zLjktMC40LTUuOS0wLjRjLTMuMS0wLjItNi4yLTAuNS05LjMtMC42Yy0zLjEtMC4xLTQuMiwwLjItNi4yLDAuM2wtMS45LDAuMmwtMjEuNywxLjNsLTE1LjEsMS4zYy00LjgsMC4zLTkuNS0wLjQtMTQtMiBsLTE4LjgtNi40bC0xLjUtMC42Yy0wLjEtMi43LDEuOC02LDQuNi04LjFsMS45LDAuNmMxMC42LDMuMywyMS4xLDYuOCwzMS44LDkuOWM2LjYsMS45LDEzLjUsMi4zLDIwLjMsMmwxOS42LTAuOCBjMS0wLjEsMi0wLjIsMy0wLjRsMS42LTAuMWMyLjcsMC4xLDUuNCwwLjIsOC4xLDAuNmM2LDEsMTIuMSwxLjgsMTcuOSwzLjZsMTcuNyw1LjZMNDAzLjYsMTc3LjkiLz48cGF0aCBkPSJNMTU4LDU2LjloNC41Yy0wLjIsMC43LTAuNCwxLjMtMC42LDEuOGMtMy42LDkuOS01LDIwLjQtNC4xLDMwLjljMC4xLDIuMywwLjIsNC41LDAuNCw2LjhjMC4xLDEuMSwwLjIsMi4xLDAuNSwzLjIgYzEuMSw0LjItMS4zLDkuNS01LjIsMTEuMmMtMC45LDAuNS0xLjgsMC44LTIuOCwxLjFjLTIuNCwwLjUtNC44LTAuMy02LjUtMi4xQzEzMyw5OC40LDEyMy43LDg1LDExNy4xLDcwLjMgYy0xLjctMy45LTMuMy03LjktNC45LTExLjljLTAuMS0wLjQtMC4yLTAuOS0wLjQtMS41aDIuM2wwLjcsMS4yYzIuMiw0LjUsNC40LDkuMSw2LjgsMTMuNGMzLjksNy4xLDguOCwxMy43LDE0LjUsMTkuNSBjMS40LDEuMywyLjksMi41LDQuNSwzLjZjNC43LDMuNSwxMC41LDEuMSwxMy4yLTEuOWMyLjctMywyLjktNS43LDMuMS04LjljMC4xLTIuNCwwLTQuNy0wLjMtN2MtMC43LTYuNC0wLjMtMTIuOSwxLjItMTkuMiBDMTU3LjgsNTcuNCwxNTcuOSw1Ny4xLDE1OCw1Ni45Ii8+PHBhdGggZD0iTTI0NS4xLDE2OC41YzIuOSwwLjcsNS44LDEuNCw4LjcsMi4ybDIwLjYsNi4xYzAuNywwLjEsMS40LDAuMiwyLjEsMC4yYzAuMS0wLjEsMC4xLTAuMywwLjEtMC40bDE4LjYsNyBjNS45LDIuMiwxMS43LDQuNSwxOCw1LjdsNC41LDAuNmwxNS4yLDJsMS4zLDAuMWMzLjEsMC4yLDYuMiwwLjIsOS4zLDAuOHM3LjEsMC43LDEwLjcsMS4xbDE1LDEuNmwwLjcsMC4xIGMtMC4xLDAuMS0wLjEsMC4yLTAuMSwwLjNoLTU5LjdjLTAuOSwwLTEuOC0wLjItMi42LTAuNWMtMTMuMy01LjQtMjYuNi0xMC44LTM5LjgtMTYuNGMtNi42LTIuOC0xMy4yLTUuOC0xOS43LTguOCBjLTEtMC40LTEuOS0xLTIuOC0xLjRDMjQ0LDE2OC41LDI0NSwxNjguNiwyNDUuMSwxNjguNSIvPjxwYXRoIGQ9Ik0wLDM3LjloOS43bC00LjItNy42YzEuMi0wLjUsMjMuNi0wLjYsMjUuNi0wLjFjMC4xLDAuNiwwLjIsMS4zLDAuNCwyLjJIOS43YzEuNiwyLjcsMi44LDUuMSw0LjQsNy44IGMtMy4zLDAuMi02LjMsMC4xLTkuNiwwLjNjMjcuOCw0OC4yLDU1LjYsOTYuNCw4My40LDE0NC40Yy0yLjIsMC42LTIuOSwwLjMtMy45LTEuNGMtMy4xLTUuMy02LjItMTAuNi05LjItMTZMMSwzOS44IEMwLjcsMzkuNCwwLjUsMzguOCwwLDM3LjkiLz48cGF0aCBkPSJNMjM1LjEsMTc1LjdjLTEuOSwzLjItMS45LDMuMi0xLjIsNS4zbC0xLjMtMC40Yy0yLjgtMS4zLTUuNi0yLjQtOC40LTMuN2MtNy40LTMuNC0xNC4xLTguMS0xOS43LTEzLjkgYy00LjUtNC43LTYuMi0xMC41LTYuNS0xN2MtMC4xLTUuNCwwLjYtMTAuNywyLjItMTUuOWw4LTI4bDAuNy0xLjlsNC43LDIuMmMtMC4zLDAuOC0wLjQsMS42LTAuNywyLjJjLTMuNCw4LjgtNS44LDE3LjktOC4yLDI2LjkgYy0xLjQsNS4xLTEuNSwxMC41LTAuNCwxNS43YzEuNCw2LjEsNC43LDExLjYsOS40LDE1LjdjMy45LDMuNiw4LjQsNi42LDEzLjMsOC44bDYuOCwzLjNMMjM1LjEsMTc1LjciLz48cGF0aCBkPSJNMzk3LjQsMTQwLjVjLTAuOC0wLjMtMS42LTAuNi0yLjMtMWMtNC4yLTIuMi04LjgtMy4xLTEzLjQtMy43Yy02LTAuOC0xMS45LTIuMS0xNy42LTRjLTMuNC0xLjEtNi40LTMuMi04LjgtNS45IGMtMi4yLTIuNS0zLTYtMi05LjNjMS40LTQuNyw0LjItOC44LDguMS0xMS43YzguOS03LDE5LjEtOS41LDMwLjMtOS4yYzUuOSwwLjIsMTEuNiwwLjgsMTcsMy4yYzMuMywxLjQsNi41LDIuNyw5LjYsNC41IGM2LjgsMy44LDEzLjcsNy43LDIwLjQsMTEuNmMwLjQsMC4yLDAuNywwLjQsMSwwLjdsLTIuNyw0LjdsLTEuNi0wLjlsLTE2LjMtOS42Yy02LjItMy42LTEyLjYtNi44LTE5LjctOC4zIGMtMy4zLTAuOC02LjctMS40LTEwLjItMS42Yy0zLjMtMC4xLTYuNiwwLjItOS44LDAuOGMtNy4xLDEuMS0xMy42LDMuOS0xOC45LDguOGMtMiwxLjgtMy43LDQtNC45LDYuNWMtMS44LDMuNi0xLjMsNywxLjUsOS45IGMxLjQsMS4zLDMsMi40LDQuNywzLjNjNC45LDIuNCwxMC4zLDMuNSwxNS43LDQuNWM1LjMsMSw5LjEsMS43LDEzLjYsMi45YzEuOSwwLjQsMy42LDEuNSw1LjQsMi40YzAuNCwwLjMsMC44LDAuNiwxLjIsMSBMMzk3LjQsMTQwLjUiLz48cGF0aCBkPSJNMjM5LjMsMTcyLjVsLTIsMS41Yy0yLjctMS4zLTUuNC0yLjQtNy45LTRjLTQuNC0yLjUtOC42LTUuMi0xMi43LTguMWMtNS44LTQuMS05LjUtMTAuNC0xMC4yLTE3LjQgYy0wLjYtNC42LTAuMi05LjMsMS4yLTEzLjhjMi41LTguNyw1LjMtMTcuMiw4LTI1LjhjMC4xLTAuMywwLjMtMC43LDAuNC0xbDQuMiwyLjdjLTAuMiwwLjYtMC40LDEuMi0wLjYsMS43IGMtMy4xLDcuNy01LjUsMTUuNi03LjMsMjMuN2MtMS44LDguNCwwLjUsMTUuOCw1LjksMjIuMmM0LDQuNyw4LjksOC41LDE0LjQsMTEuNGM3LDMuOCwxNC4yLDcuMywyMS4zLDEwLjhsMS41LDAuOCBjMCwwLjEtMC4xLDAuMi0wLjEsMC40TDIzOS4zLDE3Mi41Ii8+PHBhdGggZD0iTTE1Mi40LDU2LjloMi43Yy0wLjEsMC43LTAuMiwxLjUtMC4zLDIuMmMtMS4xLDQuMi0wLjcsOC42LTAuOCwxMi45YzAsMi4yLTAuMSw0LjMtMC4xLDYuNHMwLjIsMiwwLjMsMyBjMC4xLDAuNywwLjEsMS4zLDAuMSwyYy0wLjEsMS4xLTAuMywyLjItMC40LDMuM2MtMC41LDMuNi0zLDUuNS02LDYuN3MtNS4xLDAuMS03LjEtMS45cy00LjUtNC42LTYuNy03IGMtNy4xLTcuOC0xMi43LTE3LTE2LjMtMjYuOWMtMC4xLTAuMi0wLjEtMC40LTAuMi0wLjhsMi42LTAuMWwxLDEuNmMyLjQsNC4zLDUuMSw4LjUsOC42LDEyLjFjMiwyLjEsNC4xLDQsNi41LDUuNyBjNC43LDMuMywxMiwzLjEsMTUuMS00LjZjMC44LTIuNCwxLjItNSwxLjItNy42QzE1Mi41LDYxLjYsMTUyLjQsNTkuMywxNTIuNCw1Ni45Ii8+PHBhdGggZD0iTTIxNy43LDM2Ny43bC0zNS45LTYyLjJoNS45YzAuNCwwLjQsMC43LDAuOSwxLDEuM2M3LjMsMTEuNiwxNC43LDIzLjEsMjEuOSwzNC42YzMuMiw1LDUuOCwxMC41LDYuOSwxNi4zIGMwLjYsMywwLjUsNiwwLjcsOS4xYzAsMC4zLTAuMSwwLjUtMC4xLDAuN0wyMTcuNywzNjcuNyIvPjxwYXRoIGQ9Ik0zMjksNTYuOWMtNC4zLDcuOC01LjQsMTYuMi03LjMsMjQuM2gtMTYuNWMyLjgtOC4xLDMuOC0xNi4yLDUuNC0yNC4zTDMyOSw1Ni45eiIvPjxwYXRoIGQ9Ik0yNjYuOSwzNjNjMC4xLDAuOCwwLjEsMS43LDAsMi41Yy0wLjgsNS43LTEuOCwxMS40LTMuMSwxNi45Yy0zLjMsMTMuNS04LjIsMjYuMy0xMy43LDM5bC0wLjcsMS4ybC03LTEyLjIgYzUuMi0xMC4yLDguNC0yMS4xLDEwLjUtMzIuM2MxLjksNS4zLDIuOCwxMC45LDQuNSwxNi4zaDEuN2MwLjQtMi4xLDAuOC00LjIsMS4zLTYuMmMxLjMtNi41LDIuNy0xMy4xLDQuMi0xOS43IGMwLjUtMS45LDEuMi0zLjgsMS45LTUuNkwyNjYuOSwzNjN6Ii8+PHBhdGggZD0iTTI4My44LDgwLjljNC43LTcuNiw3LjMtMTUuNiw5LTI0aDE1Yy0xLjIsOC4yLTIuMiwxNi4zLTUuNCwyNEgyODMuOHoiLz48cGF0aCBkPSJNMjM5LjIsMTY1LjlsLTQuNi0yLjZjLTQuOC0yLjctOS42LTUuNy0xMy41LTkuNmMtMy45LTMuOS02LjYtOS4zLTYuNS0xNS41YzAtNC40LDAuNy04LjgsMi4yLTEzYzEuNy00LjgsMy4zLTkuNiw1LTE0LjQgYzAuMy0wLjgsMC42LTEuNiwxLTIuNGwzLjgsMy4zbC0wLjcsMS45Yy0xLjksNC44LTMuOCw5LjYtNC43LDE0LjhjLTAuNywzLjgtMC43LDcuNi0wLjEsMTEuNGMwLjUsMi44LDEuNyw1LjQsMy42LDcuNiBjMy4zLDQuMSw3LjEsNy43LDExLjQsMTAuOGMwLjUsMC4zLDAuOSwwLjcsMS4yLDEuM0MyMzcuOSwxNjEuNSwyMzguNSwxNjMuNiwyMzkuMiwxNjUuOSIvPjxwYXRoIGQ9Ik0zNzAuNCw1Ni45aDYuN2MxLjksMS41LDMuOSwzLjIsNS45LDQuOGM3LjgsNi4yLDE1LjksMTEuNywyNC45LDE2YzExLjQsNS4zLDIyLjksMTAuOCwzNC4yLDE2LjJjMi4yLDEsNC4yLDIuMyw2LjIsMy40IGwxLjUsMWwtMi4yLDMuOGwtMC45LTAuM2wtNDEtMjEuNGMtOC40LTQuMi0xNi4zLTkuMS0yMy44LTE0LjdsLTEwLjMtNy41bC0xLjMtMUMzNzAuNCw1Ny4xLDM3MC40LDU2LjksMzcwLjQsNTYuOSIvPjxwYXRoIGQ9Ik0xNDQuNiw1Ni45aDUuNWMwLjEsMC42LDAuMSwxLjIsMC4xLDEuOGMtMC4zLDMuNi0wLjYsNy4zLTEuMSwxMWMtMC42LDMuMy0zLjMsNS43LTYuNiw2Yy0xLjIsMC4xLTIuMy0wLjEtMy4zLTAuNyBjLTEuNC0wLjktMi43LTEuOS0zLjktM2MtNC4yLTMuNy03LjktOC0xMC44LTEyLjhsLTEuMy0yLjRjMS40LDAuMSwyLjgsMC4xLDQuMiwwYzEuOS0wLjIsMy43LDAuMyw1LjIsMS41IGMxLjMsMS4xLDIuOCwxLjcsNC41LDEuOWMyLjYsMC40LDQuOSwwLDYuNy0yLjFMMTQ0LjYsNTYuOSIvPjxwYXRoIGQ9Ik0zODEuNCw1Ni44aDQuMmw1LjksNC4zYzcuNyw1LjQsMTYsOS45LDI0LjcsMTMuNGM5LjksNC4xLDE5LjksOC40LDI5LjMsMTMuN2w2LjEsMy42bDEuNCwxYy0wLjcsMS4yLTEuMywyLjItMS45LDMuNCBsLTAuOS0wLjRjLTEzLjQtNy44LTI3LjUtMTQuNS00MS43LTIwLjdjLTUuOS0yLjYtMTEuNS01LjktMTYuNy05LjhjLTMuMS0yLjQtNi40LTQuNy05LjYtN2wtMS0wLjkgQzM4MS4zLDU3LDM4MS40LDU2LjksMzgxLjQsNTYuOCIvPjxwYXRoIGQ9Ik00NTYuNCw4Ni45bC0xLjgsMy4xbC0wLjgtMC4zYy0xMi40LTcuMi0yNS4zLTEzLjQtMzguNy0xOC41Yy04LjQtMy40LTE2LjMtNy45LTIzLjYtMTMuNGMtMC4zLTAuMi0wLjYtMC40LTAuOC0wLjcgYzIuMi0wLjIsNC4yLTAuNyw2LjEsMC42YzguMiw1LjMsMTcuMSw5LjIsMjYuMywxMi41YzExLjQsNCwyMi4yLDkuNCwzMi4zLDE2TDQ1Ni40LDg2LjkiLz48cGF0aCBkPSJNNDMxLjcsMTI5LjdjLTMuNSw1LjktNi44LDExLjctMTAuMiwxNy43bC0xLTEuMmMtMi4zLTMtNC41LTYuMS02LjktOWMtMS43LTIuMS0yLjQtNC43LTEuOS03LjNjMC4yLTIuNCwyLjItNC4yLDQuNS00LjIgYzEuNS0wLjEsMy4xLDAuMSw0LjYsMC40YzMuMiwwLjksNi4zLDIsOS41LDNMNDMxLjcsMTI5LjciLz48cGF0aCBkPSJNMjI4LjQsMTEzLjhsMywzLjVjLTAuNiwyLTEuMiw0LTIsNS45Yy0xLjksNC4yLTEuMyw4LjQtMC4xLDEyLjdjMC4xLDAuNiwwLjQsMS4yLDAuNiwxLjlsLTAuNiwxbDQuOCw4IGMxLjUsMi42LDMuMiw1LjEsMy4xLDguM2MtMC4yLDAuMS0wLjMsMC4xLTAuNCwwLjFjLTMuNi0yLjYtNy01LjMtOS44LTguOWMtMy41LTQuNC01LTEwLTQuMi0xNS42IEMyMjMuNywxMjQuOCwyMjYsMTE5LjUsMjI4LjQsMTEzLjgiLz48cGF0aCBkPSJNMzA3LjcsMzQzLjZjMy42LTEzLjQsMy0yNi4zLTUuNy0zOC4xaDUuMmM1LjIsNS45LDguNiwxMywxMS4yLDIwLjZMMzA4LDM0My44TDMwNy43LDM0My42Ii8+PHBhdGggZD0iTTI1NC4zLDEzMC45YzAuOSwyLjUsMS42LDQuOSwyLjUsNy40bC0xLjYtMC40Yy01LTEuMy0xMC4yLTIuNS0xNS4zLTMuOWMtMS43LTAuNS0zLjYtMC4yLTUsMC44bC0yLjQsMS41IGMtMi40LTQuNS0xLjktMTEuNCwwLjgtMTYuMmwxLjIsMS43YzEuNCwyLjQsMy43LDQuMSw2LjQsNC45QzI0NS40LDEyOCwyNDkuOCwxMjkuNiwyNTQuMywxMzAuOSIvPjxwYXRoIGQ9Ik0yMjguNywzMDUuNGgxNC41YzMuMSwxLjMsNS43LDIuNCw4LjQsMy4zYzEsMC4zLDEuOSwxLDIuNCwxLjljMSwxLjgsMi4xLDMuNSwzLDUuMmwtMC4yLDAuM2wtMi40LTAuNmwtOC40LTIgYy0xLjctMC42LTMuNy0wLjMtNS4yLDAuN2wtMi42LDEuNGMxLjQsMy43LDMuNiw3LjEsNC4yLDExLjFMMjI4LjcsMzA1LjQiLz48cGF0aCBkPSJNMjU5LjUsNTYuOWMtMC43LDQuNS05LjQsMTcuNy0xNS44LDI0aC03LjFjMC40LTAuNywwLjYtMS4yLDAuOS0xLjZjMS45LTIuNSwzLjYtNSw1LjUtNy41YzMuMy00LjQsNi4zLTkuMSw4LjgtMTMuOSBsMC42LTFMMjU5LjUsNTYuOXoiLz48cGF0aCBkPSJNMjQyLDU2LjloN2MtNCw4LjktMTAuMiwxNi4yLTE1LjcsMjRoLTYuN2MwLjQtMC43LDAuNi0xLjIsMC45LTEuNmMxLjktMywzLjgtNi4xLDUuNy05LjFDMjM2LjEsNjUuOCwyMzksNjEuNCwyNDIsNTYuOSIgLz48cGF0aCBkPSJNMjMxLjQsNTYuOGg3LjVjLTAuMywwLjYtMC42LDEuMi0xLDEuOEwyMjguMyw3M2MtMS43LDIuNi0zLjIsNS4zLTQuOSw3LjloLTYuM0MyMjEuMSw3Mi41LDIyNS45LDY0LjQsMjMxLjQsNTYuOCIvPjxwYXRoIGQ9Ik0yMjAuOCw1Ni44aDcuNmMtNS4yLDgtMTAuNCwxNS43LTE0LjIsMjQuMUgyMDhDMjExLjMsNzIuMywyMTYsNjQuNSwyMjAuOCw1Ni44Ii8+PHBhdGggZD0iTTIxMS45LDU2LjloNi4yYy00LjksOC05LjcsMTUuNy0xMy4zLDI0aC02LjRDMjAyLjMsNzIuNCwyMDcuMSw2NC43LDIxMS45LDU2LjkiLz48cGF0aCBkPSJNMzUxLjUsMzExLjNsMi4yLDAuOGMtOS43LDE3LTE5LjQsMzMuNy0yOS4yLDUwLjdsLTEuNS0xLjlDMzIzLjIsMzU5LjQsMzUwLjMsMzEyLjUsMzUxLjUsMzExLjMiLz48cGF0aCBkPSJNMTYxLjEsOTUuMmMtMi42LTEzLjItMC4xLTI1LjgsNC4zLTM4LjRoNi44Yy0wLjQsMC45LTAuNiwxLjUtMC45LDIuMWMtMy41LDcuNC02LjYsMTQuOS04LjMsMjNjLTAuOSwzLjktMS40LDgtMS40LDEyIGMwLDAuNCwwLDAuOS0wLjEsMS4zSDE2MS4xIi8+PHBhdGggZD0iTTEwMi45LDI4Ni4xaDMuNmw1LjgsNy4zaDAuMnYtNy4xaDMuNnYxMy4xaC0zLjZsLTUuNi03LjFsLTAuNCwwLjF2N2gtMy42VjI4Ni4xeiIvPjxwYXRoIGQ9Ik0xMDEsMTY0LjljOC44LDkuNywxNi4xLDIwLjUsMjQuMSwzMC42Yy0wLjEsMC4xLTAuMSwwLjMtMC4xLDAuNGgtNi40bC0xNy45LTMwLjlMMTAxLDE2NC45Ii8+PHBhdGggZD0iTTI0OC41LDM0MS43Yy0wLjgtMS45LTEuNi0zLjktMi40LTUuOWwwLjEtMC40bDIwLDYuNWMwLjIsMi4xLDAuNCw0LjIsMC43LDYuNUwyNDguNSwzNDEuNyIvPjxwYXRoIGQ9Ik0xNDguNiwyOTkuM1YyODZjMi40LDAuMSw0LjktMC40LDcuMywwLjRjMi45LDEuMSw0LjcsNCw0LjQsNy4xYy0wLjMsMy0yLjYsNS40LTUuNiw1LjggQzE1Mi43LDI5OS40LDE1MC42LDI5OS40LDE0OC42LDI5OS4zIE0xNTIuMywyOTYuMWMxLjYsMC4zLDIuOS0wLjEsMy42LTEuNmMwLjctMS4yLDAuNy0yLjctMC4xLTMuOWMtMC43LTEuMi0yLjItMS44LTMuNi0xLjMgTDE1Mi4zLDI5Ni4xeiIvPjxwYXRoIGQ9Ik0zMjMuNCwyOTQuMWMxLjMsMS43LDIuNSwzLjMsMy45LDUuM2gtNC41bC0yLjctNGgtMC4zdjMuOWgtMy43di0xMy4xYzIuNCwwLDQuNy0wLjEsNywwLjFjMi4zLDAuMiwyLjUsMS42LDIuNywzLjIgYzAuMiwxLjYtMC4xLDMuMi0xLjcsNC4yTDMyMy40LDI5NC4xIE0zMjAsMjg5djIuN2MxLjMsMC4zLDIuMS0wLjEsMi4zLTEuM0MzMjIuNSwyODkuMSwzMjEuMywyODguNywzMjAsMjg5Ii8+PHBhdGggZD0iTTEzNC43LDE0Mi40Yy0wLjktMC42LTEuNy0xLjMtMi40LTIuMWMtMi43LTMuMi01LjMtNi40LTcuOS05LjZjLTIuNS0zLjMtNC41LTguNS01LjktMTMuMWMtMC45LTMuMS0yLjEtNi4yLTMtOS4zIGMtMC4yLTAuNi0wLjMtMS4xLTAuMy0xLjdsMC40LTAuMmM2LjUsMTEuOSwxMywyMy43LDE5LjUsMzUuNUwxMzQuNywxNDIuNCIvPjxwYXRoIGQ9Ik0xOTEuOSwyODYuMWgzLjZjMC4xLDAuNiwwLjEsMS4xLDAuMSwxLjd2Ni4yYzAuMSwxLjYsMC44LDIuNSwyLjIsMi41czIuMS0wLjksMi4yLTIuNGMwLjEtMS42LDAtNCwwLjEtNS45IGMwLTAuNywwLTEuMywwLjEtMmgzLjVjMC4xLDAuNiwwLjEsMS4xLDAuMSwxLjd2Ni4xYzAsMi4zLTAuOSw0LjItMyw1LjJjLTIuMiwxLjItNSwwLjktNy0wLjZjLTAuNi0wLjUtMS4xLTEuMi0xLjMtMS45IEMxOTEuNiwyOTMuMSwxOTIuMSwyODkuNiwxOTEuOSwyODYuMSIvPjxwYXRoIGQ9Ik0zMjQuNSwzMTUuNGwtNC4yLDcuMkgzMjBjLTIuMi02LTUuNS0xMS42LTkuMi0xNy4xaDcuNkwzMjQuNSwzMTUuNCIvPjxwYXRoIGQ9Ik05NS40LDMyLjRjMC4yLTAuOSwwLjMtMS41LDAuNC0yYzEuNi0wLjcsMzMuNy0wLjcsMzUuMywwYy0wLjIsMC43LTAuMywxLjMtMC40LDJIOTUuNHoiLz48cGF0aCBkPSJNMjQ0LjgsMjg2LjljLTAuNCwwLjktMC45LDEuNy0xLjMsMi42Yy0xLjMtMC4zLTIuNy0xLjYtMy45LDAuNGwxLjQsMWwxLjUsMC41YzIsMC43LDIuOCwxLjgsMi45LDMuNiBjMC4xLDEuOS0xLDMuNy0yLjgsNC41Yy0yLjQsMC45LTUuMiwwLjQtNy4xLTEuM2wxLjMtMi41YzMuOCwxLjUsMy45LDEuNSw0LjgtMC4zYy0wLjQtMC4zLTAuOS0wLjYtMS4zLTAuOWwtMS4zLTAuNCBjLTIuMy0wLjgtMy4xLTEuOS0zLTMuOGMwLTIuMSwxLjQtMy44LDMuNC00LjNDMjQxLjIsMjg1LjQsMjQzLjIsMjg1LjgsMjQ0LjgsMjg2LjkiLz48cGF0aCBkPSJNNDQxLjEsMjg5LjVjLTIuOC0xLTMuMS0xLTMuNiwwLjdjMC43LDAuMywxLjQsMC42LDIuMSwwLjljMi43LDAuOSwzLjYsMi4xLDMuNCw0LjNjLTAuMiwyLjItMS42LDMuOC00LDQuMiBjLTIuMSwwLjQtNC4yLTAuMi01LjktMS41bDEuNC0yLjdjMy42LDEuNiw0LjUsMS42LDQuNi0wLjZsLTIuNi0xYy0yLjMtMC44LTMtMS44LTIuOC00LjJjMC4xLTIsMS43LTMuNiwzLjYtMy45IGMxLjgtMC4zLDMuNywwLjIsNS4yLDEuMkw0NDEuMSwyODkuNSIvPjxwYXRoIGQ9Ik0xMDAuMSw3OS4zYy0wLjQtMC40LTAuNy0wLjgtMS0xLjNjLTIuNC0zLTQuNy02LjEtNy4yLTkuMWMtMS4yLTEuMy0yLjUtMi42LTMuOC0zLjlsLTcuOC03LjNsLTAuNi0wLjlIODcgYzUuNiw2LjcsOS4zLDE0LjUsMTMuNywyMkwxMDAuMSw3OS4zIi8+PHBhdGggZD0iTTM5NC4zLDI5OS4zdi0xMy4yaDcuNnYyLjhsLTMuOSwwLjN2MS44bDMuNiwwLjF2Mi45bC0zLjYsMC4ydjEuOWgzLjl2My4xSDM5NC4zeiIvPjxwYXRoIGQ9Ik0yODEuNCwxOTMuNWMtMC43LTIuNC0xLjMtNC4zLTItNi41bDIxLjksOC42Yy0wLjEsMC4xLTAuMSwwLjItMC4xLDAuM2gtMTIuNmMtMC45LTAuMS0xLjktMC4zLTIuNy0wLjYgQzI4NC4yLDE5NC43LDI4Mi43LDE5NCwyODEuNCwxOTMuNSIvPjxwYXRoIGQ9Ik00OS43LDI5MS4ydjIuNEgyMC40YzAtMC4zLTAuMS0wLjctMC4xLTF2LTEuNEg0OS43eiIvPjxwYXRoIGQ9Ik00NTguNywyOTMuNHYtMi4yaDI5LjRjMCwwLjcsMC4xLDEuNCwwLjEsMi4xQzQ4Ni45LDI5My44LDQ2MC41LDI5My44LDQ1OC43LDI5My40Ii8+PHBhdGggZD0iTTI1MS40LDQ3NC40YzEuNi0yLjYsMy01LDQuNy03LjhsNC42LDcuN2wtNC42LDcuOEwyNTEuNCw0NzQuNCIvPjxwYXRoIGQ9Ik0yNzguNiwyODkuM2wtMi42LTAuNHYtMi45aDkuMXYyLjlsLTIuNywwLjR2MTBoLTMuOFYyODkuM3oiLz48cGF0aCBkPSJNMTUzLjksMzIuNGwtMC40LTIuMmMwLjYtMC4yLDEuMy0wLjMsMS45LTAuM0gxNzZsMS43LDAuMnYyLjJIMTUzLjl6Ii8+PHJlY3QgeD0iMzU4LjQiIHk9IjI4Ni4xIiB3aWR0aD0iMy40IiBoZWlnaHQ9IjEzLjMiLz48cmVjdCB4PSI2Ni45IiB5PSIyODYuMSIgd2lkdGg9IjMuNSIgaGVpZ2h0PSIxMy4yIi8+PHBhdGggZD0iTTMzMC4yLDMwNS41bC00LjIsNy40bC00LjQtNy40SDMzMC4yeiIvPjxwYXRoIGQ9Ik00NzMuNyw1Ni45bC0xLjYsMi43bC0yLjktMi40bDAuMi0wLjRINDczLjd6Ii8+PHBhdGggZD0iTTEzOS43LDU3LjFoLTN2LTAuMmgyLjlDMTM5LjYsNTcsMTM5LjYsNTcsMTM5LjcsNTcuMSIvPjxwYXRoIGQ9Ik0yMTQuNSwxOTUuNmgyLjN2MC4yaC0yLjNWMTk1LjYiLz48cGF0aCBkPSJNMjc3LjgsMTk1LjVjMC4xLTAuMSwwLjMtMC4yLDAuNC0wLjFjMC4xLDAuMSwwLjQsMC4xLDAuNywwLjRsLTAuNywwLjJsLTAuNS0wLjFWMTk1LjUiLz48cGF0aCBkPSJNMzc1LjEsMTI2Yy0yLjcsMC01LjMtMS03LjQtMi43Yy0xLjEtMC45LTIuMi0xLjktMy4xLTNjLTEuMy0xLjQtMS4zLTMuNiwwLjEtNC45YzAuMy0wLjMsMC42LTAuNSwwLjktMC42IGMzLjYtMS45LDcuMy0zLjYsMTEtNS4zYzEuOS0wLjksNC43LDEsNC43LDMuMWMwLjEsMS40LDAuNSwyLjgsMS4zLDQuMWMwLjQsMC44LDAuNywxLjYsMC45LDIuNGMwLjYsMi0wLjIsNC4xLTIuMSw1IEMzNzkuNSwxMjUuMywzNzcuNCwxMjYsMzc1LjEsMTI2Ii8+PC9nPjwvc3ZnPg==\"); }\n  /* EMBLEM_MASK_END */\n\n      /* HERO_LOGO_BEGIN (generated by scripts/build-logo.js — do not edit by hand) */\n  /* Hero brand mark, alpha masks only — the colours come from the stylesheet so\n     each scheme can carry measured values (see the [data-endfield-hero-logo]\n     block). Body outline 1482 bytes / 2KB base64,\n     wordmark 4384 bytes / 6KB base64.\n     Regenerate: node scripts/build-logo.js */\n  body {\n    --edge-hero-logo-body-mask: url(\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDI0LjAwMDAwMCA0NTguMDAwMDAwIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLjAwMDAwMCw0NTguMDAwMDAwKSBzY2FsZSgwLjEwMDAwMCwtMC4xMDAwMDApIj48cGF0aCBkPSJNMjUwIDM4NTAgbDAgLTQ4MCAyMDQwIDAgMjA0MCAwIDAgLTIxMCAwIC0yMTEgMjkgLTU3IGMxMTYgLTIyOSAxMTUgLTU1NSAtMSAtNzg2IC0zMCAtNTkgLTMwIC02MSAtMTggLTEzNSA2MiAtNDA0IDM0OSAtNzE1IDc0MCAtODAyIDgxIC0xOCAxNDkgLTE5IDE1MjMgLTE5IGwxNDM3IDAgMCAtMjYwIGMwIC0xNDMgMyAtMjYwIDggLTI2MCA0IDAgMjEgOCAzNyAxOCAxNyAxMCA1MCAzMCA3NSA0NCA1MCAyNyA0OTMgMjgzIDc0NSA0MjggODggNTEgMTc0IDEwMSAxOTAgMTEwIDQyIDIzIDM0MyAxOTcgNTAwIDI4OCA3MiA0MiAxNDAgODEgMTUyIDg2IDEzIDYgMjMgMTQgMjMgMTcgMCAzIC01MyAzNSAtMTE3IDcxIGwtMTE4IDY3IC03NSAtMjUgYy0xMzQgLTQ0IC0yMzcgLTU0IC01ODcgLTU0IGwtMzIzIDAgLTIgMzI2IC0zIDMyNiAtNDAgMjMgYy0yMiAxMiAtMTIzIDcwIC0yMjQgMTI5IC0xMDIgNTggLTE4OCAxMDYgLTE5MiAxMDYgLTMgMCAtMTIgNyAtMTkgMTUgLTcgOCAtMTYgMTUgLTIxIDE1IC01IDAgLTkgLTExNSAtOSAtMjU1IGwwIC0yNTUgLTEyNSAwIC0xMjUgMCAwIC00NSAwIC00NSAzNjAgMCAzNjAgMCAtMiAtMTY3IC0zIC0xNjggLTU0NyAtMyAtNTQ4IC0yIDAgMjE1IDAgMjE1IC00MTYgMCAtNDE1IDAgMyAtNDcgMyAtNDggMzY4IC0zIDM2NyAtMiAwIC0xNjUgMCAtMTY1IC01NTcgMiAtNTU4IDMgLTMgMjEzIC0yIDIxMiAtNzUgMCAtNzUgMCAwIC0yMTUgMCAtMjE1IC0xOTAgMCAtMTkwIDAgMCAyMTUgMCAyMTUgLTE5MCAwIC0xOTAgMCAwIDk1IDAgOTUgLTE5MCAwIC0xOTAgMCAwIC0zMTAgMCAtMzEwIC0xOTAgMCAtMTkwIDAgMCA4MTQgMCA4MTMgNTggNSBjMzEgMyAyMDIgNSAzNzkgNCBsMzIzIC0xIDAgODEgYzAgMzcwIC0yMzQgNzIxIC01NzYgODY0IC0xNzEgNzEgNDkgNjUgLTIzMjYgNjggbC0yMTM4IDIgMCAtNDgweiIvPjxwYXRoIGQ9Ik03OTA4IDMwMDIgbC0xMTggLTMgMCAtMTg0IDAgLTE4NSAxMjUgMCAxMjUgMCAwIDE4NCBjMCAxMDIgLTMgMTg2IC03IDE4OCAtNSAyIC02MSAyIC0xMjUgMHoiLz48cGF0aCBkPSJNNDkxMCAyODA2IGMwIC0xNTggMiAtMTc1IDE4IC0xODAgOSAtMyA5NSAtNCAxODkgLTMgbDE3MyAyIDAgMTc4IDAgMTc3IC0xOTAgMCAtMTkwIDAgMCAtMTc0eiIvPjxwYXRoIGQ9Ik04OTMwIDIwNTYgbDAgLTU2IDkyIDAgYzEwNCAwIDEwNCAtMSAtNyA2MCAtMzMgMTggLTY2IDM3IC03MiA0MyAtMTAgNyAtMTMgLTMgLTEzIC00N3oiLz48cGF0aCBkPSJNNzY2MCA0NDAgbDAgLTE5MCAxODggMiAxODcgMyAwIDE4NSAwIDE4NSAtMTg3IDMgLTE4OCAyIDAgLTE5MHoiLz48L2c+PC9zdmc+\");\n    --edge-hero-logo-ink-mask: url(\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDI0LjAwMDAwMCA0NTguMDAwMDAwIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLjAwMDAwMCw0NTguMDAwMDAwKSBzY2FsZSgwLjEwMDAwMCwtMC4xMDAwMDApIj48cGF0aCBkPSJNMjU3IDMzMTMgYy00IC0zIC03IC0zNzIgLTcgLTgyMCBsMCAtODEzIDU2MCAwIDU2MCAwIDAgMTY1IDAgMTY1IC0zNzAgMCAtMzcwIDAgMCAxNjUgMCAxNjUgMzIwIDAgMzIwIDAgMCAxNjUgMCAxNjUgLTMyMCAwIC0zMjEgMCAzIDE1OCAzIDE1NyAzNTMgMyAzNTIgMiAwIDE2NSAwIDE2NSAtNTM4IDAgYy0yOTYgMCAtNTQyIC0zIC01NDUgLTd6Ii8+PHBhdGggZD0iTTE0NTcgMzMxMyBjLTQgLTMgLTcgLTM3MiAtNyAtODIwIGwwIC04MTMgMTc1IDAgMTc1IDAgMiA0OTUgMyA0OTYgMzcwIC00OTYgMzY5IC00OTUgMTUzIDAgMTUzIDAgLTIgODE4IC0zIDgxNyAtMTcwIDAgLTE3MCAwIC01IC00OTEgLTUgLTQ5MSAtMzcwIDQ5NCAtMzcwIDQ5MyAtMTQ2IDAgYy04MCAwIC0xNDkgLTMgLTE1MiAtN3oiLz48cGF0aCBkPSJNMzAwNSAzMzA5IGMtMyAtOCAtNCAtMzc2IC0zIC04MTkgbDMgLTgwNSAzMTAgLTMgYzQyMyAtNCA1MzcgMTEgNzEwIDk3IDI5OCAxNDcgNDU4IDQ2OCA0MTUgODMwIC00NCAzNjUgLTI2MiA1OTkgLTY0MCA2ODcgLTkzIDIyIC03ODcgMzMgLTc5NSAxM3ogbTcxMCAtMzM0IGMyMTcgLTU3IDMyNSAtMjEzIDMyNSAtNDcyIDAgLTE2OCAtMzIgLTI2OCAtMTE0IC0zNjAgLTg2IC05NSAtMTg4IC0xMzEgLTM5OCAtMTQwIGwtMTM4IC02IDAgNDk3IDAgNDk2IDEzMyAwIGM4NyAwIDE1MyAtNSAxOTIgLTE1eiIvPjxwYXRoIGQ9Ik00NTY4IDMzMTIgbC0zOCAtMyAwIC04MTUgMCAtODE0IDE5MCAwIDE5MCAwIDAgMzEwIDAgMzExIDE5MyAtMSBjMTA1IDAgMjQ5IC0xIDMyMCAwIGwxMjcgMCAtMiAxNjMgLTMgMTYyIC0zMDUgMCBjLTE2OCAxIC0zMTEgMiAtMzE3IDMgLTEwIDEgLTEzIDQ1IC0xMyAxNzcgbDAgMTc1IDM1NSAwIDM1NSAwIDAgMTcwIDAgMTcwIC01MDcgLTMgYy0yODAgLTEgLTUyNSAtMyAtNTQ1IC01eiIvPjxwYXRoIGQ9Ik01NjcwIDI1MDAgbDAgLTgyMCAxOTAgMCAxOTAgMCAtMiA4MTggLTMgODE3IC0xODcgMyAtMTg4IDIgMCAtODIweiIvPjxwYXRoIGQ9Ik02MjA1IDMzMDggYy0zIC03IC00IC0zNzUgLTMgLTgxOCBsMyAtODA1IDU1OCAtMyA1NTcgLTIgMCAxNjUgMCAxNjUgLTM2NyAyIC0zNjggMyAwIDE2MCAwIDE2MCAzMTggMyAzMTcgMiAwIDE2NSAwIDE2NSAtMzIwIDAgLTMxOSAwIDIgMTU4IDIgMTU3IDM1OCAzIDM1NyAyIC0yIDE2MyAtMyAxNjIgLTU0MyAzIGMtNDI5IDIgLTU0NCAwIC01NDcgLTEweiIvPjxwYXRoIGQ9Ik03NDEwIDI1MDAgbDAgLTgyMCA1NDggMiA1NDcgMyAzIDE2OCAyIDE2NyAtMzYwIDAgLTM2MCAwIC0yIDY0OCAtMyA2NDcgLTE4NyAzIC0xODggMiAwIC04MjB6Ii8+PHBhdGggZD0iTTg1NTAgMjUwMCBsMCAtODIwIDMxOSAwIGM0MjkgMCA1MzYgMTYgNzE2IDEwOCAxMjIgNjMgMjUyIDE5MCAzMTIgMzA4IDcxIDEzNyA4OCAyMTIgODggNDA0IDAgMTkxIC0xNiAyNjYgLTg4IDQwNCAtNjMgMTIzIC0xOTAgMjQ3IC0zMTcgMzA5IC0xODUgOTAgLTI5NSAxMDYgLTczNyAxMDcgbC0yOTMgMCAwIC04MjB6IG03MDkgNDc1IGMyMjQgLTUzIDM0NyAtMjUwIDMyNyAtNTI3IC0xMSAtMTYyIC03MyAtMjg4IC0xNzcgLTM1OSAtOTAgLTYyIC0yMDIgLTg4IC0zODYgLTg5IGwtOTMgMCAwIDQ5NSAwIDQ5NSAxMzMgMCBjODIgMCAxNTYgLTYgMTk2IC0xNXoiLz48cGF0aCBkPSJNMjUwIDE1NTYgYzAgLTkgNyAtMTYgMTYgLTE2IDE3IDAgMTQgMjIgLTQgMjggLTcgMiAtMTIgLTMgLTEyIC0xMnoiLz48cGF0aCBkPSJNMjkwIDE1NTUgYzAgLTggNyAtMTUgMTUgLTE1IDggMCAxNSA3IDE1IDE1IDAgOCAtNyAxNSAtMTUgMTUgLTggMCAtMTUgLTcgLTE1IC0xNXoiLz48cGF0aCBkPSJNMzM3IDE1NjMgYy0xMiAtMTEgLTggLTIzIDggLTIzIDggMCAxNSA3IDE1IDE1IDAgMTYgLTEyIDIwIC0yMyA4eiIvPjxwYXRoIGQ9Ik0zODAgMTU1NSBjMCAtOSA1IC0xNSAxMSAtMTMgNiAyIDExIDggMTEgMTMgMCA1IC01IDExIC0xMSAxMyAtNiAyIC0xMSAtNCAtMTEgLTEzeiIvPjxwYXRoIGQ9Ik00MjAgMTU1NSBjMCAtOCA3IC0xNSAxNSAtMTUgOCAwIDE1IDcgMTUgMTUgMCA4IC03IDE1IC0xNSAxNSAtOCAwIC0xNSAtNyAtMTUgLTE1eiIvPjxwYXRoIGQ9Ik0yNTYgMTUyMyBjLTExIC0xMSAtNiAtMjMgOSAtMjMgOCAwIDE1IDQgMTUgOSAwIDEzIC0xNiAyMiAtMjQgMTR6Ii8+PHBhdGggZD0iTTI5MCAxNTE1IGMwIC04IDcgLTE1IDE1IC0xNSA4IDAgMTUgNyAxNSAxNSAwIDggLTcgMTUgLTE1IDE1IC04IDAgLTE1IC03IC0xNSAtMTV6Ii8+PHBhdGggZD0iTTMzNyAxNTIzIGMtMTIgLTExIC04IC0yMyA4IC0yMyA4IDAgMTUgNyAxNSAxNSAwIDE2IC0xMiAyMCAtMjMgOHoiLz48cGF0aCBkPSJNMzgwIDE1MTUgYzAgLTkgNSAtMTUgMTEgLTEzIDYgMiAxMSA4IDExIDEzIDAgNSAtNSAxMSAtMTEgMTMgLTYgMiAtMTEgLTQgLTExIC0xM3oiLz48cGF0aCBkPSJNMjUwIDE0MjcgYzAgLTI3IDEyIC00NSA3OCAtMTEwIGw3NyAtNzcgNjMgMCBjMzQgMCA2MiA0IDYyIDggMCA1IC00OSA1NCAtMTA5IDExMCAtOTAgODQgLTExNSAxMDIgLTE0MCAxMDIgLTI4IDAgLTMxIC0zIC0zMSAtMzN6Ii8+PHBhdGggZD0iTTUxNSAxMzUwIGwxMTAgLTExMCA2MiAwIGMzNSAwIDYzIDQgNjMgOSAwIDUgLTQ5IDU0IC0xMDkgMTEwIGwtMTA5IDEwMSAtNjMgMCAtNjQgMCAxMTAgLTExMHoiLz48cGF0aCBkPSJNNzM1IDEzNTAgbDExMCAtMTEwIDYwIDAgNjAgMCAxMTUgMTEwIDExNSAxMDkgLTcwIDEgLTcwIDAgLTcyIC03MiAtNzIgLTcxIC03OSA3MSAtODAgNzIgLTYzIDAgLTY0IDAgMTEwIC0xMTB6Ii8+PHBhdGggZD0iTTg3OCAxNDI4IGwzMiAtMzMgMzIgMzMgMzMgMzIgLTY1IDAgLTY1IDAgMzMgLTMyeiIvPjxwYXRoIGQ9Ik0xMTcyIDEzNTcgYy01NiAtNTYgLTEwMiAtMTA2IC0xMDIgLTExMCAwIC00IDI2IC03IDU4IC03IGw1OSAwIDExNCAxMTAgMTE0IDEwOSAtNzAgMSAtNzAgMCAtMTAzIC0xMDN6Ii8+PHBhdGggZD0iTTEzOTIgMTM1NyBjLTU2IC01NiAtMTAyIC0xMDYgLTEwMiAtMTEwIDAgLTQgMjYgLTcgNTggLTcgbDU5IDAgODEgNzYgYzcyIDY2IDgyIDgwIDgyIDExMCAwIDMzIC0xIDM0IC0zOCAzNCAtMzQgMCAtNDYgLTkgLTE0MCAtMTAzeiIvPjxwYXRoIGQ9Ik0xNTM4IDEyODMgYy0zNSAtMzYgLTM1IC00MyAtMyAtNDMgMjggMCAzOCAxNiAzMyA1MCAtMyAyMSAtNCAyMSAtMzAgLTd6Ii8+PHBhdGggZD0iTTI1MiAxMjczIGMyIC0yMiA5IC0yOSAzMSAtMzEgMzMgLTQgMzQgOCA0IDM2IC0zMSAyOSAtMzkgMjggLTM1IC01eiIvPjxwYXRoIGQ9Ik0yNTAgMTE5MCBjMCAtNSAxOCAtMTAgNDAgLTEwIDIyIDAgNDAgNSA0MCAxMCAwIDYgLTE4IDEwIC00MCAxMCAtMjIgMCAtNDAgLTQgLTQwIC0xMHoiLz48cGF0aCBkPSJNMzUwIDExOTAgYzAgLTYgMzcgLTEwIDkwIC0xMCA1MyAwIDkwIDQgOTAgMTAgMCA2IC0zNyAxMCAtOTAgMTAgLTUzIDAgLTkwIC00IC05MCAtMTB6Ii8+PHBhdGggZD0iTTU1NSAxMTkwIGMzIC01IDMzIC0xMCA2NiAtMTAgMzMgMCA1OSA0IDU5IDEwIDAgNiAtMjkgMTAgLTY2IDEwIC00MSAwIC02MyAtNCAtNTkgLTEweiIvPjxwYXRoIGQ9Ik03MDAgMTE5MCBjMCAtNiAzNyAtMTAgOTAgLTEwIDUzIDAgOTAgNCA5MCAxMCAwIDYgLTM3IDEwIC05MCAxMCAtNTMgMCAtOTAgLTQgLTkwIC0xMHoiLz48cGF0aCBkPSJNOTAwIDExOTAgYzAgLTUgOSAtMTAgMjAgLTEwIDExIDAgMjAgNSAyMCAxMCAwIDYgLTkgMTAgLTIwIDEwIC0xMSAwIC0yMCAtNCAtMjAgLTEweiIvPjxwYXRoIGQ9Ik05NjAgMTE5MCBjMCAtNSA5IC0xMCAyMCAtMTAgMTEgMCAyMCA1IDIwIDEwIDAgNiAtOSAxMCAtMjAgMTAgLTExIDAgLTIwIC00IC0yMCAtMTB6Ii8+PHBhdGggZD0iTTMxOCAxMTUzIGMzOSAtMiAxMDUgLTIgMTQ1IDAgMzkgMSA3IDMgLTczIDMgLTgwIDAgLTExMiAtMiAtNzIgLTN6Ii8+PHBhdGggZD0iTTU1OCAxMTUzIGM3IC0zIDE2IC0yIDE5IDEgNCAzIC0yIDYgLTEzIDUgLTExIDAgLTE0IC0zIC02IC02eiIvPjxwYXRoIGQ9Ik01OTggMTE1MyBjNyAtMyAxNiAtMiAxOSAxIDQgMyAtMiA2IC0xMyA1IC0xMSAwIC0xNCAtMyAtNiAtNnoiLz48cGF0aCBkPSJNNjQ4IDExNTMgYzYgLTIgMTggLTIgMjUgMCA2IDMgMSA1IC0xMyA1IC0xNCAwIC0xOSAtMiAtMTIgLTV6Ii8+PHBhdGggZD0iTTc1OCAxMTUzIGMxOCAtMiA0NSAtMiA2MCAwIDE1IDIgMCA0IC0zMyA0IC0zMyAwIC00NSAtMiAtMjcgLTR6Ii8+PC9nPjwvc3ZnPg==\");\n  }\n  /* HERO_LOGO_END */\n";

// src/client/services.js
	function createServices(ctx) {
		/** `ctx.get()` may be missing, may return undefined, or may throw while a
		*  getter's dependency is not up yet — all three mean "not available". */
		const get = (name) => {
			try {
				const value = ctx.get(name);
				return value === void 0 ? void 0 : value;
			} catch (e) {
				return;
			}
		};
		return {
			/** Required: apply() bails out (and leaves the idempotency flag unset) when
			*  the theme service is not there yet, so a later apply can still mount. */
			theme: () => get("theme"),
			/** Settings transport. Two generations are accepted, in this order: the
			*  0.1.7-era shared form service exposed as a context property, then the
			*  `configForms` service. Anything without `.get()` is not a transport. */
			configForms: () => {
				try {
					if (ctx.configForms !== void 0 && ctx.configForms !== null && typeof ctx.configForms.get === "function") return ctx.configForms;
				} catch (e) {}
				const forms = get("configForms");
				return forms !== void 0 && forms !== null && typeof forms.get === "function" ? forms : void 0;
			},
			/** Conversation service: optional, arrives late, retried by the caller. */
			sessions: () => get("sessions"),
			/** Locale service: optional — without it the settings page stays Chinese. */
			locale: () => get("locale"),
			/** Slot registry for the settings section; optional. */
			slots: () => get("slots"),
			/** Register a run-scoped disposer (the cordis contract). */
			effect: (fn) => ctx.effect(fn)
		};
	}

// src/client/prefs/keys.js
/**
	* prefs/keys.js — the preference-key vocabulary: schema fields, UI keys, and the
	* mapping between them. Pure data + pure functions (no ctx, no DOM, no storage),
	* so the entry, the diagnostics and the tests can all import the same table.
	*
	* Two namespaces coexist on purpose: PREFS_ENTRY is the DSH profile entry id the
	* settings transport is keyed by (index.js SETTINGS_ENTRY), while PREFS_NS is the
	* pre-0.1.7 namespace that is still the PREFIX of every UI key. The tables below
	* are the single place that knows both spellings; the read and write paths both
	* go through prefsFieldOf(), which is why a compound field cannot half-migrate.
	*/
	const PREFS_ENTRY = "theme-endfield";
	const PREFS_NS = "dsh-theme-endfield";
	const PREFS_FIELD_DEFAULTS = {
		enabled: "1",
		radius: "square",
		glass: "off",
		texture: "standard",
		motion: "signal",
		watermark: "1",
		watermarkPersist: "0",
		loader: "0",
		notify: "1",
		notifyDone: "1",
		notifyQuestion: "1",
		notifyApprove: "1",
		audioEnabled: "0",
		audioVolume: "100",
		audioBoot: "1",
		audioTurnStart: "1",
		audioTurnDone: "1",
		audioAttention: "1",
		audioTurnFail: "1",
		audioDebounceMs: "2500",
		audioSoundDir: "",
		audioHumanOnly: "1",
		audioDiag: "0"
	};
	const prefsFieldFromKey = (rawKey) => {
		return (rawKey.indexOf("dsh-theme-endfield-") === 0 ? rawKey.slice(19) : rawKey).replace(/-([a-z0-9])/g, (_, ch) => ch.toUpperCase());
	};
	const PREFS_KEY_TO_FIELD = {
		"dsh-theme-endfield-enabled": "enabled",
		"dsh-theme-endfield-radius": "radius",
		"dsh-theme-endfield-glass": "glass",
		"dsh-theme-endfield-texture": "texture",
		"dsh-theme-endfield-motion": "motion",
		"dsh-theme-endfield-watermark": "watermark",
		"dsh-theme-endfield-watermark-persist": "watermarkPersist",
		"dsh-theme-endfield-loader": "loader",
		"dsh-theme-endfield-notify": "notify",
		"dsh-theme-endfield-notify-done": "notifyDone",
		"dsh-theme-endfield-notify-question": "notifyQuestion",
		"dsh-theme-endfield-notify-approve": "notifyApprove",
		"dsh-theme-endfield-audio-enabled": "audioEnabled",
		"dsh-theme-endfield-audio-volume": "audioVolume",
		"dsh-theme-endfield-audio-boot": "audioBoot",
		"dsh-theme-endfield-audio-turn-start": "audioTurnStart",
		"dsh-theme-endfield-audio-turn-done": "audioTurnDone",
		"dsh-theme-endfield-audio-attention": "audioAttention",
		"dsh-theme-endfield-audio-turn-fail": "audioTurnFail",
		"dsh-theme-endfield-audio-debounce-ms": "audioDebounceMs",
		"dsh-theme-endfield-audio-sound-dir": "audioSoundDir",
		"dsh-theme-endfield-audio-human-only": "audioHumanOnly",
		"dsh-theme-endfield-audio-diag": "audioDiag"
	};
	const PREFS_FIELD_TO_LEGACY_KEY = (() => {
		const m = {};
		for (const field of Object.keys(PREFS_KEY_TO_FIELD)) {
			const f = PREFS_KEY_TO_FIELD[field];
			const legacy = field.slice(19);
			if (legacy !== f) m[f] = legacy;
		}
		return m;
	})();
	const prefsFieldOf = (rawKey) => {
		if (Object.prototype.hasOwnProperty.call(PREFS_KEY_TO_FIELD, rawKey)) return PREFS_KEY_TO_FIELD[rawKey];
		if (Object.prototype.hasOwnProperty.call(PREFS_FIELD_DEFAULTS, rawKey)) return rawKey;
		return prefsFieldFromKey(rawKey);
	};

// src/client/prefs/legacy.js
/**
	* prefs/legacy.js — the one-shot repair for sections written by the build that
	* shipped the field-name bug.
	*
	* A compound field's UI key is kebab-cased while the schema field is camelCase
	* (`'dsh-theme-endfield-watermark-persist'` -> `'watermarkPersist'`). The buggy
	* build pushed the UI spelling into the document; schemastery passes undeclared
	* keys through untouched and also merges every default into the fetched
	* section, so without this pass the user's stored choice is ignored and the
	* field default silently wins — the switch looks like it "reset again" after
	* the fix.
	*
	* `prefsLegacyFields` is pure (section in, repairs out) so the hard part — the
	* decision rule below — can be reasoned about and tested without a transport.
	* `createLegacyMigrator` adds exactly-once bookkeeping around it.
	*/
	/**
	* The [field, value] pairs whose recorded legacy value is the one to honour,
	* i.e. the edits that need re-committing onto the declared field.
	*
	* WHEN IS THE DECLARED FIELD THE USER'S OWN VALUE? A fetched section ALWAYS
	* carries every declared field (the schema merges its defaults in), so
	* `hasOwnProperty` cannot tell a user-set value from an implied default. Only
	* one signal can: a value that differs from the shipped default.
	*
	*   declared absent or === default  -> nothing recorded a choice for this
	*                                      field, so the stray legacy key is the
	*                                      only trace of one: honour it.
	*   declared set to anything else    -> a correctly-writing build stored it,
	*                                      so it wins and the stray key is ignored
	*                                      (never let the pre-migration spelling
	*                                      overwrite a real edit).
	*
	* That makes the migration idempotent in the good direction: once the value is
	* re-committed the declared field is non-default, so the stray key can never
	* win again.
	*/
	function prefsLegacyFields(section) {
		const out = [];
		if (section === null || typeof section !== "object") return out;
		for (const field of Object.keys(PREFS_FIELD_TO_LEGACY_KEY)) {
			const legacy = PREFS_FIELD_TO_LEGACY_KEY[field];
			if (!Object.prototype.hasOwnProperty.call(section, legacy)) continue;
			const value = section[legacy];
			if (value === void 0 || value === null || String(value) === "") continue;
			const declared = Object.prototype.hasOwnProperty.call(section, field) ? String(section[field]) : void 0;
			if (declared !== void 0 && declared !== PREFS_FIELD_DEFAULTS[field]) continue;
			out.push([field, String(value)]);
		}
		return out;
	}
	/**
	* Wrap the pure pass with the two guards the store needs:
	*   - `migrated`: a field is repaired at most once per run (a replayed write
	*     must not loop back into another repair);
	*   - `migratedFor`: the section object this pass already examined. A section
	*     is a fresh object on every transport update, so object identity is what
	*     says "this document has not been looked at yet" — and it stops the pass
	*     from re-running against its own echo within one snapshot.
	*
	* Writes go through `commit`, i.e. the same durable gate as a user toggle: on a
	* served scope it lands on the schema field immediately, on one that is not
	* served yet it is held and replayed (and mirrored locally, so the theme
	* behaves correctly meanwhile). The stale key itself is left in the document —
	* the theme no longer declares or reads it, and rewriting a section it does not
	* own would be a bigger hammer than the bug deserves.
	*/
	function createLegacyMigrator({ commit, debug }) {
		const migrated = /* @__PURE__ */ new Set();
		let migratedFor = null;
		return { migrate(section) {
			if (section === null || typeof section !== "object") return;
			if (section === migratedFor) return;
			migratedFor = section;
			for (const [field, value] of prefsLegacyFields(section)) {
				if (migrated.has(field)) continue;
				migrated.add(field);
				debug("migrating legacy-spelled field", PREFS_FIELD_TO_LEGACY_KEY[field], "->", field, "=", value);
				commit(field, value);
			}
		} };
	}

// src/client/prefs/store.js
/**
	* prefs/store.js — the durable preference store: values, the durable write
	* gate and the held-edit queue.
	*
	* The theme's switches used to persist through `localStorage`, which DSH
	* Desktop broke on every restart: Desktop binds a fresh random localhost
	* port per launch, so the origin (and thus the browser storage scope)
	* changed and the saved settings silently reset to defaults.
	*
	* The durable authority is DSH's own settings service, and DSH 0.1.7-rc.1
	* moved it once more. The whole pre-0.1.7 seam — a host
	* `ctx.settings.register(namespace, schema)` persisted by
	* `@deepseek-ai/dsh-settings-file` to `<dshHome>/settings.yaml`, mirrored
	* to the browser as the `ctx.settingsScope` service — is GONE: the package
	* is not in the distribution any more, `settings.yaml` is not the settings
	* carrier, and the client has no `settingsScope` service at all.
	*
	* What replaced it (see index.js for the host side):
	*
	*   host    the plugin entry exports a schemastery `Config` whose fields
	*           are `.volatile()`. `ctx.settings` projects it into a form and
	*           persists user edits into the PROFILE PATCH
	*           (<profile>/cordis.patch.yml) through `ctx.configEditor`,
	*           i.e. a path owned by DSH and independent of the web origin.
	*   client  `services.configForms()` (src/client/services.js) — the
	*           settings domain's shared-form service — `.get(<profile entry id>)` returns that entry's
	*           ConfigForm: getSnapshot() / subscribe() / set() / unset() /
	*           mutate().
	*
	* The namespace is now the PROFILE ENTRY ID, not a plugin-chosen string:
	* this package's cordis.patch.yml inserts `id: theme-endfield`, and
	* index.js exports that same id as SETTINGS_ENTRY. Both halves still speak
	* the old namespace string for the legacy fallback and as the prefix of
	* every UI key in the tables below.
	*
	* The >=0.2.0 floor dropped the legacy seam entirely (peerDependencies
	* enforces it): a host without `configForms` is not a supported
	* configuration, and pages that have none (an out-of-DSH page,
	* in-process tests) run on memory defaults below. Either way the values
	* live host-side, so:
	*
	*   dsh web     (browser, fixed loopback port)  -> host persistence
	*   DSH Desktop (browser, random loopback port) -> host persistence
	*
	* Both are loopback pages, so DSH resolves the connection to 'host' mode
	* and the values land on disk; a change of port does not move them because
	* nothing lives in browser storage any more.
	*
	* Value model. Namespace fields are the tails of the old localStorage keys
	* and are stored as the same strings, so the semantics (and any older
	* <settings.yaml> section from a prior build) keep scanning identically:
	*   default-ON switches store  '1'  and read as  !== '0'
	*   default-OFF switches store '0'  and read as  === '1'
	*   multi-literal fields (radius, glass, texture, motion) store one of
	*   their documented literals. (A `palette` field existed until 2026-10;
	*   values for it may linger in old documents but nothing reads them.)
	* FIELD_DEFAULTS is the shipped fallback and mirrors index.js.
	*
	* Resilience. Before the transport hands us a section (boot), or in an
	* environment with neither settings service at all (an out-of-DSH page,
	* in-process tests), the store falls back to FIELD_DEFAULTS overlaid with
	* any in-page overrides made this session. Writes are committed to the
	* settings transport only when it is ready + writable; otherwise they are
	* kept session-local so toggles still work in place but do not persist
	* (there is no durable backend to persist to — and no localStorage).
	*
	* Transport selection, candidate spellings, the bounded settle watch and the
	* boot report live in prefs/transport.js. This module never imports it: the
	* two halves meet at the small port installed by bindTransport() (a snapshot,
	* one field write, and the describe-view list for the diagnostics lines), and
	* the entry is the composition root that injects { debug } here and
	* { services, debug, store } there.
	*/
	function createPrefsStore({ debug: dbg }) {
		const prefsListeners = [];
		const prefsLocal = Object.assign({}, PREFS_FIELD_DEFAULTS);
		const prefsLocalEdited = /* @__PURE__ */ new Set();
		const prefsDirty = /* @__PURE__ */ new Set();
		const prefsEdited = /* @__PURE__ */ new Set();
		let prefsFieldValue = null;
		let prefsRetryTimer = null;
		const PREFS_RETRY_LIMIT = 20;
		let prefsRetryCount = 0;
		let prefsReplayBusy = false;
		let reconciler = null;
		let prefsSettledOnce = false;
		let settledHook = null;
		let panelMounted = false;
		let prefsOverlayCache = null;
		const prefsGetValue = () => {
			const base = prefsFieldValue || PREFS_FIELD_DEFAULTS;
			if (prefsLocalEdited.size === 0) return base;
			if (prefsOverlayCache !== null && prefsOverlayCache.base === base) return prefsOverlayCache.out;
			const out = Object.assign({}, base);
			for (const field of prefsLocalEdited) out[field] = prefsLocal[field];
			prefsOverlayCache = {
				base,
				out
			};
			return out;
		};
		/** read one field as its raw stored string: <stored-or-default>, never null. */
		const prefsGet = (rawKey) => {
			const field = prefsFieldOf(rawKey);
			const sec = prefsGetValue();
			if (sec && Object.prototype.hasOwnProperty.call(sec, field)) return String(sec[field]);
			return PREFS_FIELD_DEFAULTS[field];
		};
		/** subscribe to any change of the whole namespace (transport or local). */
		const prefsSubscribe = (listener) => {
			prefsListeners.push(listener);
			return () => {
				const i = prefsListeners.indexOf(listener);
				if (i >= 0) prefsListeners.splice(i, 1);
			};
		};
		const prefsEmit = () => {
			for (const l of prefsListeners.slice()) try {
				l();
			} catch (e) {}
			if (reconciler) try {
				reconciler();
			} catch (e) {}
		};
		const prefsMarkSettled = () => {
			if (prefsSettledOnce) return;
			prefsSettledOnce = true;
			if (settledHook) try {
				settledHook();
			} catch (e) {}
		};
		let transport = null;
		const prefsSnap = () => transport === null ? null : transport.snapshot();
		const prefsDurablyServed = (snap) => !!snap && (snap.mode === void 0 || snap.mode === "host") && snap.status === "ready" && !!snap.writable;
		const prefsWriteField = (field, value) => {
			if (transport === null || typeof transport.write !== "function") return false;
			if (typeof transport.canWrite === "function" && !transport.canWrite()) return false;
			let result = null;
			try {
				result = transport.write(field, String(value));
			} catch (e) {
				dbg("set threw", field, e && e.message);
				prefsDirty.add(field);
				return false;
			}
			if (result && typeof result.then === "function") result.then((ok) => {
				if (ok === false) {
					dbg("set REFUSED by the host", field, value);
					prefsDirty.add(field);
					prefsScheduleRetry();
				} else prefsDirty.delete(field);
			}, (e) => {
				dbg("set REJECTED", field, value, String(e && e.message || e));
				prefsDirty.add(field);
			});
			else prefsDirty.delete(field);
			return true;
		};
		const prefsReplayDirty = () => {
			if (prefsReplayBusy) return;
			if (prefsDirty.size === 0) return;
			prefsReplayBusy = true;
			try {
				const snap = prefsSnap();
				const durable = prefsDurablyServed(snap);
				for (const field of Array.from(prefsDirty)) {
					const local = prefsLocal[field];
					if (local === (snap && snap.value ? Object.prototype.hasOwnProperty.call(snap.value, field) ? String(snap.value[field]) : void 0 : void 0) && !prefsEdited.has(field)) {
						prefsDirty.delete(field);
						continue;
					}
					if (!durable) continue;
					if (prefsWriteField(field, local)) {
						dbg("replayed held", field, "=", local);
						prefsDirty.delete(field);
					}
				}
			} finally {
				prefsReplayBusy = false;
			}
		};
		const prefsStopRetry = () => {
			if (prefsRetryTimer !== null && typeof clearTimeout === "function") clearTimeout(prefsRetryTimer);
			prefsRetryTimer = null;
			prefsRetryCount = 0;
		};
		const prefsScheduleRetry = () => {
			if (prefsDirty.size === 0) {
				prefsStopRetry();
				return;
			}
			if (prefsDurablyServed(prefsSnap())) {
				prefsStopRetry();
				return;
			}
			if (prefsRetryTimer !== null) return;
			if (typeof setTimeout !== "function") return;
			prefsRetryCount = 0;
			const tick = () => {
				prefsRetryTimer = null;
				prefsRetryCount += 1;
				if (prefsRetryCount > PREFS_RETRY_LIMIT) {
					prefsStopRetry();
					return;
				}
				if (prefsDirty.size === 0) {
					prefsStopRetry();
					return;
				}
				if (prefsDurablyServed(prefsSnap())) {
					prefsStopRetry();
					return;
				}
				prefsReplayDirty();
				if (prefsDirty.size > 0) prefsRetryTimer = setTimeout(tick, 500);
				else prefsStopRetry();
			};
			prefsRetryTimer = setTimeout(tick, 500);
		};
		const prefsCommit = (field, encoded) => {
			if (transport !== null && transport.bound()) {
				const snap = prefsSnap();
				if (prefsDurablyServed(snap)) {
					const binding = transport.binding();
					dbg("commit", field, "=", encoded, "via", binding.kind, binding.ns, "status=", snap.status, "mode=", snap.mode);
					prefsWriteField(field, encoded);
					return true;
				}
				dbg("held (namespace not durably served yet)", field, "=", encoded, "snap=", snap === null ? null : {
					status: snap.status,
					writable: snap.writable,
					mode: snap.mode
				}, "hostServes=", transport.served());
			} else dbg("commit with NO settings transport bound (page-local only)", field, encoded, "hostServes=", transport === null ? null : transport.served());
			prefsDirty.add(field);
			prefsScheduleRetry();
			return false;
		};
		/** write one field with the exact stored-string value the UI derives. */
		const prefsSet = (rawKey, encoded) => {
			const field = prefsFieldOf(rawKey);
			prefsLocal[field] = String(encoded);
			prefsLocalEdited.add(field);
			prefsEdited.add(field);
			prefsOverlayCache = null;
			prefsCommit(field, prefsLocal[field]);
		};
		const prefsResolveSection = (section) => {
			const out = Object.assign({}, PREFS_FIELD_DEFAULTS);
			if (section === null || typeof section !== "object") return out;
			for (const field of Object.keys(PREFS_FIELD_DEFAULTS)) if (Object.prototype.hasOwnProperty.call(section, field)) out[field] = String(section[field]);
			return out;
		};
		const prefsMigrateLegacy = createLegacyMigrator({
			commit: (field, value) => prefsSet(field, value),
			debug: (...a) => dbg(...a)
		}).migrate;
		const bindTransport = (port) => {
			transport = port;
		};
		const adopt = (section) => {
			prefsFieldValue = prefsResolveSection(section);
		};
		const flush = () => prefsReplayDirty();
		const migrate = (section) => prefsMigrateLegacy(section);
		const notify = () => prefsEmit();
		const needsSettlePass = () => prefsFieldValue === null || prefsDirty.size > 0;
		const pendingFields = () => Array.from(prefsDirty);
		const settled = () => prefsSettledOnce;
		const panelMountedState = () => panelMounted;
		const dispose = () => {
			prefsListeners.length = 0;
			settledHook = null;
			if (transport !== null && typeof transport.dispose === "function") transport.dispose();
			prefsFieldValue = null;
			if (prefsRetryTimer !== null && typeof clearTimeout === "function") clearTimeout(prefsRetryTimer);
			prefsRetryTimer = null;
		};
		return {
			get: prefsGet,
			set: prefsSet,
			commit: prefsCommit,
			listen: prefsSubscribe,
			wasEdited: (field) => prefsEdited.has(field),
			ready: () => prefsSettledOnce,
			setReconciler: (fn) => {
				reconciler = fn;
			},
			onSettled: (fn) => {
				settledHook = fn;
			},
			markPanelMounted: () => {
				panelMounted = true;
			},
			markSettled: prefsMarkSettled,
			bindTransport,
			adopt,
			flush,
			migrate,
			notify,
			needsSettlePass,
			pendingFields,
			settled,
			panelMounted: panelMountedState,
			dispose
		};
	}

// src/client/prefs/transport.js
/**
	* prefs/transport.js — the durable-preference transport: which settings entry
	* spelling this install is bound to, when to re-select it, and the bounded
	* safety nets for a host that answers late.
	*
	* WHY IT IS SEPARATE. The >=0.2.0 floor made the settings domain's shared-form
	* service (services.configForms(), src/client/services.js) the only durable
	* seam, and the awkward half of using it is discovery: a ConfigForm is a lazy
	* view over a shared mirror keyed by the PROFILE ENTRY ID, which the patch
	* layer assigns. This package ships `id: theme-endfield`, but a hand-written
	* insert may use the package name and the loader tree path prefixes groups
	* with `include:`, so the module probes the candidate spellings, prefers the
	* one the Host actually SERVES, and self-heals when the right one is served
	* later. Everything here is about WHEN the section can be read — never about
	* what the values mean (that is prefs/store.js).
	*
	* THREE SAFETY NETS, each for a different real failure:
	*   rebind retry (40 x 250ms)  the settings service itself settles after
	*                              apply() — DSH mounts plugin rows concurrently.
	*   settle watch (20 x 500ms)  a bound form whose mirror never emitted the
	*                              ready transition (bounded replacement for the
	*                              pre-0.1.7 250ms binder poll).
	*   boot report (one line)     explains an unhealthy outcome once, instead of
	*                              leaving "the switches reset on reload" to
	*                              guesswork: boundNs / status / mode / writable /
	*                              valueKeys / settled / dirty / panelMounted /
	*                              hostServes / candidates.
	*
	* DEPENDENCIES ARE INJECTED: { services, debug, store }. The store is driven
	* through its documented protocol (adopt / flush / migrate / notify /
	* markSettled / needsSettlePass / pendingFields / settled / panelMounted);
	* this module installs the reverse port with store.bindTransport() and the
	* entry only composes the two.
	*/
	function createPrefsTransport({ services, debug: dbg, store }) {
		let prefsScope = null;
		let prefsScopeKind = null;
		let prefsScopeNs = null;
		let prefsUnsubscribe = null;
		let prefsBindTimer = null;
		let prefsSettleTimer = null;
		const PREFS_ENTRY_CANDIDATES = [
			PREFS_ENTRY,
			"include:" + PREFS_ENTRY,
			PREFS_NS,
			"include:" + PREFS_NS
		];
		const getConfigForms = () => {
			return services.configForms();
		};
		const prefsServedNamespaces = () => {
			try {
				const forms = getConfigForms();
				if (forms === void 0 || typeof forms.describe !== "function") return null;
				const mirrored = forms.describe().getSnapshot();
				const view = mirrored && mirrored.view;
				if (!view || !Array.isArray(view.namespaces)) return null;
				return view.namespaces.map((row) => row && row.ns);
			} catch (e) {
				return null;
			}
		};
		const prefsSnapshotOf = (scope) => {
			if (!scope || typeof scope.getSnapshot !== "function") return null;
			try {
				return scope.getSnapshot();
			} catch (e) {
				return null;
			}
		};
		const prefsFindReadyForm = () => {
			const forms = getConfigForms();
			if (forms === void 0) return null;
			for (const ns of PREFS_ENTRY_CANDIDATES) {
				let form = null;
				try {
					form = forms.get(ns);
				} catch (e) {
					form = null;
				}
				if (!form || typeof form.getSnapshot !== "function") continue;
				const snap = prefsSnapshotOf(form);
				if (snap !== null && snap.status === "ready") return {
					scope: form,
					kind: "configForms",
					ns
				};
			}
			return null;
		};
		const acquirePrefsScope = () => {
			const ready = prefsFindReadyForm();
			if (ready !== null) return ready;
			const forms = getConfigForms();
			if (forms !== void 0) for (const ns of PREFS_ENTRY_CANDIDATES) {
				let form = null;
				try {
					form = forms.get(ns);
				} catch (e) {
					form = null;
				}
				if (form && typeof form.getSnapshot === "function") return {
					scope: form,
					kind: "configForms",
					ns
				};
			}
			return null;
		};
		const prefsReleaseSubscription = () => {
			if (typeof prefsUnsubscribe === "function") try {
				prefsUnsubscribe();
			} catch (e) {}
			prefsUnsubscribe = null;
		};
		const prefsOnScopeChange = (scope) => {
			const snap = prefsSnapshotOf(scope);
			if (snap === null) return;
			if ((snap.status === "unavailable" || snap.status === "loading") && prefsScopeKind === "configForms") {
				const ready = prefsFindReadyForm();
				if (ready !== null && ready.ns !== prefsScopeNs) {
					dbg("re-selecting settings entry", prefsScopeNs, "->", ready.ns);
					prefsReleaseSubscription();
					prefsScope = null;
					prefsScopeKind = null;
					prefsScopeNs = null;
					prefsBindScope(ready);
					store.notify();
					return;
				}
			}
			if (snap.status !== "ready" && snap.status !== "unavailable" && snap.status !== "loading") return;
			if (snap.status === "ready" && snap.value !== void 0) store.adopt(snap.value);
			store.flush();
			store.migrate(snap.value);
			store.flush();
			store.notify();
			if (snap.status === "ready" && snap.value !== void 0) store.markSettled();
		};
		const prefsBindScope = (acquired) => {
			const scope = acquired.scope;
			prefsScope = scope;
			prefsScopeKind = acquired.kind;
			prefsScopeNs = acquired.ns;
			const initial = prefsSnapshotOf(scope);
			if (initial) dbg("bound", acquired.kind, "ns=", acquired.ns, "; initial status=", initial.status, "writable=", initial.writable, "mode=", initial.mode, "valueKeys=", initial.value ? Object.keys(initial.value).length : 0);
			if (initial && initial.status === "ready" && initial.value !== void 0) store.adopt(initial.value);
			if (typeof scope.subscribe === "function") try {
				const unsubscribe = scope.subscribe(() => prefsOnScopeChange(scope));
				if (typeof unsubscribe === "function") prefsUnsubscribe = unsubscribe;
			} catch (e) {
				dbg("subscribe threw", e && e.message);
			}
			store.flush();
			store.migrate(initial && initial.value);
			store.flush();
			if (initial && initial.status === "ready" && initial.value !== void 0) store.markSettled();
			prefsStartSettleWatch(0);
		};
		const PREFS_SETTLE_LIMIT = 20;
		const prefsStartSettleWatch = (attempt) => {
			if (prefsScope === null) return;
			if (prefsSettleTimer !== null && typeof clearTimeout === "function") clearTimeout(prefsSettleTimer);
			prefsSettleTimer = null;
			const snap = prefsSnapshotOf(prefsScope);
			if (snap !== null && snap.status === "ready") {
				if (store.needsSettlePass()) prefsOnScopeChange(prefsScope);
				return;
			}
			if (attempt >= PREFS_SETTLE_LIMIT) {
				const finalSnap = prefsSnapshotOf(prefsScope);
				dbg("settle watch gave up after", attempt, "attempts; preferences stay page-local. boundNs=", prefsScopeNs, "status=", finalSnap === null ? null : finalSnap.status, "mode=", finalSnap === null ? null : finalSnap.mode, "hostServes=", prefsServedNamespaces());
				return;
			}
			const ready = prefsFindReadyForm();
			if (ready !== null && ready.ns !== prefsScopeNs) {
				dbg("settle watch re-selecting settings entry", prefsScopeNs, "->", ready.ns);
				prefsReleaseSubscription();
				prefsScope = null;
				prefsScopeKind = null;
				prefsScopeNs = null;
				prefsBindScope(ready);
				store.notify();
				return;
			}
			if (typeof setTimeout !== "function") return;
			prefsSettleTimer = setTimeout(() => prefsStartSettleWatch(attempt + 1), 500);
		};
		const prefsReportBoot = () => {
			const snap = prefsSnapshotOf(prefsScope);
			if (snap !== null && snap.status === "ready" && (snap.mode === void 0 || snap.mode === "host") && snap.writable === true && store.pendingFields().length === 0) return;
			dbg("boot report (preferences did NOT reach a durable section):", "boundNs=", prefsScopeNs, "kind=", prefsScopeKind, "status=", snap === null ? null : snap.status, "mode=", snap === null ? null : snap.mode, "writable=", snap === null ? null : snap.writable, "valueKeys=", snap && snap.value ? Object.keys(snap.value).length : 0, "settled=", store.settled(), "dirty=", store.pendingFields(), "panelMounted=", store.panelMounted(), "hostServes=", prefsServedNamespaces(), "candidates=", PREFS_ENTRY_CANDIDATES);
		};
		let prefsBootReportTimer = null;
		if (typeof setTimeout === "function") prefsBootReportTimer = setTimeout(prefsReportBoot, 10500);
		const rebindPrefs = (attempt) => {
			if (prefsScope !== null) return;
			if (attempt > 40) {
				dbg("gave up binding a settings transport after retries; staying in-memory", "hostServes=", prefsServedNamespaces());
				return;
			}
			let acquired = null;
			try {
				acquired = acquirePrefsScope();
			} catch (e) {
				dbg("acquisition threw", e && e.message);
				acquired = null;
			}
			if (acquired === null) {
				if (typeof setTimeout === "function") {
					if (attempt % 8 === 0) dbg("waiting for a settings transport (attempt", attempt, ")");
					prefsBindTimer = setTimeout(() => rebindPrefs(attempt + 1), 250);
				}
				return;
			}
			try {
				prefsBindScope(acquired);
			} catch (e) {
				prefsScope = null;
				prefsScopeKind = null;
				prefsScopeNs = null;
				dbg("bind failed", e && e.message);
				if (typeof setTimeout === "function") prefsBindTimer = setTimeout(() => rebindPrefs(attempt + 1), 250);
			}
		};
		const dispose = () => {
			prefsReleaseSubscription();
			prefsScope = null;
			prefsScopeKind = null;
			prefsScopeNs = null;
			if (prefsBindTimer !== null && typeof clearTimeout === "function") clearTimeout(prefsBindTimer);
			prefsBindTimer = null;
			if (prefsSettleTimer !== null && typeof clearTimeout === "function") clearTimeout(prefsSettleTimer);
			prefsSettleTimer = null;
			if (prefsBootReportTimer !== null && typeof clearTimeout === "function") clearTimeout(prefsBootReportTimer);
			prefsBootReportTimer = null;
		};
		const port = {
			snapshot: () => prefsSnapshotOf(prefsScope),
			bound: () => prefsScope !== null,
			binding: () => ({
				kind: prefsScopeKind,
				ns: prefsScopeNs
			}),
			canWrite: () => prefsScope !== null && typeof prefsScope.set === "function",
			write: (field, value) => {
				const scope = prefsScope;
				if (!scope || typeof scope.set !== "function") return false;
				return scope.set(field, String(value));
			},
			served: () => prefsServedNamespaces(),
			dispose
		};
		store.bindTransport(port);
		rebindPrefs(0);
		return { dispose };
	}

// src/client/decor/watermark.js
/**
	* decor/watermark.js — the background ENDFIELD wordmark (settings-toggleable).
	*
	* Extracted from the entry (see TODO.md「入口瘦身」): this module owns the
	* mark's two switches, its two placements and its per-frame follow loop. The
	* entry injects the store (`prefs`), the master-switch reader (`isEnabled`)
	* and the app-frame finder (`findAppFrame`, a direct reference — the factory
	* is composed after that declaration, so no TDZ); everything else (keys,
	* readers, state, timers) lives here.
	*
	* Two independent switches:
	*   WATERMARK_KEY  — the watermark itself (default ON), shown on the hero page.
	*   WATERMARK_PERSIST_KEY — "keep showing it off the hero page" (default OFF),
	*     which also paints it on an active conversation / settings / any other page.
	* On the hero page the mark is centred on the headline. Off the hero page there
	* is no headline to follow, so it is centred in the conversation column instead
	* and mounted INSIDE that column rather than on <body>: a fixed body child
	* paints above the message text (it has no z-index competitor to lose to),
	* which would wash out what the user is reading. See mountPointFor().
	*
	* Both placements must stay strictly BEHIND the app's own chrome. That is a
	* z-index question in the hero case and it is genuinely subtle -- see the long
	* note on s.zIndex in styleWatermark(); it is locked down by
	* test/watermark-stacking.test.js, which compares real screenshots because a
	* pointer-events:none layer cannot be hit-tested.
	*/
	function createWatermark({ prefs, isEnabled, findAppFrame }) {
		const WATERMARK_KEY = "dsh-theme-endfield-watermark";
		const WATERMARK_PERSIST_KEY = "dsh-theme-endfield-watermark-persist";
		const isWatermarkOn = () => prefs.get(WATERMARK_KEY) !== "0";
		const isWatermarkPersistOn = () => prefs.get(WATERMARK_PERSIST_KEY) === "1";
		const isHeroVisible = () => {
			if (typeof document === "undefined") return false;
			const hero = document.querySelector("[class$=\"_root\"][data-phase=\"hero\"]");
			if (!hero) return false;
			const r = hero.getBoundingClientRect();
			return r.width > 0 && r.height > 0;
		};
		/** The visible conversation column — the persist-mode anchor and mount parent. */
		const findConversationRoot = () => {
			if (typeof document === "undefined") return null;
			const all = document.querySelectorAll("[class$=\"_root\"][data-phase]");
			for (const el of all) {
				const r = el.getBoundingClientRect();
				if (r.width > 0 && r.height > 0) return el;
			}
			return null;
		};
		const findVisibleHeadline = () => {
			if (typeof document === "undefined") return null;
			const all = document.querySelectorAll("[class$=\"_headlineText\"]");
			for (const h of all) {
				const r = h.getBoundingClientRect();
				if (r.width > 0 && r.height > 0) return h;
			}
			return null;
		};
		let watermarkEl = null;
		let watermarkRaf = null;
		let watermarkHost = null;
		const mountPointFor = () => {
			if (isHeroVisible()) return {
				mode: "hero",
				parent: document.body
			};
			const conv = findConversationRoot();
			if (conv !== null) return {
				mode: "persist",
				parent: conv
			};
			const frame = findAppFrame();
			return {
				mode: "persist",
				parent: frame !== null ? frame : document.body
			};
		};
		const positionWatermark = () => {
			if (!watermarkEl) return;
			if (watermarkEl.getAttribute("data-endfield-watermark") === "persist") return;
			const headline = findVisibleHeadline();
			if (!headline) return;
			const r = headline.getBoundingClientRect();
			if (r.width === 0 || r.height === 0) return;
			const cy = r.top + r.height / 2;
			const cx = r.left + r.width / 2;
			const vw = typeof window !== "undefined" && window.innerWidth || (typeof document !== "undefined" ? document.documentElement.clientWidth : 0);
			const top = cy - vw * .13 * .51 + "px";
			const tx = "translateX(" + (cx - vw / 2) + "px)";
			if (watermarkEl.style.top !== top) watermarkEl.style.top = top;
			if (watermarkEl.style.transform !== tx) watermarkEl.style.transform = tx;
		};
		const watermarkRafLoop = () => {
			if (!watermarkEl || watermarkEl.getAttribute("data-endfield-watermark") !== "hero") {
				watermarkRaf = null;
				return;
			}
			positionWatermark();
			watermarkRaf = typeof requestAnimationFrame === "function" ? requestAnimationFrame(watermarkRafLoop) : null;
		};
		const styleWatermark = (el, mode) => {
			const s = el.style;
			s.display = "flex";
			s.alignItems = "center";
			s.justifyContent = "center";
			s.pointerEvents = "none";
			s.fontWeight = "900";
			s.letterSpacing = "0.1em";
			s.color = "var(--dsw-alias-label-primary)";
			s.textTransform = "uppercase";
			s.userSelect = "none";
			s.fontFamily = "var(--edge-font)";
			if (mode === "hero") {
				s.position = "fixed";
				s.left = "0";
				s.right = "0";
				s.top = "";
				s.bottom = "";
				s.height = "calc(min(13vw, 240px) * 1.02)";
				s.zIndex = "0";
				s.fontSize = "9.5vw";
				s.transform = "";
			} else {
				s.position = "absolute";
				s.left = "0";
				s.right = "0";
				s.top = "0";
				s.bottom = "0";
				s.height = "";
				s.zIndex = "-1";
				s.fontSize = "9.5vw";
				s.transform = "";
			}
		};
		const syncWatermarkVisibility = () => {
			if (watermarkEl !== null && watermarkHost !== null && watermarkHost.isConnected && typeof document !== "undefined" && watermarkEl.getAttribute("data-endfield-watermark") === "persist" && isEnabled() && isWatermarkOn() && isWatermarkPersistOn() && document.querySelector("[class$=\"_root\"][data-phase=\"hero\"]") === null) return;
			const target = isEnabled() && isWatermarkOn() ? mountPointFor() : null;
			const shouldShow = target !== null && target.parent !== null && (target.mode === "hero" || isWatermarkPersistOn());
			if (shouldShow && watermarkEl) {
				if (watermarkEl.getAttribute("data-endfield-watermark") !== target.mode) {
					watermarkEl.setAttribute("data-endfield-watermark", target.mode);
					styleWatermark(watermarkEl, target.mode);
				}
				if (watermarkHost !== target.parent) {
					target.parent.appendChild(watermarkEl);
					watermarkHost = target.parent;
				}
			} else if (shouldShow && !watermarkEl) {
				const el = document.createElement("div");
				el.setAttribute("data-endfield-watermark", target.mode);
				el.setAttribute("translate", "no");
				el.setAttribute("lang", "en");
				el.setAttribute("aria-hidden", "true");
				el.className = "notranslate";
				styleWatermark(el, target.mode);
				target.parent.appendChild(el);
				watermarkEl = el;
				watermarkHost = target.parent;
			} else if (!shouldShow && watermarkEl) {
				if (watermarkEl.parentNode) watermarkEl.parentNode.removeChild(watermarkEl);
				watermarkEl = null;
				watermarkHost = null;
			}
			const needsLoop = watermarkEl !== null && watermarkEl.getAttribute("data-endfield-watermark") === "hero";
			if (needsLoop && !watermarkRaf && typeof requestAnimationFrame === "function") watermarkRaf = requestAnimationFrame(watermarkRafLoop);
			else if (!needsLoop && watermarkRaf !== null && typeof cancelAnimationFrame === "function") {
				cancelAnimationFrame(watermarkRaf);
				watermarkRaf = null;
			}
		};
		const onWatermarkResize = () => {
			if (watermarkEl) positionWatermark();
		};
		if (typeof window !== "undefined" && typeof window.addEventListener === "function") window.addEventListener("resize", onWatermarkResize);
		const detach = () => {
			if (watermarkRaf !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(watermarkRaf);
			watermarkRaf = null;
			if (watermarkEl !== null && watermarkEl.parentNode) watermarkEl.parentNode.removeChild(watermarkEl);
			watermarkEl = null;
			watermarkHost = null;
		};
		const dispose = () => {
			detach();
			if (typeof window !== "undefined" && typeof window.removeEventListener === "function") window.removeEventListener("resize", onWatermarkResize);
		};
		return {
			KEY: WATERMARK_KEY,
			PERSIST_KEY: WATERMARK_PERSIST_KEY,
			isOn: isWatermarkOn,
			isPersistOn: isWatermarkPersistOn,
			sync: syncWatermarkVisibility,
			detach,
			dispose
		};
	}

// src/client/decor/hero-logo.js
/**
	* decor/hero-logo.js — the new-session hero brand mark.
	*
	* Extracted from the entry (see TODO.md「入口瘦身」): this module owns the mark
	* and its anchor hunt; the entry injects only the master-switch reader
	* (`isEnabled`). Re-attachment is driven from the shared body observer
	* (decor/body-observer.js) and the preference reconciler, exactly as before.
	*
	* The summer-series 「终末地标识 3」 mark sits ABOVE the hero headline. This is
	* plain DOM created here and inserted into the app's own centred column — the
	* same decision as the watermark — so the mark takes part in that layout
	* instead of being pinned to coordinates a font or locale change invalidates.
	*
	* The anchor is found by the stable SUFFIX of the app's CSS-module class, never
	* a hash (0.1.2-rc.1 rotated every hash): 0.2.0-rc.2 names the headline ROW
	* '*_headline' (fish + title group), 0.1.x named the text node
	* '*_headlineText'. The row is preferred because inserting before it puts the
	* mark above the whole line rather than beside it. When neither exists — a
	* future rename — the mark simply does not appear, and nothing else breaks.
	*/
	function createHeroLogo({ isEnabled }) {
		let heroLogoEl = null;
		const findHeroLogoAnchor = () => {
			if (typeof document === "undefined") return null;
			const hero = document.querySelector("[class$=\"_root\"][data-phase=\"hero\"]");
			if (hero === null) return null;
			const row = hero.querySelector("[class$=\"_headline\"]");
			const anchor = row !== null ? row : hero.querySelector("[class$=\"_headlineText\"]");
			if (anchor === null || anchor.parentElement === null) return null;
			const r = anchor.getBoundingClientRect();
			if (r.width === 0 || r.height === 0) return null;
			return anchor;
		};
		const syncHeroLogo = () => {
			const anchor = isEnabled() ? findHeroLogoAnchor() : null;
			if (anchor === null) {
				if (heroLogoEl !== null && heroLogoEl.parentNode !== null) heroLogoEl.parentNode.removeChild(heroLogoEl);
				return;
			}
			if (heroLogoEl === null) {
				heroLogoEl = document.createElement("div");
				heroLogoEl.setAttribute("data-endfield-hero-logo", "");
				heroLogoEl.setAttribute("aria-hidden", "true");
				heroLogoEl.setAttribute("translate", "no");
				heroLogoEl.className = "notranslate";
			}
			if (heroLogoEl.parentNode !== anchor.parentElement || heroLogoEl.nextSibling !== anchor) anchor.parentElement.insertBefore(heroLogoEl, anchor);
		};
		const detach = () => {
			if (heroLogoEl !== null && heroLogoEl.parentNode !== null) heroLogoEl.parentNode.removeChild(heroLogoEl);
			heroLogoEl = null;
		};
		return {
			sync: syncHeroLogo,
			detach
		};
	}

// src/client/decor/loader.js
/**
	* decor/loader.js — the boot loading screen (settings-toggleable, default OFF).
	*
	* Extracted from the entry (see TODO.md「入口瘦身」): this module owns the
	* plate, its switch, its dual clocks and its once-per-page-load contract. The
	* entry injects the store (`prefs`), the master-switch reader (`isEnabled`),
	* and the two host-audio seams the boot chime reports through (`isAudioOn`,
	* `previewSlot`) — every sound is played by the host process.
	*
	* Recreates the Endfield launcher boot screen: a full-viewport black plate with
	* an 8px signal-yellow progress rail down the left edge, a meter group (tick +
	* percentage + status line) that rides the fill end, and the centred ENDFIELD
	* wordmark. It plays once per page load, then fades out and removes itself.
	*
	* Default OFF as requested: a loading plate that covers the app is opt-in, and
	* an off switch must cost nothing, so nothing is built or timed until enabled.
	*
	* Geometry is not guessed — it is measured off the reference frame (1340x731):
	*   rail width 8px, fill 57.5% of viewport height at the captured moment,
	*   meter left edge x=24, tick 4x15px, digits cap-height 28px (~39px Arial),
	*   status line 15px below the digits in #666.
	* Those ratios are reproduced here as em/percentage values so they hold at any
	* viewport size.
	*/
	function createLoader({ prefs, isEnabled, isAudioOn, previewSlot }) {
		const LOADER_KEY = "dsh-theme-endfield-loader";
		const isLoaderOn = () => prefs.get(LOADER_KEY) === "1";
		let loaderEl = null;
		let loaderRaf = null;
		let loaderTick = null;
		let loaderFuse = null;
		let loaderExitTimer = null;
		let loaderPlateH = 0;
		let loaderMeterH = 0;
		let loaderKill = null;
		let loaderDone = false;
		const clearLoaderTimers = () => {
			if (loaderRaf !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(loaderRaf);
			loaderRaf = null;
			if (loaderTick !== null && typeof clearInterval === "function") clearInterval(loaderTick);
			loaderTick = null;
			if (loaderFuse !== null && typeof clearTimeout === "function") clearTimeout(loaderFuse);
			loaderFuse = null;
			if (loaderExitTimer !== null && typeof clearTimeout === "function") clearTimeout(loaderExitTimer);
			loaderExitTimer = null;
		};
		/** Remove the plate and release every timer/handle it owns. Idempotent. */
		const destroyLoader = () => {
			clearLoaderTimers();
			if (loaderKill !== null && typeof clearTimeout === "function") clearTimeout(loaderKill);
			loaderKill = null;
			if (loaderEl && loaderEl.parentNode) loaderEl.parentNode.removeChild(loaderEl);
			loaderEl = null;
			loaderPlateH = 0;
			loaderMeterH = 0;
		};
		let audioBootSent = false;
		const playBootChime = () => {
			if (audioBootSent) return;
			audioBootSent = true;
			if (typeof isAudioOn === "function" && !isAudioOn()) return;
			try {
				previewSlot("boot").catch(() => {});
			} catch (e) {}
		};
		const runLoader = () => {
			if (!isEnabled()) return;
			if (loaderDone || loaderEl !== null) return;
			if (typeof document === "undefined") return;
			if (!document.body) {
				if (typeof document.addEventListener === "function") document.addEventListener("DOMContentLoaded", () => {
					runLoader();
				}, { once: true });
				return;
			}
			loaderDone = true;
			playBootChime();
			const el = document.createElement("div");
			el.setAttribute("data-endfield-loader", "");
			el.setAttribute("translate", "no");
			el.setAttribute("lang", "en");
			el.setAttribute("aria-hidden", "true");
			el.className = "notranslate";
			el.innerHTML = "<div data-endfield-loader-tex></div><div data-endfield-loader-track></div><div data-endfield-loader-fill></div><div data-endfield-loader-meter><span data-endfield-loader-tick></span><span data-endfield-loader-pct></span><span data-endfield-loader-status></span></div><div data-endfield-loader-brand><span data-endfield-loader-kicker></span><span data-endfield-loader-word data-endfield-loader-word1></span><span data-endfield-loader-word data-endfield-loader-word2></span><span data-endfield-loader-detail><span data-endfield-loader-chev></span><span data-endfield-loader-sub></span><span data-endfield-loader-seq></span><span data-endfield-loader-squares><i data-on></i><i data-on></i><i data-on></i><i></i><i></i><i></i><i data-on></i><i data-on></i><i></i><i></i><i></i><i></i></span></span><span data-endfield-loader-tag></span></div><div data-endfield-loader-wipe></div>";
			document.body.appendChild(el);
			loaderEl = el;
			const fill = el.querySelector("[data-endfield-loader-fill]");
			const meter = el.querySelector("[data-endfield-loader-meter]");
			const pct = el.querySelector("[data-endfield-loader-pct]");
			const status = el.querySelector("[data-endfield-loader-status]");
			const DURATION = 1750;
			const start = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
			loaderPlateH = el.clientHeight || Math.ceil(el.getBoundingClientRect().height) || 0;
			loaderMeterH = meter ? Math.ceil(meter.getBoundingClientRect().height) : 0;
			const now = () => typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
			const WIPE_MS = 520;
			const EXIT_MS = 620;
			let finished = false;
			const finish = () => {
				if (finished) return;
				finished = true;
				clearLoaderTimers();
				if (!loaderEl) return;
				const el = loaderEl;
				const wipeEl = el.querySelector("[data-endfield-loader-wipe]");
				const hasRaf = typeof requestAnimationFrame === "function";
				const hasTimeout = typeof window !== "undefined" && typeof window.setTimeout === "function";
				if (typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches || !hasRaf && !hasTimeout) {
					destroyLoader();
					return;
				}
				el.setAttribute("data-endfield-loader-wiping", "");
				el.style.transition = "none";
				const t0 = now();
				const plateW = el.clientWidth || 0;
				const RAIL = 10;
				let exitMarked = false;
				const flourish = () => {
					if (!loaderEl) return;
					const elapsed = now() - t0;
					const wt = Math.min(1, elapsed / WIPE_MS);
					const eased = 1 - Math.pow(1 - wt, 3);
					if (wipeEl) {
						wipeEl.style.opacity = "1";
						wipeEl.style.width = (RAIL + eased * Math.max(0, plateW - RAIL)).toFixed(1) + "px";
					}
					const fadeMs = elapsed - WIPE_MS;
					if (fadeMs > 0) {
						if (!exitMarked) {
							exitMarked = true;
							el.setAttribute("data-endfield-loader-exit", "");
						}
						el.style.opacity = Math.max(0, 1 - fadeMs / EXIT_MS).toFixed(3);
					}
					if (elapsed >= 1140) {
						destroyLoader();
						return;
					}
					loaderRaf = hasRaf ? requestAnimationFrame(flourish) : null;
				};
				flourish();
				if (typeof setInterval === "function") loaderTick = setInterval(flourish, 30);
				if (hasTimeout) loaderExitTimer = window.setTimeout(destroyLoader, 1540);
			};
			const step = () => {
				if (finished || !loaderEl) return;
				const t = Math.min(1, (now() - start) / DURATION);
				const eased = 1 - Math.pow(1 - t, 3);
				const value = Math.round(eased * 100);
				const shown = value + "%";
				if (fill) fill.style.height = (eased * 100).toFixed(2) + "%";
				if (pct && pct.textContent !== shown) pct.textContent = shown;
				if (status) {
					const label = value < 45 ? "Connecting..." : value < 99 ? "Updating..." : "Ready";
					if (status.textContent !== label) status.textContent = label;
				}
				if (meter) {
					const SAFE_BOTTOM = 64;
					if (value >= 100) {
						meter.style.setProperty("top", "auto", "important");
						meter.style.setProperty("bottom", "64px", "important");
					} else {
						meter.style.removeProperty("bottom");
						meter.style.removeProperty("top");
						const plateRect = el.getBoundingClientRect();
						loaderMeterH = Math.ceil(meter.getBoundingClientRect().height);
						const raw = eased * (plateRect.height || loaderPlateH) + 10;
						const maxTop = Math.max(0, (plateRect.height || loaderPlateH) - loaderMeterH - SAFE_BOTTOM);
						meter.style.top = Math.min(raw, maxTop).toFixed(1) + "px";
						const meterRect = meter.getBoundingClientRect();
						const allowedBottom = plateRect.bottom - SAFE_BOTTOM;
						if (meterRect.bottom > allowedBottom) {
							const currentTop = parseFloat(meter.style.top) || 0;
							meter.style.top = Math.max(0, currentTop - meterRect.bottom + allowedBottom).toFixed(1) + "px";
						}
					}
				}
				if (t >= 1) {
					el.setAttribute("data-endfield-loader-complete", "");
					if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
						if (loaderExitTimer === null) loaderExitTimer = window.setTimeout(finish, 220);
					} else finish();
					return;
				}
				loaderRaf = typeof requestAnimationFrame === "function" ? requestAnimationFrame(step) : null;
			};
			step();
			if (typeof setInterval === "function") loaderTick = setInterval(step, 60);
			if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
				loaderFuse = window.setTimeout(() => {
					finished = false;
					finish();
				}, 3350);
				loaderKill = window.setTimeout(destroyLoader, 4890);
			} else if (loaderRaf === null && loaderTick === null) destroyLoader();
		};
		prefs.onSettled(() => {
			if (loaderDone || loaderEl !== null) return;
			if (prefs.wasEdited("loader")) return;
			if (!isEnabled()) return;
			if (!isLoaderOn()) return;
			runLoader();
		});
		return {
			KEY: LOADER_KEY,
			isOn: isLoaderOn,
			run: runLoader,
			destroy: destroyLoader,
			replay: () => {
				loaderDone = false;
				destroyLoader();
				runLoader();
			}
		};
	}

// src/client/decor/body-observer.js
/**
	* decor/body-observer.js — the ONE body MutationObserver the decor layers share.
	*
	* Extracted from the entry (see TODO.md「入口瘦身」): the watermark and the hero
	* mark used to install one observer between them, and that sharing is the point
	* — one observer, two layers. Subscribers run in registration order on every
	* body mutation batch; the owner of each layer decides what a batch means.
	*
	* The bundle can be evaluated before <body> exists (the same window runLoader
	* defends with a DOMContentLoaded deferral). The old code created the observer
	* only when body was already there and never retried, so an early-boot apply
	* left the watermark without its (re)attach channel for good. Deferred install
	* instead, and right after installing, catch up on everything the observer
	* missed while it did not exist yet.
	*/
	function createBodyObserver() {
		let observer = null;
		const subscribers = [];
		const run = () => {
			for (const fn of subscribers) fn();
		};
		const install = () => {
			if (observer !== null) return;
			if (typeof MutationObserver === "undefined" || typeof document === "undefined" || document.body === null) return;
			observer = new MutationObserver(run);
			observer.observe(document.body, {
				childList: true,
				subtree: true
			});
		};
		const late = () => {
			install();
			if (observer === null) return;
			run();
		};
		const start = () => {
			if (typeof document !== "undefined" && document.body !== null) install();
			else if (typeof document !== "undefined" && typeof document.addEventListener === "function") document.addEventListener("DOMContentLoaded", late, { once: true });
		};
		const dispose = () => {
			if (observer) observer.disconnect();
			if (typeof document !== "undefined" && typeof document.removeEventListener === "function") document.removeEventListener("DOMContentLoaded", late);
		};
		return {
			add: (fn) => {
				subscribers.push(fn);
			},
			start,
			dispose
		};
	}

// src/client/notify/audio.js
/**
	* notify/audio.js — the browser half of 音频通知: switches, volume, previews.
	*
	* Extracted from the entry (see TODO.md「入口瘦身」). The host process owns
	* playback (lib/audio.js); the browser's whole job here is switches, a volume
	* number and the preview buttons — every sound is played by the host,
	* including the previews (that is the point: the preview must go through the
	* same path as a real notification, or testing it proves nothing).
	*
	* The keys below pass through the prefs/keys.js table unchanged and equal the
	* schema field names, so a switch can never write an undeclared field. The
	* settings panel (UI keys), the boot loader's chime (isOn / previewSlot) and
	* the attention watcher (isOn) all read through this one instance.
	*/
	function createAudioPrefs({ prefs }) {
		const KEYS = {
			enabled: "audioEnabled",
			boot: "audioBoot",
			turnStart: "audioTurnStart",
			turnDone: "audioTurnDone",
			volume: "audioVolume",
			humanOnly: "audioHumanOnly",
			diag: "audioDiag",
			soundDir: "audioSoundDir"
		};
		const STATE_URL = "/theme-endfield/audio/state";
		const PREVIEW_URL = "/theme-endfield/audio/preview";
		const isOn = () => prefs.get(KEYS.enabled) !== "0";
		const isBootOn = () => prefs.get(KEYS.boot) !== "0";
		const isStartOn = () => prefs.get(KEYS.turnStart) !== "0";
		const isDoneOn = () => prefs.get(KEYS.turnDone) !== "0";
		const isHumanOnly = () => prefs.get(KEYS.humanOnly) !== "0";
		const isDiagOn = () => prefs.get(KEYS.diag) === "1";
		const readVolume = () => {
			const parsed = Number.parseInt(prefs.get(KEYS.volume), 10);
			return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 100;
		};
		const readSoundDir = () => prefs.get(KEYS.soundDir) || "";
		/** Ask the host to play one slot through the real notification path. */
		const previewSlot = (slot) => {
			if (typeof fetch !== "function") return Promise.resolve({
				played: false,
				why: "no fetch"
			});
			return fetch(PREVIEW_URL, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ slot })
			}).then((res) => res.json().catch(() => ({
				played: false,
				why: "bad response"
			})), (error) => ({
				played: false,
				why: String(error && error.message ? error.message : error)
			}));
		};
		return {
			KEYS,
			STATE_URL,
			PREVIEW_URL,
			isOn,
			isBootOn,
			isStartOn,
			isDoneOn,
			isHumanOnly,
			isDiagOn,
			readVolume,
			readSoundDir,
			previewSlot
		};
	}

// src/client/notify/toast.js
/**
	* notify/toast.js — 终末地工业风通知 (the industrial toast cards).
	*
	* Extracted from the entry (see TODO.md「入口瘦身」). Three triggers, one
	* visual language: 任务完成 (turn end, from the SAME ConversationSnapshot.running
	* edge the toasts derive from — see notify/turn-watch.js) and 提问 / 索权 (the
	* attention watcher's question / approval / plan-review kinds — see
	* notify/attention.js). Sound is NOT re-implemented: the existing audio slots
	* already fire for exactly these moments (attention via the attention report,
	* turn end via the host's own listener), so a notification is the VISUAL half
	* of the same event and the audio switches keep owning the audible half.
	*
	* Lifetime rules differ by urgency, deliberately:
	*   done      auto-dismisses after DONE_MS — it is a receipt;
	*   attention STICKS until the interaction resolves (the watcher's
	*             kind -> null transition clears it) or the user dismisses it —
	*             these need a human decision, and a receipt-style fade could
	*             hide exactly the moment the user was being called for.
	*
	* The stack is plain DOM (same decision as the watermark): the panel's
	* mini-React owns settings, not page chrome, and a fixed-position stack has
	* no interaction with the app's layout.
	*/
	function createToasts({ prefs, isEnabled }) {
		const NOTIFY_KEY = "dsh-theme-endfield-notify";
		const NOTIFY_DONE_KEY = "dsh-theme-endfield-notify-done";
		const NOTIFY_QUESTION_KEY = "dsh-theme-endfield-notify-question";
		const NOTIFY_APPROVE_KEY = "dsh-theme-endfield-notify-approve";
		const isNotifyOn = () => prefs.get(NOTIFY_KEY) !== "0";
		const isNotifyDoneOn = () => prefs.get(NOTIFY_DONE_KEY) !== "0";
		const isNotifyQuestionOn = () => prefs.get(NOTIFY_QUESTION_KEY) !== "0";
		const isNotifyApproveOn = () => prefs.get(NOTIFY_APPROVE_KEY) !== "0";
		/** Does this attention kind have a notification switch flipped on? */
		const notifyWantsKind = (kind) => {
			if (kind === "question") return isNotifyQuestionOn();
			return isNotifyApproveOn();
		};
		const NOTIFY_DONE_MS = 6e3;
		let notifyStack = null;
		const notifyTimers = /* @__PURE__ */ new Map();
		/** Copy per kind. Hardcoded zh like the rest of the page chrome, not a
		settings string, and the theme's face is bilingual-unfriendly by design. */
		const notifyCopy = (kind) => ({
			done: {
				title: "任务完成",
				body: "回合已结束，可以继续。"
			},
			question: {
				title: "等待回答",
				body: "助手提出了一个需要你选择的问题。"
			},
			approval: {
				title: "需要授权",
				body: "一个操作正在等待你的批准。"
			},
			"plan-review": {
				title: "方案确认",
				body: "计划变更正在等待你的审阅。"
			}
		})[kind] || {
			title: "通知",
			body: ""
		};
		const notifyCard = (kind, title, body) => {
			const el = document.createElement("div");
			el.setAttribute("data-endfield-notify", kind);
			el.setAttribute("data-endfield-notify-kind", kind);
			el.setAttribute("role", kind === "done" ? "status" : "alert");
			const rail = document.createElement("span");
			rail.setAttribute("data-endfield-notify-rail", "");
			rail.setAttribute("aria-hidden", "true");
			const main = document.createElement("div");
			main.setAttribute("data-endfield-notify-main", "");
			const head = document.createElement("span");
			head.setAttribute("data-endfield-notify-head", "");
			head.textContent = title;
			const text = document.createElement("span");
			text.setAttribute("data-endfield-notify-body", "");
			text.textContent = body;
			main.appendChild(head);
			main.appendChild(text);
			el.appendChild(rail);
			el.appendChild(main);
			if (kind !== "done") {
				const close = document.createElement("button");
				close.setAttribute("data-endfield-notify-close", "");
				close.setAttribute("aria-label", "×");
				close.type = "button";
				close.textContent = "×";
				close.addEventListener("click", () => dismissNotify(kind));
				el.appendChild(close);
			}
			return el;
		};
		/** Idempotent stack host, created on first use and torn down with the run. */
		const notifyHost = () => {
			if (notifyStack !== null && notifyStack.isConnected) return notifyStack;
			if (typeof document === "undefined" || !document.body) return null;
			if (notifyStack === null) notifyStack = document.createElement("div");
			notifyStack.setAttribute("data-endfield-notify-stack", "");
			document.body.appendChild(notifyStack);
			return notifyStack;
		};
		/** Show (or replace) the toast for one kind. Self-guarded on every switch. */
		const showNotify = (kind) => {
			if (!isEnabled() || !isNotifyOn()) return;
			if (kind === "done" && !isNotifyDoneOn()) return;
			if (kind !== "done" && !notifyWantsKind(kind)) return;
			if (typeof document === "undefined" || !document.body) return;
			const host = notifyHost();
			if (host === null) return;
			dismissNotify(kind, true);
			const copy = notifyCopy(kind);
			const el = notifyCard(kind, copy.title, copy.body);
			host.insertBefore(el, host.firstChild);
			if (kind === "done" && typeof setTimeout === "function") notifyTimers.set(kind, setTimeout(() => dismissNotify("done"), NOTIFY_DONE_MS));
		};
		/** Remove the toast for a kind; `quiet` skips timer cleanup recursion. */
		const dismissNotify = (kind, quiet) => {
			if (!quiet && notifyTimers.has(kind)) {
				clearTimeout(notifyTimers.get(kind));
				notifyTimers.delete(kind);
			}
			if (notifyStack === null) return;
			const el = notifyStack.querySelector("[data-endfield-notify-kind=\"" + kind + "\"]");
			if (el !== null) el.remove();
		};
		/** Attention resolution clears every sticky kind (question answered,
		approval decided, panel replaced by another kind). */
		const notifyResolveAttention = () => {
			for (const kind of [
				"question",
				"approval",
				"plan-review"
			]) dismissNotify(kind);
		};
		const destroyNotify = () => {
			for (const t of notifyTimers.values()) clearTimeout(t);
			notifyTimers.clear();
			if (notifyStack !== null && notifyStack.parentNode) notifyStack.parentNode.removeChild(notifyStack);
			notifyStack = null;
		};
		return {
			KEY: NOTIFY_KEY,
			DONE_KEY: NOTIFY_DONE_KEY,
			QUESTION_KEY: NOTIFY_QUESTION_KEY,
			APPROVE_KEY: NOTIFY_APPROVE_KEY,
			isOn: isNotifyOn,
			isDoneOn: isNotifyDoneOn,
			isQuestionOn: isNotifyQuestionOn,
			isApproveOn: isNotifyApproveOn,
			show: showNotify,
			dismiss: dismissNotify,
			resolveAttention: notifyResolveAttention,
			destroy: destroyNotify
		};
	}

// src/client/notify/attention.js
/**
	* notify/attention.js — 需要你回应: the UI observer and its watcher.
	*
	* Extracted from the entry (see TODO.md「入口瘦身」), in two halves that were
	* two entry sections before:
	*
	*   · the OBSERVER — WHICH semantic anchors name "a human must act" on screen
	*     (ATTENTION_MARKERS / detectPendingInteraction);
	*   · the WATCHER — WHEN a report happens: edge-triggered on a
	*     MutationObserver with a slow poll as the backstop, feeding both the
	*     audio chime (through the host report route) and the visual toast.
	*
	* WHY THIS EXISTS. The host-side seams that would normally carry this moment
	* (`approval/request`, `user-questions/request`, raised by dsh-user-approval
	* and dsh-tool-ask-user) do not fire in every deployment. Measured: with
	* the theme plugin mounted, a question was on screen and ANSWERED while the
	* host half's counter stayed at 0 — because `ask_user_question` in this
	* composition is provided outside the profile's plugin stack, so
	* `dsh-tool-ask-user` never runs and the waterfall is never raised.
	*
	* The UI is therefore the only place where "a human must act" is always real.
	* The host still owns the sound (switch, volume, debounce) — the page only
	* reports that a confirmation box appeared. The host-side listeners stay in
	* place for compositions where they DO fire; both paths end at the same slot
	* and the host's debounce collapses a double report into one sound.
	*
	* ANCHORS: only the per-panel DATA ATTRIBUTES, never a class name.
	*
	* A class-based first attempt was tried and it mis-fired in the field:
	* `[class*='_card']` matches 15 different components across the installed
	* client packages (model selector, agent-preset picker, …) and
	* `[class*='_frame']` matches 8, so opening any such card rang the attention
	* sound while no confirmation box was on screen. What the panels actually
	* expose, verified against the installed packages, is one stable attribute
	* each:
	*   approval panel    <div data-approval-key="…">
	*   plan review panel <div data-plan-review-key="…">
	*   question dialog   <div data-question-key="…">
	*
	* A marker that disappears in a future UI release silences this feature
	* without breaking anything — hence the counter in the settings page, which
	* is the only way to notice that the anchors stopped matching.
	*
	* The WATCHER half is a coarse poll rather than a MutationObserver alone. The
	* reason is the failure mode rather than the cost: an observer watching a
	* container that the app later replaces (or an anchor that renders before
	* `document.body` exists) stops delivering and cannot tell anyone, while a
	* poll that asks "is a confirmation box on screen?" keeps working through any
	* re-render, and its only symptom is up to `POLL_MS` of latency —
	* imperceptible for a chime. The edge is "a box is on screen after a moment
	* where none was". A box that stays open does not re-report, so a forgotten
	* dialog cannot beep forever; and a re-render that briefly drops the node and
	* puts it back would re-report, so the poll is deliberately slower than a
	* React remount. Whatever still slips through lands on the host's per-slot
	* debounce, which is the backstop for every path. The observer cuts the
	* first-notice latency to roughly one animation frame; the poll stays because
	* an observer bound to a container the app later replaces would stop
	* delivering silently, and a poll cannot. Its period is deliberately longer
	* than a React remount, so a re-render that briefly drops and re-adds the node
	* cannot register as two separate boxes.
	*/
	function createAttentionWatch({ isEnabled, audio, toasts }) {
		const ATTENTION_URL = "/theme-endfield/audio/attention";
		const ATTENTION_MARKERS = [
			{
				kind: "approval",
				selector: "[data-approval-key]"
			},
			{
				kind: "plan-review",
				selector: "[data-plan-review-key]"
			},
			{
				kind: "question",
				selector: "[data-question-key]"
			}
		];
		const POLL_MS = 1e3;
		/** Which kind of pending interaction is on screen right now, if any. */
		const detectPendingInteraction = () => {
			if (typeof document === "undefined" || typeof document.querySelector !== "function") return null;
			for (const marker of ATTENTION_MARKERS) try {
				if (document.querySelector(marker.selector) !== null) return marker.kind;
			} catch (e) {}
			return null;
		};
		/** Tell the host a confirmation box appeared; it decides whether to sound. */
		const reportAttention = (kind) => {
			if (typeof fetch !== "function") return Promise.resolve({
				played: false,
				why: "no fetch"
			});
			return fetch(ATTENTION_URL, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ kind })
			}).then((res) => res.json().catch(() => ({
				played: false,
				why: "bad response"
			})), (error) => ({
				played: false,
				why: String(error && error.message ? error.message : error)
			}));
		};
		let audioAttentionTimer = null;
		let audioAttentionObserver = null;
		let audioAttentionFrame = null;
		let audioAttentionKind = null;
		const audioAttentionTick = () => {
			try {
				const kind = detectPendingInteraction();
				if (kind === null) {
					if (audioAttentionKind !== null) toasts.resolveAttention();
					audioAttentionKind = null;
					return;
				}
				if (kind === audioAttentionKind) return;
				audioAttentionKind = kind;
				toasts.show(kind);
				if (!audio.isOn()) return;
				reportAttention(kind);
			} catch (e) {}
		};
		/** Collapse a burst of mutations into one look on the next frame. */
		const audioAttentionSchedule = () => {
			if (audioAttentionFrame !== null) return;
			if (typeof requestAnimationFrame !== "function") {
				audioAttentionTick();
				return;
			}
			audioAttentionFrame = requestAnimationFrame(() => {
				audioAttentionFrame = null;
				audioAttentionTick();
			});
		};
		const stopAudioAttentionWatch = () => {
			if (audioAttentionTimer !== null && typeof clearInterval === "function") clearInterval(audioAttentionTimer);
			audioAttentionTimer = null;
			if (audioAttentionObserver !== null) {
				try {
					audioAttentionObserver.disconnect();
				} catch (e) {}
				audioAttentionObserver = null;
			}
			if (audioAttentionFrame !== null) {
				if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(audioAttentionFrame);
				audioAttentionFrame = null;
			}
			audioAttentionKind = null;
		};
		const syncAudioAttentionWatch = () => {
			const notifyWantsWatch = toasts.isOn() && (toasts.isQuestionOn() || toasts.isApproveOn());
			const wanted = isEnabled() && (audio.isOn() || notifyWantsWatch);
			if (wanted && audioAttentionTimer === null && typeof setInterval === "function") {
				audioAttentionKind = null;
				audioAttentionTimer = setInterval(audioAttentionTick, POLL_MS);
				if (typeof MutationObserver === "function" && typeof document !== "undefined" && document.body) {
					audioAttentionObserver = new MutationObserver(audioAttentionSchedule);
					try {
						audioAttentionObserver.observe(document.body, {
							childList: true,
							subtree: true
						});
					} catch (e) {
						audioAttentionObserver = null;
					}
				}
				audioAttentionTick();
			} else if (!wanted && audioAttentionTimer !== null) stopAudioAttentionWatch();
		};
		return {
			MARKERS: ATTENTION_MARKERS,
			sync: syncAudioAttentionWatch,
			stop: stopAudioAttentionWatch,
			tick: audioAttentionTick,
			schedule: audioAttentionSchedule
		};
	}

// src/client/notify/turn-watch.js
/**
	* notify/turn-watch.js — 回合边沿 → 任务完成回执.
	*
	* Extracted from the entry (see TODO.md「入口瘦身」). The 任务完成 receipt's
	* trigger is the authoritative ConversationSnapshot.running bit, NOT the DOM:
	* one subscription on the session face, and the first readable value is a
	* baseline so enabling mid-turn stays silent. Started and stopped from the
	* same reconcile points as the other features (mount, master switch,
	* teardown); the notification module self-guards its own switch.
	*
	* Late-bound on purpose: the sessions service may arrive after apply() (the
	* runtime provides it asynchronously and this theme declares no `inject`), so
	* a one-shot const would capture undefined for the whole session and the
	* receipt would be permanently dead depending on load order.
	*/
	function createTurnWatch({ services, debug: dbg, isEnabled, isDoneOn, showToast }) {
		const getSessions = () => services.sessions();
		let turnUnsubList = null;
		let turnUnsubSession = null;
		let turnRetryTimer = null;
		let turnRetryAttempts = 0;
		let turnWatchedId = null;
		let turnLastRunning = null;
		/** The running bit of one session face, or null when it cannot be read. */
		const turnReadRunning = (face) => {
			try {
				const snap = face.getSnapshot();
				if (snap === null || typeof snap !== "object") return null;
				return snap.running === true;
			} catch (e) {
				return null;
			}
		};
		const turnDetach = () => {
			if (turnUnsubSession !== null) {
				try {
					turnUnsubSession();
				} catch (e) {}
				turnUnsubSession = null;
			}
			turnWatchedId = null;
			turnLastRunning = null;
		};
		/** Subscribe to selection changes once; idempotent. */
		const turnSubscribeList = (sessions) => {
			if (turnUnsubList !== null) return;
			let unsub = null;
			try {
				unsub = sessions.list.subscribe(() => {
					turnRebind();
				});
			} catch (e) {
				unsub = null;
			}
			turnUnsubList = typeof unsub === "function" ? unsub : null;
		};
		const turnRebind = () => {
			const sessions = getSessions();
			if (turnRetryTimer !== null && typeof clearTimeout === "function") clearTimeout(turnRetryTimer);
			turnRetryTimer = null;
			if (sessions === void 0) {
				if (turnRetryAttempts >= 100) {
					dbg("turn rebind gave up: no sessions service after", turnRetryAttempts, "tries");
					return;
				}
				turnRetryAttempts += 1;
				if (typeof setTimeout === "function") turnRetryTimer = setTimeout(turnRebind, 120);
				return;
			}
			turnSubscribeList(sessions);
			let id;
			try {
				const snap = sessions.list.getSnapshot();
				id = snap === null || typeof snap !== "object" ? void 0 : snap.current;
			} catch (e) {
				return;
			}
			if (id === void 0 || id === null) {
				turnDetach();
				return;
			}
			if (id === turnWatchedId && turnUnsubSession !== null) return;
			turnDetach();
			let face = null;
			try {
				const binding = sessions.binding(id);
				if (binding !== void 0 && binding !== null) face = binding.session;
			} catch (e) {
				face = null;
			}
			if (face === null || typeof face.subscribe !== "function" || typeof face.getSnapshot !== "function") {
				if (turnRetryAttempts >= 100) {
					dbg("turn rebind gave up: session face never became bindable for", id);
					return;
				}
				turnRetryAttempts += 1;
				if (typeof setTimeout === "function") turnRetryTimer = setTimeout(turnRebind, 120);
				return;
			}
			turnRetryAttempts = 0;
			turnWatchedId = id;
			turnLastRunning = turnReadRunning(face);
			let unsub = null;
			try {
				unsub = face.subscribe(() => {
					const next = turnReadRunning(face);
					if (next === null || next === turnLastRunning) return;
					const prev = turnLastRunning;
					turnLastRunning = next;
					if (prev === null) return;
					if (!next) showToast("done");
				});
			} catch (e) {
				unsub = null;
			}
			turnUnsubSession = typeof unsub === "function" ? unsub : null;
			if (turnUnsubSession === null) turnWatchedId = null;
		};
		const turnStopWatch = () => {
			if (turnRetryTimer !== null && typeof clearTimeout === "function") clearTimeout(turnRetryTimer);
			turnRetryTimer = null;
			turnRetryAttempts = 0;
			if (turnUnsubList !== null) {
				try {
					turnUnsubList();
				} catch (e) {}
				turnUnsubList = null;
			}
			turnDetach();
		};
		const syncTurnWatch = () => {
			if (!(isEnabled() && isDoneOn())) {
				turnStopWatch();
				return;
			}
			turnRebind();
		};
		return {
			sync: syncTurnWatch,
			stop: turnStopWatch
		};
	}

// src/client/motion/sync.js
/**
	* motion/sync.js — the <body> attribute/class sync layer and its DOM predicates.
	*
	* Extracted from the entry (see TODO.md「入口瘦身」第 3 项): every prefs-driven
	* <body> surface lives here — radius class, motion attribute, glass/texture
	* attributes — plus the DOM predicates the entry's surfaces
	* read (scheme / reduced-motion / app-frame). The entry injects `prefs` and the
	* master-switch reader `isEnabled`; nothing here touches a closure of apply().
	*
	* The entry calls syncAll() at every reconcile point (mount, the live
	* preference reconciler) and detach() on unmount; the per-surface syncs are
	* exposed for the settings panel's write-through paths.
	*/
	function createMotionSync({ prefs, isEnabled }) {
		const RADIUS_KEY = "dsh-theme-endfield-radius";
		const MOTION_KEY = "dsh-theme-endfield-motion";
		const readMotion = () => prefs.get(MOTION_KEY) === "off" ? "off" : "signal";
		const syncMotion = () => {
			if (typeof document === "undefined" || document.body === null) return;
			if (isEnabled() && readMotion() !== "off") document.body.setAttribute?.("data-endfield-motion", "signal");
			else document.body.removeAttribute?.("data-endfield-motion");
		};
		const TEXTURE_KEY = "dsh-theme-endfield-texture";
		const TEXTURE_OPTIONS = [
			"off",
			"subtle",
			"standard"
		];
		const readTexture = () => {
			const value = prefs.get(TEXTURE_KEY);
			return TEXTURE_OPTIONS.includes(value) ? value : "standard";
		};
		const syncTexture = () => {
			if (typeof document === "undefined" || document.body === null) return;
			const value = readTexture();
			if (isEnabled() && value !== "off") document.body.setAttribute?.("data-endfield-texture", value);
			else document.body.removeAttribute?.("data-endfield-texture");
		};
		const GLASS_KEY = "dsh-theme-endfield-glass";
		const GLASS_OPTIONS = [
			"off",
			"subtle",
			"standard",
			"strong"
		];
		const readGlass = () => {
			const value = prefs.get(GLASS_KEY);
			return GLASS_OPTIONS.includes(value) ? value : "off";
		};
		const syncGlass = () => {
			if (typeof document === "undefined" || document.body === null) return;
			const value = readGlass();
			if (isEnabled() && value !== "off") document.body.setAttribute?.("data-endfield-glass", value);
			else document.body.removeAttribute?.("data-endfield-glass");
		};
		const syncRadiusMode = () => {
			if (typeof document === "undefined" || document.body === null) return;
			if ((prefs.get(RADIUS_KEY) || "square") === "round") document.body.classList.add("theme-endfield-round");
			else document.body.classList.remove("theme-endfield-round");
		};
		const isDarkScheme = () => typeof document !== "undefined" && document.body && document.body.hasAttribute("data-ds-dark-theme");
		const prefersReducedMotion = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const findAppFrame = () => {
			if (typeof document === "undefined") return null;
			const col = document.querySelector("[class$=\"_centerCol\"], [class*=\"_centerCol \"]");
			const frame = col !== null ? col.parentElement : null;
			if (frame === null) return null;
			const r = frame.getBoundingClientRect();
			if (r.width === 0 || r.height === 0) return null;
			return frame;
		};
		/** Every body surface, in the order the mount block always used. The entry's
		reconcile points (mount + the live preference reconciler) call exactly
		this, so a new surface only has to be added here. */
		const syncAll = () => {
			syncRadiusMode();
			syncMotion();
			syncGlass();
			syncTexture();
		};
		const detach = () => {
			if (typeof document === "undefined" || document.body === null) return;
			document.body.classList.remove("theme-endfield-round");
			document.body.removeAttribute?.("data-endfield-glass");
		};
		return {
			RADIUS_KEY,
			MOTION_KEY,
			TEXTURE_KEY,
			GLASS_KEY,
			TEXTURE_OPTIONS,
			GLASS_OPTIONS,
			readMotion,
			readTexture,
			readGlass,
			isDarkScheme,
			prefersReducedMotion,
			findAppFrame,
			syncRadiusMode,
			syncMotion,
			syncGlass,
			syncTexture,
			syncAll,
			detach
		};
	}

// src/client/ui/settings/dictionaries.js
/**
	* ui/settings/dictionaries.js — the settings panel copy: zh / en dictionaries.
	*
	* Extracted from the entry (see TODO.md「入口瘦身」第 4 项). The texts go through
	* the app own `locale` service rather than a private language guess; zh is the
	* source of truth for the key set (this repo convention) and en is kept complete
	* against it — a key present in one and missing in the other would silently fall
	* back to the raw key string in the UI, which is why the test suite compares the
	* two key sets rather than trusting review.
	*
	* Naming: keys are grouped by row (theme*, radius*, notify*) so a row copy
	* stays discoverable next to its switch.
	*/
	const ENDFIELD_NS = "settings.theme-endfield";
	const LOCALE_ZH = {
		nav: "终末地主题设置",
		sep: "：",
		on: "开启",
		off: "关闭",
		groupTheme: "主题",
		groupBg: "背景",
		groupAnim: "动画",
		groupNotify: "通知",
		themeRow: "终末地主题",
		radiusRow: "主题圆角",
		radiusRound: "圆角",
		radiusSquare: "直角",
		watermarkRow: "背景水印",
		wmPersistRow: "水印保持显示",
		wmPersistOn: "保持显示",
		wmPersistOff: "仅新建页",
		wmPersistHintOn: "在对话等非新建会话页面也显示水印（置于正文之下）",
		wmPersistHintOff: "仅在新建会话页显示水印",
		wmPersistNeedWm: "请先开启背景水印",
		loaderRow: "启动加载动画",
		loaderHintOn: "刷新页面时播放 ENDFIELD 启动加载屏（左侧进度轨 + 百分比，信号黄强调色）",
		loaderHintOff: "默认关闭；开启后每次刷新页面播放一次",
		loaderNeed: "请先开启启动加载动画",
		preview: "预览",
		glassRow: "磨砂玻璃",
		glassHint: "只作用于输入卡片：轻微/标准/强 = 8/14/22px 有界局部模糊；右侧面板保持不透明，侧栏仅静态着色",
		glassOff: "关闭",
		glassSubtle: "轻微",
		glassStandard: "标准",
		glassStrong: "强",
		textureRow: "工业底纹",
		textureHint: "官网 /operator 的背景（只作用于主内容列）：上半网格渐隐 + 底部斜纹带 + 两级波纹",
		textureOff: "关闭（纯色）",
		textureSubtle: "轻（网格 + 斜纹）",
		textureStandard: "完整（官网默认）",
		motionRow: "按钮动效",
		motionHint: "合并设计：新会话/审批按钮＝信号箭头滑入，侧边栏会话行＝四角工程角标；全局 .2s 颜色过渡、按下暗一档",
		notifyRow: "工业风通知",
		notifyHintOn: "任务完成自动消失；提问/索权常驻直到处理完成；音效跟随「音频通知」开关",
		notifyHintOff: "默认开启；右下角工业风卡片通知",
		notifyNeed: "请先开启通知",
		notifyDoneRow: "任务完成通知",
		notifyDoneHint: "回合结束时弹出回执卡片，6 秒后自动消失",
		notifyQuestionRow: "提问通知",
		notifyQuestionHint: "助手提问时弹出常驻卡片，回答后自动消失",
		notifyApproveRow: "索权通知",
		notifyApproveHint: "操作授权与方案审阅时弹出常驻卡片，处理完自动消失",
		groupAudio: "音频",
		audioRow: "音频通知",
		audioHintOn: "由宿主进程播放，页面最小化或切到别的应用时同样能听到",
		audioHintOff: "默认关闭；开启后按下面的开关出声（也可以只留想要的几个）",
		audioBootRow: "启动加载动画音",
		audioBootHint: "播放 ENDFIELD 加载板时响一次；只认真正的页面加载，点「预览」重播不会响",
		audioStartRow: "任务开始音",
		audioStartHint: "只在你从会话框提交指令后播放（后台唤醒、目标续跑不计）",
		audioDoneRow: "任务结束音",
		audioDoneHint: "只在我产出最终结果后播放；中途报错或等待审批时不出声",
		audioVolumeRow: "音量",
		audioVolumeHint: "只缩放提示音本身，不改系统音量",
		audioSlotStart: "开始",
		audioSlotDone: "结束",
		audioSlotBoot: "开机",
		audioSlotQuestion: "提问",
		audioSlotApproval: "审批",
		audioSlotUi: "界面",
		audioAttentionRow: "需要你回应",
		audioTurnFailRow: "出错提示音",
		audioAttentionHint: "审批请求、我的提问、计划求批都会响",
		audioReservedNeed: "无事件接线：不需要人工干预的错误保持静音",
		audioSoundDirRow: "自定义音效目录",
		audioSoundDirHint: "把 turn-start.wav / turn-done.wav 放进该目录即可覆盖内置音；留空则查工作区与桌面",
		audioSoundDirDefault: "未设置（用桌面 / 工作区 / 内置音）",
		audioFileRow: "当前音源",
		audioFileBundled: "内置合成音",
		audioFileOwn: "自定义文件",
		audioFileMissing: "未找到文件",
		audioHumanOnlyRow: "开始音仅认会话框",
		audioHumanOnlyOn: "仅会话框",
		audioHumanOnlyOff: "宽松模式",
		audioHumanOnlyHintOn: "只认带提交凭据的用户消息，最不容易误触发",
		audioHumanOnlyHintOff: "任何用户来源消息都算（调试用，后台唤醒可能误响）",
		audioDiagRow: "诊断日志",
		audioDiagHint: "在宿主控制台与 /theme-endfield/audio/state 记录每次事件判定",
		audioTestOk: "已交由宿主播放",
		audioTestFail: "宿主未播放",
		audioNeedOn: "请先开启音频通知",
		audioRefresh: "刷新状态"
	};
	const LOCALE_EN = {
		nav: "Endfield Theme",
		sep: ": ",
		on: "On",
		off: "Off",
		groupTheme: "THEME",
		groupBg: "BACKGROUND",
		groupAnim: "ANIMATION",
		groupNotify: "NOTIFY",
		themeRow: "Endfield theme",
		radiusRow: "Corners",
		radiusRound: "Rounded",
		radiusSquare: "Square",
		watermarkRow: "Background wordmark",
		wmPersistRow: "Keep wordmark visible",
		wmPersistOn: "Keep visible",
		wmPersistOff: "New session only",
		wmPersistHintOn: "Also shown on conversations and other pages, behind the text",
		wmPersistHintOff: "Shown only on the new-session screen",
		wmPersistNeedWm: "Turn on the background wordmark first",
		loaderRow: "Boot animation",
		loaderHintOn: "Plays the ENDFIELD boot screen on reload (progress rail + percentage, in the signal-yellow accent)",
		loaderHintOff: "Off by default; plays once on every page reload when enabled",
		loaderNeed: "Turn on the boot animation first",
		preview: "Preview",
		glassRow: "Frosted glass",
		glassHint: "Composer card only: subtle/standard/strong = 8/14/22px bounded blur; the docked right panel stays opaque, the sidebar gets a static tint only",
		glassOff: "Off",
		glassSubtle: "Subtle",
		glassStandard: "Standard",
		glassStrong: "Strong",
		textureRow: "Industrial texture",
		textureHint: "The official /operator backdrop (main column only): top-fading grid, bottom hatch band, two wave layers",
		textureOff: "Off (flat colour)",
		textureSubtle: "Light (grid + hatch)",
		textureStandard: "Full (official default)",
		motionRow: "Button motion",
		motionHint: "One merged design: signal arrow slides into the New-session/approve buttons, sidebar session rows gain corner brackets; .2s colour transitions everywhere, dim on press",
		notifyRow: "Industrial notify",
		notifyHintOn: "Task-done auto-dismisses; question/approval stay until resolved; sound follows the audio switches",
		notifyHintOff: "On by default; industrial toast cards in the bottom-right corner",
		notifyNeed: "Turn notifications on first",
		notifyDoneRow: "Task done",
		notifyDoneHint: "A receipt card on turn end; auto-dismisses after 6s",
		notifyQuestionRow: "Question",
		notifyQuestionHint: "A sticky card when the assistant asks; clears when answered",
		notifyApproveRow: "Approval",
		notifyApproveHint: "A sticky card for approvals and plan reviews; clears when decided",
		groupAudio: "AUDIO",
		audioRow: "Audio notifications",
		audioHintOn: "Played by the host process, so a minimized page or another app in front still gets the sound",
		audioHintOff: "Off by default; turning it on enables the slots below (keep only the ones you want)",
		audioBootRow: "Boot animation sound",
		audioBootHint: "Rings once when the ENDFIELD boot plate plays; a real page load only — the Preview button replays it silently",
		audioStartRow: "Task-start sound",
		audioStartHint: "Plays only after you submit from the composer (wakeups and goal continuations do not count)",
		audioDoneRow: "Task-end sound",
		audioDoneHint: "Plays only after the final answer; interrupted turns and approval waits stay silent",
		audioVolumeRow: "Volume",
		audioVolumeHint: "Rescales only the notification sound, never the system volume",
		audioSlotStart: "Start",
		audioSlotDone: "Done",
		audioSlotBoot: "Boot",
		audioSlotQuestion: "Questions",
		audioSlotApproval: "Approvals",
		audioSlotUi: "Seen",
		audioAttentionRow: "Needs your response",
		audioTurnFailRow: "Error sound",
		audioAttentionHint: "Fires on approval requests, my questions and plan reviews",
		audioReservedNeed: "Not wired by design: an error needing no human decision stays silent",
		audioSoundDirRow: "Custom sound directory",
		audioSoundDirHint: "Drop turn-start.wav / turn-done.wav there to override the built-in tone; blank falls back to the workspace and the Desktop",
		audioSoundDirDefault: "Not set (Desktop / workspace / bundled)",
		audioFileRow: "Current source",
		audioFileBundled: "Bundled synthesized tone",
		audioFileOwn: "Your own file",
		audioFileMissing: "No file found",
		audioHumanOnlyRow: "Start sound: composer only",
		audioHumanOnlyOn: "Composer only",
		audioHumanOnlyOff: "Loose mode",
		audioHumanOnlyHintOn: "Requires the submission credential a real prompt carries — least likely to misfire",
		audioHumanOnlyHintOff: "Any user-source message counts (debugging; background wakeups may misfire)",
		audioDiagRow: "Diagnostics",
		audioDiagHint: "Logs every event verdict to the host console and /theme-endfield/audio/state",
		audioTestOk: "Handed to the host",
		audioTestFail: "The host did not play it",
		audioNeedOn: "Turn audio notifications on first",
		audioRefresh: "Refresh state"
	};

// src/client/ui/settings/section.js
/**
	* ui/settings/section.js — the settings section: locale wiring, the slots
	* injection and the React panel.
	*
	* Extracted from the entry (see TODO.md「入口瘦身」第 4 项). Everything the
	* panel touches arrives by injection: the services adapter (locale/slots/
	* effect), the preference store, the master-switch trio (isEnabled/mount/
	* unmount) and every feature surface it writes through (motionSync, watermark,
	* loader, toasts, attention, audio). The panel is otherwise verbatim the code
	* that lived in the entry — including its useState ORDER, which
	* test/settings-config-forms.test.js pins by index (hooks[4] === glass).
	*/
	function createSettingsSection({ services, prefs, themeApi, motionSync, watermark, loader, toasts, attention, audio }) {
		const { isEnabled, mount, unmount, enabledKey: ENABLED_KEY } = themeApi;
		const locale = services.locale();
		let t = (key) => Object.prototype.hasOwnProperty.call(LOCALE_ZH, key) ? LOCALE_ZH[key] : key;
		let localeReady = false;
		if (locale !== void 0 && typeof locale.register === "function" && typeof locale.bind === "function") {
			services.effect(() => locale.register(ENDFIELD_NS, {
				zh: LOCALE_ZH,
				en: LOCALE_EN
			}));
			const bound = locale.bind(ENDFIELD_NS);
			if (typeof bound === "function") {
				t = bound;
				localeReady = true;
			}
		}
		const slots = services.slots();
		const disposeRows = [];
		let disposeSettings = () => {
			disposeRows.forEach((d) => d());
		};
		if (slots !== void 0) slots.inject("settings.section", () => {
			const d = slots.register(Object.assign({
				name: "settings.section",
				id: "theme-endfield",
				order: 35,
				label: () => t("nav")
			}, localeReady ? { locale: ENDFIELD_NS } : {}), () => {
				const R = typeof React !== "undefined" ? React : typeof require === "function" ? require("react") : null;
				if (!R) return null;
				const [enabled, setEnabled] = R.useState(isEnabled());
				const [wmOn, setWmOn] = R.useState(watermark.isOn());
				const [wmPersist, setWmPersist] = R.useState(watermark.isPersistOn());
				const [loaderOn, setLoaderOn] = R.useState(loader.isOn());
				const [glass, setGlass] = R.useState(motionSync.readGlass());
				const [texture, setTexture] = R.useState(motionSync.readTexture());
				const [mode, setMode] = R.useState(prefs.get(motionSync.RADIUS_KEY) || "square");
				const [motion, setMotion] = R.useState(motionSync.readMotion());
				const [audioOn, setAudioOn] = R.useState(audio.isOn());
				const [audioBoot, setAudioBoot] = R.useState(audio.isBootOn());
				const [audioStart, setAudioStart] = R.useState(audio.isStartOn());
				const [audioDone, setAudioDone] = R.useState(audio.isDoneOn());
				const [audioVolume, setAudioVolume] = R.useState(audio.readVolume());
				const [audioHumanOnly, setAudioHumanOnly] = R.useState(audio.isHumanOnly());
				const [audioDiag, setAudioDiag] = R.useState(audio.isDiagOn());
				const [hostState, setHostState] = R.useState(null);
				const [previewNote, setPreviewNote] = R.useState("");
				const [notifyOn, setNotifyOn] = R.useState(toasts.isOn());
				const [notifyDone, setNotifyDone] = R.useState(toasts.isDoneOn());
				const [notifyQuestion, setNotifyQuestion] = R.useState(toasts.isQuestionOn());
				const [notifyApprove, setNotifyApprove] = R.useState(toasts.isApproveOn());
				const refreshHostState = () => {
					if (typeof fetch !== "function") return;
					fetch(audio.STATE_URL, { headers: { accept: "application/json" } }).then((res) => res.ok ? res.json() : null).then((json) => {
						if (json) setHostState(json);
					}).catch(() => {});
				};
				if (typeof R.useEffect === "function") {
					prefs.markPanelMounted();
					const resyncPanelFromPrefs = () => {
						setEnabled(isEnabled());
						setWmOn(watermark.isOn());
						setWmPersist(watermark.isPersistOn());
						setLoaderOn(loader.isOn());
						setNotifyOn(toasts.isOn());
						setNotifyDone(toasts.isDoneOn());
						setNotifyQuestion(toasts.isQuestionOn());
						setNotifyApprove(toasts.isApproveOn());
						setGlass(motionSync.readGlass());
						setTexture(motionSync.readTexture());
						setMode(prefs.get(motionSync.RADIUS_KEY) || "square");
						setMotion(motionSync.readMotion());
						setAudioOn(audio.isOn());
						setAudioBoot(audio.isBootOn());
						setAudioStart(audio.isStartOn());
						setAudioDone(audio.isDoneOn());
						setAudioVolume(audio.readVolume());
						setAudioHumanOnly(audio.isHumanOnly());
						setAudioDiag(audio.isDiagOn());
					};
					R.useEffect(() => {
						const unsubscribe = prefs.listen(resyncPanelFromPrefs);
						resyncPanelFromPrefs();
						return unsubscribe;
					}, []);
					R.useEffect(() => {
						refreshHostState();
					}, []);
				}
				const rowStyle = {
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "12px",
					padding: "12px 0",
					borderBottom: "1px solid var(--dsw-alias-border-l1)"
				};
				const labelStyle = {
					color: "var(--dsw-alias-label-primary)",
					fontSize: "13px",
					fontWeight: 500,
					lineHeight: "1.5"
				};
				const hintStyle = {
					display: "block",
					color: "var(--dsw-alias-label-tertiary)",
					fontSize: "12px",
					fontWeight: 400,
					lineHeight: "1.5",
					marginTop: "2px"
				};
				const btnStyleFor = (on, disabled) => {
					const themed = enabled;
					return {
						color: !themed ? "var(--dsw-alias-label-primary)" : on ? "#000" : "var(--dsw-alias-label-primary)",
						background: !themed ? on ? "var(--dsw-alias-interactive-bg-hover-solid)" : "transparent" : on ? "var(--edge-accent)" : "var(--edge-btn-muted)",
						border: "1px solid var(--dsw-alias-border-l2)",
						borderRadius: mode === "round" ? "999px" : "0",
						height: "32px",
						boxSizing: "border-box",
						padding: "0 14px",
						fontSize: "13px",
						cursor: disabled ? "not-allowed" : "pointer",
						opacity: disabled ? .45 : 1,
						whiteSpace: "nowrap"
					};
				};
				const setGlassValue = (value) => {
					if (!motionSync.GLASS_OPTIONS.includes(value)) return;
					prefs.set(motionSync.GLASS_KEY, value);
					setGlass(value);
					motionSync.syncGlass();
				};
				const setTextureValue = (value) => {
					if (!motionSync.TEXTURE_OPTIONS.includes(value)) return;
					prefs.set(motionSync.TEXTURE_KEY, value);
					setTexture(value);
					motionSync.syncTexture();
				};
				const toggleTheme = () => {
					const next = !isEnabled();
					prefs.set(ENABLED_KEY, next ? "1" : "0");
					setEnabled(next);
					if (next) {
						mount();
						watermark.sync();
					} else {
						unmount();
						watermark.sync();
					}
				};
				const toggleWm = () => {
					const next = !watermark.isOn();
					prefs.set(watermark.KEY, next ? "1" : "0");
					setWmOn(next);
					watermark.sync();
				};
				const motionOn = motion !== "off";
				const setMotionValue = (value) => {
					if (value !== "signal" && value !== "off") return;
					if (value === motionSync.readMotion()) return;
					prefs.set(motionSync.MOTION_KEY, value);
					setMotion(value);
					motionSync.syncMotion();
				};
				const setWmPersistValue = (value) => {
					const next = value === "1";
					if (next === watermark.isPersistOn()) return;
					prefs.set(watermark.PERSIST_KEY, next ? "1" : "0");
					setWmPersist(next);
					watermark.sync();
				};
				const toggleNotify = () => {
					const next = !toasts.isOn();
					prefs.set(toasts.KEY, next ? "1" : "0");
					setNotifyOn(next);
					attention.sync();
					if (!next) toasts.destroy();
				};
				const toggleNotifyDone = () => {
					const next = !toasts.isDoneOn();
					prefs.set(toasts.DONE_KEY, next ? "1" : "0");
					setNotifyDone(next);
				};
				const toggleNotifyQuestion = () => {
					const next = !toasts.isQuestionOn();
					prefs.set(toasts.QUESTION_KEY, next ? "1" : "0");
					setNotifyQuestion(next);
					attention.sync();
				};
				const toggleNotifyApprove = () => {
					const next = !toasts.isApproveOn();
					prefs.set(toasts.APPROVE_KEY, next ? "1" : "0");
					setNotifyApprove(next);
					attention.sync();
				};
				const toggleLoader = () => {
					const next = !loader.isOn();
					prefs.set(loader.KEY, next ? "1" : "0");
					setLoaderOn(next);
					if (next) loader.replay();
					else loader.destroy();
				};
				const replayLoader = () => {
					loader.replay();
				};
				const setRadiusValue = (value) => {
					if (value !== "square" && value !== "round") return;
					if (value === (prefs.get(motionSync.RADIUS_KEY) || "square")) return;
					prefs.set(motionSync.RADIUS_KEY, value);
					setMode(value);
					if (value === "round") document.body.classList.add("theme-endfield-round");
					else document.body.classList.remove("theme-endfield-round");
				};
				const showPreviewNote = (result) => {
					if (result && result.played) setPreviewNote(t("audioTestOk"));
					else setPreviewNote(t("audioTestFail") + (result && result.why ? "：" + result.why : ""));
				};
				const playPreview = (slot) => {
					audio.previewSlot(slot).then(showPreviewNote);
				};
				const audioTestButton = (slot) => R.createElement("button", {
					key: "audio-test-" + slot,
					type: "button",
					onClick: () => playPreview(slot),
					style: btnStyleFor(false, !audioOn),
					disabled: !audioOn,
					title: audioOn ? "" : t("audioNeedOn")
				}, t("preview"));
				const toggleAudio = () => {
					const next = !audioOn;
					prefs.set(audio.KEYS.enabled, next ? "1" : "0");
					setAudioOn(next);
					attention.sync();
					if (next) playPreview("turn-done");
				};
				const toggleAudioStart = () => {
					const next = !audioStart;
					prefs.set(audio.KEYS.turnStart, next ? "1" : "0");
					setAudioStart(next);
					if (next) playPreview("turn-start");
				};
				const toggleAudioBoot = () => {
					const next = !audioBoot;
					prefs.set(audio.KEYS.boot, next ? "1" : "0");
					setAudioBoot(next);
					if (next) playPreview("boot");
				};
				const toggleAudioDone = () => {
					const next = !audioDone;
					prefs.set(audio.KEYS.turnDone, next ? "1" : "0");
					setAudioDone(next);
					if (next) playPreview("turn-done");
				};
				const setAudioVolumeValue = (next) => {
					const clamped = Math.min(100, Math.max(0, Math.round(next)));
					prefs.set(audio.KEYS.volume, String(clamped));
					setAudioVolume(clamped);
				};
				const toggleAudioHumanOnly = () => {
					const next = !audioHumanOnly;
					prefs.set(audio.KEYS.humanOnly, next ? "1" : "0");
					setAudioHumanOnly(next);
				};
				const toggleAudioDiag = () => {
					const next = !audioDiag;
					prefs.set(audio.KEYS.diag, next ? "1" : "0");
					setAudioDiag(next);
				};
				const applySoundDir = (value) => {
					const text = typeof value === "string" ? value.trim() : "";
					prefs.set(audio.KEYS.soundDir, text);
					refreshHostState();
				};
				const boolSelect = (toggleFn, isOn) => (value) => {
					if (value === "1" === isOn()) return;
					toggleFn();
				};
				const setThemeValue = boolSelect(toggleTheme, isEnabled);
				const setWmValue = boolSelect(toggleWm, () => watermark.isOn());
				const setLoaderValue = boolSelect(toggleLoader, () => loader.isOn());
				const setNotifyValue = boolSelect(toggleNotify, () => toasts.isOn());
				const setNotifyDoneValue = boolSelect(toggleNotifyDone, () => toasts.isDoneOn());
				const setNotifyQuestionValue = boolSelect(toggleNotifyQuestion, () => toasts.isQuestionOn());
				const setNotifyApproveValue = boolSelect(toggleNotifyApprove, () => toasts.isApproveOn());
				const setAudioValue = (value) => {
					if (value === "1" !== audioOn) toggleAudio();
				};
				const setAudioBootValue = (value) => {
					if (value === "1" !== audioBoot) toggleAudioBoot();
				};
				const setAudioStartValue = (value) => {
					if (value === "1" !== audioStart) toggleAudioStart();
				};
				const setAudioDoneValue = (value) => {
					if (value === "1" !== audioDone) toggleAudioDone();
				};
				const setAudioHumanValue = (value) => {
					if (value === "1" !== audioHumanOnly) toggleAudioHumanOnly();
				};
				const setAudioDiagValue = (value) => {
					if (value === "1" !== audioDiag) toggleAudioDiag();
				};
				/** The host's view of one slot, or undefined while it has not answered. */
				const slotState = (slot) => {
					if (hostState === null || !Array.isArray(hostState.slots)) return void 0;
					return hostState.slots.find((entry) => entry.id === slot);
				};
				const audioTestReady = () => hostState === null ? true : slotState("attention") !== void 0;
				const sourceSummary = () => {
					const done = slotState("turn-done");
					if (done === void 0) return "—";
					if (done.file === null) return t("audioFileMissing");
					return done.bundled ? t("audioFileBundled") : t("audioFileOwn");
				};
				const sourceDetail = () => {
					const rows = [];
					for (const slot of [
						"boot",
						"turn-start",
						"turn-done"
					]) {
						const state = slotState(slot);
						const name = slot === "boot" ? t("audioSlotBoot") : slot === "turn-start" ? t("audioSlotStart") : t("audioSlotDone");
						rows.push(name + t("sep") + (state === void 0 || state.file === null ? t("audioFileMissing") : state.file));
					}
					if (hostState !== null && hostState.attention !== void 0) rows.push(t("audioAttentionRow") + t("sep") + t("audioSlotUi") + " " + String(hostState.attention.ui) + " / " + t("audioSlotQuestion") + " " + String(hostState.attention.question) + " / " + t("audioSlotApproval") + " " + String(hostState.attention.approval));
					if (hostState !== null && Array.isArray(hostState.log) && hostState.log.length > 0) {
						const last = hostState.log[hostState.log.length - 1];
						rows.push(t("audioDiagRow") + t("sep") + last.kind + (last.detail ? " " + last.detail : ""));
					}
					return rows.join("　·　");
				};
				const pageStyle = {
					maxWidth: "640px",
					padding: "4px 0 16px"
				};
				const groupTitle = (no, key, first) => {
					const name = t(key);
					const latin = LOCALE_EN[key];
					const parts = [R.createElement("span", {
						key: "mark",
						"aria-hidden": "true",
						style: {
							width: "4px",
							height: "14px",
							flex: "0 0 auto",
							background: "currentColor"
						}
					}), R.createElement("span", {
						key: "cn",
						style: {
							fontSize: "12px",
							fontWeight: 600,
							letterSpacing: "0.14em",
							lineHeight: "1.5"
						}
					}, no + " " + name)];
					if (latin !== void 0 && latin !== name) parts.push(R.createElement("span", {
						key: "en",
						style: {
							fontSize: "10px",
							fontWeight: 500,
							letterSpacing: "0.2em",
							opacity: .72,
							lineHeight: "1.5"
						}
					}, latin));
					return R.createElement("div", {
						key: "group-title-" + no,
						className: "endfield-settings-group-title",
						style: {
							display: "flex",
							alignItems: "center",
							gap: "8px",
							marginTop: first ? "0" : "26px",
							paddingBottom: "8px",
							borderBottom: "1px solid var(--dsw-alias-border-l1)"
						}
					}, parts);
				};
				/** "<row label>: <on|off>" — one spelling for every status row. */
				const stateOf = (on) => t(on ? "on" : "off");
				const row = (key, last, children) => R.createElement("div", {
					key,
					style: last ? {
						...rowStyle,
						borderBottom: "none"
					} : rowStyle
				}, children);
				const endfieldSelect = ({ value, options, ariaLabel, disabled, title, onChange }) => {
					const [open, setOpen] = R.useState(false);
					const rootRef = typeof R.useRef === "function" ? R.useRef(null) : null;
					const box = R.useState({ handler: null })[0];
					const closeMenu = () => {
						setOpen(false);
						if (box.handler !== null && typeof document !== "undefined" && typeof document.removeEventListener === "function") {
							document.removeEventListener("click", box.handler);
							box.handler = null;
						}
					};
					const openMenu = () => {
						setOpen(true);
						if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
							box.handler = (ev) => {
								const root = rootRef ? rootRef.current : null;
								const target = ev && ev.target;
								if (root && target && typeof target.closest === "function" && target.closest(".endfield-select") === root) return;
								closeMenu();
							};
							document.addEventListener("click", box.handler);
						}
					};
					const current = options.filter((o) => o.value === value)[0];
					const valueEl = R.createElement("span", {
						key: "val",
						className: "endfield-select-value"
					}, current ? current.label : "");
					const plate = enabled ? [valueEl, R.createElement("span", {
						key: "arrow",
						className: "endfield-select-arrow",
						"aria-hidden": "true"
					})] : [valueEl, R.createElement("svg", {
						key: "chev",
						width: 12,
						height: 12,
						viewBox: "0 0 12 12",
						fill: "none",
						"aria-hidden": "true"
					}, R.createElement("path", {
						d: "M3 4.5L6 7.5L9 4.5",
						stroke: "currentColor",
						strokeWidth: 1.5,
						strokeLinecap: "round",
						strokeLinejoin: "round"
					}))];
					const trigger = R.createElement("button", {
						key: "trigger",
						type: "button",
						className: "endfield-select-trigger",
						"aria-haspopup": "menu",
						"aria-expanded": open ? "true" : "false",
						"aria-label": ariaLabel,
						disabled: disabled === true,
						title: title || "",
						onClick: () => {
							if (disabled === true) return;
							if (open) closeMenu();
							else openMenu();
						},
						style: enabled ? void 0 : {
							color: "var(--dsw-alias-label-secondary)",
							background: "var(--dsw-alias-bg-layer-1)"
						}
					}, plate);
					const menu = open && disabled !== true ? R.createElement("div", {
						key: "menu",
						className: "endfield-select-menu",
						role: "menu",
						"aria-label": ariaLabel
					}, options.map((o) => R.createElement("button", {
						key: o.value,
						type: "button",
						role: "menuitemradio",
						"aria-checked": o.value === value ? "true" : "false",
						className: "endfield-select-option",
						onClick: () => {
							if (o.value !== value) onChange(o.value);
							closeMenu();
						}
					}, R.createElement("span", {
						key: "bg",
						className: "endfield-select-option-bg",
						"aria-hidden": "true"
					}), R.createElement("span", {
						key: "l",
						className: "endfield-select-option-label"
					}, o.label)))) : null;
					return R.createElement("div", {
						className: "endfield-select" + (open ? " is-open" : ""),
						onKeyDown: (e) => {
							if (e && e.key === "Escape" && open) closeMenu();
						},
						ref: rootRef ? (el) => {
							rootRef.current = el;
						} : void 0
					}, [trigger, menu]);
				};
				return R.createElement("div", {
					className: "endfield-settings",
					style: pageStyle
				}, [
					R.createElement("div", { key: "group-theme" }, [
						groupTitle("01", "groupTheme", true),
						row("theme", false, [R.createElement("span", { style: labelStyle }, t("themeRow")), endfieldSelect({
							value: enabled ? "1" : "0",
							ariaLabel: t("themeRow"),
							options: [{
								value: "1",
								label: t("on")
							}, {
								value: "0",
								label: t("off")
							}],
							onChange: setThemeValue
						})]),
						row("motion", false, [R.createElement("span", { style: labelStyle }, t("motionRow"), R.createElement("span", { style: hintStyle }, t("motionHint"))), endfieldSelect({
							value: motionOn ? "signal" : "off",
							ariaLabel: t("motionRow"),
							options: [{
								value: "signal",
								label: t("on")
							}, {
								value: "off",
								label: t("off")
							}],
							onChange: setMotionValue
						})]),
						row("glass", false, [R.createElement("span", { style: labelStyle }, t("glassRow"), R.createElement("span", { style: hintStyle }, t("glassHint"))), endfieldSelect({
							value: glass,
							ariaLabel: t("glassRow"),
							options: motionSync.GLASS_OPTIONS.map((value) => ({
								value,
								label: t({
									off: "glassOff",
									subtle: "glassSubtle",
									standard: "glassStandard",
									strong: "glassStrong"
								}[value])
							})),
							onChange: setGlassValue
						})]),
						row("texture", false, [R.createElement("span", { style: labelStyle }, t("textureRow"), R.createElement("span", { style: hintStyle }, t("textureHint"))), endfieldSelect({
							value: texture,
							ariaLabel: t("textureRow"),
							options: motionSync.TEXTURE_OPTIONS.map((value) => ({
								value,
								label: t(value === "off" ? "textureOff" : value === "subtle" ? "textureSubtle" : "textureStandard")
							})),
							onChange: setTextureValue
						})]),
						row("radius", true, [R.createElement("span", { style: labelStyle }, t("radiusRow")), endfieldSelect({
							value: mode,
							ariaLabel: t("radiusRow"),
							options: [{
								value: "square",
								label: t("radiusSquare")
							}, {
								value: "round",
								label: t("radiusRound")
							}],
							onChange: setRadiusValue
						})])
					]),
					R.createElement("div", { key: "group-bg" }, [
						groupTitle("02", "groupBg", false),
						row("watermark", false, [R.createElement("span", { style: labelStyle }, t("watermarkRow")), endfieldSelect({
							value: wmOn ? "1" : "0",
							ariaLabel: t("watermarkRow"),
							options: [{
								value: "1",
								label: t("on")
							}, {
								value: "0",
								label: t("off")
							}],
							onChange: setWmValue
						})]),
						row("watermark-persist", true, [R.createElement("span", { style: labelStyle }, t("wmPersistRow"), R.createElement("span", { style: hintStyle }, t(wmPersist ? "wmPersistHintOn" : "wmPersistHintOff"))), endfieldSelect({
							value: wmPersist ? "1" : "0",
							ariaLabel: t("wmPersistRow"),
							options: [{
								value: "0",
								label: t("wmPersistOff")
							}, {
								value: "1",
								label: t("wmPersistOn")
							}],
							disabled: !wmOn,
							title: wmOn ? "" : t("wmPersistNeedWm"),
							onChange: setWmPersistValue
						})])
					]),
					R.createElement("div", { key: "group-anim" }, [groupTitle("03", "groupAnim", false), row("loader", true, [R.createElement("span", { style: labelStyle }, t("loaderRow"), R.createElement("span", { style: hintStyle }, t(loaderOn ? "loaderHintOn" : "loaderHintOff"))), R.createElement("span", { style: {
						display: "flex",
						gap: "8px",
						flex: "0 0 auto",
						alignItems: "center"
					} }, R.createElement("button", {
						type: "button",
						onClick: replayLoader,
						style: btnStyleFor(false, !loaderOn || !enabled),
						disabled: !loaderOn || !enabled,
						title: loaderOn ? "" : t("loaderNeed")
					}, t("preview")), endfieldSelect({
						value: loaderOn ? "1" : "0",
						ariaLabel: t("loaderRow"),
						options: [{
							value: "1",
							label: t("on")
						}, {
							value: "0",
							label: t("off")
						}],
						onChange: setLoaderValue
					}))])]),
					R.createElement("div", { key: "group-notify" }, [
						groupTitle("05", "groupNotify", false),
						row("notify", false, [R.createElement("span", { style: labelStyle }, t("notifyRow"), R.createElement("span", { style: hintStyle }, t(notifyOn ? "notifyHintOn" : "notifyHintOff"))), endfieldSelect({
							value: notifyOn ? "1" : "0",
							ariaLabel: t("notifyRow"),
							options: [{
								value: "1",
								label: t("on")
							}, {
								value: "0",
								label: t("off")
							}],
							onChange: setNotifyValue
						})]),
						row("notify-done", false, [R.createElement("span", { style: labelStyle }, t("notifyDoneRow"), R.createElement("span", { style: hintStyle }, t("notifyDoneHint"))), endfieldSelect({
							value: notifyDone ? "1" : "0",
							ariaLabel: t("notifyDoneRow"),
							options: [{
								value: "1",
								label: t("on")
							}, {
								value: "0",
								label: t("off")
							}],
							disabled: !notifyOn,
							title: notifyOn ? "" : t("notifyNeed"),
							onChange: setNotifyDoneValue
						})]),
						row("notify-question", false, [R.createElement("span", { style: labelStyle }, t("notifyQuestionRow"), R.createElement("span", { style: hintStyle }, t("notifyQuestionHint"))), endfieldSelect({
							value: notifyQuestion ? "1" : "0",
							ariaLabel: t("notifyQuestionRow"),
							options: [{
								value: "1",
								label: t("on")
							}, {
								value: "0",
								label: t("off")
							}],
							disabled: !notifyOn,
							title: notifyOn ? "" : t("notifyNeed"),
							onChange: setNotifyQuestionValue
						})]),
						row("notify-approve", true, [R.createElement("span", { style: labelStyle }, t("notifyApproveRow"), R.createElement("span", { style: hintStyle }, t("notifyApproveHint"))), endfieldSelect({
							value: notifyApprove ? "1" : "0",
							ariaLabel: t("notifyApproveRow"),
							options: [{
								value: "1",
								label: t("on")
							}, {
								value: "0",
								label: t("off")
							}],
							disabled: !notifyOn,
							title: notifyOn ? "" : t("notifyNeed"),
							onChange: setNotifyApproveValue
						})])
					]),
					R.createElement("div", { key: "group-audio" }, [
						groupTitle("06", "groupAudio", false),
						row("audio", false, [R.createElement("span", { style: labelStyle }, t("audioRow"), R.createElement("span", { style: hintStyle }, t(audioOn ? "audioHintOn" : "audioHintOff"))), endfieldSelect({
							value: audioOn ? "1" : "0",
							ariaLabel: t("audioRow"),
							options: [{
								value: "1",
								label: t("on")
							}, {
								value: "0",
								label: t("off")
							}],
							onChange: setAudioValue
						})]),
						row("audio-boot", false, [R.createElement("span", { style: labelStyle }, t("audioBootRow"), R.createElement("span", { style: hintStyle }, t("audioBootHint"))), R.createElement("span", { style: {
							display: "flex",
							flexDirection: "column",
							gap: "6px",
							flex: "0 0 auto",
							alignItems: "stretch"
						} }, R.createElement("button", {
							type: "button",
							onClick: replayLoader,
							style: btnStyleFor(false, !loaderOn || !enabled),
							disabled: !loaderOn || !enabled,
							title: loaderOn ? "" : t("loaderNeed")
						}, t("preview") + " · " + t("loaderRow")), endfieldSelect({
							value: audioBoot ? "1" : "0",
							ariaLabel: t("audioBootRow"),
							options: [{
								value: "1",
								label: t("on")
							}, {
								value: "0",
								label: t("off")
							}],
							disabled: !audioOn,
							title: audioOn ? "" : t("audioNeedOn"),
							onChange: setAudioBootValue
						}))]),
						row("audio-start", false, [R.createElement("span", { style: labelStyle }, t("audioStartRow"), R.createElement("span", { style: hintStyle }, t("audioStartHint"))), R.createElement("span", { style: {
							display: "flex",
							gap: "8px",
							flex: "0 0 auto",
							alignItems: "center"
						} }, audioTestButton("turn-start"), endfieldSelect({
							value: audioStart ? "1" : "0",
							ariaLabel: t("audioStartRow"),
							options: [{
								value: "1",
								label: t("on")
							}, {
								value: "0",
								label: t("off")
							}],
							disabled: !audioOn,
							title: audioOn ? "" : t("audioNeedOn"),
							onChange: setAudioStartValue
						}))]),
						row("audio-done", false, [R.createElement("span", { style: labelStyle }, t("audioDoneRow"), R.createElement("span", { style: hintStyle }, t("audioDoneHint"))), R.createElement("span", { style: {
							display: "flex",
							gap: "8px",
							flex: "0 0 auto",
							alignItems: "center"
						} }, audioTestButton("turn-done"), endfieldSelect({
							value: audioDone ? "1" : "0",
							ariaLabel: t("audioDoneRow"),
							options: [{
								value: "1",
								label: t("on")
							}, {
								value: "0",
								label: t("off")
							}],
							disabled: !audioOn,
							title: audioOn ? "" : t("audioNeedOn"),
							onChange: setAudioDoneValue
						}))]),
						row("audio-volume", false, [R.createElement("span", { style: labelStyle }, t("audioVolumeRow") + t("sep") + String(audioVolume) + "%", R.createElement("span", { style: hintStyle }, t("audioVolumeHint"))), R.createElement("span", { style: {
							display: "flex",
							alignItems: "center",
							gap: "8px",
							flex: "0 0 auto"
						} }, R.createElement("input", {
							type: "range",
							min: 0,
							max: 100,
							step: 5,
							"aria-label": t("audioVolumeRow"),
							value: audioVolume,
							disabled: !audioOn,
							onChange: (event) => setAudioVolumeValue(Number(event.target.value)),
							onMouseUp: () => {
								audio.previewSlot("turn-done").then(showPreviewNote);
							},
							style: {
								width: "140px",
								accentColor: enabled ? "var(--edge-accent)" : void 0
							}
						}), R.createElement("span", { style: {
							...labelStyle,
							minWidth: "38px",
							textAlign: "right"
						} }, String(audioVolume) + "%"))]),
						row("audio-attention", false, [R.createElement("span", { style: labelStyle }, t("audioAttentionRow") + t("sep") + stateOf(audioTestReady()), R.createElement("span", { style: hintStyle }, t("audioAttentionHint"))), R.createElement("span", { style: {
							display: "flex",
							gap: "8px",
							flex: "0 0 auto"
						} }, audioTestButton("attention"))]),
						row("audio-fail", false, [R.createElement("span", { style: labelStyle }, t("audioTurnFailRow") + t("sep") + stateOf(audioTestReady()), R.createElement("span", { style: hintStyle }, t("audioReservedNeed"))), R.createElement("span", { style: {
							display: "flex",
							gap: "8px",
							flex: "0 0 auto"
						} }, audioTestButton("turn-fail"))]),
						row("audio-source", false, [R.createElement("span", { style: labelStyle }, t("audioFileRow") + t("sep") + sourceSummary(), R.createElement("span", {
							style: hintStyle,
							wordBreak: "break-all"
						}, sourceDetail())), R.createElement("button", {
							type: "button",
							onClick: () => {
								setPreviewNote("");
								refreshHostState();
							},
							style: btnStyleFor(false)
						}, t("audioRefresh"))]),
						row("audio-dir", false, [R.createElement("span", { style: labelStyle }, t("audioSoundDirRow") + t("sep") + (audio.readSoundDir() || t("audioSoundDirDefault")), R.createElement("span", { style: hintStyle }, t("audioSoundDirHint"))), R.createElement("span", { style: {
							display: "flex",
							gap: "8px",
							flex: "0 0 auto"
						} }, R.createElement("input", {
							type: "text",
							"aria-label": t("audioSoundDirRow"),
							defaultValue: audio.readSoundDir(),
							placeholder: t("audioSoundDirDefault"),
							onKeyDown: (event) => {
								if (event.key === "Enter") applySoundDir(event.target.value);
							},
							onBlur: (event) => applySoundDir(event.target.value),
							style: {
								width: "200px",
								color: "var(--dsw-alias-label-primary)",
								background: "var(--dsw-alias-bg-layer-1)",
								border: "1px solid var(--dsw-alias-border-l2)",
								padding: "6px 8px",
								fontSize: "12px"
							}
						}))]),
						row("audio-human", false, [R.createElement("span", { style: labelStyle }, t("audioHumanOnlyRow"), R.createElement("span", { style: hintStyle }, t(audioHumanOnly ? "audioHumanOnlyHintOn" : "audioHumanOnlyHintOff"))), endfieldSelect({
							value: audioHumanOnly ? "1" : "0",
							ariaLabel: t("audioHumanOnlyRow"),
							options: [{
								value: "1",
								label: t("audioHumanOnlyOn")
							}, {
								value: "0",
								label: t("audioHumanOnlyOff")
							}],
							disabled: !audioOn,
							title: audioOn ? "" : t("audioNeedOn"),
							onChange: setAudioHumanValue
						})]),
						row("audio-diag", true, [R.createElement("span", { style: labelStyle }, t("audioDiagRow"), R.createElement("span", { style: hintStyle }, previewNote !== "" ? previewNote : t("audioDiagHint"))), endfieldSelect({
							value: audioDiag ? "1" : "0",
							ariaLabel: t("audioDiagRow"),
							options: [{
								value: "1",
								label: t("on")
							}, {
								value: "0",
								label: t("off")
							}],
							onChange: setAudioDiagValue
						})])
					])
				]);
			});
			disposeRows.push(d);
			return d;
		});
		return disposeSettings;
	}

// src/client/ui/tokens.js
/**
	* ui/tokens.js — the theme token override layer (light/dark pairs).
	*
	* Extracted from the entry's mount() (the ui/tokens.js slot TODO.md 第 3 项
	* left open)：pure data, no DOM and no services — the entry registers it
	* wholesale through theme.overrideTokens('edge-intelligence-theme', …) and
	* owns the dispose handle. test/palette-contrast.test.js and
	* test/tooltip.test.js read these literals through sources.concatClientJs().
	*/
	const THEME_TOKEN_OVERRIDES = {
		"--dsw-alias-bg-base": {
			light: "#e8e8e2",
			dark: "#101110"
		},
		"--dsw-alias-bg-layer-1": {
			light: "#f2f2ec",
			dark: "#181a18"
		},
		"--dsw-alias-bg-layer-2": {
			light: "#dcddd6",
			dark: "#1e201d"
		},
		"--dsw-alias-bg-overlay": {
			light: "#f2f2ec",
			dark: "#1c1e1c"
		},
		"--dsw-menu-surface-fill": {
			light: "#f2f2ec",
			dark: "#1c1e1c"
		},
		"--dsw-alias-tooltip-bg": {
			light: "#f2f2ec",
			dark: "#1c1e1c"
		},
		"--dsw-alias-tooltip-key-bg": {
			light: "#dcddd6",
			dark: "#2c2e2a"
		},
		"--dsw-alias-border-l1": {
			light: "#d8d9d5",
			dark: "#343633"
		},
		"--dsw-alias-border-l2": {
			light: "#b6b8b3",
			dark: "#4a4d49"
		},
		"--dsw-alias-brand-primary": {
			light: "#101110",
			dark: "var(--edge-accent)"
		},
		"--dsw-alias-label-primary": {
			light: "#101110",
			dark: "#f5f5f0"
		},
		"--dsw-alias-label-secondary": {
			light: "#4a4c48",
			dark: "#898d89"
		},
		"--dsw-alias-state-error-primary": {
			light: "#ff3b30",
			dark: "#ff6b61"
		},
		"--dsw-alias-state-success-primary": {
			light: "#2f9e44",
			dark: "#4fbf5c"
		},
		"--dsw-alias-state-warn-primary": {
			light: "#d9822b",
			dark: "#ffb700"
		},
		"--dsw-specific-sidebar-fill": {
			light: "#e8e8e2",
			dark: "#101110"
		}
	};

// src/client/index.js
/**
	* dsh-theme-endfield — Edge Intelligence Theme (browser client bundle)
	* 还原自《明日方舟：终末地》（Arknights: Endfield）官网的「工业编辑风」。
	* 参考：https://endfield.hypergryph.com
	*
	* 本文件只是组合根（模块图见 docs/architecture.md）：services → prefs →
	* motion/notify/decor 各面 → settings 注册 → run effect。两样只有这里能做：
	*   1) theme.overrideTokens 注册令牌层（字面量在 ui/tokens.js）+ insertCss
	*      注入样式层（清单见 scripts/lib/sources.js；动态插件环境走 styles.insert，
	*      独立 bundle 时直接注入 <style>）——mount/unmount 管两层生命周期；
	*   2) prefs.setReconciler 的编排：主开关翻 mount/unmount，其余各面 sync()。
	* 设置持久化走 ctx.configForms（下限 DSH 0.2.0）；文案/词典在
	* ui/settings/dictionaries.js；不再使用 localStorage。
	*
	* 文档：README.md 为索引；设计语言见 docs/design-language.md，
	* 各开关行为见 docs/features.md，实现决策与实测数据见 docs/engineering-notes.md。
	*
	* 由 dsh-client-modules 以 /plugins/theme-endfield/client.js 形式加载；
	* 通过 `dsh plugin --profile web add github:Cyfarw9dd/dsh-theme-endfield-industries` 安装挂载。
	*/
	window.__ModuleLoader__.load({
		id: "dsh-theme-endfield",
		factory: (require) => {
			var module = { exports: {} };
			var exports = module.exports;
			Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
			function insertCss(css) {
				if (typeof styles !== "undefined" && styles && typeof styles.insert === "function") return styles.insert(css);
				document.querySelectorAll("style[data-plugin=\"dsh-theme-endfield\"]").forEach((old) => old.remove());
				const el = document.createElement("style");
				el.setAttribute("data-plugin", "dsh-theme-endfield");
				el.textContent = css;
				document.head.appendChild(el);
				return () => {
					if (el.parentNode) el.parentNode.removeChild(el);
				};
			}
			function apply(ctx) {
				if (typeof window !== "undefined" && window.__dshThemeEndfieldApplied) return;
				const services = createServices(ctx);
				const theme = services.theme();
				if (theme === void 0) return;
				if (typeof window !== "undefined") window.__dshThemeEndfieldApplied = true;
				const dbg = (...a) => {
					try {
						if (typeof console !== "undefined" && console.warn) console.warn("[dsh-theme-endfield:prefs]", ...a);
					} catch (e) {}
				};
				const prefs = createPrefsStore({ debug: (...a) => dbg(...a) });
				createPrefsTransport({
					services,
					debug: (...a) => dbg(...a),
					store: prefs
				});
				services.effect(() => () => prefs.dispose());
				const ENABLED_KEY = "dsh-theme-endfield-enabled";
				const isEnabled = () => prefs.get(ENABLED_KEY) !== "0";
				const motionSync = createMotionSync({
					prefs,
					isEnabled
				});
				const audio = createAudioPrefs({ prefs });
				const toasts = createToasts({
					prefs,
					isEnabled
				});
				const turnWatch = createTurnWatch({
					services,
					debug: (...a) => dbg(...a),
					isEnabled,
					isDoneOn: toasts.isDoneOn,
					showToast: toasts.show
				});
				const attention = createAttentionWatch({
					isEnabled,
					audio,
					toasts
				});
				module.exports.__attentionMarkers = attention.MARKERS;
				module.exports.__attentionCheck = attention.tick;
				module.exports.__attentionSchedule = attention.schedule;
				module.exports.__notifyFire = toasts.show;
				module.exports.__notifyDismiss = toasts.dismiss;
				const watermark = createWatermark({
					prefs,
					isEnabled,
					findAppFrame: motionSync.findAppFrame
				});
				const heroLogo = createHeroLogo({ isEnabled });
				const loader = createLoader({
					prefs,
					isEnabled,
					isAudioOn: audio.isOn,
					previewSlot: audio.previewSlot
				});
				const bodyObserver = createBodyObserver();
				bodyObserver.add(() => watermark.sync());
				bodyObserver.add(() => heroLogo.sync());
				bodyObserver.start();
				let disposeToken = () => {};
				let disposeStyles = () => {};
				let mounted = false;
				const mount = () => {
					if (mounted) return;
					mounted = true;
					disposeToken = theme.overrideTokens("edge-intelligence-theme", THEME_TOKEN_OVERRIDES);
					disposeStyles = insertCss(tokens_default + decor_default + interaction_default + chrome_default + surfaces_default + overlays_default + generated_default);
					motionSync.syncAll();
				};
				const unmount = () => {
					if (!mounted) return;
					mounted = false;
					disposeToken();
					disposeStyles();
					disposeToken = () => {};
					disposeStyles = () => {};
					motionSync.detach();
					loader.destroy();
					turnWatch.stop();
					watermark.detach();
					heroLogo.detach();
					attention.stop();
				};
				if (isEnabled()) {
					mount();
					watermark.sync();
					heroLogo.sync();
					if (loader.isOn()) loader.run();
					turnWatch.sync();
					attention.sync();
				}
				prefs.setReconciler(() => {
					const enabledNext = isEnabled();
					const enabledNow = mounted;
					if (enabledNext && !enabledNow) mount();
					else if (!enabledNext && enabledNow) unmount();
					if (enabledNext) {
						motionSync.syncAll();
						watermark.sync();
						heroLogo.sync();
						turnWatch.sync();
						attention.sync();
					} else attention.stop();
				});
				const disposeSettings = createSettingsSection({
					services,
					prefs,
					themeApi: {
						isEnabled,
						mount,
						unmount,
						enabledKey: ENABLED_KEY
					},
					motionSync,
					watermark,
					loader,
					toasts,
					attention,
					audio
				});
				services.effect(() => () => {
					unmount();
					if (typeof window !== "undefined") window.__dshThemeEndfieldApplied = false;
					bodyObserver.dispose();
					watermark.dispose();
					loader.destroy();
					turnWatch.stop();
					toasts.destroy();
					attention.stop();
					disposeSettings();
				});
			}
			exports.name = "dsh-theme-endfield";
			exports.inject = ["theme"];
			exports.apply = apply;
			return module.exports;
		}
	});

})();