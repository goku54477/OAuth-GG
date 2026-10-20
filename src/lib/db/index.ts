import { createClient, type Client } from "@libsql/client";
import * as fs from "node:fs";
import * as path from "node:path";

import { normalizeGuideForEvidence } from "@/lib/guides/evidence-validator";
import { getGoldenGuideBySlug } from "@/lib/guides";
import { ProviderGuideSchema, type ProviderGuide } from "@/types/contracts";

const inMemoryGuides = new Map<string, ProviderGuide>();
let dbClient: Client | null = null;
let dbInitialized = false;
let dbInitializationFailed = false;

function getFallbackFilePath(): string {
  return process.env.GUIDES_FALLBACK_FILE
    ? path.resolve(process.env.GUIDES_FALLBACK_FILE)
    : path.resolve(process.cwd(), "data", "guides-fallback.json");
}

function ensureDataDir(): void {
  try {
    fs.mkdirSync(path.dirname(getFallbackFilePath()), { recursive: true });
  } catch {
    // The in-memory store remains available if the filesystem is read-only.
  }
}

function loadFallbackFile(): Record<string, ProviderGuide> {
  try {
    const filePath = getFallbackFilePath();
    return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf-8")) : {};
  } catch {
    return {};
  }
}

function saveFallbackFile(guides: Record<string, ProviderGuide>): void {
  try {
    ensureDataDir();
    fs.writeFileSync(getFallbackFilePath(), JSON.stringify(guides, null, 2), "utf-8");
  } catch {
    // The in-memory store remains available if a local write fails.
  }
}

async function getClient(): Promise<Client | null> {
  if (dbInitializationFailed) return null;
  if (dbClient) return dbClient;
  try {
    ensureDataDir();
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL || "file:./data/guides.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    if (!dbInitialized) {
      await client.execute(`CREATE TABLE IF NOT EXISTS guides (
        slug TEXT PRIMARY KEY,
        provider_name TEXT NOT NULL,
        title TEXT NOT NULL,
        generation_mode TEXT NOT NULL,
        completeness_status TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        guide_json TEXT NOT NULL
      );`);
      dbInitialized = true;
    }
    dbClient = client;
    return client;
  } catch {
    dbInitializationFailed = true;
    return null;
  }
}

export async function saveGuide(guide: ProviderGuide): Promise<ProviderGuide> {
  if (!guide?.slug) throw new Error("Invalid guide object or missing slug");
  const safeGuide = normalizeGuideForEvidence(ProviderGuideSchema.parse(guide));
  const client = await getClient();
  if (client) {
    try {
      await client.execute({
        sql: `INSERT INTO guides (slug, provider_name, title, generation_mode, completeness_status, generated_at, guide_json)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(slug) DO UPDATE SET provider_name = excluded.provider_name, title = excluded.title,
          generation_mode = excluded.generation_mode, completeness_status = excluded.completeness_status,
          generated_at = excluded.generated_at, guide_json = excluded.guide_json;`,
        args: [safeGuide.slug, safeGuide.providerName, safeGuide.title, safeGuide.generationMode,
          safeGuide.completenessStatus, safeGuide.generatedAt, JSON.stringify(safeGuide)],
      });
    } catch {
      throw new Error("Failed to persist guide");
    }
  }
  inMemoryGuides.set(safeGuide.slug, safeGuide);
  if (safeGuide.toolkitSlug) inMemoryGuides.set(safeGuide.toolkitSlug.toLowerCase(), safeGuide);
  const fallbackRecords = loadFallbackFile();
  fallbackRecords[safeGuide.slug] = safeGuide;
  saveFallbackFile(fallbackRecords);
  return safeGuide;
}

/** Idempotently applies the integrity boundary to LibSQL and JSON records. */
export async function auditPersistedGuides(): Promise<number> {
  const guides = new Map<string, { original: ProviderGuide; canonical: ProviderGuide }>();
  const addPersistedGuide = (guide: ProviderGuide) => {
    // Old database seeds are replaced by their canonical data source rather
    // than normalized in-place; they must never win over reference guides.
    const canonicalReference = guide.generationMode === "golden-verified"
      ? getGoldenGuideBySlug(guide.slug)
      : null;
    const canonical = normalizeGuideForEvidence(canonicalReference ?? guide);
    guides.set(canonical.slug, { original: guide, canonical });
  };
  for (const guide of Object.values(loadFallbackFile())) {
    const parsed = ProviderGuideSchema.safeParse(guide);
    if (parsed.success) addPersistedGuide(parsed.data);
  }
  const client = await getClient();
  if (client) {
    try {
      const result = await client.execute("SELECT guide_json FROM guides;");
      for (const row of result.rows) {
        const parsed = ProviderGuideSchema.safeParse(JSON.parse(String(row.guide_json)));
        if (parsed.success) addPersistedGuide(parsed.data);
      }
    } catch {
      // JSON records remain migratable if a remote query fails.
    }
  }
  let changed = 0;
  for (const { original, canonical } of guides.values()) {
    if (JSON.stringify(original) !== JSON.stringify(canonical)) {
      await saveGuide(canonical);
      changed++;
    }
  }
  return changed;
}

export async function getGuideBySlug(slug: string): Promise<ProviderGuide | null> {
  if (!slug) return null;
  const normalizedSlug = slug.trim().toLowerCase();
  try {
    const client = await getClient();
    if (client) {
      const result = await client.execute({ sql: "SELECT guide_json FROM guides WHERE slug = ? LIMIT 1;", args: [normalizedSlug] });
      if (result.rows[0]?.guide_json) return ProviderGuideSchema.parse(JSON.parse(String(result.rows[0].guide_json)));
    }
  } catch {
    // Fall through to JSON and memory recovery stores.
  }
  const fallbackGuide = loadFallbackFile()[normalizedSlug];
  if (fallbackGuide) return ProviderGuideSchema.parse(fallbackGuide);
  const inMemoryGuide = inMemoryGuides.get(normalizedSlug);
  return inMemoryGuide ? ProviderGuideSchema.parse(inMemoryGuide) : null;
}

export type GuideSummary = Pick<ProviderGuide, "slug" | "providerName" | "title" | "generationMode" | "completenessStatus" | "generatedAt">;

export async function listSavedGuides(): Promise<GuideSummary[]> {
  try {
    const client = await getClient();
    if (client) {
      const result = await client.execute("SELECT slug, provider_name as providerName, title, generation_mode as generationMode, completeness_status as completenessStatus, generated_at as generatedAt FROM guides ORDER BY generated_at DESC;");
      if (result.rows.length) return result.rows.map((row) => ({
        slug: String(row.slug), providerName: String(row.providerName), title: String(row.title),
        generationMode: row.generationMode as ProviderGuide["generationMode"],
        completenessStatus: row.completenessStatus as ProviderGuide["completenessStatus"], generatedAt: String(row.generatedAt),
      }));
    }
  } catch {
    // Fall through to JSON recovery store.
  }
  return Object.values(loadFallbackFile()).map((guide) => ({
    slug: guide.slug, providerName: guide.providerName, title: guide.title, generationMode: guide.generationMode,
    completenessStatus: guide.completenessStatus, generatedAt: guide.generatedAt,
  }));
}
