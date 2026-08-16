# FreeCity Implementation Plan — R0 Runtime Core + First Vertical Slice

**Document version:** 0.1 (proposed, awaiting review)<br>
**Last updated:** 2026-08-16<br>
**Document role:** Executable PR queue, monorepo structure, schema drafts, test
matrix, and open decisions for Phase 1<br>
**Normative sources:** [District Simulation Runtime](FREECITY_DISTRICT_SIMULATION_RUNTIME.md) (runtime authority) and [Playable Experience V1](FREECITY_PLAYABLE_EXPERIENCE_V1.md) (player behavior)

## 1. Scope

Exactly one vertical slice (see repository `CLAUDE.md` for the full chain and
the prohibition list). Success criterion: ten internal testers can complete
enter → three authored cards → choice → immediate reaction → delayed
consequence → While You Were Away → Archive, with duplicate-command,
crash-recovery, replay, and accessibility gates passing.

Out of scope for every PR below: payments, TOS resolution, governance, LLM
generation, Agent runtime integration, 3D, rooms, minigames.

## 2. Monorepo

```text
freecity/
├── apps/web                   # Next.js App Router, React, PixiJS adapter, accessible DOM
├── services/application-api   # Fastify (or Next API routes) auth + command gateway + queries + SSE
├── workers/district-runtime   # long-running Node process: lease, journal consumer, step, scheduler, outbox
├── packages/contracts         # zod schemas + TS types: commands, events, snapshots, deltas
├── packages/district-rules    # pure deterministic state machines + replay fixtures
├── packages/client-world      # client reconciliation, semantic world state, renderer adapter interface
├── docs/                      # specifications (this folder)
├── docker-compose.yml         # postgres:16 + redis:7
└── pnpm-workspace.yaml
```

Tooling: pnpm workspaces, TypeScript strict, tsx for the worker, Vitest,
Playwright, ESLint + Prettier, node-pg-migrate (or drizzle-kit) for
migrations. No ORM in the runtime hot path — the journal and step use explicit
SQL in one transaction.

### Package dependency graph

```text
contracts        ← (nothing internal)
district-rules   ← contracts
client-world     ← contracts
district-runtime ← contracts, district-rules
application-api  ← contracts, district-runtime   (command gateway reuses the
                   journal/step/catch-up library; the worker process stays
                   the only scheduled-wake owner)
web              ← contracts, client-world
```

`district-rules` and `contracts` never import from apps/services/workers.

## 3. Database (PostgreSQL, one schema `district`)

From Runtime §8.1, minimum tables:

```sql
district_runtime      (district_id, season_id, runtime_version, ruleset_version,
                       last_step_time, last_sequence, status, PK(district_id, season_id))
district_command      (command_id PK, idempotency_key, district_id, season_id,
                       command_type, schema_version, actor_ref, actor_authority,
                       payload jsonb, result jsonb, status, district_sequence,
                       received_at, applied_at,
                       UNIQUE(district_id, season_id, idempotency_key),
                       UNIQUE(district_id, season_id, district_sequence))
district_event        (event_id PK, district_id, season_id, district_sequence,
                       event_seq, event_type, schema_version, causation_command_id,
                       authority_class, privacy_scope, payload jsonb, created_at,
                       UNIQUE(district_id, season_id, district_sequence, event_seq))
scheduled_effect      (effect_id PK, district_id, season_id, effect_key UNIQUE-per-district,
                       effect_type, due_at, ruleset_version, state, payload jsonb)
district_snapshot     (snapshot_id PK, district_id, season_id, runtime_version,
                       schema_version, checksum, reason, state jsonb, created_at)
district_correction   (correction_id PK, references original event, operator_ref, reason)
projection_checkpoint (consumer_id PK, district_id, season_id, last_sequence, last_event_seq)
outbox                (id PK, district_id, season_id, event_id, published_at NULL)
```

Application tables (owned by `application-api`):

```sql
account          (account_id PK, passkey credential or dev-login identity, created_at)
resident         (resident_id PK, account_id NULL for AI, kind human|ai,
                  display_name, controller_note, created_at)
season_member    (season_id, district_id, resident_id, role, joined_at,
                  sponsored_ai_resident_id)
authored_card    (card_template_id PK, event_family, title, body,
                  options jsonb  -- 2–3 options, each with reaction template,
                                 -- consequence template, delay, focus_cost
                  , accessibility_summary, version)
```

Gameplay state (Focus balances, assigned cards, pending consequences, Archive
entries) lives in the runtime state snapshot + events, not in separately
mutated tables; the Archive and Today views are projections rebuilt from
`district_event`.

Redis: district lease (`SET NX PX`), ready-queue notification, SSE fan-out
pub/sub, session cache. All rebuildable.

## 4. Contracts (packages/contracts, zod)

`DistrictCommandEnvelope` exactly as Runtime §5. Phase 1 command types:

| commandType | actorAuthority | payload |
|---|---|---|
| `season.provision_resident` | system/operator | residentId, role, aiResidentId |
| `card.assign` | system (compiler stub reads `authored_card`) | cardId, templateId, residentId, expiry |
| `card.commit_choice` | human | cardId, optionId, expectedRuntimeVersion |
| `card.decline` | human | cardId, reason? |
| `runtime.run_due_effects` | system (scheduler) | limit (the explicit stepTime is a step argument, not payload) |

Phase 1 event types: `ResidentProvisioned`, `CardAssigned`, `FocusSpent`,
`ChoiceCommitted`, `CardDeclined`, `ImmediateReactionRecorded`,
`ConsequenceScheduled`, `ConsequenceResolved`, `ArchiveEntryRecorded`,
`FocusRefreshed`, `CardExpired`.

Snapshot state (deterministically serializable, checksummed with SHA-256 over
canonical JSON):

```ts
type DistrictState = {
  stateVersion: number;
  residents: Record<ResidentId, { focus: number; role: Role;
    activeCards: CardInstance[]; pendingConsequences: ConsequenceRef[] }>;
  sequence: number;
  stepTime: string;          // explicit, scheduler-provided
  rulesetVersion: string;
  rngSeed: string;           // recorded even though slice rules use no randomness
};
```

Client delta: `{ fromVersion, toVersion, events: DistrictEventView[] }` with a
snapshot-or-reset response for stale clients (Runtime §9.1).

## 5. PR queue (work strictly in order)

### PR1 — Monorepo, CI, infra, test frameworks
Scaffold workspace, docker-compose (Postgres+Redis), migrations tooling with
an initial empty migration, Vitest + Playwright wiring, lint/typecheck, GitHub
Actions running the full suite, `CLAUDE.md` command block verified.
**Accept:** `pnpm install && docker compose up -d && pnpm db:migrate &&
pnpm test && pnpm lint && pnpm typecheck` all pass green in CI from a clean
checkout.

### PR2 — Contracts + pure district-rules
All zod schemas from §4; pure reducers in `district-rules`:
`applyCommand(state, command, stepTime) → { state, events } | rejection`;
Focus spend/refresh, card assign/choose/decline/expire, consequence
schedule/resolve; first replay fixtures (ordered inputs → expected state
checksum + events).
**Accept:** 100% of rules covered by unit tests incl. rejection paths (no
Focus, expired card, wrong version, duplicate choice); fixtures reproduce
checksums; package has zero I/O imports (enforced by lint rule).

### PR3 — Runtime worker: journal, idempotency, step, snapshot, outbox, replay
Command gateway writes journal; worker leases district, consumes ordered
inputs, runs deterministic step in one transaction (state + events + sequence
+ outbox), scheduled-effect execution with bounded batches, snapshot
create/restore, replay CLI (`pnpm replay --district ... --from-snapshot ...`)
comparing checksums.
**Accept:** duplicate `idempotencyKey` returns original result with no second
effect; kill -9 before/after commit recovers to consistent state; Redis
flushed mid-run loses nothing durable; replay CLI matches checksum for every
fixture; stale `expectedRuntimeVersion` gets explicit conflict.

### PR4 — Application API + Today/Archive slice content
Dev-login (passkey deferred, see §7), season provisioning with one authored AI
resident per human, three authored cards (Relationship / Opportunity /
District from Playable §5.4 examples), `card.commit_choice` / `card.decline`
endpoints → command gateway, Today query (cards + Focus + While You Were Away
from committed events only), Archive query, SSE event stream with
reconnect-from-version.
**Accept:** API-level Vitest integration tests for the full chain incl. WYWA
citing only committed event IDs; SSE reconnect returns missing deltas or
snapshot+deltas; no endpoint mutates state outside the command path.

### PR5 — Web app: Today UI, PixiJS projection, accessible DOM
Next.js Today surface (three cards, option confirm, immediate reaction,
pending-state UI keyed by commandId), District view: PixiJS behind a renderer
adapter consuming semantic state, synchronized DOM activity list + detail
panel with full parity, keyboard + reduced-motion + PixiJS-disabled modes.
**Accept:** every slice action completable with keyboard only and with PixiJS
disabled; reduced motion preserves all information; pending choice visibly
pending until authoritative result arrives; no client-side state commit.

### PR6 — Hardening + E2E
Crash-recovery and duplicate-submission chaos tests, bounded offline catch-up
(resident away past consequence due-time returns to correct WYWA), replay
checksum in CI as release gate, Playwright E2E of the whole slice (incl.
refresh mid-choice, reconnect, double-click submit), a11y automated checks.
**Accept:** all Runtime §17 gates that apply to the slice pass; Playwright
suite green in CI; ten-person dry-run checklist items for this slice
demonstrably executable.

## 6. Test matrix

| Layer | Tool | Must cover |
|---|---|---|
| district-rules | Vitest unit + fixtures | every rule, every rejection, checksum reproducibility |
| runtime worker | Vitest integration (real PG+Redis via compose) | ordering, idempotency, conflict, crash before/after commit, snapshot restore, scheduled effects, bounded catch-up, outbox republish |
| replay | CLI in CI | every release fixture, divergence fails the build |
| application-api | Vitest integration | auth boundary, command path exclusivity, Today/Archive/WYWA correctness, SSE resume |
| web | Playwright + axe | full slice, keyboard-only, reduced motion, PixiJS off, duplicate submit, refresh/reconnect |

## 7. Open decisions and spec ambiguities (resolve before/during PR noted)

1. **Auth for Phase 1** — **resolved in PR4**: dev email-code login
   (six-digit single-use code, ten-minute expiry, bearer sessions; the code
   is returned in-response only under `authMode: "dev"`). Passkeys are a
   hard requirement before any external cohort.
2. **Focus refresh rule** — **resolved in PR2**: refresh sets Focus to at
   least 3 at the UTC day-key rollover, applied inside
   `runtime.run_due_effects`; being away several days grants at most one
   refresh (`lastFocusRefreshDayKey` guard). Season-timezone (non-UTC)
   rollover deferred until a cohort needs it.
3. **Card expiry** — **resolved in PR2**: template-defined
   `expiresAfterHours` (default 48, max 336); expiry emits `CardExpired`
   plus a non-punitive Archive entry.
4. **SSE vs WebSocket** — **resolved in PR4**: SSE with
   `?from=<sequence>` / `Last-Event-ID` resume over the committed event log
   (DB-tail polling for now; a Redis notify optimization may come with
   PR5/PR6). Commands go over HTTP POST.
5. **Immediate reaction representation** — **resolved in PR2**: it is a
   committed `ImmediateReactionRecorded` event carrying the authored
   reaction text, not derived UI text.
6. **Consequence delay** — **resolved in PR2**: authored per option as
   `consequenceDelayMinutes`; compressed seasons author shorter delays; no
   time-scale multiplier exists inside deterministic logic.
7. **AI resident in Phase 1** (PR4): purely authored persona (name, style,
   controller note); it "acts" only through authored card copy. No runtime,
   no autonomy levels yet. Confirm this satisfies the slice's
   "pre-provisioned AI resident" requirement.
8. **Checksum canonicalization** — **resolved in PR2**: SHA-256 over
   sorted-key, integer-only canonical JSON; single shared implementation in
   `contracts` (`canonicalJson` / `computeChecksum`, WebCrypto-based so it
   runs in Node and browsers).
9. **Three cards at once vs per-return** (PR4): slice assigns all three
   authored cards on provisioning; per-return re-ranking is post-slice.
10. **Telemetry** (PR4+): Playable §15.4 event list — implement the ~10 events
    the slice touches only; rest deferred.

Anything not listed here that requires interpreting the specs gets added to
this section in the same PR that resolves it.
