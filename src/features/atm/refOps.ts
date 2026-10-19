import { db } from '../../db/db'
import { deleteMedia, link, patch, removeLinksOf, requestPersistence, saveMedia } from '../../db/repo'
import { newContentIdea, newReference, AMATI_FIELDS } from '../../db/factories'
import type { AtmAmati, ID, Reference } from '../../db/types'
import { grabFrame, videoDuration } from '../../lib/video'

export async function addRefFromUrl(url: string, title = ''): Promise<Reference> {
  const r = newReference(url, { title })
  await db.references.add(r)
  return r
}

async function storeVideo(file: File) {
  await requestPersistence()
  const videoId = await saveMedia('video', file, file.name)
  let durationSec = 0
  let thumbId: ID | undefined
  try {
    durationSec = await videoDuration(file)
    thumbId = await saveMedia('frame', await grabFrame(file, Math.min(1, durationSec / 3)), `thumb-${file.name}.jpg`)
  } catch {
    /* format tidak didukung browser untuk dibaca: tetap simpan videonya */
  }
  return { videoId, durationSec, thumbId }
}

/** Video dari galeri HP → referensi baru (satu per file). */
export async function addRefsFromFiles(files: File[]): Promise<Reference[]> {
  const out: Reference[] = []
  for (const f of files) {
    const v = await storeVideo(f)
    const r = newReference('', { platform: 'file', title: f.name.replace(/\.[^.]+$/, ''), ...v })
    await db.references.add(r)
    out.push(r)
  }
  return out
}

/** Lampirkan / ganti video pada referensi yang sudah ada (mis. link IG yang videonya kamu simpan sendiri). */
export async function attachVideo(ref: Reference, file: File) {
  await deleteMedia(ref.videoId)
  await deleteMedia(ref.thumbId)
  const v = await storeVideo(file)
  await patch(db.references, ref.id, v)
}

export async function removeVideo(ref: Reference) {
  await deleteMedia(ref.videoId)
  await deleteMedia(ref.thumbId)
  await patch(db.references, ref.id, { videoId: undefined, thumbId: undefined, durationSec: undefined })
}

export async function deleteRef(ref: Reference) {
  await deleteMedia(ref.videoId)
  await deleteMedia(ref.thumbId)
  await removeLinksOf('reference', ref.id)
  await db.references.delete(ref.id)
}

/** Setelah ada isian Amati, status otomatis naik jadi "Sudah dibedah". */
export async function saveAmati(ref: Reference, key: keyof AtmAmati, value: string) {
  // update per key-path supaya dua kolom yang disimpan berdekatan tidak saling menimpa
  await db.references.update(ref.id, { [`atm.amati.${key}`]: value, updatedAt: Date.now() } as never)
  const fresh = await db.references.get(ref.id)
  if (fresh && fresh.status === 'belum' && Object.values(fresh.atm.amati).some((v) => v.trim())) {
    await patch(db.references, ref.id, { status: 'dibedah' })
  }
}

export async function saveAtmPath(id: ID, path: string, value: unknown) {
  await db.references.update(id, { [`atm.${path}`]: value, updatedAt: Date.now() } as never)
}

/** Hasil Modifikasi → Ide Konten baru yang tertaut ke referensi asal. */
export async function modsToContent(ref: Reference, answer?: string): Promise<ID> {
  const m = ref.atm.modifikasi
  const pick = answer ?? (m.niche || m.subject || m.flip)
  const keep = ref.atm.tiru.map((k) => {
    const f = AMATI_FIELDS.find((x) => x.key === k)
    return `${f?.label ?? k}: ${ref.atm.amati[k] || '(lihat referensi)'}`
  })
  const concept = [
    pick && `Modifikasi: ${pick}`,
    m.subject && answer !== m.subject && `Subjek lain: ${m.subject}`,
    m.flip && answer !== m.flip && `Gaya dibalik: ${m.flip}`,
    m.niche && answer !== m.niche && `Untuk niche: ${m.niche}`,
  ]
    .filter(Boolean)
    .join('\n')
  const idea = newContentIdea({
    title: (pick || `ATM dari ${ref.title || 'referensi'}`).slice(0, 90),
    hook: ref.atm.tiru.includes('hook') ? ref.atm.amati.hook : '',
    concept,
    shots: keep,
    platforms: ref.platform !== 'file' && ref.platform !== 'lainnya' ? [ref.platform] : [],
    tags: ref.tags,
  })
  await db.ideas.add(idea)
  await link('idea', idea.id, 'reference', ref.id)
  await patch(db.references, ref.id, { status: 'dipakai' })
  return idea.id
}

/** Saran isian sekali ketuk per field Amati — supaya minim mengetik. */
export const AMATI_SUGGEST: Partial<Record<keyof AtmAmati, string[]>> = {
  hook: ['Pertanyaan langsung', 'Hasil akhir duluan', 'Gerakan cepat ke kamera', 'Teks kontroversial', 'Suara keras / SFX', 'Close-up detail'],
  structure: ['Hook → masalah → solusi', 'Before → proses → after', 'Teaser → reveal', 'List 3 poin', 'Cerita 3 babak', 'Loop (akhir = awal)'],
  shots: ['Extreme close-up', 'Close-up', 'Medium', 'Wide', 'Low angle', 'High angle', 'Top down', 'POV', 'Over the shoulder'],
  movement: ['Statis / tripod', 'Push in', 'Pull out', 'Pan', 'Tilt', 'Orbit', 'Handheld', 'Gimbal follow', 'Whip pan', 'Crane / naik-turun'],
  transition: ['Hard cut', 'Jump cut', 'Match cut', 'Whip pan', 'Mask / wipe objek', 'Zoom transition', 'Speed ramp', 'Fade'],
  rhythm: ['Cepat ikut beat', 'Lambat & tenang', 'Cepat → lambat', 'Potong tiap 0,5 dtk', 'Long take'],
  onScreenText: ['Teks hook di atas', 'Subtitle kata per kata', 'Label / caption kecil', 'Tanpa teks'],
  sound: ['Lagu trending', 'Sound effect whoosh', 'Voice over', 'Suara asli / ASMR', 'Hening lalu drop'],
  color: ['Hangat / golden', 'Teal & orange', 'Pudar / film', 'Kontras tinggi', 'Hitam putih', 'Natural'],
  emotion: ['Penasaran', 'Puas / satisfying', 'Lucu', 'Haru', 'Semangat / hype', 'Tenang'],
}
