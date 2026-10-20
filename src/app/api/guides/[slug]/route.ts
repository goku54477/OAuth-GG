import { NextResponse } from "next/server";
import { getGuideBySlug, GOLDEN_GUIDES_SEED, saveGuide } from "@/lib/db";

export async function GET(
  request: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const { slug } = await props.params;
  if (!slug) {
    return NextResponse.json({ error: "Missing slug parameter" }, { status: 400 });
  }

  const normalized = slug.trim().toLowerCase();

  // 1. Try DB / Fallback
  let guide = await getGuideBySlug(normalized);

  // 2. If not found in DB, check golden guides seed directly
  if (!guide && GOLDEN_GUIDES_SEED[normalized]) {
    guide = GOLDEN_GUIDES_SEED[normalized];
    await saveGuide(guide);
  }

  if (!guide) {
    return NextResponse.json(
      { error: "Guide not found", slug: normalized },
      { status: 404 }
    );
  }

  return NextResponse.json({ guide });
}
