"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { CardInstance } from "@freecity/contracts";
import { summarizeCommittedViews } from "@freecity/client-world";

import {
  ackToday,
  chooseOption,
  declineCard,
  ensureMembership,
  fetchToday,
  getMembership,
  isNotAResident,
  type CommandResponse,
  type TodayResponse,
} from "../../lib/api";
import { CitySky } from "../../components/CitySky";
import { outcomeFor, storyForCard, storyForCardId, type ChoiceOutcomeStory } from "../../lib/story";

const FAMILY_LABEL: Record<string, string> = {
  relationship: "Relationship",
  opportunity: "Opportunity",
  creation: "Creation",
  conflict_repair: "Conflict & repair",
  discovery: "Discovery",
  district_civic: "District",
};

type PendingAction = { cardId: string; kind: "choose" | "decline"; optionId?: string };

function ReturnCue({ dueAt, cardId }: { dueAt: string; cardId: string }) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    const update = () => {
      const milliseconds = Math.max(0, new Date(dueAt).getTime() - Date.now());
      const minutes = Math.floor(milliseconds / 60_000);
      const seconds = Math.floor((milliseconds % 60_000) / 1000);
      setRemaining(milliseconds === 0 ? "resolving now" : `${minutes}m ${seconds}s`);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [dueAt]);

  const story = storyForCardId(cardId);
  return (
    <li className={`return-cue tone-${story.tone}`}>
      <span className="return-pulse" aria-hidden="true" />
      <div>
        <span className="eyebrow">A CONSEQUENCE IS TRAVELLING</span>
        <strong>
          {story.place} will answer in {remaining || "…"}
        </strong>
        <p>Mira will meet you there. The result will enter the city’s permanent history.</p>
      </div>
    </li>
  );
}

export default function TodayPage() {
  const router = useRouter();
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reaction, setReaction] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [worldChange, setWorldChange] = useState<ChoiceOutcomeStory | null>(null);
  const [loading, setLoading] = useState(true);

  // One load at a time: strict-mode double effects and rapid refreshes must
  // not race a fetch against the ack of a previous fetch.
  const loadInFlight = useRef(false);
  const load = useCallback(async () => {
    if (loadInFlight.current) return;
    loadInFlight.current = true;
    try {
      // Recover the membership identity if local storage lost it (sign-out /
      // sign-in) so WYWA summaries can always resolve the display name.
      await ensureMembership();
      const response = await fetchToday();
      setToday(response);
      // Acknowledge explicitly after the list is in hand — reading Today has
      // no side effect, so a refresh before this ack still shows the list.
      if (response.whileYouWereAway.length > 0) {
        await ackToday(response.lastSequence);
      }
    } catch (error) {
      if (isNotAResident(error)) {
        router.replace("/enter");
        return;
      }
      throw error;
    } finally {
      loadInFlight.current = false;
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  function describeRejection(result: CommandResponse): string {
    const code = result.result?.code ?? "REJECTED";
    switch (code) {
      case "CARD_EXPIRED":
        return "This card expired before the choice arrived.";
      case "INSUFFICIENT_FOCUS":
        return "Not enough Focus for that option today.";
      case "CARD_NOT_FOUND":
        return "This card was already resolved.";
      default:
        return `The district declined this action (${code}).`;
    }
  }

  async function act(card: CardInstance, kind: "choose" | "decline", optionId?: string) {
    setPending({ cardId: card.cardId, kind, ...(optionId ? { optionId } : {}) });
    setReaction(null);
    setNotice(null);
    setWorldChange(null);
    try {
      const response =
        kind === "choose" && optionId
          ? await chooseOption(card.cardId, optionId)
          : await declineCard(card.cardId);
      if (response.status === "applied") {
        if (kind === "choose" && optionId) {
          const option = card.options.find((o) => o.optionId === optionId);
          // The reaction text is the authored content the committed
          // ImmediateReactionRecorded event carries — shown only now, after
          // the authoritative result confirmed the choice.
          setReaction(option?.reactionText ?? "Your choice is committed.");
          setWorldChange(outcomeFor(card.cardId, optionId));
        } else {
          setNotice("Declined. Declining is a valid action; nothing was lost.");
        }
        await load(); // authoritative Focus, cards, and WYWA
      } else {
        setNotice(describeRejection(response));
        await load();
      }
    } catch {
      setNotice("The request did not complete. Nothing was committed twice — try again.");
    } finally {
      setPending(null);
    }
  }

  if (loading) return <p>Loading Today…</p>;
  if (!today) return <p role="alert">Today could not be loaded.</p>;

  const membership = getMembership();
  // Reduce the WYWA views in order, pre-seeded with this resident's identity
  // so summaries show display names even after the provisioning events were
  // acknowledged away — never raw resident ids.
  const wywaItems = summarizeCommittedViews(
    today.whileYouWereAway,
    membership
      ? [
          {
            residentId: membership.residentId,
            displayName: membership.displayName,
            kind: "human",
            role: membership.role,
          },
        ]
      : [],
  );

  return (
    <div className="today-shell">
      <section className="city-dashboard-hero" aria-labelledby="today-heading">
        <CitySky compact />
        <div className="city-dashboard-copy">
          <span className="eyebrow">DISTRICT ZERO · A LIVING DAY</span>
          <h1 id="today-heading">The city is already moving.</h1>
          <p>
            Boats cross the bay, workshops are open and the Signal Garden is listening. Three
            decisions can change where this city goes next.
          </p>
          <div className="hero-status-row" aria-label="Current district status">
            <span>
              <i className="live-dot" /> Beacon unstable
            </span>
            <span>
              {membership?.displayName ?? "Resident"} · {membership?.role ?? "new arrival"}
            </span>
            <span className="focus-pill">
              Focus <strong data-testid="focus">{today.focus}</strong>/3
            </span>
          </div>
        </div>
      </section>

      <section className="mira-briefing" aria-labelledby="mira-heading">
        <div className="resident-portrait mira-portrait" aria-hidden="true">
          <span className="portrait-core">M</span>
          <i />
        </div>
        <div className="mira-dialogue">
          <span className="speaker-tag">MIRA · YOUR AI RESIDENT</span>
          <h2 id="mira-heading">“You made it. I need to show you what’s at stake.”</h2>
          <p>
            Nia is holding the Beacon’s last song in the Signal Garden. Orin is keeping the east
            relay alive by hand. I can move, prepare and remember—but I won’t make your choices for
            you.
          </p>
          <div className="resident-intros">
            <div>
              <span className="resident-orb nia">N</span>
              <strong>Nia</strong>
              <small>Creator AI · Signal Garden</small>
            </div>
            <div>
              <span className="resident-orb orin">O</span>
              <strong>Orin</strong>
              <small>Builder AI · Night Workshop</small>
            </div>
            <div>
              <span className="place-orb">⌁</span>
              <strong>Beacon Square</strong>
              <small>The city’s shared memory</small>
            </div>
          </div>
        </div>
      </section>

      <section className="signal-log" aria-labelledby="wywa-heading">
        <div className="section-heading-row">
          <div>
            <span className="eyebrow">COMMITTED SIGNALS</span>
            <h2 id="wywa-heading">What changed while you were away</h2>
          </div>
          <Link href="/archive" className="text-link">
            Open city memory →
          </Link>
        </div>
        {today.whileYouWereAway.length === 0 ? (
          <p className="empty-signal">
            No new committed signals. Your pending choices are still moving.
          </p>
        ) : (
          <ul className="signal-list" data-testid="wywa">
            {wywaItems.map((item) => (
              <li key={item.id}>
                <span className="signal-index">{item.sequence.toString().padStart(2, "0")}</span>
                <span>{item.summary}</span>
                <small>committed</small>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="reaction-stage" aria-live="polite">
        {reaction !== null && (
          <div className="world-change" data-testid="reaction">
            <span className="world-change-mark" aria-hidden="true">
              ✦
            </span>
            <div>
              <span className="eyebrow">THE WORLD ANSWERED</span>
              <p className="reaction">{reaction}</p>
              {worldChange && (
                <dl>
                  <div>
                    <dt>Relationship</dt>
                    <dd>{worldChange.relationship}</dd>
                  </div>
                  <div>
                    <dt>Place</dt>
                    <dd>{worldChange.worldChange}</dd>
                  </div>
                  <div>
                    <dt>Movement</dt>
                    <dd>{worldChange.movement}</dd>
                  </div>
                </dl>
              )}
              <Link href="/district" className="primary-link">
                Watch it happen in District Zero →
              </Link>
            </div>
          </div>
        )}
        {notice !== null && <p className="notice-panel">{notice}</p>}
      </div>

      <section className="decision-section" aria-labelledby="cards-heading">
        <div className="section-heading-row">
          <div>
            <span className="eyebrow">THREE THREADS · ONE CITY</span>
            <h2 id="cards-heading">Choose what survives the night</h2>
          </div>
          <p className="section-aside">
            Focus cannot be bought.
            <br />
            Declining is always free.
          </p>
        </div>
        {today.activeCards.length === 0 ? (
          <div className="all-decided">
            <span>✦</span>
            <h3>Your decisions are in motion.</h3>
            <p>Walk the district now, then return when Mira calls you back.</p>
            <Link href="/district" className="primary-link">
              Enter the live city →
            </Link>
          </div>
        ) : (
          <div className="story-deck">
            {today.activeCards.map((card) => {
              const isPending = pending?.cardId === card.cardId;
              const story = storyForCard(card);
              return (
                <article
                  className={`card story-card tone-${story.tone}`}
                  id={`decision-${story.tone}`}
                  key={card.cardId}
                  aria-busy={isPending}
                >
                  <div className="story-card-topline">
                    <span className="family">{story.chapter}</span>
                    <span className="card-place">{story.place}</span>
                  </div>
                  <div className="story-symbol" aria-hidden="true">
                    <i />
                    <i />
                    <span />
                  </div>
                  <h3>{story.title}</h3>
                  <p className="story-body">{story.body}</p>
                  <p className="story-question">{story.question}</p>
                  <dl className="story-meta">
                    <div>
                      <dt>With</dt>
                      <dd>{story.resident}</dd>
                    </div>
                    <div>
                      <dt>Changes</dt>
                      <dd>{story.stakes}</dd>
                    </div>
                  </dl>
                  <div className="options">
                    {card.options.map((option) => (
                      <button
                        key={option.optionId}
                        className="choice-button"
                        disabled={pending !== null}
                        onClick={() => act(card, "choose", option.optionId)}
                      >
                        <span>
                          {isPending && pending?.optionId === option.optionId
                            ? "Committing to the city…"
                            : option.label}
                          {option.focusCost > 0 && <b>{option.focusCost} Focus</b>}
                        </span>
                        <small>{story.optionNotes[option.optionId]}</small>
                      </button>
                    ))}
                    <button
                      className="decline-button"
                      disabled={pending !== null}
                      onClick={() => act(card, "decline")}
                    >
                      {isPending && pending?.kind === "decline"
                        ? "Holding the boundary…"
                        : "Not mine to decide · Decline"}
                    </button>
                  </div>
                  <footer>
                    {FAMILY_LABEL[card.eventFamily] ?? card.eventFamily} signal · expires{" "}
                    {new Date(card.expiresAt).toLocaleDateString()}
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {today.pendingConsequences.length > 0 && (
        <section className="return-section" aria-labelledby="pending-heading">
          <span className="eyebrow">THE REASON TO COME BACK</span>
          <h2 id="pending-heading">Before the next light</h2>
          <ul className="return-list">
            {today.pendingConsequences.map((consequence) => (
              <ReturnCue
                key={consequence.consequenceId}
                dueAt={consequence.dueAt}
                cardId={consequence.cardId}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
