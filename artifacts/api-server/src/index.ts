import app from "./app";
import { logger } from "./lib/logger";
import bcrypt from "bcryptjs";
import { db, pool, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL PRIMARY KEY,
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
  `);
  const [owner] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, "owner")).limit(1);
  if (!owner) {
    const password = process.env.DASHBOARD_PASSWORD ?? "move-my-car";
    await db.insert(usersTable).values({ username: "owner", passwordHash: await bcrypt.hash(password, 12) });
    logger.info("Created initial owner dashboard account");
  }
  app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  });
}

void start().catch((err) => {
  logger.error({ err }, "Unable to start server");
  process.exit(1);
});
