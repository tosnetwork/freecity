/**
 * @freecity/application-api — authentication, the command gateway, queries,
 * and the SSE event stream. Every state change flows through the district
 * command path; no endpoint mutates gameplay state directly.
 */

export { buildServer } from "./server.js";
export type { ServerOptions } from "./server.js";
export { enterSeason, findMembership, ensureDistrict } from "./season.js";
export type { Membership, SeasonConfig } from "./season.js";
export { buildToday, buildArchive, eventsAfter } from "./queries.js";
export type { TodayView, CommittedEventView } from "./queries.js";
export { AUTHORED_CARDS } from "./authored-cards.js";
