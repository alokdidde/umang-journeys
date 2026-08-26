# UMANG Journeys

A citizen-first evaluation app that reorganises services around life events. It implements six complete synthetic journeys with persisted workflow state and simulated external-service adapters.

## Run locally

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>. Add `AI_GATEWAY_API_KEY` to `.env.local` before using language intake or analysing a real uploaded document. These features use schema-validated Vercel AI SDK output and show an explicit retryable error if AI Gateway is unavailable or returns invalid output.

Sign in with the single local evaluation account:

```text
Email: demo@umang.com
Password: demo1234
```

There is deliberately no registration flow. For a shared deployment, set `EVALUATION_USER_EMAIL`, `EVALUATION_USER_PASSWORD_HASH`, and a strong `SESSION_SECRET`; do not use the local password. Generate a scrypt hash with:

```bash
node -e "const {randomBytes,scryptSync}=require('node:crypto');const p=process.argv[1],s=randomBytes(16).toString('hex');console.log(s+':'+scryptSync(p,s,64).toString('hex'))" 'replace-with-a-strong-password'
```

## AI intake and document assistant

Returning users see a compact document assistant above **Your journeys**. It accepts PDF, PNG, and JPEG files up to 5 MB, extracts a typed proposal, and always asks for approval before changing journey data. The included synthetic samples demonstrate two end-to-end tool paths:

- a vehicle registration certificate creates and pre-fills a vehicle journey;
- a vaccination receipt matches the child, stores the evidence, and updates the vaccination timeline and artifact.

The interface uses the official Vercel AI Elements prompt input, attachment, and confirmation primitives. Sample documents are generated as explicit synthetic fixtures; real uploaded documents require successful structured Vercel AI SDK analysis and are never classified from their filenames.

The preferred configuration is Vercel AI Gateway:

```text
AI_GATEWAY_API_KEY=...
AI_INTAKE_MODEL=openai/gpt-5.5
AI_DOCUMENT_MODEL=openai/gpt-5.5
```

`VERCEL_OIDC_TOKEN` is also recognized on Vercel. Model identifiers use AI Gateway’s `provider/model` format. Never commit API keys. If a key has been pasted into a chat or log, rotate it before deployment.

Without AI Gateway authentication, language intake and real-document analysis fail visibly without creating or updating a Journey. Explicit synthetic sample-document workflows remain available for evaluation.

## Run the Docker handoff

```bash
docker compose up --build
```

This starts PostgreSQL, applies the Prisma schema, and runs the app with the PostgreSQL repository. Journey facts, node completions, sandbox receipts, audit events, document proposals and approvals, evidence, and generated-document metadata are server-authoritative and survive refreshes.

## Simulated integrations

The evaluation executes explicit sandbox adapters for civil registration, birth certificate issuance, ABDM-style health records, U-WIN-style vaccination planning, identity guidance, and benefit matching. Each downstream service moves through four persisted provider-specific stages, records timestamped activity, survives refreshes, and finishes with a detailed artifact. Every result is clearly marked synthetic, receives a deterministic `SBX-…` receipt, and can be reset. No government or third-party production system is contacted.

## Verify

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

All identities, records, registration numbers, adapters and certificates are synthetic. No government system is contacted.
