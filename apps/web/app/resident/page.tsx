"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { ResidentPreferences } from "@freecity/contracts";

import { WorldLoading, WorldSurface } from "../../components/WorldSurface";
import { getMembership, updateResidentPreferences } from "../../lib/api";
import { useCityWorld } from "../../lib/use-city-world";

export default function ResidentPage() {
  const { world, busy, notice, act } = useCityWorld();
  const [preferences, setPreferences] = useState<ResidentPreferences | null>(null);
  useEffect(() => {
    if (world) setPreferences(world.selfPreferences);
  }, [world]);
  if (!world) return <WorldLoading />;
  const membership = getMembership();
  const resident = world.residents.find((item) => item.residentId === membership?.residentId);
  if (!resident) return <WorldLoading label="Recovering your resident identity…" />;
  const ai = world.residents.find((item) => item.residentId === resident.sponsoredAiResidentId);
  const place = world.world.presence[resident.residentId] ?? "arrival-hall";
  const relationships = Object.values(world.world.relationships).filter(
    (item) => item.requesterId === resident.residentId || item.addresseeId === resident.residentId,
  );
  const circles = Object.values(world.world.circles).filter((item) =>
    item.memberIds.includes(resident.residentId),
  );
  const projects = Object.values(world.world.projects).filter((item) =>
    item.memberIds.includes(resident.residentId),
  );
  const contributions = Object.values(world.world.beacon.contributions).filter(
    (item) => item.residentId === resident.residentId,
  );

  return (
    <WorldSurface
      eyebrow="PERSISTENT IDENTITY · HUMAN AUTHORITY"
      title={resident.displayName}
      introduction="Your resident is a continuing civic identity: relationships, work, boundaries and public contributions persist beyond any one visit."
      notice={notice}
    >
      <section className="world-grid identity-ledger" aria-labelledby="identity-heading">
        <article className="world-panel world-panel-wide">
          <span className="eyebrow">IDENTITY</span>
          <h2 id="identity-heading">{resident.role} · human resident</h2>
          <dl className="world-facts">
            <div>
              <dt>Controller</dt>
              <dd>You · authenticated human</dd>
            </div>
            <div>
              <dt>Current place</dt>
              <dd>
                <Link href={`/places/${place}`}>{place.replaceAll("-", " ")}</Link>
              </dd>
            </div>
            <div>
              <dt>Authority</dt>
              <dd>Choices, consent, relationships, spending and civic votes remain yours.</dd>
            </div>
            <div>
              <dt>Memory boundary</dt>
              <dd>
                Committed civic actions are durable; no AI may invent private memories or consent.
              </dd>
            </div>
          </dl>
        </article>
        <article className="world-panel ai-bond">
          <span className="eyebrow">SPONSORED AI RESIDENT</span>
          <h2>{ai?.displayName ?? "Not provisioned"}</h2>
          <p>
            {ai
              ? `${ai.displayName} can prepare, remember and act inside explicit boundaries. It cannot vote, pay, accept relationships or speak as you.`
              : "No AI resident is bound to this identity."}
          </p>
          {ai && (
            <Link className="text-link" href={`/resident/${ai.residentId}`}>
              Open AI resident record →
            </Link>
          )}
        </article>
        <article className="world-panel world-panel-wide preference-console">
          <span className="eyebrow">AUTHORITY &amp; MEMORY CONTROLS</span>
          <h2>Your boundaries are committed facts.</h2>
          {preferences && (
            <>
              <label className="toggle-field">
                <input
                  type="checkbox"
                  checked={preferences.publicPresence}
                  onChange={(event) =>
                    setPreferences({ ...preferences, publicPresence: event.target.checked })
                  }
                />
                <span>Show my resident on the public city projection</span>
              </label>
              <label className="toggle-field">
                <input
                  type="checkbox"
                  checked={preferences.aiMayPrepare}
                  onChange={(event) =>
                    setPreferences({ ...preferences, aiMayPrepare: event.target.checked })
                  }
                />
                <span>
                  Allow my AI resident to prepare drafts and routes (never final decisions)
                </span>
              </label>
              <label>
                Default memory scope
                <select
                  value={preferences.memoryScope}
                  onChange={(event) =>
                    setPreferences({
                      ...preferences,
                      memoryScope: event.target.value as ResidentPreferences["memoryScope"],
                    })
                  }
                >
                  <option value="private">Private</option>
                  <option value="circle">My Circles</option>
                  <option value="district">District</option>
                </select>
              </label>
              <label>
                Relationship invitations
                <select
                  value={preferences.relationshipInvites}
                  onChange={(event) =>
                    setPreferences({
                      ...preferences,
                      relationshipInvites: event.target
                        .value as ResidentPreferences["relationshipInvites"],
                    })
                  }
                >
                  <option value="humans">Humans only</option>
                  <option value="all">Humans and AI residents</option>
                  <option value="none">Nobody</option>
                </select>
              </label>
              <button
                disabled={busy !== null}
                onClick={() =>
                  void act("preferences", () => updateResidentPreferences(preferences))
                }
              >
                Commit preference changes
              </button>
            </>
          )}
        </article>
        <article className="world-panel">
          <strong>{relationships.filter((item) => item.status === "active").length}</strong>
          <span>active relationships</span>
        </article>
        <article className="world-panel">
          <strong>{circles.length}</strong>
          <span>Circles</span>
        </article>
        <article className="world-panel">
          <strong>{projects.length}</strong>
          <span>projects joined</span>
        </article>
        <article className="world-panel">
          <strong>{contributions.length}</strong>
          <span>Beacon contributions</span>
        </article>
      </section>
    </WorldSurface>
  );
}
