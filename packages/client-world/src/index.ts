/**
 * @freecity/client-world — client reconciliation, semantic world state, and
 * the renderer adapter boundary. Pure reduction over committed events; no
 * client-side state commit.
 */

export { ACTIVITY_LIMIT, applyEventView, createWorldState, summarizeEvent } from "./world.js";
export type { ActivityItem, CommittedEventView, WorldResident, WorldState } from "./world.js";
export { parseSseBuffer, streamDistrictEvents } from "./sse.js";
export type { SseFrame, StreamHandle, StreamOptions, StreamStatus } from "./sse.js";
export type { RendererAdapter } from "./renderer.js";
