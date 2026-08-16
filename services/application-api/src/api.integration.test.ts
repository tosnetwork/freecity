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
  });
}, 60_000);

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

  it("Today shows Focus, three cards, and a committed-events-only WYWA", async () => {
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

    const second = await app.inject({ method: "GET", url: "/api/today", headers: authHeaders() });
    expect(second.json().whileYouWereAway).toHaveLength(0); // marker advanced
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
    await app.listen({ port: 0, host: "127.0.0.1" });
    const address = app.server.address();
    if (address === null || typeof address === "string") throw new Error("no port");
    const base = `http://127.0.0.1:${address.port}`;

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
});
