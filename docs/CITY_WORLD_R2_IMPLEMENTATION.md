# City World R2 Implementation

**Status:** implemented internal vertical slice  
**Runtime boundary:** `season-r2` / schema version `2` / ruleset `district-zero-r2`  
**Last reviewed:** 2026-08-16

City World R2 turns the original three-screen vertical slice into one persistent city with eight primary player surfaces. Every surface is projected over the same animated District Zero master, and every consequential action travels through the authoritative command journal, deterministic rules, committed event stream, replayable state, and Archive.

This document describes what the repository implements. Product intent remains normative in the product, playable-experience, runtime, economy, and architecture documents linked from the root README.

## The eight primary surfaces

| Surface | Player purpose | Implemented committed actions |
| --- | --- | --- |
| **Today** | Make a small number of consequential daily decisions | choose, decline, acknowledge While You Were Away |
| **Resident** | Inspect persistent identity and define AI/memory boundaries | update public presence, AI preparation, memory scope, and invitation policy |
| **District** | See the shared city as a live spatial projection | inspect committed residents and activity; open stable place routes |
| **People** | Discover residents and form consent-based social structures | invite, accept, decline, cancel, repair, create a Circle, invite and respond |
| **Projects** | Perform multi-resident work tied to real places | join, claim a task, submit evidence or an artifact, cross-review a contribution |
| **Market** | Match needs and capabilities without pretending payments exist | create a free-collaboration need, propose, accept, decline; paid modes fail explicitly |
| **Civic** | Exercise bounded founding-cohort governance | declare candidacy, cast one-resident-one-vote ballots, file challenges |
| **Archive** | Inspect durable personal city history | replay committed choices, relationships, work, civic actions, places, and Beacon entries |

Stable deep links also expose Arrival Hall, Signal Garden, Workshop, Studio, Beacon Square, Market, Civic Hall, and Archive as places. Visiting a place is itself a journalled command and updates the resident's authoritative presence.

## One city, not eight disconnected applications

`CitySky` is the shared live projection layer. It combines:

- one District Zero city master;
- time-of-day tinting, weather-like cloud shadows, water motion, route traffic, window activity, and Beacon motion;
- deterministic resident routes selected from committed presence;
- a bounded public snapshot refreshed from the API; and
- an accessible DOM path for every fact exposed through Canvas or PixiJS.

The city image is presentation, never authority. Moving residents come only from committed resident identities and place state. If the public projection is unavailable, the renderer shows no invented decorative people.

All entry, identity, social, project, market, and civic interfaces use translucent, hard-edged HUD layers over that same city. The layout keeps the title and first action surface above the initial fold on desktop and mobile instead of separating a static illustration from a SaaS-like panel.

## Authoritative domain model

City World R2 extends district state with:

- persistent resident preferences and public presence;
- consent-based relationships with repair history and closeness;
- Circles of three to six residents;
- place-bound projects, claimable tasks, submitted evidence, artifacts, and cross-member review;
- collaboration needs and proposals;
- a bounded District Steward charter, election, ballot, challenge, and result;
- resident presence at eight stable places; and
- five Beacon contribution paths: relationship, project, creation, Circle, and civic.

The authored founding state includes `Repair the East Relay`, `First Light Exhibition`, one collaboration need, the District Steward charter, and an empty Beacon. Nia and Orin are district AI residents attached to the founding projects. Each human account continues to receive its own persistent Mira companion through the existing entry flow.

## Commands and events

New commands cover place visits, relationship lifecycle, Circle lifecycle, project membership and review, collaboration-market activity, civic participation, and resident-preference updates. The API never edits game state directly. It authenticates the resident, validates input, derives stable command identifiers from the idempotency key where creation is involved, appends the command, and invokes the shared district catch-up path.

The rule layer emits typed events for every accepted transition. Client state and the Archive are derived from those committed events. Creation commands use caller-provided `Idempotency-Key` values, and the web client retries a transport failure once with the same key. A reused key with a different command fingerprint is rejected rather than silently swallowing a second action.

## Social and collaboration rules

- Relationships require an invitation and an explicit response.
- Invitation policies are enforced by the rule layer.
- Relationship repair is a real transition and can create one Beacon contribution.
- A Circle is visibly **forming** below three members, becomes active at three, and is capped at six.
- A project contribution may contain evidence and an artifact reference.
- The submitter cannot approve their own contribution.
- Approval completes the bound task and records the project's Beacon contribution exactly once.
- Paid market needs and proposals are rejected with `MARKET_PAYMENT_UNAVAILABLE` until the TOS payment readiness gates pass.
- A collaboration-only need can complete the full request, proposal, acceptance, and Archive path now.

## Founding civic rules

The District Steward election opens only after three committed human residents exist. The founding office:

- has a thirty-day term;
- may publish an agenda, schedule reviews, and propose civic-capacity use;
- cannot move assets, censor the Archive, or override deterministic rules;
- requires a human candidate with an approved Beacon contribution;
- gives each eligible resident one vote, with no token-balance weighting;
- uses deterministic voting, challenge, and finalization windows; and
- does not allow an AI resident to hold office in the founding cohort.

Native TOS may later serve a bounded candidacy-bond role only after the TOS integration gates pass. This implementation does not simulate a balance, payment, escrow, settlement, or token-weighted vote.

## Privacy and AI authority

Resident controls are committed state, not browser-only preferences:

- appear in or withdraw from the public city projection;
- allow or prohibit AI preparation;
- select private, Circle, or district memory scope; and
- accept relationship invitations from humans, everyone, or no one.

These controls currently express district gameplay boundaries. Production deployment still requires the TOS identity/capability, moderation, recovery, and privacy reviews defined in the architecture and cohort documents.

Mira and other AI residents can observe, suggest, and participate only through allowed commands. They cannot spend assets, accept irreversible terms, vote for a human, publish private memory, or manufacture a verified city fact merely by generating text or motion.

## Version and migration boundary

R2 changes the persisted JSON district state and the event union, so it does not reinterpret an existing R0 season. The application defaults to the fresh `season-r2` partition with schema version `2` and ruleset `district-zero-r2`. R0 journals and snapshots remain immutable and replayable with their original fixtures. A future production migration must use the same new-season or explicit versioned-migrator rule; mutating historical events in place is prohibited.

## Verification gates

The repository verifies City World R2 with:

- deterministic rule tests for relationships, Circle limits, reviewed project work, Beacon credit, market honesty, and civic timing;
- API integration tests covering authenticated multi-resident collaboration and idempotent retries;
- replay fixtures and a release gate that compares stored state and events with genesis and mid-snapshot reconstruction;
- a full browser journey across all eight surfaces;
- duplicate-submission, refresh, SSE resume, crash/replay, and public-projection checks;
- axe checks and keyboard journeys for the original slice and every R2 surface; and
- a production web build and static type, format, lint, and diff checks.

## Honest readiness statement

City World R2 is a playable internal city-world slice. It is ready for a small controlled rehearsal after the repository gates pass. It is not evidence that production wallets, stablecoin settlement, sponsored gas, moderation operations, identity recovery, external Agent execution, or the full fourteen-day content catalogue are complete. Those remain gated by the TOS infrastructure and first-cohort playbook.

