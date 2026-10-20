import snapshotJson from "@/data/composio-catalog.snapshot.json";
import {
  ComposioToolkitSummarySchema,
  type ComposioToolkitSummary,
} from "@/types/contracts";

import {
  fetchToolkitDetail,
  isCompleteToolkitDetail,
  isSafeToolkitSlug,
  normalizeToolkitSummary,
} from "./composio-client";

const snapshot = ComposioToolkitSummarySchema.array().parse(snapshotJson);
const bySlug = new Map(snapshot.map((toolkit) => [toolkit.slug, toolkit]));

const providerDomainAliases = new Map([
  ["github.com", "github"],
  ["slack.com", "slack"],
  ["google.com", "gmail"],
  ["gmail.com", "gmail"],
]);

function cloneToolkit(toolkit: ComposioToolkitSummary): ComposioToolkitSummary {
  return {
    ...toolkit,
    categories: [...toolkit.categories],
    authSchemes: [...toolkit.authSchemes],
    composioManagedAuthSchemes: [...toolkit.composioManagedAuthSchemes],
    requiredAuthCreationFields: [...toolkit.requiredAuthCreationFields],
  };
}

export async function getCatalogToolkits(options?: {
  search?: string;
  category?: string;
  managedOnly?: boolean;
}): Promise<ComposioToolkitSummary[]> {
  const search = options?.search?.trim().toLowerCase();
  const category = options?.category?.trim().toLowerCase();

  return snapshot.filter((toolkit) => {
    if (options?.managedOnly && !toolkit.hasManagedOAuth) return false;
    if (
      category &&
      !toolkit.categories.some((value) => value.toLowerCase() === category)
    ) {
      return false;
    }
    return !search ||
      [toolkit.slug, toolkit.name, toolkit.description].some((value) =>
        value.toLowerCase().includes(search),
      );
  }).map(cloneToolkit);
}

export async function getToolkitBySlug(
  slug: string,
): Promise<ComposioToolkitSummary | null> {
  const toolkit = bySlug.get(slug.trim().toLowerCase());
  return toolkit ? cloneToolkit(toolkit) : null;
}

function isHostOrSubdomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

/** Resolve an exact catalog slug from a provider name or documentation URL. */
export async function getToolkitByQuery(queryOrUrl: string): Promise<ComposioToolkitSummary | null> {
  const query = queryOrUrl.trim().toLowerCase();
  const direct = bySlug.get(query);
  if (direct) return cloneToolkit(direct);

  try {
    const hostname = new URL(query).hostname.replace(/^www\./, "");
    for (const [domain, slug] of providerDomainAliases) {
      if (isHostOrSubdomain(hostname, domain) && bySlug.has(slug)) {
        return cloneToolkit(bySlug.get(slug)!);
      }
    }

    for (const toolkit of snapshot) {
      if (!toolkit.appUrl) continue;
      try {
        const appHostname = new URL(toolkit.appUrl).hostname.replace(/^www\./, "");
        if (isHostOrSubdomain(hostname, appHostname)) return cloneToolkit(toolkit);
      } catch {
        // Ignore malformed catalog URLs.
      }
    }
  } catch {
    // Non-URL queries are only accepted as exact catalog slugs.
  }

  return null;
}

export async function fetchLiveToolkitMetadata(slug: string): Promise<{
  summary: ComposioToolkitSummary;
  rawAuthConfigDetails: unknown;
  epistemicStatus: "observed" | "source-supported";
} | null> {
  if (!isSafeToolkitSlug(slug)) return null;
  const normalizedSlug = slug.toLowerCase();
  const fallback = bySlug.get(normalizedSlug);
  const raw = await fetchToolkitDetail(normalizedSlug);

  if (isCompleteToolkitDetail(raw)) {
    const summary = normalizeToolkitSummary(raw, fallback);
    if (summary) {
      return {
        summary,
        rawAuthConfigDetails:
          "auth_config_details" in raw
            ? (raw as { auth_config_details?: unknown }).auth_config_details ?? null
            : null,
        epistemicStatus: "observed",
      };
    }
  }

  return fallback
    ? {
        summary: cloneToolkit(fallback),
        rawAuthConfigDetails: null,
        epistemicStatus: "source-supported",
      }
    : null;
}

export async function getCatalogStats(): Promise<{
  totalToolkits: number;
  managedOAuthCount: number;
  customOnlyCount: number;
  categories: string[];
}> {
  const managedOAuthCount = snapshot.filter(
    ({ hasManagedOAuth }) => hasManagedOAuth,
  ).length;
  return {
    totalToolkits: snapshot.length,
    managedOAuthCount,
    customOnlyCount: snapshot.length - managedOAuthCount,
    categories: [...new Set(snapshot.flatMap(({ categories }) => categories))].sort(),
  };
}
