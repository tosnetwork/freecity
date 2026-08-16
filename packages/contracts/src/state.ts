import { z } from "zod";

import { createInitialSocialWorldState, socialWorldStateSchema } from "./city-world.js";

/**
 * District Runtime snapshot state for the District Zero R0 slice.
 *
 * Canonicalization rules (see canonical.ts):
 * - no `undefined` anywhere — absent values are `null`;
 * - all numbers are safe integers;
 * - all timestamps are ISO 8601 UTC strings.
 */

export const roleSchema = z.enum(["builder", "creator", "merchant", "reporter", "mediator"]);
export type Role = z.infer<typeof roleSchema>;

export const residentKindSchema = z.enum(["human", "ai"]);
export type ResidentKind = z.infer<typeof residentKindSchema>;

export const cityBuildingTypeSchema = z.enum([
  "arrival_hall",
  "signal_garden",
  "night_workshop",
  "echo_studio",
  "beacon_tower",
  "habitat",
  "market_hall",
  "transit_depot",
]);
export type CityBuildingType = z.infer<typeof cityBuildingTypeSchema>;

export const cityParcelSchema = z.object({
  parcelId: z.string().min(1),
  name: z.string().min(1),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  unlocked: z.boolean(),
  requiresParcelId: z.string().min(1).nullable(),
  expansionCost: z.number().int().min(0),
});
export type CityParcel = z.infer<typeof cityParcelSchema>;

export const cityBuildingSchema = z.object({
  buildingId: z.string().min(1),
  parcelId: z.string().min(1),
  type: cityBuildingTypeSchema,
  name: z.string().min(1),
  level: z.number().int().min(1),
  maxLevel: z.number().int().min(1),
  gridX: z.number().int().min(0),
  gridY: z.number().int().min(0),
  footprintWidth: z.number().int().positive(),
  footprintHeight: z.number().int().positive(),
  orientation: z.enum(["north_east", "south_east"]),
});
export type CityBuilding = z.infer<typeof cityBuildingSchema>;

export const cityStateSchema = z.object({
  civicCapacity: z.number().int().min(0),
  prosperity: z.number().int().min(0),
  population: z.number().int().min(0),
  parcels: z.record(z.string(), cityParcelSchema),
  buildings: z.record(z.string(), cityBuildingSchema),
});
export type CityState = z.infer<typeof cityStateSchema>;

/**
 * The authored District Zero genesis. It is shared by the deterministic
 * runtime and rebuildable clients so the map has one canonical footprint.
 * Locked parcels and their buildings exist in the plan, but are not rendered
 * as occupied land until a committed DistrictExpanded event unlocks them.
 */
export function createInitialCityState(): CityState {
  return {
    civicCapacity: 30,
    prosperity: 18,
    population: 24,
    parcels: {
      core: {
        parcelId: "core",
        name: "Beacon Commons",
        x: 2,
        y: 2,
        width: 9,
        height: 7,
        unlocked: true,
        requiresParcelId: null,
        expansionCost: 0,
      },
      "north-gardens": {
        parcelId: "north-gardens",
        name: "North Gardens",
        x: 2,
        y: 0,
        width: 6,
        height: 2,
        unlocked: false,
        requiresParcelId: "core",
        expansionCost: 6,
      },
      "east-harbor": {
        parcelId: "east-harbor",
        name: "East Harbor",
        x: 11,
        y: 3,
        width: 4,
        height: 6,
        unlocked: false,
        requiresParcelId: "core",
        expansionCost: 7,
      },
      "market-quay": {
        parcelId: "market-quay",
        name: "Market Quay",
        x: 7,
        y: 9,
        width: 5,
        height: 2,
        unlocked: false,
        requiresParcelId: "core",
        expansionCost: 6,
      },
    },
    buildings: {
      "arrival-hall": {
        buildingId: "arrival-hall",
        parcelId: "core",
        type: "arrival_hall",
        name: "Arrival Hall",
        level: 1,
        maxLevel: 3,
        gridX: 3,
        gridY: 7,
        footprintWidth: 2,
        footprintHeight: 2,
        orientation: "north_east",
      },
      "signal-garden": {
        buildingId: "signal-garden",
        parcelId: "core",
        type: "signal_garden",
        name: "Signal Garden",
        level: 1,
        maxLevel: 3,
        gridX: 3,
        gridY: 3,
        footprintWidth: 2,
        footprintHeight: 2,
        orientation: "south_east",
      },
      workshop: {
        buildingId: "workshop",
        parcelId: "core",
        type: "night_workshop",
        name: "Night Workshop",
        level: 1,
        maxLevel: 3,
        gridX: 9,
        gridY: 4,
        footprintWidth: 2,
        footprintHeight: 2,
        orientation: "north_east",
      },
      studio: {
        buildingId: "studio",
        parcelId: "core",
        type: "echo_studio",
        name: "Echo Studio",
        level: 1,
        maxLevel: 3,
        gridX: 7,
        gridY: 8,
        footprintWidth: 2,
        footprintHeight: 1,
        orientation: "north_east",
      },
      "beacon-square": {
        buildingId: "beacon-square",
        parcelId: "core",
        type: "beacon_tower",
        name: "Beacon Tower",
        level: 1,
        maxLevel: 3,
        gridX: 6,
        gridY: 5,
        footprintWidth: 2,
        footprintHeight: 2,
        orientation: "south_east",
      },
      habitat: {
        buildingId: "habitat",
        parcelId: "north-gardens",
        type: "habitat",
        name: "Canopy Habitat",
        level: 1,
        maxLevel: 3,
        gridX: 4,
        gridY: 0,
        footprintWidth: 2,
        footprintHeight: 2,
        orientation: "south_east",
      },
      market: {
        buildingId: "market",
        parcelId: "market-quay",
        type: "market_hall",
        name: "Commons Market",
        level: 1,
        maxLevel: 3,
        gridX: 8,
        gridY: 9,
        footprintWidth: 2,
        footprintHeight: 2,
        orientation: "north_east",
      },
      transit: {
        buildingId: "transit",
        parcelId: "east-harbor",
        type: "transit_depot",
        name: "Harbor Transit",
        level: 1,
        maxLevel: 3,
        gridX: 12,
        gridY: 5,
        footprintWidth: 3,
        footprintHeight: 2,
        orientation: "north_east",
      },
    },
  };
}

export const isoTimestampSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/, "expected ISO 8601 UTC timestamp");

export const cardOptionSchema = z.object({
  optionId: z.string().min(1),
  label: z.string().min(1),
  focusCost: z.number().int().min(0).max(3),
  reactionText: z.string().min(1),
  consequenceDelayMinutes: z.number().int().min(0),
  consequenceText: z.string().min(1),
});
export type CardOption = z.infer<typeof cardOptionSchema>;

export const eventFamilySchema = z.enum([
  "relationship",
  "opportunity",
  "creation",
  "conflict_repair",
  "discovery",
  "district_civic",
]);
export type EventFamily = z.infer<typeof eventFamilySchema>;

export const cardInstanceSchema = z.object({
  cardId: z.string().min(1),
  templateId: z.string().min(1),
  eventFamily: eventFamilySchema,
  assignedAt: isoTimestampSchema,
  expiresAt: isoTimestampSchema,
  options: z.array(cardOptionSchema).min(2).max(3),
});
export type CardInstance = z.infer<typeof cardInstanceSchema>;

export const pendingConsequenceSchema = z.object({
  consequenceId: z.string().min(1),
  cardId: z.string().min(1),
  optionId: z.string().min(1),
  dueAt: isoTimestampSchema,
  consequenceText: z.string().min(1),
});
export type PendingConsequence = z.infer<typeof pendingConsequenceSchema>;

export const residentPreferencesSchema = z.object({
  publicPresence: z.boolean().default(true),
  aiMayPrepare: z.boolean().default(true),
  memoryScope: z.enum(["private", "circle", "district"]).default("private"),
  relationshipInvites: z.enum(["humans", "all", "none"]).default("humans"),
});
export type ResidentPreferences = z.infer<typeof residentPreferencesSchema>;

export function createDefaultResidentPreferences(): ResidentPreferences {
  return {
    publicPresence: true,
    aiMayPrepare: true,
    memoryScope: "private",
    relationshipInvites: "humans",
  };
}

export const residentStateSchema = z.object({
  residentId: z.string().min(1),
  kind: residentKindSchema,
  role: roleSchema,
  displayName: z.string().min(1),
  /** For humans: the sponsored AI resident bound at provisioning; null for AI residents. */
  sponsoredAiResidentId: z.string().min(1).nullable(),
  focus: z.number().int().min(0),
  /** UTC day key (YYYY-MM-DD) of the last applied daily Focus refresh. */
  lastFocusRefreshDayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  activeCards: z.array(cardInstanceSchema),
  pendingConsequences: z.array(pendingConsequenceSchema),
  preferences: residentPreferencesSchema.default(createDefaultResidentPreferences),
});
export type ResidentState = z.infer<typeof residentStateSchema>;

export const districtStateSchema = z.object({
  districtId: z.string().min(1),
  seasonId: z.string().min(1),
  /** Monotonic optimistic-concurrency version; +1 per applied command. */
  stateVersion: z.number().int().min(0),
  /** Last applied district_sequence. */
  sequence: z.number().int().min(0),
  /** Explicit scheduler-provided step time of the last applied command. */
  stepTime: isoTimestampSchema,
  rulesetVersion: z.string().min(1),
  /** Recorded seed; the R0 slice rules draw no randomness, but the seed is pinned now. */
  rngSeed: z.string().min(1),
  residents: z.record(z.string(), residentStateSchema),
  city: cityStateSchema.default(createInitialCityState),
  world: socialWorldStateSchema.default(createInitialSocialWorldState),
});
export type DistrictState = z.infer<typeof districtStateSchema>;

/** Daily Focus grant (Playable Experience §6.1: a normal day begins with three Focus). */
export const FOCUS_DAILY = 3;

/** Maximum simultaneously active primary cards (Playable Experience §5.1). */
export const MAX_ACTIVE_CARDS = 3;
