import { Router } from "express";
import { eq, desc, and, lt, gte } from "drizzle-orm";
import QRCode from "qrcode";
import {
  db,
  trackingsTable,
  trackingEventsTable,
  installationProofsTable,
  materialRequestsTable,
  materialsTable,
  workOrdersTable,
  branchesTable,
  usersTable,
  auditLogsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import {
  CreateTrackingBody,
  ReceiveTrackingBody,
  SubmitInstallationProofBody,
  FlagTrackingBody,
} from "@workspace/api-zod";
import { generateTrackingCode } from "../lib/trackingCode";

const router = Router();
router.use(requireAuth);

async function enrichTracking(t: typeof trackingsTable.$inferSelect) {
  const now = new Date();
  const hoursRemaining = (t.slaDeadline.getTime() - now.getTime()) / 3_600_000;
  const isOverdue = hoursRemaining < 0;

  let materialName: string | null = null;
  let materialCode: string | null = null;
  let branchId: string | null = null;
  let branchName: string | null = null;
  let issuedByName: string | null = null;

  if (t.materialRequestId) {
    const [mr] = await db
      .select({ mr: materialRequestsTable, mat: materialsTable, wo: workOrdersTable })
      .from(materialRequestsTable)
      .leftJoin(materialsTable, eq(materialRequestsTable.materialId, materialsTable.id))
      .leftJoin(workOrdersTable, eq(materialRequestsTable.workOrderId, workOrdersTable.id))
      .where(eq(materialRequestsTable.id, t.materialRequestId));

    if (mr) {
      materialName = mr.mat?.name ?? null;
      materialCode = mr.mat?.code ?? null;
      if (mr.wo?.branchId) {
        const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, mr.wo.branchId));
        branchId = branch?.id ?? null;
        branchName = branch?.name ?? null;
      }
    }
  }

  if (t.issuedBy) {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, t.issuedBy));
    issuedByName = u?.name ?? null;
  }

  return {
    id: t.id,
    trackingCode: t.trackingCode,
    materialRequestId: t.materialRequestId ?? null,
    materialName,
    materialCode,
    branchId,
    branchName,
    qtyIssued: t.qtyIssued,
    issuedById: t.issuedBy ?? null,
    issuedByName,
    issuedAt: t.issuedAt.toISOString(),
    slaDeadline: t.slaDeadline.toISOString(),
    status: t.status,
    qrCodeUrl: t.qrCodeUrl ?? null,
    riskScore: t.riskScore ? parseFloat(t.riskScore) : null,
    hoursRemaining: Math.max(0, hoursRemaining),
    isOverdue,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/trackings", async (req, res): Promise<void> => {
  const { status, isOverdue, page, limit } = req.query as Record<string, string>;
  const pageNum = parseInt(page ?? "1", 10);
  const limitNum = parseInt(limit ?? "50", 10);
  const offset = (pageNum - 1) * limitNum;

  let rows = await db.select().from(trackingsTable).orderBy(desc(trackingsTable.createdAt));

  if (status) rows = rows.filter((t) => t.status === status);
  if (isOverdue === "true") {
    const now = new Date();
    rows = rows.filter((t) => t.slaDeadline < now && t.status !== "terverifikasi");
  }

  const total = rows.length;
  const paginated = rows.slice(offset, offset + limitNum);
  const enriched = await Promise.all(paginated.map(enrichTracking));

  res.json({ data: enriched, total, page: pageNum, limit: limitNum });
});

router.post("/trackings", async (req, res): Promise<void> => {
  const parsed = CreateTrackingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { materialRequestId, qtyIssued, slaDays } = parsed.data;
  const trackingCode = await generateTrackingCode();
  const slaDeadline = new Date(Date.now() + slaDays * 24 * 60 * 60 * 1000);

  // Generate QR code as base64 data URL
  const qrDataUrl = await QRCode.toDataURL(trackingCode, { width: 300, margin: 2 });

  const [tracking] = await db
    .insert(trackingsTable)
    .values({
      trackingCode,
      materialRequestId,
      qtyIssued,
      issuedBy: req.user!.userId,
      slaDeadline,
      status: "dikirim",
      qrCodeUrl: qrDataUrl,
    })
    .returning();

  // Create initial event
  await db.insert(trackingEventsTable).values({
    trackingId: tracking.id,
    step: "keluar_gudang",
    actorId: req.user!.userId,
    notes: parsed.data.notes ?? null,
  });

  await db.insert(auditLogsTable).values({
    trackingId: tracking.id,
    actorId: req.user!.userId,
    action: "CREATE_TRACKING",
    metadata: { trackingCode, qtyIssued, slaDays },
  });

  res.status(201).json(await enrichTracking(tracking));
});

router.get("/trackings/by-code/:code", async (req, res): Promise<void> => {
  const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
  const [tracking] = await db
    .select()
    .from(trackingsTable)
    .where(eq(trackingsTable.trackingCode, code));

  if (!tracking) {
    res.status(404).json({ error: "Tracking tidak ditemukan" });
    return;
  }

  const events = await db
    .select({ e: trackingEventsTable, u: usersTable })
    .from(trackingEventsTable)
    .leftJoin(usersTable, eq(trackingEventsTable.actorId, usersTable.id))
    .where(eq(trackingEventsTable.trackingId, tracking.id))
    .orderBy(trackingEventsTable.occurredAt);

  const [proof] = await db
    .select()
    .from(installationProofsTable)
    .where(eq(installationProofsTable.trackingId, tracking.id));

  const base = await enrichTracking(tracking);
  res.json({
    ...base,
    materialUnit: null,
    events: events.map((e) => formatEvent(e.e, e.u?.name ?? null)),
    proof: proof ? formatProof(proof) : undefined,
  });
});

router.get("/trackings/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [tracking] = await db.select().from(trackingsTable).where(eq(trackingsTable.id, id));

  if (!tracking) {
    res.status(404).json({ error: "Tracking tidak ditemukan" });
    return;
  }

  const events = await db
    .select({ e: trackingEventsTable, u: usersTable })
    .from(trackingEventsTable)
    .leftJoin(usersTable, eq(trackingEventsTable.actorId, usersTable.id))
    .where(eq(trackingEventsTable.trackingId, tracking.id))
    .orderBy(trackingEventsTable.occurredAt);

  const [proof] = await db
    .select()
    .from(installationProofsTable)
    .where(eq(installationProofsTable.trackingId, tracking.id));

  const base = await enrichTracking(tracking);
  res.json({
    ...base,
    materialUnit: null,
    events: events.map((e) => formatEvent(e.e, e.u?.name ?? null)),
    proof: proof ? formatProof(proof) : undefined,
  });
});

router.post("/trackings/:id/receive", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = ReceiveTrackingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [tracking] = await db.select().from(trackingsTable).where(eq(trackingsTable.id, id));
  if (!tracking) {
    res.status(404).json({ error: "Tracking tidak ditemukan" });
    return;
  }

  if (tracking.trackingCode !== parsed.data.qrScannedCode) {
    res.status(400).json({ error: "QR code tidak sesuai dengan tracking ini" });
    return;
  }

  const [updated] = await db
    .update(trackingsTable)
    .set({ status: "diterima_cabang" })
    .where(eq(trackingsTable.id, id))
    .returning();

  await db.insert(trackingEventsTable).values({
    trackingId: id,
    step: "diterima_cabang",
    actorId: req.user!.userId,
    qrScannedCode: parsed.data.qrScannedCode,
    notes: parsed.data.notes ?? null,
  });

  await db.insert(auditLogsTable).values({
    trackingId: id,
    actorId: req.user!.userId,
    action: "RECEIVE_MATERIAL",
    metadata: { qrScannedCode: parsed.data.qrScannedCode },
  });

  res.json(await enrichTracking(updated));
});

router.post("/trackings/:id/proof", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = SubmitInstallationProofBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [tracking] = await db.select().from(trackingsTable).where(eq(trackingsTable.id, id));
  if (!tracking) {
    res.status(404).json({ error: "Tracking tidak ditemukan" });
    return;
  }

  const d = parsed.data;
  const submitTime = new Date();
  const photoTime = new Date(d.photoTakenAt);

  // Anti-fake-GPS checks
  const flagReasons: string[] = [];
  let flaggedForReview = false;

  if (d.gpsAccuracyMeters && d.gpsAccuracyMeters > 50) {
    flagReasons.push("Akurasi GPS rendah (> 50m)");
    flaggedForReview = true;
  }

  const photoAgeHours = (submitTime.getTime() - photoTime.getTime()) / 3_600_000;
  if (photoAgeHours > 24) {
    flagReasons.push("Foto diambil lebih dari 24 jam sebelum pengiriman");
    flaggedForReview = true;
  }

  if (d.isMockLocation) {
    flagReasons.push("Terdeteksi mock location");
    flaggedForReview = true;
  }

  const [proof] = await db
    .insert(installationProofsTable)
    .values({
      trackingId: id,
      submittedBy: req.user!.userId,
      qtyUsed: d.qtyUsed,
      qtyReturned: d.qtyReturned,
      photoUrl: d.photoUrl,
      photoTakenAt: photoTime,
      gpsLat: d.gpsLat,
      gpsLng: d.gpsLng,
      gpsAccuracyMeters: d.gpsAccuracyMeters ? String(d.gpsAccuracyMeters) : null,
      gpsProvider: d.gpsProvider ?? null,
      isMockLocation: d.isMockLocation ?? false,
      flaggedForReview,
      flagReasons: JSON.stringify(flagReasons),
      reviewStatus: flaggedForReview ? "pending" : null,
      deviceFingerprint: d.deviceFingerprint ?? null,
      ipAddress: req.ip ?? null,
    })
    .returning();

  // Update tracking status
  await db
    .update(trackingsTable)
    .set({ status: flaggedForReview ? "menunggu_verifikasi" : "terverifikasi" })
    .where(eq(trackingsTable.id, id));

  // Add tracking event
  await db.insert(trackingEventsTable).values({
    trackingId: id,
    step: "dipasang",
    actorId: req.user!.userId,
    gpsLat: d.gpsLat,
    gpsLng: d.gpsLng,
    photoUrl: d.photoUrl,
    notes: flaggedForReview ? `Flagged: ${flagReasons.join(", ")}` : null,
  });

  if (!flaggedForReview) {
    await db.insert(trackingEventsTable).values({
      trackingId: id,
      step: "selesai",
      actorId: req.user!.userId,
    });
  }

  await db.insert(auditLogsTable).values({
    trackingId: id,
    actorId: req.user!.userId,
    action: "SUBMIT_PROOF",
    metadata: { flaggedForReview, flagReasons },
  });

  res.status(201).json(formatProof(proof));
});

router.get("/trackings/:id/proof", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [proof] = await db
    .select()
    .from(installationProofsTable)
    .where(eq(installationProofsTable.trackingId, id));

  if (!proof) {
    res.status(404).json({ error: "Bukti pemasangan belum disubmit" });
    return;
  }
  res.json(formatProof(proof));
});

router.get("/trackings/:id/events", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const events = await db
    .select({ e: trackingEventsTable, u: usersTable })
    .from(trackingEventsTable)
    .leftJoin(usersTable, eq(trackingEventsTable.actorId, usersTable.id))
    .where(eq(trackingEventsTable.trackingId, id))
    .orderBy(trackingEventsTable.occurredAt);

  res.json(events.map((e) => formatEvent(e.e, e.u?.name ?? null)));
});

router.post("/trackings/:id/flag", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = FlagTrackingBody.safeParse(req.body);

  await db.insert(auditLogsTable).values({
    trackingId: id,
    actorId: req.user!.userId,
    action: "FLAG_FOR_AUDIT",
    metadata: { reason: parsed.success ? parsed.data.reason : null },
  });

  res.json({ success: true, message: "Tracking ditandai untuk audit" });
});

router.get("/trackings/:id/qr", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [tracking] = await db.select().from(trackingsTable).where(eq(trackingsTable.id, id));

  if (!tracking) {
    res.status(404).json({ error: "Tracking tidak ditemukan" });
    return;
  }

  const qrDataUrl = tracking.qrCodeUrl ?? (await QRCode.toDataURL(tracking.trackingCode));

  res.json({
    trackingCode: tracking.trackingCode,
    qrCodeDataUrl: qrDataUrl,
    qrCodeUrl: qrDataUrl,
  });
});

// Proof review
router.post("/proofs/:id/review", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { reviewStatus, notes } = req.body as { reviewStatus: string; notes?: string };

  const [proof] = await db
    .update(installationProofsTable)
    .set({
      reviewStatus: reviewStatus as "approved" | "rejected",
      reviewedBy: req.user!.userId,
    })
    .where(eq(installationProofsTable.id, id))
    .returning();

  if (!proof) {
    res.status(404).json({ error: "Bukti tidak ditemukan" });
    return;
  }

  if (reviewStatus === "approved") {
    await db
      .update(trackingsTable)
      .set({ status: "terverifikasi" })
      .where(eq(trackingsTable.id, proof.trackingId));

    await db.insert(trackingEventsTable).values({
      trackingId: proof.trackingId,
      step: "selesai",
      actorId: req.user!.userId,
      notes: notes ?? "Diverifikasi SPI",
    });
  }

  await db.insert(auditLogsTable).values({
    trackingId: proof.trackingId,
    actorId: req.user!.userId,
    action: `REVIEW_PROOF_${reviewStatus.toUpperCase()}`,
    metadata: { proofId: id, notes },
  });

  res.json(formatProof(proof));
});

// Upload photo (base64)
router.post("/upload/photo", async (req, res): Promise<void> => {
  const { photo } = req.body as { photo: string };
  if (!photo) {
    res.status(400).json({ error: "photo required" });
    return;
  }

  // In production this would upload to object storage; for now return as-is
  const takenAt = new Date().toISOString();
  res.json({ url: photo, takenAt, width: null, height: null });
});

function formatEvent(
  e: typeof trackingEventsTable.$inferSelect,
  actorName: string | null
) {
  return {
    id: e.id,
    trackingId: e.trackingId,
    step: e.step,
    actorId: e.actorId ?? null,
    actorName,
    gpsLat: e.gpsLat ?? null,
    gpsLng: e.gpsLng ?? null,
    photoUrl: e.photoUrl ?? null,
    qrScannedCode: e.qrScannedCode ?? null,
    notes: e.notes ?? null,
    occurredAt: e.occurredAt.toISOString(),
  };
}

function formatProof(p: typeof installationProofsTable.$inferSelect) {
  let flagReasons: string[] = [];
  try {
    flagReasons = p.flagReasons ? JSON.parse(p.flagReasons) : [];
  } catch {}

  return {
    id: p.id,
    trackingId: p.trackingId,
    submittedById: p.submittedBy ?? null,
    submittedByName: null,
    qtyUsed: p.qtyUsed,
    qtyReturned: p.qtyReturned,
    photoUrl: p.photoUrl,
    photoTakenAt: p.photoTakenAt.toISOString(),
    gpsLat: p.gpsLat,
    gpsLng: p.gpsLng,
    gpsAccuracyMeters: p.gpsAccuracyMeters ? parseFloat(p.gpsAccuracyMeters) : null,
    gpsProvider: p.gpsProvider ?? null,
    isMockLocation: p.isMockLocation ?? false,
    withinServiceArea: p.withinServiceArea ?? null,
    flaggedForReview: p.flaggedForReview ?? false,
    reviewStatus: p.reviewStatus ?? null,
    reviewedByName: null,
    flagReasons,
    submittedAt: p.submittedAt.toISOString(),
  };
}

export default router;
