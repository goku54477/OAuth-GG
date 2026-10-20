import { describe, expect, it } from "vitest";

import { validateExternalUrl } from "@/lib/research";

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
