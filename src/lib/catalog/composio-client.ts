import {
  ComposioToolkitSummarySchema,
  type ComposioToolkitSummary,
} from "@/types/contracts";

const API_BASE = "https://backend.composio.dev/api/v3.1/toolkits";
const SAFE_SLUG = /^[a-z0-9_-]{1,64}$/i;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

async function requestJson(
  url: string,
  apiKey: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...(init?.body ? { "content-type": "application/json" } : {}),
        "x-api-key": apiKey,
        ...init?.headers,
      },
      signal: AbortSignal.timeout(5_000),
    });
    return {
      ok: response.ok,
      status: response.status,
      body: response.ok ? await response.json() : null,
    };
  } catch {
    return { ok: false, status: 0, body: null };
  }
}

export function isSafeToolkitSlug(slug: string): boolean {
  return SAFE_SLUG.test(slug);
}

export async function fetchToolkitList(
  apiKey = process.env.COMPOSIO_API_KEY,
): Promise<unknown[] | null> {
  if (!apiKey) return null;
  const result = await requestJson(`${API_BASE}?limit=250&sort_by=usage`, apiKey);
  if (!result.ok || !isObject(result.body) || !Array.isArray(result.body.items)) {
    return null;
  }
  return result.body.items;
}

export async function fetchToolkitDetail(
  slug: string,
  apiKey = process.env.COMPOSIO_API_KEY,
): Promise<unknown | null> {
  if (!apiKey || !isSafeToolkitSlug(slug)) return null;
  const result = await requestJson(
    `${API_BASE}/${encodeURIComponent(slug)}`,
    apiKey,
  );
  return result.ok ? result.body : null;
}

export async function fetchRecommendedScopes(
  slug: string,
  apiKey = process.env.COMPOSIO_API_KEY,
  tools: string[] = [],
): Promise<unknown | null> {
  if (!apiKey || !isSafeToolkitSlug(slug)) return null;
  const result = await requestJson(
    `${API_BASE}/${encodeURIComponent(slug)}/scopes/recommended`,
    apiKey,
    { method: "POST", body: JSON.stringify({ tools }) },
  );
  if ([404, 422, 501].includes(result.status)) return null;
  return result.ok ? result.body : null;
}

export function normalizeToolkitSummary(
  raw: unknown,
  fallback?: ComposioToolkitSummary,
): ComposioToolkitSummary | null {
  if (!isObject(raw)) return null;
  const meta = isObject(raw.meta) ? raw.meta : {};
  const slug = typeof raw.slug === "string" ? raw.slug.toLowerCase() : fallback?.slug;
  const name = typeof raw.name === "string" ? raw.name : fallback?.name;
  if (!slug || !name || !isSafeToolkitSlug(slug)) return null;

  const authSchemes = strings(raw.auth_schemes);
  const managedSchemes = strings(raw.composio_managed_auth_schemes);
  const authDetails = Array.isArray(raw.auth_config_details)
    ? raw.auth_config_details
    : [];
  const requiredAuthCreationFields = authDetails.flatMap((detail) => {
    if (!isObject(detail) || !isObject(detail.fields)) return [];
    const creation = isObject(detail.fields.auth_config_creation)
      ? detail.fields.auth_config_creation
      : {};
    return Array.isArray(creation.required)
      ? creation.required.flatMap((field) =>
          isObject(field) && typeof field.name === "string" ? [field.name] : [],
        )
      : [];
  });
  const categories = Array.isArray(meta.categories)
    ? meta.categories.flatMap((category) =>
        isObject(category) && typeof category.name === "string"
          ? [category.name]
          : [],
      )
    : [];

  const candidate = {
    slug,
    name,
    description:
      typeof meta.description === "string"
        ? meta.description
        : fallback?.description ?? `Connect ${name} through Composio.`,
    ...(typeof meta.logo === "string" ? { logoUrl: meta.logo } : {}),
    ...(typeof meta.app_url === "string" ? { appUrl: meta.app_url } : {}),
    categories: categories.length ? categories : fallback?.categories ?? [],
    authSchemes: authSchemes.length ? authSchemes : fallback?.authSchemes ?? [],
    composioManagedAuthSchemes: managedSchemes.length
      ? managedSchemes
      : fallback?.composioManagedAuthSchemes ?? [],
    hasManagedOAuth: (managedSchemes.length
      ? managedSchemes
      : fallback?.composioManagedAuthSchemes ?? []
    ).some((scheme) => scheme.toLowerCase().includes("oauth")),
    requiresCustomAppForProduction:
      fallback?.requiresCustomAppForProduction ?? true,
    requiredAuthCreationFields: requiredAuthCreationFields.length
      ? [...new Set(requiredAuthCreationFields)]
      : fallback?.requiredAuthCreationFields ?? [],
    toolsCount:
      typeof meta.tools_count === "number"
        ? meta.tools_count
        : fallback?.toolsCount ?? 0,
    triggersCount:
      typeof meta.triggers_count === "number"
        ? meta.triggers_count
        : fallback?.triggersCount ?? 0,
    ...(fallback?.goldenGuideSlug
      ? { goldenGuideSlug: fallback.goldenGuideSlug }
      : {}),
  };

  const parsed = ComposioToolkitSummarySchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
