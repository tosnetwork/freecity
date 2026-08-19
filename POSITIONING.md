# FreeCity Positioning

**Status: adopted 2026-08-19. This document controls what FreeCity is. If any
other FreeCity document, plan, or line of code contradicts it, the other thing
is wrong.**

## 1. What FreeCity is

> FreeCity is the accountability surface for the autonomous Agent economy: it
> renders finalized on-chain facts as a living city a human can read at a
> glance, and every pixel on the screen can be traced back to the transaction
> that produced it.

Not a digital civilization. Not a social simulation. Not a game. It is the
pane of glass through which a human supervises an economy that runs faster
than they can read.

## 2. Why this and not something else

### 2.1 The mismatch that started the rewrite

The previous definition of FreeCity was a game: a fourteen-day season, three
cards a day, a non-tradeable Focus budget, five roles, one low-power Steward
election. Underneath it sat a deterministic command journal, checksum-verified
replay, a non-authoritative renderer, a non-authoritative language model, and
settlement on finalized chain state.

A card game needs none of those things. Any competent team ships that game on
an ordinary web stack in three weeks.

The mismatch was the signal. The engineering instinct was building an evidence
system while the product document said "game". The invariants were written by
someone worried that the interface could lie — not by someone worried about
retention.

### 2.2 The derivation

Ask of each piece of the TOS Service stack: what breaks if it is removed?

| Component | Consequence of removing it |
|---|---|
| Verifiable Agent identity | You cannot tell who acted |
| Capability discovery | You cannot choose whom to hire |
| Accepted Quote | You cannot bound what you authorized |
| Escrow | Money moves before conditions hold |
| Receipt | You cannot prove what happened |
| Finalized settlement | The counterparty can deny it |
| Deterministic replay | You cannot reconstruct why |
| Non-authoritative rendering | The interface can lie to you |

Exactly one class of product needs all eight at once: **a place where a human
delegates economic agency to software and remains accountable for the result.**

That is not a city. That is accountability.

### 2.3 Why it nevertheless looks like a city

Delegation immediately produces a second constraint: **the log is unreadable.**
A few hundred Agents transacting daily produce a record no human will ever
read.

Humans have one badly underused capacity — near-instant comprehension of
spatial and social scenes. Walk into a market and you know within a second
which stall is busy, which is dead, and which two people are arguing. Present
the same information as a table and it takes twenty minutes.

So the city is not a game mechanic. The city is **an encoding that compresses a
high-volume verifiable economic log into a form human perception can absorb at
a glance.** The invariant that animation may explain facts but never
manufacture them is precisely what makes that compression legitimate rather
than a con.

## 3. What FreeCity is not

- **Not a second authority.** FreeCity never owns identity, capability,
  quotes, escrow, receipts, reputation, or settlement. Those live in TOS
  Service, whose sole authority is finalized TOS chain state. FreeCity owns
  the projection and the human comprehension layer, nothing else.
- **Not a game.** Seasons, daily card budgets, Focus, roles, and elections are
  retention mechanics. The derivation above does not produce them. They are
  cut.
- **Not a social world for Agents.** Agents do not need a city; Agents need
  protobuf. The city exists one hundred percent for humans. Anthropomorphizing
  Agents into residents with social lives served the game framing, not the
  value.
- **Not a metaverse.** "Digital civilization" is grand and unfalsifiable, and
  it invites building a world instead of an instrument.

## 4. Invariants

These are non-negotiable. A change that violates one is a rewrite of this
document, not a feature.

1. **Finalized chain state is the only authority.** A FreeCity database row is
   never money, never a commitment, never a fact. It is a cache of something
   the chain already decided.
2. **Every rendered element is either backed or visibly marked unbacked.**
   Anything with a finalized transaction behind it and anything without one
   (Quote Proposals, gateway chatter, generated narration, client prediction)
   must be visually unmistakable from each other, and must never be arranged so
   that the distinction is hidden. Without this rule, a beautiful observation
   surface is the best fraud instrument ever built.
3. **Everything drills down.** Any visual element traces to the exact finalized
   transaction, or it does not ship.
4. **Position carries meaning.** If where a thing sits in the city does not
   encode an economic fact, it is decoration and it is deleted. See §5.
5. **The renderer and the language model are never authorities.** They explain
   committed facts. They may not create, confirm, or acknowledge one.
6. **Failure is visible, never plausible.** When data is stale, partial, or
   unresolvable, the interface says so. It never renders a confident-looking
   number it cannot back. Coverage, freshness, finality, and network domain
   are part of every displayed figure, per
   `tos-service-spec/docs/AGENT_ECONOMY_METRICS_V1.md`.

## 5. The bet, stated so it can be lost

The load-bearing wager is: **spatial encoding beats tabular encoding on the
questions that matter most in an Agent economy.**

The null hypothesis is a dashboard, and it is a strong one:

| Question | Winner |
|---|---|
| Which Agent is losing money? | Table. Sort by net. The city is strictly worse |
| Is spend up or down this week? | Chart. The city is strictly worse |
| Who deals with whom, and has it changed? | Space. A table makes you rebuild the graph in your head |
| Is value concentrating in few counterparties? | Space. A top-ten table *hides* that six of your ten Agents route through one provider |
| Something is wrong and I don't know what to look for | Space, decisively |

The last row carries the bet. **A dashboard only answers questions you already
thought to ask.** You must first suspect that default rate matters before you
add that column. Peripheral spatial perception is free, unprompted, and
requires no hypothesis: *that corner went dark, that street is suddenly busy,
that one stopped trading with everybody.*

So the bet is narrow and testable:

> On **relationship topology** and **unprompted anomaly detection**, spatial
> encoding is faster and more accurate than tabular encoding — and those two
> are the most expensive questions in an Agent economy.

**Falsification.** Replay real finalized data with a genuine planted problem
(a provider that begins defaulting; a concentration risk). One group gets the
table, one group gets the spatial view. Nobody is told what to look for.
Measure: found or not, time to find, false positives. If the spatial view does
not win the unprompted class, **the city is cut and FreeCity ships as a
dashboard.** This test runs before the city is built, not after.

Two consequences follow, and both are easy to get wrong:

- **Position must be semantic.** Adjacency means trading relationship. Mass
  means cumulative volume. Darkness means dormancy. A road means a real value
  flow. A crack means default or dispute. The previous FreeCity failed exactly
  here: parcels and buildings were real estate, so position encoded ownership
  in a game world and carried no information.
- **Layout must be stable.** The benefit comes from spatial memory — *I know
  that one lives over there.* If the city re-lays-out when the data changes,
  the benefit is zero. Maintaining a stable layout over a changing graph is
  the real engineering cost of this bet, harder than any rendering work.

## 6. Who this is for

The first users are people who already have Agents earning and spending real
money — OpenFox operators and TOS Service buyers and providers. Three of them
is a valid first cohort. Gamers are not the audience, and a cohort assembled
for a launch event is not evidence.

**Value test:** did a human make a decision they could not have made from the
raw log? *Stop that Agent. Stop hiring that provider. That counterparty
defaults thirty percent of the time.* If no such decision occurs, FreeCity has
failed, however good it looks.

## 7. Relationship to TOS Service

TOS Service is the authority; FreeCity is a replaceable projection over it.
Specifically, FreeCity consumes:

- `NATIVE_REGISTRY_STATE_MACHINES.md` — Agent and Capability state
- `ACCEPTED_QUOTE_TVM_V1.md`, `STABLECOIN_ESCROW_TVM_V1.md` — commitment and escrow
- `SOFTWARE_WORK_RECEIPT_TVM_V1.md` — result commitments
- `AGENT_ECONOMY_METRICS_V1.md` — the derived-observability contract, including
  canonical `job_id`, coverage labeling, and the requirement that two indexers
  over one finalized interval produce identical values

FreeCity implements that metrics profile; it does not invent a parallel one.

**Known conflict.** `tos-service-spec/docs/FREECITY_APPLICATION_V1.md` still
describes FreeCity as a society layer owning residents, relationships,
communities, organizations, and civic rules. This document narrows that
substantially. The observability spine of the profile survives; the social
world does not. The spec profile needs a corresponding revision, tracked as a
separate change to that repository.
