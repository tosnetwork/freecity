import {
  districtEventSchema,
  districtStateSchema,
  type DistrictEvent,
  type ResidentState,
} from "@freecity/contracts";
import type { Pool } from "@freecity/district-runtime";

import type { SeasonConfig } from "./season.js";

export interface CommittedEventView {
  sequence: number;
  eventSeq: number;
  event: DistrictEvent;
}

export interface TodayView {
  residentId: string;
  focus: number;
  stateVersion: number;
  lastSequence: number;
  activeCards: ResidentState["activeCards"];
  pendingConsequences: ResidentState["pendingConsequences"];
  /** Committed events involving this resident since the last Today view. */
  whileYouWereAway: CommittedEventView[];
}

function eventInvolvesResident(event: DistrictEvent, residentId: string): boolean {
  return "residentId" in event && event.residentId === residentId;
}

async function residentEvents(
  pool: Pool,
  config: SeasonConfig,
  residentId: string,
  afterSequence: number,
): Promise<{ views: CommittedEventView[]; lastSequence: number }> {
  const result = await pool.query(
    `SELECT district_sequence, event_seq, payload
       FROM district.district_event
      WHERE district_id = $1 AND season_id = $2 AND district_sequence > $3
      ORDER BY district_sequence, event_seq`,
    [config.districtId, config.seasonId, afterSequence],
  );
  const views: CommittedEventView[] = [];
  let lastSequence = afterSequence;
  for (const row of result.rows) {
    const sequence = Number(row.district_sequence);
    lastSequence = Math.max(lastSequence, sequence);
    const event = districtEventSchema.parse(row.payload);
    if (eventInvolvesResident(event, residentId)) {
      views.push({ sequence, eventSeq: Number(row.event_seq), event });
    }
  }
  return { views, lastSequence };
}

/**
 * The Today view: current Focus and cards from committed runtime state, plus
 * a While You Were Away list built exclusively from committed district
 * events since the resident's last acknowledged sequence. Reading is
 * side-effect free; the client advances the marker explicitly through
 * `ackToday`, so duplicate fetches (React strict mode, refresh, retry) never
 * consume the list.
 */
export async function buildToday(
  pool: Pool,
  config: SeasonConfig,
  residentId: string,
): Promise<TodayView> {
  const runtime = await pool.query(
    `SELECT state, last_sequence FROM district.district_runtime
      WHERE district_id = $1 AND season_id = $2`,
    [config.districtId, config.seasonId],
  );
  const runtimeRow = runtime.rows[0];
  if (!runtimeRow) throw new Error("district not initialized");
  const state = districtStateSchema.parse(runtimeRow.state);
  const resident = state.residents[residentId];
  if (!resident) throw new Error(`resident ${residentId} not provisioned`);

  const member = await pool.query(
    `SELECT last_today_sequence FROM app.season_member
      WHERE district_id = $1 AND season_id = $2 AND resident_id = $3`,
    [config.districtId, config.seasonId, residentId],
  );
  const lastTodaySequence = Number(member.rows[0]?.last_today_sequence ?? 0);

  const { views } = await residentEvents(pool, config, residentId, lastTodaySequence);
  const lastSequence = Number(runtimeRow.last_sequence);

  return {
    residentId,
    focus: resident.focus,
    stateVersion: state.stateVersion,
    lastSequence,
    activeCards: resident.activeCards,
    pendingConsequences: resident.pendingConsequences,
    whileYouWereAway: views,
  };
}

/**
 * Advances the While You Were Away marker toward `sequence`. Monotonic (an
 * older or duplicate ack is a no-op) AND clamped to the district's current
 * committed `last_sequence` — a client cannot acknowledge the future and
 * thereby hide events that have not been committed yet. Returns the cursor
 * actually saved.
 */
export async function ackToday(
  pool: Pool,
  config: SeasonConfig,
  residentId: string,
  sequence: number,
): Promise<number> {
  const result = await pool.query(
    `UPDATE app.season_member m
        SET last_today_sequence = GREATEST(
              m.last_today_sequence,
              LEAST($4::bigint, r.last_sequence)
            )
       FROM district.district_runtime r
      WHERE r.district_id = $1 AND r.season_id = $2
        AND m.district_id = $1 AND m.season_id = $2 AND m.resident_id = $3
      RETURNING m.last_today_sequence`,
    [config.districtId, config.seasonId, residentId, sequence],
  );
  const row = result.rows[0];
  if (!row) throw new Error(`no membership for resident ${residentId}`);
  return Number(row.last_today_sequence);
}

/** Archive: the resident's committed ArchiveEntryRecorded events, oldest first. */
export async function buildArchive(
  pool: Pool,
  config: SeasonConfig,
  residentId: string,
): Promise<CommittedEventView[]> {
  const { views } = await residentEvents(pool, config, residentId, 0);
  return views.filter((v) => v.event.eventType === "ArchiveEntryRecorded");
}

/**
 * Position within the committed event log. Events are totally ordered by
 * (sequence, eventSeq); a cursor names the last event already delivered.
 */
export interface EventCursor {
  sequence: number;
  eventSeq: number;
}

/** Cursor meaning "everything strictly after district sequence N". */
export function cursorAfterSequence(sequence: number): EventCursor {
  return { sequence, eventSeq: Number.MAX_SAFE_INTEGER };
}

/**
 * Committed events strictly after the cursor, for SSE replay and resume.
 * Tuple comparison (not sequence-only) so that a disconnect or page boundary
 * in the middle of one command's events never skips the remainder.
 */
export async function eventsAfter(
  pool: Pool,
  config: SeasonConfig,
  cursor: EventCursor,
  limit = 500,
): Promise<CommittedEventView[]> {
  const result = await pool.query(
    `SELECT district_sequence, event_seq, payload
       FROM district.district_event
      WHERE district_id = $1 AND season_id = $2
        AND (district_sequence, event_seq) > ($3::bigint, $4::bigint)
      ORDER BY district_sequence, event_seq
      LIMIT $5`,
    [config.districtId, config.seasonId, cursor.sequence, cursor.eventSeq, limit],
  );
  return result.rows.map((row) => ({
    sequence: Number(row.district_sequence),
    eventSeq: Number(row.event_seq),
    event: districtEventSchema.parse(row.payload),
  }));
}
