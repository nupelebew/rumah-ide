import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Page } from '../../components/Layout'
import { Button, PageHeader, Section } from '../../components/ui'
import { navigate } from '../../lib/router'

interface Topic {
  title: string
  go?: { label: string; to: string }
  body: ReactNode
}

const FLOW: Topic[] = [
  {
    title: '★ Satu proyek = satu video',
    go: { label: 'Buka Proyek', to: 'konten' },
    body: (
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          Tab <b>Proyek</b> → <b>Proyek baru</b>. Isi nama (dan klien kalau ada).
        </li>
        <li>
          Ikuti 5 langkah di atas layar. Tiap langkah punya <b>satu tombol utama</b>, lalu <b>Lanjut</b>.
        </li>
        <li>
          <b>Konsep</b> → <b>Referensi</b> (unggah video, “Gabungkan di Claude”) → <b>Video contoh</b> (simpan video, “Ambil hasil dari Claude”) →{' '}
          <b>Syuting</b> (Mode Lapangan) → <b>Edit</b> (resep CapCut).
        </li>
        <li>Tombol Claude: ketuk “Salin & buka Claude”, tempel di Claude, salin jawabannya, kembali, ketuk “Tempel jawaban Claude”.</li>
        <li>Fitur lanjutan (racik manual, Remotion, detail segmen) ada di “Opsi lain” / menu ⋯.</li>
      </ol>
    ),
  },
  {
    title: 'Rekap ke Google Sheets (content planner)',
    go: { label: 'Sambungkan', to: 'atur?bagian=spreadsheet' },
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Sambungkan sekali di <b>Pengaturan → Spreadsheet</b> (ikuti 4 langkah, tombol “Salin skrip” tersedia).
        </li>
        <li>
          Setiap proyek otomatis jadi satu baris di sheet <b>Planner</b> dan ikut diperbarui saat maju langkah.
        </li>
        <li>
          Isi akun, tanggal upload, jenis, pillar, PIC, caption lewat kartu <b>Planner</b> di halaman proyek. Pilihannya diambil dari sheet Master.
        </li>
        <li>Status otomatis mengikuti langkah: Konsep → Referensi → Video Contoh → Syuting → Editing → Siap Upload → “Sudah diupload”.</li>
        <li>Offline? Perubahan diantrekan dan dikirim saat online lagi.</li>
      </ul>
    ),
  },
  {
    title: 'Tangkap & rapikan ide',
    go: { label: 'Tangkap', to: 'tangkap' },
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Tombol <b>+</b> dari mana saja: teks → Inbox, link → Referensi, jawaban Claude → diterapkan. Inbox ada di Hari Ini.
        </li>
        <li>Satu baris = satu ide. Jangan menyaring saat menulis.</li>
        <li>
          <b>Rapikan</b> sekali sehari (5 menit): Ide Konten / Keseharian / Simpan dulu / Buang. Ragu? Simpan dulu.
        </li>
        <li>“Mirip-mirip” muncul otomatis untuk menggabungkan ide yang sama.</li>
      </ul>
    ),
  },
  {
    title: 'Bedah ATM satu referensi',
    go: { label: 'Referensi', to: 'ref' },
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Lampirkan videonya, bukan cuma link — Claude tidak bisa membuka link IG/TikTok.</li>
        <li>
          <b>Amati</b>: cukup 3–4 kolom yang paling bikin video itu bekerja. Pakai chip saran, minim ngetik.
        </li>
        <li>
          <b>Tiru</b>: centang yang ditiru persis. <b>Modifikasi</b>: jawab 3 pancingan → Jadikan Ide Konten.
        </li>
        <li>Tonton 3× tanpa suara dulu; mata lebih jeli ke gerakan & potongan.</li>
      </ul>
    ),
  },
  {
    title: 'Papan Racik (cara manual)',
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Pilih beberapa referensi → masukkan ke slot Hook / Isi / Klimaks / Penutup. Tidak semua harus dipakai.</li>
        <li>
          Ketik detik potongan (<code>1-3</code>) atau putar lalu “Tandai mulai/selesai”. Frame diambil otomatis.
        </li>
        <li>Deal → Referensi Utama → checklist & resep edit.</li>
      </ul>
    ),
  },
  {
    title: 'Ide Konten & storyboard',
    go: { label: 'Konten', to: 'konten' },
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Kanban: Ide → Dikembangkan → Siap Syuting → Syuting → Edit → Selesai.</li>
        <li>Jaga “Dikembangkan + Siap Syuting” maksimal 3–5 kartu.</li>
        <li>Kembangkan Ide → storyboard berdurasi → Jadikan Referensi Utama.</li>
        <li>Buntu? Acak Kombinasi: kunci yang cocok, acak sisanya.</li>
      </ul>
    ),
  },
  {
    title: 'Keseharian, Hari Ini, Review',
    go: { label: 'Hari Ini', to: 'hari-ini' },
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Ide keseharian → Tugas / Kebiasaan (streak) / Catatan Keputusan (A vs B).</li>
        <li>Kebiasaan maksimal 2–3 dan kecil.</li>
        <li>Pagi: pilih 3 prioritas di Hari Ini. Beres, baru ambil yang lain.</li>
        <li>Minggu malam: Review Mingguan + ekspor cadangan (10 menit).</li>
      </ul>
    ),
  },
  {
    title: 'Pengaturan penting',
    go: { label: 'Pengaturan', to: 'atur' },
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Isi <b>Peralatan Saya</b> sekali (mis. “kamera X, maks FHD 120fps”) — saran fps & lensa jadi realistis.
        </li>
        <li>Lindungi data dari hapus otomatis, dan ekspor cadangan rutin.</li>
        <li>Hapus data “Contoh” setelah paham alurnya.</li>
      </ul>
    ),
  },
]

export default function GuideScreen() {
  return (
    <Page>
      <PageHeader kicker="3 menit baca" title="Panduan" backTo="hari-ini" />
      <div className="space-y-2 px-4">
        {FLOW.map((t, i) => (
          <details key={t.title} open={i === 0} className="sketch group overflow-hidden">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 px-4 py-3 font-display text-lg font-bold">
              <span className="flex-1">{t.title}</span>
              <ChevronDown size={20} className="shrink-0 transition group-open:rotate-180" />
            </summary>
            <div className="border-t-[1.5px] border-dashed border-line px-4 pt-3 pb-4 text-sm leading-relaxed text-ink-2">
              {t.body}
              {t.go && (
                <Button size="sm" variant="ink" className="mt-3" onClick={() => navigate(t.go!.to)}>
                  {t.go.label} →
                </Button>
              )}
            </div>
          </details>
        ))}
      </div>
      <Section title="Ritme yang disarankan">
        <table className="w-full text-sm">
          <tbody className="divide-y-[1.5px] divide-line">
            {[
              ['Kapan saja', 'Tombol + untuk ide & link'],
              ['Pagi', 'Pilih 3 prioritas Hari Ini'],
              ['Malam', 'Rapikan Inbox, centang kebiasaan'],
              ['2–3× seminggu', 'Bedah 1–2 referensi'],
              ['H-1 syuting', 'Gabungkan di Claude → checklist'],
              ['Minggu malam', 'Review Mingguan + ekspor'],
            ].map(([a, b]) => (
              <tr key={a}>
                <td className="py-2 pr-3 font-semibold whitespace-nowrap">{a}</td>
                <td className="py-2 text-ink-2">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </Page>
  )
}
