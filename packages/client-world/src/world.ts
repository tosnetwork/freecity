import type { DistrictEvent, DistrictEventType, ResidentKind, Role } from "@freecity/contracts";

/**
 * Client-side semantic world state, reduced purely from committed district
 * events. The renderer (PixiJS or DOM) consumes this state; nothing here is
 * an authority — replaying, dropping, or rebuilding it never changes facts.
 */

export interface CommittedEventView {
  sequence: number;
  eventSeq: number;
  event: DistrictEvent;
}

export interface WorldResident {
  residentId: string;
  kind: ResidentKind;
  role: Role;
  displayName: string;
  focus: number;
  activeCardCount: number;
}

export interface ActivityItem {
  /** Stable id "sequence:eventSeq" — also the SSE event id. */
  id: string;
  sequence: number;
  eventSeq: number;
  eventType: DistrictEventType;
  /** Accessible one-line summary; the full event stays attached for detail views. */
  summary: string;
  event: DistrictEvent;
}

export interface WorldState {
  cursor: { sequence: number; eventSeq: number };
  residents: Record<string, WorldResident>;
  activity: ActivityItem[];
}

export const ACTIVITY_LIMIT = 200;

export function createWorldState(): WorldState {
  return { cursor: { sequence: 0, eventSeq: -1 }, residents: {}, activity: [] };
}

function isAfterCursor(state: WorldState, view: CommittedEventView): boolean {
  if (view.sequence !== state.cursor.sequence) return view.sequence > state.cursor.sequence;
  return view.eventSeq > state.cursor.eventSeq;
}

function nameOf(state: WorldState, residentId: string): string {
  return state.residents[residentId]?.displayName ?? residentId;
}

/** Accessible one-line summary of a committed event. */
export function summarizeEvent(state: WorldState, event: DistrictEvent): string {
  switch (event.eventType) {
    case "ResidentProvisioned":
      return event.kind === "ai"
        ? `${event.displayName} (AI resident) joined District Zero as a ${event.role}`
        : `${event.displayName} joined District Zero as a ${event.role}`;
    case "CardAssigned":
      return `A new card arrived for ${nameOf(state, event.residentId)}`;
    case "FocusSpent":
      return `${nameOf(state, event.residentId)} spent ${event.amount} Focus (${event.remaining} remaining)`;
    case "ChoiceCommitted":
      return `${nameOf(state, event.residentId)} made a choice`;
    case "CardDeclined":
      return `${nameOf(state, event.residentId)} declined a card`;
    case "ImmediateReactionRecorded":
      return event.reactionText;
    case "ConsequenceScheduled":
      return `A consequence was scheduled for ${nameOf(state, event.residentId)} (due ${event.dueAt})`;
    case "ConsequenceResolved":
      return event.consequenceText;
    case "CardExpired":
      return `A card expired for ${nameOf(state, event.residentId)} without a decision`;
    case "FocusRefreshed":
      return `${nameOf(state, event.residentId)}'s Focus refreshed to ${event.focus}`;
    case "ArchiveEntryRecorded":
      return `Archive: ${event.summary}`;
  }
}

/**
 * Applies one committed event view. Events at or before the cursor are
 * ignored, so replayed SSE frames and reconnect overlaps are harmless.
 * Returns a new state; the input state is not mutated.
 */
export function applyEventView(state: WorldState, view: CommittedEventView): WorldState {
  if (!isAfterCursor(state, view)) return state;

  const next: WorldState = {
    cursor: { sequence: view.sequence, eventSeq: view.eventSeq },
    residents: { ...state.residents },
    activity: state.activity,
  };
  const event = view.event;

  const patchResident = (residentId: string, patch: Partial<WorldResident>) => {
    const existing = next.residents[residentId];
    if (!existing) return;
    next.residents[residentId] = { ...existing, ...patch };
  };
  const adjustCards = (residentId: string, delta: number) => {
    const existing = next.residents[residentId];
    if (!existing) return;
    next.residents[residentId] = {
      ...existing,
      activeCardCount: Math.max(0, existing.activeCardCount + delta),
    };
  };

  switch (event.eventType) {
    case "ResidentProvisioned":
      next.residents[event.residentId] = {
        residentId: event.residentId,
        kind: event.kind,
        role: event.role,
        displayName: event.displayName,
        focus: event.initialFocus,
        activeCardCount: 0,
      };
      break;
    case "CardAssigned":
      adjustCards(event.residentId, 1);
      break;
    case "FocusSpent":
      patchResident(event.residentId, { focus: event.remaining });
      break;
    case "ChoiceCommitted":
    case "CardDeclined":
    case "CardExpired":
      adjustCards(event.residentId, -1);
      break;
    case "FocusRefreshed":
      patchResident(event.residentId, { focus: event.focus });
      break;
    case "ImmediateReactionRecorded":
    case "ConsequenceScheduled":
    case "ConsequenceResolved":
    case "ArchiveEntryRecorded":
      break;
  }

  const item: ActivityItem = {
    id: `${view.sequence}:${view.eventSeq}`,
    sequence: view.sequence,
    eventSeq: view.eventSeq,
    eventType: event.eventType,
    summary: summarizeEvent(next, event),
    event,
  };
  next.activity = [...state.activity, item].slice(-ACTIVITY_LIMIT);
  return next;
}

/** A known resident identity used to seed name resolution for summaries. */
export interface SeedResident {
  residentId: string;
  displayName: string;
  kind: ResidentKind;
  role: Role;
}

/**
 * Summarizes an ordered list of committed event views by reducing them in
 * sequence, optionally pre-seeded with known residents so summaries resolve
 * display names even when the provisioning events are outside the list
 * (e.g. a While You Were Away view after its provision was acknowledged).
 */
export function summarizeCommittedViews(
  views: CommittedEventView[],
  seeds: SeedResident[] = [],
): ActivityItem[] {
  let state = createWorldState();
  for (const seed of seeds) {
    state.residents[seed.residentId] = { ...seed, focus: 0, activeCardCount: 0 };
  }
  for (const view of views) {
    state = applyEventView(state, view);
  }
  return state.activity;
}
