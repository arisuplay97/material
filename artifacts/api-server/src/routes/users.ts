import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { db, usersTable, branchesTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { CreateUserBody, UpdateUserBody } from "@workspace/api-zod";

const router = Router();

router.use(requireAuth);

function formatUser(u: typeof usersTable.$inferSelect, branchName?: string | null) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    branchId: u.branchId ?? null,
    branchName: branchName ?? null,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  };
}

router.get("/users", requireRole("superadmin", "spi"), async (req, res): Promise<void> => {
  const { role, branchId, isActive } = req.query as Record<string, string>;

  const rows = await db
    .select({ u: usersTable, b: branchesTable })
    .from(usersTable)
    .leftJoin(branchesTable, eq(usersTable.branchId, branchesTable.id));

  let filtered = rows;
  if (role) filtered = filtered.filter((r) => r.u.role === role);
  if (branchId) filtered = filtered.filter((r) => r.u.branchId === branchId);
  if (isActive !== undefined) filtered = filtered.filter((r) => r.u.isActive === (isActive === "true"));

  res.json(filtered.map((r) => formatUser(r.u, r.b?.name)));
});

router.post("/users", requireRole("superadmin"), async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, password, role, branchId } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(400).json({ error: "Email sudah terdaftar" });
    return;
  }

  const [newUser] = await db
    .insert(usersTable)
    .values({ name, email, passwordHash, role, branchId: branchId ?? null })
    .returning();

  const [branch] = branchId
    ? await db.select().from(branchesTable).where(eq(branchesTable.id, branchId))
    : [null];

  res.status(201).json(formatUser(newUser, branch?.name ?? null));
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [row] = await db
    .select({ u: usersTable, b: branchesTable })
    .from(usersTable)
    .leftJoin(branchesTable, eq(usersTable.branchId, branchesTable.id))
    .where(eq(usersTable.id, id));

  if (!row) {
    res.status(404).json({ error: "User tidak ditemukan" });
    return;
  }
  res.json(formatUser(row.u, row.b?.name));
});

router.put("/users/:id", requireRole("superadmin"), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.email !== undefined) updates.email = parsed.data.email;
  if (parsed.data.role !== undefined) updates.role = parsed.data.role;
  if ("branchId" in parsed.data) updates.branchId = parsed.data.branchId ?? null;
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "User tidak ditemukan" });
    return;
  }

  const [branch] = updated.branchId
    ? await db.select().from(branchesTable).where(eq(branchesTable.id, updated.branchId))
    : [null];

  res.json(formatUser(updated, branch?.name ?? null));
});

router.delete("/users/:id", requireRole("superadmin"), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await db.update(usersTable).set({ isActive: false }).where(eq(usersTable.id, id));
  res.json({ success: true, message: "User dinonaktifkan" });
});

export default router;
