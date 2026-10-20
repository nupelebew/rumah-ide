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

## Rekap otomatis ke Google Sheets (content planner)

Setiap proyek bisa otomatis tercatat sebagai satu baris di sheet **Planner** (format `Content_Planner_Multi_Akun.xlsx`), dan barisnya ikut diperbarui saat proyek maju.

1. Unduh template [`public/planner/Content_Planner_Rumah_Ide.xlsx`](public/planner/Content_Planner_Rumah_Ide.xlsx) (tersedia juga di aplikasi: Pengaturan → Spreadsheet), unggah ke Google Drive, buka, lalu **File → Simpan sebagai Google Spreadsheet**. Ganti nama Akun & PIC di tab *Master*.
2. **Ekstensi → Apps Script**: hapus isinya, lalu tempel isi [`scripts/google-sheets/Code.gs`](scripts/google-sheets/Code.gs). Di aplikasi juga ada tombol *Salin skrip*. Lalu Simpan.
3. **Terapkan → Deployment baru → Aplikasi web**. Jalankan sebagai *Saya*, akses *Siapa saja*. Terapkan, lalu salin URL yang berakhiran `/exec`.
4. Di Rumah Ide: **Pengaturan → Spreadsheet**, tempel URL-nya, lalu ketuk **Sambungkan**.

Catatan:
- Kolom dicari berdasarkan **judul** di baris 4 (Akun, Status Postingan, …, Klien, ID Rumah Ide). Kolom **ID Rumah Ide** membuat baris yang sama diperbarui, tidak dobel. Planner lama (`Content_Planner_Multi_Akun.xlsx`) juga tetap bisa dipakai.
- Pilihan Akun/PIC/Pillar/Jenis/Status dibaca dari sheet **Master**.
- Status otomatis mengikuti langkah proyek: Konsep → Referensi → Video Contoh → Syuting → Editing → Siap Upload, lalu tombol *Sudah diupload* = Sudah Upload. On Hold, Reschedule, dan Revisi bisa dipilih manual.
- **Hasil**: di langkah Edit ada kartu *Hasil* berisi catatan hasil, Link Google Drive, dan Link Postingan, yang masuk ke kolom *Hasil / Link Google Drive / Link Postingan* (kolom dibuat otomatis kalau belum ada). Tombol *Buat folder Drive otomatis* membuat folder `Rumah Ide - Hasil/<judul proyek>` di Drive pemilik skrip. Fitur ini perlu izin Drive: di Apps Script, pilih fungsi `izinkanDrive`, lalu klik *Jalankan* dan *Izinkan*.
- **Caption**: di kartu Planner ada tombol *Buatkan caption dengan Claude*.
- Setelah mengganti kode skrip: **Terapkan → Kelola deployment → ✏ → Versi: Versi baru → Terapkan**. URL-nya tetap sama.
- Sinkronnya satu arah (aplikasi → sheet). Mengubah sheet langsung tidak mengubah aplikasi, dan bisa tertimpa saat proyek diubah lagi di aplikasi.
- URL Apps Script berfungsi seperti kunci. URL ini tidak ikut di file ekspor; jangan dibagikan.
- Template menyiapkan 500 baris (5–504). Sheet Ringkasan juga menghitung jadwal upload minggu ini, bulan ini, dan yang terlambat.

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

## Cara pakai singkat

- **Hari Ini**: proyek yang sedang jalan, 3 prioritas, tugas & kebiasaan, Inbox.
- **Proyek**: satu proyek = satu video, dituntun 5 langkah (Konsep → Referensi → Video contoh → Syuting → Edit). Tiap langkah punya satu tombol utama.
- **+**: tangkap ide/link apa saja, kapan saja.
- **Referensi**: pustaka & bedah ATM.
- **Harian**: tugas, kebiasaan, ide keseharian, catatan keputusan.

Fitur lanjutan (Papan Racik manual, Remotion, detail segmen, tampilan papan/kanban) tetap ada di "Opsi lain", menu ⋯, atau ikon di pojok kanan atas.

## Alur tercepat: gabungkan referensi di Claude

1. Referensi → **Papan Racik & Utama** → **Cara cepat: gabungkan di Claude**. Isi brief, lalu ketuk *Salin prompt*.
2. Di claude.ai: tempel prompt + lampirkan semua video referensi. Claude membuat satu video contoh dengan sound.
3. Unduh videonya, lalu simpan di **Video contoh** pada Referensi Utama.
4. Ketuk **Ambil hasil dari Claude**, isi jadwal syuting, lalu tempel prompt-nya **di chat Claude yang sama** dan tempel balik jawabannya. Segmen, checklist shoot (lengkap dengan jadwal), dan resep CapCut terisi sekaligus.
5. Di lokasi: **Mode Lapangan** menampilkan kartu "Berikutnya", dan tombol ▶ memutar potongan contoh untuk shot itu.

Panduan singkat juga ada di dalam aplikasi (ikon **?** di Hari Ini).

## Alur kerja video (manual): referensi → video jadi

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
