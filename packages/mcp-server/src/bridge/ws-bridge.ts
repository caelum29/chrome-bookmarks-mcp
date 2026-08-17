// Localhost WebSocket server the MV3 extension connects to. One extension at a time (last one wins);
// requests are correlated by id and time out. Binds 127.0.0.1 only — never exposed to the network.
import { randomUUID } from "node:crypto";
import { type WebSocket, WebSocketServer } from "ws";
import type { Logger } from "../logging.js";
import {
  BRIDGE_DISCONNECTED_MESSAGE,
  type BridgeClient,
  BridgeError,
  type BridgeMethod,
  type BridgeRequest,
  BridgeResponseSchema,
} from "./protocol.js";

export interface WsBridgeOptions {
  port: number;
  timeoutMs: number;
  log: Logger;
  /** Override for tests (ephemeral port = 0). */
  host?: string;
}

export interface WsBridge extends BridgeClient {
  /** Actual bound port (differs from options when 0 was requested). */
  readonly port: number;
  close(): Promise<void>;
}

interface Pending {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout;
}

/** Start listening. Resolves once the port is bound. */
export function startWsBridge(opts: WsBridgeOptions): Promise<WsBridge> {
  const { timeoutMs, log } = opts;
  const host = opts.host ?? "127.0.0.1";
  const wss = new WebSocketServer({ host, port: opts.port });
  let socket: WebSocket | undefined;
  const pending = new Map<string, Pending>();

  const failAll = (why: string) => {
    for (const [id, p] of pending) {
      clearTimeout(p.timer);
      p.reject(new BridgeError(why, "disconnected"));
      pending.delete(id);
    }
  };

  wss.on("connection", (ws, req) => {
    // localhost-only defense in depth: refuse anything that isn't a loopback peer
    const remote = req.socket.remoteAddress ?? "";
    if (!/^(127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)$/.test(remote)) {
      log.warn("bridge: rejected non-loopback connection", { remote });
      ws.close(1008, "loopback only");
      return;
    }
    if (socket && socket.readyState === socket.OPEN) {
      log.info("bridge: replacing existing extension connection");
      socket.close(1000, "replaced");
      failAll("extension reconnected");
    }
    socket = ws;
    log.info("bridge: extension connected");
    ws.on("message", (data) => {
      // boundary: the extension is another process — validate every frame
      let parsed: unknown;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        log.warn("bridge: non-JSON frame ignored");
        return;
      }
      const check = BridgeResponseSchema.safeParse(parsed);
      if (!check.success) {
        log.warn("bridge: malformed frame ignored", { issues: check.error.issues.length });
        return;
      }
      const msg = check.data;
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      clearTimeout(p.timer);
      if (msg.error) p.reject(new BridgeError(msg.error.message, "remote"));
      else p.resolve(msg.result);
    });
    ws.on("close", () => {
      if (socket === ws) {
        socket = undefined;
        log.info("bridge: extension disconnected");
        failAll("extension disconnected");
      }
    });
    ws.on("error", (e) => log.warn("bridge: socket error", { message: e.message }));
  });

  const bridge: WsBridge = {
    listening: true,
    get connected() {
      return socket !== undefined && socket.readyState === socket.OPEN;
    },
    get port() {
      const a = wss.address();
      return typeof a === "object" && a ? a.port : opts.port;
    },
    request<T>(method: BridgeMethod, params?: Record<string, unknown>): Promise<T> {
      const ws = socket;
      if (!ws || ws.readyState !== ws.OPEN) {
        return Promise.reject(new BridgeError(BRIDGE_DISCONNECTED_MESSAGE, "disconnected"));
      }
      const id = randomUUID();
      const req: BridgeRequest = params === undefined ? { id, method } : { id, method, params };
      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(
            new BridgeError(
              `extension did not answer "${method}" within ${timeoutMs}ms — is Chrome responsive?`,
              "timeout",
            ),
          );
        }, timeoutMs);
        pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
        ws.send(JSON.stringify(req), (err) => {
          if (!err) return;
          pending.delete(id);
          clearTimeout(timer);
          reject(
            new BridgeError(
              `could not send "${method}" to the extension: ${err.message}`,
              "disconnected",
            ),
          );
        });
      });
    },
    close() {
      failAll("bridge closing");
      socket?.close(1001, "server shutdown");
      return new Promise<void>((resolve) => wss.close(() => resolve()));
    },
  };

  return new Promise<WsBridge>((resolve, reject) => {
    wss.once("listening", () => {
      log.info("bridge: listening", { host, port: bridge.port });
      resolve(bridge);
    });
    wss.once("error", (e) =>
      reject(
        new Error(
          `bridge could not bind ${host}:${opts.port} — ${e.message}. Set BOOKMARKS_WS_PORT to a free port.`,
        ),
      ),
    );
  });
}
