import { computeChecksum, districtCommandSchema, districtStateSchema } from "@freecity/contracts";
import { applyCommand } from "@freecity/district-rules";

import { withTransaction, type Pool } from "./db.js";
import { syncScheduledEffects } from "./schedule.js";

export interface SnapshotRecord {
  snapshotId: number;
  stateVersion: number;
  lastSequence: number;
  checksum: string;
  reason: string;
}

/** Writes a checksummed snapshot of the current committed state. */
export async function createSnapshot(
  pool: Pool,
  districtId: string,
  seasonId: string,
  reason: string,
): Promise<SnapshotRecord> {
  return withTransaction(pool, async (client) => {
    const runtime = await client.query(
      `SELECT state, state_version, last_sequence, ruleset_version
         FROM district.district_runtime
        WHERE district_id = $1 AND season_id = $2
        FOR UPDATE`,
      [districtId, seasonId],
    );
    const row = runtime.rows[0];
    if (!row) throw new Error(`district ${districtId}/${seasonId} is not initialized`);
    const state = districtStateSchema.parse(row.state);
    const checksum = await computeChecksum(state);
    const inserted = await client.query(
      `INSERT INTO district.district_snapshot
         (district_id, season_id, state_version, last_sequence, ruleset_version, checksum, reason, state)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING snapshot_id`,
      [
        districtId,
        seasonId,
        Number(row.state_version),
        Number(row.last_sequence),
        row.ruleset_version,
        checksum,
        reason,
        state,
      ],
    );
    return {
      snapshotId: Number(inserted.rows[0].snapshot_id),
      stateVersion: Number(row.state_version),
      lastSequence: Number(row.last_sequence),
      checksum,
      reason,
    };
  });
}

/** Auto-snapshot when enough events accumulated since the last snapshot. */
export async function maybeAutoSnapshot(
  pool: Pool,
  districtId: string,
  seasonId: string,
  everyEvents: number,
): Promise<SnapshotRecord | null> {
  const counts = await pool.query(
    `SELECT
       (SELECT COALESCE(MAX(last_sequence), 0) FROM district.district_snapshot
         WHERE district_id = $1 AND season_id = $2) AS snap_seq,
       (SELECT COUNT(*) FROM district.district_event
         WHERE district_id = $1 AND season_id = $2
           AND district_sequence > (SELECT COALESCE(MAX(last_sequence), 0)
                                      FROM district.district_snapshot
                                     WHERE district_id = $1 AND season_id = $2)) AS pending_events`,
    [districtId, seasonId],
  );
  const pending = Number(counts.rows[0]?.pending_events ?? 0);
  if (pending < everyEvents) return null;
  return createSnapshot(pool, districtId, seasonId, "auto");
}

/**
 * Rebuilds the committed runtime state from a verified snapshot plus the
 * journaled applied commands after it — the recovery path for a corrupted or
 * lost runtime row. History is never rewritten: the journal and event log
 * stay untouched, and the rebuilt state lands exactly where the journal
 * ends, so sequences are never reused.
 */
export async function restoreSnapshot(
  pool: Pool,
  districtId: string,
  seasonId: string,
  snapshotId: number,
): Promise<SnapshotRecord> {
  return withTransaction(pool, async (client) => {
    // Lock the runtime row first so no step interleaves with the rebuild.
    await client.query(
      `SELECT 1 FROM district.district_runtime
        WHERE district_id = $1 AND season_id = $2 FOR UPDATE`,
      [districtId, seasonId],
    );
    const snapshot = await client.query(
      `SELECT snapshot_id, state, last_sequence, ruleset_version, checksum, reason
         FROM district.district_snapshot
        WHERE district_id = $1 AND season_id = $2 AND snapshot_id = $3`,
      [districtId, seasonId, snapshotId],
    );
    const row = snapshot.rows[0];
    if (!row) throw new Error(`snapshot ${snapshotId} not found for ${districtId}/${seasonId}`);
    let state = districtStateSchema.parse(row.state);
    const checksum = await computeChecksum(state);
    if (checksum !== row.checksum) {
      throw new Error(
        `snapshot ${snapshotId} integrity failure: stored ${row.checksum}, recomputed ${checksum}`,
      );
    }

    const commands = await client.query(
      `SELECT command_id, command_type, payload, district_sequence, step_time
         FROM district.district_command
        WHERE district_id = $1 AND season_id = $2 AND status = 'applied'
          AND district_sequence > $3
        ORDER BY district_sequence ASC`,
      [districtId, seasonId, Number(row.last_sequence)],
    );
    let lastSequence = Number(row.last_sequence);
    for (const commandRow of commands.rows) {
      const command = districtCommandSchema.parse({
        type: commandRow.command_type,
        payload: commandRow.payload,
      });
      const result = applyCommand(
        state,
        {
          commandId: commandRow.command_id as string,
          sequence: Number(commandRow.district_sequence),
          command,
        },
        commandRow.step_time as string,
      );
      if (!result.ok) {
        throw new Error(
          `restore roll-forward failed: applied command ${commandRow.command_id} rejected with ${result.rejection.code}`,
        );
      }
      state = result.state;
      lastSequence = Number(commandRow.district_sequence);
    }

    await client.query(
      `UPDATE district.district_runtime
          SET state = $3, state_version = $4, last_sequence = $5, updated_at = now()
        WHERE district_id = $1 AND season_id = $2`,
      [districtId, seasonId, state, state.stateVersion, lastSequence],
    );
    await syncScheduledEffects(client, state);
    return {
      snapshotId: Number(row.snapshot_id),
      stateVersion: state.stateVersion,
      lastSequence,
      checksum: await computeChecksum(state),
      reason: row.reason as string,
    };
  });
}
