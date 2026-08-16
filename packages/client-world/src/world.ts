import {
  createInitialCityState,
  createInitialSocialWorldState,
  type CityState,
  type DistrictEvent,
  type DistrictEventType,
  type ResidentKind,
  type Role,
  type SocialWorldState,
} from "@freecity/contracts";

/**
 * Client-side semantic world state, reduced purely from committed district
 * events. The renderer (PixiJS or DOM) consumes this state; nothing here is
 * an authority — replaying, dropping, or rebuilding it never changes facts.
 */

export interface CommittedEventView {
  sequence: number;
  eventSeq: number;
  event: DistrictEvent;
}

export interface WorldResident {
  residentId: string;
  kind: ResidentKind;
  role: Role;
  displayName: string;
  sponsoredAiResidentId: string | null;
  focus: number;
  activeCardCount: number;
}

export interface ActivityItem {
  /** Stable id "sequence:eventSeq" — also the SSE event id. */
  id: string;
  sequence: number;
  eventSeq: number;
  eventType: DistrictEventType;
  /** Accessible one-line summary; the full event stays attached for detail views. */
  summary: string;
  event: DistrictEvent;
}

export interface WorldState {
  cursor: { sequence: number; eventSeq: number };
  residents: Record<string, WorldResident>;
  city: CityState;
  world: SocialWorldState;
  activity: ActivityItem[];
}

export const ACTIVITY_LIMIT = 200;

export function createWorldState(): WorldState {
  return {
    cursor: { sequence: 0, eventSeq: -1 },
    residents: {},
    city: createInitialCityState(),
    world: createInitialSocialWorldState(),
    activity: [],
  };
}

function isAfterCursor(state: WorldState, view: CommittedEventView): boolean {
  if (view.sequence !== state.cursor.sequence) return view.sequence > state.cursor.sequence;
  return view.eventSeq > state.cursor.eventSeq;
}

function nameOf(state: WorldState, residentId: string): string {
  return state.residents[residentId]?.displayName ?? residentId;
}

/** Accessible one-line summary of a committed event. */
export function summarizeEvent(state: WorldState, event: DistrictEvent): string {
  switch (event.eventType) {
    case "ResidentProvisioned":
      return event.kind === "ai"
        ? `${event.displayName} (AI resident) joined District Zero as a ${event.role}`
        : `${event.displayName} joined District Zero as a ${event.role}`;
    case "CardAssigned":
      return `A new card arrived for ${nameOf(state, event.residentId)}`;
    case "FocusSpent":
      return `${nameOf(state, event.residentId)} spent ${event.amount} Focus (${event.remaining} remaining)`;
    case "ChoiceCommitted":
      return `${nameOf(state, event.residentId)} made a choice`;
    case "CardDeclined":
      return `${nameOf(state, event.residentId)} declined a card`;
    case "ImmediateReactionRecorded":
      return event.reactionText;
    case "ConsequenceScheduled":
      return `A consequence was scheduled for ${nameOf(state, event.residentId)} (due ${event.dueAt})`;
    case "ConsequenceResolved":
      return event.consequenceText;
    case "CardExpired":
      return `A card expired for ${nameOf(state, event.residentId)} without a decision`;
    case "FocusRefreshed":
      return `${nameOf(state, event.residentId)}'s Focus refreshed to ${event.focus}`;
    case "ArchiveEntryRecorded":
      return `Archive: ${event.summary}`;
    case "BuildingUpgraded":
      return `${nameOf(state, event.residentId)} upgraded ${event.building.name} to level ${event.building.level}`;
    case "DistrictExpanded":
      return `${nameOf(state, event.residentId)} opened ${event.parcelName} to the city`;
    case "PlaceVisited":
      return `${nameOf(state, event.residentId)} arrived at ${event.placeId}`;
    case "RelationshipInvited":
      return `${nameOf(state, event.residentId)} sent a relationship invitation`;
    case "RelationshipResponded":
      return `${nameOf(state, event.residentId)} ${event.response}ed a relationship invitation`;
    case "RelationshipCancelled":
      return `${nameOf(state, event.residentId)} cancelled a relationship invitation`;
    case "RelationshipRepaired":
      return `${nameOf(state, event.residentId)} repaired a relationship`;
    case "CircleCreated":
      return `${nameOf(state, event.residentId)} founded ${event.circle.name}`;
    case "CircleInvitationSent":
      return `${nameOf(state, event.residentId)} invited a resident to a Circle`;
    case "CircleInvitationResponded":
      return `${nameOf(state, event.residentId)} ${event.response}ed a Circle invitation`;
    case "ProjectJoined":
      return `${nameOf(state, event.residentId)} joined a city project`;
    case "ProjectTaskClaimed":
      return `${nameOf(state, event.residentId)} claimed “${event.task.title}”`;
    case "ProjectContributionSubmitted":
      return `${nameOf(state, event.residentId)} submitted a project contribution`;
    case "ProjectContributionReviewed":
      return `A project contribution was ${event.decision === "approve" ? "approved" : "returned for changes"}`;
    case "MarketNeedCreated":
      return `${nameOf(state, event.residentId)} posted “${event.need.title}”`;
    case "MarketProposalSubmitted":
      return `${nameOf(state, event.residentId)} proposed a collaboration`;
    case "MarketProposalResponded":
      return `${nameOf(state, event.residentId)} ${event.response}ed a market proposal`;
    case "CivicElectionOpened":
      return "The founding District Steward election opened";
    case "CivicCandidacyDeclared":
      return `${nameOf(state, event.residentId)} declared candidacy for District Steward`;
    case "CivicVoteCast":
      return `${nameOf(state, event.residentId)} cast one civic vote`;
    case "CivicVotingClosed":
      return "District Steward voting closed; the challenge window opened";
    case "CivicChallengeFiled":
      return `${nameOf(state, event.residentId)} filed an election challenge`;
    case "CivicElectionFinalized":
      return event.resultResidentId
        ? `${nameOf(state, event.resultResidentId)} became District Steward`
        : `The election finalized: ${event.resultStatus.replace("_", " ")}`;
    case "BeaconContributionRecorded":
      return `Beacon: ${event.contribution.summary}`;
    case "ResidentPreferencesUpdated":
      return `${nameOf(state, event.residentId)} updated resident authority and memory boundaries`;
  }
}

/**
 * Applies one committed event view. Events at or before the cursor are
 * ignored, so replayed SSE frames and reconnect overlaps are harmless.
 * Returns a new state; the input state is not mutated.
 */
export function applyEventView(state: WorldState, view: CommittedEventView): WorldState {
  if (!isAfterCursor(state, view)) return state;

  const next: WorldState = {
    cursor: { sequence: view.sequence, eventSeq: view.eventSeq },
    residents: { ...state.residents },
    city: state.city,
    world: structuredClone(state.world),
    activity: state.activity,
  };
  const event = view.event;

  const patchResident = (residentId: string, patch: Partial<WorldResident>) => {
    const existing = next.residents[residentId];
    if (!existing) return;
    next.residents[residentId] = { ...existing, ...patch };
  };
  const adjustCards = (residentId: string, delta: number) => {
    const existing = next.residents[residentId];
    if (!existing) return;
    next.residents[residentId] = {
      ...existing,
      activeCardCount: Math.max(0, existing.activeCardCount + delta),
    };
  };

  switch (event.eventType) {
    case "ResidentProvisioned":
      next.residents[event.residentId] = {
        residentId: event.residentId,
        kind: event.kind,
        role: event.role,
        displayName: event.displayName,
        sponsoredAiResidentId: event.sponsoredAiResidentId,
        focus: event.initialFocus,
        activeCardCount: 0,
      };
      next.world.presence[event.residentId] = "arrival-hall";
      break;
    case "CardAssigned":
      adjustCards(event.residentId, 1);
      break;
    case "FocusSpent":
      patchResident(event.residentId, { focus: event.remaining });
      break;
    case "ChoiceCommitted":
    case "CardDeclined":
    case "CardExpired":
      adjustCards(event.residentId, -1);
      break;
    case "FocusRefreshed":
      patchResident(event.residentId, { focus: event.focus });
      break;
    case "ImmediateReactionRecorded":
    case "ConsequenceScheduled":
    case "ConsequenceResolved":
    case "ArchiveEntryRecorded":
      break;
    case "PlaceVisited":
      next.world.presence[event.residentId] = event.placeId;
      break;
    case "RelationshipInvited":
      next.world.relationships[event.relationship.relationshipId] = event.relationship;
      break;
    case "RelationshipResponded": {
      const item = next.world.relationships[event.relationshipId];
      if (item) {
        item.status = event.response === "accept" ? "active" : "declined";
        item.closeness = event.closeness;
        item.updatedAt = event.updatedAt;
      }
      break;
    }
    case "RelationshipCancelled": {
      const item = next.world.relationships[event.relationshipId];
      if (item) {
        item.status = "cancelled";
        item.updatedAt = event.updatedAt;
      }
      break;
    }
    case "RelationshipRepaired": {
      const item = next.world.relationships[event.relationshipId];
      if (item) {
        item.closeness = event.closeness;
        item.repairCount = event.repairCount;
        item.updatedAt = event.updatedAt;
      }
      break;
    }
    case "CircleCreated":
      next.world.circles[event.circle.circleId] = event.circle;
      break;
    case "CircleInvitationSent": {
      const circle = next.world.circles[event.circleId];
      if (circle && !circle.invitedResidentIds.includes(event.addresseeId)) {
        circle.invitedResidentIds.push(event.addresseeId);
      }
      break;
    }
    case "CircleInvitationResponded": {
      const circle = next.world.circles[event.circleId];
      if (circle) {
        circle.invitedResidentIds = circle.invitedResidentIds.filter(
          (residentId) => residentId !== event.residentId,
        );
        if (event.response === "accept" && !circle.memberIds.includes(event.residentId)) {
          circle.memberIds.push(event.residentId);
        }
      }
      break;
    }
    case "ProjectJoined": {
      const project = next.world.projects[event.projectId];
      if (project && !project.memberIds.includes(event.residentId)) {
        project.memberIds.push(event.residentId);
        project.status = "active";
      }
      break;
    }
    case "ProjectTaskClaimed": {
      const project = next.world.projects[event.projectId];
      const index = project?.tasks.findIndex((task) => task.taskId === event.task.taskId) ?? -1;
      if (project && index >= 0) project.tasks[index] = event.task;
      break;
    }
    case "ProjectContributionSubmitted": {
      const project = next.world.projects[event.projectId];
      if (
        project &&
        !project.contributions.some(
          (item) => item.contributionId === event.contribution.contributionId,
        )
      ) {
        project.contributions.push(event.contribution);
      }
      break;
    }
    case "ProjectContributionReviewed": {
      const contribution = next.world.projects[event.projectId]?.contributions.find(
        (item) => item.contributionId === event.contributionId,
      );
      if (contribution) {
        contribution.status = event.decision === "approve" ? "approved" : "changes_requested";
        contribution.reviewedBy = event.reviewerId;
        contribution.reviewNote = event.note;
        contribution.updatedAt = event.updatedAt;
        if (event.decision === "approve" && contribution.taskId) {
          const task = next.world.projects[event.projectId]?.tasks.find(
            (item) => item.taskId === contribution.taskId,
          );
          if (task && task.assigneeId === contribution.residentId) task.status = "completed";
        }
      }
      break;
    }
    case "MarketNeedCreated":
      next.world.market.needs[event.need.needId] = event.need;
      break;
    case "MarketProposalSubmitted":
      next.world.market.proposals[event.proposal.proposalId] = event.proposal;
      break;
    case "MarketProposalResponded": {
      const proposal = next.world.market.proposals[event.proposalId];
      if (proposal) {
        proposal.status = event.response === "accept" ? "accepted" : "declined";
        const need = next.world.market.needs[proposal.needId];
        if (need && event.response === "accept") need.status = "matched";
      }
      break;
    }
    case "CivicElectionOpened":
      next.world.civic.election.phase = "open";
      next.world.civic.election.opensAt = event.opensAt;
      next.world.civic.election.closesAt = event.closesAt;
      next.world.civic.election.challengeEndsAt = event.challengeEndsAt;
      break;
    case "CivicCandidacyDeclared":
      next.world.civic.election.candidates[event.candidate.residentId] = event.candidate;
      break;
    case "CivicVoteCast":
      next.world.civic.election.votes[event.residentId] = event.candidateResidentId;
      break;
    case "CivicVotingClosed":
      next.world.civic.election.phase = "challenge";
      next.world.civic.election.challengeEndsAt = event.challengeEndsAt;
      break;
    case "CivicChallengeFiled":
      next.world.civic.election.challenges.push(event.challenge);
      break;
    case "CivicElectionFinalized":
      next.world.civic.election.phase = "finalized";
      next.world.civic.election.resultResidentId = event.resultResidentId;
      next.world.civic.election.resultStatus = event.resultStatus;
      next.world.civic.office.holderResidentId = event.resultResidentId;
      break;
    case "BeaconContributionRecorded":
      if (!next.world.beacon.contributions[event.contribution.beaconContributionId]) {
        next.world.beacon.contributions[event.contribution.beaconContributionId] =
          event.contribution;
        next.world.beacon.totals[event.contribution.path] += 1;
      }
      next.world.beacon.level = event.level;
      break;
    case "ResidentPreferencesUpdated":
      break;
    case "BuildingUpgraded":
      next.city = {
        ...state.city,
        civicCapacity: Math.max(0, state.city.civicCapacity - event.capacitySpent),
        prosperity: state.city.prosperity + event.prosperityGained,
        population: state.city.population + (event.building.type === "habitat" ? 4 : 0),
        buildings: {
          ...state.city.buildings,
          [event.building.buildingId]: event.building,
        },
      };
      break;
    case "DistrictExpanded": {
      const parcel = state.city.parcels[event.parcelId];
      if (parcel) {
        next.city = {
          ...state.city,
          civicCapacity: Math.max(0, state.city.civicCapacity - event.capacitySpent),
          prosperity: state.city.prosperity + event.prosperityGained,
          population: state.city.population + event.populationGained,
          parcels: {
            ...state.city.parcels,
            [event.parcelId]: { ...parcel, unlocked: true },
          },
        };
      }
      break;
    }
  }

  const item: ActivityItem = {
    id: `${view.sequence}:${view.eventSeq}`,
    sequence: view.sequence,
    eventSeq: view.eventSeq,
    eventType: event.eventType,
    summary: summarizeEvent(next, event),
    event,
  };
  next.activity = [...state.activity, item].slice(-ACTIVITY_LIMIT);
  return next;
}

/** A known resident identity used to seed name resolution for summaries. */
export interface SeedResident {
  residentId: string;
  displayName: string;
  kind: ResidentKind;
  role: Role;
}

/**
 * Summarizes an ordered list of committed event views by reducing them in
 * sequence, optionally pre-seeded with known residents so summaries resolve
 * display names even when the provisioning events are outside the list
 * (e.g. a While You Were Away view after its provision was acknowledged).
 */
export function summarizeCommittedViews(
  views: CommittedEventView[],
  seeds: SeedResident[] = [],
): ActivityItem[] {
  let state = createWorldState();
  for (const seed of seeds) {
    state.residents[seed.residentId] = {
      ...seed,
      sponsoredAiResidentId: null,
      focus: 0,
      activeCardCount: 0,
    };
  }
  for (const view of views) {
    state = applyEventView(state, view);
  }
  return state.activity;
}
