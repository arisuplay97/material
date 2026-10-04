-- ====================================================================
-- SKEMA POSTGIS PDAM LOMBOK TENGAH (Enterprise Spatial Water Utility)
-- Jalankan skrip ini di PostgreSQL server kantor Anda (lewat pgAdmin / psql)
-- ====================================================================

-- 1. Aktifkan Ekstensi PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Tabel Jaringan Pipa Air (LineString)
CREATE TABLE IF NOT EXISTS gis_pipa (
    id SERIAL PRIMARY KEY,
    kode_pipa VARCHAR(50) UNIQUE NOT NULL,
    nama_jalur VARCHAR(255) NOT NULL,
    kategori VARCHAR(50) DEFAULT 'Distribusi', -- Transmisi, Distribusi Primer, Retikulasi
    material VARCHAR(50) DEFAULT 'PVC',        -- HDPE, PVC RRJ, Ductile Iron, GI
    diameter_mm INTEGER NOT NULL DEFAULT 100,  -- 50, 75, 90, 100, 150, 200, 250, 300 mm
    panjang_m NUMERIC(10, 2),
    tekanan_bar NUMERIC(4, 2) DEFAULT 2.5,
    status VARCHAR(30) DEFAULT 'Aktif',        -- Aktif, Perbaikan, Nonaktif
    tahun_pasang INTEGER DEFAULT 2021,
    zona_dma VARCHAR(100) DEFAULT 'DMA-01 Penujak',
    sumber_air VARCHAR(100) DEFAULT 'WTP Batujai',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    geom geometry(LineString, 4326)            -- Koordinat WGS84 EPSG:4326
);

-- Indeks Spasial GIST untuk pencarian secepat kilat (bisa tampung 100.000+ garis pipa)
CREATE INDEX IF NOT EXISTS idx_gis_pipa_geom ON gis_pipa USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_gis_pipa_kode ON gis_pipa (kode_pipa);

-- 3. Tabel Katup & Aksesoris Pipa (Point)
CREATE TABLE IF NOT EXISTS gis_aksesoris (
    id SERIAL PRIMARY KEY,
    kode_aksesoris VARCHAR(50) UNIQUE NOT NULL,
    nama_aksesoris VARCHAR(255) NOT NULL,
    kategori VARCHAR(50) NOT NULL,            -- Gate Valve, Air Release, PRV, Hydrant, Washout
    tipe VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Buka Penuh (100%)',
    tekanan_bar NUMERIC(4, 2) DEFAULT 3.0,
    kondisi VARCHAR(50) DEFAULT 'Baik',       -- Baik, Perlu Servis, Rusak
    jadwal_cek VARCHAR(50) DEFAULT 'Bulanan',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    geom geometry(Point, 4326)                -- Koordinat WGS84 EPSG:4326
);

CREATE INDEX IF NOT EXISTS idx_gis_aksesoris_geom ON gis_aksesoris USING GIST (geom);

-- 4. Tabel Sambungan Rumah / Pelanggan (Point)
CREATE TABLE IF NOT EXISTS gis_pelanggan (
    id SERIAL PRIMARY KEY,
    kode_pelanggan VARCHAR(30) UNIQUE NOT NULL,
    nama_pelanggan VARCHAR(255) NOT NULL,
    alamat TEXT,
    kode_wilayah VARCHAR(20) NOT NULL,
    nama_wilayah VARCHAR(100),
    kode_kecamatan VARCHAR(10) NOT NULL,
    golongan VARCHAR(10) NOT NULL,            -- R1, R2, B1, S, I
    status_sambungan VARCHAR(30) DEFAULT 'Aktif',
    nomor_meter VARCHAR(50),
    spatial_anomaly VARCHAR(255),
    is_flagged BOOLEAN DEFAULT FALSE,
    verified_field BOOLEAN DEFAULT FALSE,     -- Flag terverifikasi lapangan
    verified_at TIMESTAMP WITH TIME ZONE,
    geom geometry(Point, 4326)                -- Koordinat WGS84 EPSG:4326
);

CREATE INDEX IF NOT EXISTS idx_gis_pelanggan_geom ON gis_pelanggan USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_gis_pelanggan_kode ON gis_pelanggan (kode_pelanggan);

-- ====================================================================
-- DATA AWAL CONTOH (Untuk Praya Barat & Batujai, Lombok Tengah)
-- ====================================================================

INSERT INTO gis_pipa (kode_pipa, nama_jalur, kategori, material, diameter_mm, panjang_m, tekanan_bar, status, tahun_pasang, zona_dma, sumber_air, geom)
VALUES 
(
    'TR-BJ-01',
    'Pipa Transmisi Utama Batujai - Praya Barat',
    'Transmisi',
    'HDPE PN-16',
    250,
    1850,
    4.2,
    'Aktif',
    2019,
    'DMA-01 Penujak',
    'WTP Bendungan Batujai',
    ST_GeomFromText('LINESTRING(116.2750 -8.7200, 116.2680 -8.7320, 116.2550 -8.7450, 116.2400 -8.7600, 116.2250 -8.7750, 116.2100 -8.7880)', 4326)
),
(
    'DIS-PB-01',
    'Distribusi Primer Jl. Raya Praya - Penujak',
    'Distribusi Primer',
    'PVC RRJ',
    160,
    1420,
    3.1,
    'Aktif',
    2021,
    'DMA-01 Penujak',
    'Reservoir Penujak',
    ST_GeomFromText('LINESTRING(116.2100 -8.7880, 116.2050 -8.7890, 116.2000 -8.7905, 116.1950 -8.7915, 116.1900 -8.7925)', 4326)
),
(
    'RET-PB-11',
    'Pipa Retikulasi Pemukiman Karang Dalam',
    'Retikulasi',
    'HDPE PN-10',
    90,
    820,
    2.5,
    'Aktif',
    2022,
    'DMA-01 Penujak',
    'Boster Karang Dalam',
    ST_GeomFromText('LINESTRING(116.2050 -8.7890, 116.2065 -8.7940, 116.2080 -8.7980, 116.2095 -8.8020)', 4326)
),
(
    'RET-PB-12',
    'Pipa Retikulasi Blok Barat Penujak',
    'Retikulasi',
    'PVC SNI',
    75,
    650,
    2.1,
    'Aktif',
    2020,
    'DMA-01 Penujak',
    'Boster Karang Dalam',
    ST_GeomFromText('LINESTRING(116.2000 -8.7905, 116.2010 -8.7950, 116.2025 -8.8000, 116.2035 -8.8040)', 4326)
),
(
    'DIS-KT-02',
    'Pipa Distribusi Jalur Bandara Internasional Lombok (BIL)',
    'Distribusi Primer',
    'Ductile Iron (DIP)',
    200,
    2600,
    3.8,
    'Aktif',
    2018,
    'DMA-02 Bandara',
    'WTP Batujai',
    ST_GeomFromText('LINESTRING(116.2400 -8.7600, 116.2480 -8.7650, 116.2550 -8.7720, 116.2650 -8.7800, 116.2750 -8.7900)', 4326)
)
ON CONFLICT (kode_pipa) DO NOTHING;

INSERT INTO gis_aksesoris (kode_aksesoris, nama_aksesoris, kategori, tipe, status, tekanan_bar, kondisi, jadwal_cek, geom)
VALUES
(
    'GV-PB-01',
    'Gate Valve Isolasi Penujak Barat',
    'Gate Valve',
    'Gate Valve 150mm',
    'Buka Penuh (100%)',
    3.0,
    'Baik',
    'Bulanan',
    ST_GeomFromText('POINT(116.2100 -8.7880)', 4326)
),
(
    'PRV-BJ-01',
    'PRV Penurun Tekanan Zona Pemukiman',
    'PRV (Pressure Reducing Valve)',
    'Automatic Control Valve',
    'Aktif Mengatur Tekanan',
    2.5,
    'Baik',
    '2 Mingguan',
    ST_GeomFromText('POINT(116.2400 -8.7600)', 4326)
)
ON CONFLICT (kode_aksesoris) DO NOTHING;
