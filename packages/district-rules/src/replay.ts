import {
  computeChecksum,
  districtStateSchema,
  type AppliedCommandInput,
  type DistrictEvent,
  type DistrictState,
} from "@freecity/contracts";

import { applyCommand } from "./apply.js";

/**
 * Replay fixtures prove the release property (Runtime §6): the same initial
 * state, ordered inputs, ruleset, and explicit step times must reproduce the
 * same final checksum and event stream. Expected values are generated from
 * the implementation (UPDATE_FIXTURES path in the test runner), never
 * transcribed by hand.
 */

export interface FixtureStep {
  stepTime: string;
  input: AppliedCommandInput;
}

export interface StepOutcomeRecord {
  sequence: number;
  ok: boolean;
  rejectionCode: string | null;
  events: DistrictEvent[];
}

export interface ReplayFixture {
  name: string;
  initialState: DistrictState;
  steps: FixtureStep[];
  expected?: {
    finalChecksum: string;
    outcomes: StepOutcomeRecord[];
  };
}

export interface ReplayRun {
  finalState: DistrictState;
  finalChecksum: string;
  outcomes: StepOutcomeRecord[];
}

export async function runFixture(fixture: ReplayFixture): Promise<ReplayRun> {
  let state = districtStateSchema.parse(fixture.initialState);
  const outcomes: StepOutcomeRecord[] = [];
  for (const step of fixture.steps) {
    const result = applyCommand(state, step.input, step.stepTime);
    if (result.ok) {
      state = result.state;
      outcomes.push({
        sequence: step.input.sequence,
        ok: true,
        rejectionCode: null,
        events: result.events,
      });
    } else {
      outcomes.push({
        sequence: step.input.sequence,
        ok: false,
        rejectionCode: result.rejection.code,
        events: [],
      });
    }
  }
  return { finalState: state, finalChecksum: await computeChecksum(state), outcomes };
}
