import { Router } from "express";
import { eq, lt, count, and, desc } from "drizzle-orm";
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
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();
router.use(requireAuth);

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const trackings = await db.select().from(trackingsTable);
  const now = new Date();

  const totalActive = trackings.filter((t) => t.status !== "terverifikasi").length;
  const totalDikirim = trackings.filter((t) => t.status === "dikirim").length;
  const totalDiterimaCabang = trackings.filter((t) => t.status === "diterima_cabang").length;
  const totalMenungguVerifikasi = trackings.filter((t) => t.status === "menunggu_verifikasi").length;
  const totalTerverifikasi = trackings.filter((t) => t.status === "terverifikasi").length;
  const totalKritis = trackings.filter((t) => t.status === "kritis").length;
  const totalOverdue = trackings.filter(
    (t) => t.slaDeadline < now && t.status !== "terverifikasi"
  ).length;

  const pendingApprovals = await db
    .select({ c: count() })
    .from(materialRequestsTable)
    .where(eq(materialRequestsTable.status, "pending"));

  const flaggedForReview = await db
    .select({ c: count() })
    .from(installationProofsTable)
    .where(eq(installationProofsTable.flaggedForReview, true));

  res.json({
    totalActive,
    totalDikirim,
    totalDiterimaCabang,
    totalMenungguVerifikasi,
    totalTerverifikasi,
    totalKritis,
    totalOverdue,
    totalValueAtRisk: 0,
    pendingApprovals: pendingApprovals[0]?.c ?? 0,
    flaggedForReview: flaggedForReview[0]?.c ?? 0,
  });
});

router.get("/dashboard/branch-status", async (_req, res): Promise<void> => {
  const branches = await db.select().from(branchesTable);
  const trackings = await db.select().from(trackingsTable);
  const now = new Date();

  // We need to join tracking to branches via materialRequest -> workOrder -> branch
  // For simplicity, use a map approach
  const result = await Promise.all(
    branches.map(async (b) => {
      // Get work orders for this branch
      const wos = await db
        .select()
        .from(workOrdersTable)
        .where(eq(workOrdersTable.branchId, b.id));
      const woIds = wos.map((w) => w.id);

      // Get material requests for these WOs
      let branchTrackingIds: string[] = [];
      if (woIds.length > 0) {
        const mrs = await db.select().from(materialRequestsTable);
        const branchMrs = mrs.filter((mr) => mr.workOrderId && woIds.includes(mr.workOrderId));
        const mrIds = branchMrs.map((mr) => mr.id);
        const bTrackings = trackings.filter(
          (t) => t.materialRequestId && mrIds.includes(t.materialRequestId)
        );
        branchTrackingIds = bTrackings.map((t) => t.id);
      }

      const bTrackings = trackings.filter((t) =>
        branchTrackingIds.includes(t.id)
      );

      return {
        branchId: b.id,
        branchName: b.name,
        branchCode: b.code,
        active: bTrackings.filter((t) => t.status !== "terverifikasi").length,
        dikirim: bTrackings.filter((t) => t.status === "dikirim").length,
        diterimaCabang: bTrackings.filter((t) => t.status === "diterima_cabang").length,
        kritis: bTrackings.filter((t) => t.status === "kritis").length,
        terverifikasi: bTrackings.filter((t) => t.status === "terverifikasi").length,
        riskScore: 0,
        overdueCount: bTrackings.filter(
          (t) => t.slaDeadline < now && t.status !== "terverifikasi"
        ).length,
      };
    })
  );

  res.json(result);
});

router.get("/dashboard/risk-scores", async (_req, res): Promise<void> => {
  const branches = await db.select().from(branchesTable);
  const trackings = await db.select().from(trackingsTable);
  const now = new Date();

  const result = branches.map((b) => {
    const bTrackings = trackings; // simplified
    const overdueCount = bTrackings.filter(
      (t) => t.slaDeadline < now && t.status !== "terverifikasi"
    ).length;
    const kritisCount = bTrackings.filter((t) => t.status === "kritis").length;
    const riskScore = Math.min(100, overdueCount * 10 + kritisCount * 20);

    let riskLevel: "low" | "medium" | "high" | "critical" = "low";
    if (riskScore >= 80) riskLevel = "critical";
    else if (riskScore >= 50) riskLevel = "high";
    else if (riskScore >= 20) riskLevel = "medium";

    return {
      branchId: b.id,
      branchName: b.name,
      riskScore,
      riskLevel,
      factors: {
        overdueRatio: 0,
        flaggedProofs: 0,
        avgSlaUsed: 0,
        kritisCount,
      },
    };
  });

  res.json(result);
});

router.get("/dashboard/recent-activity", async (req, res): Promise<void> => {
  const limit = parseInt((req.query.limit as string) ?? "20", 10);

  const events = await db
    .select({ e: trackingEventsTable, u: usersTable, t: trackingsTable })
    .from(trackingEventsTable)
    .leftJoin(usersTable, eq(trackingEventsTable.actorId, usersTable.id))
    .leftJoin(trackingsTable, eq(trackingEventsTable.trackingId, trackingsTable.id))
    .orderBy(desc(trackingEventsTable.occurredAt))
    .limit(limit);

  const typeMap: Record<string, "issued" | "received" | "installed" | "verified"> = {
    keluar_gudang: "issued",
    diterima_cabang: "received",
    dipasang: "installed",
    selesai: "verified",
  };

  const descMap: Record<string, string> = {
    keluar_gudang: "Material dikeluarkan dari gudang",
    diterima_cabang: "Barang diterima cabang (scan QR)",
    dipasang: "Bukti pemasangan diupload",
    selesai: "Tracking selesai & terverifikasi",
  };

  res.json(
    events.map((row) => ({
      id: row.e.id,
      type: typeMap[row.e.step] ?? "issued",
      trackingCode: row.t?.trackingCode ?? "",
      materialName: null,
      branchName: null,
      description: descMap[row.e.step] ?? row.e.step,
      actorName: row.u?.name ?? null,
      occurredAt: row.e.occurredAt.toISOString(),
    }))
  );
});

router.get("/dashboard/sla-overview", async (_req, res): Promise<void> => {
  const trackings = await db
    .select()
    .from(trackingsTable)
    .where(eq(trackingsTable.status, "dikirim"));

  const now = new Date();
  const h24 = 24 * 3600 * 1000;

  const overdue = trackings.filter((t) => t.slaDeadline < now);
  const critical = trackings.filter(
    (t) => t.slaDeadline >= now && t.slaDeadline.getTime() - now.getTime() < h24
  );
  const warning = trackings.filter(
    (t) =>
      t.slaDeadline >= now &&
      t.slaDeadline.getTime() - now.getTime() >= h24 &&
      t.slaDeadline.getTime() - now.getTime() < 3 * h24
  );
  const onTrack = trackings.filter(
    (t) => t.slaDeadline >= now && t.slaDeadline.getTime() - now.getTime() >= 3 * h24
  );

  const nearingDeadline = [...overdue, ...critical].slice(0, 10);

  res.json({
    criticalCount: critical.length,
    warningCount: warning.length,
    onTrackCount: onTrack.length,
    overdueCount: overdue.length,
    nearingDeadline: await Promise.all(
      nearingDeadline.map(async (t) => {
        const hoursRemaining = (t.slaDeadline.getTime() - now.getTime()) / 3_600_000;
        return {
          id: t.id,
          trackingCode: t.trackingCode,
          materialName: null,
          materialCode: null,
          branchId: null,
          branchName: null,
          qtyIssued: t.qtyIssued,
          issuedById: t.issuedBy ?? null,
          issuedByName: null,
          issuedAt: t.issuedAt.toISOString(),
          slaDeadline: t.slaDeadline.toISOString(),
          status: t.status,
          qrCodeUrl: t.qrCodeUrl ?? null,
          riskScore: t.riskScore ? parseFloat(t.riskScore) : null,
          hoursRemaining: Math.max(0, hoursRemaining),
          isOverdue: hoursRemaining < 0,
          createdAt: t.createdAt.toISOString(),
          materialRequestId: t.materialRequestId ?? null,
        };
      })
    ),
  });
});

router.get("/dashboard/flagged-proofs", async (req, res): Promise<void> => {
  const { reviewStatus } = req.query as Record<string, string>;

  const proofs = await db
    .select({ p: installationProofsTable, t: trackingsTable, u: usersTable })
    .from(installationProofsTable)
    .leftJoin(trackingsTable, eq(installationProofsTable.trackingId, trackingsTable.id))
    .leftJoin(usersTable, eq(installationProofsTable.submittedBy, usersTable.id))
    .where(eq(installationProofsTable.flaggedForReview, true))
    .orderBy(desc(installationProofsTable.submittedAt));

  let filtered = proofs;
  if (reviewStatus) {
    filtered = proofs.filter((r) => r.p.reviewStatus === reviewStatus);
  }

  res.json(
    filtered.map((r) => {
      let flagReasons: string[] = [];
      try {
        flagReasons = r.p.flagReasons ? JSON.parse(r.p.flagReasons) : [];
      } catch {}

      return {
        id: r.p.id,
        trackingCode: r.t?.trackingCode ?? "",
        trackingId: r.p.trackingId,
        materialName: null,
        branchName: null,
        submittedByName: r.u?.name ?? null,
        photoUrl: r.p.photoUrl ?? null,
        gpsLat: r.p.gpsLat ?? null,
        gpsLng: r.p.gpsLng ?? null,
        gpsAccuracyMeters: r.p.gpsAccuracyMeters ? parseFloat(r.p.gpsAccuracyMeters) : null,
        withinServiceArea: r.p.withinServiceArea ?? null,
        isMockLocation: r.p.isMockLocation ?? false,
        flagReasons,
        reviewStatus: r.p.reviewStatus ?? null,
        submittedAt: r.p.submittedAt.toISOString(),
      };
    })
  );
});

router.get("/dashboard/installation-map", async (_req, res): Promise<void> => {
  const proofs = await db
    .select({ p: installationProofsTable, t: trackingsTable })
    .from(installationProofsTable)
    .leftJoin(trackingsTable, eq(installationProofsTable.trackingId, trackingsTable.id));

  res.json(
    proofs.map((r) => ({
      trackingId: r.p.trackingId,
      trackingCode: r.t?.trackingCode ?? "",
      materialName: null,
      branchName: null,
      gpsLat: r.p.gpsLat,
      gpsLng: r.p.gpsLng,
      status: r.t?.status ?? "terverifikasi",
      flaggedForReview: r.p.flaggedForReview ?? false,
      installedAt: r.p.submittedAt.toISOString(),
    }))
  );
});

export default router;
