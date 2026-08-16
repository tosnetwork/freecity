/**
 * DOM-free projection entry point for server-side read models. Keeping this
 * separate from the browser renderer adapter lets the application API reuse
 * the exact world reducer without importing HTMLElement-based interfaces.
 */
export { projectCityScene, projectPublicCitySnapshot, selectResidentsForViewport } from "./city.js";
export type {
  CityPlaceId,
  PublicCitySnapshot,
  PublicResidentPresence,
  ViewportResidentLimits,
} from "./city.js";
export { applyEventView, createWorldState } from "./world.js";
export type { CommittedEventView, WorldState } from "./world.js";
