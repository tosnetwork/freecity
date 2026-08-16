"use client";

import type { CardInstance } from "@freecity/contracts";

export type StoryTone = "violet" | "amber" | "mint";

export interface ChoiceOutcomeStory {
  relationship: string;
  worldChange: string;
  movement: string;
}

export interface StoryCard {
  chapter: string;
  title: string;
  body: string;
  question: string;
  place: string;
  resident: string;
  stakes: string;
  tone: StoryTone;
  optionNotes: Record<string, string>;
  outcomes: Record<string, ChoiceOutcomeStory>;
}

const CARD_STORIES: Record<string, StoryCard> = {
  "tpl-boundary-test": {
    chapter: "01 · A MEMORY WITH YOUR NAME",
    title: "The signal remembers you",
    body: "Mira found your arrival memory inside the Beacon's broken song. Nia can weave it into the public signal—but the memory was never meant for everyone.",
    question: "How much of you should the city be allowed to remember?",
    place: "Signal Garden",
    resident: "Mira + Nia",
    stakes: "Privacy · trust · public memory",
    tone: "violet",
    optionNotes: {
      "opt-share": "The city hears the full memory. Your connection to Nia begins in public.",
      "opt-excerpt": "Mira makes a safe fragment and waits for your review.",
      "opt-private":
        "Nothing is published. Mira learns the boundary and your private bond deepens.",
    },
    outcomes: {
      "opt-share": {
        relationship: "Mira trusted with an open memory",
        worldChange: "Echo Studio gained a copper memory thread",
        movement: "Mira crossed the glass bridge to Nia",
      },
      "opt-excerpt": {
        relationship: "Mira trusted as your editor",
        worldChange: "A sealed phrase appeared in Signal Garden",
        movement: "You and Mira stayed beneath the signal trees",
      },
      "opt-private": {
        relationship: "Mira learned a lasting boundary",
        worldChange: "A private lantern appeared in Signal Garden",
        movement: "Mira returned the memory to you",
      },
    },
  },
  "tpl-repair-request": {
    chapter: "02 · THE DARK RELAY",
    title: "Orin has six minutes of light",
    body: "The east relay is failing and the Night Workshop is already dim. Orin can make one repair attempt before the route to Beacon Square disappears.",
    question: "Do you commit, connect someone else, or investigate before anyone acts?",
    place: "Night Workshop",
    resident: "Orin",
    stakes: "Capability · evidence · responsibility",
    tone: "amber",
    optionNotes: {
      "opt-join": "Take responsibility for the repair and spend one Focus.",
      "opt-introduce": "Open a bounded call for a named specialist.",
      "opt-scout": "Spend Focus to expose hidden faults before the repair begins.",
    },
    outcomes: {
      "opt-join": {
        relationship: "Orin now knows you as a co-builder",
        worldChange: "A repair line lit between Arrival Hall and the Workshop",
        movement: "You moved to the east relay with Orin",
      },
      "opt-introduce": {
        relationship: "Orin trusted your introduction",
        worldChange: "A specialist channel opened above the Workshop",
        movement: "Mira carried your call across District Zero",
      },
      "opt-scout": {
        relationship: "Orin now values your evidence",
        worldChange: "Three hidden faults appeared on the city map",
        movement: "You traced the blackout edge with Mira",
      },
    },
  },
  "tpl-competing-plans": {
    chapter: "03 · ONE NIGHT, ONE SIGNAL",
    title: "Nia and Orin want different futures",
    body: "Nia wants the restored signal for a night exhibition. Orin needs it to mark a safe route. There is only one clean event window before first light.",
    question: "What should the district become tonight?",
    place: "Beacon Square",
    resident: "Nia + Orin",
    stakes: "Culture · safety · compromise",
    tone: "mint",
    optionNotes: {
      "opt-exhibition": "Wake the Studio and accept a darker safety route.",
      "opt-drill": "Make the route safe and let the square remain quiet.",
      "opt-combine": "Spend Focus to ask both residents to build a smaller shared night.",
    },
    outcomes: {
      "opt-exhibition": {
        relationship: "Nia remembers your vote for expression",
        worldChange: "Color flooded the route toward Echo Studio",
        movement: "Nia moved into Beacon Square",
      },
      "opt-drill": {
        relationship: "Orin remembers your vote for safety",
        worldChange: "A bright safe route crossed the blackout",
        movement: "Orin walked the route from end to end",
      },
      "opt-combine": {
        relationship: "Nia and Orin accepted you as mediator",
        worldChange: "A third path joined Studio, Workshop, and Beacon",
        movement: "Mira brought both residents to the same table",
      },
    },
  },
};

const FALLBACK: StoryCard = {
  chapter: "DISTRICT SIGNAL",
  title: "A choice is waiting",
  body: "A committed district situation needs your attention.",
  question: "What will you do?",
  place: "District Zero",
  resident: "Mira",
  stakes: "Your attention",
  tone: "mint",
  optionNotes: {},
  outcomes: {},
};

export function storyForCard(card: Pick<CardInstance, "templateId">): StoryCard {
  return CARD_STORIES[card.templateId] ?? FALLBACK;
}

export function storyForCardId(cardId: string): StoryCard {
  if (cardId.startsWith("relationship-boundary-test:")) return CARD_STORIES["tpl-boundary-test"]!;
  if (cardId.startsWith("opportunity-repair-request:")) return CARD_STORIES["tpl-repair-request"]!;
  if (cardId.startsWith("district-competing-plans:")) return CARD_STORIES["tpl-competing-plans"]!;
  return FALLBACK;
}

export function outcomeFor(cardId: string, optionId: string): ChoiceOutcomeStory | null {
  return storyForCardId(cardId).outcomes[optionId] ?? null;
}
