import {
  FOCUS_DAILY,
  MAX_ACTIVE_CARDS,
  appliedCommandInputSchema,
  type AppliedCommandInput,
  type AssignCardPayload,
  type CardInstance,
  type CommitChoicePayload,
  type DeclineCardPayload,
  type DistrictEvent,
  type DistrictState,
  type ExpandDistrictPayload,
  type ProvisionResidentPayload,
  type ResidentState,
  type RunDueEffectsPayload,
  type UpgradeBuildingPayload,
  type UpdateResidentPreferencesPayload,
  createDefaultResidentPreferences,
} from "@freecity/contracts";

import {
  WORLD_REJECTION_CODES,
  advanceCivicElection,
  applyCityWorldCommand,
  maybeOpenCivicElection,
} from "./city-world.js";
import { addHours, addMinutes, dayKey, isDue } from "./time.js";

export const REJECTION_CODES = [
  "INVALID_PAYLOAD",
  "RESIDENT_NOT_FOUND",
  "RESIDENT_ALREADY_EXISTS",
  "CARD_NOT_FOUND",
  "CARD_ALREADY_ASSIGNED",
  "TOO_MANY_ACTIVE_CARDS",
  "CARD_EXPIRED",
  "OPTION_NOT_FOUND",
  "INSUFFICIENT_FOCUS",
  "VERSION_CONFLICT",
  "BUILDING_NOT_FOUND",
  "BUILDING_MAX_LEVEL",
  "BUILDING_LEVEL_CONFLICT",
  "PARCEL_NOT_FOUND",
  "PARCEL_ALREADY_UNLOCKED",
  "PARCEL_NOT_ADJACENT",
  "INSUFFICIENT_CIVIC_CAPACITY",
  ...WORLD_REJECTION_CODES,
] as const;
export type RejectionCode = (typeof REJECTION_CODES)[number];

export type ApplyResult =
  | { ok: true; state: DistrictState; events: DistrictEvent[] }
  | { ok: false; rejection: { code: RejectionCode; message: string } };

function reject(code: RejectionCode, message: string): ApplyResult {
  return { ok: false, rejection: { code, message } };
}

/**
 * The deterministic transition function: the same state, journaled input, and
 * step time always produce the same result. No clocks, no randomness beyond
 * the recorded seed (unused by R0 rules), no I/O.
 */
export function applyCommand(
  state: DistrictState,
  input: AppliedCommandInput,
  stepTime: string,
): ApplyResult {
  const parsedInput = appliedCommandInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return reject("INVALID_PAYLOAD", parsedInput.error.issues[0]?.message ?? "invalid input");
  }
  const { command, sequence } = parsedInput.data;

  const next = structuredClone(state);
  next.stateVersion += 1;
  next.sequence = sequence;
  next.stepTime = stepTime;

  let events: DistrictEvent[];
  switch (command.type) {
    case "season.provision_resident": {
      const result = provisionResident(next, command.payload, stepTime);
      if (!result.ok) return result;
      events = result.events;
      break;
    }
    case "card.assign": {
      const result = assignCard(next, command.payload, stepTime);
      if (!result.ok) return result;
      events = result.events;
      break;
    }
    case "card.commit_choice": {
      const result = commitChoice(next, state.stateVersion, command.payload, stepTime);
      if (!result.ok) return result;
      events = result.events;
      break;
    }
    case "card.decline": {
      const result = declineCard(next, command.payload);
      if (!result.ok) return result;
      events = result.events;
      break;
    }
    case "building.upgrade": {
      const result = upgradeBuilding(next, command.payload);
      if (!result.ok) return result;
      events = result.events;
      break;
    }
    case "district.expand": {
      const result = expandDistrict(next, command.payload);
      if (!result.ok) return result;
      events = result.events;
      break;
    }
    case "resident.update_preferences": {
      const result = updateResidentPreferences(next, command.payload);
      if (!result.ok) return result;
      events = result.events;
      break;
    }
    case "place.visit":
    case "social.invite":
    case "social.respond":
    case "social.cancel":
    case "social.repair":
    case "circle.create":
    case "circle.invite":
    case "circle.respond":
    case "project.join":
    case "project.claim_task":
    case "project.submit_contribution":
    case "project.review_contribution":
    case "market.create_need":
    case "market.submit_proposal":
    case "market.respond_proposal":
    case "civic.declare_candidacy":
    case "civic.cast_vote":
    case "civic.file_challenge": {
      const result = applyCityWorldCommand(next, command, stepTime);
      if (!result.ok) return result;
      events = result.events;
      break;
    }
    case "runtime.run_due_effects": {
      const result = runDueEffects(next, command.payload, stepTime);
      if (!result.ok) return result;
      events = result.events;
      break;
    }
  }

  return { ok: true, state: next, events };
}

function upgradeBuilding(state: DistrictState, payload: UpgradeBuildingPayload): StepOutcome {
  if (!state.residents[payload.residentId]) {
    return reject("RESIDENT_NOT_FOUND", `resident ${payload.residentId} is not provisioned`);
  }
  const building = state.city.buildings[payload.buildingId];
  if (!building) {
    return reject("BUILDING_NOT_FOUND", `building ${payload.buildingId} does not exist`);
  }
  const parcel = state.city.parcels[building.parcelId];
  if (!parcel?.unlocked) {
    return reject("BUILDING_NOT_FOUND", `building ${payload.buildingId} is not in unlocked land`);
  }
  if (building.level !== payload.expectedLevel) {
    return reject(
      "BUILDING_LEVEL_CONFLICT",
      `expected level ${payload.expectedLevel}, current level is ${building.level}`,
    );
  }
  if (building.level >= building.maxLevel) {
    return reject("BUILDING_MAX_LEVEL", `${building.name} is already at maximum level`);
  }
  const capacitySpent = building.level * 2 + 1;
  if (state.city.civicCapacity < capacitySpent) {
    return reject(
      "INSUFFICIENT_CIVIC_CAPACITY",
      `upgrade needs ${capacitySpent} capacity, city has ${state.city.civicCapacity}`,
    );
  }
  const fromLevel = building.level;
  building.level += 1;
  state.city.civicCapacity -= capacitySpent;
  const prosperityGained = building.level * 3;
  state.city.prosperity += prosperityGained;
  if (building.type === "habitat") state.city.population += 4;

  return {
    ok: true,
    events: [
      {
        eventType: "BuildingUpgraded",
        residentId: payload.residentId,
        building: structuredClone(building),
        fromLevel,
        capacitySpent,
        prosperityGained,
      },
      {
        eventType: "ArchiveEntryRecorded",
        residentId: payload.residentId,
        entryType: "building_upgrade",
        cardId: null,
        consequenceId: null,
        summary: `Upgraded ${building.name} to level ${building.level}`,
      },
    ],
  };
}

function updateResidentPreferences(
  state: DistrictState,
  payload: UpdateResidentPreferencesPayload,
): StepOutcome {
  const resident = state.residents[payload.residentId];
  if (!resident) {
    return reject("RESIDENT_NOT_FOUND", `resident ${payload.residentId} is not provisioned`);
  }
  resident.preferences = payload.preferences;
  return {
    ok: true,
    events: [
      {
        eventType: "ResidentPreferencesUpdated",
        residentId: payload.residentId,
        preferences: payload.preferences,
      },
    ],
  };
}

function expandDistrict(state: DistrictState, payload: ExpandDistrictPayload): StepOutcome {
  if (!state.residents[payload.residentId]) {
    return reject("RESIDENT_NOT_FOUND", `resident ${payload.residentId} is not provisioned`);
  }
  const parcel = state.city.parcels[payload.parcelId];
  if (!parcel) return reject("PARCEL_NOT_FOUND", `parcel ${payload.parcelId} does not exist`);
  if (parcel.unlocked) {
    return reject("PARCEL_ALREADY_UNLOCKED", `${parcel.name} is already part of the district`);
  }
  if (parcel.requiresParcelId && !state.city.parcels[parcel.requiresParcelId]?.unlocked) {
    return reject("PARCEL_NOT_ADJACENT", `${parcel.name} is not adjacent to unlocked city land`);
  }
  if (state.city.civicCapacity < parcel.expansionCost) {
    return reject(
      "INSUFFICIENT_CIVIC_CAPACITY",
      `expansion needs ${parcel.expansionCost} capacity, city has ${state.city.civicCapacity}`,
    );
  }
  parcel.unlocked = true;
  state.city.civicCapacity -= parcel.expansionCost;
  const populationGained = 6;
  state.city.population += populationGained;
  state.city.prosperity += 4;
  const revealedBuildingIds = Object.values(state.city.buildings)
    .filter((building) => building.parcelId === parcel.parcelId)
    .map((building) => building.buildingId)
    .sort();

  return {
    ok: true,
    events: [
      {
        eventType: "DistrictExpanded",
        residentId: payload.residentId,
        parcelId: parcel.parcelId,
        parcelName: parcel.name,
        revealedBuildingIds,
        capacitySpent: parcel.expansionCost,
        populationGained,
        prosperityGained: 4,
      },
      {
        eventType: "ArchiveEntryRecorded",
        residentId: payload.residentId,
        entryType: "district_expansion",
        cardId: null,
        consequenceId: null,
        summary: `Expanded District Zero into ${parcel.name}`,
      },
    ],
  };
}

type StepOutcome = { ok: true; events: DistrictEvent[] } | Extract<ApplyResult, { ok: false }>;

function provisionResident(
  state: DistrictState,
  payload: ProvisionResidentPayload,
  stepTime: string,
): StepOutcome {
  if (state.residents[payload.residentId]) {
    return reject("RESIDENT_ALREADY_EXISTS", `resident ${payload.residentId} already provisioned`);
  }
  const resident: ResidentState = {
    residentId: payload.residentId,
    kind: payload.kind,
    role: payload.role,
    displayName: payload.displayName,
    sponsoredAiResidentId: payload.sponsoredAiResidentId,
    focus: FOCUS_DAILY,
    lastFocusRefreshDayKey: dayKey(stepTime),
    activeCards: [],
    pendingConsequences: [],
    preferences: createDefaultResidentPreferences(),
  };
  state.residents[payload.residentId] = resident;
  state.world.presence[payload.residentId] = "arrival-hall";
  const civicEvents = maybeOpenCivicElection(state, payload.residentId, stepTime);
  return {
    ok: true,
    events: [
      {
        eventType: "ResidentProvisioned",
        residentId: payload.residentId,
        kind: payload.kind,
        role: payload.role,
        displayName: payload.displayName,
        sponsoredAiResidentId: payload.sponsoredAiResidentId,
        initialFocus: FOCUS_DAILY,
      },
      ...civicEvents,
    ],
  };
}

function assignCard(
  state: DistrictState,
  payload: AssignCardPayload,
  stepTime: string,
): StepOutcome {
  const resident = state.residents[payload.residentId];
  if (!resident) {
    return reject("RESIDENT_NOT_FOUND", `resident ${payload.residentId} is not provisioned`);
  }
  if (resident.activeCards.some((c) => c.cardId === payload.card.cardId)) {
    return reject("CARD_ALREADY_ASSIGNED", `card ${payload.card.cardId} is already active`);
  }
  if (resident.activeCards.length >= MAX_ACTIVE_CARDS) {
    return reject(
      "TOO_MANY_ACTIVE_CARDS",
      `resident ${payload.residentId} already has ${MAX_ACTIVE_CARDS} active cards`,
    );
  }
  const card: CardInstance = {
    cardId: payload.card.cardId,
    templateId: payload.card.templateId,
    eventFamily: payload.card.eventFamily,
    assignedAt: stepTime,
    expiresAt: addHours(stepTime, payload.card.expiresAfterHours),
    options: payload.card.options,
  };
  resident.activeCards.push(card);
  return {
    ok: true,
    events: [
      {
        eventType: "CardAssigned",
        residentId: payload.residentId,
        cardId: card.cardId,
        templateId: card.templateId,
        expiresAt: card.expiresAt,
      },
    ],
  };
}

function commitChoice(
  state: DistrictState,
  previousStateVersion: number,
  payload: CommitChoicePayload,
  stepTime: string,
): StepOutcome {
  const resident = state.residents[payload.residentId];
  if (!resident) {
    return reject("RESIDENT_NOT_FOUND", `resident ${payload.residentId} is not provisioned`);
  }
  const cardIndex = resident.activeCards.findIndex((c) => c.cardId === payload.cardId);
  const card = resident.activeCards[cardIndex];
  if (!card) {
    return reject("CARD_NOT_FOUND", `card ${payload.cardId} is not active for this resident`);
  }
  if (
    payload.expectedStateVersion !== null &&
    payload.expectedStateVersion !== previousStateVersion
  ) {
    return reject(
      "VERSION_CONFLICT",
      `expected state version ${payload.expectedStateVersion}, current is ${previousStateVersion}`,
    );
  }
  if (isDue(card.expiresAt, stepTime)) {
    return reject("CARD_EXPIRED", `card ${payload.cardId} expired at ${card.expiresAt}`);
  }
  const option = card.options.find((o) => o.optionId === payload.optionId);
  if (!option) {
    return reject("OPTION_NOT_FOUND", `option ${payload.optionId} does not exist on this card`);
  }
  if (resident.focus < option.focusCost) {
    return reject(
      "INSUFFICIENT_FOCUS",
      `option costs ${option.focusCost} Focus, resident has ${resident.focus}`,
    );
  }

  resident.focus -= option.focusCost;
  resident.activeCards.splice(cardIndex, 1);
  const consequenceId = `${card.cardId}#${option.optionId}`;
  const dueAt = addMinutes(stepTime, option.consequenceDelayMinutes);
  resident.pendingConsequences.push({
    consequenceId,
    cardId: card.cardId,
    optionId: option.optionId,
    dueAt,
    consequenceText: option.consequenceText,
  });

  const events: DistrictEvent[] = [];
  if (option.focusCost > 0) {
    events.push({
      eventType: "FocusSpent",
      residentId: resident.residentId,
      cardId: card.cardId,
      optionId: option.optionId,
      amount: option.focusCost,
      remaining: resident.focus,
    });
  }
  events.push(
    {
      eventType: "ChoiceCommitted",
      residentId: resident.residentId,
      cardId: card.cardId,
      optionId: option.optionId,
    },
    {
      eventType: "ImmediateReactionRecorded",
      residentId: resident.residentId,
      cardId: card.cardId,
      optionId: option.optionId,
      reactionText: option.reactionText,
    },
    {
      eventType: "ConsequenceScheduled",
      residentId: resident.residentId,
      consequenceId,
      cardId: card.cardId,
      optionId: option.optionId,
      dueAt,
    },
    {
      eventType: "ArchiveEntryRecorded",
      residentId: resident.residentId,
      entryType: "choice",
      cardId: card.cardId,
      consequenceId,
      summary: `Chose "${option.label}"`,
    },
  );
  return { ok: true, events };
}

function declineCard(state: DistrictState, payload: DeclineCardPayload): StepOutcome {
  const resident = state.residents[payload.residentId];
  if (!resident) {
    return reject("RESIDENT_NOT_FOUND", `resident ${payload.residentId} is not provisioned`);
  }
  const cardIndex = resident.activeCards.findIndex((c) => c.cardId === payload.cardId);
  const card = resident.activeCards[cardIndex];
  if (!card) {
    return reject("CARD_NOT_FOUND", `card ${payload.cardId} is not active for this resident`);
  }
  resident.activeCards.splice(cardIndex, 1);
  return {
    ok: true,
    events: [
      {
        eventType: "CardDeclined",
        residentId: resident.residentId,
        cardId: card.cardId,
        reason: payload.reason,
      },
      {
        eventType: "ArchiveEntryRecorded",
        residentId: resident.residentId,
        entryType: "decline",
        cardId: card.cardId,
        consequenceId: null,
        summary: `Declined a ${card.eventFamily} card`,
      },
    ],
  };
}

/**
 * Bounded catch-up (Runtime §7): processes due card expiries, due
 * consequences, and the daily Focus refresh in a stable order. Each expiry,
 * consequence, and refresh counts once against `limit`; leftover work stays
 * durable for the next run. Missing several days still grants at most one
 * refresh (Implementation Plan §7.2).
 */
function runDueEffects(
  state: DistrictState,
  payload: RunDueEffectsPayload,
  stepTime: string,
): StepOutcome {
  const events: DistrictEvent[] = [];
  let budget = payload.limit;
  const residentIds = Object.keys(state.residents).sort();

  // 1. Card expiries, ordered by (expiresAt, cardId).
  const expiries: { residentId: string; cardId: string; expiresAt: string }[] = [];
  for (const residentId of residentIds) {
    const resident = state.residents[residentId];
    if (!resident) continue;
    for (const card of resident.activeCards) {
      if (isDue(card.expiresAt, stepTime)) {
        expiries.push({ residentId, cardId: card.cardId, expiresAt: card.expiresAt });
      }
    }
  }
  expiries.sort((a, b) =>
    a.expiresAt === b.expiresAt
      ? a.cardId.localeCompare(b.cardId)
      : a.expiresAt.localeCompare(b.expiresAt),
  );
  for (const expiry of expiries) {
    if (budget <= 0) break;
    const resident = state.residents[expiry.residentId];
    if (!resident) continue;
    const cardIndex = resident.activeCards.findIndex((c) => c.cardId === expiry.cardId);
    const card = resident.activeCards[cardIndex];
    if (!card) continue;
    resident.activeCards.splice(cardIndex, 1);
    events.push(
      { eventType: "CardExpired", residentId: expiry.residentId, cardId: expiry.cardId },
      {
        eventType: "ArchiveEntryRecorded",
        residentId: expiry.residentId,
        entryType: "card_expired",
        cardId: expiry.cardId,
        consequenceId: null,
        summary: `A ${card.eventFamily} card expired without a decision`,
      },
    );
    budget -= 1;
  }

  // 2. Due consequences, ordered by (dueAt, consequenceId).
  const due: { residentId: string; consequenceId: string; dueAt: string }[] = [];
  for (const residentId of residentIds) {
    const resident = state.residents[residentId];
    if (!resident) continue;
    for (const pending of resident.pendingConsequences) {
      if (isDue(pending.dueAt, stepTime)) {
        due.push({ residentId, consequenceId: pending.consequenceId, dueAt: pending.dueAt });
      }
    }
  }
  due.sort((a, b) =>
    a.dueAt === b.dueAt
      ? a.consequenceId.localeCompare(b.consequenceId)
      : a.dueAt.localeCompare(b.dueAt),
  );
  for (const item of due) {
    if (budget <= 0) break;
    const resident = state.residents[item.residentId];
    if (!resident) continue;
    const index = resident.pendingConsequences.findIndex(
      (p) => p.consequenceId === item.consequenceId,
    );
    const pending = resident.pendingConsequences[index];
    if (!pending) continue;
    resident.pendingConsequences.splice(index, 1);
    events.push(
      {
        eventType: "ConsequenceResolved",
        residentId: item.residentId,
        consequenceId: pending.consequenceId,
        cardId: pending.cardId,
        optionId: pending.optionId,
        consequenceText: pending.consequenceText,
      },
      {
        eventType: "ArchiveEntryRecorded",
        residentId: item.residentId,
        entryType: "consequence",
        cardId: pending.cardId,
        consequenceId: pending.consequenceId,
        summary: pending.consequenceText,
      },
    );
    budget -= 1;
  }

  // 3. Daily Focus refresh, ordered by residentId; at most one per resident
  //    regardless of how many day boundaries passed while away.
  const today = dayKey(stepTime);
  for (const residentId of residentIds) {
    if (budget <= 0) break;
    const resident = state.residents[residentId];
    if (!resident) continue;
    if (resident.lastFocusRefreshDayKey < today) {
      resident.focus = Math.max(resident.focus, FOCUS_DAILY);
      resident.lastFocusRefreshDayKey = today;
      events.push({
        eventType: "FocusRefreshed",
        residentId,
        focus: resident.focus,
        dayKey: today,
      });
      budget -= 1;
    }
  }

  // 4. Advance at most one civic phase per bounded wake.
  if (budget > 0) {
    const civicEvents = advanceCivicElection(state, stepTime);
    if (civicEvents.length > 0) events.push(...civicEvents);
  }

  return { ok: true, events };
}
