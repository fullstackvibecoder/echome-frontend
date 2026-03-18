'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  User,
  AlertCircle,
  Star,
} from 'lucide-react';
import {
  WeeklyAnalysis,
  ContentCategory,
  CONTENT_CATEGORY_CONFIG,
  ScheduleSuggestion,
} from '@/types';

interface WeekSuggestionsProps {
  analysis: WeeklyAnalysis | null;
  loading?: boolean;
  onApplySuggestion?: (suggestion: ScheduleSuggestion) => void;
}

const CATEGORY_ICONS: Record<ContentCategory, typeof GraduationCap> = {
  authority: GraduationCap,
  personal_story: User,
  pain_problem: AlertCircle,
  testimonial: Star,
};

const TLL_TARGETS: Record<ContentCategory, { min: number; max: number }> = {
  authority: { min: 2, max: 3 },
  personal_story: { min: 2, max: 3 },
  pain_problem: { min: 1, max: 2 },
  testimonial: { min: 1, max: 2 },
};

/**
 * Compact content mix strip with expandable details
 */
export function WeekSuggestions({
  analysis,
  loading,
  onApplySuggestion,
}: WeekSuggestionsProps) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border px-4 py-3">
        <div className="animate-pulse flex items-center gap-4">
          <div className="h-4 bg-muted rounded w-24" />
          <div className="flex gap-3 flex-1">
            <div className="h-4 bg-muted rounded w-16" />
            <div className="h-4 bg-muted rounded w-16" />
            <div className="h-4 bg-muted rounded w-16" />
            <div className="h-4 bg-muted rounded w-16" />
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const { currentStats, recommendations, suggestions, isBalanced, totalScheduled } = analysis;

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Compact Strip */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-4 hover:bg-muted/50 transition-colors"
      >
        {/* Status indicator */}
        {isBalanced ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        )}

        {/* Category counts inline */}
        <div className="flex items-center gap-3 flex-1 min-w-0 overflow-x-auto">
          {(Object.keys(TLL_TARGETS) as ContentCategory[]).map(category => {
            const count = currentStats[category] || 0;
            const target = TLL_TARGETS[category];
            const Icon = CATEGORY_ICONS[category];
            const isLow = count < target.min;
            const isGood = count >= target.min && count <= target.max;

            return (
              <div key={category} className="flex items-center gap-1.5 flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className={`text-sm font-semibold tabular-nums ${
                  isGood ? 'text-emerald-600 dark:text-emerald-400'
                    : isLow ? 'text-amber-600 dark:text-amber-400'
                    : 'text-primary'
                }`}>
                  {count}
                </span>
                <span className="text-xs text-muted-foreground">
                  /{target.max}
                </span>
              </div>
            );
          })}
        </div>

        {/* Total + expand toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {totalScheduled} this week
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-border">
          {/* Category Detail Cards */}
          <div className="px-4 py-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(TLL_TARGETS) as ContentCategory[]).map(category => {
                const count = currentStats[category] || 0;
                const target = TLL_TARGETS[category];
                const Icon = CATEGORY_ICONS[category];
                const config = CONTENT_CATEGORY_CONFIG[category];
                const isLow = count < target.min;
                const isGood = count >= target.min && count <= target.max;

                return (
                  <div
                    key={category}
                    className={`p-3 rounded-lg border ${
                      isGood
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : isLow
                        ? 'border-amber-500/20 bg-amber-500/5'
                        : 'border-primary/20 bg-primary/5'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        {config.label.split('/')[0]}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-xl font-bold ${
                        isGood ? 'text-emerald-600 dark:text-emerald-400'
                          : isLow ? 'text-amber-600 dark:text-amber-400'
                          : 'text-primary'
                      }`}>
                        {count}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        / {target.min}-{target.max}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="px-4 py-3 border-t border-border">
              <ul className="space-y-1.5">
                {recommendations.slice(0, 3).map((rec, index) => (
                  <li
                    key={index}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <span className="text-amber-500 mt-0.5 flex-shrink-0">-</span>
                    {rec.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested Slots */}
          {suggestions.length > 0 && (
            <div className="px-4 py-3 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Suggested slots
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 4).map((suggestion, index) => {
                  const Icon = CATEGORY_ICONS[suggestion.suggestedCategory];
                  const suggestedDate = new Date(suggestion.suggestedTime);

                  return (
                    <button
                      key={index}
                      onClick={() => onApplySuggestion?.(suggestion)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm"
                    >
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {suggestedDate.toLocaleDateString('en-US', {
                          weekday: 'short',
                        })}
                        {' '}
                        {suggestedDate.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
