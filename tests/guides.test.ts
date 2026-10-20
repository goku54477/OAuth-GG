import { describe, expect, it } from "vitest";
import { ProviderGuideSchema, type ProviderGuide } from "@/types/contracts";
import {
  buildPartialFallbackGuide,
  getGoldenGuideBySlug,
  listGoldenGuides,
  generateOrResolveGuide,
  verifyAndAuditGuide,
  auditGuideWithReport,
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
      expect(scopesA).toContain("issues:write");
      expect(scopesA).toContain("metadata:read");

      // Check fine-grained benefits
      const pros = variantA?.pros.join(" ").toLowerCase();
      expect(pros).toContain("source code");
      expect(pros).toContain("1-hour");
      expect(pros).toContain("rate limits");
      expect(pros).toContain("organization");

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
      expect(guide.composioIntegration.managedVsCustomVerdict.toLowerCase()).toContain("custom auth_configs");
      expect(guide.composioIntegration.managedVsCustomVerdict.toLowerCase()).toContain("rate limits");

      // Citations
      const urls = guide.citations.map((c) => c.sourceUrl);
      expect(urls).toContain(
        "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps"
      );
      expect(urls).toContain(
        "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps"
      );
      expect(urls).toContain(
        "https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app"
      );
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
      expect(scopesA).toContain("groups:history");

      // Setup steps and distribution checklist
      const stepText = guide.registrationSteps.map((s) => s.instructions + " " + s.title).join(" ");
      expect(stepText).toContain("HTTPS");
      expect(stepText).toContain("Manage Distribution");

      const checklistClaims = guide.distributionAndReviewChecklist.map((c) => c.claim).join(" ");
      expect(checklistClaims).toContain("Public Distribution");
      expect(checklistClaims).toContain("state parameter");

      // Variant B: Marketplace requirements
      const variantB = guide.variants.find((v) => v.variantId === "slack-marketplace-listed");
      expect(variantB).toBeDefined();
      const consB = variantB?.cons.join(" ");
      expect(consB).toContain("tokens_revoked");
      expect(consB).toContain("app_uninstalled");

      // Citations
      const urls = guide.citations.map((c) => c.sourceUrl);
      expect(urls).toContain("https://docs.slack.dev/tools/java-slack-sdk/guides/app-distribution");
      expect(urls).toContain("https://developer.salesforce.com/docs/platform/salesforce-slack-sdk/guide/scopes.html");
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

      expect(variantA?.estimatedReviewTimeline).toContain("3–7 business days");
      expect(variantA?.securityAuditRequired.toLowerCase()).toContain("none");

      // Variant B: Read/Modify Restricted Scope & CASA
      const variantB = guide.variants.find((v) => v.variantId === "gmail-read-modify-restricted");
      expect(variantB).toBeDefined();
      const readScope = variantB?.scopes.find((s) => s.scope.includes("gmail.readonly"));
      expect(readScope?.classification).toBe("restricted");
      expect(readScope?.triggersSecurityAudit).toBe(true);

      expect(variantB?.estimatedReviewTimeline).toContain("4–8+ weeks");
      expect(variantB?.securityAuditRequired).toContain("CASA Tier AL1/AL2");

      // Sandbox test user limit rule
      const sandboxClaim = guide.testingAndSandboxRules.find((r) => r.claim.includes("100"));
      expect(sandboxClaim).toBeDefined();
      expect(sandboxClaim?.claim).toContain("capped at 100 manually added test users");

      // Citations
      const urls = guide.citations.map((c) => c.sourceUrl);
      expect(urls).toContain("https://developers.google.com/workspace/gmail/api/auth/scopes");
      expect(urls).toContain(
        "https://developer.nylas.com/docs/provider-guides/google/google-verification-security-assessment-guide/"
      );
    });
  });
});

describe("Workstream 3: Deterministic Evidence Validator", () => {
  it("preserves source-supported status when citations are valid and present in allowedSourceUrls", () => {
    const allowedUrls = [
      "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps",
      "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps",
      "https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app",
    ];

    const audited = verifyAndAuditGuide(githubPublicIssuesGuide, allowedUrls);
    expect(audited.variants[0].scopes[0].epistemicStatus).toBe("source-supported");
    expect(audited.composioIntegration.epistemicStatus).toBe("source-supported");
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

  it("evaluates security review gates accurately", () => {
    const sensitiveScopes = gmailSendVsModifyGuide.variants[0].scopes;
    const sensitiveEval = evaluateSecurityReviewTriggers(sensitiveScopes);
    expect(sensitiveEval.triggersReview).toBe(true);
    expect(sensitiveEval.triggersAudit).toBe(false);
    expect(sensitiveEval.estimatedTimeline).toBe("3–7 business days");

    const restrictedScopes = gmailSendVsModifyGuide.variants[1].scopes;
    const restrictedEval = evaluateSecurityReviewTriggers(restrictedScopes);
    expect(restrictedEval.triggersReview).toBe(true);
    expect(restrictedEval.triggersAudit).toBe(true);
    expect(restrictedEval.estimatedTimeline).toBe("4–8+ weeks");
  });

  it("recommends custom auth_config for production customer apps", () => {
    const strat = evaluateComposioAuthStrategy({
      isProduction: true,
      requiresCustomBranding: true,
    });
    expect(strat.recommendedAuthScheme).toBe("CUSTOM_APP");
    expect(strat.rationale).toContain("custom auth_configs");
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
