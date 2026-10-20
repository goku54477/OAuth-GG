# OAuth Registration, Scope-Delta & App-Review Readiness Workbench

OAuth-GG helps developers decide how to register OAuth apps, request least-privilege scopes, and prepare for provider review. It combines a live Composio toolkit catalog with researched evidence and deterministic guide generation.

## Architecture D

- **Composio catalog:** 1,619-toolkit snapshot, searchable by name, category, and managed OAuth availability.
- **Golden guides:** verified GitHub, Slack, and Gmail reference guides.
- **Decision router:** deterministic mapping from provider/capability input to a golden guide or a generated guide.
- **Live research:** Exa discovery plus direct HTML/Readability extraction; SSRF guards reject unsafe URLs.
- **Citation auditor:** validates evidence URLs and downgrades unsupported claims.
- **Persistence:** libSQL when configured, with JSON fallback for local development.

## Key findings

### GitHub

A GitHub App can use repository-level permissions for the narrowly defined public-issues use case. A legacy OAuth App using `public_repo` has a broader grant. Prefer the smallest capability boundary that meets the product requirement.

### Slack

Slack OAuth v2 uses granular bot scopes. Multi-workspace distribution can use Manage Distribution; Slack Marketplace publication is a separate review path. Request only required bot scopes and treat public Marketplace distribution as an additional approval gate.

### Gmail

`gmail.send` is sensitive, while `gmail.modify` is restricted. Restricted Gmail scopes can require a CASA security assessment for eligible public production apps. Prefer send-only capability when mailbox modification is not required.

## Epistemic status policy

Every claim and citation carries one status:

- `source-supported` — supported by cited provider or authoritative documentation.
- `observed` — observed from live Composio metadata or retrieval output.
- `tested` — validated by automated tests.
- `estimated` — a clearly labeled estimate.
- `unknown` — not yet supported by reliable evidence.

The citation auditor rejects untrusted evidence URLs and preserves explicit unknowns instead of inventing certainty.

## Local setup

```powershell
npm install
Copy-Item .env.example .env
```

Set only values you need in `.env`:

```dotenv
COMPOSIO_API_KEY=
EXA_API_KEY=
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

`COMPOSIO_API_KEY` must be a Platform Project API key. Do not commit `.env`.

## Commands

```powershell
npm run dev
npm test
npm run build
npm run sync:catalog
```

`npm run sync:catalog` refreshes the tracked Composio snapshot when `COMPOSIO_API_KEY` is set. It validates the response and preserves the current snapshot if the response is incomplete.
