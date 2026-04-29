'use client';

const SOURCE_COLORS: Record<string, { bg: string; dot: string; label: string }> = {
  file_upload: { bg: 'bg-blue-500', dot: 'bg-blue-500', label: 'Files' },
  paste_text: { bg: 'bg-purple-500', dot: 'bg-purple-500', label: 'Writing' },
  paste_social: { bg: 'bg-pink-500', dot: 'bg-pink-500', label: 'Social Posts' },
  paste_email: { bg: 'bg-orange-500', dot: 'bg-orange-500', label: 'Emails' },
  voice_recording: { bg: 'bg-green-500', dot: 'bg-green-500', label: 'Voice' },
  mbox_import: { bg: 'bg-amber-500', dot: 'bg-amber-500', label: 'Email Archive' },
  youtube_import: { bg: 'bg-red-500', dot: 'bg-red-500', label: 'YouTube' },
  instagram_import: { bg: 'bg-fuchsia-500', dot: 'bg-fuchsia-500', label: 'Instagram' },
  blog_import: { bg: 'bg-teal-500', dot: 'bg-teal-500', label: 'Blog' },
  generation: { bg: 'bg-cyan-500', dot: 'bg-cyan-500', label: 'Generated' },
  'clip-finder': { bg: 'bg-teal-400', dot: 'bg-teal-400', label: 'Video Clips' },
};

interface SourceCompositionBarProps {
  bySourceType: Record<string, number>;
}

export function SourceCompositionBar({ bySourceType }: SourceCompositionBarProps) {
  const entries = Object.entries(bySourceType).filter(([, count]) => count > 0);
  if (entries.length === 0) return null;

  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div>
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        {entries.map(([type, count]) => {
          const config = SOURCE_COLORS[type];
          const percent = Math.max(2, (count / total) * 100); // min 2% for visibility
          return (
            <div
              key={type}
              className={`${config?.bg || 'bg-gray-400'} transition-all duration-300`}
              style={{ width: `${percent}%` }}
              title={`${config?.label || type}: ${count}`}
            />
          );
        })}
      </div>

      {/* Legend pills */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {entries.map(([type, count]) => {
          const config = SOURCE_COLORS[type];
          return (
            <div key={type} className="flex items-center gap-1.5 text-xs text-text-secondary">
              <span className={`w-2 h-2 rounded-full ${config?.dot || 'bg-gray-400'}`} />
              <span>{config?.label || type}</span>
              <span className="text-text-tertiary">({count})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
