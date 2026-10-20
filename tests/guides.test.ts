import { describe, expect, it } from "vitest";
import { EpistemicStatusSchema, ProviderGuideSchema, type ProviderGuide } from "@/types/contracts";
import {
  buildPartialFallbackGuide,
  getGoldenGuideBySlug,
  listGoldenGuides,
  generateOrResolveGuide,
  verifyAndAuditGuide,
  auditGuideWithReport,
  normalizeGuideForEvidence,
  normalizeReferenceGuideForEvidence,
  githubPublicIssuesGuide,
  slackChannelBotGuide,
  gmailSendVsModifyGuide,
} from "@/lib/guides";
import {
  matchGoldenGuideSlug,
  selectRecommendedVariant,
  evaluateSecurityReviewTriggers,
  evaluateComposioAuthStrategy,
} from "@/lib/router/decision-engine";

describe("Workstream 3: Golden Guides Schema & Content Verification", () => {
  it("parses all 3 golden reference guides strictly against ProviderGuideSchema", () => {
    const goldenGuides = [
      githubPublicIssuesGuide,
      slackChannelBotGuide,
      gmailSendVsModifyGuide,
    ];

    for (const guide of goldenGuides) {
      const parsed = ProviderGuideSchema.parse(guide);
      expect(parsed.slug).toBe(guide.slug);
      expect(parsed.generationMode).toBe("golden-verified");
      expect(parsed.completenessStatus).toBe("complete");
      expect(parsed.variants.length).toBeGreaterThanOrEqual(2);
      expect(parsed.citations.length).toBeGreaterThanOrEqual(2);
    }
  });

  describe("GitHub Public Issues Golden Guide", () => {
    it("conforms to all mandatory GitHub technical requirements", () => {
      const guide = getGoldenGuideBySlug("github-public-issues");
      expect(guide).not.toBeNull();
      if (!guide) return;

      expect(guide.toolkitSlug).toBe("github");

      // Variant A: Fine-grained GitHub App
      const variantA = guide.variants.find((v) => v.variantId === "github-app-issues");
      expect(variantA).toBeDefined();
      expect(variantA?.recommendedAppType).toBe("GitHub App");

      const scopesA = variantA?.scopes.map((s) => s.scope);
      expect(scopesA).toContain("Issues: write");
      expect(scopesA).not.toContain("metadata:read");

      // Check the source-backed least-privilege distinction without invented operations data.
      const pros = variantA?.pros.join(" ").toLowerCase();
      expect(pros).toContain("repository code");
      expect(pros).not.toContain("rate limit");

      // Variant B: OAuth App public_repo warning
      const variantB = guide.variants.find((v) => v.variantId === "github-oauth-public-repo");
      expect(variantB).toBeDefined();
      expect(variantB?.scopes.map((s) => s.scope)).toContain("public_repo");
      const consB = variantB?.cons.join(" ").toLowerCase();
      expect(consB).toContain("public_repo");
      expect(consB).toContain("coarse");
      expect(consB).toContain("code");

      // Composio Integration
      expect(guide.composioIntegration.managedOAuthAvailable).toBe(true);
      expect(guide.composioIntegration.managedVsCustomVerdict).toContain("catalog metadata");
      expect(guide.composioIntegration.customAuthConfigSnippet).toBe("");
      expect(guide.composioIntegration.composioRedirectUriHint).toBe("");
      expect(guide.variants.every((variant) => variant.estimatedReviewTimeline === "Unknown")).toBe(true);
      expect(guide.variants.every((variant) => variant.securityAuditRequired === "Unknown")).toBe(true);
      expect(guide.explicitUnknowns).toContain("Provider review timelines and security-assessment requirements");

      // Citations
      const urls = guide.citations.map((c) => c.sourceUrl);
      expect(urls).toContain(
        "https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app"
      );
      expect(urls).toContain(
        "https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps"
      );
      expect(urls).toContain(
        "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps"
      );
      expect(urls.every((url) => url.startsWith("https://docs.github.com/"))).toBe(true);
    });
  });

  describe("Slack Channel Bot Golden Guide", () => {
    it("conforms to all mandatory Slack technical requirements", () => {
      const guide = getGoldenGuideBySlug("slack-channel-bot");
      expect(guide).not.toBeNull();
      if (!guide) return;

      expect(guide.toolkitSlug).toBe("slack");

      // Variant A: Granular Bot Scopes
      const variantA = guide.variants.find((v) => v.variantId === "slack-granular-bot-unlisted");
      expect(variantA).toBeDefined();
      const scopesA = variantA?.scopes.map((s) => s.scope);
      expect(scopesA).toContain("channels:history");
      expect(scopesA).toContain("chat:write");
      expect(scopesA).not.toContain("groups:history");

      // Setup steps and distribution checklist
      const stepText = guide.registrationSteps.map((s) => s.instructions + " " + s.title).join(" ");
      expect(stepText).toContain("HTTPS");
      expect(stepText).toContain("Manage Distribution");

      const checklistClaims = guide.distributionAndReviewChecklist.map((c) => c.claim).join(" ");
      expect(checklistClaims).toContain("Unlisted distribution");
      expect(checklistClaims).toContain("Slack Marketplace");

      // Variant B: Marketplace requirements
      const variantB = guide.variants.find((v) => v.variantId === "slack-marketplace-listed");
      expect(variantB).toBeDefined();
      expect(variantB?.estimatedReviewTimeline).toBe("Unknown");
      expect(variantB?.securityAuditRequired).toBe("Unknown");
      expect(guide.composioIntegration.customAuthConfigSnippet).toBe("");
      expect(guide.composioIntegration.composioRedirectUriHint).toBe("");
      expect(guide.explicitUnknowns).toContain("Slack Marketplace review timeline and security-review requirements");

      // Citations
      const urls = guide.citations.map((c) => c.sourceUrl);
      expect(urls).toContain("https://docs.slack.dev/app-management/distribution/");
      expect(urls).toContain("https://docs.slack.dev/authentication/installing-with-oauth/");
    });
  });

  describe("Gmail Send vs Modify Golden Guide", () => {
    it("conforms to all mandatory Gmail technical requirements", () => {
      const guide = getGoldenGuideBySlug("gmail-send-vs-modify");
      expect(guide).not.toBeNull();
      if (!guide) return;

      expect(guide.toolkitSlug).toBe("gmail");

      // Variant A: Send-Only Sensitive Scope
      const variantA = guide.variants.find((v) => v.variantId === "gmail-send-only-sensitive");
      expect(variantA).toBeDefined();
      const sendScope = variantA?.scopes.find((s) => s.scope.includes("gmail.send"));
      expect(sendScope).toBeDefined();
      expect(sendScope?.classification).toBe("sensitive");
      expect(sendScope?.triggersExternalReview).toBe(true);
      expect(sendScope?.triggersSecurityAudit).toBe(false);

      expect(variantA?.estimatedReviewTimeline).toBe("Unknown");
      expect(variantA?.securityAuditRequired).toBe("Unknown");

      const labelsScope = variantA?.scopes.find((scope) => scope.scope.includes("gmail.labels"));
      expect(labelsScope?.requiredForCapability).toContain("does not apply labels to messages");
      const modifyScope = guide.variants
        .find((variant) => variant.variantId === "gmail-read-modify-restricted")?.scopes
        .find((scope) => scope.scope.includes("gmail.modify"));
      expect(modifyScope?.requiredForCapability).toContain("apply or remove labels on messages");

      // Variant B: Read/Modify Restricted Scope & CASA
      const variantB = guide.variants.find((v) => v.variantId === "gmail-read-modify-restricted");
      expect(variantB).toBeDefined();
      const readScope = variantB?.scopes.find((s) => s.scope.includes("gmail.readonly"));
      expect(readScope?.classification).toBe("restricted");
      expect(readScope?.triggersSecurityAudit).toBe(false);

      expect(variantB?.estimatedReviewTimeline).toBe("Unknown");
      expect(variantB?.securityAuditRequired).toBe("Unknown");
      expect(guide.distributionAndReviewChecklist.map((item) => item.claim).join(" ")).toContain(
        "stores or transmits restricted-scope data",
      );

      expect(guide.testingAndSandboxRules).toEqual([]);
      expect(guide.explicitUnknowns).toContain("Provider-specific verification timelines, fees, and assessment details");

      // Citations
      const urls = guide.citations.map((c) => c.sourceUrl);
      expect(urls).toContain("https://developers.google.com/workspace/gmail/api/auth/scopes");
      expect(urls).toContain(
        "https://developers.google.com/workspace/gmail/api/guides/labels"
      );
    });
  });
});

describe("Workstream 3: Deterministic Evidence Validator", () => {
  it("supports recommendation as a distinct epistemic status", () => {
    expect(EpistemicStatusSchema.parse("recommendation")).toBe("recommendation");
  });

  it("enforces safe reference-guide configuration and review defaults", () => {
    const unsafeReference: ProviderGuide = {
      ...githubPublicIssuesGuide,
      composioIntegration: {
        ...githubPublicIssuesGuide.composioIntegration,
        managedVsCustomVerdict: "Production requires a custom auth_config.",
        customAuthConfigSnippet: "client_secret={{SECRET}}",
        composioRedirectUriHint: "https://composio.example.com/callback",
      },
      variants: githubPublicIssuesGuide.variants.map((variant) => ({
        ...variant,
        estimatedReviewTimeline: "Instant",
        securityAuditRequired: "None",
      })),
    };

    const normalized = normalizeReferenceGuideForEvidence(unsafeReference);

    expect(normalized.composioIntegration.customAuthConfigSnippet).toBe("");
    expect(normalized.composioIntegration.composioRedirectUriHint).toBe("");
    expect(normalized.composioIntegration.managedVsCustomVerdict).toContain("catalog metadata");
    expect(normalized.variants.every((variant) => variant.estimatedReviewTimeline === "Unknown")).toBe(true);
    expect(normalized.variants.every((variant) => variant.securityAuditRequired === "Unknown")).toBe(true);
    expect(JSON.stringify(normalized)).not.toContain("composio.example.com");
  });

  it("normalizes live guides into citation-backed documentation without invented configuration", () => {
    const unsafeLiveGuide: ProviderGuide = {
      ...githubPublicIssuesGuide,
      generationMode: "live-researched",
      completenessStatus: "complete",
      composioIntegration: {
        ...githubPublicIssuesGuide.composioIntegration,
        managedVsCustomVerdict: "Production always requires a custom app.",
        customAuthConfigSnippet: "redirect_uri=https://example.invalid/callback",
        composioRedirectUriHint: "https://composio.example.com/oauth/callback",
      },
      variants: [{
        ...githubPublicIssuesGuide.variants[0],
        summary: "Writes issues with a read-only permission.",
        recommendedAppType: "OAuth web app",
        estimatedReviewTimeline: "2-3 days",
        securityAuditRequired: "CASA required",
        approvalGateSummary: "External review required",
        pros: ["Fast approval"],
        cons: ["Audit cost"],
        scopes: [{
          ...githubPublicIssuesGuide.variants[0].scopes[0],
          scope: "invented:scope",
          citationIds: ["cite-github-app-vs-oauth"],
        }],
      }],
      registrationSteps: [{
        ...githubPublicIssuesGuide.registrationSteps[0],
        consolePath: "https://composio.example.com/config",
        criticalConfigValues: [{ label: "Redirect URI", value: "https://example.invalid" }],
      }],
      explicitUnknowns: ["CASA AL1/AL2 requirements", "The provider does not publish a review timeline"],
    };

    const normalized = normalizeGuideForEvidence(unsafeLiveGuide);

    expect(normalized.completenessStatus).toBe("partial");
    expect(normalized.title).toBe("GitHub Integration & OAuth Guide (Partial Reference)");
    expect(normalized.subtitle).toBe("Provider-specific OAuth configuration could not be fully verified from trusted evidence.");
    expect(normalized.composioIntegration.customAuthConfigSnippet).toBe("");
    expect(normalized.composioIntegration.composioRedirectUriHint).toBe("");
    expect(normalized.composioIntegration.managedVsCustomVerdict).not.toContain("Production");
    expect(normalized.variants[0].scopes).toEqual([]);
    expect(normalized.variants[0].estimatedReviewTimeline).toBe("Unknown");
    expect(normalized.variants[0].securityAuditRequired).toBe("Unknown");
    expect(normalized.registrationSteps[0].consolePath).toMatch(/^https:\/\/docs\.github\.com/);
    expect(normalized.explicitUnknowns).toContain("Requested capability coverage");
    expect(normalized.explicitUnknowns.join(" ")).not.toMatch(/casa|al1|al2/i);
    expect(normalized.explicitUnknowns.join(" ")).not.toContain("does not publish");
    expect(JSON.stringify(normalized)).not.toContain("composio.example.com");
  });

  it("keeps source-backed OAuth setup and permission descriptions for a live guide", () => {
    const citation = {
      id: "linear-oauth",
      sourceUrl: "https://linear.app/developers/oauth-2-0-authentication",
      sourceTitle: "OAuth 2.0 authentication",
      authorityType: "official-provider-docs" as const,
      retrievedAt: "2026-10-21T00:00:00.000Z",
      verbatimQuote: "Create a new OAuth2 Application and configure the redirect callback URLs to your application. read - Read access for the user's account. issues:create - Allows creating new issues and their attachments.",
      epistemicStatus: "source-supported" as const,
    };
    const guide: ProviderGuide = {
      ...githubPublicIssuesGuide,
      slug: "linear",
      providerName: "Linear",
      generationMode: "live-researched",
      citations: [citation],
      variants: [{
        ...githubPublicIssuesGuide.variants[0],
        title: "Linear OAuth2 application",
        summary: "Use an OAuth2 Application for user-authorized Linear access.",
        recommendedAppType: "Unknown",
        scopes: [{
          ...githubPublicIssuesGuide.variants[0].scopes[0],
          scope: "issues:create",
          displayName: "Create issues",
          requiredForCapability: "Allows creating new issues and their attachments.",
          citationIds: [citation.id],
        }],
      }],
      registrationSteps: [{
        ...githubPublicIssuesGuide.registrationSteps[0],
        title: "Create an OAuth2 Application",
        instructions: "Create a new OAuth2 Application and configure the redirect callback URLs to your application.",
        consolePath: citation.sourceUrl,
        criticalConfigValues: [],
        citationIds: [citation.id],
      }],
    };

    const normalized = normalizeGuideForEvidence(guide);

    expect(normalized.variants[0].recommendedAppType).toBe("OAuth2 Application");
    expect(normalized.variants[0].scopes[0].requiredForCapability).toContain("creating new issues");
    expect(normalized.registrationSteps[0]).toMatchObject({
      title: "Create an OAuth2 Application",
      instructions: "Create a new OAuth2 Application and configure the redirect callback URLs to your application.",
    });
  });

  it("preserves source-supported status when citations are valid and present in allowedSourceUrls", () => {
    const allowedUrls = [
      "https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app",
      "https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps",
      "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps",
    ];

    const audited = verifyAndAuditGuide(githubPublicIssuesGuide, allowedUrls);
    expect(audited.variants[0].scopes[0].epistemicStatus).toBe("source-supported");
    expect(audited.composioIntegration.epistemicStatus).toBe("observed");
  });

  it("downgrades claims when citation URL is not in allowedSourceUrls for live-researched guides", () => {
    const liveGuide: ProviderGuide = {
      ...githubPublicIssuesGuide,
      generationMode: "live-researched",
      citations: [
        {
          id: "cite-untrusted",
          sourceUrl: "https://untrusted-thirdparty-blog.org/github-tips",
          sourceTitle: "Random Blog",
          authorityType: "secondary-technical",
          retrievedAt: "2026-10-20T00:00:00.000Z",
          verbatimQuote: "GitHub issues permission allows writing issues.",
          epistemicStatus: "source-supported",
        },
      ],
      variants: [
        {
          ...githubPublicIssuesGuide.variants[0],
          scopes: [
            {
              ...githubPublicIssuesGuide.variants[0].scopes[0],
              epistemicStatus: "source-supported",
              citationIds: ["cite-untrusted"],
            },
          ],
        },
      ],
    };

    const allowedUrls = ["https://docs.github.com/en/official"];
    const report = auditGuideWithReport(liveGuide, allowedUrls);

    expect(report.downgradedCitationsCount).toBe(1);
    expect(report.unverifiedCitationIds).toContain("cite-untrusted");
    expect(report.auditedGuide.citations[0].epistemicStatus).toBe("unknown");
    expect(report.auditedGuide.variants[0].scopes[0].epistemicStatus).toBe("estimated");
  });

  it("downgrades citations and referencing claims when verbatimQuote is missing or empty", () => {
    const mockGuide: ProviderGuide = {
      ...githubPublicIssuesGuide,
      generationMode: "live-researched",
      citations: [
        {
          id: "cite-empty-quote",
          sourceUrl: "https://docs.github.com/en/apps/valid",
          sourceTitle: "GitHub Docs",
          authorityType: "official-provider-docs",
          retrievedAt: "2026-10-20T00:00:00.000Z",
          verbatimQuote: "   ", // whitespace only
          epistemicStatus: "source-supported",
        },
      ],
      testingAndSandboxRules: [
        {
          claim: "Some claim requiring quote",
          epistemicStatus: "source-supported",
          citationIds: ["cite-empty-quote"],
        },
      ],
    };

    const audited = verifyAndAuditGuide(mockGuide, ["https://docs.github.com/en/apps/valid"]);
    expect(audited.citations[0].epistemicStatus).toBe("estimated");
    expect(audited.testingAndSandboxRules[0].epistemicStatus).toBe("estimated");
  });

  it("downgrades claims with empty citationIds to unknown", () => {
    const mockGuide: ProviderGuide = {
      ...githubPublicIssuesGuide,
      testingAndSandboxRules: [
        {
          claim: "Claim with no citations",
          epistemicStatus: "source-supported",
          citationIds: [],
        },
      ],
    };

    const audited = verifyAndAuditGuide(mockGuide, []);
    expect(audited.testingAndSandboxRules[0].epistemicStatus).toBe("unknown");
  });
});

describe("Workstream 3: Decision Engine & Guide Generator", () => {
  it("correctly matches golden guide slugs and toolkit aliases", () => {
    expect(matchGoldenGuideSlug("github")).toBe("github-public-issues");
    expect(matchGoldenGuideSlug("Manage public issues in github repo")).toBe("github-public-issues");
    expect(matchGoldenGuideSlug("slack")).toBe("slack-channel-bot");
    expect(matchGoldenGuideSlug("https://api.slack.com/bot")).toBe("slack-channel-bot");
    expect(matchGoldenGuideSlug("gmail")).toBe("gmail-send-vs-modify");
    expect(matchGoldenGuideSlug("Send transactional emails via gmail")).toBe("gmail-send-vs-modify");
    expect(matchGoldenGuideSlug("unknown-tool")).toBeNull();
  });

  it("selects least privilege variant by default and broader variant when explicit high-privilege caps are asked", () => {
    const defaultVariant = selectRecommendedVariant(gmailSendVsModifyGuide, ["send"]);
    expect(defaultVariant.variantId).toBe("gmail-send-only-sensitive");

    const broadVariant = selectRecommendedVariant(gmailSendVsModifyGuide, ["modify-mail", "read-all"]);
    expect(broadVariant.variantId).toBe("gmail-read-modify-restricted");
  });

  it("does not invent security-review timelines from scope flags", () => {
    const sensitiveScopes = gmailSendVsModifyGuide.variants[0].scopes;
    const sensitiveEval = evaluateSecurityReviewTriggers(sensitiveScopes);
    expect(sensitiveEval.triggersReview).toBe(true);
    expect(sensitiveEval.triggersAudit).toBe(false);
    expect(sensitiveEval.estimatedTimeline).toBe("Unknown");

    const restrictedScopes = gmailSendVsModifyGuide.variants[1].scopes;
    const restrictedEval = evaluateSecurityReviewTriggers(restrictedScopes);
    expect(restrictedEval.triggersReview).toBe(true);
    expect(restrictedEval.triggersAudit).toBe(false);
    expect(restrictedEval.estimatedTimeline).toBe("Unknown");
    expect(restrictedEval.reviewType).not.toMatch(/CASA|AL1|AL2/i);
  });

  it("does not infer a custom auth requirement without catalog evidence", () => {
    const strat = evaluateComposioAuthStrategy({
      isProduction: true,
      requiresCustomBranding: true,
    });
    expect(strat.recommendedAuthScheme).toBe("UNKNOWN");
    expect(strat.rationale).toContain("cannot be determined");
  });

  it("resolves golden guide via generateOrResolveGuide", async () => {
    const guide = await generateOrResolveGuide({
      queryOrUrl: "github",
    });
    expect(guide.slug).toBe("github-public-issues");
    expect(guide.generationMode).toBe("golden-verified");
  });

  it("produces a schema-compliant fallback guide when API key is missing or research bundle is empty", async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const fallbackGuide = await generateOrResolveGuide({
        queryOrUrl: "hubspot-custom-crm",
        capabilities: ["read", "write"],
      });

      expect(fallbackGuide.generationMode).toBe("partial-fallback");
      expect(fallbackGuide.completenessStatus).toBe("partial");
      expect(fallbackGuide.explicitUnknowns.length).toBeGreaterThan(0);
      expect(fallbackGuide.composioIntegration.customAuthConfigSnippet).toBe("");
      expect(fallbackGuide.composioIntegration.composioRedirectUriHint).toBe("");
      expect(fallbackGuide.registrationSteps).toEqual([]);
      expect(fallbackGuide.variants[0].scopes).toEqual([]);
      expect(JSON.stringify(fallbackGuide)).not.toContain("example.com/oauth");
      expect(ProviderGuideSchema.parse(fallbackGuide)).toBeDefined();
    } finally {
      if (originalKey) process.env.OPENAI_API_KEY = originalKey;
    }
  });

  it("does not attach provider-looking evidence to an unmatched provider fallback", () => {
    const guide = buildPartialFallbackGuide({
      queryOrUrl: "AuthBenchTestApp-739",
      researchBundle: {
        providerQuery: "AuthBenchTestApp-739",
        warnings: [],
        degradedMode: false,
        documents: [{
          citation: {
            id: "citation-provider-looking",
            sourceUrl: "https://docs.authbenchtestapp-739.example/oauth",
            sourceTitle: "Unverified documentation",
            authorityType: "official-provider-docs",
            retrievedAt: "2026-10-20T00:00:00.000Z",
            verbatimQuote: "OAuth details",
            epistemicStatus: "source-supported",
          },
          cleanMarkdown: "OAuth details",
          highlights: ["OAuth details"],
          retrievalMethod: "exa-auto",
        }],
      },
    });

    expect(guide.toolkitSlug).toBeUndefined();
    expect(guide.citations).toEqual([]);
    expect(guide.variants[0].scopes).toEqual([]);
  });

  it("lists all golden guides via listGoldenGuides", () => {
    const guides = listGoldenGuides();
    expect(guides.length).toBe(3);
    const slugs = guides.map((g) => g.slug);
    expect(slugs).toContain("github-public-issues");
    expect(slugs).toContain("slack-channel-bot");
    expect(slugs).toContain("gmail-send-vs-modify");
  });
});
