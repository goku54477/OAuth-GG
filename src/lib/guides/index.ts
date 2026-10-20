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
import {
  normalizeReferenceGuideForEvidence,
  verifyAndAuditGuide,
} from "@/lib/guides/evidence-validator";
import {
  generateStructuredGuideWithDiagnostics,
  type GuideGenerationDiagnostics,
} from "@/lib/guides/generator";

export { githubPublicIssuesGuide } from "@/data/golden-guides/github-public-issues";
export { slackChannelBotGuide } from "@/data/golden-guides/slack-channel-bot";
export { gmailSendVsModifyGuide } from "@/data/golden-guides/gmail-send-vs-modify";
export {
  verifyAndAuditGuide,
  auditGuideWithReport,
  normalizeGuideForEvidence,
  normalizeReferenceGuideForEvidence,
} from "@/lib/guides/evidence-validator";
export { generateStructuredGuide, buildPartialFallbackGuide } from "@/lib/guides/generator";

const goldenGuidesMap = new Map<string, ProviderGuide>([
  [githubPublicIssuesGuide.slug, normalizeReferenceGuideForEvidence(githubPublicIssuesGuide)],
  [slackChannelBotGuide.slug, normalizeReferenceGuideForEvidence(slackChannelBotGuide)],
  [gmailSendVsModifyGuide.slug, normalizeReferenceGuideForEvidence(gmailSendVsModifyGuide)],
]);

// Also alias toolkit slugs if needed
const goldenGuidesByToolkit = new Map<string, ProviderGuide>([
  ["github", normalizeReferenceGuideForEvidence(githubPublicIssuesGuide)],
  ["slack", normalizeReferenceGuideForEvidence(slackChannelBotGuide)],
  ["gmail", normalizeReferenceGuideForEvidence(gmailSendVsModifyGuide)],
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
export async function generateOrResolveGuideWithDiagnostics(input: {
  queryOrUrl: string;
  capabilities?: string[];
  catalogItem?: ComposioToolkitSummary | null;
  catalogEpistemicStatus?: "observed" | "source-supported";
  providerIdentityVerified?: boolean;
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
}): Promise<{ guide: ProviderGuide; diagnostics: GuideGenerationDiagnostics }> {
  // 1. Check if input matches any Golden Guide
  const matchedSlug = matchGoldenGuideSlug(
    input.queryOrUrl,
    input.catalogItem?.slug
  );

  if (matchedSlug) {
    const golden = getGoldenGuideBySlug(matchedSlug);
    if (golden) {
      return {
        guide: ProviderGuideSchema.parse(golden),
        diagnostics: {
          providerMatched: Boolean(input.catalogItem),
          researchDocumentCount: input.researchBundle?.documents.length ?? 0,
          officialDocumentCount: input.researchBundle?.documents.filter(
            (document) => document.citation.authorityType === "official-provider-docs",
          ).length ?? 0,
          researchDegraded: input.researchBundle?.degradedMode ?? false,
          researchWarningCount: input.researchBundle?.warnings.length ?? 0,
          modelAttempted: false,
          generationOutcome: "golden-guide",
        },
      };
    }
  }

  const generated = await generateStructuredGuideWithDiagnostics(input);

  // 3. Extract allowed source URLs from research bundle documents
  const allowedUrls = (input.researchBundle?.documents || [])
    .filter((document) => document.citation.authorityType === "official-provider-docs")
    .map((document) => document.citation.sourceUrl);

  // 4. Deterministically audit citations and claims
  return {
    guide: verifyAndAuditGuide(generated.guide, allowedUrls),
    diagnostics: generated.diagnostics,
  };
}

export async function generateOrResolveGuide(
  input: Parameters<typeof generateOrResolveGuideWithDiagnostics>[0],
): Promise<ProviderGuide> {
  return (await generateOrResolveGuideWithDiagnostics(input)).guide;
}
