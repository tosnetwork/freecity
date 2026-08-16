import { z } from "zod";

import { isoTimestampSchema } from "./state.js";

/**
 * The transport envelope for state-changing gameplay requests
 * (District Simulation Runtime §5). The authenticated principal is derived at
 * the gateway; `actorRef` in the envelope is never trusted from the client.
 */

export const actorAuthoritySchema = z.enum(["human", "agent", "operator", "system", "tos_adapter"]);
export type ActorAuthority = z.infer<typeof actorAuthoritySchema>;

export const districtCommandEnvelopeSchema = z.object({
  commandId: z.string().uuid(),
  idempotencyKey: z.string().min(1).max(200),
  commandType: z.string().min(1),
  schemaVersion: z.number().int().positive(),
  districtId: z.string().min(1),
  seasonId: z.string().min(1),
  actorRef: z.string().min(1),
  actorAuthority: actorAuthoritySchema,
  sourceRef: z.string().min(1),
  expectedRuntimeVersion: z.number().int().min(0).optional(),
  clientObservedAt: isoTimestampSchema.optional(),
  serverReceivedAt: isoTimestampSchema,
  correlationId: z.string().min(1),
  causationId: z.string().min(1).optional(),
  privacyScope: z.string().min(1),
  payload: z.unknown(),
});
export type DistrictCommandEnvelope = z.infer<typeof districtCommandEnvelopeSchema>;

export const commandLifecycleStateSchema = z.enum([
  "received",
  "validated",
  "accepted",
  "applied",
  "rejected",
  "superseded",
  "cancelled",
]);
export type CommandLifecycleState = z.infer<typeof commandLifecycleStateSchema>;
