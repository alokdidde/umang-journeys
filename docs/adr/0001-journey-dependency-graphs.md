# ADR 0001: Model journeys as dependency graphs with activatable branches

Date: 2026-08-26

## Status

Accepted.

## Context

The product previously treated every journey as one flat ordered list. That could not describe real public-service paths where several outcomes become available after one prerequisite, some paths are optional, and choosing an optional path can introduce its own mandatory sequence. It also made completion ambiguous: a dormant optional service should not block a citizen, while an optional service they deliberately added should not silently disappear from their obligations.

The default journey screen must remain simple for an occasional-use public audience. The richer model therefore cannot require a permanently visible workflow editor or dense dashboard.

## Decision

Each `JourneyTemplate` is a directed acyclic graph composed of first-class branch definitions, step definitions, and explicit step dependencies.

- Required branches are active from journey creation.
- Optional branches are dormant until the citizen explicitly adds them.
- Adding an optional branch is persisted as a versioned journey fact and audit event.
- Every required step in an active branch counts toward journey progress and completion.
- Steps remain locked until their dependencies are complete, including dependencies inside an activated optional branch.
- Verified external evidence may complete an otherwise locked step only through an explicit repository policy for that evidence type; the UI cannot bypass dependency rules.
- The main page continues to show one Next Action. A wide, responsive `Journey Map` drawer progressively discloses the complete graph and is also available for completed journeys.

## Consequences

Adding a branch is a meaningful state change rather than a display preference. Repositories and clients must persist it, projections must be rehydrated from stored facts, and completion must use active-branch membership rather than a flat node count.

The graph model supports parallel required outcomes, optional paths, and mandatory work nested inside optional paths without making the normal journey page denser. New templates must pass structural validation for unique branch and node keys, valid branch membership, valid dependencies, and absence of cycles.
