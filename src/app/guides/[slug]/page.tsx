import { notFound } from "next/navigation";
import { GuideViewer } from "@/components/GuideViewer";
import { getGuideBySlug } from "@/lib/db";
import { getGoldenGuideBySlug } from "@/lib/guides";

export const dynamic = "force-dynamic";

export default async function GuidePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const normalizedSlug = slug.trim().toLowerCase();
  let guide = getGoldenGuideBySlug(normalizedSlug);
  if (!guide) guide = await getGuideBySlug(normalizedSlug);
  if (!guide) notFound();
  return <GuideViewer guide={guide} />;
}
