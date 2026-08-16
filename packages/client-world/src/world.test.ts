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
