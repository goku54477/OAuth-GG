"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, Clipboard, Code2, Download, ExternalLink, FileCheck2, Layers3, Share2, ShieldCheck } from "lucide-react";
import type { ClaimItem, EvidenceCitation, ProviderGuide } from "@/types/contracts";
import { EpistemicBadge, ProvenanceDrawer } from "@/components/ProvenanceDrawer";
import {
  formatGuideDate,
  getGuideGenerationLabel,
  getManagedOAuthLabel,
  guideToMarkdown,
  hasSubstantiveGuideComparison,
} from "@/components/workbench-utils";

interface GuideViewerProps { guide: ProviderGuide }

function CitationBadges({ citationIds, status, claim, notes, onInspect }: {
  citationIds: string[];
  status: ClaimItem["epistemicStatus"];
  claim: string;
  notes?: string;
  onInspect: (citationId: string, claim: string, notes?: string) => void;
}) {
  if (!citationIds.length) return <EpistemicBadge status={status} />;
  return <span className="flex flex-wrap gap-1">{citationIds.map((citationId) => (
    <button key={citationId} type="button" onClick={() => onInspect(citationId, claim, notes)} className="focus-ring shrink-0 rounded"><EpistemicBadge status={status} /></button>
  ))}</span>;
}

function ClaimList({ title, items, onInspect }: { title: string; items: ClaimItem[]; onInspect: (citationId: string, claim: string, notes?: string) => void }) {
  if (!items.length) return null;
  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-4 divide-y divide-white/10">
        {items.map((item, index) => (
          <article key={`${title}-${index}`} className="py-4 first:pt-0 last:pb-0">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
              <p className="text-sm leading-6 text-zinc-300">{item.claim}</p>
              <CitationBadges citationIds={item.citationIds} status={item.epistemicStatus} claim={item.claim} notes={item.notes} onInspect={onInspect} />
            </div>
            {item.notes && <p className="mt-2 text-xs leading-5 text-zinc-500">{item.notes}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

export const GuideViewer: React.FC<GuideViewerProps> = ({ guide }) => {
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<EvidenceCitation | null>(null);
  const [activeClaim, setActiveClaim] = useState<string | null>(null);
  const [activeNotes, setActiveNotes] = useState<string | null>(null);
  const activeVariant = guide.variants[selectedVariantIndex] ?? guide.variants[0];
  const hasComparison = hasSubstantiveGuideComparison(guide);
  const documentedScopes = guide.variants.flatMap((variant) => variant.scopes);
  const citationMap = useMemo(() => new Map(guide.citations.map((citation) => [citation.id, citation])), [guide.citations]);
  const known = (value: string) => value.trim().toLowerCase() !== "unknown";

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  };

  const inspect = (citationId: string, claim: string, notes?: string) => {
    const citation = citationMap.get(citationId);
    if (!citation) return;
    setActiveCitation(citation);
    setActiveClaim(claim);
    setActiveNotes(notes ?? null);
  };

  const exportMarkdown = () => {
    const url = URL.createObjectURL(new Blob([guideToMarkdown(guide)], { type: "text/markdown" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${guide.slug}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-obsidian text-zinc-300">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#090a0f]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" aria-label="Back to workbench" className="focus-ring rounded-md p-1.5 text-zinc-500 hover:bg-white/[0.05] hover:text-white"><ArrowLeft className="h-4 w-4" /></Link>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.04] font-mono text-xs font-semibold text-white">AB</span>
            <div className="min-w-0"><p className="truncate text-xs font-medium text-zinc-200">{guide.providerName}</p><p className="truncate font-mono text-[10px] text-zinc-600">{guide.slug}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => copyText(window.location.href, "url")} className="button-secondary">{copied === "url" ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}<span className="hidden sm:inline">{copied === "url" ? "Copied" : "Share"}</span></button>
            <button type="button" onClick={exportMarkdown} className="button-secondary"><Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">Export</span></button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:py-12">
        <section className="grid gap-8 border-b border-white/10 pb-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] lg:items-end">
          <div>
            <div className="flex flex-wrap gap-2"><span className="tag text-emerald-300">{getGuideGenerationLabel(guide)}</span><span className="tag">{guide.completenessStatus}</span></div>
            <h1 className="mt-5 max-w-4xl text-3xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">{guide.title}</h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">{guide.subtitle}</p>
          </div>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 text-sm">
            <div className="bg-[#0e1015] p-4"><dt className="text-[10px] uppercase tracking-wider text-zinc-600">Generated</dt><dd className="mt-2 font-mono text-xs text-zinc-300">{formatGuideDate(guide.generatedAt)}</dd></div>
            <div className="bg-[#0e1015] p-4"><dt className="text-[10px] uppercase tracking-wider text-zinc-600">Managed OAuth</dt><dd className="mt-2 font-mono text-xs text-zinc-300">{getManagedOAuthLabel(guide.composioIntegration)}</dd></div>
          </dl>
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(310px,0.7fr)]">
          <div className="space-y-6">
            <section className="panel overflow-hidden">
              <div className="border-b border-white/10 p-5 sm:p-6"><p className="eyebrow"><ShieldCheck className="h-3.5 w-3.5" /> Composio auth strategy</p><p className="mt-4 text-sm leading-7 text-zinc-300">{guide.composioIntegration.managedVsCustomVerdict}</p><div className="mt-3"><EpistemicBadge status={guide.composioIntegration.epistemicStatus} /></div></div>
              {guide.composioIntegration.customAuthConfigSnippet && <div><div className="flex items-center justify-between border-b border-white/10 px-5 py-3"><span className="flex items-center gap-2 text-xs font-medium text-zinc-400"><Code2 className="h-3.5 w-3.5" /> Provided configuration</span><button type="button" onClick={() => copyText(guide.composioIntegration.customAuthConfigSnippet, "snippet")} className="focus-ring rounded-md p-1.5 text-zinc-500 hover:bg-white/[0.05] hover:text-white" aria-label="Copy configuration snippet">{copied === "snippet" ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Clipboard className="h-3.5 w-3.5" />}</button></div><pre className="overflow-x-auto whitespace-pre-wrap break-words bg-black/30 p-5 text-xs leading-6 text-zinc-300"><code>{guide.composioIntegration.customAuthConfigSnippet}</code></pre></div>}
              {guide.composioIntegration.composioRedirectUriHint && <div className="flex flex-col justify-between gap-2 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center"><div><p className="text-[10px] uppercase tracking-wider text-zinc-600">Redirect URI hint</p><code className="mt-1 block break-all text-xs text-zinc-300">{guide.composioIntegration.composioRedirectUriHint}</code></div><button type="button" onClick={() => copyText(guide.composioIntegration.composioRedirectUriHint, "redirect")} className="button-secondary self-start">{copied === "redirect" ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />} Copy</button></div>}
            </section>

            {hasComparison ? <section className="panel p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow"><Layers3 className="h-3.5 w-3.5" /> Capability variants</p><h2 className="mt-3 text-lg font-semibold text-white">Scope and review comparison</h2></div><span className="font-mono text-xs text-zinc-600">{guide.variants.length} variant{guide.variants.length === 1 ? "" : "s"}</span></div>
              {guide.variants.length > 1 && <div role="tablist" aria-label="Capability variants" className="mt-5 flex flex-wrap gap-2">{guide.variants.map((variant, index) => <button key={variant.variantId} type="button" role="tab" aria-selected={selectedVariantIndex === index} onClick={() => setSelectedVariantIndex(index)} className={`focus-ring rounded-md border px-3 py-2 text-left text-xs transition ${selectedVariantIndex === index ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-white/10 text-zinc-500 hover:text-white"}`}>{variant.title}</button>)}</div>}
              <article className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4 sm:p-5"><h3 className="text-base font-semibold text-white">{activeVariant.title}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{activeVariant.summary}</p>{[activeVariant.recommendedAppType, activeVariant.estimatedReviewTimeline, activeVariant.securityAuditRequired].some(known) && <dl className="mt-5 grid gap-3 sm:grid-cols-3">{known(activeVariant.recommendedAppType) && <div className="panel-muted p-3"><dt className="text-[10px] uppercase tracking-wider text-zinc-600">App type</dt><dd className="mt-2 text-xs leading-5 text-zinc-300">{activeVariant.recommendedAppType}</dd></div>}{known(activeVariant.estimatedReviewTimeline) && <div className="panel-muted p-3"><dt className="text-[10px] uppercase tracking-wider text-zinc-600">Review timeline</dt><dd className="mt-2 text-xs leading-5 text-zinc-300">{activeVariant.estimatedReviewTimeline}</dd></div>}{known(activeVariant.securityAuditRequired) && <div className="panel-muted p-3"><dt className="text-[10px] uppercase tracking-wider text-zinc-600">Security audit</dt><dd className="mt-2 text-xs leading-5 text-zinc-300">{activeVariant.securityAuditRequired}</dd></div>}</dl>}{known(activeVariant.approvalGateSummary) && <div className="mt-4 panel-muted p-3"><p className="text-[10px] uppercase tracking-wider text-zinc-600">Approval gate</p><p className="mt-2 text-xs leading-5 text-zinc-300">{activeVariant.approvalGateSummary}</p></div>}
                {activeVariant.scopes.length > 0 && <div className="mt-5"><h4 className="text-xs font-medium text-zinc-400">Requested scopes</h4><div className="mt-2 divide-y divide-white/10 rounded-lg border border-white/10">{activeVariant.scopes.map((scope) => <div key={scope.scope} className="p-3"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><code className="text-xs text-emerald-300">{scope.scope}</code><p className="mt-1 text-xs text-zinc-500">{scope.requiredForCapability}</p></div><CitationBadges citationIds={scope.citationIds} status={scope.epistemicStatus} claim={`${scope.scope}: ${scope.requiredForCapability}`} onInspect={inspect} /></div><div className="mt-2 flex flex-wrap gap-2"><span className="tag">{scope.classification}</span>{scope.triggersExternalReview && <span className="tag text-amber-300">External review</span>}{scope.triggersSecurityAudit && <span className="tag text-amber-300">Security audit</span>}</div>{scope.leastPrivilegeAlternative && <p className="mt-2 text-xs text-zinc-500">Least-privilege alternative: {scope.leastPrivilegeAlternative}</p>}</div>)}</div></div>}
                {(activeVariant.pros.length > 0 || activeVariant.cons.length > 0) && <div className="mt-5 grid gap-4 sm:grid-cols-2">{activeVariant.pros.length > 0 && <div><h4 className="text-xs font-medium text-emerald-300">Advantages</h4><ul className="mt-2 space-y-2 text-xs leading-5 text-zinc-400">{activeVariant.pros.map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />{item}</li>)}</ul></div>}{activeVariant.cons.length > 0 && <div><h4 className="text-xs font-medium text-amber-300">Constraints</h4><ul className="mt-2 space-y-2 text-xs leading-5 text-zinc-400">{activeVariant.cons.map((item) => <li key={item} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />{item}</li>)}</ul></div>}</div>}
              </article>
            </section> : documentedScopes.length > 0 ? <section className="panel p-5 sm:p-6"><p className="eyebrow"><Layers3 className="h-3.5 w-3.5" /> Provider permissions</p><h2 className="mt-3 text-lg font-semibold text-white">Documented provider permissions</h2><p className="mt-2 text-sm leading-6 text-zinc-400">Permission names are source-backed; requested capability coverage remains unverified.</p><div className="mt-5 divide-y divide-white/10 rounded-lg border border-white/10">{documentedScopes.map((scope) => <div key={scope.scope} className="flex items-center justify-between gap-3 p-3"><code className="text-xs text-emerald-300">{scope.scope}</code><CitationBadges citationIds={scope.citationIds} status={scope.epistemicStatus} claim={scope.requiredForCapability} onInspect={inspect} /></div>)}</div></section> : <section className="panel p-5 sm:p-6"><div className="flex items-center gap-2 text-amber-300"><AlertTriangle className="h-4 w-4" /><h2 className="text-sm font-semibold">Research incomplete</h2></div><p className="mt-3 text-sm leading-6 text-zinc-400">No substantive capability or scope comparison was verified for this partial guide.</p></section>}

            {guide.registrationSteps.length > 0 && <section className="panel p-5 sm:p-6"><p className="eyebrow"><FileCheck2 className="h-3.5 w-3.5" /> Provider registration</p><h2 className="mt-3 text-lg font-semibold text-white">Configuration walkthrough</h2><ol className="mt-5 space-y-3">{guide.registrationSteps.map((step) => <li key={step.stepNumber} className="rounded-lg border border-white/10 bg-black/20 p-4"><div className="flex items-start gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-zinc-100 font-mono text-xs font-semibold text-[#090a0f]">{step.stepNumber}</span><div className="min-w-0 flex-1"><div className="flex flex-col justify-between gap-2 sm:flex-row"><h3 className="text-sm font-semibold text-white">{step.title}</h3><CitationBadges citationIds={step.citationIds} status={step.epistemicStatus} claim={step.instructions} onInspect={inspect} /></div><p className="mt-1 font-mono text-[11px] text-emerald-300/80">{step.consolePath}</p><p className="mt-3 text-sm leading-6 text-zinc-400">{step.instructions}</p>{step.criticalConfigValues.length > 0 && <dl className="mt-3 grid gap-2 sm:grid-cols-2">{step.criticalConfigValues.map((value) => <div key={`${step.stepNumber}-${value.label}`} className="panel-muted p-3"><dt className="text-[10px] uppercase tracking-wider text-zinc-600">{value.label}</dt><dd className="mt-1 break-all font-mono text-xs text-zinc-300">{value.value}</dd></div>)}</dl>}</div></div></li>)}</ol></section>}

            <ClaimList title="Testing and sandbox rules" items={guide.testingAndSandboxRules} onInspect={inspect} />
            <ClaimList title="Distribution and review checklist" items={guide.distributionAndReviewChecklist} onInspect={inspect} />
            <ClaimList title="Practical observations" items={guide.practicalObservations} onInspect={inspect} />
          </div>

          <aside className="space-y-6">
            {guide.explicitUnknowns.length > 0 && <section className="rounded-lg border border-amber-400/20 bg-amber-400/[0.05] p-5"><div className="flex items-center gap-2 text-amber-300"><AlertTriangle className="h-4 w-4" /><h2 className="text-sm font-semibold">Explicit unknowns</h2></div><ul className="mt-4 space-y-3 text-xs leading-5 text-amber-100/70">{guide.explicitUnknowns.map((item) => <li key={item} className="border-l border-amber-400/30 pl-3">{item}</li>)}</ul></section>}
            {guide.citations.length > 0 && <section className="panel p-5"><h2 className="text-sm font-semibold text-white">Evidence sources</h2><div className="mt-4 space-y-3">{guide.citations.map((citation) => <article key={citation.id} className="rounded-lg border border-white/10 bg-black/20 p-3"><EpistemicBadge status={citation.epistemicStatus} /><h3 className="mt-2 text-xs font-medium leading-5 text-zinc-300">{citation.sourceTitle}</h3><p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">{citation.authorityType}</p>{citation.sourceUrl.startsWith("https://") && <a href={citation.sourceUrl} target="_blank" rel="noreferrer noopener" className="focus-ring mt-3 inline-flex items-center gap-1 rounded text-xs text-emerald-300 hover:text-emerald-200">Open source <ExternalLink className="h-3.5 w-3.5" /></a>}</article>)}</div></section>}
          </aside>
        </div>
      </main>

      <ProvenanceDrawer isOpen={Boolean(activeCitation)} onClose={() => setActiveCitation(null)} citation={activeCitation} activeClaim={activeClaim} notes={activeNotes} />
    </div>
  );
};
