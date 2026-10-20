# AuthBench submission checklist

Status terms: **Verified** means this repository or deployed application has direct evidence. **Unknown** means provider evidence does not establish it. **Pending final gate** means re-run after final merge/deploy; it is not a pass yet.

## A. Core assignment

- **Verified:** AuthBench targets developers building agents where end users connect provider accounts. README, workbench, guide context, and guide UI distinguish provider OAuth application, Composio managed OAuth availability, and human end-user authorization.
- **Verified:** GitHub, Slack, and Gmail reference guides demonstrate different OAuth/review paths. Linear and HubSpot are live-researched examples.
- **Verified with explicit Unknowns:** Guides show citations, requested capabilities, setup steps when passage-backed, human action, agent role, and unresolved questions. Timelines, fees, audits, callbacks, and approval outcomes remain Unknown unless exact evidence supports them.
- **Limitation:** Generic capability labels cannot prove a resource-level provider permission. A precise operation is needed for a reliable mapping.

## B. Live investigation

- **Verified:** UI/API accept catalog providers and outside-catalog providers with a matching official HTTPS documentation URL. SSRF and identity checks reject malformed, private, lookalike, and unverifiable inputs.
- **Verified:** Validation record contains controlled Mastodon and HubSpot runs, including input, evidence path, model outcome, canonical persistence, and result route.
- **Verified:** Partial fallback is visibly separate from live-researched output and is never called a complete guide.
- **Unknown:** Hosted generation still needs a fresh final-deployment retest after this release. No paid call is made for this checklist.

## C. Evidence and practical investigation

- **Verified:** Official HTTPS citations with captured excerpts gate provider-specific retained facts. Unknown citation IDs, non-official evidence, fictional callback/configuration data, unsupported scope mappings, timing, fees, CASA, and universal audit claims are removed.
- **Verified:** Source-backed registration, OAuth/app-type, scope, and conditional review facts can survive normalization, persistence, GET, UI, and Markdown export.
- **Verified:** Gmail distinguishes label-resource management (`gmail.labels`) from changing labels on messages (`gmail.modify`).
- **Unknown:** Provider review timing is not claimed without a current, applicable official source.

## D. Deployment and sharing

- **Verified:** Production alias `https://authbench.vercel.app` is public. Fresh browser sessions loaded `/`, `/guides/hubspot`, and `/guides/linear`; direct guide API reads and a missing-guide 404 also succeeded.
- **Verified:** `GET /api/catalog` returned 1,619 snapshot entries. Durable Turso guide audit ran twice against 15 persisted records with stable counts.
- **Implemented; recheck before demo if browser state changes:** share action uses deployment origin and guide export uses loaded canonical data. This release did not programmatically trigger clipboard writes.

## E. Build, repository, security

- **Verified:** 122 Vitest tests, TypeScript, and Next.js production build passed for this release. Production dependency audit has zero high/critical findings.
- **Verified:** GitHub `main` contains the released code and Vercel production deployment is Ready. Branch diff scan found no credential-like values.
- **Known non-blocker:** Five low production dependency advisories remain in AI SDK transitive dependencies; see validation record. No critical/high production advisory remains.

## F. Submission package

- **Verified:** README documents setup, server-side environment-variable names, evidence model, architecture, limitations, command set, public links, and validation record.
- **Verified:** This checklist records implemented evidence separately from unknowns and final deployment gates.
- **Verified:** Validation record contains release checks and does not claim a paid final hosted-generation retest.

## Required final gates

1. Run `npm test`, `npx tsc --noEmit --incremental false`, `npm run build`, and `npm audit --omit=dev --audit-level=high` at final SHA.
2. Run `npm run audit:guides` twice against durable production persistence and compare canonical records.
3. Verify `/`, `/api/catalog`, `/guides/github`, `/guides/gmail`, `/guides/linear`, `/guides/hubspot`, and a missing guide in a logged-out browser.
4. Confirm public Vercel deployment and GitHub `main` resolve to identical final commit.
5. Record only checks actually performed. Do not substitute a partial guide for a successful full evidence result.
