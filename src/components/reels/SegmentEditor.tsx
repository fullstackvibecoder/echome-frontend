'use client';

import React from 'react';
import { X, Plus } from 'lucide-react';

interface ReelSegment {
  text: string;
  duration: number;
}

interface SegmentEditorProps {
  segments: ReelSegment[];
  onSegmentsChange: (segments: ReelSegment[]) => void;
  singleBlockText: string;
  onSingleBlockTextChange: (text: string) => void;
  mode: 'segments' | 'single';
  onModeChange: (mode: 'segments' | 'single') => void;
}

function wordCount(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

export default function SegmentEditor({
  segments,
  onSegmentsChange,
  singleBlockText,
  onSingleBlockTextChange,
  mode,
  onModeChange,
}: SegmentEditorProps) {
  const updateSegmentText = (index: number, text: string) => {
    const updated = segments.map((seg, i) =>
      i === index ? { ...seg, text } : seg
    );
    onSegmentsChange(updated);
  };

  const deleteSegment = (index: number) => {
    onSegmentsChange(segments.filter((_, i) => i !== index));
  };

  const addSegment = () => {
    onSegmentsChange([...segments, { text: '', duration: 3 }]);
  };

  const singleWc = wordCount(singleBlockText);

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onModeChange('segments')}
          className={
            mode === 'segments'
              ? 'bg-primary-interactive text-white rounded-full px-3 py-1 text-xs font-medium'
              : 'border border-border text-muted-foreground rounded-full px-3 py-1 text-xs font-medium'
          }
        >
          Segments
        </button>
        <button
          type="button"
          onClick={() => onModeChange('single')}
          className={
            mode === 'single'
              ? 'bg-primary-interactive text-white rounded-full px-3 py-1 text-xs font-medium'
              : 'border border-border text-muted-foreground rounded-full px-3 py-1 text-xs font-medium'
          }
        >
          Single Block
        </button>
      </div>

      {mode === 'segments' ? (
        <div className="space-y-2">
          {segments.map((seg, i) => {
            const wc = wordCount(seg.text);
            return (
              <div key={i} className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground shrink-0 w-8">
                    Seg {i + 1}
                  </span>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={seg.text}
                      onChange={(e) => updateSegmentText(i, e.target.value)}
                      placeholder="2-5 punchy words..."
                      className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground w-full pr-14"
                    />
                    <span
                      className={`absolute right-3 top-1/2 -translate-y-1/2 text-[11px] ${
                        wc > 5 ? 'text-red-400' : 'text-emerald-500'
                      }`}
                    >
                      {wc} / 5
                    </span>
                  </div>
                  {segments.length > 2 && (
                    <button
                      type="button"
                      onClick={() => deleteSegment(i)}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                      aria-label={`Delete segment ${i + 1}`}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {segments.length < 4 && (
            <button
              type="button"
              onClick={addSegment}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus size={14} />
              Add Segment
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <div className="relative">
            <textarea
              rows={2}
              value={singleBlockText}
              onChange={(e) => onSingleBlockTextChange(e.target.value)}
              placeholder="One complete idea. 8-15 words."
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground w-full resize-none"
            />
            <span
              className={`absolute right-3 bottom-2 text-[11px] ${
                singleWc > 15 ? 'text-red-400' : 'text-emerald-500'
              }`}
            >
              {singleWc} / 15
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/50">
            B-roll stays visible behind the text
          </p>
        </div>
      )}
    </div>
  );
}
