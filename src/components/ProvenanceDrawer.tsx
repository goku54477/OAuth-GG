"use client";

import React, { useEffect } from "react";
import type { EvidenceCitation, EpistemicStatus } from "@/types/contracts";
import { ExternalLink, X, ShieldCheck, Clock, FileText, CheckCircle2 } from "lucide-react";

export function getEpistemicBadgeClasses(status: EpistemicStatus): string {
  switch (status) {
    case "source-supported":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "observed":
      return "bg-sky-500/15 text-sky-400 border-sky-500/30";
    case "tested":
      return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    case "estimated":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "unknown":
    default:
      return "bg-slate-500/15 text-slate-400 border-slate-500/30";
  }
}

export const EpistemicBadge: React.FC<{
  status: EpistemicStatus;
  onClick?: () => void;
  className?: string;
}> = ({ status, onClick, className = "" }) => {
  const badgeClasses = getEpistemicBadgeClasses(status);
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium border uppercase tracking-wider transition-all ${badgeClasses} ${
        onClick ? "cursor-pointer hover:opacity-80 active:scale-95" : ""
      } ${className}`}
      title={onClick ? "Click to inspect claim provenance" : undefined}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75 inline-block" />
      {status}
    </span>
  );
};

interface ProvenanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  citation: EvidenceCitation | null;
  activeClaim?: string | null;
  notes?: string | null;
}

export const ProvenanceDrawer: React.FC<ProvenanceDrawerProps> = ({
  isOpen,
  onClose,
  citation,
  activeClaim,
  notes,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !citation) return null;

  // Enforce https:// only for outbound links
  const isSafeHttpsUrl = citation.sourceUrl.startsWith("https://");

  const getAuthorityBadge = (authorityType: EvidenceCitation["authorityType"]) => {
    switch (authorityType) {
      case "official-provider-docs":
        return {
          label: "Official Provider Docs",
          color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        };
      case "composio-api-metadata":
        return {
          label: "Composio API Metadata",
          color: "bg-sky-500/20 text-sky-300 border-sky-500/40",
        };
      case "secondary-technical":
        return {
          label: "Secondary Technical Analysis",
          color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
        };
      case "practical-inspection":
      default:
        return {
          label: "Practical Inspection",
          color: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        };
    }
  };

  const authorityInfo = getAuthorityBadge(citation.authorityType);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="provenance-title">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-Over Panel */}
      <div className="relative w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full z-10 overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="provenance-title" className="font-sans font-semibold text-sm text-slate-100">
                Claim Provenance Inspector
              </h3>
              <p className="font-mono text-[11px] text-slate-400">
                Citation ID: {citation.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close provenance inspector"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close drawer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Active Claim Display */}
          {activeClaim && (
            <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Inspected Statement / Rule
                </span>
                <EpistemicBadge status={citation.epistemicStatus} />
              </div>
              <p className="font-sans text-sm text-slate-200 leading-relaxed font-medium">
                "{activeClaim}"
              </p>
              {notes && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400 font-sans italic">
                  Note: {notes}
                </div>
              )}
            </div>
          )}

          {/* Epistemic Status & Authority Tier */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-950/70 border border-slate-800/80 p-3.5 space-y-1">
              <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                Authority Tier
              </span>
              <div className="pt-1">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border font-medium ${authorityInfo.color}`}
                >
                  {authorityInfo.label}
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-slate-950/70 border border-slate-800/80 p-3.5 space-y-1">
              <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                Retrieval Timestamp
              </span>
              <div className="flex items-center gap-1.5 pt-1 text-slate-200 font-mono text-xs">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {new Date(citation.retrievedAt).toISOString().replace(".000Z", " UTC")}
                </span>
              </div>
            </div>
          </div>

          {/* Verbatim Documentation Quote */}
          <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-slate-400 font-mono text-xs">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span className="uppercase text-[11px] font-semibold tracking-wider text-slate-300">
                Verbatim Documentation Quote
              </span>
            </div>
            {citation.verbatimQuote ? (
              <blockquote className="border-l-2 border-emerald-500/60 pl-3.5 py-1 text-slate-300 font-mono text-xs leading-relaxed bg-slate-900/50 rounded-r p-3">
                {citation.verbatimQuote}
              </blockquote>
            ) : (
              <p className="text-slate-400 text-xs italic">
                No verbatim text captured for this citation. Verified via endpoint inspection.
              </p>
            )}
          </div>

          {/* Source Document Reference */}
          <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 space-y-3">
            <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Official Primary Source
            </span>
            <div className="space-y-1.5">
              <h4 className="font-sans font-medium text-sm text-slate-100">
                {citation.sourceTitle}
              </h4>
              <p className="font-mono text-xs text-slate-400 break-all select-all">
                {citation.sourceUrl}
              </p>
            </div>

            {isSafeHttpsUrl ? (
              <a
                href={citation.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-sans text-xs transition-colors border border-slate-700 cursor-pointer"
              >
                <span>Open Documentation Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2 rounded">
                Non-HTTPS source link blocked for security.
              </div>
            )}
          </div>

          {/* Verification Protocol Notice */}
          <div className="p-3.5 rounded-lg bg-slate-900/50 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              This panel shows the source and epistemic status attached to the selected claim.
            </span>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-sans text-xs transition-colors cursor-pointer border border-slate-700"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
