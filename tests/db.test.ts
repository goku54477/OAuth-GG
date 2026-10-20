import { describe, it, expect, beforeEach } from "vitest";
import { saveGuide, getGuideBySlug, listSavedGuides, GMAIL_GUIDE_SEED } from "@/lib/db";
import type { ProviderGuide } from "@/types/contracts";

describe("Database Persistence Layer (src/lib/db/index.ts)", () => {
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

  it("should pre-seed and retrieve golden guides immediately", async () => {
    const gmailGuide = await getGuideBySlug("gmail-send-vs-modify");
    expect(gmailGuide).not.toBeNull();
    expect(gmailGuide?.slug).toBe("gmail-send-vs-modify");
    expect(gmailGuide?.providerName).toBe("Google / Gmail");
    expect(gmailGuide?.variants.length).toBeGreaterThanOrEqual(1);

    const githubGuide = await getGuideBySlug("github-public-issues");
    expect(githubGuide).not.toBeNull();
    expect(githubGuide?.slug).toBe("github-public-issues");

    const slackGuide = await getGuideBySlug("slack-channel-bot");
    expect(slackGuide).not.toBeNull();
    expect(slackGuide?.slug).toBe("slack-channel-bot");
  });

  it("should save a new guide and retrieve it by slug", async () => {
    await saveGuide(testGuide);

    const retrieved = await getGuideBySlug("linear-oauth-sync-test");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.slug).toBe(testGuide.slug);
    expect(retrieved?.title).toBe(testGuide.title);
    expect(retrieved?.providerName).toBe("Linear");
    expect(retrieved?.variants.length).toBe(2);
    expect(retrieved?.variants[0].scopes[0].scope).toBe("read");
    expect(retrieved?.composioIntegration.managedOAuthAvailable).toBe(true);
  });

  it("should return null for unknown slugs", async () => {
    const nonexistent = await getGuideBySlug("definitely-unknown-slug-xyz-999");
    expect(nonexistent).toBeNull();
  });

  it("round-trips a canonical partial guide without destroying verified metadata", async () => {
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
    expect(saved).toEqual(partialGuide);
    expect(retrieved).toEqual(partialGuide);
    expect(retrieved?.composioIntegration.managedOAuthAvailable).toBe(true);
    expect(retrieved?.citations).toEqual(partialGuide.citations);
  });

  it("should list saved guides including golden and newly saved guides", async () => {
    const list = await listSavedGuides();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(3);

    const slugs = list.map((item) => item.slug);
    expect(slugs).toContain("gmail-send-vs-modify");
    expect(slugs).toContain("github-public-issues");
    expect(slugs).toContain("slack-channel-bot");

    const gmailSummary = list.find((item) => item.slug === "gmail-send-vs-modify");
    expect(gmailSummary).toBeDefined();
    expect(gmailSummary?.providerName).toBe("Google / Gmail");
    expect(gmailSummary?.generationMode).toBe("golden-verified");
    expect(gmailSummary?.completenessStatus).toBe("complete");
    expect(gmailSummary?.generatedAt).toBeDefined();
  });
});
