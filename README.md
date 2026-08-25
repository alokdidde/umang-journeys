# UMANG Journeys

A citizen-first prototype that reorganises services around life events. Round 1 implements a complete, synthetic **Having a Baby** journey.

## Run locally

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>. The typed path and deterministic resolver work without credentials. Add `OPENAI_API_KEY` to `.env.local` to enable structured AI intake; the app falls back automatically after five seconds or any invalid response.

## Run the Docker handoff

```bash
docker compose up --build
```

This starts PostgreSQL, applies the Prisma schema, and runs the API with the PostgreSQL repository. The demo UI also keeps a browser projection so the no-login golden path remains instant and resettable.

## Verify

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

All identities, records, registration numbers, adapters and certificates are synthetic. No government system is contacted.
