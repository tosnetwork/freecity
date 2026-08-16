import { computeChecksum, districtCommandSchema, districtStateSchema } from "@freecity/contracts";
import { applyCommand } from "@freecity/district-rules";

import type { Pool } from "./db.js";

export interface ReplayReport {
  match: boolean;
  fromSnapshotId: number;
  appliedCommands: number;
  replayChecksum: string;
  currentChecksum: string;
  divergence: string | null;
}

/**
 * The release-gate check (Runtime §8.3): rebuild state from a snapshot plus
 * the journaled applied commands and compare against the current committed
 * state. Read-only — replaying never writes. Divergence is a release blocker.
 */
export async function replayDistrict(
  pool: Pool,
  districtId: string,
  seasonId: string,
  opts: { fromSnapshotId?: number } = {},
): Promise<ReplayReport> {
  const snapshotResult = opts.fromSnapshotId
    ? await pool.query(
        `SELECT snapshot_id, state, last_sequence, checksum FROM district.district_snapshot
          WHERE district_id = $1 AND season_id = $2 AND snapshot_id = $3`,
        [districtId, seasonId, opts.fromSnapshotId],
      )
    : await pool.query(
        `SELECT snapshot_id, state, last_sequence, checksum FROM district.district_snapshot
          WHERE district_id = $1 AND season_id = $2
          ORDER BY snapshot_id ASC LIMIT 1`,
        [districtId, seasonId],
      );
  const snapshotRow = snapshotResult.rows[0];
  if (!snapshotRow) {
    throw new Error(`no snapshot found for ${districtId}/${seasonId}`);
  }
  let state = districtStateSchema.parse(snapshotRow.state);
  const storedSnapshotChecksum = snapshotRow.checksum as string;
  const recomputed = await computeChecksum(state);
  if (recomputed !== storedSnapshotChecksum) {
    return {
      match: false,
      fromSnapshotId: Number(snapshotRow.snapshot_id),
      appliedCommands: 0,
      replayChecksum: recomputed,
      currentChecksum: "",
      divergence: `snapshot integrity failure: stored ${storedSnapshotChecksum}, recomputed ${recomputed}`,
    };
  }

  const commands = await pool.query(
    `SELECT command_id, command_type, payload, district_sequence, step_time
       FROM district.district_command
      WHERE district_id = $1 AND season_id = $2 AND status = 'applied'
        AND district_sequence > $3
      ORDER BY district_sequence ASC`,
    [districtId, seasonId, Number(snapshotRow.last_sequence)],
  );

  let appliedCommands = 0;
  for (const row of commands.rows) {
    const command = districtCommandSchema.parse({ type: row.command_type, payload: row.payload });
    const result = applyCommand(
      state,
      {
        commandId: row.command_id as string,
        sequence: Number(row.district_sequence),
        command,
      },
      row.step_time as string,
    );
    if (!result.ok) {
      return {
        match: false,
        fromSnapshotId: Number(snapshotRow.snapshot_id),
        appliedCommands,
        replayChecksum: "",
        currentChecksum: "",
        divergence: `journaled applied command ${row.command_id} rejected on replay: ${result.rejection.code}`,
      };
    }
    state = result.state;
    appliedCommands += 1;
  }

  const runtime = await pool.query(
    `SELECT state FROM district.district_runtime WHERE district_id = $1 AND season_id = $2`,
    [districtId, seasonId],
  );
  const runtimeRow = runtime.rows[0];
  if (!runtimeRow) {
    throw new Error(`district ${districtId}/${seasonId} is not initialized`);
  }
  const replayChecksum = await computeChecksum(state);
  const currentChecksum = await computeChecksum(districtStateSchema.parse(runtimeRow.state));
  const match = replayChecksum === currentChecksum;
  return {
    match,
    fromSnapshotId: Number(snapshotRow.snapshot_id),
    appliedCommands,
    replayChecksum,
    currentChecksum,
    divergence: match
      ? null
      : `replay checksum ${replayChecksum} does not match committed state ${currentChecksum}`,
  };
}
