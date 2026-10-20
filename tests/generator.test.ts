import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateObject: vi.fn(),
  openai: vi.fn(() => "test-model"),
}));

vi.mock("ai", () => ({ generateObject: mocks.generateObject }));
vi.mock("@ai-sdk/openai", () => ({ openai: mocks.openai }));

import { githubPublicIssuesGuide } from "@/data/golden-guides/github-public-issues";
import { generateStructuredGuide } from "@/lib/guides/generator";

describe("live guide generation", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    mocks.generateObject.mockResolvedValue({ object: githubPublicIssuesGuide });
  });

  it("reserves enough output tokens for the ProviderGuide schema", async () => {
    await generateStructuredGuide({
      queryOrUrl: "Stripe",
      catalogItem: {
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
      },
      researchBundle: {
        providerQuery: "Stripe",
        warnings: [],
        degradedMode: false,
        documents: [{
          citation: {
            id: "stripe-docs",
            sourceUrl: "https://docs.stripe.com/oauth",
            sourceTitle: "Stripe docs",
            authorityType: "official-provider-docs",
            retrievedAt: "2026-10-20T00:00:00.000Z",
            verbatimQuote: "OAuth documentation.",
            epistemicStatus: "source-supported",
          },
          cleanMarkdown: "OAuth documentation.",
          highlights: ["OAuth documentation."],
          retrievalMethod: "exa-auto",
        }],
      },
    });

    expect(mocks.generateObject).toHaveBeenCalledWith(expect.objectContaining({ maxTokens: 8192 }));
  });
});
