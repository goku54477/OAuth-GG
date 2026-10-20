import { NextResponse } from "next/server";
import { getGuideBySlug, saveGuide } from "@/lib/db";
import { getGoldenGuideBySlug } from "@/lib/guides";

export async function GET(_request: Request, props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const normalized = slug.trim().toLowerCase();
  let guide = await getGuideBySlug(normalized);
  if (!guide) {
    guide = getGoldenGuideBySlug(normalized);
    if (guide) await saveGuide(guide);
  }
  return guide ? NextResponse.json({ guide }) : NextResponse.json({ error: "Guide not found", slug: normalized }, { status: 404 });
}
