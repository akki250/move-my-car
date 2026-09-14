import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { qrCodesTable } from "./qr-codes";

export const scanLogsTable = pgTable("scan_logs", {
  id: serial("id").primaryKey(),
  qrCodeId: integer("qr_code_id").notNull().references(() => qrCodesTable.id, { onDelete: "cascade" }),
  scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
  action: text("action").notNull(),
  ipAddress: text("ip_address"),
});

export type ScanLog = typeof scanLogsTable.$inferSelect;