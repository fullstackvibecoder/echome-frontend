"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Circle,
  Edit3,
  FileText,
  Globe,
  Instagram,
  Mail,
  Mic,
  Share2,
  Sparkles,
  Video,
  X,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import type {
  ContentSourceType,
  NinePointBreakdown,
  NinePointStep,
  NinePointStepResult,
} from "@/types";

const ONBOARDING_KEY = "echome_receipt_card_onboarded";

interface ScorecardRowDef {
  label: string;
  expertTerm: string;
  explanation: string;
  steps: NinePointStep[];
}

const SCORECARD_ROWS: ScorecardRowDef[] = [
  {
    label: "Names a real pain",
    expertTerm: "Problem sold",
    explanation: "anchors on something your reader actually feels",
    steps: ["pain", "problem", "consequences"],
  },
  {
    label: "Shows your method",
    expertTerm: "Process highlighted",
    explanation: "names your unique approach, not generic advice",
    steps: ["signature_method"],
  },
  {
    label: "Paints the outcome",
    expertTerm: "Vision painted",
    explanation: "shows the after, not just the before",
    steps: ["vision"],
  },
  {
    label: "Offers a gift first",
    expertTerm: "Gift offered",
    explanation: "leads with value before any ask",
    steps: ["action"],
  },
];

interface ProvenanceMeta {
  Icon: LucideIcon;
  label: string;
  pillClass: string;
}

const PROVENANCE: Partial<Record<ContentSourceType, ProvenanceMeta>> = {
  youtube_import: { Icon: Youtube, label: "YouTube", pillClass: "bg-red-50 text-red-700 border-red-100" },
  instagram_import: { Icon: Instagram, label: "Instagram", pillClass: "bg-pink-50 text-pink-700 border-pink-100" },
  mbox_import: { Icon: Mail, label: "Email", pillClass: "bg-orange-50 text-orange-700 border-orange-100" },
  paste_email: { Icon: Mail, label: "Email", pillClass: "bg-orange-50 text-orange-700 border-orange-100" },
  voice_recording: { Icon: Mic, label: "Voice note", pillClass: "bg-purple-50 text-purple-700 border-purple-100" },
  blog_import: { Icon: Globe, label: "Blog", pillClass: "bg-teal-50 text-teal-700 border-teal-100" },
  file_upload: { Icon: FileText, label: "File", pillClass: "bg-blue-50 text-blue-700 border-blue-100" },
  paste_text: { Icon: Edit3, label: "Writing", pillClass: "bg-purple-50 text-purple-700 border-purple-100" },
  paste_social: { Icon: Share2, label: "Social", pillClass: "bg-pink-50 text-pink-700 border-pink-100" },
  "clip-finder": { Icon: Video, label: "Clip", pillClass: "bg-teal-50 text-teal-700 border-teal-100" },
  generation: { Icon: Sparkles, label: "Generated", pillClass: "bg-cyan-50 text-cyan-700 border-cyan-100" },
};

interface RowState {
  status: "present" | "weak" | "absent";
  evidenceSource?: { kbItemId: string; excerpt: string; sourceType: ContentSourceType };
}

const STATUS_RANK: Record<RowState["status"], number> = {
  present: 3,
  weak: 2,
  absent: 1,
};

/**
 * Roll up the nine raw step results into a single state for one scorecard row.
 * Picks the strongest underlying step's status and evidence — this is what
 * lets the row carry a single check + provenance pill while honestly
 * representing the underlying group (e.g., pain+problem+consequences).
 */
function rowStateFromSteps(
  steps: NinePointStepResult[],
  rowSteps: NinePointStep[],
): RowState {
  const relevant = steps.filter((s) => rowSteps.includes(s.step));
  if (relevant.length === 0) return { status: "absent" };
  const strongest = relevant.reduce((a, b) =>
    STATUS_RANK[a.status] >= STATUS_RANK[b.status] ? a : b,
  );
  if (strongest.status === "absent") return { status: "absent" };
  return {
    status: strongest.status,
    evidenceSource: strongest.evidenceSource,
  };
}

export interface ReceiptCardProps {
  /** Plain-English summary of the action ("Scheduled 5 posts to LinkedIn") */
  summary: string;
  /** Trigger logic in plain English ("Based on your last 30 days of activity") */
  why: string;
  /** Optional 9-Point breakdown — when present, drives the scorecard area */
  breakdown?: NinePointBreakdown | null;
  /** Click handler for the Undo button. Omit to hide the button. */
  onUndo?: () => void | Promise<void>;
  undoLabel?: string;
  /** Click handler for the secondary action. Omit to hide. */
  onEdit?: () => void;
  editLabel?: string;
  /** Manual dismiss. Auto-shown as an X in compact (no-breakdown) cards. */
  onDismiss?: () => void;
  /** Optional auto-dismiss after N ms. Null = stay until manually dismissed. */
  autoDismissMs?: number | null;
}

export function ReceiptCard({
  summary,
  why,
  breakdown,
  onUndo,
  undoLabel = "Undo",
  onEdit,
  editLabel = "Change criteria",
  onDismiss,
  autoDismissMs = null,
}: ReceiptCardProps) {
  // Lazy initializer reads localStorage once on mount — avoids the
  // setState-inside-effect lint warning and keeps the component stable
  // across re-renders. Onboarding shows the first time a Receipt Card
  // mounts with a breakdown attached.
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem(ONBOARDING_KEY);
  });

  useEffect(() => {
    if (!autoDismissMs || !onDismiss) return;
    const handle = window.setTimeout(onDismiss, autoDismissMs);
    return () => window.clearTimeout(handle);
  }, [autoDismissMs, onDismiss]);

  function dismissOnboarding() {
    setShowOnboarding(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(ONBOARDING_KEY, new Date().toISOString());
    }
  }

  const auditStatus = breakdown?.auditStatus;
  const showBreakdown = breakdown != null;
  const hasActions = Boolean(onUndo || onEdit);

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
          <Check className="w-3 h-3 text-green-700 dark:text-green-400" strokeWidth={3} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug text-foreground">{summary}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="font-medium">Why:</span> {why}
          </p>
        </div>
        {onDismiss && !showBreakdown && (
          <button
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showOnboarding && showBreakdown && (
        <div className="mt-4 -mb-1 px-3 py-2.5 bg-primary/[0.04] border border-primary/20 border-l-[3px] border-l-primary rounded-lg flex items-start gap-2">
          <p className="flex-1 text-[11px] text-foreground/85 leading-relaxed">
            <span className="font-semibold">Each post should hit four moves:</span>{" "}
            name a pain, show your method, paint the outcome, and offer a gift. Echo
            checks each one against what you&apos;ve shared.
          </p>
          <button
            onClick={dismissOnboarding}
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
            aria-label="Dismiss explanation"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {showBreakdown && auditStatus === "pending" && <PendingState />}

      {showBreakdown && auditStatus === "failed" && (
        <FailedState error={breakdown.auditError} />
      )}

      {showBreakdown && (auditStatus === "complete" || auditStatus === "partial") && (
        <BreakdownView
          breakdown={breakdown}
          partial={auditStatus === "partial"}
        />
      )}

      {hasActions && (
        <div className="mt-4 pt-3 border-t border-border flex justify-end gap-2">
          {onUndo && (
            <button
              onClick={() => void onUndo()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors"
            >
              {undoLabel}
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors"
            >
              {editLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PendingState() {
  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
        <span>Echo is reading your post structure…</span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-primary/20 animate-pulse" />
    </div>
  );
}

function FailedState({ error }: { error?: string }) {
  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
        <AlertTriangle
          className="w-4 h-4 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5"
          strokeWidth={2}
        />
        <div className="text-xs text-amber-800 dark:text-amber-200">
          <p className="font-medium">Echo couldn&apos;t run the structure check this time</p>
          <p className="mt-0.5">
            {error || "Try again in a moment. Your content was still posted."}
          </p>
        </div>
      </div>
    </div>
  );
}

function BreakdownView({
  breakdown,
  partial,
}: {
  breakdown: NinePointBreakdown;
  partial: boolean;
}) {
  return (
    <div className="mt-4 pt-4 border-t border-border">
      <p className="text-xs font-medium text-foreground mb-2">
        Mind-Reader check
        {partial && (
          <span className="text-muted-foreground font-normal"> (partial)</span>
        )}
      </p>
      <ul className="space-y-2">
        {SCORECARD_ROWS.map((rowDef) => (
          <ScorecardRow
            key={rowDef.expertTerm}
            rowDef={rowDef}
            state={rowStateFromSteps(breakdown.steps, rowDef.steps)}
          />
        ))}
      </ul>
    </div>
  );
}

function ScorecardRow({
  rowDef,
  state,
}: {
  rowDef: ScorecardRowDef;
  state: RowState;
}) {
  const isAbsent = state.status === "absent";
  const isWeak = state.status === "weak";
  const provenance = state.evidenceSource
    ? PROVENANCE[state.evidenceSource.sourceType]
    : null;

  return (
    <li>
      <div className="flex items-center gap-2 text-xs">
        {isAbsent ? (
          <Circle
            className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"
            strokeWidth={2}
          />
        ) : (
          <Check
            className={`w-3.5 h-3.5 flex-shrink-0 ${isWeak ? "text-amber-600" : "text-green-600"}`}
            strokeWidth={3}
          />
        )}
        <span
          className={`flex-1 ${isAbsent ? "text-muted-foreground" : "text-foreground"}`}
        >
          {rowDef.label}
        </span>
        {provenance && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${provenance.pillClass}`}
            title={state.evidenceSource?.excerpt}
          >
            <provenance.Icon className="w-2.5 h-2.5" />
            {provenance.label}
          </span>
        )}
      </div>
      <p className="ml-[22px] mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
        <span className="font-medium text-foreground/70">{rowDef.expertTerm}:</span>{" "}
        {rowDef.explanation}
      </p>
    </li>
  );
}
