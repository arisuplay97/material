import { Router } from "express";
import { eq, desc, gte, lte, and } from "drizzle-orm";
import {
  db,
  trackingsTable,
  trackingEventsTable,
  materialRequestsTable,
  materialsTable,
  workOrdersTable,
  branchesTable,
  usersTable,
  auditLogsTable,
} from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();
router.use(requireAuth);

router.get(
  "/reports/material-accountability",
  requireRole("spi", "direksi", "superadmin", "admin_gudang"),
  async (req, res): Promise<void> => {
    const { from, to, branchId } = req.query as Record<string, string>;

    if (!from || !to) {
      res.status(400).json({ error: "from dan to wajib diisi" });
      return;
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59);

    const trackings = await db.select().from(trackingsTable);
    const filtered = trackings.filter(
      (t) => t.issuedAt >= fromDate && t.issuedAt <= toDate
    );

    const rows = await Promise.all(
      filtered.map(async (t) => {
        let materialName = "";
        let materialCode: string | null = null;
        let woNumber: string | null = null;
        let branchName = "";
        let unitPrice: number | null = null;

        if (t.materialRequestId) {
          const [mr] = await db
            .select()
            .from(materialRequestsTable)
            .where(eq(materialRequestsTable.id, t.materialRequestId));
          if (mr) {
            const [mat] = await db
              .select()
              .from(materialsTable)
              .where(eq(materialsTable.id, mr.materialId));
            materialName = mat?.name ?? "";
            materialCode = mat?.code ?? null;
            unitPrice = mat?.unitPrice ? parseFloat(mat.unitPrice) : null;

            if (mr.workOrderId) {
              const [wo] = await db
                .select()
                .from(workOrdersTable)
                .where(eq(workOrdersTable.id, mr.workOrderId));
              woNumber = wo?.woNumber ?? null;
              if (wo?.branchId) {
                const [branch] = await db
                  .select()
                  .from(branchesTable)
                  .where(eq(branchesTable.id, wo.branchId));
                branchName = branch?.name ?? "";
              }
            }
          }
        }

        const events = await db
          .select()
          .from(trackingEventsTable)
          .where(eq(trackingEventsTable.trackingId, t.id))
          .orderBy(desc(trackingEventsTable.occurredAt));

        const finishEvent = events.find((e) => e.step === "selesai");

        return {
          trackingCode: t.trackingCode,
          woNumber,
          materialCode,
          materialName,
          branchName,
          qtyIssued: t.qtyIssued,
          qtyUsed: null as number | null,
          qtyReturned: null as number | null,
          unitPrice,
          totalValue: unitPrice ? unitPrice * t.qtyIssued : null,
          status: t.status,
          issuedAt: t.issuedAt.toISOString(),
          verifiedAt: finishEvent?.occurredAt.toISOString() ?? null,
        };
      })
    );

    const totalIssued = rows.length;
    const totalVerified = rows.filter((r) => r.status === "terverifikasi").length;
    const totalKritis = rows.filter((r) => r.status === "kritis").length;
    const totalValueIssued = rows.reduce((sum, r) => sum + (r.totalValue ?? 0), 0);
    const totalValueVerified = rows
      .filter((r) => r.status === "terverifikasi")
      .reduce((sum, r) => sum + (r.totalValue ?? 0), 0);

    res.json({
      period: { from, to },
      totalIssued,
      totalVerified,
      totalKritis,
      totalValueIssued,
      totalValueVerified,
      rows,
    });
  }
);

router.get(
  "/reports/audit-trail",
  requireRole("spi", "superadmin"),
  async (req, res): Promise<void> => {
    const { trackingId, from, to, actorId } = req.query as Record<string, string>;

    let logs = await db
      .select({ l: auditLogsTable, u: usersTable, t: trackingsTable })
      .from(auditLogsTable)
      .leftJoin(usersTable, eq(auditLogsTable.actorId, usersTable.id))
      .leftJoin(trackingsTable, eq(auditLogsTable.trackingId, trackingsTable.id))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(500);

    if (trackingId) logs = logs.filter((r) => r.l.trackingId === trackingId);
    if (actorId) logs = logs.filter((r) => r.l.actorId === actorId);
    if (from) logs = logs.filter((r) => r.l.createdAt >= new Date(from));
    if (to) logs = logs.filter((r) => r.l.createdAt <= new Date(to));

    res.json(
      logs.map((r) => ({
        id: r.l.id,
        trackingId: r.l.trackingId ?? null,
        trackingCode: r.t?.trackingCode ?? null,
        actorId: r.l.actorId ?? null,
        actorName: r.u?.name ?? null,
        action: r.l.action,
        metadata: r.l.metadata ? JSON.stringify(r.l.metadata) : null,
        createdAt: r.l.createdAt.toISOString(),
      }))
    );
  }
);

export default router;
