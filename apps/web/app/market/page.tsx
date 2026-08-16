"use client";

import { useState } from "react";

import { WorldLoading, WorldSurface } from "../../components/WorldSurface";
import {
  createMarketNeed,
  getMembership,
  respondMarketProposal,
  submitMarketProposal,
} from "../../lib/api";
import { useCityWorld } from "../../lib/use-city-world";

export default function MarketPage() {
  const { world, busy, notice, act } = useCityWorld();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [proposal, setProposal] = useState<Record<string, string>>({});
  if (!world) return <WorldLoading />;
  const me = getMembership()?.residentId ?? "";
  const nameOf = (id: string) =>
    world.residents.find((resident) => resident.residentId === id)?.displayName ?? id;
  const proposals = Object.values(world.world.market.proposals);
  return (
    <WorldSurface
      eyebrow="MARKET · NEEDS · OFFERS · PROVENANCE"
      title="Exchange begins with a real need."
      introduction="This cohort supports free collaboration proposals. TOS and stablecoin settlement remain visibly unavailable until wallet, quote, signature, receipt and dispute gates are connected."
      notice={notice}
    >
      <aside className="readiness-banner" role="note">
        <strong>PAYMENT READINESS · UNAVAILABLE</strong>
        <span>{world.world.market.paymentReason}</span>
        <button disabled title="No payment command exists in this build">
          Pay with TOS / stablecoin
        </button>
      </aside>
      <section className="world-grid">
        <article className="world-panel market-create">
          <span className="eyebrow">POST A NEED</span>
          <h2>Ask the city for help.</h2>
          <label>
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
            />
          </label>
          <label>
            Scope
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
            />
          </label>
          <button
            disabled={busy !== null || !title.trim() || !description.trim()}
            onClick={() =>
              void act("create-need", () =>
                createMarketNeed(title.trim(), description.trim()),
              ).then((ok) => {
                if (ok) {
                  setTitle("");
                  setDescription("");
                }
              })
            }
          >
            Post free collaboration
          </button>
        </article>
        {Object.values(world.world.market.needs).map((need) => {
          const needProposals = proposals.filter((item) => item.needId === need.needId);
          const mine = need.creatorId === me;
          return (
            <article className="world-panel market-need" key={need.needId}>
              <span className="eyebrow">
                {need.mode} · {need.status}
              </span>
              <h2>{need.title}</h2>
              <p>{need.description}</p>
              <small>Requested by {nameOf(need.creatorId)}</small>
              {need.status === "open" && !mine && (
                <div className="inline-form">
                  <label>
                    Your proposal
                    <textarea
                      value={proposal[need.needId] ?? ""}
                      onChange={(event) =>
                        setProposal((current) => ({
                          ...current,
                          [need.needId]: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    disabled={busy !== null || !(proposal[need.needId] ?? "").trim()}
                    onClick={() =>
                      void act(`proposal:${need.needId}`, () =>
                        submitMarketProposal(need.needId, proposal[need.needId]!.trim()),
                      ).then((ok) => {
                        if (ok) setProposal((current) => ({ ...current, [need.needId]: "" }));
                      })
                    }
                  >
                    Propose collaboration
                  </button>
                </div>
              )}
              <ul className="world-list">
                {needProposals.map((item) => (
                  <li key={item.proposalId}>
                    <div>
                      <b>{item.summary}</b>
                      <span>
                        {nameOf(item.proposerId)} · {item.status}
                      </span>
                    </div>
                    {mine && item.status === "proposed" && (
                      <div className="world-actions">
                        <button
                          onClick={() =>
                            void act(`accept:${item.proposalId}`, () =>
                              respondMarketProposal(item.proposalId, "accept"),
                            )
                          }
                        >
                          Accept
                        </button>
                        <button
                          onClick={() =>
                            void act(`decline:${item.proposalId}`, () =>
                              respondMarketProposal(item.proposalId, "decline"),
                            )
                          }
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>
    </WorldSurface>
  );
}
