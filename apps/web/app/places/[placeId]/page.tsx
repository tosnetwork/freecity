"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import type { PlaceId } from "@freecity/contracts";

import { WorldLoading, WorldSurface } from "../../../components/WorldSurface";
import { getMembership, visitPlace } from "../../../lib/api";
import { useCityWorld } from "../../../lib/use-city-world";

const PLACES: Record<PlaceId, { name: string; promise: string; description: string }> = {
  "arrival-hall": {
    name: "Arrival Hall",
    promise: "Identity begins here.",
    description:
      "The public threshold where humans and AI receive a persistent resident record and explicit authority boundaries.",
  },
  "signal-garden": {
    name: "Signal Garden",
    promise: "Relationships become signals.",
    description: "A consent-aware place for introductions, repair and shared memory.",
  },
  workshop: {
    name: "Night Workshop",
    promise: "Work leaves evidence.",
    description:
      "Builders, mediators and AI collaborators repair the city through claimable tasks and reviewed contributions.",
  },
  studio: {
    name: "Echo Studio",
    promise: "Creation becomes public culture.",
    description: "Creators turn committed city history into artifacts and exhibitions.",
  },
  "beacon-square": {
    name: "Beacon Square",
    promise: "Contribution lights the city.",
    description:
      "Five paths—relationship, project, creation, Circle and civic—combine into one public measure of collective life.",
  },
  market: {
    name: "Commons Market",
    promise: "Needs meet accountable offers.",
    description: "A market for scoped collaboration with provenance and honest payment readiness.",
  },
  "civic-hall": {
    name: "Civic Hall",
    promise: "Power has a charter and a clock.",
    description:
      "The bounded District Steward office, eligibility, ballot, challenge window and result live here.",
  },
  archive: {
    name: "Archive",
    promise: "History can be replayed.",
    description:
      "Committed choices, relationships, projects, artifacts, exchange and civic outcomes remain inspectable.",
  },
};

export default function PlacePage() {
  const params = useParams<{ placeId: string }>();
  const { world, busy, notice, act } = useCityWorld();
  if (!world) return <WorldLoading />;
  const placeId = params.placeId as PlaceId;
  const place = PLACES[placeId];
  if (!place)
    return (
      <WorldSurface
        eyebrow="CITY PLACE"
        title="Place not found"
        introduction="This location is not on the committed District Zero map."
        notice={notice}
      >
        <Link href="/district">Return to District</Link>
      </WorldSurface>
    );
  const me = getMembership()?.residentId ?? "";
  const here = world.residents.filter(
    (resident) => (world.world.presence[resident.residentId] ?? "arrival-hall") === placeId,
  );
  const projects = Object.values(world.world.projects).filter(
    (project) => project.placeId === placeId,
  );
  const current = (world.world.presence[me] ?? "arrival-hall") === placeId;
  return (
    <WorldSurface
      eyebrow="STABLE CITY PLACE"
      title={place.name}
      introduction={`${place.promise} ${place.description}`}
      notice={notice}
    >
      <section className="world-grid">
        <article className="world-panel world-panel-wide">
          <span className="eyebrow">PRESENCE</span>
          <h2>{here.length} committed residents here</h2>
          <p>{here.map((resident) => resident.displayName).join(" · ") || "The place is quiet."}</p>
          <button
            disabled={busy !== null || current}
            onClick={() => void act(`visit:${placeId}`, () => visitPlace(placeId))}
          >
            {current ? "You are here" : `Go to ${place.name}`}
          </button>
        </article>
        {projects.map((project) => (
          <article className="world-panel" key={project.projectId}>
            <span className="eyebrow">PROJECT AT THIS PLACE</span>
            <h2>{project.title}</h2>
            <p>{project.description}</p>
            <Link className="text-link" href={`/projects/${project.projectId}`}>
              Open project →
            </Link>
          </article>
        ))}
        {placeId === "beacon-square" && (
          <article className="world-panel beacon-panel">
            <span className="eyebrow">BEACON LEVEL {world.world.beacon.level}</span>
            <h2>{Object.keys(world.world.beacon.contributions).length} approved signals</h2>
            <dl className="beacon-paths">
              {Object.entries(world.world.beacon.totals).map(([path, total]) => (
                <div key={path}>
                  <dt>{path}</dt>
                  <dd>{total}</dd>
                </div>
              ))}
            </dl>
          </article>
        )}
      </section>
    </WorldSurface>
  );
}
