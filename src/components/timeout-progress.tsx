/**
 * Timeout Progress Component
 * 
 * Shows progress and timeout information for long-running operations
 * with cancel functionality and user-friendly messaging.
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Clock, AlertCircle } from 'lucide-react';

interface TimeoutProgressProps {
  isVisible: boolean;
  operation: string;
  progress: string | null;
  timeElapsed: number;
  canCancel: boolean;
  onCancel?: () => void;
  className?: string;
}

export function TimeoutProgress({
  isVisible,
  operation,
  progress,
  timeElapsed,
  canCancel,
  onCancel,
  className = '',
}: TimeoutProgressProps) {
  const [showTimeWarning, setShowTimeWarning] = useState(false);

  // Show warning after 2 minutes
  useEffect(() => {
    setShowTimeWarning(timeElapsed > 120000);
  }, [timeElapsed]);

  if (!isVisible) return null;

  const minutes = Math.floor(timeElapsed / 60000);
  const seconds = Math.floor((timeElapsed % 60000) / 1000);
  const timeText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-border shadow-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <h3 className="font-semibold text-text-primary">{operation}</h3>
          </div>
          {canCancel && onCancel && (
            <button
              onClick={onCancel}
              className="text-text-secondary hover:text-text-primary p-1 rounded transition-colors"
              title="Cancel operation"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {progress && (
          <p className="text-sm text-text-secondary mb-2">
            {progress}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <Clock className="w-3 h-3" />
          <span>Running for {timeText}</span>
        </div>

        {showTimeWarning && (
          <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-xs text-amber-700 dark:text-amber-300">
                <p className="font-medium">Taking longer than usual</p>
                <p>This might be due to high server load. The operation will continue running.</p>
              </div>
            </div>
          </div>
        )}

        {canCancel && onCancel && (
          <button
            onClick={onCancel}
            className="mt-3 w-full px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary border border-border hover:border-accent rounded-lg transition-colors"
          >
            Cancel Operation
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to manage timeout progress state
 */
export function useTimeoutProgress() {
  const [isVisible, setIsVisible] = useState(false);
  const [operation, setOperation] = useState('');
  const [progress, setProgress] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [canCancel, setCanCancel] = useState(false);

  const show = (operationName: string, cancellable: boolean = true) => {
    setOperation(operationName);
    setIsVisible(true);
    setCanCancel(cancellable);
    setProgress(null);
    setTimeElapsed(0);
  };

  const hide = () => {
    setIsVisible(false);
    setProgress(null);
    setTimeElapsed(0);
  };

  const updateProgress = (message: string, elapsed: number) => {
    setProgress(message);
    setTimeElapsed(elapsed);
  };

  return {
    isVisible,
    operation,
    progress,
    timeElapsed,
    canCancel,
    show,
    hide,
    updateProgress,
  };
}

/**
 * Floating timeout indicator for global operations
 */
interface GlobalTimeoutIndicatorProps {
  operations: Array<{
    id: string;
    name: string;
    progress?: string;
    timeElapsed: number;
    cancellable: boolean;
  }>;
  onCancel?: (operationId: string) => void;
}

export function GlobalTimeoutIndicator({
  operations,
  onCancel,
}: GlobalTimeoutIndicatorProps) {
  if (operations.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {operations.map((operation) => {
        const minutes = Math.floor(operation.timeElapsed / 60000);
        const seconds = Math.floor((operation.timeElapsed % 60000) / 1000);
        const timeText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

        return (
          <div
            key={operation.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-border shadow-lg p-3 min-w-60"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium text-text-primary">
                  {operation.name}
                </span>
              </div>
              {operation.cancellable && onCancel && (
                <button
                  onClick={() => onCancel(operation.id)}
                  className="text-text-secondary hover:text-text-primary p-0.5 rounded transition-colors"
                  title="Cancel"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {operation.progress && (
              <p className="text-xs text-text-secondary mb-1">
                {operation.progress}
              </p>
            )}

            <div className="flex items-center gap-1 text-xs text-text-tertiary">
              <Clock className="w-2.5 h-2.5" />
              <span>{timeText}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}