import { z } from "zod";

const worldTimestampSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/, "expected ISO 8601 UTC timestamp");

export const placeIdSchema = z.enum([
  "arrival-hall",
  "signal-garden",
  "workshop",
  "studio",
  "beacon-square",
  "market",
  "civic-hall",
  "archive",
]);
export type PlaceId = z.infer<typeof placeIdSchema>;

export const relationshipStatusSchema = z.enum(["pending", "active", "declined", "cancelled"]);
export const relationshipStateSchema = z.object({
  relationshipId: z.string().min(1),
  requesterId: z.string().min(1),
  addresseeId: z.string().min(1),
  status: relationshipStatusSchema,
  closeness: z.number().int().min(0).max(100),
  repairCount: z.number().int().min(0),
  note: z.string().min(1).max(280).nullable(),
  createdAt: worldTimestampSchema,
  updatedAt: worldTimestampSchema,
});
export type RelationshipState = z.infer<typeof relationshipStateSchema>;

export const circleStateSchema = z.object({
  circleId: z.string().min(1),
  name: z.string().min(1).max(60),
  purpose: z.string().min(1).max(280),
  creatorId: z.string().min(1),
  memberIds: z.array(z.string().min(1)).min(1).max(6),
  invitedResidentIds: z.array(z.string().min(1)).max(12),
  createdAt: worldTimestampSchema,
});
export type CircleState = z.infer<typeof circleStateSchema>;

export const projectTaskStatusSchema = z.enum(["open", "claimed", "completed"]);
export const projectTaskSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().min(1).max(120),
  roleHint: z.string().min(1).max(60),
  status: projectTaskStatusSchema,
  assigneeId: z.string().min(1).nullable(),
});
export type ProjectTask = z.infer<typeof projectTaskSchema>;

export const contributionKindSchema = z.enum(["work", "creation", "care", "circle", "civic"]);
export type ContributionKind = z.infer<typeof contributionKindSchema>;
export const contributionStatusSchema = z.enum(["submitted", "approved", "changes_requested"]);
export const projectContributionSchema = z.object({
  contributionId: z.string().min(1),
  residentId: z.string().min(1),
  taskId: z.string().min(1).nullable().default(null),
  kind: contributionKindSchema,
  summary: z.string().min(1).max(500),
  artifactUrl: z.string().url().nullable(),
  status: contributionStatusSchema,
  reviewedBy: z.string().min(1).nullable(),
  reviewNote: z.string().min(1).max(280).nullable(),
  createdAt: worldTimestampSchema,
  updatedAt: worldTimestampSchema,
});
export type ProjectContribution = z.infer<typeof projectContributionSchema>;

export const projectStateSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(600),
  placeId: placeIdSchema,
  status: z.enum(["open", "active", "completed"]),
  memberIds: z.array(z.string().min(1)),
  tasks: z.array(projectTaskSchema),
  contributions: z.array(projectContributionSchema),
  createdAt: worldTimestampSchema,
});
export type ProjectState = z.infer<typeof projectStateSchema>;

export const marketNeedSchema = z.object({
  needId: z.string().min(1),
  creatorId: z.string().min(1),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(500),
  mode: z.enum(["collaboration", "payment"]),
  status: z.enum(["open", "matched", "closed"]),
  createdAt: worldTimestampSchema,
});
export type MarketNeed = z.infer<typeof marketNeedSchema>;

export const marketProposalSchema = z.object({
  proposalId: z.string().min(1),
  needId: z.string().min(1),
  proposerId: z.string().min(1),
  summary: z.string().min(1).max(500),
  amountMinor: z.number().int().positive().nullable(),
  assetCode: z.enum(["TOS", "USDT", "USDC"]).nullable(),
  status: z.enum(["proposed", "accepted", "declined"]),
  createdAt: worldTimestampSchema,
});
export type MarketProposal = z.infer<typeof marketProposalSchema>;

export const marketStateSchema = z.object({
  paymentState: z.literal("unavailable"),
  paymentReason: z.string().min(1),
  needs: z.record(z.string(), marketNeedSchema),
  proposals: z.record(z.string(), marketProposalSchema),
});
export type MarketState = z.infer<typeof marketStateSchema>;

export const civicCandidateSchema = z.object({
  residentId: z.string().min(1),
  statement: z.string().min(1).max(500),
  declaredAt: worldTimestampSchema,
});
export const civicChallengeSchema = z.object({
  challengeId: z.string().min(1),
  residentId: z.string().min(1),
  reason: z.string().min(1).max(500),
  filedAt: worldTimestampSchema,
});
export const civicElectionSchema = z.object({
  electionId: z.string().min(1),
  phase: z.enum(["forming", "open", "challenge", "finalized"]),
  opensAt: worldTimestampSchema.nullable(),
  closesAt: worldTimestampSchema.nullable(),
  challengeEndsAt: worldTimestampSchema.nullable(),
  quorum: z.number().int().positive(),
  candidates: z.record(z.string(), civicCandidateSchema),
  votes: z.record(z.string(), z.string().min(1)),
  challenges: z.array(civicChallengeSchema),
  resultResidentId: z.string().min(1).nullable(),
  resultStatus: z.enum(["pending", "elected", "no_quorum", "tie", "challenged"]),
});
export type CivicElection = z.infer<typeof civicElectionSchema>;

export const civicStateSchema = z.object({
  office: z.object({
    officeId: z.literal("district-steward"),
    title: z.literal("District Steward"),
    termDays: z.literal(30),
    powers: z.array(z.string().min(1)),
    limits: z.array(z.string().min(1)),
    holderResidentId: z.string().min(1).nullable(),
  }),
  election: civicElectionSchema,
});
export type CivicState = z.infer<typeof civicStateSchema>;

export const beaconPathSchema = z.enum(["relationship", "project", "creation", "circle", "civic"]);
export type BeaconPath = z.infer<typeof beaconPathSchema>;
export const beaconContributionSchema = z.object({
  beaconContributionId: z.string().min(1),
  sourceId: z.string().min(1),
  residentId: z.string().min(1),
  path: beaconPathSchema,
  summary: z.string().min(1).max(500),
  createdAt: worldTimestampSchema,
});
export type BeaconContribution = z.infer<typeof beaconContributionSchema>;

export const beaconStateSchema = z.object({
  level: z.number().int().min(1).max(10),
  totals: z.object({
    relationship: z.number().int().min(0),
    project: z.number().int().min(0),
    creation: z.number().int().min(0),
    circle: z.number().int().min(0),
    civic: z.number().int().min(0),
  }),
  contributions: z.record(z.string(), beaconContributionSchema),
});
export type BeaconState = z.infer<typeof beaconStateSchema>;

export const socialWorldStateSchema = z.object({
  presence: z.record(z.string(), placeIdSchema),
  relationships: z.record(z.string(), relationshipStateSchema),
  circles: z.record(z.string(), circleStateSchema),
  projects: z.record(z.string(), projectStateSchema),
  market: marketStateSchema,
  civic: civicStateSchema,
  beacon: beaconStateSchema,
});
export type SocialWorldState = z.infer<typeof socialWorldStateSchema>;

const GENESIS_TIME = "2026-08-16T00:00:00.000Z";

export function createInitialSocialWorldState(): SocialWorldState {
  return {
    presence: {},
    relationships: {},
    circles: {},
    projects: {
      "east-relay": {
        projectId: "east-relay",
        title: "Repair the East Relay",
        description: "Restore the signal route between the Night Workshop and Beacon Square.",
        placeId: "workshop",
        status: "open",
        memberIds: ["ai-district-orin"],
        tasks: [
          {
            taskId: "map-fault",
            title: "Map the failing relay",
            roleHint: "Builder",
            status: "open",
            assigneeId: null,
          },
          {
            taskId: "write-signal",
            title: "Write the return signal",
            roleHint: "Creator",
            status: "open",
            assigneeId: null,
          },
          {
            taskId: "host-review",
            title: "Host a public review",
            roleHint: "Mediator",
            status: "open",
            assigneeId: null,
          },
        ],
        contributions: [],
        createdAt: GENESIS_TIME,
      },
      "beacon-exhibition": {
        projectId: "beacon-exhibition",
        title: "First Light Exhibition",
        description:
          "Turn the city’s first committed contributions into a public Beacon exhibition.",
        placeId: "studio",
        status: "open",
        memberIds: ["ai-district-nia"],
        tasks: [
          {
            taskId: "collect-stories",
            title: "Collect three resident stories",
            roleHint: "Reporter",
            status: "open",
            assigneeId: null,
          },
          {
            taskId: "compose-piece",
            title: "Compose the opening piece",
            roleHint: "Creator",
            status: "open",
            assigneeId: null,
          },
          {
            taskId: "build-display",
            title: "Build the public display",
            roleHint: "Builder",
            status: "open",
            assigneeId: null,
          },
        ],
        contributions: [],
        createdAt: GENESIS_TIME,
      },
    },
    market: {
      paymentState: "unavailable",
      paymentReason:
        "TOS Network settlement is not connected to this cohort. No payment can be initiated.",
      needs: {
        "need-relay-observer": {
          needId: "need-relay-observer",
          creatorId: "ai-district-orin",
          title: "Need: relay observer",
          description:
            "Join one repair session and record where the signal drops. This is a free collaboration.",
          mode: "collaboration",
          status: "open",
          createdAt: GENESIS_TIME,
        },
      },
      proposals: {},
    },
    civic: {
      office: {
        officeId: "district-steward",
        title: "District Steward",
        termDays: 30,
        powers: [
          "Publish a district agenda",
          "Schedule community reviews",
          "Propose use of civic capacity",
        ],
        limits: [
          "Cannot move resident assets",
          "Cannot censor the Archive",
          "Cannot override deterministic rules",
        ],
        holderResidentId: null,
      },
      election: {
        electionId: "district-zero-founding-steward",
        phase: "forming",
        opensAt: null,
        closesAt: null,
        challengeEndsAt: null,
        quorum: 3,
        candidates: {},
        votes: {},
        challenges: [],
        resultResidentId: null,
        resultStatus: "pending",
      },
    },
    beacon: {
      level: 1,
      totals: { relationship: 0, project: 0, creation: 0, circle: 0, civic: 0 },
      contributions: {},
    },
  };
}
