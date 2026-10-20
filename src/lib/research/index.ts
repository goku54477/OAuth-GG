import type { EvidenceCitation } from "@/types/contracts";

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
