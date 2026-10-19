// Membuat ikon PNG aplikasi (tanpa dependensi) dari bentuk yang sama dengan public/icon.svg.
// Jalankan: node scripts/icons.mjs
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const INK = [0x1d, 0x1b, 0x18]
const PAPER = [0xf3, 0xee, 0xe4]
const ACCENT = [0xe5, 0x48, 0x2a]

// Koordinat dalam ruang 512×512 (sama dengan icon.svg)
function colorAt(x, y, rounded) {
  const inRoundRect = (x0, y0, w, h, r) => {
    if (x < x0 || y < y0 || x > x0 + w || y > y0 + h) return false
    const cx = Math.min(Math.max(x, x0 + r), x0 + w - r)
    const cy = Math.min(Math.max(y, y0 + r), y0 + h - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
  }
  if (rounded && !inRoundRect(0, 0, 512, 512, 112)) return null
  if ((x - 352) ** 2 + (y - 164) ** 2 <= 34 * 34) return ACCENT
  if (inRoundRect(214, 300, 84, 104, 10)) return INK
  // rumah: atap segitiga (128,236)-(256,132)-(384,236) + badan 128..384 × 236..404
  const inRoof = y >= 132 && y <= 236 && Math.abs(x - 256) <= ((y - 132) / 104) * 128
  const inBody = (x >= 128 && x <= 384 && y >= 236 && y <= 380) || inRoundRect(128, 300, 256, 104, 20)
  if (inRoof || inBody) return PAPER
  return INK
}

function render(size, { rounded = true, pad = 0 } = {}) {
  const ss = 4 // supersampling biar tepi halus
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < ss; sy++)
        for (let sx = 0; sx < ss; sx++) {
          const u = (px + (sx + 0.5) / ss) / size
          const v = (py + (sy + 0.5) / ss) / size
          const inner = (t) => (t - pad) / (1 - 2 * pad)
          const iu = inner(u), iv = inner(v)
          let c
          if (iu < 0 || iv < 0 || iu > 1 || iv > 1) c = INK
          else c = colorAt(iu * 512, iv * 512, rounded)
          if (!c && pad > 0) c = INK
          if (c) {
            r += c[0]; g += c[1]; b += c[2]; a += 255
          }
        }
      const n = ss * ss
      const o = py * (size * 4 + 1) + 1 + px * 4
      const alpha = a / n
      raw[o] = alpha ? Math.round((r / n) * (255 / alpha)) : 0
      raw[o + 1] = alpha ? Math.round((g / n) * (255 / alpha)) : 0
      raw[o + 2] = alpha ? Math.round((b / n) * (255 / alpha)) : 0
      raw[o + 3] = Math.round(alpha)
    }
  }
  return png(size, size, raw)
}

function crc32(buf) {
  let c, crc = 0xffffffff
  for (const byte of buf) {
    c = (crc ^ byte) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function png(w, h, raw) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

const out = new URL('../public/', import.meta.url)
writeFileSync(new URL('icon-192.png', out), render(192))
writeFileSync(new URL('icon-512.png', out), render(512))
// iOS & maskable: latar penuh tanpa sudut membulat, isi diberi jarak aman
writeFileSync(new URL('apple-touch-icon.png', out), render(180, { rounded: false, pad: 0.08 }))
writeFileSync(new URL('icon-maskable-512.png', out), render(512, { rounded: false, pad: 0.12 }))
console.log('ikon dibuat di public/')
