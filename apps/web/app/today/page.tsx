"use client";

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

const FAMILY_LABEL: Record<string, string> = {
  relationship: "Relationship",
  opportunity: "Opportunity",
  creation: "Creation",
  conflict_repair: "Conflict & repair",
  discovery: "Discovery",
  district_civic: "District",
};

type PendingAction = { cardId: string; kind: "choose" | "decline"; optionId?: string };

export default function TodayPage() {
  const router = useRouter();
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reaction, setReaction] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
    <>
      <h1>Today</h1>
      <p className="muted">
        {membership ? `${membership.displayName} · ${membership.role} · ` : ""}
        Focus: <strong data-testid="focus">{today.focus}</strong> of 3
      </p>

      <section aria-labelledby="wywa-heading">
        <h2 id="wywa-heading">While you were away</h2>
        {today.whileYouWereAway.length === 0 ? (
          <p className="muted">Nothing new since your last visit. The district is calm.</p>
        ) : (
          <ul data-testid="wywa">
            {wywaItems.map((item) => (
              <li key={item.id}>{item.summary}</li>
            ))}
          </ul>
        )}
      </section>

      <div aria-live="polite">
        {reaction !== null && (
          <p className="reaction" data-testid="reaction">
            {reaction}
          </p>
        )}
        {notice !== null && <p className="muted">{notice}</p>}
      </div>

      <section aria-labelledby="cards-heading">
        <h2 id="cards-heading">Your cards</h2>
        {today.activeCards.length === 0 ? (
          <p className="muted">
            No cards waiting. Consequences you are following will appear above when they resolve.
          </p>
        ) : (
          today.activeCards.map((card) => {
            const isPending = pending?.cardId === card.cardId;
            return (
              <article className="card" key={card.cardId} aria-busy={isPending}>
                <span className="family">{FAMILY_LABEL[card.eventFamily] ?? card.eventFamily}</span>
                <h3>{card.templateId.replace(/^tpl-/, "").replaceAll("-", " ")}</h3>
                <p className="muted">Expires {new Date(card.expiresAt).toLocaleString()}</p>
                <div className="options">
                  {card.options.map((option) => (
                    <button
                      key={option.optionId}
                      className="primary"
                      disabled={pending !== null}
                      onClick={() => act(card, "choose", option.optionId)}
                    >
                      {isPending && pending?.optionId === option.optionId
                        ? "Committing…"
                        : `${option.label}${option.focusCost > 0 ? ` (${option.focusCost} Focus)` : ""}`}
                    </button>
                  ))}
                  <button disabled={pending !== null} onClick={() => act(card, "decline")}>
                    {isPending && pending?.kind === "decline" ? "Declining…" : "Decline"}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>

      {today.pendingConsequences.length > 0 && (
        <section aria-labelledby="pending-heading">
          <h2 id="pending-heading">Coming up</h2>
          <ul>
            {today.pendingConsequences.map((consequence) => (
              <li key={consequence.consequenceId} className="muted">
                A consequence of your choice resolves at{" "}
                {new Date(consequence.dueAt).toLocaleString()}.
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
