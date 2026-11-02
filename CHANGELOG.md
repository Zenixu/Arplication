# Changelog — Arplication

Semua perubahan penting pada proyek ini didokumentasikan di berkas ini.

Format berbasis [Keep a Changelog](https://keepachangelog.com/id/1.0.0/),
dan proyek ini mematuhi [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.9.13] - 2026-11-02

# v1.9.13 — Bottom nav rata & label tidak terpotong

## Perbaikan
- **Kelima item bottom nav sekarang selebar sama.** Sebelumnya memakai
  `justify-around` sehingga lebar tombol mengikuti panjang label ("Hub" vs
  "Arloader") dan celahnya tidak rata. Sekarang tiap tombol `flex-1`:
  **66px** di layar 360, **72px** di 390, **86px** di desktop — sama semua.
- **Titik hijau di tab ARLOADER dihapus.** Titik itu statis (badge `'Active'`)
  dan tidak pernah hilang walau menu sudah dibuka — lama-lama pengguna terbiasa
  mengabaikan tanda notifikasi.

## Ikut diperbaiki
- **Nama kartu ALAT tidak terpotong lagi di layar kecil.** Di 360px,
  "ARTOOLBOX" sempat jadi "ARTOOLB…" setelah teks diperbesar di v1.9.11.
  Padding horizontal kartu tinggi dikurangi dan ukuran nama disesuaikan
  (10px di HP, 11px di layar lebar).
- **Keterangan di kartu tinggi (Ardoro, Artoolbox) dinaikkan dari 7,5px ke 10px**
  — sebelumnya terlewat dari perbaikan ukuran teks di v1.9.11.

## Verifikasi
Diperiksa di 360px, 390px, dan 1024px: **tidak ada** teks yang terpotong, dan
kelima item nav berukuran identik.

## [1.9.12] - 2026-11-02

# v1.9.12 — Kartu "Pipeline Status" dihapus

## Perbaikan
- **Kartu "ANTREAN UNDUHAN / PIPELINE STATUS" di bawah halaman Arloader dihapus.**
  Kartu itu menampilkan tiga hal yang bermasalah:
  - `SANDBOX 100%` — tidak ada artinya; aplikasi tidak memakai sandbox.
  - `EST. STORAGE` — **angka karangan**: jumlah unduhan dikali 12 MB, bukan
    ukuran file sebenarnya.
  - `DOWNLOADS` + `0 DONE` — mengulang jumlah yang sudah tertulis di judul
    kartu Riwayat Unduhan.
- **Ditambah keterangan saat riwayat masih kosong:** "Belum ada unduhan.
  Hasilnya akan muncul di sini." — supaya halaman tidak terasa kosong sebelum
  ada unduhan pertama.
- Kode perhitungan `estimatedBytes` dan impor `formatFileSize` yang tidak dipakai
  lagi ikut dibersihkan.

## Catatan
Antrean multi-link tetap punya panelnya sendiri ("Antrean Multi-Link 2/5") yang
menampilkan progres nyata, jadi tidak ada informasi yang hilang.

## [1.9.11] - 2026-11-02

# v1.9.11 — Teks lebih mudah dibaca

## Perbaikan
- **Ukuran teks minimum dinaikkan.** Ada 87 elemen yang memakai 8–9,5px (setara
  ±2,1 mm di layar HP — di bawah batas nyaman baca). Sekarang:
  - 8px & 8,5px → **10px**
  - 9px & 9,5px → **11px**
  Perubahan berlaku di 21 file, termasuk kartu-kartu homescreen, tab ArMusic,
  Arloader, dan label bottom nav.
- **Kartu ARTOOLBOX tidak lagi terpotong** ("ARTOOLB…") setelah teks diperbesar —
  padding kartu tinggi dikurangi 2px supaya nama muat.
- **Deskripsi di kartu lebar (ARLOADER/ARMUSIC) boleh dua baris**, jadi tidak
  terpotong jadi "Unduh video & a…".
- **Kolom tempel link Arloader dirapikan.** Placeholder dipendekkan jadi
  "Tempel tautan di sini…" dan tinggi kolom ditambah, karena teks panjang
  sebelumnya terpotong di tepi bawah. Tombol utama ikut naik jadi 12,5px.

## Verifikasi
- Kelima tab (HUB, ARLOADER, ARMUSIC, ARMaps, TOOLBOX) diperiksa: **tidak ada**
  teks yang meluap dari kotaknya.

## [1.9.10] - 2026-11-02

# v1.9.10 — Arloader dirapikan

## Perbaikan
- **Tombol "Hub" di halaman Arloader dihapus.** Bottom nav sudah punya HUB, jadi
  tombol itu hanya mengulang.
- **Dua tombol pengaturan digabung jadi satu.** Sebelumnya ada tombol folder dan
  tombol gear yang ternyata membuka modal yang sama — membingungkan pengguna baru.
  Sekarang satu tombol **Pengaturan**, dan folder tujuan tampil sebagai baris
  "Simpan ke: …" di dalam kartu input (bisa diketuk untuk mengubah).
- **Badge "BETA" dihapus** dari halaman Arloader.
- **Informasi pembuat & kontak dihapus dari modal pengaturan** — sudah ada di
  modul Aruthtale. Modal sekarang berisi 4 bagian: folder utama, subfolder,
  format penamaan, dan Instagram Session ID.
- **Bagian platform dipadatkan.** Dulu 6 kartu dalam 2 kolom (6 baris) dengan
  label dan tag format. Sekarang satu baris chip berisi logo asli tiap platform
  (TikTok, Instagram, YouTube, Spotify) yang bisa digeser ke samping.

## Teknis
- Logo platform diambil dari **simple-icons** (open source) dan disimpan lokal di
  `public/platforms/*.svg` — jadi tetap tampil tanpa internet, tidak mengambil
  gambar dari server saat aplikasi dipakai.

## [1.9.9] - 2026-11-02

# v1.9.9 — Tiga gaya kartu di bagian Alat

## Perbaikan
- **Kartu lebar (ARLOADER, ARMUSIC):** logo sekarang memenuhi sisi kiri setinggi
  kartu, separuh kanan berisi nama + informasi. Sebelumnya logo kecil dan sisa
  kanan kosong.
- **Kartu kotak (Armaps, Arnotes, Aruthtale, Argame):** logo diperbesar dan
  diletakkan di tengah, teks di bawahnya juga di tengah. Tanpa informasi tambahan.
- **Kartu tinggi (Ardoro, Artoolbox):** logo diperbesar di bagian atas (tengah),
  nama + informasi di bawahnya, rata tengah.
- Ukuran logo menyesuaikan jenis kartu (56px di kartu lebar, 48px di kartu tinggi,
  40px di kartu kotak), jadi tidak ada lagi ruang kosong menganggur di tengah kartu.

## [1.9.8] - 2026-11-02

# v1.9.8 — Homescreen bento

## Baru
- **Homescreen baru, bukan grid seragam lagi.** Empat bagian:
  - **Sedang berjalan** — kartu pemutar hitam berisi lagu yang sedang diputar,
    progress bar, dan waktu. Ketuk untuk membuka ArMusic.
  - **Terakhir diputar** — tiga kartu geser ke samping.
  - **Aktivitas** — jumlah file terunduh (Arloader) dan catatan yang di-pin (ArNote).
  - **Alat** — bento 4 kolom: kartu lebar (ARLOADER, ARMUSIC), kartu tinggi
    (Ardoro, ArToolbox), dan kartu kotak. Tombol "lihat semua" membuka daftar
    lengkap berisi deskripsi tiap modul.
- **Status pemutar tersimpan** (`src/services/nowPlaying.js`). ArMusic menulis
  potret "sedang diputar" + riwayat putar tiap 5 detik, jadi homescreen bisa
  menampilkannya tanpa membuka modul lebih dulu.

## Perbaikan
- Banner kuning besar "Ruang Utilitas Terpadu" dihapus — judul aplikasi sudah ada
  di header, jadi tidak perlu diulang.
- Angka di kartu aktivitas diambil dari data nyata (riwayat unduhan & catatan
  yang di-pin). Kalau belum ada data, tampil 0 dengan keterangan, bukan angka
  karangan.

## Catatan
- Desain: `~/figcraft/home-redesign.figcraft` (frame "Home · Opsi B — Feed").

## [1.9.7] - 2026-11-02

# v1.9.7 — Bagian atas diringkas

## Perbaikan
- **Bar sebelum konten turun dari 5 lapis jadi 3** di HP: header aplikasi → tab
  (Beranda/Cari/Pustaka) → kolom pencarian. Baris judul + jumlah lagu + tombol
  EQ/sleep disembunyikan di HP (EQ & sleep tetap bisa dibuka dari pemutar layar
  penuh, dan tetap tampil di sidebar layar lebar).
- **Satu kolom pencarian saja di tab Cari.** Pencarian koleksi dipindah ke tab
  Pustaka, tempatnya memang di situ. Sebelumnya dua kolom pencarian bertumpuk
  dalam satu layar.
- **Kotak berbingkai ganda di tab Cari dihapus** — panel YouTube Music tidak lagi
  dibungkus kartu berbingkai tebal.
- **Header global diringkas di HP**: badge tab aktif (titik hijau berdenyut) dan
  subjudul "MORI SUITE • BENTO" disembunyikan di layar sempit — keduanya
  duplikasi dari bottom nav dan judul aplikasi.
- Tab utama dibuat lebih ringan (garis 2px, bayangan 2px) supaya tidak bersaing
  dengan kartu konten.

## Catatan
- Tombol "Hub" di dalam ArMusic dihapus — bottom nav sudah punya HUB.

## [1.9.6] - 2026-11-02

# v1.9.6 — Layout baru: fokus ke musik

## Baru
- **Layout responsif bergaya Spotify.** Di layar lebar (tablet/desktop) muncul
  sidebar berisi navigasi + daftar playlist; di HP tetap tab Beranda/Cari/Pustaka.
  Area konten tidak lagi selebar layar penuh tanpa arah.
- **Kartu "Hasil Teratas"** di tab Cari: hasil pertama ditampilkan besar dengan
  tombol putar bulat, sisanya jadi daftar dua kolom di layar lebar.
- Desain dibuat dulu di FigCraft — sumbernya ada di `docs/design/`
  (`armusic-redesign.figcraft`, plus render `armusic-mobile.png` dan
  `armusic-tablet.png`).

## Perbaikan
- **Tumpang tindih mini player diperbaiki.** Ruang bawah untuk mini player
  dinaikkan dari 64px ke 96px (mobile) / 112px (layar lebar), jadi item terakhir
  tidak lagi tertutup pemutar.
- Subjudul "N lagu · N playlist" tidak lagi tampil dua kali di layar lebar.
- Kontrol equalizer & sleep timer pindah ke sidebar di layar lebar.

## [1.9.5] - 2026-11-02

# v1.9.5 — Antrean pencarian tidak lagi melompat

## Perbaikan
- **"Berikutnya" saat memutar hasil pencarian YouTube tidak lagi melompat ke
  lagu unduhan.** Dulu antrean pemutar selalu diambil dari library, jadi lagu
  dari YouTube dianggap "tidak ada di antrean" dan ExoPlayer lanjut ke lagu
  unduhan pertama. Sekarang antrean = seluruh hasil pencarian, dan tiap item
  di-resolve saat gilirannya tiba.
- Berlaku untuk kedua jalur: ExoPlayer (HP) dan `<audio>` WebView.
- "Sebelumnya" ikut memakai antrean yang sama, dan saat satu lagu habis
  pemutar otomatis lanjut ke hasil berikutnya.
- Lagu yang tidak ada di library dan diputar tanpa antrean (mis. dari feed)
  kini diantrekan sendirian, bukan ditempel ke depan library.
- **Tab Antrean** ikut menampilkan 20 hasil pencarian, bukan daftar lagu unduhan.
- Antrean playlist lokal tetap dipegang ExoPlayer (tidak di-resolve ulang),
  supaya transisi antar lagu unduhan tidak terputus.

## [1.9.4] - 2026-11-02

# v1.9.4 — Tanpa server

## Baru
- **Ekstraksi audio langsung di HP.** APK kini membawa NewPipeExtractor
  (v0.26.5) dan mengekstrak URL audio sendiri lewat OkHttp — tidak ada
  laptop, VPS, atau server yt-dlp yang harus menyala. Diukur di perangkat
  uji: ~3,3 detik per lagu, audio/webm 160 kbps.
- **Pencarian di perangkat.** Tab Cari kini mencari langsung di HP
  (~0,6-1 detik, 20 hasil) sebelum menyentuh Innertube/Piped yang sudah mati.
- **Penanda di tab Cari**: "Ekstraksi audio berjalan di HP ini — tanpa server".

## Berubah
- Server yt-dlp sekarang **opsional** — hanya cadangan kalau ekstraksi
  di perangkat gagal (mis. video dibatasi YouTube).
- Pesan galat membedakan tiga sebab: ekstraksi perangkat gagal, server tidak
  merespons, atau tidak ada sumber sama sekali.
- Ukuran APK 14,5 MB -> 16,4 MB (NewPipeExtractor + Rhino + protobuf).

## Catatan
- Kalau YouTube mengubah sesuatu dan pemutaran mulai gagal, perbaikannya
  adalah menaikkan versi NewPipeExtractor lalu merilis APK baru.

## [1.9.3] - 2026-11-02

# v1.9.3 — Pemutaran jalan lagi

## Perbaikan
- **Rantai sumber audio diurutkan ulang.** yt-dlp sekarang lapis pertama, bukan
  lapis keempat. Sebelumnya Innertube (404), Piped (500), dan Convert1s (451)
  semuanya mati, sehingga pengguna menunggu 60-90 detik sebelum sampai ke lapis
  yang hidup — atau gagal sama sekali.
- **Timeout per lapis dipendekkan** (6-12 detik untuk lapis lama), jadi lapis mati
  tidak lagi menyandera pemutaran.
- **Circuit breaker 24 jam.** Lapis yang gagal dilewati selama 24 jam dan dicoba
  lagi otomatis, bukan diulang setiap kali lagu diputar.
- **Cache URL audio 90 menit.** Lagu yang sudah pernah di-resolve langsung bunyi
  tanpa resolve ulang (URL asli berlaku ~6 jam).
- **Pesan galat yang jelas.** Kalau server yt-dlp belum diatur, pesannya menyebut
  apa yang harus dilakukan, bukan "semua lapis gagal".

## Baru
- **Pencarian cadangan lewat yt-dlp.** `downloader-server.js` kini punya endpoint
  `/search` (yt-dlp `ytsearchN`), dan pencarian YouTube Music memakainya saat
  Innertube/Piped mati. Pencarian kembali berfungsi.
- **Mini player & Now Playing muncul untuk lagu hasil pencarian.** Sebelumnya
  pemutar hanya mengenali lagu yang ada di library; lagu dari YouTube Music
  berbunyi tanpa bisa dikontrol.

## Keamanan
- Kredensial signing tidak lagi disimpan di repo (dibaca dari `android/local.properties`
  atau environment variable). Password keystore diputar; sertifikat APK tidak berubah.

## Catatan
- Untuk memutar lagu YouTube, isi **Pengaturan -> URL yt-dlp server** dengan alamat
  server `scripts/downloader-server.js` kamu (mis. `http://100.x.x.x:8787` lewat Tailscale).

## [1.9.2] - 2026-11-02

# v1.9.2 — ArMusic: tampilan baru

## Baru
- **Kerangka ArMusic baru**: Beranda · Cari · Pustaka, menggantikan satu daftar panjang
  dengan kotak cari di atasnya.
- **Mini player** menetap di atas navigasi bawah (progres, judul, play/jeda, lanjut);
  ketuk untuk membuka pemutar.
- **Pemutar layar penuh** dengan tiga tab: Pemutar · Lirik · Antrean.
- **Lirik interaktif**: bergulir otomatis, baris aktif ditandai, dan baris bisa diketuk
  untuk melompat ke detik tersebut.
- **Antrean** bernomor dengan lagu aktif ditandai; ketuk untuk pindah lagu.
- **Pustaka** dengan empat sub-tab (Lagu · Artis · Folder · Playlist); ketuk artis/folder
  untuk memutar grup itu sebagai antrean.
- **Sheet bawah**: Equalizer (preset + 5 band), Sleep timer (5–60 menit), buat/ubah nama
  playlist, tambah lagu ke playlist.
- Tombol **back** menutup sheet lebih dulu, baru pemutar.

## Catatan
- Mesin audio tidak diubah (ExoPlayer native, foreground service, MediaSession, EQ,
  sleep timer tetap sama). Perubahan murni pada lapisan tampilan.
- Rantai sumber audio YouTube masih perlu perbaikan: beberapa lapis cadangan sudah mati,
  sehingga pemutaran bisa lambat/gagal sebelum mencapai lapis yt-dlp.

## [1.9.1] - 2026-10-06

# v1.9.1

## Perbaikan
- **Ardoro — Mode Jangan Ganggu (DND) kini benar-benar pulih saat timer berhenti.**
  Sebelumnya DND yang dinyalakan otomatis saat fase Fokus bisa "nyangkut" tetap hening
  setelah timer dijeda/dihentikan/selesai, karena pemulihan hanya ada di jalur yang
  tidak pernah dipanggil (`Context.stopService()` tidak menjalankan `onStartCommand()`).
  Pemulihan sekarang ditempatkan di `onDestroy()` yang selalu dipanggil, sehingga DND
  kembali ke kondisi asli pengguna di semua jalur: jeda, reset, selesai, dan transisi
  Fokus → Istirahat.
- **Status DND tidak lagi bisa terbalik.** Pelaporan status kini memakai nilai yang
  benar-benar di-set, bukan membaca ulang filter sistem yang pada sebagian perangkat
  (MIUI) diperbarui dengan jeda.

## Catatan teknis
- Filter notifikasi asli pengguna tetap diingat dan dipulihkan persis (bukan asal
  menyalakan semua notifikasi).
- Diverifikasi di perangkat nyata terhadap status sistem Android asli
  (`dumpsys` interruption filter): Fokus = hening, Istirahat/Berhenti = normal.

---

## [1.9.0] - 2026-10-06

### ArMaps — arah hadap di titik lokasi (dot biru)

Titik "lokasi saya" kini menunjukkan **arah kamu menghadap**, persis seperti Google Maps:

- **Kerucut arah biru** memancar dari dot lokasi ke arah hadap HP.
- Sensor arah menyala **otomatis** begitu "lokasi saya" diaktifkan — tak perlu menekan tombol kompas dulu.
- Arah tetap benar baik saat peta **U↑** (utara di atas) maupun **IKUT** (peta ikut berputar).

### ArMaps — kompas jauh lebih stabil

Kompas tidak lagi "loncat-loncat" saat HP banyak bergerak:

- **Filter halus** (rata-rata sirkular) meredam getaran sensor magnetometer.
- **Lompatan 360°↔0°** ditangani dengan sudut terpendek (350°→10° terbaca +20°, bukan −340°).
- Nilai arah **relatif** tidak lagi menimpa nilai **absolut**, penyebab utama jarum kompas liar.

### Ardoro — mode Jangan Ganggu (hening) otomatis

Saat timer **FOKUS** dimulai, HP otomatis masuk mode **Jangan Ganggu (hening)** — tidak bunyi, tidak bergetar. Begitu istirahat atau sesi selesai, pengaturan notifikasi **dipulihkan persis** seperti semula.

- Panel baru di modul Ardoro: aktifkan izin, atur **Otomatis saat Fokus** atau **Hening Sekarang**.
- ⚠️ Android mewajibkan izin **"Akses Jangan Ganggu"** yang harus diaktifkan manual — gunakan tombol **Buka Pengaturan Izin** di panel (pilih **Arplication → Izinkan**).

Semua tetap 100% offline. Peta memakai data © OpenStreetMap (ODbL).

---

## [1.8.0] - 2026-10-05

### Fitur baru: skala jarak (scale bar) di peta

Kini ada **bilah skala jarak** kecil di kiri bawah peta (di atas badge OFFLINE) — persis seperti di Google Maps. Bilah ini menunjukkan **seberapa jauh jarak di layar HP dibandingkan jarak aslinya di dunia nyata**, mis. "200 m" atau "5 km".

- Angka dan panjang bilah **menyesuaikan otomatis** saat kamu zoom masuk/keluar.
- Nilai dipilih dalam angka bulat yang enak dibaca (1/2/5 × 10ⁿ): 10 m, 20 m, 50 m, 100 m, 200 m, 500 m, 1 km, 2 km, 5 km, …
- Perhitungan memakai proyeksi Web Mercator dengan koreksi lintang, jadi tetap akurat di Indonesia (lintang rendah).
- Berguna untuk **menaksir jarak** dari titik "lokasi saya" ke suatu tempat, dan untuk merasakan skala saat menjelajah peta offline.

Tetap 100% offline dan mengikuti lisensi © OpenStreetMap (ODbL).

---

## [1.7.0] - 2026-10-05

### Fitur baru: zoom lebih dalam + kompas arah HP (U/T/S/B)

**Zoom lebih dalam.** Kedalaman zoom maksimum dinaikkan dari 16 → **19**. Karena data peta (maxzoom 14) otomatis di-*overzoom* oleh MapLibre, kamu bisa masuk jauh lebih dekat ke jalan/perumahan. Ketebalan jalan dan ukuran label ikut disesuaikan sampai z19 supaya tetap enak dibaca. Tombol **+ / −** juga ditambahkan di kanan bawah untuk zoom cepat (selain cubit dua jari).

**Kompas arah HP.** Tombol kompas baru (kanan bawah) membaca sensor orientasi HP (magnetometer) — **tanpa plugin tambahan dan tanpa izin runtime**. Saat kamu memutar HP, mawar kompas menampilkan arah hadap dalam huruf **U / T / S / B** (Utara/Timur/Selatan/Barat) plus derajatnya (mis. "B 265°"), dan jarum tetap menunjuk arah hadap HP.

- Ketuk tombol kompas untuk menyalakan/mematikan.
- Ketuk label arah untuk beralih mode peta:
  - **U↑** = peta selalu utara di atas (default).
  - **IKUT** = peta ikut berputar, sehingga arah hadap HP selalu di atas.
- Bila perangkat tak punya sensor arah, muncul catatan kecil dan peta tetap bisa dipakai normal.

Semuanya tetap 100% offline dan mengikuti lisensi © OpenStreetMap (ODbL).

---

## [1.6.3] - 2026-10-05

### Perbaikan: peta ArMaps tampil kosong (putih) — akar masalah sebenarnya

**Gejala:** setelah memilih wilayah, layar peta tampak kosong berwarna krem, tanpa error apa pun.

**Akar masalah (ditemukan lewat remote-debug WebView di HP):** peta **sudah** ter-render di canvas, tetapi **tidak terlihat**. File `maplibre-gl.css` di-import dinamis **setelah** Tailwind dan menetapkan `.maplibregl-map { position: relative }`. Aturan ini menimpa utilitas Tailwind `absolute` (spesifisitas sama, urutan file belakangan menang), sehingga `inset-0` tak lagi berlaku. Karena canvas-nya `position: absolute` (tidak menyumbang tinggi), container peta **kolaps jadi tinggi 0 px** → peta terpotong habis.

**Perbaikan:** container peta diberi ukuran eksplisit `w-full h-full`, sehingga tetap terukur walau `position` ditimpa menjadi `relative`.

**Verifikasi di HP (Redmi Note 8):** sebelum perbaikan area peta hanya **1 warna** (kosong); sesudah perbaikan **120 warna** — jalan, air, dan label (Cianjur, Bandung, Jakarta, dll.) tampil. Ditambah tes regresi yang gagal bila `w-full`/`h-full` hilang dari container peta.

Catatan: rilis ini juga memuat perbaikan worker MapLibre self-contained dari v1.6.2 (membuat peta lebih tahan terhadap perbedaan WebView).

---

## [1.6.2] - 2026-10-05

### Perbaikan: peta ArMaps blank/putih di HP Android

**Gejala:** setelah memilih wilayah, layar peta kosong (putih) — overlay "Memuat peta…" hilang tapi tidak ada satu pun tile yang tampil. Tidak ada error di layar.

**Akar masalah:** file *worker* MapLibre (`maplibre-gl-worker.mjs`) adalah ES module yang meng-`import` file lain (`maplibre-gl-shared.mjs`). Di WebView Android (Capacitor) hal ini gagal:
- Request yang diinisiasi **worker** tidak dilayani `shouldInterceptRequest` → import ke file sibling gagal **di dalam worker** → worker mati → tidak ada tile termuat (dan error-nya tersembunyi di worker, bukan di konsol halaman).
- WebView lama tidak mendukung *module worker*, sehingga MapLibre jatuh ke *classic worker* atas file `.mjs` yang berisi `import` → `SyntaxError: Cannot use import statement outside a module`.

**Perbaikan:** worker MapLibre kini dibundel menjadi **satu file self-contained** (IIFE, tanpa `import`/`export`) lewat `scripts/build-worker.mjs`, dijalankan otomatis saat `npm run build`. File `maplibre-gl-shared.mjs` yang tidak lagi terpakai dihapus.

**Verifikasi:** direproduksi persis di rig headless (simulasi WebView lama): sebelum perbaikan `sourceLoaded=false` (peta blank), sesudah perbaikan `idle` + `sourceLoaded=true` (peta render). Ditambah tes regresi yang gagal bila worker ESM kembali dipakai.

---

## [1.6.1] - 2026-10-05

## Perbaikan ArMaps — peta & GPS di HP Android

Menambal **dua bug runtime** yang membuat ArMaps tidak bisa dipakai di
perangkat nyata (lolos dari tes otomatis karena menyangkut kontrak API native).

### 🐛 Fixed
- **Peta tidak tampil — stuck di "Memuat peta… Membaca berkas lokal".**
  Pembacaan file peta menunggu penanda "selesai" bernilai `null`, padahal
  native Android menandainya dengan data kosong (`{ data: "" }`). Akibatnya
  pembacaan menggantung selamanya dan peta tak pernah dirender. Kini keduanya
  (null maupun data kosong) dikenali sebagai selesai.
- **GPS selalu gagal walau GPS HP menyala.**
  Plugin lokasi (`@capacitor/geolocation`) tidak ikut terpasang ke dalam APK
  karena proses build memakai `cap copy` (hanya menyalin aset web) alih-alih
  `cap sync` (mendaftarkan plugin native). Kini build memakai `cap sync`,
  dan plugin lokasi terdaftar — GPS "lokasi saya" berfungsi.

### 🧪 Verified
- **192 tes lulus** (termasuk 2 guard baru yang terbukti gagal bila perbaikan
  dibalik: kontrak chunk akhir, dan pendaftaran plugin di gradle).
- APK diverifikasi memuat `GeolocationPlugin` (sebelumnya 0 referensi) dan
  kode perbaikan peta.

> Catatan: perbaikan ini butuh pemasangan ulang APK (plugin native berubah).

---

## [1.6.0] - 2026-10-05

## ArMaps — Peta Offline (Tahap 1)

Modul baru **ArMaps**: peta offline berbasis **OpenStreetMap**, alur
**pilih → unduh → pakai → perbarui → hapus** per-wilayah.

### ✨ Added
- **Modul ArMaps (ke-7)**: peta offline penuh di dalam aplikasi.
  - **Katalog wilayah tanpa default** — pengguna memilih sendiri wilayahnya
    (Jabodetabek, Cianjur, Bandung Raya, Yogyakarta, Semarang, Bali,
    Surabaya, Medan, Makassar). Tidak ada wilayah yang otomatis terpasang.
  - **Unduh sekali, pakai offline**: file `.pmtiles` dibaca per-tile dari
    penyimpanan, jadi RAM tetap hemat dan ukuran APK tidak membengkak.
  - **"Lokasi saya" (GPS)** dengan izin lokasi opsional.
  - **Perbarui = atomic swap**: unduh file baru ke `.tmp` → verifikasi
    header → baru ganti. Gagal di tengah = peta lama tetap aman.
  - **Hapus per-wilayah** dengan konfirmasi.
  - Pilihan lokasi simpan (internal/eksternal) saat mengunduh.
- Data peta dibangun dari snapshot **OpenStreetMap 2026-10-04** (© OpenStreetMap
  contributors, ODbL). Data = "terbaru saat diunduh", bukan live.

### 🐛 Fixed
- **Peta tidak render saat di-bundle** — MapLibre menebak URL worker dari
  `import.meta.url` → worker 404 di bawah bundler Vite sehingga peta kosong.
  Diperbaiki dengan meng-host worker MapLibre sendiri + `setWorkerUrl()`.
  Terverifikasi render penuh di dev **dan** artifact produksi (0 permintaan
  jaringan non-lokal).

### 🧪 Verified
- Uji runtime nyata: peta Jabodetabek ter-render (label Jakarta/Bekasi/Bogor/
  Depok/Bandung/Cianjur tampil), `layers=9`, `styleLoaded=true`.
- Aset rilis `maps-20261004` terverifikasi: HTTP 206 (Range), header PMTiles
  valid, sha256 cocok.
- 188 tes lulus.

### 📦 Aset peta
File peta di-host terpisah di rilis **[maps-20261004](https://github.com/Aruthtale/Arplication/releases/tag/maps-20261004)**
(9 wilayah, ±117 MB) — diunduh dari dalam aplikasi.

---

## [1.5.1] - 2026-10-06

### 🐛 Fixed
- **Label "Barcode" yang menyesatkan**: tool QR diberi nama "QR & Barcode Suite"
  dan deskripsinya menjanjikan pemindaian **Barcode**, padahal pustaka `jsQR`
  **hanya** membaca QR Code (bukan barcode 1D EAN/UPC). Label diperbaiki menjadi
  **"QR Suite"** (badge "QR Code") di kartu Bento, judul header tool, dan catatan
  hasil simpan — agar tidak menjanjikan fitur yang belum ada.

---

## [1.5.0] - 2026-10-06

### ✨ Added
- **Sudoku — batas Hint & kunci angka lengkap**:
  - **Hint dibatasi 3× per game**. Tombol menampilkan sisa jatah — `Hint (3)` → `(2)`
    → `(1)` → `(0)` — lalu otomatis **nonaktif** saat jatah habis. Jatah dihitung
    per game dan direset saat memulai game baru (ikut tersimpan saat keluar-masuk).
  - **Angka yang sudah lengkap (muncul 9×) otomatis dinonaktifkan** di numpad —
    tidak perlu dipakai lagi. Tombol jadi abu-abu, dicoret, dan diberi tooltip
    "Angka N sudah lengkap (9x)". Deteksi **berbasis solusi** (bukan hitungan
    mentah), sehingga salah input berulang tidak mengunci angka secara keliru.
  - Numpad kini menampilkan **jumlah pemakaian** kecil di tiap angka (mis. `7`).
- Helper murni baru di `sudokuGenerator.js`: `MAX_HINTS_PER_GAME`, `canUseHint`,
  `hintsRemaining`, `countNumber`, `countCorrectNumber`, `isNumberComplete`.

### 🧪 Tests
- Tambah `tests/sudoku.test.js` (10 tes): batas hint, sisa jatah, hitungan angka,
  kunci angka berbasis solusi, plus **guard regresi wiring** (numpad memakai
  `numberCounts`, hint memakai `canUseHint`). Total **173** lulus.

### 🐛 Fixed
- **Wiring helper**: pemanggil `isNumberComplete` di komponen tidak ikut diperbarui
  saat signature helper berubah (tambah argumen `solution`) — argumen bergeser dan
  angka tak pernah terkunci. Guard regresi ditambahkan agar tidak terulang.

---

## [1.4.0] - 2026-10-06

### ✨ Added
- **Cadangan & Pemulihan Data (Backup & Restore)**: simpan seluruh data pengguna ke
  **satu file JSON** dan pulihkan kapan saja — terutama setelah pasang ulang aplikasi.
  - Mencakup: pengaturan global, data Arloader, ArMusic (library/playlist/lirik),
    Ardoro (pengaturan/statistik/status timer), ArToolbox, ArGame, serta catatan
    **ArNote** dan draf **ArToolbox PDF Maker** (IndexedDB).
  - Tombol **Cadangkan** & **Pulihkan** di Pengaturan Aplikasi, lengkap dengan
    ringkasan isi (jumlah kunci, catatan, ukuran) dan **modal konfirmasi** sebelum menimpa.
  - Opsi **"Sertakan login"** (default NONAKTIF) untuk token YouTube Music.
    Secara default token login **tidak** ikut ke dalam file cadangan.
  - Validasi file: menolak file asing/rusak/skema lebih baru dengan pesan jelas.
- Helper murni `src/services/backupService.js` + modal `RestoreConfirmModal.jsx`.

### 🧪 Tests
- Tambah `tests/backup.test.js` (12 tes): round-trip, validasi, whitelist, isolasi
  kunci sensitif, ringkasan, penamaan file. Total **163** lulus.

### 🧹 Cleanup
- `AppSettingsModal.jsx`: buang import/state/handler mati (`HardDrive`, `Bell`,
  `ShieldCheck`, `Smartphone`, `Check`, `AlertCircle`, `useEffect`, toggle `notifSound`).

### 📦 Build
- **versionCode**: 34 → **35**
- **versionName**: "1.3.2" → **"1.4.0"**

---

## [1.3.2] - 2026-10-06

### 🐛 Fixed
- **Ardoro — pindah tab fase tidak sengaja menghentikan sesi fokus**: tab fase
  (Fokus / Istirahat / Istirahat Panjang) dulu memanggil `switchPhase` **langsung**,
  sehingga satu ketukan tak sengaja saat timer berjalan menghentikan sesi & mengulang
  dari awal (progres fokus hilang). Kini muncul **modal konfirmasi** ("Pindah Fase?")
  saat timer berjalan dan pindah ke fase berbeda; ada tombol Batal (tetap fokus) & Ya,
  Pindah. Saat timer berhenti, pindah fase tetap langsung tanpa modal.
- **Aruthtale Info — "Informasi Teknis & Rilis" basi**: masih menampilkan
  "Modul Aktif: Arloader & ArNote" dan "Modul Mendatang: Ardoro (Focus Timer)".
  Kini: "Modul Aktif: 6 Modul (Arloader, ArNote, Ardoro, ArMusic, ArToolbox, ArGame)"
  dan "Status Rilis: Stabil • Rilis Publik".

### 🧹 Cleanup
- Hapus import/state mati: `useCallback` & `setAmbientVolume` (ArdoroModule),
  `Shield/ExternalLink/GitBranch/Check/Copy/Heart` + state `copied` + `handleCopyRepo`
  (AruthtaleInfo).

### 🧪 Tests
- Tambah `needsPhaseSwitchConfirm` (guard murni) + tes; guard regresi wiring
  (tab Ardoro memakai `handlePhaseTab`, info modul tidak basi). Total **151** lulus.

### 📦 Build
- **versionCode**: 33 → **34**
- **versionName**: "1.3.1" → **"1.3.2"**

---

## [1.3.1] - 2026-10-06

### 🐛 Fixed
- **Quick Calculator — fokus input hilang tiap ketikan**: komponen `Field`/`Result`
  didefinisikan **di dalam** komponen `QuickCalcView`, sehingga setiap render membuat
  tipe komponen baru dan React me-remount `<input>` → fokus lepas setelah 1 karakter.
  Keduanya kini di-*hoist* ke scope modul (`react/static-components`).
- **Quick Calculator — tab riwayat "Kalkulator" selalu kosong**: helper `logHistory`
  dideklarasikan tapi **tidak pernah dipanggil**. Kini setiap salin-hasil mencatat ke
  riwayat ArToolbox (`toolType: 'calc'`).
- **Quick Calculator — umpan balik salin**: state `copied` kini ditampilkan ("Tersalin
  ke clipboard"); sebelumnya di-set tanpa pernah dirender.
- **PDF Maker**: hapus 3 import ikon (`Upload`, `Layers`, `Sparkles`) yang tidak terpakai.

### 🧪 Tests
- Tambah `tests/nestedcomponents.test.js` (guard regresi): gagal bila ada komponen
  didefinisikan di dalam komponen, dan memastikan `Field`/`Result` tidak kembali nested.
- Total tes: **148** lulus (dari 146).

### 📦 Build
- **versionCode**: 32 → **33**
- **versionName**: "1.3.0" → **"1.3.1"**

---

## [1.3.0] - 2026-10-06

### 🎉 New
- **Ardoro Focus Lock — Mode Ketat Level 3 (Jeda Wajib)**:
  - Saat sesi fokus berjalan, mematikan blokir **tidak lagi instan**: muncul hitungan mundur (default **10 detik**, bisa diatur 3–60 detik).
  - Pesan peringatan kontekstual sesuai lama fokus (mis. "Fokusmu sudah 25 menit. Sungguh mau berhenti sekarang?").
  - Tombol **Batal** membatalkan dan tetap fokus; hitungan selesai baru mematikan blokir.
  - Tidak mengunci permanen: timer habis tetap membebaskan pengguna.
- **ArToolbox — Text & Dev Tools** (kartu baru):
  - Case converter: UPPER, lower, Title, Sentence, camelCase, PascalCase, snake_case, kebab-case, slug, aLtErNaTiNg, reverse.
  - Utak-atik baris: urutkan A→Z / Z→A, hapus duplikat, hapus baris kosong, rapikan spasi.
  - Penghitung teks: kata, karakter, tanpa spasi, baris, kalimat, paragraf, estimasi waktu baca.
  - Base64 encode/decode (aman Unicode/emoji) & Hash SHA-1/256/512.
  - JSON formatter (rapikan/perkecil) dengan validasi error.
  - Lorem Ipsum generator (kata/kalimat/paragraf).
- **ArToolbox — Quick Calculator** (kartu baru):
  - Diskon, markup, PPN (eksklusif/inklusif), kalkulator persen & perubahan nilai.
  - Rasio aspek, konversi satuan (panjang, berat, luas, volume, data, waktu, suhu).
  - Hitung umur & selisih dua tanggal, bagi tagihan rata + tip.
- **PDF Maker — Halaman Teks (Teks → PDF)**:
  - Selain foto, kini bisa menulis/menempel teks menjadi halaman PDF (auto-paginasi bila panjang).
  - Generator PDF diekstrak ke `src/utils/pdfBuilder.js` (pure, testable, tanpa library).
- **ArNote → PDF** (integrasi antar-modul):
  - Ekspor satu catatan ke PDF (tombol di setiap kartu catatan).
  - Ekspor **semua** catatan yang tampil sekaligus ke satu PDF.
  - Markdown ringan dibersihkan agar rapi di PDF.

### 📦 Build
- **versionCode**: 31 → **32**
- **versionName**: "1.2.0" → **"1.3.0"**
- 48 tes unit baru (total **146** lulus): `focuslock`, `texttools`, `calctools`, `pdfbuilder`, `notepdf`.

---

## [1.2.0] - 2026-10-05

### 🎉 New
- **Ardoro Focus Lock (App Blocker)**:
  - Blokir aplikasi (TikTok, Instagram, Discord, dll.) selama sesi fokus Ardoro berjalan.
  - Deteksi real-time via **Accessibility Service** (`AppBlockerAccessibilityService`); saat aplikasi terblokir dibuka, Ardoro menampilkan overlay bertema "Fokus Dulu!" lalu melempar user kembali ke Home.
  - Dua mode: **Blacklist** (blokir yang dicentang) atau **Whitelist** (hanya yang dicentang yang boleh dibuka).
  - Aktif **otomatis saat fase fokus** (bisa dimatikan), plus toggle manual.
  - Panel pengaturan di modul Ardoro: pilih aplikasi dengan ikon, pencarian, dan status izin.
  - Izin: Accessibility (wajib) + Overlay `SYSTEM_ALERT_WINDOW` (opsional, untuk overlay).

### 📦 Build
- Izin baru: `SYSTEM_ALERT_WINDOW`, `QUERY_ALL_PACKAGES`.
- Plugin native baru: `AppBlockerPlugin` + `AppBlockerStore` (SharedPreferences).
- **versionCode**: 30 → **31**
- **versionName**: "1.1.0" → **"1.2.0"**

---

## [1.1.0] - 2026-09-24

### 🎉 New
- **ArMusic Homescreen Widget**:
  - Widget rumah gaya neobrutalisme dengan judul lagu, artis, album, dan indikator status (MEMUTAR / JEDA / OFFLINE).
  - Tombol putar/jeda, lagu berikutnya, dan lagu sebelumnya langsung dari layar utama — bahkan saat aplikasi tertutup.
  - Klik bodi widget membuka aplikasi langsung ke tab ArMusic (deep-link `OPEN_ARMUSIC`).
  - Sinkron otomatis dengan `ArMusicService`; state kembali ke OFFLINE saat antrean berhenti atau service dihentikan.
- **ArGame (Tahap 1)**: Modul permainan baru dengan Sudoku, plus integrasi logo ArToolbox ke HomeHub.

### 🐛 Fixed
- **Pengujian scrapers**: Fixture `resolveSubfolderPath` diperbarui agar konsisten dengan pemindahan folder unduhan ke `Aruthtale/`.

### 📦 Build
- **versionCode**: 29 → **30**
- **versionName**: "1.0.0" → **"1.1.0"**

---

## [1.0.0] - 2026-09-21

### ⚡ Enhanced
- **Mori Dual-Engine YouTube Converter**:
  - Mengadopsi arsitektur converter dual-engine dari coflyn/Mori (`ytmp3.mobi` & `convert1s / ytmp3.gg`).
  - Timeout konversi Cloudflare diperlonggar hingga 30s dengan auto-retry.
  - Menambahkan platform custom download headers (`Origin` & `Referer`) agar stream download YouTube tidak ditolak CDN.

### 📦 Build
- **versionCode**: 21 → **22**
- **versionName**: "0.2.20" → **"0.2.21"**

---

## [0.2.20] - 2026-09-17

### 🐛 Fixed
- **DNS / Dead Host Resolution Error**:
  - Menghapus host mati (`pipedapi.mha.fi`, `pipedapi.tokhmi.xyz`, `pipedapi.garudalinux.org`) dari failover list.
  - Memetakan error DNS/jaringan (`unable to resolve host`) ke pesan ramah bahasa Indonesia.

### 📦 Build
- **versionCode**: 20 → **21**
- **versionName**: "0.2.19" → **"0.2.20"**

---

## [0.2.19] - 2026-09-17

### 🐛 Fixed
- **Root-Cause Fix YouTube 410 Gone**:
  - ymcdn converter kini menunggu polling progress hingga selesai (`progress === 3`) sebelum mengunduh link stream.
  - Opsi unduh YouTube di-resolve on-demand secara real-time saat user menekan tombol download dengan status progress visual.
- **Notifikasi Menumpuk (Spam Notification Tray)**:
  - Notifikasi download error & complete kini menggunakan ID tetap (fixed ID) dan auto-cancel notifikasi lama sehingga tidak menumpuk di status bar Android.

### 📦 Build
- **versionCode**: 19 → **20**
- **versionName**: "0.2.18" → **"0.2.19"**

---

## [0.2.18] - 2026-09-17

### 🐛 Fixed
- **YouTube HTTP 410 (Gone) Stream Expiration**:
  - Implementasi lazy & on-demand resolver saat tombol download ditekan agar URL stream YouTube selalu fresh.
  - Penanganan auto-retry otomatis jika URL stream kadaluarsa saat proses download berlangsung.
  - Deteksi dan pesan error ramah pengguna untuk status `410 Gone`.

### ✨ Added
- **YT-DLP Self-Hosted Server Support**:
  - Dukungan koneksi server yt-dlp remote pribadi melalui menu Pengaturan Arloader.
  - Endpoint resolver & stream downloader cadangan via yt-dlp backend.

### 📦 Build
- **versionCode**: 18 → **19**
- **versionName**: "0.2.17" → **"0.2.18"**

---

## [0.2.10] - 2026-09-15

### 🐛 Fixed
- **Arloader Spotify "Upstream HTML block page"** — Resolver Spotify kini memberi pesan Indonesia yang jelas (anti-bot, saran unduh satu per satu) alih-alih error teknis mentah:
  - `isBotBlockError()` di `src/services/scrapers/youtube.js` kini mendeteksi pola halaman blokir (`HTML error/block page`, `upstream server returned`, Cloudflare `attention required` / `just a moment`, `LOGIN_REQUIRED`, HTTP 502/525)
  - `formatResolverError()` memetakan error blokir ke pesan "YouTube/Piped sedang memblokir permintaan otomatis… unduh track satu per satu"
  - `formatDownloadError()` di `src/utils/download.js` memetakan halaman blokir ke panduan anti-bot Indonesia
- **Prune daftar instance Piped mati** — `PIPED_API_INSTANCES` dipangkas dari 14 → 2 instance yang terverifikasi hidup via curl (HTTP 200 + JSON valid):
  - ✅ `pipedapi.ducks.party` (primary), ✅ `api.piped.private.coffee` (failover)
  - ❌ Dihapus: kavin.rocks (525), adminforge.de (403), leptons.xyz (502), reallyaweso.me (502), nosebs.ru / privacy.com.de / api.piped.yt / drgns.space / codespace.cz / darkness.services (DNS mati), owo.si (timeout), orangenet.cc (502)
  - Dampak: failover Spotify→YouTube audio kini ~2 percobaan alih-alih 14 timeout beruntun

### 🧪 Tests
- 3 regression test baru di `tests/scrapers.test.js` (total 50/50 pass, lint 0 errors):
  - `formatResolverError` memetakan HTML block page → pesan "memblokir" + "satu per satu"
  - `PIPED_API_INSTANCES` bebas dari 12 host mati yang diketahui
  - `formatDownloadError` memetakan HTML block page → panduan anti-bot

### 📦 Build
- **versionCode**: 11 → **12**
- **versionName**: "0.2.9" → **"0.2.10"**

---

## [0.2.7] - 2026-09-15

### ✨ Added
- **Notification Permission UI** — Cek dan request izin notifikasi langsung dari Settings card
- **Background Timer Persistence** — Timer tetap berjalan saat navigasi antar modul atau app di-minimize
- **Android Foreground Service** — Service khusus untuk keep-alive timer di background dengan sticky notification
- **Dedicated Notification Channel** — Channel `ardoro_timer` dengan importance tinggi dan explicit sound

### 🐛 Fixed
- **Timer Reset on Navigation** — State timer sekarang di-persist ke localStorage (`ardoro_timer_state_v1`)
- **Timer Dies on Minimize** — Android Foreground Service keep-alive timer saat app background
- **Missing Notification Check** — Status permission (AKTIF/NONAKTIF/DITOLAK) kini terlihat di Settings
- **Notification Sound Missing** — Channel dan notifikasi sekarang explicitly request system sound

### 📦 Build
- **versionCode**: 8 → **9**
- **versionName**: "0.2.6" → **"0.2.7"**

---

## [0.2.6] - 2026-09-14

### ✨ Added
- Auto-update flow dengan native APK installer
- ArNote Module dengan sticky & list widgets
- Arloader support untuk TikTok, Instagram, YouTube

---

## [0.2.5] - 2026-09-10

### ✨ Added
- Initial release of Ardoro Focus Engine
- WebAudio offline chime sounds
- Local statistics tracking (today + 7-day history)
