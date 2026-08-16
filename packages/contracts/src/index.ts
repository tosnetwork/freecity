/**
 * @freecity/contracts — single source of command, event, snapshot, and
 * client-delta types. This package must never import from apps, services, or
 * workers, and must stay free of platform/I-O imports so every runtime
 * (worker, API, browser) shares the exact same wire shapes.
 */

export const CONTRACTS_SCHEMA_VERSION = 2;

export * from "./state.js";
export * from "./city-world.js";
export * from "./commands.js";
export * from "./events.js";
export * from "./envelope.js";
export * from "./delta.js";
export * from "./canonical.js";
