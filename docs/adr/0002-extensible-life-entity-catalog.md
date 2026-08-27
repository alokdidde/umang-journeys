# ADR 0002: Use an extensible life-entity catalog

Status: accepted  
Date: 27 August 2026

## Context

UMANG Life originally supported five journey subjects. Their labels, grouping, identity rules, storage mappings, and icons were repeated across the planner, repositories, and UI. Government services also concern property, organisations, registered assets, animals, and estates. Expanding the original enums at every call site would keep making each new kind a cross-application change.

## Decision

Introduce one domain-owned catalog of life-entity kinds. Store the catalog kind as extensible data on the canonical entity and expose it on journey projections. Keep the existing database subject enums as compatibility adapters for the six implemented journey templates.

Keep service cases, documents, decisions, outputs, and obligations separate from life entities. They attach to a life entity or journey; they do not share its taxonomy.

## Consequences

- Presentation, request interpretation, and identity code depend on one stable interface.
- New kinds usually require one catalog entry and relevant service research, not repeated switch statements.
- Existing records remain readable without a destructive enum migration.
- The database cannot enforce every catalog kind as an enum; runtime schema validation and catalog exhaustiveness tests provide that guardrail.
- A record can exist before UMANG Life has a guided workflow for a related need, and the UI must represent that limitation honestly.

## Alternatives rejected

- **Expand every existing enum.** Strong database enumeration, but high change amplification and repeated UI/planner logic.
- **Use one untyped string everywhere.** Flexible, but loses exhaustiveness, labels, identity policy, and compatibility guarantees.
- **Treat every concern as a journey.** Conflates durable things in a citizen's life with temporary service work and encourages invented generic workflows.
