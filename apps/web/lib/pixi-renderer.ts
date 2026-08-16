"use client";

import type { RendererAdapter, WorldState } from "@freecity/client-world";
import type { Application, Container, Graphics, Text } from "pixi.js";

/**
 * PixiJS district projection behind the renderer adapter. Draws residents as
 * labeled markers at deterministic positions and pulses a marker briefly when
 * new activity involves it. Pure presentation: the synchronized DOM view
 * carries the same facts, and a renderer failure or disablement never blocks
 * an action (CLAUDE.md accessibility-parity invariant).
 */

type PixiModule = typeof import("pixi.js");

interface Marker {
  root: Container;
  circle: Graphics;
  label: Text;
  pulseUntil: number;
}

const PULSE_MS = 1500;

function positionFor(residentId: string, width: number, height: number): { x: number; y: number } {
  // Deterministic hash → stable placement so markers never jump between frames.
  let hash = 0;
  for (const ch of residentId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const cols = 5;
  const cell = hash % (cols * 4);
  const col = cell % cols;
  const row = Math.floor(cell / cols);
  return {
    x: (width / (cols + 1)) * (col + 1),
    y: (height / 5) * (row + 1),
  };
}

export function createPixiRenderer(): RendererAdapter {
  let pixi: PixiModule | null = null;
  let app: Application | null = null;
  let reducedMotion = false;
  let destroyed = false;
  const markers = new Map<string, Marker>();
  let lastActivityId: string | null = null;

  return {
    async mount(container, options) {
      reducedMotion = options.reducedMotion;
      pixi = await import("pixi.js");
      if (destroyed) return;
      const application = new pixi.Application();
      await application.init({ background: "#101418", resizeTo: container, antialias: true });
      if (destroyed) {
        application.destroy(true);
        return;
      }
      app = application;
      container.appendChild(application.canvas);
      // The canvas is decorative; the DOM view is the accessible representation.
      application.canvas.setAttribute("aria-hidden", "true");

      if (!reducedMotion) {
        application.ticker.add(() => {
          const now = Date.now();
          for (const marker of markers.values()) {
            const active = marker.pulseUntil > now;
            marker.circle.scale.set(active ? 1 + 0.15 * Math.sin(now / 90) : 1);
          }
        });
      }
    },

    update(state: WorldState) {
      if (!app || !pixi) return;
      const width = app.renderer.width;
      const height = app.renderer.height;

      for (const resident of Object.values(state.residents)) {
        let marker = markers.get(resident.residentId);
        if (!marker) {
          const root = new pixi.Container();
          const circle = new pixi.Graphics();
          const label = new pixi.Text({
            text: "",
            style: { fill: "#f7f6f2", fontSize: 13, fontFamily: "system-ui" },
          });
          label.anchor.set(0.5, 0);
          label.y = 16;
          root.addChild(circle);
          root.addChild(label);
          app.stage.addChild(root);
          marker = { root, circle, label, pulseUntil: 0 };
          markers.set(resident.residentId, marker);
        }
        const position = positionFor(resident.residentId, width, height);
        marker.root.position.set(position.x, position.y);
        marker.circle.clear();
        marker.circle
          .circle(0, 0, 11)
          .fill(resident.kind === "ai" ? "#4f8cc9" : "#b4520e")
          .stroke({ color: "#f7f6f2", width: 1.5 });
        marker.label.text = `${resident.displayName} · ${resident.focus}⚡ · ${resident.activeCardCount}🂠`;
      }

      // Pulse the resident named by the newest activity item, once per item.
      const newest = state.activity[state.activity.length - 1];
      if (newest && newest.id !== lastActivityId) {
        lastActivityId = newest.id;
        const event = newest.event;
        if ("residentId" in event) {
          const marker = markers.get(event.residentId);
          if (marker && !reducedMotion) marker.pulseUntil = Date.now() + PULSE_MS;
        }
      }
    },

    destroy() {
      destroyed = true;
      markers.clear();
      if (app) {
        app.destroy(true, { children: true });
        app = null;
      }
    },
  };
}
