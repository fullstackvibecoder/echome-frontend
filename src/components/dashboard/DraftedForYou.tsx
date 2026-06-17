"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import type { DraftProposal } from "@/types";
import { api } from "@/lib/api-client";
import { DraftCard } from "./DraftCard";

/**
 * Drafted For You — V1 dashboard panel.
 *
 * Shows existing drafts up top + a "Draft for me" trigger. Empty state
 * doesn't push the user toward generation if they haven't seeded the KB
 * yet — anti-aggression rule from the TLL Mind-Reader work: never imply
 * we can read minds we haven't yet read.
 *
 * The backend daily-draft cron is LIVE (06:00 UTC, origin='autonomous') —
 * those drafts already arrive here and render with the "Echo drafted" badge.
 * Remaining V2 FE work: hide the manual trigger once autonomous drafts are
 * present. V3 will add a per-draft refinement loop.
 */
export function DraftedForYou() {
  const [drafts, setDrafts] = useState<DraftProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await api.drafts.list();
      setDrafts(list);
    } catch {
      // Don't crash the dashboard on a transient list failure; we surface
      // a quiet inline note instead and let the user retry by clicking Generate.
      setError("Couldn't load drafts. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await api.drafts.generate();
      if (result.kit_ids.length === 0) {
        setError(
          result.echo_preamble?.slice(0, 240) ||
            "Echo couldn't find usable angles in your KB yet. Add a story or voice note and try again.",
        );
      } else {
        await refresh();
      }
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        setError("Daily draft limit reached. Try again tomorrow, or wait 24 hours.");
      } else {
        setError("Drafting failed. Please try again.");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleDismissed = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  if (loading) {
    return (
      <section aria-label="Drafted for you" className="mb-6">
        <div className="h-[120px] rounded-2xl border border-border bg-card animate-pulse" />
      </section>
    );
  }

  return (
    // id="drafts" + scroll-mt-20 → the "Your drafts are ready" email's CTA
    // links to /app#drafts and the browser scrolls this section into view
    // natively. Loading-skeleton state above intentionally lacks the id so
    // the brief flash doesn't pull the page partially-rendered.
    <section id="drafts" aria-label="Drafted for you" className="mb-6 scroll-mt-20">
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles size={14} className="text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Drafted for you</h2>
          {drafts.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {drafts.length} {drafts.length === 1 ? "draft" : "drafts"}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors disabled:opacity-50"
        >
          {generating ? "Drafting…" : "Draft for me"}
        </button>
      </header>

      {error && (
        <p className="text-xs text-muted-foreground mb-3 px-3 py-2 rounded-lg bg-muted/40">
          {error}
        </p>
      )}

      {drafts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-5 text-center">
          <p className="text-sm text-foreground mb-1">No drafts yet.</p>
          <p className="text-xs text-muted-foreground">
            Echo can pull angles from your KB and draft platform-ready kits in your voice. Click
            &ldquo;Draft for me&rdquo; to try.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {drafts.map((draft) => (
            <DraftCard key={draft.id} draft={draft} onDismissed={handleDismissed} />
          ))}
        </div>
      )}
    </section>
  );
}
