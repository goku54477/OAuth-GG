import type { ProviderGuide } from "@/types/contracts";

export type WorkbenchTab = "interactive-guides" | "workbench-catalog";

export function getVisibleCatalogItems<T>(items: T[], limit: number): T[] {
  return items.slice(0, Math.max(0, limit));
}

export function formatGuideDate(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
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
  const sections = [
    `# ${guide.title}`,
    guide.subtitle,
    `- Provider: ${guide.providerName}`,
    `- Generation mode: ${guide.generationMode}`,
    `- Completeness: ${guide.completenessStatus}`,
    `- Generated: ${guide.generatedAt}`,
    "## Composio integration",
    guide.composioIntegration.managedVsCustomVerdict,
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
    ]),
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
