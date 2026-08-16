import { z } from "zod";

import { cardOptionSchema, eventFamilySchema, residentKindSchema, roleSchema } from "./state.js";

/**
 * District command payloads for the R0 slice. The command gateway validates
 * these before journaling; the deterministic step validates them again and
 * rejects with INVALID_PAYLOAD on mismatch.
 */

export const provisionResidentPayloadSchema = z.object({
  residentId: z.string().min(1),
  kind: residentKindSchema,
  role: roleSchema,
  displayName: z.string().min(1),
  sponsoredAiResidentId: z.string().min(1).nullable(),
});
export type ProvisionResidentPayload = z.infer<typeof provisionResidentPayloadSchema>;

export const assignCardPayloadSchema = z.object({
  residentId: z.string().min(1),
  card: z.object({
    cardId: z.string().min(1),
    templateId: z.string().min(1),
    eventFamily: eventFamilySchema,
    /** Template-defined expiry window; default 48h (Implementation Plan §7.3). */
    expiresAfterHours: z
      .number()
      .int()
      .positive()
      .max(24 * 14)
      .default(48),
    options: z.array(cardOptionSchema).min(2).max(3),
  }),
});
export type AssignCardPayload = z.infer<typeof assignCardPayloadSchema>;

export const commitChoicePayloadSchema = z.object({
  residentId: z.string().min(1),
  cardId: z.string().min(1),
  optionId: z.string().min(1),
  /** Optimistic concurrency guard against DistrictState.stateVersion; null skips the check. */
  expectedStateVersion: z.number().int().min(0).nullable(),
});
export type CommitChoicePayload = z.infer<typeof commitChoicePayloadSchema>;

export const declineCardPayloadSchema = z.object({
  residentId: z.string().min(1),
  cardId: z.string().min(1),
  reason: z.string().min(1).nullable(),
});
export type DeclineCardPayload = z.infer<typeof declineCardPayloadSchema>;

export const runDueEffectsPayloadSchema = z.object({
  /** Bounded work per step; leftover due effects wait for the next run. */
  limit: z.number().int().positive().max(500),
});
export type RunDueEffectsPayload = z.infer<typeof runDueEffectsPayloadSchema>;

export const upgradeBuildingPayloadSchema = z.object({
  residentId: z.string().min(1),
  buildingId: z.string().min(1),
  expectedLevel: z.number().int().min(1),
});
export type UpgradeBuildingPayload = z.infer<typeof upgradeBuildingPayloadSchema>;

export const expandDistrictPayloadSchema = z.object({
  residentId: z.string().min(1),
  parcelId: z.string().min(1),
});
export type ExpandDistrictPayload = z.infer<typeof expandDistrictPayloadSchema>;

export const districtCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("season.provision_resident"),
    payload: provisionResidentPayloadSchema,
  }),
  z.object({ type: z.literal("card.assign"), payload: assignCardPayloadSchema }),
  z.object({ type: z.literal("card.commit_choice"), payload: commitChoicePayloadSchema }),
  z.object({ type: z.literal("card.decline"), payload: declineCardPayloadSchema }),
  z.object({ type: z.literal("building.upgrade"), payload: upgradeBuildingPayloadSchema }),
  z.object({ type: z.literal("district.expand"), payload: expandDistrictPayloadSchema }),
  z.object({ type: z.literal("runtime.run_due_effects"), payload: runDueEffectsPayloadSchema }),
]);
export type DistrictCommand = z.infer<typeof districtCommandSchema>;
export type DistrictCommandType = DistrictCommand["type"];

/**
 * The journaled input the deterministic step consumes: the validated command
 * plus its committed identity and total order within the district partition.
 */
export const appliedCommandInputSchema = z.object({
  commandId: z.string().min(1),
  sequence: z.number().int().positive(),
  command: districtCommandSchema,
});
export type AppliedCommandInput = z.infer<typeof appliedCommandInputSchema>;
