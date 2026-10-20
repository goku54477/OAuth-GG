import type {
  ComposioToolkitSummary,
  EvidenceCitation,
  ProviderGuide,
} from "@/types/contracts";

export type WorkbenchTab = "interactive-guides" | "workbench-catalog";
export type CatalogSegment = "saved" | "oauth" | "all";

export function isOAuthToolkit(toolkit: ComposioToolkitSummary): boolean {
  return (
    toolkit.hasManagedOAuth ||
    [...toolkit.authSchemes, ...toolkit.composioManagedAuthSchemes].some(
      (scheme) => /oauth/i.test(scheme),
    )
  );
}

export function getCatalogSegmentItems(
  toolkits: ComposioToolkitSummary[],
  segment: CatalogSegment,
  savedGuideSlugs: Set<string>,
): ComposioToolkitSummary[] {
  if (segment === "all") return toolkits;
  if (segment === "oauth") return toolkits.filter(isOAuthToolkit);
  return toolkits.filter(
    (toolkit) =>
      savedGuideSlugs.has(toolkit.slug) ||
      Boolean(
        toolkit.goldenGuideSlug && savedGuideSlugs.has(toolkit.goldenGuideSlug),
      ),
  );
}

export function getCatalogGuideAction(
  toolkit: ComposioToolkitSummary,
  savedGuideSlug: string | null,
): {
  label: "Open guide" | "Generate guide" | "Check auth path";
  guideSlug?: string;
} {
  if (savedGuideSlug) return { label: "Open guide", guideSlug: savedGuideSlug };
  return {
    label: isOAuthToolkit(toolkit) ? "Generate guide" : "Check auth path",
  };
}

export function getVisibleCatalogItems<T>(items: T[], limit: number): T[] {
  return items.slice(0, Math.max(0, limit));
}

export function formatGuideDate(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function getCitationSourceLabel(
  authority: EvidenceCitation["authorityType"],
): string {
  const labels: Record<EvidenceCitation["authorityType"], string> = {
    "official-provider-docs": "Official provider source",
    "composio-api-metadata": "Composio API metadata source",
    "secondary-technical": "Secondary technical source",
    "practical-inspection": "Practical inspection source",
  };
  return labels[authority];
}

export function getMissingQuoteLabel(): string {
  return "No verbatim quote captured for this citation.";
}

export function getManagedOAuthLabel(
  integration: Pick<
    ProviderGuide["composioIntegration"],
    "managedOAuthAvailable" | "epistemicStatus"
  >,
): "Available" | "Unavailable" | "Unknown" {
  if (integration.epistemicStatus === "unknown") return "Unknown";
  return integration.managedOAuthAvailable ? "Available" : "Unavailable";
}

export function hasSubstantiveGuideComparison(guide: ProviderGuide): boolean {
  return guide.variants.some(
    (variant) =>
      variant.pros.length > 0 ||
      variant.cons.length > 0 ||
      [
        variant.recommendedAppType,
        variant.approvalGateSummary,
        variant.estimatedReviewTimeline,
        variant.securityAuditRequired,
      ].some((value) => value.trim().toLowerCase() !== "unknown"),
  );
}

export function getDocumentedScopes(guide: ProviderGuide) {
  return [...new Map(
    guide.variants.flatMap((variant) => variant.scopes).map((scope) => [scope.scope, scope]),
  ).values()];
}

export function getGuideGenerationLabel(
  guide: Pick<ProviderGuide, "generationMode">,
): string {
  const labels: Record<ProviderGuide["generationMode"], string> = {
    "golden-verified": "Reference guide",
    "live-researched": "Live researched",
    "partial-fallback": "Partial guide",
  };
  return labels[guide.generationMode];
}

export function normalizeWorkbenchTab(value: string | null): WorkbenchTab {
  return value === "workbench-catalog" ? value : "interactive-guides";
}

export function readGuideRedirect(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const redirectUrl = (payload as { redirectUrl?: unknown }).redirectUrl;
  if (typeof redirectUrl !== "string") return null;
  return /^\/guides\/[a-z0-9][a-z0-9-]*$/i.test(redirectUrl)
    ? redirectUrl
    : null;
}

export function guideToMarkdown(guide: ProviderGuide): string {
  const hasComparison = hasSubstantiveGuideComparison(guide);
  const documentedScopes = getDocumentedScopes(guide);
  const known = (value: string) => value.trim().toLowerCase() !== "unknown";
  const claimSection = (
    title: string,
    items: ProviderGuide["testingAndSandboxRules"],
  ) =>
    items.length
      ? [
          `## ${title}`,
          ...items.flatMap((item) => [
            `- ${item.claim}`,
            `  - Status: ${item.epistemicStatus}`,
            ...(item.citationIds.length
              ? [`  - Citations: ${item.citationIds.join(", ")}`]
              : []),
            ...(item.notes ? [`  - Notes: ${item.notes}`] : []),
          ]),
        ]
      : [];
  const sections = [
    `# ${guide.title}`,
    guide.subtitle,
    `- Provider: ${guide.providerName}`,
    `- Generation mode: ${getGuideGenerationLabel(guide)}`,
    `- Completeness: ${guide.completenessStatus}`,
    `- Generated: ${guide.generatedAt}`,
    ...(guide.investigationContext
      ? [
          "## Investigated scenario",
          `- Application or provider: ${guide.investigationContext.query}`,
          `- Requested capabilities: ${guide.investigationContext.requestedCapabilities.length ? guide.investigationContext.requestedCapabilities.join(", ") : "None specified"}`,
          `- Source path: ${guide.investigationContext.sourceMode === "catalog" ? "Catalog metadata" : "Official documentation"}`,
          ...(guide.investigationContext.officialDocumentationUrl
            ? [
                `- Official documentation: ${guide.investigationContext.officialDocumentationUrl}`,
              ]
            : []),
        ]
      : []),
    "## Composio integration",
    guide.composioIntegration.managedVsCustomVerdict,
    `- Managed OAuth: ${getManagedOAuthLabel(guide.composioIntegration)}`,
    `- Status: ${guide.composioIntegration.epistemicStatus}`,
    ...(guide.composioIntegration.composioRedirectUriHint
      ? [
          `- Redirect URI hint: ${guide.composioIntegration.composioRedirectUriHint}`,
        ]
      : []),
    guide.composioIntegration.customAuthConfigSnippet
      ? `\`\`\`\n${guide.composioIntegration.customAuthConfigSnippet}\n\`\`\``
      : "",
    ...(hasComparison
      ? guide.variants.flatMap((variant) => [
          `## ${variant.title}`,
          variant.summary,
          ...(known(variant.recommendedAppType)
            ? [`- Recommended app type: ${variant.recommendedAppType}`]
            : []),
          ...(known(variant.approvalGateSummary)
            ? [`- Approval gate: ${variant.approvalGateSummary}`]
            : []),
          ...(known(variant.estimatedReviewTimeline)
            ? [`- Review timeline: ${variant.estimatedReviewTimeline}`]
            : []),
          ...(known(variant.securityAuditRequired)
            ? [`- Security audit: ${variant.securityAuditRequired}`]
            : []),
          ...variant.scopes.map(
            (scope) =>
              `- Scope \`${scope.scope}\`: ${scope.requiredForCapability} (${scope.classification}; ${scope.epistemicStatus}${scope.citationIds.length ? `; citations: ${scope.citationIds.join(", ")}` : ""})`,
          ),
          ...(variant.pros.length
            ? ["### Advantages", ...variant.pros.map((item) => `- ${item}`)]
            : []),
          ...(variant.cons.length
            ? ["### Constraints", ...variant.cons.map((item) => `- ${item}`)]
            : []),
        ])
      : documentedScopes.length
        ? [
            "## Documented provider permissions",
            "Permission names are source-backed; requested capability coverage remains unverified.",
            ...documentedScopes.map(
              (scope) =>
                `- Scope \`${scope.scope}\`: ${scope.requiredForCapability} (${scope.epistemicStatus}${scope.citationIds.length ? `; citations: ${scope.citationIds.join(", ")}` : ""})`,
            ),
          ]
        : [
            "## Research incomplete",
            "No substantive capability comparison was verified.",
          ]),
    ...(guide.registrationSteps.length
      ? [
          "## Provider registration",
          ...guide.registrationSteps.flatMap((step) => [
            `### ${step.stepNumber}. ${step.title}`,
            `- Console path: ${step.consolePath}`,
            `- Status: ${step.epistemicStatus}`,
            ...(step.citationIds.length
              ? [`- Citations: ${step.citationIds.join(", ")}`]
              : []),
            step.instructions,
            ...step.criticalConfigValues.map(
              (value) => `- ${value.label}: ${value.value}`,
            ),
          ]),
        ]
      : []),
    ...claimSection("Testing and sandbox rules", guide.testingAndSandboxRules),
    ...claimSection(
      "Distribution and review checklist",
      guide.distributionAndReviewChecklist,
    ),
    ...claimSection("Practical observations", guide.practicalObservations),
    "## AuthBench can help",
    "- Organize captured evidence and citations.",
    "- Map documented permissions to the requested scenario where evidence supports the link.",
    "- Surface blockers, open questions, and unverified requirements.",
    "## Human action required",
    "- Register the provider application and supply credentials securely.",
    "- Complete provider consent, testing, verification, and review steps that apply.",
    "- Validate the final production configuration against current provider documentation.",
    ...(guide.explicitUnknowns.length
      ? [
          "## What this guide does not verify",
          ...guide.explicitUnknowns.map((item) => `- ${item}`),
        ]
      : []),
    ...(guide.citations.length
      ? [
          "## Sources",
          ...guide.citations.map(
            (citation) => `- [${citation.sourceTitle}](${citation.sourceUrl})`,
          ),
        ]
      : []),
  ];

  return sections.filter(Boolean).join("\n\n");
}
