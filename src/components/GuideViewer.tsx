"use client";

import React, { useState } from "react";
import type { ProviderGuide, EvidenceCitation, CapabilityVariant } from "@/types/contracts";
import { ProvenanceDrawer, EpistemicBadge } from "./ProvenanceDrawer";
import {
  Copy,
  Check,
  Shield,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Info,
  Clock,
  Coins,
  Cpu,
  Layers,
  AlertTriangle,
  Code2,
  FileCheck2,
} from "lucide-react";
import Link from "next/link";

interface GuideViewerProps {
  guide: ProviderGuide;
}

export const GuideViewer: React.FC<GuideViewerProps> = ({ guide }) => {
  // State for selected capability variant
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const activeVariant: CapabilityVariant = guide.variants[selectedVariantIndex] || guide.variants[0];

  // State for copy feedbacks
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedRedirectIndex, setCopiedRedirectIndex] = useState<number | null>(null);

  // State for code snippet language tab
  const [snippetLang, setSnippetLang] = useState<"typescript" | "python" | "curl">("typescript");

  // State for Claim Provenance Inspector drawer
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [activeCitation, setActiveCitation] = useState<EvidenceCitation | null>(null);
  const [inspectedClaim, setInspectedClaim] = useState<string | null>(null);
  const [inspectedNotes, setInspectedNotes] = useState<string | null>(null);

  // Map citation ID to Citation object for fast lookup
  const citationMap = React.useMemo(() => {
    const map = new Map<string, EvidenceCitation>();
    guide.citations.forEach((c) => map.set(c.id, c));
    return map;
  }, [guide.citations]);

  const handleOpenInspector = (
    citationIdOrIds: string | string[],
    claimText?: string,
    notes?: string
  ) => {
    const targetId = Array.isArray(citationIdOrIds) ? citationIdOrIds[0] : citationIdOrIds;
    const foundCitation = citationMap.get(targetId);
    if (foundCitation) {
      setActiveCitation(foundCitation);
      setInspectedClaim(claimText || null);
      setInspectedNotes(notes || null);
      setInspectorOpen(true);
    }
  };

  const handleCopyUrl = async () => {
    if (typeof window !== "undefined") {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } catch {
        // Fallback
      }
    }
  };

  const handleCopyRedirectUri = async (uri: string, index: number) => {
    try {
      await navigator.clipboard.writeText(uri);
      setCopiedRedirectIndex(index);
      setTimeout(() => setCopiedRedirectIndex(null), 2000);
    } catch {
      // Fallback
    }
  };

  // Generate code snippet based on active variant and language
  const getDisplayCode = (): string => {
    const scopesList = activeVariant.scopes.map((s) => s.scope);
    const scopesStr = JSON.stringify(scopesList);
    const redirectUri =
      guide.composioIntegration.composioRedirectUriHint ||
      "https://backend.composio.dev/api/v1/auth-apps/add";

    if (snippetLang === "python") {
      return `# 1. Initialize Composio with Custom Auth Configs
from composio_openai import ComposioToolSet

toolset = ComposioToolSet(
    api_key=os.environ.get("COMPOSIO_API_KEY"),
    auth_configs={
        "${(guide.toolkitSlug || guide.providerName).toUpperCase()}": {
            "client_id": os.environ.get("${(guide.toolkitSlug || "CLIENT").toUpperCase()}_CLIENT_ID"),
            "client_secret": os.environ.get("${(guide.toolkitSlug || "CLIENT").toUpperCase()}_CLIENT_SECRET"),
            "redirect_uri": "${redirectUri}"
        }
    }
)

# 2. Initiate connection with selected least-privilege scopes
entity = toolset.get_entity("default")
connection = entity.initiate_connection(
    app_name="${guide.toolkitSlug || guide.slug}",
    scopes=${scopesStr}
)
print("Authorization URL:", connection.redirect_url)`;
    }

    if (snippetLang === "curl") {
      return `curl -X POST https://backend.composio.dev/api/v1/auth/initiate \\
  -H "x-api-key: $COMPOSIO_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "appName": "${guide.toolkitSlug || guide.slug}",
    "entityId": "default",
    "scopes": ${scopesStr},
    "redirectUri": "${redirectUri}"
  }'`;
    }

    // Default: TypeScript / Node.js
    return `import { OpenAIToolSet } from "composio-core";

// 1. Initialize Composio with BYO Custom OAuth Client credentials
const toolset = new OpenAIToolSet({
  apiKey: process.env.COMPOSIO_API_KEY,
  authConfigs: {
    ${(guide.toolkitSlug || guide.providerName).toUpperCase().replace(/[^A-Z0-9]/g, "_")}: {
      clientId: process.env.${(guide.toolkitSlug || "CLIENT").toUpperCase()}_CLIENT_ID!,
      clientSecret: process.env.${(guide.toolkitSlug || "CLIENT").toUpperCase()}_CLIENT_SECRET!,
      redirectUri: "${redirectUri}",
    },
  },
});

// 2. Initiate connection using selected scope boundary
const entity = await toolset.getEntity("default");
const connection = await entity.initiateConnection({
  appName: "${guide.toolkitSlug || guide.slug}",
  scopes: ${scopesStr},
});

console.log("Interactive Auth URL:", connection.redirectUrl);`;
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(getDisplayCode());
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-200">
      {/* Top Header / Breadcrumbs Bar */}
      <div className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 flex-wrap">
            <Link
              href="/"
              className="text-slate-400 hover:text-slate-100 transition-colors flex items-center gap-1"
            >
              Workbench
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-400">Guides</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-200 font-medium">{guide.providerName}</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Generation Mode Badge */}
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-mono border uppercase tracking-wider font-semibold ${
                guide.generationMode === "golden-verified"
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : guide.generationMode === "live-researched"
                  ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                  : "bg-amber-500/15 text-amber-400 border-amber-500/30"
              }`}
            >
              {guide.generationMode}
            </span>

            {/* Completeness Badge */}
            <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-slate-700 bg-slate-800 text-slate-300 uppercase tracking-wider">
              {guide.completenessStatus}
            </span>

            {/* Copy Shareable URL Button */}
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-sans text-xs transition-colors border border-slate-700 active:scale-95 cursor-pointer shadow-xs"
              title="Copy link to this guide"
            >
              {copiedUrl ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Shareable URL</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Title & Subtitle Banner */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="font-sans font-bold text-2xl sm:text-3xl text-slate-100 tracking-tight">
              {guide.title}
            </h1>
          </div>
          <p className="text-slate-400 font-sans text-sm sm:text-base max-w-4xl leading-relaxed">
            {guide.subtitle}
          </p>
        </div>

        {/* 1. Composio Auth Strategy Verdict Card */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-6">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono text-[11px] font-semibold uppercase tracking-wider">
                  Composio Auth Strategy Verdict
                </span>
                <EpistemicBadge
                  status={guide.composioIntegration.epistemicStatus}
                  onClick={() =>
                    handleOpenInspector(
                      guide.composioIntegration.citationIds,
                      guide.composioIntegration.managedVsCustomVerdict
                    )
                  }
                />
              </div>
              <p className="font-sans text-sm text-slate-300 leading-relaxed">
                {guide.composioIntegration.managedVsCustomVerdict}
              </p>
            </div>

            {/* Metric Summary Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto flex-shrink-0">
              <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-3 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>Lead Time</span>
                </div>
                <div className="font-mono text-sm font-semibold text-slate-100 mt-1">
                  {activeVariant.estimatedReviewTimeline.split(" ")[0]} Avg
                </div>
              </div>

              <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-3 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>Audit Fee</span>
                </div>
                <div className="font-mono text-sm font-semibold text-slate-100 mt-1">
                  {activeVariant.securityAuditRequired.includes("None") ? "$0 (Free)" : "CASA Tier"}
                </div>
              </div>

              <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-3 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Risk Level</span>
                </div>
                <div className="font-mono text-sm font-semibold text-slate-100 mt-1">
                  {activeVariant.scopes.some((s) => s.classification === "restricted")
                    ? "Restricted"
                    : "Low Risk"}
                </div>
              </div>

              <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-3 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  <span>Managed OAuth</span>
                </div>
                <div className="font-mono text-sm font-semibold text-emerald-400 mt-1">
                  {guide.composioIntegration.managedOAuthAvailable ? "Available" : "BYO Only"}
                </div>
              </div>
            </div>
          </div>

          {/* Copyable Code Snippet Box */}
          <div className="rounded-lg bg-slate-950 border border-slate-800 overflow-hidden">
            <div className="px-4 py-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <div className="flex items-center gap-1">
                  {(["typescript", "python", "curl"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSnippetLang(lang)}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                        snippetLang === lang
                          ? "bg-slate-800 text-slate-100 font-semibold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-xs transition-colors border border-slate-700 cursor-pointer"
              >
                {copiedSnippet ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>Copy Snippet</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
              <code>{getDisplayCode()}</code>
            </pre>
          </div>
        </div>

        {/* 2. Interactive Capability & Scope-Delta Switcher */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-sans font-bold text-xl text-slate-100">
              Capability & Scope-Delta Comparison
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Click a variant to toggle live scope requirements
            </span>
          </div>

          {/* Side-by-side Clickable Variant Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guide.variants.map((v, idx) => {
              const isSelected = selectedVariantIndex === idx;
              const isOptionA = idx === 0;

              return (
                <div
                  key={v.variantId}
                  onClick={() => setSelectedVariantIndex(idx)}
                  className={`rounded-xl p-5 border cursor-pointer transition-all duration-150 select-none ${
                    isSelected
                      ? isOptionA
                        ? "bg-emerald-950/20 border-emerald-500 shadow-md ring-1 ring-emerald-500/30"
                        : "bg-amber-950/20 border-amber-500 shadow-md ring-1 ring-amber-500/30"
                      : "bg-slate-900 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-xs font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${
                            isOptionA
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          }`}
                        >
                          Option {idx === 0 ? "A" : "B"}: {isOptionA ? "Recommended" : "High Friction"}
                        </span>
                      </div>
                      <h3 className="font-sans font-bold text-base text-slate-100">
                        {v.title}
                      </h3>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? isOptionA
                            ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                            : "border-amber-500 bg-amber-500/20 text-amber-400"
                          : "border-slate-700"
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-current" />}
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-300 font-sans leading-relaxed">
                    {v.summary}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-500">Timeline:</span>{" "}
                      <span className="text-slate-200">{v.estimatedReviewTimeline}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Security Gate:</span>{" "}
                      <span
                        className={
                          v.securityAuditRequired.includes("None")
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }
                      >
                        {v.securityAuditRequired.includes("None") ? "None ($0)" : "Lab Audit"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Variant Details Card: Scopes & Pros/Cons */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-sans font-semibold text-base text-slate-100">
                  Active Scope Delta for {activeVariant.title}
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  App Type: <span className="text-slate-200 font-mono">{activeVariant.recommendedAppType}</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-slate-400">Approval Gate:</span>
                <p className="text-xs font-sans text-slate-200 font-medium">
                  {activeVariant.approvalGateSummary}
                </p>
              </div>
            </div>

            {/* Scopes Table */}
            <div className="space-y-3">
              <span className="font-mono text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Requested Permission Scopes ({activeVariant.scopes.length})
              </span>
              <div className="space-y-2.5">
                {activeVariant.scopes.map((scopeReq, sIdx) => (
                  <div
                    key={sIdx}
                    className="rounded-lg bg-slate-950 border border-slate-800/90 p-3.5 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-xs font-semibold text-slate-100 select-all">
                            {scopeReq.scope}
                          </code>
                          <span
                            className={`px-2 py-0.2 rounded font-mono text-[10px] font-semibold uppercase border ${
                              scopeReq.classification === "restricted"
                                ? "bg-red-500/15 text-red-400 border-red-500/30"
                                : scopeReq.classification === "sensitive"
                                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            }`}
                          >
                            {scopeReq.classification}
                          </span>
                        </div>
                        <p className="text-xs font-sans text-slate-300 font-medium">
                          {scopeReq.displayName}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <EpistemicBadge
                          status={scopeReq.epistemicStatus}
                          onClick={() =>
                            handleOpenInspector(
                              scopeReq.citationIds,
                              `${scopeReq.scope}: ${scopeReq.requiredForCapability}`
                            )
                          }
                        />
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 font-sans leading-relaxed">
                      {scopeReq.requiredForCapability}
                    </p>

                    {scopeReq.leastPrivilegeAlternative && (
                      <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 px-2.5 py-1 rounded">
                        Least-Privilege Alternative: {scopeReq.leastPrivilegeAlternative}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pros and Cons Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 space-y-2">
                <span className="font-mono text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Architectural Advantages
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                  {activeVariant.pros.map((pro, pIdx) => (
                    <li key={pIdx} className="leading-relaxed">
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 space-y-2">
                <span className="font-mono text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Operational Overhead & Constraints
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                  {activeVariant.cons.map((con, cIdx) => (
                    <li key={cIdx} className="leading-relaxed">
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Step-by-Step Developer Console Registration Walkthrough */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="font-sans font-bold text-xl text-slate-100">
              Developer Console Registration Walkthrough
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              Exact paths, configuration fields, and redirect URIs to register in the official provider console.
            </p>
          </div>

          <div className="space-y-4">
            {guide.registrationSteps.map((step, idx) => (
              <div
                key={step.stepNumber}
                className="rounded-lg bg-slate-950 border border-slate-800 p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-mono text-xs font-bold text-slate-200">
                      {step.stepNumber}
                    </div>
                    <h4 className="font-sans font-semibold text-sm text-slate-100">
                      {step.title}
                    </h4>
                  </div>
                  <EpistemicBadge
                    status={step.epistemicStatus}
                    onClick={() =>
                      handleOpenInspector(
                        step.citationIds,
                        `Step ${step.stepNumber}: ${step.title}`
                      )
                    }
                  />
                </div>

                <div className="font-mono text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded border border-slate-800/80 flex items-center gap-2">
                  <span className="text-slate-500 uppercase text-[10px]">Path:</span>
                  <span className="text-slate-200">{step.consolePath}</span>
                </div>

                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {step.instructions}
                </p>

                {/* Critical Configuration Values */}
                {step.criticalConfigValues.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="font-mono text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                      Required Configuration Values
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {step.criticalConfigValues.map((val, vIdx) => (
                        <div
                          key={vIdx}
                          className="rounded bg-slate-900 border border-slate-800 p-2.5 flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="text-slate-400 font-mono text-[11px]">
                            {val.label}:
                          </span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono text-slate-200 truncate select-all">
                              {val.value}
                            </span>
                            {val.label.toLowerCase().includes("redirect") && (
                              <button
                                onClick={() => handleCopyRedirectUri(val.value, idx * 10 + vIdx)}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                title="Copy Redirect URI"
                              >
                                {copiedRedirectIndex === idx * 10 + vIdx ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 4. Testing & Sandbox Constraints Callout */}
        <div className="rounded-xl bg-amber-950/20 border border-amber-500/40 p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-sans font-semibold text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>Testing & Sandbox Constraints Callout</span>
          </div>

          <div className="space-y-2.5">
            {guide.testingAndSandboxRules.map((rule, idx) => (
              <div
                key={idx}
                className="bg-slate-950/80 rounded-lg p-3 border border-amber-500/20 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-sans text-xs text-amber-200 leading-relaxed font-medium">
                    {rule.claim}
                  </p>
                  <EpistemicBadge
                    status={rule.epistemicStatus}
                    onClick={() => handleOpenInspector(rule.citationIds, rule.claim, rule.notes)}
                  />
                </div>
                {rule.notes && (
                  <p className="text-[11px] font-sans text-slate-400 italic">
                    Note: {rule.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 5. Explicit Unknowns & Partial Findings Callout (when present) */}
        {guide.explicitUnknowns && guide.explicitUnknowns.length > 0 && (
          <div className="rounded-xl bg-amber-950/25 border border-amber-500/50 p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-300 font-sans font-semibold text-sm">
              <Info className="w-5 h-5 flex-shrink-0" />
              <span>Explicit Unknowns & Partial Research Findings</span>
            </div>
            <ul className="space-y-1.5 list-disc list-inside text-xs text-amber-200/90 font-mono">
              {guide.explicitUnknowns.map((unknownItem, idx) => (
                <li key={idx} className="leading-relaxed">
                  {unknownItem}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 6. Distribution & Review Checklist */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <h3 className="font-sans font-semibold text-base text-slate-100 flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            Distribution & App-Review Readiness Checklist
          </h3>

          <div className="space-y-2">
            {guide.distributionAndReviewChecklist.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start justify-between gap-3"
              >
                <span className="text-xs text-slate-300 font-sans leading-relaxed">
                  • {item.claim}
                </span>
                <EpistemicBadge
                  status={item.epistemicStatus}
                  onClick={() => handleOpenInspector(item.citationIds, item.claim)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Claim Provenance Inspector Drawer */}
      <ProvenanceDrawer
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        citation={activeCitation}
        activeClaim={inspectedClaim}
        notes={inspectedNotes}
      />
    </div>
  );
};
