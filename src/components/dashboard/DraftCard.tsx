"use client";

import Link from "next/link";
import { Calendar, Eye, Trash2 } from "lucide-react";
import type { DraftProposal } from "@/types";
import { useDraftActions } from "./useDraftActions";

interface DraftCardProps {
  draft: DraftProposal;
  onDismissed: (id: string) => void;
  onActionRecorded?: (id: string, action: "reviewed" | "scheduled") => void;
}

const PREVIEW_LENGTH = 120;

function pickPreview(draft: DraftProposal): string {
  // LinkedIn first: typically the longest, most-shareable copy for the
  // real-estate creators this product targets.
  const body = draft.content_linkedin || draft.content_instagram || draft.content_twitter || "";
  if (!body) return "Echo couldn't pull a preview. Click Review to see the full kit.";
  return body.length > PREVIEW_LENGTH ? `${body.slice(0, PREVIEW_LENGTH).trim()}…` : body;
}

export function DraftCard({ draft, onDismissed, onActionRecorded }: DraftCardProps) {
  const { review, schedule, dismiss, busy, dismissError, href } = useDraftActions({
    draft,
    onDismissed,
    onActionRecorded,
  });

  const title = draft.title || "Untitled draft";
  const preview = pickPreview(draft);

  return (
    <article className="tex-action relative flex flex-col gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors overflow-hidden">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/[0.04] blur-2xl rounded-full pointer-events-none" />

      <header className="relative flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground leading-snug line-clamp-2">{title}</h3>
        {draft.origin === "autonomous" && (
          <span className="text-[10px] uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
            Echo drafted
          </span>
        )}
      </header>

      <p className="relative text-xs text-muted-foreground leading-relaxed line-clamp-2">{preview}</p>

      <div className="relative flex items-center gap-2 mt-1">
        <Link
          href={href}
          onClick={(e) => {
            e.preventDefault();
            void review();
          }}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <Eye size={14} />
          Review
        </Link>
        <Link
          href={href}
          onClick={(e) => {
            e.preventDefault();
            void schedule();
          }}
          className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary"
        >
          <Calendar size={14} />
          Schedule
        </Link>
        <button
          type="button"
          onClick={() => void dismiss()}
          disabled={busy === "dismissing"}
          className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
          aria-label="Dismiss draft"
        >
          <Trash2 size={14} />
          {busy === "dismissing" ? "Dismissing…" : "Kill"}
        </button>
      </div>

      {dismissError && (
        <p role="alert" className="relative text-[11px] text-destructive">
          {dismissError}
        </p>
      )}
    </article>
  );
}
