import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  ComposioToolkitSummarySchema,
  type ComposioToolkitSummary,
} from "@/types/contracts";
import {
  fetchToolkitDetail,
  fetchToolkitList,
  normalizeToolkitSummary,
} from "@/lib/catalog/composio-client";

const snapshotPath = path.resolve("src/data/composio-catalog.snapshot.json");

async function main(): Promise<void> {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    console.log("COMPOSIO_API_KEY is unset; existing snapshot kept.");
    return;
  }

  const existing = ComposioToolkitSummarySchema.array().parse(
    JSON.parse(await readFile(snapshotPath, "utf8")),
  );
  const existingBySlug = new Map(existing.map((item) => [item.slug, item]));
  const liveItems = await fetchToolkitList(apiKey);
  if (!liveItems || liveItems.length < 100) {
    throw new Error("Composio returned an incomplete toolkit catalog; snapshot kept.");
  }
  const liveCatalog = liveItems;

  let nextIndex = 0;
  const output: ComposioToolkitSummary[] = [];
  async function worker(): Promise<void> {
    while (nextIndex < liveCatalog.length) {
      const item = liveCatalog[nextIndex++];
      const listSummary = normalizeToolkitSummary(item);
      if (!listSummary) continue;
      const fallback = existingBySlug.get(listSummary.slug) ?? listSummary;
      const detail = await fetchToolkitDetail(listSummary.slug, apiKey);
      const summary = normalizeToolkitSummary(detail ?? item, fallback);
      if (summary) output.push(summary);
    }
  }
  await Promise.all(Array.from({ length: 5 }, () => worker()));

  const validated = ComposioToolkitSummarySchema.array().parse(
    output.sort((a, b) => a.slug.localeCompare(b.slug)),
  );
  if (validated.length < 100 || new Set(validated.map(({ slug }) => slug)).size !== validated.length) {
    throw new Error("Synced catalog failed count or uniqueness checks; snapshot kept.");
  }

  const temporaryPath = `${snapshotPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await rename(temporaryPath, snapshotPath);
  console.log(`Synced ${validated.length} Composio toolkits.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Catalog sync failed.");
  process.exitCode = 1;
});
