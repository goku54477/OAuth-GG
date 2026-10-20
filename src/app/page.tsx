import { WorkbenchClient } from "@/components/WorkbenchClient";
import { listSavedGuides } from "@/lib/db";
import { SEED_TOOLKITS } from "@/app/api/catalog/route";
import type { ComposioToolkitSummary } from "@/types/contracts";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let toolkits: ComposioToolkitSummary[] = SEED_TOOLKITS;

  // Try loading merged catalog if present
  try {
    const catalogPath: string = "@/lib/catalog";
    const catalogModule = await import(catalogPath);
    if (catalogModule && typeof catalogModule.getCatalogToolkits === "function") {
      const dynamicToolkits = await catalogModule.getCatalogToolkits();
      if (Array.isArray(dynamicToolkits) && dynamicToolkits.length > 0) {
        toolkits = dynamicToolkits;
      }
    }
  } catch {
    // Fallback to SEED_TOOLKITS
  }

  const savedGuides = await listSavedGuides();

  return (
    <WorkbenchClient
      initialToolkits={toolkits}
      savedGuides={savedGuides}
    />
  );
}
