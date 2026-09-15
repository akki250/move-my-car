import type { Socket } from "node:net";
import app from "./app";
import { logger } from "./lib/logger";

// The platform injects PORT in production; in development it isn't set, so
// default to 3000 — the port the preview proxy forwards to.
const rawPort = process.env["PORT"] ?? "3000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  if (process.env.NODE_ENV === "production") {
    app.listen(port, () => logger.info({ port }, "Server listening"));
    return;
  }

  // Development: serve the Vite frontend through this same port so the single
  // exposed dev server delivers both the UI and the /api routes.
  const { startFrontendProxy, waitForFrontend } = await import("./dev-frontend");
  const proxy = startFrontendProxy();

  app.use((req, res, next) => {
    if (req.path === "/api" || req.path.startsWith("/api/")) return next();
    return proxy(req, res, next);
  });

  await waitForFrontend();

  const server = app.listen(port, () =>
    logger.info({ port }, "Server listening (dev) — proxying frontend"),
  );
  server.on("upgrade", (req, socket, head) => {
    proxy.upgrade?.(req, socket as Socket, head);
  });
}

void start().catch((err) => {
  logger.error({ err }, "Unable to start server");
  process.exit(1);
});
