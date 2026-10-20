import type { EvidenceCitation, ProviderGuide } from "@/types/contracts";

export type WorkbenchTab = "interactive-guides" | "workbench-catalog";

export function getVisibleCatalogItems<T>(items: T[], limit: number): T[] {
  return items.slice(0, Math.max(0, limit));
}

export function formatGuideDate(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function getCitationSourceLabel(authority: EvidenceCitation["authorityType"]): string {
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
  integration: Pick<ProviderGuide["composioIntegration"], "managedOAuthAvailable" | "epistemicStatus">,
): "Available" | "Unavailable" | "Unknown" {
  if (integration.epistemicStatus === "unknown") return "Unknown";
  return integration.managedOAuthAvailable ? "Available" : "Unavailable";
}

export function hasSubstantiveGuideComparison(guide: ProviderGuide): boolean {
  return guide.variants.some((variant) =>
    variant.pros.length > 0
    || variant.cons.length > 0
    || [
      variant.recommendedAppType,
      variant.approvalGateSummary,
      variant.estimatedReviewTimeline,
      variant.securityAuditRequired,
    ].some((value) => value.trim().toLowerCase() !== "unknown"),
  );
}

export function getGuideGenerationLabel(guide: Pick<ProviderGuide, "generationMode">): string {
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
  return /^\/guides\/[a-z0-9][a-z0-9-]*$/i.test(redirectUrl) ? redirectUrl : null;
}

export function guideToMarkdown(guide: ProviderGuide): string {
  const hasComparison = hasSubstantiveGuideComparison(guide);
  const documentedScopes = guide.variants.flatMap((variant) => variant.scopes);
  const known = (value: string) => value.trim().toLowerCase() !== "unknown";
  const claimSection = (title: string, items: ProviderGuide["testingAndSandboxRules"]) =>
    items.length
      ? [
          `## ${title}`,
          ...items.flatMap((item) => [
            `- ${item.claim}`,
            `  - Status: ${item.epistemicStatus}`,
            ...(item.citationIds.length ? [`  - Citations: ${item.citationIds.join(", ")}`] : []),
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
    "## Composio integration",
    guide.composioIntegration.managedVsCustomVerdict,
    `- Managed OAuth: ${getManagedOAuthLabel(guide.composioIntegration)}`,
    `- Status: ${guide.composioIntegration.epistemicStatus}`,
    ...(guide.composioIntegration.composioRedirectUriHint
      ? [`- Redirect URI hint: ${guide.composioIntegration.composioRedirectUriHint}`]
      : []),
    guide.composioIntegration.customAuthConfigSnippet
      ? `\`\`\`\n${guide.composioIntegration.customAuthConfigSnippet}\n\`\`\``
      : "",
    ...(hasComparison ? guide.variants.flatMap((variant) => [
      `## ${variant.title}`,
      variant.summary,
      ...(known(variant.recommendedAppType) ? [`- Recommended app type: ${variant.recommendedAppType}`] : []),
      ...(known(variant.approvalGateSummary) ? [`- Approval gate: ${variant.approvalGateSummary}`] : []),
      ...(known(variant.estimatedReviewTimeline) ? [`- Review timeline: ${variant.estimatedReviewTimeline}`] : []),
      ...(known(variant.securityAuditRequired) ? [`- Security audit: ${variant.securityAuditRequired}`] : []),
      ...variant.scopes.map(
        (scope) => `- Scope \`${scope.scope}\`: ${scope.requiredForCapability} (${scope.classification}; ${scope.epistemicStatus}${scope.citationIds.length ? `; citations: ${scope.citationIds.join(", ")}` : ""})`,
      ),
      ...(variant.pros.length ? ["### Advantages", ...variant.pros.map((item) => `- ${item}`)] : []),
      ...(variant.cons.length ? ["### Constraints", ...variant.cons.map((item) => `- ${item}`)] : []),
    ]) : documentedScopes.length ? [
      "## Documented provider permissions",
      "Permission names are source-backed; requested capability coverage remains unverified.",
      ...documentedScopes.map(
        (scope) => `- Scope \`${scope.scope}\`: ${scope.requiredForCapability} (${scope.epistemicStatus}${scope.citationIds.length ? `; citations: ${scope.citationIds.join(", ")}` : ""})`,
      ),
    ] : ["## Research incomplete", "No substantive capability comparison was verified."]),
    ...(guide.registrationSteps.length
      ? [
          "## Provider registration",
          ...guide.registrationSteps.flatMap((step) => [
            `### ${step.stepNumber}. ${step.title}`,
            `- Console path: ${step.consolePath}`,
            `- Status: ${step.epistemicStatus}`,
            ...(step.citationIds.length ? [`- Citations: ${step.citationIds.join(", ")}`] : []),
            step.instructions,
            ...step.criticalConfigValues.map((value) => `- ${value.label}: ${value.value}`),
          ]),
        ]
      : []),
    ...claimSection("Testing and sandbox rules", guide.testingAndSandboxRules),
    ...claimSection("Distribution and review checklist", guide.distributionAndReviewChecklist),
    ...claimSection("Practical observations", guide.practicalObservations),
    ...(guide.explicitUnknowns.length
      ? ["## Explicit unknowns", ...guide.explicitUnknowns.map((item) => `- ${item}`)]
      : []),
    ...(guide.citations.length
      ? [
          "## Sources",
          ...guide.citations.map((citation) => `- [${citation.sourceTitle}](${citation.sourceUrl})`),
        ]
      : []),
  ];

  return sections.filter(Boolean).join("\n\n");
}
