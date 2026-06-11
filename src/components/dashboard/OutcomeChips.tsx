"use client";

import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Library,
  Link2,
  Mic,
  PenLine,
  Sparkles,
  Wand2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useDataState, type DataState } from "@/hooks/useDataState";
import { useEchoExperience } from "@/hooks/useEchoExperience";

interface ChipAction {
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

const CHIPS: Record<DataState, ChipAction[]> = {
  pre: [
    {
      label: "Show me my voice",
      description: "Upload a writing sample. Echo will start mapping your voice.",
      icon: Mic,
      href: "/app/voice",
    },
    {
      label: "Connect a platform",
      description: "Show Echo where you already publish: Instagram, YouTube, LinkedIn.",
      icon: Link2,
      href: "/app/settings",
    },
    {
      label: "Try a sample kit",
      description: "Drop a topic. Echo will draft something in your voice.",
      icon: Sparkles,
      href: "/app",
    },
  ],
  partial: [
    {
      label: "Turn my last upload into a content kit",
      description: "One input, multi-platform output",
      icon: Wand2,
      href: "/app",
    },
    {
      label: "Draft a post in my voice",
      description: "Quick LinkedIn or blog from a topic",
      icon: PenLine,
      href: "/app",
    },
    {
      label: "Schedule this week's posts",
      description: "Plan the calendar around what Echo has already drafted for you.",
      icon: Calendar,
      href: "/app/calendar",
    },
  ],
  full: [
    {
      label: "Draft a Mind-Reader post",
      description: "Echo pulls a personal story from your knowledge base",
      icon: Sparkles,
      href: "/app/voice?ask=mind-reader",
    },
    {
      label: "What should I post tomorrow?",
      description: "Open the calendar with smart suggestions",
      icon: Calendar,
      href: "/app/calendar",
    },
    {
      label: "Review my content kits",
      description: "What Echo has built for you so far.",
      icon: Library,
      href: "/app/library",
    },
  ],
};

const LEVEL_UP_CHIP: ChipAction = {
  label: "Your voice is ready for Deep-Dive Carousels",
  description: "Echo has enough of your voice to handle long-form now.",
  icon: Zap,
  href: "/app",
};

export function OutcomeChips() {
  const { dataState, voiceLevelUpReady, loading } = useDataState();
  const echoOn = useEchoExperience();

  if (loading) return <OutcomeChipsSkeleton />;

  const chips = [...CHIPS[dataState]];
  if (voiceLevelUpReady && dataState !== "pre") {
    chips.unshift(LEVEL_UP_CHIP);
  }

  // In echo-experience mode the Voice-page chat (which the ?ask=mind-reader
  // deep-link targets) is hidden. Repoint that chip to Home, pre-filling the
  // Echo hero with a mind-reader ask via ?echoAsk so the affordance survives.
  const resolveHref = (href: string) =>
    echoOn && href === "/app/voice?ask=mind-reader"
      ? `/app?echoAsk=${encodeURIComponent("Pull a personal story from my knowledge base I could post about.")}`
      : href;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {chips.map((chip, i) => (
        <Link
          key={`${chip.href}-${i}`}
          href={resolveHref(chip.href)}
          className="group relative flex items-start gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-[0_4px_20px_rgba(0,212,255,0.06)] transition-all overflow-hidden"
        >
          {/* ambient cyan glow on hover, matches the brand surface pattern */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/[0.04] blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="relative mt-0.5 p-2 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors flex-shrink-0">
            <chip.icon size={16} className="text-primary" />
          </div>
          <div className="relative flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium text-foreground leading-snug">
                {chip.label}
              </span>
              <ArrowRight
                size={14}
                className="mt-0.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {chip.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function OutcomeChipsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-[88px] rounded-2xl border border-border bg-card animate-pulse"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
