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
    `- Generation mode: ${guide.generationMode}`,
    `- Completeness: ${guide.completenessStatus}`,
    `- Generated: ${guide.generatedAt}`,
    "## Composio integration",
    guide.composioIntegration.managedVsCustomVerdict,
    `- Managed OAuth: ${guide.composioIntegration.managedOAuthAvailable ? "Available" : "Unavailable"}`,
    `- Status: ${guide.composioIntegration.epistemicStatus}`,
    ...(guide.composioIntegration.composioRedirectUriHint
      ? [`- Redirect URI hint: ${guide.composioIntegration.composioRedirectUriHint}`]
      : []),
    guide.composioIntegration.customAuthConfigSnippet
      ? `\`\`\`\n${guide.composioIntegration.customAuthConfigSnippet}\n\`\`\``
      : "",
    ...guide.variants.flatMap((variant) => [
      `## ${variant.title}`,
      variant.summary,
      `- Recommended app type: ${variant.recommendedAppType}`,
      `- Approval gate: ${variant.approvalGateSummary}`,
      `- Review timeline: ${variant.estimatedReviewTimeline}`,
      `- Security audit: ${variant.securityAuditRequired}`,
      ...variant.scopes.map(
        (scope) => `- Scope \`${scope.scope}\`: ${scope.requiredForCapability} (${scope.classification})`,
      ),
      ...(variant.pros.length ? ["### Advantages", ...variant.pros.map((item) => `- ${item}`)] : []),
      ...(variant.cons.length ? ["### Constraints", ...variant.cons.map((item) => `- ${item}`)] : []),
    ]),
    ...(guide.registrationSteps.length
      ? [
          "## Provider registration",
          ...guide.registrationSteps.flatMap((step) => [
            `### ${step.stepNumber}. ${step.title}`,
            `- Console path: ${step.consolePath}`,
            `- Status: ${step.epistemicStatus}`,
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
