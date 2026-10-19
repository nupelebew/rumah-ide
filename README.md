# Rumah Ide

Tempat menata ide, membedah video referensi pakai metode **ATM (Amati, Tiru, Modifikasi)**, meracik beberapa referensi jadi satu **Referensi Utama**, lalu menurunkannya jadi **Checklist Shoot** dan **Resep Edit CapCut**. Dibuat untuk HP, nyaman dipakai satu tangan.

Semua data tersimpan **di perangkat** (IndexedDB). Tidak ada server, tetap jalan offline.

**Versi live:** https://nupelebew.github.io/rumah-ide/ (ter-deploy otomatis lewat GitHub Actions setiap push ke `main`).

## Menjalankan di komputer

Butuh Node.js 20 atau lebih baru.

```bash
npm install
npm run dev
```

Buka alamat yang muncul (biasanya `http://localhost:5173`). Perintah lain:

| Perintah | Fungsi |
|---|---|
| `npm test` | Uji unit (deteksi platform, pemisahan brain dump, streak, .ics, parser jawaban Claude) |
| `npm run build` | Build produksi ke folder `dist/` |
| `npm run preview` | Coba hasil build (termasuk mode offline) |
| `node scripts/icons.mjs` | Buat ulang ikon PNG |

## Memasang ke layar utama HP

Fitur "Tambahkan ke Layar Utama" dan mode offline **wajib lewat HTTPS**. Membuka lewat Wi-Fi (`http://192.168.x.x`) bisa untuk mencoba, tapi tidak bisa dipasang.

1. Jalankan `npm run build`.
2. Unggah folder `dist/` ke hosting statis gratis, misalnya:
   - **Netlify Drop**: buka app.netlify.com/drop, lalu seret folder `dist/` ke sana.
   - **Vercel**: `npx vercel deploy dist --prod`
   - **GitHub Pages**: unggah isi `dist/` ke branch `gh-pages`.

   Hosting hanya menyimpan file aplikasinya. Data kamu tetap di HP masing-masing.
3. Buka alamat HTTPS-nya di HP:
   - **Android (Chrome)**: menu ⋮ → *Tambahkan ke layar utama* / *Instal aplikasi*.
   - **iPhone (Safari)**: tombol Bagikan → *Tambahkan ke Layar Utama*.
4. Di **Pengaturan → Data**, ketuk *Lindungi data dari dihapus otomatis*. Ini penting kalau kamu menyimpan video di aplikasi.

Di Android, Rumah Ide juga muncul di menu **Bagikan**. Link dari TikTok/IG, atau jawaban dari aplikasi Claude, bisa langsung dikirim ke Rumah Ide.

## Ekspor & impor data (cadangan)

**Pengaturan → Data & cadangan**

- **Ekspor**: pilih *Data saja*, *+ frame*, atau *+ frame & video*, lalu ketuk *Ekspor sekarang*. Hasilnya file `rumah-ide-cadangan-YYYY-MM-DD.json`. Video bisa membuat file sangat besar, jadi simpan juga video aslinya di galeri.
- **Impor**: pilih file cadangan, lalu pilih *Gabungkan* (data sekarang tetap ada) atau *Ganti semua*.
- API key **tidak pernah** ikut di file ekspor.

Lakukan ekspor rutin, misalnya tiap Review Mingguan. Data di browser bisa hilang kalau aplikasi di-uninstall atau data situs dihapus.

## Fitur Claude (opsional)

Matikan total di **Pengaturan → Claude (AI) → Tampilkan fitur Claude** kalau ingin aplikasi tanpa AI. Semua fitur lain tetap jalan penuh.

### Jalur 1: Salin-tempel (tanpa API key, gratis/langganan claude.ai)

1. Ketuk tombol **Minta Claude …** (ada di Inbox, ide, bedah ATM, Papan Racik, Referensi Utama, checklist, Review).
2. **Salin prompt**, lalu **Buka Claude** dan tempel. Lampirkan frame kalau diminta.
3. Salin seluruh jawaban Claude, lalu kembali ke aplikasi dan ketuk **Tempel dari clipboard**.
4. Cek pratinjau, centang yang mau dipakai, lalu ketuk **Terapkan**. Aplikasi membuat atau mengisi ide konten, storyboard, tugas, kebiasaan, keputusan, isian ATM, Referensi Utama, checklist shoot, atau resep edit.

Jawaban Claude juga bisa ditempel di tombol **+** (Tangkap cepat). Aplikasi mengenali blok ` ```rumah-ide ` secara otomatis. Aplikasi **tidak** menjalankan kode apa pun dari jawaban. Isinya hanya dibaca sebagai data dan divalidasi dulu.

### Jalur 2: API key (tombol "Kirim langsung")

1. Buat API key di console.anthropic.com (biaya ditanggung akun kamu).
2. **Pengaturan → Claude (AI)**: tempel key, pilih model (bawaan: Claude Opus 5.5), lalu **Tes koneksi**.
3. Key disimpan **hanya di HP itu**. Data baru dikirim ke Anthropic saat kamu menekan *Kirim langsung*.

Modul AI ada di `src/ai/` dengan satu antarmuka `suggest(prompt)`, jadi penyedia lain bisa ditambahkan di `src/ai/provider.ts`.

## Alur kerja video: referensi → video jadi

1. **Pustaka referensi**: tempel link atau unggah video yang kamu simpan sendiri (aplikasi tidak mengunduh dari IG/TikTok). Bedah dengan Amati → Tiru → Modifikasi, dan ambil frame penting.
2. **Papan Racik**: pilih beberapa referensi, masukkan ke slot Hook / Isi / Klimaks / Penutup, tandai detik mulai & selesai, dan pilih yang diambil (gerakan, transisi, warna…).
3. **Deal → Referensi Utama**: cetak biru per segmen (shot, sudut, lensa, fps, gerakan, transisi). Bisa dilengkapi Claude Opus.
4. **Paket Remotion**: file `.zip` berisi video sumber, titik potong (`brief.json`), frame, dan `PROMPT.md`. Pindahkan ke laptop, ekstrak, buka foldernya di **Claude Code**, lalu minta *"Kerjakan PROMPT.md"*. Hasilnya `out/referensi-utama.mp4` yang bisa disimpan balik ke aplikasi.
5. **Checklist Shoot**: dibuat dari Referensi Utama dan menyesuaikan *Peralatan Saya*. Di lokasi, pakai **Mode Lapangan** (kontras tinggi, layar tetap menyala) dan centang tiap shot.
6. **Resep Edit CapCut**: langkah edit per segmen, centang sambil mengedit.

Jadwal syuting bisa ditukar dengan **Ritme** atau Google Calendar lewat file `.ics` (Konten → Syuting → *Impor .ics* / *Ekspor ke kalender*).

## Struktur kode

```
src/
  features/   capture, atm, mix, content, shoot, daily, today, review, search, settings, bridge
  db/         skema Dexie (berversi), tipe entitas, repositori, seed contoh, cadangan
  ai/         antarmuka penyedia, Claude (Anthropic SDK), prompt, parser & penerap aksi
  components/ UI bersama (tombol, chip, sheet, kartu, tautan)
  lib/        fungsi murni + uji unit (platform, brain dump, streak, tanggal, .ics, video)
```

Menambah field terindeks atau tabel baru? Tambahkan `this.version(2).stores(...)` di `src/db/db.ts` (dengan `.upgrade()` bila perlu). Jangan mengubah definisi versi lama.
