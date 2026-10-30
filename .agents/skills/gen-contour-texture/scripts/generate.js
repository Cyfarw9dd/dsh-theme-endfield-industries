#!/usr/bin/env node
// gen-contour-texture 参考实现（零依赖，Node 18+）
// 用法: node generate.js [--seed 42] [--size 627] [--levels 15] [--gamma 0.75]
//                       [--strength 0.07] [--peak 0.82,0.15] [--out out.png]
// 产出: 与终末地官方素材同构的调色板 PNG（PLTE 5 项墨 #1a1a1a + tRNS {0,4,8,12,17}）
// 流程: 单峰山坡地形场 → marching squares 等值线 → 4x 超采样淡笔 stamp
//       → 16 倍盒滤波缩小 → 阶梯量化。设计依据见 ../references/fingerprints.md
'use strict'
const fs = require('fs')
const zlib = require('zlib')

const args = Object.fromEntries(process.argv.slice(2).map((s, i, a) =>
  s.startsWith('--') ? [s.slice(2), a[i + 1]] : []).filter(p => p[0]))
const SEED = parseInt(args.seed || '42', 10)
const SIZE = parseInt(args.size || '627', 10)
const NLEV = parseInt(args.levels || '15', 10)
const GAMMA = parseFloat(args.gamma || '0.75')
const STRENGTH = parseFloat(args.strength || '0.07')
const OUT = args.out || 'gen-contour.png'
const [PEAK_X, PEAK_Y] = (args.peak || '0.82,0.15').split(',').map(Number)
const GN = 316, S = 4, CELL = SIZE / (GN - 1)

// ---- 确定性随机 & 格点值噪声 ----
function mulberry32(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
function hash2(ix, iy, seed) { let h = (ix * 374761393 + iy * 668265263 + seed * 1442695041) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296 }
const smoothT = t => t * t * (3 - 2 * t)
function vnoise(x, y, freq, seed) {
  const fx = x * freq, fy = y * freq, ix = Math.floor(fx), iy = Math.floor(fy)
  const tx = smoothT(fx - ix), ty = smoothT(fy - iy)
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed), c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed)
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty
}
function fbm(x, y, oct, seed) { let v = 0, amp = .5, f = 1, n = 0; for (let o = 0; o < oct; o++) { v += amp * vnoise(x, y, f, seed + o * 101); n += amp; amp *= .5; f *= 2.03 } return v / n }

// ---- 地形：单峰山坡 + 斑块粗糙度 + 沿线向毛边 ----
function hillside(seed) {
  const rand = mulberry32(seed)
  const theta = (-16 + rand() * 30) * Math.PI / 180
  const sLong = .58 + rand() * .14, sShort = .185 + rand() * .05
  const cos = Math.cos(theta), sin = Math.sin(theta)
  const nS = 1000 + (rand() * 500 | 0), wS = 2000 + (rand() * 500 | 0), rS = 3000 + (rand() * 500 | 0)
  return (x, y) => {
    const u = x / SIZE, v = y / SIZE
    const wx = (fbm(u + 3.1, v + 7.7, 4, wS) - .5) * .12          // 域扭曲
    const wy = (fbm(u + 8.2, v + 2.9, 4, wS + 7) - .5) * .12
    const uu = u + wx, vv = v + wy
    const dx = uu - PEAK_X, dy = vv - PEAK_Y
    const rx = dx * cos + dy * sin, ry = -dx * sin + dy * cos
    const dome = Math.exp(-(rx * rx) / (2 * sLong * sLong) - (ry * ry) / (2 * sShort * sShort))
    const slope = .26 * (1 - uu) + .20 * vv                        // 单向缓坡
    const rough = fbm(uu * 2.2 + 4.4, vv * 2.2 + 9.1, 3, rS)       // 粗糙度斑块
    const amp = .05 + .20 * rough * rough
    const swell = (fbm(uu * 3.0, vv * 7.2, 4, nS) - .5) * .7       // 中频缓波（y 向频率高 → 沿线拉长）
    const fine = (fbm(uu * 7.5, vv * 18.0, 5, nS + 33) - .5) * .5  // 高频碎毛
    return .90 * dome + slope + amp * (swell + fine)
  }
}

// ---- marching squares ----
function isolines(h, t) {
  const segs = [], n = GN, cell = CELL, lerp = (a, b) => (t - a) / (b - a || 1e-9)
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const v00 = h[j * n + i], v10 = h[j * n + i + 1], v01 = h[(j + 1) * n + i], v11 = h[(j + 1) * n + i + 1]
    const x = i * cell, y = j * cell, c = cell, pts = []
    if ((v00 > t) !== (v10 > t)) pts.push([x + c * lerp(v00, v10), y])
    if ((v10 > t) !== (v11 > t)) pts.push([x + c, y + c * lerp(v10, v11)])
    if ((v11 > t) !== (v01 > t)) pts.push([x + c * lerp(v01, v11), y + c])
    if ((v01 > t) !== (v00 > t)) pts.push([x, y + c * lerp(v00, v01)])
    if (pts.length === 2) segs.push(pts)
    else if (pts.length === 4) {  // 鞍点按中心值配对
      const mid = (v00 + v10 + v01 + v11) / 4
      if ((mid > t) === (v00 > t)) segs.push([pts[0], pts[1]], [pts[2], pts[3]])
      else segs.push([pts[0], pts[3]], [pts[1], pts[2]])
    }
  }
  return segs
}

// ---- 制版：4x 超采样软笔 → 盒滤波缩小 → 阶梯量化 ----
function stampSeg(acc, p1, p2, r, strength) {
  const SW = SIZE * S, dx = p2[0] - p1[0], dy = p2[1] - p1[1]
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * S / .5))
  for (let k = 0; k <= steps; k++) {
    const px = (p1[0] + dx * k / steps) * S, py = (p1[1] + dy * k / steps) * S
    const x0 = Math.max(0, Math.floor(px - r - 1)), x1 = Math.min(SW - 1, Math.ceil(px + r + 1))
    const y0 = Math.max(0, Math.floor(py - r - 1)), y1 = Math.min(SIZE * S - 1, Math.ceil(py + r + 1))
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - px, y - py) / r
      if (d >= 1.15) continue
      const edge = d < .55 ? 1 : Math.max(0, (1.15 - d) / .6)
      const vv = strength * edge, i = y * SW + x
      if (vv > acc[i]) acc[i] = vv   // max 混合，交叉不加深
    }
  }
}
const ladder = t => t < 1.2 ? 0 : t < 5 ? 4 : t < 9 ? 8 : t < 13.5 ? 12 : 17

// ---- PNG 编码（调色板 + tRNS，与官方素材同构） ----
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c } return t })()
const crc32 = b => { let c = -1; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0 }
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, c]) }

// ---- 主流程 ----
const f = hillside(SEED)
const h = new Float32Array(GN * GN)
let min = 1e9, max = -1e9
for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) { const v = f(i * CELL, j * CELL); h[j * GN + i] = v; if (v < min) min = v; if (v > max) max = v }
const acc = new Float32Array(SIZE * S * SIZE * S)
for (let l = 1; l <= NLEV; l++) {
  const t = min + (max - min) * Math.pow(l / (NLEV + 1), GAMMA)  // γ<1 → 峰顶密外围疏
  const isIndex = l % 4 === 0                                     // 计曲线：每 4 层加粗
  for (const seg of isolines(h, t)) stampSeg(acc, seg[0], seg[1], (isIndex ? 1.35 : 1) * .8 * S, 255 * STRENGTH * (isIndex ? 2 : 1))
}
const alpha = Buffer.alloc(SIZE * SIZE)
let ink = 0
for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
  let sum = 0
  for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) sum += acc[(y * S + dy) * SIZE * S + (x * S + dx)]
  const a = ladder(sum / (S * S)); alpha[y * SIZE + x] = a; if (a >= 4) ink++
}
const vals = [0, 4, 8, 12, 17]
const raw = Buffer.alloc((SIZE + 1) * SIZE)
for (let y = 0; y < SIZE; y++) { raw[y * (SIZE + 1)] = 0; for (let x = 0; x < SIZE; x++) raw[y * (SIZE + 1) + 1 + x] = vals.indexOf(alpha[y * SIZE + x]) }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4); ihdr[8] = 8; ihdr[9] = 3
fs.writeFileSync(OUT, Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr),
  chunk('PLTE', Buffer.from([0, 0, 0, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26])),
  chunk('tRNS', Buffer.from(vals)), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]))
console.log(`${OUT}: ${SIZE}x${SIZE}, 覆盖率 ${(100 * ink / (SIZE * SIZE)).toFixed(2)}%（官方 wave-bg 8.49%）, ${(fs.statSync(OUT).size / 1024).toFixed(1)}KB`)
