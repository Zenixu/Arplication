# TODO — Arplication

Daftar pekerjaan yang tersisa, diurutkan dari yang **paling harus dibenarkan**.
Satu item = satu perubahan yang bisa dirilis sendiri.

**Legenda**

| Kode | Arti |
|---|---|
| `P0` | wajib — mengganggu pemakaian / bikin bingung |
| `P1` | penting — menaikkan kualitas, belum mendesak |
| `P2` | enak punya |
| `S` / `M` / `L` | perkiraan besar kerja: kecil (<1 jam) / sedang (1 rilis) / besar (beberapa rilis) |

**Aturan kerja**

1. Kerjakan dari atas ke bawah, jangan lompat ke `P2` sebelum `P0` beres.
2. Satu rilis = satu item, kecuali beberapa item `S` bisa digabung.
3. Setelah rilis: ubah `[ ]` → `[x]` dan tulis nomor versinya.
4. Jangan redesign total — perbaiki bagian yang disebut, sisanya biarkan.

---

## A. Tampilan (dari yang paling harus dibenarkan)

- [x] **A1 · `P0` · `S` · Ukuran teks terlalu kecil.** — **selesai di v1.9.11**
      87 elemen memakai 8–9,5px. Naikkan minimum ke 11px, teks utama 13–14px.
      *Alasan:* di HP, 8px ≈ 2,1 mm — di bawah batas nyaman baca.

- [x] **A2 · `P0` · `S` · Kartu "PIPELINE STATUS" di Arloader.** — **selesai di v1.9.12**
      Isinya `0 DONE / IDLE` dan `SANDBOX 100%` — istilah teknis yang tidak
      menjelaskan apa pun ke pengguna. Ganti jadi ringkasan berguna atau hapus.

- [ ] **A3 · `P0` · `S` · Bottom nav tidak rata.**
      Celah antara ARMAPS dan TOOLBOX lebih lebar dari yang lain karena kotak
      HUB lebih besar. Samakan lebar tiap item.

- [ ] **A4 · `P1` · `S` · Modal pengaturan Arloader masih bernomor "1. … 4."**
      Ganti jadi judul biasa tanpa angka.

- [ ] **A5 · `P1` · `S` · Klaim platform belum jujur.**
      Tertulis "12+ platform", yang berfungsi baru 4 (TikTok, Instagram,
      YouTube, Spotify). Sesuaikan teksnya atau tambah dukungan nyata.

- [ ] **A6 · `P1` · `M` · Isi kartu homescreen dengan info hidup.**
      Ardoro: sisa waktu timer. Artoolbox: chip alat favorit.
      ARLOADER: unduhan terakhir. ARMUSIC: mini player + tombol acak.

- [ ] **A7 · `P2` · `M` · Cover art untuk lagu di ArMusic.**
      Sekarang kotak warna kosong. Ambil dari thumbnail hasil unduhan.

- [ ] **A8 · `P2` · `S` · Kontras teks abu terlalu tipis.**
      Banyak `text-[#121212]/45`; naikkan ke `/60` agar terbaca di layar redup.

- [ ] **A9 · `P2` · `S` · Empty state belum konsisten antar modul.**
      Samakan pola: ikon + satu kalimat + satu tombol aksi.

---

## B. Fungsi

- [ ] **B1 · `P0` · `M` · Arloader tidak menunjukkan progres unduhan.**
      Setelah menekan unduh, layar diam sampai file muncul di riwayat.
      Minimal: indikator "sedang mengunduh…" + tombol **buka file** setelah selesai.
      *Alasan:* untuk file besar, pengguna mengira unduhan gagal.

- [ ] **B2 · `P0` · `L` · Lagu YouTube di ArMusic tidak tersimpan.**
      Setiap pemutaran streaming ulang. Kalau sinyal hilang, lagu berhenti —
      padahal tema aplikasi offline-first. Perlu "simpan ke koleksi" (cache audio).

- [ ] **B3 · `P1` · `M` · Belum ada onboarding.**
      Tiga layar sekali jalan: (1) aplikasi offline, (2) cara mengunduh,
      (3) cara memutar musik. Pengguna awam tidak akan menemukan sendiri bahwa
      ArMusic butuh lagu dari Arloader lebih dulu.

- [ ] **B4 · `P1` · `S` · Backup & restore belum bisa diakses.**
      `backupService.js` sudah ada tetapi tidak muncul di UI. Penting: koleksi
      lagu & catatan hilang kalau ganti HP.

- [ ] **B5 · `P1` · `M` · Antrean unduhan multi-link.**
      Kode antrean sudah ada di Arloader, tetapi belum menampilkan progres
      per item. Sambungkan dengan B1.

- [ ] **B6 · `P2` · `M` · Halaman artis & album di ArMusic.**

- [ ] **B7 · `P2` · `M` · Urutkan ulang antrean (drag/hapus per item).**

- [ ] **B8 · `P2` · `S` · Halaman riwayat putar.**
      Data sudah disimpan (`armusic_recent_plays`), belum ada halaman yang
      menampilkannya selain 3 kartu di homescreen.

---

## C. Bahasa

**Keputusan:** pakai **setting bahasa (Indonesia / English)**, default Indonesia.
Bukan mengganti semua ke Inggris — karena sebagian istilah memang harus tetap
Inggris, dan sebagian pengguna lebih nyaman Indonesia.

**Yang TIDAK diterjemahkan** (tetap sama di kedua bahasa):
nama modul (ArMusic, Arloader, ArNote, …), format file (MP3 320, MP4 720, 4K),
nama platform (TikTok, Instagram, YouTube, Spotify), istilah teknis baku
(Session ID, QR, URL, APK).

- [ ] **C1 · `P0` · `L` · Bangun kerangka i18n.**
      Belum ada infrastruktur sama sekali. Perkiraan: **±380 string di 45 file**
      (265 teks di JSX + 116 placeholder/label atribut).
      Tahap: (1) konteks bahasa + kamus + fallback → (2) terjemahkan 4 permukaan
      utama (Homescreen, ArMusic, Arloader, Pengaturan) → (3) sisanya bertahap.
      Tambahkan pemilih bahasa di Pengaturan.

- [ ] **C2 · `P1` · `S` · Bersihkan istilah Inggris di teks Indonesia.**
      `ANALYZE & DOWNLOAD`, `PIPELINE`, `DONE / IDLE`, `SANDBOX`, `AUTO DETECT`
      → padanan Indonesia yang sederhana. (Bisa digabung dengan C1.)

---

## D. Teknis & rilis

- [ ] **D1 · `P1` · `S` · Panduan pasang untuk teman.**
      Satu halaman: cara menambah repo di Obtainium, cara update, dan apa yang
      terjadi kalau lupa update (sertifikat sama → bisa menimpa langsung).

- [ ] **D2 · `P2` · `S` · Cek pemeriksa update bawaan.**
      `UpdateChecker.jsx` sudah ada — pastikan benar-benar memberi tahu saat ada
      versi baru, tanpa mengganggu.

- [ ] **D3 · `P2` · `S` · Audit ukuran APK (16,4 MB).**
      Pastikan tidak ada aset besar yang tidak terpakai.

---

## Sudah selesai

| Versi | Isi |
|---|---|
| v1.9.2 | Perbaikan pemutaran & antrean awal |
| v1.9.3 | Resolver audio: urutan layer, cache, yt-dlp |
| v1.9.4 | Ekstraksi audio di HP (NewPipeExtractor) — tanpa server |
| v1.9.5 | Antrean pencarian tidak lagi melompat ke lagu unduhan |
| v1.9.6 | Layout responsif ala Spotify + kartu Hasil Teratas |
| v1.9.7 | Bagian atas diringkas: 5 lapis bar → 3 |
| v1.9.8 | Homescreen bento + status pemutar tersimpan |
| v1.9.9 | Tiga gaya kartu di bagian Alat |
| v1.9.10 | Arloader dirapikan: satu tombol pengaturan, platform strip, tanpa BETA |

**Gagal / ditunda**

- Antrean unduhan dengan progres per item (butuh B1 + B5 sekaligus)
- Dukungan Twitter & Pinterest di Arloader — kartunya tidak pernah punya aksi klik
