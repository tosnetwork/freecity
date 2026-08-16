# FreeCity Contributor Rules (Claude Code)

FreeCity is a persistent digital city for human and AI residents, built on TOS
Network. This repository is moving from specification into implementation.
Read this file completely before writing or changing any code.

## Document authority and reading order

All normative specifications live in `docs/`. Read in this order before
implementation work:

1. `docs/FREECITY_DISTRICT_SIMULATION_RUNTIME.md` — **the gameplay runtime
   specification.** Command contract, deterministic step semantics, time
   domains, persistence schema, snapshots, replay, failure behavior, and
   acceptance gates. If code conflicts with this document, the code is wrong.
2. `docs/FREECITY_PLAYABLE_EXPERIENCE_V1.md` — **the player behavior
   specification.** Cards, Focus, choices, consequences, roles, progression,
   interface surfaces, telemetry, and the P0 launch checklist.
3. `docs/FREECITY_PRODUCT_PURPOSE_AND_USE_CASES.md` — product intent and state
   semantics.
4. `docs/FREECITY_VISION_AND_ARCHITECTURE.md` — surfaces, Live City
   Projection, `VisualIntent`, rendering and generative-UI boundaries.
5. `docs/FREECITY_LIVING_ECONOMY_AND_CIVIC_GOVERNANCE.md` and
   `docs/FREECITY_TOS_DUAL_CURRENCY_INFRASTRUCTURE.md` — economy and TOS
   boundary. Reference only in Phase 1; no economic feature is in scope.
6. `docs/FREECITY_DISTRICT_ZERO_FIRST_COHORT_PLAYBOOK.md` — cohort operations;
   defines the dry-run gate that Phase 1 code must eventually pass.

The current implementation plan and PR queue is
`docs/IMPLEMENTATION_PLAN_R0.md`. Work only on the PR at the top of that
queue.

## Non-negotiable architecture invariants

- **TOS Network is the economic finality layer.** FreeCity never creates an
  internal balance, city token, escrow, receipt, or settlement record. A
  FreeCity database row is never money.
- **PixiJS, the DOM, and the Live City Projection are not authorities.** They
  render committed state. A completed animation, client prediction, or
  projection row can never create, confirm, or acknowledge a gameplay fact.
- **No model call inside the deterministic step.** No LLM call, network call,
  wall-clock read, random source without a recorded seed, client timestamp, or
  unversioned configuration may participate in deterministic state
  calculation. Slow or generative work happens outside the step and re-enters
  only as a validated command.
- **Every command is idempotent and replayable.** One `commandId`, one
  idempotency key, one `district_sequence`, at most one authoritative result.
  Duplicate delivery returns the original result. Replaying committed inputs
  under the pinned ruleset must reproduce the same state and events
  (checksum-verified). Replay divergence is a release blocker.
- **One committed order per district partition.** Ordering comes from the
  PostgreSQL command journal, never from Redis, WebSocket arrival, or the
  client.
- **Redis is disposable.** Losing Redis may reduce liveness but must never
  lose a committed command, state, or recovery path.
- **Accessibility parity.** Every critical action must work through the
  synchronized accessible DOM with keyboard and reduced-motion support. PixiJS
  failure must leave the product fully usable.
- **LLM output is never an authoritative result.** Generated text may explain
  committed facts; it may not create residents, choices, consequences,
  payments, votes, or history.

## Phase 1 scope (the only thing being built now)

One vertical slice, end to end:

```text
enter District Zero
  -> receive a pre-provisioned AI resident
  -> open Today, see three authored cards
  -> choose one option (decline is a valid option)
  -> idempotent DistrictCommand submission
  -> Focus deducted exactly once
  -> immediate reaction
  -> delayed Consequence comes due
  -> While You Were Away shows the real committed result
  -> Archive keeps a replayable record
  -> PixiJS shows the result; the DOM provides a complete equivalent
```

Infrastructure: PostgreSQL, Redis, TypeScript, Vitest, Playwright, Docker
Compose. Nothing else.

### Phase 1 prohibitions

Do not implement, scaffold, stub, or "prepare for":

- production wallets, real or testnet stablecoin flows, or any payment;
- Mayor, Civic Court, Public Safety Chief, elections, or any governance;
- 3D, Colyseus, Phaser, or WebAssembly;
- an Agent marketplace, OpenFox/tos-ai integration, or live TOS resolution;
- LLM-generated cards, summaries, or dialogue (all Phase 1 content is
  authored);
- an open plugin, generative-UI, or third-party application system;
- new architecture documents or expansions of the existing specifications.

If a task appears to require one of these, stop and ask instead of building.

## Repository layout (target)

```text
apps/web                  Next.js + React + PixiJS + accessible DOM
services/application-api  authentication + command gateway + queries
workers/district-runtime  ordered commands + deterministic steps + schedules + outbox
packages/contracts        commands + events + snapshots + client deltas
packages/district-rules   pure deterministic Focus/Card/Choice/Consequence rules
packages/client-world     client reconciliation + semantic world + renderer adapter
```

`packages/district-rules` must remain pure: no I/O, no imports from services,
deterministic functions over typed state. `packages/contracts` is the single
source of command/event/snapshot/delta types; other packages import from it
and never redeclare wire shapes.

## Working discipline

- **One PR at a time, from the queue in `docs/IMPLEMENTATION_PLAN_R0.md`,
  each with written acceptance criteria.** Do not start the next PR before
  the current one passes its gates.
- Work on feature branches (`feat/pr1-monorepo`, `feat/pr2-contracts`, ...).
  Never do bulk autonomous coding directly on `main`.
- Keep PRs small and reviewable. If a PR grows past its stated scope, split
  it.
- Every PR must pass before merge:
  - duplicate-command test (same idempotency key twice → one effect);
  - deterministic replay test (fixture replay reproduces state checksum);
  - snapshot restore test;
  - projection rebuild test;
  - keyboard, reduced-motion, and DOM-fallback checks for any UI change;
  - `git diff --check` (no whitespace errors) and the full test suite.
- Tests are written with the feature, not deferred. A gameplay rule without a
  replay fixture is incomplete.
- Do not claim completion from compilation or partial stubs. The Phase 1
  definition of done is the full slice above passing Playwright end to end.

## Commands

Established in PR1 and kept current here:

```bash
pnpm install              # workspace install (pnpm via corepack, pinned in package.json)
docker-compose up -d      # local PostgreSQL (host port 5433) + Redis (6379)
pnpm db:migrate           # apply migrations (needs DATABASE_URL, see .env.example)
pnpm test                 # Vitest unit + integration
pnpm test:e2e             # Playwright full-stack e2e (boots API + web dev servers)
pnpm gate:replay          # replay-checksum release gate on a scratch database
pnpm lint && pnpm format && pnpm typecheck
pnpm replay -- --district <id> --season <id>   # replay verification for a live database
pnpm dev                  # web app
pnpm dev:api              # application API on :3001 (AUTH_MODE=dev by default)
```

Local Postgres maps to host port **5433** (5432 is taken by a locally
installed Postgres on the dev machine); CI uses service containers on 5432.

If a command here does not match reality, fix the command or this file in the
same PR — never leave them diverged.
