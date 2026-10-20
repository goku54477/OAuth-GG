import { NextResponse } from "next/server";

import { fetchLiveToolkitMetadata, getToolkitByQuery } from "@/lib/catalog";
import { saveGuide } from "@/lib/db";
import { generateOrResolveGuide, verifyAndAuditGuide } from "@/lib/guides";
import { retrieveProviderEvidence } from "@/lib/research";
import { LiveResearchRequestSchema } from "@/types/contracts";

export async function POST(request: Request) {
  const parsed = LiveResearchRequestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid investigation request" }, { status: 400 });
  try {
    const { queryOrUrl, capabilities } = parsed.data;
    const catalogItem = await getToolkitByQuery(queryOrUrl);
    const liveMetadata = catalogItem ? await fetchLiveToolkitMetadata(catalogItem.slug) : null;
    const researchBundle = await retrieveProviderEvidence(parsed.data);
    const generated = await generateOrResolveGuide({ queryOrUrl, capabilities, catalogItem: liveMetadata?.summary ?? catalogItem, researchBundle });
    const allowedSourceUrls = researchBundle.documents
      .filter((document) => document.citation.authorityType === "official-provider-docs")
      .map((document) => document.citation.sourceUrl);
    const guide = verifyAndAuditGuide(generated, [...allowedSourceUrls]);
    await saveGuide(guide);
    return NextResponse.json({ guide, redirectUrl: `/guides/${guide.slug}`, researchWarnings: researchBundle.warnings });
  } catch {
    return NextResponse.json({ error: "Failed to investigate provider" }, { status: 500 });
  }
}
