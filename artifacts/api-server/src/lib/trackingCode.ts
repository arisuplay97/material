import { db, trackingsTable } from "@workspace/db";
import { count } from "drizzle-orm";

export async function generateTrackingCode(): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  const [result] = await db.select({ c: count() }).from(trackingsTable);
  const seq = String((result?.c ?? 0) + 1).padStart(6, "0");

  return `TRK-${yy}${mm}${dd}-${seq}`;
}

export async function generateRequestNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  return `MPG-${year}-${String(Math.floor(Math.random() * 99999) + 1).padStart(5, "0")}`;
}
