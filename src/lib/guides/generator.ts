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
  const { queryOrUrl, catalogItem, researchBundle, capabilities = ["read", "write"] } = input;
  const providerName = deriveProviderName(queryOrUrl, catalogItem);
  const slug = catalogItem?.slug || slugify(queryOrUrl) || "unknown-provider";
  const now = new Date().toISOString();

  const citations: EvidenceCitation[] = (researchBundle?.documents || []).map((d) => d.citation);

  const fallbackGuide: ProviderGuide = {
    slug,
    providerName,
    toolkitSlug: catalogItem?.slug,
    title: `${providerName} Integration & OAuth Guide (Partial Reference)`,
    subtitle:
      "Automated baseline fallback guide generated without active LLM provider key or verified official documentation",
    generatedAt: now,
    generationMode: "partial-fallback",
    completenessStatus: "partial",
    composioIntegration: {
      managedOAuthAvailable: catalogItem?.hasManagedOAuth ?? false,
      managedVsCustomVerdict: catalogItem?.hasManagedOAuth
        ? "Composio Managed OAuth is available for rapid prototyping, but custom auth_configs should be evaluated for enterprise production."
        : "Composio managed OAuth is not available or unverified for this provider. Custom OAuth app credentials must be configured.",
      customAuthConfigSnippet: JSON.stringify(
        {
          auth_mode: "OAUTH2",
          client_id: `{{${slug.toUpperCase().replace(/-/g, "_")}_CLIENT_ID}}`,
          client_secret: `{{${slug.toUpperCase().replace(/-/g, "_")}_CLIENT_SECRET}}`,
          authorization_url: "https://example.com/oauth/authorize",
          token_url: "https://example.com/oauth/token",
          redirect_uri: `https://backend.composio.dev/api/v1/auth-apps/addRepo/${slug}`,
        },
        null,
        2
      ),
      composioRedirectUriHint: `https://backend.composio.dev/api/v1/auth-apps/addRepo/${slug}`,
      epistemicStatus: catalogItem ? "observed" : "unknown",
      citationIds: citations.map((c) => c.id),
    },
    variants: [
      {
        variantId: `${slug}-baseline-oauth`,
        title: `${providerName} Standard OAuth Integration`,
        summary: `Baseline OAuth 2.0 configuration for ${providerName}. Exact permission tiers, sensitive classifications, and security reviews require manual verification against official vendor docs.`,
        recommendedAppType: "OAuth 2.0 Web Application",
        scopes: capabilities.map((cap) => ({
          scope: cap,
          displayName: `${cap.charAt(0).toUpperCase() + cap.slice(1)} Scope`,
          classification: "unknown" as const,
          requiredForCapability: `Required for ${cap} operations`,
          triggersExternalReview: false,
          triggersSecurityAudit: false,
          epistemicStatus: "unknown" as const,
          citationIds: [],
        })),
        approvalGateSummary:
          "Provider approval requirements and external review gates are currently unknown and unverified.",
        estimatedReviewTimeline: "Unknown",
        securityAuditRequired: "Unknown",
        pros: [
          "Establishes initial baseline integration structure",
          "Includes standard Composio redirect URI pattern",
        ],
        cons: [
          "Scope sensitivity tiers and third-party security audit triggers require manual review",
          "Verification turnaround timeline is unverified",
        ],
      },
    ],
    registrationSteps: [
      {
        stepNumber: 1,
        title: `Create ${providerName} Developer Project`,
        consolePath: `${providerName} Developer Portal > Applications`,
        instructions:
          "Navigate to the developer portal for this provider, register your developer account, and create a new OAuth 2.0 application or client credential.",
        criticalConfigValues: [
          {
            label: "Callback URL",
            value: `https://backend.composio.dev/api/v1/auth-apps/addRepo/${slug}`,
          },
        ],
        epistemicStatus: "unknown",
        citationIds: [],
      },
      {
        stepNumber: 2,
        title: "Record Client Credentials in Composio",
        consolePath: "Composio Settings > Auth Configs",
        instructions:
          "Save the generated Client ID and Client Secret into your Composio app configuration or environment variables.",
        criticalConfigValues: [
          {
            label: "Client ID",
            value: "Recorded from provider console",
          },
          {
            label: "Client Secret",
            value: "Recorded from provider console",
          },
        ],
        epistemicStatus: "unknown",
        citationIds: [],
      },
    ],
    testingAndSandboxRules: [
      {
        claim:
          "Sandbox quotas, test user limits, and token expiration defaults are unverified for this provider.",
        epistemicStatus: "unknown",
        citationIds: [],
        notes: "Consult the provider developer documentation for testing constraints.",
      },
    ],
    distributionAndReviewChecklist: [
      {
        claim:
          "Production app verification and security assessment prerequisites must be validated before exposing app to external users.",
        epistemicStatus: "unknown",
        citationIds: [],
      },
    ],
    practicalObservations: [
      {
        claim:
          "Live AI synthesis was skipped due to missing API key or absence of official provider documentation in the research bundle.",
        epistemicStatus: "unknown",
        citationIds: [],
      },
    ],
    explicitUnknowns: [
      "Exact provider sensitive and restricted scope definitions",
      "Mandatory third-party security audits (e.g. CASA, SOC 2, or vendor assessments)",
      "Developer portal sandbox user quotas and refresh token lifespans",
      "Production verification review timeline and requirements",
    ],
    citations,
  };

  return ProviderGuideSchema.parse(fallbackGuide);
}

/**
 * Generates a structured ProviderGuide using Vercel AI SDK when OPENAI_API_KEY is present
 * and official documentation exists in the research bundle; otherwise falls back to a deterministic partial guide.
 */
export async function generateStructuredGuide(input: GenerateGuideInput): Promise<ProviderGuide> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const docs = input.researchBundle?.documents || [];
  const hasOfficialDocs = docs.some(
    (d) => d.citation.authorityType === "official-provider-docs"
  );
  const isDegraded = input.researchBundle?.degradedMode ?? false;

  // If no OpenAI key or no official docs or degraded research bundle, return truthful fallback
  if (!apiKey || !hasOfficialDocs || isDegraded) {
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
