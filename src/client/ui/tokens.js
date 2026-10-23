/**
 * ui/tokens.js — the theme token override layer (light/dark pairs).
 *
 * Extracted from the entry's mount() (the ui/tokens.js slot TODO.md 第 3 项
 * left open)：pure data, no DOM and no services — the entry registers it
 * wholesale through theme.overrideTokens('edge-intelligence-theme', …) and
 * owns the dispose handle. test/palette-contrast.test.js and
 * test/tooltip.test.js read these literals through sources.concatClientJs().
 */
export const THEME_TOKEN_OVERRIDES = {
      '--dsw-alias-bg-base': {
        light: '#e8e8e2',
        dark: '#101110',
      },
      '--dsw-alias-bg-layer-1': {
        light: '#f2f2ec',
        dark: '#181a18',
      },
      '--dsw-alias-bg-layer-2': {
        light: '#dcddd6',
        dark: '#1e201d',
      },
      '--dsw-alias-bg-overlay': {
        light: '#f2f2ec',
        dark: '#1c1e1c',
      },
      /* 菜单/弹层面（@ 与 / 呼出的列表、模型选择、工作区菜单……）。
         上游默认 --dsw-menu-surface-fill 是 **58%/45% alpha 的半透明**
         (#f8f9fa94 / #43454a73)，设计上要配 --dsw-menu-backdrop-filter 的
         blur(40px) 磨砂。本主题没有给菜单接磨砂（玻璃开关只覆盖输入卡与侧栏），
         半透明就只是「透」：正文与背景纹理会从菜单底下渗上来（用户实测反馈）。
         对齐到主题自己的浮层令牌——不透明、与纸面同族，配 0.5px 描边 + 阴影
         分层。若日后玻璃开关要扩到菜单，应整组换（半透明 + backdrop-filter），
         不能只留半透明。 */
      '--dsw-menu-surface-fill': {
        light: '#f2f2ec',
        dark: '#1c1e1c',
      },
      /* 浮动提示气泡（Tooltip 原语，[role='tooltip']，侧栏归档/工具栏按钮的
         hover 提示）。上游默认近黑底白字（tooltip-bg → neutral-bluish 850/750
         ≈ #2c2c2e/#43454a），压在纸墨界面上就是一块死黑。对齐上面的浮层家族
         ——底取 overlay 同值；文字/描边/阴影在样式表的 [role='tooltip'] 规则里
         （bubble 的 color 是类规则里的 --dsw-static-neutral-bluish-00，令牌
         管不到）。key-bg 上游是 color-mix(tooltip-bg, white 18%)：底换成纸面
         后混白与底不可分，改沉底块（layer-3 同值）。 */
      '--dsw-alias-tooltip-bg': {
        light: '#f2f2ec',
        dark: '#1c1e1c',
      },
      '--dsw-alias-tooltip-key-bg': {
        light: '#dcddd6',
        dark: '#2c2e2a',
      },
      '--dsw-alias-border-l1': {
        light: '#d8d9d5',
        dark: '#343633',
      },
      '--dsw-alias-border-l2': {
        light: '#b6b8b3',
        dark: '#4a4d49',
      },
      '--dsw-alias-brand-primary': {
        light: '#101110',
        /* The one ACCENT-carrying token in this layer, so it is the one that must
           not be a literal. A token value may itself be a var() reference: the app
           writes these as inline properties on <body>, the palette variables are
           declared on <body> too, so the reference resolves on the same element —
           no re-registration of this layer, no JS repaint. (When switchable
           palettes shipped, this was also what made a class flip repaint every
           token for free; the mechanism is verified by test/palette-resolve.test.js.) */
        dark: 'var(--edge-accent)',
      },
      '--dsw-alias-label-primary': {
        light: '#101110',
        dark: '#f5f5f0',
      },
      '--dsw-alias-label-secondary': {
        light: '#4a4c48',
        dark: '#898d89',
      },
      '--dsw-alias-state-error-primary': {
        light: '#ff3b30',
        dark: '#ff6b61',
      },
      '--dsw-alias-state-success-primary': {
        light: '#2f9e44',
        dark: '#4fbf5c',
      },
      '--dsw-alias-state-warn-primary': {
        light: '#d9822b',
        dark: '#ffb700',
      },
      '--dsw-specific-sidebar-fill': {
        light: '#e8e8e2',
        dark: '#101110',
      },
}
