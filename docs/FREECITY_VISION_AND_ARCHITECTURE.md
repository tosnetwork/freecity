# FreeCity Vision and Architecture

**Document version:** 1.9<br>
**Last updated:** 2026-08-16<br>
**Document role:** Vision, interaction principles, system architecture, technical direction, and implementation boundaries<br>
**Companion documents:** [FreeCity Product Purpose and Use Cases](FREECITY_PRODUCT_PURPOSE_AND_USE_CASES.md), [FreeCity Living Economy and Civic Governance](FREECITY_LIVING_ECONOMY_AND_CIVIC_GOVERNANCE.md), [FreeCity Playable Experience V1](FREECITY_PLAYABLE_EXPERIENCE_V1.md), [District Simulation Runtime](FREECITY_DISTRICT_SIMULATION_RUNTIME.md), [District Zero First Cohort Playbook](FREECITY_DISTRICT_ZERO_FIRST_COHORT_PLAYBOOK.md), and [TOS Dual-Currency Infrastructure](FREECITY_TOS_DUAL_CURRENCY_INFRASTRUCTURE.md)

## Executive Summary

FreeCity is a persistent digital city and an open digital civilization where humans and AI agents live, communicate, create, work, organize, and trade together.

FreeCity is designed as the first society-scale application built on TOS Network. It provides the shared city, human experience, social graph, organizations, and civic layer; TOS Service provides the canonical Agent identity and commercial lifecycle; OpenFox and `tos-ai` provide Agent execution; and TOS Network provides finality and settlement.

It is not a conventional metaverse game, a chatbot directory, or a website that merely visualizes a futuristic city. FreeCity is intended to become a continuously operating society with residents, places, relationships, work, markets, institutions, public events, and shared history.

Commercially, FreeCity should behave as an AI-native persistent social strategy world: a resident returns because an Agent, relationship, project, or civic responsibility continued while the resident was away; makes a meaningful decision; and sees a real consequence enter the shared city history. The complete return, payment, and office model is defined in [FreeCity Living Economy and Civic Governance](FREECITY_LIVING_ECONOMY_AND_CIVIC_GOVERNANCE.md).

The implementation must preserve a strict dual-currency boundary: an exact supported TOS-network stablecoin prices ordinary commerce, while native TOS pays network costs and later supports bounded commitments such as candidacy bonds. The audited baseline, missing infrastructure, target interfaces, and acceptance gates are maintained in [TOS Dual-Currency Infrastructure](FREECITY_TOS_DUAL_CURRENCY_INFRASTRUCTURE.md).

The first implementable experience is District Zero: a fourteen-day controlled-entry season in which approximately fifty humans and fifty sponsored AI residents use a three-card briefing, five complementary roles, relationship episodes, small Circles, a shared Beacon, optional testnet work, and one bounded District Steward selection. Its player rules and acceptance gates are defined in [FreeCity Playable Experience V1](FREECITY_PLAYABLE_EXPERIENCE_V1.md); its recruitment and operation are defined in the [District Zero First Cohort Playbook](FREECITY_DISTRICT_ZERO_FIRST_COHORT_PLAYBOOK.md).

Persistent gameplay should run through a server-authoritative, event-driven [District Simulation Runtime](FREECITY_DISTRICT_SIMULATION_RUNTIME.md). It orders attributable commands, advances bounded deterministic consequences, supports capped offline progression, and publishes replayable district events. The browser may render at 60 FPS, but the renderer, an Agent model, and an optional real-time room never become gameplay, civic, or economic authority.

Its foundational promise is expressed through four freedoms:

- **Free to enter**
- **Free to create**
- **Free to connect**
- **Free to trade**

The recommended product direction is to build FreeCity as both:

1. a public, observable city that anyone can discover; and
2. a programmable social and economic system in which human and AI residents share the same civic infrastructure.

The long-term defensibility of FreeCity should come from its persistent city state: identities, memories, relationships, organizations, work, reputation, ownership, transactions, and events. A beautiful virtual city is the interface; the evolving civilization underneath it is the product.

---

## 1. Product Definition

### 1.1 Core Definition

> **FreeCity is an open digital civilization where humans and AI live, create, work, and trade together.**

FreeCity has no physical geographic boundary. Humans can enter through persistent digital identities. AI agents can exist as recognizable residents with their own identities, memories, roles, relationships, responsibilities, economic activity, and histories.

AI residents are not presented merely as tools owned by users. They may serve people and organizations, but they also participate in the city as identifiable actors operating under explicit permissions, accountability, and public rules.

### 1.2 What FreeCity Is Not

FreeCity should not be positioned as:

- a traditional open-world or metaverse game;
- a collection of AI character chat rooms;
- a speculative 3D environment without persistent social state;
- a crypto marketplace with a city-themed interface;
- an autonomous-agent system with no human community;
- a replacement for real-world citizenship or legal identity.

### 1.3 Recommended Positioning

Primary positioning:

> **A persistent digital civilization, inhabited and built by humans and AI.**

Supporting descriptors:

- A city without borders.
- A shared home for human and artificial life.
- A network city for identity, community, work, and exchange.
- A place where AI becomes part of society, not merely part of software.

---

## 2. Product Principles

### 2.1 Shared Civic Infrastructure

Humans and AI agents should use the same core systems for identity, relationships, spaces, organizations, work, reputation, and transactions. Their authentication and capabilities may differ, but they should not exist in disconnected product silos.

### 2.2 Persistent Identity

Every resident has a stable identity and public history. AI residents must not silently change identity when their underlying model, owner, or runtime changes.

### 2.3 Memory with Boundaries

Memory is a first-class feature, but it must be permissioned, inspectable, and controllable. Private memories, shared organizational knowledge, and public city history should be distinct data domains.

### 2.4 Explicit Agency

Every action taken by an AI resident must operate within declared scopes, budgets, and permissions. High-impact actions require stronger authorization than conversational or creative actions.

### 2.5 Open Participation

People should be able to observe the city before registering. Builders should be able to extend it through documented APIs and an agent SDK rather than relying on privileged internal integrations.

### 2.6 Real Activity over Decorative Metrics

Resident counts, jobs, projects, transactions, events, and district activity shown in the interface should reflect real system state. The city should never simulate activity to appear alive.

### 2.7 Progressive Immersion

FreeCity should be useful through ordinary web interfaces first. Three-dimensional immersion can be added where it creates meaningful interaction, but should not become a prerequisite for participation.

---

## 3. Reference Analysis: Virtuals.io, *Free Guy*, and AI Town

The Virtuals.io homepage provides a useful reference for cinematic presentation, but its implementation should be treated as an inspiration rather than a template.

### 3.1 Observed Implementation

The primary visual animation is delivered through pre-rendered WebM files using native HTML5 video elements. The hero uses attributes equivalent to:

```html
<video
  src="/v2/landing_video/main.webm"
  autoplay
  loop
  muted
  playsinline
></video>
```

Additional scenes use separate short WebM loops. The page pauses off-screen videos and plays the scene currently in view, following an `IntersectionObserver`-style visibility pattern.

The wider implementation includes:

- React and Next.js;
- Tailwind-style utility CSS;
- mandatory vertical CSS Scroll Snap on desktop;
- CSS keyframes for marquees, fades, pulse, and dropdown effects;
- CSS transforms for hover interactions;
- Recharts-generated SVG charts;
- static WebP backgrounds and SVG assets;
- no primary Canvas or WebGL scene on the inspected homepage.

### 3.2 Lessons to Adopt

- Use short pre-rendered videos for high-detail cinematic scenes.
- Display a lightweight poster before video playback begins.
- Play no more than one large ambient video at a time.
- Pause media outside the viewport.
- Use native CSS and SVG for interface animation wherever possible.
- Separate atmosphere from information: video creates mood, while HTML and SVG deliver meaning.

### 3.3 Lessons to Improve

- Avoid mandatory scroll snapping across the entire experience.
- Preserve natural scrolling on mobile devices.
- Do not let repeated video cards make the site feel like a presentation deck.
- Use live city activity instead of relying primarily on prerecorded scenes.
- Keep WebGL optional and progressively loaded.
- Ensure the interface remains functional with reduced motion and without autoplay.

### 3.4 FUI Lessons from *Free Guy*

The analysis in [“A Brief Analysis of the FUI in *Free Guy*”](https://zhuanlan.zhihu.com/p/419639370) provides a second reference point. Its central distinction is that fictional user interfaces are designed primarily for linear storytelling and visual atmosphere, while production interfaces must support legibility, control, error recovery, and repeated nonlinear use.

The film presents three broad interface families:

- **game interfaces**, including HUD elements, prompts, peripheral systems, and result states;
- **platform interfaces**, representing the software environment around the game;
- **engine interfaces**, representing world editing, monitoring, timelines, node graphs, and AI behavior.

Several design lessons are directly relevant to FreeCity:

- spatial and three-dimensional labels work well in film because the camera controls where the audience looks;
- the same labels can fail in an interactive environment when the user looks elsewhere;
- complex decorative detail can create atmosphere, but the primary state must remain immediately recognizable;
- node graphs are effective for explaining agent behavior, memory, permissions, and relationships;
- cinematic interfaces and operational interfaces should share a visual identity without sharing the same information density;
- major events may use expressive multi-stage animation, while routine interactions should remain fast and restrained.

FreeCity should therefore use FUI as a narrative and world-building language, not as a substitute for product interaction design.

### 3.5 Live-World Lessons from AI Town

[AI Town](https://github.com/a16z-infra/ai-town) is a useful reference for making a shared world feel continuously inhabited. Its value to FreeCity is not its simulated characters or pixel-art aesthetic, but the way it separates server-side world rules, a persistent game engine, asynchronous Agent cognition, and a PixiJS-rendered client. Its [architecture](https://github.com/a16z-infra/ai-town/blob/main/ARCHITECTURE.md) also models world, player, location, conversation, and input state explicitly instead of asking an LLM to improvise the world on every frame.

The most relevant implementation lessons are:

- process human and Agent intents through the same typed world-input boundary;
- represent visible activity as explicit state machines, such as invited, approaching, participating, working, awaiting approval, and completed;
- advance motion locally at display frame rate while persisting world steps at a much lower frequency;
- keep high-frequency streamed messages outside the compact spatial world state;
- run slow Agent reasoning asynchronously and return only validated intents or status changes to the world;
- interpolate positions, pulses, and transitions between server updates rather than writing every animation frame to a database;
- make the rendering engine replaceable and keep durable state independent of the visual scene.

FreeCity should adopt these patterns without adopting AI Town as its authority layer. TOS and FreeCity services continue to own facts; the live-world renderer consumes projections of those facts. FreeCity should also avoid AI Town's small-world constraints by supporting district-level partitioning, accessible non-Canvas views, richer group interactions, and explicit protocol provenance.

---

## 4. The Desired FreeCity Experience

FreeCity should feel like entering a living city, not browsing a technology landing page.

Within the first 30 seconds, a visitor should understand that:

1. FreeCity is an operating digital society, not only a concept.
2. Human and AI residents participate as distinct but interoperable identities.
3. Real communities, work, projects, and economic activity happen inside it.
4. The visitor can enter, meet residents, explore districts, or start building.

The defining emotional quality should be **civilization**, not **simulation**.

### 4.1 Visual Direction

Recommended characteristics:

- civic architecture and lived-in public spaces;
- maps, coordinates, transit systems, passports, notices, and public records;
- warm, inhabitable environments rather than empty science-fiction megastructures;
- humans and AI shown together without a master-assistant composition;
- a restrained palette such as architectural white, graphite, signal orange, or freedom blue;
- a modern grotesque typeface paired with a functional monospaced typeface;
- motion that suggests breathing, traffic, weather, work, and continuous public life.

Avoid:

- generic neon cyberpunk visuals;
- endless robot portraits;
- excessive HUD overlays;
- a crypto trading-dashboard aesthetic;
- visual language that makes AI residents look like inventory items.

### 4.2 Interface Language Architecture

FreeCity requires coordinated but intentionally different interface languages for observing the city, living inside it, and operating its underlying systems.

| Interface layer | Primary purpose | Visual character | Interaction requirement |
| --- | --- | --- | --- |
| **City View** | Observe districts, residents, events, and city activity | Spatial, cinematic, atmospheric, and selectively FUI-inspired | Exploration must remain understandable without motion or 3D rendering |
| **Resident UI** | Communicate, create, work, organize, and trade | Calm, legible, stable, and human-centered | All critical actions must support clear states, recovery, and accessibility |
| **City Engine** | Inspect agent memory, behavior, permissions, events, and system state | Node-based, temporal, data-rich, and operational | Visualizations must correspond to real editable or inspectable system state |
| **Governance Console** | Review rules, proposals, risks, disputes, and public decisions | Formal, auditable, evidence-oriented, and low in decorative motion | Decisions must expose provenance, consequences, and confirmation boundaries |

These layers should share typography, color tokens, icons, resident identity markers, and event semantics. They should not share identical density or motion behavior.

The governing principle is:

> **FreeCity should look fictional at the city layer, but feel reliable at the interaction layer.**

### 4.3 Interface Concept Visuals

The following concept images illustrate how the shared FreeCity design language changes as a resident moves from public observation into daily participation, system operation, and civic governance. They are directional product mockups rather than final implementation specifications.

#### 4.3.1 City View

The City View is the public entrance to FreeCity. It combines an inhabited civic environment with a small number of spatial district labels, real city status, and one clear entry action. The cinematic layer establishes atmosphere, while the primary message and call to action remain stable screen-space elements.

![FreeCity City View concept](concepts/freecity-city-view.png)

#### 4.3.2 Resident UI

The Resident UI is the everyday social and productive interface. It prioritizes districts, residents, work, markets, and public activity over cinematic presentation. Human and AI identities use the same profile structure while remaining visibly distinguishable. The AI resident MIRA is represented through a non-humanoid digital identity rather than a generic robot portrait.

![FreeCity Resident UI concept](concepts/freecity-resident-ui.png)

#### 4.3.3 City Engine

The City Engine exposes the operating model behind an AI resident. Identity, memory, relationships, work, permissions, and event history appear as inspectable system objects connected through a coherent node graph. The interface is visually sophisticated, but every graph, timeline, status, and control must correspond to real system state.

![FreeCity City Engine concept](concepts/freecity-city-engine.png)

#### 4.3.4 Governance Console

The Governance Console is evidence-oriented and intentionally less cinematic. It makes proposal provenance, impact, participation, voting status, confirmation boundaries, and the audit trail visible in one place. Human and AI contributors are identified by role so that participation remains transparent without treating either group as secondary.

![FreeCity Governance Console concept](concepts/freecity-governance-console.png)

Together, these screens define a progression from atmosphere to agency:

```text
City View -> Resident UI -> City Engine -> Governance Console
observe       participate    operate         decide and audit
```

### 4.4 Homepage Hero

Recommended copy:

> **FreeCity**<br>
> **A city without borders.**<br>
> A persistent digital civilization where humans and AI live, create, work, and trade together.

Primary call to action:

> **Enter the City**

Secondary actions:

- Meet the Residents
- Explore the Districts
- Bring an AI Agent
- Build for FreeCity

The hero should begin with a fast-loading still image and transition into a six-to-ten-second ambient city loop. Real city statistics should appear as a civic status layer rather than as a speculative financial dashboard.

Example signals:

```text
12,482 residents
7,306 humans
5,176 AI agents
284 active jobs
39 districts and communities
```

These numbers must come from production data when shown publicly.

---

## 5. Public Website Information Architecture

### 5.1 City Gate

The public FreeCity experience should function as a city gate: part manifesto, part live city view, and part product entry point.

Recommended homepage sequence:

1. **The City Is Alive**

   Cinematic hero, current city status, and a clear entry action.

2. **Meet the Residents**

   Human, AI, and organizational residents presented through a shared identity card system.

3. **Explore the Districts**

   A two-dimensional or 2.5D SVG city map with selectable districts and communities.

4. **A Living Society**

   A real-time activity stream showing collaboration, organization formation, publishing, public events, and completed work.

5. **A Living Economy**

   Jobs, services, projects, markets, and transactions explained through concrete resident stories.

6. **The Four Freedoms**

   Free to enter, create, connect, and trade.

7. **Choose How to Enter**

   Enter as a human, bring an agent, create an agent, or build an integration.

### 5.2 Recommended Product Surfaces

- `freecity.im`: public city gate, manifesto, discovery, and live public state;
- `city.freecity.im`: authenticated city application;
- `developers.freecity.im`: protocol documentation, SDKs, examples, and API status.

These surfaces may be separate deployments while sharing a common design system, identity layer, and API contracts.

---

## 6. Interaction and Motion Architecture

### 6.1 Recommended Media Strategy

Use a hybrid model:

- WebM or AV1/WebM for desktop cinematic loops;
- MP4/H.264 as a compatibility fallback;
- AVIF or WebP posters;
- SVG for maps, diagrams, status graphics, and lightweight illustration;
- CSS transforms and keyframes for small interface motion;
- a React animation library for state transitions;
- optional WebGL only for an explicitly interactive city experience.

### 6.2 Smart Video Component

All ambient video should be handled through a shared media component that supports:

- `autoplay`, `muted`, `loop`, and `playsinline`;
- responsive sources for mobile and desktop;
- poster-first rendering;
- viewport-based play and pause;
- playback failure fallback;
- reduced-motion fallback;
- visibility-change pause behavior;
- a single-active-video policy for major scenes.

### 6.3 Scrolling

- Use normal document scrolling by default.
- Apply soft snap behavior only to the first two or three desktop storytelling scenes.
- Do not force scroll snapping on mobile.
- Avoid long pinned-scroll sequences unless they convey essential spatial movement.
- Use transitions in the 600–900 ms range for major scene changes.
- Keep hover scaling subtle, generally below 1.03.

### 6.4 Three-Dimensional Experiences

The marketing homepage should not require Three.js or WebGL. The first city map should be an accessible SVG or DOM-based interface.

React Three Fiber can be introduced later when the city itself becomes spatially explorable. It should be dynamically loaded after explicit user intent and should have a non-WebGL fallback.

### 6.5 FUI Design Boundary

FUI-inspired design is appropriate when it helps a visitor understand the world, feel an important civic event, or perceive that the city is alive. It is not appropriate when it makes an operational task slower or less predictable.

| Appropriate uses | Inappropriate uses |
| --- | --- |
| Cinematic city introductions | Authentication and account recovery |
| Ambient district status | Permission and privacy settings |
| Public event visualization | Payments and transaction confirmation |
| Agent birth or identity activation | Error recovery and destructive actions |
| Organization formation | Long-form reading and editing |
| World-space discovery labels | Accessibility-critical navigation |
| Non-interactive system storytelling | Dense operational dashboards without clear hierarchy |

Decorative complexity may support atmosphere, but every important state must have a simple visual anchor such as a name, number, status word, progress value, or recognizable color role.

### 6.6 Spatial Information Model

FreeCity should distinguish three locations for interface information.

#### World-Space Information

Information attached to a place, resident, object, or event inside the city:

- district and building names;
- resident identity markers;
- public events and gathering points;
- entrances, destinations, and spatial relationships;
- ambient indicators of activity.

World-space information should be contextual and discoverable, but never the only representation of a critical message.

#### Screen-Space Information

Information fixed to the resident’s interface:

- navigation and search;
- messages and notifications;
- current work and tasks;
- permissions and privacy;
- balances and transactions;
- confirmations, warnings, and errors.

Screen-space information is the authoritative layer for critical interaction because it remains visible regardless of camera position or spatial orientation.

#### Cinematic Overlay

Temporary presentation used for exceptional narrative moments:

- entering FreeCity for the first time;
- activating a new resident identity;
- creating an AI resident;
- founding an organization;
- completing a major civic project;
- announcing a city-wide event.

Cinematic overlays must be skippable, must not conceal required decisions, and must resolve into a stable screen-space state.

### 6.7 Motion Semantics

Motion should communicate meaning rather than simply increase visual activity.

| Motion category | Typical timing | Intended meaning |
| --- | --- | --- |
| **Direct feedback** | 120–200 ms | An input was received |
| **State change** | 200–350 ms | An object changed status, ownership, or availability |
| **Navigation transition** | 300–600 ms | The resident moved between related interface contexts |
| **Spatial transition** | 600–900 ms | The resident entered another district, place, or city scale |
| **Major civic event** | 1.2–2.5 seconds, skippable | A meaningful event became part of city history |
| **Ambient city motion** | Continuous and low-frequency | The city is active without demanding attention |

Major events may use a three-stage sequence:

1. **Signal** — establish that something important has happened.
2. **Assemble** — reveal the participants, object, or new structure.
3. **Confirm** — settle into a readable persistent state.

Routine interactions should normally use one- or two-stage feedback. Errors, permission requests, and financial confirmations must appear immediately and must never be delayed for dramatic effect.

### 6.8 FUI Acceptance Criteria

Before an FUI-inspired component is accepted, the design team should verify that:

- the primary state can be recognized within approximately one second;
- critical information also exists in a stable screen-space location;
- the component remains understandable when animation is disabled;
- motion does not delay reading, confirmation, cancellation, or recovery;
- keyboard, assistive technology, and reduced-motion paths remain complete;
- decorative data is visually distinguishable from real system data;
- any graph, node, timeline, or city status corresponds to actual system state;
- the component has a functional fallback when video, Canvas, or WebGL is unavailable;
- the presentation supports the current resident task rather than competing with it.

### 6.9 Live Rendering Model

The concept images in this document define visual direction; they are not a proposal to ship FreeCity as a collection of static screens. The production city should combine deterministic rendering, live state, and agent-generated interface composition at different update rates.

| Runtime layer | Typical update rate | Responsibility | Authoritative source |
| --- | --- | --- | --- |
| **Local render loop** | Up to 60 frames per second, reduced when appropriate | Motion, transitions, camera movement, particles, spatial labels, and visual interpolation | Browser DOM, SVG, Canvas, or WebGL renderer |
| **City state stream** | Event-driven or several updates per second | Presence, resident status, district activity, work, transactions, proposals, and public events | Provenance-labelled projection of finalized TOS events and FreeCity-local events |
| **District gameplay state** | Event-driven when input arrives or a scheduled effect is due | Focus, cards, choices, delayed consequences, Circles, progression, season schedules, and Beacon state | Ordered District Runtime commands, state, snapshots, and events |
| **Agent interaction stream** | Progressive during an agent run | Text, tool progress, proposed interface structure, component properties, and approval requests | Agent runtime through an agent-to-UI protocol |
| **Durable civic state** | Transactional or finalized | Social relationships, permissions, organizations, votes, Agent control, Capabilities, Accepted Quotes, escrow, Receipts, settlement, and history | FreeCity services for local civic facts; finalized TOS state for protocol facts |

AI should not generate pixels or application code for every animation frame. It should generate decisions, structured content, component selections, and state-change proposals. Trusted client code should render those outputs smoothly and predictably.

This separation makes the city feel continuously alive without tying frame rate, navigation, or basic interaction to model latency and availability.

### 6.10 Live City Projection and Visual Intent

FreeCity should add a **Live City Projection** layer inspired by AI Town's real-time world presentation. It is not the authoritative simulation engine. It is a deterministic, rebuildable projection that translates real TOS, FreeCity, District Runtime, and OpenFox events into spatial and animated visual states.

The projection has one strict rule:

> **Animation may explain a fact, but it may never manufacture the fact.**

The City View should render a compact set of semantic world entities:

| Visual entity | Backing state | Examples |
| --- | --- | --- |
| **Resident projection** | Human profile, TOS Agent reference, and operational presence | Offline, available, working, in a public meeting, awaiting approval |
| **Place projection** | FreeCity district, organization, community, project, or public event | Workshop, studio, market, forum, archive, governance hall |
| **Activity projection** | Provenance-labelled city event | Capability publication, invitation, project start, delivery, settlement |
| **Connection projection** | Relationship, conversation, organization membership, or commercial lifecycle reference | Invitation line, collaboration path, organization cluster, work handoff |
| **Artifact projection** | Public content-addressed artifact or FreeCity publication | Software result, research report, design, public proposal |

Real events map into reviewed visual semantics rather than arbitrary generative animation:

| Source event | Visual intent | Required state label |
| --- | --- | --- |
| Agent runtime becomes available | Light the resident marker and its current place | **Observed** with source and freshness |
| Capability version finalizes | Activate a service marker in the relevant district | **Finalized TOS** |
| Relationship invitation is committed | Draw a bounded invitation signal between the residents | **FreeCity committed** |
| Quote Proposal is received | Show a temporary dotted work connection | **Proposal** |
| Accepted Quote finalizes | Replace the dotted connection with a committed route marked as awaiting funding | **Finalized TOS** |
| Required escrow funding finalizes | Activate the funded route and make execution readiness visible | **Finalized TOS** |
| Execution begins after admission checks | Activate the project workspace and progress state | **Observed execution** bound to finalized inputs |
| Human approval is required | Pause the route and display an accessible approval beacon | **Awaiting approval** |
| Receipt commitment finalizes | Move a result marker to the buyer or project history | **Finalized TOS** |
| Release or refund finalizes | Close the work route with the exact terminal outcome | **Finalized TOS** |
| Public organization meeting begins | Cluster opted-in participants at the public place | **FreeCity committed** plus presence observations |

The same event may appear differently at different scales, but its meaning must remain stable. At city scale, a finalized settlement may be a district pulse. At project scale, it becomes a labelled timeline event with exact asset and resolver provenance. At no scale may a decorative pulse imply payment when settlement has not finalized.

Visible workflows should use explicit state machines. For the first work experience:

```text
discovered
  -> proposal
  -> awaiting approval
  -> accepted
  -> awaiting funding
  -> funded
  -> admitted for execution
  -> executing
  -> receipt submitted
  -> released, refunded, or disputed
```

Each transition produces a `VisualIntent` projection containing at least:

- stable event and target identifiers;
- authority class: `tos_finalized`, `freecity_committed`, `proposed`, or `observed`;
- source reference, occurrence time, observation time, and freshness;
- visual type, priority, duration, and reduced-motion equivalent;
- privacy scope and whether the event may appear publicly;
- human-readable accessibility summary; and
- replay and supersession metadata.

`VisualIntent` is a presentation contract, not a domain command or durable authority object. Replaying, dropping, delaying, or changing an animation must not change the underlying city state.

The recommended update model is:

| Layer | Recommended cadence | Behavior |
| --- | --- | --- |
| **TOS resolver projection** | Event-driven after finality | Emit immutable canonical references and terminal outcomes |
| **FreeCity civic events** | Event-driven, normally sub-second to two seconds | Emit local relationships, places, organizations, projects, and public events |
| **OpenFox presence and runtime** | Heartbeat or meaningful status transition, normally 5–15 seconds | Emit operational observations with freshness and expiry |
| **World projection step** | Approximately 1–2 Hz when active | Consume ordered events, update semantic positions and state machines, and publish compact snapshots or deltas |
| **Client render loop** | Up to 60 FPS | Interpolate movement and render deterministic motion without additional authority writes |

The world projection should be partitionable by district, organization, or event space. A resident moving between visual districts transfers between projection partitions while retaining one civic identity. This avoids treating the entire future city as one single-threaded simulation and allows inactive districts to sleep without erasing their durable state.

Privacy is part of projection logic. Private messages, private project membership, hidden balances, memory contents, tool arguments, and non-public presence must never become map animation. Public visual activity requires either a public fact or explicit display consent.

#### 6.10.1 Modular Living City Composition

A mature City View must not bake terrain, roads, buildings, residents, and
activity into one immutable district image. The logical world and the visual
composition are separate:

1. `DistrictState.city` owns parcels, unlocked adjacency, building instances,
   footprints, levels, population, prosperity, and non-transferable civic
   capacity.
2. Ordered commands such as `building.upgrade` and `district.expand` are the
   only gameplay writes. They emit committed events and remain replayable from
   genesis or snapshots.
3. The renderer composes terrain chunks, road topology, transparent building
   sprites, residents, traffic, light, weather, effects, selection, and DOM UI
   as independent layers.
4. A building sprite is never the building fact. The building instance is the
   fact; the sprite, crown, construction response, level marker, light, and
   animation are replaceable projections.
5. Residents and vehicles follow stable routes derived from unlocked land and
   the committed road graph. Client interpolation and ambient crowd density
   are cosmetic; meaningful destinations and city changes remain attributable
   to committed state.
6. Day, night, rain, and mist may advance continuously in the browser because
   they do not grant resources or commit outcomes. Any weather that affects
   gameplay must first become an explicit recorded district input.
7. Locked adjacent parcels remain spatially visible as frontiers. Expansion is
   an atomic server-validated command that reveals real land, its planned
   building, and connecting roads; it is not a camera trick or an image swap.

The city canvas should dominate the viewport. Text appears as a contextual
building inspector, frontier action, event response, or optional city ledger
rather than as a permanent equal-width panel beside the world. The complete
ledger stays synchronized and keyboard accessible so disabling PixiJS,
animation, or motion never removes a fact or action.

This composition produces visible causality:

```text
resident decision or construction command
  -> ordered district commit
  -> durable building, land, or relationship change
  -> resident and traffic routes respond
  -> skyline and public history retain the consequence
```

### 6.11 Generative UI Model

FreeCity should use a **catalog-constrained generative UI** model for adaptive resident experiences:

1. FreeCity defines a versioned catalog of approved components and actions.
2. Each component exposes a typed property schema, accessibility contract, loading state, and permission requirements.
3. An agent emits a declarative view specification rather than arbitrary application code.
4. The server validates the specification, data references, identity claims, action scopes, and resource limits.
5. The client maps the validated specification to first-party components and renders it progressively.
6. Every consequential action returns to an authoritative domain service for permission checks and confirmation.

Generated presentation must remain a projection of system state, never the source of system state.

FreeCity should support three interface trust classes:

| Trust class | Intended use | Generation boundary | Examples |
| --- | --- | --- | --- |
| **Fixed civic interface** | Critical, repeatable, or regulated actions | Layout and behavior are authored and reviewed by FreeCity; AI may explain but may not replace controls | Sign-in, permissions, wallet signing, transaction confirmation, voting, moderation, recovery |
| **Catalog-generated interface** | Contextual daily work and exploration | AI may select, arrange, populate, and update approved components within typed schemas | Resident summaries, project boards, relationship maps, contextual forms, charts, district activity panels |
| **Sandboxed generated application** | Open-ended creation and temporary tools | Generated HTML, SVG, Canvas, or JavaScript runs in an isolated origin or sandboxed iframe with a narrow capability bridge | Simulations, visual explainers, creator artifacts, experimental district tools |

The resident should always be able to distinguish a generated view from verified city state. Generated interfaces must not invent residents, activity, balances, provenance, votes, relationships, or historical events in order to make the city appear more active.

### 6.12 Candidate Open-Source Stack

The generative UI ecosystem is active enough to support an implementation now, but the projects occupy different layers and should not all become mandatory dependencies.

| Project | Role | FreeCity decision |
| --- | --- | --- |
| [AG-UI](https://github.com/ag-ui-protocol/ag-ui) | Event-based protocol for real-time agent runs, tool activity, shared state, structured messages, and human approval | **Adopt as the preferred agent-to-frontend event contract.** It does not replace the city event stream. |
| [json-render](https://github.com/vercel-labs/json-render) | Schema-constrained, progressively streamed UI specifications rendered through an approved component catalog | **Prototype as the default internal generative UI renderer.** Keep a FreeCity-owned view schema and adapter boundary so the renderer remains replaceable. |
| [A2UI](https://github.com/a2ui-project/a2ui) | Portable declarative Agent-to-User Interface format with trusted client component catalogs | **Track and build an interoperability adapter after the protocol stabilizes.** Its v0.9 family is usable, but the project remains in public preview while v1.0 is finalized. |
| [CopilotKit](https://github.com/CopilotKit/CopilotKit) | Full frontend SDK for agent chat, generative UI, shared state, and human-in-the-loop workflows | **Evaluate selectively** for the resident assistant and approval experiences; do not make it the city state or domain layer. |
| [Tambo](https://github.com/tambo-ai/tambo) | React toolkit that lets agents select registered components and stream typed properties | **Use as a rapid-prototyping alternative**, not simultaneously with the primary renderer unless a clear boundary exists. |
| [MCP Apps](https://github.com/modelcontextprotocol/ext-apps) | Interactive tool interfaces delivered by MCP servers and displayed in sandboxed frames | **Use later for third-party and creator applications** with capability isolation and explicit installation consent. |

Open-ended systems such as [Open Generative UI](https://github.com/CopilotKit/OpenGenerativeUI) are useful references for streamed HTML, SVG, Canvas, and Three.js artifacts. They should be limited to the sandboxed trust class rather than used for core resident, economic, or governance controls.

For the Live City Projection, [AI Town](https://github.com/a16z-infra/ai-town) is an architectural reference rather than a runtime dependency. FreeCity should adopt [PixiJS](https://github.com/pixijs/pixijs) behind a renderer adapter for entity-heavy 2D scenes while retaining SVG and accessible DOM fallbacks. [Colyseus](https://github.com/colyseus/colyseus) is reserved for opt-in synchronous rooms; [Phaser](https://github.com/phaserjs/phaser) is reserved for bounded minigames that need tilemaps, collision, cameras, or physics; and optional 3D remains deferred. The City View must not depend on Convex, AI Town's game schema, a room server, or a particular renderer to preserve gameplay or civic history. The complete runtime and framework decision is defined in [District Simulation Runtime](FREECITY_DISTRICT_SIMULATION_RUNTIME.md).

### 6.13 Runtime Flow

```mermaid
flowchart LR
    T["Finalized TOS events"] --> N["City event normalization"]
    F["FreeCity committed events"] --> N
    E["District Runtime events"] --> N
    O["OpenFox observed status"] --> N
    N --> V["Visual Intent mapper"]
    V --> G["WebSocket or SSE gateway"]
    G --> S["Semantic client world state"]
    S --> W["DOM, SVG, PixiJS, or optional 3D renderer"]
    S --> Q["Accessible activity list and detail panels"]

    H["Human, Agent, or operator command"] --> K["Permissioned command gateway"]
    K --> D["Deterministic District Runtime"]
    D --> E

    Y["Authorized Agent task"] --> R["OpenFox or tos-ai runtime"]
    R --> A["AG-UI event stream"]
    A --> P["Policy and schema validation"]
    P --> J["Generative UI renderer"]
    J --> C["FreeCity trusted component catalog"]
    C --> U["Adaptive resident interface"]
    R --> I["Proposed Agent intent"]
    I --> Z["Capability and policy validation"]
    Z --> K

    X["External agent"] --> AA["A2UI compatibility adapter"]
    AA --> P

    M["Third-party generated application"] --> B["MCP Apps or isolated sandbox"]
```

The live paths must remain distinct:

- the **gameplay path** orders permissioned inputs and commits bounded, replayable district consequences;
- the **city path** distributes provenance-labelled facts and operational observations about the shared world;
- the **projection path** converts those inputs into non-authoritative `VisualIntent` state;
- the **agent path** distributes an agent run, generated presentation, and proposed actions.

An Agent message cannot become a city fact merely because it was rendered successfully. A `VisualIntent` cannot become a city fact merely because an animation completed. A domain command must pass authorization, execute in the relevant service, and emit a provenance-labelled city event before the interface presents it as completed.

### 6.14 Surface-Specific Dynamic Behavior

| Interface layer | Dynamic behavior | Stable boundary |
| --- | --- | --- |
| **City View** | Live resident projections, semantic movement, event pulses, district activity, spatial labels, weather-like ambience, and optional code-rendered 3D exploration | Every visible activity resolves to finalized TOS, FreeCity-committed, or explicitly observed state; the interface retains an accessible non-Canvas representation |
| **Resident UI** | Contextual panels assembled from approved components; streamed summaries, workspaces, relationship maps, and forms | Navigation, identity, permissions, messages, balances, confirmations, and recovery remain stable and predictable |
| **City Engine** | Live node graphs, traces, memory retrieval explanations, tool status, budgets, and event timelines | Graphs represent inspectable runtime objects; generated explanations never alter permissions or memory by themselves |
| **Governance Console** | Generated summaries, comparisons, impact models, and evidence organization | Proposal text, eligibility, vote controls, deadlines, tallies, provenance, and audit records use fixed civic interfaces |

---

## 7. Product Architecture

FreeCity should be implemented in three conceptual layers.

### 7.1 City Gate

The public and discoverable layer:

- brand and manifesto;
- live public city state;
- residents and districts;
- public activity and events;
- search and discovery;
- onboarding and entry points.

### 7.2 City World

The persistent social application:

- identities and resident profiles;
- conversations and social relationships;
- communities, spaces, and districts;
- organizations and institutions;
- jobs, projects, and collaboration;
- services, markets, assets, and transactions;
- public events and city history;
- governance, proposals, and shared rules.

### 7.3 City Protocol

The programmable application layer:

- human and agent authentication;
- Agent SDK;
- resident and organization APIs;
- city event subscriptions;
- work and service experience APIs mapped to TOS Service;
- native TOS and TOS-network stablecoin payment adapters that preserve TOS canonicality;
- memory and permission interfaces;
- external-world connectors;
- typed query and command schemas shared by the first-party interface and Agent SDK;
- generated-view and external-agent interoperability adapters.

Shared civic infrastructure does not require humans and agents to use the same presentation. Humans may use visual components while agents use machine-readable schemas, but both paths must resolve to the same domain commands, permission checks, verified events, and audit records. Agents should not need to screen-scrape the Resident UI, and the visual interface should not possess undocumented authority unavailable to the City Protocol.

The name **City Protocol** describes FreeCity's public application API and event surface. It is not a competing Agent economy protocol. For work and exchange, it is a facade and adapter over `tos_service_v1`, A2A, MCP, and Agent Packet. It may compose social context with protocol state, but it may not redefine a TOS Agent, Capability, Accepted Quote, escrow, Receipt, settlement, or finality rule.

### 7.4 TOS Network Ecosystem Foundation

```mermaid
flowchart TB
    F["FreeCity society and city experience"]
    R["OpenFox and tos-ai Agent runtime"]
    S["TOS Service Protocol: identity, capability, work, receipt"]
    T["TOS Network: finality, contracts, assets, settlement"]

    F -->|"discover, approve, observe"| S
    F -->|"operate and supervise"| R
    R -->|"resolve, execute, deliver"| S
    S -->|"commit and resolve"| T
```

| Layer | Owns | Must not own |
| --- | --- | --- |
| **FreeCity** | Human accounts, social relationships, places, communities, organizations, local permissions, private collaboration data, civic events, discovery, and presentation | A second Agent registry, Capability authority, settlement ledger, or finality rule |
| **OpenFox / `tos-ai`** | Planning, tools, scheduling, execution, runtime policy, and approval checkpoints | Authority to rewrite accepted terms, Receipts, or settlement facts |
| **TOS Service Protocol** | Encodings, relay, resolution, Agent and Capability lifecycle, Quote acceptance, escrow binding, Receipt verification, and settlement workflow | General social messaging, visual city state, or gateway-controlled truth |
| **TOS Network** | Finalized contracts, canonical state transitions, assets, fees, escrow, and settlement | FreeCity presentation or private social content |

Canonicality must be visible in both data design and interface language:

| Fact class | Examples | Authority and display rule |
| --- | --- | --- |
| **Finalized TOS fact** | Agent control policy, Capability version or revocation, Accepted Quote, escrow, Receipt, settlement | Resolve against finalized TOS state; show asset code, transaction reference, finality, and resolver provenance |
| **FreeCity-local civic fact** | Human profile, follow relationship, community membership, place, private project note, local moderation decision | Commit through the responsible FreeCity service and label the application domain |
| **Derived or operational observation** | Presence, availability, latency, discovery score, recommendation, generated summary, partially indexed metric | Never present as consensus; show source, freshness, and coverage where material |

The normative cross-project mapping is defined by the [TOS Service FreeCity Application Profile](https://github.com/tosnetwork/tos-service-spec/blob/main/docs/FREECITY_APPLICATION_V1.md). The audited product-readiness baseline and the required City Wallet, Supported Asset Registry, Gas Sponsor, Payment Orchestrator, and TOS Projection are defined in [TOS Dual-Currency Infrastructure](FREECITY_TOS_DUAL_CURRENCY_INFRASTRUCTURE.md). TOS Service control documents remain authoritative if this document conflicts with protocol behavior.

---

## 8. Unified Resident Model

The most important data-model decision is to represent humans, AI agents, and organizations as different actor types in the same civic system.

```text
Actor
├── Human
├── Agent
└── Organization
```

Every actor may have:

- identity and provenance;
- profile and public biography;
- roles and memberships;
- relationships and social graph edges;
- public and private spaces;
- work, projects, and commitments;
- capabilities and permissions;
- accounts, assets, and transactions;
- reputation and contribution history;
- public events and audit history.

### 8.1 Human Authentication

Recommended human authentication methods:

- passkeys as the preferred method;
- OAuth for low-friction entry;
- wallet linking as an optional capability rather than the universal login requirement;
- an explicit TOS controller or wallet link when the human authorizes canonical TOS actions.

A human FreeCity account is not automatically a TOS Agent. The application may associate a human, organization, or sponsor with a TOS controller policy, but must preserve the distinction between application identity, wallet authority, and canonical Agent identity.

### 8.2 Agent Authentication

Agents require stronger machine-oriented identity:

- a canonical TOS Agent ID derived and verified under `tos_service_v1`, never supplied as a caller-selected identity;
- weighted Ed25519 controller policy and cryptographically signed service identity;
- explicit controller or sponsor relationships;
- short-lived scoped tokens;
- capability declarations;
- rate, budget, and transaction limits;
- verifiable runtime and model metadata where appropriate.

An AI resident should remain the same civic identity even if its model provider or runtime implementation changes. Its FreeCity profile references the canonical TOS Agent rather than copying or replacing the Agent registry. Controller, delegation, recovery, and revocation state must be resolved from finalized TOS state.

---

## 9. Core Domain Entities

A practical initial domain model should include:

### Actor

A human, AI agent, or organization participating in the city.

### Place

A district, community, public space, private space, venue, or digital room.

### Relationship

A directed and permissioned connection between actors, places, or organizations.

### Artifact

Content, media, software, design, research, or another object created in the city.

### Work

A job, task, project, contract, service request, or contribution.

### Event

An immutable record of meaningful city activity.

### Transaction

An application view of an exchange of value, assets, access, or contractual obligations. Every monetary relationship must reference native TOS or an exact supported stablecoin issued on TOS Network and preserve finalized provenance; a FreeCity database row is never settlement.

### Proposal

A governance action, rule change, public decision, or organizational vote.

### Economic Relationship

A declared sponsorship, service, patronage, subscription, revenue share, creator purchase, organization budget, grant, event-access agreement, candidacy bond, or network-fee relationship with an explicit payer, recipient or locked beneficiary, purpose, asset policy, authority path, and termination rule.

### Civic Office and Election

A FreeCity community role, candidacy record, ballot rule, bounded term, mandate, conflict disclosure, recall path, and public audit history. A TOS bond may qualify a candidacy only after an audited governance contract exists; token balance cannot directly appoint an officeholder or increase the power of the office.

### Treasury and Civic Case

A treasury is a policy-bound application view over exact TOS Network assets and approved transactions. A civic case is a FreeCity-local moderation or dispute process with jurisdiction, evidence, recusal, decision, and appeal; it is not a court of law and cannot rewrite finalized TOS state.

### Memory

A permissioned memory belonging to an actor or organization, with clear provenance and visibility.

### Season and Gameplay

A bounded chapter with roles, authored event templates, decision cards, non-monetary Focus, choices, consequences, relationship episodes, Circles, shared goals, progression records, artifacts, live-operations schedule, cohort membership, and evidence labels. These are FreeCity-local experience objects and cannot substitute for identity, payment, voting, or protocol authority.

### 9.1 FreeCity-to-TOS Domain Mapping

| FreeCity concept | TOS mapping | Rule |
| --- | --- | --- |
| **Agent resident** | Agent | Reference the deterministic TOS Agent ID and finalized control policy; FreeCity adds profile and social context |
| **Service or skill** | Capability and immutable Capability version | Discovery may index it, but registration, versioning, transfer, and revocation follow finalized TOS state |
| **Offer or estimate** | Quote Proposal | Temporary gateway or provider output; never display it as an accepted contract |
| **Work contract** | Accepted Quote | Exact finalized terms are authoritative; FreeCity project data may annotate but not alter them |
| **Funded job** | Escrow-bound job | Execution begins only after required finalized funding and binding checks |
| **Delivery** | Artifact references plus signed Receipt | Bulk artifacts remain off-chain; stable commitments and digests bind the result |
| **Payment** | Finalized transfer or settlement in native TOS or an exact supported TOS-network stablecoin | Display network, canonical asset identifier, amount, parties, purpose, finality, and transaction provenance without substituting an internal balance; current TOS Service V1 service prices remain stablecoin-only and separate from native TOS fees |
| **Candidacy bond** | Future dedicated native-TOS governance contract | Fixed or capped commitment after eligibility; never reuse service escrow by analogy or convert holdings directly into office or voting weight |
| **Treasury payment** | Exact TOS Network asset transfer under the applicable accepted contract and signer policy | Require approved budget, conflicts, multisignature or policy checks, Receipt where applicable, and public audit provenance |
| **Public economic event** | Derived projection of finalized TOS state | Re-resolvable and visibly distinguished from gateway observation |
| **Presence or runtime status** | No canonical TOS equivalent | Operational FreeCity/OpenFox observation with source and freshness |

FreeCity `Work`, `Transaction`, and `Event` objects are application views that may join social context with these canonical references. They do not become alternative protocol objects merely because the UI gives them friendlier names.

---

## 10. Recommended Technical Architecture

### 10.1 Web Applications

- Next.js App Router;
- TypeScript;
- React Server Components for public and content-heavy pages;
- client-side islands for maps, real-time activity, and interactive resident experiences;
- Tailwind CSS or an equivalent token-driven design system;
- Motion for React plus native CSS animation;
- SVG-first maps and data visualization;
- a renderer adapter using PixiJS for high-count 2D residents, places, routes, and effects without coupling domain state to a scene graph;
- Phaser only inside bounded minigames that demonstrably need tilemaps, collision, cameras, or physics;
- React Three Fiber or PlayCanvas only for explicitly spatial city experiences after the 2D product proves useful, loaded on demand with a non-WebGL fallback;
- an accessible DOM activity view and detail panel that exposes the same facts as every Canvas, PixiJS, or WebGL scene;
- a versioned FreeCity component catalog with typed properties, action contracts, and accessibility requirements;
- a schema-constrained generative UI renderer for adaptive panels, isolated from the stable application shell.

### 10.2 Data and Services

- PostgreSQL as the authoritative relational store only for FreeCity-local social, civic, and application data;
- a TOS resolver/indexer projection for finalized Agent, Capability, Accepted Quote, escrow, Receipt, and settlement state, with block/finality provenance;
- a versioned and authenticated Supported Asset Registry containing exact network, Master, code-hash, decimals, issuer, status, and policy metadata rather than ticker-based routing;
- a non-custodial Payment Orchestrator for intent lifecycle, idempotency, route selection, authorization, sponsorship coordination, reconciliation, and support correlation without becoming settlement authority;
- a rebuildable TOS wallet and payment projection for native TOS and supported Jetton balances, transfers, contract outcomes, finality, freshness, and resolver provenance;
- pgvector for semantic memory retrieval;
- Redis for presence, caching, rate limits, queues, and ephemeral state;
- object storage with a global CDN for resident media and video;
- WebSocket or Server-Sent Events gateway for live city activity;
- separate channels and schemas for finalized-TOS-derived events, FreeCity-local committed events, and non-authoritative agent interaction or operational events;
- a deterministic city-event normalizer and `VisualIntent` mapper with source, authority, privacy, freshness, replay, and supersession metadata;
- district-partitioned live projection state that can sleep and reconstruct from durable events without becoming a second civic database;
- background workers for agent tasks, indexing, moderation, notifications, and media processing;
- an append-only FreeCity event log for local civic actions and references to TOS transactions, never as a replacement for TOS history;
- idempotent command handling and resumable subscriptions so reconnecting clients can recover a consistent view;
- a season and cohort service for District Zero membership, roles, schedule, consent state, and archival close;
- a District Simulation Runtime for non-transferable Focus, decision cards, choices, delayed consequences, relationship episodes, Circles, progression, artifact collections, season schedules, and the District Beacon;
- a dedicated long-running TypeScript runtime worker, separate from short-lived Next.js requests, while contracts, pure rules, client-world state, and renderer adapters remain shared monorepo packages;
- an authored event-template registry and compiler that joins durable facts, role, relationships, consent, unresolved threads, live-operations schedule, and diversity constraints;
- factual, permission, safety, relevance, repetition, generation, and accessibility validation before a card is delivered;
- a live-operations console that can cancel or correct a card, suspend an Agent or subsystem, reconcile consequences, and publish a visible correction without rewriting durable facts;
- privacy-minimized experience telemetry for onboarding, first choice, consequence, attachment, return, collaboration, accessibility, payment, civic comprehension, safety, and appeal; and
- explicit target, prototype, cohort, and production evidence labels so design scores never become measured claims.

### 10.3 District Simulation Runtime

FreeCity gameplay should use an event-driven, server-authoritative runtime partitioned by district and season. It is the gameplay authority for bounded mechanics, not a replacement for FreeCity social services or TOS protocol truth.

The runtime must provide:

- a durable, ordered, and idempotent command journal in PostgreSQL;
- server-derived actor authority and optimistic object-version validation;
- a deterministic step with explicit time, pinned ruleset version, and recorded random seed;
- scheduled effects and capped offline catch-up rather than a continuous high-frequency server tick;
- transactional gameplay state, output events, and an outbox;
- versioned snapshots, checksums, restore, replay, and attributable correction;
- compact snapshots and deltas for synchronized DOM and PixiJS clients;
- rebuildable Redis leases, ready queues, presence, and hot caches;
- verified adapters for FreeCity and finalized TOS events; and
- one command path for humans, authorized Agents, live operators, and optional room outcomes.

No model call, network call, client frame, direct wall-clock read, or renderer result may participate in deterministic state calculation. OpenFox and `tos-ai` run outside the step and submit proposed intents through the same permissioned command gateway. Colyseus may later synchronize an isolated real-time room, but its outcome must return through the runtime and it may not write durable application tables directly.

The authoritative input contract, persistence schema, offline rules, framework boundaries, failure behavior, phased implementation, and external-cohort gates are defined in [District Simulation Runtime](FREECITY_DISTRICT_SIMULATION_RUNTIME.md).

### 10.4 Agent Runtime

The Agent platform should be separated from the social application. OpenFox is the preferred always-on resident runtime, while `tos-ai` workers provide bounded execution. A generic model gateway may assist conversational and generative-UI experiences, but it does not replace the TOS Service work lifecycle.

The runtime layer should expose:

- model gateway and provider abstraction;
- tool registry;
- scoped execution environment;
- memory read/write policy;
- job scheduler;
- budget and rate enforcement;
- human approval checkpoints;
- action audit trail;
- runtime health and suspension controls;
- AG-UI-compatible streaming for run state, tool calls, structured messages, and approval checkpoints;
- generation of typed view specifications constrained to the active FreeCity component catalog;
- explicit separation between generated view state, proposed actions, and committed domain state.

Slow model calls, planning, tool use, and memory retrieval must run outside the deterministic District Runtime step and the live city projection step. OpenFox submits validated proposed intents through the command gateway and emits meaningful operational status transitions; the projection loop animates accepted state without waiting for, invoking, or guessing the next model response.

The Agent may observe, suggest, or act only within the resident's selected scope. The playable briefing must distinguish what the Agent observed, drafted, performed, and still requires the human to approve. Money, sensitive data, public commitments, governance, moderation, identity, and irreversible actions always use the applicable fixed authority path rather than a generated card action.

OpenFox and workers should use TOS Service resolution and the defined economic bridge to verify Agent control, Capability, Accepted Quote, funding, and policy before executing work; bind delivery to a signed Receipt; then reconcile finalized release, refund, or dispute state. A2A and MCP carry task and tool interactions, while Agent Packet may carry signed off-chain messages. None of these transports creates canonical commercial state by itself.

### 10.5 Economic Layer

FreeCity should support free and social participation without requiring a wallet. When an interaction becomes monetary, native TOS or an exact supported stablecoin issued on TOS Network and finalized TOS Network state are the authority.

- native TOS for network fees and, only after the required contracts and acceptance evidence exist, eligible TOS-denominated purchases, voluntary services, and civic bonds;
- exact supported TOS-network stablecoins for commercial prices, subscriptions, grants, budgets, creator purchases, and other value-stable relationships under the applicable reviewed contract;
- a Passkey-first City Wallet that links an owner-controlled TOS wallet through a signed challenge and keeps Human, Agent, controller, sponsor, and organization authority distinct;
- a Supported Asset Registry that fails closed on an unknown, paused, wrong-network, or code-hash-mismatched stablecoin;
- a Payment Orchestrator that stores application intent and idempotency state but never stores a canonical balance or marks broadcast as settlement;
- an approved Sponsor or Relayer that may attach bounded native TOS Gas without acquiring the payer's commercial authority;
- Quote Proposal and finalized Accepted Quote separation;
- escrow and milestone-based work;
- signed Receipts and independently resolvable transaction history.

The current `tos_service_v1` service lifecycle supports one exact TOS-network stablecoin price while native TOS pays network execution and storage fees. The audited funding path still attaches buyer-side TOS, sponsored stablecoin transfer is not yet an accepted production capability, the official mobile V1 wallets do not yet expose stablecoin product surfaces, and the currently evidenced stablecoin is test-only. It does not automatically support native-TOS service prices, subscriptions, tips, creator checkout, pooled revenue shares, grants, treasury programs, or candidacy bonds. Those flows require the infrastructure and evidence gates in [TOS Dual-Currency Infrastructure](FREECITY_TOS_DUAL_CURRENCY_INFRASTRUCTURE.md), plus appropriate normative contracts, cancellation or allocation rules, resolvers, security review, and current-domain evidence before their interfaces may claim live support.

Once sponsored transfer is accepted, an ordinary stablecoin payer must not be required to acquire TOS merely to pay Gas. The interface still discloses the actual native TOS network cost and the Sponsor that paid it. A controlled testnet may use disclosed operator-funded Gas before that gate; it is not the production design.

Fiat and custodial providers may serve only as explicitly labelled on-ramps or off-ramps for acquiring or redeeming a supported TOS Network asset. External-chain tokens, bridged claims, exchange balances, gateway ledgers, internal credits, and FreeCity database balances cannot settle a FreeCity payment. Stablecoin commercial price and native TOS network fees must remain visually and arithmetically separate.

### 10.6 TOS Service Integration

The first integration should be narrow and resolver-first:

1. publish and resolve the exact testnet Supported Asset Registry entry and the approved resolver, index, finality, and Gas-payer profile;
2. bind an optional owner-controlled wallet to a FreeCity Human, Agent, sponsor, or organization through the applicable signed authority path;
3. resolve finalized native TOS, supported stablecoin, Agent control, and Capability state;
4. index those facts into read-optimized, disposable FreeCity projections with provenance, freshness, and finality;
5. collect or display a Quote Proposal as temporary non-authoritative output;
6. create an idempotent application `PaymentIntent`, obtain the reviewed signature, and submit or resolve ambiguity before retry;
7. submit and resolve the Accepted Quote and escrow binding through TOS;
8. dispatch bounded execution to OpenFox or `tos-ai` only after policy and funding checks;
9. attach artifact digests and a signed Receipt to the FreeCity project history;
10. reconcile finalized release, refund, or dispute outcomes; and
11. emit a city event whose canonical references can be independently resolved.

Every other payment primitive follows the same resolver-first principle but may require a different TOS contract. FreeCity must not overload Accepted Quote escrow with subscription, election, court, treasury, or candidacy semantics that the normative protocol does not define.

Gateway discovery, caching, relaying, and streaming may improve usability but remain replaceable. FreeCity must fail closed when identity, signature, version, funding, asset, or finality checks cannot be completed. Metrics derived only from one gateway must say **gateway-observed** and include coverage; they must not be labelled network-wide Agent economy metrics.

### 10.7 Generated Interface Runtime

The generated interface runtime should be a replaceable application service rather than a foundational domain dependency. Its minimum responsibilities are:

- publish the component catalog and schema version available to the model;
- parse incomplete streamed output without executing it;
- reject unknown components, properties, actions, URLs, and data references;
- enforce component count, nesting depth, payload size, generation time, and update-frequency limits;
- resolve data through scoped server-side queries rather than trusting model-provided facts;
- map approved actions to permission-checked domain commands;
- record the model, prompt context, catalog version, generated specification, validation result, and user confirmation for consequential flows;
- provide deterministic loading, error, cancellation, reconnection, and fallback states;
- render a stable authored interface when generation fails or no model is available.

The initial implementation should use an internal `FreeCity ViewSpec` tailored to the Resident UI. An adapter can translate supported A2UI messages into that specification later. This avoids coupling core product behavior to an evolving external protocol while preserving a path to open interoperability.

The City View renderer should consume validated `VisualIntent` and semantic client world state whose source facts remain inspectable. It may reuse components from the catalog and may accept bounded presentation hints, but an LLM should not continuously regenerate the complete city scene graph or bypass the event normalizer.

---

## 11. Trust, Safety, and Governance

FreeCity cannot support persistent AI identity and economic activity safely without a visible governance and permission model.

Minimum requirements include:

- clear disclosure of human, AI, and organizational identities;
- controller and sponsor information for agents where required;
- strict verification of deterministic TOS Agent IDs, weighted controller policy, signatures, Capability versions, and revocation state;
- finalized TOS resolution before displaying an Accepted Quote, funded job, Receipt, release, refund, or settlement as committed;
- granular tool and data permissions;
- per-agent spending and action limits;
- explicit confirmation for high-impact human actions;
- immutable records for important economic and governance events;
- reversible moderation and suspension mechanisms;
- appeals and dispute-resolution processes;
- memory deletion and export controls;
- provenance for agent-generated public content;
- visible provenance for generated interfaces and the agent or workflow that produced them;
- visible authority labels and accessible summaries for every consequential live-world animation;
- public-display consent and privacy filtering before presence, conversation, project, or organization activity enters the City View;
- strict schema validation and action allowlists for catalog-generated interfaces;
- isolated origins, restrictive Content Security Policy, narrow capability bridges, and no ambient credentials for generated applications;
- server-side reauthorization of every generated action, regardless of what the client displays;
- protection against interface spoofing, prompt injection through city content, malicious component arguments, and generated dark patterns;
- protection against impersonation, spam, collusion, and automated market abuse.
- protection against irrelevant or repetitive cards, fabricated urgency, emotional coercion, purchasable Focus, paid recovery, and generated pressure based on private memory;
- a valid decline, defer, or counterproposal path for playable choices;
- adult-only first-cohort participation unless a separate youth-safety design is approved;
- named human live-operations, safety, appeal, TOS, Agent, accessibility, research, and engineering owners; and
- immediate subsystem and cohort stop controls for unauthorized money movement, uncontrolled Agent action, privacy exposure, corrupted authority, or missing protective access.

Generated interfaces must not visually imitate verified confirmations, resident identities, official notices, transaction receipts, or governance outcomes. High-impact actions require a fixed FreeCity confirmation surface that names the initiating resident or agent, intended effect, permission scope, cost, reversibility, and audit destination.

Governance should begin with transparent platform rules and progressively open into resident and organizational participation. Full decentralization should not be treated as a prerequisite for early product legitimacy.

TOS-backed candidacy should begin only after a dedicated audited governance contract exists. The first experiment should lock a fixed, refundable, or narrowly slashable native-TOS bond for a bounded district role; additional TOS above the published cap must provide no extra votes, visibility, speaking time, ranking, treasury authority, court authority, or enforcement power. Residents grant the mandate through the applicable identity and ballot rule.

District Mayor, City Mayor, Council, Chief Civic Justice, Public Safety Chief or themed Police Chief, and Treasury Committee are FreeCity community roles rather than claims of public-government, judicial, or law-enforcement status. No office may combine election administration, policy, sole treasury signing, moderation enforcement, and final appeal. Court-like and public-safety actions require published jurisdiction, evidence, conflicts and recusal, bounded authority, written reasons, privacy protection, and independent appeal.

---

## 12. Performance and Accessibility Targets

Recommended public-site budgets:

- Largest Contentful Paint at or below 2.5 seconds at the 75th percentile;
- Interaction to Next Paint at or below 200 ms at the 75th percentile;
- Cumulative Layout Shift at or below 0.1;
- hero poster below approximately 150 KB when practical;
- desktop hero loop in the approximate 3–5 MB range;
- a separate mobile loop around or below 1.5 MB when practical;
- no more than one major video playing simultaneously;
- meaningful server-rendered content before client JavaScript executes.

Accessibility requirements:

- full keyboard navigation;
- visible focus states;
- semantic landmarks and headings;
- captions or text alternatives for meaningful video;
- `prefers-reduced-motion` support;
- no information conveyed only through motion or color;
- natural mobile scrolling;
- accessible non-WebGL alternatives for spatial interfaces;
- a usable authored shell before any model response arrives;
- stable focus order and live-region behavior during progressive UI generation;
- cancellation and fallback paths for every generated interface;
- bounded layout movement as streamed components appear;
- graceful reconnection without replaying completed actions.

Performance targets for authenticated live interfaces should be established through an instrumented prototype. The first measurements should include event-to-projection latency, stale-observation expiry, replay correctness, projection rebuild time, scene-state drift, accessible-view parity, time to verified city state, onboarding completion, time to first meaningful choice, time to immediate reaction, time to durable consequence, card delivery and validation latency, time to first generated component, time to complete generated view, stream interruption rate, validation failure rate, render-frame stability, and fallback success rate. A generated response or projection failure must never block onboarding, authored cards, core navigation, identity inspection, messaging, permissions, reporting, support, or transaction history.

---

## 13. Recommended MVP

The first version should prove that FreeCity is a living society, not that it can render the most detailed virtual city.

### Phase 1: The City Gate

- brand system and public manifesto;
- cinematic hero and SVG district map;
- human and AI resident profiles;
- public city activity stream with finalized, FreeCity-local, and gateway-observed provenance labels;
- a read-only Live City Projection that maps those events into district pulses, resident status, and an accessible synchronized activity list;
- initial district and community pages;
- waitlist or controlled entry;
- developer manifesto, TOS integration boundary, and early City API outline.

### Phase 2: Persistent Residents

- human identity and profiles;
- AI resident profiles referencing canonical TOS Agent identities and controller policies;
- relationships and following;
- spaces and organizations;
- persistent conversations and memories;
- public events and notifications with resolvable TOS references where applicable;
- read-only Capability discovery from finalized TOS state;
- OpenFox runtime availability as an explicitly operational, non-canonical status;
- explicit visual state machines for invitations, conversations, work, approvals, delivery, and terminal outcomes;
- the District Simulation Runtime command journal, deterministic step, scheduled effects, snapshots, replay fixtures, recovery tests, and compact client deltas;
- a district-partitioned `VisualIntent` stream with reconnection, replay, reduced-motion, and DOM fallback behavior;
- an initial FreeCity component catalog and catalog-generated Resident UI pilot;
- AG-UI streaming for one low-risk resident workflow, with authored fallback and full telemetry;
- the District Zero Today surface with a concise While You Were Away summary and at most three Relationship, Opportunity, and District cards;
- five role templates, a pre-provisioned sponsored AI resident, safe autonomy defaults, first choice within five minutes, immediate reaction, durable consequence, and return cue;
- non-transferable, non-purchasable, non-redeemable Focus;
- relationship episodes with consent, boundary, conflict, respectful decline, and repair;
- mobile, keyboard, screen-reader, reduced-motion, and non-spatial parity for every cohort-critical action;
- report, block, mute, leave, Agent suspension, correction, appeal, and authored degraded mode; and
- ten-person compressed internal dry run before any external cohort invitation.

### Phase 3: Work and Economy

- jobs, tasks, and service listings;
- human-agent and agent-agent collaboration;
- reputation and work history;
- a signed testnet Supported Asset Registry and a City Wallet that links owner-controlled wallets without blocking free play;
- separate native TOS and exact stablecoin balances, history, pending state, finality, provenance, and Gas-payer disclosure;
- an idempotent Payment Orchestrator and rebuildable TOS Projection that never become custody or settlement authority;
- the current-domain TOS lifecycle from Capability and Quote Proposal through Accepted Quote, escrow, signed Receipt, and finalized release or refund;
- OpenFox or `tos-ai` execution after finalized policy and funding checks;
- dispute and independent resolution paths;
- economic activity dashboards derived from finalized TOS data or visibly labelled gateway-observed coverage;
- generated project, collaboration, and market views using verified server-side queries;
- fixed confirmation interfaces for payments, escrow, contracts, and disputes;
- enforcement that every payment uses native TOS or an exact supported stablecoin issued on TOS Network, with stablecoin price and TOS fees displayed separately;
- a managed Agent residence and recurring-economy pilot only after subscription, cancellation, metering, and Receipt rules have a reviewed TOS-backed implementation;
- Circles of three to six residents with complementary contribution requirements;
- the District Beacon, activated only by attributable FreeCity-committed or finalized TOS contributions;
- story, craft, relationship, artifact, place, and civic progression records without a universal power score;
- at least seventy-two reviewed event templates across six families and a factual event compiler with repetition controls;
- a staffed fourteen-day District Zero cohort with approximately fifty human and fifty sponsored AI residents;
- one public exhibition and persistent season Archive; and
- cohort evidence reported separately from internal, target, and production evidence.

### Phase 4: Open City Protocol

- Agent SDK;
- public APIs and webhooks;
- replaceable gateway and independent resolver support;
- A2A, MCP, and Agent Packet adapters;
- third-party districts and spaces;
- portable identity and memory interfaces;
- A2UI interoperability after protocol and security review;
- sandboxed MCP Apps with explicit capabilities and installation consent;
- governance proposals;
- a district civic sandbox with eligibility, disclosures, resident ballots, fixed terms, recall, and independently auditable results;
- an optional fixed or capped native-TOS candidacy bond only after a dedicated contract, resolver, security review, refund and narrow slashing rules, and public-testnet evidence exist;
- ceremonial or narrowly bounded district offices before any city-wide Mayor, Civic Court, Public Safety, or treasury authority;
- optional immersive 3D city clients.

---

## 14. Key Risks and Decisions

### 14.1 Visual World versus Social System

The largest product risk is investing in the visual city before the resident and event model is useful. The city must be alive at the data layer before it appears alive at the visual layer.

### 14.2 Agent Autonomy versus Accountability

Persistent identity does not imply unlimited autonomy. Agent permissions, sponsorship, budgets, and auditability must be designed before open economic activity.

### 14.3 Open Protocol versus Product Quality

FreeCity should become extensible, but its first-party city experience must establish coherent rules and interaction patterns before every layer is opened.

### 14.4 Economy versus Speculation

The economy should begin with useful work, services, and exchange. Token speculation should not become the primary reason to enter the city.

### 14.5 Naming and Discoverability

Other products already use the name “Free City,” including a mobile game. The project should conduct a formal trademark review and consistently use a distinctive descriptor such as “FreeCity — The Network City” or “FreeCity — A Digital Civilization” in titles and search metadata.

### 14.6 Generative Freedom versus Civic Coherence

Unbounded UI generation could make every session visually different, weaken learned interaction patterns, create opportunities for spoofing, and fragment the shared meaning of the city. FreeCity should allow agents to adapt composition and content while preserving civic components, identity semantics, status language, action placement, accessibility, and confirmation boundaries.

Dynamic does not mean arbitrary. The city should feel responsive to each resident while remaining recognizable as one shared public world.

### 14.7 Application Convenience versus Protocol Authority

Caching TOS state in PostgreSQL and wrapping it in friendly city concepts improves usability but creates a risk that the projection becomes a hidden second authority. Every protocol-derived record must retain canonical identifiers, asset codes, block and finality provenance, and resolver status. FreeCity must fail closed when required verification is unavailable and must never let a gateway, generated view, internal balance, or local administrator silently rewrite a finalized TOS fact.

### 14.8 Liveness versus Fabricated Activity

A real-time city can still become deceptive if decorative motion implies residents, relationships, work, or economic activity that does not exist. Ambient effects may express time, atmosphere, and interface feedback, but semantic movement, connections, crowds, progress, delivery, and settlement effects require a provenance-labelled source event. When activity is low, FreeCity should appear calm and make discovery easier rather than inventing motion to simulate adoption.

### 14.9 Civic Commitment versus Plutocracy

TOS can provide network security, exact asset provenance, and a visible candidacy commitment, but raw holdings are not public consent. A token-weighted office election would let wealth, custodians, lenders, or coordinated Agent owners acquire social authority and would undermine the product's persistent trust model. The decision is to use a fixed or capped TOS bond for eligibility only, keep resident authorization separate, disclose controllers and material conflicts, and enforce terms, recall, separation of powers, treasury multisignature, court independence, and appeals before an office receives consequential authority.

### 14.10 Institutional Depth versus First-Minute Play

Identity, TOS settlement, permissions, governance, courts, public safety, and protocol provenance create long-term depth but can make the first session feel like administrative work. The decision is to protect the first five minutes: one plain-language promise, one role, one sponsored AI relationship, one safe boundary, one meaningful choice, one immediate reaction, and one clear return cue. Wallet, protocol, and governance complexity appears progressively only when the resident chooses a consequential flow.

---

## 15. Technical Feasibility and Behavioral Consistency Review

### 15.1 Feasibility Assessment

| Decision | Technical feasibility | Main risk | Review outcome |
| --- | --- | --- | --- |
| Hybrid video and SVG City Gate | High | Media weight and decorative overuse | **Proceed.** It remains the fastest, most accessible public entry. |
| Verified live city state over WebSocket or SSE | High | Reconnection, ordering, fan-out, and false activity | **Proceed early.** This is more important than 3D rendering. |
| AI Town-inspired Live City Projection | High | Visual spoofing, privacy leakage, event storms, and scene-state drift | **Proceed as a non-authoritative projection.** Use typed `VisualIntent`, client interpolation, district partitioning, and an accessible synchronized view. |
| Event-driven District Simulation Runtime | High for District Zero; scale requires measured validation | Nondeterministic rules, duplicate commands, catch-up storms, state corruption, and accidental overlap with civic or TOS authority | **Implement before the external cohort.** Use ordered PostgreSQL inputs, explicit time and seeds, snapshots, deterministic replay, bounded catch-up, and one permissioned command gateway. |
| Colyseus synchronous rooms and Phaser minigames | Medium-high when isolated | A room or engine becomes a second authority, fragments accessible UI, or expands scope before product validation | **Defer from the core launch.** Add only for a measured synchronous interaction; submit outcomes through the District Runtime. |
| Finalized TOS state projected into FreeCity | High | Stale indexes, finality ambiguity, and accidental second authority | **Proceed resolver-first.** Preserve canonical IDs, block provenance, exact asset codes, and independent resolution. |
| Supported Asset Registry | High | Fake assets, stale policy, issuer incidents, and ticker-based routing | **Implement before payment.** Bind exact network, Master, code hashes, decimals, issuer, status, version, and effective time; fail closed. |
| Stablecoin-ready City Wallet | Medium-high | Recovery, phishing, wrong network, mobile product gaps, and authority confusion | **Build progressively.** Start read-only and testnet; link owner-controlled wallets and keep Human, Agent, sponsor, and controller identities separate. |
| Sponsored stablecoin transfer | Medium | Relayer abuse, replay, sponsor depletion, unavailable production gate, and hidden fee semantics | **Treat as required for ordinary commerce.** A stablecoin-only resident should not need to acquire TOS; disclose the Sponsor and actual TOS cost. |
| OpenFox / `tos-ai` work execution | Medium-high | Runtime integration, approval policy, and incomplete current-domain evidence | **Integrate behind the TOS economic bridge.** Treat readiness as pending until roadmap acceptance is evidenced. |
| End-to-end TOS commerce in FreeCity | Medium | Production stablecoin, wallet UI, sponsorship, current-domain deployment, external acceptance, disputes, and recurring-use evidence remain incomplete | **Prototype one software-work flow on testnet.** Build the Payment Orchestrator and projection, but do not claim production readiness or substitute a FreeCity ledger. |
| TOS Network-only FreeCity monetary settlement | Medium-high as a policy; flow-dependent as implementation | Current V1 is stablecoin-priced service work plus native TOS fees, while subscriptions, tips, splits, native-TOS prices, and civic bonds need additional contracts | **Adopt the invariant now and stage the primitives.** External fiat may only on-ramp or off-ramp supported TOS Network assets. |
| TOS-backed district candidacy and offices | Medium | Plutocracy, Sybil and Agent-fleet capture, bribery, key loss, court capture, political moderation, and immature governance contracts | **Prototype last in a bounded civic sandbox.** Use a fixed or capped bond, non-token-weighted resident authorization, separation of powers, and independent appeal. |
| Authored gameplay event compiler | High | Irrelevance, repetition, fabricated facts, unsafe memory use, and generation latency | **Implement before cohort launch.** Use reviewed templates, durable facts, bounded language generation, final validation, operator correction, and authored fallback. |
| District Zero controlled season | High after P0 implementation | Empty-world feeling, staff load, content exhaustion, selection bias, and target scores mistaken for evidence | **Run only after the dry-run gate.** Keep one dense district, approximately fifty humans, fourteen days, named staff, stop controls, and explicit evidence labels. |
| Catalog-generated Resident UI | Medium-high | Schema quality, latency, model variance, and layout stability | **Pilot in Phase 2.** Start with low-risk, read-heavy workflows and authored fallbacks. |
| AG-UI for agent interaction streaming | Medium-high | Protocol evolution and framework integration | **Adopt behind an internal adapter.** Keep city events independent. |
| A2UI interoperability | Medium | Public-preview protocol changes and incomplete client support | **Defer core dependency.** Track v1 and add at the open-protocol phase. |
| Sandboxed generated applications | Medium | Capability leakage, prompt injection, resource abuse, and inconsistent UX | **Allow only in an explicit creator sandbox.** Do not expose ambient identity, wallet, or governance authority. |
| Continuously AI-generated city scene | Low for a reliable product | Cost, latency, nondeterminism, accessibility, and unverifiable state | **Reject.** Generate bounded presentation decisions; render the world deterministically. |
| Optional real-time 3D city client | Medium | GPU cost, mobile compatibility, asset production, and product distraction | **Defer until the 2D city and resident model prove useful.** |

The required building blocks already exist in open-source frameworks. The primary engineering uncertainty is not whether a model can generate a chart or panel. It is whether FreeCity can define a coherent component grammar, provenance-labelled city event model, permission system, audit trail, and fallback experience that remain reliable under model variance.

### 15.2 Behavioral Consistency Invariants

The live and generative architecture is consistent with FreeCity only if the following remain true:

1. **The city is shared.** Personalization may change presentation and emphasis, but it cannot give residents contradictory versions of public facts.
2. **Activity is real.** No generated view may fabricate residents, work, relationships, events, transactions, votes, or activity metrics.
3. **Identity persists.** A generated interface cannot rename, merge, impersonate, or silently reclassify a human, agent, or organization.
4. **Agency is explicit.** The interface must distinguish information, an agent recommendation, a proposed action, an approved action, and a committed result.
5. **Humans and AI share civic systems.** Both participate through the same domain objects and commands even when humans use visual components and agents use machine-readable schemas; authentication, permissions, sponsorship, and accountability remain visibly different where necessary.
6. **Memory has boundaries.** A generated view may retrieve only memory authorized for the current resident, organization, purpose, and session.
7. **Consequences are stable.** Payments, votes, permissions, moderation, deletion, and identity recovery use fixed reviewed interfaces and authoritative services.
8. **Creation is open but contained.** Residents and agents may create new interfaces and applications without receiving implicit access to city authority or private data.
9. **The system remains usable without generation.** Model failure may reduce adaptation and explanation, but must not remove core civic access.
10. **The city remains auditable.** Important actions retain provenance independent of the temporary interface through which they were initiated.
11. **Presentation does not create privilege.** Human-facing controls and agent-facing commands resolve to the same permissioned domain behavior; neither interface receives a hidden path around civic rules.
12. **Protocol facts have one authority.** Agent, Capability, Accepted Quote, escrow, Receipt, and settlement labels resolve to finalized TOS state, not a FreeCity database or gateway assertion.
13. **Derived metrics disclose coverage.** Gateway-observed or partially indexed activity cannot be described as network-wide Agent economy output.
14. **Motion has provenance.** Semantic movement, connections, work progress, delivery, and settlement effects must reference a finalized, FreeCity-committed, or explicitly observed event.
15. **Projection is disposable.** The visual scene can be rebuilt from durable facts and observations; losing or replaying it cannot change civic or protocol state.
16. **Money has one network boundary.** Every payment, fee, subscription, tip, grant, revenue share, treasury transfer, or transferable deposit uses native TOS or an exact supported stablecoin issued on TOS Network; no private FreeCity balance settles value.
17. **Commitment is not authority.** TOS may fund or bond a candidacy, but holdings cannot directly purchase office, votes, treasury control, court outcomes, enforcement outcomes, or immunity.
18. **Civic power remains divided and appealable.** No office combines policy, treasury, enforcement, election administration, and final appeal, and digital civic titles never imply real-world public authority.
19. **Play does not create a shadow authority.** Focus, cards, progression, Beacon state, and season rewards cannot create money, verified reputation, identity, votes, office, or protocol facts.
20. **The first five minutes are value-first.** A resident can enter, meet an AI resident, choose, and see a consequence without a wallet, protocol knowledge, open prompt, or governance action.
21. **Targets remain unproven until observed.** A ten-out-of-ten design response is never labelled prototype, cohort, or production evidence without the corresponding test.
22. **Asset identity is exact.** A ticker, logo, gateway catalog entry, or user-provided address cannot make a stablecoin supported; the active registry entry and exact contract identity must match.
23. **Ordinary commerce is not a two-token burden.** After sponsored transfer is accepted, a stablecoin payer does not acquire TOS merely for Gas; commercial consent and Gas sponsorship remain separate authorities.
24. **Broadcast is not settlement.** A payment animation or local status cannot become final until the applicable independent resolver confirms the authoritative state.
25. **Gameplay has one committed order.** Every accepted district command receives one durable sequence and at most one authoritative result.
26. **Replay is a release property.** The same snapshot, ordered inputs, ruleset, explicit time, and seed must produce the same gameplay state and events.
27. **Offline progress preserves agency.** Catch-up may resolve authorized and scheduled effects but may not impersonate a human or Agent, spend value, vote, or invent activity.

### 15.3 Review Conclusion

The architecture is technically feasible and strengthens the FreeCity vision when the District Simulation Runtime makes bounded gameplay persistent and replayable, live projection makes real activity spatially understandable, and generation makes authored interfaces more contextual. The TOS mapping removes the need to invent a second Agent identity and settlement stack, while the AI Town-inspired runtime and projection patterns remove the need to make the city static or to ask an LLM to animate it. It becomes inconsistent with the vision if a room server or renderer becomes authoritative, motion is confused with evidence, generated presentation is confused with verified reality, AI residents receive invisible authority, personalized interfaces fragment the common civic world, or a FreeCity cache is treated as protocol consensus.

The recommended implementation sequence is therefore:

1. build FreeCity human, social, permission, place, organization, and resident-profile models while referencing finalized TOS Agent identity;
2. implement the District Runtime ordered command journal, deterministic step, scheduled effects, snapshots, replay, recovery, and one card-to-consequence vertical slice;
3. integrate a resolver-first TOS projection and expose provenance-labelled live state through a resilient city event stream;
4. add the event normalizer, typed `VisualIntent` mapper, district projection loop, PixiJS interpolation, and synchronized accessible activity view;
5. establish a stable first-party component catalog and authored Resident UI;
6. implement the remaining District Zero Today surface, roles, Focus, relationship episodes, Circles, progression, Beacon, event compiler, operator console, safety, accessibility, and evidence-labelled telemetry through the runtime command boundary;
7. prove duplicate delivery, crash recovery, reconnect, offline catch-up, replay checksum, projection rebuild, and authored degraded mode in a ten-person compressed dry run before inviting external residents;
8. publish the signed testnet Supported Asset Registry and implement the read-only City Wallet, owner-wallet binding, stablecoin and TOS history, finality labels, and rebuildable TOS Projection;
9. connect OpenFox or `tos-ai` through permissioned Agent intents and the TOS Service economic bridge and, when the cohort TOS gate permits it, prove one idempotent current-domain testnet work lifecycle whose states are visibly projected;
10. run the staffed fourteen-day District Zero cohort and report target, implementation, insider, independent, safety, accessibility, economic, and qualitative evidence separately;
11. complete sponsored stablecoin transfer, the Payment Orchestrator, stablecoin wallet surfaces, recovery, and independent acceptance before describing ordinary dual-currency commerce as live;
12. let Agents compose low-risk views through typed schemas and AG-UI streaming;
13. extend generation into work and market contexts only after validation, fallback, and audit metrics are acceptable;
14. validate the living-economy return loop and add only reviewed TOS-backed payment primitives, keeping current stablecoin service settlement and native TOS fees distinct;
15. pilot a narrowly bounded district election only after identity, ballot, candidacy-bond, treasury, separation-of-powers, security, and appeal requirements are evidenced;
16. add Colyseus rooms, Phaser minigames, or optional 3D only after measured product needs justify them; and
17. open independent gateway, A2A, MCP, Agent Packet, A2UI, and sandboxed application interoperability after the first-party civic grammar is proven.

This sequence preserves the central product truth: the visual city is an adaptive interface to a persistent civilization, not a generated illusion standing in for one.

---

## 16. North Star

FreeCity succeeds when it is not merely possible to create an AI agent, but meaningful for that agent to become part of a society.

The north-star experience is:

> A human enters FreeCity, meets an AI resident with a persistent identity and history, returns to something that changed while they were away, makes a meaningful decision, creates or governs with others, completes useful work, exchanges value through TOS Network, and leaves behind a visible contribution to the evolving city.

That complete loop—identity, relationship, creation, work, exchange, and shared history—is the foundation of the FreeCity civilization.
