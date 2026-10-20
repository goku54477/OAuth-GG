import type {
  CapabilityVariant,
  ComposioToolkitSummary,
  ProviderGuide,
  ScopeRequirement,
} from "@/types/contracts";

export interface RoutingDecision {
  goldenGuideSlug: string | null;
  toolkitSlug?: string;
  recommendedVariantId?: string;
  isCustomAppRecommended: boolean;
  securityReviewRequired: boolean;
  securityAuditRequired: boolean;
  estimatedReviewTimeline: string;
  summaryRationale: string;
}

/**
 * Resolves whether a query, target URL, or toolkit slug matches an existing golden guide.
 */
export function matchGoldenGuideSlug(
  queryOrUrl: string,
  toolkitSlug?: string
): string | null {
  const normalizedQuery = (queryOrUrl || "").trim().toLowerCase();
  const normalizedToolkit = (toolkitSlug || "").trim().toLowerCase();

  // 1. Direct slug or toolkit slug matches
  if (
    normalizedQuery === "github-public-issues" ||
    normalizedToolkit === "github-public-issues"
  ) {
    return "github-public-issues";
  }
  if (
    normalizedQuery === "slack-channel-bot" ||
    normalizedToolkit === "slack-channel-bot"
  ) {
    return "slack-channel-bot";
  }
  if (
    normalizedQuery === "gmail-send-vs-modify" ||
    normalizedToolkit === "gmail-send-vs-modify"
  ) {
    return "gmail-send-vs-modify";
  }

  // 2. GitHub matching
  if (
    normalizedToolkit === "github" ||
    normalizedQuery.includes("github") ||
    normalizedQuery.includes("api.github.com") ||
    (normalizedQuery.includes("issue") && normalizedQuery.includes("repo"))
  ) {
    return "github-public-issues";
  }

  // 3. Slack matching
  if (
    normalizedToolkit === "slack" ||
    normalizedQuery.includes("slack") ||
    normalizedQuery.includes("api.slack.com") ||
    normalizedQuery.includes("slackbot")
  ) {
    return "slack-channel-bot";
  }

  // 4. Gmail matching
  if (
    normalizedToolkit === "gmail" ||
    normalizedQuery.includes("gmail") ||
    normalizedQuery.includes("google mail") ||
    normalizedQuery.includes("mail.google.com")
  ) {
    return "gmail-send-vs-modify";
  }

  return null;
}

/**
 * Selects the optimal least-privilege capability variant for a given guide based on requested capabilities.
 */
export function selectRecommendedVariant(
  guide: ProviderGuide,
  capabilities?: string[]
): CapabilityVariant {
  const caps = (capabilities || []).map((c) => c.toLowerCase());

  // Check if caller explicitly demands broad/restricted features
  const demandsBroadMail =
    caps.some((c) => c.includes("read-all") || c.includes("modify-mail") || c.includes("full-sync"));
  const demandsBroadRepo =
    caps.some((c) => c.includes("code-write") || c.includes("full-repo") || c.includes("admin"));
  const demandsMarketplace =
    caps.some((c) => c.includes("directory") || c.includes("marketplace"));

  if (guide.slug === "gmail-send-vs-modify" && demandsBroadMail) {
    const broadVariant = guide.variants.find((v) => v.variantId === "gmail-read-modify-restricted");
    if (broadVariant) return broadVariant;
  }

  if (guide.slug === "github-public-issues" && demandsBroadRepo) {
    const broadVariant = guide.variants.find((v) => v.variantId === "github-oauth-public-repo");
    if (broadVariant) return broadVariant;
  }

  if (guide.slug === "slack-channel-bot" && demandsMarketplace) {
    const marketVariant = guide.variants.find((v) => v.variantId === "slack-marketplace-listed");
    if (marketVariant) return marketVariant;
  }

  // By default, return the first variant (Variant A: Recommended Least Privilege)
  return guide.variants[0];
}

/**
 * Inspects a list of scope requirements to determine approval gate and security audit requirements.
 */
export function evaluateSecurityReviewTriggers(scopes: ScopeRequirement[]): {
  triggersReview: boolean;
  triggersAudit: boolean;
  reviewType: string;
  estimatedTimeline: string;
} {
  const triggersAudit = scopes.some((s) => s.triggersSecurityAudit);
  const triggersReview = scopes.some((s) => s.triggersExternalReview);

  if (triggersAudit) {
    return {
      triggersReview: true,
      triggersAudit: true,
      reviewType: "Provider review and security-assessment requirements must be verified from official documentation.",
      estimatedTimeline: "Unknown",
    };
  }

  if (triggersReview) {
    return {
      triggersReview: true,
      triggersAudit: false,
      reviewType: "Provider review requirements must be verified from official documentation.",
      estimatedTimeline: "Unknown",
    };
  }

  return {
    triggersReview: false,
    triggersAudit: false,
    reviewType: "No review requirement is established by the available scope metadata.",
    estimatedTimeline: "Unknown",
  };
}

/**
 * Recommends whether to use Composio Managed OAuth2 or a Custom App Auth Config.
 */
export function evaluateComposioAuthStrategy(params: {
  toolkit?: ComposioToolkitSummary | null;
  isProduction?: boolean;
  requiresCustomBranding?: boolean;
}): {
  recommendedAuthScheme: "MANAGED_OAUTH" | "CUSTOM_APP" | "UNKNOWN";
  rationale: string;
} {
  const { toolkit, isProduction = true, requiresCustomBranding = true } = params;

  if (toolkit?.requiresCustomAppForProduction && isProduction) {
    return {
      recommendedAuthScheme: "CUSTOM_APP",
      rationale:
        "The toolkit requires a custom app configuration for production deployments to avoid shared rate limits and display customer-facing domain branding.",
    };
  }

  if (toolkit?.hasManagedOAuth) {
    return {
      recommendedAuthScheme: "MANAGED_OAUTH",
      rationale:
        "Composio Managed OAuth2 is suitable for development, prototyping, and testing without setting up cloud provider developer console credentials.",
    };
  }

  if (toolkit && !toolkit.hasManagedOAuth) {
    return {
      recommendedAuthScheme: "UNKNOWN",
      rationale: "Managed OAuth is not reported by catalog metadata; the required authentication path must be verified.",
    };
  }

  return {
    recommendedAuthScheme: "UNKNOWN",
    rationale: "The authentication strategy cannot be determined without current catalog or provider evidence.",
  };
}

/**
 * Full decision evaluation routing.
 */
export function makeRoutingDecision(input: {
  queryOrUrl: string;
  toolkitSlug?: string;
  capabilities?: string[];
  catalogItem?: ComposioToolkitSummary | null;
  guide?: ProviderGuide | null;
  isProduction?: boolean;
}): RoutingDecision {
  const matchedSlug = matchGoldenGuideSlug(input.queryOrUrl, input.toolkitSlug);
  const guide = input.guide;

  let recommendedVariantId: string | undefined;
  let securityReviewRequired = false;
  let securityAuditRequired = false;
  let estimatedReviewTimeline = "Unknown";

  if (guide) {
    const variant = selectRecommendedVariant(guide, input.capabilities);
    recommendedVariantId = variant.variantId;
    const reviewGates = evaluateSecurityReviewTriggers(variant.scopes);
    securityReviewRequired = reviewGates.triggersReview;
    securityAuditRequired = reviewGates.triggersAudit;
    estimatedReviewTimeline = reviewGates.estimatedTimeline;
  }

  const authStrategy = evaluateComposioAuthStrategy({
    toolkit: input.catalogItem,
    isProduction: input.isProduction ?? true,
  });

  return {
    goldenGuideSlug: matchedSlug,
    toolkitSlug: input.toolkitSlug,
    recommendedVariantId,
    isCustomAppRecommended: authStrategy.recommendedAuthScheme === "CUSTOM_APP",
    securityReviewRequired,
    securityAuditRequired,
    estimatedReviewTimeline,
    summaryRationale: authStrategy.rationale,
  };
}
