import { type DistrictState } from "@freecity/contracts";
import { addHours, dayKey } from "@freecity/district-rules";

import type { PoolClient } from "./db.js";

/**
 * Scheduled-effect rows are a rebuildable wake-up index derived from the
 * committed state: one row per pending consequence, per active card expiry,
 * and one for the next daily Focus rollover. They tell the worker when to
 * wake an idle district; they are never a second gameplay authority.
 */
export async function syncScheduledEffects(
  client: PoolClient,
  state: DistrictState,
): Promise<void> {
  await client.query(
    `DELETE FROM district.scheduled_effect WHERE district_id = $1 AND season_id = $2`,
    [state.districtId, state.seasonId],
  );

  const rows: { key: string; type: string; dueAt: string }[] = [];
  for (const residentId of Object.keys(state.residents).sort()) {
    const resident = state.residents[residentId];
    if (!resident) continue;
    for (const card of resident.activeCards) {
      rows.push({ key: `expiry:${card.cardId}`, type: "card_expiry", dueAt: card.expiresAt });
    }
    for (const pending of resident.pendingConsequences) {
      rows.push({
        key: `consequence:${pending.consequenceId}`,
        type: "consequence_due",
        dueAt: pending.dueAt,
      });
    }
  }
  if (Object.keys(state.residents).length > 0) {
    // Next UTC midnight after the last committed step time.
    const nextRollover = `${dayKey(addHours(state.stepTime, 24))}T00:00:00.000Z`;
    rows.push({ key: "focus_rollover", type: "focus_rollover", dueAt: nextRollover });
  }
  const election = state.world.civic.election;
  if (election.phase === "open" && election.closesAt) {
    rows.push({
      key: `civic-close:${election.electionId}`,
      type: "civic_vote_close",
      dueAt: election.closesAt,
    });
  }
  if (election.phase === "challenge" && election.challengeEndsAt) {
    rows.push({
      key: `civic-finalize:${election.electionId}`,
      type: "civic_challenge_close",
      dueAt: election.challengeEndsAt,
    });
  }

  for (const row of rows) {
    await client.query(
      `INSERT INTO district.scheduled_effect (district_id, season_id, effect_key, effect_type, due_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [state.districtId, state.seasonId, row.key, row.type, row.dueAt],
    );
  }
}

export interface DueDistrict {
  districtId: string;
  seasonId: string;
}

/** Districts that have work: a received command or a due scheduled effect. */
export async function findDueDistricts(
  client: PoolClient,
  now: string,
  limit = 20,
): Promise<DueDistrict[]> {
  const result = await client.query(
    `SELECT DISTINCT district_id, season_id FROM (
       SELECT district_id, season_id
         FROM district.district_command WHERE status = 'received'
       UNION
       SELECT district_id, season_id
         FROM district.scheduled_effect WHERE due_at <= $1
     ) due
     LIMIT $2`,
    [now, limit],
  );
  return result.rows.map((row) => ({
    districtId: row.district_id as string,
    seasonId: row.season_id as string,
  }));
}

/** True when the district has a scheduled effect due at or before `now`. */
export async function hasDueEffects(
  client: PoolClient,
  districtId: string,
  seasonId: string,
  now: string,
): Promise<boolean> {
  const result = await client.query(
    `SELECT 1 FROM district.scheduled_effect
      WHERE district_id = $1 AND season_id = $2 AND due_at <= $3 LIMIT 1`,
    [districtId, seasonId, now],
  );
  return result.rows.length > 0;
}
