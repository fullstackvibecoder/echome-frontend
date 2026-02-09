'use client';

/**
 * Segment Timeline Component
 *
 * Visual timeline showing all segments with their durations.
 */

import type { ReelTemplate } from '@/types';

interface ClipUpload {
  segmentId: string;
  file?: File;
  sourceUrl?: string;
  trimStartMs?: number;
  trimEndMs?: number;
  preview?: string;
}

interface SegmentTimelineProps {
  template: ReelTemplate;
  clips: Map<string, ClipUpload>;
}

export function SegmentTimeline({ template, clips }: SegmentTimelineProps) {
  const totalDuration = template.segments.reduce(
    (sum, seg) => sum + seg.defaultDurationMs,
    0
  );

  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-primary">Timeline Preview</h3>
        <span className="text-sm text-text-secondary">
          Total: {formatDuration(totalDuration)}
        </span>
      </div>

      {/* Timeline bar */}
      <div className="relative h-16 bg-surface rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex">
          {template.segments.map((segment, index) => {
            const widthPercent = (segment.defaultDurationMs / totalDuration) * 100;
            const clip = clips.get(segment.id);
            const hasClip = !!clip;

            // Color based on segment order
            const colors = [
              'from-blue-500 to-blue-600',
              'from-purple-500 to-purple-600',
              'from-pink-500 to-pink-600',
              'from-orange-500 to-orange-600',
              'from-green-500 to-green-600',
            ];
            const colorClass = colors[index % colors.length];

            return (
              <div
                key={segment.id}
                className="relative h-full flex items-center justify-center"
                style={{ width: `${widthPercent}%` }}
              >
                {/* Segment background */}
                <div
                  className={`
                    absolute inset-y-0 inset-x-0.5 rounded
                    bg-gradient-to-b ${colorClass}
                    ${!hasClip ? 'opacity-30' : ''}
                  `}
                />

                {/* Thumbnail preview if available */}
                {clip?.preview && (
                  <div className="absolute inset-y-1 inset-x-1 rounded overflow-hidden opacity-50">
                    <video
                      src={clip.preview}
                      className="w-full h-full object-cover"
                      muted
                    />
                  </div>
                )}

                {/* Label */}
                <span className="relative z-10 text-white text-xs font-medium truncate px-1">
                  {segment.label}
                </span>

                {/* Transition indicator */}
                {index < template.segments.length - 1 && segment.transitionOut && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20">
                    <div className="w-4 h-4 bg-white rounded-full shadow flex items-center justify-center">
                      <TransitionIcon type={segment.transitionOut} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Time markers */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 py-0.5">
          <span className="text-[10px] text-white/60">0:00</span>
          <span className="text-[10px] text-white/60">{formatDuration(totalDuration)}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {template.segments.map((segment, index) => {
          const clip = clips.get(segment.id);
          const hasClip = !!clip;

          return (
            <div key={segment.id} className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded ${
                  hasClip ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
              <span className="text-xs text-text-secondary">
                {segment.label}
                {segment.textOverlay && (
                  <span className="text-accent ml-1">"{segment.textOverlay}"</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TransitionIcon({ type }: { type: string }) {
  switch (type) {
    case 'whip_pan':
      return (
        <svg className="w-2 h-2 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
        </svg>
      );
    case 'zoom_in':
    case 'zoom_out':
      return (
        <svg className="w-2 h-2 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5z" />
        </svg>
      );
    case 'flash':
      return (
        <svg className="w-2 h-2 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 2v11h3v9l7-12h-4l4-8z" />
        </svg>
      );
    case 'fade':
      return (
        <svg className="w-2 h-2 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" opacity="0.5" />
        </svg>
      );
    default: // cut
      return (
        <svg className="w-2 h-2 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
          <rect x="10" y="4" width="4" height="16" />
        </svg>
      );
  }
}
