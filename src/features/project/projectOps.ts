import { db } from '../../db/db'
import { ensureTags, link, linksOf, patch } from '../../db/repo'
import { newContentIdea, newMaster, newMix, newSegment } from '../../db/factories'
import type { ContentStage, Idea, Master, Reference, ShootSession } from '../../db/types'
import type { Platform } from '../../lib/platform'

/** Lima langkah proyek. Tiap langkah memakai satu nilai stage kanban yang sudah ada. */
export const STEPS: { key: string; label: string; stage: ContentStage }[] = [
  { key: 'konsep', label: 'Konsep', stage: 'ide' },
  { key: 'referensi', label: 'Referensi', stage: 'dikembangkan' },
  { key: 'contoh', label: 'Video contoh', stage: 'siap' },
  { key: 'syuting', label: 'Syuting', stage: 'syuting' },
  { key: 'edit', label: 'Edit', stage: 'edit' },
]

export function stepOf(stage?: ContentStage): number {
  if (stage === 'selesai') return STEPS.length
  const i = STEPS.findIndex((s) => s.stage === (stage ?? 'ide'))
  return i < 0 ? 0 : i
}

export async function goToStep(idea: Idea, step: number) {
  const stage: ContentStage = step >= STEPS.length ? 'selesai' : STEPS[step].stage
  await patch(db.ideas, idea.id, { stage })
}

export async function createProject(p: { title: string; client?: string; goal?: Idea['goal']; platforms?: Platform[]; durationTarget?: number }): Promise<Idea> {
  const tags = p.client ? [`klien-${p.client.toLowerCase().trim().replace(/\s+/g, '-')}`] : []
  const idea = newContentIdea({ title: p.title, client: p.client, goal: p.goal, platforms: p.platforms ?? [], durationTarget: p.durationTarget, tags })
  await db.ideas.add(idea)
  await ensureTags(tags)
  return idea
}

/** Referensi Utama milik proyek; dibuat saat pertama dibutuhkan. */
export async function ensureMaster(idea: Idea): Promise<Master> {
  if (idea.masterId) {
    const m = await db.masters.get(idea.masterId)
    if (m) return m
  }
  const scenes = idea.storyboard ?? []
  const m = newMaster(idea.title, {
    ideaId: idea.id,
    summary: idea.concept ?? '',
    segments: scenes.map((s) => newSegment({ slot: s.title, label: s.title, durationSec: s.durationSec, description: s.visual, sound: s.audio, text: s.text })),
  })
  await db.masters.add(m)
  await patch(db.ideas, idea.id, { masterId: m.id })
  await link('idea', idea.id, 'master', m.id)
  return m
}

export async function projectRefs(ideaId: string): Promise<Reference[]> {
  const ls = (await linksOf('idea', ideaId)).filter((l) => l.type === 'reference')
  return (await db.references.bulkGet(ls.map((l) => l.id))).filter(Boolean) as Reference[]
}

export async function projectShoot(idea: Idea): Promise<ShootSession | undefined> {
  const byIdea = await db.shoots.where('ideaId').equals(idea.id).toArray()
  const byMaster = idea.masterId ? await db.shoots.where('masterId').equals(idea.masterId).toArray() : []
  const all = [...byIdea, ...byMaster.filter((s) => !byIdea.some((x) => x.id === s.id))]
  return all.sort((a, b) => b.createdAt - a.createdAt)[0]
}

/** Papan Racik (cara manual) berisi referensi proyek. */
export async function openManualMix(idea: Idea, refs: Reference[]): Promise<string> {
  const existing = await db.mixes.filter((m) => m.ideaId === idea.id).first()
  if (existing) {
    const missing = refs.map((r) => r.id).filter((id) => !existing.refIds.includes(id))
    if (missing.length) await patch(db.mixes, existing.id, { refIds: [...existing.refIds, ...missing] })
    return existing.id
  }
  const m = { ...newMix(idea.title, refs.map((r) => r.id)), ideaId: idea.id, brief: idea.concept ?? '' }
  await db.mixes.add(m)
  await link('idea', idea.id, 'mix', m.id)
  return m.id
}

/** Kalimat "langkah berikutnya" untuk kartu proyek. */
export function nextHint(idea: Idea, shoot?: ShootSession): string {
  const step = stepOf(idea.stage)
  if (step >= STEPS.length) return 'Selesai'
  if (step === 3 && shoot) {
    const done = shoot.shots.filter((x) => x.done).length
    return `Syuting · ${done}/${shoot.shots.length} shot`
  }
  return ['Tulis konsep', 'Kumpulkan referensi', 'Buat video contoh', 'Siapkan syuting', 'Edit'][step]
}
