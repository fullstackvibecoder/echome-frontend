"use client";

import { Calendar, Eye, Trash2 } from "lucide-react";
import type { DraftProposal } from "@/types";
import { useDraftActions } from "./useDraftActions";
import { pickPlatform } from "./draft-format";

interface DraftRowProps {
  draft: DraftProposal;
  onDismissed: (id: string) => void;
  onActionRecorded?: (id: string, action: "reviewed" | "scheduled") => void;
}

export function DraftRow({ draft, onDismissed, onActionRecorded }: DraftRowProps) {
  const { review, schedule, dismiss, busy, dismissError } = useDraftActions({
    draft,
    onDismissed,
    onActionRecorded,
  });
  const { Icon, label } = pickPlatform(draft);
  const title = draft.title || "Untitled draft";

  return (
    <div className="group flex flex-col">
      {/* Row click = Review (primary). It is a button so it is keyboard-operable. */}
      <button
        type="button"
        onClick={() => void review()}
        aria-label={title}
        className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-colors"
      >
        <Icon size={15} className="shrink-0 text-primary/80" />
        <span className="flex-1 truncate text-sm text-foreground">{title}</span>

        {/* Meta label: shown at rest, hidden on hover (hover-capable) to make
            room for the action trio. Actions are always visible on touch. */}
        <span className="text-xs text-muted-foreground whitespace-nowrap [@media(hover:hover)]:group-hover:hidden">
          {label}
        </span>

        <span className="hidden items-center gap-3 [@media(hover:hover)]:group-hover:flex" aria-hidden="true">
          <Eye size={14} className="text-primary" />
          <Calendar size={14} className="text-foreground" />
          <Trash2 size={14} className="text-muted-foreground" />
        </span>
      </button>

      {/* Accessible / touch-operable controls. On hover-capable widths these sit
          inline-collapsed; the always-rendered buttons keep screen readers and
          touch users fully operable regardless of hover. */}
      <div className="flex items-center gap-4 px-3 pb-1.5 [@media(hover:hover)]:sr-only">
        <button type="button" onClick={() => void review()} aria-label="Review draft" className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Eye size={14} /> Review
        </button>
        <button type="button" onClick={() => void schedule()} aria-label="Schedule draft" className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Calendar size={14} /> Schedule
        </button>
        <button
          type="button"
          onClick={() => void dismiss()}
          disabled={busy === "dismissing"}
          aria-label="Dismiss draft"
          className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground disabled:opacity-50"
        >
          <Trash2 size={14} /> {busy === "dismissing" ? "Dismissing…" : "Kill"}
        </button>
      </div>

      {dismissError && (
        <p role="alert" className="px-3 text-[11px] text-destructive">
          {dismissError}
        </p>
      )}
    </div>
  );
}
