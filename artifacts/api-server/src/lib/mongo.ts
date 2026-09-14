import { Db, MongoClient } from "mongodb";

export type MongoUser = {
  id: number;
  clerkUserId: string;
  username: string;
  createdAt: Date;
};

export type MongoQrCode = {
  id: number;
  userId: number;
  label: string;
  location: string;
  active: boolean;
  createdAt: Date;
  forwardPhone: string | null;
};

export type MongoScanLog = {
  id: number;
  qrCodeId: number;
  action: "scan" | "call" | "text";
  scannedAt: Date;
  ipAddress?: string;
};

export type MongoSetting = {
  key: string;
  userId: number;
  value: string | null;
  updatedAt: Date;
};

let clientPromise: Promise<MongoClient> | undefined;
let indexesPromise: Promise<void> | undefined;

function getClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");
  clientPromise ??= new MongoClient(uri).connect();
  return clientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getClient();
  const db = client.db(process.env.MONGODB_DB_NAME ?? "move_my_car");
  indexesPromise ??= Promise.all([
    db.collection<MongoUser>("users").createIndex({ id: 1 }, { unique: true }),
    db.collection<MongoUser>("users").createIndex({ clerkUserId: 1 }, { unique: true }),
    db.collection<MongoUser>("users").createIndex({ username: 1 }, { unique: true }),
    db.collection<MongoQrCode>("qr_codes").createIndex({ id: 1 }, { unique: true }),
    db.collection<MongoScanLog>("scan_logs").createIndex({ id: 1 }, { unique: true }),
    db.collection<MongoSetting>("settings").createIndex({ key: 1 }, { unique: true }),
  ]).then(() => undefined);
  await indexesPromise;
  return db;
}

export async function nextId(sequence: string) {
  const db = await getMongoDb();
  const counter = await db.collection<{ _id: string; value: number }>("counters").findOneAndUpdate(
    { _id: sequence },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return counter?.value ?? 1;
}