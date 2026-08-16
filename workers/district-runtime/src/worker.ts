import { randomUUID } from "node:crypto";

import type { DistrictCommandEnvelope } from "@freecity/contracts";

import { withTransaction, type Pool } from "./db.js";
import { enqueueCommand } from "./journal.js";
import { findDueDistricts, hasDueEffects } from "./schedule.js";
import { processDistrict, type ProcessSummary } from "./step.js";

/**
 * One worker pass at an explicit wall-clock instant (`now` is taken OUTSIDE
 * the deterministic step and recorded as its step time): wake districts with
 * received commands or due scheduled effects, journal a system
 * `runtime.run_due_effects` command where effects are due, and process each
 * partition in order.
 */
export async function runWorkerOnce(pool: Pool, now: string): Promise<Map<string, ProcessSummary>> {
  const due = await withTransaction(pool, (client) => findDueDistricts(client, now));
  const summaries = new Map<string, ProcessSummary>();

  for (const district of due) {
    const effectsDue = await withTransaction(pool, (client) =>
      hasDueEffects(client, district.districtId, district.seasonId, now),
    );
    if (effectsDue) {
      const envelope: DistrictCommandEnvelope = {
        commandId: randomUUID(),
        // One catch-up command per district per step instant; duplicates
        // collapse in the journal.
        idempotencyKey: `run-due:${now}`,
        commandType: "runtime.run_due_effects",
        schemaVersion: 1,
        districtId: district.districtId,
        seasonId: district.seasonId,
        actorRef: "system:scheduler",
        actorAuthority: "system",
        sourceRef: "district-runtime-worker",
        serverReceivedAt: now,
        correlationId: `run-due:${district.districtId}:${now}`,
        privacyScope: "district",
        payload: { limit: 100 },
      };
      await enqueueCommand(pool, envelope);
    }
    const summary = await processDistrict(pool, district.districtId, district.seasonId, {
      stepTime: now,
    });
    summaries.set(`${district.districtId}/${district.seasonId}`, summary);
  }
  return summaries;
}
