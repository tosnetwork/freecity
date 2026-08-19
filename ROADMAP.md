# FreeCity Roadmap

Subordinate to `POSITIONING.md`. Every milestone below exists to retire a
specific risk, in decreasing order of how badly it would hurt to discover it
late. Each has a gate that can fail.

## Ground truth as of 2026-08-19

Verified before writing this plan, not assumed:

- **There is no live public testnet in the current protocol domain.** Every
  record under `tos-service-spec/deployments/` is in
  `archive/pre-tos-service-v1`; the current directory holds templates only.
  Real finalized data therefore comes from a local TOS network until Gate C
  passes. This plan never depends on a public testnet.
- **The data source already exists and works.**
  `~/tos/scripts/agent-economy-composed-e2e.py` drives a real local network
  through the full composed lifecycle — Agent Account, Capability Registry,
  Task Escrow, Service Actor, attested settlement — **including a contested
  path that ends in a dispute ruling and a split payout.** Default and dispute,
  the hardest things to render, are already producible.
- **The reader side exists.** `tos-service-protocol/pkg/toschain` provides the
  quorum resolver, typed-state decoder, escrow and stablecoin readers.
- **The observability contract is specified but unimplemented.**
  `AGENT_ECONOMY_METRICS_V1.md` is status ⬜. FreeCity implements it rather
  than inventing a parallel projection.

FreeCity therefore builds no data source, no chain reader, and no economic
semantics. It builds a projection and a comprehension layer.

---

## M0 — Prove there is something real to look at

**Risk retired:** that FreeCity is designed against imagined data.

Bring up a local TOS network, run the composed lifecycle end to end on both the
happy and contested paths, and write down precisely which facts are readable
from finalized state — and which of the four product questions each one
answers.

The four questions, from `POSITIONING.md`: *who is dealing with whom · at what
price · where is the money · who defaulted.*

Deliverable: a recorded fixture of real finalized state from both paths, plus
`docs/READABLE_FACTS.md` — an inventory mapping each product question to the
exact finalized object and decoder call that answers it, and an honest list of
questions nothing on-chain currently answers.

**Gate:** the contested path's dispute ruling and split payout are readable
from finalized state using the production quorum resolver and typed-state
decoder — not by inspecting a database, not from script logs. If default is
not readable, the fourth product question is unanswerable and the positioning
needs revision before any code is written.

No FreeCity application code in this milestone.

## M1 — One fact, end to end, drillable, and honestly broken

**Risk retired:** that the interface can lie.

Read one real finalized job from the local network and render it as a single
element on a web page, with drill-down to the exact transaction that produced
it, labelled with network domain, finality, freshness, and coverage.

Deliberately one job. The point is not throughput; the point is establishing
invariants 2, 3, and 6 in working code on day one, where they are cheap,
rather than retrofitting them into a finished city, where they are impossible.

**Gates:**
- Drill-down from the rendered element reaches the exact finalized transaction.
- Kill the RPC endpoint: the page shows unresolvable or stale. It never shows
  a confident number it cannot back.
- Feed it a Quote Proposal alongside an Accepted Quote: the two are visually
  unmistakable without reading any text.
- Point it at a different network domain: previously cached figures do not
  silently survive.

## M2 — The projection spine

**Risk retired:** that the numbers are not reproducible, and that partial
coverage silently reads as network truth.

Index a finalized checkpoint range into a job-level projection implementing
`AGENT_ECONOMY_METRICS_V1`: canonical `job_id` derivation, terminal facts,
coverage labeling, observed-sample semantics. Quote Proposals, endpoint
claims, and unfinalized transactions never count as economic output.

**Gates:**
- Two independent index runs over the same finalized interval produce byte-
  identical derived values, as the metrics profile requires.
- Every exported figure carries network domain, checkpoint range, exact asset
  identity, calculation version, discovery mode, and coverage.
- A deliberately partial index labels its output as observed, never as a
  network total.
- Re-indexing after a restart mid-range does not double-count.

## M3 — Test the bet before paying for it

**Risk retired:** the load-bearing wager in `POSITIONING.md` §5 — that spatial
encoding beats tabular encoding on topology and unprompted anomaly detection.

This milestone comes **before** any city is built, because it decides whether
one should be.

Build both views over the M2 projection:

- a table view, which is cheap and is the null hypothesis;
- a minimal spatial view — a stable-layout relationship graph where adjacency
  is trading relationship, mass is cumulative volume, dimming is dormancy, and
  breakage is default. Force-directed layout is sufficient. **No isometric
  city, no PixiJS, no art.** The bet is about spatial encoding, not rendering
  quality, and testing it with a finished city would be paying for the answer
  before getting it.

Then run the falsification test: replay finalized data containing a genuine
planted problem, give one group each view, tell nobody what to look for, and
measure whether the problem was found, how long it took, and how many false
positives were raised.

**Gate:** the spatial view beats the table on the unprompted class. If it does
not, the city is cut, `POSITIONING.md` §5 is marked lost, and FreeCity ships as
a dashboard. That outcome is a success of this roadmap, not a failure.

## M4 — Deliberately undetermined

M4 depends entirely on M3's result: either the city — stable semantic layout,
real rendering investment, in-world drill-down — or a strong instrument built
on the table view.

Writing M4 now would mean pretending to know the answer to the one question
this roadmap exists to ask. It stays empty until M3 reports.

---

## Out of scope until explicitly reopened

Do not implement, scaffold, stub, or prepare for:

- production wallets or real-money flows; the local network is the only source
  through M3;
- governance, elections, civic roles, seasons, Focus budgets, card decks, or
  any retention mechanic;
- generated narration of any kind before invariant 2 is enforced in code;
- a FreeCity-owned registry, quote database, escrow, receipt, reputation
  score, or settlement ledger;
- isometric or 3D rendering before M3 reports;
- an agent marketplace or third-party plugin system.

If a task appears to require one of these, stop and ask.

## Working discipline

- One milestone at a time, in order. Each ships with written acceptance
  evidence, not a claim of completion.
- Feature branches, never bulk autonomous work on `main`.
- Tests are written with the feature. A rendered fact without a drill-down
  test is incomplete.
- Every gate above is a release blocker for its milestone. A gate that is
  inconvenient is not thereby optional; it is either satisfied or the plan
  changes on the record.
