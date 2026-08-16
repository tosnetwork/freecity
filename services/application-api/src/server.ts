import { randomUUID } from "node:crypto";

import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { z } from "zod";

import {
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
  buildArchive,
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
}

const emailSchema = z.object({ email: z.string().email() });
const verifySchema = z.object({ email: z.string().email(), code: z.string().length(6) });
const enterSchema = z.object({ role: roleSchema, displayName: z.string().min(1).max(60) });
const chooseSchema = z.object({
  optionId: z.string().min(1),
  expectedStateVersion: z.number().int().min(0).nullable().default(null),
});
const declineSchema = z.object({ reason: z.string().min(1).max(200).nullable().default(null) });

export async function buildServer(opts: ServerOptions): Promise<FastifyInstance> {
  const { pool, config } = opts;
  const now = opts.now ?? (() => new Date().toISOString());
  const app = Fastify({ logger: false });

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

  app.get("/api/today", async (request, reply) => {
    const auth = await requireMembership(request);
    if (!auth) return reply.code(401).send({ error: "unauthorized" });
    if (!auth.membership) return reply.code(409).send({ error: "not_a_resident" });
    // Resolve anything due before summarizing — the WYWA list then cites
    // exactly the committed events, never a prediction.
    await catchUpDistrict(pool, config.districtId, config.seasonId, now());
    return reply.send(await buildToday(pool, config, auth.membership.residentId));
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
    });

    let open = true;
    request.raw.on("close", () => {
      open = false;
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
