import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Temporary diagnostic route to debug database connection on Vercel
router.get("/db-check", async (_req, res) => {
  try {
    const users = await db.select().from(usersTable).limit(1);
    res.json({
      status: "connected",
      message: "Database connection successful!",
      usersCount: users.length,
      databaseUrlMasked: process.env.DATABASE_URL 
        ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@") // Mask password
        : "Not set"
    });
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      message: err.message,
      stack: err.stack,
      databaseUrlMasked: process.env.DATABASE_URL 
        ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@") // Mask password
        : "Not set"
    });
  }
});

export default router;
