import { describe, expect, it } from "vitest";

import {
  getVisibleCatalogItems,
  formatGuideDate,
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
  registrationSteps: [],
  testingAndSandboxRules: [],
  distributionAndReviewChecklist: [],
  practicalObservations: [],
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
    expect(normalizeWorkbenchTab("workbench-catalog")).toBe("workbench-catalog");
    expect(normalizeWorkbenchTab("interactive-guides")).toBe("interactive-guides");
    expect(normalizeWorkbenchTab("live-pipeline-audits")).toBe("interactive-guides");
    expect(normalizeWorkbenchTab("api-specs")).toBe("interactive-guides");
    expect(normalizeWorkbenchTab(null)).toBe("interactive-guides");
  });

  it("accepts only local guide redirects returned by investigation", () => {
    expect(readGuideRedirect({ redirectUrl: "/guides/stripe-oauth" })).toBe(
      "/guides/stripe-oauth",
    );
    expect(readGuideRedirect({ redirectUrl: "https://evil.example/guides/stripe" })).toBeNull();
    expect(readGuideRedirect({ redirectUrl: "/admin" })).toBeNull();
    expect(readGuideRedirect({ guide: { slug: "gmail" } })).toBeNull();
  });

  it("exports only claims present in the loaded ProviderGuide", () => {
    const markdown = guideToMarkdown(guide);

    expect(markdown).toContain("Stripe OAuth guide");
    expect(markdown).toContain("Request only required permissions.");
    expect(markdown).toContain("Production approval timeline");
    expect(markdown).toContain("https://docs.stripe.com/connect/oauth-reference");
    expect(markdown).not.toContain("$3,000");
    expect(markdown).not.toContain("CASA Tier 2 & Tier 3 Validated");
    expect(markdown).not.toContain("authbench/scope-guard-action");
  });

  it("bounds the initial catalog render while preserving the full result count", () => {
    const toolkits = Array.from({ length: 1619 }, (_, index) => ({ slug: `toolkit-${index}` }));

    expect(getVisibleCatalogItems(toolkits, 60)).toHaveLength(60);
    expect(getVisibleCatalogItems(toolkits, 1680)).toHaveLength(1619);
    expect(toolkits).toHaveLength(1619);
  });

  it("formats generated dates deterministically for server and browser rendering", () => {
    expect(formatGuideDate("2026-10-20T23:30:00.000Z")).toBe("2026-10-20");
  });
});
