import { zipSync, strToU8 } from 'fflate'
import { db } from '../../db/db'
import type { Master } from '../../db/types'
import { slug } from '../../lib/video'
import { formatTimecode } from '../../lib/dates'

const EXT: Record<string, string> = { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' }

/**
 * Paket untuk Claude Code + Remotion: video sumber, frame, brief.json, dan PROMPT.md.
 * Video disimpan tanpa kompresi ulang (level 0) supaya cepat.
 */
export async function buildRemotionPack(master: Master): Promise<{ blob: Blob; name: string; missing: string[] }> {
  const used = [...new Set(master.segments.map((s) => s.refId).filter(Boolean))] as string[]
  // Nomor R1, R2, … mengikuti urutan di Papan Racik supaya sama dengan yang kamu lihat di aplikasi
  const boardOrder = master.mixId ? ((await db.mixes.get(master.mixId))?.refIds ?? []) : []
  const refIds = [...boardOrder.filter((id) => used.includes(id)), ...used.filter((id) => !boardOrder.includes(id))]
  const refs = (await db.references.bulkGet(refIds)).filter(Boolean)
  const files: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {}
  const fileOf = new Map<string, string>()
  const missing: string[] = []

  for (const r of refs) {
    const label = `R${(boardOrder.includes(r!.id) ? boardOrder.indexOf(r!.id) : boardOrder.length + refs.indexOf(r)) + 1}`
    if (!r!.videoId) {
      missing.push(r!.title || r!.url)
      continue
    }
    const m = await db.media.get(r!.videoId)
    if (!m) continue
    const name = `public/sumber/${label}-${slug(r!.title)}.${EXT[m.mime] ?? 'mp4'}`
    files[name] = [new Uint8Array(await m.blob.arrayBuffer()), { level: 0 }]
    fileOf.set(r!.id, name.replace(/^public\//, ''))
  }

  const segs = []
  let t = 0
  for (const [i, s] of master.segments.entries()) {
    let frame: string | undefined
    if (s.frameId) {
      const fm = await db.media.get(s.frameId)
      if (fm) {
        frame = `frames/S${String(i + 1).padStart(2, '0')}.jpg`
        files[frame] = new Uint8Array(await fm.blob.arrayBuffer())
      }
    }
    segs.push({
      urutan: i + 1,
      slot: s.slot,
      label: s.label,
      mulaiDiVideoAkhir: +t.toFixed(2),
      durasiDetik: s.durationSec,
      sumber: s.refId && fileOf.has(s.refId) ? { file: fileOf.get(s.refId), inDetik: s.inSec ?? 0, outDetik: s.outSec ?? (s.inSec ?? 0) + s.durationSec } : null,
      frameContoh: frame ?? null,
      catatan: {
        deskripsi: s.description,
        jenisShot: s.shotType,
        sudut: s.angle,
        lensa: s.lens,
        fps: s.fps,
        gerakan: s.movement,
        transisiKeBerikutnya: s.transition,
        teksDiLayar: s.text,
        sound: s.sound,
        warna: s.color,
      },
    })
    t += s.durationSec
  }

  const [w, h] = master.aspect === '16:9' ? [1920, 1080] : master.aspect === '1:1' ? [1080, 1080] : master.aspect === '4:5' ? [1080, 1350] : [1080, 1920]
  const brief = { judul: master.title, ringkasan: master.summary, rasio: master.aspect, ukuran: { w, h }, fps: 30, totalDetik: +t.toFixed(2), segmen: segs }
  files['brief.json'] = strToU8(JSON.stringify(brief, null, 2))
  files['PROMPT.md'] = strToU8(promptMd(master, brief.totalDetik, w, h, segs.filter((s) => !s.sumber).length))

  const zip = zipSync(files as never)
  return { blob: new Blob([zip as BlobPart], { type: 'application/zip' }), name: `remotion-${slug(master.title)}.zip`, missing }
}

function promptMd(m: Master, total: number, w: number, h: number, placeholders: number): string {
  return `# Tugas: rakit "Referensi Utama" dengan Remotion

Kamu adalah Claude Code. Folder ini berisi paket dari aplikasi **Rumah Ide**:

- \`brief.json\` — urutan segmen, durasi, titik potong (in/out) dari tiap video sumber, dan catatan sinematografi.
- \`public/sumber/\` — video referensi asli (R1, R2, …). Hanya untuk referensi pribadi, bukan untuk diunggah ulang.
- \`frames/\` — frame contoh per segmen (opsional).

## Yang harus dibuat

Satu video **referensi utama** berdurasi ±${total.toFixed(1)} detik, ${w}×${h}, 30 fps, judul "${m.title}".
Video ini dipakai sebagai panduan syuting dan edit, jadi **kejelasan lebih penting dari estetika**.

1. Kalau belum ada proyek Remotion di folder ini, buat (TypeScript). Kalau skill/plugin Remotion tersedia, gunakan.
   Pindahkan isi paket ke dalam proyek (video tetap di \`public/sumber/\`).
2. Baca \`brief.json\`. Buat satu komposisi \`ReferensiUtama\` yang menyusun segmen sesuai \`urutan\`:
   - Segmen dengan \`sumber\`: tampilkan potongan video dari \`inDetik\` sampai \`outDetik\`
     (pakai komponen video Remotion dengan trim sesuai versi yang terpasang — cek dokumentasinya),
     di-*fit/cover* ke ${w}×${h}. Kalau panjang potongan ≠ \`durasiDetik\`, sesuaikan kecepatannya.
   - Segmen tanpa sumber (${placeholders} segmen): kartu polos berisi \`label\` dan \`catatan.deskripsi\` — ini shot yang harus disyuting sendiri.
3. Overlay kecil (bisa dimatikan lewat prop \`tampilkanLabel\`):
   - pojok atas: \`slot · label\` dan nomor segmen,
   - pojok bawah: catatan singkat (jenis shot, gerakan, fps, transisi) dari \`catatan\`,
   - timecode berjalan.
4. Terapkan transisi antarsegmen sesuai \`catatan.transisiKeBerikutnya\` bila jelas (cut, fade, whip/slide); kalau ragu, pakai hard cut.
5. Render ke \`out/referensi-utama.mp4\` (H.264). Lalu render versi tanpa label ke \`out/referensi-utama-bersih.mp4\`.
6. Laporkan singkat: segmen mana yang disesuaikan, dan perintah untuk render ulang.

Jangan mengunggah apa pun ke internet. Kerjakan semuanya lokal.

## Ringkasan segmen

${m.segments.map((s, i) => `${i + 1}. **${s.slot} — ${s.label}** · ${s.durationSec} dtk${s.inSec !== undefined ? ` · sumber ${formatTimecode(s.inSec)}–${formatTimecode(s.outSec ?? s.inSec + s.durationSec)}` : ''}${s.description ? ` · ${s.description}` : ''}`).join('\n')}
`
}
