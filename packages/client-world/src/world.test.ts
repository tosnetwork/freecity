import { describe, expect, it } from "vitest";

import type { DistrictEvent } from "@freecity/contracts";

import {
  ACTIVITY_LIMIT,
  applyEventView,
  createWorldState,
  summarizeEvent,
  type CommittedEventView,
  type WorldState,
} from "./world.js";

const provisionAda: DistrictEvent = {
  eventType: "ResidentProvisioned",
  residentId: "human-1",
  kind: "human",
  role: "builder",
  displayName: "Ada",
  sponsoredAiResidentId: "ai-1",
  initialFocus: 3,
};

function view(sequence: number, eventSeq: number, event: DistrictEvent): CommittedEventView {
  return { sequence, eventSeq, event };
}

function seeded(): WorldState {
  return applyEventView(createWorldState(), view(1, 0, provisionAda));
}

describe("applyEventView", () => {
  it("adds residents and tracks focus and card counts through the slice", () => {
    let state = seeded();
    state = applyEventView(
      state,
      view(2, 0, {
        eventType: "CardAssigned",
        residentId: "human-1",
        cardId: "c1",
        templateId: "tpl",
        expiresAt: "2026-09-03T08:00:00.000Z",
      }),
    );
    expect(state.residents["human-1"]?.activeCardCount).toBe(1);

    state = applyEventView(
      state,
      view(3, 0, {
        eventType: "FocusSpent",
        residentId: "human-1",
        cardId: "c1",
        optionId: "o1",
        amount: 1,
        remaining: 2,
      }),
    );
    state = applyEventView(
      state,
      view(3, 1, {
        eventType: "ChoiceCommitted",
        residentId: "human-1",
        cardId: "c1",
        optionId: "o1",
      }),
    );
    expect(state.residents["human-1"]?.focus).toBe(2);
    expect(state.residents["human-1"]?.activeCardCount).toBe(0);

    state = applyEventView(
      state,
      view(4, 0, {
        eventType: "FocusRefreshed",
        residentId: "human-1",
        focus: 3,
        dayKey: "2026-09-02",
      }),
    );
    expect(state.residents["human-1"]?.focus).toBe(3);
    expect(state.activity.map((a) => a.id)).toEqual(["1:0", "2:0", "3:0", "3:1", "4:0"]);
  });

  it("ignores replayed and out-of-order events at or before the cursor", () => {
    const state = seeded();
    const replayed = applyEventView(state, view(1, 0, provisionAda));
    expect(replayed).toBe(state); // identical reference, nothing appended

    let advanced = applyEventView(
      state,
      view(2, 1, {
        eventType: "ChoiceCommitted",
        residentId: "human-1",
        cardId: "c",
        optionId: "o",
      }),
    );
    advanced = applyEventView(
      advanced,
      view(2, 0, { eventType: "CardDeclined", residentId: "human-1", cardId: "c", reason: null }),
    );
    expect(advanced.activity).toHaveLength(2); // the older (2,0) frame was dropped
  });

  it("does not mutate the input state", () => {
    const state = seeded();
    const frozen = JSON.stringify(state);
    applyEventView(
      state,
      view(2, 0, {
        eventType: "FocusRefreshed",
        residentId: "human-1",
        focus: 3,
        dayKey: "2026-09-02",
      }),
    );
    expect(JSON.stringify(state)).toBe(frozen);
  });

  it("bounds the activity list", () => {
    let state = seeded();
    for (let i = 2; i < ACTIVITY_LIMIT + 50; i += 1) {
      state = applyEventView(
        state,
        view(i, 0, {
          eventType: "ChoiceCommitted",
          residentId: "human-1",
          cardId: `c${i}`,
          optionId: "o",
        }),
      );
    }
    expect(state.activity).toHaveLength(ACTIVITY_LIMIT);
    expect(state.activity[state.activity.length - 1]?.sequence).toBe(ACTIVITY_LIMIT + 49);
  });

  it("rebuilds social, project and Beacon state only from committed events", () => {
    let state = seeded();
    state = applyEventView(
      state,
      view(2, 0, {
        eventType: "RelationshipInvited",
        residentId: "human-1",
        relationship: {
          relationshipId: "rel-1",
          requesterId: "human-1",
          addresseeId: "ai-1",
          status: "pending",
          closeness: 0,
          repairCount: 0,
          note: "Create together",
          createdAt: "2026-09-01T08:00:00.000Z",
          updatedAt: "2026-09-01T08:00:00.000Z",
        },
      }),
    );
    expect(state.world.relationships["rel-1"]?.status).toBe("pending");
    state = applyEventView(
      state,
      view(3, 0, {
        eventType: "ProjectJoined",
        residentId: "human-1",
        projectId: "east-relay",
      }),
    );
    expect(state.world.projects["east-relay"]?.memberIds).toContain("human-1");
    state = applyEventView(
      state,
      view(4, 0, {
        eventType: "BeaconContributionRecorded",
        residentId: "human-1",
        contribution: {
          beaconContributionId: "project:repair-map",
          sourceId: "repair-map",
          residentId: "human-1",
          path: "project",
          summary: "Mapped the relay",
          createdAt: "2026-09-01T09:00:00.000Z",
        },
        level: 1,
      }),
    );
    expect(state.world.beacon.totals.project).toBe(1);
    expect(state.activity.at(-1)?.summary).toBe("Beacon: Mapped the relay");
  });
});

describe("summarizeCommittedViews", () => {
  it("resolves names via seeds when provisioning events are outside the list", async () => {
    const { summarizeCommittedViews } = await import("./world.js");
    const items = summarizeCommittedViews(
      [
        view(7, 0, {
          eventType: "FocusSpent",
          residentId: "human-c544-uuid",
          cardId: "c",
          optionId: "o",
          amount: 1,
          remaining: 2,
        }),
        view(7, 1, {
          eventType: "ChoiceCommitted",
          residentId: "human-c544-uuid",
          cardId: "c",
          optionId: "o",
        }),
      ],
      [{ residentId: "human-c544-uuid", displayName: "Ada", kind: "human", role: "builder" }],
    );
    expect(items.map((i) => i.summary)).toEqual([
      "Ada spent 1 Focus (2 remaining)",
      "Ada made a choice",
    ]);
    for (const item of items) {
      expect(item.summary).not.toContain("human-c544-uuid"); // no raw resident ids
    }
  });

  it("reduces in order so in-list provisioning still names later events", async () => {
    const { summarizeCommittedViews } = await import("./world.js");
    const items = summarizeCommittedViews([
      view(1, 0, provisionAda),
      view(2, 0, {
        eventType: "FocusSpent",
        residentId: "human-1",
        cardId: "c",
        optionId: "o",
        amount: 1,
        remaining: 2,
      }),
    ]);
    expect(items[1]?.summary).toBe("Ada spent 1 Focus (2 remaining)");
  });
});

describe("living city event projection", () => {
  it("rebuilds upgrades and expansions only from committed events", () => {
    let state = seeded();
    const beacon = { ...state.city.buildings["beacon-square"]!, level: 2 };
    state = applyEventView(
      state,
      view(2, 0, {
        eventType: "BuildingUpgraded",
        residentId: "human-1",
        building: beacon,
        fromLevel: 1,
        capacitySpent: 3,
        prosperityGained: 6,
      }),
    );
    expect(state.city.buildings["beacon-square"]?.level).toBe(2);
    expect(state.city.civicCapacity).toBe(27);
    expect(state.activity.at(-1)?.summary).toContain("Beacon Tower");

    state = applyEventView(
      state,
      view(3, 0, {
        eventType: "DistrictExpanded",
        residentId: "human-1",
        parcelId: "east-harbor",
        parcelName: "East Harbor",
        revealedBuildingIds: ["transit"],
        capacitySpent: 7,
        populationGained: 6,
        prosperityGained: 4,
      }),
    );
    expect(state.city.parcels["east-harbor"]?.unlocked).toBe(true);
    expect(state.city.population).toBe(30);
    expect(state.activity.at(-1)?.summary).toContain("East Harbor");
  });
});

describe("summarizeEvent", () => {
  it("resolves display names and produces accessible text", () => {
    const state = seeded();
    expect(summarizeEvent(state, provisionAda)).toBe("Ada joined District Zero as a builder");
    expect(
      summarizeEvent(state, {
        eventType: "FocusSpent",
        residentId: "human-1",
        cardId: "c",
        optionId: "o",
        amount: 1,
        remaining: 2,
      }),
    ).toBe("Ada spent 1 Focus (2 remaining)");
    expect(
      summarizeEvent(state, {
        eventType: "ConsequenceResolved",
        residentId: "human-1",
        consequenceId: "x",
        cardId: "c",
        optionId: "o",
        consequenceText: "The Studio Circle replied.",
      }),
    ).toBe("The Studio Circle replied.");
    expect(
      summarizeEvent(state, {
        eventType: "FocusSpent",
        residentId: "unknown-9",
        cardId: "c",
        optionId: "o",
        amount: 1,
        remaining: 2,
      }),
    ).toContain("unknown-9"); // unknown residents fall back to their id
  });
});
