// Structured stderr logger. stdout is the MCP stream — nothing else may write there.
import type { LogLevel } from "./config.js";

export type { LogLevel };

export interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
}

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/** Create a logger writing `[chrome-bookmarks-mcp] LEVEL msg {json}` lines to stderr. */
export function createLogger(minLevel: LogLevel = "info", sink = process.stderr): Logger {
  const write = (level: LogLevel, msg: string, data?: Record<string, unknown>) => {
    if (ORDER[level] < ORDER[minLevel]) return;
    const tail = data ? ` ${JSON.stringify(data)}` : "";
    sink.write(`[chrome-bookmarks-mcp] ${level.toUpperCase()} ${msg}${tail}\n`);
  };
  return {
    debug: (m, d) => write("debug", m, d),
    info: (m, d) => write("info", m, d),
    warn: (m, d) => write("warn", m, d),
    error: (m, d) => write("error", m, d),
  };
}

/** Logger that discards everything — for tests. */
export const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};
