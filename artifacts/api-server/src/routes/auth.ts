import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, branchesTable } from "@workspace/db";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/auth";
import { requireAuth } from "../middlewares/requireAuth";
import { LoginBody, RefreshTokenBody } from "@workspace/api-zod";

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db
    .select({ u: usersTable, b: branchesTable })
    .from(usersTable)
    .leftJoin(branchesTable, eq(usersTable.branchId, branchesTable.id))
    .where(eq(usersTable.email, email));

  if (!user || !user.u.isActive) {
    res.status(401).json({ error: "Email atau password salah" });
    return;
  }

  const valid = await bcrypt.compare(password, user.u.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Email atau password salah" });
    return;
  }

  const payload = { userId: user.u.id, role: user.u.role, branchId: user.u.branchId ?? null };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.u.id,
      name: user.u.name,
      email: user.u.email,
      role: user.u.role,
      branchId: user.u.branchId ?? null,
      branchName: user.b?.name ?? null,
      isActive: user.u.isActive,
      createdAt: user.u.createdAt.toISOString(),
    },
  });
});

router.post("/auth/refresh", async (req, res): Promise<void> => {
  const parsed = RefreshTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "refreshToken required" });
    return;
  }

  try {
    const payload = verifyRefreshToken(parsed.data.refreshToken);
    const [user] = await db
      .select({ u: usersTable, b: branchesTable })
      .from(usersTable)
      .leftJoin(branchesTable, eq(usersTable.branchId, branchesTable.id))
      .where(eq(usersTable.id, payload.userId));

    if (!user || !user.u.isActive) {
      res.status(401).json({ error: "User tidak ditemukan" });
      return;
    }

    const newPayload = { userId: user.u.id, role: user.u.role, branchId: user.u.branchId ?? null };
    res.json({
      accessToken: signAccessToken(newPayload),
      refreshToken: signRefreshToken(newPayload),
      user: {
        id: user.u.id,
        name: user.u.name,
        email: user.u.email,
        role: user.u.role,
        branchId: user.u.branchId ?? null,
        branchName: user.b?.name ?? null,
        isActive: user.u.isActive,
        createdAt: user.u.createdAt.toISOString(),
      },
    });
  } catch {
    res.status(401).json({ error: "Refresh token tidak valid" });
  }
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ success: true, message: "Logged out" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select({ u: usersTable, b: branchesTable })
    .from(usersTable)
    .leftJoin(branchesTable, eq(usersTable.branchId, branchesTable.id))
    .where(eq(usersTable.id, req.user!.userId));

  if (!user) {
    res.status(404).json({ error: "User tidak ditemukan" });
    return;
  }

  res.json({
    id: user.u.id,
    name: user.u.name,
    email: user.u.email,
    role: user.u.role,
    branchId: user.u.branchId ?? null,
    branchName: user.b?.name ?? null,
    isActive: user.u.isActive,
    createdAt: user.u.createdAt.toISOString(),
  });
});

export default router;
