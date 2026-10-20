import {
  LiveResearchRequestSchema,
  type EvidenceCitation,
  type LiveResearchRequest,
} from "@/types/contracts";

import { searchProviderEvidence } from "./exa-client";
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

export { validateExternalUrl } from "./url-guard";

function warningMessage(prefix: string): string {
  return prefix;
}

export async function retrieveProviderEvidence(req: LiveResearchRequest): Promise<ResearchBundle> {
  const parsed = LiveResearchRequestSchema.parse(req);
  const providerQuery = parsed.queryOrUrl.trim();
  const validation = validateExternalUrl(providerQuery);
  const looksLikeUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(providerQuery);

  if (looksLikeUrl && (!validation.valid || !validation.normalizedUrl)) {
    return {
      providerQuery,
      documents: [],
      warnings: [validation.reason ?? "URL is not allowed"],
      degradedMode: true,
    };
  }

  if (validation.valid && validation.normalizedUrl) {
    try {
      const document = await fetchHtmlDocument(validation.normalizedUrl);
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
    const result = await searchProviderEvidence(providerQuery, parsed.capabilities);
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
