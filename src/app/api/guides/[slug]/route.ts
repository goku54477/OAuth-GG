import { NextResponse } from "next/server";
import { getGuideBySlug } from "@/lib/db";
import { getGoldenGuideBySlug } from "@/lib/guides";

export async function GET(_request: Request, props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const normalized = slug.trim().toLowerCase();
  let guide = getGoldenGuideBySlug(normalized);
  if (!guide) guide = await getGuideBySlug(normalized);
  return guide ? NextResponse.json({ guide }) : NextResponse.json({ error: "Guide not found", slug: normalized }, { status: 404 });
}
