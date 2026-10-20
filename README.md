# AuthBench — OAuth Readiness Guide Library and Research Workbench

AuthBench helps developers investigate how an integration authenticates, which documented permissions relate to a requested capability, and which provider-review questions remain unresolved. It favors explicit unknowns over unsupported claims.

## Public links

- Application: https://authbench.vercel.app
- Source: https://github.com/goku54477/OAuth-GG
- Reference examples: https://authbench.vercel.app/guides/github, https://authbench.vercel.app/guides/slack, https://authbench.vercel.app/guides/gmail
- Live-researched examples: https://authbench.vercel.app/guides/linear, https://authbench.vercel.app/guides/hubspot
- Validation record: [`docs/validation.md`](docs/validation.md)
- Assignment evidence checklist: [`docs/submission-checklist.md`](docs/submission-checklist.md)

## Assignment alignment

- Browse a tracked snapshot of 1,619 Composio integrations and their observed authentication metadata.
- Compare three audited reference examples: GitHub, Slack, and Gmail.
- Generate and persist evidence-aware guides for catalog and verified outside-catalog providers.
- Inspect official citations, epistemic status, requested capabilities, setup guidance, and unresolved questions.
- Share a guide URL or export the same canonical guide as Markdown.

## Architecture and data flow

1. The workbench reads the tracked Composio catalog snapshot and saved guide summaries.
2. `POST /api/guides/investigate` validates an application name, requested capabilities, and an optional official documentation URL.
3. Catalog entries establish identity from snapshot metadata. Outside-catalog entries must establish identity and OAuth support from an identity-matching official domain.
4. Direct official documentation is fetched through the SSRF guard and does not require Exa discovery. Otherwise, Exa can discover candidate official sources and Readability extracts their content.
5. `gpt-5-nano` produces a structured draft when configured. Deterministic integrity normalization then removes unsupported claims, fictional configuration, invalid citations, and unverified scope coverage.
6. The canonical guide is persisted with libSQL/Turso and returned in the same API response. Reference guides remain canonical source data and are not duplicated into persistence.
7. The guide page and Markdown export render the persisted `ProviderGuide` without inventing missing fields.

Local development can use a file-backed libSQL database and JSON fallback. Production requires durable Turso credentials; a serverless deployment must not rely on the writable filesystem.

## Catalog and research paths

- **Saved guides:** catalog entries with an existing reference or persisted guide.
- **OAuth apps:** entries whose observed authentication schemes contain OAuth metadata, including managed OAuth where reported.
- **All integrations:** every snapshot entry, including integrations whose auth path still needs checking.
- **Outside catalog:** supply the provider name separately from an official HTTPS OAuth-documentation URL. A mismatched, lookalike, private-network, malformed, or unverifiable source is rejected.

## Reference findings

- **GitHub:** a GitHub App can use repository-level Issues permission, while the legacy OAuth `public_repo` scope grants broader public-repository access.
- **Slack:** granular bot scopes such as `channels:history` and `chat:write` serve different capabilities. Unlisted multi-workspace distribution and Slack Marketplace publication are distinct paths.
- **Gmail:** `gmail.send` is Sensitive and `gmail.modify` is Restricted. `gmail.labels` manages label resources; applying or removing labels on messages uses `messages.modify` and requires `gmail.modify`. Security-assessment applicability depends on restricted-data handling and must be evaluated from current Google requirements.

## Evidence and epistemic status

- `source-supported`: supported by an attached official passage.
- `observed`: observed from catalog or retrieval metadata, not promoted to a universal provider fact.
- `tested`: established by a deterministic test or controlled validation.
- `recommendation`: advice, clearly separated from factual claims.
- `estimated`: an explicitly labeled estimate.
- `unknown`: evidence is insufficient.

The integrity normalizer allowlists official HTTPS evidence, rejects unknown citation IDs, and evaluates setup steps, scope names, and review claims independently. A source-backed field may remain; an unsupported field is removed or marked Unknown. Requested-capability coverage stays Unknown unless captured source text establishes the operation-to-permission connection. Partial guides are useful research records, not claims of completeness.

## Environment variables

Copy `.env.example` to `.env`. Never commit credentials and never expose these values with a `NEXT_PUBLIC_` prefix.

```dotenv
COMPOSIO_API_KEY=
EXA_API_KEY=
OPENAI_API_KEY=
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

- `COMPOSIO_API_KEY`: refreshes catalog metadata and supports Composio API access.
- `EXA_API_KEY`: optional discovery when direct official documentation is not supplied.
- `OPENAI_API_KEY`: optional live structured generation using `gpt-5-nano`.
- `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`: required together for durable production persistence.

Missing research or generation credentials produce an honest degraded/partial result where possible; raw upstream errors and credential fragments are not returned to the UI or stored in guides.

## Local setup and commands

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

```powershell
npm test
npx tsc --noEmit --incremental false
npm run build
npm run sync:catalog
npm run audit:guides
```

- `sync:catalog` validates a fresh Composio response before replacing the tracked snapshot.
- `audit:guides` idempotently normalizes existing persisted guides with the current integrity policy.

## Current limitations

- AuthBench does not register provider applications, supply credentials, submit reviews, or guarantee provider approval.
- Provider policies change; generated dates and citations identify the evidence available to a guide.
- Review timing, fees, audits, classifications, callbacks, and production requirements remain hidden or Unknown unless official evidence supports their applicability. A cited review requirement is not a review-time estimate.
- A generic capability such as `read` or `write` is not automatically a provider scope. Ask for a resource-level operation when exact coverage matters.
- Existing records can be enriched only from retained official excerpts. Raw model drafts are deliberately not persisted, so discarded unsupported prose cannot be recovered after migration.
- Official source text can be incomplete, conflicting, or provider-policy-specific. AuthBench preserves the uncertainty rather than inferring a universal setup path.
- The repository includes deterministic fixtures and mocked generation checks. A paid live check is recorded only when it has actually run; see [the validation record](docs/validation.md).
