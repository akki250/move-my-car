import { Router, type IRouter, type RequestHandler } from "express";
import { getAuth } from "@clerk/express";
import healthRouter from "./health";
import {
  getMongoDb,
  nextId,
  type MongoQrCode,
  type MongoScanLog,
  type MongoSetting,
  type MongoUser,
} from "../lib/mongo";

const router: IRouter = Router();
const users = () => getMongoDb().then((db) => db.collection<MongoUser>("users"));
const qrCodes = () => getMongoDb().then((db) => db.collection<MongoQrCode>("qr_codes"));
const scanLogs = () => getMongoDb().then((db) => db.collection<MongoScanLog>("scan_logs"));
const settings = () => getMongoDb().then((db) => db.collection<MongoSetting>("settings"));

function sessionIdentity(req: Parameters<RequestHandler>[0]) {
  const auth = getAuth(req);
  if (!auth.userId) return null;
  const claims = (auth.sessionClaims ?? {}) as Record<string, unknown>;
  const email = typeof claims.email === "string" ? claims.email : "";
  const claimUsername = typeof claims.username === "string" ? claims.username : "";
  return {
    clerkUserId: auth.userId,
    username: claimUsername || email.split("@")[0] || `driver-${auth.userId.slice(-8)}`,
  };
}

async function ensureMongoUser(req: Parameters<RequestHandler>[0]) {
  const identity = sessionIdentity(req);
  if (!identity) return null;
  const collection = await users();
  const existing = await collection.findOne({ clerkUserId: identity.clerkUserId });
  if (existing) return existing;
  const user: MongoUser = {
    id: await nextId("users"),
    clerkUserId: identity.clerkUserId,
    username: identity.username,
    createdAt: new Date(),
  };
  try {
    await collection.insertOne(user);
    return user;
  } catch {
    return collection.findOne({ clerkUserId: identity.clerkUserId });
  }
}

const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const user = await ensureMongoUser(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.mongoUser = user;
    next();
  } catch (error) {
    next(error);
  }
};

const idOf = (value: string | string[]) => Number(Array.isArray(value) ? value[0] : value);
const publicQr = (row: MongoQrCode) => ({
  id: row.id,
  label: row.label,
  location: row.location,
  active: row.active,
  createdAt: row.createdAt,
  forwardPhone: row.forwardPhone,
});
const logView = (row: MongoScanLog, label?: string) => ({
  id: row.id,
  qrCodeId: row.qrCodeId,
  action: row.action,
  scannedAt: row.scannedAt,
  label: label ?? `QR code ${row.qrCodeId}`,
});

router.use(healthRouter);

router.get("/auth/me", async (req, res, next) => {
  try {
    const user = await ensureMongoUser(req);
    const auth = getAuth(req);
    res.json({
      authenticated: Boolean(auth.userId && user),
      userId: user?.id ?? null,
      username: user?.username ?? null,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/qr-codes", requireAuth, async (req, res, next) => {
  try {
    const rows = await (await qrCodes()).find({ userId: req.mongoUser!.id }).sort({ createdAt: -1 }).toArray();
    res.json(rows.map(publicQr));
  } catch (error) {
    next(error);
  }
});

router.post("/qr-codes", requireAuth, async (req, res, next) => {
  try {
    const { label, location, forwardPhone = null } = req.body ?? {};
    if (typeof label !== "string" || !label.trim() || typeof location !== "string" || !location.trim()) {
      res.status(400).json({ error: "Label and location are required" });
      return;
    }
    const row: MongoQrCode = {
      id: await nextId("qr_codes"),
      userId: req.mongoUser!.id,
      label: label.trim(),
      location: location.trim(),
      active: true,
      createdAt: new Date(),
      forwardPhone: typeof forwardPhone === "string" && forwardPhone.trim() ? forwardPhone.trim() : null,
    };
    await (await qrCodes()).insertOne(row);
    res.status(201).json(publicQr(row));
  } catch (error) {
    next(error);
  }
});

router.get("/qr-codes/:id", requireAuth, async (req, res, next) => {
  try {
    const row = await (await qrCodes()).findOne({ id: idOf(req.params.id), userId: req.mongoUser!.id });
    if (!row) {
      res.status(404).json({ error: "QR code not found" });
      return;
    }
    res.json(publicQr(row));
  } catch (error) {
    next(error);
  }
});

router.patch("/qr-codes/:id", requireAuth, async (req, res, next) => {
  try {
    const id = idOf(req.params.id);
    const updates: Partial<MongoQrCode> = {};
    if (typeof req.body?.label === "string" && req.body.label.trim()) updates.label = req.body.label.trim();
    if (typeof req.body?.location === "string" && req.body.location.trim()) updates.location = req.body.location.trim();
    if (typeof req.body?.active === "boolean") updates.active = req.body.active;
    if (req.body?.forwardPhone === null || typeof req.body?.forwardPhone === "string") updates.forwardPhone = req.body.forwardPhone;
    const result = await (await qrCodes()).findOneAndUpdate(
      { id, userId: req.mongoUser!.id },
      { $set: updates },
      { returnDocument: "after" },
    );
    if (!result) {
      res.status(404).json({ error: "QR code not found" });
      return;
    }
    res.json(publicQr(result));
  } catch (error) {
    next(error);
  }
});

router.delete("/qr-codes/:id", requireAuth, async (req, res, next) => {
  try {
    const id = idOf(req.params.id);
    const result = await (await qrCodes()).deleteOne({ id, userId: req.mongoUser!.id });
    if (!result.deletedCount) {
      res.status(404).json({ error: "QR code not found" });
      return;
    }
    await (await scanLogs()).deleteMany({ qrCodeId: id });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post("/scan/:qrId", async (req, res, next) => {
  try {
    const qrId = idOf(req.params.qrId);
    const qr = await (await qrCodes()).findOne({ id: qrId });
    if (!qr) {
      res.status(404).json({ error: "QR code not found" });
      return;
    }
    const log: MongoScanLog = {
      id: await nextId("scan_logs"),
      qrCodeId: qrId,
      action: "scan",
      scannedAt: new Date(),
      ipAddress: req.ip,
    };
    await (await scanLogs()).insertOne(log);
    const ownerPhone = await (await settings()).findOne({ key: `owner_phone:${qr.userId}` });
    res.json({
      qrCodeId: qr.id,
      label: qr.label,
      location: qr.location,
      active: qr.active,
      scanLogId: log.id,
      twilioPhone: null,
      directPhone: ownerPhone?.value ?? qr.forwardPhone ?? null,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/scan/:qrId/action", async (req, res, next) => {
  try {
    const qrId = idOf(req.params.qrId);
    const action = req.body?.action;
    if (action !== "call" && action !== "text") {
      res.status(400).json({ error: "Action must be call or text" });
      return;
    }
    if (!(await (await qrCodes()).findOne({ id: qrId }))) {
      res.status(404).json({ error: "QR code not found" });
      return;
    }
    await (await scanLogs()).insertOne({
      id: await nextId("scan_logs"),
      qrCodeId: qrId,
      action,
      scannedAt: new Date(),
      ipAddress: req.ip,
    });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/stats", requireAuth, async (req, res, next) => {
  try {
    const qrRows = await (await qrCodes()).find({ userId: req.mongoUser!.id }).toArray();
    const ids = qrRows.map((row) => row.id);
    const logs = ids.length ? await (await scanLogs()).find({ qrCodeId: { $in: ids } }).sort({ scannedAt: -1 }).toArray() : [];
    const labelMap = new Map(qrRows.map((row) => [row.id, row.label]));
    res.json({
      totalQrCodes: qrRows.length,
      activeQrCodes: qrRows.filter((row) => row.active).length,
      totalScans: logs.filter((row) => row.action === "scan").length,
      totalCalls: logs.filter((row) => row.action === "call").length,
      totalTexts: logs.filter((row) => row.action === "text").length,
      recentLogs: logs.slice(0, 20).map((row) => logView(row, labelMap.get(row.qrCodeId))),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/scan-logs", requireAuth, async (req, res, next) => {
  try {
    const qrRows = await (await qrCodes()).find({ userId: req.mongoUser!.id }).toArray();
    const ids = qrRows.map((row) => row.id);
    const logs = ids.length
      ? await (await scanLogs()).find({ qrCodeId: { $in: ids } }).sort({ scannedAt: -1 }).limit(Math.min(Number(req.query.limit) || 20, 100)).toArray()
      : [];
    const labels = new Map(qrRows.map((row) => [row.id, row.label]));
    res.json(logs.map((row) => logView(row, labels.get(row.qrCodeId))));
  } catch (error) {
    next(error);
  }
});

router.get("/settings", requireAuth, async (req, res, next) => {
  try {
    const row = await (await settings()).findOne({ key: `owner_phone:${req.mongoUser!.id}` });
    res.json({ ownerPhone: row?.value ?? null });
  } catch (error) {
    next(error);
  }
});

router.put("/settings", requireAuth, async (req, res, next) => {
  try {
    const ownerPhone = req.body?.ownerPhone;
    if (ownerPhone !== null && typeof ownerPhone !== "string") {
      res.status(400).json({ error: "Invalid forwarding number" });
      return;
    }
    await (await settings()).updateOne(
      { key: `owner_phone:${req.mongoUser!.id}` },
      { $set: { key: `owner_phone:${req.mongoUser!.id}`, userId: req.mongoUser!.id, value: ownerPhone, updatedAt: new Date() } },
      { upsert: true },
    );
    res.json({ ownerPhone });
  } catch (error) {
    next(error);
  }
});

router.get("/users", requireAuth, async (_req, res, next) => {
  try {
    const rows = await (await users()).find({}).sort({ createdAt: 1 }).toArray();
    res.json(rows.map(({ id, username, createdAt }) => ({ id, username, createdAt })));
  } catch (error) {
    next(error);
  }
});

router.post("/users", requireAuth, (_req, res) => {
  res.status(400).json({ error: "Create accounts through the Clerk sign-up page." });
});

router.delete("/users/:id", requireAuth, async (req, res, next) => {
  try {
    const id = idOf(req.params.id);
    if (id === req.mongoUser!.id) {
      res.status(400).json({ error: "You cannot delete your own account" });
      return;
    }
    const deleted = await (await users()).deleteOne({ id });
    if (!deleted.deletedCount) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const ownedQr = await (await qrCodes()).find({ userId: id }).project({ id: 1 }).toArray();
    const qrIds = ownedQr.map((row) => row.id);
    if (qrIds.length) await (await scanLogs()).deleteMany({ qrCodeId: { $in: qrIds } });
    await (await qrCodes()).deleteMany({ userId: id });
    await (await settings()).deleteMany({ userId: id });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;