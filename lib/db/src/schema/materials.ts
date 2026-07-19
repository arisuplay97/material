import { pgTable, text, uuid, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { branchesTable } from "./branches";

export const materialsTable = pgTable("materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").unique().notNull(),
  name: text("name").notNull(),
  category: text("category").notNull().$type<"valve" | "pipe" | "fitting" | "meter" | "other">(),
  unit: text("unit").notNull(),
  unitPrice: numeric("unit_price", { precision: 14, scale: 2 }),
  currentStock: integer("current_stock").notNull().default(0),
  branchId: uuid("branch_id").references(() => branchesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertMaterialSchema = createInsertSchema(materialsTable).omit({ id: true, createdAt: true });
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type Material = typeof materialsTable.$inferSelect;
