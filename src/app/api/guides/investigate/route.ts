import { NextResponse } from "next/server";

import { fetchLiveToolkitMetadata, getToolkitBySlug } from "@/lib/catalog";
import { saveGuide } from "@/lib/db";
import { generateOrResolveGuide, verifyAndAuditGuide } from "@/lib/guides";
import { retrieveProviderEvidence } from "@/lib/research";
import { LiveResearchRequestSchema } from "@/types/contracts";

function toolkitSlug(queryOrUrl: string): string {
  return queryOrUrl.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[./\s]/)[0] ?? "";
}

export async function POST(request: Request) {
  const parsed = LiveResearchRequestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid investigation request" }, { status: 400 });
  try {
    const { queryOrUrl, capabilities } = parsed.data;
    const catalogItem = await getToolkitBySlug(toolkitSlug(queryOrUrl));
    const liveMetadata = catalogItem ? await fetchLiveToolkitMetadata(catalogItem.slug) : null;
    const researchBundle = await retrieveProviderEvidence(parsed.data);
    const generated = await generateOrResolveGuide({ queryOrUrl, capabilities, catalogItem: liveMetadata?.summary ?? catalogItem, researchBundle });
    const guide = verifyAndAuditGuide(generated, researchBundle.documents.map((document) => document.citation.sourceUrl));
    await saveGuide(guide);
    return NextResponse.json({ guide, redirectUrl: `/guides/${guide.slug}`, researchWarnings: researchBundle.warnings });
  } catch {
    return NextResponse.json({ error: "Failed to investigate provider" }, { status: 500 });
  }
}
