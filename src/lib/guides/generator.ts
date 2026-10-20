import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import {
  type ComposioToolkitSummary,
  type EvidenceCitation,
  type ProviderGuide,
  ProviderGuideSchema,
} from "@/types/contracts";

const GeneratedGuideDraftSchema = ProviderGuideSchema.omit({
  slug: true,
  providerName: true,
  toolkitSlug: true,
  generatedAt: true,
  generationMode: true,
  completenessStatus: true,
  citations: true,
  composioIntegration: true,
}).extend({
  composioIntegration: ProviderGuideSchema.shape.composioIntegration.omit({
    managedOAuthAvailable: true,
    epistemicStatus: true,
  }),
});

export interface GuideGenerationDiagnostics {
  providerMatched: boolean;
  researchDocumentCount: number;
  officialDocumentCount: number;
  researchDegraded: boolean;
  researchWarningCount: number;
  modelAttempted: boolean;
  generationOutcome:
    | "missing-api-key"
    | "provider-identity-unverified"
    | "no-official-evidence"
    | "golden-guide"
    | "model-success"
    | "model-http-error"
    | "model-output-invalid";
  failureCategory?: string;
}

export interface GenerateGuideInput {
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
  let clean = queryOrUrl.trim();
  try {
    const labels = new URL(queryOrUrl).hostname.replace(/^www\./, "").split(".");
    clean = labels.length >= 2 ? labels[labels.length - 2] : labels[0];
  } catch {
    // Provider name already comes from user query.
  }
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function generationFailureCategory(error: unknown): string {
  const candidate = error as {
    name?: unknown;
    finishReason?: unknown;
    statusCode?: unknown;
    cause?: { statusCode?: unknown };
  } | null;
  if (candidate?.name === "AI_NoObjectGeneratedError" && candidate.finishReason === "length") {
    return "model-output-truncated";
  }
  const statusCode = candidate?.statusCode ?? candidate?.cause?.statusCode;
  return typeof statusCode === "number" ? `http-${statusCode}` : "invalid-or-incomplete-model-output";
}

/**
 * Builds a schema-valid partial fallback ProviderGuide when OPENAI_API_KEY is missing
 * or when research documents lack official provider documentation.
 */
export function buildPartialFallbackGuide(input: GenerateGuideInput): ProviderGuide {
  const { queryOrUrl, catalogItem, researchBundle } = input;
  const providerName = deriveProviderName(queryOrUrl, catalogItem);
  const slug = catalogItem?.slug || slugify(providerName) || "unknown-provider";
  const now = new Date().toISOString();

  const citations: EvidenceCitation[] = (
    catalogItem || input.providerIdentityVerified ? researchBundle?.documents || [] : []
  )
    .filter((document) => document.citation.authorityType === "official-provider-docs")
    .map((document) => document.citation);

  const fallbackGuide: ProviderGuide = {
    slug,
    providerName,
    toolkitSlug: catalogItem?.slug,
    title: `${providerName} Integration & OAuth Guide (Partial Reference)`,
    subtitle: citations.length > 0
      ? "Official provider evidence was collected, but a complete structured guide could not be generated."
      : "Provider-specific OAuth configuration could not be verified from trusted evidence.",
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
      epistemicStatus: catalogItem
        ? input.catalogEpistemicStatus ?? "source-supported"
        : "unknown",
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
      ...(!catalogItem && !input.providerIdentityVerified ? ["Provider identity"] : []),
      ...(citations.length === 0 ? ["Official OAuth documentation"] : []),
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
  return (await generateStructuredGuideWithDiagnostics(input)).guide;
}

export async function generateStructuredGuideWithDiagnostics(
  input: GenerateGuideInput,
): Promise<{ guide: ProviderGuide; diagnostics: GuideGenerationDiagnostics }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const allDocuments = input.researchBundle?.documents || [];
  const docs = allDocuments.filter(
    (document) => document.citation.authorityType === "official-provider-docs",
  );
  const baseDiagnostics = {
    providerMatched: Boolean(input.catalogItem),
    researchDocumentCount: allDocuments.length,
    officialDocumentCount: docs.length,
    researchDegraded: input.researchBundle?.degradedMode ?? true,
    researchWarningCount: input.researchBundle?.warnings.length ?? 0,
  };

  if (!apiKey) {
    return {
      guide: buildPartialFallbackGuide(input),
      diagnostics: { ...baseDiagnostics, modelAttempted: false, generationOutcome: "missing-api-key" },
    };
  }
  if (!input.catalogItem && !input.providerIdentityVerified) {
    return {
      guide: buildPartialFallbackGuide(input),
      diagnostics: {
        ...baseDiagnostics,
        modelAttempted: false,
        generationOutcome: "provider-identity-unverified",
      },
    };
  }
  if (docs.length === 0) {
    return {
      guide: buildPartialFallbackGuide(input),
      diagnostics: { ...baseDiagnostics, modelAttempted: false, generationOutcome: "no-official-evidence" },
    };
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
Citation ID: ${d.citation.id}
Title: ${d.citation.sourceTitle}
Content:
${d.cleanMarkdown.slice(0, 3000)}
Highlights:
${d.highlights.join("\n")}
`
  )
  .join("\n\n")}

CRITICAL SECURITY REQUIREMENTS:
0. Keep every field concise so complete valid JSON fits within the output limit.
1. Always contrast at least 2 variants: a recommended least-privilege variant (Variant A) and a broader/comparison variant (Variant B).
2. For every scope, correctly classify as non-sensitive, sensitive, restricted, granular-bot, coarse-repo, or unknown.
3. Identify external review gates and whether third-party security audits (e.g., CASA Tier AL1/AL2) are triggered.
4. Provide concrete step-by-step console instructions with criticalConfigValues.
5. Reference only citation IDs supplied with the documents. Do not create citations or provider identity fields.
`;

    const result = await generateObject({
      model: openai("gpt-5-nano", {
        structuredOutputs: false,
        reasoningEffort: "low",
      }),
      schema: GeneratedGuideDraftSchema,
      mode: "json",
      maxTokens: 8192,
      prompt,
    });

    const draft = GeneratedGuideDraftSchema.parse(result.object);
    const providerName = deriveProviderName(input.queryOrUrl, input.catalogItem);
    const guide = ProviderGuideSchema.parse({
      ...draft,
      slug: input.catalogItem?.slug ?? (slugify(providerName) || "unknown-provider"),
      providerName,
      toolkitSlug: input.catalogItem?.slug,
      generatedAt: new Date().toISOString(),
      generationMode: "live-researched",
      completenessStatus: "complete",
      composioIntegration: {
        ...draft.composioIntegration,
        managedOAuthAvailable: input.catalogItem?.hasManagedOAuth ?? false,
        epistemicStatus: input.catalogItem
          ? input.catalogEpistemicStatus ?? "source-supported"
          : "unknown",
      },
      citations: docs.map((document) => document.citation),
    });
    return {
      guide,
      diagnostics: { ...baseDiagnostics, modelAttempted: true, generationOutcome: "model-success" },
    };
  } catch (error) {
    const category = generationFailureCategory(error);
    console.error("[guide-generation] failed", { category });
    const fallback = buildPartialFallbackGuide(input);
    fallback.explicitUnknowns.push(
      "Live LLM guide generation failed. Retry later or use verified provider documentation."
    );
    return {
      guide: fallback,
      diagnostics: {
        ...baseDiagnostics,
        modelAttempted: true,
        generationOutcome: category.startsWith("http-") ? "model-http-error" : "model-output-invalid",
        failureCategory: category,
      },
    };
  }
}
