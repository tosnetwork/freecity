import {
  districtCommandSchema,
  districtStateSchema,
  type DistrictState,
} from "@freecity/contracts";
import { applyCommand } from "@freecity/district-rules";

import { withTransaction, type Pool, type PoolClient } from "./db.js";
import { syncScheduledEffects } from "./schedule.js";
import { maybeAutoSnapshot } from "./snapshots.js";

export interface ProcessOptions {
  /** Explicit step time recorded for every command applied in this run. */
  stepTime: string;
  /** Max received commands consumed in one transaction. */
  batchLimit?: number;
  /** Auto-snapshot when this many events accumulated since the last snapshot. */
  snapshotEveryEvents?: number;
  /** Test hook: runs inside the transaction just before COMMIT. */
  onBeforeCommit?: (client: PoolClient) => Promise<void>;
}

export interface ProcessSummary {
  processed: number;
  applied: number;
  rejected: number;
  stateVersion: number;
  lastSequence: number;
}

interface CommandRow {
  command_id: string;
  command_type: string;
  payload: unknown;
}

/**
 * Consumes received commands for one district partition in their committed
 * order and advances state through the pure ruleset — all in one transaction
 * (Runtime §4.2). The row lock on district_runtime is the write lease: two
 * workers can race, one blocks, and a crash before COMMIT releases everything
 * untouched.
 */
export async function processDistrict(
  pool: Pool,
  districtId: string,
  seasonId: string,
  opts: ProcessOptions,
): Promise<ProcessSummary> {
  const batchLimit = opts.batchLimit ?? 50;
  const summary = await withTransaction(pool, async (client) => {
    const runtimeResult = await client.query(
      `SELECT state, state_version, last_sequence
         FROM district.district_runtime
        WHERE district_id = $1 AND season_id = $2
        FOR UPDATE`,
      [districtId, seasonId],
    );
    const runtimeRow = runtimeResult.rows[0];
    if (!runtimeRow) {
      throw new Error(`district ${districtId}/${seasonId} is not initialized`);
    }
    let state = districtStateSchema.parse(runtimeRow.state);
    let lastSequence = Number(runtimeRow.last_sequence);

    const commandsResult = await client.query(
      `SELECT command_id, command_type, payload
         FROM district.district_command
        WHERE district_id = $1 AND season_id = $2 AND status = 'received'
        ORDER BY received_at, command_id
        LIMIT $3`,
      [districtId, seasonId, batchLimit],
    );
    const rows = commandsResult.rows as CommandRow[];

    let applied = 0;
    let rejected = 0;
    for (const row of rows) {
      const command = districtCommandSchema.parse({ type: row.command_type, payload: row.payload });
      const candidateSequence = lastSequence + 1;
      const result = applyCommand(
        state,
        { commandId: row.command_id, sequence: candidateSequence, command },
        opts.stepTime,
      );

      if (result.ok) {
        state = result.state;
        lastSequence = candidateSequence;
        applied += 1;
        for (const [eventSeq, event] of result.events.entries()) {
          await client.query(
            `INSERT INTO district.district_event
               (district_id, season_id, district_sequence, event_seq, command_id, event_type, payload)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              districtId,
              seasonId,
              candidateSequence,
              eventSeq,
              row.command_id,
              event.eventType,
              event,
            ],
          );
          await client.query(
            `INSERT INTO district.outbox (district_id, season_id, district_sequence, event_seq)
             VALUES ($1, $2, $3, $4)`,
            [districtId, seasonId, candidateSequence, eventSeq],
          );
        }
        await client.query(
          `UPDATE district.district_command
              SET status = 'applied', district_sequence = $2, step_time = $3,
                  result = $4, applied_at = now()
            WHERE command_id = $1`,
          [
            row.command_id,
            candidateSequence,
            opts.stepTime,
            { ok: true, districtSequence: candidateSequence, stateVersion: state.stateVersion },
          ],
        );
      } else {
        rejected += 1;
        await client.query(
          `UPDATE district.district_command
              SET status = 'rejected', step_time = $2, result = $3, applied_at = now()
            WHERE command_id = $1`,
          [
            row.command_id,
            opts.stepTime,
            { ok: false, code: result.rejection.code, message: result.rejection.message },
          ],
        );
      }
    }

    if (rows.length > 0) {
      await client.query(
        `UPDATE district.district_runtime
            SET state = $3, state_version = $4, last_sequence = $5, updated_at = now()
          WHERE district_id = $1 AND season_id = $2`,
        [districtId, seasonId, state, state.stateVersion, lastSequence],
      );
      await syncScheduledEffects(client, state);
    }

    if (opts.onBeforeCommit) {
      await opts.onBeforeCommit(client);
    }

    return {
      processed: rows.length,
      applied,
      rejected,
      stateVersion: state.stateVersion,
      lastSequence,
    } satisfies ProcessSummary;
  });

  await maybeAutoSnapshot(pool, districtId, seasonId, opts.snapshotEveryEvents ?? 50);
  return summary;
}

/** Deterministic serialization gate for state read back from jsonb. */
export function parseState(raw: unknown): DistrictState {
  return districtStateSchema.parse(raw);
}
