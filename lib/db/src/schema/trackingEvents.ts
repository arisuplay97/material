import { pgTable, text, uuid, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { trackingsTable } from "./trackings";
import { usersTable } from "./users";

export const trackingEventsTable = pgTable("tracking_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  trackingId: uuid("tracking_id").references(() => trackingsTable.id, { onDelete: "cascade" }).notNull(),
  step: text("step").notNull().$type<"keluar_gudang" | "diterima_cabang" | "dipasang" | "selesai">(),
  actorId: uuid("actor_id").references(() => usersTable.id),
  gpsLat: doublePrecision("gps_lat"),
  gpsLng: doublePrecision("gps_lng"),
  photoUrl: text("photo_url"),
  qrScannedCode: text("qr_scanned_code"),
  notes: text("notes"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertTrackingEventSchema = createInsertSchema(trackingEventsTable).omit({ id: true, occurredAt: true });
export type InsertTrackingEvent = z.infer<typeof insertTrackingEventSchema>;
export type TrackingEvent = typeof trackingEventsTable.$inferSelect;
