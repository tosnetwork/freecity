import { randomUUID } from "node:crypto";

import cors from "@fastify/cors";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { z, ZodError } from "zod";

import {
  isoTimestampSchema,
  roleSchema,
  type DistrictCommand,
  type DistrictCommandEnvelope,
} from "@freecity/contracts";
import {
  catchUpDistrict,
  enqueueCommand,
  processDistrict,
  type Pool,
} from "@freecity/district-runtime";

import { requestCode, resolveSession, verifyCode } from "./auth.js";
import {
  ackToday,
  buildArchive,
  buildPublicCitySnapshot,
  buildToday,
  cursorAfterSequence,
  eventsAfter,
  type EventCursor,
} from "./queries.js";
import { ensureDistrict, enterSeason, findMembership, type SeasonConfig } from "./season.js";

export interface ServerOptions {
  pool: Pool;
  config: SeasonConfig;
  /** dev returns auth codes in responses; production sends them out of band. */
  authMode: "dev" | "production";
  /** SSE poll interval; small in tests, ~1s in production. */
  ssePollMs?: number;
  /** Wall-clock source, injectable in tests. Read only at the API boundary. */
  now?: () => string;
  /**
   * Browser origin allowed to call the API directly (the SSE stream bypasses
   * the web dev proxy, which buffers streaming responses). Bearer tokens, no
   * cookies, so the CORS surface stays narrow.
   */
  webOrigin?: string;
  /**
   * Registers the /api/dev/* test-control endpoints (clock override,
   * kill-streams). OFF by default and independent of authMode: an ordinary
   * dev deployment must not let signed-in users move the district clock or
   * sever everyone's streams. Requires dev authMode AND testControlKey.
   */
  enableTestControls?: boolean;
  /** Shared secret held only by the test process; sent as x-test-control-key. */
  testControlKey?: string;
}

const emailSchema = z.object({ email: z.string().email() });
const verifySchema = z.object({ email: z.string().email(), code: z.string().length(6) });
const enterSchema = z.object({ role: roleSchema, displayName: z.string().min(1).max(60) });
const chooseSchema = z.object({
  optionId: z.string().min(1),
  expectedStateVersion: z.number().int().min(0).nullable().default(null),
});
const declineSchema = z.object({ reason: z.string().min(1).max(200).nullable().default(null) });
const ackSchema = z.object({ sequence: z.number().int().min(0) });
const upgradeBuildingSchema = z.object({ expectedLevel: z.number().int().min(1) });
const devClockSchema = z.object({ now: isoTimestampSchema.nullable() });

export async function buildServer(opts: ServerOptions): Promise<FastifyInstance> {
  const { pool, config } = opts;
  const baseNow = opts.now ?? (() => new Date().toISOString());
  // Dev-only test clock (set via POST /api/dev/clock, registered exclusively
  // in dev mode below) so e2e tests can drive delayed consequences. It only
  // shifts the API-boundary wall clock; deterministic-step semantics are
  // untouched — the override becomes the recorded explicit step time.
  let devClockOverride: string | null = null;
  const now = () => devClockOverride ?? baseNow();
  /** Active SSE sockets, so the dev kill-streams hook can sever them. */
  const activeStreams = new Set<import("node:net").Socket>();
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: opts.webOrigin ?? "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["authorization", "content-type", "idempotency-key", "last-event-id"],
  });

  // Malformed input is the client's error, never a 500 — whether zod caught
  // it (semantic validation) or fastify did (broken JSON, wrong content
  // type). Client-classified fastify errors carry a 4xx statusCode; preserve
  // it instead of masking it as a server fault.
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: "invalid_request",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    const thrown = error as { statusCode?: unknown; message?: unknown };
    const statusCode =
      typeof thrown.statusCode === "number" && thrown.statusCode >= 400 && thrown.statusCode < 500
        ? thrown.statusCode
        : 500;
    if (statusCode < 500) {
      return reply.code(statusCode).send({
        error: "invalid_request",
        message: typeof thrown.message === "string" ? thrown.message : "invalid request",
      });
    }
    return reply.code(500).send({ error: "internal_error" });
  });

  await ensureDistrict(pool, config, now());

  async function authenticate(request: FastifyRequest): Promise<string | null> {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) return null;
    return resolveSession(pool, header.slice("Bearer ".length));
  }

  async function requireMembership(request: FastifyRequest) {
    const accountId = await authenticate(request);
    if (!accountId) return null;
    const membership = await findMembership(pool, config, accountId);
    return membership ? { accountId, membership } : { accountId, membership: null };
  }

  app.get("/healthz", async (_request, reply) => reply.send({ ok: true }));

  // Public presence is a sanitized projection of committed runtime state.
  // It contains resident names, civic roles, public destinations and source
  // event ids — never email, account, wallet, Focus or private card state.
  app.get("/api/city/public", async (_request, reply) => {
    reply.header("cache-control", "no-store");
    return reply.send(await buildPublicCitySnapshot(pool, config));
  });

  if (opts.enableTestControls === true && opts.authMode === "dev") {
    const controlKey = opts.testControlKey;
    if (!controlKey) {
      throw new Error("enableTestControls requires a testControlKey");
    }
    const authorizeControl = async (
      request: FastifyRequest,
    ): Promise<{ code: number; error: string } | null> => {
      const accountId = await authenticate(request);
      if (!accountId) return { code: 401, error: "unauthorized" };
      if (request.headers["x-test-control-key"] !== controlKey) {
        return { code: 403, error: "forbidden" };
      }
      return null;
    };

    app.post("/api/dev/clock", async (request, reply) => {
      const denied = await authorizeControl(request);
      if (denied) return reply.code(denied.code).send({ error: denied.error });
      const body = devClockSchema.parse(request.body);
      devClockOverride = body.now;
      return reply.send({ now: devClockOverride });
    });

    // Severs every active SSE connection — a deploy/restart stand-in that
    // lets e2e tests exercise real mid-mount reconnection.
    app.post("/api/dev/kill-streams", async (request, reply) => {
      const denied = await authorizeControl(request);
      if (denied) return reply.code(denied.code).send({ error: denied.error });
      const killed = activeStreams.size;
      for (const socket of activeStreams) socket.destroy();
      activeStreams.clear();
      return reply.send({ killed });
    });
  }

  app.post("/api/auth/request-code", async (request, reply) => {
    const body = emailSchema.parse(request.body);
    const { devCode } = await requestCode(pool, body.email);
    return reply.code(200).send(opts.authMode === "dev" ? { sent: true, devCode } : { sent: true });
  });

  app.post("/api/auth/verify", async (request, reply) => {
    const body = verifySchema.parse(request.body);
    const session = await verifyCode(pool, body.email, body.code);
    if (!session) return reply.code(401).send({ error: "invalid_or_expired_code" });
    return reply.send({ token: session.token });
  });

  app.post("/api/season/enter", async (request, reply) => {
    const accountId = await authenticate(request);
    if (!accountId) return reply.code(401).send({ error: "unauthorized" });
    const body = enterSchema.parse(request.body);
    const membership = await enterSeason(
      pool,
      config,
      accountId,
      body.role,
      body.displayName,
      now(),
    );
    return reply.send(membership);
  });

  app.get("/api/membership", async (request, reply) => {
    const auth = await requireMembership(request);
    if (!auth) return reply.code(401).send({ error: "unauthorized" });
    if (!auth.membership) return reply.code(409).send({ error: "not_a_resident" });
    return reply.send(auth.membership);
  });

  app.get("/api/today", async (request, reply) => {
    const auth = await requireMembership(request);
    if (!auth) return reply.code(401).send({ error: "unauthorized" });
    if (!auth.membership) return reply.code(409).send({ error: "not_a_resident" });
    // Resolve anything due before summarizing — the WYWA list then cites
    // exactly the committed events, never a prediction.
    await catchUpDistrict(pool, config.districtId, config.seasonId, now());
    return reply.send(await buildToday(pool, config, auth.membership.residentId));
  });

  app.post("/api/today/ack", async (request, reply) => {
    const auth = await requireMembership(request);
    if (!auth) return reply.code(401).send({ error: "unauthorized" });
    if (!auth.membership) return reply.code(409).send({ error: "not_a_resident" });
    const body = ackSchema.parse(request.body);
    const saved = await ackToday(pool, config, auth.membership.residentId, body.sequence);
    return reply.send({ acknowledged: saved });
  });

  app.get("/api/archive", async (request, reply) => {
    const auth = await requireMembership(request);
    if (!auth) return reply.code(401).send({ error: "unauthorized" });
    if (!auth.membership) return reply.code(409).send({ error: "not_a_resident" });
    return reply.send({ entries: await buildArchive(pool, config, auth.membership.residentId) });
  });

  async function submitCardCommand(
    request: FastifyRequest,
    reply: { code: (n: number) => { send: (b: unknown) => unknown } },
    command: DistrictCommand,
    residentId: string,
    accountId: string,
    defaultIdempotencyKey: string,
  ) {
    const headerKey = request.headers["idempotency-key"];
    const clientKey = typeof headerKey === "string" ? headerKey : defaultIdempotencyKey;
    // Journal uniqueness is (district, season, key), so the server namespaces
    // every key by the authenticated resident: two residents reusing the same
    // client key stay independent, and nobody can pre-claim another
    // resident's default key.
    const idempotencyKey = `resident:${residentId}:${clientKey}`;
    const envelope: DistrictCommandEnvelope = {
      commandId: randomUUID(),
      idempotencyKey,
      commandType: command.type,
      schemaVersion: 1,
      districtId: config.districtId,
      seasonId: config.seasonId,
      actorRef: `resident:${residentId}`,
      actorAuthority: "human",
      sourceRef: `account:${accountId}`,
      serverReceivedAt: now(),
      correlationId: idempotencyKey,
      privacyScope: "district",
      payload: command.payload,
    };
    const enqueue = await enqueueCommand(pool, envelope);
    if (enqueue.keyConflict) {
      // The same resident reused this key for a different command; refusing
      // loudly beats silently returning the unrelated original result.
      return reply.code(409).send({
        error: "idempotency_key_reused",
        message:
          "This Idempotency-Key was already used for a different request; retry with a new key.",
        originalCommandId: enqueue.commandId,
      });
    }
    if (!enqueue.duplicate || enqueue.status === "received") {
      await processDistrict(pool, config.districtId, config.seasonId, { stepTime: now() });
    }
    const stored = await pool.query(
      `SELECT status, district_sequence, result FROM district.district_command WHERE command_id = $1`,
      [enqueue.commandId],
    );
    const row = stored.rows[0];
    const result = row.result as { ok: boolean; code?: string } | null;
    const status = row.status as string;
    const httpStatus = status === "applied" ? 200 : status === "rejected" ? 409 : 202;
    return reply.code(httpStatus).send({
      commandId: enqueue.commandId,
      duplicate: enqueue.duplicate,
      status,
      districtSequence: row.district_sequence === null ? null : Number(row.district_sequence),
      result,
    });
  }

  app.post("/api/cards/:cardId/choose", async (request, reply) => {
    const auth = await requireMembership(request);
    if (!auth?.membership) return reply.code(401).send({ error: "unauthorized" });
    const { cardId } = request.params as { cardId: string };
    const body = chooseSchema.parse(request.body ?? {});
    const residentId = auth.membership.residentId;
    return submitCardCommand(
      request,
      reply,
      {
        type: "card.commit_choice",
        payload: {
          residentId,
          cardId,
          optionId: body.optionId,
          expectedStateVersion: body.expectedStateVersion,
        },
      },
      residentId,
      auth.accountId,
      `choose:${cardId}:${body.optionId}`,
    );
  });

  app.post("/api/cards/:cardId/decline", async (request, reply) => {
    const auth = await requireMembership(request);
    if (!auth?.membership) return reply.code(401).send({ error: "unauthorized" });
    const { cardId } = request.params as { cardId: string };
    const body = declineSchema.parse(request.body ?? {});
    const residentId = auth.membership.residentId;
    return submitCardCommand(
      request,
      reply,
      { type: "card.decline", payload: { residentId, cardId, reason: body.reason } },
      residentId,
      auth.accountId,
      `decline:${cardId}`,
    );
  });

  app.post("/api/city/buildings/:buildingId/upgrade", async (request, reply) => {
    const auth = await requireMembership(request);
    if (!auth?.membership) return reply.code(401).send({ error: "unauthorized" });
    const { buildingId } = request.params as { buildingId: string };
    const body = upgradeBuildingSchema.parse(request.body ?? {});
    const residentId = auth.membership.residentId;
    return submitCardCommand(
      request,
      reply,
      {
        type: "building.upgrade",
        payload: { residentId, buildingId, expectedLevel: body.expectedLevel },
      },
      residentId,
      auth.accountId,
      `upgrade:${buildingId}:${body.expectedLevel}`,
    );
  });

  app.post("/api/city/parcels/:parcelId/expand", async (request, reply) => {
    const auth = await requireMembership(request);
    if (!auth?.membership) return reply.code(401).send({ error: "unauthorized" });
    const { parcelId } = request.params as { parcelId: string };
    const residentId = auth.membership.residentId;
    return submitCardCommand(
      request,
      reply,
      { type: "district.expand", payload: { residentId, parcelId } },
      residentId,
      auth.accountId,
      `expand:${parcelId}`,
    );
  });

  /**
   * SSE stream of committed district events. Resume with ?from=<sequence> or
   * the standard Last-Event-ID header; ids are "<sequence>:<eventSeq>".
   */
  app.get("/api/events", async (request, reply) => {
    const auth = await requireMembership(request);
    if (!auth?.membership) return reply.code(401).send({ error: "unauthorized" });

    // Resume position: Last-Event-ID names the exact last delivered event
    // ("sequence:eventSeq"); ?from=<sequence> means "everything after that
    // whole sequence". Both resolve to a tuple cursor so a disconnect in the
    // middle of one command's events never skips the remainder.
    const query = request.query as { from?: string };
    const lastEventId = request.headers["last-event-id"];
    let cursor: EventCursor;
    if (typeof lastEventId === "string" && /^\d+:\d+$/.test(lastEventId)) {
      const [sequencePart, eventSeqPart] = lastEventId.split(":");
      cursor = { sequence: Number(sequencePart), eventSeq: Number(eventSeqPart) };
    } else {
      const from = Number(query.from ?? 0);
      cursor = cursorAfterSequence(Number.isFinite(from) && from > 0 ? from : 0);
    }

    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
      // Prevent intermediaries (e.g. the Next dev proxy) from applying
      // response compression, which buffers the stream indefinitely.
      "content-encoding": "identity",
      // Writing to the raw socket bypasses fastify's reply pipeline, so the
      // CORS plugin's headers must be attached here by hand.
      "access-control-allow-origin": opts.webOrigin ?? "http://localhost:3000",
    });
    reply.raw.flushHeaders();

    let open = true;
    activeStreams.add(request.raw.socket);
    request.raw.on("close", () => {
      open = false;
      activeStreams.delete(request.raw.socket);
    });

    const pollMs = opts.ssePollMs ?? 1000;
    while (open) {
      const batch = await eventsAfter(pool, config, cursor);
      for (const view of batch) {
        reply.raw.write(
          `id: ${view.sequence}:${view.eventSeq}\nevent: district\ndata: ${JSON.stringify(view)}\n\n`,
        );
        cursor = { sequence: view.sequence, eventSeq: view.eventSeq };
      }
      if (!open) break;
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
    reply.raw.end();
    return reply;
  });

  return app;
}
