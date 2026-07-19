import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

const { Pool } = pg;

// Manual .env parser to load environment variables in local development
const envPath = path.resolve(__dirname, "../../../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const [key, ...valParts] = trimmed.split("=");
    if (key && valParts.length > 0) {
      const val = valParts.join("=").trim().replace(/^['"]|['"]$/g, "");
      process.env[key.trim()] = val;
    }
  });
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export * from "./schema";
