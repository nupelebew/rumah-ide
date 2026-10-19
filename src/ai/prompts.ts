import { db } from '../db/db'
import { AMATI_FIELDS } from '../db/factories'
import type { BridgeInput, BridgeTask } from '../features/bridge/types'
import { BLOCK_LANG, type ActionType } from './actions'
import { addDays, formatDate, toDateKey } from '../lib/dates'
import { weekSummary } from '../features/review/summary'

export const TASK_LABEL: Record<BridgeTask, string> = {
  free: 'Eksekusi ide (bebas)',
  group: 'Kelompokkan ide',
  develop: 'Kembangkan jadi konten',
  breakdown: 'Pecah jadi tugas',
  'atm-fill': 'Bantu amati referensi',
  'atm-mods': '3 saran modifikasi',
  storyboard: 'Susun storyboard',
  'mix-opinion': 'Pendapat soal racikan',
  master: 'Susun Referensi Utama',
  shoot: 'Checklist shoot detail',
  edit: 'Resep edit CapCut',
  review: 'Rangkum minggu ini',
  harvest: 'Ambil hasil dari Claude',
}

/** Contoh bentuk tiap aksi — hanya yang relevan untuk tugas itu yang dimasukkan ke prompt. */
const SHAPES: Record<ActionType, string> = {
  content_idea: `{"type":"content_idea","title":"…","goal":"jualan|branding|edukasi|hiburan","platforms":["instagram","tiktok","youtube"],"hook":"…","concept":"…","shots":["…"],"storyboard":[{"title":"Hook","duration":3,"visual":"…","audio":"…","text":"…"}],"tags":["…"],"sourceIdeaId":"<id ide asal, opsional>","refId":"<id referensi, opsional>"}`,
  daily_idea: `{"type":"daily_idea","title":"…","category":"<nama kategori>","sourceIdeaId":"<opsional>"}`,
  task: `{"type":"task","title":"…","due":"YYYY-MM-DD (opsional)","category":"<nama kategori>","sourceIdeaId":"<opsional>"}`,
  habit: `{"type":"habit","title":"…","category":"<nama kategori>","sourceIdeaId":"<opsional>"}`,
  decision: `{"type":"decision","title":"…","optionA":"…","optionB":"…","prosA":["…"],"consA":["…"],"prosB":["…"],"consB":["…"],"sourceIdeaId":"<opsional>"}`,
  group: `{"type":"group","name":"<nama kelompok singkat>","ideaIds":["<id>","<id>"]}`,
  atm_fill: `{"type":"atm_fill","refId":"<id>","amati":{${AMATI_FIELDS.map((f) => `"${f.key}":"…"`).join(',')}}}`,
  storyboard: `{"type":"storyboard","ideaId":"<id>","scenes":[{"title":"…","duration":3,"visual":"…","audio":"…","text":"…"}]}`,
  master: `{"type":"master","masterId":"<id bila ada>","mixId":"<id bila ada>","title":"…","summary":"…","segments":[{"slot":"Hook","label":"…","duration":2,"description":"…","refNo":"R1","sourceIn":1,"sourceOut":3,"shotType":"…","angle":"…","lens":"…","fps":"…","movement":"…","transition":"…","text":"…","sound":"…","color":"…"}]}`,
  shoot_checklist: `{"type":"shoot_checklist","shootId":"<id bila ada>","masterId":"<id>","title":"…","date":"YYYY-MM-DD","start":"HH:MM","end":"HH:MM","location":"…","shots":[{"label":"…","description":"…","shotType":"…","angle":"…","lens":"…","fps":"…","movement":"…","duration":3}],"prep":["…"]}`,
  edit_recipe: `{"type":"edit_recipe","masterId":"<id>","steps":[{"segment":"…","steps":["langkah 1","langkah 2"]}]}`,
  review_summary: `{"type":"review_summary","week":"YYYY-MM-DD","text":"…"}`,
  note: `{"type":"note","text":"…"}`,
}

const ALLOWED: Record<BridgeTask, ActionType[]> = {
  free: ['content_idea', 'daily_idea', 'task', 'habit', 'decision', 'note'],
  group: ['group', 'note'],
  develop: ['content_idea', 'note'],
  breakdown: ['task', 'habit', 'decision', 'note'],
  'atm-fill': ['atm_fill', 'note'],
  'atm-mods': ['content_idea', 'note'],
  storyboard: ['storyboard', 'note'],
  'mix-opinion': ['note', 'master'],
  master: ['master', 'note'],
  shoot: ['shoot_checklist', 'note'],
  edit: ['edit_recipe', 'note'],
  review: ['review_summary', 'note'],
  harvest: ['master', 'shoot_checklist', 'edit_recipe', 'note'],
}

const clean = (o: unknown) => JSON.stringify(o, (_, v) => (v === '' || v === undefined || (Array.isArray(v) && !v.length) ? undefined : v))

async function categories() {
  return (await db.categories.toArray()).map((c) => c.name)
}

async function gear() {
  return (await db.gear.toArray()).map((g) => `${g.type}: ${g.name}`)
}

async function refData(id: string, no?: string) {
  const r = await db.references.get(id)
  if (!r) return null
  return { refNo: no, id: r.id, judul: r.title, platform: r.platform, link: r.url || undefined, durasiDetik: r.durationSec, amati: r.atm.amati, ditiru: r.atm.tiru, catatan: r.notes }
}

interface Built {
  task: string
  data: unknown
  attach?: string
}

async function build(input: BridgeInput): Promise<Built> {
  const ideas = input.ideaIds?.length ? (await db.ideas.bulkGet(input.ideaIds)).filter(Boolean) : []
  const ideaData = ideas.map((i) => ({ id: i!.id, judul: i!.title, detail: i!.body, jenis: i!.kind, hook: i!.hook, konsep: i!.concept, tag: i!.tags }))
  switch (input.task) {
    case 'free':
      return {
        task: 'Ini ide-ide acak dari kepala saya. Tentukan masing-masing paling cocok jadi apa: Ide Konten (lengkap dengan hook, konsep, daftar shot, dan storyboard singkat), Ide Keseharian, Tugas (beri tanggal bila jelas), Kebiasaan, atau Catatan Keputusan. Satu ide boleh jadi beberapa aksi. Kalau ada ide yang kurang jelas, tulis pertanyaanmu di "note".',
        data: { hariIni: toDateKey(), kategori: await categories(), ide: ideaData },
      }
    case 'group':
      return { task: 'Kelompokkan ide-ide ini berdasarkan tema/kemiripan. Nama kelompok singkat (1–2 kata, huruf kecil) — nanti jadi tag. Ide yang berdiri sendiri tidak perlu dikelompokkan.', data: { ide: ideaData } }
    case 'develop':
      return { task: 'Kembangkan tiap ide jadi Ide Konten yang siap dieksekusi videografer: hook 3 detik, konsep, daftar shot konkret, dan storyboard berdurasi (total 15–45 detik untuk video pendek).', data: { ide: ideaData, alat: await gear() } }
    case 'breakdown':
      return { task: 'Pecah ide ini jadi langkah yang bisa langsung dijalankan: tugas kecil (≤ 1 jam, beri tanggal mulai hari ini bila cocok), kebiasaan bila perlu rutin, atau catatan keputusan bila ada pilihan.', data: { hariIni: toDateKey(), kategori: await categories(), ide: ideaData } }
    case 'atm-fill': {
      const r = await refData(input.refId!)
      return {
        task: 'Bantu saya bagian AMATI dari metode ATM (Amati-Tiru-Modifikasi) untuk video referensi ini. Isi tiap kolom amati dengan singkat dan spesifik secara sinematografi. Jangan menebak isi link yang tidak bisa kamu buka — gunakan frame/screenshot yang saya lampirkan dan catatan saya. Tandai tebakan dengan "(?)".',
        data: { referensi: r },
        attach: 'Lampirkan frame/screenshot dari video ini (di app: halaman referensi → Ambil frame → Bagikan ke Claude).',
      }
    }
    case 'atm-mods': {
      const r = await refData(input.refId!)
      return {
        task: `Beri tepat 3 saran MODIFIKASI dari referensi ini supaya jadi ide konten baru saya (bukan jiplak). Pancingan: (1) kalau subjeknya diganti, (2) kalau gayanya dibalik, (3) kalau dipakai untuk klien/niche saya. Elemen yang "ditiru" tetap dipakai. Setiap saran = satu content_idea dengan refId "${input.refId}".`,
        data: { referensi: r, jawabanSaya: (await db.references.get(input.refId!))?.atm.modifikasi, alat: await gear() },
      }
    }
    case 'storyboard': {
      const i = ideas[0]!
      return { task: 'Susun storyboard untuk ide konten ini: daftar adegan dengan durasi (detik), visual, audio, dan teks layar. Realistis untuk disyuting satu orang.', data: { ide: { ...ideaData[0], daftarShot: i.shots, kebutuhan: i.needs, storyboardSekarang: i.storyboard }, alat: await gear() } }
    }
    case 'mix-opinion':
    case 'master': {
      const mix = input.mixId ? await db.mixes.get(input.mixId) : undefined
      const master = input.masterId ? await db.masters.get(input.masterId) : mix?.masterId ? await db.masters.get(mix.masterId) : undefined
      const refIds = mix?.refIds ?? [...new Set(master?.segments.map((s) => s.refId).filter(Boolean) as string[])]
      const refs = await Promise.all(refIds.map((id, i) => refData(id, `R${i + 1}`)))
      const slots = mix?.slots.map((s) => ({
        slot: s.name,
        potongan: mix.items
          .filter((it) => it.slotId === s.id)
          .map((it) => ({ refNo: `R${mix.refIds.indexOf(it.refId) + 1}`, ambil: it.takes, inDetik: it.inSec, outDetik: it.outSec, catatan: it.note })),
      }))
      const data = { racikan: mix && { id: mix.id, judul: mix.title, brief: mix.brief, alur: slots }, referensiUtama: master && { id: master.id, judul: master.title, rasio: master.aspect, ringkasan: master.summary, segmen: master.segments }, referensi: refs.filter(Boolean), alat: await gear() }
      if (input.task === 'mix-opinion')
        return {
          task: 'Saya sedang meracik beberapa referensi jadi satu video. Beri pendapat jujur & singkat di "note": apakah pembagian referensi ke tiap slot (Hook/Isi/Klimaks/Penutup) sudah pas, apa yang kurang, dan usulan perbaikan urutan/durasi. Kalau usulanmu jelas, sertakan juga satu aksi "master" berisi susunan segmen yang kamu sarankan.',
          data,
          attach: 'Kalau bisa, lampirkan frame dari tiap referensi supaya penilaiannya akurat.',
        }
      return {
        task: `Susun "Referensi Utama": satu cetak biru video gabungan dari referensi-referensi ini, segmen demi segmen sesuai urutan alur. Untuk tiap segmen isi detail sinematografi yang AKURAT dan bisa langsung dipakai syuting: jenis shot, sudut, lensa/focal length, fps (60/120 bila slow-mo), gerakan kamera, transisi, teks, sound, warna. Pakai refNo (R1, R2, …) untuk menunjuk sumber. Sesuaikan dengan alat yang saya punya. ${master ? `Pakai masterId "${master.id}".` : mix ? `Pakai mixId "${mix.id}".` : ''}`,
        data,
        attach: 'Lampirkan frame dari tiap referensi (urut R1, R2, …) supaya detail shot-nya akurat.',
      }
    }
    case 'shoot': {
      const master = await db.masters.get(input.masterId!)
      const shoot = input.shootId ? await db.shoots.get(input.shootId) : undefined
      return {
        task: `Buat checklist syuting yang AKURAT dari Referensi Utama ini. Satu shot per baris yang harus diambil (termasuk shot cadangan/coverage penting dan B-roll), dengan setting kamera konkret (fps, lensa, sudut, gerakan). Lalu daftar persiapan (prep) sesuai alat yang saya punya, lokasi, dan jam syuting (perhatikan cahaya: siang terik → ND filter, sore → golden hour). Urutkan shot supaya efisien di lokasi. ${shoot ? `Pakai shootId "${shoot.id}".` : ''} Pakai masterId "${input.masterId}".`,
        data: {
          referensiUtama: master && { id: master.id, judul: master.title, rasio: master.aspect, ringkasan: master.summary, segmen: master.segments.map(({ id: _id, frameId: _f, ...s }) => s) },
          sesi: shoot && { id: shoot.id, judul: shoot.title, tanggal: shoot.date, jam: shoot.start && `${shoot.start}–${shoot.end ?? ''}`, lokasi: shoot.location, shotSekarang: shoot.shots.map((s) => s.label) },
          alat: await gear(),
        },
      }
    }
    case 'edit': {
      const master = await db.masters.get(input.masterId!)
      return {
        task: `Tulis resep edit langkah demi langkah di aplikasi CapCut (versi HP terbaru, pakai nama menu CapCut bahasa Indonesia bila memungkinkan) supaya hasil edit mirip Referensi Utama ini: potong per segmen, ritme ikut beat, speed ramp, transisi, teks, sound/SFX, dan grading. Satu grup langkah per segmen + grup persiapan & finishing. Pakai masterId "${input.masterId}".`,
        data: { referensiUtama: master && { judul: master.title, rasio: master.aspect, ringkasan: master.summary, segmen: master.segments.map(({ id: _id, frameId: _f, ...s }) => s) } },
      }
    }
    case 'harvest': {
      const master = await db.masters.get(input.masterId!)
      const plan = input.shootPlan ?? {}
      return {
        task: `Kita lanjutkan dari video gabungan yang barusan kamu buat di percakapan ini (dari referensi R1, R2, dst. yang saya kirim). Sekarang ubah jadi rencana kerja supaya saya bisa SYUTING ULANG versi saya sendiri dan mengeditnya. Kirim TIGA aksi sekaligus:
1. "master" dengan masterId "${input.masterId}": satu segmen per potongan di video gabungan, urut sesuai video. Isi refNo + sourceIn/sourceOut (detik di video sumber), durasi di video gabungan, dan detail sinematografi yang AKURAT untuk ditiru: jenis shot, sudut, lensa/focal length, fps (60/120 bila slow-mo), gerakan kamera, transisi ke segmen berikutnya, teks layar, sound/beat, warna. Pakai alat yang saya punya.
2. "shoot_checklist" dengan masterId "${input.masterId}"${plan.date ? `, date "${plan.date}"` : ''}${plan.start ? `, start "${plan.start}"` : ''}${plan.end ? `, end "${plan.end}"` : ''}${plan.location ? `, location "${plan.location}"` : ''}: semua shot yang harus saya ambil, diurutkan supaya efisien di lokasi dan sesuai cahaya pada jam itu, plus shot cadangan/B-roll penting. Lalu "prep": persiapan alat & setting kamera.
3. "edit_recipe" dengan masterId "${input.masterId}": langkah edit di CapCut (HP) per segmen supaya hasilnya mirip video gabungan: potong ikut beat, speed ramp, transisi, teks, sound, grading.
Kalau ada yang kamu ragukan (mis. detik sumber), tandai "(?)" di description.`,
        data: { referensiUtama: master && { id: master.id, judul: master.title, ringkasan: master.summary, rasio: master.aspect }, rencanaSyuting: plan, alat: await gear() },
      }
    }
    case 'review': {
      const week = input.week!
      const s = await weekSummary(week)
      const review = await db.reviews.get(week)
      return {
        task: `Rangkum minggu saya (${formatDate(week)} – ${formatDate(addDays(week, 6))}) dengan hangat & jujur: apa yang berjalan, apa yang mandek dan kenapa mungkin terjadi, lalu 3 fokus kecil untuk minggu depan. Maks 150 kata. Pakai week "${week}".`,
        data: {
          ideBaru: s.newIdeas.map((i) => i.title),
          selesai: [...s.finished.map((i) => i.title), ...s.tasksDone.map((t) => t.title)],
          mandek: s.stuck.map((i) => i.title),
          syuting: s.shoots.map((x) => x.title),
          centangKebiasaan: s.habitDays,
          refleksiSaya: review?.answers,
        },
      }
    }
  }
}

/** Prompt lengkap yang disalin ke Claude (atau dikirim lewat API). */
export async function buildPrompt(input: BridgeInput): Promise<{ prompt: string; attach?: string }> {
  const b = await build(input)
  const allowed = ALLOWED[input.task]
  const prompt = `Kamu membantu saya di aplikasi "Rumah Ide" — saya videografer & video editor, mahasiswa, berbahasa Indonesia.

## Tugas
${b.task}

## Data
\`\`\`json
${clean(b.data)}
\`\`\`

## Cara menjawab (penting — jawabanmu akan ditempel balik ke aplikasi)
1. Boleh tulis penjelasan/diskusi singkat dulu (maks 6 kalimat), bahasa Indonesia santai.
2. Akhiri dengan SATU blok kode berlabel \`${BLOCK_LANG}\` berisi JSON valid:
\`\`\`${BLOCK_LANG}
{"rumah_ide":1,"aksi":[ … ]}
\`\`\`
3. Jenis aksi yang boleh dipakai (bentuknya persis seperti ini, kolom kosong boleh dihilangkan):
${allowed.map((t) => `- ${SHAPES[t]}`).join('\n')}
4. Pakai id persis seperti di Data. Jangan mengarang id.
5. Jangan sertakan komentar di dalam JSON. Durasi dalam detik (angka).`
  return { prompt, attach: b.attach }
}

export interface MergeBrief {
  title: string
  brief: string
  refCount: number
  duration: number
  aspect: string
  mood: string[]
  sound: 'ref' | 'claude' | 'none'
}

/** Prompt pembuka di Claude: gabungkan beberapa video referensi jadi satu video contoh (dengan sound). */
export function mergeStartPrompt(b: MergeBrief): string {
  const sound =
    b.sound === 'ref'
      ? 'Pakai audio/musik dari referensi yang ritmenya paling cocok (sebutkan dari R berapa), dan potong mengikuti beat-nya.'
      : b.sound === 'claude'
        ? 'Pilih sendiri audio terbaik dari referensi yang ada (boleh campuran), potong mengikuti beat.'
        : 'Tanpa audio (saya isi musik sendiri), tapi tetap susun ritme potongan seolah ada beat.'
  return `Saya videografer & editor. Saya lampirkan ${b.refCount || 'beberapa'} video referensi. Beri nomor sesuai urutan lampiran: R1, R2, dst.

## Video yang saya mau
- Judul: ${b.title || '(belum ada)'}
- Brief: ${b.brief || '(bebas, pilih yang paling menarik)'}
- Durasi: ±${b.duration} detik, rasio ${b.aspect}${b.mood.length ? `
- Nuansa: ${b.mood.join(', ')}` : ''}

## Langkah
1. Analisis tiap video (ambil frame sendiri bila perlu): ringkas isi R1, R2, … dalam 1 baris, dan tandai momen terbaiknya dengan detik.
2. Usulkan susunan Hook → Isi → Klimaks → Penutup: potongan mana dari R berapa, detik berapa sampai berapa, dan kenapa. Tidak semua referensi harus dipakai.
3. Rakit jadi SATU video MP4 ${b.aspect}, ±${b.duration} detik. ${sound}
4. Buat dua versi: (a) dengan label kecil di pojok "R# · detik sumber · nama segmen" sebagai panduan, (b) versi bersih tanpa label.
5. Tampilkan tabel susunan akhir (urutan, R#, detik sumber, durasi di video jadi).

Nanti setelah videonya jadi, saya akan minta kamu mengubahnya jadi daftar shot & resep edit untuk aplikasi saya — jadi ingat susunannya.`
}
