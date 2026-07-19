import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, materialRequestsTable, materialsTable, workOrdersTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { CreateMaterialRequestBody, ApproveMaterialRequestBody } from "@workspace/api-zod";
import { generateRequestNumber } from "../lib/trackingCode";
import { auditLogsTable } from "@workspace/db";

const router = Router();
router.use(requireAuth);

async function formatRequest(r: typeof materialRequestsTable.$inferSelect) {
  const [material] = await db.select().from(materialsTable).where(eq(materialsTable.id, r.materialId));
  const [requester] = r.requestedBy
    ? await db.select().from(usersTable).where(eq(usersTable.id, r.requestedBy))
    : [null];
  const [approver] = r.approvedBy
    ? await db.select().from(usersTable).where(eq(usersTable.id, r.approvedBy))
    : [null];
  const [wo] = r.workOrderId
    ? await db.select().from(workOrdersTable).where(eq(workOrdersTable.id, r.workOrderId))
    : [null];

  return {
    id: r.id,
    requestNumber: r.requestNumber,
    workOrderId: r.workOrderId ?? null,
    workOrderNumber: wo?.woNumber ?? null,
    materialId: r.materialId,
    materialName: material?.name ?? null,
    materialCode: material?.code ?? null,
    qtyRequested: r.qtyRequested,
    requestedById: r.requestedBy ?? null,
    requestedByName: requester?.name ?? null,
    approvedById: r.approvedBy ?? null,
    approvedByName: approver?.name ?? null,
    approvedAt: r.approvedAt?.toISOString() ?? null,
    status: r.status,
    notes: r.notes ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/material-requests", async (req, res): Promise<void> => {
  const { status, branchId, requestedBy } = req.query as Record<string, string>;

  let rows = await db
    .select()
    .from(materialRequestsTable)
    .orderBy(materialRequestsTable.createdAt);

  if (status) rows = rows.filter((r) => r.status === status);
  if (requestedBy) rows = rows.filter((r) => r.requestedBy === requestedBy);

  const formatted = await Promise.all(rows.map(formatRequest));
  res.json(formatted);
});

router.post("/material-requests", async (req, res): Promise<void> => {
  const parsed = CreateMaterialRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const requestNumber = await generateRequestNumber();

  const [mr] = await db
    .insert(materialRequestsTable)
    .values({
      requestNumber,
      materialId: parsed.data.materialId,
      workOrderId: parsed.data.workOrderId ?? null,
      qtyRequested: parsed.data.qtyRequested,
      requestedBy: req.user!.userId,
      status: "pending",
    })
    .returning();

  res.status(201).json(await formatRequest(mr));
});

router.get("/material-requests/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [mr] = await db.select().from(materialRequestsTable).where(eq(materialRequestsTable.id, id));
  if (!mr) {
    res.status(404).json({ error: "Permintaan tidak ditemukan" });
    return;
  }
  res.json(await formatRequest(mr));
});

router.post(
  "/material-requests/:id/approve",
  requireRole("spi", "direksi", "superadmin"),
  async (req, res): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = ApproveMaterialRequestBody.safeParse(req.body);

    const [mr] = await db
      .update(materialRequestsTable)
      .set({
        status: "approved",
        approvedBy: req.user!.userId,
        approvedAt: new Date(),
        notes: parsed.success ? (parsed.data.notes ?? null) : null,
      })
      .where(eq(materialRequestsTable.id, id))
      .returning();

    if (!mr) {
      res.status(404).json({ error: "Permintaan tidak ditemukan" });
      return;
    }

    await db.insert(auditLogsTable).values({
      trackingId: null,
      actorId: req.user!.userId,
      action: "APPROVE_MATERIAL_REQUEST",
      metadata: { requestId: id, requestNumber: mr.requestNumber },
    });

    res.json(await formatRequest(mr));
  }
);

router.post(
  "/material-requests/:id/reject",
  requireRole("spi", "direksi", "superadmin"),
  async (req, res): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = ApproveMaterialRequestBody.safeParse(req.body);

    const [mr] = await db
      .update(materialRequestsTable)
      .set({
        status: "rejected",
        approvedBy: req.user!.userId,
        approvedAt: new Date(),
        notes: parsed.success ? (parsed.data.notes ?? null) : null,
      })
      .where(eq(materialRequestsTable.id, id))
      .returning();

    if (!mr) {
      res.status(404).json({ error: "Permintaan tidak ditemukan" });
      return;
    }

    res.json(await formatRequest(mr));
  }
);

export default router;
