# Extensible My Life foundation

Status: implementation plan  
Date: 27 August 2026

## Outcome

UMANG Life must keep the people, organisations, places, property, assets, animals, and legal arrangements a citizen manages without turning each new category into a schema-to-UI rewrite. It must also say honestly whether a need has a researched guided workflow, instead of inventing service steps.

This plan completes the reusable platform foundation. It does not claim that every Indian government service has already been researched, encoded, or integrated.

## Citizen model

The primary citizen-facing abstraction remains **My life**. Inside it, records are grouped into six plain-language collections:

1. My family
2. Other people
3. Homes & property
4. Vehicles & assets
5. Work & organisations
6. Other records

The underlying entity kinds are:

- person and household;
- organisation;
- premises and property;
- vehicle and registered asset;
- animal;
- estate.

`child`, `residence`, and `business` remain accepted legacy subject types for existing journeys, but normalize to `person`, `premises`, and `organisation` respectively. “Service case”, “document”, “credential”, “decision”, and “obligation” remain records attached to an entity; they are not additional life-entity kinds.

## Deep module

Create one entity catalog as the public seam for:

- kind and broad class;
- citizen label and collection;
- icon token;
- legacy subject/canonical mappings;
- identity fact priority;
- which relationships may carry ownership shares.

Planner, persistence, and presentation code call this catalog rather than each maintaining five-way conditionals.

## Compatibility and migration

- Existing journey subject and canonical database enums remain readable.
- The extensible kind is stored as `entityKind` in canonical entity data and exposed on journey subjects.
- Existing records without `entityKind` are inferred from their legacy type at read time and are enriched on their next write.
- Existing URLs, six guided templates, and API response fields remain valid.
- No destructive migration or automatic deletion is permitted.

## Guided versus recorded needs

- A **guided need** has a researched template and can create a journey graph.
- An **unavailable need** may be understood and shown in the review proposal, but must say that UMANG Life does not yet have a guided workflow for it.
- An unavailable need cannot silently create tasks, imply eligibility, contact an authority, or appear as official guidance.

## Test matrix

### Entity catalog

- every kind has a class, singular/plural label, collection, and icon token;
- legacy child/home/business mappings are stable;
- collection labels are exhaustive;
- identity keys prefer stable identifiers, then names/locations;
- unknown stored kinds degrade to `other`, never crash the UI.

### Relationships

- family and household membership remain distinct;
- business partners do not become family;
- ownership share is accepted only for owner/partner/shareholder;
- authority to act is independent of ownership;
- several owners, guardians, tenants, drivers, or signatories may connect to one entity;
- the same person is reused across requests when the available identity facts match.

### Persistence and projection

- broader kinds survive a write/read cycle in memory and Prisma repositories;
- entity-only records are listed even when no guided journey exists;
- records with several guided journeys remain one My Life item;
- legacy records backfill by inference;
- deleting or completing a journey does not erase the canonical entity.

### Request interpretation

- at least 40 table-driven compound requests, each with two or more concerns;
- unusual cases include jointly owned property, a housing society, rented premises, inherited assets, a farm with livestock, a trust/estate, a company with signatories, and a non-family business partner;
- supported and unavailable needs can coexist without losing the supported work;
- review copy names what the citizen said and what will be saved;
- every mutation still requires approval.

### UI and accessibility

- populated, loading, empty, partial-support, error, focus, and success states;
- desktop and mobile grouping order;
- no empty grid regions when a collection is absent;
- icon plus text conveys type; colour is never the only signal;
- keyboard focus is visible and all controls retain 44px targets;
- no chatbot transcript, raw JSON, model reasoning, or implementation code appears.

### Regression and release

- complete Vitest suite;
- targeted and full Playwright suites;
- TypeScript, ESLint, Prisma validation/generation, and production build;
- Tastemaker anti-slop and motion scans on changed UI;
- browser review at mobile and desktop widths.

## Delivery slices

1. Catalog and compatibility tests.
2. Domain normalization and identity.
3. Persistence/read-model support.
4. Request planning and partial-support behavior.
5. My Life UI and entity details.
6. Expanded scenario suite and E2E coverage.
7. Migration review, documentation, full release checks, commit.

## Explicit non-goals

- claiming comprehensive jurisdiction-specific service coverage;
- scraping or auto-generating authoritative service instructions;
- replacing existing researched journey graphs with generic checklists;
- exposing database terminology to citizens;
- redesigning the app as a chatbot.
