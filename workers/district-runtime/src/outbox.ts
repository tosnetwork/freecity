import { districtEventSchema, type DistrictEvent } from "@freecity/contracts";

import type { Pool } from "./db.js";

export interface OutboxEvent {
  districtId: string;
  seasonId: string;
  districtSequence: number;
  eventSeq: number;
  event: DistrictEvent;
}

/**
 * Delivers committed events that have not been published yet, in order, and
 * marks each published only after the handler returns. A crash between
 * commit and publish therefore re-delivers on the next drain — handlers must
 * be idempotent, keyed by (districtSequence, eventSeq).
 */
export async function drainOutbox(
  pool: Pool,
  districtId: string,
  seasonId: string,
  handler: (event: OutboxEvent) => Promise<void>,
  batchLimit = 100,
): Promise<number> {
  const pending = await pool.query(
    `SELECT o.district_sequence, o.event_seq, e.payload
       FROM district.outbox o
       JOIN district.district_event e
         ON e.district_id = o.district_id AND e.season_id = o.season_id
        AND e.district_sequence = o.district_sequence AND e.event_seq = o.event_seq
      WHERE o.district_id = $1 AND o.season_id = $2 AND o.published_at IS NULL
      ORDER BY o.district_sequence, o.event_seq
      LIMIT $3`,
    [districtId, seasonId, batchLimit],
  );

  let delivered = 0;
  for (const row of pending.rows) {
    await handler({
      districtId,
      seasonId,
      districtSequence: Number(row.district_sequence),
      eventSeq: Number(row.event_seq),
      event: districtEventSchema.parse(row.payload),
    });
    await pool.query(
      `UPDATE district.outbox SET published_at = now()
        WHERE district_id = $1 AND season_id = $2 AND district_sequence = $3 AND event_seq = $4`,
      [districtId, seasonId, Number(row.district_sequence), Number(row.event_seq)],
    );
    delivered += 1;
  }
  return delivered;
}
