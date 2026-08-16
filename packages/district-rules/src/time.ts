/**
 * Pure, deterministic time helpers over ISO 8601 UTC strings. Nothing here
 * reads a clock; every function transforms explicitly provided timestamps.
 */

const MINUTE_MS = 60_000;

export function parseIso(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    throw new Error(`invalid ISO timestamp: ${iso}`);
  }
  return ms;
}

export function toIso(ms: number): string {
  return new Date(ms).toISOString();
}

export function addMinutes(iso: string, minutes: number): string {
  return toIso(parseIso(iso) + minutes * MINUTE_MS);
}

export function addHours(iso: string, hours: number): string {
  return addMinutes(iso, hours * 60);
}

/** true when `a` is at or before `b`. */
export function isDue(dueAt: string, stepTime: string): boolean {
  return parseIso(dueAt) <= parseIso(stepTime);
}

/** UTC day key (YYYY-MM-DD) used for the daily Focus refresh rollover. */
export function dayKey(iso: string): string {
  return toIso(parseIso(iso)).slice(0, 10);
}
