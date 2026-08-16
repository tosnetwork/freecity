"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import {
  selectResidentsForViewport,
  type CityPlaceId,
  type PublicResidentPresence,
} from "@freecity/client-world";

import { fetchPublicCitySnapshot, type PublicCitySnapshot } from "../lib/api";

type CityPhase = "dawn" | "day" | "dusk" | "night";

type ResidentStyle = CSSProperties & {
  "--resident-x": string;
  "--resident-y": string;
  "--resident-dx": string;
  "--resident-dy": string;
  "--resident-mid-dx": string;
  "--resident-mid-dy": string;
  "--resident-scale": string;
  "--resident-duration": string;
  "--resident-delay": string;
};

const RESIDENT_ROUTES: Record<
  CityPlaceId,
  { x: number; y: number; dx: number; dy: number; duration: number }
> = {
  "arrival-hall": { x: 24, y: 39, dx: 11, dy: 7, duration: 19 },
  "signal-garden": { x: 34, y: 29, dx: 10, dy: 9, duration: 23 },
  workshop: { x: 68, y: 31, dx: 11, dy: 8, duration: 21 },
  studio: { x: 24, y: 68, dx: 12, dy: 7, duration: 24 },
  "beacon-square": { x: 47, y: 53, dx: 13, dy: 8, duration: 20 },
};

function stableHash(value: string): number {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function residentStyle(resident: PublicResidentPresence): ResidentStyle {
  const route = RESIDENT_ROUTES[resident.placeId];
  const seed = stableHash(resident.residentId);
  const jitterX = ((seed % 9) - 4) * 0.72;
  const jitterY = ((Math.floor(seed / 9) % 7) - 3) * 0.48;
  const reverse = seed % 2 === 0 ? 1 : -1;
  const dx = route.dx * reverse;
  const dy = route.dy * (seed % 3 === 0 ? -0.55 : 1);
  return {
    "--resident-x": `${route.x + jitterX}%`,
    "--resident-y": `${route.y + jitterY}%`,
    "--resident-dx": `${dx}vw`,
    "--resident-dy": `${dy}vh`,
    "--resident-mid-dx": `${dx * 0.52}vw`,
    "--resident-mid-dy": `${dy * 0.42}vh`,
    "--resident-scale": (0.78 + (seed % 7) * 0.055).toFixed(2),
    "--resident-duration": `${route.duration + (seed % 7)}s`,
    "--resident-delay": `${-(seed % 23)}s`,
  };
}

function phaseFor(hour: number): CityPhase {
  if (hour < 6) return "night";
  if (hour < 9) return "dawn";
  if (hour < 17) return "day";
  if (hour < 20) return "dusk";
  return "night";
}

export function CitySky({ compact = false }: { compact?: boolean }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [time, setTime] = useState("");
  const [phase, setPhase] = useState<CityPhase>("day");
  const [city, setCity] = useState<PublicCitySnapshot | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        new Intl.DateTimeFormat("en", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(now),
      );
      setPhase(phaseFor(now.getHours()));
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const visibleResidents = selectResidentsForViewport(city?.residents ?? []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let inFlight = false;
    const sync = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const snapshot = await fetchPublicCitySnapshot(controller.signal);
        if (active) setCity(snapshot);
      } catch {
        // An unavailable projection renders no people rather than inventing
        // decorative substitutes. The next bounded poll tries again.
      } finally {
        inFlight = false;
      }
    };
    void sync();
    const interval = window.setInterval(() => void sync(), 5000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!root || reducedMotion.matches) return;

    let frame = 0;
    const onPointerMove = (event: PointerEvent) => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5) * -12;
        const y = (event.clientY / window.innerHeight - 0.5) * -8;
        root.style.setProperty("--city-pan-x", `${x.toFixed(2)}px`);
        root.style.setProperty("--city-pan-y", `${y.toFixed(2)}px`);
      });
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`city-sky phase-${phase}${compact ? " compact" : ""}`}
      aria-hidden="true"
    >
      <div className="city-master">
        <img src="/art/district-zero-clean.webp" alt="" />
      </div>
      <div className="city-cycle-tint" />
      <div className="city-cloud-shadow cloud-one" />
      <div className="city-cloud-shadow cloud-two" />
      <div className="city-sunwash" />
      <div className="city-water-motion" />
      <div className="city-window-field" />
      <div className="city-beacon-live">
        <i />
        <i />
        <b />
      </div>
      <div className="city-motion-layer" data-testid="city-motion-layer">
        <i className="sky-route route-one" />
        <i className="sky-route route-two" />
        <i className="harbor-route ferry-one" />
        <i className="harbor-route ferry-two" />
      </div>
      <div
        className="world-resident-layer"
        data-testid="world-resident-layer"
        data-world-event={city?.lastEventId ?? "syncing"}
        data-total-residents={city?.residentCount ?? 0}
        data-visible-residents={visibleResidents.length}
      >
        {visibleResidents.map((resident, index) => (
          <span
            key={resident.residentId}
            className={`world-resident kind-${resident.kind}${index < 6 ? " featured" : ""}`}
            style={residentStyle(resident)}
            data-testid="world-resident"
            data-resident-id={resident.residentId}
            data-resident-place={resident.placeId}
            data-resident-activity={resident.activity}
            data-source-event-id={resident.sourceEventId ?? "runtime-state"}
            title={`${resident.displayName} · ${resident.activity} · ${resident.placeName}`}
          >
            <i className="world-resident-shadow" />
            <i className="world-resident-body">
              <b />
              <em />
            </i>
            <small>{resident.displayName}</small>
          </span>
        ))}
      </div>
      <div className="city-vista-vignette" />
      <div className="sky-time">D0 / {time || "--:--:--"}</div>
      <div className="sky-coordinate">
        DISTRICT ZERO · {city ? `${city.residentCount} COMMITTED RESIDENTS` : "SYNCING RESIDENTS"} ·
        NO BORDER
      </div>
    </div>
  );
}
