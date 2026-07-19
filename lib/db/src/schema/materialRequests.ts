import { pgTable, text, uuid, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workOrdersTable } from "./workOrders";
import { materialsTable } from "./materials";
import { usersTable } from "./users";

export const materialRequestsTable = pgTable("material_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestNumber: text("request_number").unique().notNull(),
  workOrderId: uuid("work_order_id").references(() => workOrdersTable.id),
  materialId: uuid("material_id").references(() => materialsTable.id).notNull(),
  qtyRequested: integer("qty_requested").notNull(),
  requestedBy: uuid("requested_by").references(() => usersTable.id),
  approvedBy: uuid("approved_by").references(() => usersTable.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  status: text("status").notNull().default("pending").$type<"pending" | "approved" | "rejected">(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertMaterialRequestSchema = createInsertSchema(materialRequestsTable).omit({ id: true, createdAt: true });
export type InsertMaterialRequest = z.infer<typeof insertMaterialRequestSchema>;
export type MaterialRequest = typeof materialRequestsTable.$inferSelect;
