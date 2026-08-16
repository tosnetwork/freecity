import { z } from "zod";

import { districtEventSchema } from "./events.js";

/**
 * Compact client synchronization delta (District Simulation Runtime §9.1).
 * A reconnecting client sends its last acknowledged version and receives
 * missing deltas, a snapshot plus later deltas, or an explicit reset.
 */

export const districtEventViewSchema = z.object({
  sequence: z.number().int().positive(),
  eventSeq: z.number().int().min(0),
  event: districtEventSchema,
});
export type DistrictEventView = z.infer<typeof districtEventViewSchema>;

export const clientDeltaSchema = z.object({
  districtId: z.string().min(1),
  seasonId: z.string().min(1),
  fromVersion: z.number().int().min(0),
  toVersion: z.number().int().min(0),
  events: z.array(districtEventViewSchema),
});
export type ClientDelta = z.infer<typeof clientDeltaSchema>;
