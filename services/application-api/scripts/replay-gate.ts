/**
 * Replay release gate (Runtime §8.3, §17): drives a representative District
 * Zero scenario through the real API command path on a scratch database,
 * snapshots mid-scenario, then proves that
 *
 *   1. replay from genesis reproduces the committed state checksum;
 *   2. replay from the mid-scenario snapshot reproduces the same checksum;
 *   3. a corrupted committed state is DETECTED as divergence.
 *
 * Exit code 0 only when all three hold. Wired into CI as `pnpm gate:replay`;
 * a divergence here blocks the release.
 */
import { randomUUID } from "node:crypto";

import type { FastifyInstance } from "fastify";

import { createSnapshot, createTestDatabase, replayDistrict } from "@freecity/district-runtime";

import { buildServer } from "../src/server.js";

const CONFIG = { districtId: "district-zero", seasonId: "season-0" };
let clock = "2026-09-01T08:00:00.000Z";

async function authedToken(app: FastifyInstance, email: string): Promise<string> {
  const request = await app.inject({
    method: "POST",
    url: "/api/auth/request-code",
    payload: { email },
  });
  const verify = await app.inject({
    method: "POST",
    url: "/api/auth/verify",
    payload: { email, code: request.json().devCode },
  });
  return verify.json().token as string;
}

const db = await createTestDatabase();
let failed = false;
try {
  const app = await buildServer({
    pool: db.pool,
    config: CONFIG,
    authMode: "dev",
    now: () => clock,
  });

  // Scenario: two residents enter, choose, decline, and time passes twice.
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
    const residentId = enter.json().residentId as string;
    await app.inject({
      method: "POST",
      url: `/api/cards/relationship-boundary-test:${residentId}/choose`,
      headers,
      payload: { optionId: index === 0 ? "opt-share" : "opt-private" },
    });
    if (index === 0) {
      clock = "2026-09-01T12:00:00.000Z";
      await app.inject({ method: "GET", url: "/api/today", headers }); // catch-up: expiry + consequence
    }
    await app.inject({
      method: "POST",
      url: `/api/cards/district-competing-plans:${residentId}/decline`,
      headers,
      payload: { reason: null },
    });
  }
  const middle = await createSnapshot(db.pool, CONFIG.districtId, CONFIG.seasonId, "gate-middle");

  clock = "2026-09-02T09:00:00.000Z";
  const tokenC = await authedToken(app, `gate-c-${randomUUID()}@x.dev`);
  await app.inject({
    method: "POST",
    url: "/api/season/enter",
    headers: { authorization: `Bearer ${tokenC}` },
    payload: { role: "mediator", displayName: "GateC" },
  });
  await app.inject({
    method: "GET",
    url: "/api/today",
    headers: { authorization: `Bearer ${tokenC}` },
  }); // next-day catch-up: focus rollover for earlier residents
  await app.close();

  const fromGenesis = await replayDistrict(db.pool, CONFIG.districtId, CONFIG.seasonId);
  const fromMiddle = await replayDistrict(db.pool, CONFIG.districtId, CONFIG.seasonId, {
    fromSnapshotId: middle.snapshotId,
  });
  console.log(JSON.stringify({ fromGenesis, fromMiddle }, null, 2));
  if (!fromGenesis.match || fromGenesis.appliedCommands === 0) {
    console.error("GATE FAIL: genesis replay diverged or applied nothing");
    failed = true;
  }
  if (!fromMiddle.match) {
    console.error("GATE FAIL: mid-snapshot replay diverged");
    failed = true;
  }
  if (fromGenesis.replayChecksum !== fromMiddle.replayChecksum) {
    console.error("GATE FAIL: genesis and mid-snapshot replays disagree");
    failed = true;
  }

  // Detection check: a corrupted committed state must be caught.
  await db.pool.query(
    `UPDATE district.district_runtime
        SET state = jsonb_set(state, '{stateVersion}', '999999')
      WHERE district_id = $1 AND season_id = $2`,
    [CONFIG.districtId, CONFIG.seasonId],
  );
  const corrupted = await replayDistrict(db.pool, CONFIG.districtId, CONFIG.seasonId);
  if (corrupted.match) {
    console.error("GATE FAIL: corruption was not detected as divergence");
    failed = true;
  }
} finally {
  await db.drop();
}

if (failed) {
  console.error("REPLAY GATE: FAIL");
  process.exit(1);
}
console.log("REPLAY GATE: PASS");
