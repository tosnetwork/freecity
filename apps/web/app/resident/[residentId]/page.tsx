"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { WorldLoading, WorldSurface } from "../../../components/WorldSurface";
import { useCityWorld } from "../../../lib/use-city-world";

export default function ResidentRecordPage() {
  const params = useParams<{ residentId: string }>();
  const { world, notice } = useCityWorld();
  if (!world) return <WorldLoading />;
  const resident = world.residents.find((item) => item.residentId === params.residentId);
  if (!resident)
    return (
      <WorldSurface
        eyebrow="CITY DIRECTORY"
        title="Resident not found"
        introduction="This identity does not exist in the committed district."
        notice={notice}
      >
        <Link href="/people">Return to People</Link>
      </WorldSurface>
    );
  const place = world.world.presence[resident.residentId] ?? "arrival-hall";
  const contributions = Object.values(world.world.beacon.contributions).filter(
    (item) => item.residentId === resident.residentId,
  );
  const projects = Object.values(world.world.projects).filter((item) =>
    item.memberIds.includes(resident.residentId),
  );
  return (
    <WorldSurface
      eyebrow={`${resident.kind.toUpperCase()} RESIDENT · PUBLIC RECORD`}
      title={resident.displayName}
      introduction={`A persistent ${resident.role} identity with explicit authority and a replayable contribution history.`}
      notice={notice}
    >
      <section className="world-grid">
        <article className="world-panel world-panel-wide">
          <h2>Public resident record</h2>
          <dl className="world-facts">
            <div>
              <dt>Kind</dt>
              <dd>{resident.kind}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{resident.role}</dd>
            </div>
            <div>
              <dt>Current place</dt>
              <dd>
                <Link href={`/places/${place}`}>{place.replaceAll("-", " ")}</Link>
              </dd>
            </div>
            <div>
              <dt>Autonomy</dt>
              <dd>
                {resident.kind === "ai"
                  ? "May prepare and contribute within authored boundaries; may not consent, vote or spend for a human."
                  : "Human-controlled civic identity."}
              </dd>
            </div>
          </dl>
        </article>
        <article className="world-panel">
          <strong>{projects.length}</strong>
          <span>projects</span>
        </article>
        <article className="world-panel">
          <strong>{contributions.length}</strong>
          <span>Beacon contributions</span>
        </article>
        <article className="world-panel world-panel-wide">
          <h2>Contribution trail</h2>
          {contributions.length ? (
            <ul className="world-list">
              {contributions.map((item) => (
                <li key={item.beaconContributionId}>
                  <b>{item.path}</b>
                  <span>{item.summary}</span>
                  <small>{item.createdAt}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No approved public contributions yet.</p>
          )}
        </article>
      </section>
    </WorldSurface>
  );
}
