"use client";

import {
  BRAND_SAFETY_DISCLAIMER,
  HARD_FLAG_THRESHOLD,
  SOFT_FLAG_THRESHOLD,
  type HemingwayAnalysis,
} from "@/lib/hemingway";

interface GradeStyle {
  bg: string;
  text: string;
  border: string;
  label: string;
}

function gradeStyle(grade: number): GradeStyle {
  if (grade <= SOFT_FLAG_THRESHOLD) {
    return { bg: "bg-green-100", text: "text-green-700", border: "border-green-300", label: "Easy read" };
  }
  if (grade <= HARD_FLAG_THRESHOLD) {
    return { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300", label: "Watch complexity" };
  }
  return { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", label: "Too dense" };
}

interface BadgeProps {
  analysis: HemingwayAnalysis | null;
}

export function HemingwayGradeBadge({ analysis }: BadgeProps) {
  if (!analysis || analysis.allSentences.length === 0) return null;
  const display = Math.max(0, analysis.documentGradeLevel);
  const style = gradeStyle(analysis.documentGradeLevel);
  return (
    <span
      className={`text-[11px] px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border} font-medium`}
      title={`Reading-level estimate. Echo aims for grade ${SOFT_FLAG_THRESHOLD.toFixed(0)} or below on social copy.`}
    >
      Grade {display.toFixed(1)} · {style.label}
    </span>
  );
}

interface PanelProps {
  analysis: HemingwayAnalysis | null;
}

export function HemingwayPanel({ analysis }: PanelProps) {
  if (!analysis) return null;
  if (analysis.flags.length === 0 && analysis.documentFlags.length === 0) return null;

  return (
    <div className="mt-2 p-3 rounded-lg border border-border bg-muted/30 space-y-2">
      <div className="text-xs font-medium text-foreground">Echo&apos;s read on this</div>

      {analysis.documentFlags.map((f, i) => (
        <div
          key={`doc-${i}`}
          className="text-xs px-2 py-1.5 rounded bg-amber-50 text-amber-800 border border-amber-200"
        >
          {f.message}
        </div>
      ))}

      {analysis.flags.length > 0 && (
        <ul className="space-y-1">
          {analysis.flags.map((f, i) => {
            const isHard = f.severity === "hard";
            return (
              <li key={i} className="flex gap-2 items-start text-xs">
                <span
                  className={`mt-1 inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                    isHard ? "bg-red-500" : "bg-yellow-500"
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={`flex-1 cursor-help underline decoration-2 underline-offset-2 ${
                    isHard ? "decoration-red-500" : "decoration-yellow-500"
                  }`}
                  title={f.suggestion}
                >
                  {f.text.length > 140 ? `${f.text.slice(0, 140)}…` : f.text}
                </span>
                <span
                  className={`text-[10px] font-mono flex-shrink-0 ${
                    isHard ? "text-red-700" : "text-yellow-700"
                  }`}
                >
                  G{f.gradeLevel.toFixed(1)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-border">
        {BRAND_SAFETY_DISCLAIMER}
      </p>
    </div>
  );
}
