import { WorkbenchClient } from "@/components/WorkbenchClient";
import { getCatalogStats, getCatalogToolkits } from "@/lib/catalog";
import { listSavedGuides } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [toolkits, catalogStats, savedGuides] = await Promise.all([getCatalogToolkits(), getCatalogStats(), listSavedGuides()]);
  return <WorkbenchClient initialToolkits={toolkits} catalogStats={catalogStats} savedGuides={savedGuides} />;
}
