import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "@freecity/district-runtime";
import type { FastifyInstance } from "fastify";

import { buildServer } from "./server.js";

const CONFIG = { districtId: "district-zero", seasonId: "season-0" };
let db: TestDatabase;
let app: FastifyInstance;
let clock = "2026-09-01T08:00:00.000Z";
let token = "";
let residentId = "";
const cardId = (templateKey: string) => `${templateKey}:${residentId}`;

beforeAll(async () => {
  db = await createTestDatabase();
  app = await buildServer({
    pool: db.pool,
    config: CONFIG,
    authMode: "dev",
    ssePollMs: 25,
    now: () => clock,
    enableTestControls: true,
    testControlKey: "itest-control-key",
  });
}, 60_000);

function controlHeaders() {
  return { ...authHeaders(), "x-test-control-key": "itest-control-key" };
}

afterAll(async () => {
  await app.close();
  await db.drop();
});

function authHeaders() {
  return { authorization: `Bearer ${token}` };
}

describe("auth", () => {
  it("rejects unauthenticated access", async () => {
    const response = await app.inject({ method: "GET", url: "/api/today" });
    expect(response.statusCode).toBe(401);
  });

  it("issues a dev code and exchanges it for a session", async () => {
    const request = await app.inject({
      method: "POST",
      url: "/api/auth/request-code",
      payload: { email: "ada@example.com" },
    });
    expect(request.statusCode).toBe(200);
    const devCode = request.json().devCode as string;
    expect(devCode).toMatch(/^\d{6}$/);

    const wrong = await app.inject({
      method: "POST",
      url: "/api/auth/verify",
      payload: { email: "ada@example.com", code: "000001" },
    });
    expect([401, 200]).toContain(wrong.statusCode); // 1-in-a-million collision tolerated

    const verify = await app.inject({
      method: "POST",
      url: "/api/auth/verify",
      payload: { email: "ada@example.com", code: devCode },
    });
    expect(verify.statusCode).toBe(200);
    token = verify.json().token as string;
    expect(token).toHaveLength(64);

    const replayCode = await app.inject({
      method: "POST",
      url: "/api/auth/verify",
      payload: { email: "ada@example.com", code: devCode },
    });
    expect(replayCode.statusCode).toBe(401); // single use
  });
});

describe("season entry and Today", () => {
  it("provisions the resident, its AI resident, and three authored cards", async () => {
    const enter = await app.inject({
      method: "POST",
      url: "/api/season/enter",
      headers: authHeaders(),
      payload: { role: "builder", displayName: "Ada" },
    });
    expect(enter.statusCode).toBe(200);
    residentId = enter.json().residentId as string;
    expect(enter.json().aiResidentId).toContain("ai-");

    const again = await app.inject({
      method: "POST",
      url: "/api/season/enter",
      headers: authHeaders(),
      payload: { role: "creator", displayName: "Someone Else" },
    });
    expect(again.json().residentId).toBe(residentId); // idempotent per account
    expect(again.json().role).toBe("builder");
  });

  it("exposes the membership for identity recovery, and 409s before entry", async () => {
    const stranger = await loginAs("stranger@example.com");
    const notYet = await app.inject({
      method: "GET",
      url: "/api/membership",
      headers: { authorization: `Bearer ${stranger}` },
    });
    expect(notYet.statusCode).toBe(409);
    expect(notYet.json().error).toBe("not_a_resident");

    const mine = await app.inject({
      method: "GET",
      url: "/api/membership",
      headers: authHeaders(),
    });
    expect(mine.statusCode).toBe(200);
    expect(mine.json()).toMatchObject({ residentId, role: "builder", displayName: "Ada" });
  });

  it("Today is side-effect free; the WYWA marker advances only on explicit ack", async () => {
    const today = await app.inject({ method: "GET", url: "/api/today", headers: authHeaders() });
    expect(today.statusCode).toBe(200);
    const body = today.json();
    expect(body.focus).toBe(3);
    expect(body.activeCards).toHaveLength(3);
    const types = body.whileYouWereAway.map(
      (v: { event: { eventType: string } }) => v.event.eventType,
    );
    expect(types).toContain("ResidentProvisioned");
    expect(types.filter((t: string) => t === "CardAssigned")).toHaveLength(3);

    // A duplicate fetch (refresh, strict-mode double load) sees the same list.
    const second = await app.inject({ method: "GET", url: "/api/today", headers: authHeaders() });
    expect(second.json().whileYouWereAway).toHaveLength(body.whileYouWereAway.length);

    const ack = await app.inject({
      method: "POST",
      url: "/api/today/ack",
      headers: authHeaders(),
      payload: { sequence: body.lastSequence },
    });
    expect(ack.statusCode).toBe(200);

    const third = await app.inject({ method: "GET", url: "/api/today", headers: authHeaders() });
    expect(third.json().whileYouWereAway).toHaveLength(0); // marker advanced by ack

    // Acks are monotonic: an older ack cannot rewind the marker.
    await app.inject({
      method: "POST",
      url: "/api/today/ack",
      headers: authHeaders(),
      payload: { sequence: 0 },
    });
    const fourth = await app.inject({ method: "GET", url: "/api/today", headers: authHeaders() });
    expect(fourth.json().whileYouWereAway).toHaveLength(0);
  });
});

describe("choices", () => {
  it("commits a choice once; duplicate submission returns the original result", async () => {
    const target = cardId("relationship-boundary-test");
    const choose = await app.inject({
      method: "POST",
      url: `/api/cards/${target}/choose`,
      headers: authHeaders(),
      payload: { optionId: "opt-share" },
    });
    expect(choose.statusCode).toBe(200);
    const first = choose.json();
    expect(first.status).toBe("applied");

    const duplicate = await app.inject({
      method: "POST",
      url: `/api/cards/${target}/choose`,
      headers: authHeaders(),
      payload: { optionId: "opt-share" },
    });
    expect(duplicate.json().duplicate).toBe(true);
    expect(duplicate.json().commandId).toBe(first.commandId);
    expect(duplicate.json().districtSequence).toBe(first.districtSequence);

    const today = await app.inject({ method: "GET", url: "/api/today", headers: authHeaders() });
    expect(today.json().focus).toBe(2); // spent exactly once
    expect(today.json().activeCards).toHaveLength(2);
  });

  it("rejects an invalid choice with an explicit code", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/cards/no-such-card/choose",
      headers: authHeaders(),
      payload: { optionId: "opt-x" },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().result.code).toBe("CARD_NOT_FOUND");
  });

  it("declines a card for free", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/cards/${cardId("district-competing-plans")}/decline`,
      headers: authHeaders(),
      payload: { reason: "not today" },
    });
    expect(response.statusCode).toBe(200);
    const today = await app.inject({ method: "GET", url: "/api/today", headers: authHeaders() });
    expect(today.json().focus).toBe(2);
    expect(today.json().activeCards).toHaveLength(1);
  });
});

describe("consequences and Archive", () => {
  it("WYWA cites the committed consequence after time passes", async () => {
    clock = "2026-09-01T10:00:00.000Z"; // past the 60-minute consequence delay
    const today = await app.inject({ method: "GET", url: "/api/today", headers: authHeaders() });
    const types = today
      .json()
      .whileYouWereAway.map((v: { event: { eventType: string } }) => v.event.eventType);
    expect(types).toContain("ConsequenceResolved");
    expect(today.json().pendingConsequences).toHaveLength(0);
  });

  it("refreshes Focus on the next day", async () => {
    clock = "2026-09-02T09:00:00.000Z";
    const today = await app.inject({ method: "GET", url: "/api/today", headers: authHeaders() });
    expect(today.json().focus).toBe(3);
    const types = today
      .json()
      .whileYouWereAway.map((v: { event: { eventType: string } }) => v.event.eventType);
    expect(types).toContain("FocusRefreshed");
  });

  it("Archive lists the choice, decline, and consequence entries", async () => {
    const archive = await app.inject({
      method: "GET",
      url: "/api/archive",
      headers: authHeaders(),
    });
    expect(archive.statusCode).toBe(200);
    const entryTypes = archive
      .json()
      .entries.map((v: { event: { entryType: string } }) => v.event.entryType);
    expect(entryTypes).toContain("choice");
    expect(entryTypes).toContain("decline");
    expect(entryTypes).toContain("consequence");
  });
});

async function loginAs(email: string): Promise<string> {
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

async function ensureListening(): Promise<string> {
  let address = app.server.address();
  if (address === null || typeof address === "string") {
    await app.listen({ port: 0, host: "127.0.0.1" });
    address = app.server.address();
  }
  if (address === null || typeof address === "string") throw new Error("no port");
  return `http://127.0.0.1:${address.port}`;
}

describe("P1 regression: idempotency keys are resident-scoped", () => {
  it("two residents reusing the same client Idempotency-Key stay independent", async () => {
    const bobToken = await loginAs("bob@example.com");
    const danaToken = await loginAs("dana@example.com");
    const enter = async (t: string, name: string) =>
      (
        await app.inject({
          method: "POST",
          url: "/api/season/enter",
          headers: { authorization: `Bearer ${t}` },
          payload: { role: "creator", displayName: name },
        })
      ).json().residentId as string;
    const bobResidentId = await enter(bobToken, "Bob");
    const danaResidentId = await enter(danaToken, "Dana");

    const sharedKey = "shared-client-key";
    const bobChoose = await app.inject({
      method: "POST",
      url: `/api/cards/relationship-boundary-test:${bobResidentId}/choose`,
      headers: { authorization: `Bearer ${bobToken}`, "idempotency-key": sharedKey },
      payload: { optionId: "opt-share" },
    });
    expect(bobChoose.statusCode).toBe(200);
    expect(bobChoose.json().duplicate).toBe(false);

    const danaChoose = await app.inject({
      method: "POST",
      url: `/api/cards/relationship-boundary-test:${danaResidentId}/choose`,
      headers: { authorization: `Bearer ${danaToken}`, "idempotency-key": sharedKey },
      payload: { optionId: "opt-share" },
    });
    expect(danaChoose.statusCode).toBe(200);
    expect(danaChoose.json().duplicate).toBe(false); // not mistaken for Bob's command
    expect(danaChoose.json().commandId).not.toBe(bobChoose.json().commandId);

    const danaToday = await app.inject({
      method: "GET",
      url: "/api/today",
      headers: { authorization: `Bearer ${danaToken}` },
    });
    expect(danaToday.json().focus).toBe(2); // Dana's choice actually executed
  });

  it("a resident's default key cannot be pre-claimed by another resident", async () => {
    const eveToken = await loginAs("eve@example.com");
    await app.inject({
      method: "POST",
      url: "/api/season/enter",
      headers: { authorization: `Bearer ${eveToken}` },
      payload: { role: "reporter", displayName: "Eve" },
    });
    const victimCard = `district-competing-plans:${residentId}`;
    // Eve submits Ada's default composite key as her own client key. It lands
    // on Eve's namespace (and is rejected there: not her card) …
    const eve = await app.inject({
      method: "POST",
      url: `/api/cards/${victimCard}/choose`,
      headers: {
        authorization: `Bearer ${eveToken}`,
        "idempotency-key": `choose:${victimCard}:opt-exhibition`,
      },
      payload: { optionId: "opt-exhibition" },
    });
    expect(eve.statusCode).toBe(409);
    expect(eve.json().result.code).toBe("CARD_NOT_FOUND");
    // … while Ada's later default-key submission is untouched by it. (Her
    // card was declined earlier in the suite, so the command itself is
    // rejected — the point is that it is HER fresh command, not Eve's
    // duplicate.)
    const ada = await app.inject({
      method: "POST",
      url: `/api/cards/${victimCard}/choose`,
      headers: authHeaders(),
      payload: { optionId: "opt-exhibition" },
    });
    expect(ada.json().duplicate).toBe(false);
    expect(ada.json().commandId).not.toBe(eve.json().commandId);
  });
});

describe("P1 regression: concurrent first entry yields one authoritative identity", () => {
  it("parallel enters with different roles return the same resident and role", async () => {
    const frankToken = await loginAs("frank@example.com");
    const enter = (role: string) =>
      app.inject({
        method: "POST",
        url: "/api/season/enter",
        headers: { authorization: `Bearer ${frankToken}` },
        payload: { role, displayName: `Frank-${role}` },
      });
    const [a, b] = await Promise.all([enter("builder"), enter("reporter")]);
    expect(a.statusCode).toBe(200);
    expect(b.statusCode).toBe(200);

    // Both responses describe the same winner — never two identities.
    expect(a.json().residentId).toBe(b.json().residentId);
    expect(a.json().role).toBe(b.json().role);
    expect(a.json().displayName).toBe(b.json().displayName);

    // Database identity, membership, and runtime identity all agree.
    const frankResidentId = a.json().residentId as string;
    const dbRow = await db.pool.query(
      `SELECT r.role AS resident_role, m.role AS member_role
         FROM app.resident r
         JOIN app.season_member m ON m.resident_id = r.resident_id
        WHERE r.resident_id = $1`,
      [frankResidentId],
    );
    expect(dbRow.rows[0].resident_role).toBe(a.json().role);
    expect(dbRow.rows[0].member_role).toBe(a.json().role);

    const runtime = await db.pool.query(
      `SELECT state->'residents'->$3->>'role' AS runtime_role,
              jsonb_array_length(state->'residents'->$3->'activeCards') AS cards
         FROM district.district_runtime
        WHERE district_id = $1 AND season_id = $2`,
      [CONFIG.districtId, CONFIG.seasonId, frankResidentId],
    );
    expect(runtime.rows[0].runtime_role).toBe(a.json().role);
    expect(Number(runtime.rows[0].cards)).toBe(3); // provisioned exactly once
  });
});

describe("P1 regression: idempotency key reuse for a different request is an explicit conflict", () => {
  it("returns 409 idempotency_key_reused instead of swallowing the second choice", async () => {
    const graceToken = await loginAs("grace@example.com");
    const graceEnter = await app.inject({
      method: "POST",
      url: "/api/season/enter",
      headers: { authorization: `Bearer ${graceToken}` },
      payload: { role: "merchant", displayName: "Grace" },
    });
    const graceResidentId = graceEnter.json().residentId as string;
    const headers = (key?: string) => ({
      authorization: `Bearer ${graceToken}`,
      ...(key ? { "idempotency-key": key } : {}),
    });

    const first = await app.inject({
      method: "POST",
      url: `/api/cards/relationship-boundary-test:${graceResidentId}/choose`,
      headers: headers("grace-key"),
      payload: { optionId: "opt-private" },
    });
    expect(first.statusCode).toBe(200);

    // Same key, different card: refused loudly, nothing journaled.
    const conflicting = await app.inject({
      method: "POST",
      url: `/api/cards/district-competing-plans:${graceResidentId}/choose`,
      headers: headers("grace-key"),
      payload: { optionId: "opt-exhibition" },
    });
    expect(conflicting.statusCode).toBe(409);
    expect(conflicting.json().error).toBe("idempotency_key_reused");
    expect(conflicting.json().originalCommandId).toBe(first.json().commandId);

    // The second card is untouched and still choosable with its own key.
    const retry = await app.inject({
      method: "POST",
      url: `/api/cards/district-competing-plans:${graceResidentId}/choose`,
      headers: headers(),
      payload: { optionId: "opt-exhibition" },
    });
    expect(retry.statusCode).toBe(200);
    expect(retry.json().status).toBe("applied");

    // An exact retry of the first request still deduplicates normally.
    const exactRetry = await app.inject({
      method: "POST",
      url: `/api/cards/relationship-boundary-test:${graceResidentId}/choose`,
      headers: headers("grace-key"),
      payload: { optionId: "opt-private" },
    });
    expect(exactRetry.json().duplicate).toBe(true);
    expect(exactRetry.json().commandId).toBe(first.json().commandId);
  });
});

describe("P1 regression: malformed request bodies are 400, not 500", () => {
  it("rejects invalid payloads with structured issues", async () => {
    const badEmail = await app.inject({
      method: "POST",
      url: "/api/auth/request-code",
      payload: { email: "not-an-email" },
    });
    expect(badEmail.statusCode).toBe(400);
    expect(badEmail.json().error).toBe("invalid_request");
    expect(badEmail.json().issues[0].path).toBe("email");

    const badRole = await app.inject({
      method: "POST",
      url: "/api/season/enter",
      headers: authHeaders(),
      payload: { role: "wizard", displayName: "Ada" },
    });
    expect(badRole.statusCode).toBe(400);
    expect(badRole.json().error).toBe("invalid_request");

    const missingOption = await app.inject({
      method: "POST",
      url: `/api/cards/whatever/choose`,
      headers: authHeaders(),
      payload: {},
    });
    expect(missingOption.statusCode).toBe(400);
    expect(missingOption.json().issues[0].path).toBe("optionId");
  });

  it("broken JSON keeps fastify's own 400 instead of becoming a 500", async () => {
    const brokenJson = await app.inject({
      method: "POST",
      url: "/api/auth/request-code",
      headers: { "content-type": "application/json" },
      payload: '{"email":',
    });
    expect(brokenJson.statusCode).toBe(400);
    expect(brokenJson.json().error).toBe("invalid_request");

    const emptyJsonBody = await app.inject({
      method: "POST",
      url: "/api/auth/request-code",
      headers: { "content-type": "application/json" },
      payload: "",
    });
    expect(emptyJsonBody.statusCode).toBe(400);
    expect(emptyJsonBody.json().error).toBe("invalid_request");
  });
});

describe("P2 regression: ack cannot advance into the future", () => {
  it("clamps a future ack to the committed sequence so later events still surface", async () => {
    const henryToken = await loginAs("henry@example.com");
    const headers = { authorization: `Bearer ${henryToken}` };
    const enter = await app.inject({
      method: "POST",
      url: "/api/season/enter",
      headers,
      payload: { role: "builder", displayName: "Henry" },
    });
    const henryResidentId = enter.json().residentId as string;

    const today = await app.inject({ method: "GET", url: "/api/today", headers });
    const lastSequence = today.json().lastSequence as number;

    const futureAck = await app.inject({
      method: "POST",
      url: "/api/today/ack",
      headers,
      payload: { sequence: lastSequence + 1000 },
    });
    expect(futureAck.statusCode).toBe(200);
    expect(futureAck.json().acknowledged).toBe(lastSequence); // clamped, and the saved cursor is returned

    // Events committed after the over-ack must still appear in WYWA.
    const choose = await app.inject({
      method: "POST",
      url: `/api/cards/relationship-boundary-test:${henryResidentId}/choose`,
      headers,
      payload: { optionId: "opt-private" },
    });
    expect(choose.statusCode).toBe(200);

    const after = await app.inject({ method: "GET", url: "/api/today", headers });
    const types = after
      .json()
      .whileYouWereAway.map((v: { event: { eventType: string } }) => v.event.eventType);
    expect(types).toContain("ChoiceCommitted");
  });
});

describe("P1 regression: season entry heals from partial state", () => {
  it("recovers when membership was committed but runtime commands were lost", async () => {
    const carolToken = await loginAs("carol@example.com");
    const account = await db.pool.query(`SELECT account_id FROM app.account WHERE email = $1`, [
      "carol@example.com",
    ]);
    const carolAccountId = account.rows[0].account_id as string;
    const carolResidentId = `human-${carolAccountId}`;
    const carolAiId = `ai-${carolAccountId}`;

    // Simulate the crash window: app rows committed, nothing journaled.
    await db.pool.query(
      `INSERT INTO app.resident (resident_id, account_id, kind, role, display_name)
       VALUES ($1, $2, 'human', 'mediator', 'Carol')`,
      [carolResidentId, carolAccountId],
    );
    await db.pool.query(
      `INSERT INTO app.resident (resident_id, account_id, kind, role, display_name)
       VALUES ($1, NULL, 'ai', 'mediator', 'Mira')`,
      [carolAiId],
    );
    await db.pool.query(
      `INSERT INTO app.season_member
         (district_id, season_id, resident_id, role, sponsored_ai_resident_id)
       VALUES ($1, $2, $3, 'mediator', $4)`,
      [CONFIG.districtId, CONFIG.seasonId, carolResidentId, carolAiId],
    );

    const enter = await app.inject({
      method: "POST",
      url: "/api/season/enter",
      headers: { authorization: `Bearer ${carolToken}` },
      payload: { role: "builder", displayName: "Ignored" },
    });
    expect(enter.statusCode).toBe(200);
    expect(enter.json().role).toBe("mediator"); // stored membership pins the role

    const today = await app.inject({
      method: "GET",
      url: "/api/today",
      headers: { authorization: `Bearer ${carolToken}` },
    });
    expect(today.statusCode).toBe(200); // was 500 before the fix
    expect(today.json().focus).toBe(3);
    expect(today.json().activeCards).toHaveLength(3);
  });
});

describe("SSE stream", () => {
  async function readEvents(url: string, minCount: number): Promise<string[]> {
    const controller = new AbortController();
    const response = await fetch(url, {
      headers: authHeaders(),
      signal: controller.signal,
    });
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const deadline = Date.now() + 5000;
    while ((buffer.match(/^data: /gm) ?? []).length < minCount && Date.now() < deadline) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
    }
    controller.abort();
    return (buffer.match(/^data: (.*)$/gm) ?? []).map((line) => line.slice("data: ".length));
  }

  it("replays committed events from a cursor and supports resume", async () => {
    const base = await ensureListening();

    const all = await readEvents(`${base}/api/events?from=0`, 5);
    expect(all.length).toBeGreaterThanOrEqual(5);
    const firstParsed = JSON.parse(all[0]!) as { sequence: number; event: { eventType: string } };
    expect(firstParsed.sequence).toBe(1);
    expect(firstParsed.event.eventType).toBe("ResidentProvisioned");

    const maxSequence = Math.max(
      ...all.map((raw) => (JSON.parse(raw) as { sequence: number }).sequence),
    );
    const resumeFrom = maxSequence - 1;
    const tail = await readEvents(`${base}/api/events?from=${resumeFrom}`, 1);
    for (const raw of tail) {
      expect((JSON.parse(raw) as { sequence: number }).sequence).toBeGreaterThan(resumeFrom);
    }
  });

  it("P1 regression: resuming mid-sequence delivers the remaining events of that command", async () => {
    const base = await ensureListening();
    // Ada's committed choice produced one sequence with five events
    // (FocusSpent .. ArchiveEntryRecorded). Disconnecting after id "N:0"
    // must resume at N:1, not skip to N+1.
    const row = await db.pool.query(
      `SELECT district_sequence FROM district.district_event
        WHERE district_id = $1 AND season_id = $2
          AND event_type = 'FocusSpent' AND payload->>'residentId' = $3
        ORDER BY district_sequence LIMIT 1`,
      [CONFIG.districtId, CONFIG.seasonId, residentId],
    );
    const seq = Number(row.rows[0].district_sequence);

    const controller = new AbortController();
    const response = await fetch(`${base}/api/events`, {
      headers: { ...authHeaders(), "last-event-id": `${seq}:0` },
      signal: controller.signal,
    });
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const deadline = Date.now() + 5000;
    while ((buffer.match(/^id: /gm) ?? []).length < 4 && Date.now() < deadline) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
    }
    controller.abort();

    const ids = (buffer.match(/^id: (.*)$/gm) ?? []).map((line) => line.slice("id: ".length));
    expect(ids[0]).toBe(`${seq}:1`); // continues within the same sequence
    expect(ids).toContain(`${seq}:2`);
    expect(ids).toContain(`${seq}:3`);
    expect(ids).toContain(`${seq}:4`);
  });

  it("P1 regression: tuple-cursor pagination never truncates inside a sequence", async () => {
    const { eventsAfter, cursorAfterSequence } = await import("./queries.js");
    const full = await eventsAfter(db.pool, CONFIG, cursorAfterSequence(0), 10_000);
    expect(full.length).toBeGreaterThan(5);

    // Walk the log two events at a time — a page size guaranteed to split
    // multi-event sequences — and require exact equality with the full read.
    const walked: { sequence: number; eventSeq: number }[] = [];
    let cursor = cursorAfterSequence(0);
    for (;;) {
      const page = await eventsAfter(db.pool, CONFIG, cursor, 2);
      if (page.length === 0) break;
      for (const view of page) {
        walked.push({ sequence: view.sequence, eventSeq: view.eventSeq });
        cursor = { sequence: view.sequence, eventSeq: view.eventSeq };
      }
    }
    expect(walked).toEqual(full.map((v) => ({ sequence: v.sequence, eventSeq: v.eventSeq })));
  });
});

describe("dev clock (test-only)", () => {
  it("overrides the API wall clock in dev mode and resets to null", async () => {
    const set = await app.inject({
      method: "POST",
      url: "/api/dev/clock",
      headers: controlHeaders(),
      payload: { now: "2026-09-03T10:00:00.000Z" },
    });
    expect(set.statusCode).toBe(200);
    expect(set.json().now).toBe("2026-09-03T10:00:00.000Z");

    // The override wins over the injected clock: day-3 catch-up refreshes Focus.
    const today = await app.inject({ method: "GET", url: "/api/today", headers: authHeaders() });
    expect(today.json().focus).toBe(3);

    const reset = await app.inject({
      method: "POST",
      url: "/api/dev/clock",
      headers: controlHeaders(),
      payload: { now: null },
    });
    expect(reset.statusCode).toBe(200);
    expect(reset.json().now).toBeNull();
  });

  it("requires a session AND the control key; absent without the explicit opt-in", async () => {
    const anonymous = await app.inject({
      method: "POST",
      url: "/api/dev/clock",
      payload: { now: null },
    });
    expect(anonymous.statusCode).toBe(401);

    const wrongKey = await app.inject({
      method: "POST",
      url: "/api/dev/clock",
      headers: { ...authHeaders(), "x-test-control-key": "not-the-key" },
      payload: { now: null },
    });
    expect(wrongKey.statusCode).toBe(403);

    const missingKey = await app.inject({
      method: "POST",
      url: "/api/dev/clock",
      headers: authHeaders(),
      payload: { now: null },
    });
    expect(missingKey.statusCode).toBe(403);

    // An ordinary dev deployment (test controls not opted in) has NO
    // /api/dev/* surface at all — dev auth mode alone must not expose it.
    const plainDev = await buildServer({
      pool: db.pool,
      config: CONFIG,
      authMode: "dev",
      now: () => clock,
    });
    try {
      for (const url of ["/api/dev/clock", "/api/dev/kill-streams"]) {
        const response = await plainDev.inject({
          method: "POST",
          url,
          headers: controlHeaders(),
          payload: { now: null },
        });
        expect(response.statusCode, url).toBe(404);
      }
    } finally {
      await plainDev.close();
    }

    // Production mode never registers them, opt-in or not.
    const production = await buildServer({
      pool: db.pool,
      config: CONFIG,
      authMode: "production",
      now: () => clock,
      enableTestControls: true,
      testControlKey: "itest-control-key",
    });
    try {
      const response = await production.inject({
        method: "POST",
        url: "/api/dev/clock",
        headers: controlHeaders(),
        payload: { now: null },
      });
      expect(response.statusCode).toBe(404);
    } finally {
      await production.close();
    }
  });
});
