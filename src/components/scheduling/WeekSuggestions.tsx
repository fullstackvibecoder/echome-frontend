'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  Clock,
} from 'lucide-react';
import {
  WeeklyAnalysis,
  ScheduleSuggestion,
} from '@/types';

interface WeekSuggestionsProps {
  analysis: WeeklyAnalysis | null;
  loading?: boolean;
  onApplySuggestion?: (suggestion: ScheduleSuggestion) => void;
}

const WEEKLY_TARGET = { min: 5, max: 7 };

function getFrequencyStatus(count: number): 'low' | 'good' | 'high' {
  if (count < WEEKLY_TARGET.min) return 'low';
  if (count > WEEKLY_TARGET.max) return 'high';
  return 'good';
}

/**
 * Compact posting cadence strip with expandable suggested slots
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
          <div className="h-4 bg-muted rounded w-32" />
          <div className="flex-1" />
          <div className="h-4 bg-muted rounded w-20" />
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const { suggestions, totalScheduled } = analysis;
  const status = getFrequencyStatus(totalScheduled);
  const hasSuggestions = suggestions.length > 0;

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Compact Strip */}
      <button
        onClick={() => hasSuggestions && setExpanded(!expanded)}
        className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
          hasSuggestions ? 'hover:bg-muted/50 cursor-pointer' : 'cursor-default'
        }`}
      >
        {/* Status indicator */}
        {status === 'good' ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        )}

        {/* Posting cadence */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`text-lg font-bold tabular-nums ${
            status === 'good' ? 'text-emerald-600 dark:text-emerald-400'
              : status === 'low' ? 'text-amber-600 dark:text-amber-400'
              : 'text-primary'
          }`}>
            {totalScheduled}
          </span>
          <span className="text-sm text-muted-foreground">
            posts this week
          </span>
          <span className="text-xs text-muted-foreground/60 hidden sm:inline">
            (aim for {WEEKLY_TARGET.min}-{WEEKLY_TARGET.max})
          </span>
        </div>

        {/* Expand toggle (only if suggestions exist) */}
        {hasSuggestions && (
          <div className="flex items-center gap-1.5 flex-shrink-0 text-muted-foreground">
            <span className="text-xs hidden sm:inline">
              {suggestions.length} suggested slot{suggestions.length !== 1 ? 's' : ''}
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        )}
      </button>

      {/* Expanded: Suggested Time Slots */}
      {expanded && hasSuggestions && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
            Best times to post
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 6).map((suggestion, index) => {
              const suggestedDate = new Date(suggestion.suggestedTime);

              return (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    onApplySuggestion?.(suggestion);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {suggestedDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                    })}
                  </span>
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">
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
  );
}
