"use client";

import Link from "next/link";
import { useState } from "react";

import { WorldLoading, WorldSurface } from "../../components/WorldSurface";
import {
  cancelRelationship,
  createCircle,
  getMembership,
  inviteRelationship,
  inviteToCircle,
  repairRelationship,
  respondCircle,
  respondRelationship,
} from "../../lib/api";
import { useCityWorld } from "../../lib/use-city-world";

export default function PeoplePage() {
  const { world, busy, notice, act } = useCityWorld();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "human" | "ai">("all");
  const [circleName, setCircleName] = useState("");
  const [circlePurpose, setCirclePurpose] = useState("");
  if (!world) return <WorldLoading />;
  const me = getMembership()?.residentId ?? "";
  const residents = world.residents.filter(
    (resident) =>
      resident.residentId !== me &&
      (kind === "all" || resident.kind === kind) &&
      `${resident.displayName} ${resident.role}`.toLowerCase().includes(query.toLowerCase()),
  );
  const relationships = Object.values(world.world.relationships);
  const circles = Object.values(world.world.circles);

  const relationshipWith = (residentId: string) =>
    relationships.find(
      (item) =>
        (item.requesterId === me && item.addresseeId === residentId) ||
        (item.requesterId === residentId && item.addresseeId === me),
    );

  return (
    <WorldSurface
      eyebrow="PEOPLE · CONSENT · SMALL GROUPS"
      title="Meet the residents who make the city real."
      introduction="Every name here is a committed human or AI identity. Relationships require an invitation and consent; Circles become active with 3–6 members."
      notice={notice}
    >
      <section className="world-toolbar" aria-label="Directory filters">
        <label>
          Search
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or role"
          />
        </label>
        <label>
          Resident type
          <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
            <option value="all">Everyone</option>
            <option value="human">Humans</option>
            <option value="ai">AI residents</option>
          </select>
        </label>
      </section>
      <section className="resident-directory" aria-label="Resident directory">
        {residents.map((resident) => {
          const relationship = relationshipWith(resident.residentId);
          const inbound = relationship?.status === "pending" && relationship.addresseeId === me;
          return (
            <article className="world-panel resident-card" key={resident.residentId}>
              <span className={`resident-glyph kind-${resident.kind}`}>
                {resident.displayName.slice(0, 1)}
              </span>
              <div>
                <span className="eyebrow">
                  {resident.kind} · {resident.role}
                </span>
                <h2>
                  <Link href={`/resident/${resident.residentId}`}>{resident.displayName}</Link>
                </h2>
                <p>
                  {world.world.presence[resident.residentId]?.replaceAll("-", " ") ??
                    "arrival hall"}
                </p>
              </div>
              <div className="world-actions">
                {!relationship && (
                  <button
                    disabled={busy !== null}
                    onClick={() =>
                      void act(`invite:${resident.residentId}`, () =>
                        inviteRelationship(
                          resident.residentId,
                          `Let’s build something in District Zero.`,
                        ),
                      )
                    }
                  >
                    Invite relationship
                  </button>
                )}
                {inbound && (
                  <>
                    <button
                      disabled={busy !== null}
                      onClick={() =>
                        void act(`accept:${relationship.relationshipId}`, () =>
                          respondRelationship(relationship.relationshipId, "accept"),
                        )
                      }
                    >
                      Accept
                    </button>
                    <button
                      disabled={busy !== null}
                      onClick={() =>
                        void act(`decline:${relationship.relationshipId}`, () =>
                          respondRelationship(relationship.relationshipId, "decline"),
                        )
                      }
                    >
                      Decline
                    </button>
                  </>
                )}
                {relationship?.status === "pending" && relationship.requesterId === me && (
                  <button
                    disabled={busy !== null}
                    onClick={() =>
                      void act(`cancel:${relationship.relationshipId}`, () =>
                        cancelRelationship(relationship.relationshipId),
                      )
                    }
                  >
                    Cancel invitation
                  </button>
                )}
                {relationship?.status === "active" && (
                  <button
                    disabled={busy !== null}
                    onClick={() =>
                      void act(`repair:${relationship.relationshipId}`, () =>
                        repairRelationship(
                          relationship.relationshipId,
                          "I listened, clarified the boundary and chose to rebuild trust.",
                        ),
                      )
                    }
                  >
                    Repair relationship
                  </button>
                )}
                {circles
                  .filter(
                    (circle) =>
                      circle.memberIds.includes(me) &&
                      circle.memberIds.length < 6 &&
                      !circle.memberIds.includes(resident.residentId) &&
                      !circle.invitedResidentIds.includes(resident.residentId),
                  )
                  .map((circle) => (
                    <button
                      key={circle.circleId}
                      disabled={busy !== null}
                      onClick={() =>
                        void act(`circle-invite:${circle.circleId}:${resident.residentId}`, () =>
                          inviteToCircle(circle.circleId, resident.residentId),
                        )
                      }
                    >
                      Invite to {circle.name}
                    </button>
                  ))}
              </div>
            </article>
          );
        })}
      </section>
      <section className="world-grid circle-section">
        <article className="world-panel">
          <span className="eyebrow">FOUND A CIRCLE</span>
          <h2>Start small, then invite.</h2>
          <label>
            Name
            <input
              value={circleName}
              onChange={(event) => setCircleName(event.target.value)}
              maxLength={60}
            />
          </label>
          <label>
            Shared purpose
            <input
              value={circlePurpose}
              onChange={(event) => setCirclePurpose(event.target.value)}
              maxLength={280}
            />
          </label>
          <button
            disabled={busy !== null || !circleName.trim() || !circlePurpose.trim()}
            onClick={() =>
              void act("circle-create", () =>
                createCircle(circleName.trim(), circlePurpose.trim()),
              ).then((ok) => {
                if (ok) {
                  setCircleName("");
                  setCirclePurpose("");
                }
              })
            }
          >
            Create forming Circle
          </button>
        </article>
        {circles.map((circle) => {
          const invited = circle.invitedResidentIds.includes(me);
          return (
            <article className="world-panel" key={circle.circleId}>
              <span className="eyebrow">
                {circle.memberIds.length >= 3 ? "ACTIVE CIRCLE" : "FORMING · NEEDS 3 MEMBERS"}
              </span>
              <h2>{circle.name}</h2>
              <p>{circle.purpose}</p>
              <p>
                {circle.memberIds
                  .map(
                    (id) =>
                      world.residents.find((resident) => resident.residentId === id)?.displayName ??
                      id,
                  )
                  .join(" · ")}
              </p>
              {invited && (
                <div className="world-actions">
                  <button
                    onClick={() =>
                      void act(`circle-accept:${circle.circleId}`, () =>
                        respondCircle(circle.circleId, "accept"),
                      )
                    }
                  >
                    Join Circle
                  </button>
                  <button
                    onClick={() =>
                      void act(`circle-decline:${circle.circleId}`, () =>
                        respondCircle(circle.circleId, "decline"),
                      )
                    }
                  >
                    Decline
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </WorldSurface>
  );
}
