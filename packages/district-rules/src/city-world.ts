import type {
  BeaconContribution,
  BeaconPath,
  DistrictCommand,
  DistrictEvent,
  DistrictState,
  PlaceId,
} from "@freecity/contracts";

import { addHours, isDue } from "./time.js";

export const WORLD_REJECTION_CODES = [
  "SELF_TARGET",
  "RELATIONSHIP_EXISTS",
  "RELATIONSHIP_NOT_FOUND",
  "RELATIONSHIP_NOT_INVITED",
  "RELATIONSHIP_NOT_ACTIVE",
  "CIRCLE_NOT_FOUND",
  "CIRCLE_FULL",
  "CIRCLE_ALREADY_EXISTS",
  "ALREADY_MEMBER",
  "INVITATION_NOT_FOUND",
  "PROJECT_NOT_FOUND",
  "NOT_PROJECT_MEMBER",
  "TASK_NOT_FOUND",
  "TASK_UNAVAILABLE",
  "CONTRIBUTION_NOT_FOUND",
  "CONTRIBUTION_ALREADY_EXISTS",
  "CONTRIBUTION_ALREADY_REVIEWED",
  "REVIEW_OWN_CONTRIBUTION",
  "NEED_NOT_FOUND",
  "NEED_ALREADY_EXISTS",
  "MARKET_PAYMENT_UNAVAILABLE",
  "PROPOSAL_NOT_FOUND",
  "PROPOSAL_ALREADY_EXISTS",
  "PROPOSAL_ALREADY_RESOLVED",
  "NOT_NEED_OWNER",
  "ELECTION_NOT_OPEN",
  "ELECTION_CHALLENGE_NOT_OPEN",
  "NOT_ELIGIBLE",
  "ALREADY_CANDIDATE",
  "CANDIDATE_NOT_FOUND",
  "ALREADY_VOTED",
  "INVITATIONS_CLOSED",
] as const;
export type WorldRejectionCode = (typeof WORLD_REJECTION_CODES)[number];

type WorldCommand = Exclude<
  DistrictCommand,
  | { type: "season.provision_resident" }
  | { type: "card.assign" }
  | { type: "card.commit_choice" }
  | { type: "card.decline" }
  | { type: "building.upgrade" }
  | { type: "district.expand" }
  | { type: "resident.update_preferences" }
  | { type: "runtime.run_due_effects" }
>;

export type WorldStepOutcome =
  | { ok: true; events: DistrictEvent[] }
  | { ok: false; rejection: { code: WorldRejectionCode | "RESIDENT_NOT_FOUND"; message: string } };

function reject(
  code: WorldRejectionCode | "RESIDENT_NOT_FOUND",
  message: string,
): WorldStepOutcome {
  return { ok: false, rejection: { code, message } };
}

function residentExists(state: DistrictState, residentId: string): boolean {
  return state.residents[residentId] !== undefined;
}

function archive(
  residentId: string,
  entryType:
    | "relationship"
    | "circle"
    | "project"
    | "contribution"
    | "artifact"
    | "market"
    | "civic"
    | "beacon"
    | "place_visit",
  summary: string,
): DistrictEvent {
  return {
    eventType: "ArchiveEntryRecorded",
    residentId,
    entryType,
    cardId: null,
    consequenceId: null,
    summary,
  };
}

function recordBeacon(
  state: DistrictState,
  residentId: string,
  path: BeaconPath,
  sourceId: string,
  summary: string,
  stepTime: string,
): DistrictEvent[] {
  const beaconContributionId = `${path}:${sourceId}`;
  if (state.world.beacon.contributions[beaconContributionId]) return [];
  const contribution: BeaconContribution = {
    beaconContributionId,
    sourceId,
    residentId,
    path,
    summary,
    createdAt: stepTime,
  };
  state.world.beacon.contributions[beaconContributionId] = contribution;
  state.world.beacon.totals[path] += 1;
  const total = Object.values(state.world.beacon.totals).reduce((sum, value) => sum + value, 0);
  state.world.beacon.level = Math.min(10, 1 + Math.floor(total / 3));
  return [
    {
      eventType: "BeaconContributionRecorded",
      residentId,
      contribution,
      level: state.world.beacon.level,
    },
    archive(residentId, "beacon", `Beacon recorded: ${summary}`),
  ];
}

export function maybeOpenCivicElection(
  state: DistrictState,
  triggeringResidentId: string,
  stepTime: string,
): DistrictEvent[] {
  const election = state.world.civic.election;
  const humanCount = Object.values(state.residents).filter(
    (resident) => resident.kind === "human",
  ).length;
  if (election.phase !== "forming" || humanCount < election.quorum) return [];
  election.phase = "open";
  election.opensAt = stepTime;
  election.closesAt = addHours(stepTime, 72);
  election.challengeEndsAt = addHours(stepTime, 96);
  return [
    {
      eventType: "CivicElectionOpened",
      residentId: triggeringResidentId,
      electionId: election.electionId,
      opensAt: stepTime,
      closesAt: election.closesAt,
      challengeEndsAt: election.challengeEndsAt,
    },
    archive(triggeringResidentId, "civic", "The founding District Steward election opened"),
  ];
}

export function advanceCivicElection(state: DistrictState, stepTime: string): DistrictEvent[] {
  const election = state.world.civic.election;
  if (election.phase === "open" && election.closesAt && isDue(election.closesAt, stepTime)) {
    election.phase = "challenge";
    return [
      {
        eventType: "CivicVotingClosed",
        residentId: "system-district-zero",
        electionId: election.electionId,
        challengeEndsAt: election.challengeEndsAt ?? stepTime,
      },
    ];
  }
  if (
    election.phase !== "challenge" ||
    !election.challengeEndsAt ||
    !isDue(election.challengeEndsAt, stepTime)
  )
    return [];

  const counts = new Map<string, number>();
  for (const candidateId of Object.values(election.votes)) {
    counts.set(candidateId, (counts.get(candidateId) ?? 0) + 1);
  }
  const voteCount = Object.keys(election.votes).length;
  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const tied = ordered.length > 1 && ordered[0]?.[1] === ordered[1]?.[1];
  const resultStatus =
    election.challenges.length > 0
      ? "challenged"
      : voteCount < election.quorum
        ? "no_quorum"
        : tied
          ? "tie"
          : "elected";
  const winner = resultStatus === "elected" ? (ordered[0]?.[0] ?? null) : null;
  election.phase = "finalized";
  election.resultResidentId = winner;
  election.resultStatus = resultStatus;
  state.world.civic.office.holderResidentId = winner;
  const actor = winner ?? "system-district-zero";
  const summary = winner
    ? `${state.residents[winner]?.displayName ?? winner} became District Steward`
    : `District Steward election finalized: ${resultStatus.replace("_", " ")}`;
  return [
    {
      eventType: "CivicElectionFinalized",
      residentId: actor,
      electionId: election.electionId,
      resultResidentId: winner,
      resultStatus,
      voteCount,
    },
    archive(actor, "civic", summary),
    ...(winner ? recordBeacon(state, winner, "civic", election.electionId, summary, stepTime) : []),
  ];
}

export function applyCityWorldCommand(
  state: DistrictState,
  command: WorldCommand,
  stepTime: string,
): WorldStepOutcome {
  if (!residentExists(state, command.payload.residentId)) {
    return reject(
      "RESIDENT_NOT_FOUND",
      `resident ${command.payload.residentId} is not provisioned`,
    );
  }

  switch (command.type) {
    case "place.visit": {
      const payload = command.payload;
      state.world.presence[payload.residentId] = payload.placeId;
      return {
        ok: true,
        events: [
          { eventType: "PlaceVisited", residentId: payload.residentId, placeId: payload.placeId },
          archive(payload.residentId, "place_visit", `Visited ${payload.placeId}`),
        ],
      };
    }
    case "social.invite": {
      const payload = command.payload;
      if (payload.residentId === payload.addresseeId)
        return reject("SELF_TARGET", "a resident cannot invite themselves");
      if (!residentExists(state, payload.addresseeId))
        return reject("RESIDENT_NOT_FOUND", "addressee is not a resident");
      const addressee = state.residents[payload.addresseeId]!;
      const requester = state.residents[payload.residentId]!;
      if (
        addressee.preferences.relationshipInvites === "none" ||
        (addressee.preferences.relationshipInvites === "humans" && requester.kind !== "human")
      ) {
        return reject(
          "INVITATIONS_CLOSED",
          "this resident is not accepting invitations from this identity type",
        );
      }
      if (state.world.relationships[payload.relationshipId])
        return reject("RELATIONSHIP_EXISTS", "relationship id already exists");
      const duplicate = Object.values(state.world.relationships).some(
        (item) =>
          item.status !== "declined" &&
          item.status !== "cancelled" &&
          ((item.requesterId === payload.residentId && item.addresseeId === payload.addresseeId) ||
            (item.requesterId === payload.addresseeId && item.addresseeId === payload.residentId)),
      );
      if (duplicate)
        return reject(
          "RELATIONSHIP_EXISTS",
          "these residents already have a relationship or invitation",
        );
      const relationship = {
        relationshipId: payload.relationshipId,
        requesterId: payload.residentId,
        addresseeId: payload.addresseeId,
        status: "pending" as const,
        closeness: 0,
        repairCount: 0,
        note: payload.note,
        createdAt: stepTime,
        updatedAt: stepTime,
      };
      state.world.relationships[payload.relationshipId] = relationship;
      return {
        ok: true,
        events: [
          { eventType: "RelationshipInvited", residentId: payload.residentId, relationship },
        ],
      };
    }
    case "social.respond": {
      const payload = command.payload;
      const item = state.world.relationships[payload.relationshipId];
      if (!item) return reject("RELATIONSHIP_NOT_FOUND", "relationship invitation not found");
      if (item.status !== "pending" || item.addresseeId !== payload.residentId)
        return reject("RELATIONSHIP_NOT_INVITED", "resident cannot answer this invitation");
      item.status = payload.response === "accept" ? "active" : "declined";
      item.closeness = payload.response === "accept" ? 25 : 0;
      item.updatedAt = stepTime;
      const events: DistrictEvent[] = [
        {
          eventType: "RelationshipResponded",
          residentId: payload.residentId,
          relationshipId: item.relationshipId,
          response: payload.response,
          closeness: item.closeness,
          updatedAt: stepTime,
        },
        archive(
          payload.residentId,
          "relationship",
          `${payload.response === "accept" ? "Accepted" : "Declined"} a relationship invitation`,
        ),
      ];
      if (payload.response === "accept")
        events.push(
          ...recordBeacon(
            state,
            payload.residentId,
            "relationship",
            item.relationshipId,
            "A new resident relationship became active",
            stepTime,
          ),
        );
      return { ok: true, events };
    }
    case "social.cancel": {
      const payload = command.payload;
      const item = state.world.relationships[payload.relationshipId];
      if (!item) return reject("RELATIONSHIP_NOT_FOUND", "relationship invitation not found");
      if (item.status !== "pending" || item.requesterId !== payload.residentId)
        return reject("RELATIONSHIP_NOT_INVITED", "resident cannot cancel this invitation");
      item.status = "cancelled";
      item.updatedAt = stepTime;
      return {
        ok: true,
        events: [
          {
            eventType: "RelationshipCancelled",
            residentId: payload.residentId,
            relationshipId: item.relationshipId,
            updatedAt: stepTime,
          },
        ],
      };
    }
    case "social.repair": {
      const payload = command.payload;
      const item = state.world.relationships[payload.relationshipId];
      if (!item) return reject("RELATIONSHIP_NOT_FOUND", "relationship not found");
      if (
        item.status !== "active" ||
        (item.requesterId !== payload.residentId && item.addresseeId !== payload.residentId)
      )
        return reject(
          "RELATIONSHIP_NOT_ACTIVE",
          "only participants can repair an active relationship",
        );
      item.closeness = Math.min(100, item.closeness + 10);
      item.repairCount += 1;
      item.updatedAt = stepTime;
      return {
        ok: true,
        events: [
          {
            eventType: "RelationshipRepaired",
            residentId: payload.residentId,
            relationshipId: item.relationshipId,
            closeness: item.closeness,
            repairCount: item.repairCount,
            note: payload.note,
            updatedAt: stepTime,
          },
          archive(payload.residentId, "relationship", `Repaired a relationship: ${payload.note}`),
          ...recordBeacon(
            state,
            payload.residentId,
            "relationship",
            `${item.relationshipId}:repair:${item.repairCount}`,
            "A resident repaired a relationship",
            stepTime,
          ),
        ],
      };
    }
    case "circle.create": {
      const payload = command.payload;
      if (state.world.circles[payload.circleId])
        return reject("CIRCLE_ALREADY_EXISTS", "circle id already exists");
      const circle = {
        circleId: payload.circleId,
        name: payload.name,
        purpose: payload.purpose,
        creatorId: payload.residentId,
        memberIds: [payload.residentId],
        invitedResidentIds: [],
        createdAt: stepTime,
      };
      state.world.circles[payload.circleId] = circle;
      return {
        ok: true,
        events: [
          { eventType: "CircleCreated", residentId: payload.residentId, circle },
          archive(payload.residentId, "circle", `Founded the Circle “${payload.name}”`),
        ],
      };
    }
    case "circle.invite": {
      const payload = command.payload;
      const circle = state.world.circles[payload.circleId];
      if (!circle) return reject("CIRCLE_NOT_FOUND", "circle not found");
      if (!circle.memberIds.includes(payload.residentId))
        return reject("ALREADY_MEMBER", "only a member can invite residents");
      if (!residentExists(state, payload.addresseeId))
        return reject("RESIDENT_NOT_FOUND", "addressee is not a resident");
      if (circle.memberIds.includes(payload.addresseeId))
        return reject("ALREADY_MEMBER", "resident is already a member");
      if (circle.memberIds.length >= 6)
        return reject("CIRCLE_FULL", "circles are limited to six members");
      if (!circle.invitedResidentIds.includes(payload.addresseeId))
        circle.invitedResidentIds.push(payload.addresseeId);
      return {
        ok: true,
        events: [
          {
            eventType: "CircleInvitationSent",
            residentId: payload.residentId,
            circleId: circle.circleId,
            addresseeId: payload.addresseeId,
          },
        ],
      };
    }
    case "circle.respond": {
      const payload = command.payload;
      const circle = state.world.circles[payload.circleId];
      if (!circle) return reject("CIRCLE_NOT_FOUND", "circle not found");
      const inviteIndex = circle.invitedResidentIds.indexOf(payload.residentId);
      if (inviteIndex < 0) return reject("INVITATION_NOT_FOUND", "circle invitation not found");
      if (payload.response === "accept" && circle.memberIds.length >= 6)
        return reject("CIRCLE_FULL", "circle reached six members");
      circle.invitedResidentIds.splice(inviteIndex, 1);
      if (payload.response === "accept") circle.memberIds.push(payload.residentId);
      return {
        ok: true,
        events: [
          {
            eventType: "CircleInvitationResponded",
            residentId: payload.residentId,
            circleId: circle.circleId,
            response: payload.response,
          },
          archive(
            payload.residentId,
            "circle",
            `${payload.response === "accept" ? "Joined" : "Declined"} ${circle.name}`,
          ),
          ...(payload.response === "accept" && circle.memberIds.length >= 3
            ? recordBeacon(
                state,
                payload.residentId,
                "circle",
                `${circle.circleId}:${payload.residentId}`,
                `Joined the Circle “${circle.name}”`,
                stepTime,
              )
            : []),
        ],
      };
    }
    case "project.join": {
      const payload = command.payload;
      const project = state.world.projects[payload.projectId];
      if (!project) return reject("PROJECT_NOT_FOUND", "project not found");
      if (project.memberIds.includes(payload.residentId))
        return reject("ALREADY_MEMBER", "resident already joined this project");
      project.memberIds.push(payload.residentId);
      project.status = "active";
      return {
        ok: true,
        events: [
          {
            eventType: "ProjectJoined",
            residentId: payload.residentId,
            projectId: project.projectId,
          },
          archive(payload.residentId, "project", `Joined ${project.title}`),
        ],
      };
    }
    case "project.claim_task": {
      const payload = command.payload;
      const project = state.world.projects[payload.projectId];
      if (!project) return reject("PROJECT_NOT_FOUND", "project not found");
      if (!project.memberIds.includes(payload.residentId))
        return reject("NOT_PROJECT_MEMBER", "join the project before claiming a task");
      const task = project.tasks.find((item) => item.taskId === payload.taskId);
      if (!task) return reject("TASK_NOT_FOUND", "task not found");
      if (task.status !== "open")
        return reject("TASK_UNAVAILABLE", "task is already claimed or completed");
      task.status = "claimed";
      task.assigneeId = payload.residentId;
      return {
        ok: true,
        events: [
          {
            eventType: "ProjectTaskClaimed",
            residentId: payload.residentId,
            projectId: project.projectId,
            task: structuredClone(task),
          },
          archive(payload.residentId, "project", `Claimed “${task.title}” in ${project.title}`),
        ],
      };
    }
    case "project.submit_contribution": {
      const payload = command.payload;
      const project = state.world.projects[payload.projectId];
      if (!project) return reject("PROJECT_NOT_FOUND", "project not found");
      if (!project.memberIds.includes(payload.residentId))
        return reject("NOT_PROJECT_MEMBER", "join the project before contributing");
      if (project.contributions.some((item) => item.contributionId === payload.contributionId))
        return reject("CONTRIBUTION_ALREADY_EXISTS", "contribution id already exists");
      if (payload.taskId) {
        const task = project.tasks.find((item) => item.taskId === payload.taskId);
        if (!task) return reject("TASK_NOT_FOUND", "linked task not found");
        if (task.status !== "claimed" || task.assigneeId !== payload.residentId) {
          return reject(
            "TASK_UNAVAILABLE",
            "only the resident who claimed a task may submit its evidence",
          );
        }
      }
      const contribution = {
        contributionId: payload.contributionId,
        residentId: payload.residentId,
        taskId: payload.taskId,
        kind: payload.kind,
        summary: payload.summary,
        artifactUrl: payload.artifactUrl,
        status: "submitted" as const,
        reviewedBy: null,
        reviewNote: null,
        createdAt: stepTime,
        updatedAt: stepTime,
      };
      project.contributions.push(contribution);
      return {
        ok: true,
        events: [
          {
            eventType: "ProjectContributionSubmitted",
            residentId: payload.residentId,
            projectId: project.projectId,
            contribution,
          },
          archive(
            payload.residentId,
            payload.artifactUrl ? "artifact" : "contribution",
            `Submitted to ${project.title}: ${payload.summary}`,
          ),
        ],
      };
    }
    case "project.review_contribution": {
      const payload = command.payload;
      const project = state.world.projects[payload.projectId];
      if (!project) return reject("PROJECT_NOT_FOUND", "project not found");
      if (!project.memberIds.includes(payload.residentId))
        return reject("NOT_PROJECT_MEMBER", "only project members can review");
      const contribution = project.contributions.find(
        (item) => item.contributionId === payload.contributionId,
      );
      if (!contribution) return reject("CONTRIBUTION_NOT_FOUND", "contribution not found");
      if (contribution.residentId === payload.residentId)
        return reject("REVIEW_OWN_CONTRIBUTION", "a contributor cannot review their own work");
      if (contribution.status !== "submitted")
        return reject("CONTRIBUTION_ALREADY_REVIEWED", "contribution is already reviewed");
      contribution.status = payload.decision === "approve" ? "approved" : "changes_requested";
      contribution.reviewedBy = payload.residentId;
      contribution.reviewNote = payload.note;
      contribution.updatedAt = stepTime;
      if (payload.decision === "approve" && contribution.taskId) {
        const task = project.tasks.find((item) => item.taskId === contribution.taskId);
        if (task && task.assigneeId === contribution.residentId) task.status = "completed";
      }
      const path: BeaconPath = contribution.kind === "creation" ? "creation" : "project";
      return {
        ok: true,
        events: [
          {
            eventType: "ProjectContributionReviewed",
            residentId: contribution.residentId,
            projectId: project.projectId,
            contributionId: contribution.contributionId,
            decision: payload.decision,
            reviewerId: payload.residentId,
            note: payload.note,
            updatedAt: stepTime,
          },
          archive(
            contribution.residentId,
            "contribution",
            `${payload.decision === "approve" ? "Approved" : "Changes requested for"} contribution to ${project.title}`,
          ),
          ...(payload.decision === "approve"
            ? recordBeacon(
                state,
                contribution.residentId,
                path,
                contribution.contributionId,
                contribution.summary,
                stepTime,
              )
            : []),
        ],
      };
    }
    case "market.create_need": {
      const payload = command.payload;
      if (payload.mode === "payment")
        return reject("MARKET_PAYMENT_UNAVAILABLE", state.world.market.paymentReason);
      if (state.world.market.needs[payload.needId])
        return reject("NEED_ALREADY_EXISTS", "need id already exists");
      const need = {
        needId: payload.needId,
        creatorId: payload.residentId,
        title: payload.title,
        description: payload.description,
        mode: payload.mode,
        status: "open" as const,
        createdAt: stepTime,
      };
      state.world.market.needs[payload.needId] = need;
      return {
        ok: true,
        events: [
          { eventType: "MarketNeedCreated", residentId: payload.residentId, need },
          archive(payload.residentId, "market", `Posted ${payload.title}`),
        ],
      };
    }
    case "market.submit_proposal": {
      const payload = command.payload;
      const need = state.world.market.needs[payload.needId];
      if (!need) return reject("NEED_NOT_FOUND", "market need not found");
      if (need.creatorId === payload.residentId)
        return reject("SELF_TARGET", "a need creator cannot propose to their own request");
      if (need.mode === "payment" || payload.amountMinor !== null || payload.assetCode !== null)
        return reject("MARKET_PAYMENT_UNAVAILABLE", state.world.market.paymentReason);
      if (state.world.market.proposals[payload.proposalId])
        return reject("PROPOSAL_ALREADY_EXISTS", "proposal id already exists");
      const proposal = {
        proposalId: payload.proposalId,
        needId: payload.needId,
        proposerId: payload.residentId,
        summary: payload.summary,
        amountMinor: null,
        assetCode: null,
        status: "proposed" as const,
        createdAt: stepTime,
      };
      state.world.market.proposals[payload.proposalId] = proposal;
      return {
        ok: true,
        events: [
          { eventType: "MarketProposalSubmitted", residentId: payload.residentId, proposal },
          archive(payload.residentId, "market", `Proposed collaboration for ${need.title}`),
        ],
      };
    }
    case "market.respond_proposal": {
      const payload = command.payload;
      const proposal = state.world.market.proposals[payload.proposalId];
      if (!proposal) return reject("PROPOSAL_NOT_FOUND", "proposal not found");
      if (proposal.status !== "proposed")
        return reject("PROPOSAL_ALREADY_RESOLVED", "proposal already resolved");
      const need = state.world.market.needs[proposal.needId];
      if (!need) return reject("NEED_NOT_FOUND", "market need not found");
      if (need.creatorId !== payload.residentId)
        return reject("NOT_NEED_OWNER", "only the need creator can respond");
      proposal.status = payload.response === "accept" ? "accepted" : "declined";
      if (payload.response === "accept") need.status = "matched";
      return {
        ok: true,
        events: [
          {
            eventType: "MarketProposalResponded",
            residentId: payload.residentId,
            proposalId: proposal.proposalId,
            response: payload.response,
          },
          archive(
            payload.residentId,
            "market",
            `${payload.response === "accept" ? "Accepted" : "Declined"} a proposal for ${need.title}`,
          ),
        ],
      };
    }
    case "civic.declare_candidacy": {
      const payload = command.payload;
      const election = state.world.civic.election;
      const resident = state.residents[payload.residentId];
      if (election.phase !== "open")
        return reject("ELECTION_NOT_OPEN", "the election is not accepting candidates");
      if (resident?.kind !== "human")
        return reject(
          "NOT_ELIGIBLE",
          "only human residents may hold the steward office in this cohort",
        );
      const hasContribution = Object.values(state.world.beacon.contributions).some(
        (item) => item.residentId === payload.residentId,
      );
      if (!hasContribution)
        return reject(
          "NOT_ELIGIBLE",
          "record one approved city contribution before declaring candidacy",
        );
      if (election.candidates[payload.residentId])
        return reject("ALREADY_CANDIDATE", "resident already declared candidacy");
      const candidate = {
        residentId: payload.residentId,
        statement: payload.statement,
        declaredAt: stepTime,
      };
      election.candidates[payload.residentId] = candidate;
      return {
        ok: true,
        events: [
          { eventType: "CivicCandidacyDeclared", residentId: payload.residentId, candidate },
          archive(payload.residentId, "civic", "Declared candidacy for District Steward"),
        ],
      };
    }
    case "civic.cast_vote": {
      const payload = command.payload;
      const election = state.world.civic.election;
      if (election.phase !== "open") return reject("ELECTION_NOT_OPEN", "voting is not open");
      if (!election.candidates[payload.candidateResidentId])
        return reject("CANDIDATE_NOT_FOUND", "candidate not found");
      if (election.votes[payload.residentId])
        return reject("ALREADY_VOTED", "one resident has one vote");
      election.votes[payload.residentId] = payload.candidateResidentId;
      return {
        ok: true,
        events: [
          {
            eventType: "CivicVoteCast",
            residentId: payload.residentId,
            candidateResidentId: payload.candidateResidentId,
          },
          archive(
            payload.residentId,
            "civic",
            "Cast one private-weight, public-record vote for District Steward",
          ),
        ],
      };
    }
    case "civic.file_challenge": {
      const payload = command.payload;
      const election = state.world.civic.election;
      if (election.phase !== "challenge")
        return reject("ELECTION_CHALLENGE_NOT_OPEN", "the election is not in its challenge window");
      const challenge = {
        challengeId: payload.challengeId,
        residentId: payload.residentId,
        reason: payload.reason,
        filedAt: stepTime,
      };
      election.challenges.push(challenge);
      return {
        ok: true,
        events: [
          { eventType: "CivicChallengeFiled", residentId: payload.residentId, challenge },
          archive(payload.residentId, "civic", `Filed an election challenge: ${payload.reason}`),
        ],
      };
    }
  }
}

export const PLACE_LABELS: Record<PlaceId, string> = {
  "arrival-hall": "Arrival Hall",
  "signal-garden": "Signal Garden",
  workshop: "Night Workshop",
  studio: "Echo Studio",
  "beacon-square": "Beacon Square",
  market: "Commons Market",
  "civic-hall": "Civic Hall",
  archive: "Archive",
};
