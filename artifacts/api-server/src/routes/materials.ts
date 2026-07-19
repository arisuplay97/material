import { Router } from "express";
import { eq, like, and, SQL } from "drizzle-orm";
import { db, materialsTable, branchesTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { CreateMaterialBody, UpdateMaterialBody } from "@workspace/api-zod";

const router = Router();
router.use(requireAuth);

function formatMaterial(m: typeof materialsTable.$inferSelect) {
  return {
    id: m.id,
    code: m.code,
    name: m.name,
    category: m.category,
    unit: m.unit,
    unitPrice: m.unitPrice ? parseFloat(m.unitPrice) : null,
    currentStock: m.currentStock,
    branchId: m.branchId ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}

router.get("/materials", async (req, res): Promise<void> => {
  const { category, branchId, search } = req.query as Record<string, string>;

  let rows = await db.select().from(materialsTable).orderBy(materialsTable.name);

  if (category) rows = rows.filter((m) => m.category === category);
  if (branchId) rows = rows.filter((m) => m.branchId === branchId);
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((m) => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q));
  }

  res.json(rows.map(formatMaterial));
});

router.post("/materials", requireRole("admin_gudang", "superadmin"), async (req, res): Promise<void> => {
  const parsed = CreateMaterialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { code, name, category, unit, unitPrice, currentStock, branchId } = parsed.data;
  const [mat] = await db
    .insert(materialsTable)
    .values({
      code,
      name,
      category,
      unit,
      unitPrice: unitPrice ? String(unitPrice) : null,
      currentStock: currentStock ?? 0,
      branchId: branchId ?? null,
    })
    .returning();

  res.status(201).json(formatMaterial(mat));
});

router.get("/materials/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [mat] = await db.select().from(materialsTable).where(eq(materialsTable.id, id));
  if (!mat) {
    res.status(404).json({ error: "Material tidak ditemukan" });
    return;
  }
  res.json(formatMaterial(mat));
});

router.put("/materials/:id", requireRole("admin_gudang", "superadmin"), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = UpdateMaterialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<typeof materialsTable.$inferInsert> = {};
  const d = parsed.data;
  if (d.code !== undefined) updates.code = d.code;
  if (d.name !== undefined) updates.name = d.name;
  if (d.category !== undefined) updates.category = d.category;
  if (d.unit !== undefined) updates.unit = d.unit;
  if (d.unitPrice !== undefined) updates.unitPrice = d.unitPrice ? String(d.unitPrice) : null;
  if (d.currentStock !== undefined) updates.currentStock = d.currentStock;
  if ("branchId" in d) updates.branchId = d.branchId ?? null;

  const [updated] = await db.update(materialsTable).set(updates).where(eq(materialsTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Material tidak ditemukan" });
    return;
  }
  res.json(formatMaterial(updated));
});

export default router;
