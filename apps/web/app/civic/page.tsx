"use client";

import { useState } from "react";

import { WorldLoading, WorldSurface } from "../../components/WorldSurface";
import { castCivicVote, declareCandidacy, fileCivicChallenge, getMembership } from "../../lib/api";
import { useCityWorld } from "../../lib/use-city-world";

export default function CivicPage() {
  const { world, busy, notice, act } = useCityWorld();
  const [statement, setStatement] = useState("");
  const [challenge, setChallenge] = useState("");
  if (!world) return <WorldLoading />;
  const me = getMembership()?.residentId ?? "";
  const civic = world.world.civic;
  const election = civic.election;
  const candidates = Object.values(election.candidates);
  const humanCount = world.residents.filter((resident) => resident.kind === "human").length;
  const nameOf = (id: string | null) =>
    id
      ? (world.residents.find((resident) => resident.residentId === id)?.displayName ?? id)
      : "Vacant";
  const hasContributed = Object.values(world.world.beacon.contributions).some(
    (item) => item.residentId === me,
  );
  return (
    <WorldSurface
      eyebrow="CIVIC · BOUNDED OFFICE · ONE RESIDENT, ONE VOTE"
      title="Power must be legible before it is playable."
      introduction="The founding cohort elects one District Steward. The office can coordinate an agenda and reviews; it cannot move assets, censor history or override city rules."
      notice={notice}
    >
      <section className="world-grid civic-grid">
        <article className="world-panel world-panel-wide">
          <span className="eyebrow">OFFICE CHARTER</span>
          <h2>{civic.office.title}</h2>
          <p>
            Current holder: <strong>{nameOf(civic.office.holderResidentId)}</strong> · 30-day term
          </p>
          <div className="charter-columns">
            <div>
              <h3>Powers</h3>
              <ul>
                {civic.office.powers.map((power) => (
                  <li key={power}>{power}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Hard limits</h3>
              <ul>
                {civic.office.limits.map((limit) => (
                  <li key={limit}>{limit}</li>
                ))}
              </ul>
            </div>
          </div>
        </article>
        <article className="world-panel civic-status">
          <span className="eyebrow">FOUNDING ELECTION · {election.phase}</span>
          <h2>
            {humanCount}/{election.quorum} human residents
          </h2>
          <p>
            {election.phase === "forming"
              ? `The election opens automatically when ${election.quorum} real human residents have entered. No candidates or votes are fabricated.`
              : election.phase === "open"
                ? `Voting closes ${election.closesAt}. Token holdings provide no voting weight.`
                : election.phase === "challenge"
                  ? `Challenges close ${election.challengeEndsAt}.`
                  : `Result: ${election.resultStatus.replace("_", " ")}.`}
          </p>
        </article>
        <article className="world-panel">
          <span className="eyebrow">ELIGIBILITY</span>
          <h2>{hasContributed ? "Contribution gate met" : "Contribution required"}</h2>
          <p>
            A human candidate must first have one approved Beacon contribution. AI residents cannot
            hold this office in the founding cohort.
          </p>
          {election.phase === "open" && !election.candidates[me] && (
            <div className="inline-form">
              <label>
                Campaign statement
                <textarea
                  value={statement}
                  onChange={(event) => setStatement(event.target.value)}
                />
              </label>
              <button
                disabled={busy !== null || !statement.trim()}
                onClick={() => void act("candidacy", () => declareCandidacy(statement.trim()))}
              >
                Declare candidacy
              </button>
            </div>
          )}
        </article>
        <article className="world-panel world-panel-wide">
          <span className="eyebrow">BALLOT</span>
          <h2>One resident, one vote.</h2>
          {candidates.length === 0 ? (
            <p className="muted">No committed candidates yet.</p>
          ) : (
            <ul className="world-list ballot-list">
              {candidates.map((candidate) => (
                <li key={candidate.residentId}>
                  <div>
                    <b>{nameOf(candidate.residentId)}</b>
                    <span>{candidate.statement}</span>
                  </div>
                  <button
                    disabled={
                      busy !== null || election.phase !== "open" || Boolean(election.votes[me])
                    }
                    onClick={() =>
                      void act(`vote:${candidate.residentId}`, () =>
                        castCivicVote(candidate.residentId),
                      )
                    }
                  >
                    {election.votes[me] ? "Vote already cast" : "Cast vote"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
        {election.phase === "challenge" && (
          <article className="world-panel world-panel-wide">
            <span className="eyebrow">CHALLENGE WINDOW</span>
            <h2>Contest the process with a reason.</h2>
            <textarea value={challenge} onChange={(event) => setChallenge(event.target.value)} />
            <button
              disabled={busy !== null || !challenge.trim()}
              onClick={() => void act("challenge", () => fileCivicChallenge(challenge.trim()))}
            >
              File challenge
            </button>
          </article>
        )}
      </section>
    </WorldSurface>
  );
}
