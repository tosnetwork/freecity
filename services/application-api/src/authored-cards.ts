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
          label: "Open the whole memory",
          focusCost: 1,
          reactionText:
            "Mira crosses the glass bridge to Nia. A copper thread lights between you and Echo Studio.",
          consequenceDelayMinutes: 2,
          consequenceText:
            "Nia carried your memory into the Beacon song. Two residents answered with memories of their own.",
        },
        {
          optionId: "opt-excerpt",
          label: "Shape a safe fragment",
          focusCost: 1,
          reactionText:
            "Mira sits beside you in the Signal Garden and cuts a single safe phrase from the memory.",
          consequenceDelayMinutes: 3,
          consequenceText:
            "Your approved fragment now glows in the Signal Garden. The private original remains sealed.",
        },
        {
          optionId: "opt-private",
          label: "Keep it between us",
          focusCost: 0,
          reactionText:
            "Mira closes the memory in both hands. The public thread fades; your private bond brightens.",
          consequenceDelayMinutes: 1,
          consequenceText:
            "Mira changed its sharing rule and left a private lantern for you in the Signal Garden.",
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
          label: "Climb the relay with Orin",
          focusCost: 1,
          reactionText:
            "Orin throws you a lightline. Your route flares across the map toward the Night Workshop.",
          consequenceDelayMinutes: 4,
          consequenceText:
            "The east relay is stable. Orin etched your repair into the Workshop wall before the lights returned.",
        },
        {
          optionId: "opt-introduce",
          label: "Open a specialist channel",
          focusCost: 1,
          reactionText:
            "Mira sends a bounded call across the district. Orin marks the relay as waiting for a named hand.",
          consequenceDelayMinutes: 5,
          consequenceText:
            "A verified specialist answered the call. The relay repair now has a second accountable contributor.",
        },
        {
          optionId: "opt-scout",
          label: "Scout the dark route first",
          focusCost: 1,
          reactionText:
            "You and Mira trace the blackout edge without committing the Workshop. Three hidden faults appear.",
          consequenceDelayMinutes: 3,
          consequenceText:
            "Your route map prevented a bad repair. Orin changed the plan and credited your evidence.",
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
          label: "Light the night exhibition",
          focusCost: 0,
          reactionText:
            "Nia releases color into the silent streets. The Studio wakes, but the safety route stays dark.",
          consequenceDelayMinutes: 6,
          consequenceText:
            "The night exhibition is on. Residents have begun hanging work along the restored signal line.",
        },
        {
          optionId: "opt-drill",
          label: "Mark the safe route",
          focusCost: 0,
          reactionText:
            "Orin draws a clear route through the blackout. The square dims, then steadies into a heartbeat.",
          consequenceDelayMinutes: 6,
          consequenceText:
            "The safety route is live. Every resident can now reach Beacon Square through the blackout.",
        },
        {
          optionId: "opt-combine",
          label: "Ask them to build one night together",
          focusCost: 1,
          reactionText:
            "Mira calls Nia and Orin to the same table. A third path appears between the Studio and Workshop.",
          consequenceDelayMinutes: 8,
          consequenceText:
            "The district accepted a smaller exhibition woven through the safe route. Neither plan won alone.",
        },
      ],
    },
  },
];
