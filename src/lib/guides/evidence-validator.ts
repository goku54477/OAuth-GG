import {
  type ClaimItem,
  type EpistemicStatus,
  type EvidenceCitation,
  type ProviderGuide,
  type ScopeRequirement,
  type SetupStep,
  ProviderGuideSchema,
} from "@/types/contracts";

export interface AuditResult {
  auditedGuide: ProviderGuide;
  downgradedCitationsCount: number;
  downgradedClaimsCount: number;
  unverifiedCitationIds: string[];
}

const COVERAGE_UNKNOWN = "Requested capability coverage";

function normalizedText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9:]+/g, " ").trim().replace(/\s+/g, " ");
}

function citationSupportsText(citation: EvidenceCitation | undefined, value: string): boolean {
  if (!citation?.verbatimQuote) return false;
  const candidate = normalizedText(value);
  return candidate.length > 6 && normalizedText(citation.verbatimQuote).includes(candidate);
}

function documentedScopeDescription(citation: EvidenceCitation | undefined, scope: string): string | undefined {
  const quote = citation?.verbatimQuote;
  if (!quote) return undefined;
  const line = quote.split(/\r?\n/).find((candidate) => candidate.toLowerCase().includes(scope.toLowerCase()));
  if (!line) return undefined;
  const description = line.replace(/^\s*[-*|]\s*/, "").replace(new RegExp(`^${scope.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\s*[-:–—]?\s*`, "i"), "").trim();
  return description.length >= 8 ? description : undefined;
}

function documentedSetupStep(citation: EvidenceCitation, stepNumber: number): SetupStep {
  const match = citation.verbatimQuote?.match(/(Create a new OAuth2? Application[^.]*\.)/i);
  if (match) {
    return {
      stepNumber,
      title: "Create an OAuth2 Application",
      consolePath: citation.sourceUrl,
      instructions: match[1].trim(),
      criticalConfigValues: [],
      epistemicStatus: "source-supported",
      citationIds: [citation.id],
    };
  }
  return {
    stepNumber,
    title: "Consult official provider documentation",
    consolePath: citation.sourceUrl,
    instructions: citation.sourceTitle,
    criticalConfigValues: [],
    epistemicStatus: "source-supported",
    citationIds: [citation.id],
  };
}

function documentedAppType(citations: EvidenceCitation[]): string | undefined {
  return citations.some((citation) => /oauth2? application/i.test(citation.verbatimQuote ?? ""))
    ? "OAuth2 Application"
    : undefined;
}

export function normalizeReferenceGuideForEvidence(guide: ProviderGuide): ProviderGuide {
  if (guide.generationMode !== "golden-verified") return ProviderGuideSchema.parse(guide);

  return ProviderGuideSchema.parse({
    ...guide,
    composioIntegration: {
      ...guide.composioIntegration,
      managedVsCustomVerdict: guide.composioIntegration.epistemicStatus === "unknown"
        ? "Composio managed OAuth availability is unknown because no catalog metadata is available."
        : "Managed OAuth availability is reported by current Composio catalog metadata. Production suitability is not inferred.",
      customAuthConfigSnippet: "",
      composioRedirectUriHint: "",
    },
    variants: guide.variants.map((variant) => ({
      ...variant,
      estimatedReviewTimeline: "Unknown",
      securityAuditRequired: "Unknown",
    })),
  });
}

function isTrustedOfficialCitation(citation: EvidenceCitation): boolean {
  return citation.authorityType === "official-provider-docs"
    && citation.epistemicStatus === "source-supported"
    && citation.sourceUrl.startsWith("https://")
    && Boolean(citation.verbatimQuote?.trim());
}

/**
 * Reduces a live model draft to information the current contract can trace to
 * official source passages. The contract has no field-level configuration or
 * review provenance, so those values must stay absent rather than guessed.
 */
export function normalizeGuideForEvidence(guide: ProviderGuide): ProviderGuide {
  // Curated reference guides are canonical source data. Generated and fallback
  // records cross the same conservative boundary before persistence.
  if (guide.generationMode === "golden-verified") {
    return normalizeReferenceGuideForEvidence(guide);
  }

  const citations = guide.citations.filter(isTrustedOfficialCitation);
  const citationById = new Map(citations.map((citation) => [citation.id, citation]));
  const documentedSteps = citations.map((citation, index) => documentedSetupStep(citation, index + 1));

  const variants = guide.variants.map((variant) => {
    const scopes = variant.scopes.flatMap((scope) => {
      const normalizedScope = scope.scope.trim();
      // Generic words such as "read" do not establish a named OAuth scope.
      if (normalizedScope.length < 4) return [];
      const scopePattern = new RegExp(
        `(^|[^a-z0-9:_-])${normalizedScope.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9:_-])`,
        "i",
      );
      const citationIds = scope.citationIds.filter((id) => {
        const citation = citationById.get(id);
        return Boolean(citation?.verbatimQuote && scopePattern.test(citation.verbatimQuote));
      });
      if (citationIds.length === 0) return [];
      const supportingCitation = citationById.get(citationIds[0]);
      const documentedCapability = citationSupportsText(supportingCitation, scope.requiredForCapability)
        ? scope.requiredForCapability
        : documentedScopeDescription(supportingCitation, normalizedScope) ?? `Documented provider permission: ${normalizedScope}.`;
      return [{
        ...scope,
        displayName: scope.scope,
        classification: "unknown" as const,
        requiredForCapability: documentedCapability,
        triggersExternalReview: false,
        triggersSecurityAudit: false,
        leastPrivilegeAlternative: undefined,
        epistemicStatus: "source-supported" as const,
        citationIds,
      }];
    });

    return {
      ...variant,
      title: "Documented provider permissions",
      summary: scopes.length
        ? "Provider permission names are documented below; coverage for the requested workflow is not verified."
        : "No provider permission could be tied to an official source passage.",
      recommendedAppType: citations.some((citation) => citationSupportsText(citation, variant.recommendedAppType))
        ? variant.recommendedAppType
        : documentedAppType(citations) ?? "Unknown",
      approvalGateSummary: "Unknown",
      estimatedReviewTimeline: "Unknown",
      securityAuditRequired: "Unknown",
      pros: [],
      cons: [],
      scopes,
    };
  });

  const explicitUnknowns = [
    COVERAGE_UNKNOWN,
    "Provider review, audit, and configuration requirements",
  ];
  const hasCatalogMetadata = guide.composioIntegration.epistemicStatus !== "unknown";

  const supportedSteps = guide.registrationSteps.filter((step) =>
    step.citationIds.some((id) => {
      const citation = citationById.get(id);
      return citationSupportsText(citation, step.instructions);
    }),
  ).filter((step) => step.title !== "Consult official provider documentation").map((step) => ({
    ...step,
    consolePath: step.citationIds.map((id) => citationById.get(id)?.sourceUrl).find(Boolean) ?? "",
    criticalConfigValues: [],
    epistemicStatus: "source-supported" as const,
  }));

  return ProviderGuideSchema.parse({
    ...guide,
    title: `${guide.providerName} Integration & OAuth Guide (Partial Reference)`,
    subtitle: "Provider-specific OAuth configuration could not be fully verified from trusted evidence.",
    completenessStatus: "partial",
    composioIntegration: {
      managedOAuthAvailable: guide.composioIntegration.managedOAuthAvailable,
      managedVsCustomVerdict: hasCatalogMetadata
        ? "Managed OAuth availability is reported by current Composio catalog metadata."
        : "Composio managed OAuth availability is unknown because no catalog metadata is available.",
      customAuthConfigSnippet: "",
      composioRedirectUriHint: "",
      epistemicStatus: guide.composioIntegration.epistemicStatus,
      citationIds: guide.composioIntegration.citationIds.filter((id) => citationById.has(id)),
    },
    variants,
    registrationSteps: supportedSteps.length ? supportedSteps : documentedSteps,
    testingAndSandboxRules: [],
    distributionAndReviewChecklist: [],
    practicalObservations: [],
    explicitUnknowns,
    citations,
  });
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, "").toLowerCase();
  } catch {
    return url.trim().replace(/\/+$/, "").toLowerCase();
  }
}

function isUrlAllowed(url: string, allowedSourceUrls: string[]): boolean {
  if (!allowedSourceUrls || allowedSourceUrls.length === 0) {
    return true;
  }

  const norm = normalizeUrl(url);
  return allowedSourceUrls.some((allowed) => {
    const normAllowed = normalizeUrl(allowed);
    return norm === normAllowed || norm.startsWith(normAllowed);
  });
}

function evaluateClaimEpistemicStatus(
  currentStatus: EpistemicStatus,
  citationIds: string[],
  validCitationMap: Map<string, boolean>
): EpistemicStatus {
  // If not currently source-supported, keep its current status (e.g. observed, tested, estimated, unknown)
  if (currentStatus !== "source-supported") {
    return currentStatus;
  }

  // If there are no citation IDs, cannot be source-supported
  if (!citationIds || citationIds.length === 0) {
    return "unknown";
  }

  // Check if any citation is verified source-supported
  const hasValidCitation = citationIds.some((id) => validCitationMap.get(id) === true);
  if (hasValidCitation) {
    return "source-supported";
  }

  // Check if at least one citation exists in map (even if downgraded)
  const hasAnyCitation = citationIds.some((id) => validCitationMap.has(id));
  return hasAnyCitation ? "estimated" : "unknown";
}

/**
 * Deterministically verifies and audits a ProviderGuide against an allowed list of source URLs
 * and citation verbatim quotes. Downgrades referencing claims if evidence is untrusted or missing.
 */
export function verifyAndAuditGuide(
  guide: ProviderGuide,
  allowedSourceUrls: string[] = []
): ProviderGuide {
  const result = auditGuideWithReport(guide, allowedSourceUrls);
  return result.auditedGuide;
}

export function auditGuideWithReport(
  guide: ProviderGuide,
  allowedSourceUrls: string[] = []
): AuditResult {
  let downgradedCitationsCount = 0;
  let downgradedClaimsCount = 0;
  const unverifiedCitationIds: string[] = [];

  // Map of citation ID -> is source-supported and valid
  const validCitationMap = new Map<string, boolean>();

  // 1. Audit citations
  const auditedCitations: EvidenceCitation[] = guide.citations.map((citation) => {
    const urlAllowed = isUrlAllowed(citation.sourceUrl, allowedSourceUrls);

    const hasVerbatimQuote =
      typeof citation.verbatimQuote === "string" &&
      citation.verbatimQuote.trim().length > 0;

    const isValid = urlAllowed && hasVerbatimQuote;
    validCitationMap.set(citation.id, isValid);

    if (!isValid) {
      downgradedCitationsCount++;
      unverifiedCitationIds.push(citation.id);
      const newStatus: EpistemicStatus = urlAllowed ? "estimated" : "unknown";
      return {
        ...citation,
        epistemicStatus: newStatus,
      };
    }

    return { ...citation };
  });

  // Helper to audit a single ClaimItem
  function auditClaimItem(item: ClaimItem): ClaimItem {
    const newStatus = evaluateClaimEpistemicStatus(
      item.epistemicStatus,
      item.citationIds,
      validCitationMap
    );
    if (newStatus !== item.epistemicStatus) {
      downgradedClaimsCount++;
    }
    return {
      ...item,
      epistemicStatus: newStatus,
    };
  }

  // Helper to audit ScopeRequirement
  function auditScope(scope: ScopeRequirement): ScopeRequirement {
    const newStatus = evaluateClaimEpistemicStatus(
      scope.epistemicStatus,
      scope.citationIds,
      validCitationMap
    );
    if (newStatus !== scope.epistemicStatus) {
      downgradedClaimsCount++;
    }
    return {
      ...scope,
      epistemicStatus: newStatus,
    };
  }

  // Helper to audit SetupStep
  function auditStep(step: SetupStep): SetupStep {
    const newStatus = evaluateClaimEpistemicStatus(
      step.epistemicStatus,
      step.citationIds,
      validCitationMap
    );
    if (newStatus !== step.epistemicStatus) {
      downgradedClaimsCount++;
    }
    return {
      ...step,
      epistemicStatus: newStatus,
    };
  }

  // 2. Audit Composio Integration
  const auditedComposioStatus = evaluateClaimEpistemicStatus(
    guide.composioIntegration.epistemicStatus,
    guide.composioIntegration.citationIds,
    validCitationMap
  );
  if (auditedComposioStatus !== guide.composioIntegration.epistemicStatus) {
    downgradedClaimsCount++;
  }
  const auditedComposioIntegration = {
    ...guide.composioIntegration,
    epistemicStatus: auditedComposioStatus,
  };

  // 3. Audit Variants and Scopes
  const auditedVariants = guide.variants.map((variant) => ({
    ...variant,
    scopes: variant.scopes.map(auditScope),
  }));

  // 4. Audit Registration Steps
  const auditedRegistrationSteps = guide.registrationSteps.map(auditStep);

  // 5. Audit Claims in Testing, Distribution, Observations
  const auditedTestingAndSandbox =
    guide.testingAndSandboxRules.map(auditClaimItem);
  const auditedDistributionChecklist =
    guide.distributionAndReviewChecklist.map(auditClaimItem);
  const auditedPracticalObservations =
    guide.practicalObservations.map(auditClaimItem);

  const auditedGuide: ProviderGuide = {
    ...guide,
    composioIntegration: auditedComposioIntegration,
    variants: auditedVariants,
    registrationSteps: auditedRegistrationSteps,
    testingAndSandboxRules: auditedTestingAndSandbox,
    distributionAndReviewChecklist: auditedDistributionChecklist,
    practicalObservations: auditedPracticalObservations,
    citations: auditedCitations,
  };

  // Ensure output conforms strictly to ProviderGuideSchema
  const validatedGuide = ProviderGuideSchema.parse(auditedGuide);

  return {
    auditedGuide: validatedGuide,
    downgradedCitationsCount,
    downgradedClaimsCount,
    unverifiedCitationIds,
  };
}
