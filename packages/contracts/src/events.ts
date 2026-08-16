import { z } from "zod";

import {
  beaconContributionSchema,
  civicCandidateSchema,
  civicChallengeSchema,
  marketNeedSchema,
  marketProposalSchema,
  placeIdSchema,
  projectContributionSchema,
  projectTaskSchema,
  relationshipStateSchema,
  circleStateSchema,
} from "./city-world.js";
import {
  cityBuildingSchema,
  isoTimestampSchema,
  residentKindSchema,
  residentPreferencesSchema,
  roleSchema,
} from "./state.js";

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
  entryType: z.enum([
    "choice",
    "decline",
    "consequence",
    "card_expired",
    "building_upgrade",
    "district_expansion",
    "relationship",
    "circle",
    "project",
    "contribution",
    "artifact",
    "market",
    "civic",
    "beacon",
    "place_visit",
  ]),
  cardId: z.string().min(1).nullable(),
  consequenceId: z.string().min(1).nullable(),
  summary: z.string().min(1),
});

export const buildingUpgradedSchema = z.object({
  eventType: z.literal("BuildingUpgraded"),
  residentId: z.string().min(1),
  building: cityBuildingSchema,
  fromLevel: z.number().int().min(1),
  capacitySpent: z.number().int().positive(),
  prosperityGained: z.number().int().positive(),
});

export const districtExpandedSchema = z.object({
  eventType: z.literal("DistrictExpanded"),
  residentId: z.string().min(1),
  parcelId: z.string().min(1),
  parcelName: z.string().min(1),
  revealedBuildingIds: z.array(z.string().min(1)).min(1),
  capacitySpent: z.number().int().positive(),
  populationGained: z.number().int().positive(),
  prosperityGained: z.number().int().positive(),
});

export const placeVisitedSchema = z.object({
  eventType: z.literal("PlaceVisited"),
  residentId: z.string().min(1),
  placeId: placeIdSchema,
});

export const relationshipInvitedSchema = z.object({
  eventType: z.literal("RelationshipInvited"),
  residentId: z.string().min(1),
  relationship: relationshipStateSchema,
});
export const relationshipRespondedSchema = z.object({
  eventType: z.literal("RelationshipResponded"),
  residentId: z.string().min(1),
  relationshipId: z.string().min(1),
  response: z.enum(["accept", "decline"]),
  closeness: z.number().int().min(0).max(100),
  updatedAt: isoTimestampSchema,
});
export const relationshipCancelledSchema = z.object({
  eventType: z.literal("RelationshipCancelled"),
  residentId: z.string().min(1),
  relationshipId: z.string().min(1),
  updatedAt: isoTimestampSchema,
});
export const relationshipRepairedSchema = z.object({
  eventType: z.literal("RelationshipRepaired"),
  residentId: z.string().min(1),
  relationshipId: z.string().min(1),
  closeness: z.number().int().min(0).max(100),
  repairCount: z.number().int().min(1),
  note: z.string().min(1),
  updatedAt: isoTimestampSchema,
});

export const circleCreatedSchema = z.object({
  eventType: z.literal("CircleCreated"),
  residentId: z.string().min(1),
  circle: circleStateSchema,
});
export const circleInvitationSentSchema = z.object({
  eventType: z.literal("CircleInvitationSent"),
  residentId: z.string().min(1),
  circleId: z.string().min(1),
  addresseeId: z.string().min(1),
});
export const circleInvitationRespondedSchema = z.object({
  eventType: z.literal("CircleInvitationResponded"),
  residentId: z.string().min(1),
  circleId: z.string().min(1),
  response: z.enum(["accept", "decline"]),
});

export const projectJoinedSchema = z.object({
  eventType: z.literal("ProjectJoined"),
  residentId: z.string().min(1),
  projectId: z.string().min(1),
});
export const projectTaskClaimedSchema = z.object({
  eventType: z.literal("ProjectTaskClaimed"),
  residentId: z.string().min(1),
  projectId: z.string().min(1),
  task: projectTaskSchema,
});
export const projectContributionSubmittedSchema = z.object({
  eventType: z.literal("ProjectContributionSubmitted"),
  residentId: z.string().min(1),
  projectId: z.string().min(1),
  contribution: projectContributionSchema,
});
export const projectContributionReviewedSchema = z.object({
  eventType: z.literal("ProjectContributionReviewed"),
  residentId: z.string().min(1),
  projectId: z.string().min(1),
  contributionId: z.string().min(1),
  decision: z.enum(["approve", "request_changes"]),
  reviewerId: z.string().min(1),
  note: z.string().min(1).nullable(),
  updatedAt: isoTimestampSchema,
});

export const marketNeedCreatedSchema = z.object({
  eventType: z.literal("MarketNeedCreated"),
  residentId: z.string().min(1),
  need: marketNeedSchema,
});
export const marketProposalSubmittedSchema = z.object({
  eventType: z.literal("MarketProposalSubmitted"),
  residentId: z.string().min(1),
  proposal: marketProposalSchema,
});
export const marketProposalRespondedSchema = z.object({
  eventType: z.literal("MarketProposalResponded"),
  residentId: z.string().min(1),
  proposalId: z.string().min(1),
  response: z.enum(["accept", "decline"]),
});

export const civicElectionOpenedSchema = z.object({
  eventType: z.literal("CivicElectionOpened"),
  residentId: z.string().min(1),
  electionId: z.string().min(1),
  opensAt: isoTimestampSchema,
  closesAt: isoTimestampSchema,
  challengeEndsAt: isoTimestampSchema,
});
export const civicCandidacyDeclaredSchema = z.object({
  eventType: z.literal("CivicCandidacyDeclared"),
  residentId: z.string().min(1),
  candidate: civicCandidateSchema,
});
export const civicVoteCastSchema = z.object({
  eventType: z.literal("CivicVoteCast"),
  residentId: z.string().min(1),
  candidateResidentId: z.string().min(1),
});
export const civicVotingClosedSchema = z.object({
  eventType: z.literal("CivicVotingClosed"),
  residentId: z.string().min(1),
  electionId: z.string().min(1),
  challengeEndsAt: isoTimestampSchema,
});
export const civicChallengeFiledSchema = z.object({
  eventType: z.literal("CivicChallengeFiled"),
  residentId: z.string().min(1),
  challenge: civicChallengeSchema,
});
export const civicElectionFinalizedSchema = z.object({
  eventType: z.literal("CivicElectionFinalized"),
  residentId: z.string().min(1),
  electionId: z.string().min(1),
  resultResidentId: z.string().min(1).nullable(),
  resultStatus: z.enum(["elected", "no_quorum", "tie", "challenged"]),
  voteCount: z.number().int().min(0),
});

export const beaconContributionRecordedSchema = z.object({
  eventType: z.literal("BeaconContributionRecorded"),
  residentId: z.string().min(1),
  contribution: beaconContributionSchema,
  level: z.number().int().min(1).max(10),
});

export const residentPreferencesUpdatedSchema = z.object({
  eventType: z.literal("ResidentPreferencesUpdated"),
  residentId: z.string().min(1),
  preferences: residentPreferencesSchema,
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
  buildingUpgradedSchema,
  districtExpandedSchema,
  placeVisitedSchema,
  relationshipInvitedSchema,
  relationshipRespondedSchema,
  relationshipCancelledSchema,
  relationshipRepairedSchema,
  circleCreatedSchema,
  circleInvitationSentSchema,
  circleInvitationRespondedSchema,
  projectJoinedSchema,
  projectTaskClaimedSchema,
  projectContributionSubmittedSchema,
  projectContributionReviewedSchema,
  marketNeedCreatedSchema,
  marketProposalSubmittedSchema,
  marketProposalRespondedSchema,
  civicElectionOpenedSchema,
  civicCandidacyDeclaredSchema,
  civicVoteCastSchema,
  civicVotingClosedSchema,
  civicChallengeFiledSchema,
  civicElectionFinalizedSchema,
  beaconContributionRecordedSchema,
  residentPreferencesUpdatedSchema,
]);
export type DistrictEvent = z.infer<typeof districtEventSchema>;
export type DistrictEventType = DistrictEvent["eventType"];
