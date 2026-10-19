/** Baca satu titik waktu: "3", "3.5", "3,5", "0:03", "1:02.5" → detik. */
export function parseTime(s: string): number | null {
  const t = s.trim().replace(',', '.')
  if (!t) return null
  const m = t.match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/)
  if (!m) return null
  const sec = (m[1] ? parseInt(m[1], 10) * 60 : 0) + parseFloat(m[2])
  return Number.isFinite(sec) ? sec : null
}

/**
 * Baca rentang detik yang diketik: "1-3", "1.5 - 3,2", "0:01–0:03", "1 sampai 3".
 * Mengembalikan null bila tidak valid atau selesai ≤ mulai.
 */
export function parseRange(s: string): { inSec: number; outSec: number } | null {
  const parts = s
    .trim()
    .toLowerCase()
    .replace(/detik|dtk/g, '')
    .replace(/(\d)s\b/g, '$1')
    .split(/\s*(?:-|–|—|sampai|s\/d|ke)\s*/)
    .filter(Boolean)
  if (parts.length !== 2) return null
  const a = parseTime(parts[0])
  const b = parseTime(parts[1])
  if (a === null || b === null || b <= a) return null
  return { inSec: +a.toFixed(2), outSec: +b.toFixed(2) }
}

/** Titik awal, tengah, akhir sebuah potongan (untuk 3 frame per potongan). */
export function sampleTimes(inSec: number, outSec: number): number[] {
  const mid = (inSec + outSec) / 2
  return [inSec, mid, Math.max(inSec, outSec - 0.05)].map((t) => +t.toFixed(2))
}
