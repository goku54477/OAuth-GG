import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateObject: vi.fn(),
  openai: vi.fn(() => "test-model"),
}));

vi.mock("ai", () => ({ generateObject: mocks.generateObject }));
vi.mock("@ai-sdk/openai", () => ({ openai: mocks.openai }));

import { githubPublicIssuesGuide } from "@/data/golden-guides/github-public-issues";
import {
  generateStructuredGuide,
  generateStructuredGuideWithDiagnostics,
} from "@/lib/guides/generator";

const stripeCatalog = {
  slug: "stripe",
  name: "Stripe",
  description: "Payments",
  categories: [],
  authSchemes: [],
  composioManagedAuthSchemes: [],
  hasManagedOAuth: true,
  requiresCustomAppForProduction: false,
  requiredAuthCreationFields: [],
  toolsCount: 0,
  triggersCount: 0,
};

const stripeResearch = {
  providerQuery: "Stripe",
  warnings: [],
  degradedMode: false,
  documents: [{
    citation: {
      id: "stripe-docs",
      sourceUrl: "https://docs.stripe.com/oauth",
      sourceTitle: "Stripe docs",
      authorityType: "official-provider-docs" as const,
      retrievedAt: "2026-10-20T00:00:00.000Z",
      verbatimQuote: "OAuth documentation.",
      epistemicStatus: "source-supported" as const,
    },
    cleanMarkdown: "OAuth documentation.",
    highlights: ["OAuth documentation."],
    retrievalMethod: "exa-auto",
  }],
};

describe("live guide generation", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    mocks.generateObject.mockResolvedValue({ object: githubPublicIssuesGuide });
  });

  it("reserves enough output tokens for the ProviderGuide schema", async () => {
    await generateStructuredGuide({
      queryOrUrl: "Stripe",
      catalogItem: stripeCatalog,
      researchBundle: stripeResearch,
    });

    expect(mocks.generateObject).toHaveBeenCalledWith(expect.objectContaining({ maxTokens: 8192 }));
    expect(mocks.generateObject.mock.calls[0][0].prompt).toContain("Citation ID: stripe-docs");
  });

  it("assembles identity, catalog metadata, and citations outside model output", async () => {
    const result = await generateStructuredGuideWithDiagnostics({
      queryOrUrl: "Stripe",
      catalogItem: stripeCatalog,
      researchBundle: stripeResearch,
    });

    expect(result.diagnostics).toMatchObject({
      providerMatched: true,
      officialDocumentCount: 1,
      modelAttempted: true,
      generationOutcome: "model-success",
    });
    expect(result.guide.slug).toBe("stripe");
    expect(result.guide.providerName).toBe("Stripe");
    expect(result.guide.toolkitSlug).toBe("stripe");
    expect(result.guide.composioIntegration.managedOAuthAvailable).toBe(true);
    expect(result.guide.citations.map((citation) => citation.id)).toEqual(["stripe-docs"]);
  });

  it("generates for an outside-catalog provider backed by official evidence", async () => {
    const result = await generateStructuredGuideWithDiagnostics({
      queryOrUrl: "Acme",
      catalogItem: null,
      providerIdentityVerified: true,
      researchBundle: {
        ...stripeResearch,
        providerQuery: "Acme",
        documents: [{
          ...stripeResearch.documents[0],
          citation: {
            ...stripeResearch.documents[0].citation,
            id: "acme-docs",
            sourceUrl: "https://docs.acme.com/oauth",
            sourceTitle: "Acme OAuth",
          },
        }],
      },
    });

    expect(result.diagnostics).toMatchObject({
      providerMatched: false,
      officialDocumentCount: 1,
      modelAttempted: true,
      generationOutcome: "model-success",
    });
    expect(result.guide.providerName).toBe("Acme");
    expect(result.guide.toolkitSlug).toBeUndefined();
    expect(result.guide.composioIntegration.epistemicStatus).toBe("unknown");
  });

  it("distinguishes missing evidence from invalid model output without raw errors", async () => {
    const noEvidence = await generateStructuredGuideWithDiagnostics({
      queryOrUrl: "Stripe",
      catalogItem: stripeCatalog,
      researchBundle: { ...stripeResearch, documents: [] },
    });
    expect(noEvidence.diagnostics).toMatchObject({
      modelAttempted: false,
      generationOutcome: "no-official-evidence",
    });

    mocks.generateObject.mockResolvedValueOnce({ object: { title: "Incomplete" } });
    const invalid = await generateStructuredGuideWithDiagnostics({
      queryOrUrl: "Stripe",
      catalogItem: stripeCatalog,
      researchBundle: stripeResearch,
    });
    expect(invalid.diagnostics).toMatchObject({
      modelAttempted: true,
      generationOutcome: "model-output-invalid",
    });
    expect(JSON.stringify(invalid)).not.toContain("test-key");
  });
});
