import { describe, expect, it } from "vitest";

import {
  createInitialCityState,
  createInitialSocialWorldState,
  type AppliedCommandInput,
  type DistrictCommand,
  type DistrictState,
} from "@freecity/contracts";

import { applyCommand } from "./apply.js";

const T0 = "2026-09-01T08:00:00.000Z";

function genesis(): DistrictState {
  return {
    districtId: "district-zero",
    seasonId: "season-r2-test",
    stateVersion: 0,
    sequence: 0,
    stepTime: T0,
    rulesetVersion: "district-zero-r2",
    rngSeed: "world-test",
    residents: {},
    city: createInitialCityState(),
    world: createInitialSocialWorldState(),
  };
}

function step(state: DistrictState, command: DistrictCommand, stepTime = T0): DistrictState {
  const input: AppliedCommandInput = {
    commandId: `command-${state.sequence + 1}`,
    sequence: state.sequence + 1,
    command,
  };
  const result = applyCommand(state, input, stepTime);
  if (!result.ok) throw new Error(`${result.rejection.code}: ${result.rejection.message}`);
  return result.state;
}

function provision(state: DistrictState, residentId: string, kind: "human" | "ai" = "human") {
  return step(state, {
    type: "season.provision_resident",
    payload: {
      residentId,
      kind,
      role: kind === "human" ? "builder" : "mediator",
      displayName: residentId,
      sponsoredAiResidentId: null,
    },
  });
}

describe("City World R2 social rules", () => {
  it("requires consent, supports repair, and records each Beacon source once", () => {
    let state = provision(provision(genesis(), "human-a"), "human-b");
    state = step(state, {
      type: "social.invite",
      payload: {
        residentId: "human-a",
        relationshipId: "relationship-ab",
        addresseeId: "human-b",
        note: "Build together",
      },
    });
    expect(state.world.relationships["relationship-ab"]?.status).toBe("pending");
    state = step(state, {
      type: "social.respond",
      payload: { residentId: "human-b", relationshipId: "relationship-ab", response: "accept" },
    });
    expect(state.world.relationships["relationship-ab"]?.closeness).toBe(25);
    expect(state.world.beacon.totals.relationship).toBe(1);
    state = step(state, {
      type: "social.repair",
      payload: { residentId: "human-a", relationshipId: "relationship-ab", note: "Listened" },
    });
    expect(state.world.relationships["relationship-ab"]?.repairCount).toBe(1);
    expect(state.world.beacon.totals.relationship).toBe(2);
  });

  it("forms consent-based Circles and caps membership at six", () => {
    let state = genesis();
    for (let index = 1; index <= 7; index += 1) state = provision(state, `human-${index}`);
    state = step(state, {
      type: "circle.create",
      payload: {
        residentId: "human-1",
        circleId: "circle-1",
        name: "Signal Keepers",
        purpose: "Repair trust",
      },
    });
    for (let index = 2; index <= 6; index += 1) {
      state = step(state, {
        type: "circle.invite",
        payload: { residentId: "human-1", circleId: "circle-1", addresseeId: `human-${index}` },
      });
      state = step(state, {
        type: "circle.respond",
        payload: { residentId: `human-${index}`, circleId: "circle-1", response: "accept" },
      });
    }
    expect(state.world.circles["circle-1"]?.memberIds).toHaveLength(6);
    const result = applyCommand(
      state,
      {
        commandId: "circle-full",
        sequence: state.sequence + 1,
        command: {
          type: "circle.invite",
          payload: { residentId: "human-1", circleId: "circle-1", addresseeId: "human-7" },
        },
      },
      T0,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.rejection.code).toBe("CIRCLE_FULL");
  });
});

describe("City World R2 work, market, and civic rules", () => {
  it("reviews a project contribution into the Beacon and blocks fake payment", () => {
    let state = provision(provision(genesis(), "human-maker"), "ai-district-orin", "ai");
    state = step(state, {
      type: "project.join",
      payload: { residentId: "human-maker", projectId: "east-relay" },
    });
    state = step(state, {
      type: "project.submit_contribution",
      payload: {
        residentId: "human-maker",
        projectId: "east-relay",
        contributionId: "repair-map",
        taskId: null,
        kind: "work",
        summary: "Mapped the broken junction",
        artifactUrl: null,
      },
    });
    state = step(state, {
      type: "project.review_contribution",
      payload: {
        residentId: "ai-district-orin",
        projectId: "east-relay",
        contributionId: "repair-map",
        decision: "approve",
        note: "Verified at the relay",
      },
    });
    expect(state.world.beacon.totals.project).toBe(1);
    expect(state.world.projects["east-relay"]?.contributions[0]?.status).toBe("approved");

    const payment = applyCommand(
      state,
      {
        commandId: "paid-need",
        sequence: state.sequence + 1,
        command: {
          type: "market.create_need",
          payload: {
            residentId: "human-maker",
            needId: "paid",
            title: "Paid task",
            description: "Requires settlement",
            mode: "payment",
          },
        },
      },
      T0,
    );
    expect(payment.ok).toBe(false);
    if (!payment.ok) expect(payment.rejection.code).toBe("MARKET_PAYMENT_UNAVAILABLE");

    state = step(state, {
      type: "market.create_need",
      payload: {
        residentId: "human-maker",
        needId: "maker-need",
        title: "Map the harbor",
        description: "A collaboration request",
        mode: "collaboration",
      },
    });
    const selfProposal = applyCommand(
      state,
      {
        commandId: "self-proposal",
        sequence: state.sequence + 1,
        command: {
          type: "market.submit_proposal",
          payload: {
            residentId: "human-maker",
            proposalId: "proposal-self",
            needId: "maker-need",
            summary: "I will answer my own request",
            amountMinor: null,
            assetCode: null,
          },
        },
      },
      T0,
    );
    expect(selfProposal.ok).toBe(false);
    if (!selfProposal.ok) expect(selfProposal.rejection.code).toBe("SELF_TARGET");
  });

  it("opens only for three humans, enforces one vote, and finalizes deterministically", () => {
    let state = provision(provision(provision(genesis(), "human-a"), "human-b"), "human-c");
    expect(state.world.civic.election.phase).toBe("open");
    state.world.beacon.contributions["project:eligible"] = {
      beaconContributionId: "project:eligible",
      sourceId: "eligible",
      residentId: "human-a",
      path: "project",
      summary: "Eligible work",
      createdAt: T0,
    };
    state.world.beacon.totals.project = 1;
    state = step(state, {
      type: "civic.declare_candidacy",
      payload: { residentId: "human-a", statement: "Keep power bounded" },
    });
    for (const voter of ["human-a", "human-b", "human-c"]) {
      state = step(state, {
        type: "civic.cast_vote",
        payload: { residentId: voter, candidateResidentId: "human-a" },
      });
    }
    const duplicate = applyCommand(
      state,
      {
        commandId: "duplicate-vote",
        sequence: state.sequence + 1,
        command: {
          type: "civic.cast_vote",
          payload: { residentId: "human-a", candidateResidentId: "human-a" },
        },
      },
      T0,
    );
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.rejection.code).toBe("ALREADY_VOTED");
    state = step(
      state,
      { type: "runtime.run_due_effects", payload: { limit: 100 } },
      "2026-09-04T08:00:00.000Z",
    );
    expect(state.world.civic.election.phase).toBe("challenge");
    state = step(
      state,
      { type: "runtime.run_due_effects", payload: { limit: 100 } },
      "2026-09-05T08:00:00.000Z",
    );
    expect(state.world.civic.election.resultStatus).toBe("elected");
    expect(state.world.civic.office.holderResidentId).toBe("human-a");
  });
});
