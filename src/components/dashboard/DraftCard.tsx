"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Eye, Trash2 } from "lucide-react";
import { useState } from "react";
import type { DraftProposal } from "@/types";
import { api } from "@/lib/api-client";

interface DraftCardProps {
  draft: DraftProposal;
  onDismissed: (id: string) => void;
  onActionRecorded?: (id: string, action: "reviewed" | "scheduled") => void;
}

const PREVIEW_LENGTH = 220;

// Telemetry races against this timeout. If the API hangs (slow network, cold
// container, etc.), we give up after 2s and navigate anyway — never block
// the user on a side-effect call. Pre-fix this was pure fire-and-forget
// which lost most outcomes in prod (43 draft_outcomes / 7d vs 275 opted-in
// users — too low to be real engagement; mostly racing against Next.js
// client-side navigation cancelling the in-flight fetch).
const TELEMETRY_TIMEOUT_MS = 2000;

async function recordWithTimeout(p: Promise<unknown>): Promise<void> {
  await Promise.race([
    p.catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, TELEMETRY_TIMEOUT_MS)),
  ]);
}

function pickPreview(draft: DraftProposal): string {
  // LinkedIn first because it's typically the longest, most-shareable copy
  // for the audience this product targets (real-estate creators).
  const body = draft.content_linkedin || draft.content_instagram || draft.content_twitter || "";
  if (!body) return "Echo couldn't pull a preview. Click Review to see the full kit.";
  return body.length > PREVIEW_LENGTH ? `${body.slice(0, PREVIEW_LENGTH).trim()}…` : body;
}

export function DraftCard({ draft, onDismissed, onActionRecorded }: DraftCardProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"none" | "dismissing">("none");
  const [dismissError, setDismissError] = useState<string | null>(null);

  const handleReview = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onActionRecorded?.(draft.id, "reviewed");
    await recordWithTimeout(api.drafts.recordAction(draft.id, "reviewed"));
    router.push(`/app/library/${draft.id}`);
  };

  const handleSchedule = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onActionRecorded?.(draft.id, "scheduled");
    await recordWithTimeout(api.drafts.recordAction(draft.id, "scheduled"));
    router.push(`/app/scheduling?kit=${draft.id}`);
  };

  const handleDismiss = async () => {
    if (busy !== "none") return;
    setBusy("dismissing");
    setDismissError(null);
    try {
      await api.drafts.dismiss(draft.id);
      onDismissed(draft.id);
    } catch {
      // 401/402/403 are toasted by api-client interceptors; for everything
      // else surface inline so the user knows their click was acknowledged.
      setBusy("none");
      setDismissError("Couldn't dismiss. Try again.");
    }
  };

  const title = draft.title || "Untitled draft";
  const preview = pickPreview(draft);

  return (
    <article className="relative flex flex-col gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors overflow-hidden">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/[0.04] blur-2xl rounded-full pointer-events-none" />

      <header className="relative flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground leading-snug line-clamp-2">{title}</h3>
        {draft.origin === "autonomous" && (
          <span className="text-[10px] uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
            Echo drafted
          </span>
        )}
      </header>

      <p className="relative text-xs text-muted-foreground leading-relaxed line-clamp-3">{preview}</p>

      <div className="relative flex items-center gap-2 mt-1">
        <Link
          href={`/app/library/${draft.id}`}
          onClick={handleReview}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <Eye size={14} />
          Review
        </Link>
        <Link
          href={`/app/scheduling?kit=${draft.id}`}
          onClick={handleSchedule}
          className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary"
        >
          <Calendar size={14} />
          Schedule
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
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
