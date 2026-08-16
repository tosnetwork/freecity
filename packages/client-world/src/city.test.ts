import { describe, expect, it } from "vitest";

import type { DistrictEvent } from "@freecity/contracts";

import { projectCityScene } from "./city.js";
import { applyEventView, createWorldState, type WorldState } from "./world.js";

function add(state: WorldState, sequence: number, event: DistrictEvent): WorldState {
  return applyEventView(state, { sequence, eventSeq: 0, event });
}

describe("committed city projection", () => {
  it("projects named district residents and a human-AI relationship without inventing authority", () => {
    let world = createWorldState();
    world = add(world, 1, {
      eventType: "ResidentProvisioned",
      residentId: "ai-district-nia",
      kind: "ai",
      role: "creator",
      displayName: "Nia",
      sponsoredAiResidentId: null,
      initialFocus: 3,
    });
    world = add(world, 2, {
      eventType: "ResidentProvisioned",
      residentId: "ai-human-1",
      kind: "ai",
      role: "mediator",
      displayName: "Mira",
      sponsoredAiResidentId: null,
      initialFocus: 3,
    });
    world = add(world, 3, {
      eventType: "ResidentProvisioned",
      residentId: "human-1",
      kind: "human",
      role: "builder",
      displayName: "Ari",
      sponsoredAiResidentId: "ai-human-1",
      initialFocus: 3,
    });

    const scene = projectCityScene(world);
    expect(scene.residents["ai-district-nia"]?.activity).toContain("Beacon");
    expect(scene.residents["human-1"]?.sponsoredAiResidentId).toBe("ai-human-1");
    expect(scene.residents["human-1"]?.placeId).toBe("workshop");
  });

  it("turns a committed choice and consequence into visible movement and place change", () => {
    let world = createWorldState();
    world = add(world, 1, {
      eventType: "ResidentProvisioned",
      residentId: "ai-human-1",
      kind: "ai",
      role: "mediator",
      displayName: "Mira",
      sponsoredAiResidentId: null,
      initialFocus: 3,
    });
    world = add(world, 2, {
      eventType: "ResidentProvisioned",
      residentId: "human-1",
      kind: "human",
      role: "builder",
      displayName: "Ari",
      sponsoredAiResidentId: "ai-human-1",
      initialFocus: 3,
    });
    world = add(world, 3, {
      eventType: "ChoiceCommitted",
      residentId: "human-1",
      cardId: "relationship-boundary-test:human-1",
      optionId: "opt-private",
    });

    let scene = projectCityScene(world);
    expect(scene.phase).toBe("waiting");
    expect(scene.residents["human-1"]?.placeId).toBe("signal-garden");
    expect(scene.residents["ai-human-1"]?.placeId).toBe("signal-garden");
    expect(scene.places["signal-garden"].status).toContain("private memory");
    expect(scene.latestIntent?.sourceEventType).toBe("ChoiceCommitted");

    world = add(world, 4, {
      eventType: "ConsequenceResolved",
      residentId: "human-1",
      consequenceId: "relationship-boundary-test:human-1#opt-private",
      cardId: "relationship-boundary-test:human-1",
      optionId: "opt-private",
      consequenceText: "Mira left a private lantern in the Signal Garden.",
    });
    scene = projectCityScene(world);
    expect(scene.phase).toBe("changed");
    expect(scene.beaconSignal).toBeGreaterThan(50);
    expect(scene.places["signal-garden"].intensity).toBe(1);
    expect(scene.latestIntent?.kind).toBe("beacon-surge");
  });

  it("counts shared place progress once instead of inflating the Beacon with crowd size", () => {
    let world = createWorldState();
    for (const [sequence, residentId] of ["human-1", "human-2"].entries()) {
      world = add(world, sequence + 1, {
        eventType: "ResidentProvisioned",
        residentId,
        kind: "human",
        role: "builder",
        displayName: `Resident ${sequence + 1}`,
        sponsoredAiResidentId: null,
        initialFocus: 3,
      });
    }
    world = add(world, 3, {
      eventType: "ChoiceCommitted",
      residentId: "human-1",
      cardId: "relationship-boundary-test:human-1",
      optionId: "opt-private",
    });
    world = add(world, 4, {
      eventType: "ChoiceCommitted",
      residentId: "human-2",
      cardId: "relationship-boundary-test:human-2",
      optionId: "opt-excerpt",
    });
    world = add(world, 5, {
      eventType: "ConsequenceResolved",
      residentId: "human-1",
      consequenceId: "relationship-boundary-test:human-1#opt-private",
      cardId: "relationship-boundary-test:human-1",
      optionId: "opt-private",
      consequenceText: "The private lantern stayed lit.",
    });
    world = add(world, 6, {
      eventType: "ConsequenceResolved",
      residentId: "human-2",
      consequenceId: "relationship-boundary-test:human-2#opt-excerpt",
      cardId: "relationship-boundary-test:human-2",
      optionId: "opt-excerpt",
      consequenceText: "The shared signal reached the garden.",
    });

    expect(projectCityScene(world).beaconSignal).toBe(52);
  });
});
