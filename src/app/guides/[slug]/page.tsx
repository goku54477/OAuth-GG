import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { GuideViewer } from "@/components/GuideViewer";
import { getGuideBySlug, saveGuide } from "@/lib/db";
import { getGoldenGuideBySlug } from "@/lib/guides";

export const dynamic = "force-dynamic";

export default async function GuidePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const normalizedSlug = slug.trim().toLowerCase();
  let guide = await getGuideBySlug(normalizedSlug);
  if (!guide) {
    guide = getGoldenGuideBySlug(normalizedSlug);
    if (guide) await saveGuide(guide);
  }
  if (!guide) return <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 space-y-4"><AlertCircle className="w-6 h-6 text-amber-400" /><h1 className="font-sans font-bold text-2xl">Guide Not Found</h1><Link href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-200"><ArrowLeft className="w-4 h-4" />Back to Workbench</Link></div>;
  return <GuideViewer guide={guide} />;
}
