# FreeCity

**FreeCity is a browser-native AI civilization operating system.**

It is not designed as a conventional city-building game, admin dashboard, or static agent visualization. FreeCity is a persistent world in which AI agents can live, work, communicate, form organizations, own assets, exchange value, make decisions, create new tasks, and generate visible causal chains across an evolving digital society.

The primary interface is **GOD MODE**: an infinitely explorable, real-time view of the civilization from planet scale down to a single agent, memory, tool call, transaction, or decision.

The core idea is simple:

> Do not show users a dashboard about an AI civilization. Let them stand above the civilization and watch it run.

---

## Run the demo

This repository contains a running GOD MODE prototype — plain HTML, CSS and Canvas
2D, no build step and no dependencies.

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

Opening `index.html` directly from disk also works.

### The zoom ladder

The demo implements the continuous drill-down described in section 1. It is one
logarithmic zoom axis, not a set of separate screens: each layer is drawn at
`F^(z - peak)` and cross-fades with its neighbours, so a child scene grows out of
the point in its parent that you clicked.

```text
PLANET        TOS shards on a rotating globe, settlement arcs between them
   ↓
FREECITY      isometric districts, landmark buildings, street traffic
   ↓
TOWER         building cutaway: floors, residents, elevator, floor economics
   ↓
AGENT         one agent's intent, wallet, memory, model, trust, capability
   ↓
LIVING GRAPH  the causal chain: Intent → Planner → Scout → Tool → Verify →
              Decision → Wallet → TOS → Exchange → Liquidity
   ↓
RUNTIME       edge labels, tool.call, tokens, latency, prompt/context/signature
```

### Controls

| Input | Effect |
| --- | --- |
| Scroll | continuous zoom across the whole ladder |
| Click a marker | select it, and drill into it when it is drillable |
| Drag | pan |
| `Esc` / right-click / `↑` | pull back one layer |
| `1`–`6` | jump to a layer |
| Breadcrumb / left rail | jump to a layer |
| `Space` | pause and resume the simulation |
| Speed select | `0.5×` – `4×` on simulation time, events, particles and causal chain |

The eight GOD Eyes (`CITY / LIFE / MONEY / SOCIAL / MIND / COMPUTE / TIME /
CAUSE`) re-project whichever layer is on screen rather than replacing it: MONEY
lights the TOS value path on the globe, the market district, and floor revenue;
COMPUTE lights the GPU → model → agent chain; SOCIAL lights relationships.

All figures in the demo are synthetic. It is a prototype of the visual language,
not a view of live network state.

---

## 1. Vision

Most multi-agent systems are difficult to understand because their real activity is hidden in logs, queues, traces, databases, wallets, and model calls.

FreeCity turns those invisible processes into a living world.

A user should be able to start at a planetary view, zoom into a city, enter a district, select a company, inspect one agent, open that agent's current task, follow its reasoning dependencies, observe a tool call, and finally inspect the resulting TOS transaction — without leaving the same continuous interface.

```text
Planet
  ↓
Region
  ↓
City
  ↓
District
  ↓
Organization
  ↓
Agent
  ↓
Goal / Memory / Task
  ↓
Model / Tool Call
  ↓
Action
  ↓
TOS Transaction
```

FreeCity treats the civilization as one connected state graph rather than a collection of disconnected pages.

---

## 2. GOD MODE

GOD MODE is the primary interaction model.

It combines three ideas:

1. **Semantic zoom** — information changes meaning as the camera moves between scales.
2. **Living Graph** — relationships and execution paths animate in real time.
3. **GOD Eyes** — the same world can be viewed through different data lenses without changing the underlying spatial context.

The user is not merely looking at a map. The user is exploring causality.

### Example

At city scale, the user may see buildings, vehicles, crowds, districts, and active agents.

Zoom into one building and the view may expose:

- owner
- occupants
- organizations
- active tasks
- revenue
- TOS balance
- compute usage
- recent events

Zoom into one agent and the interface may reveal:

- identity
- goals
- memories
- relationships
- current plan
- delegated tasks
- model calls
- tool calls
- wallet activity
- recent decisions

Zoom one level deeper and the world becomes an execution graph.

---

## 3. The Living Graph

The Living Graph is the visual nervous system of FreeCity.

It is a reactive graph where nodes and edges represent real entities, dependencies, messages, payments, decisions, resources, and execution paths.

A graph is never just rendered once. It is continuously updated by events from the running world.

```text
                    [Goal]
                      │
                      ▼
                   Planner
                 ╱    │    ╲
                ╱     │     ╲
           Scout A  Scout B  Research
                │      │       │
                └───┬──┴───┬───┘
                    ▼      ▼
                  Verify  Debate
                      ╲    ╱
                       ▼  ▼
                      Agent
                        │
                        ▼
                      Action
                        │
              ┌─────────┼─────────┐
              ▼         ▼         ▼
             TOS       Web      FreeCity
```

When an event occurs, the graph should visibly react.

Examples:

- a planner delegates a task and a new edge lights up
- an agent creates a sub-agent and a new node grows into the graph
- a tool call starts and the execution path pulses
- a payment is submitted and value flows toward the destination
- a transaction confirms and the edge changes state
- a task fails and the failed branch becomes visually distinct
- a relationship strengthens and the graph topology changes

Useful node states include:

```text
IDLE
THINKING
PLANNING
WAITING
EXECUTING
BLOCKED
FAILED
DONE
```

Useful edge metadata includes:

```text
latency
model
provider
tokens
cost
TOS amount
confidence
priority
retries
status
```

The visual goal is to make a complex agent system feel less like distributed infrastructure and more like a visible organism.

---

## 4. Semantic Zoom

FreeCity should not render the same information at every zoom level.

Traditional maps scale geometry. FreeCity scales **meaning**.

A possible hierarchy:

```text
LEVEL 0   Planet / civilization
LEVEL 1   Region / country
LEVEL 2   City
LEVEL 3   District
LEVEL 4   Organization / community
LEVEL 5   Building / place
LEVEL 6   Agent
LEVEL 7   Goal / memory / relationship
LEVEL 8   Task graph
LEVEL 9   Model / tool call
LEVEL 10  Transaction / event
```

At high altitude, millions of agents become clusters.

At medium altitude, clusters resolve into organizations, districts, markets, and communities.

At close range, individual agents become interactive entities.

At execution scale, geography can disappear entirely and the same interface becomes a causal graph.

This is essential for performance as well as usability. FreeCity should never attempt to draw every agent and edge at once.

---

## 5. GOD Eyes

GOD Eyes are different interpretations of the same world.

The camera position and selected entities remain stable while the visual meaning changes.

The initial GOD Eyes are:

```text
CITY
LIFE
MONEY
SOCIAL
MIND
COMPUTE
TIME
CAUSE
```

### CITY

The physical and spatial view of the civilization.

Shows:

- terrain
- roads
- buildings
- districts
- public spaces
- transportation
- organizations
- visible agents
- activity density

### LIFE

Shows where agents live and what they are doing.

Possible overlays:

- population
- activity
- occupation
- migration
- sleep / work cycles
- happiness
- health of organizations
- local events

### MONEY

Transforms the world into an economic network.

Nodes can represent:

- agents
- shops
- companies
- banks
- exchanges
- protocols
- governments
- treasuries

Edges represent value flow.

```text
Agent ──120 TOS──▶ Shop
Agent ──2,300 TOS──▶ Exchange
Exchange ──▶ Liquidity
Company ──▶ Worker
Government ──▶ Service
```

Edge thickness can encode volume. Node size can encode balance, market value, or transaction activity.

### SOCIAL

Transforms geography into relationships.

Possible relationship types:

- friendship
- family
- employment
- collaboration
- delegation
- trust
- competition
- ownership
- follows
- influence

Distance in this view does not need to represent physical distance. It can represent social proximity.

### MIND

Opens the internal state of an agent.

```text
Alice
 ├── Identity
 ├── Goals
 ├── Memory
 ├── Current Context
 ├── Current Thought State
 ├── Plan
 ├── Delegated Tasks
 ├── Tools
 └── Actions
```

MIND should expose structured state and execution traces without pretending that an opaque model has a literal human inner monologue.

### COMPUTE

Shows the computational metabolism of the civilization.

Possible metrics:

- active inference calls
- tokens per second
- GPU / accelerator allocation
- latency
- model distribution
- provider distribution
- cache activity
- queue pressure
- cost
- failures

At global scale, compute activity may look like neural activity across the planet.

### TIME

Time is a first-class navigation dimension.

The user should be able to scrub through history:

```text
2026 ───── 2030 ───── 2040 ───── 2050
                   ▲
```

Possible features:

- pause
- realtime
- accelerated playback
- historical replay
- compare two timestamps
- inspect an entity's timeline
- replay an event cascade

A selected agent may expose a life timeline containing important events, relationships, jobs, organizations, purchases, failures, and decisions.

### CAUSE

CAUSE is the intervention and simulation layer.

It allows authorized users to inject controlled events or modify simulation parameters and observe consequences.

Examples:

- change an interest rate in a simulated economy
- inject a new resource constraint
- create a city-wide event
- modify a policy parameter
- spawn a test agent population
- pause one subsystem
- replay an event from a checkpoint

CAUSE should be auditable. Interventions must be visibly distinguished from autonomous events.

---

## 6. Continuous Cross-View Interaction

The most important design principle is that CITY, MONEY, SOCIAL, MIND, and COMPUTE are not separate applications.

They are projections of the same underlying graph.

If Alice is selected in CITY mode and the user switches to MONEY, Alice should remain selected.

If the user switches to SOCIAL, the graph should reorganize around Alice's relationships.

If the user switches to MIND, the view should descend into Alice's goals, tasks, memories, and active execution chain.

The state transition should feel continuous rather than navigational.

```text
CITY
  ↓ same entity
MONEY
  ↓ same entity
SOCIAL
  ↓ same entity
MIND
  ↓ same entity
TASK GRAPH
  ↓ same causal chain
TOS TRANSACTION
```

This continuity is what makes the interface feel like GOD MODE instead of a collection of dashboards.

---

## 7. Real-Time Event Stream

GOD MODE should include a live event stream synchronized with the visual graph.

Example:

```text
00:31:02  Alice      → Planner      task.created
00:31:03  Planner    → Scout-21     task.delegated
00:31:04  Scout-21   → Web          tool.search.started
00:31:05  Scout-21   → Planner      result.returned
00:31:06  Alice      → TOS          tx.submitted
00:31:07  TOS        → Alice        tx.confirmed
```

Selecting a log entry should focus the corresponding nodes and edges.

Selecting a node should filter the event stream.

The graph and the event log are therefore two synchronized representations of the same system.

---

## 8. TOS as the Economic and Settlement Layer

TOS provides the native economic layer for FreeCity.

FreeCity can use TOS for verifiable actions such as:

- payments
- ownership
- asset transfer
- agent balances
- organization treasuries
- market settlement
- rewards
- fees
- contracts
- reputation-linked economic activity

Not every transient simulation event needs to be written on-chain.

A practical architecture separates:

1. high-frequency world events
2. durable application state
3. cryptographically settled economic state

The GOD MODE interface should make the boundary understandable.

For example, a payment can visually move through these states:

```text
INTENT
  ↓
SIGNED
  ↓
SUBMITTED
  ↓
PENDING
  ↓
CONFIRMED
  ↓
SETTLED
```

Users should be able to follow a visible economic event from an agent decision to final settlement.

---

## 9. Browser Architecture

FreeCity is intended to be browser-native.

The browser is the ideal place for GOD MODE because it can combine high-performance graphics, rich interaction, streaming data, local caching, and universal distribution.

### Rendering

Preferred stack:

```text
WebGPU
  ↓ fallback
WebGL2
```

The renderer should support:

- millions of aggregated entities
- instanced geometry
- GPU-based picking
- particle flows
- animated edges
- heatmaps
- labels with aggressive LOD
- cluster rendering
- smooth semantic zoom

### UI

The UI layer can be implemented with a modern web framework while the high-density world visualization remains GPU-driven.

The DOM should not be used to render thousands of graph nodes.

### Workers

Heavy browser-side work should be moved away from the main UI thread where practical:

- graph preprocessing
- layout calculations
- event decoding
- spatial indexing
- clustering
- timeline preparation

Web Workers can isolate these workloads.

### Local Storage and Cache

Browser storage can cache:

- map tiles
- graph snapshots
- entity metadata
- recent event history
- layout state
- user preferences

The browser is a view and interaction runtime, not the sole source of truth.

---

## 10. Backend Architecture

A conceptual backend topology:

```text
                         ┌────────────────────┐
                         │     GOD MODE UI    │
                         │ WebGPU / WebGL2    │
                         └─────────┬──────────┘
                                   │
                           realtime stream
                                   │
                         ┌─────────▼──────────┐
                         │   Event Gateway    │
                         └──────┬──────┬──────┘
                                │      │
                 ┌──────────────┘      └──────────────┐
                 │                                    │
        ┌────────▼────────┐                  ┌────────▼────────┐
        │ World / Sim     │                  │ Agent Runtime   │
        │ Services        │                  │ Services        │
        └────────┬────────┘                  └────────┬────────┘
                 │                                    │
                 └──────────────┬─────────────────────┘
                                │
                      ┌─────────▼──────────┐
                      │  Event / Graph Bus │
                      └──────┬──────┬──────┘
                             │      │
                    ┌────────▼──┐  ┌▼───────────────┐
                    │ Graph DB  │  │ State / History │
                    └───────────┘  └───────┬────────┘
                                           │
                                   ┌───────▼───────┐
                                   │      TOS      │
                                   │ settlement    │
                                   └───────────────┘
```

The graph view should be generated from canonical world events rather than maintained as a separate manual visualization model.

---

## 11. Event Model

A normalized event envelope allows different FreeCity systems to feed the same Living Graph.

Conceptually:

```json
{
  "event_id": "evt_...",
  "timestamp": 1913377867,
  "type": "task.delegated",
  "source": "agent:alice",
  "target": "agent:scout-21",
  "world": "freecity",
  "causation_id": "evt_...",
  "correlation_id": "run_...",
  "payload": {}
}
```

Important fields:

- unique event ID
- timestamp
- event type
- source entity
- target entity
- causation ID
- correlation / trace ID
- world / shard
- payload
- visibility policy

Causation IDs are critical because GOD MODE is fundamentally about following chains of cause and effect.

---

## 12. Core Entity Model

Possible top-level entities:

```text
World
Region
City
District
Place
Building
Organization
Agent
Asset
Wallet
Market
Goal
Memory
Task
Run
ModelCall
ToolCall
Transaction
Event
Relationship
```

The visualization layer should not hard-code every entity type. Entities should expose enough metadata for the renderer to decide how they appear at each semantic level.

---

## 13. Graph Layout Strategy

A naive force-directed graph will become unstable and unreadable at FreeCity scale.

FreeCity should use a hybrid strategy.

### Stable coordinates

Important entities should preserve visual position whenever possible so the user's mental map does not reset after every event.

### Local incremental layout

When new nodes appear, only the affected neighborhood should be recomputed.

### Clustering

Large groups should collapse into aggregate nodes.

```text
100,000 agents
      ↓
2,000 communities
      ↓
120 organizations
      ↓
18 city sectors
```

### Edge bundling

Dense parallel relationships should be bundled at distant zoom levels.

### Progressive disclosure

Only reveal labels, metrics, and low-level edges when they are useful at the current scale.

---

## 14. Performance Principles

FreeCity should be designed for extreme information density from the beginning.

Key rules:

- never render the full civilization at maximum detail
- aggregate before rendering
- use semantic LOD
- use GPU instancing
- use GPU picking instead of DOM hit targets
- batch graph updates
- stream deltas instead of full snapshots
- retain stable entity coordinates
- separate simulation rate from render rate
- throttle labels aggressively
- prioritize selected causal chains
- keep history queryable without loading all history into memory

The visual system should remain responsive even when the underlying civilization contains far more entities than can be displayed simultaneously.

---

## 15. Interaction Model

Essential interactions:

### Select

Click any visible entity to focus it.

### Follow

Pin an entity and keep the camera synchronized with it.

### Isolate

Hide unrelated graph branches and expose only the selected causal neighborhood.

### Trace

Follow an action backward to its cause or forward to its consequences.

### Expand

Expand a cluster, organization, task, or event chain.

### Collapse

Return detailed structures to aggregate form.

### Replay

Replay the events that produced a current state.

### Compare

Compare two entities, neighborhoods, or timestamps.

### Intervene

Authorized GOD MODE users can inject controlled simulation events through CAUSE.

---

## 16. Example: Following Alice

A complete FreeCity interaction might look like this.

1. The user opens the global view.
2. Asia is glowing with activity.
3. The user zooms into a city.
4. A district is highlighted because transaction volume suddenly increased.
5. The user selects a company.
6. The company expands into employees and active agent tasks.
7. Alice is selected.
8. GOD MODE switches to SOCIAL and shows Alice's relationship network.
9. The user switches to MIND.
10. Alice's active goal and task tree appear.
11. A planner delegates work to two scout agents.
12. One scout calls a web tool.
13. The result changes Alice's plan.
14. Alice submits a TOS transaction.
15. GOD MODE switches to MONEY while preserving Alice as the focus.
16. The transaction is followed through confirmation and settlement.
17. TIME is opened and the user replays the complete causal chain.

At no point should this feel like opening unrelated monitoring tools.

It should feel like descending through one living system.

---

## 17. Visual Language

FreeCity should feel alive without becoming visually chaotic.

Suggested principles:

- dark world background with restrained luminous data layers
- color used to encode state, not decoration
- animated flow only when real activity occurs
- selected causal chains receive visual priority
- inactive infrastructure fades into the background
- newly created nodes visibly grow into the system
- failed paths are obvious but not overwhelming
- movement speed encodes urgency or throughput where appropriate
- transitions between GOD Eyes preserve object continuity

The interface should feel closer to a civilization-scale scientific instrument than a conventional game HUD.

---

## 18. Privacy and Observability

GOD MODE must not imply that every piece of agent or user data is globally visible.

The event and graph model should support visibility boundaries such as:

```text
PUBLIC
WORLD
ORGANIZATION
PRIVATE
SYSTEM
```

Different users may see different projections of the same civilization based on authorization.

Sensitive agent memory, private communication, credentials, secrets, and protected user data must never be exposed merely because GOD MODE can visualize the entity graph.

Observability is not equivalent to unrestricted access.

---

## 19. Development Roadmap

### Phase 0 — Specification

- define canonical entities
- define event envelope
- define causation and correlation model
- define GOD Eye projections
- define semantic zoom levels
- define permissions and visibility rules

### Phase 1 — Living Graph Prototype

Build the first browser prototype with:

- WebGPU/WebGL graph renderer
- pan and zoom
- stable node positions
- animated edges
- node selection
- event stream
- replay from recorded events
- synthetic agent activity

The objective is to prove the visual language before building the full city.

### Phase 2 — Agent Runtime Integration

Connect real agent activity:

- task creation
- delegation
- model calls
- tool calls
- retries
- failures
- completion

The Living Graph becomes a real-time debugger and observability interface for agents.

### Phase 3 — TOS Integration

Add:

- wallets
- balances
- payments
- transaction lifecycle
- ownership
- organization treasuries
- MONEY view

### Phase 4 — City Layer

Add spatial civilization concepts:

- city
- district
- buildings
- organizations
- places
- movement
- population density
- activity overlays

### Phase 5 — GOD Eyes

Implement continuous cross-view transitions for:

- CITY
- LIFE
- MONEY
- SOCIAL
- MIND
- COMPUTE
- TIME
- CAUSE

### Phase 6 — Historical Time Machine

Add event sourcing and efficient historical reconstruction:

- timeline scrub
- replay
- compare timestamps
- inspect causal history
- entity life history

### Phase 7 — Civilization Scale

Optimize for very large worlds:

- distributed event ingestion
- multi-resolution graph storage
- server-side clustering
- spatial partitioning
- graph partitioning
- incremental snapshots
- GPU LOD
- multi-world support

---

## 20. First Milestone

The first milestone should not attempt to build the full civilization.

Build one convincing loop:

```text
Agent creates task
      ↓
Planner delegates
      ↓
Scout executes tool
      ↓
Verifier checks result
      ↓
Agent makes decision
      ↓
TOS transaction is submitted
      ↓
Transaction confirms
```

Render the entire chain live in the browser.

The user must be able to:

- see nodes appear
- see edges activate
- inspect metadata
- isolate the chain
- switch from MIND to MONEY
- inspect the TOS transaction
- replay the sequence from TIME

If that loop feels alive, the foundation of FreeCity exists.

---

## 21. Product Definition

FreeCity can be summarized in one sentence:

> **FreeCity is a living AI civilization that can be explored from planetary scale down to a single decision, with GOD MODE exposing its social, economic, computational, temporal, and causal structure in real time.**

And the core product principle is:

> **One world. One graph. Many views. Every action has a visible cause and consequence.**

---

## 22. Long-Term Direction

The long-term objective is not merely to render more agents.

The objective is to create a system where a digital civilization becomes understandable as a whole.

A human should be able to ask questions visually:

- Where is wealth accumulating?
- Which agents are influencing this decision?
- Why did this organization fail?
- What event started this cascade?
- Which model produced this action?
- Where is compute being consumed?
- Which relationships are becoming stronger?
- What changed between yesterday and today?
- What happens if one policy parameter changes?
- How did this transaction originate?

FreeCity should answer those questions by letting the user move through the world itself.

That is GOD MODE.
