import { pgTable, text, uuid, timestamp, integer, doublePrecision, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { trackingsTable } from "./trackings";
import { usersTable } from "./users";

export const installationProofsTable = pgTable("installation_proofs", {
  id: uuid("id").primaryKey().defaultRandom(),
  trackingId: uuid("tracking_id").references(() => trackingsTable.id).notNull(),
  submittedBy: uuid("submitted_by").references(() => usersTable.id),
  qtyUsed: integer("qty_used").notNull(),
  qtyReturned: integer("qty_returned").notNull().default(0),
  photoUrl: text("photo_url").notNull(),
  photoTakenAt: timestamp("photo_taken_at", { withTimezone: true }).notNull(),
  gpsLat: doublePrecision("gps_lat").notNull(),
  gpsLng: doublePrecision("gps_lng").notNull(),
  gpsAccuracyMeters: numeric("gps_accuracy_meters", { precision: 6, scale: 2 }),
  gpsProvider: text("gps_provider"),
  isMockLocation: boolean("is_mock_location").default(false),
  withinServiceArea: boolean("within_service_area"),
  flaggedForReview: boolean("flagged_for_review").default(false),
  flagReasons: text("flag_reasons"), // JSON array stored as text
  reviewedBy: uuid("reviewed_by").references(() => usersTable.id),
  reviewStatus: text("review_status").$type<"pending" | "approved" | "rejected">(),
  deviceFingerprint: text("device_fingerprint"),
  ipAddress: text("ip_address"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertInstallationProofSchema = createInsertSchema(installationProofsTable).omit({ id: true, submittedAt: true });
export type InsertInstallationProof = z.infer<typeof insertInstallationProofSchema>;
export type InstallationProof = typeof installationProofsTable.$inferSelect;
