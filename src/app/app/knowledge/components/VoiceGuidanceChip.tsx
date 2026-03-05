'use client';

interface VoiceGuidanceChipProps {
  totalChunks: number;
  bySourceType: Record<string, number>;
  onOpenModal: (modal: string) => void;
}

function getGuidance(
  totalChunks: number,
  bySourceType: Record<string, number>,
): { message: string; action: string; modal: string } | null {
  const hasVoice = (bySourceType['voice_recording'] || 0) > 0;
  const sourceTypes = Object.keys(bySourceType).filter(k => bySourceType[k] > 0);

  // No voice recordings and some content exists
  if (!hasVoice && totalChunks >= 100) {
    return {
      message: 'Record your voice to capture your speaking style',
      action: 'Record',
      modal: 'voice',
    };
  }

  // Only 1 source type
  if (sourceTypes.length === 1 && totalChunks > 0) {
    return {
      message: 'Add variety — try a different content type for a richer voice profile',
      action: 'Add content',
      modal: 'paste',
    };
  }

  // Excellent
  if (totalChunks >= 5000) {
    return null; // No action needed
  }

  // Below milestones
  if (totalChunks > 0 && totalChunks < 100) {
    return {
      message: `${100 - totalChunks} more nuggets to start building your voice`,
      action: 'Add content',
      modal: 'paste',
    };
  }

  return null;
}

export function VoiceGuidanceChip({ totalChunks, bySourceType, onOpenModal }: VoiceGuidanceChipProps) {
  const guidance = getGuidance(totalChunks, bySourceType);
  if (!guidance) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-accent/5 border border-accent/20 rounded-xl">
      <span className="text-accent text-sm">💡</span>
      <span className="text-sm text-text-secondary flex-1">{guidance.message}</span>
      <button
        onClick={() => onOpenModal(guidance.modal)}
        className="text-sm font-medium text-accent hover:text-accent/80 transition-colors whitespace-nowrap"
      >
        {guidance.action} →
      </button>
    </div>
  );
}
