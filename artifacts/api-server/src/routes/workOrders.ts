import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, workOrdersTable, branchesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { CreateWorkOrderBody } from "@workspace/api-zod";

const router = Router();
router.use(requireAuth);

function formatWO(
  wo: typeof workOrdersTable.$inferSelect,
  branchName?: string | null,
  createdByName?: string | null
) {
  return {
    id: wo.id,
    woNumber: wo.woNumber,
    description: wo.description ?? null,
    branchId: wo.branchId,
    branchName: branchName ?? null,
    createdById: wo.createdBy ?? null,
    createdByName: createdByName ?? null,
    createdAt: wo.createdAt.toISOString(),
  };
}

router.get("/work-orders", async (req, res): Promise<void> => {
  const { branchId } = req.query as Record<string, string>;

  const rows = await db
    .select({ wo: workOrdersTable, b: branchesTable, u: usersTable })
    .from(workOrdersTable)
    .leftJoin(branchesTable, eq(workOrdersTable.branchId, branchesTable.id))
    .leftJoin(usersTable, eq(workOrdersTable.createdBy, usersTable.id))
    .orderBy(workOrdersTable.createdAt);

  let filtered = rows;
  if (branchId) filtered = filtered.filter((r) => r.wo.branchId === branchId);

  res.json(filtered.map((r) => formatWO(r.wo, r.b?.name, r.u?.name)));
});

router.post("/work-orders", async (req, res): Promise<void> => {
  const parsed = CreateWorkOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [wo] = await db
    .insert(workOrdersTable)
    .values({
      woNumber: parsed.data.woNumber,
      description: parsed.data.description ?? null,
      branchId: parsed.data.branchId,
      createdBy: req.user!.userId,
    })
    .returning();

  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, wo.branchId));
  res.status(201).json(formatWO(wo, branch?.name ?? null, null));
});

router.get("/work-orders/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [row] = await db
    .select({ wo: workOrdersTable, b: branchesTable, u: usersTable })
    .from(workOrdersTable)
    .leftJoin(branchesTable, eq(workOrdersTable.branchId, branchesTable.id))
    .leftJoin(usersTable, eq(workOrdersTable.createdBy, usersTable.id))
    .where(eq(workOrdersTable.id, id));

  if (!row) {
    res.status(404).json({ error: "Work order tidak ditemukan" });
    return;
  }

  res.json(formatWO(row.wo, row.b?.name, row.u?.name));
});

export default router;
