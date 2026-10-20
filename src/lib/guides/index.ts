import { githubPublicIssuesGuide } from "@/data/golden-guides/github-public-issues";
import { slackChannelBotGuide } from "@/data/golden-guides/slack-channel-bot";
import { gmailSendVsModifyGuide } from "@/data/golden-guides/gmail-send-vs-modify";
import {
  type ComposioToolkitSummary,
  type EvidenceCitation,
  type ProviderGuide,
  ProviderGuideSchema,
} from "@/types/contracts";
import { matchGoldenGuideSlug } from "@/lib/router/decision-engine";
import { verifyAndAuditGuide } from "@/lib/guides/evidence-validator";
import { generateStructuredGuide } from "@/lib/guides/generator";

export { githubPublicIssuesGuide } from "@/data/golden-guides/github-public-issues";
export { slackChannelBotGuide } from "@/data/golden-guides/slack-channel-bot";
export { gmailSendVsModifyGuide } from "@/data/golden-guides/gmail-send-vs-modify";
export { verifyAndAuditGuide, auditGuideWithReport } from "@/lib/guides/evidence-validator";
export { generateStructuredGuide, buildPartialFallbackGuide } from "@/lib/guides/generator";

const goldenGuidesMap = new Map<string, ProviderGuide>([
  [githubPublicIssuesGuide.slug, githubPublicIssuesGuide],
  [slackChannelBotGuide.slug, slackChannelBotGuide],
  [gmailSendVsModifyGuide.slug, gmailSendVsModifyGuide],
]);

// Also alias toolkit slugs if needed
const goldenGuidesByToolkit = new Map<string, ProviderGuide>([
  ["github", githubPublicIssuesGuide],
  ["slack", slackChannelBotGuide],
  ["gmail", gmailSendVsModifyGuide],
]);

/**
 * Returns a golden reference guide by its slug, or null if not found.
 */
export function getGoldenGuideBySlug(slug: string): ProviderGuide | null {
  if (!slug) return null;
  const normalized = slug.trim().toLowerCase();
  const directMatch = goldenGuidesMap.get(normalized);
  if (directMatch) return directMatch;
  return goldenGuidesByToolkit.get(normalized) ?? null;
}

/**
 * Lists all available pre-verified Golden Reference Guides.
 */
export function listGoldenGuides(): ProviderGuide[] {
  return Array.from(goldenGuidesMap.values());
}

/**
 * Main guide resolution entry point.
 * Resolves to a pre-verified Golden Guide if matching, or generates/audits a structured guide from research metadata.
 */
export async function generateOrResolveGuide(input: {
  queryOrUrl: string;
  capabilities?: string[];
  catalogItem?: ComposioToolkitSummary | null;
  researchBundle?: {
    providerQuery: string;
    targetUrl?: string;
    documents: Array<{
      citation: EvidenceCitation;
      cleanMarkdown: string;
      highlights: string[];
      retrievalMethod: string;
    }>;
    warnings: string[];
    degradedMode: boolean;
  };
}): Promise<ProviderGuide> {
  // 1. Check if input matches any Golden Guide
  const matchedSlug = matchGoldenGuideSlug(
    input.queryOrUrl,
    input.catalogItem?.slug
  );

  if (matchedSlug) {
    const golden = getGoldenGuideBySlug(matchedSlug);
    if (golden) {
      return ProviderGuideSchema.parse(golden);
    }
  }

  // 2. Generate live or fallback guide
  const generatedGuide = await generateStructuredGuide(input);

  // 3. Extract allowed source URLs from research bundle documents
  const allowedUrls = (input.researchBundle?.documents || [])
    .filter((document) => document.citation.authorityType === "official-provider-docs")
    .map((document) => document.citation.sourceUrl);

  // 4. Deterministically audit citations and claims
  return verifyAndAuditGuide(generatedGuide, allowedUrls);
}
