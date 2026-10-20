# AuthBench Submission Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair source-backed live-guide detail, migrate canonical guides safely, and ship an evidence-honest submission package.

**Architecture:** Centralize field-level evidence decisions in guide normalization. Reuse canonical persisted `ProviderGuide` data for API, UI, and export. Keep provider facts derived only from retained official quotations.

**Tech Stack:** Next.js 15, TypeScript, Vitest, Zod, libSQL/Turso.

**Spec:** `docs/superpowers/specs/2026-10-21-submission-integrity-design.md`

## Global Constraints

- No paid research/generation calls.
- No raw credentials, model output, or upstream errors in persistence, UI, docs, commits, or logs.
- Preserve public API envelopes and optional contract compatibility.
- Evidence missing means omit or Unknown, never estimate.
- Only official HTTPS citations with captured quotations can support provider claims.

## Review Focus

- Generic capabilities must not become provider scope mappings.
- Conditional Marketplace/review claims must retain their conditions.
- Migration must be idempotent and not alter reference-guide source data.
- Canonical saved data, GET, UI, and Markdown must agree.
- Existing partial records must never be promoted to complete merely by migration.

### Task 1: Claim-level evidence normalizer

**Files:** `src/lib/guides/evidence-validator.ts`, `tests/guides.test.ts`

- [ ] Write failing fixtures for source-backed setup, conditional review facts, and unsupported claims.
- [ ] Implement item-level setup/claim retention and safe citation-derived fallback facts.
- [ ] Verify targeted guide tests pass.
- [ ] Commit integrity behavior and tests.

### Task 2: Canonical migration and guide presentation

**Files:** `src/lib/db/index.ts`, `scripts/audit-guides.ts`, `src/components/GuideViewer.tsx`, `src/components/workbench-utils.ts`, `tests/db.test.ts`, `tests/workbench-ui.test.ts`

- [ ] Write failing persistence/export tests for migrated source-backed guidance and partial guides.
- [ ] Implement idempotent canonical migration and truthful section labels.
- [ ] Verify targeted persistence/UI tests pass.
- [ ] Commit migration and presentation work.

### Task 3: Submission documentation and final validation

**Files:** `README.md`, `docs/validation.md`, `docs/submission-checklist.md`, relevant tests.

- [ ] Write assignment checklist and update README/validation to distinguish verified evidence from unknowns.
- [ ] Run migration twice, complete suite, typecheck, build, audit, secret scan, and public route checks.
- [ ] Commit docs and final validation record.
