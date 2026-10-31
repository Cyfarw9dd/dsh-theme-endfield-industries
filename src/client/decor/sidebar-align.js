/**
 * decor/sidebar-align.js — 侧栏底纹与会话栏网格的跨缝相位对齐。
 *
 * 背景（2026-10-31）：owner 给侧栏开了可选底纹（工程网格，见 decor.css
 * 「侧栏底纹」段）后反馈「侧栏和会话栏的底纹不连续」。量测确认：网格是
 * 周期图案，侧栏根与会话根各自从自己的左上角起铺瓦片，起点差 = 分界线
 * 位置 → 侧栏宽一变，分界线两侧的相位就错开（实测差过 20px＝⅓ 周期）。
 *
 * 做法：量出两根的视口原点差（getBoundingClientRect），把差值取负写进
 * body 的 --edge-sidebar-align（两值 x y）；会话根的网格 ::before 消费它
 * （decor.css 主纹理段），把会话栏平移到侧栏所在的视口原点坐标系——侧栏
 * 根在 x≈0，即全局原点。侧栏底纹关闭（或主题关闭）时撤掉变量，会话栏回
 * 到官方原始锚定（0 0）。
 *
 * 边界与代价（准入三问）：
 *   - 只动网格遮罩的 mask-position：波纹/光晕是定位插画不是重复纹样，不
 *     参与对齐，也不被平移。
 *   - 元素会随页面切换挂载/卸载（会话根只在会话页存在），所以不长期持有
 *     节点引用：每次 bodyObserver 批次（entry 注入的 sync()）重新查找、
 *     重新观测、重算。ResizeObserver 只在尺寸真的变化时回调，空闲期为零
 *     成本；本模块自身没有常驻定时器。
 *   - 侧栏宽度拖拽期间每次宽度变化都会重算，纹路会随宽度连续滑动——这是
 *     对齐的固有观感，owner 已知情选择。
 */
export function createSidebarAlign() {
  /* 两个消费端：VAR 是两值（x y），会话栏网格遮罩 mask-position 用（y 也要，
     防两根顶不等）；VAR_X 是单值 x，会话栏斜纹带 background-position 用
     （色带盒等高停靠列底，y 相位天然一致，喂 y 反而错位）。 */
  const VAR = '--edge-sidebar-align'
  const VAR_X = '--edge-sidebar-align-x'
  /* 侧栏底部用户区不铺底纹（2026-10-31 owner）：这个变量是用户区顶缘到根
     底的距离，两层底纹的 bottom 收 here；CSS 段见 decor.css「侧栏底纹」。 */
  const VAR_B = '--edge-sidebar-tex-bottom'
  /* 渐隐带高度（2026-10-31 owner「两侧最终渐变对齐」）：两侧网格共用同一
     条渐隐带——从 50% 列高到输入卡顶缘（= 各自纯色区上缘）。会话栏的渐
     隐终点由 VAR_B 表达（transparent 到 calc(100% - VAR_B)），本变量是把
     同一条带换算到侧栏纹理盒坐标：FZ = 0.5*列高 - VAR_B，侧栏渐变在
     calc(100% - FZ) 处开始渐退。两盒底都在输入卡顶缘 → 绝对区间相同。 */
  const VAR_F = '--edge-sidebar-tex-fade'
  /* 斜纹带的渐入长度：会话栏斜纹带照官方「顶透明 → 半高处全实」，其渐入
     区 = 带高的一半。侧栏带照抄这同一个绝对区间（两带顶同高），密度剖面
     在重叠区逐行重合。 */
  const VAR_H = '--edge-sidebar-tex-hatch-fade'
  const SIDEBAR_ROOT = "[data-slot='sidebar'] > div"
  const CONTENT_ROOT = "[class$='_centerCol'] [class$='_root'][data-phase]"
  let ro = null
  let observed = null // 当前观测的节点数组；换页/换元素时才重挂 RO

  const gateOn = () => {
    try {
      return document.body !== null
        && document.body.hasAttribute('data-endfield-texture')
        && document.body.hasAttribute('data-endfield-sidebar-tex')
    } catch (e) { return false }
  }

  const find = (sel) => {
    try { return document.querySelector(sel) } catch (e) { return null }
  }

  const observe = (els) => {
    /* DOM 元素没有可用的字符串身份（join 会得到两个相同的 [object …]），
       按节点同一性逐个比较：元素没换就不动 RO（observe 同一节点是幂等的，
       但 disconnect+observe 每个批次都跑会白白打断观测）。 */
    const same = observed !== null && observed.length === els.length
      && els.every((el, i) => el === observed[i])
    if (same) return
    if (ro === null) {
      if (typeof ResizeObserver === 'undefined') return
      ro = new ResizeObserver(() => sync())
    }
    ro.disconnect()
    for (const el of els) ro.observe(el)
    observed = els
  }

  const sync = () => {
    if (typeof document === 'undefined' || document.body === null) return
    if (!gateOn()) { clear(); return }
    const side = find(SIDEBAR_ROOT)
    const content = find(CONTENT_ROOT)
    if (!side || !content) { clear(); return }
    /* 观测集合：两根 + （对话页）停靠的输入卡——它增删行会改纯色区高度。 */
    const els = [side, content]
    /* 阈值化：sub-pixel 抖动不值得写样式。0.25px 内视为不变。 */
    const a = side.getBoundingClientRect()
    const b = content.getBoundingClientRect()
    const dx = Math.round((a.left - b.left) * 4) / 4
    const dy = Math.round((a.top - b.top) * 4) / 4
    const next = dx + 'px ' + dy + 'px'
    const prev = document.body.style.getPropertyValue(VAR)
    if (prev !== next) document.body.style.setProperty(VAR, next)
    const nextX = dx + 'px'
    const prevX = document.body.style.getPropertyValue(VAR_X)
    if (prevX !== nextX) document.body.style.setProperty(VAR_X, nextX)
    /* 用户区（footArea / settingsArea / footerActions，取最高的可见者）顶缘
       到根底的距离。隐藏（display:none，如折叠 rail 态）或找不到 → 0，纹
       理铺满整列。阈值化同上。 */
    let bottom = 0
    try {
      const foots = side.querySelectorAll("[class$='_footArea'],[class$='_settingsArea'],[class$='_footerActions']")
      let footTop = Infinity
      for (const el of foots) {
        const fr = el.getBoundingClientRect()
        if (fr.height > 0 && fr.width > 0 && fr.top < footTop) footTop = fr.top
      }
      if (footTop !== Infinity) {
        const rr = side.getBoundingClientRect()
        bottom = Math.max(0, Math.round((rr.bottom - footTop) * 4) / 4)
      }
    } catch (e) { /* 找不到就算了 */ }
    /* 等高纯色（2026-10-31 owner）：会话栏底部被输入卡盖出的纯色区有多高，
       侧栏的纯色底就多高——量输入卡顶缘到会话根底的距离，取与用户区的较
       大者。只认**停靠列底**的输入卡（对话页）；新建会话页那种居中大卡不
       参与（那不是「底部纯色区」，等高会吃掉大半侧栏）。输入卡随输入增高，
       所以把它也挂进 RO——多打一行字纯色底就跟着长。 */
    let composer = null
    try {
      composer = content.querySelector("[data-composer-card],[class$='_composerSeat'],[class$='_composerHero']")
      if (composer) {
        const cpr = composer.getBoundingClientRect()
        const crr = content.getBoundingClientRect()
        const docked = cpr.height > 0 && cpr.width > 0 && (crr.bottom - cpr.bottom) < 80
        if (docked) {
          const ci = Math.max(0, Math.round((crr.bottom - cpr.top) * 4) / 4)
          if (ci > bottom) bottom = ci
        } else {
          composer = null
        }
      }
    } catch (e) { composer = null }
    const nextB = bottom + 'px'
    const prevB = document.body.style.getPropertyValue(VAR_B)
    if (prevB !== nextB) document.body.style.setProperty(VAR_B, nextB)
    /* 渐隐带高度：0.5*列高 − 纯色区高，负值（输入卡高于半列）夹为 0 = 整
       盒渐隐。阈值化同上。 */
    const nextF = Math.max(0, Math.round((0.5 * b.height - bottom) * 4) / 4) + 'px'
    const prevF = document.body.style.getPropertyValue(VAR_F)
    if (prevF !== nextF) document.body.style.setProperty(VAR_F, nextF)
    /* 斜纹带渐入长度 = 会话栏带渐入区（bandH0/2）。两带顶同高 → 同一绝对
       渐入区间 → 剖面重合。 */
    const bandH0 = Math.min(525, 0.45 * b.height)
    const nextH = Math.round(bandH0 / 2) + 'px'
    const prevH = document.body.style.getPropertyValue(VAR_H)
    if (prevH !== nextH) document.body.style.setProperty(VAR_H, nextH)
    if (composer) els.push(composer)
    observe(els)
  }

  const clear = () => {
    try {
      document.body.style.removeProperty(VAR)
      document.body.style.removeProperty(VAR_X)
      document.body.style.removeProperty(VAR_B)
      document.body.style.removeProperty(VAR_F)
      document.body.style.removeProperty(VAR_H)
    } catch (e) { /* 无 body 时无处可清 */ }
  }

  /* unmount（主题关闭）与纹理关闭共用：变量一撤，会话栏回官方锚定。 */
  const detach = () => {
    if (typeof document === 'undefined' || document.body === null) return
    clear()
  }

  const dispose = () => {
    if (ro) { ro.disconnect(); ro = null }
    observed = null
    detach()
  }

  return { sync, detach, dispose }
}
