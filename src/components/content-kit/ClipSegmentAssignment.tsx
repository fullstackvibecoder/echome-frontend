'use client';

/**
 * ClipSegmentAssignment Component
 *
 * Shows template segments with AI-suggested clips for each.
 * Allows users to drag/swap clips between segments and review
 * assignments before creating a reel.
 */

import { useState, useCallback } from 'react';
import { VideoClipDetail, TemplateSegment, ReelTemplate, VideoClipSegmentMetadata } from '@/types';

interface SegmentAssignment {
  segmentId: string;
  clipId: string | null;
  confidence?: number;
}

interface ClipSegmentAssignmentProps {
  /** Available clips from the content kit */
  clips: VideoClipDetail[];
  /** Template to assign clips to */
  template: ReelTemplate;
  /** Called when user confirms assignments and proceeds */
  onConfirm: (assignments: Record<string, string>) => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Loading state */
  isLoading?: boolean;
}

export function ClipSegmentAssignment({
  clips,
  template,
  onConfirm,
  onCancel,
  isLoading = false,
}: ClipSegmentAssignmentProps) {
  // Initialize assignments from AI suggestions
  const [assignments, setAssignments] = useState<SegmentAssignment[]>(() => {
    return template.segments.map(segment => {
      // Find the best matching clip for this segment
      const matchingClip = clips.find(clip =>
        clip.segmentMetadata?.suggestedSegmentId === segment.id
      );

      return {
        segmentId: segment.id,
        clipId: matchingClip?.id || null,
        confidence: matchingClip?.segmentMetadata?.segmentConfidence,
      };
    });
  });

  // Track which clip is being dragged
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [dragOverSegmentId, setDragOverSegmentId] = useState<string | null>(null);

  // Get unassigned clips
  const assignedClipIds = new Set(assignments.map(a => a.clipId).filter(Boolean));
  const unassignedClips = clips.filter(clip => !assignedClipIds.has(clip.id));

  // Get clip by ID
  const getClipById = useCallback((clipId: string | null) => {
    if (!clipId) return null;
    return clips.find(c => c.id === clipId) || null;
  }, [clips]);

  // Get segment by ID
  const getSegmentById = useCallback((segmentId: string) => {
    return template.segments.find(s => s.id === segmentId);
  }, [template.segments]);

  // Assign a clip to a segment
  const assignClipToSegment = useCallback((clipId: string, segmentId: string) => {
    setAssignments(prev => {
      // First, remove the clip from any existing assignment
      const updated = prev.map(a => ({
        ...a,
        clipId: a.clipId === clipId ? null : a.clipId,
        confidence: a.clipId === clipId ? undefined : a.confidence,
      }));

      // Then assign to the target segment
      return updated.map(a => {
        if (a.segmentId === segmentId) {
          const clip = getClipById(clipId);
          return {
            ...a,
            clipId,
            confidence: clip?.segmentMetadata?.suggestedSegmentId === segmentId
              ? clip.segmentMetadata.segmentConfidence
              : undefined,
          };
        }
        return a;
      });
    });
  }, [getClipById]);

  // Remove clip from segment
  const removeClipFromSegment = useCallback((segmentId: string) => {
    setAssignments(prev =>
      prev.map(a => a.segmentId === segmentId ? { ...a, clipId: null, confidence: undefined } : a)
    );
  }, []);

  // Swap clips between two segments
  const swapClips = useCallback((fromSegmentId: string, toSegmentId: string) => {
    setAssignments(prev => {
      const fromAssignment = prev.find(a => a.segmentId === fromSegmentId);
      const toAssignment = prev.find(a => a.segmentId === toSegmentId);

      if (!fromAssignment || !toAssignment) return prev;

      return prev.map(a => {
        if (a.segmentId === fromSegmentId) {
          return { ...a, clipId: toAssignment.clipId, confidence: undefined };
        }
        if (a.segmentId === toSegmentId) {
          return { ...a, clipId: fromAssignment.clipId, confidence: undefined };
        }
        return a;
      });
    });
  }, []);

  // Handle drag and drop
  const handleDragStart = (clipId: string) => {
    setDraggingClipId(clipId);
  };

  const handleDragEnd = () => {
    setDraggingClipId(null);
    setDragOverSegmentId(null);
  };

  const handleDragOver = (e: React.DragEvent, segmentId: string) => {
    e.preventDefault();
    setDragOverSegmentId(segmentId);
  };

  const handleDrop = (e: React.DragEvent, segmentId: string) => {
    e.preventDefault();
    if (draggingClipId) {
      assignClipToSegment(draggingClipId, segmentId);
    }
    setDraggingClipId(null);
    setDragOverSegmentId(null);
  };

  // Handle confirm
  const handleConfirm = () => {
    const assignmentMap: Record<string, string> = {};
    assignments.forEach(a => {
      if (a.clipId) {
        assignmentMap[a.segmentId] = a.clipId;
      }
    });
    onConfirm(assignmentMap);
  };

  // Check if all segments have assignments
  const allSegmentsAssigned = assignments.every(a => a.clipId !== null);

  // Get confidence color
  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-gray-500/10 text-gray-400';
    if (confidence >= 80) return 'bg-green-500/10 text-green-400';
    if (confidence >= 60) return 'bg-yellow-500/10 text-yellow-400';
    return 'bg-orange-500/10 text-orange-400';
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-text-primary">
            Assign Clips to Segments
          </h3>
          <div className="px-3 py-1.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
            {template.name}
          </div>
        </div>
        <p className="text-sm text-text-secondary">
          AI has suggested clips for each segment. Review and adjust as needed.
        </p>
      </div>

      {/* Segments Grid */}
      <div className="space-y-4 mb-6">
        {template.segments.map((segment, index) => {
          const assignment = assignments.find(a => a.segmentId === segment.id);
          const assignedClip = assignment?.clipId ? getClipById(assignment.clipId) : null;
          const isDragOver = dragOverSegmentId === segment.id;

          return (
            <div
              key={segment.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                isDragOver
                  ? 'border-accent bg-accent/5'
                  : assignedClip
                  ? 'border-border bg-bg-tertiary'
                  : 'border-dashed border-border/50 bg-bg-tertiary/50'
              }`}
              onDragOver={(e) => handleDragOver(e, segment.id)}
              onDrop={(e) => handleDrop(e, segment.id)}
            >
              {/* Segment Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm font-medium text-accent">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium text-text-primary">{segment.label}</h4>
                    <p className="text-xs text-text-secondary">
                      {segment.description || `${formatDuration(segment.defaultDurationMs / 1000)} segment`}
                    </p>
                  </div>
                </div>
                {assignment?.confidence && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(assignment.confidence)}`}>
                    {assignment.confidence}% match
                  </span>
                )}
              </div>

              {/* Assigned Clip or Empty State */}
              {assignedClip ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-secondary border border-border">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-20 h-14 rounded overflow-hidden bg-bg-tertiary">
                    {assignedClip.thumbnailUrl ? (
                      <img
                        src={assignedClip.thumbnailUrl}
                        alt={assignedClip.title || 'Clip'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        🎬
                      </div>
                    )}
                  </div>

                  {/* Clip Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary text-sm truncate">
                      {assignedClip.title || 'Untitled Clip'}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {formatDuration(assignedClip.duration)}
                      {assignedClip.segmentMetadata?.segmentReasoning && (
                        <span className="ml-2 text-text-tertiary">
                          • {assignedClip.segmentMetadata.segmentReasoning}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeClipFromSegment(segment.id)}
                    className="flex-shrink-0 p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary hover:text-error transition-colors"
                    title="Remove clip"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center p-6 rounded-lg border border-dashed border-border/50 text-text-secondary text-sm">
                  <span>Drag a clip here or select from below</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Unassigned Clips Pool */}
      {unassignedClips.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-text-secondary mb-3">
            Available Clips ({unassignedClips.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {unassignedClips.map(clip => (
              <div
                key={clip.id}
                draggable
                onDragStart={() => handleDragStart(clip.id)}
                onDragEnd={handleDragEnd}
                className={`
                  cursor-grab active:cursor-grabbing rounded-lg border border-border overflow-hidden
                  bg-bg-tertiary hover:border-accent/50 transition-all
                  ${draggingClipId === clip.id ? 'opacity-50 ring-2 ring-accent' : ''}
                `}
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-bg-secondary relative">
                  {clip.thumbnailUrl ? (
                    <img
                      src={clip.thumbnailUrl}
                      alt={clip.title || 'Clip'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">
                      🎬
                    </div>
                  )}
                  {/* Duration badge */}
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs">
                    {formatDuration(clip.duration)}
                  </div>
                  {/* AI suggestion badge */}
                  {clip.segmentMetadata?.suggestedSegmentId && (
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-accent/90 text-white text-xs">
                      {clip.segmentMetadata.suggestedSegmentId}
                    </div>
                  )}
                </div>
                {/* Clip title */}
                <div className="p-2">
                  <p className="text-xs text-text-primary truncate">
                    {clip.title || 'Untitled'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Clips Assigned Message */}
      {unassignedClips.length === 0 && clips.length > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
          <span className="text-green-400 text-sm">
            ✓ All clips have been assigned to segments
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-50"
        >
          Cancel
        </button>

        <div className="flex items-center gap-3">
          {!allSegmentsAssigned && (
            <span className="text-xs text-text-secondary">
              {assignments.filter(a => a.clipId === null).length} segment(s) need clips
            </span>
          )}
          <button
            onClick={handleConfirm}
            disabled={isLoading || !allSegmentsAssigned}
            className="px-6 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Creating...
              </>
            ) : (
              <>Continue to Reel Editor</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClipSegmentAssignment;
