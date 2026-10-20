import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getToolkitByQuery: vi.fn(),
  fetchLiveToolkitMetadata: vi.fn(),
  retrieveProviderEvidence: vi.fn(),
  generateOrResolveGuideWithDiagnostics: vi.fn(),
  saveGuide: vi.fn(),
}));

vi.mock("@/lib/catalog", () => ({
  getToolkitByQuery: mocks.getToolkitByQuery,
  fetchLiveToolkitMetadata: mocks.fetchLiveToolkitMetadata,
}));
vi.mock("@/lib/research", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/research")>()),
  retrieveProviderEvidence: mocks.retrieveProviderEvidence,
}));
vi.mock("@/lib/guides", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/guides")>()),
  generateOrResolveGuideWithDiagnostics: mocks.generateOrResolveGuideWithDiagnostics,
}));
vi.mock("@/lib/db", () => ({ saveGuide: mocks.saveGuide }));

import { gmailSendVsModifyGuide } from "@/data/golden-guides/gmail-send-vs-modify";
import { getGoldenGuideBySlug } from "@/lib/guides";
import { POST } from "@/app/api/guides/investigate/route";

const officialDocument = {
  citation: {
    id: "acme-docs",
    sourceUrl: "https://docs.acme.com/oauth",
    sourceTitle: "Acme OAuth",
    authorityType: "official-provider-docs" as const,
    retrievedAt: "2026-10-20T00:00:00.000Z",
    epistemicStatus: "source-supported" as const,
  },
  cleanMarkdown: "OAuth setup",
  highlights: [],
  retrievalMethod: "exa-auto" as const,
};

describe("POST /api/guides/investigate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getToolkitByQuery.mockResolvedValue(null);
    mocks.fetchLiveToolkitMetadata.mockResolvedValue(null);
    mocks.retrieveProviderEvidence.mockResolvedValue({
      providerQuery: "Acme",
      documents: [officialDocument],
      warnings: [],
      degradedMode: false,
    });
    mocks.generateOrResolveGuideWithDiagnostics.mockResolvedValue({
      guide: gmailSendVsModifyGuide,
      diagnostics: {
        providerMatched: false,
        researchDocumentCount: 1,
        officialDocumentCount: 1,
        researchDegraded: false,
        researchWarningCount: 0,
        modelAttempted: true,
        generationOutcome: "model-success",
      },
    });
    mocks.saveGuide.mockResolvedValue(gmailSendVsModifyGuide);
  });

  it("allows an outside-catalog provider backed by official evidence", async () => {
    const response = await POST(new Request("http://localhost/api/guides/investigate", {
      method: "POST",
      body: JSON.stringify({ queryOrUrl: "Acme" }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.generateOrResolveGuideWithDiagnostics).toHaveBeenCalledWith(
      expect.objectContaining({ catalogItem: null, providerIdentityVerified: true }),
    );
    expect(mocks.saveGuide).toHaveBeenCalledTimes(1);
  });

  it("keeps provider identity separate from a direct official documentation URL", async () => {
    const response = await POST(new Request("http://localhost/api/guides/investigate", {
      method: "POST",
      body: JSON.stringify({
        queryOrUrl: "Acme",
        officialDocumentationUrl: "https://docs.acme.com/oauth",
        capabilities: ["read"],
      }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.retrieveProviderEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        queryOrUrl: "Acme",
        officialDocumentationUrl: "https://docs.acme.com/oauth",
      }),
      expect.objectContaining({ trustedProviderUrls: ["https://docs.acme.com/oauth"] }),
    );
    expect(mocks.saveGuide).toHaveBeenCalledWith(expect.objectContaining({
      investigationContext: {
        query: "Acme",
        requestedCapabilities: ["read"],
        sourceMode: "official-documentation",
        officialDocumentationUrl: "https://docs.acme.com/oauth",
      },
    }));
  });

  it("rejects an outside-catalog documentation host that does not match the provider identity", async () => {
    mocks.retrieveProviderEvidence.mockResolvedValueOnce({
      providerQuery: "Acme",
      documents: [{
        ...officialDocument,
        citation: { ...officialDocument.citation, sourceUrl: "https://docs.unrelated-vendor.com/oauth" },
      }],
      warnings: [],
      degradedMode: false,
    });

    const response = await POST(new Request("http://localhost/api/guides/investigate", {
      method: "POST",
      body: JSON.stringify({
        queryOrUrl: "Acme",
        officialDocumentationUrl: "https://docs.unrelated-vendor.com/oauth",
      }),
    }));

    expect(response.status).toBe(422);
    expect(mocks.saveGuide).not.toHaveBeenCalled();
  });

  it("rejects an identity with neither catalog metadata nor official evidence", async () => {
    mocks.retrieveProviderEvidence.mockResolvedValueOnce({
      providerQuery: "AuthBenchTestApp-739",
      documents: [],
      warnings: [],
      degradedMode: true,
    });

    const response = await POST(new Request("http://localhost/api/guides/investigate", {
      method: "POST",
      body: JSON.stringify({ queryOrUrl: "AuthBenchTestApp-739" }),
    }));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: "The provider could not be verified from catalog metadata or official documentation.",
    });
    expect(mocks.generateOrResolveGuideWithDiagnostics).not.toHaveBeenCalled();
    expect(mocks.saveGuide).not.toHaveBeenCalled();
  });

  it("returns the exact canonical guide returned by persistence", async () => {
    const canonical = { ...gmailSendVsModifyGuide, subtitle: "Canonical persisted guide" };
    mocks.saveGuide.mockResolvedValueOnce(canonical);

    const response = await POST(new Request("http://localhost/api/guides/investigate", {
      method: "POST",
      body: JSON.stringify({ queryOrUrl: "Acme" }),
    }));
    const payload = await response.json();

    expect(payload.guide).toEqual(canonical);
    expect(payload.redirectUrl).toBe(`/guides/${canonical.slug}`);
    expect(payload.generationDiagnostics).toMatchObject({ generationOutcome: "model-success" });
  });

  it("does not claim success when canonical persistence fails", async () => {
    mocks.saveGuide.mockRejectedValueOnce(new Error("database included secret detail"));

    const response = await POST(new Request("http://localhost/api/guides/investigate", {
      method: "POST",
      body: JSON.stringify({ queryOrUrl: "Acme" }),
    }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to investigate provider" });
  });

  it("returns canonical golden references without overwriting them in persistence", async () => {
    mocks.generateOrResolveGuideWithDiagnostics.mockResolvedValueOnce({
      guide: gmailSendVsModifyGuide,
      diagnostics: {
        providerMatched: true,
        researchDocumentCount: 0,
        officialDocumentCount: 0,
        researchDegraded: false,
        researchWarningCount: 0,
        modelAttempted: false,
        generationOutcome: "golden-guide",
      },
    });

    const response = await POST(new Request("http://localhost/api/guides/investigate", {
      method: "POST",
      body: JSON.stringify({ queryOrUrl: "gmail" }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.saveGuide).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ guide: getGoldenGuideBySlug("gmail") });
  });
});
