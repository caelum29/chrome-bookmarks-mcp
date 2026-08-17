// Zod helpers that coerce agent-supplied arguments at the boundary instead of failing with
// `-32602 invalid params` (ADR-0003). Models send "true", "5", '["a"]' — accept them.
import { z } from "zod";

const TRUTHY = new Set(["true", "1", "yes", "on"]);
const FALSY = new Set(["false", "0", "no", "off", ""]);

/** Boolean that treats "false" as false — `z.coerce.boolean()` does not. */
export function CoercedBool() {
  return z.preprocess((v) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (TRUTHY.has(s)) return true;
      if (FALSY.has(s)) return false;
    }
    return v; // let z.boolean() produce a meaningful error
  }, z.boolean());
}

/** Integer accepting numeric strings. */
export function CoercedInt() {
  return z.coerce.number().int();
}

/** Bounded integer with a default; out-of-range values are clamped, not rejected. */
export function limitParam(max: number, def: number, min = 1) {
  return z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return def;
    const n = typeof v === "string" ? Number(v) : v;
    if (typeof n !== "number" || Number.isNaN(n)) return v;
    return Math.min(max, Math.max(min, Math.trunc(n)));
  }, z.number().int().min(min).max(max));
}

// JSON-parse strings; on failure fall through unchanged so the inner schema reports the real problem.
function parseIfString(v: unknown): unknown {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

/** Array that also accepts a JSON-encoded string. */
export function jsonArray<T extends z.ZodTypeAny>(item: T) {
  return z.preprocess(parseIfString, z.array(item));
}

/** Non-empty trimmed string. */
export function NonEmptyString() {
  return z.string().trim().min(1);
}
