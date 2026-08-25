# UMANG Journeys

A citizen-first evaluation app that reorganises services around life events. It implements a complete, synthetic **Having a Baby** journey with persisted workflow state and simulated external-service adapters.

## Run locally

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>. The typed path and deterministic resolver work without AI credentials. Add `AI_GATEWAY_API_KEY` to `.env.local` to enable structured AI intake; the app falls back automatically after five seconds or any invalid response.

Sign in with the single local evaluation account:

```text
Email: demo@umang.com
Password: demo1234
```

There is deliberately no registration flow. For a shared deployment, set `EVALUATION_USER_EMAIL`, `EVALUATION_USER_PASSWORD_HASH`, and a strong `SESSION_SECRET`; do not use the local password. Generate a scrypt hash with:

```bash
node -e "const {randomBytes,scryptSync}=require('node:crypto');const p=process.argv[1],s=randomBytes(16).toString('hex');console.log(s+':'+scryptSync(p,s,64).toString('hex'))" 'replace-with-a-strong-password'
```

## AI intake

The preferred configuration is Vercel AI Gateway:

```text
AI_GATEWAY_API_KEY=...
AI_INTAKE_MODEL=openai/gpt-5.5
```

`VERCEL_OIDC_TOKEN` is also recognized on Vercel. A direct `OPENAI_API_KEY` remains supported; omit `AI_INTAKE_MODEL` to use the provider-appropriate default. Never commit API keys. If a key has been pasted into a chat or log, rotate it before deployment.

Without AI credentials, the constrained deterministic resolver keeps the evaluation workflow usable.

## Run the Docker handoff

```bash
docker compose up --build
```

This starts PostgreSQL, applies the Prisma schema, and runs the app with the PostgreSQL repository. Journey facts, node completions, sandbox receipts, audit events, and generated-document metadata are server-authoritative and survive refreshes.

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
