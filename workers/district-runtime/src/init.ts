import {
  computeChecksum,
  createInitialCityState,
  createInitialSocialWorldState,
  type DistrictState,
} from "@freecity/contracts";
import { RULESET_VERSION } from "@freecity/district-rules";

import { withTransaction, type Pool } from "./db.js";

export interface InitDistrictOptions {
  districtId: string;
  seasonId: string;
  rngSeed: string;
  initialStepTime: string;
}

/**
 * Creates the district partition with its genesis state and genesis snapshot.
 * Idempotent: initializing an existing partition is a no-op returning the
 * stored state.
 */
export async function initDistrict(pool: Pool, opts: InitDistrictOptions): Promise<DistrictState> {
  return withTransaction(pool, async (client) => {
    const existing = await client.query(
      `SELECT state FROM district.district_runtime WHERE district_id = $1 AND season_id = $2`,
      [opts.districtId, opts.seasonId],
    );
    if (existing.rows[0]) {
      return existing.rows[0].state as DistrictState;
    }

    const genesis: DistrictState = {
      districtId: opts.districtId,
      seasonId: opts.seasonId,
      stateVersion: 0,
      sequence: 0,
      stepTime: opts.initialStepTime,
      rulesetVersion: RULESET_VERSION,
      rngSeed: opts.rngSeed,
      residents: {},
      city: createInitialCityState(),
      world: createInitialSocialWorldState(),
    };
    await client.query(
      `INSERT INTO district.district_runtime
         (district_id, season_id, state, state_version, last_sequence, ruleset_version)
       VALUES ($1, $2, $3, 0, 0, $4)`,
      [opts.districtId, opts.seasonId, genesis, RULESET_VERSION],
    );
    await client.query(
      `INSERT INTO district.district_snapshot
         (district_id, season_id, state_version, last_sequence, ruleset_version, checksum, reason, state)
       VALUES ($1, $2, 0, 0, $3, $4, 'genesis', $5)`,
      [opts.districtId, opts.seasonId, RULESET_VERSION, await computeChecksum(genesis), genesis],
    );
    return genesis;
  });
}
