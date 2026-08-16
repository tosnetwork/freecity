import { z } from "zod";

import { isoTimestampSchema, residentKindSchema, roleSchema } from "./state.js";

/**
 * District events emitted by the deterministic step. Event content is fully
 * deterministic; the runtime assigns storage identity (event id, event_seq)
 * outside the rules.
 */

export const residentProvisionedSchema = z.object({
  eventType: z.literal("ResidentProvisioned"),
  residentId: z.string().min(1),
  kind: residentKindSchema,
  role: roleSchema,
  displayName: z.string().min(1),
  sponsoredAiResidentId: z.string().min(1).nullable(),
  initialFocus: z.number().int().min(0),
});

export const cardAssignedSchema = z.object({
  eventType: z.literal("CardAssigned"),
  residentId: z.string().min(1),
  cardId: z.string().min(1),
  templateId: z.string().min(1),
  expiresAt: isoTimestampSchema,
});

export const focusSpentSchema = z.object({
  eventType: z.literal("FocusSpent"),
  residentId: z.string().min(1),
  cardId: z.string().min(1),
  optionId: z.string().min(1),
  amount: z.number().int().positive(),
  remaining: z.number().int().min(0),
});

export const choiceCommittedSchema = z.object({
  eventType: z.literal("ChoiceCommitted"),
  residentId: z.string().min(1),
  cardId: z.string().min(1),
  optionId: z.string().min(1),
});

export const cardDeclinedSchema = z.object({
  eventType: z.literal("CardDeclined"),
  residentId: z.string().min(1),
  cardId: z.string().min(1),
  reason: z.string().min(1).nullable(),
});

export const immediateReactionRecordedSchema = z.object({
  eventType: z.literal("ImmediateReactionRecorded"),
  residentId: z.string().min(1),
  cardId: z.string().min(1),
  optionId: z.string().min(1),
  reactionText: z.string().min(1),
});

export const consequenceScheduledSchema = z.object({
  eventType: z.literal("ConsequenceScheduled"),
  residentId: z.string().min(1),
  consequenceId: z.string().min(1),
  cardId: z.string().min(1),
  optionId: z.string().min(1),
  dueAt: isoTimestampSchema,
});

export const consequenceResolvedSchema = z.object({
  eventType: z.literal("ConsequenceResolved"),
  residentId: z.string().min(1),
  consequenceId: z.string().min(1),
  cardId: z.string().min(1),
  optionId: z.string().min(1),
  consequenceText: z.string().min(1),
});

export const cardExpiredSchema = z.object({
  eventType: z.literal("CardExpired"),
  residentId: z.string().min(1),
  cardId: z.string().min(1),
});

export const focusRefreshedSchema = z.object({
  eventType: z.literal("FocusRefreshed"),
  residentId: z.string().min(1),
  focus: z.number().int().min(0),
  dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const archiveEntryRecordedSchema = z.object({
  eventType: z.literal("ArchiveEntryRecorded"),
  residentId: z.string().min(1),
  entryType: z.enum(["choice", "decline", "consequence", "card_expired"]),
  cardId: z.string().min(1).nullable(),
  consequenceId: z.string().min(1).nullable(),
  summary: z.string().min(1),
});

export const districtEventSchema = z.discriminatedUnion("eventType", [
  residentProvisionedSchema,
  cardAssignedSchema,
  focusSpentSchema,
  choiceCommittedSchema,
  cardDeclinedSchema,
  immediateReactionRecordedSchema,
  consequenceScheduledSchema,
  consequenceResolvedSchema,
  cardExpiredSchema,
  focusRefreshedSchema,
  archiveEntryRecordedSchema,
]);
export type DistrictEvent = z.infer<typeof districtEventSchema>;
export type DistrictEventType = DistrictEvent["eventType"];
