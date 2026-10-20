# AuthBench Submission Integrity Design

## Status

Approved execution scope: user requested complete surgical repair and submission package on 2026-10-21.

## Goal

Make saved and live-researched guides useful when official evidence supports detail, while retaining strict protection against invented permissions, setup values, review estimates, fees, and security claims.

## Decision

Use claim-level evidence retention for generated and migrated records. A guide field remains only when its cited official captured passage supports that field. When a field is not supported, omit it or state `Unknown`; never replace it with a provider-specific guess.

For existing records, derive limited registration guidance directly from retained citation excerpts. This migration cannot restore discarded model drafts and must not issue paid research or generation requests.

## Scope

- Keep API envelopes and `ProviderGuide` compatibility.
- Preserve exact named scopes, OAuth/app-type facts, setup instructions, and conditional review/distribution facts only with traceable official citations.
- Keep generic requested capabilities explicitly unmapped unless source text proves an operation-to-scope relationship.
- Add sanitized field-level audit outcomes for diagnostics, tests, and documentation; do not store raw model drafts or credentials.
- Migrate persisted records idempotently, update UI wording/export, README, validation record, and assignment checklist.

## Non-goals

- No paid regeneration or provider account setup.
- No fabricated review timing, CASA tier, audit, callback, price, or approval outcome.
- No requirement for two variants where sources establish one path.
- No schema-breaking API change or new dependency.

## Acceptance

1. HubSpot, Asana, Miro, Dropbox, Mastodon, and Linear records preserve any source-backed detail surviving in citations and remain honest where evidence is absent.
2. Source-backed setup, scopes, conditional requirements, persistence, GET, UI, and Markdown export agree.
3. Unknown time/review/audit fields remain absent or explicitly Unknown.
4. Full tests, TypeScript, production build, audit, guide migration, public route checks, secret scan, and GitHub/Vercel commit alignment pass before merge/push.
5. README and validation record distinguish deterministic checks, live attempts, and unresolved limitations.
