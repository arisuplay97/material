import { Router } from "express";
import { eq, count } from "drizzle-orm";
import { db, branchesTable, trackingsTable, materialRequestsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { CreateBranchBody, UpdateBranchBody } from "@workspace/api-zod";

const router = Router();
router.use(requireAuth);

router.get("/branches", async (_req, res): Promise<void> => {
  const branches = await db.select().from(branchesTable).orderBy(branchesTable.name);
  res.json(
    branches.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      createdAt: b.createdAt.toISOString(),
      activeTrackings: null,
      criticalCount: null,
    }))
  );
});

router.post("/branches", requireRole("superadmin"), async (req, res): Promise<void> => {
  const parsed = CreateBranchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [branch] = await db
    .insert(branchesTable)
    .values({ name: parsed.data.name, code: parsed.data.code })
    .returning();

  res.status(201).json({
    id: branch.id,
    name: branch.name,
    code: branch.code,
    createdAt: branch.createdAt.toISOString(),
    activeTrackings: 0,
    criticalCount: 0,
  });
});

router.get("/branches/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, id));

  if (!branch) {
    res.status(404).json({ error: "Cabang tidak ditemukan" });
    return;
  }

  res.json({
    id: branch.id,
    name: branch.name,
    code: branch.code,
    createdAt: branch.createdAt.toISOString(),
    activeTrackings: null,
    criticalCount: null,
  });
});

router.put("/branches/:id", requireRole("superadmin", "spi"), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = UpdateBranchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(branchesTable)
    .set({ name: parsed.data.name, code: parsed.data.code })
    .where(eq(branchesTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Cabang tidak ditemukan" });
    return;
  }

  res.json({
    id: updated.id,
    name: updated.name,
    code: updated.code,
    createdAt: updated.createdAt.toISOString(),
    activeTrackings: null,
    criticalCount: null,
  });
});

export default router;
