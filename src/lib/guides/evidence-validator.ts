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
    const isLive = guide.generationMode === "live-researched";
    const urlAllowed = isLive || allowedSourceUrls.length > 0
      ? isUrlAllowed(citation.sourceUrl, allowedSourceUrls)
      : true;

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
