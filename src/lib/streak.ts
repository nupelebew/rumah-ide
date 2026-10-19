import { addDays, toDateKey } from './dates'

/**
 * Streak saat ini: jumlah hari berturut-turut sampai hari ini.
 * Kalau hari ini belum dicentang, streak dihitung sampai kemarin (belum putus).
 */
export function currentStreak(checkins: string[], today: string = toDateKey()): number {
  const set = new Set(checkins)
  let day = set.has(today) ? today : addDays(today, -1)
  let n = 0
  while (set.has(day)) {
    n++
    day = addDays(day, -1)
  }
  return n
}

export function longestStreak(checkins: string[]): number {
  const days = [...new Set(checkins)].sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

/** 7 hari terakhir (lama → baru) beserta status centang, untuk tampilan titik-titik. */
export function lastNDays(checkins: string[], n = 7, today: string = toDateKey()) {
  const set = new Set(checkins)
  return Array.from({ length: n }, (_, i) => {
    const key = addDays(today, i - (n - 1))
    return { key, done: set.has(key) }
  })
}
