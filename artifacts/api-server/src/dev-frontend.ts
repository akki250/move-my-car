/**
 * Development-only helper.
 *
 * The platform exposes a single dev server (this API server), but the actual
 * UI lives in the sibling `@workspace/move-my-car` Vite app. To make the whole
 * product reachable on one port, we run Vite as a child process and proxy every
 * non-`/api` request to it — including the HMR websocket. In production the
 * frontend is built to static files and served by the platform, so none of this
 * runs (it is behind a `NODE_ENV !== "production"` guard in `index.ts`).
 */
import { spawn } from "node:child_process";
import net from "node:net";
import { createProxyMiddleware, type RequestHandler } from "http-proxy-middleware";
import { logger } from "./lib/logger";

const FRONTEND_PORT = Number(process.env.FRONTEND_PORT) || 5173;

export function startFrontendProxy(): RequestHandler {
  const child = spawn("pnpm", ["--filter", "@workspace/move-my-car", "run", "dev"], {
    env: {
      ...process.env,
      PORT: String(FRONTEND_PORT),
      BASE_PATH: process.env.BASE_PATH ?? "/",
    },
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    logger.warn({ code }, "Frontend dev server exited");
  });
  process.on("exit", () => child.kill());

  return createProxyMiddleware({
    target: `http://localhost:${FRONTEND_PORT}`,
    changeOrigin: true,
    ws: true,
    on: {
      error: (err, _req, res) => {
        logger.debug({ err }, "Frontend proxy error (Vite may still be starting)");
        if (res && "writeHead" in res && !res.headersSent) {
          res.writeHead(503, { "content-type": "text/plain", "retry-after": "1" });
          res.end("Frontend dev server is starting, please refresh in a moment.");
        }
      },
    },
  });
}

/**
 * Resolve once the Vite dev server is accepting connections, so the very first
 * browser request is proxied to a ready server instead of getting a 503.
 */
export async function waitForFrontend(timeoutMs = 20000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const reachable = await new Promise<boolean>((resolve) => {
      const socket = net.connect(FRONTEND_PORT, "localhost");
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => {
        socket.destroy();
        resolve(false);
      });
    });
    if (reachable) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  logger.warn("Timed out waiting for the frontend dev server; proxying anyway");
}
