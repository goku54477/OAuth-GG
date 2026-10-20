"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, ExternalLink, KeyRound, Layers3, Loader2, Search, ShieldCheck, Wrench } from "lucide-react";
import type { ComposioToolkitSummary, ProviderGuide } from "@/types/contracts";
import { getVisibleCatalogItems, normalizeWorkbenchTab, readGuideRedirect, type WorkbenchTab } from "@/components/workbench-utils";

interface WorkbenchClientProps {
  initialToolkits: ComposioToolkitSummary[];
  catalogStats: { totalToolkits: number; managedOAuthCount: number; customOnlyCount: number; categories: string[] };
  savedGuides: Array<Pick<ProviderGuide, "slug" | "providerName" | "title" | "generationMode" | "completenessStatus" | "generatedAt">>;
}

const CAPABILITIES = [
  { id: "read", label: "Read data" },
  { id: "write", label: "Write or modify" },
  { id: "bot", label: "Bot or webhooks" },
  { id: "external-distribution", label: "External distribution" },
];

function setTabInUrl(tab: WorkbenchTab) {
  const url = new URL(window.location.href);
  if (tab === "interactive-guides") url.searchParams.delete("tab");
  else url.searchParams.set("tab", tab);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export const WorkbenchClient: React.FC<WorkbenchClientProps> = ({ initialToolkits, catalogStats, savedGuides }) => {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState<WorkbenchTab>("interactive-guides");
  const [queryInput, setQueryInput] = useState("");
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>(["read", "write", "external-distribution"]);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [investigationError, setInvestigationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [managedOAuthOnly, setManagedOAuthOnly] = useState(false);
  const [visibleCatalogCount, setVisibleCatalogCount] = useState(60);

  useEffect(() => {
    setCurrentTab(normalizeWorkbenchTab(new URLSearchParams(window.location.search).get("tab")));
  }, []);

  const selectTab = (tab: WorkbenchTab) => {
    setCurrentTab(tab);
    setTabInUrl(tab);
  };

  const filteredToolkits = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return initialToolkits.filter((toolkit) => {
      const matchesQuery = !query || toolkit.name.toLowerCase().includes(query) || toolkit.slug.toLowerCase().includes(query) || toolkit.description.toLowerCase().includes(query);
      const matchesCategory = selectedCategory === "All" || toolkit.categories.some((category) => category === selectedCategory);
      return matchesQuery && matchesCategory && (!managedOAuthOnly || toolkit.hasManagedOAuth);
    });
  }, [initialToolkits, managedOAuthOnly, searchQuery, selectedCategory]);
  const visibleToolkits = getVisibleCatalogItems(filteredToolkits, visibleCatalogCount);

  useEffect(() => {
    setVisibleCatalogCount(60);
  }, [managedOAuthOnly, searchQuery, selectedCategory]);

  const toggleCapability = (capability: string) => {
    setSelectedCapabilities((current) => current.includes(capability) ? current.filter((item) => item !== capability) : [...current, capability]);
  };

  const investigate = async (event: React.FormEvent) => {
    event.preventDefault();
    const queryOrUrl = queryInput.trim();
    if (!queryOrUrl || isInvestigating) return;
    setIsInvestigating(true);
    setInvestigationError(null);
    try {
      const response = await fetch("/api/guides/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queryOrUrl, capabilities: selectedCapabilities, forceRefresh: false }),
      });
      if (!response.ok) throw new Error("request failed");
      const redirect = readGuideRedirect(await response.json());
      if (!redirect) throw new Error("invalid response");
      router.push(redirect);
    } catch {
      setInvestigationError("Investigation could not be completed. Check the provider name or URL and try again.");
      setIsInvestigating(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-zinc-300">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#090a0f]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between px-4 sm:px-6">
          <button type="button" onClick={() => selectTab("interactive-guides")} className="focus-ring flex items-center gap-3 rounded-md text-left">
            <span className="grid h-7 w-7 place-items-center rounded-md border border-white/10 bg-white/[0.04] font-mono text-xs font-semibold text-white">AB</span>
            <span><span className="block text-sm font-semibold tracking-tight text-white">AuthBench</span><span className="hidden text-[10px] text-zinc-500 sm:block">OAuth readiness workbench</span></span>
          </button>
          <nav aria-label="Workbench views" className="flex items-center rounded-lg border border-white/10 bg-white/[0.03] p-1">
            {([["interactive-guides", "Guides"], ["workbench-catalog", "Catalog"]] as const).map(([tab, label]) => (
              <button key={tab} type="button" aria-current={currentTab === tab ? "page" : undefined} onClick={() => selectTab(tab)} className={`focus-ring rounded-md px-3 py-1.5 text-xs font-medium transition ${currentTab === tab ? "bg-zinc-100 text-[#090a0f]" : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"}`}>{label}</button>
            ))}
          </nav>
          <button type="button" onClick={() => selectTab("workbench-catalog")} className="focus-ring hidden items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 md:flex">
            <Layers3 className="h-3.5 w-3.5 text-emerald-400" /><span className="font-mono">{catalogStats.totalToolkits.toLocaleString()} toolkits</span>
          </button>
        </div>
      </header>

      {currentTab === "interactive-guides" ? (
        <main className="mx-auto w-full max-w-[1500px] px-4 py-10 sm:px-6 lg:py-14">
          <section className="grid gap-8 border-b border-white/10 pb-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)] lg:items-end">
            <div>
              <p className="eyebrow"><ShieldCheck className="h-3.5 w-3.5" /> Evidence-aware OAuth research</p>
              <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">Map permissions before provider review maps them for you.</h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">Research provider registration, scope boundaries, testing rules, and app-review requirements. Every generated guide distinguishes sourced claims from observations, estimates, and unknowns.</p>
            </div>
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10">
              {([[catalogStats.totalToolkits, "Catalog"], [catalogStats.managedOAuthCount, "Managed OAuth"], [savedGuides.length, "Saved guides"]] as const).map(([value, label]) => (
                <div key={label} className="bg-[#0e1015] px-3 py-4 text-center"><div className="font-mono text-lg font-semibold text-white">{value.toLocaleString()}</div><div className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">{label}</div></div>
              ))}
            </div>
          </section>

          <section aria-labelledby="investigate-heading" className="mt-10 panel p-5 sm:p-7">
            <div className="flex items-start gap-3"><div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-2 text-emerald-300"><Search className="h-4 w-4" /></div><div><h2 id="investigate-heading" className="text-base font-semibold text-white">Investigate a provider</h2><p className="mt-1 text-sm text-zinc-500">Enter a provider name or official documentation URL.</p></div></div>
            <form onSubmit={investigate} className="mt-6 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="sr-only" htmlFor="provider-query">Provider name or documentation URL</label>
                <input id="provider-query" value={queryInput} onChange={(event) => setQueryInput(event.target.value)} placeholder="Stripe or https://docs.stripe.com/connect/oauth-reference" disabled={isInvestigating} className="input-field flex-1" />
                <button type="submit" disabled={!queryInput.trim() || isInvestigating} className="button-primary min-w-44 disabled:cursor-not-allowed disabled:opacity-50">{isInvestigating ? <><Loader2 className="h-4 w-4 animate-spin" /> Investigating…</> : <>Start investigation <ArrowRight className="h-4 w-4" /></>}</button>
              </div>
              <fieldset><legend className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Required capabilities</legend><div className="flex flex-wrap gap-2">
                {CAPABILITIES.map((capability) => { const selected = selectedCapabilities.includes(capability.id); return <button key={capability.id} type="button" aria-pressed={selected} onClick={() => toggleCapability(capability.id)} className={`focus-ring rounded-md border px-3 py-1.5 text-xs transition ${selected ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/[0.02] text-zinc-400 hover:text-white"}`}>{selected && <CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5" />}{capability.label}</button>; })}
              </div></fieldset>
              {investigationError && <p role="alert" className="rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300">{investigationError}</p>}
            </form>
          </section>

          <section aria-labelledby="saved-guides-heading" className="mt-12">
            <div className="flex items-end justify-between gap-4"><div><p className="eyebrow"><BookOpen className="h-3.5 w-3.5" /> Persisted research</p><h2 id="saved-guides-heading" className="mt-3 text-xl font-semibold text-white">Saved guides</h2></div><span className="font-mono text-xs text-zinc-500">{savedGuides.length} available</span></div>
            {savedGuides.length ? <div className="mt-5 grid gap-3 lg:grid-cols-3">{savedGuides.map((guide) => (
              <Link key={guide.slug} href={`/guides/${guide.slug}`} className="focus-ring group panel flex min-h-40 flex-col p-5 transition hover:-translate-y-0.5 hover:border-white/20"><div className="flex items-center justify-between gap-3"><span className="tag">{guide.generationMode}</span><span className="text-[10px] uppercase tracking-wider text-zinc-600">{guide.completenessStatus}</span></div><h3 className="mt-5 text-sm font-semibold leading-6 text-zinc-100 group-hover:text-white">{guide.title}</h3><div className="mt-auto flex items-center justify-between pt-5 text-xs text-zinc-500"><span>{guide.providerName}</span><ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></div></Link>
            ))}</div> : <div className="mt-5 panel p-8 text-center text-sm text-zinc-500">No saved guides yet. Run an investigation to create one.</div>}
          </section>
        </main>
      ) : (
        <main className="mx-auto w-full max-w-[1500px] px-4 py-10 sm:px-6">
          <div className="flex flex-col justify-between gap-5 border-b border-white/10 pb-7 lg:flex-row lg:items-end"><div><p className="eyebrow"><Layers3 className="h-3.5 w-3.5" /> Composio snapshot</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Toolkit catalog</h1><p className="mt-2 text-sm text-zinc-500">Browse authentication metadata currently available to the workbench.</p></div><div className="flex gap-6 font-mono text-xs text-zinc-500"><span><strong className="text-zinc-200">{catalogStats.managedOAuthCount.toLocaleString()}</strong> managed</span><span><strong className="text-zinc-200">{catalogStats.customOnlyCount.toLocaleString()}</strong> custom-only</span></div></div>
          <section aria-label="Catalog filters" className="mt-6 panel p-4"><div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_minmax(200px,0.5fr)_auto]">
            <label className="relative"><span className="sr-only">Search catalog</span><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-600" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search toolkits" className="input-field w-full pl-9" /></label>
            <label><span className="sr-only">Filter by category</span><select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="input-field w-full"><option>All</option>{catalogStats.categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label className="focus-within:ring-2 focus-within:ring-emerald-400/40 flex cursor-pointer items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs text-zinc-400"><input type="checkbox" checked={managedOAuthOnly} onChange={(event) => setManagedOAuthOnly(event.target.checked)} className="accent-emerald-400" />Managed OAuth only</label>
          </div></section>
          <div className="mt-4 flex items-center justify-between text-xs text-zinc-500"><span>{filteredToolkits.length.toLocaleString()} matching toolkits</span><button type="button" onClick={() => { setSearchQuery(""); setSelectedCategory("All"); setManagedOAuthOnly(false); }} className="focus-ring rounded text-zinc-400 hover:text-white">Clear filters</button></div>
          {filteredToolkits.length ? <><section aria-label="Toolkit results" className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visibleToolkits.map((toolkit) => (
            <article key={toolkit.slug} className="panel flex min-h-64 flex-col p-5">
              <div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3">{toolkit.logoUrl ? <img src={toolkit.logoUrl} alt="" className="h-9 w-9 rounded-lg border border-white/10 bg-white object-contain p-1" /> : <div className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04]"><Wrench className="h-4 w-4 text-zinc-500" /></div>}<div className="min-w-0"><h2 className="truncate text-sm font-semibold text-white">{toolkit.name}</h2><p className="font-mono text-[10px] text-zinc-600">{toolkit.slug}</p></div></div><span className={`tag ${toolkit.hasManagedOAuth ? "text-emerald-300" : "text-zinc-400"}`}>{toolkit.hasManagedOAuth ? "Managed OAuth" : "Custom auth"}</span></div>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-500">{toolkit.description || "No description available."}</p><div className="mt-4 flex flex-wrap gap-1.5">{toolkit.authSchemes.map((scheme) => <span key={scheme} className="tag">{scheme}</span>)}</div>
              <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-white/10 pt-4 font-mono text-xs"><div><dt className="text-zinc-600">Tools</dt><dd className="mt-1 text-zinc-300">{toolkit.toolsCount.toLocaleString()}</dd></div><div><dt className="text-zinc-600">Triggers</dt><dd className="mt-1 text-zinc-300">{toolkit.triggersCount.toLocaleString()}</dd></div></dl>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs">{toolkit.goldenGuideSlug ? <Link href={`/guides/${toolkit.goldenGuideSlug}`} className="focus-ring inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200">Open guide <ArrowRight className="h-3.5 w-3.5" /></Link> : <span className="text-zinc-600">No saved guide</span>}{toolkit.appUrl?.startsWith("https://") && <a href={toolkit.appUrl} target="_blank" rel="noreferrer noopener" className="focus-ring inline-flex items-center gap-1 text-zinc-500 hover:text-white">Provider <ExternalLink className="h-3.5 w-3.5" /></a>}</div>
              {toolkit.requiresCustomAppForProduction && <p className="mt-3 flex items-start gap-2 rounded-md border border-amber-400/15 bg-amber-400/[0.06] p-2 text-[11px] leading-5 text-amber-200/80"><KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Custom app required for production</p>}
            </article>
          ))}</section>{visibleCatalogCount < filteredToolkits.length && <div className="mt-6 flex justify-center"><button type="button" onClick={() => setVisibleCatalogCount((count) => count + 60)} className="button-secondary">Show 60 more</button></div>}</> : <div className="mt-4 panel p-12 text-center"><Search className="mx-auto h-5 w-5 text-zinc-600" /><p className="mt-3 text-sm text-zinc-400">No toolkits match these filters.</p></div>}
        </main>
      )}
    </div>
  );
};
