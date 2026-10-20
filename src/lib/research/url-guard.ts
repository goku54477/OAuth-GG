import { isIP } from "node:net";

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  reason?: string;
}

const MAX_URL_LENGTH = 2048;

function isUnsafeIpv4(address: string): boolean {
  const [a, b, c] = address.split(".").map(Number);

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function ipv6Words(address: string): number[] | undefined {
  const withoutZone = address.split("%")[0].toLowerCase();
  const ipv4Match = withoutZone.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  let normalized = withoutZone;

  if (ipv4Match) {
    const bytes = ipv4Match[2].split(".").map(Number);
    if (bytes.some((byte) => byte < 0 || byte > 255)) return undefined;
    normalized = `${ipv4Match[1]}${((bytes[0] << 8) | bytes[1]).toString(16)}:${(
      (bytes[2] << 8) |
      bytes[3]
    ).toString(16)}`;
  }

  const [leftText, rightText, ...extra] = normalized.split("::");
  if (extra.length > 0) return undefined;
  const left = leftText ? leftText.split(":") : [];
  const right = rightText ? rightText.split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((normalized.includes("::") && missing < 1) || (!normalized.includes("::") && missing !== 0)) {
    return undefined;
  }

  const words = [...left, ...Array(missing).fill("0"), ...right].map((word) =>
    Number.parseInt(word || "0", 16),
  );
  if (words.length !== 8 || words.some((word) => !Number.isInteger(word) || word < 0 || word > 0xffff)) {
    return undefined;
  }
  return words;
}

function isUnsafeIpv6(address: string): boolean {
  const words = ipv6Words(address);
  if (!words) return true;

  const allZero = words.every((word) => word === 0);
  const loopback = words.slice(0, 7).every((word) => word === 0) && words[7] === 1;
  const uniqueLocal = (words[0] & 0xfe00) === 0xfc00;
  const linkLocal = (words[0] & 0xffc0) === 0xfe80;
  const siteLocal = (words[0] & 0xffc0) === 0xfec0;
  const multicast = (words[0] & 0xff00) === 0xff00;
  const documentation = words[0] === 0x2001 && words[1] === 0x0db8;
  const mappedIpv4 = words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff;

  if (mappedIpv4) {
    const ipv4 = `${words[6] >> 8}.${words[6] & 255}.${words[7] >> 8}.${words[7] & 255}`;
    return isUnsafeIpv4(ipv4);
  }

  return allZero || loopback || uniqueLocal || linkLocal || siteLocal || multicast || documentation;
}

export function isUnsafeIpAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isUnsafeIpv4(address);
  if (version === 6) return isUnsafeIpv6(address);
  return true;
}

export function validateExternalUrl(rawUrl: string): UrlValidationResult {
  if (rawUrl.length > MAX_URL_LENGTH) return { valid: false, reason: "URL exceeds maximum length" };

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { valid: false, reason: "URL is invalid" };
  }

  if (url.protocol !== "https:") return { valid: false, reason: "Only HTTPS URLs are allowed" };
  if (url.username || url.password) return { valid: false, reason: "URL credentials are not allowed" };

  const hostname = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return { valid: false, reason: "Local hostnames are not allowed" };
  }

  if (isIP(hostname) && isUnsafeIpAddress(hostname)) {
    return { valid: false, reason: "Private or special-use IP addresses are not allowed" };
  }

  url.hash = "";
  return { valid: true, normalizedUrl: url.toString() };
}
