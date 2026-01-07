'use client';

import { useState, useEffect } from 'react';

interface MboxProgressUIProps {
  progress: number;
  status: string;
}

const UPLOAD_MESSAGES = [
  'Creating AI embeddings for your writing style...',
  'Teaching Echo your unique voice patterns...',
  'Analyzing sentence structures and word choices...',
  'Building your personalized language model...',
  'Processing email content for voice matching...',
  'This can take a few minutes for large archives...',
];

export function MboxProgressUI({ progress, status }: MboxProgressUIProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [dots, setDots] = useState('');

  // Rotate through encouraging messages every 8 seconds during upload phase
  useEffect(() => {
    if (progress >= 70) {
      const interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % UPLOAD_MESSAGES.length);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [progress]);

  // Animate dots every 500ms to show activity
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const getPhaseInfo = () => {
    if (progress < 30) {
      return {
        icon: '📖',
        phase: 'Reading file',
        detail: 'Streaming in 50MB chunks - works with any file size',
      };
    } else if (progress < 70) {
      return {
        icon: '🔍',
        phase: 'Parsing emails',
        detail: 'Extracting text content from your sent emails',
      };
    } else {
      return {
        icon: '🧠',
        phase: 'Training Echo',
        detail: UPLOAD_MESSAGES[messageIndex],
      };
    }
  };

  const phaseInfo = getPhaseInfo();
  const isUploadPhase = progress >= 70;

  return (
    <div className="mb-6 p-4 bg-accent/10 border-2 border-accent rounded-lg">
      <div className="flex items-start gap-4">
        {/* Spinner */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Main status */}
          <div className="flex items-center gap-2">
            <span className="text-xl">{phaseInfo.icon}</span>
            <p className="text-text-primary font-semibold text-lg">
              {status || `${phaseInfo.phase}${dots}`}
            </p>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-3 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Progress details */}
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-text-secondary">{phaseInfo.detail}</span>
            <span className="font-mono font-semibold text-text-primary">{progress}%</span>
          </div>

          {/* Upload phase: show patience message */}
          {isUploadPhase && (
            <p className="mt-2 text-sm text-text-secondary bg-bg-secondary rounded px-2 py-1">
              <span className="font-semibold">Please keep this tab open.</span>{' '}
              Large archives can take several minutes. You can work in other tabs, just don&apos;t close this one.
            </p>
          )}

          {/* Parsing phase tip */}
          {!isUploadPhase && progress >= 30 && (
            <p className="mt-2 text-sm text-text-secondary bg-bg-secondary rounded px-2 py-1">
              💡 Only your sent emails are processed - attachments and received emails are skipped.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
