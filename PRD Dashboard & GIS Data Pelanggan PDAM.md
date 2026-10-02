# PRD: Dashboard & GIS Data Pelanggan PDAM Tirta Ardhia Rinjani

|  |  |
| --- | --- |
| **Versi** | 1.2 (draf; kode pelanggan 9 digit, kode wilayah, warna per wilayah) |
| **Tanggal** | 1 Oktober 2026 |
| **Pemilik produk** | Muh Sofiyan Hawari (Bidang IT) |
| **Status** | Draf untuk ditinjau tim perapian data |

---

## 1. Ringkasan

Modul web internal untuk menampilkan **data pelanggan PDAM yang sudah dirapikan** dalam bentuk **dashboard** (angka dan grafik) dan **peta GIS** (sebaran titik pelanggan berwarna per wilayah, mis. 0701 merah dan 0702 hijau). Data dimasukkan lewat **upload file** oleh admin, sehingga tampilan berupa potret (snapshot) data pada tanggal upload, bukan realtime.

Modul memiliki 3 menu di sidebar: **Dashboard**, **GIS**, dan **Settingan** (tempat upload).

## 1A. Struktur Kode dan Warna Wilayah

**Kode pelanggan: `KKWWxxxxx`** (contoh `0701xxxxx`)

- `KK` = kode kecamatan (07 = Praya Barat; kecamatan lain 01, 02, dst menyusul)
- `WW` = kode wilayah dalam kecamatan (digit ke-3 dan 4)
- `xxxxx` = nomor pelanggan (5 digit). Total kode pelanggan **9 digit**
- **Kode wilayah** = 4 digit depan (`KKWW`). Semua kode disimpan sebagai **teks** agar angka nol di depan tidak hilang.

**Warna titik di GIS ditentukan per kode wilayah**, diatur admin di menu Settingan. Contoh: 0701 merah, 0702 hijau, dan seterusnya.

**Tahap awal: kecamatan 07 (Praya Barat)**

| Kode | Wilayah | Warna |
| --- | --- | --- |
| 0701 | Karang Dalam | Merah |
| 0702 | Kateng | Hijau |
| 0703 | Gabak | Diatur admin |
| 0704 | Bonder | Diatur admin |
| 0706 | BTN Salva Batujai | Diatur admin |
| 0709 | Penujak | Diatur admin |
| 0710 | Karang Daye | Diatur admin |
| 0712 | Kebonre | Diatur admin |
| 0717 | Batujai | Diatur admin |
| 0720 | Wage | Diatur admin |
| 0721 | Tongkik | Diatur admin |
| 0722 | Dandung | Diatur admin |
| 0723 | Ketangge | Diatur admin |
| 0725 | KR Puntik | Diatur admin |
| 0726 | Jomang | Diatur admin |
| 0727 | Batu Lajang | Diatur admin |
| 0728 | Lakah | Diatur admin |
| 0729 | Montor | Diatur admin |
| 0730 | Lolat | Diatur admin |
| 0732 | Kentawang - SL Paok | Diatur admin |

**Prioritas saat ini:** titik pelanggan dapat tampil benar di GIS. Hal lain (golongan, status, dashboard lanjutan, penanganan pelanggan pindah wilayah) menyusul.

## 2. Latar Belakang dan Masalah

- Data pelanggan tersebar dan tidak seragam, terutama penulisan lokasi (kecamatan/desa) dan koordinat.
- Tim perapian data membutuhkan cara memantau progres dan kualitas data.
- Pimpinan dan unit terkait membutuhkan gambaran sebaran pelanggan per wilayah secara visual.
- Pengecekan lokasi pelanggan di lapangan belum didukung peta yang mudah dibuka.

## 3. Tujuan dan Metrik Keberhasilan

| Tujuan | Metrik | Target awal |
| --- | --- | --- |
| Menampilkan data pelanggan yang konsisten | Persentase data lolos validasi | ≥ 95% setelah perapian |
| Memantau kualitas data | Jumlah data bertanda (flag) berkurang tiap periode | Tren menurun |
| Peta ringan dan stabil | Waktu muat peta untuk 10.000 titik | ≤ 3 detik di jaringan normal |
| Upload mudah dan aman | Upload gagal karena format salah dapat dipahami penggunanya | Pesan error jelas, data lama tidak rusak |
| Mempermudah verifikasi lapangan | Titik pelanggan dapat dibuka di peta eksternal | 1 klik dari popup |

## 4. Ruang Lingkup

**Termasuk (In scope)**

- Upload file data pelanggan (Excel/CSV) beserta validasi dan riwayat upload. Tahap awal hanya kecamatan 07 (Praya Barat); kecamatan lain menyusul.
- Dashboard ringkasan dan kualitas data.
- Peta GIS titik pelanggan berwarna per wilayah, filter, popup detail, dan tombol buka di peta eksternal.
- Pembagian akses admin dan pengguna biasa.

**Tidak termasuk (Out of scope, fase ini)**

- Data realtime atau sinkronisasi otomatis dengan sistem billing.
- Edit data pelanggan langsung di aplikasi (perbaikan dilakukan di file sumber lalu diupload ulang).
- Data jaringan pipa dan aksesoris (ditangani aplikasi monitoring aksesoris terpisah, dipertimbangkan untuk integrasi fase berikutnya).
- Aplikasi mobile native (cukup web responsif/PWA).

## 5. Pengguna dan Peran

| Peran | Kebutuhan | Hak akses |
| --- | --- | --- |
| **Admin data** | Upload data, melihat riwayat, mengatur acuan wilayah dan warna | Semua menu, termasuk Settingan |
| **Tim perapian/verifikator** | Melihat data bertanda dan lokasi pelanggan | Dashboard, GIS (detail pelanggan) |
| **Pimpinan/unit terkait** | Melihat ringkasan dan sebaran | Dashboard, GIS (data agregat) |

> Detail pribadi pelanggan (nama, alamat, titik rumah) hanya terlihat oleh peran yang berwenang.

## 6. Alur Pengguna Utama

1. Tim perapian merapikan data di file master mengikuti template.
2. Admin membuka **Settingan**, mengunduh template bila perlu, lalu mengupload file.
3. Sistem memvalidasi file. Jika ada error, ditampilkan laporan dan data lama tetap dipakai. Jika lolos, data baru menggantikan data aktif dan tercatat di riwayat.
4. Pengguna membuka **Dashboard** untuk ringkasan dan kualitas data.
5. Pengguna membuka **GIS**, memfilter wilayah, mengklik titik, dan membuka lokasinya di Google Maps/Street View bila perlu.

## 7. Kebutuhan Fungsional

### 7.1 Menu Dashboard

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| D-1 | Kartu ringkas: total pelanggan, aktif, nonaktif, jumlah per golongan tarif | Wajib |
| D-2 | Grafik jumlah pelanggan per wilayah (dan per kecamatan setelah kecamatan lain masuk) | Wajib |
| D-3 | Grafik komposisi golongan dan status sambungan | Wajib |
| D-4 | Indikator kualitas data: % data lengkap, jumlah koordinat kosong/tidak valid, jumlah data bertanda | Wajib |
| D-5 | Label **"Data per \[tanggal upload\]"** yang selalu terlihat | Wajib |
| D-6 | Filter kecamatan, wilayah, golongan, status; semua kartu dan grafik ikut berubah | Wajib |
| D-7 | Tabel data dengan pencarian dan ekspor (sesuai hak akses) | Sebaiknya |
| D-8 | Warna per wilayah sama dengan di peta GIS | Wajib |

### 7.2 Menu GIS

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| G-1 | Peta menampilkan titik pelanggan, diwarnai per wilayah sesuai warna yang diatur (mis. 0701 merah, 0702 hijau), dengan legenda berisi kode dan nama wilayah | Wajib |
| G-2 | Basemap dapat diganti: jalan (OpenStreetMap), satelit, hybrid | Wajib |
| G-3 | Clustering saat zoom jauh; titik individual saat zoom dekat | Wajib |
| G-4 | Filter kecamatan, wilayah, golongan, status (sinkron dengan Dashboard); legenda dapat diklik untuk menampilkan atau menyorot satu wilayah | Wajib |
| G-5 | Klik titik membuka popup: kode pelanggan, wilayah, golongan, status (detail pribadi sesuai hak akses) | Wajib |
| G-6 | Tombol di popup: **Buka di Google Maps** dan **Street View** berdasarkan koordinat | Wajib |
| G-7 | Opsi tampilan batas wilayah (poligon) bila datanya tersedia | Opsional |
| G-8 | Pencarian pelanggan berdasarkan kode pelanggan, peta langsung menuju titiknya | Sebaiknya |
| G-9 | Tombol "lokasi saya" untuk membantu petugas lapangan | Opsional |

### 7.3 Menu Settingan (Upload)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| S-1 | Unggah file Excel/CSV, dengan **template** yang dapat diunduh | Wajib |
| S-2 | **Validasi saat upload** (lihat bagian 8); tampilkan laporan error per baris dan kolom | Wajib |
| S-3 | Data lama **tidak tertimpa** bila validasi gagal | Wajib |
| S-4 | Pilihan mode: ganti seluruh data, atau perbarui berdasarkan ID pelanggan | Sebaiknya |
| S-5 | Riwayat upload: waktu, pengunggah, nama file, jumlah baris, hasil; dapat mengembalikan ke versi sebelumnya | Wajib |
| S-6 | Pengaturan tabel acuan wilayah (kode, nama) dan **warna tiap kode wilayah** | Wajib |
| S-7 | Menu hanya dapat diakses admin | Wajib |

## 8. Aturan Data dan Validasi

**Template kolom (usulan, disesuaikan dengan data PDAM)**

| Kolom | Wajib | Aturan |
| --- | --- | --- |
| `kode_pelanggan` | Ya | Teks, unik, format `KKWWxxxxx`, tepat 9 digit |
| `nama_pelanggan` | Ya | Teks |
| `alamat` | Tidak | Teks |
| `kode_kecamatan` | Turunan | 2 digit depan kode pelanggan |
| `kode_wilayah` | Turunan | 4 digit depan kode pelanggan (KKWW); harus ada di tabel acuan wilayah |
| `golongan` | Tidak (menyusul) | Nilai baku golongan tarif |
| `status_sambungan` | Tidak (menyusul) | Aktif / Nonaktif / Putus (nilai baku) |
| `latitude` | Ya | Desimal, WGS84, rentang wajar wilayah layanan |
| `longitude` | Ya | Desimal, WGS84, rentang wajar wilayah layanan |

**Aturan validasi**

1. Kolom wajib tidak boleh kosong.
2. `kode_pelanggan` unik, bertipe teks, tepat 9 digit, hanya angka, tanpa spasi tersembunyi.
3. 4 digit depan kode pelanggan harus ada di tabel acuan wilayah.
4. Koordinat berformat desimal; bukan 0; lat dan long tidak tertukar; berada dalam area kecamatan yang bersangkutan (tahap awal: Praya Barat).
5. Bila ada kolom wilayah terpisah di file, nilainya harus sama dengan awalan kode pelanggan; jika beda, diberi flag "wilayah tidak cocok".
6. **Cek spasial per wilayah** hanya dilakukan bila poligon wilayah tersedia (opsional).
7. Golongan dan status (jika ada) harus sesuai daftar baku.

**Penanganan hasil**

- *Error blokir* (kolom wajib kosong, ID duplikat, format file salah): upload ditolak.
- *Peringatan/flag* (wilayah tidak cocok, koordinat meragukan): data tetap masuk, ditandai, dan dihitung di indikator kualitas data.

## 9. Kebutuhan Non-Fungsional

| Aspek | Kebutuhan |
| --- | --- |
| **Skala** | Mampu menampilkan minimal 10.000 titik dengan lancar; desain tetap layak sampai 50.000 titik |
| **Performa peta** | Gunakan render canvas/WebGL dan clustering, bukan marker bawaan satu per satu; muat data peta secukupnya (ID, koordinat, kecamatan, status), detail diambil saat titik diklik |
| **Performa dashboard** | Agregat dihitung saat upload atau di server, bukan di browser |
| **Upload** | Diproses bertahap (batch) agar tidak timeout; ukuran file maksimum ditetapkan (usulan 20 MB) |
| **Keamanan** | Login wajib; akses berbasis peran; data pribadi pelanggan dibatasi; koneksi HTTPS; catatan audit untuk upload |
| **Perangkat** | Responsif untuk HP dan desktop; diuji di HP berspesifikasi rendah |
| **Ketersediaan data** | Cadangan file master tiap upload; dapat dikembalikan ke versi sebelumnya |
| **Bahasa** | Antarmuka berbahasa Indonesia |

## 10. Arsitektur dan Model Data (Usulan)

- **Antarmuka:** aplikasi web/PWA dengan sidebar 3 menu, mengikuti pola aplikasi internal PDAM lainnya.
- **Peta:** Leaflet (dengan markercluster dan mode canvas) atau MapLibre GL untuk performa lebih tinggi.
- **Basis data:** tabel `pelanggan` (aktif), `upload_log` (riwayat), `wilayah` (kode, nama, kode kecamatan, warna, batas poligon opsional), `pengguna` (peran).
- **Tabel wilayah:** kode (KKWW), nama, kecamatan, dan warna; batas poligon wilayah (GeoJSON) opsional bila tersedia.
- **Alur upload:** file → validasi → tabel sementara → bila lolos, tukar menjadi data aktif → hitung agregat → catat riwayat.
- **Kesiapan integrasi:** `kode_pelanggan` dan kode wilayah baku disiapkan agar nanti dapat disambungkan ke billing, data aduan (Siaga Tiara), dan aplikasi aksesoris sebagai lapisan peta tambahan.

## 11. Rencana Rilis

| Fase | Isi | Keluaran |
| --- | --- | --- |
| **0. Persiapan** | Kamus data, tabel acuan wilayah kecamatan 07, warna per wilayah, template kolom | Template dan acuan wilayah disetujui |
| **1. Pilot kecamatan 07 (Praya Barat)** | Perapian data, upload, peta GIS berwarna per wilayah (prioritas), lalu dashboard dasar | Titik tampil benar di GIS |
| **2. Kecamatan lain** | Tambah kecamatan 01, 02, dst beserta wilayahnya; uji 10.000 titik; hak akses | Rilis internal |
| **3. Penyempurnaan** | Pencarian pelanggan, ekspor, pengaturan warna, laporan kualitas | Versi stabil |
| **4. Integrasi (opsional)** | Penarikan data otomatis dari database/API billing; lapisan aduan dan aksesoris | Data mendekati realtime |

## 12. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Koordinat tidak akurat | Peta menunjuk lokasi salah | Cek spasial, flag, verifikasi lapangan hanya pada data bertanda |
| Format file berubah-ubah | Upload gagal atau dashboard rusak | Template baku, validasi ketat, pesan error jelas |
| Data cepat usang karena upload manual | Keputusan berdasar data lama | Label "data per", jadwal upload tetap, penanggung jawab data |
| Kebocoran data pribadi | Pelanggaran privasi | Akses berbasis peran, agregat untuk pengguna umum, catatan audit |
| Peta berat di HP | Pengalaman buruk | Clustering/canvas, uji di HP berspesifikasi rendah |
| Poligon wilayah PDAM tidak tersedia | Cek spasial per wilayah tidak bisa otomatis | Validasi lewat kode pelanggan dan area kecamatan; poligon opsional |
| Awalan kode pelanggan tidak sama dengan lokasi sebenarnya (mis. pelanggan pindah wilayah) | Warna wilayah di peta salah | Tentukan acuan (awalan kode atau titik peta); ditangani setelah GIS tampil |
| Sekitar 20 wilayah dengan warna sulit dibedakan | Peta sulit dibaca | Palet kontras, legenda dapat diklik, filter per wilayah |

## 13. Pertanyaan Terbuka

1. Data pelanggan saat ini tersimpan di mana (Excel, database, aplikasi billing) dan kolom apa saja yang sudah ada?
2. Apakah tersedia batas poligon tiap wilayah PDAM (shapefile/GeoJSON), atau hanya titik pelanggan?
3. Seberapa sering upload dilakukan dan siapa yang bertanggung jawab?
4. Siapa saja yang boleh melihat detail pribadi pelanggan?
5. Warna wilayah selain 0701 (merah) dan 0702 (hijau): siapa yang menetapkan, dan bagaimana pembagian warna saat kecamatan lain masuk?
6. Apakah diperlukan integrasi ke data aduan dan aplikasi aksesoris pada fase berikutnya?
7. Teknologi dan server hosting apa yang akan dipakai?
8. Apakah kode pelanggan berubah bila pelanggan pindah wilayah? (diputuskan setelah GIS tampil)

## 14. Kriteria Penerimaan (Ringkas)

- Upload file valid berhasil, dan data muncul di Dashboard dan GIS dengan label tanggal yang benar.
- Upload file tidak valid ditolak dengan laporan error, dan data lama tetap utuh.
- Peta menampilkan 10.000 titik dengan lancar di HP, berwarna per wilayah (0701 merah, 0702 hijau, dst), dengan clustering.
- Klik titik menampilkan popup dan tombol Google Maps/Street View yang membuka koordinat yang benar.
- Menu Settingan hanya dapat diakses admin; detail pribadi hanya terlihat oleh peran berwenang.
- Riwayat upload tercatat dan dapat dikembalikan ke versi sebelumnya.