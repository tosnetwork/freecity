/**
 * @freecity/client-world — client reconciliation, semantic world state, and
 * the renderer adapter boundary. Pure reduction over committed events; no
 * client-side state commit.
 */

export {
  ACTIVITY_LIMIT,
  applyEventView,
  createWorldState,
  summarizeCommittedViews,
  summarizeEvent,
} from "./world.js";
export type {
  ActivityItem,
  CommittedEventView,
  SeedResident,
  WorldResident,
  WorldState,
} from "./world.js";
export { projectCityScene } from "./city.js";
export type {
  CityPlace,
  CityPlaceId,
  CityResidentProjection,
  CityScene,
  VisualIntent,
} from "./city.js";
export { parseSseBuffer, streamDistrictEvents } from "./sse.js";
export type { SseFrame, StreamHandle, StreamOptions, StreamStatus } from "./sse.js";
export type { RendererAdapter } from "./renderer.js";
