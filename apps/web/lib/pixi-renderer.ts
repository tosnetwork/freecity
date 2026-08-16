"use client";

import { type RendererAdapter, type WorldState } from "@freecity/client-world";
import type { Application, Container, Graphics, Sprite, Text, Texture } from "pixi.js";

type PixiModule = typeof import("pixi.js");

export type CityLight = "auto" | "dawn" | "day" | "dusk" | "night";
export type CityWeather = "clear" | "rain" | "mist";

export interface LivingCityRenderer extends RendererAdapter {
  setEnvironment(light: CityLight, weather: CityWeather): void;
}

interface MovingActor {
  root: Container;
  route: { x: number; y: number }[];
  progress: number;
  speed: number;
  vehicle: boolean;
}

interface RainDrop {
  root: Graphics;
  speed: number;
}

const BASE_WIDTH = 1440;
const BASE_HEIGHT = 820;
const TILE_WIDTH = 82;
const TILE_HEIGHT = 41;
const ORIGIN_X = 690;
const ORIGIN_Y = 84;
const ATLAS_CELL = { width: 384, height: 512 };

const ATLAS_INDEX: Record<string, number> = {
  arrival_hall: 0,
  signal_garden: 1,
  night_workshop: 2,
  echo_studio: 3,
  beacon_tower: 4,
  habitat: 5,
  market_hall: 6,
  transit_depot: 7,
};

const ROAD_LOOP: [number, number][] = [
  [3, 6],
  [4, 6],
  [5, 6],
  [6, 6],
  [6, 5],
  [6, 4],
  [6, 3],
  [7, 3],
  [8, 3],
  [9, 4],
  [10, 5],
  [10, 6],
  [9, 6],
  [8, 6],
  [8, 7],
  [7, 8],
  [6, 8],
  [5, 8],
  [4, 7],
];

function iso(gridX: number, gridY: number): { x: number; y: number } {
  return {
    x: ORIGIN_X + (gridX - gridY) * (TILE_WIDTH / 2),
    y: ORIGIN_Y + (gridX + gridY) * (TILE_HEIGHT / 2),
  };
}

function hash(value: string): number {
  let result = 2166136261;
  for (const char of value) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function diamond(
  graphics: Graphics,
  x: number,
  y: number,
  fill: number,
  stroke: number,
  alpha = 1,
): void {
  graphics
    .poly([
      x,
      y - TILE_HEIGHT / 2,
      x + TILE_WIDTH / 2,
      y,
      x,
      y + TILE_HEIGHT / 2,
      x - TILE_WIDTH / 2,
      y,
    ])
    .fill({ color: fill, alpha })
    .stroke({ color: stroke, width: 1, alpha: 0.28 });
}

function parcelAt(state: WorldState, x: number, y: number) {
  return Object.values(state.city.parcels).find(
    (parcel) =>
      x >= parcel.x && x < parcel.x + parcel.width && y >= parcel.y && y < parcel.y + parcel.height,
  );
}

function roadCells(state: WorldState): Set<string> {
  const cells = new Set(ROAD_LOOP.map(([x, y]) => `${x}:${y}`));
  if (state.city.parcels["north-gardens"]?.unlocked) {
    for (const [x, y] of [
      [6, 2],
      [5, 1],
      [4, 1],
    ] as [number, number][])
      cells.add(`${x}:${y}`);
  }
  if (state.city.parcels["east-harbor"]?.unlocked) {
    for (const [x, y] of [
      [11, 6],
      [12, 6],
      [13, 6],
    ] as [number, number][])
      cells.add(`${x}:${y}`);
  }
  if (state.city.parcels["market-quay"]?.unlocked) {
    for (const [x, y] of [
      [7, 9],
      [8, 9],
      [9, 9],
    ] as [number, number][])
      cells.add(`${x}:${y}`);
  }
  return cells;
}

function phaseFor(light: CityLight): Exclude<CityLight, "auto"> {
  if (light !== "auto") return light;
  const hour = new Date().getHours();
  if (hour < 6) return "night";
  if (hour < 9) return "dawn";
  if (hour < 17) return "day";
  if (hour < 20) return "dusk";
  return "night";
}

function addLabel(
  pixi: PixiModule,
  root: Container,
  value: string,
  x: number,
  y: number,
  size = 12,
  color = "#fff9df",
): Text {
  const label = new pixi.Text({
    text: value,
    style: {
      fill: color,
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      fontSize: size,
      fontWeight: "700",
      dropShadow: { color: "#173d35", alpha: 0.85, blur: 3, distance: 1 },
    },
  });
  label.anchor.set(0.5, 0.5);
  label.position.set(x, y);
  root.addChild(label);
  return label;
}

function makePerson(pixi: PixiModule, color: number, named: boolean): Container {
  const root = new pixi.Container();
  const shadow = new pixi.Graphics();
  shadow.ellipse(0, 5, named ? 8 : 6, 3).fill({ color: 0x173c32, alpha: 0.34 });
  const body = new pixi.Graphics();
  body
    .circle(0, -7, named ? 3.5 : 2.7)
    .fill({ color: 0xffdeb5 })
    .roundRect(named ? -3.5 : -2.8, -3.5, named ? 7 : 5.6, named ? 10 : 8, 2)
    .fill({ color })
    .moveTo(-2, 5)
    .lineTo(-3, 9)
    .moveTo(2, 5)
    .lineTo(3, 9)
    .stroke({ color: 0x24302d, width: 1.8 });
  root.addChild(shadow, body);
  return root;
}

function makeVehicle(pixi: PixiModule, color: number, transit = false): Container {
  const root = new pixi.Container();
  const shape = new pixi.Graphics();
  shape
    .ellipse(0, 5, transit ? 15 : 10, 4)
    .fill({ color: 0x153b32, alpha: 0.35 })
    .roundRect(transit ? -15 : -10, -6, transit ? 30 : 20, transit ? 11 : 9, 3)
    .fill({ color })
    .roundRect(transit ? -9 : -5, -10, transit ? 18 : 10, 6, 2)
    .fill({ color: 0xdaf3e6, alpha: 0.9 })
    .circle(transit ? -10 : -6, 5, 2.5)
    .circle(transit ? 10 : 6, 5, 2.5)
    .fill({ color: 0x222f2d });
  root.addChild(shape);
  return root;
}

/**
 * A rebuildable living-city renderer. Terrain, roads, buildings, residents,
 * traffic and atmosphere are independent layers; only committed WorldState
 * chooses what land and buildings exist or what level they have.
 */
export function createPixiRenderer(): LivingCityRenderer {
  let pixi: PixiModule | null = null;
  let app: Application | null = null;
  let sceneRoot: Container | null = null;
  let lastState: WorldState | null = null;
  let reducedMotion = false;
  let destroyed = false;
  let environment: { light: CityLight; weather: CityWeather } = {
    light: "auto",
    weather: "clear",
  };
  let buildingTextures: Record<string, Texture> = {};
  let actors: MovingActor[] = [];
  let rain: RainDrop[] = [];
  let waterHighlights: Graphics[] = [];
  let beaconPulse: Graphics | null = null;

  const rebuild = () => {
    if (!app || !pixi || !lastState) return;
    const state = lastState;
    const width = Math.max(720, app.renderer.width);
    const height = Math.max(410, app.renderer.height);
    if (sceneRoot) {
      app.stage.removeChild(sceneRoot);
      sceneRoot.destroy({ children: true });
    }
    sceneRoot = new pixi.Container();
    sceneRoot.sortableChildren = true;
    const fit = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
    sceneRoot.scale.set(fit);
    sceneRoot.position.set((width - BASE_WIDTH * fit) / 2, (height - BASE_HEIGHT * fit) / 2);
    app.stage.addChild(sceneRoot);
    actors = [];
    rain = [];
    waterHighlights = [];
    beaconPulse = null;

    const terrain = new pixi.Graphics();
    terrain.rect(0, 0, BASE_WIDTH, BASE_HEIGHT).fill({ color: 0x1f7780 });
    for (let x = 0; x < 16; x += 1) {
      for (let y = 0; y < 11; y += 1) {
        const point = iso(x, y);
        const parcel = parcelAt(state, x, y);
        if (!parcel) {
          diamond(terrain, point.x, point.y, (x + y) % 2 ? 0x247b82 : 0x2b858a, 0x70b6ae);
        } else if (!parcel.unlocked) {
          diamond(terrain, point.x, point.y, 0x527c69, 0xc7d6ad, 0.52);
        } else {
          const palette = [0x789b4d, 0x82a552, 0x719447, 0x8aaa58];
          diamond(terrain, point.x, point.y, palette[(x * 3 + y * 5) % 4] ?? 0x789b4d, 0xd8c884);
        }
      }
    }
    terrain.zIndex = 0;
    sceneRoot.addChild(terrain);

    for (let index = 0; index < 16; index += 1) {
      const line = new pixi.Graphics();
      const y = 145 + ((index * 43) % 540);
      const x = 60 + ((index * 173) % 1240);
      line
        .moveTo(x, y)
        .lineTo(x + 36 + (index % 4) * 9, y - 4)
        .stroke({
          color: 0xc8f0d8,
          width: 1.5,
          alpha: 0.28,
        });
      line.zIndex = 1;
      sceneRoot.addChild(line);
      waterHighlights.push(line);
    }

    const roads = new pixi.Graphics();
    for (const key of roadCells(state)) {
      const [xText, yText] = key.split(":");
      const point = iso(Number(xText), Number(yText));
      diamond(roads, point.x, point.y, 0xd7bf85, 0x765f42);
      roads
        .moveTo(point.x - 25, point.y)
        .lineTo(point.x + 25, point.y)
        .stroke({
          color: 0xf1dfac,
          width: 1,
          alpha: 0.55,
        });
    }
    roads.zIndex = 5;
    sceneRoot.addChild(roads);

    for (const parcel of Object.values(state.city.parcels)) {
      if (parcel.unlocked) continue;
      const center = iso(parcel.x + parcel.width / 2 - 0.5, parcel.y + parcel.height / 2 - 0.5);
      const veil = new pixi.Container();
      veil.position.set(center.x, center.y);
      const cloud = new pixi.Graphics();
      cloud
        .ellipse(0, 0, Math.max(80, parcel.width * 30), Math.max(34, parcel.height * 20))
        .fill({ color: 0xe9ead0, alpha: 0.34 })
        .stroke({ color: 0xffe3a0, width: 1.5, alpha: 0.72 });
      veil.addChild(cloud);
      addLabel(pixi, veil, `${parcel.name.toUpperCase()} · FRONTIER`, 0, 0, 11);
      veil.zIndex = 25 + center.y;
      sceneRoot.addChild(veil);
    }

    const visibleBuildings = Object.values(state.city.buildings).filter(
      (building) => state.city.parcels[building.parcelId]?.unlocked,
    );
    for (const building of visibleBuildings) {
      const point = iso(
        building.gridX + (building.footprintWidth - 1) / 2,
        building.gridY + (building.footprintHeight - 1) / 2,
      );
      const root = new pixi.Container();
      root.position.set(point.x, point.y + 8);
      const footprint = new pixi.Graphics();
      footprint
        .ellipse(0, 7, 60 + building.footprintWidth * 16, 22 + building.footprintHeight * 7)
        .fill({ color: 0x183e34, alpha: 0.27 });
      root.addChild(footprint);
      const texture = buildingTextures[building.type];
      if (texture) {
        const sprite: Sprite = new pixi.Sprite(texture);
        sprite.anchor.set(0.5, 0.84);
        const scale =
          building.type === "beacon_tower" ? 0.58 : building.type === "transit_depot" ? 0.7 : 0.66;
        sprite.scale.set(scale);
        root.addChild(sprite);
      } else {
        const fallback = new pixi.Graphics();
        fallback
          .poly([-58, -35, 0, -70, 58, -35, 0, 0])
          .fill({ color: 0x2d8e86 })
          .poly([-58, -35, 0, 0, 0, 58, -58, 25])
          .fill({ color: 0xb75f3f })
          .poly([58, -35, 0, 0, 0, 58, 58, 25])
          .fill({ color: 0x8f482f });
        root.addChild(fallback);
      }

      for (let level = 2; level <= building.level; level += 1) {
        const crown = new pixi.Graphics();
        const y = -116 - (level - 2) * 19;
        crown
          .moveTo(-27, y)
          .lineTo(0, y - 13)
          .lineTo(27, y)
          .stroke({
            color: level === 3 ? 0xffd66c : 0x65d8c2,
            width: 4,
            alpha: 0.92,
          })
          .circle(0, y - 13, 4)
          .fill({ color: 0xfff3bd });
        root.addChild(crown);
      }
      const badge = new pixi.Container();
      badge.position.set(48, -26);
      const badgeShape = new pixi.Graphics();
      badgeShape
        .circle(0, 0, 13)
        .fill({ color: building.level >= building.maxLevel ? 0xd29c3d : 0x285f51, alpha: 0.96 })
        .stroke({ color: 0xffedb0, width: 1.5 });
      badge.addChild(badgeShape);
      addLabel(pixi, badge, `L${building.level}`, 0, 0, 9);
      root.addChild(badge);
      if (building.buildingId === "beacon-square") {
        beaconPulse = new pixi.Graphics();
        beaconPulse
          .circle(0, -158, 18 + building.level * 4)
          .stroke({ color: 0xffd66c, width: 3, alpha: 0.75 })
          .circle(0, -158, 7)
          .fill({ color: 0xfff5bc, alpha: 0.96 });
        root.addChild(beaconPulse);
      }
      root.zIndex = 100 + point.y;
      sceneRoot.addChild(root);
    }

    const route = ROAD_LOOP.map(([x, y]) => iso(x, y));
    const residentEntries = Object.values(state.residents);
    const peopleCount = Math.max(14, Math.min(28, 12 + Math.floor(state.city.population / 4)));
    for (let index = 0; index < peopleCount; index += 1) {
      const resident = residentEntries[index % Math.max(1, residentEntries.length)];
      const seed = resident ? hash(`${resident.residentId}:${index}`) : hash(`citizen:${index}`);
      const palette = [0xd87343, 0xe1b949, 0x4f8faf, 0x8c66a9];
      const color = resident?.kind === "ai" ? 0x43bcb1 : (palette[seed % 4] ?? 0xd87343);
      const root = makePerson(pixi, color, index < residentEntries.length);
      root.zIndex = 300;
      sceneRoot.addChild(root);
      if (resident && index < residentEntries.length && index < 4) {
        addLabel(pixi, root, resident.displayName, 0, 18, 9);
      }
      actors.push({
        root,
        route,
        progress: (seed % 1000) / 1000,
        speed: 0.012 + (seed % 8) / 1000,
        vehicle: false,
      });
    }

    const vehicleCount = state.city.parcels["east-harbor"]?.unlocked ? 7 : 4;
    for (let index = 0; index < vehicleCount; index += 1) {
      const transit = index === 0 && state.city.parcels["east-harbor"]?.unlocked;
      const palette = [0xd65e3a, 0xe0ae3f, 0x3b8e8c, 0xf2e4b9];
      const root = makeVehicle(pixi, palette[index % 4] ?? 0xd65e3a, transit);
      root.zIndex = 280;
      sceneRoot.addChild(root);
      actors.push({
        root,
        route,
        progress: (index + 0.35) / vehicleCount,
        speed: transit ? 0.022 : 0.017 + index * 0.001,
        vehicle: true,
      });
    }

    const light = phaseFor(environment.light);
    const lightSpec = {
      dawn: { color: 0xf18d62, alpha: 0.1 },
      day: { color: 0xffefc1, alpha: 0.03 },
      dusk: { color: 0x8e4f74, alpha: 0.18 },
      night: { color: 0x071d39, alpha: 0.5 },
    }[light];
    const lighting = new pixi.Graphics();
    lighting.rect(0, 0, BASE_WIDTH, BASE_HEIGHT).fill(lightSpec);
    lighting.zIndex = 9000;
    lighting.eventMode = "none";
    sceneRoot.addChild(lighting);

    if (light === "night" || light === "dusk") {
      const windows = new pixi.Graphics();
      for (const building of visibleBuildings) {
        const point = iso(building.gridX + 0.5, building.gridY + 0.5);
        for (let index = 0; index < building.level + 2; index += 1) {
          windows
            .circle(point.x - 24 + index * 15, point.y - 42 - (index % 2) * 13, 3)
            .fill({ color: 0xffd977, alpha: 0.82 });
        }
      }
      windows.zIndex = 9010;
      sceneRoot.addChild(windows);
    }

    if (environment.weather === "rain") {
      for (let index = 0; index < 85; index += 1) {
        const drop = new pixi.Graphics();
        drop.moveTo(0, 0).lineTo(-7, 18).stroke({ color: 0xd7f2f0, width: 1.2, alpha: 0.45 });
        drop.position.set((index * 97) % BASE_WIDTH, (index * 53) % BASE_HEIGHT);
        drop.zIndex = 9500;
        sceneRoot.addChild(drop);
        rain.push({ root: drop, speed: 220 + (index % 7) * 24 });
      }
    } else if (environment.weather === "mist") {
      const mist = new pixi.Graphics();
      mist
        .ellipse(360, 350, 430, 120)
        .fill({ color: 0xe7eee0, alpha: 0.16 })
        .ellipse(1030, 470, 520, 145)
        .fill({ color: 0xf4edcf, alpha: 0.14 });
      mist.zIndex = 9500;
      sceneRoot.addChild(mist);
    }

    const vignette = new pixi.Graphics();
    vignette
      .rect(0, 0, BASE_WIDTH, 46)
      .fill({ color: 0x173c32, alpha: 0.16 })
      .rect(0, BASE_HEIGHT - 70, BASE_WIDTH, 70)
      .fill({ color: 0x173c32, alpha: 0.18 });
    vignette.zIndex = 9900;
    sceneRoot.addChild(vignette);
  };

  return {
    async mount(container, options) {
      reducedMotion = options.reducedMotion;
      pixi = await import("pixi.js");
      if (destroyed) return;
      const application = new pixi.Application();
      await application.init({
        background: "#1f7780",
        resizeTo: container,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });
      if (destroyed) {
        application.destroy(true);
        return;
      }
      app = application;
      application.canvas.setAttribute("aria-hidden", "true");
      application.canvas.setAttribute("data-testid", "city-canvas");
      container.appendChild(application.canvas);

      try {
        const atlas = (await pixi.Assets.load("/art/freecity-building-atlas.webp")) as Texture;
        buildingTextures = Object.fromEntries(
          Object.entries(ATLAS_INDEX).map(([type, index]) => {
            const column = index % 4;
            const row = Math.floor(index / 4);
            return [
              type,
              new pixi!.Texture({
                source: atlas.source,
                frame: new pixi!.Rectangle(
                  column * ATLAS_CELL.width,
                  row * ATLAS_CELL.height,
                  ATLAS_CELL.width,
                  ATLAS_CELL.height,
                ),
              }),
            ];
          }),
        );
      } catch {
        buildingTextures = {};
      }

      application.ticker.add((ticker) => {
        if (!sceneRoot || reducedMotion) return;
        const seconds = ticker.deltaMS / 1000;
        for (const actor of actors) {
          actor.progress = (actor.progress + actor.speed * seconds) % 1;
          const scaled = actor.progress * actor.route.length;
          const index = Math.floor(scaled) % actor.route.length;
          const nextIndex = (index + 1) % actor.route.length;
          const from = actor.route[index];
          const to = actor.route[nextIndex];
          if (!from || !to) continue;
          const t = scaled - Math.floor(scaled);
          actor.root.position.set(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t - 2);
          actor.root.zIndex = 300 + actor.root.y;
          actor.root.scale.x = to.x < from.x ? -1 : 1;
          if (!actor.vehicle) actor.root.rotation = Math.sin(scaled * Math.PI * 2) * 0.025;
        }
        const now = performance.now();
        for (const [index, line] of waterHighlights.entries()) {
          line.alpha = 0.16 + (Math.sin(now / 900 + index) + 1) * 0.08;
        }
        if (beaconPulse) {
          const pulse = 1 + Math.sin(now / 650) * 0.08;
          beaconPulse.scale.set(pulse);
          beaconPulse.alpha = 0.72 + Math.sin(now / 510) * 0.2;
        }
        for (const drop of rain) {
          drop.root.x -= drop.speed * 0.25 * seconds;
          drop.root.y += drop.speed * seconds;
          if (drop.root.y > BASE_HEIGHT + 30) {
            drop.root.y = -30;
            drop.root.x = (drop.root.x + 330) % BASE_WIDTH;
          }
        }
      });
    },

    update(state) {
      lastState = state;
      rebuild();
    },

    setEnvironment(light, weather) {
      environment = { light, weather };
      rebuild();
    },

    destroy() {
      destroyed = true;
      actors = [];
      rain = [];
      waterHighlights = [];
      buildingTextures = {};
      if (app) {
        app.destroy(true, { children: true });
        app = null;
      }
    },
  };
}
