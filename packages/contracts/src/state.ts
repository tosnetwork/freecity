import { z } from "zod";

/**
 * District Runtime snapshot state for the District Zero R0 slice.
 *
 * Canonicalization rules (see canonical.ts):
 * - no `undefined` anywhere — absent values are `null`;
 * - all numbers are safe integers;
 * - all timestamps are ISO 8601 UTC strings.
 */

export const roleSchema = z.enum(["builder", "creator", "merchant", "reporter", "mediator"]);
export type Role = z.infer<typeof roleSchema>;

export const residentKindSchema = z.enum(["human", "ai"]);
export type ResidentKind = z.infer<typeof residentKindSchema>;

export const isoTimestampSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/, "expected ISO 8601 UTC timestamp");

export const cardOptionSchema = z.object({
  optionId: z.string().min(1),
  label: z.string().min(1),
  focusCost: z.number().int().min(0).max(3),
  reactionText: z.string().min(1),
  consequenceDelayMinutes: z.number().int().min(0),
  consequenceText: z.string().min(1),
});
export type CardOption = z.infer<typeof cardOptionSchema>;

export const eventFamilySchema = z.enum([
  "relationship",
  "opportunity",
  "creation",
  "conflict_repair",
  "discovery",
  "district_civic",
]);
export type EventFamily = z.infer<typeof eventFamilySchema>;

export const cardInstanceSchema = z.object({
  cardId: z.string().min(1),
  templateId: z.string().min(1),
  eventFamily: eventFamilySchema,
  assignedAt: isoTimestampSchema,
  expiresAt: isoTimestampSchema,
  options: z.array(cardOptionSchema).min(2).max(3),
});
export type CardInstance = z.infer<typeof cardInstanceSchema>;

export const pendingConsequenceSchema = z.object({
  consequenceId: z.string().min(1),
  cardId: z.string().min(1),
  optionId: z.string().min(1),
  dueAt: isoTimestampSchema,
  consequenceText: z.string().min(1),
});
export type PendingConsequence = z.infer<typeof pendingConsequenceSchema>;

export const residentStateSchema = z.object({
  residentId: z.string().min(1),
  kind: residentKindSchema,
  role: roleSchema,
  displayName: z.string().min(1),
  /** For humans: the sponsored AI resident bound at provisioning; null for AI residents. */
  sponsoredAiResidentId: z.string().min(1).nullable(),
  focus: z.number().int().min(0),
  /** UTC day key (YYYY-MM-DD) of the last applied daily Focus refresh. */
  lastFocusRefreshDayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  activeCards: z.array(cardInstanceSchema),
  pendingConsequences: z.array(pendingConsequenceSchema),
});
export type ResidentState = z.infer<typeof residentStateSchema>;

export const districtStateSchema = z.object({
  districtId: z.string().min(1),
  seasonId: z.string().min(1),
  /** Monotonic optimistic-concurrency version; +1 per applied command. */
  stateVersion: z.number().int().min(0),
  /** Last applied district_sequence. */
  sequence: z.number().int().min(0),
  /** Explicit scheduler-provided step time of the last applied command. */
  stepTime: isoTimestampSchema,
  rulesetVersion: z.string().min(1),
  /** Recorded seed; the R0 slice rules draw no randomness, but the seed is pinned now. */
  rngSeed: z.string().min(1),
  residents: z.record(z.string(), residentStateSchema),
});
export type DistrictState = z.infer<typeof districtStateSchema>;

/** Daily Focus grant (Playable Experience §6.1: a normal day begins with three Focus). */
export const FOCUS_DAILY = 3;

/** Maximum simultaneously active primary cards (Playable Experience §5.1). */
export const MAX_ACTIVE_CARDS = 3;
