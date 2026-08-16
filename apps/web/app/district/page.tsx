"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  applyEventView,
  createWorldState,
  streamDistrictEvents,
  type ActivityItem,
  type RendererAdapter,
  type StreamStatus,
  type WorldState,
} from "@freecity/client-world";

import { apiOrigin, getToken } from "../../lib/api";
import { createPixiRenderer } from "../../lib/pixi-renderer";

const PROJECTION_PREF_KEY = "freecity_projection_disabled";

export default function DistrictPage() {
  const [world, setWorld] = useState<WorldState>(createWorldState);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [projectionDisabled, setProjectionDisabled] = useState(true);
  const [prefLoaded, setPrefLoaded] = useState(false);
  const [selected, setSelected] = useState<ActivityItem | null>(null);
  const [projectionFailed, setProjectionFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<RendererAdapter | null>(null);
  const worldRef = useRef(world);
  worldRef.current = world;

  // Projection preference (default: enabled unless the user disabled it).
  useEffect(() => {
    setProjectionDisabled(window.localStorage.getItem(PROJECTION_PREF_KEY) === "1");
    setPrefLoaded(true);
  }, []);

  const toggleProjection = useCallback((disabled: boolean) => {
    setProjectionDisabled(disabled);
    window.localStorage.setItem(PROJECTION_PREF_KEY, disabled ? "1" : "0");
  }, []);

  // Committed event stream → semantic world state. No client-side commit:
  // this is a read-only projection of the server's event log.
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

  // Renderer lifecycle, honoring the disable toggle and reduced motion.
  useEffect(() => {
    if (!prefLoaded || projectionDisabled) return;
    const container = containerRef.current;
    if (!container) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = createPixiRenderer();
    rendererRef.current = renderer;
    let cancelled = false;
    setProjectionFailed(false);
    void Promise.resolve(renderer.mount(container, { reducedMotion }))
      .then(() => {
        if (!cancelled) renderer.update(worldRef.current);
      })
      .catch(() => {
        // Renderer failure must never block the product (Runtime §14): the
        // accessible DOM view carries every fact.
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

  useEffect(() => {
    rendererRef.current?.update(world);
  }, [world]);

  const residents = Object.values(world.residents).sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );

  return (
    <>
      <h1>District Zero</h1>
      <p className="muted">
        Live view of committed district activity. Stream:{" "}
        <span data-testid="stream-status">{status}</span>
        {" · "}
        <label>
          <input
            type="checkbox"
            checked={projectionDisabled}
            onChange={(e) => toggleProjection(e.target.checked)}
          />{" "}
          Disable visual projection (accessible view only)
        </label>
      </p>

      <div className={`district-layout${projectionDisabled ? "" : " with-projection"}`}>
        {!projectionDisabled && (
          <div>
            <div
              ref={containerRef}
              className="projection"
              role="img"
              aria-label="Decorative district projection. All information is available in the resident table and activity list."
            />
            {projectionFailed && (
              <p className="muted" data-testid="projection-failed">
                The visual projection could not start on this device. Everything continues in the
                accessible view.
              </p>
            )}
          </div>
        )}

        <div>
          <section aria-labelledby="residents-heading">
            <h2 id="residents-heading">Residents</h2>
            <table className="residents" data-testid="residents">
              <thead>
                <tr>
                  <th scope="col">Resident</th>
                  <th scope="col">Kind</th>
                  <th scope="col">Role</th>
                  <th scope="col">Focus</th>
                  <th scope="col">Cards</th>
                </tr>
              </thead>
              <tbody>
                {residents.map((resident) => (
                  <tr key={resident.residentId}>
                    <td>{resident.displayName}</td>
                    <td>{resident.kind === "ai" ? "AI" : "Human"}</td>
                    <td style={{ textTransform: "capitalize" }}>{resident.role}</td>
                    <td>{resident.focus}</td>
                    <td>{resident.activeCardCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section aria-labelledby="activity-heading">
            <h2 id="activity-heading">Activity</h2>
            <ul className="activity" data-testid="activity">
              {[...world.activity].reverse().map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    data-event-id={item.id}
                    aria-current={selected?.id === item.id}
                    onClick={() => setSelected(item)}
                  >
                    {item.summary}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {selected !== null && (
            <section aria-labelledby="detail-heading">
              <h2 id="detail-heading">Event detail</h2>
              <p>
                <strong>{selected.eventType}</strong> — committed as event {selected.id}
              </p>
              <p>{selected.summary}</p>
              <details>
                <summary>Raw committed event</summary>
                <pre>{JSON.stringify(selected.event, null, 2)}</pre>
              </details>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
