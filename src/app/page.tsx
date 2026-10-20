import { WorkbenchClient } from "@/components/WorkbenchClient";
import { getCatalogStats, getCatalogToolkits } from "@/lib/catalog";
import { listSavedGuides } from "@/lib/db";
import { listGoldenGuides } from "@/lib/guides";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [toolkits, catalogStats, storedGuides] = await Promise.all([getCatalogToolkits(), getCatalogStats(), listSavedGuides()]);
  const goldenGuides = listGoldenGuides().map(({ slug, providerName, title, generationMode, completenessStatus, generatedAt }) => ({
    slug, providerName, title, generationMode, completenessStatus, generatedAt,
  }));
  const savedGuides = [...new Map([...storedGuides, ...goldenGuides].map((guide) => [guide.slug, guide])).values()];
  return <WorkbenchClient initialToolkits={toolkits} catalogStats={catalogStats} savedGuides={savedGuides} />;
}
