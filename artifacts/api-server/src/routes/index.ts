import { Router, type IRouter, type RequestHandler } from "express";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import healthRouter from "./health";
import { db } from "@workspace/db";
import { usersTable, qrCodesTable, scanLogsTable, settingsTable } from "@workspace/db";

const router: IRouter = Router();
const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.session.isAuthenticated || !req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};
const idOf = (value: string | string[]) => Number(Array.isArray(value) ? value[0] : value);
const publicQr = (row: typeof qrCodesTable.$inferSelect) => ({
  id: row.id, label: row.label, location: row.location, active: row.active,
  createdAt: row.createdAt, forwardPhone: row.forwardPhone,
});
const logView = (row: typeof scanLogsTable.$inferSelect, label?: string) => ({
  id: row.id, qrCodeId: row.qrCodeId, action: row.action,
  scannedAt: row.scannedAt, label: label ?? `QR code ${row.qrCodeId}`,
});

router.use(healthRouter);

router.post("/auth/login", async (req, res): Promise<void> => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Incorrect username or password" }); return;
  }
  await new Promise<void>((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
  req.session.isAuthenticated = true; req.session.userId = user.id; req.session.username = user.username;
  await new Promise<void>((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
  res.json({ ok: true, username: user.username });
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (username.length < 3 || password.length < 6) {
    res.status(400).json({ error: "Username must be 3+ characters and password 6+ characters" });
    return;
  }
  try {
    const [user] = await db.insert(usersTable).values({
      username,
      passwordHash: await bcrypt.hash(password, 12),
    }).returning({ id: usersTable.id, username: usersTable.username });
    await new Promise<void>((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
    req.session.isAuthenticated = true;
    req.session.userId = user.id;
    req.session.username = user.username;
    await new Promise<void>((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
    res.status(201).json({ ok: true, username: user.username });
  } catch {
    res.status(409).json({ error: "Username already exists" });
  }
});

router.get("/auth/me", (req, res) => {
  res.json({ authenticated: Boolean(req.session.isAuthenticated && req.session.userId), userId: req.session.userId ?? null, username: req.session.username ?? null });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
  res.clearCookie("connect.sid"); res.json({ ok: true });
});

router.get("/qr-codes", requireAuth, async (req, res): Promise<void> => {
  const rows = await db.select().from(qrCodesTable).where(eq(qrCodesTable.userId, req.session.userId!)).orderBy(desc(qrCodesTable.createdAt));
  res.json(rows.map(publicQr));
});

router.post("/qr-codes", requireAuth, async (req, res): Promise<void> => {
  const { label, location, forwardPhone = null } = req.body ?? {};
  if (typeof label !== "string" || !label.trim() || typeof location !== "string" || !location.trim()) {
    res.status(400).json({ error: "Label and location are required" }); return;
  }
  const [row] = await db.insert(qrCodesTable).values({ userId: req.session.userId!, label: label.trim(), location: location.trim(), forwardPhone }).returning();
  res.status(201).json(publicQr(row));
});

router.get("/qr-codes/:id", requireAuth, async (req, res): Promise<void> => {
  const [row] = await db.select().from(qrCodesTable).where(and(eq(qrCodesTable.id, idOf(req.params.id)), eq(qrCodesTable.userId, req.session.userId!))).limit(1);
  if (!row) { res.status(404).json({ error: "QR code not found" }); return; }
  res.json(publicQr(row));
});

router.patch("/qr-codes/:id", requireAuth, async (req, res): Promise<void> => {
  const { label, location, active, forwardPhone } = req.body ?? {};
  const updates: Partial<typeof qrCodesTable.$inferInsert> = {};
  if (typeof label === "string" && label.trim()) updates.label = label.trim();
  if (typeof location === "string" && location.trim()) updates.location = location.trim();
  if (typeof active === "boolean") updates.active = active;
  if (typeof forwardPhone === "string" || forwardPhone === null) updates.forwardPhone = forwardPhone;
  const [row] = await db.update(qrCodesTable).set(updates).where(and(eq(qrCodesTable.id, idOf(req.params.id)), eq(qrCodesTable.userId, req.session.userId!))).returning();
  if (!row) { res.status(404).json({ error: "QR code not found" }); return; }
  res.json(publicQr(row));
});

router.delete("/qr-codes/:id", requireAuth, async (req, res): Promise<void> => {
  const [row] = await db.delete(qrCodesTable).where(and(eq(qrCodesTable.id, idOf(req.params.id)), eq(qrCodesTable.userId, req.session.userId!))).returning();
  if (!row) { res.status(404).json({ error: "QR code not found" }); return; }
  res.json({ ok: true });
});

router.post("/scan/:qrId", async (req, res): Promise<void> => {
  const qrId = idOf(req.params.qrId);
  const [qr] = await db.select().from(qrCodesTable).where(eq(qrCodesTable.id, qrId)).limit(1);
  if (!qr) { res.status(404).json({ error: "QR code not found" }); return; }
  const [log] = await db.insert(scanLogsTable).values({ qrCodeId: qr.id, action: "scan", ipAddress: req.ip }).returning();
  const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.key, `owner_phone:${qr.userId}`)).limit(1);
  res.json({ qrCodeId: qr.id, label: qr.label, location: qr.location, active: qr.active, scanLogId: log.id, twilioPhone: null, directPhone: settings?.value ?? qr.forwardPhone ?? null });
});

router.post("/scan/:qrId/action", async (req, res): Promise<void> => {
  const qrId = idOf(req.params.qrId);
  const action = req.body?.action;
  if (action !== "call" && action !== "text") { res.status(400).json({ error: "Action must be call or text" }); return; }
  const [qr] = await db.select({ id: qrCodesTable.id }).from(qrCodesTable).where(eq(qrCodesTable.id, qrId)).limit(1);
  if (!qr) { res.status(404).json({ error: "QR code not found" }); return; }
  await db.insert(scanLogsTable).values({ qrCodeId: qrId, action, ipAddress: req.ip });
  res.json({ ok: true });
});

router.get("/stats", requireAuth, async (req, res): Promise<void> => {
  const qr = await db.select().from(qrCodesTable).where(eq(qrCodesTable.userId, req.session.userId!));
  const ids = qr.map((row) => row.id);
  const logs = ids.length ? await db.select().from(scanLogsTable).where(inArray(scanLogsTable.qrCodeId, ids)).orderBy(desc(scanLogsTable.scannedAt)).limit(20) : [];
  const labelMap = new Map(qr.map((row) => [row.id, row.label]));
  res.json({ totalQrCodes: qr.length, activeQrCodes: qr.filter((row) => row.active).length, totalScans: logs.filter((row) => row.action === "scan").length, totalCalls: logs.filter((row) => row.action === "call").length, totalTexts: logs.filter((row) => row.action === "text").length, recentLogs: logs.map((row) => logView(row, labelMap.get(row.qrCodeId))) });
});

router.get("/scan-logs", requireAuth, async (req, res): Promise<void> => {
  const qr = await db.select().from(qrCodesTable).where(eq(qrCodesTable.userId, req.session.userId!));
  const qrIds = qr.map((row) => row.id);
  const logs = qrIds.length ? await db.select().from(scanLogsTable).where(inArray(scanLogsTable.qrCodeId, qrIds)).orderBy(desc(scanLogsTable.scannedAt)).limit(Math.min(Number(req.query.limit) || 20, 100)) : [];
  const labels = new Map(qr.map((row) => [row.id, row.label]));
  res.json(logs.map((row) => logView(row, labels.get(row.qrCodeId))));
});

router.get("/settings", requireAuth, async (req, res): Promise<void> => {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, `owner_phone:${req.session.userId!}`)).limit(1);
  res.json({ ownerPhone: row?.value ?? null });
});

router.put("/settings", requireAuth, async (req, res): Promise<void> => {
  const ownerPhone = req.body?.ownerPhone;
  if (ownerPhone !== null && typeof ownerPhone !== "string") { res.status(400).json({ error: "Invalid forwarding number" }); return; }
  const key = `owner_phone:${req.session.userId!}`;
  await db.insert(settingsTable).values({ key, value: ownerPhone }).onConflictDoUpdate({ target: settingsTable.key, set: { value: ownerPhone, updatedAt: new Date() } });
  res.json({ ownerPhone });
});

router.get("/users", requireAuth, async (_req, res): Promise<void> => {
  const users = await db.select({ id: usersTable.id, username: usersTable.username, createdAt: usersTable.createdAt }).from(usersTable).orderBy(asc(usersTable.createdAt));
  res.json(users);
});

router.post("/users", requireAuth, async (req, res): Promise<void> => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (username.length < 3 || password.length < 6) { res.status(400).json({ error: "Username must be 3+ characters and password 6+ characters" }); return; }
  try {
    const [user] = await db.insert(usersTable).values({ username, passwordHash: await bcrypt.hash(password, 12) }).returning({ id: usersTable.id, username: usersTable.username, createdAt: usersTable.createdAt });
    res.status(201).json(user);
  } catch { res.status(409).json({ error: "Username already exists" }); }
});

router.delete("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const id = idOf(req.params.id);
  if (id === req.session.userId) { res.status(400).json({ error: "You cannot delete your own account" }); return; }
  const [deleted] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ ok: true });
});

export default router;