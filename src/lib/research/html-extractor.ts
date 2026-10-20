import { createHash } from "node:crypto";
import { lookup as dnsLookup } from "node:dns/promises";

import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import TurndownService from "turndown";

import type { RetrievedDocument } from "./index";
import { isUnsafeIpAddress, validateExternalUrl } from "./url-guard";

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const REDACTION = "[Removed suspected prompt injection]";
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

type LookupResult = { address: string; family: number };

interface FetchDependencies {
  lookup?: (hostname: string, options: { all: true }) => Promise<LookupResult[]>;
  fetch?: typeof fetch;
}

const INJECTION_PATTERNS = [
  /\b(?:ignore|disregard|override)\b.{0,80}\b(?:previous|prior|system|developer|instructions?)\b/i,
  /\b(?:system|developer)\s+(?:message|prompt|instructions?)\b/i,
  /\b(?:reveal|expose|print|return)\b.{0,80}\b(?:api[- ]?keys?|credentials?|secrets?|system prompt)\b/i,
  /\b(?:run|execute|invoke|call)\b.{0,80}\b(?:shell|terminal|commands?|tools?)\b/i,
  /\byou are (?:chatgpt|an? (?:ai|assistant|language model))\b/i,
];

export function sanitizeUntrustedText(text: string): string {
  const withoutControls = text.replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g, "");
  const lines = withoutControls.split(/\r?\n/).map((line) =>
    INJECTION_PATTERNS.some((pattern) => pattern.test(line)) ? REDACTION : line,
  );

  return lines
    .filter((line, index) => line !== REDACTION || lines[index - 1] !== REDACTION)
    .join("\n")
    .trim();
}

function removeUnsafeDom(document: Document): void {
  document
    .querySelectorAll(
      'script, style, noscript, iframe, object, embed, form, input, button, textarea, select, template, [hidden], [aria-hidden="true"]',
    )
    .forEach((element) => element.remove());

  document.querySelectorAll<HTMLElement>("[style]").forEach((element) => {
    const style = element.getAttribute("style")?.replace(/\s/g, "").toLowerCase() ?? "";
    if (style.includes("display:none") || style.includes("visibility:hidden")) element.remove();
  });
}

function citationId(sourceUrl: string): string {
  return `research-${createHash("sha256").update(sourceUrl).digest("hex").slice(0, 16)}`;
}

export function extractHtmlDocument(
  html: string,
  sourceUrl: string,
  retrievalMethod: RetrievedDocument["retrievalMethod"] = "direct-http-readability",
): RetrievedDocument {
  const { document } = parseHTML(html);
  removeUnsafeDom(document as unknown as Document);

  const article = new Readability(document as unknown as Document).parse();
  if (!article?.content) throw new Error("Page did not contain readable HTML content");

  const cleanMarkdown = sanitizeUntrustedText(new TurndownService().turndown(article.content));
  if (!cleanMarkdown) throw new Error("Page was empty after sanitization");

  const title = sanitizeUntrustedText(article.title || document.title || new URL(sourceUrl).hostname);
  const highlights = cleanMarkdown
    .split(/\n{2,}/)
    .map((part) => part.replace(/^#+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part.slice(0, 500));

  return {
    citation: {
      id: citationId(sourceUrl),
      sourceUrl,
      sourceTitle: title,
      authorityType: "secondary-technical",
      retrievedAt: new Date().toISOString(),
      verbatimQuote: highlights[0],
      epistemicStatus: "source-supported",
    },
    cleanMarkdown,
    highlights,
    retrievalMethod,
  };
}

async function assertPublicDns(
  hostname: string,
  lookup: NonNullable<FetchDependencies["lookup"]>,
): Promise<void> {
  const addresses = await lookup(hostname, { all: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isUnsafeIpAddress(address))) {
    throw new Error("Hostname resolved to a non-public IP address");
  }
}

async function readBoundedBody(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error("HTML response is too large");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("HTML response is too large");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function fetchHtmlDocument(
  rawUrl: string,
  dependencies: FetchDependencies = {},
): Promise<RetrievedDocument> {
  const lookup = dependencies.lookup ?? dnsLookup;
  const fetchImpl = dependencies.fetch ?? globalThis.fetch;
  let currentUrl = rawUrl;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const validation = validateExternalUrl(currentUrl);
    if (!validation.valid || !validation.normalizedUrl) {
      throw new Error(validation.reason ?? "URL is not allowed");
    }

    const url = new URL(validation.normalizedUrl);
    await assertPublicDns(url.hostname.replace(/^\[|\]$/g, ""), lookup);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetchImpl(url, { redirect: "manual", signal: controller.signal });
      if (REDIRECT_STATUSES.has(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new Error("Redirect response omitted Location header");
        if (redirects === MAX_REDIRECTS) throw new Error("Too many redirects");
        currentUrl = new URL(location, url).toString();
        continue;
      }
      if (!response.ok) throw new Error(`Documentation fetch failed with HTTP ${response.status}`);

      const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
      if (contentType !== "text/html" && contentType !== "application/xhtml+xml") {
        throw new Error("Response is not HTML content");
      }

      const html = await readBoundedBody(response);
      return extractHtmlDocument(html, url.toString());
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Too many redirects");
}
