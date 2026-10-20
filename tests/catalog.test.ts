import { afterEach, describe, expect, it, vi } from "vitest";

import { ComposioToolkitSummarySchema } from "@/types/contracts";
import {
  fetchLiveToolkitMetadata,
  getCatalogStats,
  getCatalogToolkits,
  getToolkitBySlug,
} from "@/lib/catalog";
import { fetchRecommendedScopes } from "@/lib/catalog/composio-client";

const originalApiKey = process.env.COMPOSIO_API_KEY;

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.COMPOSIO_API_KEY;
  else process.env.COMPOSIO_API_KEY = originalApiKey;
  vi.unstubAllGlobals();
});

describe("catalog snapshot", () => {
  it("returns at least 100 unique schema-valid toolkits", async () => {
    const toolkits = await getCatalogToolkits();

    expect(toolkits.length).toBeGreaterThanOrEqual(100);
    expect(new Set(toolkits.map(({ slug }) => slug)).size).toBe(toolkits.length);
    for (const toolkit of toolkits) {
      expect(() => ComposioToolkitSummarySchema.parse(toolkit)).not.toThrow();
    }
  });

  it.each([
    ["github", "github-public-issues"],
    ["slack", "slack-channel-bot"],
    ["gmail", "gmail-send-vs-modify"],
  ])("finds %s with its golden guide", async (slug, goldenGuideSlug) => {
    await expect(getToolkitBySlug(slug)).resolves.toMatchObject({
      slug,
      goldenGuideSlug,
    });
  });

  it("searches and filters by category and managed auth", async () => {
    const results = await getCatalogToolkits({
      search: "git",
      category: "developer tools",
      managedOnly: true,
    });

    expect(results.map(({ slug }) => slug)).toEqual(
      expect.arrayContaining(["github", "gitlab"]),
    );
    expect(results.every(({ hasManagedOAuth }) => hasManagedOAuth)).toBe(true);
  });

  it("reports internally consistent stats", async () => {
    const toolkits = await getCatalogToolkits();
    const stats = await getCatalogStats();

    expect(stats.totalToolkits).toBe(toolkits.length);
    expect(stats.managedOAuthCount + stats.customOnlyCount).toBe(toolkits.length);
    expect(stats.categories).toEqual([...stats.categories].sort());
  });
});

describe("live metadata fallback", () => {
  it("returns source-supported snapshot metadata when API key is missing", async () => {
    delete process.env.COMPOSIO_API_KEY;

    await expect(fetchLiveToolkitMetadata("github")).resolves.toMatchObject({
      summary: { slug: "github" },
      rawAuthConfigDetails: null,
      epistemicStatus: "source-supported",
    });
  });

  it("rejects unsafe slugs before a network request", async () => {
    process.env.COMPOSIO_API_KEY = "test-key";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(fetchLiveToolkitMetadata("../github")).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("recommended scopes beta endpoint", () => {
  it.each([404, 422, 501])("returns null for HTTP %s", async (status) => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("{}", { status }));
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      fetchRecommendedScopes("github", "test-key", []),
    ).resolves.toBeNull();
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://backend.composio.dev/api/v3.1/toolkits/github/scopes/recommended",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-api-key": "test-key",
        }),
        body: JSON.stringify({ tools: [] }),
      }),
    );
  });
});
