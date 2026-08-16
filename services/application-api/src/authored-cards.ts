import type { AssignCardPayload } from "@freecity/contracts";

/**
 * The three authored District Zero cards for the first vertical slice, based
 * on the reviewed examples in Playable Experience V1 §5.4. All Phase 1
 * content is authored — no generation anywhere in this path.
 */

export type AuthoredCard = Omit<AssignCardPayload["card"], "cardId">;

export const AUTHORED_CARDS: { templateKey: string; card: AuthoredCard }[] = [
  {
    templateKey: "relationship-boundary-test",
    card: {
      templateId: "tpl-boundary-test",
      eventFamily: "relationship",
      expiresAfterHours: 48,
      options: [
        {
          optionId: "opt-share",
          label: "Share this version",
          focusCost: 1,
          reactionText:
            "Your AI resident thanks you, records the consent, and prepares the introduction to the Studio Circle.",
          consequenceDelayMinutes: 60,
          consequenceText: "The Studio Circle read the shared draft and sent back two responses.",
        },
        {
          optionId: "opt-excerpt",
          label: "Prepare a public excerpt",
          focusCost: 1,
          reactionText: "Your AI resident starts drafting a redacted excerpt for your review.",
          consequenceDelayMinutes: 120,
          consequenceText: "A proposed public excerpt is ready for your review.",
        },
        {
          optionId: "opt-private",
          label: "Keep it private",
          focusCost: 0,
          reactionText:
            "Your AI resident records the boundary without complaint and adjusts its defaults.",
          consequenceDelayMinutes: 30,
          consequenceText: "Your AI resident now checks before referencing private drafts.",
        },
      ],
    },
  },
  {
    templateKey: "opportunity-repair-request",
    card: {
      templateId: "tpl-repair-request",
      eventFamily: "opportunity",
      expiresAfterHours: 24,
      options: [
        {
          optionId: "opt-join",
          label: "Join the team",
          focusCost: 1,
          reactionText: "The Workshop adds you to the accessibility scan roster.",
          consequenceDelayMinutes: 180,
          consequenceText:
            "The Workshop accessibility scan finished with your checks included in the report.",
        },
        {
          optionId: "opt-introduce",
          label: "Introduce a specialist",
          focusCost: 1,
          reactionText: "Your introduction is delivered with context about the scan.",
          consequenceDelayMinutes: 240,
          consequenceText: "The specialist accepted your introduction and joined the scan.",
        },
      ],
    },
  },
  {
    templateKey: "district-competing-plans",
    card: {
      templateId: "tpl-competing-plans",
      eventFamily: "district_civic",
      expiresAfterHours: 48,
      options: [
        {
          optionId: "opt-exhibition",
          label: "Support the creator exhibition",
          focusCost: 0,
          reactionText: "Your support for the creator exhibition is recorded.",
          consequenceDelayMinutes: 360,
          consequenceText: "The district scheduled the creator exhibition for its event slot.",
        },
        {
          optionId: "opt-drill",
          label: "Support the Agent safety drill",
          focusCost: 0,
          reactionText: "Your support for the Agent safety drill is recorded.",
          consequenceDelayMinutes: 360,
          consequenceText: "The district scheduled the Agent safety drill for its event slot.",
        },
      ],
    },
  },
];
