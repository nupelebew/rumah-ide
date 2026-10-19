import { db } from '../../db/db'
import { link, patch } from '../../db/repo'
import { newMaster, newSegment } from '../../db/factories'
import type { EditStep, ID, Master, Mix, Reference, Segment, TakeElement } from '../../db/types'
import { uid } from '../../lib/id'

export const TAKE_LABEL: Record<TakeElement, string> = {
  hook: 'Hook',
  angle: 'Sudut & shot',
  movement: 'Gerakan kamera',
  transition: 'Transisi',
  rhythm: 'Ritme',
  color: 'Warna',
  text: 'Teks',
  sound: 'Sound',
  mood: 'Mood',
}

export const TAKE_OPTIONS = (Object.keys(TAKE_LABEL) as TakeElement[]).map((value) => ({ value, label: TAKE_LABEL[value] }))

/** Nomor referensi di papan (R1, R2, …) mengikuti urutan refIds. */
export function refNo(mix: Mix, refId: ID): string {
  const i = mix.refIds.indexOf(refId)
  return i >= 0 ? `R${i + 1}` : 'R?'
}

/** Urutan item mengikuti urutan slot, lalu urutan dalam slot. */
export function orderedItems(mix: Mix) {
  return mix.slots.flatMap((s) => mix.items.filter((i) => i.slotId === s.id).map((i) => ({ item: i, slot: s })))
}

function segmentFromItem(mix: Mix, item: Mix['items'][number], slotName: string, ref?: Reference): Segment {
  const a = ref?.atm.amati
  const take = (k: TakeElement) => item.takes.includes(k)
  const dur = item.inSec !== undefined && item.outSec !== undefined && item.outSec > item.inSec ? +(item.outSec - item.inSec).toFixed(1) : 2
  return newSegment({
    slot: slotName,
    label: `${slotName} · ${refNo(mix, item.refId)}`,
    durationSec: dur,
    description: [item.note, ref?.title && `Dari: ${ref.title}`].filter(Boolean).join(' — '),
    refId: item.refId,
    inSec: item.inSec,
    outSec: item.outSec,
    frameId: item.frameId,
    shotType: take('angle') ? (a?.shots ?? '') : '',
    angle: '',
    movement: take('movement') ? (a?.movement ?? '') : '',
    transition: take('transition') ? (a?.transition ?? '') : '',
    text: take('text') ? (a?.onScreenText ?? '') : '',
    sound: take('sound') ? (a?.sound ?? '') : '',
    color: take('color') ? (a?.color ?? '') : '',
    lens: '',
    fps: take('rhythm') && /slow|lambat|ramp/i.test(`${a?.rhythm} ${a?.movement}`) ? '60–120' : '',
  })
}

/** "Deal": susun Referensi Utama dari papan racik tanpa AI. */
export async function dealToMaster(mix: Mix): Promise<ID> {
  const refs = new Map((await db.references.bulkGet(mix.refIds)).filter(Boolean).map((r) => [r!.id, r!]))
  const segments = orderedItems(mix).map(({ item, slot }) => segmentFromItem(mix, item, slot.name, refs.get(item.refId)))
  let master: Master
  if (mix.masterId && (await db.masters.get(mix.masterId))) {
    master = (await db.masters.get(mix.masterId))!
    await patch(db.masters, master.id, { segments })
  } else {
    master = newMaster(mix.title, { mixId: mix.id, summary: mix.brief, segments })
    await db.masters.add(master)
  }
  await patch(db.mixes, mix.id, { status: 'deal', masterId: master.id })
  await link('mix', mix.id, 'master', master.id)
  for (const rid of mix.refIds) await link('master', master.id, 'reference', rid)
  return master.id
}

/** Resep edit dasar untuk CapCut dari segmen (tanpa AI). */
export function basicEditRecipe(m: Master): EditStep[] {
  const steps: EditStep[] = [
    {
      id: uid(),
      segment: 'Persiapan proyek',
      steps: [
        `Buat proyek baru, rasio ${m.aspect}.`,
        'Impor semua klip hasil syuting + musik.',
        'Taruh musik dulu di timeline, ketuk “Beat” → “Auto generate” supaya ada titik beat.',
      ],
    },
  ]
  for (const s of m.segments) {
    const st: string[] = [`Potong klip ±${s.durationSec} dtk${s.description ? ` (${s.description})` : ''}.`]
    if (s.fps && /60|120|slow/i.test(s.fps)) st.push('Klip slow-mo: Kecepatan → Kurva → “Montase” atau atur manual, lambat di momen puncak.')
    if (/ramp/i.test(s.movement)) st.push('Speed ramp: Kecepatan → Kurva → kustom, turunkan titik tengah.')
    if (s.transition) st.push(`Transisi ke klip berikut: ${s.transition}. Di CapCut: ketuk ikon di antara klip → pilih yang paling mirip.`)
    if (s.text) st.push(`Teks: ${s.text}. Teks → Tambah teks, atur durasi sama dengan klip.`)
    if (s.sound) st.push(`Sound: ${s.sound}. Audio → Efek suara / Ekstrak audio.`)
    if (s.color) st.push(`Warna: ${s.color}. Sesuaikan → HSL/kurva, atau Filter lalu turunkan intensitas.`)
    steps.push({ id: uid(), segment: s.label || s.slot, steps: st })
  }
  steps.push({
    id: uid(),
    segment: 'Finishing',
    steps: ['Cek semua potongan jatuh di beat.', 'Tambah teks/caption akhir + CTA.', 'Ekspor 1080p, 30/60fps, bitrate tinggi.'],
  })
  return steps
}
