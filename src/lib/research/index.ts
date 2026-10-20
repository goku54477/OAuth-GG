import {
  type ComposioToolkitSummary,
  LiveResearchRequestSchema,
  type EvidenceCitation,
  type LiveResearchRequest,
} from "@/types/contracts";

import { classifyProviderAuthority, searchProviderEvidence } from "./exa-client";
import { fetchHtmlDocument } from "./html-extractor";
import { validateExternalUrl } from "./url-guard";

export interface RetrievedDocument {
  citation: EvidenceCitation;
  cleanMarkdown: string;
  highlights: string[];
  retrievalMethod: "exa-auto" | "direct-http-readability" | "fixture-fallback";
}

export interface ResearchBundle {
  providerQuery: string;
  targetUrl?: string;
  documents: RetrievedDocument[];
  warnings: string[];
  degradedMode: boolean;
}

interface ResearchOptions {
  trustedProviderUrls?: string[];
}

export { validateExternalUrl } from "./url-guard";
export { classifyProviderAuthority } from "./exa-client";

export function hasVerifiedProviderIdentity(
  catalogItem: ComposioToolkitSummary | null,
  documents: RetrievedDocument[],
  providerQuery?: string,
): boolean {
  if (catalogItem) return true;
  const officialDocuments = documents.filter(
    (document) => document.citation.authorityType === "official-provider-docs",
  );
  if (!providerQuery) return officialDocuments.length > 0;

  const query = providerQuery.trim().toLowerCase();
  try {
    const queryHost = new URL(query).hostname.replace(/^www\./, "");
    return officialDocuments.some((document) => {
      const sourceHost = new URL(document.citation.sourceUrl).hostname.replace(/^www\./, "");
      return sourceHost === queryHost
        || sourceHost.endsWith(`.${queryHost}`)
        || queryHost.endsWith(`.${sourceHost}`);
    });
  } catch {
    const ignored = new Set(["api", "app", "developer", "developers", "docs", "documentation", "oauth", "the"]);
    const tokens = query.split(/[^a-z0-9]+/).filter((token) => token.length >= 3 && !ignored.has(token));
    const providerLabel = tokens.join("");
    return tokens.length > 0 && officialDocuments.some((document) => {
      const labels = new URL(document.citation.sourceUrl).hostname.replace(/^www\./, "").split(".");
      const registrableLabel = (labels.at(-2) ?? labels[0]).replace(/[^a-z0-9]/g, "");
      return registrableLabel === providerLabel || registrableLabel === `join${providerLabel}`;
    });
  }
}

function warningMessage(prefix: string): string {
  return prefix;
}

export async function retrieveProviderEvidence(
  req: LiveResearchRequest,
  options: ResearchOptions = {},
): Promise<ResearchBundle> {
  const parsed = LiveResearchRequestSchema.parse(req);
  const providerQuery = parsed.queryOrUrl.trim();
  const directDocumentationUrl = parsed.officialDocumentationUrl ?? providerQuery;
  const validation = validateExternalUrl(directDocumentationUrl);
  const looksLikeUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(providerQuery);
  const hasDirectDocumentationUrl = Boolean(parsed.officialDocumentationUrl) || looksLikeUrl;

  if (hasDirectDocumentationUrl && (!validation.valid || !validation.normalizedUrl)) {
    return {
      providerQuery,
      documents: [],
      warnings: [validation.reason ?? "URL is not allowed"],
      degradedMode: true,
    };
  }

  if (hasDirectDocumentationUrl && validation.valid && validation.normalizedUrl) {
    try {
      const document = await fetchHtmlDocument(validation.normalizedUrl);
      document.citation.authorityType = classifyProviderAuthority(
        providerQuery,
        document.citation.sourceUrl,
        [
          ...(options.trustedProviderUrls ?? []),
          ...(parsed.officialDocumentationUrl ? [parsed.officialDocumentationUrl] : []),
        ],
      );
      return {
        providerQuery,
        targetUrl: validation.normalizedUrl,
        documents: [document],
        warnings: [],
        degradedMode: false,
      };
    } catch {
      return {
        providerQuery,
        targetUrl: validation.normalizedUrl,
        documents: [],
        warnings: [warningMessage("Direct documentation fetch failed")],
        degradedMode: true,
      };
    }
  }

  if (!process.env.EXA_API_KEY) {
    return {
      providerQuery,
      documents: [],
      warnings: ["EXA_API_KEY is not configured; live provider discovery is unavailable"],
      degradedMode: true,
    };
  }

  try {
    const result = await searchProviderEvidence(providerQuery, parsed.capabilities, {
      trustedProviderUrls: options.trustedProviderUrls,
    });
    return {
      providerQuery,
      documents: result.documents,
      warnings: result.warnings,
      degradedMode: result.documents.length === 0,
    };
  } catch {
    return {
      providerQuery,
      documents: [],
      warnings: [warningMessage("Exa provider discovery failed")],
      degradedMode: true,
    };
  }
}
