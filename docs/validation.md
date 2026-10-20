# AuthBench validation record

This file distinguishes deterministic verification from external paid acceptance. It must not contain credentials, key fragments, raw upstream errors, or local absolute paths.

## Local deterministic validation

- Catalog, research, guide integrity, persistence, route, and UI utility behavior are covered by Vitest.
- Structured generation and evidence parsing use mocks or deterministic fixtures unless a row explicitly says `paid live`.
- TypeScript and the Next.js production build are release gates.
- Persisted-guide migration is run twice to prove idempotence.
- Production dependency audit must report zero critical and zero high advisories.

The final tested commit SHA and command results will be recorded at the merge gate.

## Outside-catalog acceptance

Status: **Not executed — separate paid-call approval required.**

Planned request, without credentials:

```json
{
  "queryOrUrl": "Mastodon",
  "officialDocumentationUrl": "https://docs.joinmastodon.org/methods/apps/",
  "capabilities": ["read"]
}
```

Official evidence:

- https://docs.joinmastodon.org/methods/apps/
- https://docs.joinmastodon.org/client/authorized/

Expected path: provider remains outside the catalog; direct official documentation establishes identity and avoids Exa discovery; one `gpt-5-nano` generation call is permitted only after explicit approval.

Acceptance will record the returned guide status and unknowns, actual external services used, persistence equality, route/render/export checks, sanitized diagnostics, cost, and tested commit SHA. Until then, no live-acceptance claim is made.
