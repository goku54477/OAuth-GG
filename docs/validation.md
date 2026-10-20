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

Status: **Executed on 2026-10-20 — degraded model outcome recorded.**

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

Observed result:

- Mastodon was absent from the catalog and accepted through the identity-matching `docs.joinmastodon.org` source.
- Direct documentation retrieval succeeded with one official citation and no Exa discovery.
- One `gpt-5-nano` attempt was made, but OpenAI returned a sanitized HTTP 401. No raw upstream response or credential data was stored.
- The resulting `partial-fallback` guide persisted `read`, the source mode, and the official documentation URL; it explicitly marks requested-capability coverage and provider review/configuration requirements as unknown.
- POST payload, saved record, and later GET payload were identical. The guide route and Markdown export rendered the canonical safe data without a configuration snippet, callback hint, secret-like content, fictional domain, fee, timeline, or audit claim.

The local root cause was subsequently isolated: the server inherited a stale process-level `OPENAI_API_KEY`, which took precedence over the current `.env` value when Next.js started. A direct model-access check using the current `.env` value returned HTTP 200. This validates the outside-catalog, evidence, persistence, rendering, and degraded-mode paths, but not a successful live model completion until a separately approved retry is made with the inherited stale variable cleared.
