import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  computeChecksum,
  districtStateSchema,
  type DistrictCommand,
  type DistrictCommandEnvelope,
} from "@freecity/contracts";

import { initDistrict } from "./init.js";
import { enqueueCommand } from "./journal.js";
import { drainOutbox, type OutboxEvent } from "./outbox.js";
import { replayDistrict } from "./replay.js";
import { createSnapshot, restoreSnapshot } from "./snapshots.js";
import { processDistrict } from "./step.js";
import { createTestDatabase, type TestDatabase } from "./testdb.js";
import { runWorkerOnce } from "./worker.js";

const T0 = "2026-09-01T08:00:00.000Z";

let db: TestDatabase;
let districtCounter = 0;

beforeAll(async () => {
  db = await createTestDatabase();
}, 60_000);

afterAll(async () => {
  await db.drop();
});

/** Fresh district per test so cases stay independent inside one database. */
async function freshDistrict(): Promise<{ districtId: string; seasonId: string }> {
  districtCounter += 1;
  const districtId = `d-${districtCounter}`;
  const seasonId = "season-0";
  await initDistrict(db.pool, {
    districtId,
    seasonId,
    rngSeed: `seed-${districtCounter}`,
    initialStepTime: T0,
  });
  return { districtId, seasonId };
}

function envelope(
  districtId: string,
  seasonId: string,
  command: DistrictCommand,
  idempotencyKey: string,
): DistrictCommandEnvelope {
  return {
    commandId: randomUUID(),
    idempotencyKey,
    commandType: command.type,
    schemaVersion: 1,
    districtId,
    seasonId,
    actorRef: "human:test",
    actorAuthority: "human",
    sourceRef: "integration-test",
    serverReceivedAt: T0,
    correlationId: idempotencyKey,
    privacyScope: "district",
    payload: command.payload,
  };
}

function provision(residentId: string): DistrictCommand {
  return {
    type: "season.provision_resident",
    payload: {
      residentId,
      kind: "human",
      role: "builder",
      displayName: "Ada",
      sponsoredAiResidentId: "ai-1",
    },
  };
}

function assign(cardId: string, expiresAfterHours = 48): DistrictCommand {
  return {
    type: "card.assign",
    payload: {
      residentId: "human-1",
      card: {
        cardId,
        templateId: "tpl-test",
        eventFamily: "relationship",
        expiresAfterHours,
        options: [
          {
            optionId: "opt-a",
            label: "Do the thing",
            focusCost: 1,
            reactionText: "It begins.",
            consequenceDelayMinutes: 60,
            consequenceText: "It happened.",
          },
          {
            optionId: "opt-b",
            label: "Not now",
            focusCost: 0,
            reactionText: "Set aside.",
            consequenceDelayMinutes: 30,
            consequenceText: "It faded.",
          },
        ],
      },
    },
  };
}

function commitChoice(cardId: string, expected: number | null = null): DistrictCommand {
  return {
    type: "card.commit_choice",
    payload: {
      residentId: "human-1",
      cardId,
      optionId: "opt-a",
      expectedStateVersion: expected,
    },
  };
}

async function currentState(districtId: string, seasonId: string) {
  const row = await db.pool.query(
    `SELECT state, state_version, last_sequence FROM district.district_runtime
      WHERE district_id = $1 AND season_id = $2`,
    [districtId, seasonId],
  );
  return {
    state: districtStateSchema.parse(row.rows[0].state),
    stateVersion: Number(row.rows[0].state_version),
    lastSequence: Number(row.rows[0].last_sequence),
  };
}

describe("journal and step", () => {
  it("applies journaled commands in order and records events, outbox, and results", async () => {
    const { districtId, seasonId } = await freshDistrict();
    await enqueueCommand(db.pool, envelope(districtId, seasonId, provision("human-1"), "k1"));
    await enqueueCommand(db.pool, envelope(districtId, seasonId, assign("card-1"), "k2"));
    await enqueueCommand(db.pool, envelope(districtId, seasonId, commitChoice("card-1"), "k3"));

    const summary = await processDistrict(db.pool, districtId, seasonId, { stepTime: T0 });
    expect(summary).toMatchObject({ processed: 3, applied: 3, rejected: 0, lastSequence: 3 });

    const { state } = await currentState(districtId, seasonId);
    expect(state.residents["human-1"]?.focus).toBe(2);
    expect(state.residents["human-1"]?.pendingConsequences).toHaveLength(1);

    const events = await db.pool.query(
      `SELECT district_sequence, event_seq, event_type FROM district.district_event
        WHERE district_id = $1 ORDER BY district_sequence, event_seq`,
      [districtId],
    );
    expect(events.rows.map((r) => r.event_type)).toEqual([
      "ResidentProvisioned",
      "CardAssigned",
      "FocusSpent",
      "ChoiceCommitted",
      "ImmediateReactionRecorded",
      "ConsequenceScheduled",
      "ArchiveEntryRecorded",
    ]);

    const outbox = await db.pool.query(
      `SELECT COUNT(*) FROM district.outbox WHERE district_id = $1 AND published_at IS NULL`,
      [districtId],
    );
    expect(Number(outbox.rows[0].count)).toBe(7);

    const effects = await db.pool.query(
      `SELECT effect_type FROM district.scheduled_effect WHERE district_id = $1 ORDER BY effect_key`,
      [districtId],
    );
    expect(effects.rows.map((r) => r.effect_type).sort()).toEqual([
      "consequence_due",
      "focus_rollover",
    ]);
  });

  it("returns the original result on duplicate idempotency key with no second effect", async () => {
    const { districtId, seasonId } = await freshDistrict();
    const first = await enqueueCommand(
      db.pool,
      envelope(districtId, seasonId, provision("human-1"), "dup-key"),
    );
    expect(first.duplicate).toBe(false);

    await processDistrict(db.pool, districtId, seasonId, { stepTime: T0 });

    const second = await enqueueCommand(
      db.pool,
      envelope(districtId, seasonId, provision("human-1"), "dup-key"),
    );
    expect(second.duplicate).toBe(true);
    expect(second.commandId).toBe(first.commandId);
    expect(second.status).toBe("applied");
    expect(second.result).toMatchObject({ ok: true, districtSequence: 1 });

    const again = await processDistrict(db.pool, districtId, seasonId, { stepTime: T0 });
    expect(again.processed).toBe(0);
    const { stateVersion } = await currentState(districtId, seasonId);
    expect(stateVersion).toBe(1);
  });

  it("records rejections with explicit codes and does not advance state", async () => {
    const { districtId, seasonId } = await freshDistrict();
    await enqueueCommand(db.pool, envelope(districtId, seasonId, provision("human-1"), "k1"));
    await enqueueCommand(db.pool, envelope(districtId, seasonId, assign("card-1"), "k2"));
    // Stale optimistic version: expect version 0, but it will be 2 by then.
    await enqueueCommand(db.pool, envelope(districtId, seasonId, commitChoice("card-1", 0), "k3"));

    const summary = await processDistrict(db.pool, districtId, seasonId, { stepTime: T0 });
    expect(summary).toMatchObject({ processed: 3, applied: 2, rejected: 1 });

    const rejectedRow = await db.pool.query(
      `SELECT status, district_sequence, result FROM district.district_command
        WHERE district_id = $1 AND idempotency_key = 'k3'`,
      [districtId],
    );
    expect(rejectedRow.rows[0].status).toBe("rejected");
    expect(rejectedRow.rows[0].district_sequence).toBeNull();
    expect(rejectedRow.rows[0].result).toMatchObject({ ok: false, code: "VERSION_CONFLICT" });

    const { state } = await currentState(districtId, seasonId);
    expect(state.residents["human-1"]?.activeCards).toHaveLength(1);
    expect(state.stateVersion).toBe(2);
  });

  it("recovers from a crash before commit: nothing is applied, retry succeeds", async () => {
    const { districtId, seasonId } = await freshDistrict();
    await enqueueCommand(db.pool, envelope(districtId, seasonId, provision("human-1"), "k1"));

    await expect(
      processDistrict(db.pool, districtId, seasonId, {
        stepTime: T0,
        onBeforeCommit: async () => {
          throw new Error("simulated crash before COMMIT");
        },
      }),
    ).rejects.toThrow("simulated crash");

    const afterCrash = await db.pool.query(
      `SELECT status FROM district.district_command WHERE district_id = $1`,
      [districtId],
    );
    expect(afterCrash.rows[0].status).toBe("received");
    const { stateVersion } = await currentState(districtId, seasonId);
    expect(stateVersion).toBe(0);

    const retry = await processDistrict(db.pool, districtId, seasonId, { stepTime: T0 });
    expect(retry).toMatchObject({ processed: 1, applied: 1 });
  });

  it("delivers outbox events after a crash between commit and publish", async () => {
    const { districtId, seasonId } = await freshDistrict();
    await enqueueCommand(db.pool, envelope(districtId, seasonId, provision("human-1"), "k1"));
    await processDistrict(db.pool, districtId, seasonId, { stepTime: T0 });
    // "Crash" = simply not draining after commit. A later drain delivers.
    const seen: OutboxEvent[] = [];
    const delivered = await drainOutbox(db.pool, districtId, seasonId, async (e) => {
      seen.push(e);
    });
    expect(delivered).toBe(1);
    expect(seen[0]?.event.eventType).toBe("ResidentProvisioned");

    const secondDrain = await drainOutbox(db.pool, districtId, seasonId, async () => {
      throw new Error("should not be called: everything already published");
    });
    expect(secondDrain).toBe(0);
  });
});

describe("snapshots and replay", () => {
  it("rebuilds a corrupted runtime row from snapshot plus journal", async () => {
    const { districtId, seasonId } = await freshDistrict();
    await enqueueCommand(db.pool, envelope(districtId, seasonId, provision("human-1"), "k1"));
    await processDistrict(db.pool, districtId, seasonId, { stepTime: T0 });
    const snap = await createSnapshot(db.pool, districtId, seasonId, "test");
    expect(snap.lastSequence).toBe(1);

    await enqueueCommand(db.pool, envelope(districtId, seasonId, assign("card-1"), "k2"));
    await processDistrict(db.pool, districtId, seasonId, { stepTime: T0 });
    const before = await currentState(districtId, seasonId);
    const healthyChecksum = await computeChecksum(before.state);

    // Corrupt the committed runtime row, then rebuild from snapshot + journal.
    await db.pool.query(
      `UPDATE district.district_runtime
          SET state = jsonb_set(state, '{residents,human-1,focus}', '99')
        WHERE district_id = $1 AND season_id = $2`,
      [districtId, seasonId],
    );
    const restored = await restoreSnapshot(db.pool, districtId, seasonId, snap.snapshotId);
    expect(restored.lastSequence).toBe(2);
    expect(restored.checksum).toBe(healthyChecksum);

    const after = await currentState(districtId, seasonId);
    expect(after.lastSequence).toBe(2);
    expect(after.state.residents["human-1"]?.activeCards).toHaveLength(1);
    expect(await computeChecksum(after.state)).toBe(healthyChecksum);
    expect((await replayDistrict(db.pool, districtId, seasonId)).match).toBe(true);
  });

  it("replays from genesis and from an intermediate snapshot to the same checksum", async () => {
    const { districtId, seasonId } = await freshDistrict();
    await enqueueCommand(db.pool, envelope(districtId, seasonId, provision("human-1"), "k1"));
    await processDistrict(db.pool, districtId, seasonId, { stepTime: T0 });
    const middle = await createSnapshot(db.pool, districtId, seasonId, "middle");
    await enqueueCommand(db.pool, envelope(districtId, seasonId, assign("card-1"), "k2"));
    await enqueueCommand(db.pool, envelope(districtId, seasonId, commitChoice("card-1"), "k3"));
    await processDistrict(db.pool, districtId, seasonId, { stepTime: "2026-09-01T09:00:00.000Z" });

    const fromGenesis = await replayDistrict(db.pool, districtId, seasonId);
    expect(fromGenesis.match).toBe(true);
    expect(fromGenesis.appliedCommands).toBe(3);

    const fromMiddle = await replayDistrict(db.pool, districtId, seasonId, {
      fromSnapshotId: middle.snapshotId,
    });
    expect(fromMiddle.match).toBe(true);
    expect(fromMiddle.appliedCommands).toBe(2);
    expect(fromMiddle.replayChecksum).toBe(fromGenesis.replayChecksum);
  });

  it("detects divergence when committed state is corrupted", async () => {
    const { districtId, seasonId } = await freshDistrict();
    await enqueueCommand(db.pool, envelope(districtId, seasonId, provision("human-1"), "k1"));
    await processDistrict(db.pool, districtId, seasonId, { stepTime: T0 });

    await db.pool.query(
      `UPDATE district.district_runtime
          SET state = jsonb_set(state, '{residents,human-1,focus}', '99')
        WHERE district_id = $1 AND season_id = $2`,
      [districtId, seasonId],
    );

    const report = await replayDistrict(db.pool, districtId, seasonId);
    expect(report.match).toBe(false);
    expect(report.divergence).toContain("does not match");
  });
});

describe("scheduler", () => {
  it("wakes an idle district for due effects and resolves them via a system command", async () => {
    const { districtId, seasonId } = await freshDistrict();
    await enqueueCommand(db.pool, envelope(districtId, seasonId, provision("human-1"), "k1"));
    await enqueueCommand(db.pool, envelope(districtId, seasonId, assign("card-1", 1), "k2"));
    await enqueueCommand(db.pool, envelope(districtId, seasonId, commitChoice("card-1"), "k3"));
    await processDistrict(db.pool, districtId, seasonId, { stepTime: T0 });

    // Next day: consequence (T0+60m) and focus rollover are due.
    const later = "2026-09-02T09:00:00.000Z";
    const summaries = await runWorkerOnce(db.pool, later);
    const summary = summaries.get(`${districtId}/${seasonId}`);
    expect(summary?.applied).toBe(1); // the system run_due_effects command

    const { state } = await currentState(districtId, seasonId);
    expect(state.residents["human-1"]?.pendingConsequences).toHaveLength(0);
    expect(state.residents["human-1"]?.focus).toBe(3);

    // Idempotent wake: same instant again journals nothing new and applies nothing.
    const again = await runWorkerOnce(db.pool, later);
    const againSummary = again.get(`${districtId}/${seasonId}`);
    expect(againSummary?.applied ?? 0).toBe(0);
  });
});
