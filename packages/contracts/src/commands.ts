import { z } from "zod";

import { contributionKindSchema, placeIdSchema } from "./city-world.js";
import {
  cardOptionSchema,
  eventFamilySchema,
  residentKindSchema,
  residentPreferencesSchema,
  roleSchema,
} from "./state.js";

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

const residentActorSchema = z.object({ residentId: z.string().min(1) });

export const visitPlacePayloadSchema = residentActorSchema.extend({ placeId: placeIdSchema });
export type VisitPlacePayload = z.infer<typeof visitPlacePayloadSchema>;

export const inviteRelationshipPayloadSchema = residentActorSchema.extend({
  relationshipId: z.string().min(1),
  addresseeId: z.string().min(1),
  note: z.string().min(1).max(280).nullable(),
});
export type InviteRelationshipPayload = z.infer<typeof inviteRelationshipPayloadSchema>;

export const respondRelationshipPayloadSchema = residentActorSchema.extend({
  relationshipId: z.string().min(1),
  response: z.enum(["accept", "decline"]),
});
export type RespondRelationshipPayload = z.infer<typeof respondRelationshipPayloadSchema>;

export const cancelRelationshipPayloadSchema = residentActorSchema.extend({
  relationshipId: z.string().min(1),
});
export type CancelRelationshipPayload = z.infer<typeof cancelRelationshipPayloadSchema>;

export const repairRelationshipPayloadSchema = residentActorSchema.extend({
  relationshipId: z.string().min(1),
  note: z.string().min(1).max(280),
});
export type RepairRelationshipPayload = z.infer<typeof repairRelationshipPayloadSchema>;

export const createCirclePayloadSchema = residentActorSchema.extend({
  circleId: z.string().min(1),
  name: z.string().min(1).max(60),
  purpose: z.string().min(1).max(280),
});
export type CreateCirclePayload = z.infer<typeof createCirclePayloadSchema>;

export const inviteCirclePayloadSchema = residentActorSchema.extend({
  circleId: z.string().min(1),
  addresseeId: z.string().min(1),
});
export type InviteCirclePayload = z.infer<typeof inviteCirclePayloadSchema>;

export const respondCirclePayloadSchema = residentActorSchema.extend({
  circleId: z.string().min(1),
  response: z.enum(["accept", "decline"]),
});
export type RespondCirclePayload = z.infer<typeof respondCirclePayloadSchema>;

export const joinProjectPayloadSchema = residentActorSchema.extend({
  projectId: z.string().min(1),
});
export type JoinProjectPayload = z.infer<typeof joinProjectPayloadSchema>;

export const claimProjectTaskPayloadSchema = residentActorSchema.extend({
  projectId: z.string().min(1),
  taskId: z.string().min(1),
});
export type ClaimProjectTaskPayload = z.infer<typeof claimProjectTaskPayloadSchema>;

export const submitProjectContributionPayloadSchema = residentActorSchema.extend({
  projectId: z.string().min(1),
  contributionId: z.string().min(1),
  taskId: z.string().min(1).nullable().default(null),
  kind: contributionKindSchema,
  summary: z.string().min(1).max(500),
  artifactUrl: z.string().url().nullable(),
});
export type SubmitProjectContributionPayload = z.infer<
  typeof submitProjectContributionPayloadSchema
>;

export const reviewProjectContributionPayloadSchema = residentActorSchema.extend({
  projectId: z.string().min(1),
  contributionId: z.string().min(1),
  decision: z.enum(["approve", "request_changes"]),
  note: z.string().min(1).max(280).nullable(),
});
export type ReviewProjectContributionPayload = z.infer<
  typeof reviewProjectContributionPayloadSchema
>;

export const createMarketNeedPayloadSchema = residentActorSchema.extend({
  needId: z.string().min(1),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(500),
  mode: z.enum(["collaboration", "payment"]),
});
export type CreateMarketNeedPayload = z.infer<typeof createMarketNeedPayloadSchema>;

export const submitMarketProposalPayloadSchema = residentActorSchema.extend({
  proposalId: z.string().min(1),
  needId: z.string().min(1),
  summary: z.string().min(1).max(500),
  amountMinor: z.number().int().positive().nullable(),
  assetCode: z.enum(["TOS", "USDT", "USDC"]).nullable(),
});
export type SubmitMarketProposalPayload = z.infer<typeof submitMarketProposalPayloadSchema>;

export const respondMarketProposalPayloadSchema = residentActorSchema.extend({
  proposalId: z.string().min(1),
  response: z.enum(["accept", "decline"]),
});
export type RespondMarketProposalPayload = z.infer<typeof respondMarketProposalPayloadSchema>;

export const declareCandidacyPayloadSchema = residentActorSchema.extend({
  statement: z.string().min(1).max(500),
});
export type DeclareCandidacyPayload = z.infer<typeof declareCandidacyPayloadSchema>;

export const castCivicVotePayloadSchema = residentActorSchema.extend({
  candidateResidentId: z.string().min(1),
});
export type CastCivicVotePayload = z.infer<typeof castCivicVotePayloadSchema>;

export const fileCivicChallengePayloadSchema = residentActorSchema.extend({
  challengeId: z.string().min(1),
  reason: z.string().min(1).max(500),
});
export type FileCivicChallengePayload = z.infer<typeof fileCivicChallengePayloadSchema>;

export const updateResidentPreferencesPayloadSchema = residentActorSchema.extend({
  preferences: residentPreferencesSchema,
});
export type UpdateResidentPreferencesPayload = z.infer<
  typeof updateResidentPreferencesPayloadSchema
>;

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
  z.object({ type: z.literal("place.visit"), payload: visitPlacePayloadSchema }),
  z.object({ type: z.literal("social.invite"), payload: inviteRelationshipPayloadSchema }),
  z.object({ type: z.literal("social.respond"), payload: respondRelationshipPayloadSchema }),
  z.object({ type: z.literal("social.cancel"), payload: cancelRelationshipPayloadSchema }),
  z.object({ type: z.literal("social.repair"), payload: repairRelationshipPayloadSchema }),
  z.object({ type: z.literal("circle.create"), payload: createCirclePayloadSchema }),
  z.object({ type: z.literal("circle.invite"), payload: inviteCirclePayloadSchema }),
  z.object({ type: z.literal("circle.respond"), payload: respondCirclePayloadSchema }),
  z.object({ type: z.literal("project.join"), payload: joinProjectPayloadSchema }),
  z.object({ type: z.literal("project.claim_task"), payload: claimProjectTaskPayloadSchema }),
  z.object({
    type: z.literal("project.submit_contribution"),
    payload: submitProjectContributionPayloadSchema,
  }),
  z.object({
    type: z.literal("project.review_contribution"),
    payload: reviewProjectContributionPayloadSchema,
  }),
  z.object({ type: z.literal("market.create_need"), payload: createMarketNeedPayloadSchema }),
  z.object({
    type: z.literal("market.submit_proposal"),
    payload: submitMarketProposalPayloadSchema,
  }),
  z.object({
    type: z.literal("market.respond_proposal"),
    payload: respondMarketProposalPayloadSchema,
  }),
  z.object({ type: z.literal("civic.declare_candidacy"), payload: declareCandidacyPayloadSchema }),
  z.object({ type: z.literal("civic.cast_vote"), payload: castCivicVotePayloadSchema }),
  z.object({ type: z.literal("civic.file_challenge"), payload: fileCivicChallengePayloadSchema }),
  z.object({
    type: z.literal("resident.update_preferences"),
    payload: updateResidentPreferencesPayloadSchema,
  }),
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
