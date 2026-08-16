import type { WorldState } from "./world.js";

/**
 * The renderer adapter boundary: a renderer consumes semantic world state and
 * draws it. It never issues domain writes and never becomes an authority —
 * the DOM activity view must always present the same facts (CLAUDE.md
 * accessibility-parity invariant).
 */
export interface RendererAdapter {
  mount(container: HTMLElement, options: { reducedMotion: boolean }): void | Promise<void>;
  update(state: WorldState): void;
  destroy(): void;
}
