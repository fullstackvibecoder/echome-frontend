'use client';

/**
 * ExportProgressModal
 *
 * Full-screen overlay shown while a clip is being burned + uploaded at 1080p.
 * Connects to the backend SSE stream for the given clipId to show live progress.
 * Rotates engagement messages to keep the user informed while they wait.
 */

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useExportProgress } from '@/hooks/useExportProgress';

const EXPORT_MESSAGES = [
  'Encoding at 1080p for maximum quality…',
  'Burning word-perfect captions into every frame',
  'Optimizing for Instagram, TikTok, and LinkedIn',
  'Applying your caption style and position',
  'Using slow preset — worth the wait for crisp text',
  'Your clip will look sharp on any device',
  'This is the highest quality your paid plan offers',
  'Compressing for fast upload without losing detail',
];

interface ExportProgressModalProps {
  clipId: string | null; // null closes the modal
  onClose: () => void;
}

export function ExportProgressModal({ clipId, onClose }: ExportProgressModalProps) {
  const progress = useExportProgress(clipId);
  const [messageIndex, setMessageIndex] = useState(0);

  // Rotate engagement messages every 4s
  useEffect(() => {
    if (!clipId) return;
    const timer = setInterval(() => {
      setMessageIndex(i => (i + 1) % EXPORT_MESSAGES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [clipId]);

  // Auto-close 1s after success
  useEffect(() => {
    if (progress.isComplete) {
      const timer = setTimeout(onClose, 1200);
      return () => clearTimeout(timer);
    }
  }, [progress.isComplete, onClose]);

  if (!clipId) return null;

  const rotatingMessage = EXPORT_MESSAGES[messageIndex];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-surface border border-white/10 p-8 shadow-2xl">
        {/* Status icon */}
        <div className="flex justify-center mb-6">
          {progress.hasError ? (
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
          ) : progress.isComplete ? (
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center animate-in zoom-in duration-300">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className="text-center text-xl font-bold text-white mb-2">
          {progress.hasError
            ? 'Export failed'
            : progress.isComplete
            ? 'Clip ready!'
            : 'Preparing 1080p download'}
        </h2>

        {/* Status message (from backend SSE) */}
        <p className="text-center text-sm text-white/70 mb-6 h-5">
          {progress.message}
        </p>

        {/* Progress bar */}
        {!progress.hasError && (
          <div className="mb-4">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.max(2, progress.percent)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-white/50 mt-1.5 tabular-nums">
              <span>{Math.round(progress.percent)}%</span>
              <span>{progress.isComplete ? 'Done' : 'In progress'}</span>
            </div>
          </div>
        )}

        {/* Rotating engagement message */}
        {!progress.hasError && !progress.isComplete && (
          <div
            key={rotatingMessage}
            className="text-center text-xs text-white/50 italic mt-4 animate-in fade-in duration-500"
          >
            {rotatingMessage}
          </div>
        )}

        {/* Error detail */}
        {progress.hasError && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
            <p className="text-xs text-red-300">
              {progress.errorMessage || 'Something went wrong during export.'}
            </p>
            <button
              onClick={onClose}
              className="mt-3 px-4 py-1.5 bg-white/10 hover:bg-white/20 text-xs text-white rounded-full transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* Hint */}
        {!progress.hasError && !progress.isComplete && (
          <p className="text-center text-[10px] text-white/30 mt-5">
            You can leave this tab open — we&apos;ll keep working in the background
          </p>
        )}
      </div>
    </div>
  );
}
