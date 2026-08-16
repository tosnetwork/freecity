"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  applyEventView,
  createWorldState,
  projectCityScene,
  streamDistrictEvents,
  type ActivityItem,
  type StreamStatus,
  type WorldState,
} from "@freecity/client-world";
import type { CityBuilding, CityBuildingType, CityParcel, PlaceId } from "@freecity/contracts";

import { apiOrigin, expandDistrict, getToken, upgradeBuilding } from "../../lib/api";
import {
  createPixiRenderer,
  type CityLight,
  type CityWeather,
  type LivingCityRenderer,
} from "../../lib/pixi-renderer";

const PROJECTION_PREF_KEY = "freecity_projection_disabled";
const BASE_WIDTH = 1440;
const BASE_HEIGHT = 820;

const BUILDING_STORY: Record<
  CityBuildingType,
  { chapter: string; purpose: string; benefit: string }
> = {
  arrival_hall: {
    chapter: "GATEWAY",
    purpose: "Where every human and AI resident receives a persistent civic identity.",
    benefit: "Higher levels welcome larger cohorts and open more resident routes.",
  },
  signal_garden: {
    chapter: "TRUST",
    purpose: "A living archive where residents decide which memories may become public signals.",
    benefit: "Higher levels grow safer memory rooms and stronger relationship events.",
  },
  night_workshop: {
    chapter: "WORK",
    purpose: "Repair crews and AI makers keep the district's civic infrastructure alive.",
    benefit: "Higher levels improve recovery work and unlock more productive routes.",
  },
  echo_studio: {
    chapter: "CREATION",
    purpose: "Human and AI creators turn the city's history into public culture.",
    benefit: "Higher levels increase collaborative projects and public performances.",
  },
  beacon_tower: {
    chapter: "COMMON FUTURE",
    purpose: "The district's shared memory and visible measure of collective confidence.",
    benefit: "Higher levels make civic consequences travel farther across the city.",
  },
  habitat: {
    chapter: "LIFE",
    purpose: "A mixed habitat where humans and AI maintain homes, routines and relationships.",
    benefit: "Each level permanently increases the district's resident capacity.",
  },
  market_hall: {
    chapter: "EXCHANGE",
    purpose: "A civic market for work, creations and services between humans and AI.",
    benefit: "Higher levels create more active stalls, visitors and prosperity.",
  },
  transit_depot: {
    chapter: "CONNECTION",
    purpose: "The harbor loop connects distant parcels into one continuous lived city.",
    benefit: "Higher levels increase traffic, accessibility and cross-district movement.",
  },
};

const BUILDING_PLACE: Partial<Record<CityBuildingType, PlaceId>> = {
  arrival_hall: "arrival-hall",
  signal_garden: "signal-garden",
  night_workshop: "workshop",
  echo_studio: "studio",
  beacon_tower: "beacon-square",
  market_hall: "market",
};

function gridPosition(x: number, y: number): { left: string; top: string } {
  const screenX = 690 + (x - y) * 41;
  const screenY = 84 + (x + y) * 20.5;
  return { left: `${(screenX / BASE_WIDTH) * 100}%`, top: `${(screenY / BASE_HEIGHT) * 100}%` };
}

function buildingPosition(building: CityBuilding) {
  return gridPosition(
    building.gridX + (building.footprintWidth - 1) / 2,
    building.gridY + (building.footprintHeight - 1) / 2,
  );
}

function parcelPosition(parcel: CityParcel) {
  return gridPosition(parcel.x + parcel.width / 2 - 0.5, parcel.y + parcel.height / 2 - 0.5);
}

export default function DistrictPage() {
  const [world, setWorld] = useState<WorldState>(createWorldState);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [projectionDisabled, setProjectionDisabled] = useState(true);
  const [prefLoaded, setPrefLoaded] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState("beacon-square");
  const [selectedEvent, setSelectedEvent] = useState<ActivityItem | null>(null);
  const [projectionFailed, setProjectionFailed] = useState(false);
  const [light, setLight] = useState<CityLight>("auto");
  const [weather, setWeather] = useState<CityWeather>("clear");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<LivingCityRenderer | null>(null);
  const worldRef = useRef(world);
  worldRef.current = world;

  useEffect(() => {
    setProjectionDisabled(window.localStorage.getItem(PROJECTION_PREF_KEY) === "1");
    setPrefLoaded(true);
  }, []);

  const toggleProjection = useCallback((disabled: boolean) => {
    setProjectionDisabled(disabled);
    window.localStorage.setItem(PROJECTION_PREF_KEY, disabled ? "1" : "0");
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const handle = streamDistrictEvents({
      url: `${apiOrigin()}/api/events?from=0`,
      token,
      onEvent: (view) => setWorld((current) => applyEventView(current, view)),
      onStatus: setStatus,
    });
    return () => handle.close();
  }, []);

  useEffect(() => {
    if (!prefLoaded || projectionDisabled) return;
    const container = containerRef.current;
    if (!container) return;
    const renderer = createPixiRenderer();
    rendererRef.current = renderer;
    let cancelled = false;
    setProjectionFailed(false);
    void Promise.resolve(
      renderer.mount(container, {
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      }),
    )
      .then(() => {
        if (!cancelled) {
          renderer.setEnvironment(light, weather);
          renderer.update(worldRef.current);
        }
      })
      .catch(() => {
        if (!cancelled) {
          rendererRef.current = null;
          setProjectionFailed(true);
        }
      });
    return () => {
      cancelled = true;
      rendererRef.current = null;
      renderer.destroy();
    };
  }, [prefLoaded, projectionDisabled]);

  useEffect(() => rendererRef.current?.update(world), [world]);
  useEffect(() => rendererRef.current?.setEnvironment(light, weather), [light, weather]);

  const scene = projectCityScene(world);
  const buildings = useMemo(
    () =>
      Object.values(world.city.buildings)
        .filter((building) => world.city.parcels[building.parcelId]?.unlocked)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [world.city],
  );
  const lockedParcels = Object.values(world.city.parcels).filter((parcel) => !parcel.unlocked);
  const selectedBuilding =
    world.city.buildings[selectedBuildingId] ?? world.city.buildings["beacon-square"]!;
  const selectedStory = BUILDING_STORY[selectedBuilding.type];
  const selectedPlace = BUILDING_PLACE[selectedBuilding.type];
  const upgradeCost = selectedBuilding.level * 2 + 1;

  const submitUpgrade = async () => {
    setBusy(`building:${selectedBuilding.buildingId}`);
    setNotice(null);
    try {
      const response = await upgradeBuilding(selectedBuilding.buildingId, selectedBuilding.level);
      if (response.status === "applied") {
        setNotice(`${selectedBuilding.name} upgrade committed. Watch the skyline change.`);
      } else {
        setNotice(response.result?.message ?? "The city could not apply that upgrade.");
      }
    } catch {
      setNotice("The upgrade did not reach the city. Nothing was changed.");
    } finally {
      setBusy(null);
    }
  };

  const submitExpansion = async (parcel: CityParcel) => {
    setBusy(`parcel:${parcel.parcelId}`);
    setNotice(null);
    try {
      const response = await expandDistrict(parcel.parcelId);
      if (response.status === "applied") {
        setNotice(`${parcel.name} is now committed city land.`);
      } else {
        setNotice(response.result?.message ?? "The city could not open that frontier.");
      }
    } catch {
      setNotice("The expansion did not reach the city. Nothing was changed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="living-city-page">
      <header className="living-city-heading">
        <div>
          <span className="eyebrow">DISTRICT ZERO · A PERSISTENT LIVING CITY</span>
          <h1>Build a civilization you can walk through.</h1>
        </div>
        <Link href="/today" className="district-action-link">
          Tonight&apos;s civic stories <span>→</span>
        </Link>
      </header>

      <nav className="place-rail" aria-label="District places">
        {[
          ["arrival-hall", "Arrival"],
          ["signal-garden", "Signal Garden"],
          ["workshop", "Workshop"],
          ["studio", "Studio"],
          ["beacon-square", "Beacon"],
          ["market", "Market Hall"],
          ["civic-hall", "Civic Hall"],
          ["archive", "Archive"],
        ].map(([placeId, label]) => (
          <Link
            key={placeId}
            href={`/places/${placeId}`}
            aria-label={placeId === "archive" ? "Enter the city memory place" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>

      <section className="living-city-shell" aria-labelledby="city-heading">
        <div className="city-command-bar">
          <div className="city-command-title">
            <span className={`stream-chip status-${status}`}>
              <i /> <strong data-testid="stream-status">{status}</strong>
            </span>
            <div>
              <span className="eyebrow">THE CITY · RIGHT NOW</span>
              <h2 id="city-heading">District Zero</h2>
            </div>
          </div>

          <dl className="city-vitals" aria-label="District resources">
            <div>
              <dt>Residents</dt>
              <dd>{Object.keys(scene.residents).length}</dd>
            </div>
            <div>
              <dt>Prosperity</dt>
              <dd>{world.city.prosperity}</dd>
            </div>
            <div>
              <dt>Civic capacity</dt>
              <dd>{world.city.civicCapacity}</dd>
            </div>
            <div>
              <dt>Land</dt>
              <dd>{Object.values(world.city.parcels).filter((p) => p.unlocked).length}/4</dd>
            </div>
          </dl>

          <div className="city-environment-controls" aria-label="City atmosphere controls">
            <label>
              <span>Light</span>
              <select value={light} onChange={(event) => setLight(event.target.value as CityLight)}>
                <option value="auto">Live</option>
                <option value="dawn">Dawn</option>
                <option value="day">Day</option>
                <option value="dusk">Dusk</option>
                <option value="night">Night</option>
              </select>
            </label>
            <label>
              <span>Weather</span>
              <select
                value={weather}
                onChange={(event) => setWeather(event.target.value as CityWeather)}
              >
                <option value="clear">Clear</option>
                <option value="rain">Rain</option>
                <option value="mist">Mist</option>
              </select>
            </label>
          </div>
        </div>

        <div className="living-city-viewport">
          <div className="city-horizon" aria-hidden="true" />
          {!projectionDisabled && (
            <div
              ref={containerRef}
              className="projection living-city-projection"
              role="img"
              aria-label="Animated isometric city showing committed land, building levels, resident paths, traffic, light and weather. Equivalent controls and facts follow in the city ledger."
            />
          )}
          {projectionDisabled && (
            <div
              className="projection-disabled-map"
              role="img"
              aria-label="Visual projection disabled"
            >
              <strong>City projection is off.</strong>
              <span>Every building and action remains available through the city ledger.</span>
            </div>
          )}

          <nav className="building-hotspots" aria-label="Buildings in District Zero">
            {buildings.map((building) => (
              <button
                key={building.buildingId}
                type="button"
                className={`building-hotspot${selectedBuilding.buildingId === building.buildingId ? " selected" : ""}`}
                style={buildingPosition(building)}
                aria-pressed={selectedBuilding.buildingId === building.buildingId}
                onClick={() => setSelectedBuildingId(building.buildingId)}
              >
                <span>{building.name}</span>
                <small>LEVEL {building.level}</small>
              </button>
            ))}
          </nav>

          <nav className="frontier-hotspots" aria-label="Available district expansions">
            {lockedParcels.map((parcel) => (
              <button
                key={parcel.parcelId}
                type="button"
                style={parcelPosition(parcel)}
                disabled={busy !== null || world.city.civicCapacity < parcel.expansionCost}
                onClick={() => void submitExpansion(parcel)}
              >
                <span>OPEN FRONTIER</span>
                <strong>{parcel.name}</strong>
                <small>{parcel.expansionCost} capacity</small>
              </button>
            ))}
          </nav>

          <article className="building-inspector" aria-live="polite">
            <div className="inspector-heading">
              <span>{selectedStory.chapter}</span>
              <small>
                LEVEL {selectedBuilding.level} / {selectedBuilding.maxLevel}
              </small>
            </div>
            <h3>{selectedBuilding.name}</h3>
            <p>{selectedStory.purpose}</p>
            <div
              className="level-track"
              role="meter"
              aria-label={`${selectedBuilding.name} level`}
              aria-valuemin={1}
              aria-valuemax={selectedBuilding.maxLevel}
              aria-valuenow={selectedBuilding.level}
            >
              {Array.from({ length: selectedBuilding.maxLevel }, (_, index) => (
                <i key={index} className={index < selectedBuilding.level ? "complete" : ""} />
              ))}
            </div>
            <small>{selectedStory.benefit}</small>
            {selectedPlace && (
              <Link className="text-link" href={`/places/${selectedPlace}`}>
                Enter this place →
              </Link>
            )}
            <button
              type="button"
              className="upgrade-building-button"
              disabled={
                busy !== null ||
                selectedBuilding.level >= selectedBuilding.maxLevel ||
                world.city.civicCapacity < upgradeCost
              }
              onClick={() => void submitUpgrade()}
            >
              {selectedBuilding.level >= selectedBuilding.maxLevel
                ? "Landmark complete"
                : busy === `building:${selectedBuilding.buildingId}`
                  ? "Committing upgrade…"
                  : `Upgrade to level ${selectedBuilding.level + 1}`}
              {selectedBuilding.level < selectedBuilding.maxLevel && <b>{upgradeCost} capacity</b>}
            </button>
          </article>

          <div className="city-now-card" aria-live="polite">
            <span>THE CITY REMEMBERS</span>
            <strong>{scene.headline}</strong>
            <small>{notice ?? scene.subhead}</small>
          </div>
        </div>

        {projectionFailed && (
          <p className="projection-failure" data-testid="projection-failed">
            Live motion could not start on this device. The complete city ledger remains usable.
          </p>
        )}

        <footer className="city-map-footer">
          <span>
            Independent layers: terrain · roads · buildings · residents · traffic · atmosphere
          </span>
          <label className="projection-toggle">
            <input
              type="checkbox"
              checked={projectionDisabled}
              onChange={(event) => toggleProjection(event.target.checked)}
            />
            <span>Use accessible ledger only</span>
          </label>
        </footer>
      </section>

      <details className="city-ledger" open>
        <summary>
          <span>
            <b>City ledger</b> — every building, resident and committed event
          </span>
          <small>Accessible parallel view</small>
        </summary>
        <div className="city-ledger-grid">
          <section aria-labelledby="buildings-heading">
            <h2 id="buildings-heading">Buildings and frontiers</h2>
            <ul className="ledger-building-list">
              {buildings.map((building) => (
                <li key={building.buildingId}>
                  <button type="button" onClick={() => setSelectedBuildingId(building.buildingId)}>
                    <strong>{building.name}</strong>
                    <span>
                      Level {building.level} of {building.maxLevel}
                    </span>
                  </button>
                </li>
              ))}
              {lockedParcels.map((parcel) => (
                <li key={parcel.parcelId}>
                  <button
                    type="button"
                    disabled={busy !== null || world.city.civicCapacity < parcel.expansionCost}
                    onClick={() => void submitExpansion(parcel)}
                  >
                    <strong>Open {parcel.name}</strong>
                    <span>{parcel.expansionCost} civic capacity</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="residents-heading">
            <h2 id="residents-heading">Residents on the move</h2>
            <table className="residents" data-testid="residents">
              <thead>
                <tr>
                  <th>Resident</th>
                  <th>Identity</th>
                  <th>Activity</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(scene.residents).map((resident) => (
                  <tr key={resident.residentId}>
                    <td>
                      <strong>{resident.displayName}</strong>
                    </td>
                    <td>
                      {resident.kind === "ai" ? "AI" : "Human"} · {resident.role}
                    </td>
                    <td>{resident.activity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section aria-labelledby="activity-heading">
            <h2 id="activity-heading">Committed history</h2>
            <ul className="activity" data-testid="activity">
              {[...world.activity].reverse().map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    data-event-id={item.id}
                    aria-current={selectedEvent?.id === item.id}
                    onClick={() => setSelectedEvent(item)}
                  >
                    <span>{item.summary}</span>
                    <small>
                      {item.sequence}:{item.eventSeq}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
            {selectedEvent && (
              <div className="event-detail">
                <h3>Event detail</h3>
                <strong>{selectedEvent.eventType}</strong>
                <p>{selectedEvent.summary}</p>
              </div>
            )}
          </section>
        </div>
      </details>
    </div>
  );
}
