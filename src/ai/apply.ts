import { db } from '../db/db'
import { ensureTags, link, patch } from '../db/repo'
import { checkItems, newContentIdea, newDecision, newIdea, newMaster, newScene, newSegment, newShoot, newShot, DEFAULT_PREP } from '../db/factories'
import type { ID, Segment } from '../db/types'
import { now, uid } from '../lib/id'
import type { Action, SceneIn } from './actions'

export interface Preview {
  action: Action
  title: string
  detail: string
  /** Peringatan bila target tidak ada (aksi tetap bisa dilewati) */
  warning?: string
}

const KIND: Record<Action['type'], string> = {
  content_idea: 'Ide Konten baru',
  daily_idea: 'Ide Keseharian',
  task: 'Tugas',
  habit: 'Kebiasaan',
  decision: 'Catatan Keputusan',
  group: 'Kelompok (tag)',
  atm_fill: 'Isi Amati',
  storyboard: 'Storyboard',
  master: 'Referensi Utama',
  shoot_checklist: 'Checklist shoot',
  edit_recipe: 'Resep edit',
  review_summary: 'Ringkasan minggu',
  note: 'Catatan Claude',
}

export const kindLabel = (a: Action) => KIND[a.type]

/** Ringkasan per aksi untuk layar pratinjau + cek apakah target ada. */
export async function describe(a: Action): Promise<Preview> {
  switch (a.type) {
    case 'content_idea':
      return { action: a, title: a.title, detail: [a.hook && `Hook: ${a.hook}`, a.storyboard.length && `${a.storyboard.length} adegan`, a.shots.length && `${a.shots.length} shot`].filter(Boolean).join(' · ') }
    case 'daily_idea':
    case 'habit':
      return { action: a, title: a.title, detail: a.category ?? '' }
    case 'task':
      return { action: a, title: a.title, detail: [a.due, a.category].filter(Boolean).join(' · ') }
    case 'decision':
      return { action: a, title: a.title, detail: `${a.optionA} vs ${a.optionB}` }
    case 'group': {
      const found = await db.ideas.bulkGet(a.ideaIds)
      const n = found.filter(Boolean).length
      return { action: a, title: `#${a.name}`, detail: found.filter(Boolean).map((i) => i!.title).join(', '), warning: n ? undefined : 'Ide-idenya tidak ditemukan' }
    }
    case 'atm_fill': {
      const r = await db.references.get(a.refId)
      return { action: a, title: r?.title || 'Referensi', detail: `${Object.keys(a.amati).length} kolom amati`, warning: r ? undefined : 'Referensi tidak ditemukan' }
    }
    case 'storyboard': {
      const i = await db.ideas.get(a.ideaId)
      return { action: a, title: i?.title ?? 'Ide', detail: `${a.scenes.length} adegan · ${a.scenes.reduce((x, s) => x + s.duration, 0)} dtk (menggantikan storyboard lama)`, warning: i ? undefined : 'Ide tidak ditemukan' }
    }
    case 'master': {
      const m = a.masterId ? await db.masters.get(a.masterId) : undefined
      return { action: a, title: a.title ?? m?.title ?? 'Referensi Utama baru', detail: `${a.segments.length} segmen${m ? ' (memperbarui yang ada)' : ' (baru)'}` }
    }
    case 'shoot_checklist': {
      const s = a.shootId ? await db.shoots.get(a.shootId) : undefined
      return { action: a, title: s?.title ?? a.title ?? 'Sesi syuting baru', detail: `${a.shots.length} shot · ${a.prep.length} persiapan${s ? ' (menggantikan daftar lama, centang dipertahankan)' : ''}` }
    }
    case 'edit_recipe': {
      const m = await db.masters.get(a.masterId)
      return { action: a, title: m?.title ?? 'Referensi Utama', detail: `${a.steps.length} grup langkah`, warning: m ? undefined : 'Referensi Utama tidak ditemukan' }
    }
    case 'review_summary':
      return { action: a, title: 'Ringkasan minggu', detail: a.text.slice(0, 140) }
    case 'note':
      return { action: a, title: 'Catatan', detail: a.text }
  }
}

async function categoryId(name?: string): Promise<ID | undefined> {
  if (!name) return undefined
  const all = await db.categories.toArray()
  const hit = all.find((c) => c.name.toLowerCase() === name.toLowerCase())
  if (hit) return hit.id
  const id = uid()
  await db.categories.add({ id, name, createdAt: now(), updatedAt: now() })
  return id
}

const toScenes = (s: SceneIn[]) => s.map((x) => newScene({ title: x.title, durationSec: x.duration, visual: x.visual, audio: x.audio, text: x.text }))

/** Ide mentah yang sudah dieksekusi Claude dipindah dari Inbox supaya tidak dobel. */
async function retireSource(sourceIdeaId: string | undefined, newType: 'idea' | 'task' | 'habit' | 'decision', newId: ID) {
  if (!sourceIdeaId) return
  const src = await db.ideas.get(sourceIdeaId)
  if (!src) return
  await link('idea', src.id, newType, newId)
  if (src.kind === 'raw') await patch(db.ideas, src.id, { kind: 'parked' })
}

/** Terapkan satu aksi ke database. Mengembalikan rute untuk dibuka (opsional). */
export async function applyAction(a: Action): Promise<string | undefined> {
  const t = now()
  switch (a.type) {
    case 'content_idea': {
      const i = newContentIdea({
        title: a.title,
        goal: a.goal as never,
        platforms: a.platforms as never,
        hook: a.hook,
        concept: a.concept,
        shots: a.shots,
        storyboard: a.storyboard.length ? toScenes(a.storyboard) : undefined,
        stage: a.storyboard.length ? 'dikembangkan' : 'ide',
        tags: a.tags,
      })
      await ensureTags(a.tags)
      await db.ideas.add(i)
      if (a.refId && (await db.references.get(a.refId))) await link('idea', i.id, 'reference', a.refId)
      await retireSource(a.sourceIdeaId, 'idea', i.id)
      return `konten/${i.id}`
    }
    case 'daily_idea': {
      const i = newIdea({ kind: 'daily', title: a.title, categoryId: await categoryId(a.category) })
      await db.ideas.add(i)
      await retireSource(a.sourceIdeaId, 'idea', i.id)
      return 'harian'
    }
    case 'task': {
      const id = uid()
      await db.tasks.add({ id, title: a.title, due: a.due, done: false, categoryId: await categoryId(a.category), ideaId: a.sourceIdeaId, createdAt: t, updatedAt: t })
      await retireSource(a.sourceIdeaId, 'task', id)
      return 'harian?tab=tugas'
    }
    case 'habit': {
      const id = uid()
      await db.habits.add({ id, title: a.title, categoryId: await categoryId(a.category), checkins: [], ideaId: a.sourceIdeaId, createdAt: t, updatedAt: t })
      await retireSource(a.sourceIdeaId, 'habit', id)
      return 'harian?tab=kebiasaan'
    }
    case 'decision': {
      const d = newDecision(a.title, { optionA: a.optionA, optionB: a.optionB, prosA: a.prosA, consA: a.consA, prosB: a.prosB, consB: a.consB, ideaId: a.sourceIdeaId })
      await db.decisions.add(d)
      await retireSource(a.sourceIdeaId, 'decision', d.id)
      return `keputusan/${d.id}`
    }
    case 'group': {
      const tag = a.name.toLowerCase().replace(/^#/, '')
      await ensureTags([tag])
      for (const id of a.ideaIds) {
        const i = await db.ideas.get(id)
        if (i && !i.tags.includes(tag)) await patch(db.ideas, id, { tags: [...i.tags, tag] })
      }
      return 'tangkap'
    }
    case 'atm_fill': {
      const r = await db.references.get(a.refId)
      if (!r) return
      // hanya isi kolom yang masih kosong — isian sendiri tidak ditimpa
      const amati = { ...r.atm.amati }
      for (const [k, v] of Object.entries(a.amati)) {
        const key = k as keyof typeof amati
        amati[key] = amati[key]?.trim() ? amati[key] : v
      }
      await patch(db.references, r.id, { atm: { ...r.atm, amati }, status: r.status === 'belum' ? 'dibedah' : r.status })
      return `ref/${r.id}`
    }
    case 'storyboard': {
      const i = await db.ideas.get(a.ideaId)
      if (!i) return
      await patch(db.ideas, i.id, { storyboard: toScenes(a.scenes), stage: (i.stage ?? 'ide') === 'ide' ? 'dikembangkan' : i.stage })
      return `konten/${i.id}`
    }
    case 'master': {
      const existing = a.masterId ? await db.masters.get(a.masterId) : undefined
      const mix = a.mixId ? await db.mixes.get(a.mixId) : existing?.mixId ? await db.mixes.get(existing.mixId) : undefined
      const refOf = (no?: string) => {
        const n = no ? parseInt(no.replace(/\D/g, ''), 10) : NaN
        return mix && n > 0 ? mix.refIds[n - 1] : undefined
      }
      const segments: Segment[] = a.segments.map((s, idx) => {
        const old = existing?.segments[idx]
        const refId = refOf(s.refNo) ?? old?.refId
        // titik potong & frame dari papan racik dipertahankan bila sumbernya sama
        const keep = old && old.refId === refId ? { inSec: old.inSec, outSec: old.outSec, frameId: old.frameId } : {}
        const fromMix = !keep.frameId && mix ? mix.items.find((it) => it.refId === refId) : undefined
        const src = s.sourceIn !== undefined && s.sourceOut !== undefined && s.sourceOut > s.sourceIn ? { inSec: s.sourceIn, outSec: s.sourceOut } : {}
        return newSegment({
          slot: s.slot,
          label: s.label || `${s.slot}${s.refNo ? ` · ${s.refNo}` : ''}`,
          durationSec: s.duration,
          description: [s.description, s.refNo && !refId && `Sumber: ${s.refNo}${src.inSec !== undefined ? ` ${src.inSec}–${src.outSec} dtk` : ''}`].filter(Boolean).join(' — '),
          refId,
          ...keep,
          ...(fromMix ? { inSec: fromMix.inSec, outSec: fromMix.outSec, frameId: fromMix.frameId } : {}),
          ...(refId ? src : {}),
          shotType: s.shotType,
          angle: s.angle,
          lens: s.lens,
          fps: s.fps,
          movement: s.movement,
          transition: s.transition,
          text: s.text,
          sound: s.sound,
          color: s.color,
        })
      })
      if (existing) {
        await patch(db.masters, existing.id, { segments, ...(a.summary ? { summary: a.summary } : {}) })
        return `utama/${existing.id}`
      }
      const m = newMaster(a.title ?? mix?.title ?? 'Referensi Utama', { mixId: mix?.id, summary: a.summary ?? mix?.brief ?? '', segments })
      await db.masters.add(m)
      if (mix) {
        await patch(db.mixes, mix.id, { masterId: m.id, status: 'deal' })
        await link('mix', mix.id, 'master', m.id)
      }
      return `utama/${m.id}`
    }
    case 'shoot_checklist': {
      const master = a.masterId ? await db.masters.get(a.masterId) : undefined
      // shot dari Claude dicocokkan ke segmen lewat nama, supaya frame & tombol "lihat contoh" ikut
      const norm = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').trim()
      const segFor = (label: string) => {
        const l = norm(label)
        return master?.segments.find((s) => s.label && (l.includes(norm(s.label)) || norm(s.label).includes(l)))
      }
      const existing = a.shootId ? await db.shoots.get(a.shootId) : undefined
      const shots = a.shots.map((s) => {
        const old = existing?.shots.find((x) => x.label.toLowerCase() === s.label.toLowerCase())
        return newShot({
          label: s.label,
          description: s.description,
          shotType: s.shotType,
          angle: s.angle,
          lens: s.lens,
          fps: s.fps,
          movement: s.movement,
          durationSec: s.duration,
          frameId: old?.frameId ?? segFor(s.label)?.frameId,
          segmentId: old?.segmentId ?? segFor(s.label)?.id,
          done: old?.done ?? false,
          takes: old?.takes ?? 0,
          goodTake: old?.goodTake ?? false,
        })
      })
      if (existing) {
        const doneLabels = new Set(existing.prep.filter((p) => p.done).map((p) => p.label.toLowerCase()))
        const prep = a.prep.length ? a.prep.map((label) => ({ id: uid(), label, done: doneLabels.has(label.toLowerCase()) })) : existing.prep
        await patch(db.shoots, existing.id, {
          shots,
          prep,
          ...(a.date && !existing.date ? { date: a.date } : {}),
          ...(a.start && !existing.start ? { start: a.start, end: a.end } : {}),
          ...(a.location && !existing.location ? { location: a.location } : {}),
        })
        return `syuting/${existing.id}`
      }
      const s = newShoot(a.title ?? `Syuting — ${master?.title ?? 'baru'}`, {
        masterId: master?.id,
        ideaId: master?.ideaId,
        date: a.date,
        start: a.start,
        end: a.end,
        location: a.location ?? '',
        shots,
        prep: checkItems(a.prep.length ? a.prep : DEFAULT_PREP),
      })
      await db.shoots.add(s)
      if (master) await link('shoot', s.id, 'master', master.id)
      return `syuting/${s.id}`
    }
    case 'edit_recipe': {
      const m = await db.masters.get(a.masterId)
      if (!m) return
      await patch(db.masters, m.id, { editRecipe: a.steps.map((s) => ({ id: uid(), segment: s.segment, steps: s.steps })) })
      return `utama/${m.id}`
    }
    case 'review_summary': {
      const r = await db.reviews.get(a.week)
      await db.reviews.put({ week: a.week, answers: { ...(r?.answers ?? {}), ringkasan: a.text }, createdAt: r?.createdAt ?? t })
      return 'review'
    }
    case 'note':
      return
  }
}
