import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterAll, beforeAll, describe, it, expect } from "vitest";
import { auditPersistedGuides, saveGuide, getGuideBySlug, listSavedGuides } from "@/lib/db";
import type { ProviderGuide } from "@/types/contracts";

describe("Database Persistence Layer (src/lib/db/index.ts)", () => {
  const testDir = path.join(os.tmpdir(), `oauth-workbench-db-${process.pid}`);
  const fallbackPath = path.join(testDir, "guides-fallback.json");

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
    process.env.GUIDES_FALLBACK_FILE = fallbackPath;
    process.env.TURSO_DATABASE_URL = "file::memory:";
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    delete process.env.GUIDES_FALLBACK_FILE;
    delete process.env.TURSO_DATABASE_URL;
  });
  const testGuide: ProviderGuide = {
    slug: "linear-oauth-sync-test",
    providerName: "Linear",
    toolkitSlug: "linear",
    title: "Linear OAuth 2.0 Integration & Webhook Scopes",
    subtitle: "Testing database persistence layer with realistic guide data",
    generatedAt: "2026-10-20T12:00:00.000Z",
    generationMode: "live-researched",
    completenessStatus: "complete",
    composioIntegration: {
      managedOAuthAvailable: true,
      managedVsCustomVerdict: "Use managed for prototyping, BYO for production customer workspace auth.",
      customAuthConfigSnippet: "session = composio.create({ auth_configs: { LINEAR: { ... } } });",
      composioRedirectUriHint: "https://backend.composio.dev/api/v1/auth-apps/addRepo/linear",
      epistemicStatus: "source-supported",
      citationIds: ["cite-linear-test"],
    },
    variants: [
      {
        variantId: "linear-read-only",
        title: "Linear Read Issues & Teams (Recommended)",
        summary: "Read-only access to issues, comments, and project states.",
        recommendedAppType: "Linear OAuth Application",
        scopes: [
          {
            scope: "read",
            displayName: "Read Access",
            classification: "non-sensitive",
            requiredForCapability: "Query issues and boards",
            triggersExternalReview: false,
            triggersSecurityAudit: false,
            epistemicStatus: "source-supported",
            citationIds: ["cite-linear-test"],
          },
        ],
        approvalGateSummary: "Self-serve OAuth authorization",
        estimatedReviewTimeline: "Instant",
        securityAuditRequired: "None",
        pros: ["Safe least-privilege read access"],
        cons: ["Cannot write or update issues"],
      },
      {
        variantId: "linear-write",
        title: "Linear Read & Write Access (Admin)",
        summary: "Full access to create, update, and manage Linear workspace resources.",
        recommendedAppType: "Linear OAuth Application",
        scopes: [
          {
            scope: "write",
            displayName: "Write Access",
            classification: "sensitive",
            requiredForCapability: "Create and update issues",
            triggersExternalReview: false,
            triggersSecurityAudit: false,
            epistemicStatus: "source-supported",
            citationIds: ["cite-linear-test"],
          },
        ],
        approvalGateSummary: "Workspace admin authorization",
        estimatedReviewTimeline: "Instant",
        securityAuditRequired: "None",
        pros: ["Enables bi-directional issue creation"],
        cons: ["Higher blast radius if tokens are leaked"],
      },
    ],
    registrationSteps: [
      {
        stepNumber: 1,
        title: "Create Application in Linear Settings",
        consolePath: "Linear > Settings > API > Applications",
        instructions: "Click 'New Application' and enter your application name.",
        criticalConfigValues: [
          {
            label: "App Name",
            value: "Test Runner App",
          },
        ],
        epistemicStatus: "source-supported",
        citationIds: ["cite-linear-test"],
      },
    ],
    testingAndSandboxRules: [
      {
        claim: "Linear OAuth apps function in development environments without public verification.",
        epistemicStatus: "source-supported",
        citationIds: ["cite-linear-test"],
      },
    ],
    distributionAndReviewChecklist: [
      {
        claim: "Public distribution requires HTTPS redirect URLs.",
        epistemicStatus: "source-supported",
        citationIds: ["cite-linear-test"],
      },
    ],
    practicalObservations: [
      {
        claim: "Linear access tokens do not expire by default unless actor revokes authorization.",
        epistemicStatus: "observed",
        citationIds: ["cite-linear-test"],
      },
    ],
    explicitUnknowns: [],
    citations: [
      {
        id: "cite-linear-test",
        sourceUrl: "https://developers.linear.app/docs/graphql/working-with-the-graphql-api",
        sourceTitle: "Linear Developer Documentation",
        authorityType: "official-provider-docs",
        retrievedAt: "2026-10-20T12:00:00.000Z",
        verbatimQuote: "Linear uses standard OAuth 2.0 authorization code grant.",
        epistemicStatus: "source-supported",
      },
    ],
  };

  it("does not seed duplicated reference guides into persistence", async () => {
    expect(await getGuideBySlug("gmail-send-vs-modify")).toBeNull();
  });

  it("should save a new guide and retrieve it by slug", async () => {
    await saveGuide(testGuide);

    expect(fs.existsSync(fallbackPath)).toBe(true);

    const retrieved = await getGuideBySlug("linear-oauth-sync-test");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.slug).toBe(testGuide.slug);
    expect(retrieved?.title).toBe(testGuide.title);
    expect(retrieved?.providerName).toBe("Linear");
    expect(retrieved?.variants.length).toBe(2);
    expect(retrieved?.variants[0].scopes).toEqual([]);
    expect(retrieved?.composioIntegration.managedOAuthAvailable).toBe(true);
  });

  it("should return null for unknown slugs", async () => {
    const nonexistent = await getGuideBySlug("definitely-unknown-slug-xyz-999");
    expect(nonexistent).toBeNull();
  });

  it("normalizes partial fallback records before persistence", async () => {
    const partialGuide: ProviderGuide = {
      ...testGuide,
      slug: "miro-partial-roundtrip-test",
      generationMode: "partial-fallback",
      completenessStatus: "partial",
      composioIntegration: {
        ...testGuide.composioIntegration,
        managedOAuthAvailable: true,
        customAuthConfigSnippet: "",
        composioRedirectUriHint: "",
      },
      variants: [{ ...testGuide.variants[0], scopes: [] }],
      registrationSteps: [],
    };
    const saved = await saveGuide(partialGuide);

    const retrieved = await getGuideBySlug(partialGuide.slug);
    expect(saved).toEqual(retrieved);
    expect(retrieved?.composioIntegration.managedOAuthAvailable).toBe(true);
    expect(retrieved?.composioIntegration.customAuthConfigSnippet).toBe("");
    expect(retrieved?.registrationSteps[0]?.consolePath).toBe(partialGuide.citations[0].sourceUrl);
    expect(retrieved?.distributionAndReviewChecklist).toEqual([]);
    expect(retrieved?.explicitUnknowns).toContain("Requested capability coverage");
  });

  it("normalizes unsafe live-generation configuration before persistence", async () => {
    const unsafeGuide: ProviderGuide = {
      ...testGuide,
      slug: "unsafe-live-guide",
      composioIntegration: {
        ...testGuide.composioIntegration,
        customAuthConfigSnippet: "client_secret=not-a-snippet",
        composioRedirectUriHint: "https://composio.example.com/callback",
      },
    };

    const saved = await saveGuide(unsafeGuide);
    const retrieved = await getGuideBySlug(unsafeGuide.slug);

    expect(saved.composioIntegration.customAuthConfigSnippet).toBe("");
    expect(saved.composioIntegration.composioRedirectUriHint).toBe("");
    expect(retrieved).toEqual(saved);
  });

  it("lists only persisted guides; reference guides are resolved separately", async () => {
    const list = await listSavedGuides();
    expect(Array.isArray(list)).toBe(true);
    expect(list.map((item) => item.slug)).toContain(testGuide.slug);
    expect(list.map((item) => item.slug)).not.toContain("gmail-send-vs-modify");
  });

  it("audits persisted records idempotently", async () => {
    const firstCount = await auditPersistedGuides();
    const first = await getGuideBySlug("unsafe-live-guide");
    const secondCount = await auditPersistedGuides();
    const second = await getGuideBySlug("unsafe-live-guide");

    expect(firstCount).toBeGreaterThan(0);
    expect(secondCount).toBe(firstCount);
    expect(second).toEqual(first);
  });
});
