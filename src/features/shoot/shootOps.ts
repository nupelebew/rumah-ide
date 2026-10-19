import { db } from '../../db/db'
import { link } from '../../db/repo'
import { checkItems, newShoot, newShot, DEFAULT_PREP } from '../../db/factories'
import type { Gear, ID, Master, ShootSession } from '../../db/types'
import { buildIcs, type IcsEvent } from '../../lib/ics'

/** Saran persiapan tambahan dari isi Referensi Utama (tanpa AI). */
export function derivedPrep(master: Master, gear: Gear[]): string[] {
  const text = master.segments.map((s) => `${s.fps} ${s.movement} ${s.shotType} ${s.lens}`).join(' ').toLowerCase()
  const out: string[] = []
  if (/120|slow|ramp/.test(text)) out.push('Set kamera ke 120fps (atau tertinggi) untuk shot slow-mo, shutter ±1/250')
  else if (/60/.test(text)) out.push('Set 60fps untuk shot yang mau diperlambat, shutter ±1/125')
  if (/gimbal|orbit|follow|push|pull/.test(text)) {
    const g = gear.find((x) => x.type === 'stabilizer')
    out.push(g ? `Kalibrasi ${g.name} & isi baterainya` : 'Siapkan gimbal/stabilizer & kalibrasi')
  }
  if (/drone|aerial|udara/.test(text)) out.push('Cek baterai drone, izin terbang, dan angin')
  if (/low angle|top down/.test(text)) out.push('Bawa alas / tripod pendek untuk low angle')
  const lenses = [...new Set(master.segments.map((s) => s.lens).filter(Boolean))]
  if (lenses.length) out.push(`Lensa yang dipakai: ${lenses.join(', ')}`)
  return out
}

export async function createShootFromMaster(
  master: Master,
  opts: { title?: string; date?: string; start?: string; end?: string; location?: string; templateId?: ID },
): Promise<ID> {
  const gear = await db.gear.toArray()
  const tpl = opts.templateId ? await db.prepTemplates.get(opts.templateId) : (await db.prepTemplates.toArray())[0]
  const prep = [...new Set([...(tpl?.items ?? DEFAULT_PREP), ...derivedPrep(master, gear)])]
  const s = newShoot(opts.title || `Syuting — ${master.title}`, {
    date: opts.date,
    start: opts.start,
    end: opts.end,
    location: opts.location ?? '',
    masterId: master.id,
    ideaId: master.ideaId,
    prep: checkItems(prep),
    shots: master.segments.map((seg, i) =>
      newShot({
        label: seg.label || `Shot ${i + 1}`,
        description: seg.description,
        shotType: seg.shotType,
        angle: seg.angle,
        lens: seg.lens,
        fps: seg.fps,
        movement: seg.movement,
        durationSec: seg.durationSec,
        frameId: seg.frameId,
        segmentId: seg.id,
      }),
    ),
  })
  await db.shoots.add(s)
  await link('shoot', s.id, 'master', master.id)
  if (master.ideaId) await link('shoot', s.id, 'idea', master.ideaId)
  return s.id
}

export function shootToEvent(s: ShootSession): IcsEvent | null {
  if (!s.date) return null
  const todo = s.shots.filter((x) => !x.done).length
  return {
    uid: s.icsUid ?? `${s.id}@rumah-ide`,
    summary: s.title,
    date: s.date,
    start: s.start,
    end: s.end,
    allDay: !s.start,
    location: s.location || undefined,
    categories: 'Freelance',
    description: `${s.shots.length} shot (${todo} belum)\n${s.shots.map((x, i) => `${i + 1}. ${x.label}`).join('\n')}`,
  }
}

export function shootsToIcs(shoots: ShootSession[]): string {
  return buildIcs(shoots.map(shootToEvent).filter(Boolean) as IcsEvent[], 'Rumah Ide — Syuting')
}
