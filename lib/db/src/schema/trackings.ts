import { pgTable, text, uuid, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { materialRequestsTable } from "./materialRequests";
import { usersTable } from "./users";

export const trackingsTable = pgTable("trackings", {
  id: uuid("id").primaryKey().defaultRandom(),
  trackingCode: text("tracking_code").unique().notNull(),
  materialRequestId: uuid("material_request_id").references(() => materialRequestsTable.id),
  qtyIssued: integer("qty_issued").notNull(),
  issuedBy: uuid("issued_by").references(() => usersTable.id),
  issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
  slaDeadline: timestamp("sla_deadline", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("dikirim").$type<"dikirim" | "diterima_cabang" | "menunggu_verifikasi" | "terverifikasi" | "kritis">(),
  qrCodeUrl: text("qr_code_url"),
  riskScore: numeric("risk_score", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertTrackingSchema = createInsertSchema(trackingsTable).omit({ id: true, createdAt: true, issuedAt: true });
export type InsertTracking = z.infer<typeof insertTrackingSchema>;
export type Tracking = typeof trackingsTable.$inferSelect;
