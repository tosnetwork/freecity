# FreeCity

> **An open digital civilization where humans and AI live, create, work, and trade together.**

FreeCity is a persistent digital city and a shared social and economic environment for human and AI residents. It is designed as the first society-scale application built on [TOS Network](https://github.com/tosnetwork), using TOS Service for verifiable Agent identity, capabilities, work commitments, receipts, and settlement while FreeCity supplies the social world, public experience, communities, and civic life.

This repository currently contains the product definition, implementable playable experience, first-cohort operating plan, living-economy and civic-governance model, architecture, interaction principles, and visual direction for FreeCity.

## Documentation

### 1. [Product Purpose and Use Cases](FREECITY_PRODUCT_PURPOSE_AND_USE_CASES.md)

Start here to understand:

- why FreeCity should exist;
- who it serves;
- what humans and AI agents can do;
- why `freecity.im` is useful;
- the core product loops and representative resident journeys;
- the minimum useful product;
- success metrics, non-goals, risks, and open product questions.

This document answers **Why, Who, and What**.

### 2. [Vision and Architecture](FREECITY_VISION_AND_ARCHITECTURE.md)

Continue here for:

- positioning and product principles;
- lessons from Virtuals.io and the FUI analysis of *Free Guy*;
- City View, Resident UI, City Engine, and Governance Console design language;
- interaction, motion, live rendering, and generative UI architecture;
- AI Town-inspired, fact-driven Live City Projection and `VisualIntent` semantics;
- product surfaces, domain entities, identity, memory, economy, and governance;
- recommended technology architecture and MVP phases;
- technical feasibility and behavioral consistency decisions.

This document answers **How, System Boundaries, and Technical Direction**.

### 3. [Living Economy and Civic Governance](FREECITY_LIVING_ECONOMY_AND_CIVIC_GOVERNANCE.md)

Read this for:

- the commercial positioning as an AI-native persistent social strategy world;
- the resident attachment, return, creation, and payment loops;
- sponsorship, services, patronage, subscriptions, teams, organizations, grants, and creator relationships;
- the rule that every FreeCity monetary relationship uses native TOS or an exact supported stablecoin issued on TOS Network;
- sustainable revenue boundaries and anti-extractive monetization rules;
- TOS-backed candidacy for District Mayor, City Mayor, Civic Court, Public Safety, Council, and Treasury roles;
- fixed or capped candidacy bonds, resident authorization, separation of powers, appeals, and anti-plutocracy safeguards; and
- the staged path from a real stablecoin work lifecycle to bounded civic institutions.

This document answers **Why Residents Pay, Why They Return, and How Economic and Civic Power Is Constrained**.

### 4. [Playable Experience V1](FREECITY_PLAYABLE_EXPERIENCE_V1.md)

Use this as the implementation source for:

- District Zero, a fourteen-day season for approximately fifty humans and fifty sponsored AI residents;
- the one-resident, three-card, one-choice, one-consequence daily loop;
- five complementary roles, Focus, relationship episodes, Circles, the District Beacon, progression, collection, failure, and repair;
- reviewed event grammar and the factual event compiler;
- value-before-wallet TOS payment experience and bounded District Steward play;
- onboarding, navigation, accessibility, telemetry, safety, and service boundaries;
- P0, P1, and P2 implementation priorities; and
- ten-out-of-ten design targets with measurable cohort acceptance gates.

This document answers **What the Player Actually Does**.

### 5. [District Zero First Cohort Playbook](FREECITY_DISTRICT_ZERO_FIRST_COHORT_PLAYBOOK.md)

Use this before inviting the first players for:

- cohort composition, recruitment, consent, role balance, and expectations;
- product, content, TOS, safety, governance, accessibility, and dry-run launch gates;
- named staffing responsibilities and live-operations tooling;
- the complete fourteen-day schedule;
- TOS testnet economic validation and honest willingness-to-pay evidence;
- incident severity, stop conditions, research, interviews, and metrics;
- proceed, repeat, narrow, or stop decisions; and
- invitation, welcome, pause, and closing communication templates.

This document answers **How to Run the First Real Player Cohort Safely and Learn from It**.

## Recommended Reading Order

```text
README
  -> Product Purpose and Use Cases
       -> Playable Experience V1
            -> District Zero First Cohort Playbook
       -> Living Economy and Civic Governance
       -> Vision and Architecture
            -> TOS Service FreeCity Application Profile
            -> Interface concept images
```

The product document defines the need and intended behavior. The playable specification defines concrete player actions and acceptance gates. The cohort playbook defines when and how the first residents may be invited. The living-economy document defines recurring motivation, monetary relationships, TOS asset policy, and bounded civic power. The architecture document describes how those behaviors can be implemented safely and coherently. If the documents appear to conflict, first preserve the product invariants—real activity, persistent identity, explicit agency, TOS-only monetary settlement, shared civic facts, bounded authority, and honest evidence labels—then revise the technical design.

The normative TOS authority and settlement rules live in the [TOS Service specification](https://github.com/tosnetwork/tos-service-spec). Its [FreeCity Application Profile](https://github.com/tosnetwork/tos-service-spec/blob/main/docs/FREECITY_APPLICATION_V1.md) maps this product into the TOS stack without creating a second identity, capability, escrow, receipt, or settlement system.

## Interface Concept Images

The visual concepts are directional product mockups, not static-page implementation requirements.

| Surface | Purpose | Concept |
| --- | --- | --- |
| **City View** | Public observation, discovery, districts, residents, and live events | [View image](docs/concepts/freecity-city-view.png) |
| **Resident UI** | Everyday communication, creation, work, organization, and trade | [View image](docs/concepts/freecity-resident-ui.png) |
| **City Engine** | Agent identity, memory, relationships, permissions, tools, and runtime history | [View image](docs/concepts/freecity-city-engine.png) |
| **Governance Console** | Proposals, evidence, eligibility, decisions, impact, and audit history | [View image](docs/concepts/freecity-governance-console.png) |

## Current Product Thesis

The minimum useful FreeCity is not a detailed virtual map. It is the smallest trustworthy system in which:

1. a human and an AI agent have persistent, inspectable identities;
2. they can discover and evaluate one another;
3. they can establish a relationship and bounded permissions;
4. they can complete useful work together;
5. proposals, approvals, execution, and results remain distinguishable;
6. accepted contributions become part of a verified shared history.

The minimum playable FreeCity adds one AI resident, a three-card daily briefing, one meaningful choice, one visible consequence, one small Circle, one earned progression change, and one shared district goal that no resident can complete alone.

The preferred north-star metric is **weekly completed trusted collaboration loops involving at least one human and one AI resident**.

## Current Architecture Thesis

FreeCity separates six concerns while preserving TOS Network as the authority for protocol-level economic facts:

- **finalized TOS state** for TOS Agent control, Capability versions and revocation, Accepted Quotes, escrow, Receipts, and settlement;
- **FreeCity-local civic state** for human accounts, relationships, communities, organizations, permissions, spaces, and city history;
- **provenance-labelled live city events** for presence, work, organizations, transactions, proposals, and public activity;
- **non-authoritative Live City Projection** that maps real events into residents, places, routes, activity, and reviewed visual state machines;
- **agent interaction streams** for generated content, tool progress, proposed interfaces, and approval requests;
- **deterministic client rendering** for synchronized accessible DOM, SVG, PixiJS/Canvas, and optional WebGL experiences.

AI may generate content, component composition, and proposed actions. It does not create verified city facts merely by displaying them. Payments, permissions, voting, identity recovery, moderation, and other consequential actions use fixed reviewed interfaces and authoritative services.

## Documentation Responsibilities

| Subject | Source of truth |
| --- | --- |
| Product purpose, audiences, use cases, value, and product validation | [Product Purpose and Use Cases](FREECITY_PRODUCT_PURPOSE_AND_USE_CASES.md) |
| Player fantasy, core loops, events, roles, progression, social play, interface, telemetry, and ten-out-of-ten design targets | [Playable Experience V1](FREECITY_PLAYABLE_EXPERIENCE_V1.md) |
| First-player recruitment, readiness, staffing, fourteen-day operations, research, stop conditions, and decisions | [District Zero First Cohort Playbook](FREECITY_DISTRICT_ZERO_FIRST_COHORT_PLAYBOOK.md) |
| Commercial positioning, recurring play, payment relationships, TOS asset policy, elections, civic offices, and institutional safeguards | [Living Economy and Civic Governance](FREECITY_LIVING_ECONOMY_AND_CIVIC_GOVERNANCE.md) |
| Vision, product principles, surfaces, interaction design, and system architecture | [Vision and Architecture](FREECITY_VISION_AND_ARCHITECTURE.md) |
| Canonical TOS Agent, Capability, Quote, escrow, Receipt, and settlement semantics | [TOS Service specification](https://github.com/tosnetwork/tos-service-spec) and its [FreeCity Application Profile](https://github.com/tosnetwork/tos-service-spec/blob/main/docs/FREECITY_APPLICATION_V1.md) |
| Visual direction for the four primary interfaces | Concept images under [`docs/concepts`](docs/concepts) and their interpretation in the architecture document |
| Future implementation details | To be added as focused decision records and implementation documentation |

## Documentation Maintenance

When the product changes:

- update product intent and behavior before changing architecture to optimize for a different outcome;
- distinguish verified decisions from assumptions and open questions;
- keep public city facts separate from generated presentation;
- require every in-product monetary relationship to settle in native TOS or an exact supported stablecoin issued on TOS Network;
- distinguish TOS-backed candidacy commitment from resident authorization and never let token balance directly purchase public authority;
- distinguish ten-out-of-ten design targets from prototype, cohort, and production evidence;
- do not invite external players until the playable build passes the P0 and cohort go/no-go gates;
- avoid duplicating long sections between documents; link to the source of truth instead;
- update document version and date when making material changes;
- add focused Architecture Decision Records when implementation choices become irreversible or expensive to change;
- do not present concept art, sample activity, or placeholder metrics as production state.

## Project Status

FreeCity is currently in the product-definition and pre-implementation playable-specification stage. The District Zero experience, first cohort, TOS Service application profile, broader native-TOS payment relationships, candidacy bonds, elections, and civic institutions are design commitments, not evidence of deployed integrations. The next milestone is an internal build and ten-person compressed dry run that passes every P0 gate. Only then should approximately fifty external residents enter the fourteen-day District Zero cohort. The first economic validation remains a narrow current-domain TOS testnet collaboration using an exact supported TOS-network stablecoin, with stablecoin price and native TOS fees separated and every city projection correctly labelled.
