import { db } from './db'
import { now, uid } from '../lib/id'
import { DEFAULT_PREP, newContentIdea, newIdea, newReference, newSegment, newMaster, newShot, newShoot, checkItems } from './factories'
import { getSetting, setSetting } from './repo'
import type { Category, Pattern } from './types'
import { addDays, toDateKey } from '../lib/dates'

const BUILTIN_PATTERNS: [string, string][] = [
  ['Reveal produk', 'Tahan rasa penasaran, produk baru terlihat utuh di akhir.'],
  ['Before-After', 'Tunjukkan kondisi awal lalu hasil, potongan tepat di beat.'],
  ['POV', 'Kamera jadi mata penonton; teks "POV: …" di layar.'],
  ['Behind the scene', 'Proses di balik layar, alat & kesalahan ikut ditampilkan.'],
  ['Transisi match cut', 'Bentuk/gerakan sama menyambung dua adegan berbeda.'],
  ['Day in my life', 'Rangkaian momen sehari dengan ritme cepat.'],
  ['Tutorial 3 langkah', 'Masalah → 3 langkah → hasil.'],
  ['Speed ramp aksi', 'Gerakan cepat diperlambat di momen puncak lalu dipercepat lagi.'],
]

const BUILTIN_CATEGORIES = ['Kerja', 'Kuliah', 'Keuangan', 'Kesehatan', 'Hubungan', 'Hobi', 'Keputusan']

/** Data bawaan (pola, kategori, template) — selalu ada, bukan data pribadi. */
export async function ensureDefaults() {
  if (await getSetting('defaults.v1', false)) return
  const t = now()
  await db.transaction('rw', db.patterns, db.categories, db.prepTemplates, db.settings, async () => {
    await db.patterns.bulkAdd(
      BUILTIN_PATTERNS.map(([name, description]): Pattern => ({ id: uid(), name, description, builtin: true, createdAt: t, updatedAt: t })),
    )
    await db.categories.bulkAdd(
      BUILTIN_CATEGORIES.map((name): Category => ({ id: uid(), name, builtin: true, createdAt: t, updatedAt: t })),
    )
    await db.prepTemplates.add({ id: uid(), name: 'Persiapan standar', items: DEFAULT_PREP, createdAt: t, updatedAt: t })
    await setSetting('defaults.v1', true)
  })
}

/** Contoh data bertanda "Contoh" untuk pengguna baru. Bisa dihapus sekali ketuk. */
export async function seedSamples() {
  if (await getSetting('samples.seeded', false)) return
  const sample = true
  const patterns = await db.patterns.toArray()
  const cats = await db.categories.toArray()
  const pat = (n: string) => patterns.find((p) => p.name === n)?.id
  const cat = (n: string) => cats.find((c) => c.name === n)?.id
  const today = toDateKey()

  const raw = ['Bikin video 1 menit cuma pakai lampu HP', 'Ide konten: setting kamera buat olahraga outdoor', 'Coba grading film look buat footage kampus'].map(
    (title) => newIdea({ title, sample }),
  )

  const ref1 = newReference('https://www.tiktok.com/@contoh/video/1', {
    title: 'Contoh — reveal sepatu dengan whip pan',
    status: 'dibedah',
    patternIds: [pat('Reveal produk')!].filter(Boolean),
    tags: ['produk'],
    sample,
  })
  ref1.atm.amati.hook = 'Close-up tali sepatu ditarik cepat, suara "whoosh"'
  ref1.atm.amati.movement = 'Whip pan kiri ke kanan tiap ganti angle'
  ref1.atm.amati.rhythm = 'Potong tiap 0,5 detik ikut beat'
  ref1.atm.amati.why = 'Penasaran: sepatu utuh baru muncul di detik terakhir'
  ref1.atm.tiru = ['movement', 'rhythm']
  const ref2 = newReference('https://www.instagram.com/reel/contoh', {
    title: 'Contoh — slow-mo atlet golden hour',
    patternIds: [pat('Speed ramp aksi')!].filter(Boolean),
    tags: ['olahraga'],
    sample,
  })

  const master = newMaster('Contoh — Reel tenis sore', {
    sample,
    summary: 'Reel 20 detik: detail persiapan → aksi slow-mo → senyum di akhir.',
    segments: [
      newSegment({ slot: 'Hook', label: 'Bola dipantulkan', durationSec: 2, shotType: 'Extreme close-up', angle: 'Low angle', lens: '50mm', fps: '120', movement: 'Statis', refId: ref2.id, description: 'Bola memantul pelan di lantai lapangan' }),
      newSegment({ slot: 'Isi', label: 'Servis slow-mo', durationSec: 4, shotType: 'Medium', angle: 'Samping', lens: '35mm', fps: '120', movement: 'Speed ramp', refId: ref2.id, description: 'Servis penuh, ramp di momen kena bola' }),
      newSegment({ slot: 'Penutup', label: 'Senyum ke kamera', durationSec: 2, shotType: 'Close-up', angle: 'Eye level', lens: '50mm', fps: '60', movement: 'Push in pelan', description: 'Golden hour dari belakang subjek' }),
    ],
  })

  const content = newContentIdea({
    title: 'Contoh — Reel tenis sore untuk klien',
    goal: 'branding',
    platforms: ['instagram'],
    hook: 'Bola memantul slow-mo + teks "sore ini…"',
    concept: 'Tampilkan energi main tenis sore dengan ritme cepat-lambat.',
    stage: 'siap',
    masterId: master.id,
    sample,
  })
  master.ideaId = content.id

  const shoot = newShoot('Contoh — Syuting tenis', {
    sample,
    date: addDays(today, 1),
    start: '16:00',
    end: '18:00',
    location: 'Lapangan tenis',
    masterId: master.id,
    ideaId: content.id,
    prep: checkItems(DEFAULT_PREP.slice(0, 5)),
    shots: master.segments.map((s) =>
      newShot({ label: s.label, description: s.description, shotType: s.shotType, angle: s.angle, lens: s.lens, fps: s.fps, movement: s.movement, durationSec: s.durationSec, segmentId: s.id }),
    ),
  })

  const t = now()
  await db.transaction('rw', [db.ideas, db.references, db.masters, db.shoots, db.tasks, db.habits, db.links, db.settings], async () => {
    await db.ideas.bulkAdd([
      ...raw,
      content,
      newIdea({ kind: 'daily', title: 'Contoh — Mulai olahraga pagi 3x seminggu', categoryId: cat('Kesehatan'), sample }),
    ])
    await db.references.bulkAdd([ref1, ref2])
    await db.masters.add(master)
    await db.shoots.add(shoot)
    await db.tasks.add({ id: uid(), title: 'Contoh — Cek baterai & kartu memori', due: today, done: false, categoryId: cat('Kerja'), createdAt: t, updatedAt: t, sample })
    await db.habits.add({ id: uid(), title: 'Contoh — Latihan editing 15 menit', categoryId: cat('Hobi'), checkins: [addDays(today, -2), addDays(today, -1)], createdAt: t, updatedAt: t, sample })
    await db.links.add({ id: uid(), fromType: 'idea', fromId: content.id, toType: 'reference', toId: ref2.id, createdAt: t })
    await setSetting('samples.seeded', true)
  })
}

export async function clearSamples() {
  const tables = [db.ideas, db.references, db.masters, db.shoots, db.tasks, db.habits, db.decisions, db.mixes] as const
  await db.transaction('rw', [...tables, db.links, db.today], async () => {
    const removed = new Set<string>()
    for (const t of tables) {
      const rows = await (t as typeof db.ideas).filter((r) => !!r.sample).toArray()
      rows.forEach((r) => removed.add(r.id))
      await (t as typeof db.ideas).bulkDelete(rows.map((r) => r.id))
    }
    const links = await db.links.filter((l) => removed.has(l.fromId) || removed.has(l.toId)).toArray()
    await db.links.bulkDelete(links.map((l) => l.id))
    await db.today.toCollection().modify((p) => {
      p.items = p.items.filter((i) => !removed.has(i.id))
    })
  })
}

export async function countSamples(): Promise<number> {
  const counts = await Promise.all(
    [db.ideas, db.references, db.masters, db.shoots, db.tasks, db.habits].map((t) => (t as typeof db.ideas).filter((r) => !!r.sample).count()),
  )
  return counts.reduce((a, b) => a + b, 0)
}
