import * as fs from "node:fs";
import * as path from "node:path";

import { saveGuide } from "@/lib/db";
import type { ProviderGuide } from "@/types/contracts";

const fallbackPath = process.env.GUIDES_FALLBACK_FILE
  ? path.resolve(process.env.GUIDES_FALLBACK_FILE)
  : path.resolve(process.cwd(), "data", "guides-fallback.json");

async function main(): Promise<void> {
  if (!fs.existsSync(fallbackPath)) {
    console.info("No fallback guide file found; nothing to migrate.");
    return;
  }

  const records = JSON.parse(fs.readFileSync(fallbackPath, "utf-8")) as Record<string, ProviderGuide>;
  const uniqueGuides = new Map(Object.values(records).map((guide) => [guide.slug, guide]));

  for (const guide of uniqueGuides.values()) await saveGuide(guide);
  console.info(`Audited ${uniqueGuides.size} persisted guide records.`);
}

void main();
