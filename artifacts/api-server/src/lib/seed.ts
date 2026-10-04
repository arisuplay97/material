import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { sql } from "drizzle-orm";
import {
  db,
  branchesTable,
  usersTable,
  materialsTable,
  workOrdersTable,
  materialRequestsTable,
  trackingsTable,
  trackingEventsTable,
  auditLogsTable,
} from "@workspace/db";
import { logger } from "./logger";

export async function seedDatabase(): Promise<void> {
  const existing = await db.select().from(usersTable).limit(1);
  if (existing.length > 0) {
    logger.info("Database already seeded, skipping.");
    return;
  }

  logger.info("Seeding database...");

  // Branches
  const [b1, b2, b3] = await db
    .insert(branchesTable)
    .values([
      { name: "Cabang Praya", code: "PRY" },
      { name: "Cabang Jonggat", code: "JGT" },
      { name: "Cabang Pujut", code: "PJT" },
    ])
    .returning();

  // Users
  const hash = await bcrypt.hash("password123", 10);
  const [superadmin, adminGudang, petugas1, petugas2, spi, direksi] = await db
    .insert(usersTable)
    .values([
      {
        name: "Admin IT",
        email: "admin@pdam-tiara.id",
        passwordHash: hash,
        role: "superadmin",
        branchId: null,
      },
      {
        name: "Budi Santoso",
        email: "gudang@pdam-tiara.id",
        passwordHash: hash,
        role: "admin_gudang",
        branchId: b1.id,
      },
      {
        name: "Agus Rahmad",
        email: "lapangan1@pdam-tiara.id",
        passwordHash: hash,
        role: "petugas_lapangan",
        branchId: b1.id,
      },
      {
        name: "Deni Kurnia",
        email: "lapangan2@pdam-tiara.id",
        passwordHash: hash,
        role: "petugas_lapangan",
        branchId: b2.id,
      },
      {
        name: "Siti Rahma",
        email: "spi@pdam-tiara.id",
        passwordHash: hash,
        role: "spi",
        branchId: null,
      },
      {
        name: "Direktur Utama",
        email: "direksi@pdam-tiara.id",
        passwordHash: hash,
        role: "direksi",
        branchId: null,
      },
    ])
    .returning();

  // Materials
  const [mat1, mat2, mat3, mat4] = await db
    .insert(materialsTable)
    .values([
      { code: "VLV-004", name: "Gate Valve 4\"", category: "valve", unit: "Unit", unitPrice: "850000", currentStock: 20, branchId: null },
      { code: "PIP-075", name: "Pipa PVC 3/4\"", category: "pipe", unit: "Meter", unitPrice: "45000", currentStock: 500, branchId: null },
      { code: "FTG-TEE", name: "Fitting Tee 1\"", category: "fitting", unit: "Unit", unitPrice: "35000", currentStock: 150, branchId: null },
      { code: "MTR-DN25", name: "Water Meter DN25", category: "meter", unit: "Unit", unitPrice: "1200000", currentStock: 30, branchId: null },
    ])
    .returning();

  // Work Orders
  const [wo1, wo2] = await db
    .insert(workOrdersTable)
    .values([
      { woNumber: "WO-2026-0001", description: "Pemasangan jaringan baru Desa Sengkol", branchId: b1.id, createdBy: adminGudang.id },
      { woNumber: "WO-2026-0002", description: "Penggantian meter rusak Kelurahan Jonggat", branchId: b2.id, createdBy: adminGudang.id },
    ])
    .returning();

  // Material Requests (approved)
  const [mr1] = await db
    .insert(materialRequestsTable)
    .values([
      {
        requestNumber: "MPG-2026-00001",
        workOrderId: wo1.id,
        materialId: mat1.id,
        qtyRequested: 3,
        requestedBy: petugas1.id,
        approvedBy: spi.id,
        approvedAt: new Date(Date.now() - 3 * 86400_000),
        status: "approved",
      },
    ])
    .returning();

  const [mr2] = await db
    .insert(materialRequestsTable)
    .values([
      {
        requestNumber: "MPG-2026-00002",
        workOrderId: wo2.id,
        materialId: mat4.id,
        qtyRequested: 2,
        requestedBy: petugas2.id,
        status: "pending",
      },
    ])
    .returning();

  // Tracking 1: terverifikasi
  const code1 = "TRK-260715-000001";
  const qr1 = await QRCode.toDataURL(code1);
  const [trk1] = await db
    .insert(trackingsTable)
    .values([{
      trackingCode: code1,
      materialRequestId: mr1.id,
      qtyIssued: 3,
      issuedBy: adminGudang.id,
      issuedAt: new Date(Date.now() - 5 * 86400_000),
      slaDeadline: new Date(Date.now() + 2 * 86400_000),
      status: "terverifikasi",
      qrCodeUrl: qr1,
    }])
    .returning();

  await db.insert(trackingEventsTable).values([
    { trackingId: trk1.id, step: "keluar_gudang", actorId: adminGudang.id, occurredAt: new Date(Date.now() - 5 * 86400_000) },
    { trackingId: trk1.id, step: "diterima_cabang", actorId: petugas1.id, qrScannedCode: code1, occurredAt: new Date(Date.now() - 4 * 86400_000) },
    { trackingId: trk1.id, step: "dipasang", actorId: petugas1.id, gpsLat: -8.6574, gpsLng: 116.1234, photoUrl: "https://picsum.photos/400/300", occurredAt: new Date(Date.now() - 2 * 86400_000) },
    { trackingId: trk1.id, step: "selesai", actorId: spi.id, occurredAt: new Date(Date.now() - 86400_000) },
  ]);

  // Tracking 2: dikirim (almost SLA expired)
  const code2 = "TRK-260716-000002";
  const qr2 = await QRCode.toDataURL(code2);
  const [trk2] = await db
    .insert(trackingsTable)
    .values([{
      trackingCode: code2,
      materialRequestId: null,
      qtyIssued: 10,
      issuedBy: adminGudang.id,
      issuedAt: new Date(Date.now() - 6 * 86400_000),
      slaDeadline: new Date(Date.now() + 18 * 3600_000), // 18 hours left - critical
      status: "dikirim",
      qrCodeUrl: qr2,
    }])
    .returning();

  await db.insert(trackingEventsTable).values([
    { trackingId: trk2.id, step: "keluar_gudang", actorId: adminGudang.id, occurredAt: new Date(Date.now() - 6 * 86400_000) },
  ]);

  // Tracking 3: menunggu_verifikasi (flagged GPS)
  const code3 = "TRK-260717-000003";
  const qr3 = await QRCode.toDataURL(code3);
  const [trk3] = await db
    .insert(trackingsTable)
    .values([{
      trackingCode: code3,
      materialRequestId: null,
      qtyIssued: 5,
      issuedBy: adminGudang.id,
      issuedAt: new Date(Date.now() - 2 * 86400_000),
      slaDeadline: new Date(Date.now() + 5 * 86400_000),
      status: "menunggu_verifikasi",
      qrCodeUrl: qr3,
      riskScore: "75.00",
    }])
    .returning();

  await db.insert(trackingEventsTable).values([
    { trackingId: trk3.id, step: "keluar_gudang", actorId: adminGudang.id, occurredAt: new Date(Date.now() - 2 * 86400_000) },
    { trackingId: trk3.id, step: "diterima_cabang", actorId: petugas2.id, qrScannedCode: code3, occurredAt: new Date(Date.now() - 86400_000) },
    { trackingId: trk3.id, step: "dipasang", actorId: petugas2.id, gpsLat: -8.9999, gpsLng: 116.9999, photoUrl: "https://picsum.photos/400/301", occurredAt: new Date(Date.now() - 3600_000) },
  ]);

  await db.insert(auditLogsTable).values([
    { trackingId: trk1.id, actorId: adminGudang.id, action: "CREATE_TRACKING", metadata: { trackingCode: code1 } },
    { trackingId: trk2.id, actorId: adminGudang.id, action: "CREATE_TRACKING", metadata: { trackingCode: code2 } },
    { trackingId: trk3.id, actorId: adminGudang.id, action: "CREATE_TRACKING", metadata: { trackingCode: code3 } },
  ]);

  logger.info("Seeding complete.");
}

export async function seedPostgis(): Promise<void> {
  try {
    logger.info("Activating PostGIS extension on Neon Cloud...");
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS postgis;`);

    // Create gis_pipa table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS gis_pipa (
        id SERIAL PRIMARY KEY,
        kode_pipa VARCHAR(50) UNIQUE NOT NULL,
        nama_jalur VARCHAR(255) NOT NULL,
        kategori VARCHAR(50) DEFAULT 'Distribusi',
        material VARCHAR(50) DEFAULT 'PVC',
        diameter_mm INTEGER NOT NULL DEFAULT 100,
        panjang_m NUMERIC(10, 2),
        tekanan_bar NUMERIC(4, 2) DEFAULT 2.5,
        status VARCHAR(30) DEFAULT 'Aktif',
        tahun_pasang INTEGER DEFAULT 2021,
        zona_dma VARCHAR(100) DEFAULT 'DMA-01 Penujak',
        sumber_air VARCHAR(100) DEFAULT 'WTP Batujai',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        geom geometry(LineString, 4326)
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_gis_pipa_geom ON gis_pipa USING GIST (geom);`);

    // Create gis_aksesoris table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS gis_aksesoris (
        id SERIAL PRIMARY KEY,
        kode_aksesoris VARCHAR(50) UNIQUE NOT NULL,
        nama_aksesoris VARCHAR(255) NOT NULL,
        kategori VARCHAR(50) NOT NULL,
        tipe VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Buka Penuh (100%)',
        tekanan_bar NUMERIC(4, 2) DEFAULT 3.0,
        kondisi VARCHAR(50) DEFAULT 'Baik',
        jadwal_cek VARCHAR(50) DEFAULT 'Bulanan',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        geom geometry(Point, 4326)
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_gis_aksesoris_geom ON gis_aksesoris USING GIST (geom);`);

    // Create gis_pelanggan table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS gis_pelanggan (
        id SERIAL PRIMARY KEY,
        kode_pelanggan VARCHAR(30) UNIQUE NOT NULL,
        nama_pelanggan VARCHAR(255) NOT NULL,
        alamat TEXT,
        kode_wilayah VARCHAR(20) NOT NULL,
        nama_wilayah VARCHAR(100),
        kode_kecamatan VARCHAR(10) NOT NULL,
        golongan VARCHAR(10) NOT NULL,
        status_sambungan VARCHAR(30) DEFAULT 'Aktif',
        nomor_meter VARCHAR(50),
        spatial_anomaly VARCHAR(255),
        is_flagged BOOLEAN DEFAULT FALSE,
        verified_field BOOLEAN DEFAULT FALSE,
        verified_at TIMESTAMP WITH TIME ZONE,
        geom geometry(Point, 4326)
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_gis_pelanggan_geom ON gis_pelanggan USING GIST (geom);`);

    // Populate initial sample pipelines if empty
    const checkPipes: any = await db.execute(sql`SELECT COUNT(*) as count FROM gis_pipa`);
    const count = Number(checkPipes.rows?.[0]?.count || checkPipes[0]?.count || 0);

    if (count === 0) {
      logger.info("Populating initial pipelines in PostGIS on Neon...");
      await db.execute(sql`
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
        )
        ON CONFLICT DO NOTHING;

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
        )
        ON CONFLICT DO NOTHING;
      `);
    }

    logger.info("PostGIS spatial schema successfully activated on Neon Cloud!");
  } catch (err: any) {
    logger.warn({ err: err.message }, "PostGIS schema setup info");
  }
}
