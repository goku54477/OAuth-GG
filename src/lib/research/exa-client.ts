import { createHash } from "node:crypto";

import type { RetrievedDocument } from "./index";
import { sanitizeUntrustedText } from "./html-extractor";
import { validateExternalUrl } from "./url-guard";

const EXA_SEARCH_URL = "https://api.exa.ai/search";
const EXA_TIMEOUT_MS = 10_000;

interface ExaSearchOptions {
  apiKey?: string;
  fetch?: typeof fetch;
}

interface ExaResult {
  title?: unknown;
  url?: unknown;
  text?: unknown;
  highlights?: unknown;
}

interface ExaResponse {
  results?: unknown;
}

export interface ExaEvidenceResult {
  documents: RetrievedDocument[];
  warnings: string[];
}

function resultId(sourceUrl: string): string {
  return `research-${createHash("sha256").update(sourceUrl).digest("hex").slice(0, 16)}`;
}

function providerTokens(providerQuery: string): string[] {
  return providerQuery
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

function looksOfficial(providerQuery: string, hostname: string): boolean {
  const labels = hostname.toLowerCase().split(".");
  return providerTokens(providerQuery).some((token) => labels.some((label) => label === token));
}

function asResults(payload: ExaResponse): ExaResult[] {
  return Array.isArray(payload.results) ? (payload.results as ExaResult[]) : [];
}

export async function searchProviderEvidence(
  providerQuery: string,
  capabilities: string[],
  options: ExaSearchOptions = {},
): Promise<ExaEvidenceResult> {
  const apiKey = options.apiKey ?? process.env.EXA_API_KEY;
  if (!apiKey) throw new Error("EXA_API_KEY is not configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EXA_TIMEOUT_MS);
  let response: Response;
  try {
    response = await (options.fetch ?? globalThis.fetch)(EXA_SEARCH_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        query: [
          providerQuery,
          "official OAuth app registration scopes app verification review",
          ...capabilities,
        ]
          .filter(Boolean)
          .join(" "),
        type: "auto",
        numResults: 5,
        contents: { highlights: true, text: { maxCharacters: 12000 } },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) throw new Error(`Exa search failed with HTTP ${response.status}`);
  const payload = (await response.json()) as ExaResponse;
  const documents: RetrievedDocument[] = [];
  const warnings: string[] = [];

  for (const result of asResults(payload)) {
    if (typeof result.url !== "string") {
      warnings.push("Skipped Exa result without a URL");
      continue;
    }

    const validation = validateExternalUrl(result.url);
    if (!validation.valid || !validation.normalizedUrl) {
      warnings.push(`Skipped unsafe Exa result: ${validation.reason ?? "invalid URL"}`);
      continue;
    }

    const cleanMarkdown = sanitizeUntrustedText(typeof result.text === "string" ? result.text : "");
    const highlights = (Array.isArray(result.highlights) ? result.highlights : [])
      .filter((highlight): highlight is string => typeof highlight === "string")
      .map(sanitizeUntrustedText)
      .filter(Boolean);
    const usableText = cleanMarkdown || highlights.join("\n\n");
    if (!usableText) {
      warnings.push("Skipped empty Exa result");
      continue;
    }

    const sourceUrl = validation.normalizedUrl;
    const hostname = new URL(sourceUrl).hostname;
    const official = looksOfficial(providerQuery, hostname);
    if (!official) warnings.push(`Provider ownership could not be verified for ${hostname}`);

    documents.push({
      citation: {
        id: resultId(sourceUrl),
        sourceUrl,
        sourceTitle: sanitizeUntrustedText(
          typeof result.title === "string" && result.title ? result.title : hostname,
        ),
        authorityType: official ? "official-provider-docs" : "secondary-technical",
        retrievedAt: new Date().toISOString(),
        verbatimQuote: highlights[0] ?? usableText.slice(0, 500),
        epistemicStatus: "source-supported",
      },
      cleanMarkdown: usableText,
      highlights,
      retrievalMethod: "exa-auto",
    });
  }

  return { documents, warnings };
}
