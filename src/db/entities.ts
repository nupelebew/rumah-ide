import { db } from './db'
import type { EntityType, ID } from './types'

export interface EntityInfo {
  type: EntityType
  id: ID
  title: string
  sub: string
  route: string
}

export const TYPE_LABEL: Record<EntityType, string> = {
  idea: 'Ide',
  reference: 'Referensi',
  master: 'Referensi Utama',
  shoot: 'Syuting',
  task: 'Tugas',
  habit: 'Kebiasaan',
  decision: 'Keputusan',
  mix: 'Papan Racik',
}

/** Ambil judul + tujuan navigasi dari entitas apa pun (untuk tautan, Hari Ini, pencarian). */
export async function resolveEntity(type: EntityType, id: ID): Promise<EntityInfo | null> {
  switch (type) {
    case 'idea': {
      const i = await db.ideas.get(id)
      if (!i) return null
      const sub = i.kind === 'content' ? 'Ide Konten' : i.kind === 'daily' ? 'Ide Keseharian' : i.kind === 'parked' ? 'Disimpan dulu' : 'Ide mentah'
      return { type, id, title: i.title, sub, route: i.kind === 'content' ? `konten/${id}` : i.kind === 'daily' ? 'harian' : 'tangkap' }
    }
    case 'reference': {
      const r = await db.references.get(id)
      return r ? { type, id, title: r.title || r.url || 'Referensi tanpa judul', sub: 'Referensi', route: `ref/${id}` } : null
    }
    case 'master': {
      const m = await db.masters.get(id)
      return m ? { type, id, title: m.title, sub: 'Referensi Utama', route: `utama/${id}` } : null
    }
    case 'mix': {
      const m = await db.mixes.get(id)
      return m ? { type, id, title: m.title, sub: 'Papan Racik', route: `racik/${id}` } : null
    }
    case 'shoot': {
      const s = await db.shoots.get(id)
      return s ? { type, id, title: s.title, sub: 'Sesi syuting', route: `syuting/${id}` } : null
    }
    case 'task': {
      const t = await db.tasks.get(id)
      return t ? { type, id, title: t.title, sub: t.done ? 'Tugas · selesai' : 'Tugas', route: 'harian?tab=tugas' } : null
    }
    case 'habit': {
      const h = await db.habits.get(id)
      return h ? { type, id, title: h.title, sub: 'Kebiasaan', route: 'harian?tab=kebiasaan' } : null
    }
    case 'decision': {
      const d = await db.decisions.get(id)
      return d ? { type, id, title: d.title, sub: 'Keputusan', route: `keputusan/${id}` } : null
    }
  }
}

/** Kumpulan entitas yang bisa ditautkan / dicari, dalam satu daftar datar. */
export async function allEntities(): Promise<EntityInfo[]> {
  const [ideas, refs, masters, shoots, tasks, habits, decisions, mixes] = await Promise.all([
    db.ideas.toArray(),
    db.references.toArray(),
    db.masters.toArray(),
    db.shoots.toArray(),
    db.tasks.toArray(),
    db.habits.toArray(),
    db.decisions.toArray(),
    db.mixes.toArray(),
  ])
  const out: EntityInfo[] = []
  for (const i of ideas) out.push({ type: 'idea', id: i.id, title: i.title, sub: [i.kind === 'content' ? 'Ide Konten' : i.kind === 'daily' ? 'Keseharian' : 'Ide', ...i.tags.map((t) => '#' + t)].join(' · '), route: i.kind === 'content' ? `konten/${i.id}` : i.kind === 'daily' ? 'harian' : 'tangkap' })
  for (const r of refs) out.push({ type: 'reference', id: r.id, title: r.title || r.url, sub: ['Referensi', r.platform, ...r.tags.map((t) => '#' + t)].join(' · '), route: `ref/${r.id}` })
  for (const m of masters) out.push({ type: 'master', id: m.id, title: m.title, sub: 'Referensi Utama', route: `utama/${m.id}` })
  for (const m of mixes) out.push({ type: 'mix', id: m.id, title: m.title, sub: 'Papan Racik', route: `racik/${m.id}` })
  for (const s of shoots) out.push({ type: 'shoot', id: s.id, title: s.title, sub: 'Syuting', route: `syuting/${s.id}` })
  for (const t of tasks) out.push({ type: 'task', id: t.id, title: t.title, sub: 'Tugas', route: 'harian?tab=tugas' })
  for (const h of habits) out.push({ type: 'habit', id: h.id, title: h.title, sub: 'Kebiasaan', route: 'harian?tab=kebiasaan' })
  for (const d of decisions) out.push({ type: 'decision', id: d.id, title: d.title, sub: 'Keputusan', route: `keputusan/${d.id}` })
  return out
}

/** Teks yang dicari untuk tiap entitas (judul + isi), untuk pencarian global. */
export async function searchIndex(): Promise<(EntityInfo & { text: string })[]> {
  const [ideas, refs] = await Promise.all([db.ideas.toArray(), db.references.toArray()])
  const extra = new Map<string, string>()
  for (const i of ideas) extra.set(i.id, [i.body, i.hook, i.concept, ...(i.shots ?? []), ...i.tags].join(' '))
  for (const r of refs) extra.set(r.id, [r.url, r.notes, ...Object.values(r.atm.amati), ...r.tags].join(' '))
  const base = await allEntities()
  return base.map((e) => ({ ...e, text: `${e.title} ${e.sub} ${extra.get(e.id) ?? ''}`.toLowerCase() }))
}
