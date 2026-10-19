import { now, uid } from '../lib/id'
import type {
  Atm,
  AtmAmati,
  CheckItem,
  Decision,
  Idea,
  Master,
  Mix,
  MixSlot,
  Reference,
  Scene,
  Segment,
  ShootSession,
  ShootShot,
} from './types'
import { detectPlatform } from '../lib/platform'

export const AMATI_FIELDS: { key: keyof AtmAmati; label: string; hint: string }[] = [
  { key: 'hook', label: 'Hook 3 detik pertama', hint: 'Apa yang bikin berhenti scroll?' },
  { key: 'structure', label: 'Struktur', hint: 'Pembuka → isi → penutup' },
  { key: 'shots', label: 'Jenis shot & sudut', hint: 'Wide, close-up, low angle, POV…' },
  { key: 'movement', label: 'Gerakan kamera', hint: 'Push in, pan, orbit, handheld…' },
  { key: 'transition', label: 'Transisi', hint: 'Match cut, whip, mask, jump cut…' },
  { key: 'rhythm', label: 'Ritme potongan', hint: 'Cepat ikut beat? Lambat?' },
  { key: 'onScreenText', label: 'Teks di layar', hint: 'Posisi, font, kapan muncul' },
  { key: 'sound', label: 'Musik / sound', hint: 'Lagu, SFX, voice over' },
  { key: 'color', label: 'Warna / grading', hint: 'Hangat, teal-orange, pudar…' },
  { key: 'emotion', label: 'Emosi', hint: 'Penasaran, lucu, haru, hype…' },
  { key: 'why', label: 'Kenapa video ini bekerja', hint: 'Satu kalimat inti' },
]

export const MOD_QUESTIONS: { key: keyof Atm['modifikasi']; q: string }[] = [
  { key: 'subject', q: 'Kalau subjeknya diganti?' },
  { key: 'flip', q: 'Kalau gayanya dibalik?' },
  { key: 'niche', q: 'Kalau dipakai untuk klien atau niche saya?' },
]

export function emptyAtm(): Atm {
  const amati = Object.fromEntries(AMATI_FIELDS.map((f) => [f.key, ''])) as unknown as AtmAmati
  return { amati, tiru: [], modifikasi: { subject: '', flip: '', niche: '' } }
}

export function newIdea(p: Partial<Idea> & { title: string }): Idea {
  const t = now()
  return { id: uid(), kind: 'raw', body: '', tags: [], createdAt: t, updatedAt: t, ...p }
}

export function newContentIdea(p: Partial<Idea> & { title: string }): Idea {
  return newIdea({
    kind: 'content',
    stage: 'ide',
    platforms: [],
    hook: '',
    concept: '',
    shots: [],
    needs: { gear: '', location: '', talent: '' },
    ...p,
  })
}

export function newReference(url: string, p: Partial<Reference> = {}): Reference {
  const t = now()
  return {
    id: uid(),
    url,
    platform: url ? detectPlatform(url) : 'file',
    title: '',
    notes: '',
    tags: [],
    status: 'belum',
    patternIds: [],
    atm: emptyAtm(),
    createdAt: t,
    updatedAt: t,
    ...p,
  }
}

export const DEFAULT_SLOTS = ['Hook', 'Isi', 'Klimaks', 'Penutup']

export function newMix(title: string, refIds: string[] = []): Mix {
  const t = now()
  const slots: MixSlot[] = DEFAULT_SLOTS.map((name) => ({ id: uid(), name }))
  return { id: uid(), title, brief: '', slots, refIds, items: [], status: 'draft', createdAt: t, updatedAt: t }
}

export function newSegment(p: Partial<Segment> = {}): Segment {
  return {
    id: uid(),
    slot: '',
    label: '',
    durationSec: 2,
    description: '',
    shotType: '',
    angle: '',
    lens: '',
    fps: '',
    movement: '',
    transition: '',
    text: '',
    sound: '',
    color: '',
    ...p,
  }
}

export function newMaster(title: string, p: Partial<Master> = {}): Master {
  const t = now()
  return { id: uid(), title, aspect: '9:16', summary: '', segments: [], editRecipe: [], createdAt: t, updatedAt: t, ...p }
}

export function newShot(p: Partial<ShootShot> = {}): ShootShot {
  return {
    id: uid(),
    label: '',
    description: '',
    shotType: '',
    angle: '',
    lens: '',
    fps: '',
    movement: '',
    durationSec: 3,
    done: false,
    takes: 0,
    goodTake: false,
    ...p,
  }
}

export function checkItems(labels: string[]): CheckItem[] {
  return labels.map((label) => ({ id: uid(), label, done: false }))
}

export function newShoot(title: string, p: Partial<ShootSession> = {}): ShootSession {
  const t = now()
  return { id: uid(), title, location: '', shots: [], prep: [], notes: '', createdAt: t, updatedAt: t, ...p }
}

export function newScene(p: Partial<Scene> = {}): Scene {
  return { id: uid(), title: '', durationSec: 3, visual: '', audio: '', text: '', ...p }
}

export function newDecision(title: string, p: Partial<Decision> = {}): Decision {
  const t = now()
  return {
    id: uid(),
    title,
    optionA: '',
    optionB: '',
    prosA: [],
    consA: [],
    prosB: [],
    consB: [],
    finalNote: '',
    createdAt: t,
    updatedAt: t,
    ...p,
  }
}

/** Template storyboard tanpa AI: struktur 5 adegan untuk video pendek ±30 detik. */
export function storyboardTemplate(idea: Pick<Idea, 'hook' | 'concept'>): Scene[] {
  return [
    newScene({ title: 'Hook', durationSec: 3, visual: idea.hook || 'Visual paling menarik di depan', text: 'Teks pancingan' }),
    newScene({ title: 'Konteks', durationSec: 5, visual: 'Kenalkan subjek / masalah' }),
    newScene({ title: 'Isi 1', durationSec: 8, visual: idea.concept || 'Poin utama pertama' }),
    newScene({ title: 'Isi 2 / Puncak', durationSec: 8, visual: 'Momen paling memuaskan' }),
    newScene({ title: 'Penutup + CTA', durationSec: 4, visual: 'Hasil akhir', text: 'Ajakan: simpan / follow / DM' }),
  ]
}

export const DEFAULT_PREP = [
  'Baterai kamera terisi + cadangan',
  'Kartu memori kosong & sudah format',
  'Lensa bersih',
  'Cek setting: resolusi, fps, shutter',
  'Gimbal / tripod terisi daya',
  'Mic & baterai mic',
  'Bawa ND filter (kalau outdoor siang)',
  'Simpan referensi utama offline di HP',
]
