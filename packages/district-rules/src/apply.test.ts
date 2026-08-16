import { describe, expect, it } from "vitest";

import {
  FOCUS_DAILY,
  type AppliedCommandInput,
  type DistrictCommand,
  type DistrictState,
  createInitialCityState,
} from "@freecity/contracts";

import { applyCommand, type ApplyResult } from "./apply.js";

const T0 = "2026-09-01T08:00:00.000Z";

function emptyState(): DistrictState {
  return {
    districtId: "district-zero",
    seasonId: "season-0",
    stateVersion: 0,
    sequence: 0,
    stepTime: T0,
    rulesetVersion: "district-zero-r0",
    rngSeed: "test-seed",
    residents: {},
    city: createInitialCityState(),
  };
}

let nextSequence = 1;
function input(command: DistrictCommand, sequence?: number): AppliedCommandInput {
  const seq = sequence ?? nextSequence++;
  return { commandId: `cmd-${seq}`, sequence: seq, command };
}

function provisionCommand(residentId = "human-1"): DistrictCommand {
  return {
    type: "season.provision_resident",
    payload: {
      residentId,
      kind: "human",
      role: "builder",
      displayName: "Ada",
      sponsoredAiResidentId: "ai-1",
    },
  };
}

function assignCommand(
  cardId = "card-1",
  overrides?: { expiresAfterHours?: number },
): DistrictCommand {
  return {
    type: "card.assign",
    payload: {
      residentId: "human-1",
      card: {
        cardId,
        templateId: "tpl-boundary-test",
        eventFamily: "relationship",
        expiresAfterHours: overrides?.expiresAfterHours ?? 48,
        options: [
          {
            optionId: "opt-share",
            label: "Share this version",
            focusCost: 1,
            reactionText: "Mira thanks you and prepares the introduction.",
            consequenceDelayMinutes: 60,
            consequenceText: "The Studio Circle read the draft and replied.",
          },
          {
            optionId: "opt-keep",
            label: "Keep it private",
            focusCost: 0,
            reactionText: "Mira records the boundary without complaint.",
            consequenceDelayMinutes: 30,
            consequenceText: "Mira adjusted what it shares by default.",
          },
        ],
      },
    },
  };
}

function mustApply(
  state: DistrictState,
  cmd: AppliedCommandInput,
  stepTime: string,
): DistrictState {
  const result = applyCommand(state, cmd, stepTime);
  if (!result.ok) throw new Error(`unexpected rejection: ${result.rejection.code}`);
  return result.state;
}

function expectRejection(result: ApplyResult, code: string): void {
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.rejection.code).toBe(code);
}

function provisionedState(): DistrictState {
  return mustApply(emptyState(), input(provisionCommand(), 1), T0);
}

function withCard(state?: DistrictState): DistrictState {
  return mustApply(state ?? provisionedState(), input(assignCommand(), 2), T0);
}

describe("season.provision_resident", () => {
  it("creates the resident with daily Focus and emits ResidentProvisioned", () => {
    const result = applyCommand(emptyState(), input(provisionCommand(), 1), T0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const resident = result.state.residents["human-1"];
    expect(resident?.focus).toBe(FOCUS_DAILY);
    expect(resident?.lastFocusRefreshDayKey).toBe("2026-09-01");
    expect(result.state.stateVersion).toBe(1);
    expect(result.state.sequence).toBe(1);
    expect(result.events.map((e) => e.eventType)).toEqual(["ResidentProvisioned"]);
  });

  it("rejects a duplicate resident", () => {
    const state = provisionedState();
    expectRejection(
      applyCommand(state, input(provisionCommand(), 2), T0),
      "RESIDENT_ALREADY_EXISTS",
    );
  });
});

describe("card.assign", () => {
  it("assigns the card with template-defined expiry and emits CardAssigned", () => {
    const result = applyCommand(provisionedState(), input(assignCommand(), 2), T0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const card = result.state.residents["human-1"]?.activeCards[0];
    expect(card?.expiresAt).toBe("2026-09-03T08:00:00.000Z");
    expect(result.events.map((e) => e.eventType)).toEqual(["CardAssigned"]);
  });

  it("rejects an unknown resident", () => {
    expectRejection(
      applyCommand(emptyState(), input(assignCommand(), 1), T0),
      "RESIDENT_NOT_FOUND",
    );
  });

  it("rejects a duplicate active cardId", () => {
    const state = withCard();
    expectRejection(applyCommand(state, input(assignCommand(), 3), T0), "CARD_ALREADY_ASSIGNED");
  });

  it("rejects a fourth active card", () => {
    let state = provisionedState();
    state = mustApply(state, input(assignCommand("c1"), 2), T0);
    state = mustApply(state, input(assignCommand("c2"), 3), T0);
    state = mustApply(state, input(assignCommand("c3"), 4), T0);
    expectRejection(
      applyCommand(state, input(assignCommand("c4"), 5), T0),
      "TOO_MANY_ACTIVE_CARDS",
    );
  });
});

describe("card.commit_choice", () => {
  function commit(optionId: string, expected: number | null = null): DistrictCommand {
    return {
      type: "card.commit_choice",
      payload: {
        residentId: "human-1",
        cardId: "card-1",
        optionId,
        expectedStateVersion: expected,
      },
    };
  }

  it("spends Focus once and emits the full event order", () => {
    const result = applyCommand(
      withCard(),
      input(commit("opt-share"), 3),
      "2026-09-01T08:05:00.000Z",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.residents["human-1"]?.focus).toBe(FOCUS_DAILY - 1);
    expect(result.state.residents["human-1"]?.activeCards).toHaveLength(0);
    expect(result.state.residents["human-1"]?.pendingConsequences[0]?.dueAt).toBe(
      "2026-09-01T09:05:00.000Z",
    );
    expect(result.events.map((e) => e.eventType)).toEqual([
      "FocusSpent",
      "ChoiceCommitted",
      "ImmediateReactionRecorded",
      "ConsequenceScheduled",
      "ArchiveEntryRecorded",
    ]);
  });

  it("omits FocusSpent for a zero-cost option", () => {
    const result = applyCommand(withCard(), input(commit("opt-keep"), 3), T0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.residents["human-1"]?.focus).toBe(FOCUS_DAILY);
    expect(result.events.map((e) => e.eventType)).toEqual([
      "ChoiceCommitted",
      "ImmediateReactionRecorded",
      "ConsequenceScheduled",
      "ArchiveEntryRecorded",
    ]);
  });

  it("rejects an unknown resident, unknown card, and a second choice on the same card", () => {
    expectRejection(
      applyCommand(emptyState(), input(commit("opt-share"), 1), T0),
      "RESIDENT_NOT_FOUND",
    );
    expectRejection(
      applyCommand(provisionedState(), input(commit("opt-share"), 2), T0),
      "CARD_NOT_FOUND",
    );
    const chosen = mustApply(withCard(), input(commit("opt-keep"), 3), T0);
    expectRejection(applyCommand(chosen, input(commit("opt-share"), 4), T0), "CARD_NOT_FOUND");
  });

  it("rejects a stale expectedStateVersion with VERSION_CONFLICT", () => {
    expectRejection(
      applyCommand(withCard(), input(commit("opt-share", 1), 3), T0),
      "VERSION_CONFLICT",
    );
    const ok = applyCommand(withCard(), input(commit("opt-share", 2), 3), T0);
    expect(ok.ok).toBe(true);
  });

  it("rejects a choice on an expired card", () => {
    expectRejection(
      applyCommand(withCard(), input(commit("opt-share"), 3), "2026-09-03T08:00:00.000Z"),
      "CARD_EXPIRED",
    );
  });

  it("rejects an unknown option", () => {
    expectRejection(applyCommand(withCard(), input(commit("opt-nope"), 3), T0), "OPTION_NOT_FOUND");
  });

  it("rejects when Focus is insufficient", () => {
    let state = withCard();
    state = { ...state, residents: structuredClone(state.residents) };
    const resident = state.residents["human-1"];
    if (!resident) throw new Error("missing resident");
    resident.focus = 0;
    expectRejection(applyCommand(state, input(commit("opt-share"), 3), T0), "INSUFFICIENT_FOCUS");
  });
});

describe("card.decline", () => {
  it("removes the card for free and records an Archive entry", () => {
    const result = applyCommand(
      withCard(),
      input(
        {
          type: "card.decline",
          payload: { residentId: "human-1", cardId: "card-1", reason: "not today" },
        },
        3,
      ),
      T0,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.residents["human-1"]?.focus).toBe(FOCUS_DAILY);
    expect(result.state.residents["human-1"]?.activeCards).toHaveLength(0);
    expect(result.events.map((e) => e.eventType)).toEqual(["CardDeclined", "ArchiveEntryRecorded"]);
  });

  it("rejects declining a card that is not active", () => {
    expectRejection(
      applyCommand(
        provisionedState(),
        input(
          {
            type: "card.decline",
            payload: { residentId: "human-1", cardId: "card-1", reason: null },
          },
          2,
        ),
        T0,
      ),
      "CARD_NOT_FOUND",
    );
  });
});

describe("runtime.run_due_effects", () => {
  function runDue(limit: number, sequence: number): AppliedCommandInput {
    return input({ type: "runtime.run_due_effects", payload: { limit } }, sequence);
  }

  it("expires due cards, resolves due consequences, and refreshes Focus once across days", () => {
    let state = withCard(); // card-1, expires T0+48h
    state = mustApply(
      state,
      input(
        {
          type: "card.commit_choice",
          payload: {
            residentId: "human-1",
            cardId: "card-1",
            optionId: "opt-share",
            expectedStateVersion: null,
          },
        },
        3,
      ),
      T0,
    ); // consequence due T0+60m
    state = mustApply(state, input(assignCommand("card-2", { expiresAfterHours: 1 }), 4), T0);

    // Three days later: expiry + consequence + exactly one Focus refresh.
    const result = applyCommand(state, runDue(10, 5), "2026-09-04T08:00:00.000Z");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events.map((e) => e.eventType)).toEqual([
      "CardExpired",
      "ArchiveEntryRecorded",
      "ConsequenceResolved",
      "ArchiveEntryRecorded",
      "FocusRefreshed",
    ]);
    const resident = result.state.residents["human-1"];
    expect(resident?.focus).toBe(FOCUS_DAILY); // spent 1, refreshed back to 3, once
    expect(resident?.lastFocusRefreshDayKey).toBe("2026-09-04");
    expect(resident?.activeCards).toHaveLength(0);
    expect(resident?.pendingConsequences).toHaveLength(0);
  });

  it("does not refresh Focus twice on the same day", () => {
    const state = provisionedState();
    const first = applyCommand(state, runDue(10, 2), "2026-09-02T07:00:00.000Z");
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.events.map((e) => e.eventType)).toEqual(["FocusRefreshed"]);
    const second = applyCommand(first.state, runDue(10, 3), "2026-09-02T09:00:00.000Z");
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.events).toHaveLength(0);
  });

  it("bounds work by limit and leaves the remainder durable", () => {
    let state = provisionedState();
    state = mustApply(state, input(assignCommand("c1", { expiresAfterHours: 1 }), 2), T0);
    state = mustApply(state, input(assignCommand("c2", { expiresAfterHours: 1 }), 3), T0);
    state = mustApply(state, input(assignCommand("c3", { expiresAfterHours: 1 }), 4), T0);

    const bounded = applyCommand(state, runDue(2, 5), "2026-09-01T10:00:00.000Z");
    expect(bounded.ok).toBe(true);
    if (!bounded.ok) return;
    expect(bounded.events.filter((e) => e.eventType === "CardExpired")).toHaveLength(2);
    expect(bounded.state.residents["human-1"]?.activeCards).toHaveLength(1);

    const rest = applyCommand(bounded.state, runDue(10, 6), "2026-09-01T10:00:00.000Z");
    expect(rest.ok).toBe(true);
    if (!rest.ok) return;
    expect(rest.events.filter((e) => e.eventType === "CardExpired")).toHaveLength(1);
    expect(rest.state.residents["human-1"]?.activeCards).toHaveLength(0);
  });
});

describe("living city construction", () => {
  it("upgrades a visible building through the deterministic command path", () => {
    const state = provisionedState();
    const result = applyCommand(
      state,
      input(
        {
          type: "building.upgrade",
          payload: { residentId: "human-1", buildingId: "beacon-square", expectedLevel: 1 },
        },
        2,
      ),
      T0,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.city.buildings["beacon-square"]?.level).toBe(2);
    expect(result.state.city.civicCapacity).toBe(27);
    expect(result.state.city.prosperity).toBe(24);
    expect(result.events.map((event) => event.eventType)).toEqual([
      "BuildingUpgraded",
      "ArchiveEntryRecorded",
    ]);
    expect(state.city.buildings["beacon-square"]?.level).toBe(1);
  });

  it("rejects stale building levels and maximum-level upgrades", () => {
    const state = provisionedState();
    expectRejection(
      applyCommand(
        state,
        input(
          {
            type: "building.upgrade",
            payload: { residentId: "human-1", buildingId: "beacon-square", expectedLevel: 2 },
          },
          2,
        ),
        T0,
      ),
      "BUILDING_LEVEL_CONFLICT",
    );
    const maxed = structuredClone(state);
    maxed.city.buildings["beacon-square"]!.level = 3;
    expectRejection(
      applyCommand(
        maxed,
        input(
          {
            type: "building.upgrade",
            payload: { residentId: "human-1", buildingId: "beacon-square", expectedLevel: 3 },
          },
          2,
        ),
        T0,
      ),
      "BUILDING_MAX_LEVEL",
    );
  });

  it("opens adjacent land and reveals its planned building", () => {
    const state = provisionedState();
    const result = applyCommand(
      state,
      input(
        {
          type: "district.expand",
          payload: { residentId: "human-1", parcelId: "east-harbor" },
        },
        2,
      ),
      T0,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.city.parcels["east-harbor"]?.unlocked).toBe(true);
    expect(result.state.city.population).toBe(30);
    expect(result.state.city.civicCapacity).toBe(23);
    expect(result.events[0]).toMatchObject({
      eventType: "DistrictExpanded",
      revealedBuildingIds: ["transit"],
    });
  });

  it("preserves scarcity and refuses construction the city cannot support", () => {
    const state = provisionedState();
    state.city.civicCapacity = 0;
    expectRejection(
      applyCommand(
        state,
        input(
          {
            type: "district.expand",
            payload: { residentId: "human-1", parcelId: "north-gardens" },
          },
          2,
        ),
        T0,
      ),
      "INSUFFICIENT_CIVIC_CAPACITY",
    );
  });
});

describe("determinism and purity", () => {
  it("rejects malformed payloads with INVALID_PAYLOAD", () => {
    const bad = {
      commandId: "cmd-x",
      sequence: 1,
      command: { type: "card.commit_choice", payload: { residentId: "human-1" } },
    } as unknown as AppliedCommandInput;
    expectRejection(applyCommand(emptyState(), bad, T0), "INVALID_PAYLOAD");
  });

  it("does not mutate the input state", () => {
    const state = provisionedState();
    const frozen = JSON.stringify(state);
    applyCommand(state, input(assignCommand(), 2), T0);
    expect(JSON.stringify(state)).toBe(frozen);
  });

  it("produces identical output for identical input", () => {
    const state = withCard();
    const cmd = input(
      {
        type: "card.commit_choice",
        payload: {
          residentId: "human-1",
          cardId: "card-1",
          optionId: "opt-share",
          expectedStateVersion: null,
        },
      },
      3,
    );
    const a = applyCommand(state, cmd, T0);
    const b = applyCommand(state, cmd, T0);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
