import type { DistrictEventType, PlaceId, Role } from "@freecity/contracts";

import type { ActivityItem, WorldResident, WorldState } from "./world.js";

/**
 * A read-only, rebuildable spatial interpretation of committed district
 * events. These locations and moods are presentation state: every visual
 * change retains the event that justified it and never becomes gameplay
 * authority.
 */

export type CityPlaceId = PlaceId;

export interface CityPlace {
  placeId: CityPlaceId;
  name: string;
  shortName: string;
  x: number;
  y: number;
  color: number;
  status: string;
  intensity: number;
}

export interface CityResidentProjection extends WorldResident {
  placeId: CityPlaceId;
  activity: string;
  sourceEventId: string | null;
}

export interface VisualIntent {
  id: string;
  kind:
    | "arrival"
    | "move"
    | "relationship"
    | "place-change"
    | "beacon-surge"
    | "building-upgrade"
    | "district-expansion";
  residentId: string | null;
  placeId: CityPlaceId;
  buildingId: string | null;
  parcelId: string | null;
  sourceEventType: DistrictEventType;
}

export interface CityScene {
  phase: "arrival" | "decision" | "waiting" | "changed";
  headline: string;
  subhead: string;
  beaconSignal: number;
  beaconLabel: string;
  places: Record<CityPlaceId, CityPlace>;
  residents: Record<string, CityResidentProjection>;
  latestIntent: VisualIntent | null;
}

/**
 * Public, privacy-minimal presence projected from committed district state.
 * It deliberately excludes Focus, cards and private relationship links. A
 * visitor can see who is in the city and what public place they currently
 * animate toward, but not a resident's private decision state.
 */
export interface PublicResidentPresence {
  residentId: string;
  displayName: string;
  kind: WorldResident["kind"];
  role: Role;
  placeId: CityPlaceId;
  placeName: string;
  activity: string;
  sourceEventId: string | null;
}

export interface PublicCitySnapshot {
  districtId: string;
  seasonId: string;
  committedAt: string;
  lastEventId: string;
  /** Complete committed census count; `residents` is the bounded viewport projection. */
  residentCount: number;
  residents: PublicResidentPresence[];
}

type ViewportResident = Pick<PublicResidentPresence, "residentId" | "kind" | "sourceEventId">;

export interface ViewportResidentLimits {
  human: number;
  ai: number;
  total: number;
}

function eventRank(resident: ViewportResident): number {
  if (!resident.sourceEventId) return 0;
  const [sequence, eventSequence] = resident.sourceEventId.split(":").map(Number);
  return (sequence ?? 0) * 1000 + (eventSequence ?? 0);
}

/**
 * Selects a stable, bounded viewport population without ever creating crowd
 * stand-ins. District guides stay visible, then the most recently active
 * humans and AI are chosen independently so both sides of the city remain
 * legible at cohort scale.
 */
export function selectResidentsForViewport<T extends ViewportResident>(
  residents: T[],
  limits: ViewportResidentLimits = { human: 16, ai: 10, total: 28 },
): T[] {
  const guides = residents.filter(
    (resident) =>
      resident.residentId === "ai-district-nia" || resident.residentId === "ai-district-orin",
  );
  const guideIds = new Set(guides.map((resident) => resident.residentId));
  const recent = residents
    .filter((resident) => !guideIds.has(resident.residentId))
    .sort(
      (left, right) =>
        eventRank(right) - eventRank(left) || left.residentId.localeCompare(right.residentId),
    );
  const humans = recent.filter((resident) => resident.kind === "human").slice(0, limits.human);
  const ai = recent.filter((resident) => resident.kind === "ai").slice(0, limits.ai);
  return [...guides, ...humans, ...ai].slice(0, limits.total);
}

const PLACE_DEFINITIONS: Record<CityPlaceId, Omit<CityPlace, "status" | "intensity">> = {
  "arrival-hall": {
    placeId: "arrival-hall",
    name: "Arrival Hall",
    shortName: "ARRIVAL",
    x: 0.17,
    y: 0.39,
    color: 0x79c7ff,
  },
  "signal-garden": {
    placeId: "signal-garden",
    name: "Signal Garden",
    shortName: "GARDEN",
    x: 0.34,
    y: 0.2,
    color: 0xd88cff,
  },
  workshop: {
    placeId: "workshop",
    name: "Night Workshop",
    shortName: "WORKSHOP",
    x: 0.76,
    y: 0.3,
    color: 0xffb85c,
  },
  studio: {
    placeId: "studio",
    name: "Echo Studio",
    shortName: "STUDIO",
    x: 0.2,
    y: 0.68,
    color: 0xff77a8,
  },
  "beacon-square": {
    placeId: "beacon-square",
    name: "Beacon Square",
    shortName: "BEACON",
    x: 0.51,
    y: 0.54,
    color: 0x72f1c6,
  },
  market: {
    placeId: "market",
    name: "Commons Market",
    shortName: "MARKET",
    x: 0.67,
    y: 0.73,
    color: 0xe7c871,
  },
  "civic-hall": {
    placeId: "civic-hall",
    name: "Civic Hall",
    shortName: "CIVIC",
    x: 0.42,
    y: 0.64,
    color: 0x9fe0ff,
  },
  archive: {
    placeId: "archive",
    name: "Archive",
    shortName: "ARCHIVE",
    x: 0.29,
    y: 0.56,
    color: 0xc8b4ff,
  },
};

const ROLE_HOME: Record<Role, CityPlaceId> = {
  builder: "workshop",
  creator: "studio",
  merchant: "beacon-square",
  reporter: "signal-garden",
  mediator: "arrival-hall",
};

function cardPlace(cardId: string): CityPlaceId {
  if (cardId.startsWith("relationship-boundary-test:")) return "signal-garden";
  if (cardId.startsWith("opportunity-repair-request:")) return "workshop";
  if (cardId.startsWith("district-competing-plans:")) return "beacon-square";
  return "beacon-square";
}

function optionActivity(optionId: string, place: CityPlaceId): string {
  const copy: Record<string, string> = {
    "opt-share": "carrying an open memory to Nia",
    "opt-excerpt": "shaping a safe signal with Mira",
    "opt-private": "sealing a private memory with Mira",
    "opt-join": "repairing the east relay with Orin",
    "opt-introduce": "opening a specialist channel for Orin",
    "opt-scout": "mapping a safer route through the blackout",
    "opt-exhibition": "lighting a path toward the night exhibition",
    "opt-drill": "marking safe routes through the district",
    "opt-combine": "weaving culture and safety into one plan",
  };
  return copy[optionId] ?? `responding at ${PLACE_DEFINITIONS[place].name}`;
}

function involvedResident(item: ActivityItem): string | null {
  return "residentId" in item.event ? item.event.residentId : null;
}

/** Builds the complete visual scene from the current committed event view. */
export function projectCityScene(state: WorldState): CityScene {
  const places = Object.fromEntries(
    Object.entries(PLACE_DEFINITIONS).map(([placeId, place]) => [
      placeId,
      { ...place, status: "quiet", intensity: placeId === "beacon-square" ? 0.38 : 0.18 },
    ]),
  ) as Record<CityPlaceId, CityPlace>;

  const residents: Record<string, CityResidentProjection> = {};
  for (const resident of Object.values(state.residents)) {
    residents[resident.residentId] = {
      ...resident,
      placeId: state.world.presence[resident.residentId] ?? ROLE_HOME[resident.role],
      activity: resident.kind === "ai" ? "watching the district" : "newly arrived",
      sourceEventId: null,
    };
  }

  let phase: CityScene["phase"] = "arrival";
  let beaconSignal = 38;
  let latestIntent: VisualIntent | null = null;
  const choicePlaces = new Set<CityPlaceId>();
  const resolvedPlaces = new Set<CityPlaceId>();

  const placeForResident = (residentId: string, placeId: CityPlaceId, item: ActivityItem) => {
    const resident = residents[residentId];
    if (!resident) return;
    resident.placeId = placeId;
    resident.sourceEventId = item.id;
  };

  for (const item of state.activity) {
    const event = item.event;
    const residentId = involvedResident(item);
    switch (event.eventType) {
      case "ResidentProvisioned": {
        const resident = residents[event.residentId];
        if (resident) {
          resident.activity =
            event.residentId === "ai-district-nia"
              ? "holding the Beacon's fading song"
              : event.residentId === "ai-district-orin"
                ? "keeping the east relay alive"
                : event.kind === "ai"
                  ? "waiting to meet their human"
                  : "crossing the city threshold";
          resident.sourceEventId = item.id;
        }
        latestIntent = {
          id: item.id,
          kind: "arrival",
          residentId: event.residentId,
          placeId: resident?.placeId ?? "arrival-hall",
          buildingId: null,
          parcelId: null,
          sourceEventType: event.eventType,
        };
        break;
      }
      case "CardAssigned":
        if (residentId) {
          const resident = residents[residentId];
          if (resident) resident.activity = "listening to Mira's briefing";
        }
        phase = "decision";
        break;
      case "ChoiceCommitted": {
        const placeId = cardPlace(event.cardId);
        placeForResident(event.residentId, placeId, item);
        const resident = residents[event.residentId];
        if (resident) resident.activity = optionActivity(event.optionId, placeId);
        const companionId = resident?.sponsoredAiResidentId;
        if (companionId) {
          placeForResident(companionId, placeId, item);
          const companion = residents[companionId];
          if (companion) companion.activity = `moving with ${resident.displayName}`;
        }
        places[placeId].status = optionActivity(event.optionId, placeId);
        places[placeId].intensity = Math.min(1, places[placeId].intensity + 0.32);
        if (!choicePlaces.has(placeId)) {
          choicePlaces.add(placeId);
          beaconSignal = Math.min(100, beaconSignal + 6);
        }
        phase = "waiting";
        latestIntent = {
          id: item.id,
          kind: placeId === "signal-garden" ? "relationship" : "move",
          residentId: event.residentId,
          placeId,
          buildingId: null,
          parcelId: null,
          sourceEventType: event.eventType,
        };
        break;
      }
      case "ImmediateReactionRecorded": {
        const placeId = cardPlace(event.cardId);
        latestIntent = {
          id: item.id,
          kind: "place-change",
          residentId: event.residentId,
          placeId,
          buildingId: null,
          parcelId: null,
          sourceEventType: event.eventType,
        };
        break;
      }
      case "ConsequenceScheduled":
        phase = "waiting";
        break;
      case "ConsequenceResolved": {
        const placeId = cardPlace(event.cardId);
        places[placeId].status = "changed by a resolved consequence";
        places[placeId].intensity = 1;
        if (!resolvedPlaces.has(placeId)) {
          resolvedPlaces.add(placeId);
          beaconSignal = Math.min(100, beaconSignal + 8);
        }
        phase = "changed";
        latestIntent = {
          id: item.id,
          kind: "beacon-surge",
          residentId: event.residentId,
          placeId,
          buildingId: null,
          parcelId: null,
          sourceEventType: event.eventType,
        };
        break;
      }
      case "CardDeclined": {
        const resident = residents[event.residentId];
        if (resident) resident.activity = "holding a boundary without penalty";
        break;
      }
      case "FocusSpent":
      case "CardExpired":
      case "FocusRefreshed":
      case "ArchiveEntryRecorded":
        break;
      case "BuildingUpgraded": {
        const placeId = (
          event.building.buildingId in places ? event.building.buildingId : "beacon-square"
        ) as CityPlaceId;
        if (places[placeId]) {
          places[placeId].status = `level ${event.building.level} · newly upgraded`;
          places[placeId].intensity = 1;
        }
        beaconSignal = Math.min(100, beaconSignal + 5);
        phase = "changed";
        latestIntent = {
          id: item.id,
          kind: "building-upgrade",
          residentId: event.residentId,
          placeId,
          buildingId: event.building.buildingId,
          parcelId: event.building.parcelId,
          sourceEventType: event.eventType,
        };
        break;
      }
      case "DistrictExpanded": {
        const placeId: CityPlaceId =
          event.parcelId === "east-harbor"
            ? "workshop"
            : event.parcelId === "north-gardens"
              ? "signal-garden"
              : "studio";
        beaconSignal = Math.min(100, beaconSignal + 7);
        phase = "changed";
        latestIntent = {
          id: item.id,
          kind: "district-expansion",
          residentId: event.residentId,
          placeId,
          buildingId: event.revealedBuildingIds[0] ?? null,
          parcelId: event.parcelId,
          sourceEventType: event.eventType,
        };
        break;
      }
      case "PlaceVisited": {
        placeForResident(event.residentId, event.placeId, item);
        const resident = residents[event.residentId];
        if (resident) resident.activity = `present at ${places[event.placeId].name}`;
        places[event.placeId].status = "hosting a committed resident";
        places[event.placeId].intensity = Math.min(1, places[event.placeId].intensity + 0.22);
        latestIntent = {
          id: item.id,
          kind: "move",
          residentId: event.residentId,
          placeId: event.placeId,
          buildingId: null,
          parcelId: null,
          sourceEventType: event.eventType,
        };
        break;
      }
      case "RelationshipInvited":
      case "RelationshipResponded":
      case "RelationshipCancelled":
      case "RelationshipRepaired":
      case "CircleCreated":
      case "CircleInvitationSent":
      case "CircleInvitationResponded": {
        const placeId: CityPlaceId = "signal-garden";
        if (residentId) placeForResident(residentId, placeId, item);
        places[placeId].status = "relationships are changing";
        places[placeId].intensity = Math.min(1, places[placeId].intensity + 0.18);
        phase = "changed";
        break;
      }
      case "ProjectJoined":
      case "ProjectTaskClaimed":
      case "ProjectContributionSubmitted":
      case "ProjectContributionReviewed": {
        const projectId = "projectId" in event ? event.projectId : "east-relay";
        const placeId = state.world.projects[projectId]?.placeId ?? "workshop";
        if (residentId) placeForResident(residentId, placeId, item);
        places[placeId].status = "project work is active";
        places[placeId].intensity = Math.min(1, places[placeId].intensity + 0.2);
        phase = "changed";
        break;
      }
      case "MarketNeedCreated":
      case "MarketProposalSubmitted":
      case "MarketProposalResponded":
        if (residentId) placeForResident(residentId, "market", item);
        places.market.status = "needs and offers are moving";
        places.market.intensity = Math.min(1, places.market.intensity + 0.2);
        phase = "changed";
        break;
      case "CivicElectionOpened":
      case "CivicCandidacyDeclared":
      case "CivicVoteCast":
      case "CivicVotingClosed":
      case "CivicChallengeFiled":
      case "CivicElectionFinalized":
        if (residentId && residents[residentId]) placeForResident(residentId, "civic-hall", item);
        places["civic-hall"].status = "civic process in progress";
        places["civic-hall"].intensity = Math.min(1, places["civic-hall"].intensity + 0.2);
        phase = "changed";
        break;
      case "BeaconContributionRecorded":
        if (residentId) placeForResident(residentId, "beacon-square", item);
        places["beacon-square"].status = event.contribution.summary;
        places["beacon-square"].intensity = 1;
        beaconSignal = Math.min(100, 38 + event.level * 6);
        phase = "changed";
        break;
      case "ResidentPreferencesUpdated":
        break;
    }
  }

  const narrative = {
    arrival: {
      headline: "District Zero is waking up",
      subhead: "Mira is waiting at Arrival Hall. Two signals are calling from across the city.",
    },
    decision: {
      headline: "The Beacon is losing its voice",
      subhead:
        "Nia and Orin can hold it until first light. What survives the night depends on you.",
    },
    waiting: {
      headline: "Your choice is moving through the city",
      subhead: "Residents have changed course. A committed consequence is now on its way.",
    },
    changed: {
      headline: "The city remembers what you did",
      subhead: "A place, a relationship, and the Beacon now carry the result in public history.",
    },
  }[phase];

  return {
    phase,
    ...narrative,
    beaconSignal,
    beaconLabel: beaconSignal >= 82 ? "resonant" : beaconSignal >= 55 ? "recovering" : "unstable",
    places,
    residents,
    latestIntent,
  };
}

/**
 * Produces the public resident layer from the same rebuildable world state
 * used by the authenticated District projection. Every returned figure maps
 * to one committed ResidentState; this function never fabricates crowd
 * members to make the city look busier.
 */
export function projectPublicCitySnapshot(
  state: WorldState,
  identity: { districtId: string; seasonId: string; committedAt: string },
): PublicCitySnapshot {
  const scene = projectCityScene(state);
  const allResidents = Object.values(scene.residents)
    .map((resident) => ({
      residentId: resident.residentId,
      displayName: resident.displayName,
      kind: resident.kind,
      role: resident.role,
      placeId: resident.placeId,
      placeName: scene.places[resident.placeId].name,
      activity: resident.activity,
      sourceEventId: resident.sourceEventId,
    }))
    .sort((left, right) => left.residentId.localeCompare(right.residentId));
  const residents = selectResidentsForViewport(allResidents);

  return {
    ...identity,
    lastEventId: `${state.cursor.sequence}:${state.cursor.eventSeq}`,
    residentCount: allResidents.length,
    residents,
  };
}
