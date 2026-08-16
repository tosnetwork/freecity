/**
 * Replay release gate (Runtime §8.3, §17): drives a representative District
 * Zero scenario through the real API command path on a scratch database,
 * snapshots mid-scenario, then proves that
 *
 *   1. every scenario request actually succeeded (a failed login, entry, or
 *      command fails the gate — silent scenario degradation cannot pass);
 *   2. the committed journal matches the expected command and event census;
 *   3. replay from genesis reproduces the committed state checksum;
 *   4. replay from the mid-scenario snapshot reproduces the same checksum;
 *   5. a corrupted committed state is DETECTED as divergence.
 *
 * Exit code 0 only when all hold. Wired into CI as `pnpm gate:replay`.
 */
import { randomUUID } from "node:crypto";

import type { FastifyInstance } from "fastify";

import { createSnapshot, createTestDatabase, replayDistrict } from "@freecity/district-runtime";

import { buildServer } from "../src/server.js";

const CONFIG = { districtId: "district-zero", seasonId: "season-0" };
let clock = "2026-09-01T08:00:00.000Z";
let failed = false;

function check(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`GATE FAIL: ${message}`);
    failed = true;
  }
}

interface InjectResponse {
  statusCode: number;
  json: () => Record<string, unknown>;
}

function expectStatus(response: InjectResponse, expected: number, context: string): void {
  check(
    response.statusCode === expected,
    `${context}: expected HTTP ${expected}, got ${response.statusCode} ${JSON.stringify(response.json()).slice(0, 200)}`,
  );
}

function expectApplied(response: InjectResponse, context: string): void {
  expectStatus(response, 200, context);
  check(response.json()["status"] === "applied", `${context}: command was not applied`);
}

async function authedToken(app: FastifyInstance, email: string): Promise<string> {
  const request = await app.inject({
    method: "POST",
    url: "/api/auth/request-code",
    payload: { email },
  });
  expectStatus(request, 200, `request-code ${email}`);
  const verify = await app.inject({
    method: "POST",
    url: "/api/auth/verify",
    payload: { email, code: request.json().devCode },
  });
  expectStatus(verify, 200, `verify ${email}`);
  return verify.json().token as string;
}

const db = await createTestDatabase();
try {
  const app = await buildServer({
    pool: db.pool,
    config: CONFIG,
    authMode: "dev",
    now: () => clock,
  });

  // Scenario: two residents enter, choose, decline; time passes twice.
  for (const [index, email] of [
    `gate-a-${randomUUID()}@x.dev`,
    `gate-b-${randomUUID()}@x.dev`,
  ].entries()) {
    const token = await authedToken(app, email);
    const headers = { authorization: `Bearer ${token}` };
    const enter = await app.inject({
      method: "POST",
      url: "/api/season/enter",
      headers,
      payload: { role: index === 0 ? "builder" : "creator", displayName: `Gate${index}` },
    });
    expectStatus(enter, 200, `enter Gate${index}`);
    const residentId = enter.json().residentId as string;
    check(
      typeof residentId === "string" && residentId.length > 0,
      `enter Gate${index}: residentId`,
    );

    const choose = await app.inject({
      method: "POST",
      url: `/api/cards/relationship-boundary-test:${residentId}/choose`,
      headers,
      payload: { optionId: index === 0 ? "opt-share" : "opt-private" },
    });
    expectApplied(choose, `choose Gate${index}`);

    if (index === 0) {
      clock = "2026-09-01T12:00:00.000Z";
      const today = await app.inject({ method: "GET", url: "/api/today", headers });
      expectStatus(today, 200, "today Gate0 (catch-up)");
      const wywaTypes = (today.json().whileYouWereAway as { event: { eventType: string } }[]).map(
        (v) => v.event.eventType,
      );
      check(
        wywaTypes.includes("ConsequenceResolved"),
        "today Gate0: consequence did not resolve during catch-up",
      );
    }

    const decline = await app.inject({
      method: "POST",
      url: `/api/cards/district-competing-plans:${residentId}/decline`,
      headers,
      payload: { reason: null },
    });
    expectApplied(decline, `decline Gate${index}`);
  }
  const middle = await createSnapshot(db.pool, CONFIG.districtId, CONFIG.seasonId, "gate-middle");

  clock = "2026-09-02T09:00:00.000Z";
  const tokenC = await authedToken(app, `gate-c-${randomUUID()}@x.dev`);
  const headersC = { authorization: `Bearer ${tokenC}` };
  const enterC = await app.inject({
    method: "POST",
    url: "/api/season/enter",
    headers: headersC,
    payload: { role: "mediator", displayName: "GateC" },
  });
  expectStatus(enterC, 200, "enter GateC");
  const todayC = await app.inject({ method: "GET", url: "/api/today", headers: headersC });
  expectStatus(todayC, 200, "today GateC (next-day catch-up)");
  await app.close();

  // Journal census: the scenario commits an exactly known shape.
  // 2×(enter: 2 provisions + 3 assigns) + 1×(GateC enter) = 15 provisioning
  // commands; 2 chooses; 2 declines; 2 system run_due_effects (12:00 and
  // next-day catch-ups) → 21 applied commands.
  const commandCensus = await db.pool.query(
    `SELECT status, COUNT(*)::int AS count FROM district.district_command GROUP BY status`,
  );
  const commandCounts = Object.fromEntries(
    commandCensus.rows.map((r) => [r.status as string, r.count as number]),
  );
  check(
    commandCounts["applied"] === 21 && (commandCounts["rejected"] ?? 0) === 0,
    `command census mismatch: ${JSON.stringify(commandCounts)} (expected 21 applied, 0 rejected)`,
  );

  const eventCensus = await db.pool.query(
    `SELECT event_type, COUNT(*)::int AS count FROM district.district_event GROUP BY event_type`,
  );
  const eventCounts = Object.fromEntries(
    eventCensus.rows.map((r) => [r.event_type as string, r.count as number]),
  );
  const expectedEvents: Record<string, number> = {
    ResidentProvisioned: 6, // 3 humans + 3 AI residents
    CardAssigned: 9, // 3 per human
    FocusSpent: 1, // only Gate0's opt-share costs Focus
    ChoiceCommitted: 2,
    ImmediateReactionRecorded: 2,
    ConsequenceScheduled: 2,
    ConsequenceResolved: 2, // Gate0 at 12:00, Gate1 next day
    CardDeclined: 2,
    CardExpired: 1, // Gate0's 24h opportunity card on day 2
    FocusRefreshed: 4, // day-2 rollover for every day-1 resident: 2 humans + their 2 AI residents
    ArchiveEntryRecorded: 7, // 2 choices + 2 declines + 2 consequences + 1 expiry
  };
  for (const [type, expected] of Object.entries(expectedEvents)) {
    check(
      (eventCounts[type] ?? 0) === expected,
      `event census: ${type} expected ${expected}, got ${eventCounts[type] ?? 0}`,
    );
  }

  const fromGenesis = await replayDistrict(db.pool, CONFIG.districtId, CONFIG.seasonId);
  const fromMiddle = await replayDistrict(db.pool, CONFIG.districtId, CONFIG.seasonId, {
    fromSnapshotId: middle.snapshotId,
  });
  console.log(JSON.stringify({ commandCounts, eventCounts, fromGenesis, fromMiddle }, null, 2));
  check(fromGenesis.match, "genesis replay diverged");
  check(fromGenesis.appliedCommands === 21, "genesis replay applied-command count mismatch");
  check(fromMiddle.match, "mid-snapshot replay diverged");
  check(
    fromGenesis.replayChecksum === fromMiddle.replayChecksum,
    "genesis and mid-snapshot replays disagree",
  );

  // Detection check: a corrupted committed state must be caught.
  await db.pool.query(
    `UPDATE district.district_runtime
        SET state = jsonb_set(state, '{stateVersion}', '999999')
      WHERE district_id = $1 AND season_id = $2`,
    [CONFIG.districtId, CONFIG.seasonId],
  );
  const corrupted = await replayDistrict(db.pool, CONFIG.districtId, CONFIG.seasonId);
  check(!corrupted.match, "corruption was not detected as divergence");
} finally {
  await db.drop();
}

if (failed) {
  console.error("REPLAY GATE: FAIL");
  process.exit(1);
}
console.log("REPLAY GATE: PASS");
