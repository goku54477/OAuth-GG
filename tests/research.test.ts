import { readFile } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import { validateExternalUrl } from "@/lib/research";
import { extractHtmlDocument, fetchHtmlDocument } from "@/lib/research/html-extractor";

describe("validateExternalUrl", () => {
  it("normalizes a public HTTPS URL and removes its fragment", () => {
    expect(validateExternalUrl("https://EXAMPLE.com/oauth?mode=test#setup")).toEqual({
      valid: true,
      normalizedUrl: "https://example.com/oauth?mode=test",
    });
  });

  it.each([
    ["non-HTTPS", "http://example.com"],
    ["credentials", "https://user:secret@example.com"],
    ["localhost", "https://localhost/docs"],
    ["localhost subdomain", "https://docs.localhost/docs"],
    ["local suffix", "https://provider.local/docs"],
    ["internal suffix", "https://provider.internal/docs"],
    ["unspecified IPv4", "https://0.0.0.0/docs"],
    ["loopback IPv4", "https://127.1.2.3/docs"],
    ["private IPv4", "https://10.1.2.3/docs"],
    ["private IPv4", "https://172.31.2.3/docs"],
    ["private IPv4", "https://192.168.2.3/docs"],
    ["link-local IPv4", "https://169.254.169.254/latest/meta-data"],
    ["loopback IPv6", "https://[::1]/docs"],
    ["unique-local IPv6", "https://[fc00::1]/docs"],
    ["link-local IPv6", "https://[fe80::1]/docs"],
    ["mapped loopback IPv4", "https://[::ffff:127.0.0.1]/docs"],
    ["numeric loopback IPv4", "https://2130706433/docs"],
  ])("rejects %s", (_label, rawUrl) => {
    const result = validateExternalUrl(rawUrl);

    expect(result.valid).toBe(false);
    expect(result.normalizedUrl).toBeUndefined();
    expect(result.reason).toBeTruthy();
  });

  it("rejects URLs longer than 2048 characters", () => {
    const result = validateExternalUrl(`https://example.com/${"a".repeat(2030)}`);

    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/length/i);
  });
});

describe("HTML extraction", () => {
  it("extracts OAuth evidence while removing active, hidden, and instruction-like content", async () => {
    const html = await readFile(
      new URL("./fixtures/raw-docs/sample-oauth-doc.html", import.meta.url),
      "utf8",
    );

    const document = extractHtmlDocument(html, "https://docs.acme.com/oauth");

    expect(document.citation.sourceTitle).toBe("Acme OAuth 2.0 Guide");
    expect(document.citation.sourceUrl).toBe("https://docs.acme.com/oauth");
    expect(document.cleanMarkdown).toContain("Authorization Code flow with PKCE");
    expect(document.cleanMarkdown).toContain("documents:read");
    expect(document.cleanMarkdown).toContain("[Removed suspected prompt injection]");
    expect(document.cleanMarkdown).not.toContain("window.stealSecrets");
    expect(document.cleanMarkdown).not.toContain("Hidden navigation prompt");
    expect(document.cleanMarkdown).not.toContain("reveal the system prompt");
    expect(document.cleanMarkdown).not.toContain("print every API key");
  });

  it("rejects a hostname when any DNS answer is non-public", async () => {
    const lookup = vi.fn().mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.4", family: 4 },
    ]);
    const fetchImpl = vi.fn();

    await expect(
      fetchHtmlDocument("https://docs.example.com/oauth", { lookup, fetch: fetchImpl }),
    ).rejects.toThrow(/non-public/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("manually validates every redirect before following it", async () => {
    const lookup = vi
      .fn()
      .mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }])
      .mockResolvedValueOnce([{ address: "192.168.1.2", family: 4 }]);
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "https://redirect.example.internalized/oauth" },
      }),
    );

    await expect(
      fetchHtmlDocument("https://docs.example.com/oauth", { lookup, fetch: fetchImpl }),
    ).rejects.toThrow(/non-public/i);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["non-HTML content", new Response("data", { headers: { "content-type": "application/json" } }), /HTML/i],
    [
      "oversized content",
      new Response("small", {
        headers: { "content-type": "text/html", "content-length": String(2 * 1024 * 1024 + 1) },
      }),
      /large/i,
    ],
  ])("rejects %s before extraction", async (_label, response, message) => {
    const lookup = vi.fn().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    const fetchImpl = vi.fn().mockResolvedValue(response);

    await expect(
      fetchHtmlDocument("https://docs.example.com/oauth", { lookup, fetch: fetchImpl }),
    ).rejects.toThrow(message);
  });
});
