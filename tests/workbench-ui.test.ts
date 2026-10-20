import { describe, expect, it } from "vitest";

import {
  getVisibleCatalogItems,
  formatGuideDate,
  getCitationSourceLabel,
  getMissingQuoteLabel,
  getManagedOAuthLabel,
  getGuideGenerationLabel,
  getDocumentedScopes,
  getCatalogGuideAction,
  getCatalogSegmentItems,
  isOAuthToolkit,
  hasSubstantiveGuideComparison,
  guideToMarkdown,
  normalizeWorkbenchTab,
  readGuideRedirect,
} from "@/components/workbench-utils";
import type { ProviderGuide } from "@/types/contracts";

const guide: ProviderGuide = {
  slug: "stripe-oauth",
  providerName: "Stripe",
  toolkitSlug: "stripe",
  title: "Stripe OAuth guide",
  subtitle: "Verified integration notes",
  generatedAt: "2026-10-20T00:00:00.000Z",
  generationMode: "live-researched",
  completenessStatus: "partial",
  investigationContext: {
    query: "Stripe",
    requestedCapabilities: ["read", "write"],
    sourceMode: "official-documentation",
    officialDocumentationUrl: "https://docs.stripe.com/connect/oauth-reference",
  },
  composioIntegration: {
    managedOAuthAvailable: true,
    managedVsCustomVerdict: "Use managed auth for prototyping.",
    customAuthConfigSnippet: "STRIPE_CLIENT_ID=example",
    composioRedirectUriHint: "https://example.com/callback",
    epistemicStatus: "observed",
    citationIds: ["stripe-docs"],
  },
  variants: [
    {
      variantId: "standard",
      title: "Standard OAuth",
      summary: "Request only required permissions.",
      recommendedAppType: "OAuth web application",
      scopes: [],
      approvalGateSummary: "Provider review is unknown.",
      estimatedReviewTimeline: "Unknown",
      securityAuditRequired: "Unknown",
      pros: ["Small permission boundary"],
      cons: ["Review requirements remain unknown"],
    },
  ],
  registrationSteps: [
    {
      stepNumber: 1,
      title: "Register OAuth app",
      consolePath: "Stripe Dashboard > Connect",
      instructions: "Create the application and record its client ID.",
      criticalConfigValues: [
        { label: "Redirect URI", value: "https://example.com/callback" },
      ],
      epistemicStatus: "source-supported",
      citationIds: ["stripe-docs"],
    },
  ],
  testingAndSandboxRules: [
    {
      claim: "Use test mode during development.",
      epistemicStatus: "source-supported",
      citationIds: ["stripe-docs"],
    },
  ],
  distributionAndReviewChecklist: [
    {
      claim: "Confirm the production redirect URI.",
      epistemicStatus: "observed",
      citationIds: [],
    },
  ],
  practicalObservations: [
    {
      claim: "Keep permissions narrow.",
      epistemicStatus: "observed",
      citationIds: [],
    },
  ],
  explicitUnknowns: ["Production approval timeline"],
  citations: [
    {
      id: "stripe-docs",
      sourceUrl: "https://docs.stripe.com/connect/oauth-reference",
      sourceTitle: "Stripe OAuth reference",
      authorityType: "official-provider-docs",
      retrievedAt: "2026-10-20T00:00:00.000Z",
      epistemicStatus: "source-supported",
    },
  ],
};

describe("workbench UI trust boundaries", () => {
  it("accepts only the two supported workbench tabs", () => {
    expect(normalizeWorkbenchTab("workbench-catalog")).toBe(
      "workbench-catalog",
    );
    expect(normalizeWorkbenchTab("interactive-guides")).toBe(
      "interactive-guides",
    );
    expect(normalizeWorkbenchTab("live-pipeline-audits")).toBe(
      "interactive-guides",
    );
    expect(normalizeWorkbenchTab("api-specs")).toBe("interactive-guides");
    expect(normalizeWorkbenchTab(null)).toBe("interactive-guides");
  });

  it("accepts only local guide redirects returned by investigation", () => {
    expect(readGuideRedirect({ redirectUrl: "/guides/stripe-oauth" })).toBe(
      "/guides/stripe-oauth",
    );
    expect(
      readGuideRedirect({ redirectUrl: "https://evil.example/guides/stripe" }),
    ).toBeNull();
    expect(readGuideRedirect({ redirectUrl: "/admin" })).toBeNull();
    expect(readGuideRedirect({ guide: { slug: "gmail" } })).toBeNull();
  });

  it("exports only claims present in the loaded ProviderGuide", () => {
    const markdown = guideToMarkdown(guide);

    expect(markdown).toContain("Stripe OAuth guide");
    expect(markdown).toContain("## Investigated scenario");
    expect(markdown).toContain("Requested capabilities: read, write");
    expect(markdown).toContain(
      "Official documentation: https://docs.stripe.com/connect/oauth-reference",
    );
    expect(markdown).toContain("## AuthBench can help");
    expect(markdown).toContain("## Human action required");
    expect(markdown).toContain("Request only required permissions.");
    expect(markdown).toContain("## What this guide does not verify");
    expect(markdown).toContain("Production approval timeline");
    expect(markdown).toContain(
      "https://docs.stripe.com/connect/oauth-reference",
    );
    expect(markdown).toContain("https://example.com/callback");
    expect(markdown).toContain("Small permission boundary");
    expect(markdown).toContain("Review requirements remain unknown");
    expect(markdown).toContain("Register OAuth app");
    expect(markdown).toContain("Use test mode during development.");
    expect(markdown).toContain("Confirm the production redirect URI.");
    expect(markdown).toContain("Keep permissions narrow.");
    expect(markdown).not.toContain("$3,000");
    expect(markdown).not.toContain("CASA Tier 2 & Tier 3 Validated");
    expect(markdown).not.toContain("authbench/scope-guard-action");
  });

  it("bounds the initial catalog render while preserving the full result count", () => {
    const toolkits = Array.from({ length: 1619 }, (_, index) => ({
      slug: `toolkit-${index}`,
    }));

    expect(getVisibleCatalogItems(toolkits, 60)).toHaveLength(60);
    expect(getVisibleCatalogItems(toolkits, 1680)).toHaveLength(1619);
    expect(toolkits).toHaveLength(1619);
  });

  it("formats generated dates deterministically for server and browser rendering", () => {
    expect(formatGuideDate("2026-10-20T23:30:00.000Z")).toBe("2026-10-20");
  });

  it("labels provenance without overstating source authority or quote verification", () => {
    expect(getCitationSourceLabel("official-provider-docs")).toBe(
      "Official provider source",
    );
    expect(getCitationSourceLabel("secondary-technical")).toBe(
      "Secondary technical source",
    );
    expect(getCitationSourceLabel("practical-inspection")).toBe(
      "Practical inspection source",
    );
    expect(getMissingQuoteLabel()).toBe(
      "No verbatim quote captured for this citation.",
    );
  });

  it("hides the comparison surface for a placeholder-only fallback", () => {
    const fallback: ProviderGuide = {
      ...guide,
      generationMode: "partial-fallback",
      composioIntegration: {
        ...guide.composioIntegration,
        managedOAuthAvailable: true,
        epistemicStatus: "observed",
      },
      variants: [
        {
          ...guide.variants[0],
          recommendedAppType: "Unknown",
          approvalGateSummary: "Unknown",
          estimatedReviewTimeline: "Unknown",
          securityAuditRequired: "Unknown",
          scopes: [],
          pros: [],
          cons: [],
        },
      ],
    };

    expect(hasSubstantiveGuideComparison(fallback)).toBe(false);
    expect(guideToMarkdown(fallback)).not.toContain("## Standard OAuth");
    expect(guideToMarkdown(fallback)).toContain("## Research incomplete");
  });

  it("does not treat source-only scope names as a scope-and-review comparison", () => {
    const documentedOnly: ProviderGuide = {
      ...guide,
      variants: [
        {
          ...guide.variants[0],
          recommendedAppType: "Unknown",
          approvalGateSummary: "Unknown",
          estimatedReviewTimeline: "Unknown",
          securityAuditRequired: "Unknown",
          pros: [],
          cons: [],
          scopes: [
            {
              scope: "documented:scope",
              displayName: "documented:scope",
              classification: "unknown",
              requiredForCapability:
                "Provider scope documented; requested capability coverage is not verified.",
              triggersExternalReview: false,
              triggersSecurityAudit: false,
              epistemicStatus: "source-supported",
              citationIds: ["stripe-docs"],
            },
          ],
        },
      ],
    };

    expect(hasSubstantiveGuideComparison(documentedOnly)).toBe(false);
    const markdown = guideToMarkdown(documentedOnly);
    expect(markdown).toContain("## Documented provider permissions");
    expect(markdown).toContain("documented:scope");
    expect(markdown).toContain("citations: stripe-docs");
  });

  it("deduplicates documented permissions repeated across variants", () => {
    const scope = {
      scope: "boards:read",
      displayName: "boards:read",
      classification: "unknown" as const,
      requiredForCapability: "Coverage unknown",
      triggersExternalReview: false,
      triggersSecurityAudit: false,
      epistemicStatus: "source-supported" as const,
      citationIds: ["stripe-docs"],
    };
    const repeated: ProviderGuide = {
      ...guide,
      variants: [
        { ...guide.variants[0], scopes: [scope] },
        { ...guide.variants[0], variantId: "second", scopes: [scope] },
      ],
    };

    expect(getDocumentedScopes(repeated)).toEqual([scope]);
  });

  it("uses epistemic status when labeling managed OAuth", () => {
    expect(
      getManagedOAuthLabel({
        managedOAuthAvailable: true,
        epistemicStatus: "observed",
      }),
    ).toBe("Available");
    expect(
      getManagedOAuthLabel({
        managedOAuthAvailable: false,
        epistemicStatus: "observed",
      }),
    ).toBe("Unavailable");
    expect(
      getManagedOAuthLabel({
        managedOAuthAvailable: false,
        epistemicStatus: "unknown",
      }),
    ).toBe("Unknown");
  });

  it("uses neutral human-readable guide status labels", () => {
    expect(getGuideGenerationLabel({ generationMode: "golden-verified" })).toBe(
      "Reference guide",
    );
    expect(getGuideGenerationLabel({ generationMode: "live-researched" })).toBe(
      "Live researched",
    );
    expect(
      getGuideGenerationLabel({ generationMode: "partial-fallback" }),
    ).toBe("Partial guide");
  });

  it("segments the catalog using real auth metadata and saved guide slugs", () => {
    const base = {
      description: "",
      categories: [],
      composioManagedAuthSchemes: [],
      requiredAuthCreationFields: [],
      toolsCount: 0,
      triggersCount: 0,
      requiresCustomAppForProduction: false,
    };
    const toolkits = [
      {
        ...base,
        slug: "alpha",
        name: "Alpha",
        authSchemes: ["OAUTH2"],
        hasManagedOAuth: false,
      },
      {
        ...base,
        slug: "beta",
        name: "Beta",
        authSchemes: ["API_KEY"],
        hasManagedOAuth: false,
      },
      {
        ...base,
        slug: "gamma",
        name: "Gamma",
        authSchemes: [],
        hasManagedOAuth: true,
        goldenGuideSlug: "gamma-guide",
      },
    ];

    expect(isOAuthToolkit(toolkits[0])).toBe(true);
    expect(isOAuthToolkit(toolkits[1])).toBe(false);
    expect(getCatalogSegmentItems(toolkits, "oauth", new Set())).toHaveLength(
      2,
    );
    expect(
      getCatalogSegmentItems(
        toolkits,
        "saved",
        new Set(["alpha", "gamma-guide"]),
      ),
    ).toHaveLength(2);
    expect(getCatalogGuideAction(toolkits[0], "alpha")).toEqual({
      label: "Open guide",
      guideSlug: "alpha",
    });
    expect(getCatalogGuideAction(toolkits[0], null)).toEqual({
      label: "Generate guide",
    });
    expect(getCatalogGuideAction(toolkits[1], null)).toEqual({
      label: "Check auth path",
    });
  });
});
