/** Tanggal lokal format YYYY-MM-DD (bukan UTC, supaya streak sesuai jam HP). */
export function toDateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, n: number): string {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + n)
  return toDateKey(d)
}

/** Senin pertama dari minggu yang memuat tanggal ini. */
export function weekStart(key: string): string {
  const d = fromDateKey(key)
  const dow = (d.getDay() + 6) % 7 // Senin = 0
  return addDays(key, -dow)
}

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export function formatDate(key: string, withDay = true): string {
  const d = fromDateKey(key)
  const base = `${d.getDate()} ${BULAN[d.getMonth()]}`
  return withDay ? `${HARI[d.getDay()]}, ${base}` : base
}

export function relativeDay(key: string, today = toDateKey()): string {
  if (key === today) return 'Hari ini'
  if (key === addDays(today, 1)) return 'Besok'
  if (key === addDays(today, -1)) return 'Kemarin'
  return formatDate(key)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromDateKey(b).getTime() - fromDateKey(a).getTime()) / 86400000)
}

export function formatTimecode(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  const ds = Math.floor((sec * 10) % 10)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ds}`
}
