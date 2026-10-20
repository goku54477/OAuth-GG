import { NextResponse } from "next/server";

import { fetchLiveToolkitMetadata, getToolkitByQuery } from "@/lib/catalog";
import { saveGuide } from "@/lib/db";
import { generateOrResolveGuideWithDiagnostics, getGoldenGuideBySlug } from "@/lib/guides";
import { hasVerifiedProviderIdentity, retrieveProviderEvidence } from "@/lib/research";
import { LiveResearchRequestSchema, ProviderGuideSchema } from "@/types/contracts";

export async function POST(request: Request) {
  const parsed = LiveResearchRequestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid investigation request" }, { status: 400 });
  try {
    const { queryOrUrl, capabilities, officialDocumentationUrl } = parsed.data;
    const referenceGuide = getGoldenGuideBySlug(queryOrUrl);
    if (referenceGuide) {
      return NextResponse.json({
        guide: referenceGuide,
        redirectUrl: `/guides/${referenceGuide.slug}`,
        researchWarnings: [],
        generationDiagnostics: {
          providerMatched: true,
          researchDocumentCount: 0,
          officialDocumentCount: 0,
          researchDegraded: false,
          researchWarningCount: 0,
          modelAttempted: false,
          generationOutcome: "golden-guide",
        },
      });
    }
    const catalogItem = await getToolkitByQuery(queryOrUrl);
    const liveMetadata = catalogItem ? await fetchLiveToolkitMetadata(catalogItem.slug) : null;
    const researchBundle = await retrieveProviderEvidence(parsed.data, {
      trustedProviderUrls: [catalogItem?.appUrl, officialDocumentationUrl].filter(
        (value): value is string => Boolean(value),
      ),
    });
    const resolvedCatalogItem = liveMetadata?.summary ?? catalogItem;
    const providerIdentityVerified = hasVerifiedProviderIdentity(
      resolvedCatalogItem,
      researchBundle.documents,
      queryOrUrl,
    );
    if (!providerIdentityVerified) {
      return NextResponse.json(
        { error: "The provider could not be verified from catalog metadata or official documentation." },
        { status: 422 },
      );
    }

    const generated = await generateOrResolveGuideWithDiagnostics({
      queryOrUrl,
      capabilities,
      catalogItem: resolvedCatalogItem,
      catalogEpistemicStatus: liveMetadata?.epistemicStatus ?? (catalogItem ? "source-supported" : undefined),
      providerIdentityVerified,
      researchBundle,
    });
    console.info("[guide-investigation]", generated.diagnostics);
    const guide = generated.diagnostics.generationOutcome === "golden-guide"
      ? generated.guide
      : await saveGuide(ProviderGuideSchema.parse({
          ...generated.guide,
          investigationContext: {
            query: queryOrUrl,
            requestedCapabilities: capabilities,
            sourceMode: resolvedCatalogItem ? "catalog" : "official-documentation",
            ...(officialDocumentationUrl ? { officialDocumentationUrl } : {}),
          },
        }));
    return NextResponse.json({
      guide,
      redirectUrl: `/guides/${guide.slug}`,
      researchWarnings: researchBundle.warnings,
      generationDiagnostics: generated.diagnostics,
    });
  } catch {
    return NextResponse.json({ error: "Failed to investigate provider" }, { status: 500 });
  }
}
