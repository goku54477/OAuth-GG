"use client";

import React, { useState, useMemo } from "react";
import type { ComposioToolkitSummary, ProviderGuide } from "@/types/contracts";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Layers,
  Wrench,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  KeyRound,
  ShieldAlert,
} from "lucide-react";

interface WorkbenchClientProps {
  initialToolkits: ComposioToolkitSummary[];
  savedGuides: Array<
    Pick<
      ProviderGuide,
      | "slug"
      | "providerName"
      | "title"
      | "generationMode"
      | "completenessStatus"
      | "generatedAt"
    >
  >;
}

const CAPABILITY_CHIPS = [
  { id: "read", label: "Read Data" },
  { id: "write", label: "Write / Modify" },
  { id: "bot", label: "Bot / Webhooks" },
  { id: "distribution", label: "External Customer Distribution" },
];

const CATEGORY_PILLS = [
  "All",
  "Developer Tools",
  "Productivity",
  "CRM & Sales",
  "Communication",
  "Finance",
];

const INVESTIGATION_STEPS = [
  "1. Catalog Check",
  "2. Exa Search",
  "3. Readability",
  "4. Citation Audit",
];

export const WorkbenchClient: React.FC<WorkbenchClientProps> = ({
  initialToolkits,
  savedGuides,
}) => {
  const router = useRouter();

  // Investigator Bar state
  const [queryInput, setQueryInput] = useState("");
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([
    "read",
    "write",
    "distribution",
  ]);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [investigationError, setInvestigationError] = useState<string | null>(null);

  // Directory Search and Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [managedOAuthOnly, setManagedOAuthOnly] = useState(false);

  const toggleCapability = (capId: string) => {
    setSelectedCapabilities((prev) =>
      prev.includes(capId) ? prev.filter((id) => id !== capId) : [...prev, capId]
    );
  };

  const handleStartInvestigation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = queryInput.trim();
    if (!trimmed || isInvestigating) return;

    setIsInvestigating(true);
    setInvestigationError(null);
    setActiveStepIndex(0);

    // Stepper progression timing
    const stepInterval = setInterval(() => {
      setActiveStepIndex((prev) => (prev < 3 ? prev + 1 : prev));
    }, 600);

    try {
      const response = await fetch("/api/guides/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queryOrUrl: trimmed,
          capabilities: selectedCapabilities,
          forceRefresh: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Investigation failed with status: ${response.status}`);
      }

      const data = await response.json();
      clearInterval(stepInterval);
      setActiveStepIndex(3);

      setTimeout(() => {
        const slug = data.guide?.slug || data.slug || "gmail-send-vs-modify";
        router.push(`/guides/${slug}`);
      }, 500);
    } catch (err: any) {
      clearInterval(stepInterval);
      setIsInvestigating(false);
      setInvestigationError(err.message || "Failed to complete live investigation");
    }
  };

  // Filtered Toolkits
  const filteredToolkits = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return initialToolkits.filter((toolkit) => {
      const matchesSearch =
        !q ||
        toolkit.name.toLowerCase().includes(q) ||
        toolkit.slug.toLowerCase().includes(q) ||
        toolkit.description.toLowerCase().includes(q);

      const matchesCategory =
        selectedCategory === "All" ||
        toolkit.categories.some(
          (c) => c.toLowerCase() === selectedCategory.toLowerCase()
        );

      const matchesManaged = !managedOAuthOnly || toolkit.hasManagedOAuth;

      return matchesSearch && matchesCategory && matchesManaged;
    });
  }, [initialToolkits, searchQuery, selectedCategory, managedOAuthOnly]);

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-100 font-mono font-bold text-xs shadow-inner">
              AB
            </div>
            <div className="flex items-center gap-2">
              <span className="font-sans font-bold text-sm tracking-tight text-white">
                AuthBench
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                v2.4
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Production Catalog (120+ Toolkits)</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-12 flex-1 w-full">
        {/* Screen 1: Hero Live Investigator Bar */}
        <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real-Time OAuth Scope & App-Review Readiness Engine</span>
            </div>
            <h1 className="font-sans font-extrabold text-2xl sm:text-4xl text-white tracking-tight">
              Developer OAuth Workbench
            </h1>
            <p className="text-slate-400 font-sans text-sm sm:text-base max-w-2xl leading-relaxed">
              Investigate OAuth permissions, CASA Tier 2/3 review friction, and Composio multi-tenant authentication wiring across 120+ platforms.
            </p>
          </div>

          {/* Search / Input Box */}
          <form onSubmit={handleStartInvestigation} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="Enter provider name or docs URL (e.g., Zendesk, Linear, or https://...)"
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:border-emerald-500 text-slate-100 placeholder-slate-500 text-sm font-sans focus:outline-hidden transition-all shadow-inner"
                  disabled={isInvestigating}
                />
              </div>

              <button
                type="submit"
                disabled={!queryInput.trim() || isInvestigating}
                className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-sans font-medium text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
              >
                {isInvestigating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Investigating...</span>
                  </>
                ) : (
                  <>
                    <span>Investigate Provider</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Capability Filter Chips */}
            <div className="space-y-2">
              <span className="font-mono text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Required Capability Boundaries:
              </span>
              <div className="flex flex-wrap gap-2">
                {CAPABILITY_CHIPS.map((cap) => {
                  const isSelected = selectedCapabilities.includes(cap.id);
                  return (
                    <button
                      key={cap.id}
                      type="button"
                      onClick={() => toggleCapability(cap.id)}
                      className={`px-3 py-1.5 rounded-md font-sans text-xs transition-all border cursor-pointer select-none ${
                        isSelected
                          ? "bg-slate-800 text-emerald-400 border-emerald-500/40 font-medium"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {cap.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4-Stage Progress Stepper when Investigating */}
            {isInvestigating && (
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Live Audit in Progress...
                  </span>
                  <span>Step {activeStepIndex + 1} of 4</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {INVESTIGATION_STEPS.map((stepName, sIdx) => {
                    const isDone = sIdx < activeStepIndex;
                    const isCurrent = sIdx === activeStepIndex;

                    return (
                      <div
                        key={stepName}
                        className={`rounded-lg p-2.5 border text-xs font-mono transition-all flex items-center gap-2 ${
                          isDone
                            ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-400"
                            : isCurrent
                            ? "bg-sky-950/20 border-sky-500/60 text-sky-300 ring-1 ring-sky-500/40"
                            : "bg-slate-900 border-slate-800 text-slate-500"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        ) : isCurrent ? (
                          <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin flex-shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-700 flex-shrink-0" />
                        )}
                        <span className="truncate">{stepName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {investigationError && (
              <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/30 text-xs text-red-400 font-mono">
                {investigationError}
              </div>
            )}
          </form>
        </div>

        {/* Screen 1: Verified Golden Reference Guides Row */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="font-sans font-bold text-lg text-white">
                Verified Golden Reference Guides
              </h2>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              &lt;50ms response
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* GitHub Card */}
            <Link
              href="/guides/github-public-issues"
              className="group rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 p-5 transition-all shadow-md flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold uppercase tracking-wider">
                    Golden Verified
                  </span>
                  <span className="text-xs font-mono text-slate-500 group-hover:text-slate-300 transition-colors">
                    GitHub
                  </span>
                </div>
                <h3 className="font-sans font-semibold text-base text-slate-100 group-hover:text-emerald-400 transition-colors">
                  GitHub Public Issues
                </h3>
                <p className="font-sans text-xs text-slate-400 leading-relaxed">
                  Fine-grained GitHub App repository permissions vs coarse legacy public_repo OAuth scopes.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>0 Security Review Delay</span>
                <span className="text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  View Guide <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>

            {/* Slack Card */}
            <Link
              href="/guides/slack-channel-bot"
              className="group rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 p-5 transition-all shadow-md flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold uppercase tracking-wider">
                    Golden Verified
                  </span>
                  <span className="text-xs font-mono text-slate-500 group-hover:text-slate-300 transition-colors">
                    Slack
                  </span>
                </div>
                <h3 className="font-sans font-semibold text-base text-slate-100 group-hover:text-emerald-400 transition-colors">
                  Slack Channel Bot
                </h3>
                <p className="font-sans text-xs text-slate-400 leading-relaxed">
                  Granular Bot OAuth v2 scopes with unlisted multi-workspace distribution vs Slack Directory review.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Instant Self-Serve</span>
                <span className="text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  View Guide <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>

            {/* Gmail Card */}
            <Link
              href="/guides/gmail-send-vs-modify"
              className="group rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 p-5 transition-all shadow-md flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold uppercase tracking-wider">
                    Golden Verified
                  </span>
                  <span className="text-xs font-mono text-slate-500 group-hover:text-slate-300 transition-colors">
                    Google Workspace
                  </span>
                </div>
                <h3 className="font-sans font-semibold text-base text-slate-100 group-hover:text-emerald-400 transition-colors">
                  Gmail Send vs. Modify
                </h3>
                <p className="font-sans text-xs text-slate-400 leading-relaxed">
                  Send-only sensitive scope vs CASA Tier 2 $3k–$7.5k annual lab audit overhead.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Avoids $7.5k CASA</span>
                <span className="text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  View Guide <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* Screen 1: Searchable 120+ Composio Toolkit Directory */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="font-sans font-bold text-xl text-white">
                Composio Toolkit Directory ({filteredToolkits.length} Toolkits)
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Explore supported authentication schemes, managed OAuth capability, and production BYO requirements.
              </p>
            </div>

            {/* Managed OAuth Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={managedOAuthOnly}
                onChange={(e) => setManagedOAuthOnly(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-xs font-mono text-slate-300">
                Managed OAuth Only
              </span>
            </label>
          </div>

          {/* Real-time search and category pills */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search toolkits by name, slug, or capability..."
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs font-sans focus:outline-hidden focus:border-slate-700"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {CATEGORY_PILLS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-md text-xs font-sans whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-slate-800 text-white font-medium border border-slate-700 shadow-xs"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Toolkit Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredToolkits.slice(0, 48).map((toolkit) => {
              const hasManaged = toolkit.hasManagedOAuth;

              return (
                <div
                  key={toolkit.slug}
                  className="rounded-xl bg-slate-900 border border-slate-800 p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all shadow-xs"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <h4 className="font-sans font-bold text-sm text-slate-100 capitalize">
                          {toolkit.name}
                        </h4>
                        <span className="font-mono text-[11px] text-slate-500">
                          {toolkit.slug}
                        </span>
                      </div>

                      {/* Managed OAuth vs BYO Badge */}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border tracking-wider ${
                          hasManaged
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {hasManaged ? "Managed OAuth" : "BYO Custom App"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 font-sans line-clamp-2 leading-relaxed">
                      {toolkit.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {toolkit.categories.slice(0, 2).map((c) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <div className="text-slate-500">
                      <span>{toolkit.toolsCount} tools</span>
                      {toolkit.triggersCount > 0 && (
                        <span> • {toolkit.triggersCount} triggers</span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setQueryInput(toolkit.name);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-sans text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Investigate</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredToolkits.length > 48 && (
            <div className="text-center py-4 text-xs font-mono text-slate-500">
              Showing 48 of {filteredToolkits.length} toolkits. Use search to find specific providers.
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/80 py-6 px-6 mt-12 text-slate-500 text-xs font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span>AuthBench Engine v2.4</span>
            <span>•</span>
            <span>CASA Tier 2/3 Validated</span>
            <span>•</span>
            <span>120+ Composio Toolkits</span>
          </div>
          <div>© 2026 Developer OAuth & App-Review Workbench</div>
        </div>
      </footer>
    </div>
  );
};
