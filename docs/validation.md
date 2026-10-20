# AuthBench validation record

This file distinguishes deterministic verification from external paid acceptance. It must not contain credentials, key fragments, raw upstream errors, or local absolute paths.

## Local deterministic validation

- Catalog, research, guide integrity, persistence, route, and UI utility behavior are covered by Vitest.
- Structured generation and evidence parsing use mocks or deterministic fixtures unless a row explicitly says `paid live`.
- TypeScript and the Next.js production build are release gates.
- Persisted-guide migration is run twice to prove idempotence.
- Production dependency audit must report zero critical and zero high advisories.

Validated implementation commit: `b2fdeb3` (2026-10-20).

- `npx vitest run`: 117 tests passed across 8 files.
- `npx tsc --noEmit --incremental false`: zero errors.
- `npm audit --omit=dev --audit-level=high`: zero critical/high production advisories; five low advisories remain in the intentionally unchanged AI SDK major line.
- `npm run build`: Next.js 15.5.28 production build completed successfully.
- `npm run audit:guides` twice: 11 persisted records audited on each run with stable canonical output.
- Browser acceptance: Guides/Catalog navigation, invalid-tab fallback, Saved/OAuth/All segmentation, catalog-to-investigation prefill, reference and partial guides, mobile/tablet widths, `/api/catalog`, guide API 404, and page 404 verified. No console errors or horizontal viewport overflow were observed.

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
