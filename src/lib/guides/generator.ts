import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import {
  type ComposioToolkitSummary,
  type EvidenceCitation,
  type ProviderGuide,
  ProviderGuideSchema,
} from "@/types/contracts";

export interface GenerateGuideInput {
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
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function deriveProviderName(queryOrUrl: string, catalogItem?: ComposioToolkitSummary | null): string {
  if (catalogItem?.name) return catalogItem.name;
  const clean = queryOrUrl.replace(/https?:\/\//g, "").split("/")[0].split(".")[0];
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Builds a schema-valid partial fallback ProviderGuide when OPENAI_API_KEY is missing
 * or when research documents lack official provider documentation.
 */
export function buildPartialFallbackGuide(input: GenerateGuideInput): ProviderGuide {
  const { queryOrUrl, catalogItem, researchBundle } = input;
  const providerName = deriveProviderName(queryOrUrl, catalogItem);
  const slug = catalogItem?.slug || slugify(queryOrUrl) || "unknown-provider";
  const now = new Date().toISOString();

  const citations: EvidenceCitation[] = (catalogItem ? researchBundle?.documents || [] : [])
    .filter((document) => document.citation.authorityType === "official-provider-docs")
    .map((document) => document.citation);

  const fallbackGuide: ProviderGuide = {
    slug,
    providerName,
    toolkitSlug: catalogItem?.slug,
    title: `${providerName} Integration & OAuth Guide (Partial Reference)`,
    subtitle: "Provider-specific OAuth configuration could not be verified from trusted evidence.",
    generatedAt: now,
    generationMode: "partial-fallback",
    completenessStatus: "partial",
    composioIntegration: {
      managedOAuthAvailable: catalogItem?.hasManagedOAuth ?? false,
      managedVsCustomVerdict: catalogItem?.hasManagedOAuth
        ? "Composio Managed OAuth is available for rapid prototyping, but custom auth_configs should be evaluated for enterprise production."
        : "Composio managed OAuth availability is unknown because this provider is not matched to catalog metadata.",
      customAuthConfigSnippet: "",
      composioRedirectUriHint: "",
      epistemicStatus: catalogItem ? "observed" : "unknown",
      citationIds: citations.map((c) => c.id),
    },
    variants: [
      {
        variantId: `${slug}-baseline-oauth`,
        title: "Partial evidence record",
        summary: "No provider-specific OAuth application type, scope names, or configuration values are presented without trusted supporting evidence.",
        recommendedAppType: "Unknown",
        scopes: [],
        approvalGateSummary:
          "Provider approval requirements and external review gates are currently unknown and unverified.",
        estimatedReviewTimeline: "Unknown",
        securityAuditRequired: "Unknown",
        pros: [],
        cons: [],
      },
    ],
    registrationSteps: [],
    testingAndSandboxRules: [
      {
        claim: "No provider-specific testing or sandbox rules were verified.",
        epistemicStatus: "unknown",
        citationIds: [],
        notes: "Consult official provider documentation before implementation.",
      },
    ],
    distributionAndReviewChecklist: [
      {
        claim: "No provider-specific production review requirements were verified.",
        epistemicStatus: "unknown",
        citationIds: [],
      },
    ],
    practicalObservations: [
      {
        claim: "This partial record intentionally omits unverified OAuth configuration and permission claims.",
        epistemicStatus: "unknown",
        citationIds: [],
      },
    ],
    explicitUnknowns: [
      "Provider identity and official OAuth documentation",
      "OAuth application type, callback URL, and client-credential requirements",
      "Permission scopes and sensitivity classifications",
      "Testing, review, and security-audit requirements",
    ],
    citations,
  };

  return ProviderGuideSchema.parse(fallbackGuide);
}

/**
 * Generates a structured ProviderGuide using Vercel AI SDK when OPENAI_API_KEY is present
 * and verified official documentation exists in the research bundle; otherwise falls back to an evidence-limited guide.
 */
export async function generateStructuredGuide(input: GenerateGuideInput): Promise<ProviderGuide> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const docs = (input.researchBundle?.documents || []).filter(
    (document) => document.citation.authorityType === "official-provider-docs",
  );
  const hasOfficialDocs = docs.length > 0;

  // Warnings may coexist with usable official evidence; only missing key/evidence blocks synthesis.
  if (!apiKey || !input.catalogItem || !hasOfficialDocs) {
    return buildPartialFallbackGuide(input);
  }

  try {
    const prompt = `You are a Principal OAuth Security Architect & AI Engineer.
Analyze the following provider metadata and research documents to generate a comprehensive, least-privilege ProviderGuide conforming to the provided schema.

Target Provider / Query: ${input.queryOrUrl}
Toolkit Slug: ${input.catalogItem?.slug || "none"}
Capabilities Requested: ${(input.capabilities || ["read", "write"]).join(", ")}
Composio Metadata: ${JSON.stringify(input.catalogItem || null)}

Research Documents:
${docs
  .map(
    (d, i) => `--- DOCUMENT ${i + 1} (${d.citation.sourceUrl}) [${d.citation.authorityType}] ---
Title: ${d.citation.sourceTitle}
Content:
${d.cleanMarkdown.slice(0, 3000)}
Highlights:
${d.highlights.join("\n")}
`
  )
  .join("\n\n")}

CRITICAL SECURITY REQUIREMENTS:
1. Always contrast at least 2 variants: a recommended least-privilege variant (Variant A) and a broader/comparison variant (Variant B).
2. For every scope, correctly classify as non-sensitive, sensitive, restricted, granular-bot, coarse-repo, or unknown.
3. Identify external review gates and whether third-party security audits (e.g., CASA Tier AL1/AL2) are triggered.
4. Provide concrete step-by-step console instructions with criticalConfigValues.
5. Provide explicit citations referencing the provided document URLs with verbatim quotes.
`;

    const result = await generateObject({
      // GPT-5 defaults to strict structured output in this SDK. This schema has optional fields,
      // so request OpenAI JSON mode and validate the parsed result locally instead.
      model: openai("gpt-5-nano", { structuredOutputs: false }),
      schema: ProviderGuideSchema,
      mode: "json",
      prompt,
    });

    return ProviderGuideSchema.parse(result.object);
  } catch (error) {
    // If AI generation fails for any reason, gracefully fall back to the safe partial guide
    const fallback = buildPartialFallbackGuide(input);
    fallback.explicitUnknowns.push(
      "Live LLM guide generation failed. Retry later or use verified provider documentation."
    );
    return fallback;
  }
}
