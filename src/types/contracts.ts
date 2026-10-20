import { z } from "zod";

export const EpistemicStatusSchema = z.enum([
  "source-supported",
  "observed",
  "tested",
  "estimated",
  "recommendation",
  "unknown",
]);
export type EpistemicStatus = z.infer<typeof EpistemicStatusSchema>;

export const EvidenceCitationSchema = z.object({
  id: z.string(),
  sourceUrl: z.string().url(),
  sourceTitle: z.string(),
  authorityType: z.enum([
    "official-provider-docs",
    "composio-api-metadata",
    "secondary-technical",
    "practical-inspection",
  ]),
  retrievedAt: z.string().datetime(),
  verbatimQuote: z.string().optional(),
  epistemicStatus: EpistemicStatusSchema,
});
export type EvidenceCitation = z.infer<typeof EvidenceCitationSchema>;

export const ClaimItemSchema = z.object({
  claim: z.string(),
  epistemicStatus: EpistemicStatusSchema,
  citationIds: z.array(z.string()),
  notes: z.string().optional(),
});
export type ClaimItem = z.infer<typeof ClaimItemSchema>;

export const ScopeRequirementSchema = z.object({
  scope: z.string(),
  displayName: z.string(),
  classification: z.enum([
    "non-sensitive",
    "sensitive",
    "restricted",
    "granular-bot",
    "coarse-repo",
    "unknown",
  ]),
  requiredForCapability: z.string(),
  triggersExternalReview: z.boolean(),
  triggersSecurityAudit: z.boolean(),
  leastPrivilegeAlternative: z.string().optional(),
  epistemicStatus: EpistemicStatusSchema,
  citationIds: z.array(z.string()),
});
export type ScopeRequirement = z.infer<typeof ScopeRequirementSchema>;

export const CapabilityVariantSchema = z.object({
  variantId: z.string(),
  title: z.string(),
  summary: z.string(),
  recommendedAppType: z.string(),
  scopes: z.array(ScopeRequirementSchema),
  approvalGateSummary: z.string(),
  estimatedReviewTimeline: z.string(),
  securityAuditRequired: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
});
export type CapabilityVariant = z.infer<typeof CapabilityVariantSchema>;

export const SetupStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  title: z.string(),
  consolePath: z.string(),
  instructions: z.string(),
  criticalConfigValues: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    })
  ),
  epistemicStatus: EpistemicStatusSchema,
  citationIds: z.array(z.string()),
});
export type SetupStep = z.infer<typeof SetupStepSchema>;

export const ComposioToolkitSummarySchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  logoUrl: z.string().optional(),
  appUrl: z.string().optional(),
  categories: z.array(z.string()),
  authSchemes: z.array(z.string()),
  composioManagedAuthSchemes: z.array(z.string()),
  hasManagedOAuth: z.boolean(),
  requiresCustomAppForProduction: z.boolean(),
  requiredAuthCreationFields: z.array(z.string()),
  toolsCount: z.number().int().nonnegative(),
  triggersCount: z.number().int().nonnegative(),
  goldenGuideSlug: z.string().optional(),
});
export type ComposioToolkitSummary = z.infer<typeof ComposioToolkitSummarySchema>;

export const ProviderGuideSchema = z.object({
  slug: z.string(),
  providerName: z.string(),
  toolkitSlug: z.string().optional(),
  title: z.string(),
  subtitle: z.string(),
  generatedAt: z.string().datetime(),
  generationMode: z.enum(["golden-verified", "live-researched", "partial-fallback"]),
  completenessStatus: z.enum(["complete", "partial", "degraded"]),
  composioIntegration: z.object({
    managedOAuthAvailable: z.boolean(),
    managedVsCustomVerdict: z.string(),
    customAuthConfigSnippet: z.string(),
    composioRedirectUriHint: z.string(),
    epistemicStatus: EpistemicStatusSchema,
    citationIds: z.array(z.string()),
  }),
  variants: z.array(CapabilityVariantSchema).min(1),
  registrationSteps: z.array(SetupStepSchema),
  testingAndSandboxRules: z.array(ClaimItemSchema),
  distributionAndReviewChecklist: z.array(ClaimItemSchema),
  practicalObservations: z.array(ClaimItemSchema),
  explicitUnknowns: z.array(z.string()),
  citations: z.array(EvidenceCitationSchema),
});
export type ProviderGuide = z.infer<typeof ProviderGuideSchema>;

export const LiveResearchRequestSchema = z.object({
  queryOrUrl: z.string().min(2).max(500),
  capabilities: z.array(z.string()).default(["read", "write", "external-distribution"]),
  forceRefresh: z.boolean().default(false),
});
export type LiveResearchRequest = z.infer<typeof LiveResearchRequestSchema>;
