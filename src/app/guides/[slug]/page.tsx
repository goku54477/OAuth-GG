import { notFound } from "next/navigation";
import { getGuideBySlug, GOLDEN_GUIDES_SEED, saveGuide } from "@/lib/db";
import { GuideViewer } from "@/components/GuideViewer";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GuidePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const normalizedSlug = (slug || "").trim().toLowerCase();

  let guide = await getGuideBySlug(normalizedSlug);

  if (!guide && GOLDEN_GUIDES_SEED[normalizedSlug]) {
    guide = GOLDEN_GUIDES_SEED[normalizedSlug];
    await saveGuide(guide);
  }

  if (!guide) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="font-sans font-bold text-2xl text-slate-100">Guide Not Found</h1>
        <p className="text-slate-400 text-sm max-w-md text-center">
          No OAuth guide was found for slug <code className="font-mono text-slate-200">"{slug}"</code>.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-sans text-xs transition-colors border border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Workbench</span>
        </Link>
      </div>
    );
  }

  return <GuideViewer guide={guide} />;
}
