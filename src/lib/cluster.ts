const STOP = new Set(
  `yang dan di ke dari untuk dengan ini itu ada atau juga aku saya gue gw kamu bisa buat bikin jadi pakai pake
  akan sudah udah belum lagi aja saja kalau kalo biar supaya tapi tetapi agar pada dalam sama oleh nya lah dong
  sih kok deh nih tuh ya the a an of to in on for with is are be video konten ide`
    .split(/\s+/)
    .filter(Boolean),
)

export function keywords(text: string): string[] {
  return [
    ...new Set(
      text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .map((w) => w.replace(/(nya|kan|lah)$/, ''))
        .filter((w) => w.length > 2 && !STOP.has(w)),
    ),
  ]
}

export interface Cluster<T> {
  label: string
  items: T[]
}

/**
 * Kelompokkan ide berdasarkan kata kunci bersama (heuristik sederhana, tanpa AI).
 * Dua ide satu kelompok bila berbagi ≥1 kata kunci; label = kata kunci paling sering.
 */
export function clusterByKeywords<T>(items: T[], getText: (t: T) => string): Cluster<T>[] {
  const kws = items.map((it) => keywords(getText(it)))
  const parent = items.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const owner = new Map<string, number>()
  kws.forEach((ks, i) => {
    for (const k of ks) {
      const j = owner.get(k)
      if (j === undefined) owner.set(k, i)
      else parent[find(i)] = find(j)
    }
  })
  const groups = new Map<number, number[]>()
  items.forEach((_, i) => {
    const r = find(i)
    groups.set(r, [...(groups.get(r) ?? []), i])
  })
  const clusters: Cluster<T>[] = []
  for (const idx of groups.values()) {
    if (idx.length < 2) continue
    const freq = new Map<string, number>()
    idx.forEach((i) => kws[i].forEach((k) => freq.set(k, (freq.get(k) ?? 0) + 1)))
    const label = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]
    clusters.push({ label, items: idx.map((i) => items[i]) })
  }
  return clusters.sort((a, b) => b.items.length - a.items.length)
}
