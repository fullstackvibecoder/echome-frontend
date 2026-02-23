'use client';

import {
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
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
 * Panel showing content mix scheduling suggestions
 */
export function WeekSuggestions({
  analysis,
  loading,
  onApplySuggestion,
}: WeekSuggestionsProps) {
  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-20 bg-muted rounded" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <p className="text-muted-foreground text-sm">
          Schedule some content to see Agentic suggestions.
        </p>
      </div>
    );
  }

  const { currentStats, recommendations, suggestions, isBalanced, totalScheduled } = analysis;

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Weekly Content Mix</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Balanced content categories for optimal engagement
        </p>
      </div>

      {/* Status Banner */}
      <div
        className={`px-4 py-3 flex items-center gap-2 ${
          isBalanced ? 'bg-green-50' : 'bg-amber-50'
        }`}
      >
        {isBalanced ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Great job! Your content mix is balanced this week.
            </span>
          </>
        ) : (
          <>
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              Your content mix needs attention. See suggestions below.
            </span>
          </>
        )}
      </div>

      {/* Category Stats */}
      <div className="px-4 py-4 border-b border-border">
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(TLL_TARGETS) as ContentCategory[]).map(category => {
            const count = currentStats[category] || 0;
            const target = TLL_TARGETS[category];
            const Icon = CATEGORY_ICONS[category];
            const config = CONTENT_CATEGORY_CONFIG[category];

            const isLow = count < target.min;
            const isHigh = count > target.max;
            const isGood = count >= target.min && count <= target.max;

            return (
              <div
                key={category}
                className={`p-3 rounded-lg border ${
                  isGood
                    ? 'border-green-200 bg-green-50'
                    : isLow
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-primary/20 bg-primary/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {config.label.split('/')[0]}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-2xl font-bold ${
                      isGood
                        ? 'text-green-700'
                        : isLow
                        ? 'text-amber-700'
                        : 'text-primary'
                    }`}
                  >
                    {count}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {target.min}-{target.max} target
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total count */}
        <div className="mt-3 text-center">
          <span className="text-sm text-muted-foreground">
            <TrendingUp className="w-4 h-4 inline mr-1" />
            {totalScheduled} posts scheduled this week
            <span className="text-muted-foreground ml-1">(recommended: 7-10)</span>
          </span>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="px-4 py-3 border-b border-border">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            Recommendations
          </h4>
          <ul className="space-y-2">
            {recommendations.slice(0, 3).map((rec, index) => (
              <li
                key={index}
                className="text-sm text-muted-foreground flex items-start gap-2"
              >
                <span className="text-amber-500 mt-0.5">•</span>
                {rec.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggested Slots */}
      {suggestions.length > 0 && (
        <div className="px-4 py-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            Suggested Time Slots
          </h4>
          <div className="space-y-2">
            {suggestions.slice(0, 4).map((suggestion, index) => {
              const Icon = CATEGORY_ICONS[suggestion.suggestedCategory];
              const suggestedDate = new Date(suggestion.suggestedTime);

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {suggestedDate.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                        {' at '}
                        {suggestedDate.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {CONTENT_CATEGORY_CONFIG[suggestion.suggestedCategory].label.split('/')[0]}
                      </div>
                    </div>
                  </div>

                  {onApplySuggestion && (
                    <button
                      onClick={() => onApplySuggestion(suggestion)}
                      className="text-xs px-2 py-1 text-primary hover:bg-primary/10 rounded transition-colors"
                    >
                      Use this slot
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Methodology Info */}
      <div className="px-4 py-3 bg-muted border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Recommended weekly posting mix:
          <br />
          2-3 Authority • 2-3 Personal • 1-2 Pain/Problem • 1-2 Testimonial
        </p>
      </div>
    </div>
  );
}
