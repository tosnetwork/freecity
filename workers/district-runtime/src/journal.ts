import {
  districtCommandEnvelopeSchema,
  districtCommandSchema,
  type DistrictCommandEnvelope,
} from "@freecity/contracts";

import type { Pool } from "./db.js";

export interface EnqueueResult {
  /** The journaled command id — the original one on duplicate delivery. */
  commandId: string;
  status: "received" | "applied" | "rejected";
  /** true when this envelope was a duplicate of an earlier idempotency key. */
  duplicate: boolean;
  /** The stored result for an already-processed duplicate; null otherwise. */
  result: unknown;
}

/**
 * Journals a command envelope. Duplicate delivery (same district, season, and
 * idempotency key) never creates a second journal row; the caller receives
 * the original command's identity and, if already processed, its original
 * result (Runtime §5).
 */
export async function enqueueCommand(
  pool: Pool,
  envelope: DistrictCommandEnvelope,
): Promise<EnqueueResult> {
  const parsedEnvelope = districtCommandEnvelopeSchema.parse(envelope);
  // Validate the domain payload up front so the journal only ever contains
  // well-formed commands of a known type.
  districtCommandSchema.parse({
    type: parsedEnvelope.commandType,
    payload: parsedEnvelope.payload,
  });

  const inserted = await pool.query(
    `INSERT INTO district.district_command
       (command_id, district_id, season_id, idempotency_key, command_type, schema_version,
        actor_ref, actor_authority, payload, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'received')
     ON CONFLICT (district_id, season_id, idempotency_key) DO NOTHING
     RETURNING command_id`,
    [
      parsedEnvelope.commandId,
      parsedEnvelope.districtId,
      parsedEnvelope.seasonId,
      parsedEnvelope.idempotencyKey,
      parsedEnvelope.commandType,
      parsedEnvelope.schemaVersion,
      parsedEnvelope.actorRef,
      parsedEnvelope.actorAuthority,
      parsedEnvelope.payload,
    ],
  );
  if (inserted.rows[0]) {
    return {
      commandId: parsedEnvelope.commandId,
      status: "received",
      duplicate: false,
      result: null,
    };
  }

  const original = await pool.query(
    `SELECT command_id, status, result
       FROM district.district_command
      WHERE district_id = $1 AND season_id = $2 AND idempotency_key = $3`,
    [parsedEnvelope.districtId, parsedEnvelope.seasonId, parsedEnvelope.idempotencyKey],
  );
  const row = original.rows[0];
  if (!row) {
    throw new Error("idempotency conflict raced with a deleted command row");
  }
  return {
    commandId: row.command_id as string,
    status: row.status as EnqueueResult["status"],
    duplicate: true,
    result: row.result ?? null,
  };
}
