// WebKit epoch ↔ Unix ms. Chrome stores µs since 1601-01-01 UTC in Bookmarks and History.
// This is the only place the conversion lives; the domain never sees WebKit values.

/** Microseconds between 1601-01-01 and 1970-01-01. */
const EPOCH_DELTA_US = 11_644_473_600_000_000n;

/** Convert a WebKit timestamp (µs since 1601, as string or number) to Unix ms. 0/invalid → 0. */
export function webkitToUnixMs(v: string | number | undefined | null): number {
  if (v === undefined || v === null || v === "" || v === 0 || v === "0") return 0;
  let us: bigint;
  try {
    us = typeof v === "number" ? BigInt(Math.trunc(v)) : BigInt(v);
  } catch {
    return 0;
  }
  if (us <= EPOCH_DELTA_US) return 0;
  return Number((us - EPOCH_DELTA_US) / 1000n);
}

/** Convert Unix ms to a WebKit timestamp string (µs since 1601). */
export function unixMsToWebkit(ms: number): string {
  return (BigInt(Math.trunc(ms)) * 1000n + EPOCH_DELTA_US).toString();
}
