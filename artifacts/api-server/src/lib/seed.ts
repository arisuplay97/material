import bcrypt from "bcryptjs";
import QRCode from "qrcode";
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
